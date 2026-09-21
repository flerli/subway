import {
  VOICE_CAPTURE_MIME_CANDIDATES,
  browserMimeTypeProbe,
  browserVoiceAudioDecoder,
  decodeToMono16k,
  pickSupportedMimeType,
  requestMicPermission,
  type MicPermissionResult,
  type PcmData,
  type PcmDecodeResult,
  type VoiceInputError,
  type VoiceInputErrorCode,
} from './audioInput.ts'
import type { StreamLevelSource } from './audioLevel.ts'
import {
  transcribeUtterance,
  type TranscribeResult,
} from './stt.ts'
import {
  normalizeSttLanguage,
  postCorrectTranscript,
  type SttLanguage,
} from './vocabulary.ts'

/**
 * Push-to-talk capture state machine (SW-REQ-013-01).
 *
 * Framework-free controller so unit tests drive the full
 * start → stop → decode → transcribe → submit path with fake dependencies and
 * fake timers. `useVoiceCapture.ts` binds it to React; App.tsx supplies the
 * real assistant-API submit.
 *
 * Microphone discipline: tracks are released immediately after the recording
 * blob is produced — the mic is never held during transcription or submit.
 * Transcripts are passed to `submit` only, never logged.
 */

export type VoiceCaptureState =
  | 'idle'
  | 'requesting'
  | 'listening'
  | 'transcribing'
  | 'submitting'
  | 'error';

/** True while capture owns the microphone or is working (keyboard-suppression rule, SW-REQ-013-04). */
export const isVoiceCaptureActiveState = (state: VoiceCaptureState): boolean =>
  state === 'requesting' ||
  state === 'listening' ||
  state === 'transcribing' ||
  state === 'submitting';

export type VoiceCaptureErrorCode =
  | VoiceInputErrorCode
  | 'busy'
  | 'model-missing'
  | 'transcribe-failed'
  | 'submit-failed';

export interface VoiceCaptureError {
  readonly code: VoiceCaptureErrorCode;
  readonly message: string;
}

export interface VoiceCaptureSnapshot {
  readonly state: VoiceCaptureState;
  readonly error: VoiceCaptureError | null;
  /** Last successfully submitted transcript (preserved on submit failure). */
  readonly transcript: string | null;
}

/** Produces the recorded utterance; `cancel` discards it. */
export interface UtteranceRecorder {
  stop(): Promise<Blob>;
  cancel(): void;
}

export type UtteranceRecorderFactory = (stream: MediaStream) => UtteranceRecorder;

export interface VoiceCaptureTimers {
  readonly setTimeout: (callback: () => void, ms: number) => unknown;
  readonly clearTimeout: (handle: unknown) => void;
  readonly setInterval: (callback: () => void, ms: number) => unknown;
  readonly clearInterval: (handle: unknown) => void;
}

export interface VoiceCaptureDeps {
  readonly requestPermission?: () => Promise<MicPermissionResult>;
  readonly createRecorder?: UtteranceRecorderFactory;
  readonly decode?: (recording: Blob) => Promise<PcmDecodeResult>;
  readonly transcribe?: (
    samples: PcmData,
    language: SttLanguage,
  ) => Promise<TranscribeResult>;
  readonly submit?: (transcript: string) => Promise<void>;
  readonly isBusy?: () => boolean;
  /** Live input RMS in [0, 1]; `null` disables silence auto-stop. */
  readonly sampleInputLevel?: (() => number) | null;
  /**
   * Live analyser source bound to the granted stream (preferred over
   * `sampleInputLevel` when both are set). Disposed on mic release.
   */
  readonly createStreamLevels?: (
    stream: MediaStream,
  ) => StreamLevelSource | null;
  readonly timers?: VoiceCaptureTimers;
  readonly silenceThreshold?: number;
  readonly silenceTimeoutMs?: number;
  readonly pollIntervalMs?: number;
  readonly maxListeningMs?: number;
}

const captureError = (
  code: VoiceCaptureErrorCode,
  message: string,
): VoiceCaptureError => ({ code, message });

const sttErrorToCaptureError = (error: { code: string; message: string }): VoiceCaptureError => {
  if (error.code === 'model-missing') {
    return captureError('model-missing', error.message);
  }

  if (error.code === 'empty-audio') {
    return captureError('empty', error.message);
  }

  return captureError('transcribe-failed', error.message);
};

/**
 * Production recorder: MediaRecorder with negotiated container.
 *
 * Contract: `stop()` resolves the recorded utterance as one blob; `cancel()`
 * discards it. Capture starts the moment the factory runs (the controller
 * creates the recorder exactly when push-to-talk begins) — an unstoppered
 * recorder stays `inactive`, so `stop()` would yield a 0-byte blob and every
 * utterance would die in `decode-failed` before STT (real-browser defect,
 * fixed 2026-09-21).
 *
 * Why (SW-REQ-013-01 #2/#3): capture must begin on the explicit tap and every
 * recorded byte must reach the shared 16 kHz PCM normalizer.
 */
export const createMediaRecorder: UtteranceRecorderFactory = (
  stream: MediaStream,
): UtteranceRecorder => {
  const mimeType = pickSupportedMimeType(
    VOICE_CAPTURE_MIME_CANDIDATES,
    browserMimeTypeProbe,
  );
  const recorder = mimeType
    ? new MediaRecorder(stream, { mimeType })
    : new MediaRecorder(stream);
  const chunks: Blob[] = [];
  let settled = false;
  let resolveStopped: ((blob: Blob) => void) | null = null;

  recorder.ondataavailable = (event: BlobEvent) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };
  recorder.onstop = () => {
    if (settled) {
      return;
    }

    settled = true;
    resolveStopped?.(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
  };

  // Push-to-talk begins here: without this call the recorder never records.
  // A throwing `start()` (unsupported configuration) bubbles out so the
  // controller fails closed with `unsupported` instead of a silent empty blob.
  recorder.start();

  return {
    stop: (): Promise<Blob> =>
      new Promise<Blob>((resolve) => {
        resolveStopped = resolve;

        if (recorder.state === 'recording') {
          recorder.stop();
        } else {
          resolveStopped(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
        }
      }),
    cancel: (): void => {
      settled = true;
      resolveStopped = null;

      try {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      } catch {
        // Discard path: recorder teardown must never throw into the controller.
      }
    },
  };
};

export class VoiceCaptureController {
  private deps: VoiceCaptureDeps;
  private snapshot: VoiceCaptureSnapshot = {
    state: 'idle',
    error: null,
    transcript: null,
  };
  private listeners = new Set<(snapshot: VoiceCaptureSnapshot) => void>();
  private stream: MediaStream | null = null;
  private streamLevels: StreamLevelSource | null = null;
  private lastInputLevel = 0;
  private recorder: UtteranceRecorder | null = null;
  private language: SttLanguage = 'auto';
  private pollHandle: unknown = null;
  private timeoutHandle: unknown = null;
  private silentStreakMs = 0;
  private runId = 0;

  constructor(deps: VoiceCaptureDeps = {}) {
    this.deps = deps;
  }

  /** Refresh dependencies (fresh closures from the host component). */
  updateDeps(deps: VoiceCaptureDeps): void {
    this.deps = deps;
  }

  getSnapshot(): VoiceCaptureSnapshot {
    return this.snapshot;
  }

  /** Last sampled input RMS in [0, 1] — drives the level circle (scalar only). */
  readInputLevel(): number {
    return this.lastInputLevel;
  }

  subscribe(listener: (snapshot: VoiceCaptureSnapshot) => void): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private timers(): VoiceCaptureTimers {
    return (
      this.deps.timers ?? {
        setTimeout: (callback, ms) => setTimeout(callback, ms),
        clearTimeout: (handle) => {
          clearTimeout(handle as number | undefined);
        },
        setInterval: (callback, ms) => setInterval(callback, ms),
        clearInterval: (handle) => {
          clearInterval(handle as number | undefined);
        },
      }
    );
  }

  private setSnapshot(next: VoiceCaptureSnapshot): void {
    this.snapshot = next;

    for (const listener of this.listeners) {
      listener(next);
    }
  }

  private fail(code: VoiceCaptureErrorCode, message: string): void {
    this.releaseMic();
    this.setSnapshot({ state: 'error', error: captureError(code, message), transcript: this.snapshot.transcript });
  }

  private releaseMic(): void {
    this.recorder?.cancel();
    this.recorder = null;

    try {
      this.streamLevels?.dispose();
    } catch {
      // Level-source teardown must never throw into the controller.
    }

    this.streamLevels = null;
    this.lastInputLevel = 0;

    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        try {
          track.stop();
        } catch {
          // Track teardown must never throw into the controller.
        }
      }

      this.stream = null;
    }

    const timers = this.timers();

    if (this.pollHandle !== null) {
      timers.clearInterval(this.pollHandle);
      this.pollHandle = null;
    }

    if (this.timeoutHandle !== null) {
      timers.clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }

    this.silentStreakMs = 0;
  }

  /** Begin push-to-talk capture. No-op unless idle; fails closed when busy. */
  async start(language: unknown): Promise<void> {
    if (this.snapshot.state !== 'idle' && this.snapshot.state !== 'error') {
      return;
    }

    if (this.deps.isBusy?.() === true) {
      this.setSnapshot({
        state: 'error',
        error: captureError('busy', 'The assistant is still answering.'),
        transcript: null,
      });

      return;
    }

    const run = this.runId + 1;
    this.runId = run;
    this.language = normalizeSttLanguage(language);
    this.setSnapshot({ state: 'requesting', error: null, transcript: null });

    const requestPermission = this.deps.requestPermission ?? requestMicPermission;
    const permission: MicPermissionResult = await requestPermission();

    if (run !== this.runId) {
      // Cancelled (or restarted) while permission was pending: never leak the granted stream.
      if (permission.ok) {
        for (const track of permission.stream.getTracks()) {
          try {
            track.stop();
          } catch {
            // Track teardown must never throw into the controller.
          }
        }
      }

      return;
    }

    if (!permission.ok) {
      const error: VoiceInputError = permission.error;
      this.fail(error.code, error.message);

      return;
    }

    this.stream = permission.stream;

    try {
      this.streamLevels = this.deps.createStreamLevels?.(this.stream) ?? null;
    } catch {
      this.streamLevels = null;
    }

    try {
      const createRecorder = this.deps.createRecorder ?? createMediaRecorder;
      this.recorder = createRecorder(this.stream);
    } catch {
      this.fail('unsupported', 'Recording is not supported in this browser.');

      return;
    }

    this.setSnapshot({ state: 'listening', error: null, transcript: null });
    this.startPolling(run);
  }

  private startPolling(run: number): void {
    const timers = this.timers();
    const pollMs = this.deps.pollIntervalMs ?? 200;
    const silenceThreshold = this.deps.silenceThreshold ?? 0.02;
    const silenceTimeoutMs = this.deps.silenceTimeoutMs ?? 2500;
    const maxListeningMs = this.deps.maxListeningMs ?? 120000;

    this.timeoutHandle = timers.setTimeout(() => {
      if (run === this.runId && this.snapshot.state === 'listening') {
        void this.finalize(run);
      }
    }, maxListeningMs);

    const sampler =
      this.streamLevels?.sampler.sample.bind(this.streamLevels.sampler) ??
      this.deps.sampleInputLevel ??
      null;

    if (!sampler) {
      return;
    }

    this.pollHandle = timers.setInterval(() => {
      if (run !== this.runId || this.snapshot.state !== 'listening') {
        return;
      }

      let level: number;

      try {
        level = sampler();
      } catch {
        level = 0;
      }

      this.lastInputLevel = Number.isFinite(level)
        ? Math.min(1, Math.max(0, level))
        : 0;

      if (level >= silenceThreshold) {
        this.silentStreakMs = 0;

        return;
      }

      this.silentStreakMs += pollMs;

      if (this.silentStreakMs >= silenceTimeoutMs) {
        void this.finalize(run);
      }
    }, pollMs);
  }

  /** Manual stop: finalize the utterance and submit. No-op unless listening. */
  async stop(): Promise<void> {
    if (this.snapshot.state !== 'listening') {
      return;
    }

    await this.finalize(this.runId);
  }

  /** Abort everything and return to idle (mic released, error cleared). */
  cancel(): void {
    this.runId += 1;
    this.releaseMic();
    this.setSnapshot({ state: 'idle', error: null, transcript: null });
  }

  private async finalize(run: number): Promise<void> {
    if (run !== this.runId || this.snapshot.state !== 'listening') {
      return;
    }

    if (this.deps.isBusy?.() === true) {
      this.setSnapshot({
        state: 'error',
        error: captureError('busy', 'The assistant is still answering.'),
        transcript: null,
      });
      this.releaseMic();

      return;
    }

    this.setSnapshot({ state: 'transcribing', error: null, transcript: null });

    const recorder = this.recorder;
    this.recorder = null;

    let recording: Blob;

    try {
      recording = recorder ? await recorder.stop() : new Blob([]);
    } catch {
      this.fail('decode-failed', 'Could not finish the recording.');

      return;
    } finally {
      this.releaseMic();
    }

    if (run !== this.runId) {
      return;
    }

    const decode = this.deps.decode ?? ((blob) => decodeToMono16k(blob, browserVoiceAudioDecoder));
    const decoded = await decode(recording);

    if (run !== this.runId) {
      return;
    }

    if (!decoded.ok) {
      this.fail(decoded.error.code, decoded.error.message);

      return;
    }

    const transcribe =
      this.deps.transcribe ?? ((samples, language) => transcribeUtterance(samples, language));
    const transcribed = await transcribe(decoded.samples, this.language);

    if (run !== this.runId) {
      return;
    }

    if (!transcribed.ok) {
      this.fail(sttErrorToCaptureError(transcribed.error).code, sttErrorToCaptureError(transcribed.error).message);

      return;
    }

    const corrected = postCorrectTranscript(transcribed.text);

    if (corrected.trim().length === 0) {
      this.fail('empty', 'Nothing intelligible was heard.');

      return;
    }

    this.setSnapshot({ state: 'submitting', error: null, transcript: corrected });

    try {
      await this.deps.submit?.(corrected);
    } catch {
      if (run !== this.runId) {
        return;
      }

      this.setSnapshot({
        state: 'error',
        error: captureError('submit-failed', 'Could not send the voice message.'),
        transcript: corrected,
      });

      return;
    }

    if (run !== this.runId) {
      return;
    }

    this.setSnapshot({ state: 'idle', error: null, transcript: corrected });
  }
}

/**
 * Shared microphone permission, capture, and 16 kHz mono PCM normalization.
 *
 * Contract: every STT entry point in the app (voice widget today, Epic 007
 * audio-visual later) captures through this module so Whisper always receives
 * 16 kHz mono `Float32Array` samples in [-1, 1]. Raw audio buffers are
 * ephemeral — this module never persists audio and never logs it.
 *
 * Why (SW-REQ-013-01): Whisper-tiny transcribes garbage when the sample rate
 * or channel layout is wrong; a single shared normalizer makes that class of
 * bug impossible and prevents duplicate `getUserMedia` permission flows.
 */

/** Whisper's required sample rate (tech doc §1.3 PCM contract). */
export const VOICE_TARGET_SAMPLE_RATE = 16000;

/** Microphone clip cap: 5 minutes ≈ 4.8M samples (tech doc §1.3). */
export const VOICE_MAX_RECORDING_SECONDS = 300;

/** Absolute sample cap derived from the rate and the duration cap. */
export const VOICE_MAX_SAMPLES =
  VOICE_TARGET_SAMPLE_RATE * VOICE_MAX_RECORDING_SECONDS;

/** Preferred capture container; falls back via {@link pickSupportedMimeType}. */
export const VOICE_CAPTURE_MIME_CANDIDATES: readonly string[] = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
];

/** Machine-readable voice-input failure classes (UI copy for these lives in TC-A-03). */
export type VoiceInputErrorCode =
  | 'unsupported'
  | 'denied'
  | 'no-device'
  | 'decode-failed'
  | 'too-long'
  | 'empty'
  | 'aborted';

export interface VoiceInputError {
  readonly code: VoiceInputErrorCode;
  /** Technical message for diagnostics; never shown verbatim in the UI. */
  readonly message: string;
}

/** PCM sample buffer (explicit generic: TS6 defaults differ; ArrayBufferLike covers both). */
export type PcmData = Float32Array<ArrayBufferLike>;

/** Structural audio-buffer view: satisfied by the real `AudioBuffer` and by test fakes. */
export interface VoiceAudioBufferLike {
  readonly sampleRate: number;
  readonly numberOfChannels: number;
  getChannelData(channel: number): PcmData;
}

/**
 * Browser audio-codec boundary. Injected (instead of hard-coded globals) so
 * unit tests run in Node without Web Audio.
 */
export interface VoiceAudioDecoder {
  decodeAudioData(data: ArrayBuffer): Promise<VoiceAudioBufferLike>;
  renderMonoAt16k(
    source: VoiceAudioBufferLike,
    targetLength: number,
  ): Promise<VoiceAudioBufferLike>;
}

export type MicPermissionResult =
  | { readonly ok: true; readonly stream: MediaStream }
  | { readonly ok: false; readonly error: VoiceInputError };

export type PcmDecodeResult =
  | { readonly ok: true; readonly samples: PcmData }
  | { readonly ok: false; readonly error: VoiceInputError };

const voiceInputError = (
  code: VoiceInputErrorCode,
  message: string,
): VoiceInputError => ({ code, message });

const isMediaDevicesAvailable = (): boolean =>
  typeof navigator !== 'undefined' &&
  !!navigator.mediaDevices &&
  typeof navigator.mediaDevices.getUserMedia === 'function';

/**
 * Request a microphone stream. Never throws: every failure mode returns a
 * typed {@link VoiceInputError} so callers fail closed with UI copy.
 *
 * Why explicit tap only (SW-REQ-013-01): the kiosk microphone activates
 * solely from the user's push-to-talk gesture; nothing here auto-acquires.
 */
export const requestMicPermission = async (): Promise<MicPermissionResult> => {
  if (!isMediaDevicesAvailable()) {
    return {
      ok: false,
      error: voiceInputError(
        'unsupported',
        'MediaDevices.getUserMedia is unavailable in this browser.',
      ),
    };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });

    return { ok: true, stream };
  } catch (caught) {
    const name = caught instanceof DOMException ? caught.name : 'UnknownError';
    const detail =
      caught instanceof Error ? caught.message : 'Microphone request failed.';

    if (name === 'NotAllowedError' || name === 'SecurityError') {
      return {
        ok: false,
        error: voiceInputError('denied', `Microphone permission denied (${name}).`),
      };
    }

    if (
      name === 'NotFoundError' ||
      name === 'OverconstrainedError' ||
      name === 'NotReadableError'
    ) {
      return {
        ok: false,
        error: voiceInputError('no-device', `No usable microphone (${name}).`),
      };
    }

    if (name === 'AbortError') {
      return {
        ok: false,
        error: voiceInputError('aborted', 'Microphone request was aborted.'),
      };
    }

    return {
      ok: false,
      error: voiceInputError('unsupported', `${detail} (${name})`),
    };
  }
};

/**
 * Pick the first supported recording container. The support probe is injected
 * so tests run without `MediaRecorder`.
 */
export const pickSupportedMimeType = (
  candidates: readonly string[],
  isSupported: (mimeType: string) => boolean,
): string => {
  for (const candidate of candidates) {
    try {
      if (isSupported(candidate)) {
        return candidate;
      }
    } catch {
      continue;
    }
  }

  return '';
};

/** Browser default for {@link pickSupportedMimeType}. Returns '' when unsupported. */
export const browserMimeTypeProbe = (mimeType: string): boolean => {
  if (typeof MediaRecorder === 'undefined') {
    return false;
  }

  try {
    return MediaRecorder.isTypeSupported(mimeType);
  } catch {
    return false;
  }
};

/**
 * Downmix multi-channel audio to mono by averaging, then linearly resample to
 * the target rate. Pure function — no Web Audio dependency.
 *
 * @param channels Channel data (all channels truncated to the shortest).
 * @param sourceRate Source sample rate in Hz (must be > 0).
 * @param targetRate Target sample rate in Hz (default 16 kHz).
 */
export const downmixAndResample = (
  channels: readonly PcmData[],
  sourceRate: number,
  targetRate: number = VOICE_TARGET_SAMPLE_RATE,
): PcmData => {
  if (channels.length === 0 || sourceRate <= 0 || targetRate <= 0) {
    return new Float32Array(0);
  }

  let frameCount = channels[0].length;

  for (const channel of channels) {
    frameCount = Math.min(frameCount, channel.length);
  }

  if (frameCount === 0) {
    return new Float32Array(0);
  }

  const targetLength = Math.max(
    1,
    Math.round((frameCount * targetRate) / sourceRate),
  );
  const output = new Float32Array(targetLength);
  const channelCount = channels.length;

  for (let targetIndex = 0; targetIndex < targetLength; targetIndex += 1) {
    const sourcePosition = (targetIndex * frameCount) / targetLength;
    const lowerIndex = Math.floor(sourcePosition);
    const upperIndex = Math.min(lowerIndex + 1, frameCount - 1);
    const fraction = sourcePosition - lowerIndex;
    let mono = 0;

    for (const channel of channels) {
      const lower = channel[lowerIndex] ?? 0;
      const upper = channel[upperIndex] ?? 0;
      mono += lower + (upper - lower) * fraction;
    }

    output[targetIndex] = mono / channelCount;
  }

  return output;
};

/** Validate normalized PCM: non-empty, finite, within the duration cap. */
export const validatePcmSamples = (samples: PcmData): VoiceInputError | null => {
  if (samples.length === 0) {
    return voiceInputError('empty', 'Recording produced no audio samples.');
  }

  if (samples.length > VOICE_MAX_SAMPLES) {
    return voiceInputError(
      'too-long',
      `Recording exceeds the ${VOICE_MAX_RECORDING_SECONDS}s microphone cap.`,
    );
  }

  for (let index = 0; index < samples.length; index += 1) {
    if (!Number.isFinite(samples[index])) {
      return voiceInputError(
        'decode-failed',
        'Recording contains non-finite audio samples.',
      );
    }
  }

  return null;
};

/**
 * Decode a recorded blob and normalize it to 16 kHz mono PCM.
 * Buffers stay in memory only — nothing here writes audio to disk or storage.
 *
 * An empty recording (0 bytes: recorder never captured anything) is reported as
 * `empty` — "nothing was heard" — instead of the misleading `decode-failed`
 * ("could not be read"), so the user copy matches the actual failure
 * (real-browser defect, fixed 2026-09-21).
 */
export const decodeToMono16k = async (
  recording: Blob,
  decoder: VoiceAudioDecoder,
): Promise<PcmDecodeResult> => {
  if (recording.size === 0) {
    return {
      ok: false,
      error: voiceInputError('empty', 'Recording contains no audio bytes.'),
    };
  }

  let rawBytes: ArrayBuffer;

  try {
    rawBytes = await recording.arrayBuffer();
  } catch {
    return {
      ok: false,
      error: voiceInputError('decode-failed', 'Could not read the recording bytes.'),
    };
  }

  let decoded: VoiceAudioBufferLike;

  try {
    decoded = await decoder.decodeAudioData(rawBytes);
  } catch {
    return {
      ok: false,
      error: voiceInputError('decode-failed', 'Could not decode the recording audio.'),
    };
  }

  if (decoded.numberOfChannels < 1) {
    return {
      ok: false,
      error: voiceInputError('empty', 'Decoded recording has no audio channels.'),
    };
  }

  const estimatedSeconds =
    decoded.sampleRate > 0
      ? decoded.getChannelData(0).length / decoded.sampleRate
      : 0;

  if (estimatedSeconds > VOICE_MAX_RECORDING_SECONDS) {
    return {
      ok: false,
      error: voiceInputError(
        'too-long',
        `Recording exceeds the ${VOICE_MAX_RECORDING_SECONDS}s microphone cap.`,
      ),
    };
  }

  const targetLength = Math.max(
    1,
    Math.floor(estimatedSeconds * VOICE_TARGET_SAMPLE_RATE),
  );

  let rendered: VoiceAudioBufferLike;

  try {
    rendered = await decoder.renderMonoAt16k(decoded, targetLength);
  } catch {
    return {
      ok: false,
      error: voiceInputError('decode-failed', 'Could not resample the recording audio.'),
    };
  }

  const samples = rendered.getChannelData(0).slice();
  const validationError = validatePcmSamples(samples);

  if (validationError) {
    return { ok: false, error: validationError };
  }

  return { ok: true, samples };
};

/** Browser Web Audio implementation of {@link VoiceAudioDecoder}. */
export const browserVoiceAudioDecoder: VoiceAudioDecoder = {
  decodeAudioData: async (data: ArrayBuffer): Promise<VoiceAudioBufferLike> => {
    const context = new AudioContext();
    try {
      return await context.decodeAudioData(data);
    } finally {
      void context.close().catch(() => undefined);
    }
  },
  renderMonoAt16k: async (
    source: VoiceAudioBufferLike,
    targetLength: number,
  ): Promise<VoiceAudioBufferLike> => {
    const offline = new OfflineAudioContext(1, targetLength, VOICE_TARGET_SAMPLE_RATE);
    const buffer = offline.createBuffer(
      source.numberOfChannels,
      source.getChannelData(0).length,
      source.sampleRate,
    );

    for (
      let channel = 0;
      channel < source.numberOfChannels;
      channel += 1
    ) {
      // copyToChannel is typed for ArrayBuffer-backed data; copy explicitly.
      const channelCopy = new Float32Array(source.getChannelData(channel).length);
      channelCopy.set(source.getChannelData(channel));
      buffer.copyToChannel(channelCopy, channel);
    }

    const node = offline.createBufferSource();
    node.buffer = buffer;
    node.connect(offline.destination);
    node.start();

    return offline.startRendering();
  },
};

/**
 * Root-mean-square amplitude in [0, 1]. Pure scalar math shared by the level
 * hook and the silence auto-stop (TC-A-02). Never returns audio data.
 */
export const computeRmsLevel = (samples: PcmData | readonly number[]): number => {
  if (samples.length === 0) {
    return 0;
  }

  let sumSquares = 0;

  for (const sample of samples) {
    sumSquares += sample * sample;
  }

  const rms = Math.sqrt(sumSquares / samples.length);

  if (!Number.isFinite(rms)) {
    return 0;
  }

  return Math.min(1, Math.max(0, rms));
};

/** Silence predicate for the push-to-talk auto-stop (threshold default 2% FS). */
export const isSilent = (rmsLevel: number, threshold: number = 0.02): boolean =>
  !(rmsLevel >= threshold);

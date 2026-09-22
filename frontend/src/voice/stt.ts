import type { PcmData } from './audioInput.ts'
import { encodeWavBlob } from './audioInput.ts'
import type { SttLanguage } from './vocabulary.ts'

/**
 * Whisper-tiny speech-to-text singleton (SW-REQ-013-01).
 *
 * Contract: `transcribeUtterance` takes validated 16 kHz mono PCM and returns
 * the raw transcript (vocabulary repair happens in `vocabulary.ts`, owned by
 * the caller). Inference is fully local: the runtime is pinned to this app's
 * own staged model/WASM host by {@link configureVoiceSttRuntime}, so a missing
 * bundle fails closed instead of downloading (SW-REQ-013-01 #4).
 *
 * Why a lazy cached singleton: model load costs hundreds of ms to seconds;
 * per-utterance inference on `tiny` is ~real-time. The dynamic import keeps
 * the ~MB-large transformers runtime out of the initial kiosk bundle.
 */

/**
 * Vendored Whisper model id (tech doc §1.1/§5: multilingual, quantized).
 *
 * `Xenova/whisper-small` (q8, ~250 MB) is the accuracy/size step-up from
 * `tiny` (67 MB) chosen for the kiosk: materially better on accents, noise,
 * and proper nouns while staying real-time for short utterances on CPU.
 * Dev fallback: `VOICE_STT_MODEL=Xenova/whisper-tiny npm run fetch:voice-models`
 * + revert this constant (must match the staged model — see
 * `scripts/fetch-voice-models.mjs`).
 *
 * Staged under the app's own model host (`configureVoiceSttRuntime`) at
 * `public/voice-models/<id>/` — the kiosk never talks to Hugging Face at
 * runtime.
 */
export const VOICE_STT_MODEL_ID = 'Xenova/whisper-small';

/**
 * Fallback model, staged alongside the primary. Small is 237 MB (q8) and can
 * fail to initialize on memory-constrained kiosk devices (or a slow link),
 * which surfaces as "model missing". Tiny (69 MB) is the proven-working
 * pre-upgrade model, so a failed small load transparently retries tiny.
 */
export const VOICE_STT_FALLBACK_MODEL_ID = 'Xenova/whisper-tiny';

/** App-relative directory that serves the staged model files. */
export const VOICE_STT_MODEL_BASE_PATH = 'voice-models/';

/** App-relative directory that serves the staged ONNX-runtime WASM pair. */
export const VOICE_STT_ORT_BASE_PATH = 'voice-models/ort/';

/** ONNX-runtime loader that transformers.js v4 requests by default (asyncify build). */
export const VOICE_STT_ORT_MODULE_FILE = 'ort-wasm-simd-threaded.asyncify.mjs';

/** ONNX-runtime binary that belongs to {@link VOICE_STT_ORT_MODULE_FILE}. */
export const VOICE_STT_ORT_WASM_FILE = 'ort-wasm-simd-threaded.asyncify.wasm';

/** Long-form recipe from the tech doc; mic clips transcribe in one pass. */
export const VOICE_STT_CHUNK_LENGTH_S = 30;
export const VOICE_STT_STRIDE_LENGTH_S = 5;

/** ONNX-runtime WASM locations; `{ mjs, wasm }` is the shape transformers.js caches. */
export interface VoiceSttWasmPaths {
  mjs: string;
  wasm: string;
}

/**
 * Structural slice of the transformers.js runtime config this module owns.
 * Declared structurally so unit tests configure a fake env without importing
 * the (large) library.
 */
export interface VoiceSttRuntimeEnv {
  allowRemoteModels: boolean;
  remoteHost: string;
  remotePathTemplate: string;
  backends: {
    onnx: {
      wasm: {
        wasmPaths?: string | VoiceSttWasmPaths;
      };
    };
  };
}

/** App base URL (`VITE_BASE_PATH`), absolute when a DOM origin is available. */
export const resolveVoiceSttBaseUrl = (): string => {
  const basePath =
    (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
  const normalizedBasePath = basePath.length > 0 ? basePath : '/';
  const origin =
    typeof window !== 'undefined' && typeof window.location !== 'undefined'
      ? window.location.origin
      : null;

  if (!origin) {
    return normalizedBasePath;
  }

  return new URL(normalizedBasePath, origin).toString();
};

const joinUrl = (baseUrl: string, path: string): string => {
  try {
    return new URL(path, baseUrl).toString();
  } catch {
    return `${baseUrl.replace(/\/+$/, '')}/${path}`;
  }
};

/**
 * Point the transformers.js runtime at the app's own staged model and WASM.
 *
 * Why this shape (verified against `@huggingface/transformers` v4.3.0):
 * browser builds set `env.allowLocalModels = false` unconditionally, so
 * `local_files_only: true` / `allowRemoteModels = false` makes the library
 * throw before any file is read — and by default the ONNX runtime is fetched
 * from the jsDelivr CDN. Offline-by-construction therefore means: keep
 * `allowRemoteModels = true` but pin `remoteHost` to this origin, so every
 * model/WASM request stays inside the deployed app (SW-REQ-013-01 #4).
 */
export const configureVoiceSttRuntime = (
  env: VoiceSttRuntimeEnv,
  baseUrl: string = resolveVoiceSttBaseUrl(),
): void => {
  env.allowRemoteModels = true;
  env.remoteHost = joinUrl(baseUrl, VOICE_STT_MODEL_BASE_PATH);
  env.remotePathTemplate = '{model}/';
  env.backends.onnx.wasm.wasmPaths = {
    mjs: joinUrl(baseUrl, `${VOICE_STT_ORT_BASE_PATH}${VOICE_STT_ORT_MODULE_FILE}`),
    wasm: joinUrl(baseUrl, `${VOICE_STT_ORT_BASE_PATH}${VOICE_STT_ORT_WASM_FILE}`),
  };
};

export type SttErrorCode = 'model-missing' | 'transcribe-failed' | 'empty-audio';

export interface SttError {
  readonly code: SttErrorCode;
  readonly message: string;
}

export type TranscribeResult =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly error: SttError };

/** Pipeline invocation options (single-pass for short clips; long-form chunked). */
export interface WhisperRunOptions {
  readonly task: 'transcribe';
  readonly language?: string;
  readonly chunk_length_s?: number;
  readonly stride_length_s?: number;
}

/** Structural pipeline: satisfied by the real transformers pipeline and by test fakes. */
export interface WhisperPipeline {
  (audio: PcmData, options: WhisperRunOptions): Promise<SttRawOutput>;
}

/** Interop shape: some bundler/runtime combinations surface `_call` objects. */
interface CallablePipelineLike {
  _call?: (audio: PcmData, options: WhisperRunOptions) => Promise<SttRawOutput>;
}

export interface WhisperPipelineFactory {
  (modelPath: string, language: SttLanguage): Promise<WhisperPipeline>;
}

/**
 * Production factory: dynamic import (code-split) + own-origin model/WASM host.
 * Model files are staged into the build (`scripts/fetch-voice-models.mjs`); a
 * missing bundle fails closed with the repair copy instead of downloading.
 * NOTE on `initial_prompt`: the installed `@huggingface/transformers`
 * v4.3.0 exposes no initial-prompt option (verified against the bundle —
 * zero `initial_prompt` references), so decoder bias is currently carried by
 * `buildInitialPrompt` documentation + the deterministic
 * `postCorrectTranscript` repair. Revisit on library upgrade.
 */
export const defaultWhisperPipelineFactory: WhisperPipelineFactory = async (
  modelPath,
  language,
) => {
  let transformers: typeof import('@huggingface/transformers');

  try {
    transformers = await import('@huggingface/transformers');
  } catch (error) {
    throw new Error(
      'Speech runtime failed to load (reinstall / repair runtime).',
      { cause: error },
    );
  }

  configureVoiceSttRuntime(
    transformers.env as unknown as VoiceSttRuntimeEnv,
  );

  const loadPipeline = (candidateModelPath: string) =>
    transformers.pipeline(
      'automatic-speech-recognition',
      candidateModelPath,
      // device: 'wasm' is REQUIRED: the v4.3.0 web build defaults to the
      // WebGPU (jsep) entry (`onnxruntime-web/webgpu`); on machines without
      // WebGPU the pipeline construction throws and surfaces as
      // "model missing". The wasm device uses the staged asyncify ORT pair
      // and runs everywhere, offline, CPU-only (verified in headless Chrome).
      { dtype: 'q8', device: 'wasm' },
    )

  const rawPipeline = await loadPipelineWithFallback(
    loadPipeline,
    modelPath,
    VOICE_STT_FALLBACK_MODEL_ID,
    {
      onLoaded: (loadedModelPath) => {
        loadedSttModelByLanguage.set(language, loadedModelPath)
      },
    },
  )

  return adaptRawPipeline(rawPipeline, modelPath)
}

/**
 * Which local model actually loaded, per language. `null` means the local
 * path was never reached (endpoint served) or load not yet attempted. Used
 * by per-utterance telemetry so the kiosk console shows whether STT ran on
 * the primary model, the tiny fallback, or not at all.
 */
const loadedSttModelByLanguage = new Map<SttLanguage, string>()

export const getLoadedSttModel = (language: SttLanguage): string | null =>
  loadedSttModelByLanguage.get(language) ?? null

export const resetLoadedSttModelForTests = (): void => {
  loadedSttModelByLanguage.clear()
}

/**
 * Try the primary model, then the staged fallback. The primary (small,
 * 237 MB) can fail to initialize on memory-constrained kiosks or slow links;
 * the fallback (tiny, 69 MB) is the proven pre-upgrade model, so users keep
 * working voice input instead of a hard failure. When BOTH fail, the thrown
 * error names both models and carries the URL for on-device diagnosis.
 */
export const loadPipelineWithFallback = async (
  attempt: (modelPath: string) => Promise<unknown>,
  primaryModelPath: string,
  fallbackModelPath: string,
  hooks: { onLoaded?: (modelPath: string) => void } = {},
): Promise<unknown> => {
  try {
    const loaded = await attempt(primaryModelPath)
    hooks.onLoaded?.(primaryModelPath)
    return loaded
  } catch (primaryError) {
    if (typeof console !== 'undefined') {
      console.warn(
        `[voice] primary model failed (${primaryModelPath}); retrying fallback ${fallbackModelPath}`,
        primaryError instanceof Error ? primaryError.message : undefined,
      )
    }

    try {
      const loaded = await attempt(fallbackModelPath)
      hooks.onLoaded?.(fallbackModelPath)
      return loaded
    } catch (fallbackError) {
      const url = joinUrl(
        resolveVoiceSttBaseUrl(),
        `${VOICE_STT_MODEL_BASE_PATH}${primaryModelPath}/`,
      )
      const primaryReason =
        primaryError instanceof Error ? primaryError.message : String(primaryError)
      const fallbackReason =
        fallbackError instanceof Error ? fallbackError.message : String(fallbackError)

      throw new Error(
        `Speech model is missing from the app bundle (reinstall / repair runtime): ${url} ` +
          `| primary (${primaryModelPath}): ${primaryReason} ` +
          `| fallback (${fallbackModelPath}): ${fallbackReason}`,
        { cause: fallbackError },
      )
    }
  }
}

/**
 * Normalize whatever `transformers.pipeline()` resolved to into a callable.
 * Prefers the bare callable function; adapts objects that expose `_call`
 * (observed interop shape in a production model-missing report); otherwise
 * fails with the resolved model URL appended for on-device diagnosis.
 */
export const adaptRawPipeline = (
  rawPipeline: unknown,
  modelPath: string,
): WhisperPipeline => {
  if (typeof rawPipeline === 'function') {
    const callable = rawPipeline as WhisperPipeline

    return async (audio, options) => callable(audio, options)
  }

  const callableLike = rawPipeline as CallablePipelineLike | null

  if (callableLike && typeof callableLike._call === 'function') {
    const boundCall = callableLike._call.bind(rawPipeline)

    return async (audio, options) => boundCall(audio, options)
  }

  // Self-diagnosing failure: log the shape and name the model URL so the
  // on-device note and console point at the real cause.
  if (typeof console !== 'undefined') {
    console.warn('[voice] pipeline construction returned a non-callable', {
      type: typeof rawPipeline,
      keys:
        rawPipeline && typeof rawPipeline === 'object'
          ? Object.keys(rawPipeline).slice(0, 12)
          : null,
    })
  }

  throw new Error(
    `Speech pipeline is unavailable (reinstall / repair runtime): ${joinUrl(resolveVoiceSttBaseUrl(), `${VOICE_STT_MODEL_BASE_PATH}${modelPath}/`)}`,
  )
};

const pipelineCache = new Map<SttLanguage, Promise<WhisperPipeline>>();

/** Test seam: drop cached pipelines (fresh factory per test). */
export const resetSttPipelineCacheForTests = (): void => {
  pipelineCache.clear();
};

const getPipeline = (
  language: SttLanguage,
  factory: WhisperPipelineFactory,
): Promise<WhisperPipeline> => {
  const cached = pipelineCache.get(language);

  if (cached) {
    return cached;
  }

  // Cache the promise itself: concurrent utterances share one model load,
  // and a failed load is retried on the next utterance (entry removed).
  const loading = factory(VOICE_STT_MODEL_ID, language).catch(
    (error: unknown) => {
      pipelineCache.delete(language);
      throw error;
    },
  );

  pipelineCache.set(language, loading);

  return loading;
};

type SttRawOutput =
  | { readonly text: string }
  | ReadonlyArray<{ readonly text: string }>;

const isChunkList = (output: SttRawOutput): output is ReadonlyArray<{ readonly text: string }> =>
  Array.isArray(output);

const readTranscriptText = (output: SttRawOutput): string => {
  if (isChunkList(output)) {
    return output.map((chunk) => chunk.text).join(' ');
  }

  return output.text;
};

/**
 * Optional external STT service (e.g. a localhost whisper.cpp server on the
 * kiosk, serving bigger models than the browser can). Configured at build
 * time via `VITE_STT_ENDPOINT`; empty = in-browser Whisper only.
 */
export const resolveExternalSttEndpoint = (): string => {
  const raw =
    (import.meta as { env?: { VITE_STT_ENDPOINT?: string } }).env
      ?.VITE_STT_ENDPOINT ?? '';

  return raw.trim().replace(/\/+$/, '');
};

/** Network timeout for one external transcription request. */
export const STT_ENDPOINT_TIMEOUT_MS = 30000;

export type SttFetch = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;

/**
 * Transcribe through the external endpoint (whisper.cpp-compatible contract:
 * multipart `file` (WAV) + `language`, JSON `{ text }` back). Returns a
 * failure result on any transport/parse/empty problem — the caller falls
 * back to the local model.
 */
export const transcribeViaEndpoint = async (
  samples: PcmData,
  language: SttLanguage,
  endpoint: string,
  fetchFn: SttFetch = fetch,
): Promise<TranscribeResult> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), STT_ENDPOINT_TIMEOUT_MS);

  try {
    const form = new FormData();
    form.append('file', encodeWavBlob(samples, 16000), 'utterance.wav');

    if (language !== 'auto') {
      form.append('language', language);
    }

    const response = await fetchFn(endpoint, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        error: {
          code: 'transcribe-failed',
          message: `External STT service returned status ${response.status}.`,
        },
      };
    }

    const payload = (await response.json()) as { text?: unknown };
    const text = typeof payload?.text === 'string' ? payload.text.trim() : '';

    if (!text) {
      return {
        ok: false,
        error: { code: 'empty-audio', message: 'External STT returned no text.' },
      };
    }

    return { ok: true, text };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: 'transcribe-failed',
        message:
          error instanceof Error ? error.message : 'External STT request failed.',
      },
    };
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Long-form threshold: utterances shorter than one 30 s chunk transcribe in a
 * single pass (tech doc §1.2 — "short mic clips go through in one pass").
 * Passing chunk/stride for short clips is measurable-by-probe unnecessary and
 * risks edge degradation; pass them only for genuinely long recordings.
 */
export const VOICE_STT_SINGLE_PASS_MAX_SAMPLES =
  VOICE_STT_CHUNK_LENGTH_S * 16000;

/**
 * Transcribe validated 16 kHz mono PCM. Never throws: model and inference
 * failures return typed errors so the capture controller fails closed.
 * LANGUAGE NOTE (verified against v4.3.0): this port has NO language
 * auto-detection — without a forced `language` it defaults to English and
 * mangles other languages ("Guten Morgen" → "weis the sweater"). The board
 * language MUST be forced (SW-REQ-013-01 #5); `auto` is a last-resort
 * fallback only and is treated as English-by-default by the runtime.
 */
export interface TranscribeOptions {
  /** Explicit external endpoint (overrides VITE_STT_ENDPOINT). `null` forces local. */
  readonly endpoint?: string | null;
  readonly fetchImpl?: SttFetch;
}

export const transcribeUtterance = async (
  samples: PcmData,
  language: SttLanguage,
  factory: WhisperPipelineFactory = defaultWhisperPipelineFactory,
  options: TranscribeOptions = {},
): Promise<TranscribeResult> => {
  if (samples.length === 0) {
    return {
      ok: false,
      error: { code: 'empty-audio', message: 'Nothing to transcribe.' },
    };
  }

  // External kiosk/VPS STT service first (e.g. whisper.cpp on the Pi);
  // any failure falls back to the in-browser Whisper below.
  const startedAt =
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : null;
  const logTelemetry = (servedBy: string, ok: boolean): void => {
    if (typeof console === 'undefined' || startedAt === null) {
      return;
    }

    console.info(
      `[voice] stt servedBy=${servedBy} lang=${language} samples=${samples.length} ` +
        `ms=${Math.round(performance.now() - startedAt)} ok=${ok}`,
    );
  };

  const endpoint = options.endpoint === undefined ? resolveExternalSttEndpoint() : options.endpoint;

  if (endpoint) {
    const remote = await transcribeViaEndpoint(samples, language, endpoint, options.fetchImpl);

    if (remote.ok) {
      logTelemetry(`endpoint:${endpoint}`, true);
      return remote;
    }

    if (typeof console !== 'undefined') {
      console.warn('[voice] external STT failed; using local model', remote.error.message);
    }
  }

  let pipeline: WhisperPipeline;

  try {
    pipeline = await getPipeline(language, factory);
  } catch (error) {
    logTelemetry('local:load-failed', false);
    // Surface the concrete reason (model URL + underlying cause) so the
    // on-device note and console point at the real failure instead of a
    // generic "reinstall" message.
    return {
      ok: false,
      error: {
        code: 'model-missing',
        message:
          error instanceof Error && error.message.length > 0
            ? error.message
            : 'Speech model is missing from the app bundle (reinstall / repair runtime).',
      },
    };
  }

  let output: SttRawOutput;

  try {
    const longForm = samples.length >= VOICE_STT_SINGLE_PASS_MAX_SAMPLES;

    output = await pipeline(samples, {
      task: 'transcribe',
      ...(language === 'auto' ? {} : { language }),
      ...(longForm
        ? {
            chunk_length_s: VOICE_STT_CHUNK_LENGTH_S,
            stride_length_s: VOICE_STT_STRIDE_LENGTH_S,
          }
        : {}),
    });
  } catch {
    logTelemetry(`local:${getLoadedSttModel(language) ?? 'unknown'}`, false);
    return {
      ok: false,
      error: {
        code: 'transcribe-failed',
        message: 'Speech transcription failed.',
      },
    };
  }

  logTelemetry(`local:${getLoadedSttModel(language) ?? 'unknown'}`, true);
  return { ok: true, text: readTranscriptText(output) };
};

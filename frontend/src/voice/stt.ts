import type { PcmData } from './audioInput.ts'
import type { SttLanguage } from './vocabulary.ts'

/**
 * Whisper-tiny speech-to-text singleton (SW-REQ-013-01).
 *
 * Contract: `transcribeUtterance` takes validated 16 kHz mono PCM and returns
 * the raw transcript (vocabulary repair happens in `vocabulary.ts`, owned by
 * the caller). Inference is fully local: the pipeline is constructed with
 * `local_files_only` and remote models are disabled process-wide, so a
 * missing bundled model fails closed instead of downloading.
 *
 * Why a lazy cached singleton: model load costs hundreds of ms to seconds;
 * per-utterance inference on `tiny` is ~real-time. The dynamic import keeps
 * the ~MB-large transformers runtime out of the initial kiosk bundle.
 */

/** Vendored Whisper-tiny model id (tech doc §1.1: multilingual, quantized). */
export const VOICE_STT_MODEL_ID = 'Xenova/whisper-tiny';

/**
 * Bundled model path served from the app. Model distribution (vendored vs
 * staged) is decided in TC-B-01; until then a missing path fails closed with
 * `model-missing` — never a runtime download.
 */
export const VOICE_STT_MODEL_PATH = '/voice-models/whisper-tiny';

/** Long-form recipe from the tech doc; mic clips transcribe in one pass. */
export const VOICE_STT_CHUNK_LENGTH_S = 30;
export const VOICE_STT_STRIDE_LENGTH_S = 5;

export type SttErrorCode = 'model-missing' | 'transcribe-failed' | 'empty-audio';

export interface SttError {
  readonly code: SttErrorCode;
  readonly message: string;
}

export type TranscribeResult =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly error: SttError };

/** Structural pipeline: satisfied by the real transformers pipeline and by test fakes. */
export interface WhisperPipeline {
  (
    audio: PcmData,
    options: {
      readonly task: 'transcribe';
      readonly language?: string;
      readonly chunk_length_s: number;
      readonly stride_length_s: number;
    },
  ): Promise<SttRawOutput>;
}

export interface WhisperPipelineFactory {
  (modelPath: string, language: SttLanguage): Promise<WhisperPipeline>;
}

/**
 * Production factory: dynamic import (code-split) + offline-by-construction
 * flags. NOTE on `initial_prompt`: the installed `@huggingface/transformers`
 * v4.3.0 exposes no initial-prompt option (verified against the bundle —
 * zero `initial_prompt` references), so decoder bias is currently carried by
 * `buildInitialPrompt` documentation + the deterministic
 * `postCorrectTranscript` repair. Revisit on library upgrade.
 */
export const defaultWhisperPipelineFactory: WhisperPipelineFactory = async (
  modelPath,
) => {
  let transformers: typeof import('@huggingface/transformers');

  try {
    transformers = await import('@huggingface/transformers');
  } catch {
    throw new Error(
      'Speech runtime failed to load (reinstall / repair runtime).',
    );
  }

  transformers.env.allowRemoteModels = false;

  let rawPipeline: unknown;

  try {
    rawPipeline = await transformers.pipeline(
      'automatic-speech-recognition',
      modelPath,
      { local_files_only: true, dtype: 'q8' },
    );
  } catch {
    throw new Error(
      'Speech model is missing from the app bundle (reinstall / repair runtime).',
    );
  }

  if (typeof rawPipeline !== 'function') {
    throw new Error(
      'Speech model is missing from the app bundle (reinstall / repair runtime).',
    );
  }

  const callable = rawPipeline as WhisperPipeline;

  return async (audio, options) => callable(audio, options);
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
  const loading = factory(VOICE_STT_MODEL_PATH, language).catch(
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
 * Transcribe validated 16 kHz mono PCM. Never throws: model and inference
 * failures return typed errors so the capture controller fails closed.
 */
export const transcribeUtterance = async (
  samples: PcmData,
  language: SttLanguage,
  factory: WhisperPipelineFactory = defaultWhisperPipelineFactory,
): Promise<TranscribeResult> => {
  if (samples.length === 0) {
    return {
      ok: false,
      error: { code: 'empty-audio', message: 'Nothing to transcribe.' },
    };
  }

  let pipeline: WhisperPipeline;

  try {
    pipeline = await getPipeline(language, factory);
  } catch {
    return {
      ok: false,
      error: {
        code: 'model-missing',
        message:
          'Speech model is missing from the app bundle (reinstall / repair runtime).',
      },
    };
  }

  let output: SttRawOutput;

  try {
    output = await pipeline(samples, {
      task: 'transcribe',
      ...(language === 'auto' ? {} : { language }),
      chunk_length_s: VOICE_STT_CHUNK_LENGTH_S,
      stride_length_s: VOICE_STT_STRIDE_LENGTH_S,
    });
  } catch {
    return {
      ok: false,
      error: {
        code: 'transcribe-failed',
        message: 'Speech transcription failed.',
      },
    };
  }

  return { ok: true, text: readTranscriptText(output) };
};

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  adaptRawPipeline,
  VOICE_STT_CHUNK_LENGTH_S,
  VOICE_STT_SINGLE_PASS_MAX_SAMPLES,
  VOICE_STT_MODEL_ID,
  VOICE_STT_STRIDE_LENGTH_S,
  configureVoiceSttRuntime,
  resetSttPipelineCacheForTests,
  resolveVoiceSttBaseUrl,
  transcribeUtterance,
  type VoiceSttRuntimeEnv,
  type WhisperPipeline,
  type WhisperPipelineFactory,
} from '../stt.ts';

const makeRuntimeEnv = (): VoiceSttRuntimeEnv => ({
  allowRemoteModels: false,
  remoteHost: 'https://huggingface.co/',
  remotePathTemplate: '{model}/resolve/{revision}/',
  backends: { onnx: { wasm: {} } },
});

describe('configureVoiceSttRuntime', () => {
  it('pins model + WASM to the app origin under the base path (positive)', () => {
    const env = makeRuntimeEnv();
    configureVoiceSttRuntime(env, 'https://kiosk.example/subway/');

    assert.equal(env.allowRemoteModels, true);
    assert.equal(env.remoteHost, 'https://kiosk.example/subway/voice-models/');
    assert.equal(env.remotePathTemplate, '{model}/');
    assert.deepEqual(env.backends.onnx.wasm.wasmPaths, {
      mjs: 'https://kiosk.example/subway/voice-models/ort/ort-wasm-simd-threaded.asyncify.mjs',
      wasm: 'https://kiosk.example/subway/voice-models/ort/ort-wasm-simd-threaded.asyncify.wasm',
    });
  });

  it('keeps a configured model host when the runtime env is reused (positive)', () => {
    const env = makeRuntimeEnv();
    configureVoiceSttRuntime(env, 'https://kiosk.example/');
    configureVoiceSttRuntime(env, 'https://kiosk.example/');

    assert.equal(env.remoteHost, 'https://kiosk.example/voice-models/');
  });

  it('never points at Hugging Face or the jsDelivr CDN (negative: offline contract)', () => {
    for (const baseUrl of ['https://kiosk.example/', 'https://kiosk.example/subway/', '/']) {
      const env = makeRuntimeEnv();
      configureVoiceSttRuntime(env, baseUrl);
      const wasmPaths = env.backends.onnx.wasm.wasmPaths as { mjs: string; wasm: string };
      const targets = [env.remoteHost, wasmPaths.mjs, wasmPaths.wasm];

      for (const target of targets) {
        assert.ok(!target.includes('huggingface.co'), `${target} must not use the model hub`);
        assert.ok(!target.includes('jsdelivr'), `${target} must not use the WASM CDN`);
      }
    }
  });

  it('falls back to app-relative paths without a DOM origin (positive: node/SSR)', () => {
    const env = makeRuntimeEnv();
    configureVoiceSttRuntime(env);

    assert.equal(env.remoteHost, '/voice-models/');
    assert.equal(resolveVoiceSttBaseUrl(), '/');
  });
});

describe('transcribeUtterance', () => {
  beforeEach(() => {
    resetSttPipelineCacheForTests();
  });

  const samples = new Float32Array([0.1, -0.2, 0.3]);

  it('transcribes through a cached singleton pipeline (positive)', async () => {
    let factoryCalls = 0;
    const seenOptions: unknown[] = [];
    const factory: WhisperPipelineFactory = async () => {
      factoryCalls += 1;
      const pipeline: WhisperPipeline = async (audio, options) => {
        seenOptions.push(options);
        assert.equal(audio.length, 3);
        return { text: 'hello world' };
      };
      return pipeline;
    };

    const first = await transcribeUtterance(samples, 'en', factory);
    const second = await transcribeUtterance(samples, 'en', factory);

    assert.equal(factoryCalls, 1);
    assert.deepEqual(first, { ok: true, text: 'hello world' });
    assert.deepEqual(second, { ok: true, text: 'hello world' });
    assert.deepEqual(seenOptions[0], {
      task: 'transcribe',
      language: 'en',
    });
  });

  it('omits the language for auto-detection (positive)', async () => {
    let seen: unknown = null;
    const result = await transcribeUtterance(
      samples,
      'auto',
      async () => async (_audio, options) => {
        seen = options;
        return { text: 'x' };
      },
    );
    assert.equal(result.ok, true);
    assert.ok(seen !== null && !('language' in (seen as Record<string, unknown>)));
  });

  it('passes a single-pass call for short mic clips (positive: tech doc §1.2)', async () => {
    let seen: unknown = null;
    await transcribeUtterance(
      samples,
      'de',
      async () => async (_audio, options) => {
        seen = options;
        return { text: 'x' };
      },
    );
    assert.deepEqual(seen, {
      task: 'transcribe',
      language: 'de',
    });
  });

  it('enables long-form chunking only for >= 30 s recordings (positive)', async () => {
    const longSamples = new Float32Array(VOICE_STT_SINGLE_PASS_MAX_SAMPLES + 1);
    let seen: unknown = null;
    await transcribeUtterance(
      longSamples,
      'de',
      async () => async (_audio, options) => {
        seen = options;
        return { text: 'x' };
      },
    );
    assert.deepEqual(seen, {
      task: 'transcribe',
      language: 'de',
      chunk_length_s: VOICE_STT_CHUNK_LENGTH_S,
      stride_length_s: VOICE_STT_STRIDE_LENGTH_S,
    });
  });

  it('joins chunked output with spaces (positive)', async () => {
    const result = await transcribeUtterance(
      samples,
      'de',
      async () => async () => [{ text: 'guten' }, { text: 'Tag' }],
    );
    assert.deepEqual(result, { ok: true, text: 'guten Tag' });
  });

  it('caches per language (positive)', async () => {
    const seenPaths: string[] = [];
    const factory: WhisperPipelineFactory = async (modelPath) => {
      seenPaths.push(modelPath);
      return async () => ({ text: 'x' });
    };
    await transcribeUtterance(samples, 'en', factory);
    await transcribeUtterance(samples, 'fr', factory);
    assert.deepEqual(seenPaths, [VOICE_STT_MODEL_ID, VOICE_STT_MODEL_ID]);
  });

  it('fails closed when the model is missing and retries next time (negative)', async () => {
    let calls = 0;
    const factory: WhisperPipelineFactory = async () => {
      calls += 1;
      throw new Error('no model');
    };
    const first = await transcribeUtterance(samples, 'en', factory);
    const second = await transcribeUtterance(samples, 'en', factory);
    assert.equal(first.ok, false);
    assert.equal(second.ok, false);
    if (!first.ok) {
      assert.equal(first.error.code, 'model-missing');
    }
    assert.equal(calls, 2);
  });

  it('maps inference failures to transcribe-failed (negative)', async () => {
    const result = await transcribeUtterance(
      samples,
      'en',
      async () => async () => {
        throw new Error('boom');
      },
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, 'transcribe-failed');
    }
  });

  it('rejects empty audio without touching the factory (negative)', async () => {
    let calls = 0;
    const result = await transcribeUtterance(
      new Float32Array(0),
      'en',
      async () => {
        calls += 1;
        return async () => ({ text: 'x' });
      },
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, 'empty-audio');
    }
    assert.equal(calls, 0);
  });
});

describe('adaptRawPipeline (interop robustness)', () => {
  it('passes through a callable pipeline (positive)', async () => {
    const callable = adaptRawPipeline(async () => ({ text: 'hi' }), 'Xenova/whisper-small');
    const out = await callable(new Float32Array([0.1]), { task: 'transcribe' });
    assert.deepEqual(out, { text: 'hi' });
  });

  it('adapts a pipeline object exposing _call (positive: bundles)', async () => {
    const adapted = adaptRawPipeline(
      {
        _call: async (_audio: unknown, options: { task: string }) => ({ text: `called:${options.task}` }),
      },
      'Xenova/whisper-small',
    );
    const out = await adapted(new Float32Array([0.1]), { task: 'transcribe' });
    assert.deepEqual(out, { text: 'called:transcribe' });
  });

  it('fails closed with the resolved URL when not callable (negative)', () => {
    assert.throws(
      () => adaptRawPipeline({ nope: true }, 'Xenova/whisper-small'),
      (error: unknown) =>
        error instanceof Error &&
        error.message.includes('whisper-small') &&
        error.message.includes('reinstall / repair runtime'),
    );
  });
});

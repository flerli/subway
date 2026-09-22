import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  adaptRawPipeline,
  loadPipelineWithFallback,
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

describe('loadPipelineWithFallback (small -> tiny resilience)', () => {
  it('uses the primary when it loads (positive)', async () => {
    const attempts: string[] = [];
    const result = await loadPipelineWithFallback(async (model) => {
      attempts.push(model);
      return `pipeline:${model}`;
    }, 'Xenova/whisper-small', 'Xenova/whisper-tiny');
    assert.equal(result, 'pipeline:Xenova/whisper-small');
    assert.deepEqual(attempts, ['Xenova/whisper-small']);
  });

  it('falls back to tiny when the primary fails (positive: kiosk memory)', async () => {
    const attempts: string[] = [];
    const result = await loadPipelineWithFallback(async (model) => {
      attempts.push(model);
      if (model.includes('small')) {
        throw new Error('oom');
      }
      return `pipeline:${model}`;
    }, 'Xenova/whisper-small', 'Xenova/whisper-tiny');
    assert.equal(result, 'pipeline:Xenova/whisper-tiny');
    assert.deepEqual(attempts, ['Xenova/whisper-small', 'Xenova/whisper-tiny']);
  });

  it('names both models and the URL when both fail (negative)', async () => {
    await assert.rejects(
      loadPipelineWithFallback(async (model) => {
        throw new Error(`fail:${model}`);
      }, 'Xenova/whisper-small', 'Xenova/whisper-tiny'),
      (error: unknown) =>
        error instanceof Error &&
        error.message.includes('whisper-small') &&
        error.message.includes('whisper-tiny') &&
        error.message.includes('voice-models'),
    );
  });
});

describe('transcribeUtterance error surfacing', () => {
  it('propagates the factory message to the caller (positive: on-device diagnosis)', async () => {
    resetSttPipelineCacheForTests();
    const result = await transcribeUtterance(
      new Float32Array([0.1]),
      'de',
      async () => {
        throw new Error('Speech model is missing ...: /voice-models/Xenova/whisper-small/');
      },
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, 'model-missing');
      assert.ok(result.error.message.includes('/voice-models/Xenova/whisper-small/'));
    }
  });
});

describe('external STT endpoint (transcribeViaEndpoint + fallback)', () => {
  const samples = new Float32Array([0.1, -0.2, 0.3]);

  const okFetch = async () =>
    new Response(JSON.stringify({ text: 'Hallo Welt' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  it('uses the endpoint result and never loads the local model (positive)', async () => {
    let factoryCalls = 0;
    const result = await transcribeUtterance(
      samples,
      'de',
      async () => {
        factoryCalls += 1;
        return async () => ({ text: 'local' });
      },
      { endpoint: 'http://127.0.0.1:8080/v1/audio/transcriptions', fetchImpl: okFetch },
    );

    assert.deepEqual(result, { ok: true, text: 'Hallo Welt' });
    assert.equal(factoryCalls, 0);
  });

  it('falls back to the local model when the endpoint fails (negative)', async () => {
    let factoryCalls = 0;
    const failingFetch = async () => {
      throw new Error('connection refused');
    };
    const result = await transcribeUtterance(
      samples,
      'de',
      async () => {
        factoryCalls += 1;
        return async () => ({ text: 'local fallback' });
      },
      { endpoint: 'http://127.0.0.1:8080/v1/audio/transcriptions', fetchImpl: failingFetch },
    );

    assert.deepEqual(result, { ok: true, text: 'local fallback' });
    assert.equal(factoryCalls, 1);
  });

  it('logs per-utterance telemetry (servedBy/lang/samples, no transcript)', async () => {
    resetSttPipelineCacheForTests();
    const lines: string[] = [];
    const originalInfo = console.info;
    console.info = (...args: unknown[]): void => {
      lines.push(args.map((part) => String(part)).join(' '));
    };

    try {
      await transcribeUtterance(
        samples,
        'de',
        async () => {
          throw new Error('must not load local model');
        },
        { endpoint: 'http://127.0.0.1:8080/v1/audio/transcriptions', fetchImpl: okFetch },
      );
    } finally {
      console.info = originalInfo;
    }

    const telemetry = lines.find((line) => line.includes('[voice] stt servedBy='));
    assert.ok(telemetry, `expected telemetry line, got: ${JSON.stringify(lines)}`);
    assert.ok(telemetry.includes('servedBy=endpoint:http://127.0.0.1:8080/v1/audio/transcriptions'));
    assert.ok(telemetry.includes('lang=de'));
    assert.ok(telemetry.includes('samples=3'));
    assert.ok(telemetry.includes('ok=true'));
    assert.ok(!telemetry.includes('Hallo Welt'), 'transcript content must never be logged');
  });

  it('skips the network entirely when forced local (negative)', async () => {
    resetSttPipelineCacheForTests();
    let fetchCalls = 0;
    const result = await transcribeUtterance(
      samples,
      'fr',
      async () => async () => ({ text: 'local' }),
      {
        endpoint: null,
        fetchImpl: async () => {
          fetchCalls += 1;
          return new Response('{}', { status: 200 });
        },
      },
    );

    assert.deepEqual(result, { ok: true, text: 'local' });
    assert.equal(fetchCalls, 0);
  });
});

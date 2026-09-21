import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  VOICE_STT_CHUNK_LENGTH_S,
  VOICE_STT_MODEL_PATH,
  VOICE_STT_STRIDE_LENGTH_S,
  resetSttPipelineCacheForTests,
  transcribeUtterance,
  type WhisperPipeline,
  type WhisperPipelineFactory,
} from '../stt.ts';

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
      chunk_length_s: VOICE_STT_CHUNK_LENGTH_S,
      stride_length_s: VOICE_STT_STRIDE_LENGTH_S,
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
    assert.deepEqual(seenPaths, [VOICE_STT_MODEL_PATH, VOICE_STT_MODEL_PATH]);
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

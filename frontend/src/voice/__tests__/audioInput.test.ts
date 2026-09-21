import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  VOICE_MAX_SAMPLES,
  VOICE_TARGET_SAMPLE_RATE,
  computeRmsLevel,
  decodeToMono16k,
  downmixAndResample,
  isSilent,
  pickSupportedMimeType,
  validatePcmSamples,
  type PcmData,
  type VoiceAudioBufferLike,
} from '../audioInput.ts';

const fakeBuffer = (
  sampleRate: number,
  channels: PcmData[],
): VoiceAudioBufferLike => ({
  sampleRate,
  numberOfChannels: channels.length,
  getChannelData: (channel: number): PcmData => {
    const data = channels[channel];
    if (!data) {
      throw new Error(`Channel ${channel} out of range.`);
    }
    return data;
  },
});

describe('downmixAndResample', () => {
  it('resamples 44.1 kHz stereo to 16 kHz mono with the expected length', () => {
    const left = new Float32Array(44100).fill(0.5);
    const right = new Float32Array(44100).fill(0.5);
    const out = downmixAndResample([left, right], 44100, VOICE_TARGET_SAMPLE_RATE);
    assert.equal(out.length, 16000);
    assert.ok(Math.abs(out[0] - 0.5) < 1e-6);
  });

  it('averages stereo channels into mono', () => {
    const left = new Float32Array([1, 1, 1, 1]);
    const right = new Float32Array([-1, -1, -1, -1]);
    const out = downmixAndResample([left, right], 16000, 16000);
    assert.equal(out.length, 4);
    for (const sample of out) {
      assert.ok(Math.abs(sample) < 1e-6);
    }
  });

  it('passes 16 kHz mono through unchanged in length', () => {
    const mono = new Float32Array(16000).fill(0.25);
    const out = downmixAndResample([mono], 16000, 16000);
    assert.equal(out.length, 16000);
    assert.ok(Math.abs(out[8000] - 0.25) < 1e-6);
  });

  it('rejects empty and invalid input without throwing', () => {
    assert.equal(downmixAndResample([], 44100).length, 0);
    assert.equal(
      downmixAndResample([new Float32Array(0)], 44100).length,
      0,
    );
    assert.equal(
      downmixAndResample([new Float32Array([1])], 0).length,
      0,
    );
  });
});

describe('validatePcmSamples', () => {
  it('accepts valid PCM', () => {
    assert.equal(validatePcmSamples(new Float32Array([0.1, -0.2])), null);
  });

  it('rejects empty input (negative: silence-as-empty)', () => {
    const error = validatePcmSamples(new Float32Array(0));
    assert.equal(error?.code, 'empty');
  });

  it('rejects oversized input (negative: over the 5-minute cap)', () => {
    const error = validatePcmSamples(new Float32Array(VOICE_MAX_SAMPLES + 1));
    assert.equal(error?.code, 'too-long');
  });

  it('rejects non-finite samples (negative: corrupt decode)', () => {
    const error = validatePcmSamples(new Float32Array([0.1, Number.NaN]));
    assert.equal(error?.code, 'decode-failed');
  });
});

describe('computeRmsLevel + isSilent', () => {
  it('measures full-scale and silence', () => {
    assert.equal(computeRmsLevel(new Float32Array(0)), 0);
    assert.ok(Math.abs(computeRmsLevel(new Float32Array([1, 1, -1, -1])) - 1) < 1e-6);
    assert.equal(computeRmsLevel(new Float32Array([0, 0, 0])), 0);
  });

  it('classifies silence for the auto-stop threshold', () => {
    assert.equal(isSilent(0), true);
    assert.equal(isSilent(0.5), false);
    assert.equal(isSilent(0.05, 0.1), true);
  });
});

describe('pickSupportedMimeType', () => {
  it('picks the first supported candidate', () => {
    assert.equal(
      pickSupportedMimeType(['a', 'b'], (mime: string) => mime === 'b'),
      'b',
    );
  });

  it('returns empty when nothing is supported (negative)', () => {
    assert.equal(pickSupportedMimeType(['a'], () => false), '');
  });

  it('skips throwing probes (negative: broken MediaRecorder)', () => {
    assert.equal(
      pickSupportedMimeType(['a', 'b'], (mime: string) => {
        if (mime === 'a') {
          throw new Error('boom');
        }
        return true;
      }),
      'b',
    );
  });
});

describe('decodeToMono16k', () => {
  it('decodes and normalizes via the injected decoder (positive)', async () => {
    const source = fakeBuffer(44100, [
      new Float32Array(44100).fill(0.5),
      new Float32Array(44100).fill(0.5),
    ]);
    const result = await decodeToMono16k(new Blob(['x']), {
      decodeAudioData: async () => source,
      renderMonoAt16k: async (
        decoded: VoiceAudioBufferLike,
        targetLength: number,
      ) =>
        fakeBuffer(VOICE_TARGET_SAMPLE_RATE, [
          downmixAndResample(
            [decoded.getChannelData(0), decoded.getChannelData(1)],
            decoded.sampleRate,
            VOICE_TARGET_SAMPLE_RATE,
          ).slice(0, targetLength),
        ]),
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.samples.length, 16000);
    }
  });

  it('fails closed when decoding throws (negative)', async () => {
    const result = await decodeToMono16k(new Blob(['x']), {
      decodeAudioData: async () => {
        throw new Error('nope');
      },
      renderMonoAt16k: async () => fakeBuffer(16000, [new Float32Array(1)]),
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, 'decode-failed');
    }
  });

  it('rejects over-cap recordings before rendering (negative)', async () => {
    const source = fakeBuffer(44100, [new Float32Array(44100 * 301).fill(0.1)]);
    let rendered = false;
    const result = await decodeToMono16k(new Blob(['x']), {
      decodeAudioData: async () => source,
      renderMonoAt16k: async () => {
        rendered = true;
        return fakeBuffer(16000, [new Float32Array(1)]);
      },
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, 'too-long');
    }
    assert.equal(rendered, false);
  });
});

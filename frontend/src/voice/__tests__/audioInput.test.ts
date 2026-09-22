import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  VOICE_MAX_SAMPLES,
  VOICE_TARGET_SAMPLE_RATE,
  computeRmsLevel,
  decodeToMono16k,
  downmixAndResample,
  encodeWavBlob,
  isSilent,
  normalizeSpeechLevel,
  pickSupportedMimeType,
  trimSilenceEdges,
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

describe('trimSilenceEdges', () => {
  it('removes leading/trailing silent frames and keeps speech (positive)', () => {
    const silence = new Float32Array(16000 * 0.2).fill(0);
    const speech = new Float32Array(16000 * 0.4).fill(0.4);
    const input = new Float32Array([
      ...silence,
      ...speech,
      ...silence,
    ]);
    const trimmed = trimSilenceEdges(input);
    assert.ok(trimmed.length < input.length);
    assert.ok(trimmed.length >= speech.length);
    assert.ok(Math.abs((trimmed[0] ?? 0) - 0.4) < 1e-6);
    assert.ok(Math.abs((trimmed[trimmed.length - 1] ?? 0) - 0.4) < 1e-6);
  });

  it('keeps at least one frame so the result is never empty (negative)', () => {
    const allSilent = new Float32Array(16000).fill(0);
    const trimmed = trimSilenceEdges(allSilent);
    assert.ok(trimmed.length > 0);
  });

  it('leaves short/clean input effectively unchanged (positive)', () => {
    const speech = new Float32Array([0.2, 0.3, 0.4, 0.1]);
    const trimmed = trimSilenceEdges(speech);
    assert.equal(trimmed.length, 4);
    for (let index = 0; index < 4; index += 1) {
      assert.ok(Math.abs((trimmed[index] ?? 0) - speech[index]!) < 1e-6);
    }
  });
});

describe('normalizeSpeechLevel', () => {
  it('lifts quiet speech toward the target without clipping (positive)', () => {
    const quiet = new Float32Array(16000).fill(0.05);
    const normalized = normalizeSpeechLevel(quiet, 0.15);
    assert.ok(computeRmsLevel(normalized) > 0.1);
    let peak = 0;
    for (const sample of normalized) {
      peak = Math.max(peak, Math.abs(sample));
    }
    assert.ok(peak <= 0.95);
  });

  it('is a no-op for loud or empty input (negative)', () => {
    const loud = new Float32Array([0.5, 0.6, 0.4]);
    assert.deepEqual(normalizeSpeechLevel(loud), loud);
    assert.equal(normalizeSpeechLevel(new Float32Array(0)).length, 0);
  });
});

describe('encodeWavBlob', () => {
  it('writes a valid RIFF header with round-tripped samples (positive)', async () => {
    const samples = new Float32Array([0.5, -0.5, 0.0, 1.0, -1.0]);
    const blob = encodeWavBlob(samples, 16000);

    assert.equal(blob.type, 'audio/wav');
    assert.equal(blob.size, 44 + samples.length * 2);

    const view = new DataView(await blob.arrayBuffer());
    const ascii = (offset: number, length: number): string => {
      let text = '';
      for (let index = 0; index < length; index += 1) {
        text += String.fromCharCode(view.getUint8(offset + index));
      }
      return text;
    };

    assert.equal(ascii(0, 4), 'RIFF');
    assert.equal(ascii(8, 4), 'WAVE');
    assert.equal(ascii(12, 4), 'fmt ');
    assert.equal(view.getUint32(24, true), 16000);
    assert.equal(ascii(36, 4), 'data');
    assert.ok(Math.abs(view.getInt16(44, true) / 32767 - 0.5) < 0.001);
    assert.ok(Math.abs(view.getInt16(46, true) / 32768 + 0.5) < 0.001);
    assert.equal(view.getInt16(50, true), 32767);
    assert.equal(view.getInt16(52, true), -32767);
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

  it('reports a 0-byte recording as empty, never decode-failed (negative: defect regression)', async () => {
    let decoderCalls = 0;
    const result = await decodeToMono16k(new Blob([]), {
      decodeAudioData: async () => {
        decoderCalls += 1;
        return fakeBuffer(16000, [new Float32Array(1)]);
      },
      renderMonoAt16k: async () => fakeBuffer(16000, [new Float32Array(1)]),
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, 'empty');
    }
    assert.equal(decoderCalls, 0);
  });
});

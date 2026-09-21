import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  encodeMp3DataUrl,
  parseWavSamples,
  synthesizeVoice,
  VoiceTtsError,
} from '../tts.ts';

const buildWav = (
  frames: number[][],
  sampleRate: number,
  bitsPerSample: number = 16,
  audioFormat: number = 1,
): ArrayBuffer => {
  const channels = frames.length;
  const bytesPerSample = bitsPerSample / 8;
  const dataLength = frames[0]?.length ?? 0;
  const buffer = new ArrayBuffer(44 + dataLength * channels * bytesPerSample);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, text: string): void => {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index));
    }
  };

  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + dataLength * channels * bytesPerSample, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, audioFormat, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * bytesPerSample, true);
  view.setUint16(32, channels * bytesPerSample, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(36, 'data');
  view.setUint32(40, dataLength * channels * bytesPerSample, true);

  let cursor = 44;
  for (let frame = 0; frame < dataLength; frame += 1) {
    for (let channel = 0; channel < channels; channel += 1) {
      const sample = frames[channel]?.[frame] ?? 0;

      if (audioFormat === 3) {
        view.setFloat32(cursor, sample, true);
      } else if (bitsPerSample === 8) {
        view.setUint8(cursor, Math.round(sample * 128 + 128));
      } else if (bitsPerSample === 16) {
        view.setInt16(cursor, Math.round(sample * 32767), true);
      } else if (bitsPerSample === 24) {
        const raw = Math.round(sample * 8388607);
        const unsigned = raw < 0 ? raw + 0x1000000 : raw;
        view.setUint8(cursor, unsigned & 0xff);
        view.setUint8(cursor + 1, (unsigned >> 8) & 0xff);
        view.setUint8(cursor + 2, (unsigned >> 16) & 0xff);
      } else {
        view.setInt32(cursor, Math.round(sample * 2147483647), true);
      }

      cursor += bytesPerSample;
    }
  }

  return buffer;
};

const sine = (length: number, amplitude = 0.5): number[] => {
  const out: number[] = [];
  for (let index = 0; index < length; index += 1) {
    out.push(Math.sin((index / 16000) * Math.PI * 2 * 440) * amplitude);
  }
  return out;
};

describe('parseWavSamples', () => {
  it('parses 16-bit mono with rate and amplitude intact (positive)', () => {
    const wave = sine(160);
    const { samples, sampleRate } = parseWavSamples(buildWav([wave], 16000));
    assert.equal(sampleRate, 16000);
    assert.equal(samples.length, 160);
    for (const index of [0, 7, 40, 99, 159]) {
      assert.ok(Math.abs((samples[index] ?? 0) - (wave[index] ?? 0)) < 0.001);
    }
  });

  it('parses 8/24-bit and float, downmixing stereo (positive)', () => {
    const quiet = sine(100, 0.25);
    const eight = parseWavSamples(buildWav([quiet], 22050, 8));
    assert.equal(eight.sampleRate, 22050);
    assert.ok(Math.abs((eight.samples[25] ?? 0) - (quiet[25] ?? 0)) < 0.02);

    const wave = sine(100);
    const twentyFour = parseWavSamples(buildWav([wave], 44100, 24));
    assert.equal(twentyFour.samples.length, 100);
    assert.ok(Math.abs((twentyFour.samples[25] ?? 0) - (wave[25] ?? 0)) < 1e-6);

    const float = parseWavSamples(buildWav([wave], 44100, 32, 3));
    assert.ok(Math.abs((float.samples[25] ?? 0) - (wave[25] ?? 0)) < 1e-6);

    const stereo = parseWavSamples(
      buildWav([new Array(100).fill(1), new Array(100).fill(-1)], 16000),
    );
    assert.equal(stereo.samples.length, 100);
    assert.ok(Math.abs(stereo.samples[0] ?? 1) < 1e-6);
  });

  it('rejects garbage, truncation, and exotic formats (negative)', () => {
    assert.throws(() => parseWavSamples(new ArrayBuffer(10)), VoiceTtsError);
    const garbage = new ArrayBuffer(64);
    new Uint8Array(garbage).fill(65);
    assert.throws(() => parseWavSamples(garbage), VoiceTtsError);

    const wav = buildWav([sine(10)], 16000);
    assert.throws(
      () => parseWavSamples(wav.slice(0, 30)),
      VoiceTtsError,
    );

    const alaw = buildWav([sine(10)], 16000, 16, 6);
    assert.throws(() => parseWavSamples(alaw), VoiceTtsError);
  });
});

describe('encodeMp3DataUrl', () => {
  it('encodes sine PCM to a labeled MP3 data URL (positive)', async () => {
    const samples = new Float32Array(sine(16000));
    const { audioDataUrl, durationMs } = await encodeMp3DataUrl(samples, 16000);
    assert.ok(audioDataUrl.startsWith('data:audio/mpeg;base64,'));
    assert.ok(audioDataUrl.length > 1000);
    assert.equal(durationMs, 1000);
  });

  it('rejects empty input (negative)', async () => {
    await assert.rejects(
      encodeMp3DataUrl(new Float32Array(0), 16000),
      VoiceTtsError,
    );
  });
});

describe('synthesizeVoice', () => {
  it('rejects empty text without network (negative)', async () => {
    await assert.rejects(
      synthesizeVoice({ text: '   ', voice: 'M1', lang: 'en' }),
      (error: unknown) =>
        error instanceof VoiceTtsError && error.code === 'invalid-input',
    );
  });
});

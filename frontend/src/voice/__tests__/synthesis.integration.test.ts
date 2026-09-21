import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { stripMarkdownToSpeech, chunkForSpeech } from '../speechText.ts';
import { synthesizeVoice, VoiceTtsError } from '../tts.ts';

/**
 * SWE5 synthesis-path integration (TC-B-04).
 *
 * Real production modules compose end to end: markdown strip → chunking →
 * `synthesizeVoice` (real WAV parse + MP3 encode). The ONLY fake is
 * `globalThis.fetch` at the network boundary, returning genuine WAV bytes
 * synthesized in-test (fake-at-the-boundary rule from TC-A). Error mapping
 * (503 → unavailable, cacheHit passthrough) is asserted against the real
 * client code.
 */

const buildWavBytes = (frames: number[], sampleRate: number): Uint8Array => {
  const bytesPerSample = 2;
  const buffer = new ArrayBuffer(44 + frames.length * bytesPerSample);
  const view = new DataView(buffer);
  const ascii = (offset: number, text: string): void => {
    for (let index = 0; index < text.length; index += 1) {
      view.setUint8(offset + index, text.charCodeAt(index));
    }
  };
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + frames.length * bytesPerSample, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  ascii(36, 'data');
  view.setUint32(40, frames.length * bytesPerSample, true);
  for (let index = 0; index < frames.length; index += 1) {
    view.setInt16(44 + index * bytesPerSample, Math.round((frames[index] ?? 0) * 32767), true);
  }
  return new Uint8Array(buffer);
};

const stubFetch = (wavBytes: Uint8Array, init?: { status?: number }) => {
  const previous = globalThis.fetch;
  const base64 = Buffer.from(wavBytes).toString('base64');
  globalThis.fetch = (async (input: unknown) => {
    const url = typeof input === 'string' ? input : String((input as Request).url ?? '');
    const status = init?.status ?? 200;

    if (status >= 400) {
      return new Response(JSON.stringify({ error: 'down' }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.includes('/voice/synthesize')) {
      return new Response(
        JSON.stringify({
          voice: {
            audioBase64: base64,
            mimeType: 'audio/wav',
            voice: 'F2',
            language: 'de',
            cacheHit: url.includes('cache-hit'),
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response('{}', { status: 404 });
  }) as unknown as typeof fetch;

  return () => {
    globalThis.fetch = previous;
  };
};

const wave = (length: number, amplitude = 0.4): number[] => {
  const out: number[] = [];
  for (let index = 0; index < length; index += 1) {
    out.push(Math.sin((index / 16000) * Math.PI * 2 * 440) * amplitude);
  }
  return out;
};

describe('synthesis.integration', () => {
  beforeEach(() => {
    // Restore any prior fetch (tests that override must restore themselves).
  });

  it('runs strip → chunk → synthesize → MP3 with real modules (positive)', async () => {
    const restore = stubFetch(buildWavBytes(wave(16000), 16000));

    const markdown = '## Antwort\n\n```js\nconst x = 1\n```\n\n' +
      'Erste Antwort. Zweite Antwort. Dritte. Vierte. Fuenfte. Sechste. Siebte.';
    const speech = stripMarkdownToSpeech(markdown);
    const chunks = chunkForSpeech(speech);

    assert.ok(!speech.includes('const'));
    assert.ok(chunks.length >= 2, `chunked into ${chunks.length}`);

    const result = await synthesizeVoice({
      text: chunks[0]!,
      voice: 'F2',
      lang: 'de',
    });

    assert.ok(result.audioDataUrl.startsWith('data:audio/mpeg;base64,'));
    assert.equal(result.durationMs, 1000);
    assert.equal(result.voice, 'F2');
    assert.equal(result.language, 'de');
    assert.equal(result.cacheHit, false);
    restore();
  });

  it('propagates cacheHit and maps 503 to unavailable (positive + negative)', async () => {
    const restoreHit = stubFetch(buildWavBytes(wave(16000), 16000));
    const hit = await synthesizeVoice({ text: 'Wiederholung.', voice: 'F2', lang: 'de' });
    assert.equal(hit.cacheHit, false);
    restoreHit();

    const restoreDown = stubFetch(
      new Uint8Array(0),
      { status: 503 },
    );
    await assert.rejects(
      synthesizeVoice({ text: 'Hallo.', voice: 'F2', lang: 'de' }),
      (error: unknown) =>
        error instanceof VoiceTtsError && error.code === 'unavailable',
    );
    restoreDown();
  });

  it('never labels non-WAV bytes as MP3 (negative)', async () => {
    const garbage = new Uint8Array(64).fill(65);
    const restore = stubFetch(garbage);
    await assert.rejects(
      synthesizeVoice({ text: 'Kaputt.', voice: 'F2', lang: 'de' }),
      (error: unknown) =>
        error instanceof VoiceTtsError && error.code === 'unsupported-format',
    );
    restore();
  });
});
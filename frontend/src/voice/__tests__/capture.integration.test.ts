import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  decodeToMono16k,
  downmixAndResample,
  type VoiceAudioBufferLike,
} from '../audioInput.ts';
import {
  resetSttPipelineCacheForTests,
  transcribeUtterance,
} from '../stt.ts';
import { appTextCatalog } from '../../i18n/appText.ts';
import { resolveVoiceErrorCopy } from '../voiceCopy.ts';
import { VoiceCaptureController } from '../voiceCapture.ts';

/**
 * SWE5 capture-path integration (TC-A-04).
 *
 * Fakes exist ONLY at the three unrunnable-in-Node boundaries: microphone
 * hardware (permission/stream), Web Audio decode (synthetic PCM still flows
 * through the REAL downmix/validate math), and the Whisper weights (fake
 * pipeline factory — the REAL singleton cache + option plumbing run).
 * Everything else — decode, validation, transcription plumbing, vocabulary
 * repair, copy mapping — is production code under test.
 */

const SYNTHETIC_RATE = 44100;

const syntheticStereoSecond = (): VoiceAudioBufferLike => {
  const left = new Float32Array(SYNTHETIC_RATE);
  const right = new Float32Array(SYNTHETIC_RATE);

  for (let index = 0; index < SYNTHETIC_RATE; index += 1) {
    const sample = Math.sin((index / SYNTHETIC_RATE) * Math.PI * 2 * 440) * 0.5;
    left[index] = sample;
    right[index] = sample;
  }

  return {
    sampleRate: SYNTHETIC_RATE,
    numberOfChannels: 2,
    getChannelData: (channel: number) => (channel === 0 ? left : right),
  };
};

const makeStream = (released: string[]): MediaStream => {
  const track = {
    stop: (): void => {
      released.push('track');
    },
  };
  return {
    getTracks: () => [track],
  } as unknown as MediaStream;
};

describe('capture.integration', () => {
  beforeEach(() => {
    resetSttPipelineCacheForTests();
  });

  it('runs permission → PCM → STT → correction → submit with real modules (positive)', async () => {
    const released: string[] = [];
    const submitted: string[] = [];
    const seenSampleLengths: number[] = [];
    let factoryCalls = 0;

    const controller = new VoiceCaptureController({
      requestPermission: async () => ({ ok: true, stream: makeStream(released) }),
      createRecorder: () => ({
        stop: async () => new Blob(['utterance']),
        cancel: () => undefined,
      }),
      decode: (recording) =>
        decodeToMono16k(recording, {
          decodeAudioData: async () => syntheticStereoSecond(),
          renderMonoAt16k: async (decoded, targetLength) => {
            const mono = downmixAndResample(
              [decoded.getChannelData(0), decoded.getChannelData(1)],
              decoded.sampleRate,
              16000,
            ).slice(0, targetLength);
            return {
              sampleRate: 16000,
              numberOfChannels: 1,
              getChannelData: () => mono,
            };
          },
        }),
      transcribe: (samples, language) => {
        seenSampleLengths.push(samples.length);
        return transcribeUtterance(samples, language, async () => {
          factoryCalls += 1;
          return async () => ({ text: 'frage swabian nach dem sky-co wetter' });
        });
      },
      submit: async (transcript: string) => {
        submitted.push(transcript);
      },
      isBusy: () => false,
      sampleInputLevel: null,
    });

    await controller.start('de');
    await controller.stop();

    assert.equal(controller.getSnapshot().state, 'idle');
    // One synthetic second at 44.1 kHz stereo normalizes to exactly 16 000 mono samples.
    assert.deepEqual(seenSampleLengths, [16000]);
    assert.equal(factoryCalls, 1);
    assert.deepEqual(submitted, ['frage Swaibian nach dem scaiCo wetter']);
    assert.deepEqual(released, ['track']);
  });

  it('chains real model-missing into localized guidance (negative)', async () => {
    const controller = new VoiceCaptureController({
      requestPermission: async () => ({ ok: true, stream: makeStream([]) }),
      createRecorder: () => ({
        stop: async () => new Blob(['utterance']),
        cancel: () => undefined,
      }),
      decode: async () => ({ ok: true, samples: new Float32Array([0.1]) }),
      transcribe: (samples, language) =>
        transcribeUtterance(samples, language, async () => {
          throw new Error('no weights in CI');
        }),
      submit: async () => undefined,
      isBusy: () => false,
      sampleInputLevel: null,
    });

    await controller.start('en');
    await controller.stop();

    const snapshot = controller.getSnapshot();
    assert.equal(snapshot.error?.code, 'model-missing');
    assert.ok(resolveVoiceErrorCopy(appTextCatalog.en, 'model-missing').length > 0);
    assert.ok(resolveVoiceErrorCopy(appTextCatalog.de, 'model-missing').length > 0);
  });

  it('surfaces real decode-stage emptiness without submitting (negative)', async () => {
    const emptyBuffer = {
      sampleRate: 44100,
      numberOfChannels: 1,
      getChannelData: () => new Float32Array(0),
    };
    const emptyRendered = {
      sampleRate: 16000,
      numberOfChannels: 1,
      getChannelData: () => new Float32Array(0),
    };
    let submits = 0;
    let transcribes = 0;
    const controller = new VoiceCaptureController({
      requestPermission: async () => ({ ok: true, stream: makeStream([]) }),
      createRecorder: () => ({
        stop: async () => new Blob(['utterance']),
        cancel: () => undefined,
      }),
      decode: (recording) =>
        decodeToMono16k(recording, {
          decodeAudioData: async () => emptyBuffer,
          renderMonoAt16k: async () => emptyRendered,
        }),
      transcribe: async () => {
        transcribes += 1;
        return { ok: true as const, text: 'hello' };
      },
      submit: async () => {
        submits += 1;
      },
      isBusy: () => false,
      sampleInputLevel: null,
    });

    await controller.start('en');
    await controller.stop();

    // The REAL decoder rejects empty PCM before transcription is attempted.
    assert.equal(controller.getSnapshot().error?.code, 'empty');
    assert.equal(transcribes, 0);
    assert.equal(submits, 0);
  });

  it('propagates submit rejection without swallowing auth semantics (negative)', async () => {
    const controller = new VoiceCaptureController({
      requestPermission: async () => ({ ok: true, stream: makeStream([]) }),
      createRecorder: () => ({
        stop: async () => new Blob(['utterance']),
        cancel: () => undefined,
      }),
      decode: async () => ({ ok: true, samples: new Float32Array([0.1]) }),
      transcribe: async () => ({ ok: true as const, text: 'hello' }),
      submit: async () => {
        // Mirrors the authenticated API surface: session failures reject,
        // and voice reports them instead of masking them as success.
        throw new Error('Unauthorized');
      },
      isBusy: () => false,
      sampleInputLevel: null,
    });

    await controller.start('en');
    await controller.stop();

    const snapshot = controller.getSnapshot();
    assert.equal(snapshot.error?.code, 'submit-failed');
    assert.equal(snapshot.transcript, 'hello');
  });
});

import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  VoiceCaptureController,
  isVoiceCaptureActiveState,
  type VoiceCaptureDeps,
  type VoiceCaptureTimers,
} from '../voiceCapture.ts';

const makeTimers = () => {
  let timeoutCallback: (() => void) | null = null;
  let intervalCallback: (() => void) | null = null;
  const timers: VoiceCaptureTimers = {
    setTimeout: (callback: () => void): unknown => {
      timeoutCallback = callback;
      return 'timeout';
    },
    clearTimeout: (handle: unknown): void => {
      if (handle === 'timeout') {
        timeoutCallback = null;
      }
    },
    setInterval: (callback: () => void): unknown => {
      intervalCallback = callback;
      return 'interval';
    },
    clearInterval: (handle: unknown): void => {
      if (handle === 'interval') {
        intervalCallback = null;
      }
    },
  };
  return {
    timers,
    fireTimeout: (): void => {
      timeoutCallback?.();
    },
    fireInterval: (): void => {
      intervalCallback?.();
    },
  };
};

const flushMicrotasks = async (rounds: number = 20): Promise<void> => {
  for (let index = 0; index < rounds; index += 1) {
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
  }
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

interface Harness {
  controller: VoiceCaptureController;
  submitted: string[];
  released: string[];
  timers: ReturnType<typeof makeTimers>;
  transcribeCalls: Array<{ length: number; language: string }>;
}

const makeHarness = (
  overrides: Partial<VoiceCaptureDeps> = {},
  sampler: (() => number) | null = null,
): Harness => {
  const submitted: string[] = [];
  const released: string[] = [];
  const timers = makeTimers();
  const transcribeCalls: Array<{ length: number; language: string }> = [];
  const deps: VoiceCaptureDeps = {
    requestPermission: async () => ({ ok: true, stream: makeStream(released) }),
    createRecorder: () => ({
      stop: async () => new Blob(['audio']),
      cancel: () => undefined,
    }),
    decode: async () => ({ ok: true, samples: new Float32Array([0.1, 0.2]) }),
    transcribe: async (samples, language) => {
      transcribeCalls.push({ length: samples.length, language });
      return { ok: true, text: 'ask swabian about sky-co' };
    },
    submit: async (transcript: string) => {
      submitted.push(transcript);
    },
    isBusy: () => false,
    sampleInputLevel: sampler,
    timers: timers.timers,
    silenceThreshold: 0.02,
    silenceTimeoutMs: 400,
    pollIntervalMs: 200,
    maxListeningMs: 60000,
    ...overrides,
  };
  return {
    controller: new VoiceCaptureController(deps),
    submitted,
    released,
    timers,
    transcribeCalls,
  };
};

describe('VoiceCaptureController', () => {
  it('submits the corrected transcript and releases the mic (positive)', async () => {
    const harness = makeHarness();
    await harness.controller.start('en');
    assert.equal(harness.controller.getSnapshot().state, 'listening');
    await harness.controller.stop();
    const snapshot = harness.controller.getSnapshot();
    assert.equal(snapshot.state, 'idle');
    assert.deepEqual(harness.submitted, ['ask Swaibian about scaiCo']);
    assert.equal(snapshot.transcript, 'ask Swaibian about scaiCo');
    assert.deepEqual(harness.released, ['track']);
    assert.equal(harness.transcribeCalls[0]?.language, 'en');
  });

  it('auto-stops after sustained silence (positive)', async () => {
    const harness = makeHarness({}, () => 0);
    await harness.controller.start('de');
    harness.timers.fireInterval();
    assert.equal(harness.controller.getSnapshot().state, 'listening');
    harness.timers.fireInterval();
    await flushMicrotasks();
    assert.equal(harness.controller.getSnapshot().state, 'idle');
    assert.equal(harness.submitted.length, 1);
  });

  it('voice activity resets the silence streak (positive)', async () => {
    let loud = true;
    const harness = makeHarness({}, () => (loud ? 0.5 : 0));
    await harness.controller.start('en');
    harness.timers.fireInterval();
    loud = false;
    harness.timers.fireInterval();
    assert.equal(harness.controller.getSnapshot().state, 'listening');
    assert.equal(harness.submitted.length, 0);
  });

  it('fails closed when busy at start (negative)', async () => {
    let permissionCalls = 0;
    const harness = makeHarness({
      isBusy: () => true,
      requestPermission: async () => {
        permissionCalls += 1;
        return { ok: true, stream: makeStream(harness.released) };
      },
    });
    await harness.controller.start('en');
    assert.equal(harness.controller.getSnapshot().state, 'error');
    assert.equal(harness.controller.getSnapshot().error?.code, 'busy');
    assert.equal(permissionCalls, 0);
  });

  it('fails closed when busy at finalize (negative: turn started mid-utterance)', async () => {
    let busy = false;
    const harness = makeHarness({ isBusy: () => busy });
    await harness.controller.start('en');
    busy = true;
    await harness.controller.stop();
    assert.equal(harness.controller.getSnapshot().error?.code, 'busy');
    assert.equal(harness.submitted.length, 0);
  });

  it('maps denied permission to denied (negative)', async () => {
    const harness = makeHarness({
      requestPermission: async () => ({
        ok: false as const,
        error: { code: 'denied' as const, message: 'denied' },
      }),
    });
    await harness.controller.start('en');
    assert.equal(harness.controller.getSnapshot().error?.code, 'denied');
  });

  it('maps transcription failure and releases the mic (negative)', async () => {
    const harness = makeHarness({
      transcribe: async () => ({
        ok: false as const,
        error: { code: 'transcribe-failed' as const, message: 'bad' },
      }),
    });
    await harness.controller.start('en');
    await harness.controller.stop();
    assert.equal(harness.controller.getSnapshot().error?.code, 'transcribe-failed');
    assert.deepEqual(harness.released, ['track']);
    assert.equal(harness.submitted.length, 0);
  });

  it('rejects unintelligible results without submitting (negative)', async () => {
    const harness = makeHarness({
      transcribe: async () => ({ ok: true as const, text: '   ' }),
    });
    await harness.controller.start('en');
    await harness.controller.stop();
    assert.equal(harness.controller.getSnapshot().error?.code, 'empty');
    assert.equal(harness.submitted.length, 0);
  });

  it('preserves the transcript when submit fails (negative)', async () => {
    const harness = makeHarness({
      submit: async () => {
        throw new Error('offline');
      },
    });
    await harness.controller.start('en');
    await harness.controller.stop();
    const snapshot = harness.controller.getSnapshot();
    assert.equal(snapshot.state, 'error');
    assert.equal(snapshot.error?.code, 'submit-failed');
    assert.equal(snapshot.transcript, 'ask Swaibian about scaiCo');
  });

  it('cancel releases the mic and returns to idle (positive)', async () => {
    const harness = makeHarness();
    await harness.controller.start('en');
    harness.controller.cancel();
    assert.equal(harness.controller.getSnapshot().state, 'idle');
    assert.deepEqual(harness.released, ['track']);
    assert.equal(harness.submitted.length, 0);
  });

  it('ignores stop when idle and double start (negative: misuse)', async () => {
    let permissionCalls = 0;
    const harness = makeHarness({
      requestPermission: async () => {
        permissionCalls += 1;
        return { ok: true, stream: makeStream(harness.released) };
      },
    });
    await harness.controller.stop();
    assert.equal(harness.submitted.length, 0);
    await harness.controller.start('en');
    await harness.controller.start('en');
    assert.equal(permissionCalls, 1);
  });

  it('prefers live stream levels and disposes them on release (positive)', async () => {
    let disposed = 0;
    const harness = makeHarness({
      sampleInputLevel: () => 0.9,
      createStreamLevels: () => ({
        sampler: { sample: () => 0 },
        dispose: () => {
          disposed += 1;
        },
      }),
    });
    await harness.controller.start('en');
    assert.equal(harness.controller.readInputLevel(), 0);
    harness.timers.fireInterval();
    harness.timers.fireInterval();
    await flushMicrotasks();
    assert.equal(harness.submitted.length, 1);
    assert.equal(disposed, 1);
    assert.equal(harness.controller.readInputLevel(), 0);
  });

  it('classifies active capture states for keyboard suppression (positive)', () => {
    assert.equal(isVoiceCaptureActiveState('idle'), false);
    assert.equal(isVoiceCaptureActiveState('error'), false);
    assert.equal(isVoiceCaptureActiveState('requesting'), true);
    assert.equal(isVoiceCaptureActiveState('listening'), true);
    assert.equal(isVoiceCaptureActiveState('transcribing'), true);
    assert.equal(isVoiceCaptureActiveState('submitting'), true);
  });

  it('never logs transcripts or audio (negative: PII)', async () => {
    const calls: unknown[][] = [];
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    console.log = (...args: unknown[]): void => {
      calls.push(args);
    };
    console.error = (...args: unknown[]): void => {
      calls.push(args);
    };
    console.warn = (...args: unknown[]): void => {
      calls.push(args);
    };
    try {
      const harness = makeHarness();
      await harness.controller.start('en');
      await harness.controller.stop();
      assert.equal(harness.submitted.length, 1);
    } finally {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    }
    assert.deepEqual(calls, []);
  });
});

afterEach(() => {
  // Guards the PII test above: console must be intact for the runner.
  assert.equal(typeof console.log, 'function');
});

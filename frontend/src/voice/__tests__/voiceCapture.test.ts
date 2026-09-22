import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  VoiceCaptureController,
  createMediaRecorder,
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

  it('never auto-stops on sustained silence — manual stop only (positive)', async () => {
    const harness = makeHarness({}, () => 0);
    await harness.controller.start('de');
    harness.timers.fireInterval();
    harness.timers.fireInterval();
    harness.timers.fireInterval();
    assert.equal(harness.controller.getSnapshot().state, 'listening');
    assert.equal(harness.submitted.length, 0);
    await harness.controller.stop();
    assert.equal(harness.controller.getSnapshot().state, 'idle');
    assert.equal(harness.submitted.length, 1);
  });

  it('tracks peak input level for telemetry (positive)', async () => {
    let level = 0.1;
    const harness = makeHarness(
      { readTelemetry: () => '[voice] stt servedBy=test' },
      () => level,
    );
    await harness.controller.start('en');
    harness.timers.fireInterval();
    level = 0.4;
    harness.timers.fireInterval();
    level = 0.05;
    harness.timers.fireInterval();
    assert.equal(harness.controller.readPeakInputLevel(), 0.4);
    await harness.controller.stop();
    const telemetry = harness.controller.getSnapshot().telemetry ?? '';
    assert.ok(telemetry.includes('peak=0.400'), telemetry);
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

  it('keeps listening through silence; manual stop submits and disposes (positive)', async () => {
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
    assert.equal(harness.controller.getSnapshot().state, 'listening');
    assert.equal(harness.submitted.length, 0);
    await harness.controller.stop();
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

  it('releases a late-granted stream after cancel-during-request (positive: leak fix)', async () => {
    const released: string[] = [];
    let releasePermission!: () => void;
    const gate = new Promise<MediaStream>((resolve) => {
      releasePermission = () => {
        resolve(makeStream(released));
      };
    });
    const controller = new VoiceCaptureController({
      requestPermission: () => gate.then((stream) => ({ ok: true as const, stream })),
      isBusy: () => false,
    });
    const started = controller.start('en');
    controller.cancel();
    releasePermission();
    await started;
    await flushMicrotasks();
    assert.equal(controller.getSnapshot().state, 'idle');
    assert.deepEqual(released, ['track']);
  });

  it('carries the STT telemetry line into the snapshot (positive: UI field)', async () => {
    const harness = makeHarness({
      readTelemetry: () => '[voice] stt servedBy=endpoint de samples=100 ok=true',
    });
    await harness.controller.start('en');
    await harness.controller.stop();
    const telemetry = harness.controller.getSnapshot().telemetry ?? '';
    assert.ok(
      telemetry.includes('[voice] stt servedBy=endpoint de samples=100 ok=true'),
      telemetry,
    );
    assert.ok(telemetry.includes('peak='), telemetry);
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

/**
 * Fake `MediaRecorder` for the production-factory tests. Models the spec
 * behaviors the factory relies on: `isTypeSupported` negotiation, `start()`
 * moving the recorder to `recording`, and `stop()` throwing while `inactive`.
 */
class FakeMediaRecorder {
  static instances: FakeMediaRecorder[] = [];
  static supported: string[] = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  static startShouldThrow = false;

  static isTypeSupported(mimeType: string): boolean {
    return FakeMediaRecorder.supported.includes(mimeType);
  }

  state: 'inactive' | 'recording' = 'inactive';
  readonly mimeType: string;
  readonly options: MediaRecorderOptions | undefined;
  payload: Blob | null = new Blob(['recorded-bytes']);
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;

  constructor(_stream: MediaStream, options?: MediaRecorderOptions) {
    this.options = options;
    this.mimeType = options?.mimeType ?? 'audio/webm';
    FakeMediaRecorder.instances.push(this);
  }

  start(): void {
    if (FakeMediaRecorder.startShouldThrow) {
      throw new DOMException('recorder refused to start', 'NotSupportedError');
    }

    this.state = 'recording';
  }

  stop(): void {
    if (this.state !== 'recording') {
      throw new DOMException('recorder is not recording', 'InvalidStateError');
    }

    this.state = 'inactive';

    if (this.payload) {
      this.ondataavailable?.({ data: this.payload });
    }

    this.onstop?.();
  }
}

const resetFakeMediaRecorder = (): void => {
  FakeMediaRecorder.instances = [];
  FakeMediaRecorder.supported = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  FakeMediaRecorder.startShouldThrow = false;
};

const installFakeMediaRecorder = (): (() => void) => {
  const holder = globalThis as { MediaRecorder?: unknown };
  const previous = holder.MediaRecorder;
  holder.MediaRecorder = FakeMediaRecorder;

  return () => {
    if (previous === undefined) {
      delete holder.MediaRecorder;
    } else {
      holder.MediaRecorder = previous;
    }
  };
};

describe('createMediaRecorder (production factory)', () => {
  it('starts capture on creation and returns the recorded bytes (positive: recorder-start regression)', async () => {
    resetFakeMediaRecorder();
    const restore = installFakeMediaRecorder();

    try {
      const recorder = createMediaRecorder(makeStream([]));
      const fake = FakeMediaRecorder.instances.at(-1);

      // Defect regression: without `start()` the recorder stayed `inactive`,
      // `stop()` resolved a 0-byte blob and every utterance died in decode-failed.
      assert.equal(fake?.state, 'recording');
      assert.equal(fake?.options?.mimeType, 'audio/webm;codecs=opus');

      const blob = await recorder.stop();

      assert.ok(blob.size > 0);
      assert.equal(blob.type, 'audio/webm;codecs=opus');
      assert.equal(fake?.state, 'inactive');
    } finally {
      restore();
    }
  });

  it('falls back to the browser default container when nothing is supported (negative: no probe hit)', () => {
    resetFakeMediaRecorder();
    FakeMediaRecorder.supported = [];
    const restore = installFakeMediaRecorder();

    try {
      createMediaRecorder(makeStream([]));
      const fake = FakeMediaRecorder.instances.at(-1);

      assert.equal(fake?.options, undefined);
      assert.equal(fake?.state, 'recording');
    } finally {
      restore();
    }
  });

  it('fails closed when the browser refuses to start recording (negative: unsupported)', async () => {
    resetFakeMediaRecorder();
    FakeMediaRecorder.startShouldThrow = true;
    const restore = installFakeMediaRecorder();

    try {
      assert.throws(() => createMediaRecorder(makeStream([])));

      const harness = makeHarness({
        createRecorder: (stream: MediaStream) => createMediaRecorder(stream),
      });
      await harness.controller.start('en');
      const snapshot = harness.controller.getSnapshot();

      assert.equal(snapshot.state, 'error');
      assert.equal(snapshot.error?.code, 'unsupported');
      assert.deepEqual(harness.released, ['track']);
    } finally {
      restore();
    }
  });

  it('hands real recorded bytes to the decoder through the controller (positive: no silent empty blob)', async () => {
    resetFakeMediaRecorder();
    const restore = installFakeMediaRecorder();
    const decodedSizes: number[] = [];

    try {
      const harness = makeHarness({
        createRecorder: (stream: MediaStream) => createMediaRecorder(stream),
        decode: async (blob: Blob) => {
          decodedSizes.push(blob.size);
          return { ok: true as const, samples: new Float32Array([0.2, 0.3]) };
        },
      });

      await harness.controller.start('en');
      await harness.controller.stop();

      assert.equal(harness.submitted.length, 1);
      assert.equal(decodedSizes.length, 1);
      assert.ok((decodedSizes[0] ?? 0) > 0);
    } finally {
      restore();
    }
  });
});

afterEach(() => {
  // Guards the PII test above: console must be intact for the runner.
  assert.equal(typeof console.log, 'function');
});

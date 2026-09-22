/**
 * Framework-free audio-level monitor. The level circle (TC-A-03) and the
 * level circle consume scalar levels from here — audio buffers
 * never cross this boundary, so nothing downstream can persist or log audio.
 *
 * Why a factory + thin React hook (SW-REQ-013-04 input half): the monitor
 * runs deterministically under fake timers in Node unit tests, while
 * `useAudioLevel.ts` only binds it to React state.
 */

/** Produces one scalar amplitude in [0, 1]; never audio data. */
export interface LevelSampler {
  sample(): number;
}

export interface LevelMonitorOptions {
  /** Emission period in ms (circle target ≈ 10–30 Hz → 33–100 ms). */
  readonly intervalMs?: number;
  /** Exponential smoothing factor in (0, 1]; higher = more responsive. */
  readonly smoothing?: number;
  readonly onLevel?: (level: number) => void;
  readonly setTimer?: (callback: () => void, ms: number) => unknown;
  readonly clearTimer?: (handle: unknown) => void;
}

export interface LevelMonitor {
  start(): void;
  stop(): void;
  isRunning(): boolean;
  currentLevel(): number;
}

/** Clamp any number into the [0, 1] level range (non-finite → 0). */
export const clampLevel = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
};

/** One exponential-smoothing step toward the next sample. */
export const smoothLevel = (
  previous: number,
  next: number,
  smoothing: number = 0.35,
): number => {
  const factor = clampLevel(smoothing);

  return clampLevel(previous + (clampLevel(next) - previous) * factor);
};

/**
 * RMS level from a byte time-domain capture (e.g. `AnalyserNode`
 * `getByteTimeDomainData`). Returns a scalar in [0, 1]; the byte buffer is
 * never retained or returned.
 */
export const sampleRmsFromTimeDomain = (
  readTimeDomain: (target: Uint8Array<ArrayBuffer>) => void,
  fftSize: number,
): number => {
  if (fftSize <= 0) {
    return 0;
  }

  const capture = new Uint8Array(fftSize);

  try {
    readTimeDomain(capture);
  } catch {
    return 0;
  }

  let sumSquares = 0;

  for (const byte of capture) {
    const centered = (byte - 128) / 128;
    sumSquares += centered * centered;
  }

  return clampLevel(Math.sqrt(sumSquares / capture.length) * Math.SQRT2);
};

/** Live level source bound to a microphone stream; dispose releases the graph. */
export interface StreamLevelSource {
  readonly sampler: LevelSampler;
  dispose(): void;
}

/**
 * Attach an analyser to a live mic stream and expose scalar RMS levels.
 * Returns `null` when Web Audio is unavailable — callers fall back to
 * timer-only behavior. The analyser node (not audio) is all that escapes.
 *
 * Why (SW-REQ-013-04 input half): drives both the input circle and the
 * controller's live level source from one live source.
 */
export const createMicrophoneLevelSource = (
  stream: MediaStream,
): StreamLevelSource | null => {
  try {
    if (
      typeof window === 'undefined' ||
      typeof window.AudioContext !== 'function'
    ) {
      return null;
    }

    const context = new window.AudioContext();
    const source = context.createMediaStreamSource(stream);
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    if (context.state === 'suspended') {
      void context.resume().catch(() => undefined);
    }

    return {
      sampler: {
        sample: () =>
          sampleRmsFromTimeDomain(
            (target) => analyser.getByteTimeDomainData(target),
            analyser.fftSize,
          ),
      },
      dispose: (): void => {
        try {
          source.disconnect();
        } catch {
          // Teardown must never throw into the capture controller.
        }

        void context.close().catch(() => undefined);
      },
    };
  } catch {
    return null;
  }
};

/** Create a start/stop level monitor around a scalar sampler. */
export const createLevelMonitor = (
  sampler: LevelSampler,
  options: LevelMonitorOptions = {},
): LevelMonitor => {
  const intervalMs = options.intervalMs ?? 50;
  const smoothing = options.smoothing ?? 0.35;
  const onLevel = options.onLevel;
  const setTimer: (callback: () => void, ms: number) => unknown =
    options.setTimer ?? ((callback, ms) => setInterval(callback, ms));
  // Both DOM (`number`) and Node (`Timeout` object) handles flow through as
  // `unknown`; the platform clear call tolerates handles it did not create.
  const clearTimer: (handle: unknown) => void =
    options.clearTimer ??
    ((handle) => {
      clearInterval(handle as number | undefined);
    });

  let timerHandle: unknown = null;
  let level = 0;

  const tick = (): void => {
    let raw: number;

    try {
      raw = sampler.sample();
    } catch {
      raw = 0;
    }

    level = smoothLevel(level, raw, smoothing);
    onLevel?.(level);
  };

  return {
    start: (): void => {
      if (timerHandle !== null) {
        return;
      }

      timerHandle = setTimer(tick, intervalMs);
    },
    stop: (): void => {
      if (timerHandle === null) {
        return;
      }

      clearTimer(timerHandle);
      timerHandle = null;
      level = 0;
    },
    isRunning: (): boolean => timerHandle !== null,
    currentLevel: (): number => level,
  };
};

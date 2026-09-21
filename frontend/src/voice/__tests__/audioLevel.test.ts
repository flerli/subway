import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  clampLevel,
  createLevelMonitor,
  sampleRmsFromTimeDomain,
  smoothLevel,
} from '../audioLevel.ts';

describe('clampLevel', () => {
  it('clamps into [0, 1] (positive + negative)', () => {
    assert.equal(clampLevel(0.5), 0.5);
    assert.equal(clampLevel(-2), 0);
    assert.equal(clampLevel(7), 1);
    assert.equal(clampLevel(Number.NaN), 0);
  });
});

describe('smoothLevel', () => {
  it('moves toward the next sample and stays bounded', () => {
    const stepped = smoothLevel(0, 1, 0.5);
    assert.equal(stepped, 0.5);
    assert.equal(smoothLevel(0.5, 1, 2), 1);
    assert.equal(smoothLevel(0.5, 1, -1), 0.5);
  });
});

describe('sampleRmsFromTimeDomain', () => {
  it('reads silence as zero (positive)', () => {
    const level = sampleRmsFromTimeDomain(
      (target: Uint8Array) => target.fill(128),
      128,
    );
    assert.equal(level, 0);
  });

  it('reads full-scale as ~1 (positive)', () => {
    const level = sampleRmsFromTimeDomain(
      (target: Uint8Array) => target.fill(255),
      128,
    );
    assert.ok(level > 0.9 && level <= 1);
  });

  it('never throws and never leaks buffers (negative)', () => {
    const throwing = sampleRmsFromTimeDomain(
      () => {
        throw new Error('no analyser');
      },
      128,
    );
    assert.equal(throwing, 0);
    assert.equal(
      sampleRmsFromTimeDomain((t: Uint8Array) => t.fill(200), 0),
      0,
    );
  });
});

describe('createLevelMonitor', () => {
  const makeTimer = () => {
    const callbacks: Array<() => void> = [];
    return {
      callbacks,
      setTimer: (callback: () => void): number => {
        callbacks.push(callback);
        return callbacks.length;
      },
      clearTimer: (handle: unknown): void => {
        const index = (handle as number) - 1;
        callbacks.splice(index, 1);
      },
    };
  };

  it('emits smoothed scalar levels and only scalars (positive)', () => {
    const timer = makeTimer();
    const emitted: unknown[] = [];
    const monitor = createLevelMonitor(
      { sample: () => 1 },
      {
        intervalMs: 50,
        smoothing: 1,
        onLevel: (level: number) => emitted.push(level),
        setTimer: timer.setTimer,
        clearTimer: timer.clearTimer,
      },
    );
    assert.equal(monitor.isRunning(), false);
    monitor.start();
    assert.equal(monitor.isRunning(), true);
    timer.callbacks[0]?.();
    timer.callbacks[0]?.();
    assert.equal(emitted.length, 2);
    for (const level of emitted) {
      assert.equal(typeof level, 'number');
      assert.ok((level as number) >= 0 && (level as number) <= 1);
    }
    assert.equal(monitor.currentLevel(), 1);
    monitor.stop();
    assert.equal(monitor.isRunning(), false);
    assert.equal(monitor.currentLevel(), 0);
  });

  it('treats sampler failures as silence (negative: dead mic)', () => {
    const timer = makeTimer();
    const emitted: number[] = [];
    const monitor = createLevelMonitor(
      {
        sample: () => {
          throw new Error('mic gone');
        },
      },
      {
        smoothing: 1,
        onLevel: (level: number) => emitted.push(level),
        setTimer: timer.setTimer,
        clearTimer: timer.clearTimer,
      },
    );
    monitor.start();
    timer.callbacks[0]?.();
    assert.deepEqual(emitted, [0]);
    monitor.stop();
  });

  it('ignores double start (negative: lifecycle misuse)', () => {
    const timer = makeTimer();
    const monitor = createLevelMonitor({ sample: () => 0.5 }, {
      setTimer: timer.setTimer,
      clearTimer: timer.clearTimer,
    });
    monitor.start();
    monitor.start();
    assert.equal(timer.callbacks.length, 1);
    monitor.stop();
  });
});

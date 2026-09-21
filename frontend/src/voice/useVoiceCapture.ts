import { useEffect, useState } from 'react'
import {
  VoiceCaptureController,
  type VoiceCaptureDeps,
  type VoiceCaptureSnapshot,
} from './voiceCapture.ts'

const idleSnapshot: VoiceCaptureSnapshot = {
  state: 'idle',
  error: null,
  transcript: null,
};

/**
 * React binding for the push-to-talk capture controller.
 *
 * Contract: mirrors the controller snapshot (`state`, `error`, `transcript`)
 * and exposes `start(language)` / `stop()` / `cancel()`. Dependencies refresh
 * every render via `updateDeps` so the controller always calls fresh host
 * closures (thread selection, busy flag, submit).
 *
 * Why (SW-REQ-013-01): the top-bar mic button renders from this hook; all
 * capture logic stays in the framework-free, unit-tested controller.
 */
export function useVoiceCapture(deps: VoiceCaptureDeps): {
  readonly snapshot: VoiceCaptureSnapshot;
  readonly start: (language: unknown) => Promise<void>;
  readonly stop: () => Promise<void>;
  readonly cancel: () => void;
  readonly readLevel: () => number;
} {
  const [controller] = useState(() => new VoiceCaptureController(deps));
  const [snapshot, setSnapshot] = useState<VoiceCaptureSnapshot>(idleSnapshot);

  useEffect(() => {
    controller.updateDeps(deps);
  });

  useEffect(() => controller.subscribe(setSnapshot), [controller]);

  useEffect(
    () => () => {
      controller.cancel();
    },
    [controller],
  );

  return {
    snapshot,
    start: (language: unknown) => controller.start(language),
    stop: () => controller.stop(),
    cancel: () => controller.cancel(),
    readLevel: () => controller.readInputLevel(),
  };
}

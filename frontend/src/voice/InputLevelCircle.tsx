import { useEffect, useMemo, useState } from 'react'
import { useAudioLevel } from './useAudioLevel.ts'
import {
  voiceCircleStyle,
  type VoiceCircleDirection,
} from './voiceCircle.ts'
import type { VoiceCaptureState } from './voiceCapture.ts'

/**
 * Pulsating amplitude circle (SW-REQ-013-04).
 *
 * Contract: scalar level in via `readLevel`, animated locally at ~20 Hz
 * through `useAudioLevel` — parent components never re-render for animation.
 * `prefers-reduced-motion` freezes the pulse. Audio buffers never enter props.
 *
 * Why (input half): the kiosk user sees the circle breathe with their voice
 * while `listening`, a steady glow while working, and red on error — the
 * "I am being heard" feedback. TC-B-02 reuses the language for output.
 */

export interface InputLevelCircleProps {
  /** Scalar source owned by the capture controller (never audio data). */
  readonly readLevel: () => number;
  readonly active: boolean;
  readonly captureState: VoiceCaptureState;
  readonly direction?: VoiceCircleDirection;
  readonly label: string;
}

export function InputLevelCircle({
  readLevel,
  active,
  captureState,
  direction = 'input',
  label,
}: InputLevelCircleProps) {
  const sampler = useMemo(() => ({ sample: () => readLevel() }), [readLevel]);
  const level = useAudioLevel(sampler, active);
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
    };

    query.addEventListener('change', handleChange);

    return () => {
      query.removeEventListener('change', handleChange);
    };
  }, []);

  const style = voiceCircleStyle(level, captureState, direction, reducedMotion);

  return (
    <span
      className={`voice-circle voice-circle--${captureState}`}
      role="img"
      aria-label={label}
      data-voice-level={level.toFixed(2)}
      style={{
        transform: `scale(${style.scale.toFixed(3)})`,
        opacity: style.opacity,
        background: style.background,
        boxShadow: style.boxShadow,
      }}
    />
  );
}

import { useEffect, useMemo, useState } from 'react'
import { useAudioLevel } from './useAudioLevel.ts'
import { voiceCircleStyle, type VoiceCircleDirection } from './voiceCircle.ts'

/**
 * Output-direction pulsating circle (SW-REQ-013-04 output half).
 *
 * Same visual language as the input circle but tuned for synthesized speech:
 * reads scalar output levels (from the playback controller's analyser
 * source) and animates while `playing`. `prefers-reduced-motion` freezes the
 * pulse. TC-B-02 wires this next to the transcript head.
 */

export interface OutputLevelCircleProps {
  readonly readLevel: () => number
  readonly playing: boolean
  readonly label: string
  readonly direction?: VoiceCircleDirection
}

export function OutputLevelCircle({
  readLevel,
  playing,
  label,
  direction = 'output',
}: OutputLevelCircleProps) {
  const sampler = useMemo(() => ({ sample: () => readLevel() }), [readLevel]);
  const level = useAudioLevel(sampler, playing);
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

  // `listening` state drives the pulse math; output palette via direction.
  const style = voiceCircleStyle(
    level,
    playing ? 'listening' : 'idle',
    direction,
    reducedMotion,
  );

  return (
    <span
      className={`voice-circle voice-circle--output${playing ? ' is-playing' : ''}`}
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
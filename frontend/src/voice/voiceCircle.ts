import type { VoiceCaptureState } from './voiceCapture.ts'

/**
 * Presentation math for the voice amplitude circles (SW-REQ-013-04).
 *
 * Why a pure module: circle geometry (scale/opacity/gradient per state) is
 * fully unit-testable without a React harness, and the output-direction
 * circle (TC-B-02) reuses the same visual language with its own palette.
 * Scalar level in, style out — audio buffers never reach the render path.
 */

export type VoiceCircleDirection = 'input' | 'output';

export interface VoiceCircleStyle {
  /** CSS transform scale for the pulsating core. */
  readonly scale: number;
  /** Core opacity. */
  readonly opacity: number;
  /** Halo gradient (direction-tinted transit tones; red on error). */
  readonly background: string;
  /** Outer glow for the listening state. */
  readonly boxShadow: string;
}

const INPUT_GRADIENT =
  'radial-gradient(circle, rgba(74, 168, 255, 0.95) 0%, rgba(139, 92, 246, 0.55) 55%, rgba(139, 92, 246, 0.05) 100%)';
const OUTPUT_GRADIENT =
  'radial-gradient(circle, rgba(52, 211, 153, 0.95) 0%, rgba(74, 168, 255, 0.55) 55%, rgba(74, 168, 255, 0.05) 100%)';
const IDLE_GRADIENT =
  'radial-gradient(circle, rgba(127, 138, 152, 0.5) 0%, rgba(127, 138, 152, 0.08) 100%)';
const ERROR_GRADIENT =
  'radial-gradient(circle, rgba(255, 107, 107, 0.95) 0%, rgba(255, 107, 107, 0.4) 55%, rgba(255, 107, 107, 0.05) 100%)';

/**
 * Style for a scalar level in [0, 1] and a capture state. Out-of-range
 * levels clamp; `reducedMotion` freezes the pulse (accessibility).
 */
export function voiceCircleStyle(
  level: number,
  state: VoiceCaptureState,
  direction: VoiceCircleDirection = 'input',
  reducedMotion: boolean = false,
): VoiceCircleStyle {
  const clamped = Number.isFinite(level) ? Math.min(1, Math.max(0, level)) : 0;

  if (state === 'error') {
    return {
      scale: 1,
      opacity: 0.9,
      background: ERROR_GRADIENT,
      boxShadow: '0 0 12px rgba(255, 107, 107, 0.45)',
    };
  }

  if (state === 'idle') {
    return {
      scale: 1,
      opacity: 0.35,
      background: IDLE_GRADIENT,
      boxShadow: 'none',
    };
  }

  const background = direction === 'output' ? OUTPUT_GRADIENT : INPUT_GRADIENT;
  const active = state === 'listening';

  return {
    scale: reducedMotion ? 1 : 1 + clamped * 0.35,
    opacity: active ? 0.65 + clamped * 0.35 : 0.8,
    background,
    boxShadow: active
      ? `0 0 ${8 + clamped * 16}px rgba(74, 168, 255, ${0.25 + clamped * 0.4})`
      : 'none',
  };
}

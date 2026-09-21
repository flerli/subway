import { InputLevelCircle } from './InputLevelCircle.tsx'
import type { VoiceCaptureState } from './voiceCapture.ts'

/**
 * Top-bar push-to-talk microphone button (SW-REQ-013-01) with integrated
 * input-level circle (SW-REQ-013-04).
 *
 * Contract: presentational only — capture state in, toggle callback out.
 * Localized labels arrive via props (4-language keys wired by the host).
 * Styling reuses the existing `terminal-button` header classes; circle
 * geometry comes from `voiceCircle.ts` (shared visual language with TC-B-02).
 */

export interface VoiceMicButtonProps {
  readonly captureState: VoiceCaptureState;
  /** True while an assistant turn runs (mic disabled in idle to prevent overlap). */
  readonly turnBusy: boolean;
  /** False when `getUserMedia` is unavailable (fail-closed disabled state). */
  readonly supported: boolean;
  readonly onToggle: () => void;
  readonly micLabel?: string;
  readonly stopLabel?: string;
  readonly workingLabel?: string;
  readonly unsupportedLabel?: string;
  /** Scalar source for the circle; circle hidden while `captureState` is idle. */
  readonly readLevel?: () => number;
  readonly circleLabel?: string;
}

export function VoiceMicButton({
  captureState,
  turnBusy,
  supported,
  onToggle,
  micLabel = 'Voice input',
  stopLabel = 'Stop listening',
  workingLabel = 'Working...',
  unsupportedLabel = 'Voice input unavailable',
  readLevel,
  circleLabel,
}: VoiceMicButtonProps) {
  const isActive = captureState === 'requesting' || captureState === 'listening';
  const isWorking = captureState === 'transcribing' || captureState === 'submitting';
  const isDisabled = !supported || isWorking || (captureState === 'idle' && turnBusy);

  const label = !supported
    ? unsupportedLabel
    : isActive
      ? stopLabel
      : isWorking
        ? workingLabel
        : micLabel;

  return (
    <span className="terminal-voice">
      {readLevel && captureState !== 'idle' ? (
        <InputLevelCircle
          readLevel={readLevel}
          active={captureState === 'listening'}
          captureState={captureState}
          label={circleLabel ?? label}
        />
      ) : null}
      <button
        type="button"
        className={`terminal-button terminal-button--voice${isActive ? ' is-active' : ''}`}
        data-voice-state={captureState}
        aria-label={label}
        aria-pressed={isActive}
        disabled={isDisabled}
        onClick={onToggle}
      >
        <span aria-hidden="true">{isActive ? '⏹' : '🎙'}</span>
        <span>{label}</span>
      </button>
    </span>
  );
}

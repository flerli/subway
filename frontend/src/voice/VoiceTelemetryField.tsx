import { useEffect, useRef, useState } from 'react'
import { copyTextToClipboard } from './voiceClipboard.ts'

/**
 * Voice telemetry field (SW-REQ-013-04): a read-only text field showing the
 * last STT telemetry line plus a copy-to-clipboard button, so the exact
 * diagnostics can be pasted into a bug report. The owning panel renders it
 * only when `telemetry` is non-null.
 */

export interface VoiceTelemetryFieldProps {
  readonly telemetry: string
  readonly label: string
  readonly copyLabel: string
  readonly copiedLabel: string
}

export function VoiceTelemetryField({
  telemetry,
  label,
  copyLabel,
  copiedLabel,
}: VoiceTelemetryFieldProps) {
  const [copied, setCopied] = useState(false)
  const [seenTelemetry, setSeenTelemetry] = useState(telemetry)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // A new utterance resets the copied feedback (render-phase adjustment of
  // derived state, per React docs — never in an effect).
  if (seenTelemetry !== telemetry) {
    setSeenTelemetry(telemetry)
    setCopied(false)
  }

  useEffect(
    () => () => {
      if (resetTimerRef.current !== null) {
        clearTimeout(resetTimerRef.current)
      }
    },
    [],
  )

  const handleCopy = async () => {
    const ok = await copyTextToClipboard(telemetry)

    if (ok) {
      setCopied(true)

      if (resetTimerRef.current !== null) {
        clearTimeout(resetTimerRef.current)
      }

      resetTimerRef.current = setTimeout(() => {
        setCopied(false)
        resetTimerRef.current = null
      }, 2000)
    }
  }

  return (
    <div className="assistant-telemetry-row">
      <label className="assistant-telemetry-field">
        <span>{label}</span>
        <input
          className="settings-input assistant-telemetry-input"
          type="text"
          readOnly
          value={telemetry}
          aria-label={label}
          onFocus={(event) => event.currentTarget.select()}
        />
      </label>
      <button
        type="button"
        className="widget-action-button"
        onClick={() => void handleCopy()}
        aria-label={copied ? copiedLabel : copyLabel}
        title={copied ? copiedLabel : copyLabel}
      >
        <span aria-hidden="true">📋</span>
        <span>{copied ? copiedLabel : copyLabel}</span>
      </button>
    </div>
  )
}
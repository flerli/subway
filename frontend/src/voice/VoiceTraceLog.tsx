import { useEffect, useRef, useState } from 'react'
import { copyTextToClipboard } from './voiceClipboard.ts'
import {
  formatVoiceTrace,
  formatVoiceTraceLine,
  type VoiceTraceEvent,
} from './voiceTrace.ts'

/**
 * Voice pipeline trace log: one line per stage (`timestamp +elapsed Δ+delta
 * stage detail`), plus a copy-to-clipboard button so a kiosk diagnosis is
 * one paste. Renders in the assistant extended view's log column; content
 * is counts/ids/models/timings only, never spoken or answered text.
 */
export interface VoiceTraceLogProps {
  readonly events: readonly VoiceTraceEvent[]
  readonly title: string
  readonly emptyCopy: string
  readonly copyLabel: string
  readonly copiedLabel: string
}

export function VoiceTraceLog({
  events,
  title,
  emptyCopy,
  copyLabel,
  copiedLabel,
}: VoiceTraceLogProps) {
  const [copied, setCopied] = useState(false)
  const [seenLength, setSeenLength] = useState(events.length)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // A new trace event resets the copied feedback (render-phase adjustment
  // of derived state, per React docs — never in an effect).
  if (seenLength !== events.length) {
    setSeenLength(events.length)
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
    const ok = await copyTextToClipboard(formatVoiceTrace(events))

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
    <div className="assistant-trace-log">
      <div className="assistant-trace-log__head">
        <p className="widget-kicker">{title}</p>
        <button
          type="button"
          className="widget-action-button"
          onClick={() => void handleCopy()}
          disabled={events.length === 0}
          aria-label={copied ? copiedLabel : copyLabel}
          title={copied ? copiedLabel : copyLabel}
        >
          <span aria-hidden="true">📋</span>
          <span>{copied ? copiedLabel : copyLabel}</span>
        </button>
      </div>
      {events.length === 0 ? (
        <p className="settings-note">{emptyCopy}</p>
      ) : (
        <ol className="assistant-trace-list">
          {events.map((event) => (
            <li key={event.seq}>{formatVoiceTraceLine(event)}</li>
          ))}
        </ol>
      )}
    </div>
  )
}

import {
  useEffect,
  useMemo,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'

export type SoftwareKeyboardTarget = HTMLInputElement | HTMLTextAreaElement

// Layout definition. numberRow is always rendered as row 0 with ⌫ appended.
// rows contains the remaining alpha/symbol rows.
// Issue 3 passes language-specific instances of this type via the layout prop.
export interface KeyboardLayoutDefinition {
  numberRow: readonly string[]
  rows: readonly (readonly string[])[]
}

export const FOUNDATION_LAYOUT: KeyboardLayoutDefinition = {
  numberRow: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  rows: [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', '.', ','],
  ],
}

const hasInputTypeTextContract = (value: string) => {
  const normalizedType = value.trim().toLowerCase()
  return normalizedType.length === 0 || normalizedType === 'text'
}

export const isSupportedSoftwareKeyboardTarget = (
  value: EventTarget | null,
): value is SoftwareKeyboardTarget => {
  if (!(value instanceof HTMLElement)) return false
  if (value instanceof HTMLTextAreaElement) return !value.readOnly && !value.disabled
  if (value instanceof HTMLInputElement)
    return hasInputTypeTextContract(value.type) && !value.readOnly && !value.disabled
  return false
}

const setNativeEditableValue = (target: SoftwareKeyboardTarget, nextValue: string) => {
  const prototype =
    target instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value')
  if (descriptor?.set) descriptor.set.call(target, nextValue)
  else target.value = nextValue
}

const applyEditableKeyPress = (target: SoftwareKeyboardTarget, token: string) => {
  const start = target.selectionStart ?? target.value.length
  const end = target.selectionEnd ?? start
  const next = target.value.slice(0, start) + token + target.value.slice(end)
  setNativeEditableValue(target, next)
  target.setSelectionRange(start + token.length, start + token.length)
  target.dispatchEvent(new Event('input', { bubbles: true }))
}

const applyEditableBackspace = (target: SoftwareKeyboardTarget) => {
  const start = target.selectionStart ?? target.value.length
  const end = target.selectionEnd ?? start
  if (start === 0 && end === 0) return
  const delStart = end > start ? start : start - 1
  setNativeEditableValue(target, target.value.slice(0, delStart) + target.value.slice(end))
  target.setSelectionRange(delStart, delStart)
  target.dispatchEvent(new Event('input', { bubbles: true }))
}

const applyArrowLeft = (target: SoftwareKeyboardTarget) => {
  const pos = Math.max(0, (target.selectionStart ?? 0) - 1)
  target.setSelectionRange(pos, pos)
}

const applyArrowRight = (target: SoftwareKeyboardTarget) => {
  const pos = Math.min(target.value.length, (target.selectionEnd ?? target.value.length) + 1)
  target.setSelectionRange(pos, pos)
}

const applyArrowUp = (target: SoftwareKeyboardTarget) => {
  if (target instanceof HTMLTextAreaElement) {
    const pos = target.selectionStart ?? 0
    const text = target.value
    const lineStart = text.lastIndexOf('\n', pos - 1) + 1
    const prevNewline = text.lastIndexOf('\n', lineStart - 2)
    if (prevNewline < 0) { target.setSelectionRange(0, 0); return }
    const prevLineStart = prevNewline + 1
    const col = pos - lineStart
    const prevLineLen = lineStart - 1 - prevLineStart
    target.setSelectionRange(prevLineStart + Math.min(col, prevLineLen), prevLineStart + Math.min(col, prevLineLen))
  } else {
    target.setSelectionRange(0, 0)
  }
}

const applyArrowDown = (target: SoftwareKeyboardTarget) => {
  if (target instanceof HTMLTextAreaElement) {
    const pos = target.selectionStart ?? 0
    const text = target.value
    const lineStart = text.lastIndexOf('\n', pos - 1) + 1
    const nextNewline = text.indexOf('\n', pos)
    if (nextNewline < 0) { target.setSelectionRange(text.length, text.length); return }
    const nextLineStart = nextNewline + 1
    const nextNextNewline = text.indexOf('\n', nextLineStart)
    const nextLineLen = nextNextNewline < 0 ? text.length - nextLineStart : nextNextNewline - nextLineStart
    const col = pos - lineStart
    const np = nextLineStart + Math.min(col, nextLineLen)
    target.setSelectionRange(np, np)
  } else {
    target.setSelectionRange(target.value.length, target.value.length)
  }
}

const normalizeKeyboardTarget = (
  target: SoftwareKeyboardTarget | null,
): SoftwareKeyboardTarget | null => {
  if (!target) return null
  if (!target.isConnected || !document.contains(target)) return null
  if (!isSupportedSoftwareKeyboardTarget(target)) return null
  return target
}

interface SoftwareKeyboardOverlayProps {
  activeTarget: SoftwareKeyboardTarget | null
  layout?: KeyboardLayoutDefinition
  onRequestClose: () => void
}

export const SoftwareKeyboardOverlay = ({
  activeTarget,
  layout = FOUNDATION_LAYOUT,
  onRequestClose,
}: SoftwareKeyboardOverlayProps) => {
  const [shiftActive, setShiftActive] = useState(false)
  const [pressedKeyId, setPressedKeyId] = useState<string | null>(null)

  const normalizedTarget = useMemo(
    () => normalizeKeyboardTarget(activeTarget),
    [activeTarget],
  )

  useEffect(() => {
    setShiftActive(false)
    setPressedKeyId(null)
  }, [normalizedTarget])

  if (!normalizedTarget) return null

  const keepFocus = () => normalizedTarget.focus({ preventScroll: true })

  const handleKeyPress = (key: string) => {
    keepFocus()
    applyEditableKeyPress(normalizedTarget, shiftActive ? key.toUpperCase() : key)
    if (shiftActive) setShiftActive(false)
  }

  const handleSpace     = () => { keepFocus(); applyEditableKeyPress(normalizedTarget, ' ') }
  const handleBackspace = () => { keepFocus(); applyEditableBackspace(normalizedTarget) }
  const handleLeft      = () => { keepFocus(); applyArrowLeft(normalizedTarget) }
  const handleRight     = () => { keepFocus(); applyArrowRight(normalizedTarget) }
  const handleUp        = () => { keepFocus(); applyArrowUp(normalizedTarget) }
  const handleDown      = () => { keepFocus(); applyArrowDown(normalizedTarget) }

  const handleEnter = () => {
    keepFocus()
    if (
      normalizedTarget instanceof HTMLTextAreaElement &&
      normalizedTarget.dataset.submitOnEnter !== 'true'
    ) {
      applyEditableKeyPress(normalizedTarget, '\n')
    } else {
      normalizedTarget.form?.requestSubmit()
    }
  }

  const handleKeyPressStart = (
    keyId: string,
    action: () => void,
  ) => (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setPressedKeyId(keyId)
    action()
  }

  const handleKeyPressEnd = () => {
    setPressedKeyId(null)
  }

  const renderKey = (key: string) => (
    <button
      key={key}
      type="button"
      className={`software-keyboard__key${pressedKeyId === key ? ' is-pressed' : ''}`}
      onPointerDown={handleKeyPressStart(key, () => handleKeyPress(key))}
      onPointerUp={handleKeyPressEnd}
      onPointerCancel={handleKeyPressEnd}
      onPointerLeave={handleKeyPressEnd}
    >
      {shiftActive ? key.toUpperCase() : key}
    </button>
  )

  return (
    <div className="software-keyboard" aria-hidden="true">
      <div
        className="software-keyboard__panel"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <div className="software-keyboard__head">
          <button
            type="button"
            className="software-keyboard__close"
            onPointerDown={handleKeyPressStart('close', onRequestClose)}
            onPointerUp={handleKeyPressEnd}
            onPointerCancel={handleKeyPressEnd}
            onPointerLeave={handleKeyPressEnd}
          >
            ✕ Close
          </button>
        </div>

        {/* Row 0: numbers + ⌫ top-right */}
        <div className="software-keyboard__row">
          {layout.numberRow.map(renderKey)}
          <button
            type="button"
            className={`software-keyboard__key software-keyboard__key--action${pressedKeyId === 'backspace' ? ' is-pressed' : ''}`}
            onPointerDown={handleKeyPressStart('backspace', handleBackspace)}
            onPointerUp={handleKeyPressEnd}
            onPointerCancel={handleKeyPressEnd}
            onPointerLeave={handleKeyPressEnd}
          >
            ⌫
          </button>
        </div>

        {/* Alpha rows */}
        {layout.rows.map((row, i) => (
          <div className="software-keyboard__row" key={i}>
            {row.map(renderKey)}
          </div>
        ))}

        {/* Footer: ⇧  space  ◀ ▲ ▼ ▶  ↵ */}
        <div className="software-keyboard__row software-keyboard__row--footer">
          <button
            type="button"
            className={`software-keyboard__key software-keyboard__key--action${shiftActive ? ' is-active' : ''}${pressedKeyId === 'shift' ? ' is-pressed' : ''}`}
            onPointerDown={handleKeyPressStart('shift', () => setShiftActive((v) => !v))}
            onPointerUp={handleKeyPressEnd}
            onPointerCancel={handleKeyPressEnd}
            onPointerLeave={handleKeyPressEnd}
          >
            ⇧
          </button>
          <button
            type="button"
            className={`software-keyboard__key software-keyboard__key--space${pressedKeyId === 'space' ? ' is-pressed' : ''}`}
            onPointerDown={handleKeyPressStart('space', handleSpace)}
            onPointerUp={handleKeyPressEnd}
            onPointerCancel={handleKeyPressEnd}
            onPointerLeave={handleKeyPressEnd}
          >
            space
          </button>
          <button
            type="button"
            className={`software-keyboard__key software-keyboard__key--action${pressedKeyId === 'left' ? ' is-pressed' : ''}`}
            onPointerDown={handleKeyPressStart('left', handleLeft)}
            onPointerUp={handleKeyPressEnd}
            onPointerCancel={handleKeyPressEnd}
            onPointerLeave={handleKeyPressEnd}
          >
            ◀
          </button>
          <button
            type="button"
            className={`software-keyboard__key software-keyboard__key--action${pressedKeyId === 'up' ? ' is-pressed' : ''}`}
            onPointerDown={handleKeyPressStart('up', handleUp)}
            onPointerUp={handleKeyPressEnd}
            onPointerCancel={handleKeyPressEnd}
            onPointerLeave={handleKeyPressEnd}
          >
            ▲
          </button>
          <button
            type="button"
            className={`software-keyboard__key software-keyboard__key--action${pressedKeyId === 'down' ? ' is-pressed' : ''}`}
            onPointerDown={handleKeyPressStart('down', handleDown)}
            onPointerUp={handleKeyPressEnd}
            onPointerCancel={handleKeyPressEnd}
            onPointerLeave={handleKeyPressEnd}
          >
            ▼
          </button>
          <button
            type="button"
            className={`software-keyboard__key software-keyboard__key--action${pressedKeyId === 'right' ? ' is-pressed' : ''}`}
            onPointerDown={handleKeyPressStart('right', handleRight)}
            onPointerUp={handleKeyPressEnd}
            onPointerCancel={handleKeyPressEnd}
            onPointerLeave={handleKeyPressEnd}
          >
            ▶
          </button>
          <button
            type="button"
            className={`software-keyboard__key software-keyboard__key--action${pressedKeyId === 'enter' ? ' is-pressed' : ''}`}
            onPointerDown={handleKeyPressStart('enter', handleEnter)}
            onPointerUp={handleKeyPressEnd}
            onPointerCancel={handleKeyPressEnd}
            onPointerLeave={handleKeyPressEnd}
          >
            ↵
          </button>
        </div>
      </div>
    </div>
  )
}

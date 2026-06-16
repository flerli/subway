import { useEffect, useMemo, useState } from 'react'

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

const preventDefault = (event: React.MouseEvent) => event.preventDefault()

export const SoftwareKeyboardOverlay = ({
  activeTarget,
  layout = FOUNDATION_LAYOUT,
  onRequestClose,
}: SoftwareKeyboardOverlayProps) => {
  const [shiftActive, setShiftActive] = useState(false)

  const normalizedTarget = useMemo(
    () => normalizeKeyboardTarget(activeTarget),
    [activeTarget],
  )

  useEffect(() => { setShiftActive(false) }, [normalizedTarget])

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
    if (normalizedTarget instanceof HTMLTextAreaElement) {
      applyEditableKeyPress(normalizedTarget, '\n')
    } else {
      normalizedTarget.form?.requestSubmit()
    }
  }

  const renderKey = (key: string) => (
    <button
      key={key}
      type="button"
      className="software-keyboard__key"
      onMouseDown={preventDefault}
      onClick={() => handleKeyPress(key)}
    >
      {shiftActive ? key.toUpperCase() : key}
    </button>
  )

  return (
    <div className="software-keyboard" aria-hidden="true">
      <div
        className="software-keyboard__panel"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <div className="software-keyboard__head">
          <button
            type="button"
            className="software-keyboard__close"
            onMouseDown={preventDefault}
            onClick={onRequestClose}
          >
            ✕ Close
          </button>
        </div>

        {/* Row 0: numbers + ⌫ top-right */}
        <div className="software-keyboard__row">
          {layout.numberRow.map(renderKey)}
          <button type="button" className="software-keyboard__key software-keyboard__key--action" onMouseDown={preventDefault} onClick={handleBackspace}>⌫</button>
        </div>

        {/* Alpha rows */}
        {layout.rows.map((row, i) => (
          <div className="software-keyboard__row" key={i}>
            {row.map(renderKey)}
          </div>
        ))}

        {/* Footer: ⇧  space  ◀ ▲ ▼ ▶  ↵ */}
        <div className="software-keyboard__row software-keyboard__row--footer">
          <button type="button" className={`software-keyboard__key software-keyboard__key--action${shiftActive ? ' is-active' : ''}`} onMouseDown={preventDefault} onClick={() => setShiftActive((v) => !v)}>⇧</button>
          <button type="button" className="software-keyboard__key software-keyboard__key--space" onMouseDown={preventDefault} onClick={handleSpace}>space</button>
          <button type="button" className="software-keyboard__key software-keyboard__key--action" onMouseDown={preventDefault} onClick={handleLeft}>◀</button>
          <button type="button" className="software-keyboard__key software-keyboard__key--action" onMouseDown={preventDefault} onClick={handleUp}>▲</button>
          <button type="button" className="software-keyboard__key software-keyboard__key--action" onMouseDown={preventDefault} onClick={handleDown}>▼</button>
          <button type="button" className="software-keyboard__key software-keyboard__key--action" onMouseDown={preventDefault} onClick={handleRight}>▶</button>
          <button type="button" className="software-keyboard__key software-keyboard__key--action" onMouseDown={preventDefault} onClick={handleEnter}>↵</button>
        </div>
      </div>
    </div>
  )
}

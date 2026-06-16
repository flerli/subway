# ISSUE REPORT

## Epic

006 KEYBOARD

## Issue

002 LOWER OVERLAY AND KIOSK INTERACTION MODEL

## Implementation Summary

Upgraded the software keyboard from a small bottom-anchored box to a full lower-half kiosk overlay with backdrop gradient, slide-in animation, and a semi-transparent glassmorphism panel.

Concrete changes:

- Rewrote `frontend/src/keyboard/softwareKeyboard.tsx` with a two-layer structure: an outer backdrop element and an inner interactive panel.
- Moved the `<SoftwareKeyboardOverlay>` mount point in `frontend/src/App.tsx` from outside `<section class="screen">` to inside it in all four app-shell states so `position: absolute` resolves correctly against the `.screen` containing block.
- Replaced all keyboard CSS in `frontend/src/App.css` with the new overlay design.
- Added `⇧` (one-shot shift), `⌫`, `↵`, and `Space` action keys to the footer.
- Added `. ,` to the last alpha row for practical punctuation entry.
- Added a `layout` prop to `SoftwareKeyboardOverlay` so Issue 3 can pass language-specific keymaps without touching the component internals.

## Implementation Choices

1. **Backdrop layer** (`pointer-events: none`): covers the full `.screen` with a gradient tint from transparent at the top to dark approaching the keyboard panel. Board content above the panel remains fully interactive.
2. **Panel layer** (`pointer-events: all`): positioned at `bottom: 0`, height `clamp(300px, 50svh, 440px)`, with `backdrop-filter: blur(18px)` for the semi-transparent glass effect.
3. **Outside-tap close**: implemented via the existing `focusout` handler in `App.tsx`. When the user taps a non-interactive board area above the keyboard, the active input blurs, `focusout` fires, and `softwareKeyboardTarget` is set to `null`. No additional click-capture backdrop is needed.
4. **Slide-in animation**: CSS `@keyframes keyboard-slide-in` with `transform: translateY(100% → 0)` over 240 ms, applied to `.software-keyboard__panel`. No slide-out animation on dismount (component unmounts immediately when target clears; adding slide-out would require deferred unmount state, which is reserved for a later polish issue).
5. **Row centering**: all key rows use `display: flex; justify-content: center`. Rows with fewer keys (9 vs 10) use `width: 90%` to maintain visual alignment with the number row above.
6. **Shift key**: one-shot behavior — activates on tap, emits the next character uppercased, then deactivates. Toggle tap deactivates without emitting a character.
7. **Enter key**: calls `textarea` newline insertion or `form.requestSubmit()` for single-line inputs.
8. **Shift reset on field switch**: `useEffect` on `normalizedTarget` resets `shiftActive` whenever focus moves to a different field.

## Validation

- Frontend build: `npm --prefix frontend run build` — clean, no errors.

## Follow-On Notes For The Next Developer

1. Issue 3 should pass a `KeyboardLayoutDefinition` (exported type) through the `layout` prop to provide language-specific key arrangements.
2. Slide-out animation on close can be added later by introducing a two-phase close state (animating → closed) without touching the keyboard logic itself.
3. The `pointer-events: none` backdrop intentionally keeps board widgets interactive while the keyboard is open. If accidental widget interaction during typing becomes a UX concern on a specific kiosk install, a click-capture layer can be added to the backdrop element.

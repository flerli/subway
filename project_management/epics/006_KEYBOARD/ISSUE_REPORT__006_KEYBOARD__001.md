# ISSUE REPORT

## Epic

006 KEYBOARD

## Issue

001 GLOBAL SOFTWARE KEYBOARD FOUNDATION

## Implementation Summary

Implemented a shared software keyboard foundation in the frontend that opens automatically when users focus supported text input fields and textareas. The solution is intentionally widget-agnostic and is mounted at the app-shell level so all current and future widgets can use it without per-widget integration code.

Concrete changes:

- Added `frontend/src/keyboard/softwareKeyboard.tsx` as the shared keyboard module.
- Added a global focus controller in `frontend/src/App.tsx` using document-level `focusin` and `focusout` listeners.
- Added active target tracking and deterministic target switching in `frontend/src/App.tsx`.
- Added keyboard close behavior in `frontend/src/App.tsx` that clears the active session and blurs the target.
- Mounted the keyboard overlay in all app shell states in `frontend/src/App.tsx`.
- Added foundational keyboard styling in `frontend/src/App.css`.

## Implementation Choices

1. Target support is intentionally restricted to text-contract fields in this issue:
   - `textarea`
   - `input` with empty type or `type="text"`
2. Input mutation uses native value setters plus bubbled `input` events so React controlled inputs update correctly.
3. Focus retention is enforced via `onMouseDown` prevention on keyboard buttons so presses do not steal focus from the active editable field.
4. The keyboard contract is central and shared; no widget-level hooks were added.
5. The current key layout is a foundation layout only. Language-driven layout switching and kiosk overlay behavior are left to Issue 002 and Issue 003.

## Validation

- Frontend build completed successfully:
  - `npm --prefix frontend run build`

## Follow-On Notes For The Next Developer

1. Issue 002 should move this foundation into the required lower-half semi-transparent kiosk overlay behavior and outside-tap dismissal model.
2. Issue 003 should bind keycap layout and language-specific behavior to the global app language setting (`selectedLanguageCode`).
3. If additional input types are needed later (for example `search` or `email`), extend `isSupportedSoftwareKeyboardTarget` in `frontend/src/keyboard/softwareKeyboard.tsx` with explicit type decisions.

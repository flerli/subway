# ADR-003: Per-User Voice Preferences — Table + Live Store

**Status**: Accepted
**Date**: 2026-09-21  |  **Issue**: SWE3-B-04 (TC-B closer)  |  **V-Model**: SWE2

## Context

Voice playback must honor a per-user choice (TTS on/off, preset voice,
volume) immediately — both in the widget-rendered settings panel and in the
app-shell playback guard. The widget registry passes fixed props, so a
props-only channel cannot reach the guard.

## Decision

- Persistence: a dedicated `voice_preferences` table (PK `owner_user_id` →
  `users(id)`, `tts_enabled`, `voice`, `volume`, `updated_at`), upserted via
  `PUT /api/voice/preferences` with strict validation (voice enum,
  volume int 0–100); defaults `{true, 'F1', 80}` for new users.
- Live state: a framework-free module store (`voicePrefsStore`) with
  `get/set/subscribe`; the settings panel and the app-shell playback guard
  both bind to it (`useSyncExternalStore` in App), so a save applies without
  restart. The store is Vite-free and unit-testable in Node.
- Isolation: reads/writes are scoped by `owner_user_id`; two-session denial
  is proven against the real server with a temp data dir
  (`BACKEND_DATA_DIR` env, additive config added for tests).

## Alternatives

| Alt | Pros | Cons | Why Rejected |
|-----|------|------|-------------|
| Voice prefs as assistant widget-settings values | Reuses widget settings API | Wrong ownership model (user-level), playback guard would need widget plumbing | Rejected |
| localStorage only | No server round trip | Not per-user durable, not syncable, no isolation story | Rejected |
| Context/props threading through the widget registry | Single data flow | Registry contract change + panel↔shell coupling | Rejected: store is smaller |

## Consequences

- Positive: playback honors live prefs (toggle off = silence without
  errors), settings saves apply immediately, isolation proven (3-session
  suite), store tested in Node without Vite.
- Negative: two read paths (bootstrap fetch + panel fetch); store default
  prefs for the boot window before the fetch resolves.
- Risks: none beyond the boot window (non-fatal, defaults shown).
# SW-REQ-013-03: Per-User Voice Preferences (DRAFT)

**Epic**: E-013 (`project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE.md`)
**V-Model**: SWE1 (owned by TC-B; drafted by SWE3-B-01)
**Status**: ✅ Defined (finalized by SWE3-B-03)
**Last Updated**: 2026-09-21

## Requirement (draft)

Every user owns durable voice preferences (TTS on/off, voice preset,
volume) with sample playback, persisted behind cookie-session auth.

## Shall Statements (draft)

1. Prefs SHALL store per user in `voice_preferences` (PK `owner_user_id`):
   `ttsEnabled` (boolean), `voice` (M1–M5/F1–F5 enum), `volume` (0–100 int);
   defaults `{true, 'F1', 80}` for new users (SWE3-B-03 implemented).
2. `GET/PUT /api/voice/preferences` + `GET /api/voice/samples/:voice?lang=`
   SHALL require authentication (global `/api/*` gate → 401); PUT SHALL
   reject unknown voices and out-of-range volume (400). Cross-user denial +
   session isolation are asserted by the TC-B-04 closer suite (two sessions).
3. The assistant settings panel SHALL host the voice section (toggle, preset
   grid M1–M5/F1–F5 with per-voice sample playback, volume slider) and save
   through the API; all copy in en/de/fr/es under
   `AssistantWidgetTranslation.copy.voice*` (SWE3-B-03 implemented).
4. Playback SHALL honor live prefs via the framework-free
   `voicePrefsStore` (toggle off = silence without errors; voice/volume
   changes apply immediately — `getVoicePrefsState` feeds the playback
   guard after every save and at bootstrap).

## Verification

- SWE4 unit (SWE3-B-03): store clamping/subscription + playback-guard
  integration test; backend prefs/sample route tests (live server: 401,
  defaults, roundtrip, 400s, sample RIFF) — `prefsRoutes.test.mjs` (5).
- SWE5 integration (TC-B-04): two-session isolation suite + full-loop smoke.

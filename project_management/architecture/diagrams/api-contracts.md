# API Contracts

> `Last updated by: SWE3-B-04` (2026-09-21, all `/api/voice/*` signatures real — TC-A adds no endpoints)

```mermaid
sequenceDiagram
    participant U as User (cookie session)
    participant F as Frontend
    participant B as backend/server.mjs
    participant H as TTS helper (E-013)
    U->>F: Tap mic, speak, stop
    F->>F: PCM 16kHz + Whisper-tiny STT (local)
    F->>B: POST thread/message (existing assistant API)
    B-->>F: Assistant answer (stream/complete)
    F->>B: POST /api/voice/synthesize {text, voice, lang}
    B->>H: spawn tts_helper.py (timeout TERM→KILL)
    H-->>B: JSON {ok, audio_path, duration_seconds, ...}
    B-->>F: MP3 data + durationMs (cached by SHA256)
    U->>F: Hear answer, replay, volume, change voice
    U->>B: GET/PUT /api/voice/preferences (per-user)
```

| Endpoint | Method | Auth | Payload / Response | Owner |
|----------|--------|------|-------------------|-------|
| `/api/auth/session` | GET | Public | Session probe | — |
| Assistant thread/message routes | * | Cookie session, per-user | Existing (Epic 010) — voice submit reuses `POST /assistant/threads`, `POST /assistant/threads/:id/messages` via `createAssistantThread` / `stream\|sendAssistantThreadMessage` | SWE3-A-02 ✅ |
| `/api/voice/status` | GET | Cookie session | `{voice: {available, sdkVersion, voices[], modelDirConfigured, detail}}` — probe TTL 60 s, failures never cached permanently | SWE3-B-01 ✅ |
| `/api/voice/synthesize` | POST | Cookie session | `{text (1–1000), voice (M1–M5/F1–F5), lang}` → `{voice: {audioBase64 WAV, mimeType 'audio/wav', voice, language, cacheHit}}`; 400 invalid / 503 engine down / 504 timeout / 500; per-user cache-first | SWE3-B-01 ✅ |
| `/api/voice/preferences` | GET/PUT | Cookie session, per-user | `{voicePreferences: {ttsEnabled, voice, volume, updatedAt}}`; PUT validates voice enum + volume int 0–100 (400); defaults `{true,'F1',80}`; upsert on `owner_user_id` | SWE3-B-03 ✅ |
| `/api/voice/samples/:voice` | GET | Cookie session | `?lang=` (default `na`→en sample text); fixed per-language sample sentence; same cache-first pipeline as synthesize; 400 unknown voice | SWE3-B-03 ✅ |

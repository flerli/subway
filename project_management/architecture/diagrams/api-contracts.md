# API Contracts

> `Last updated by: swaibian-architect-no-reviews` (2026-09-21, scaffold — real data populated by TC-A-04 / TC-B-04)

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
| Assistant thread/message routes | * | Cookie session, per-user | Existing (Epic 010) — reused by voice submit | TC-A-04 notes |
| `/api/voice/status` | GET | Cookie session | Readiness: import/version/files/voices | TC-B-01 → TC-B-04 populates |
| `/api/voice/synthesize` | POST | Cookie session | `{text, voice, lang}` → MP3 + durationMs; errors fail closed | TC-B-01 → TC-B-04 populates |
| `/api/voice/preferences` | GET/PUT | Cookie session, per-user | `{ttsEnabled, voice, volume}` validated | TC-B-03 → TC-B-04 populates |
| `/api/voice/samples/:voice` | GET | Cookie session | Preset preview audio | TC-B-03 → TC-B-04 populates |

Populated by the TC's last implementation issue (TC-A-04: reused endpoints; TC-B-04: new `/api/voice/*` signatures).

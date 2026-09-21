# SW-REQ-013-04: Audio Feedback, Errors, 4-Language Voice Copy (DRAFT)

**Epic**: E-013 (`project_management/epics/EPIC_013_ASSISTANT_AUDIO_INTERFACE.md`)
**V-Model**: SWE1 (input half TC-A, output half TC-B; drafted by SWE3-A-01)
**Status**: ✅ Defined (input half ✅, output half ✅ by SWE3-B-02)
**Last Updated**: 2026-09-21 (output half finalized by SWE3-B-02)

## Requirement (input half)

The user receives continuous, localized feedback that voice input is live.

## Shall Statements (input half — final)

1. A pulsating amplitude circle SHALL visualize live microphone input,
   driven by scalar levels (`useAudioLevel` at ~20 Hz over the controller's
   live analyser source); audio buffers SHALL never enter the render path.
   `prefers-reduced-motion` freezes the pulse.
2. Every capture/STT failure class (`denied`, `no-device`, `model-missing`,
   `transcribe-failed`, `submit-failed`, `too-long`, `empty`, `busy`,
   `aborted`, `unsupported`, `decode-failed`) SHALL surface localized copy
   via the header note (`role="status"`) + the transcript note
   (`AssistantDetailPanel.voiceNote`), resolved by `resolveVoiceErrorCopy`.
3. While voice capture is active (`requesting|listening|transcribing|
   submitting` per `isVoiceCaptureActiveState`), the global software keyboard
   SHALL NOT auto-open; `focusout` clearing still applies; normal typing flow
   is otherwise unaffected.
4. All voice-input copy (mic labels, states, errors, fallbacks) SHALL ship in
   en/de/fr/es under `appText.voice` (15 keys × 4 languages, ASCII-only per
   file convention).
5. The mic cell (`terminal-cell--voice`) SHALL persist outside the collapsible
   mobile filters cell; header buttons meet the 44 px mobile touch target.

## Output Half (finalized by SWE3-B-02)

1. A pulsating output-direction circle (`OutputLevelCircle`, `voiceCircleStyle(...,'output')`)
   SHALL visualize synthesized-speech amplitude while playing, driven by scalar
   levels from the playback controller's analyser source; `prefers-reduced-motion`
   freezes the pulse; audio buffers never enter the render path.
2. Every assistant answer SHALL be playable: autoplay on completion (when TTS
   enabled), per-message replay, and a volume slider; any new mic tap or
   re-enqueue SHALL interrupt current playback.
3. Markdown answers SHALL be stripped to speakable prose (code fences, tables,
   images, task artifacts never read aloud) and chunked into 2–5 sentence
   units for synthesis; a single long sentence SHALL never be split mid-utterance.
4. Copy: `replayAction`, `playbackLabel`, `playbackVolumeLabel` in en/de/fr/es.

## Verification

- SWE4 unit: scalar-only levels, keyboard-suppression rule, i18n key coverage.
- SWE5 integration (closers): error-taxonomy paths, no-audio-in-render-path.

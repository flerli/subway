/**
 * Framework-free live voice-prefs store (SW-REQ-013-03).
 *
 * Why a plain module store: the playback guard (App) and the settings panel
 * (widget-rendered, fixed props) both need the SAME live prefs without
 * threading props through the widget registry. `setVoicePrefsState` after a
 * successful save makes playback honor the toggle/voice/volume immediately.
 * Self-contained on purpose — no `api/*` import so it compiles in any
 * runtime (Vite-free) for tests.
 */

export interface VoicePrefsState {
  ttsEnabled: boolean
  voice: string
  volume: number
  /** Speaking speed multiplier (1.0 neutral; default 1.2 = 15% faster). */
  speed: number
}

export const DEFAULT_VOICE_PREFS: VoicePrefsState = {
  ttsEnabled: true,
  voice: 'F1',
  volume: 80,
  speed: 1.2,
}

let currentState: VoicePrefsState = { ...DEFAULT_VOICE_PREFS }
const listeners = new Set<() => void>()

export const getVoicePrefsState = (): VoicePrefsState => currentState

export const setVoicePrefsState = (next: VoicePrefsState): void => {
  const voice = next.voice.trim().toUpperCase()
  const volume = Math.min(100, Math.max(0, Math.round(next.volume)))
  const speed =
    typeof next.speed === 'number' && Number.isFinite(next.speed)
      ? Math.min(1.5, Math.max(0.75, next.speed))
      : DEFAULT_VOICE_PREFS.speed

  currentState = {
    ttsEnabled: next.ttsEnabled === true,
    voice: voice.length > 0 ? voice : DEFAULT_VOICE_PREFS.voice,
    volume: Number.isFinite(volume) ? volume : DEFAULT_VOICE_PREFS.volume,
    speed,
  }

  for (const listener of listeners) {
    listener()
  }
}

export const resetVoicePrefsStateForTests = (): void => {
  currentState = { ...DEFAULT_VOICE_PREFS }
  listeners.clear()
}

export const subscribeVoicePrefsState = (listener: () => void): (() => void) => {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}
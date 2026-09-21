import { fetchApi } from './request.ts'

/**
 * Per-user voice preferences API (SW-REQ-013-03).
 *
 * Contract: `fetchVoicePreferences` returns persisted prefs (defaults when
 * none stored); `updateVoicePreferences` validates server-side and returns
 * the stored record; `fetchVoiceSample` synthesizes the fixed per-language
 * sample for a preset voice and returns playable MP3 (WAV decoded + encoded
 * client-side, same edge as `synthesizeVoice`).
 */

export interface VoicePreferencesRecord {
  ttsEnabled: boolean
  voice: string
  volume: number
  /** Speaking speed multiplier (1.0 neutral; default 1.2 = 15% faster than baseline). */
  speed: number
  updatedAt: string | null
}

export const VOICE_SPEED_MIN = 0.75
export const VOICE_SPEED_MAX = 1.5
export const VOICE_DEFAULT_SPEED = 1.2

export const DEFAULT_VOICE_PREFS: VoicePreferencesRecord = {
  ttsEnabled: true,
  voice: 'F1',
  volume: 80,
  speed: VOICE_DEFAULT_SPEED,
  updatedAt: null,
}

export const normalizeVoiceSpeed = (value: unknown): number => {
  const speed = typeof value === 'number' && Number.isFinite(value) ? value : VOICE_DEFAULT_SPEED

  return Math.min(VOICE_SPEED_MAX, Math.max(VOICE_SPEED_MIN, speed))
}

export type VoicePreferencesInput = Omit<VoicePreferencesRecord, 'updatedAt'>

interface VoicePreferencesPayload {
  voicePreferences?: unknown
}

interface VoiceSamplePayload {
  voice?: {
    audioBase64?: unknown
    mimeType?: unknown
    voice?: unknown
    language?: unknown
    speed?: unknown
    cacheHit?: unknown
  }
  error?: unknown
}

const normalizeVoicePreferences = (
  value: unknown,
): VoicePreferencesRecord | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as {
    ttsEnabled?: unknown
    voice?: unknown
    volume?: unknown
    speed?: unknown
    updatedAt?: unknown
  }

  const voice =
    typeof candidate.voice === 'string' && candidate.voice.trim().length > 0
      ? candidate.voice.trim().toUpperCase()
      : null
  const volume =
    typeof candidate.volume === 'number' &&
    Number.isFinite(candidate.volume) &&
    candidate.volume >= 0 &&
    candidate.volume <= 100
      ? Math.round(candidate.volume)
      : null

  return {
    ttsEnabled: candidate.ttsEnabled === true,
    voice: voice ?? DEFAULT_VOICE_PREFS.voice,
    volume: volume ?? DEFAULT_VOICE_PREFS.volume,
    speed: normalizeVoiceSpeed(candidate.speed),
    updatedAt:
      typeof candidate.updatedAt === 'string' ? candidate.updatedAt : null,
  }
}

export const fetchVoicePreferences = async (): Promise<VoicePreferencesRecord> => {
  const response = await fetchApi('/voice/preferences')

  if (!response.ok) {
    throw new Error('Failed to load voice preferences.')
  }

  const payload = (await response.json()) as VoicePreferencesPayload
  const prefs = normalizeVoicePreferences(payload.voicePreferences)

  if (!prefs) {
    throw new Error('Backend returned invalid voice preferences.')
  }

  return prefs
}

export const updateVoicePreferences = async (
  input: VoicePreferencesInput,
): Promise<VoicePreferencesRecord> => {
  const response = await fetchApi('/voice/preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error('Failed to save voice preferences.')
  }

  const payload = (await response.json()) as VoicePreferencesPayload
  const prefs = normalizeVoicePreferences(payload.voicePreferences)

  if (!prefs) {
    throw new Error('Backend returned invalid voice preferences.')
  }

  return prefs
}

export interface VoiceSampleResult {
  audioDataUrl: string
  durationMs: number
  voice: string
  language: string
  speed: number
  cacheHit: boolean
}

/** Synthesize the per-language sample for a voice; decode + encode client-side. */
export const fetchVoiceSample = async (
  voice: string,
  lang: string,
  speed: number = VOICE_DEFAULT_SPEED,
): Promise<VoiceSampleResult> => {
  const search = new URLSearchParams({
    lang,
    speed: String(normalizeVoiceSpeed(speed)),
  })
  const response = await fetchApi(
    `/voice/samples/${encodeURIComponent(voice)}?${search.toString()}`,
  )

  if (response.status === 503 || response.status === 504) {
    throw new Error('Speech engine is unavailable (reinstall / repair runtime).')
  }

  if (!response.ok) {
    throw new Error('Failed to load the voice sample.')
  }

  const payload = (await response.json()) as VoiceSamplePayload

  if (typeof payload.voice?.audioBase64 !== 'string') {
    throw new Error('Backend returned an invalid voice sample.')
  }

  const { parseWavSamples, encodeMp3DataUrl } = await import('../voice/tts.ts')
  const bytes = Uint8Array.from(atob(payload.voice.audioBase64), (char) =>
    char.charCodeAt(0),
  )
  const { samples, sampleRate } = parseWavSamples(bytes.buffer)
  const { audioDataUrl, durationMs } = await encodeMp3DataUrl(samples, sampleRate)

  return {
    audioDataUrl,
    durationMs,
    voice: typeof payload.voice.voice === 'string' ? payload.voice.voice : voice,
    language:
      typeof payload.voice.language === 'string' ? payload.voice.language : lang,
    speed: normalizeVoiceSpeed(payload.voice.speed),
    cacheHit: payload.voice.cacheHit === true,
  }
}
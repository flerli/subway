import { fetchApi } from './request'
import {
  DEFAULT_LANGUAGE_CODE,
  normalizeLanguageCode,
  type SupportedLanguageCode,
} from '../i18n/localization'

const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/
const AUDIO_VISUAL_PERMISSION_STATES = [
  'idle',
  'requesting',
  'granted',
  'denied',
  'unsupported',
  'error',
] as const
const AUDIO_VISUAL_RECORDING_MODES = ['video', 'audio'] as const

export const DEFAULT_COUNTRY_CODE = 'DE'
export type AudioVisualPermissionState =
  (typeof AUDIO_VISUAL_PERMISSION_STATES)[number]
export type AudioVisualRecordingMode = (typeof AUDIO_VISUAL_RECORDING_MODES)[number]

export const isSupportedCountryCode = (value: unknown): value is string =>
  typeof value === 'string' && COUNTRY_CODE_PATTERN.test(value.trim().toUpperCase())

export const normalizeCountryCode = (value: unknown) => {
  const normalizedValue = typeof value === 'string' ? value.trim().toUpperCase() : ''

  return COUNTRY_CODE_PATTERN.test(normalizedValue)
    ? normalizedValue
    : DEFAULT_COUNTRY_CODE
}

export interface AppPreferencesRecord {
  languageCode: SupportedLanguageCode
  countryCode: string
  audioVisualCameraEnabled: boolean
  audioVisualMicrophoneEnabled: boolean
  audioVisualPermissionState: AudioVisualPermissionState
  audioVisualLastRecordingMode: AudioVisualRecordingMode | null
  updatedAt: string | null
}

export interface AppPreferencesUpdate {
  languageCode?: SupportedLanguageCode
  countryCode?: string
  audioVisualCameraEnabled?: boolean
  audioVisualMicrophoneEnabled?: boolean
  audioVisualPermissionState?: AudioVisualPermissionState
  audioVisualLastRecordingMode?: AudioVisualRecordingMode | null
}

const normalizeAudioVisualPermissionState = (
  value: unknown,
): AudioVisualPermissionState =>
  typeof value === 'string' &&
  AUDIO_VISUAL_PERMISSION_STATES.includes(value as AudioVisualPermissionState)
    ? (value as AudioVisualPermissionState)
    : 'idle'

const normalizeAudioVisualLastRecordingMode = (
  value: unknown,
): AudioVisualRecordingMode | null =>
  typeof value === 'string' &&
  AUDIO_VISUAL_RECORDING_MODES.includes(value as AudioVisualRecordingMode)
    ? (value as AudioVisualRecordingMode)
    : null

const normalizeAppPreferences = (value: unknown): AppPreferencesRecord => {
  const candidate = value as {
    languageCode?: unknown
    countryCode?: unknown
    audioVisualCameraEnabled?: unknown
    audioVisualMicrophoneEnabled?: unknown
    audioVisualPermissionState?: unknown
    audioVisualLastRecordingMode?: unknown
    updatedAt?: unknown
  }

  return {
    languageCode: normalizeLanguageCode(candidate?.languageCode),
    countryCode: normalizeCountryCode(candidate?.countryCode),
    audioVisualCameraEnabled:
      typeof candidate?.audioVisualCameraEnabled === 'boolean'
        ? candidate.audioVisualCameraEnabled
        : true,
    audioVisualMicrophoneEnabled:
      typeof candidate?.audioVisualMicrophoneEnabled === 'boolean'
        ? candidate.audioVisualMicrophoneEnabled
        : true,
    audioVisualPermissionState: normalizeAudioVisualPermissionState(
      candidate?.audioVisualPermissionState,
    ),
    audioVisualLastRecordingMode: normalizeAudioVisualLastRecordingMode(
      candidate?.audioVisualLastRecordingMode,
    ),
    updatedAt: typeof candidate?.updatedAt === 'string' ? candidate.updatedAt : null,
  }
}

export const fetchAppPreferences = async () => {
  const response = await fetchApi('/app-preferences')

  if (!response.ok) {
    throw new Error('Failed to load app preferences from backend.')
  }

  const payload = (await response.json()) as { appPreferences?: unknown }

  return normalizeAppPreferences(payload.appPreferences)
}

export const updateAppPreferences = async (updates: AppPreferencesUpdate) => {
  const requestBody: Record<string, string | boolean | null> = {}

  if (Object.prototype.hasOwnProperty.call(updates, 'languageCode') && updates.languageCode) {
    requestBody.languageCode = updates.languageCode
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'countryCode') && updates.countryCode) {
    requestBody.countryCode = normalizeCountryCode(updates.countryCode)
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'audioVisualCameraEnabled')) {
    requestBody.audioVisualCameraEnabled = Boolean(updates.audioVisualCameraEnabled)
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'audioVisualMicrophoneEnabled')) {
    requestBody.audioVisualMicrophoneEnabled = Boolean(
      updates.audioVisualMicrophoneEnabled,
    )
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'audioVisualPermissionState')) {
    requestBody.audioVisualPermissionState = normalizeAudioVisualPermissionState(
      updates.audioVisualPermissionState,
    )
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'audioVisualLastRecordingMode')) {
    requestBody.audioVisualLastRecordingMode = normalizeAudioVisualLastRecordingMode(
      updates.audioVisualLastRecordingMode,
    )
  }

  if (Object.keys(requestBody).length === 0) {
    throw new Error('No app preference changes were provided.')
  }

  const response = await fetchApi('/app-preferences', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    throw new Error('Failed to update app preferences in backend.')
  }

  const payload = (await response.json()) as { appPreferences?: unknown }
  const appPreferences = normalizeAppPreferences(payload.appPreferences)

  return {
    ...appPreferences,
    languageCode: appPreferences.languageCode ?? DEFAULT_LANGUAGE_CODE,
    countryCode: appPreferences.countryCode ?? DEFAULT_COUNTRY_CODE,
  }
}
import { fetchApi } from './request'
import {
  DEFAULT_LANGUAGE_CODE,
  normalizeLanguageCode,
  type SupportedLanguageCode,
} from '../i18n/localization'

const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/

export const DEFAULT_COUNTRY_CODE = 'DE'

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
  updatedAt: string | null
}

export interface AppPreferencesUpdate {
  languageCode?: SupportedLanguageCode
  countryCode?: string
}

const normalizeAppPreferences = (value: unknown): AppPreferencesRecord => {
  const candidate = value as {
    languageCode?: unknown
    countryCode?: unknown
    updatedAt?: unknown
  }

  return {
    languageCode: normalizeLanguageCode(candidate?.languageCode),
    countryCode: normalizeCountryCode(candidate?.countryCode),
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
  const requestBody: Record<string, string> = {}

  if (updates.languageCode) {
    requestBody.languageCode = updates.languageCode
  }

  if (updates.countryCode) {
    requestBody.countryCode = normalizeCountryCode(updates.countryCode)
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
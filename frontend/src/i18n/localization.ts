export const supportedLanguageOptions = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Francais' },
  { code: 'es', label: 'Espanol' },
] as const

export type SupportedLanguageCode = (typeof supportedLanguageOptions)[number]['code']

export const DEFAULT_LANGUAGE_CODE: SupportedLanguageCode = 'en'

const supportedLanguageCodeSet = new Set<SupportedLanguageCode>(
  supportedLanguageOptions.map((language) => language.code),
)

export type LocalizedBundle<T> = Record<SupportedLanguageCode, T>

export const createLocalizedBundle = <T>(bundle: LocalizedBundle<T>) => bundle

export const isSupportedLanguageCode = (
  value: unknown,
): value is SupportedLanguageCode =>
  typeof value === 'string' &&
  supportedLanguageCodeSet.has(value as SupportedLanguageCode)

export const normalizeLanguageCode = (
  value: unknown,
): SupportedLanguageCode => {
  const normalizedValue = typeof value === 'string' ? value.trim().toLowerCase() : ''

  return isSupportedLanguageCode(normalizedValue)
    ? normalizedValue
    : DEFAULT_LANGUAGE_CODE
}

export const getLocalizedBundle = <T>(
  bundle: LocalizedBundle<T>,
  languageCode: unknown,
) => bundle[normalizeLanguageCode(languageCode)] ?? bundle[DEFAULT_LANGUAGE_CODE]

export const formatLocalizedText = (
  template: string,
  values: Record<string, string | number>,
) =>
  template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  )
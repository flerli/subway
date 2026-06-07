import type { WidgetSettingsValues } from '../widgets/widgetTypes'

const WIDGET_SETTINGS_API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

const getApiUrl = (path: string) =>
  `${WIDGET_SETTINGS_API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`

export interface WidgetSettingRecord {
  widgetId: string
  settings: WidgetSettingsValues
  updatedAt: string
}

const normalizeWidgetSetting = (value: unknown): WidgetSettingRecord | null => {
  const candidate = value as {
    widgetId?: unknown
    updatedAt?: unknown
    settings?: unknown
  }

  if (
    !value ||
    typeof value !== 'object' ||
    typeof candidate.widgetId !== 'string' ||
    typeof candidate.updatedAt !== 'string' ||
    !candidate.settings ||
    typeof candidate.settings !== 'object' ||
    Array.isArray(candidate.settings)
  ) {
    return null
  }

  return {
    widgetId: candidate.widgetId,
    updatedAt: candidate.updatedAt,
    settings: Object.fromEntries(
      Object.entries(candidate.settings).filter(([, fieldValue]) =>
        ['string', 'number', 'boolean'].includes(typeof fieldValue),
      ),
    ),
  }
}

export const fetchWidgetSettings = async () => {
  const response = await fetch(getApiUrl('/widget-settings'))

  if (!response.ok) {
    throw new Error('Failed to load widget settings from backend.')
  }

  const payload = (await response.json()) as { widgetSettings?: unknown[] }

  return (payload.widgetSettings ?? [])
    .map(normalizeWidgetSetting)
    .filter((widgetSetting): widgetSetting is WidgetSettingRecord => Boolean(widgetSetting))
}

export const updateWidgetSettings = async (
  widgetId: string,
  settings: WidgetSettingsValues,
) => {
  const response = await fetch(getApiUrl(`/widget-settings/${widgetId}`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ settings }),
  })

  if (!response.ok) {
    throw new Error('Failed to update widget settings in backend.')
  }

  const payload = (await response.json()) as { widgetSetting?: unknown }
  const widgetSetting = normalizeWidgetSetting(payload.widgetSetting)

  if (!widgetSetting) {
    throw new Error('Backend returned an invalid widget settings payload.')
  }

  return widgetSetting
}

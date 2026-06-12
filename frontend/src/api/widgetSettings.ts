import type { WidgetSettingsValues } from '../widgets/widgetTypes'
import { fetchApi } from './request'

export interface WidgetSettingRecord {
  widgetId: string
  settings: WidgetSettingsValues
  updatedAt: string
}

const normalizeWidgetSettingsValue = (
  value: unknown,
): unknown => {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeWidgetSettingsValue(entry))
      .filter((entry) => entry !== undefined)
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, nestedValue]) => {
        const normalizedNestedValue = normalizeWidgetSettingsValue(nestedValue)

        return normalizedNestedValue === undefined
          ? []
          : [[key, normalizedNestedValue]]
      }),
    )
  }

  return undefined
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
      Object.entries(candidate.settings).flatMap(([key, fieldValue]) => {
        const normalizedFieldValue = normalizeWidgetSettingsValue(fieldValue)

        return normalizedFieldValue === undefined
          ? []
          : [[key, normalizedFieldValue]]
      }),
    ),
  }
}

export const fetchWidgetSettings = async () => {
  const response = await fetchApi('/widget-settings')

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
  const response = await fetchApi(`/widget-settings/${widgetId}`, {
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

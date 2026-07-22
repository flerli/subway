import type {
  ForecastDay,
  WeatherLocationData,
  WeatherWidgetData,
} from '../widgetHostModels'
import type { SupportedLanguageCode } from '../../i18n/localization'
import { fetchApi, isAuthRequiredError } from '../../api/request'
import {
  getWeatherWidgetTranslation,
  localizeWeatherCondition,
} from './translations'
import { deriveWeatherVisualState } from './weatherVisualState'

interface WeatherLocationQueryOptions {
  id: string
  label: string
  latitude: number
  longitude: number
}

interface WeatherWidgetQueryOptions {
  focusLocationId: string
  locations: WeatherLocationQueryOptions[]
  languageCode: SupportedLanguageCode
}

const buildFallbackForecastDays = (
  languageCode: SupportedLanguageCode,
): ForecastDay[] => {
  const baseDate = new Date()
  const widgetText = getWeatherWidgetTranslation(languageCode)

  return Array.from({ length: 8 }, (_, index) => {
    const nextDate = new Date(baseDate)
    nextDate.setDate(nextDate.getDate() + index)

    return {
      day: nextDate.toISOString().slice(0, 10),
      high: 0,
      low: 0,
      condition: widgetText.copy.unavailableCondition,
      visualState: 'fallback' as const,
    }
  })
}

const normalizeForecastDay = (
  value: unknown,
  languageCode: SupportedLanguageCode,
): ForecastDay | null => {
  const candidate = value as {
    day?: unknown
    high?: unknown
    low?: unknown
    condition?: unknown
  }

  if (
    !value ||
    typeof value !== 'object' ||
    typeof candidate.day !== 'string' ||
    typeof candidate.high !== 'number' ||
    typeof candidate.low !== 'number' ||
    typeof candidate.condition !== 'string'
  ) {
    return null
  }

  const canonicalCondition = candidate.condition.trim()

  return {
    day: candidate.day,
    high: candidate.high,
    low: candidate.low,
    condition: localizeWeatherCondition(canonicalCondition, languageCode),
    visualState: deriveWeatherVisualState(canonicalCondition),
  }
}

const normalizeWeatherLocationData = (
  value: unknown,
  id: string,
  languageCode: SupportedLanguageCode,
): WeatherLocationData | null => {
  const candidate = value as {
    location?: unknown
    source?: unknown
    stale?: unknown
    updatedAt?: unknown
    currentTemperature?: unknown
    condition?: unknown
    rangeSummary?: unknown
    forecast?: unknown
  }

  if (
    !value ||
    typeof value !== 'object' ||
    typeof candidate.location !== 'string' ||
    typeof candidate.source !== 'string' ||
    typeof candidate.stale !== 'boolean' ||
    typeof candidate.updatedAt !== 'string' ||
    typeof candidate.currentTemperature !== 'string' ||
    typeof candidate.condition !== 'string' ||
    typeof candidate.rangeSummary !== 'string' ||
    !Array.isArray(candidate.forecast)
  ) {
    return null
  }

  const canonicalCondition = candidate.condition.trim()
  const currentVisualState = deriveWeatherVisualState(canonicalCondition)
  const forecast = candidate.forecast
    .map((forecastDay) => normalizeForecastDay(forecastDay, languageCode))
    .filter((forecastDay): forecastDay is ForecastDay => Boolean(forecastDay))

  if (forecast.length > 0) {
    forecast[0] = {
      ...forecast[0],
      visualState: currentVisualState,
    }
  }

  return {
    id,
    location: candidate.location,
    source: candidate.source,
    stale: candidate.stale,
    updatedAt: candidate.updatedAt,
    currentTemperature: candidate.currentTemperature,
    condition: localizeWeatherCondition(canonicalCondition, languageCode),
    visualState: currentVisualState,
    rangeSummary: candidate.rangeSummary,
    forecast,
  }
}

const fetchWeatherLocationData = async (
  options: WeatherLocationQueryOptions,
  languageCode: SupportedLanguageCode,
) => {
  const query = new URLSearchParams({
    locationLabel: options.label,
    latitude: options.latitude.toString(),
    longitude: options.longitude.toString(),
  })

  const response = await fetchApi(`/weather?${query.toString()}`)

  if (!response.ok) {
    throw new Error('Failed to load weather data from backend.')
  }

  const payload = (await response.json()) as { weather?: unknown }
  const weather = normalizeWeatherLocationData(payload.weather, options.id, languageCode)

  if (!weather) {
    throw new Error('Backend returned an invalid weather payload.')
  }

  return weather
}

const fetchWeatherLocationDataWithFallback = async (
  options: WeatherLocationQueryOptions,
  languageCode: SupportedLanguageCode,
) => {
  try {
    return await fetchWeatherLocationData(options, languageCode)
  } catch (error) {
    if (isAuthRequiredError(error)) {
      throw error
    }

    const widgetText = getWeatherWidgetTranslation(languageCode)

    return {
      id: options.id,
      location: options.label,
      source: 'Open-Meteo',
      stale: true,
      updatedAt: new Date(0).toISOString(),
      currentTemperature: '--°',
      condition: widgetText.copy.unavailableCondition,
      visualState: 'fallback' as const,
      rangeSummary: widgetText.copy.noLiveDataSummary,
      forecast: buildFallbackForecastDays(languageCode),
    } satisfies WeatherLocationData
  }
}

export const fetchWeatherWidgetData = async (
  options: WeatherWidgetQueryOptions,
) => {
  const locations = await Promise.all(
    options.locations.map((location) =>
      fetchWeatherLocationDataWithFallback(location, options.languageCode),
    ),
  )

  const focusLocation =
    locations.find((location) => location.id === options.focusLocationId) ?? locations[0]

  if (!focusLocation) {
    throw new Error('No valid weather locations were configured.')
  }

  return {
    ...focusLocation,
    focusLocationId: focusLocation.id,
    locations,
  } satisfies WeatherWidgetData
}
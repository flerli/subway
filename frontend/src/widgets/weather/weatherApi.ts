import type {
  ForecastDay,
  WeatherLocationData,
  WeatherWidgetData,
} from '../widgetHostModels'
import { fetchApi, isAuthRequiredError } from '../../api/request'
import { getWeatherWidgetTranslation } from './translations'
import { deriveWeatherVisualState } from './weatherVisualState'

const defaultWeatherWidgetTranslation = getWeatherWidgetTranslation('en')

interface WeatherLocationQueryOptions {
  id: string
  label: string
  latitude: number
  longitude: number
}

interface WeatherWidgetQueryOptions {
  focusLocationId: string
  locations: WeatherLocationQueryOptions[]
}

const fallbackForecastDays: ForecastDay[] = [
  {
    day: 'MON',
    high: 0,
    low: 0,
    condition: 'Unavailable',
    visualState: 'fallback',
  },
  {
    day: 'TUE',
    high: 0,
    low: 0,
    condition: 'Unavailable',
    visualState: 'fallback',
  },
  {
    day: 'WED',
    high: 0,
    low: 0,
    condition: 'Unavailable',
    visualState: 'fallback',
  },
  {
    day: 'THU',
    high: 0,
    low: 0,
    condition: 'Unavailable',
    visualState: 'fallback',
  },
]

const normalizeForecastDay = (value: unknown): ForecastDay | null => {
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

  return {
    day: candidate.day,
    high: candidate.high,
    low: candidate.low,
    condition: candidate.condition,
    visualState: deriveWeatherVisualState(candidate.condition),
  }
}

const normalizeWeatherLocationData = (
  value: unknown,
  id: string,
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

  return {
    id,
    location: candidate.location,
    source: candidate.source,
    stale: candidate.stale,
    updatedAt: candidate.updatedAt,
    currentTemperature: candidate.currentTemperature,
    condition: candidate.condition,
    visualState: deriveWeatherVisualState(candidate.condition),
    rangeSummary: candidate.rangeSummary,
    forecast: candidate.forecast
      .map(normalizeForecastDay)
      .filter((forecastDay): forecastDay is ForecastDay => Boolean(forecastDay)),
  }
}

const fetchWeatherLocationData = async (options: WeatherLocationQueryOptions) => {
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
  const weather = normalizeWeatherLocationData(payload.weather, options.id)

  if (!weather) {
    throw new Error('Backend returned an invalid weather payload.')
  }

  return weather
}

const fetchWeatherLocationDataWithFallback = async (
  options: WeatherLocationQueryOptions,
) => {
  try {
    return await fetchWeatherLocationData(options)
  } catch (error) {
    if (isAuthRequiredError(error)) {
      throw error
    }

    return {
      id: options.id,
      location: options.label,
      source: 'Open-Meteo',
      stale: true,
      updatedAt: new Date(0).toISOString(),
      currentTemperature: '--°',
      condition: defaultWeatherWidgetTranslation.copy.unavailableCondition,
      visualState: 'fallback' as const,
      rangeSummary: defaultWeatherWidgetTranslation.copy.noLiveDataSummary,
      forecast: fallbackForecastDays,
    } satisfies WeatherLocationData
  }
}

export const fetchWeatherWidgetData = async (
  options: WeatherWidgetQueryOptions,
) => {
  const locations = await Promise.all(
    options.locations.map((location) => fetchWeatherLocationDataWithFallback(location)),
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
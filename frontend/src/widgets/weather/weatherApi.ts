import type { ForecastDay, WeatherWidgetData } from '../widgetHostModels'

interface WeatherQueryOptions {
  locationLabel: string
  latitude: number
  longitude: number
}

const WEATHER_API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

const getApiUrl = (path: string) =>
  `${WEATHER_API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`

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
  }
}

const normalizeWeatherWidgetData = (value: unknown): WeatherWidgetData | null => {
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
    location: candidate.location,
    source: candidate.source,
    stale: candidate.stale,
    updatedAt: candidate.updatedAt,
    currentTemperature: candidate.currentTemperature,
    condition: candidate.condition,
    rangeSummary: candidate.rangeSummary,
    forecast: candidate.forecast
      .map(normalizeForecastDay)
      .filter((forecastDay): forecastDay is ForecastDay => Boolean(forecastDay)),
  }
}

export const fetchWeatherWidgetData = async (options: WeatherQueryOptions) => {
  const query = new URLSearchParams({
    locationLabel: options.locationLabel,
    latitude: options.latitude.toString(),
    longitude: options.longitude.toString(),
  })

  const response = await fetch(getApiUrl(`/weather?${query.toString()}`))

  if (!response.ok) {
    throw new Error('Failed to load weather data from backend.')
  }

  const payload = (await response.json()) as { weather?: unknown }
  const weather = normalizeWeatherWidgetData(payload.weather)

  if (!weather) {
    throw new Error('Backend returned an invalid weather payload.')
  }

  return weather
}
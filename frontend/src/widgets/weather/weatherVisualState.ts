import type { WeatherVisualState } from '../widgetHostModels'

export const deriveWeatherVisualState = (
  condition: string,
): WeatherVisualState => {
  const normalizedCondition = condition.trim().toLowerCase()

  if (!normalizedCondition) {
    return 'fallback'
  }

  if (
    normalizedCondition.includes('thunder') ||
    normalizedCondition.includes('storm')
  ) {
    return 'thunderstorm'
  }

  if (
    normalizedCondition.includes('rain') ||
    normalizedCondition.includes('drizzle') ||
    normalizedCondition.includes('shower')
  ) {
    return 'rain'
  }

  if (normalizedCondition.includes('wind')) {
    return 'wind'
  }

  if (
    normalizedCondition.includes('partly cloudy') ||
    normalizedCondition.includes('mainly clear')
  ) {
    return 'partly-cloudy'
  }

  if (
    normalizedCondition.includes('cloud') ||
    normalizedCondition.includes('overcast') ||
    normalizedCondition.includes('fog')
  ) {
    return 'cloudy'
  }

  if (
    normalizedCondition.includes('clear') ||
    normalizedCondition.includes('sun')
  ) {
    return 'sun'
  }

  return 'fallback'
}
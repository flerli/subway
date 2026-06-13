import type { SupportedLanguageCode } from '../../i18n/localization'
import { WeatherIcon } from './WeatherIcon'
import type { WeatherWidgetData } from '../widgetHostModels'
import type { WeatherWidgetTranslation } from './translations'

interface WeatherDetailViewData {
  weatherData: WeatherWidgetData
  commuteNote: string
  weatherRefreshCountdownLabel: string
}

const isWeatherDetailViewData = (
  value: unknown,
): value is WeatherDetailViewData => {
  const candidate = value as {
    weatherData?: WeatherWidgetData
    commuteNote?: unknown
    weatherRefreshCountdownLabel?: unknown
  }

  return (
    Boolean(candidate?.weatherData) &&
    Array.isArray(candidate.weatherData?.forecast) &&
    typeof candidate?.commuteNote === 'string' &&
    typeof candidate?.weatherRefreshCountdownLabel === 'string'
  )
}

const formatForecastDayLabel = (
  day: string,
  languageCode: SupportedLanguageCode,
) => {
  const parsedDay = new Date(`${day}T00:00:00`)

  if (Number.isNaN(parsedDay.getTime())) {
    return day
  }

  return new Intl.DateTimeFormat(languageCode, {
    weekday: 'short',
  }).format(parsedDay)
}

export function WeatherDetailView({
  data,
  languageCode,
  widgetText,
}: {
  data: unknown
  languageCode: SupportedLanguageCode
  widgetText: WeatherWidgetTranslation
}) {
  if (!isWeatherDetailViewData(data)) {
    return null
  }

  const { weatherData, commuteNote, weatherRefreshCountdownLabel } = data
  const focusLocation =
    weatherData.locations.find((location) => location.id === weatherData.focusLocationId) ??
    weatherData
  const secondaryLocations = weatherData.locations
    .filter((location) => location.id !== focusLocation.id)
    .slice(0, 4)

  return (
    <div className="weather-detail-view">
      <div className="weather-detail-layout">
        <div className="weather-detail-focus-column">
          <div className="weather-summary weather-summary--detail">
            <div className="weather-hero-stack weather-hero-stack--detail">
              <WeatherIcon state={focusLocation.visualState} size="hero" />
              <p className="weather-temp">{focusLocation.currentTemperature}</p>
            </div>
            <div className="weather-copy weather-copy--detail">
              <p className="weather-focus-location-name">{focusLocation.location}</p>
              <p className="weather-detail-location">
                {focusLocation.source} · {focusLocation.stale ? widgetText.copy.statusCached : widgetText.copy.statusLive}
              </p>
              <p className="weather-note">{commuteNote}</p>
              <p className="weather-refresh-countdown">{weatherRefreshCountdownLabel}</p>
              <p className="weather-updated">
                {widgetText.copy.updatedPrefix}{' '}
                {new Intl.DateTimeFormat(languageCode, {
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(new Date(focusLocation.updatedAt))}
              </p>
            </div>
          </div>

          <div className="forecast-grid forecast-grid--expanded weather-focus-forecast-grid">
            {focusLocation.forecast.map((day) => (
              <div className="forecast-card forecast-card--expanded" key={day.day}>
                <div className="forecast-copy-stack">
                  <p className="forecast-day">{formatForecastDayLabel(day.day, languageCode)}</p>
                  <div className="forecast-range" aria-label={`High ${day.high} degrees, low ${day.low} degrees`}>
                    <span>{day.high}°</span>
                    <span className="forecast-range-divider" aria-hidden="true"></span>
                    <span>{day.low}°</span>
                  </div>
                </div>
                <div className="forecast-icon-wrap">
                  <WeatherIcon state={day.visualState} size="forecast-expanded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {secondaryLocations.length > 0 ? (
          <div className="weather-detail-side-column">
            <div className="weather-location-grid">
              {secondaryLocations.map((location) => (
                <article className="weather-location-card" key={location.id}>
                  <div className="weather-location-card-head">
                    <p className="weather-location-label">{location.location}</p>
                    <WeatherIcon state={location.visualState} size="forecast" />
                  </div>

                  <div className="weather-location-card-body">
                    <p className="weather-location-temp">{location.currentTemperature}</p>
                    <div className="weather-location-copy">
                      <p className="weather-updated">
                        {widgetText.copy.updatedPrefix}{' '}
                        {new Intl.DateTimeFormat(languageCode, {
                          hour: '2-digit',
                          minute: '2-digit',
                        }).format(new Date(location.updatedAt))}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
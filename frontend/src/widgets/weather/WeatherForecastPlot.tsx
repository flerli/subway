import type { SupportedLanguageCode } from '../../i18n/localization'
import type { ForecastDay } from '../widgetHostModels'
import { WeatherIcon } from './WeatherIcon'

interface WeatherForecastPlotProps {
  forecast: ForecastDay[]
  currentTemperature: string
  languageCode: SupportedLanguageCode
  size?: 'compact' | 'detail'
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

const parseTemperatureValue = (value: string) => {
  const match = value.match(/-?\d+(?:\.\d+)?/)

  if (!match) {
    return null
  }

  const parsedValue = Number.parseFloat(match[0])

  return Number.isFinite(parsedValue) ? parsedValue : null
}

const formatTemperatureLabel = (value: number) => `${Math.round(value)}°`

export function WeatherForecastPlot({
  forecast,
  currentTemperature,
  languageCode,
  size = 'compact',
}: WeatherForecastPlotProps) {
  if (forecast.length === 0) {
    return null
  }

  const currentTemperatureValue = parseTemperatureValue(currentTemperature)
  const domainValues = forecast.flatMap((day) => [day.high, day.low])

  if (currentTemperatureValue !== null) {
    domainValues.push(currentTemperatureValue)
  }

  const domainMin = Math.min(...domainValues)
  const domainMax = Math.max(...domainValues)
  const temperaturePadding = Math.max(2, Math.ceil((domainMax - domainMin) * 0.15))
  const paddedMin = domainMin - temperaturePadding
  const paddedMax = domainMax + temperaturePadding
  const chartWidth = 100
  const chartHeight = 100
  const leftPadding = 8
  const rightPadding = 8
  const topPadding = 16
  const bottomPadding = 22
  const plotWidth = chartWidth - leftPadding - rightPadding
  const plotHeight = chartHeight - topPadding - bottomPadding

  const resolveX = (index: number) =>
    forecast.length === 1
      ? chartWidth / 2
      : leftPadding + (plotWidth / (forecast.length - 1)) * index

  const resolveY = (value: number) =>
    topPadding + ((paddedMax - value) / (paddedMax - paddedMin || 1)) * plotHeight

  const chartPoints = forecast.map((day, index) => ({
    day,
    x: resolveX(index),
    highY: resolveY(day.high),
    lowY: resolveY(day.low),
  }))

  const highLinePoints = chartPoints.map((point) => `${point.x},${point.highY}`).join(' ')
  const lowLinePoints = chartPoints.map((point) => `${point.x},${point.lowY}`).join(' ')
  const currentLineY =
    currentTemperatureValue === null ? null : resolveY(currentTemperatureValue)

  return (
    <div className={`weather-forecast-plot weather-forecast-plot--${size}`}>
      <div className="weather-forecast-plot__surface">
        <svg
          className="weather-forecast-plot__svg"
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Forecast plot showing daily high and low temperatures"
        >
          {currentLineY !== null ? (
            <line
              className="weather-forecast-plot__current-line"
              x1={0}
              x2={chartWidth}
              y1={currentLineY}
              y2={currentLineY}
            />
          ) : null}

          <polyline className="weather-forecast-plot__high-line" points={highLinePoints} />
          <polyline className="weather-forecast-plot__low-line" points={lowLinePoints} />

          {chartPoints.map((point) => (
            <g key={point.day.day}>
              <line
                className="weather-forecast-plot__range-bar"
                x1={point.x}
                x2={point.x}
                y1={point.highY}
                y2={point.lowY}
              />
              <circle
                className="weather-forecast-plot__point weather-forecast-plot__point--high"
                cx={point.x}
                cy={point.highY}
                r={2.4}
              />
              <circle
                className="weather-forecast-plot__point weather-forecast-plot__point--low"
                cx={point.x}
                cy={point.lowY}
                r={2.4}
              />
            </g>
          ))}
        </svg>

        {currentLineY !== null ? (
          <div
            className="weather-forecast-plot__current-label"
            style={{ top: `${currentLineY}%` }}
          >
            {currentTemperature}
          </div>
        ) : null}

        {chartPoints.map((point) => (
          <div key={`${point.day.day}-high`}>
            <div
              className="weather-forecast-plot__value weather-forecast-plot__value--high"
              style={{
                left: `${point.x}%`,
                top: `calc(${point.highY}% - 1.1rem)`,
              }}
            >
              {formatTemperatureLabel(point.day.high)}
            </div>
            <div
              className="weather-forecast-plot__value weather-forecast-plot__value--low"
              style={{
                left: `${point.x}%`,
                top: `calc(${point.lowY}% + 0.35rem)`,
              }}
            >
              {formatTemperatureLabel(point.day.low)}
            </div>
          </div>
        ))}
      </div>

      <div
        className="weather-forecast-plot__ticks"
        style={{
          gridTemplateColumns: `repeat(${forecast.length}, minmax(0, 1fr))`,
        }}
      >
        {chartPoints.map((point) => (
          <div className="weather-forecast-plot__tick" key={`${point.day.day}-tick`}>
            <div className="weather-forecast-plot__tick-icon">
              <WeatherIcon
                state={point.day.visualState}
                size={size === 'detail' ? 'forecast-expanded' : 'forecast'}
              />
            </div>
            <p className="weather-forecast-plot__tick-day">
              {formatForecastDayLabel(point.day.day, languageCode)}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
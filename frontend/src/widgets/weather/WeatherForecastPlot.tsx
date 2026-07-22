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

const clampValue = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

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
  const temperaturePadding = Math.max(1, Math.ceil((domainMax - domainMin) * 0.08))
  const paddedMin = domainMin - temperaturePadding
  const paddedMax = domainMax + temperaturePadding
  const chartWidth = 100
  const chartHeight = 100
  const leftPadding = forecast.length === 1 ? 20 : 8
  const rightPadding = forecast.length === 1 ? 20 : 8
  const topPadding = size === 'detail' ? 30 : 24
  const bottomPadding = size === 'detail' ? 18 : 16
  const plotWidth = chartWidth - leftPadding - rightPadding
  const plotHeight = chartHeight - topPadding - bottomPadding
  const iconTrackY = size === 'detail' ? 12 : 10

  const resolveX = (index: number) =>
    forecast.length === 1
      ? chartWidth / 2
      : leftPadding + (plotWidth / (forecast.length - 1)) * index

  const resolveY = (value: number) =>
    topPadding + ((paddedMax - value) / (paddedMax - paddedMin || 1)) * plotHeight

  const chartPoints = forecast.map((day, index) => {
    const x = resolveX(index)
    const highY = resolveY(day.high)
    const lowY = resolveY(day.low)
    const pointGap = Math.abs(highY - lowY)
    const needsSplitOffset = pointGap < 18
    const highX = needsSplitOffset ? clampValue(x - 4.2, leftPadding, chartWidth - rightPadding) : x
    const lowX = needsSplitOffset ? clampValue(x + 4.2, leftPadding, chartWidth - rightPadding) : x

    return {
      day,
      x,
      highX,
      lowX,
      highY,
      lowY,
      iconY: iconTrackY,
    }
  })

  const highLinePoints = chartPoints.map((point) => `${point.highX},${point.highY}`).join(' ')
  const lowLinePoints = chartPoints.map((point) => `${point.lowX},${point.lowY}`).join(' ')
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
              className="weather-forecast-plot__badge weather-forecast-plot__badge--high"
              style={{
                left: `${point.highX}%`,
                top: `${point.highY}%`,
              }}
            >
              {formatTemperatureLabel(point.day.high)}
            </div>
            <div
              className="weather-forecast-plot__badge weather-forecast-plot__badge--low"
              style={{
                left: `${point.lowX}%`,
                top: `${point.lowY}%`,
              }}
            >
              {formatTemperatureLabel(point.day.low)}
            </div>
            <div
              className="weather-forecast-plot__icon"
              style={{
                left: `${point.x}%`,
                top: `${point.iconY}%`,
              }}
            >
              <WeatherIcon
                state={point.day.visualState}
                size={size === 'detail' ? 'forecast-expanded' : 'forecast'}
              />
            </div>
          </div>
        ))}

        <div className="weather-forecast-plot__ticks" aria-hidden="true">
          {chartPoints.map((point) => (
            <div
              className="weather-forecast-plot__tick"
              key={`${point.day.day}-tick`}
              style={{ left: `${point.x}%` }}
            >
              <p className="weather-forecast-plot__tick-day">
                {formatForecastDayLabel(point.day.day, languageCode)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
import type { WeatherVisualState } from '../widgetHostModels'

interface WeatherIconProps {
  state: WeatherVisualState
  size?: 'hero' | 'forecast' | 'forecast-expanded'
}

const renderCloud = () => (
  <g className="weather-icon__cloud">
    <circle className="weather-icon__cloud-fill" cx="37" cy="43" r="12" />
    <circle className="weather-icon__cloud-fill" cx="50" cy="37" r="16" />
    <circle className="weather-icon__cloud-fill" cx="64" cy="43" r="12" />
    <rect className="weather-icon__cloud-fill" x="28" y="43" width="48" height="14" rx="7" />
  </g>
)

const renderSun = () => (
  <>
    <g className="weather-icon__sun-rays">
      <line className="weather-icon__ray" x1="48" y1="12" x2="48" y2="22" />
      <line className="weather-icon__ray" x1="48" y1="74" x2="48" y2="84" />
      <line className="weather-icon__ray" x1="12" y1="48" x2="22" y2="48" />
      <line className="weather-icon__ray" x1="74" y1="48" x2="84" y2="48" />
      <line className="weather-icon__ray" x1="22.5" y1="22.5" x2="29.5" y2="29.5" />
      <line className="weather-icon__ray" x1="66.5" y1="66.5" x2="73.5" y2="73.5" />
      <line className="weather-icon__ray" x1="22.5" y1="73.5" x2="29.5" y2="66.5" />
      <line className="weather-icon__ray" x1="66.5" y1="29.5" x2="73.5" y2="22.5" />
    </g>
    <circle className="weather-icon__sun-core" cx="48" cy="48" r="18" />
  </>
)

const renderRain = () => (
  <>
    {renderCloud()}
    <g className="weather-icon__rainfall">
      <path className="weather-icon__drop" d="M38 63 C36 68, 42 68, 40 74" />
      <path className="weather-icon__drop" d="M50 63 C48 68, 54 68, 52 74" />
      <path className="weather-icon__drop" d="M62 63 C60 68, 66 68, 64 74" />
    </g>
  </>
)

const renderThunderstorm = () => (
  <>
    {renderCloud()}
    <g className="weather-icon__rainfall weather-icon__rainfall--storm">
      <path className="weather-icon__drop" d="M36 63 C34 68, 40 68, 38 74" />
      <path className="weather-icon__drop" d="M60 63 C58 68, 64 68, 62 74" />
    </g>
    <path className="weather-icon__bolt" d="M50 56 L42 70 H49 L45 84 L61 65 H53 L57 56 Z" />
  </>
)

const renderWind = () => (
  <g className="weather-icon__wind-lines">
    <path className="weather-icon__wind-line" d="M18 34 C28 24, 44 24, 56 34 C64 41, 74 41, 80 34" />
    <path className="weather-icon__wind-line weather-icon__wind-line--offset" d="M12 50 C24 42, 42 42, 54 50 C61 55, 70 55, 78 49" />
    <path className="weather-icon__wind-line weather-icon__wind-line--tail" d="M26 66 C36 59, 50 59, 60 66 C66 70, 72 70, 78 65" />
  </g>
)

const renderFallback = () => (
  <g className="weather-icon__fallback">
    <circle className="weather-icon__fallback-ring" cx="48" cy="48" r="22" />
    <path className="weather-icon__fallback-mark" d="M48 34 V52" />
    <circle className="weather-icon__fallback-dot" cx="48" cy="62" r="3" />
  </g>
)

export function WeatherIcon({
  state,
  size = 'hero',
}: WeatherIconProps) {
  return (
    <span
      className={`weather-icon-shell weather-icon-shell--${size}`}
      data-weather-visual-state={state}
      aria-hidden="true"
    >
      <svg
        className={`weather-icon weather-icon--${state}`}
        viewBox="0 0 96 96"
        focusable="false"
      >
        {state === 'sun' ? renderSun() : null}
        {state === 'cloudy' ? renderCloud() : null}
        {state === 'rain' ? renderRain() : null}
        {state === 'thunderstorm' ? renderThunderstorm() : null}
        {state === 'wind' ? renderWind() : null}
        {state === 'fallback' ? renderFallback() : null}
      </svg>
    </span>
  )
}
import { useEffect, useState, type CSSProperties, type FormEvent } from 'react'
import './App.css'

const ALL_FILTER_ID = 'all'
const ALL_MEMBERS_AUDIENCE = '*'
const FAMILY_STORAGE_KEY = 'subway-home-board:family-members'
const DEFAULT_NEW_MEMBER_COLOR = '#4aa8ff'

const display = {
  diagonalInches: 27,
  diagonalCentimeters: 27 * 2.54,
  aspectWidth: 16,
  aspectHeight: 9,
  resolutionWidth: 2160,
  resolutionHeight: 3840,
  squareCentimeters: 5,
}

const aspectDiagonal = Math.hypot(display.aspectWidth, display.aspectHeight)
const portraitWidthCm =
  (display.diagonalCentimeters * display.aspectHeight) / aspectDiagonal
const portraitHeightCm =
  (display.diagonalCentimeters * display.aspectWidth) / aspectDiagonal
const diagonalPixels = Math.hypot(
  display.resolutionWidth,
  display.resolutionHeight,
)
const pixelsPerInch = diagonalPixels / display.diagonalInches
const pixelsPerCentimeter = display.resolutionHeight / portraitHeightCm
const squarePixels = Math.round(display.squareCentimeters * pixelsPerCentimeter)

type MemberId = string
type FilterId = string
type AudienceId = string
type ViewMode = 'board' | 'settings'

interface FamilyMember {
  id: MemberId
  firstName: string
  color: string
}

interface FilterOption {
  id: FilterId
  label: string
  caption: string
  badgeText: string
  style: CSSProperties
}

interface ScopedItem {
  line: string
  members: readonly AudienceId[]
}

interface Arrival extends ScopedItem {
  destination: string
  direction: string
  minutes: number
  platform: string
}

interface AgendaItem extends ScopedItem {
  time: string
  title: string
  location: string
  note: string
}

interface TodoItem extends ScopedItem {
  task: string
  due: string
  lane: string
}

interface NewsItem extends ScopedItem {
  source: string
  headline: string
  summary: string
  eta: string
}

interface ForecastDay {
  day: string
  high: number
  low: number
  condition: string
}

const defaultFamilyMembers: FamilyMember[] = [
  { id: 'family-1', firstName: 'Alex', color: '#2850ad' },
  { id: 'family-2', firstName: 'Bianca', color: '#b933ad' },
  { id: 'family-3', firstName: 'Chris', color: '#5d748f' },
  { id: 'family-4', firstName: 'Dana', color: '#fccc0a' },
]

const widgetLegend = [
  { number: 1, label: 'Arrival board' },
  { number: 2, label: 'Weather' },
  { number: 3, label: 'Calendar' },
  { number: 4, label: 'Todo' },
  { number: 5, label: 'Bulletins' },
  { number: 6, label: 'Calibration' },
]

const widgetBadgeColors = [
  '#4aa8ff',
  '#fccc0a',
  '#ff6319',
  '#4edbe8',
  '#8b78ff',
  '#ff7c70',
  '#7dd3fc',
]

const arrivals: Arrival[] = [
  {
    line: 'all-household',
    destination: 'Home Sweep',
    direction: 'Whole-house system refresh',
    minutes: 1,
    platform: 'Main display',
    members: [ALL_MEMBERS_AUDIENCE],
  },
  {
    line: 'alex-school',
    destination: 'School Run',
    direction: 'North hall departure lane',
    minutes: 3,
    platform: 'Front door',
    members: ['family-1'],
  },
  {
    line: 'bianca-studio',
    destination: 'Studio Call',
    direction: 'East room focus session',
    minutes: 5,
    platform: 'Office',
    members: ['family-2'],
  },
  {
    line: 'chris-grocery',
    destination: 'Groceries Drop',
    direction: 'West lobby delivery window',
    minutes: 7,
    platform: 'Lobby',
    members: ['family-3'],
  },
  {
    line: 'dana-dinner',
    destination: 'Dinner Arrival',
    direction: 'South table setup',
    minutes: 10,
    platform: 'Kitchen',
    members: ['family-4'],
  },
]

const agendaItems: AgendaItem[] = [
  {
    line: 'all-household',
    time: '06:45',
    title: 'Morning status sync',
    location: 'Entry kiosk',
    note: 'Shared display refresh, weather pull, and door lock review.',
    members: [ALL_MEMBERS_AUDIENCE],
  },
  {
    line: 'alex-breakfast',
    time: '07:30',
    title: 'Breakfast transfer window',
    location: 'Kitchen platform',
    note: 'School bags staged and departure lane opens in 20 min.',
    members: ['family-1'],
  },
  {
    line: 'bianca-studio',
    time: '09:15',
    title: 'Studio work block',
    location: 'Home office',
    note: 'Editing queue, exports, and video call setup.',
    members: ['family-2'],
  },
  {
    line: 'chris-package',
    time: '14:30',
    title: 'Package pickup window',
    location: 'Lobby west desk',
    note: 'Replacement smart sensor reaches the building today.',
    members: ['family-3'],
  },
  {
    line: 'dana-dinner',
    time: '18:45',
    title: 'Dinner arrival',
    location: 'Dining room',
    note: 'Table reset and final prep before guests land.',
    members: ['family-4'],
  },
]

const todoItems: TodoItem[] = [
  {
    line: 'alex-intercom',
    task: 'Charge hallway intercom panel',
    due: 'Due before 08:00',
    lane: 'Maintenance lane',
    members: ['family-1'],
  },
  {
    line: 'bianca-gallery',
    task: 'Upload revised gallery shots',
    due: 'Due by 11:30',
    lane: 'Work queue',
    members: ['family-2'],
  },
  {
    line: 'chris-pantry',
    task: 'Restock pantry and dish tabs',
    due: 'Due by 16:00',
    lane: 'Household errands',
    members: ['family-3'],
  },
  {
    line: 'all-ambient',
    task: 'Set ambient scene for evening mode',
    due: 'Due before 19:00',
    lane: 'Display and lights',
    members: [ALL_MEMBERS_AUDIENCE],
  },
]

const newsItems: NewsItem[] = [
  {
    line: 'all-laundry',
    source: 'HOME SYSTEM',
    headline: 'Laundry cycle reaches transfer window in 12 minutes',
    summary: 'Move the upstairs load before dinner setup begins.',
    eta: 'Live now',
    members: [ALL_MEMBERS_AUDIENCE],
  },
  {
    line: 'alex-courier',
    source: 'DOORBELL CAM',
    headline: 'Courier with replacement air filters is two stops away',
    summary: 'The front console can accept the drop if nobody is home.',
    eta: 'Alert 4 min ago',
    members: ['family-1'],
  },
  {
    line: 'bianca-feed',
    source: 'CREATOR FEED',
    headline: 'Editing deadline moved to the first local stop after lunch',
    summary: 'Exports should queue before the afternoon call begins.',
    eta: 'Brief 31 min ago',
    members: ['family-2'],
  },
  {
    line: 'chris-market',
    source: 'NEIGHBORHOOD',
    headline: 'Corner market restocked cleaning and paper goods',
    summary: 'The pantry run can clear two open errands in one trip.',
    eta: 'Alert 40 min ago',
    members: ['family-3', 'family-4'],
  },
]

const weatherForecast: ForecastDay[] = [
  { day: 'MON', high: 74, low: 61, condition: 'Partly cloudy' },
  { day: 'TUE', high: 72, low: 60, condition: 'Light rain' },
  { day: 'WED', high: 76, low: 63, condition: 'Bright sun' },
  { day: 'THU', high: 70, low: 58, condition: 'Windy PM' },
]

const commuteNotes: Record<string, string> = {
  [ALL_FILTER_ID]:
    'Household advisory: dry commute now, light rain most likely after the evening return window.',
  'family-1':
    'Alex: cooler north hall start, keep a light shell in the top basket.',
  'family-2':
    'Bianca: east window glare is strongest until 10:00, close shade B after departure.',
  'family-3':
    'Chris: best errand gap is 13:00 to 15:00 before the wind picks up.',
  'family-4':
    'Dana: clear dinner arrival window, no umbrella needed for the evening run.',
}

const measureItems = [
  {
    label: 'Canvas',
    value: `${display.resolutionWidth} x ${display.resolutionHeight} px`,
  },
  {
    label: 'Panel',
    value: `${portraitWidthCm.toFixed(1)} x ${portraitHeightCm.toFixed(1)} cm`,
  },
  {
    label: 'Density',
    value: `${pixelsPerInch.toFixed(1)} ppi`,
  },
  {
    label: '5 x 5 cm',
    value: `${squarePixels} px edge`,
  },
]

const sanitizeMemberName = (value: string) =>
  value.trim().replace(/\s+/g, ' ').slice(0, 24)

const normalizeHexColor = (value: string) =>
  /^#[0-9a-fA-F]{6}$/.test(value) ? value : DEFAULT_NEW_MEMBER_COLOR

const getMemberLabel = (member: FamilyMember) =>
  sanitizeMemberName(member.firstName) || 'Member'

const getInitial = (value: string) => {
  const cleanValue = sanitizeMemberName(value)

  return cleanValue ? cleanValue.charAt(0).toUpperCase() : '?'
}

const getContrastColor = (hexColor: string) => {
  const red = Number.parseInt(hexColor.slice(1, 3), 16)
  const green = Number.parseInt(hexColor.slice(3, 5), 16)
  const blue = Number.parseInt(hexColor.slice(5, 7), 16)
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255

  return luminance > 0.65 ? '#08111d' : '#f8fbff'
}

const badgeStyle = (color: string) =>
  ({
    '--route-color': color,
    '--route-ink': getContrastColor(color),
  }) as CSSProperties

const widgetBadgeStyle = (number: number) =>
  badgeStyle(widgetBadgeColors[(number - 1) % widgetBadgeColors.length])

const householdBadgeStyle = badgeStyle('#7f8a98')

const squareStyle = {
  '--square-size': `${squarePixels}px`,
} as CSSProperties

const matchesFilter = (members: readonly AudienceId[], filter: FilterId) =>
  filter === ALL_FILTER_ID ||
  members.includes(ALL_MEMBERS_AUDIENCE) ||
  members.includes(filter)

const pickDisplayMember = (
  audience: readonly AudienceId[],
  activeFilter: FilterId,
  membersById: Map<string, FamilyMember>,
) => {
  if (activeFilter !== ALL_FILTER_ID && audience.includes(activeFilter)) {
    return membersById.get(activeFilter)
  }

  for (const memberId of audience) {
    if (memberId === ALL_MEMBERS_AUDIENCE) {
      continue
    }

    const member = membersById.get(memberId)

    if (member) {
      return member
    }
  }

  return undefined
}

const audienceLabel = (
  audience: readonly AudienceId[],
  membersById: Map<string, FamilyMember>,
) => {
  if (audience.includes(ALL_MEMBERS_AUDIENCE)) {
    return 'Household'
  }

  const names = audience
    .map((memberId) => membersById.get(memberId))
    .filter((member): member is FamilyMember => Boolean(member))
    .map((member) => getMemberLabel(member))

  return names.join(' + ')
}

const loadStoredFamilyMembers = () => {
  if (typeof window === 'undefined') {
    return defaultFamilyMembers
  }

  try {
    const rawValue = window.localStorage.getItem(FAMILY_STORAGE_KEY)

    if (!rawValue) {
      return defaultFamilyMembers
    }

    const parsedValue = JSON.parse(rawValue)

    if (!Array.isArray(parsedValue)) {
      return defaultFamilyMembers
    }

    const normalizedMembers = parsedValue
      .map((value) => {
        if (
          !value ||
          typeof value !== 'object' ||
          typeof value.id !== 'string' ||
          typeof value.firstName !== 'string' ||
          typeof value.color !== 'string'
        ) {
          return null
        }

        return {
          id: value.id,
          firstName: sanitizeMemberName(value.firstName) || 'Member',
          color: normalizeHexColor(value.color),
        } satisfies FamilyMember
      })
      .filter((member): member is FamilyMember => Boolean(member))

    return normalizedMembers.length > 0 ? normalizedMembers : defaultFamilyMembers
  } catch {
    return defaultFamilyMembers
  }
}

function App() {
  const [now, setNow] = useState(() => new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('board')
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(() =>
    loadStoredFamilyMembers(),
  )
  const [activeFilter, setActiveFilter] = useState<FilterId>(ALL_FILTER_ID)
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberColor, setNewMemberColor] = useState(DEFAULT_NEW_MEMBER_COLOR)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(FAMILY_STORAGE_KEY, JSON.stringify(familyMembers))
  }, [familyMembers])

  useEffect(() => {
    if (
      activeFilter !== ALL_FILTER_ID &&
      !familyMembers.some((member) => member.id === activeFilter)
    ) {
      setActiveFilter(ALL_FILTER_ID)
    }
  }, [activeFilter, familyMembers])

  const membersById = new Map(familyMembers.map((member) => [member.id, member]))
  const filterOptions: FilterOption[] = [
    {
      id: ALL_FILTER_ID,
      label: 'All',
      caption: 'Household view',
      badgeText: 'HM',
      style: householdBadgeStyle,
    },
    ...familyMembers.map((member) => ({
      id: member.id,
      label: getMemberLabel(member),
      caption: 'Member focus',
      badgeText: getInitial(member.firstName),
      style: badgeStyle(member.color),
    })),
  ]

  const activeProfile = familyMembers.find((member) => member.id === activeFilter)
  const visibleArrivals = arrivals.filter((item) =>
    matchesFilter(item.members, activeFilter),
  )
  const visibleAgenda = agendaItems.filter((item) =>
    matchesFilter(item.members, activeFilter),
  )
  const visibleTodos = todoItems.filter((item) =>
    matchesFilter(item.members, activeFilter),
  )
  const visibleNews = newsItems.filter((item) =>
    matchesFilter(item.members, activeFilter),
  )
  const boardTime = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now)
  const boardDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: '2-digit',
  })
    .format(now)
    .replace(',', '')
    .toUpperCase()
  const currentAgenda = visibleAgenda[0] ?? agendaItems[0]
  const currentAlert = visibleNews[0] ?? newsItems[0]
  const nextTodo = visibleTodos[0] ?? todoItems[0]
  const commuteNote =
    commuteNotes[activeFilter] ??
    `${activeProfile ? getMemberLabel(activeProfile) : 'This view'}: color and badge are ready. Personal items can be assigned next.`

  const updateMember = (
    memberId: MemberId,
    field: keyof Pick<FamilyMember, 'firstName' | 'color'>,
    value: string,
  ) => {
    setFamilyMembers((currentMembers) =>
      currentMembers.map((member) => {
        if (member.id !== memberId) {
          return member
        }

        if (field === 'color') {
          return { ...member, color: normalizeHexColor(value) }
        }

        return { ...member, firstName: value }
      }),
    )
  }

  const handleAddMember = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const firstName = sanitizeMemberName(newMemberName)

    if (!firstName) {
      return
    }

    const newMember: FamilyMember = {
      id: `family-${Date.now().toString(36)}`,
      firstName,
      color: normalizeHexColor(newMemberColor),
    }

    setFamilyMembers((currentMembers) => [...currentMembers, newMember])
    setNewMemberName('')
    setNewMemberColor(DEFAULT_NEW_MEMBER_COLOR)
    setActiveFilter(newMember.id)
  }

  const renderAudienceBadge = (
    audience: readonly AudienceId[],
    sizeClassName = 'route-bullet--small',
  ) => {
    const member = pickDisplayMember(audience, activeFilter, membersById)

    if (!member) {
      return (
        <span className={`route-bullet ${sizeClassName}`} style={householdBadgeStyle}>
          HM
        </span>
      )
    }

    return (
      <span
        className={`route-bullet ${sizeClassName}`}
        style={badgeStyle(member.color)}
      >
        {getInitial(member.firstName)}
      </span>
    )
  }

  return (
    <main className="app-shell">
      <section className="screen">
        <header className="terminal-marquee">
          <div className="terminal-left">
            <span className="agency-badge">HM</span>
            <div className="terminal-copy">
              <p className="terminal-location">Family Avenue South</p>
              <h1 className="terminal-title">
                {viewMode === 'board' ? 'Home info kiosk' : 'Family settings'}
              </h1>
            </div>
          </div>

          <div className="terminal-right">
            <div className="terminal-actions">
              <button
                type="button"
                className={`terminal-button${viewMode === 'board' ? ' is-active' : ''}`}
                onClick={() => setViewMode('board')}
              >
                Board
              </button>
              <button
                type="button"
                className={`terminal-button${viewMode === 'settings' ? ' is-active' : ''}`}
                onClick={() => setViewMode('settings')}
              >
                Settings
              </button>
              <div className="terminal-exit" aria-label="Primary wayfinding">
                <span>EXIT</span>
                <strong>Kitchen</strong>
                <span aria-hidden="true">→</span>
              </div>
            </div>
            <div className="clock-stack">
              <p className="board-date">{boardDate}</p>
              <p className="board-clock">{boardTime}</p>
            </div>
          </div>
        </header>

        {viewMode === 'board' ? (
          <section className="dashboard-grid">
            <article className="widget widget--span-6 widget--board">
              <div className="board-head">
                <div className="board-title-group">
                  <span
                    className="route-bullet route-bullet--large"
                    style={widgetBadgeStyle(1)}
                  >
                    1
                  </span>
                  <div>
                    <p className="widget-kicker">Family service board</p>
                    <h2>
                      {activeProfile
                        ? `${getMemberLabel(activeProfile)} arrivals`
                        : 'All household arrivals'}
                    </h2>
                  </div>
                </div>
                <div className="board-head-side">
                  <p className="board-side-label">Ready next</p>
                  <p className="board-side-value">{nextTodo.task}</p>
                  <p className="board-side-detail">{nextTodo.due}</p>
                </div>
              </div>

              <div className="arrival-board">
                {visibleArrivals.length > 0 ? (
                  visibleArrivals.map((item) => (
                    <article
                      className="arrival-strip"
                      key={`${item.line}-${item.destination}`}
                    >
                      <div className="arrival-route">
                        {renderAudienceBadge(item.members, 'route-bullet--large')}
                        <div className="arrival-destination">
                          <h3>{item.destination}</h3>
                          <p>
                            {item.direction} · {item.platform} ·{' '}
                            {audienceLabel(item.members, membersById)}
                          </p>
                        </div>
                      </div>
                      <div className="arrival-minute-stack">
                        <p className="arrival-count">{item.minutes}</p>
                        <p className="arrival-unit">MIN</p>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="empty-state empty-state--board">
                    <p className="empty-title">No personal arrivals yet</p>
                    <p className="empty-copy">
                      Add household data sources or switch back to the All filter.
                    </p>
                  </div>
                )}
              </div>

              <div className="board-footer">
                <div className="happening-now">
                  <p className="board-side-label">Happening now</p>
                  <p className="happening-copy">
                    {currentAgenda.time} · {currentAgenda.title} · {currentAgenda.location}
                  </p>
                </div>

                <div className="alert-inline">
                  <span className="alert-dot" aria-hidden="true"></span>
                  <p>{currentAlert.headline}</p>
                </div>

                <div
                  className="filter-row filter-row--compact"
                  role="group"
                  aria-label="Household filters"
                >
                  {filterOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`filter-pill${option.id === activeFilter ? ' is-active' : ''}`}
                      aria-pressed={option.id === activeFilter}
                      onClick={() => setActiveFilter(option.id)}
                    >
                      <span className="route-bullet" style={option.style}>
                        {option.badgeText}
                      </span>
                      <span className="filter-copy">
                        <span className="filter-label">{option.label}</span>
                        <span className="filter-caption">{option.caption}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </article>

            <article className="widget widget--span-2">
              <div className="widget-head">
                <div className="widget-flag">
                  <span
                    className="route-bullet route-bullet--large"
                    style={widgetBadgeStyle(2)}
                  >
                    2
                  </span>
                  <div>
                    <p className="widget-kicker">Forecast</p>
                    <h2>Weather board</h2>
                  </div>
                </div>
                <p className="widget-meta">4 day outlook</p>
              </div>

              <div className="weather-summary">
                <p className="weather-temp">72°</p>
                <div className="weather-copy">
                  <p className="weather-condition">Partly cloudy now</p>
                  <p className="weather-range">High 74° / Low 61° / NW 8 mph</p>
                  <p className="weather-note">{commuteNote}</p>
                </div>
              </div>

              <div className="forecast-grid">
                {weatherForecast.map((day) => (
                  <div className="forecast-card" key={day.day}>
                    <p className="forecast-day">{day.day}</p>
                    <p className="forecast-condition">{day.condition}</p>
                    <p className="forecast-range">
                      {day.high}° / {day.low}°
                    </p>
                  </div>
                ))}
              </div>
            </article>

            <article className="widget widget--span-2">
              <div className="widget-head">
                <div className="widget-flag">
                  <span
                    className="route-bullet route-bullet--large"
                    style={widgetBadgeStyle(3)}
                  >
                    3
                  </span>
                  <div>
                    <p className="widget-kicker">Calendar</p>
                    <h2>Upcoming events</h2>
                  </div>
                </div>
                <p className="widget-meta">{visibleAgenda.length} active stops</p>
              </div>

              <ul className="agenda-list">
                {visibleAgenda.length > 0 ? (
                  visibleAgenda.map((item) => (
                    <li className="agenda-row" key={`${item.time}-${item.title}`}>
                      <p className="agenda-time">{item.time}</p>
                      <div className="agenda-copy">
                        <p className="agenda-title">{item.title}</p>
                        <p className="agenda-location">{item.location}</p>
                        <p className="agenda-note">{item.note}</p>
                      </div>
                      {renderAudienceBadge(item.members)}
                    </li>
                  ))
                ) : (
                  <li className="empty-state">
                    <p className="empty-title">No calendar items</p>
                    <p className="empty-copy">
                      Add a member or return to the household view for shared stops.
                    </p>
                  </li>
                )}
              </ul>
            </article>

            <article className="widget widget--span-2">
              <div className="widget-head">
                <div className="widget-flag">
                  <span
                    className="route-bullet route-bullet--large"
                    style={widgetBadgeStyle(4)}
                  >
                    4
                  </span>
                  <div>
                    <p className="widget-kicker">Todo</p>
                    <h2>Task board</h2>
                  </div>
                </div>
                <p className="widget-meta">{visibleTodos.length} open items</p>
              </div>

              <ul className="todo-list">
                {visibleTodos.length > 0 ? (
                  visibleTodos.map((item) => (
                    <li className="todo-row" key={item.task}>
                      <span className="todo-status" aria-hidden="true"></span>
                      <div className="todo-copy">
                        <p className="todo-task">{item.task}</p>
                        <p className="todo-lane">{item.lane}</p>
                      </div>
                      <div className="todo-side">
                        {renderAudienceBadge(item.members)}
                        <p className="todo-due">{item.due}</p>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="empty-state">
                    <p className="empty-title">No personal tasks</p>
                    <p className="empty-copy">
                      Shared system tasks stay visible in the household filter.
                    </p>
                  </li>
                )}
              </ul>
            </article>

            <article className="widget widget--span-4">
              <div className="widget-head">
                <div className="widget-flag">
                  <span
                    className="route-bullet route-bullet--large"
                    style={widgetBadgeStyle(5)}
                  >
                    5
                  </span>
                  <div>
                    <p className="widget-kicker">Bulletin panel</p>
                    <h2>Home and city dispatch</h2>
                  </div>
                </div>
                <p className="widget-meta">Filtered by member color and initial</p>
              </div>

              <div className="news-list">
                {visibleNews.length > 0 ? (
                  visibleNews.map((item) => (
                    <article className="news-card" key={`${item.source}-${item.headline}`}>
                      <div className="news-meta">
                        {renderAudienceBadge(item.members)}
                        <p>{item.source}</p>
                        <p>{item.eta}</p>
                      </div>
                      <h3>{item.headline}</h3>
                      <p>{item.summary}</p>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">
                    <p className="empty-title">No bulletins in this view</p>
                    <p className="empty-copy">
                      New members start with household-wide news until personal feeds are added.
                    </p>
                  </div>
                )}
              </div>
            </article>

            <article className="widget widget--span-2 widget--calibration">
              <div className="widget-head">
                <div className="widget-flag">
                  <span
                    className="route-bullet route-bullet--large"
                    style={widgetBadgeStyle(6)}
                  >
                    6
                  </span>
                  <div>
                    <p className="widget-kicker">System</p>
                    <h2>Calibration</h2>
                  </div>
                </div>
                <p className="widget-meta">Display reference</p>
              </div>

              <div className="measure-stack">
                {measureItems.map((item) => (
                  <div className="measure-chip" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>

              <div className="square-preview" style={squareStyle}>
                <div className="square">
                  <span>5 x 5 cm</span>
                </div>
              </div>

              <p className="calibration-note">
                Keep the browser at 100% zoom on the installed portrait panel.
                Member circles now use initials and colors, while widget headers
                use numbers.
              </p>
            </article>
          </section>
        ) : (
          <section className="settings-page">
            <article className="settings-panel">
              <div className="widget-head">
                <div className="widget-flag">
                  <span
                    className="route-bullet route-bullet--large"
                    style={widgetBadgeStyle(7)}
                  >
                    7
                  </span>
                  <div>
                    <p className="widget-kicker">Settings</p>
                    <h2>Family members</h2>
                  </div>
                </div>
                <p className="widget-meta">{familyMembers.length} active members</p>
              </div>

              <p className="settings-copy">
                Add family members, choose a color for each person, and use the
                first letter of the forename as the circle badge across the kiosk.
                Widget headers keep numeric markers so the roles stay distinct.
              </p>

              <div className="settings-grid">
                <div className="member-list">
                  {familyMembers.map((member) => (
                    <article className="member-editor" key={member.id}>
                      <div className="member-editor-head">
                        <span
                          className="route-bullet route-bullet--large"
                          style={badgeStyle(normalizeHexColor(member.color))}
                        >
                          {getInitial(member.firstName)}
                        </span>
                        <div>
                          <h3>{getMemberLabel(member)}</h3>
                          <p>
                            This initial and color are used in filters and member badges.
                          </p>
                        </div>
                      </div>

                      <div className="member-form-fields">
                        <label className="settings-label">
                          <span>Forename</span>
                          <input
                            className="settings-input"
                            type="text"
                            value={member.firstName}
                            onChange={(event) =>
                              updateMember(member.id, 'firstName', event.target.value)
                            }
                            placeholder="Forename"
                          />
                        </label>

                        <label className="settings-label settings-label--color">
                          <span>Color</span>
                          <input
                            className="settings-color"
                            type="color"
                            value={normalizeHexColor(member.color)}
                            onChange={(event) =>
                              updateMember(member.id, 'color', event.target.value)
                            }
                          />
                        </label>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="settings-side">
                  <form className="settings-card settings-form" onSubmit={handleAddMember}>
                    <div className="settings-card-head">
                      <p className="widget-kicker">Add member</p>
                      <h3>New roster entry</h3>
                    </div>

                    <label className="settings-label">
                      <span>Forename</span>
                      <input
                        className="settings-input"
                        type="text"
                        value={newMemberName}
                        onChange={(event) => setNewMemberName(event.target.value)}
                        placeholder="Forename"
                      />
                    </label>

                    <label className="settings-label settings-label--color">
                      <span>Color</span>
                      <input
                        className="settings-color"
                        type="color"
                        value={newMemberColor}
                        onChange={(event) => setNewMemberColor(event.target.value)}
                      />
                    </label>

                    <button className="settings-submit" type="submit">
                      Add family member
                    </button>
                  </form>

                  <article className="settings-card">
                    <div className="settings-card-head">
                      <p className="widget-kicker">Widget markers</p>
                      <h3>Numbers stay on widgets</h3>
                    </div>

                    <div className="widget-number-list">
                      {widgetLegend.map((item) => (
                        <div className="widget-number-row" key={item.number}>
                          <span
                            className="route-bullet"
                            style={widgetBadgeStyle(item.number)}
                          >
                            {item.number}
                          </span>
                          <p>{item.label}</p>
                        </div>
                      ))}
                    </div>

                    <p className="settings-note">
                      Family members own the letters in the circles. Widgets use
                      numbers so people and modules stay visually separate.
                    </p>
                  </article>
                </div>
              </div>
            </article>
          </section>
        )}
      </section>
    </main>
  )
}

export default App

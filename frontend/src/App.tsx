import { useEffect, useRef, useState, type FormEvent } from 'react'
import './App.css'
import {
  fetchCurrentSession,
  login as loginWithPassword,
  logout as logoutCurrentSession,
  type AuthUser,
} from './api/auth'
import {
  currentFrontendBuildId,
  fetchBackendRuntimeInfo,
  fetchFrontendRuntimeInfo,
} from './api/runtime'
import {
  createFamilyMember,
  fetchFamilyMembers,
  updateFamilyMember,
} from './api/familyMembers'
import { isAuthRequiredError } from './api/request'
import {
  fetchWidgetSettings,
  updateWidgetSettings,
} from './api/widgetSettings'
import { fetchWidgetEntities, updateWidgetEntity } from './api/widgets'
import { buildBadgeStyle } from './widgets/widgetAppearance'
import { WidgetBoardHost } from './widgets/WidgetBoardHost'
import { WidgetDebugOverlay } from './widgets/WidgetDebugOverlay'
import {
  defaultArrivalBoardSettings,
  normalizeArrivalBoardSettings,
} from './widgets/arrival-board'
import { fetchCalendarEvents } from './widgets/calendar/calendarApi'
import { filterCalendarAgendaItems } from './widgets/calendar'
import { fetchTodoItems } from './widgets/todo/todoApi'
import { filterTodoItemsForView } from './widgets/todo'
import { normalizeWeatherSettings } from './widgets/weather'
import {
  WidgetMetadataAdminHost,
  type WidgetMetadataDraft,
} from './widgets/WidgetMetadataAdminHost'
import type {
  AgendaItem,
  Arrival,
  AudienceId,
  FamilyMember,
  FilterId,
  FilterOption,
  ForecastDay,
  NewsItem,
  TodoItem,
  WeatherLocationData,
  WeatherWidgetData,
} from './widgets/widgetHostModels'
import { buildWidgetRegistry } from './widgets/widgetRegistry'
import type {
  RegisteredWidget,
  WidgetHealthState,
  WidgetSettingsValues,
} from './widgets/widgetTypes'

const ALL_FILTER_ID = 'all'
const ALL_MEMBERS_AUDIENCE = '*'
const DEFAULT_NEW_MEMBER_COLOR = '#4aa8ff'
const APP_RUNTIME_POLL_INTERVAL_MS = 30_000
const LOCAL_APP_SHELL_STORAGE_KEY_PREFIX = 'subway-app-shell'

type ViewMode = 'board' | 'settings'
type AuthStatus = 'bootstrapping' | 'unauthenticated' | 'authenticated'
type MemberId = string

interface AppShellPersistedState {
  activeFilter: FilterId
}

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

const emptyAgendaItem: AgendaItem = {
  line: 'calendar-empty',
  time: '--:--',
  title: 'No calendar events',
  location: 'Calendar widget',
  note: 'Calendar data will appear here when events are available for the active scope.',
  members: [ALL_MEMBERS_AUDIENCE],
}

const emptyTodoItem: TodoItem = {
  id: 'todo-empty',
  line: 'todo-empty',
  task: 'No open todo items',
  due: 'No due date',
  lane: 'Todo widget',
  done: false,
  members: [ALL_MEMBERS_AUDIENCE],
}

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

const fallbackWeatherForecast: ForecastDay[] = [
  { day: 'MON', high: 74, low: 61, condition: 'Partly cloudy', visualState: 'cloudy' },
  { day: 'TUE', high: 72, low: 60, condition: 'Light rain', visualState: 'rain' },
  { day: 'WED', high: 76, low: 63, condition: 'Bright sun', visualState: 'sun' },
  { day: 'THU', high: 70, low: 58, condition: 'Windy PM', visualState: 'wind' },
]

const fallbackWeatherLocation: WeatherLocationData = {
  id: 'location-1',
  location: 'Berlin',
  source: 'Open-Meteo',
  stale: true,
  updatedAt: new Date(0).toISOString(),
  currentTemperature: '--°',
  condition: 'Weather unavailable',
  visualState: 'fallback',
  rangeSummary: 'No live weather data available',
  forecast: fallbackWeatherForecast,
}

const fallbackWeatherData: WeatherWidgetData = {
  ...fallbackWeatherLocation,
  focusLocationId: fallbackWeatherLocation.id,
  locations: [fallbackWeatherLocation],
}

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

const badgeStyle = (color: string) => buildBadgeStyle(color)

const householdBadgeStyle = badgeStyle('#7f8a98')

const getLocalAppShellStorageKey = (userId: string) =>
  `${LOCAL_APP_SHELL_STORAGE_KEY_PREFIX}:${userId}`

const normalizeAppShellPersistedState = (
  value: unknown,
): AppShellPersistedState => {
  const candidate = value as {
    activeFilter?: unknown
  }

  return {
    activeFilter:
      typeof candidate?.activeFilter === 'string' && candidate.activeFilter.trim().length > 0
        ? candidate.activeFilter
        : ALL_FILTER_ID,
  }
}

const readLocalAppShellState = (userId: string): AppShellPersistedState => {
  if (typeof window === 'undefined') {
    return { activeFilter: ALL_FILTER_ID }
  }

  try {
    const storedValue = window.localStorage.getItem(getLocalAppShellStorageKey(userId))

    if (!storedValue) {
      return { activeFilter: ALL_FILTER_ID }
    }

    return normalizeAppShellPersistedState(JSON.parse(storedValue))
  } catch {
    return { activeFilter: ALL_FILTER_ID }
  }
}

const persistLocalAppShellState = (userId: string, state: AppShellPersistedState) => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(getLocalAppShellStorageKey(userId), JSON.stringify(state))
  } catch {
    // Ignore storage failures and keep the UI responsive.
  }
}

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

function App() {
  const [now, setNow] = useState(() => new Date())
  const [authStatus, setAuthStatus] = useState<AuthStatus>('bootstrapping')
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authPending, setAuthPending] = useState(false)
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('board')
  const [expandedWidgetId, setExpandedWidgetId] = useState<string | null>(null)
  const [registeredWidgets, setRegisteredWidgets] = useState<RegisteredWidget[]>([])
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [calendarEvents, setCalendarEvents] = useState<AgendaItem[]>([])
  const [todoWidgetItems, setTodoWidgetItems] = useState<TodoItem[]>([])
  const [weatherWidgetData, setWeatherWidgetData] =
    useState<WeatherWidgetData>(fallbackWeatherData)
  const [weatherRefreshToken, setWeatherRefreshToken] = useState(0)
  const [nextWeatherRefreshAt, setNextWeatherRefreshAt] = useState<number | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterId>(ALL_FILTER_ID)
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberColor, setNewMemberColor] = useState(DEFAULT_NEW_MEMBER_COLOR)
  const [familyMembersError, setFamilyMembersError] = useState<string | null>(null)
  const [widgetMetadataError, setWidgetMetadataError] = useState<string | null>(null)
  const [widgetMetadataAdminError, setWidgetMetadataAdminError] = useState<string | null>(null)
  const [widgetSettingsError, setWidgetSettingsError] = useState<string | null>(null)
  const [calendarEventsError, setCalendarEventsError] = useState<string | null>(null)
  const [todoItemsError, setTodoItemsError] = useState<string | null>(null)
  const [weatherError, setWeatherError] = useState<string | null>(null)
  const [debugModeEnabled, setDebugModeEnabled] = useState(false)
  const [todoRefreshToken, setTodoRefreshToken] = useState(0)
  const [widgetSettingsMap, setWidgetSettingsMap] = useState<
    Record<string, WidgetSettingsValues>
  >({})
  const [widgetHealthMap, setWidgetHealthMap] = useState<Record<string, WidgetHealthState>>({})
  const [, setDebugTapTimestamps] = useState<number[]>([])
  const [familyMembersLoaded, setFamilyMembersLoaded] = useState(false)
  const [widgetMetadataLoaded, setWidgetMetadataLoaded] = useState(false)
  const [, setWidgetSettingsLoaded] = useState(false)
  const [, setWidgetSettingsAvailable] = useState(false)
  const [appShellStateHydrated, setAppShellStateHydrated] = useState(false)
  const backendRuntimeInstanceIdRef = useRef<string | null>(null)

  const resetProtectedState = () => {
    setViewMode('board')
    setExpandedWidgetId(null)
    setRegisteredWidgets([])
    setFamilyMembers([])
    setCalendarEvents([])
    setTodoWidgetItems([])
    setWeatherWidgetData(fallbackWeatherData)
    setWeatherRefreshToken(0)
    setNextWeatherRefreshAt(null)
    setActiveFilter(ALL_FILTER_ID)
    setNewMemberName('')
    setNewMemberColor(DEFAULT_NEW_MEMBER_COLOR)
    setFamilyMembersError(null)
    setWidgetMetadataError(null)
    setWidgetMetadataAdminError(null)
    setWidgetSettingsError(null)
    setCalendarEventsError(null)
    setTodoItemsError(null)
    setWeatherError(null)
    setDebugModeEnabled(false)
    setTodoRefreshToken(0)
    setWidgetSettingsMap({})
    setWidgetHealthMap({})
    setDebugTapTimestamps([])
    setFamilyMembersLoaded(false)
    setWidgetMetadataLoaded(false)
    setWidgetSettingsLoaded(false)
    setWidgetSettingsAvailable(false)
    setAppShellStateHydrated(false)
  }

  const enterUnauthenticatedState = (message: string | null = null) => {
    resetProtectedState()
    setAuthenticatedUser(null)
    setLoginUsername('')
    setLoginPassword('')
    setAuthStatus('unauthenticated')
    setAuthPending(false)
    setAuthError(message)
  }

  const enterAuthenticatedState = (user: AuthUser) => {
    resetProtectedState()
    setAuthenticatedUser(user)
    setLoginUsername('')
    setLoginPassword('')
    setAuthStatus('authenticated')
    setAuthPending(false)
    setAuthError(null)
  }

  const handleAuthRequired = () => {
    setLoginPassword('')
    enterUnauthenticatedState('Your session expired. Please sign in again.')
  }

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        setDebugModeEnabled((currentValue) => !currentValue)
      }

      if (event.key === 'Escape') {
        setDebugModeEnabled(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    fetchCurrentSession()
      .then((sessionState) => {
        if (cancelled) {
          return
        }

        if (sessionState.authenticated && sessionState.user) {
          enterAuthenticatedState(sessionState.user)
          return
        }

        enterUnauthenticatedState()
      })
      .catch(() => {
        if (!cancelled) {
          enterUnauthenticatedState(
            'Failed to verify the current session. Please sign in again.',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (
      authStatus !== 'authenticated' ||
      !authenticatedUser ||
      appShellStateHydrated
    ) {
      return
    }

    const localAppShellState = readLocalAppShellState(authenticatedUser.id)

    setActiveFilter(localAppShellState.activeFilter)
    setAppShellStateHydrated(true)
  }, [authStatus, authenticatedUser, appShellStateHydrated])

  useEffect(() => {
    if (authStatus !== 'authenticated' || !authenticatedUser || !appShellStateHydrated) {
      return
    }

    persistLocalAppShellState(authenticatedUser.id, {
      activeFilter,
    })
  }, [activeFilter, appShellStateHydrated, authStatus, authenticatedUser])

  useEffect(() => {
    let cancelled = false

    const pollRuntimeVersions = async () => {
      try {
        const [frontendRuntimeInfo, backendRuntimeInfo] = await Promise.all([
          fetchFrontendRuntimeInfo(),
          fetchBackendRuntimeInfo(),
        ])

        if (cancelled) {
          return
        }

        if (frontendRuntimeInfo.buildId !== currentFrontendBuildId) {
          window.location.reload()
          return
        }

        if (
          backendRuntimeInstanceIdRef.current !== null &&
          backendRuntimeInstanceIdRef.current !== backendRuntimeInfo.instanceId
        ) {
          window.location.reload()
          return
        }

        backendRuntimeInstanceIdRef.current = backendRuntimeInfo.instanceId
      } catch {
        // Ignore transient polling failures; a later poll can still trigger the reload.
      }
    }

    void pollRuntimeVersions()

    const runtimePollInterval = window.setInterval(() => {
      void pollRuntimeVersions()
    }, APP_RUNTIME_POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(runtimePollInterval)
    }
  }, [])

  useEffect(() => {
    if (authStatus !== 'authenticated') {
      return
    }

    let cancelled = false

    fetchWidgetSettings()
      .then((widgetSettings) => {
        if (!cancelled) {
          setWidgetSettingsMap(
            Object.fromEntries(
              widgetSettings.map((widgetSetting) => [
                widgetSetting.widgetId,
                widgetSetting.settings,
              ]),
            ),
          )
          setWidgetSettingsLoaded(true)
          setWidgetSettingsAvailable(true)
          setWidgetSettingsError(null)
        }
      })
      .catch((error) => {
        if (!cancelled) {
          if (isAuthRequiredError(error)) {
            handleAuthRequired()
            return
          }

          setWidgetSettingsLoaded(true)
          setWidgetSettingsAvailable(false)
          setWidgetSettingsError(
            'Backend widget settings unavailable. Default widget settings are being used.',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [authStatus])

  useEffect(() => {
    if (authStatus !== 'authenticated') {
      return
    }

    let cancelled = false

    fetchFamilyMembers()
      .then((loadedMembers) => {
        if (!cancelled) {
          setFamilyMembers(loadedMembers)
          setFamilyMembersLoaded(true)
          setFamilyMembersError(null)
          setActiveFilter((currentFilter) =>
            currentFilter === ALL_FILTER_ID ||
            loadedMembers.some((member) => member.id === currentFilter)
              ? currentFilter
              : ALL_FILTER_ID,
          )
        }
      })
      .catch((error) => {
        if (!cancelled) {
          if (isAuthRequiredError(error)) {
            handleAuthRequired()
            return
          }

          setFamilyMembers([])
          setFamilyMembersLoaded(true)
          setFamilyMembersError(
            'Backend sync unavailable. Family members shown below may not be current.',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [authStatus])

  useEffect(() => {
    if (authStatus !== 'authenticated') {
      return
    }

    let cancelled = false

    fetchWidgetEntities()
      .then((widgetEntities) => {
        if (!cancelled) {
          setRegisteredWidgets(buildWidgetRegistry(widgetEntities))
          setWidgetMetadataLoaded(true)
          setWidgetMetadataError(null)
        }
      })
      .catch((error) => {
        if (!cancelled) {
          if (isAuthRequiredError(error)) {
            handleAuthRequired()
            return
          }

          setRegisteredWidgets([])
          setWidgetMetadataLoaded(true)
          setWidgetMetadataError(
            'Backend widget metadata unavailable. Widget board contents may be incomplete until the connection returns.',
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [authStatus])

  useEffect(() => {
    if (
      activeFilter !== ALL_FILTER_ID &&
      !familyMembers.some((member) => member.id === activeFilter)
    ) {
      setActiveFilter(ALL_FILTER_ID)
    }
  }, [activeFilter, familyMembers])

  useEffect(() => {
    if (authStatus !== 'authenticated') {
      return
    }

    let cancelled = false

    const weatherWidget = registeredWidgets.find((widget) => widget.entity.id === 'weather')
    const weatherSettings = normalizeWeatherSettings(widgetSettingsMap.weather)

    if (!weatherWidget) {
      return () => {
        cancelled = true
      }
    }

    Promise.resolve(
      weatherWidget.module.loadData({
        focusedMemberId: null,
        settings: weatherSettings,
      }),
    )
      .then((result) => {
        if (!cancelled && result) {
          setWeatherWidgetData(result as WeatherWidgetData)
          setNextWeatherRefreshAt(
            Date.now() + weatherSettings.refreshIntervalMinutes * 60 * 1000,
          )
          setWeatherError(null)
          const weatherResult = result as WeatherWidgetData
          setWidgetHealthMap((currentValues) => ({
            ...currentValues,
            weather: {
              widgetId: 'weather',
              refreshStatus: weatherResult.stale ? 'cached' : 'live',
              lastRefreshAt: weatherResult.updatedAt,
              itemCount: weatherResult.locations.length,
            },
          }))
        }
      })
      .catch((error) => {
        if (!cancelled) {
          if (isAuthRequiredError(error)) {
            handleAuthRequired()
            return
          }

          setWeatherWidgetData(fallbackWeatherData)
          setNextWeatherRefreshAt(Date.now() + 60 * 1000)
          setWeatherError('Failed to load live weather data from the backend weather widget path.')
          setWidgetHealthMap((currentValues) => ({
            ...currentValues,
            weather: {
              widgetId: 'weather',
              refreshStatus: 'error',
              failureState: 'Failed to load live weather data from the backend weather widget path.',
            },
          }))
        }
      })

    return () => {
      cancelled = true
    }
  }, [authStatus, registeredWidgets, widgetSettingsMap, weatherRefreshToken])

  useEffect(() => {
    if (nextWeatherRefreshAt === null) {
      return
    }

    if (now.getTime() < nextWeatherRefreshAt) {
      return
    }

    setNextWeatherRefreshAt(null)
    setWeatherRefreshToken((currentValue) => currentValue + 1)
  }, [now, nextWeatherRefreshAt])

  useEffect(() => {
    if (authStatus !== 'authenticated') {
      return
    }

    let cancelled = false

    fetchCalendarEvents()
      .then((agendaItems) => {
        if (!cancelled) {
          setCalendarEvents(agendaItems)
          setCalendarEventsError(null)
          setWidgetHealthMap((currentValues) => ({
            ...currentValues,
            calendar: {
              widgetId: 'calendar',
              refreshStatus: 'ok',
              lastRefreshAt: new Date().toISOString(),
              itemCount: agendaItems.length,
            },
          }))
        }
      })
      .catch((error) => {
        if (!cancelled) {
          if (isAuthRequiredError(error)) {
            handleAuthRequired()
            return
          }

          setCalendarEvents([])
          setCalendarEventsError(
            'Failed to load calendar events from the backend calendar widget path.',
          )
          setWidgetHealthMap((currentValues) => ({
            ...currentValues,
            calendar: {
              widgetId: 'calendar',
              refreshStatus: 'error',
              failureState: 'Failed to load calendar events from the backend calendar widget path.',
            },
          }))
        }
      })

    return () => {
      cancelled = true
    }
  }, [authStatus])

  useEffect(() => {
    if (authStatus !== 'authenticated') {
      return
    }

    let cancelled = false

    fetchTodoItems()
      .then((todoItems) => {
        if (!cancelled) {
          setTodoWidgetItems(todoItems)
          setTodoItemsError(null)
          setWidgetHealthMap((currentValues) => ({
            ...currentValues,
            todo: {
              widgetId: 'todo',
              refreshStatus: 'ok',
              lastRefreshAt: new Date().toISOString(),
              itemCount: todoItems.length,
            },
          }))
        }
      })
      .catch((error) => {
        if (!cancelled) {
          if (isAuthRequiredError(error)) {
            handleAuthRequired()
            return
          }

          setTodoWidgetItems([])
          setTodoItemsError(
            'Failed to load todo items from the backend todo widget path.',
          )
          setWidgetHealthMap((currentValues) => ({
            ...currentValues,
            todo: {
              widgetId: 'todo',
              refreshStatus: 'error',
              failureState: 'Failed to load todo items from the backend todo widget path.',
            },
          }))
        }
      })

    return () => {
      cancelled = true
    }
  }, [authStatus, todoRefreshToken])

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
  const visibleAgenda = filterCalendarAgendaItems(
    calendarEvents,
    activeFilter === ALL_FILTER_ID ? null : activeFilter,
    widgetSettingsMap.calendar,
  )
  const visibleTodos = filterTodoItemsForView(
    todoWidgetItems,
    activeFilter === ALL_FILTER_ID ? null : activeFilter,
    widgetSettingsMap.todo,
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
  const currentAgenda = visibleAgenda[0] ?? emptyAgendaItem
  const currentAlert = visibleNews[0] ?? newsItems[0]
  const nextTodo = visibleTodos.find((item) => !item.done) ?? visibleTodos[0] ?? emptyTodoItem
  const arrivalBoardChromeSettings = normalizeArrivalBoardSettings(
    widgetSettingsMap['arrival-board'],
  )
  const boardTitleDisplay =
    arrivalBoardChromeSettings.boardTitle.trim().length > 0
      ? arrivalBoardChromeSettings.boardTitle
      : defaultArrivalBoardSettings.boardTitle
  const boardSubheadingDisplay =
    arrivalBoardChromeSettings.boardSubheading.trim().length > 0
      ? arrivalBoardChromeSettings.boardSubheading
      : defaultArrivalBoardSettings.boardSubheading
  const weatherRefreshCountdownLabel =
    nextWeatherRefreshAt === null
      ? 'Scheduling next update'
      : (() => {
          const millisecondsUntilRefresh = Math.max(
            nextWeatherRefreshAt - now.getTime(),
            0,
          )
          const totalSeconds = Math.ceil(millisecondsUntilRefresh / 1000)
          const minutes = Math.floor(totalSeconds / 60)
          const seconds = totalSeconds % 60

          return totalSeconds <= 0
            ? 'Refreshing now'
            : `Next update in ${minutes}:${seconds.toString().padStart(2, '0')}`
        })()
  const commuteNote =
    commuteNotes[activeFilter] ??
    `${activeProfile ? getMemberLabel(activeProfile) : 'This view'}: color and badge are ready. Personal items can be assigned next.`

  const updateMember = (
    memberId: MemberId,
    field: keyof Pick<FamilyMember, 'firstName' | 'color'>,
    value: string,
  ) => {
    const normalizedValue = field === 'color' ? normalizeHexColor(value) : value

    setFamilyMembers((currentMembers) => {
      const updatedMembers = currentMembers.map((member) => {
        if (member.id !== memberId) {
          return member
        }

        if (field === 'color') {
          return { ...member, color: normalizedValue }
        }

        return { ...member, firstName: normalizedValue }
      })

      const updatedMember = updatedMembers.find((member) => member.id === memberId)

      if (updatedMember) {
        updateFamilyMember(memberId, {
          firstName: sanitizeMemberName(updatedMember.firstName),
          color: normalizeHexColor(updatedMember.color),
        })
          .then((persistedMember) => {
            setFamilyMembers((currentValues) =>
              currentValues.map((member) =>
                member.id === persistedMember.id ? persistedMember : member,
              ),
            )
            setFamilyMembersError(null)
          })
          .catch((error) => {
            if (isAuthRequiredError(error)) {
              handleAuthRequired()
              return
            }

            setFamilyMembersError(
              'Failed to persist family-member changes to the backend.',
            )
          })
      }

      return updatedMembers
    })
  }

  const handleAddMember = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const firstName = sanitizeMemberName(newMemberName)

    if (!firstName) {
      return
    }

    createFamilyMember({
      firstName,
      color: normalizeHexColor(newMemberColor),
    })
      .then((persistedMember) => {
        setFamilyMembers((currentMembers) => [...currentMembers, persistedMember])
        setNewMemberName('')
        setNewMemberColor(DEFAULT_NEW_MEMBER_COLOR)
        setActiveFilter(persistedMember.id)
        setFamilyMembersError(null)
      })
      .catch((error) => {
        if (isAuthRequiredError(error)) {
          handleAuthRequired()
          return
        }

        setFamilyMembersError('Failed to create the family member in the backend.')
      })
  }

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const username = loginUsername.trim()
    const password = loginPassword

    if (!username || !password) {
      setAuthError('Username and password are required.')
      return
    }

    setAuthPending(true)
    setAuthError(null)

    loginWithPassword(username, password)
      .then((user) => {
        setLoginPassword('')
        enterAuthenticatedState(user)
      })
      .catch((error) => {
        if (isAuthRequiredError(error)) {
          handleAuthRequired()
          return
        }

        setAuthError(
          error instanceof Error ? error.message : 'Failed to sign in to the backend.',
        )
      })
      .finally(() => {
        setAuthPending(false)
      })
  }

  const handleLogout = () => {
    setAuthPending(true)
    setAuthError(null)

    logoutCurrentSession()
      .then(() => {
        setLoginPassword('')
        enterUnauthenticatedState()
      })
      .catch((error) => {
        if (isAuthRequiredError(error)) {
          handleAuthRequired()
          return
        }

        setAuthError('Failed to sign out from the backend. Try again.')
      })
      .finally(() => {
        setAuthPending(false)
      })
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

  const handleToggleTodoDone = (todoItemId: string, done: boolean) => {
    const todoWidget = registeredWidgets.find((widget) => widget.entity.id === 'todo')

    if (!todoWidget?.module.mutateData) {
      return
    }

    const previousTodoItems = todoWidgetItems

    setTodoWidgetItems((currentValues) =>
      currentValues.map((todoItem) =>
        todoItem.id === todoItemId ? { ...todoItem, done } : todoItem,
      ),
    )

    Promise.resolve(
      todoWidget.module.mutateData({
        action: 'set-done-state',
        focusedMemberId: activeFilter === ALL_FILTER_ID ? null : activeFilter,
        payload: { todoItemId, done },
      }),
    )
      .then(() => {
        setTodoRefreshToken((currentValue) => currentValue + 1)
        setTodoItemsError(null)
      })
      .catch((error) => {
        if (isAuthRequiredError(error)) {
          handleAuthRequired()
          return
        }

        setTodoWidgetItems(previousTodoItems)

        setTodoItemsError('Failed to update todo item state in the backend.')
        setWidgetHealthMap((currentValues) => ({
          ...currentValues,
          todo: {
            widgetId: 'todo',
            refreshStatus: 'error',
            failureState: 'Failed to update todo item state in the backend.',
            lastRefreshAt: currentValues.todo?.lastRefreshAt,
            itemCount: currentValues.todo?.itemCount,
          },
        }))
      })
  }

  const handleHiddenDebugTrigger = () => {
    const currentTimestamp = Date.now()

    setDebugTapTimestamps((currentValues) => {
      const recentValues = currentValues.filter(
        (value) => currentTimestamp - value < 2000,
      )
      const nextValues = [...recentValues, currentTimestamp]

      if (nextValues.length >= 5) {
        setDebugModeEnabled((currentValue) => !currentValue)
        return []
      }

      return nextValues
    })
  }

  const handleSaveWidgetSettings = async (
    widgetId: string,
    draftSettings: WidgetSettingsValues,
  ) => {
    try {
      const widget = registeredWidgets.find(
        (registeredWidget) => registeredWidget.entity.id === widgetId,
      )
      const normalizedSettings =
        widget?.module.settingsDefinition?.normalize(draftSettings) ?? draftSettings
      const persistedSettings = await updateWidgetSettings(widgetId, normalizedSettings)

      setWidgetSettingsMap((currentValues) => ({
        ...currentValues,
        [widgetId]: persistedSettings.settings,
      }))
      setWidgetSettingsError(null)
    } catch (error) {
      if (isAuthRequiredError(error)) {
        handleAuthRequired()
        return
      }

      throw error
    }
  }

  const handleSaveWidgetMetadata = async (
    widgetId: string,
    draft: WidgetMetadataDraft,
  ) => {
    try {
      const enabledPlacements = draft.placementZones.filter(
        (placement: WidgetMetadataDraft['placementZones'][number]) => placement.enabled,
      )

      await updateWidgetEntity(widgetId, {
        title: draft.title,
        subwayLetter: draft.subwayLetter,
        subwayColor: draft.subwayColor,
        sourceLocation: draft.sourceLocation,
        userScope: {
          mode: draft.userScopeMode,
          memberIds:
            draft.userScopeMode === 'all' ? [] : draft.userScopeMemberIds,
        },
        placementZones: enabledPlacements.map(
          (
            placement: WidgetMetadataDraft['placementZones'][number],
            index: number,
          ) => ({
            zoneId: placement.zoneId,
            order: index + 1,
          })),
      })

      const refreshedWidgetEntities = await fetchWidgetEntities()

      setRegisteredWidgets(buildWidgetRegistry(refreshedWidgetEntities))
      setWidgetMetadataAdminError(null)
    } catch (error) {
      if (isAuthRequiredError(error)) {
        handleAuthRequired()
        return
      }

      throw error
    }
  }

  const isProtectedShellReady =
    authStatus === 'authenticated' &&
    familyMembersLoaded &&
    widgetMetadataLoaded &&
    appShellStateHydrated

  if (authStatus === 'bootstrapping') {
    return (
      <main className="app-shell app-shell--auth">
        <section className="screen auth-screen">
          <div className="hero-layout hero-layout--loading">
            <article className="hero-card hero-card--brand hero-card--loading">
              <p className="terminal-location">Session bootstrap</p>
              <h1 className="terminal-title">Restoring access</h1>
              <p className="hero-copy">
                Checking for an existing session before loading the protected board.
              </p>
            </article>
          </div>
        </section>
      </main>
    )
  }

  if (authStatus === 'unauthenticated') {
    return (
      <main className="app-shell app-shell--auth">
        <section className="screen auth-screen">
          <div className="hero-layout hero-layout--single">
            <article className="hero-card hero-card--gateway">
              <div className="hero-subway-sign">
                <div className="hero-route-row" aria-hidden="true">
                  <span className="route-bullet route-bullet--large" style={badgeStyle('#0039a6')}>
                    A
                  </span>
                  <span className="route-bullet route-bullet--large" style={badgeStyle('#fccc0a')}>
                    Q
                  </span>
                  <span className="route-bullet route-bullet--large" style={badgeStyle('#b933ad')}>
                    7
                  </span>
                </div>
                <div className="hero-subway-copy">
                  <p className="terminal-location">NYC subway-style access</p>
                  <h1 className="terminal-title">{boardTitleDisplay}</h1>
                  <p className="hero-copy">
                    The subway is a rapid transit system built to move large numbers of people through one connected city network.
                  </p>
                  <p className="hero-copy">
                    Its route bullets, colors, and signs make a complicated map readable in just a few seconds.
                  </p>
                  <p className="hero-copy">
                    This board borrows that design language so household information feels as clear as a station platform.
                  </p>
                </div>
              </div>

              <div className="hero-login-block">
                <div className="settings-card-head">
                  <p className="widget-kicker">Sign in</p>
                  <h2>Enter the board</h2>
                </div>

                <p className="settings-copy">
                  Login is required before personal subway data and settings are shown.
                </p>

                {authError ? (
                  <p className="settings-note settings-note--warning">{authError}</p>
                ) : null}

                <form className="settings-form auth-form" onSubmit={handleLogin}>
                  <label className="settings-label">
                    <span>Username</span>
                    <input
                      autoComplete="username"
                      className="settings-input"
                      type="text"
                      value={loginUsername}
                      onChange={(event) => setLoginUsername(event.target.value)}
                      placeholder="Username"
                    />
                  </label>

                  <label className="settings-label">
                    <span>Password</span>
                    <input
                      autoComplete="current-password"
                      className="settings-input"
                      type="password"
                      value={loginPassword}
                      onChange={(event) => setLoginPassword(event.target.value)}
                      placeholder="Password"
                    />
                  </label>

                  <button className="settings-submit" type="submit" disabled={authPending}>
                    {authPending ? 'Signing in…' : 'Sign in'}
                  </button>
                </form>
              </div>
            </article>
          </div>
        </section>
      </main>
    )
  }

  if (!isProtectedShellReady) {
    return (
      <main className="app-shell app-shell--auth">
        <section className="screen auth-screen">
          <div className="hero-layout hero-layout--loading">
            <article className="hero-card hero-card--brand hero-card--loading">
              <p className="terminal-location">Authenticated session</p>
              <h1 className="terminal-title">Loading {authenticatedUser?.username}</h1>
              <p className="hero-copy">
                Restoring widgets, members, and saved settings for this account.
              </p>
            </article>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <section className="screen screen--shell">
        <header className="terminal-marquee">
          <div className="terminal-left">
            <div className="terminal-copy" onClick={handleHiddenDebugTrigger}>
              <p className="terminal-location">{boardSubheadingDisplay}</p>
              <h1 className="terminal-title">
                {viewMode === 'board'
                  ? boardTitleDisplay
                  : 'Family settings'}
              </h1>
            </div>
          </div>

          <div className="terminal-right">
            <div className="terminal-actions">
              <span className="session-chip">{authenticatedUser?.username}</span>
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
              <button
                type="button"
                className="terminal-button terminal-button--quiet"
                onClick={handleLogout}
                disabled={authPending}
              >
                {authPending ? 'Signing out…' : 'Log out'}
              </button>
            </div>
            <div className="clock-stack">
              <p className="board-date">{boardDate}</p>
              <p className="board-clock">{boardTime}</p>
            </div>
          </div>
        </header>

        <div
          className={`screen-content ${
            viewMode === 'board' ? 'screen-content--board' : 'screen-content--settings'
          }`}
        >
          {authError ? <p className="settings-note settings-note--warning terminal-auth-note">{authError}</p> : null}

          {viewMode === 'board' ? (
            <WidgetBoardHost
              registeredWidgets={registeredWidgets}
              activeFilter={activeFilter}
              activeProfileLabel={activeProfile ? getMemberLabel(activeProfile) : undefined}
              expandedWidgetId={expandedWidgetId}
              filterOptions={filterOptions}
              onFilterChange={setActiveFilter}
              onExpandedWidgetChange={setExpandedWidgetId}
              visibleArrivals={visibleArrivals}
              visibleAgenda={visibleAgenda}
              visibleTodos={visibleTodos}
              visibleNews={visibleNews}
              weatherData={weatherWidgetData}
              weatherRefreshCountdownLabel={weatherRefreshCountdownLabel}
              currentAgenda={currentAgenda}
              currentAlert={currentAlert}
              nextTodo={nextTodo}
              commuteNote={commuteNote}
              renderAudienceBadge={renderAudienceBadge}
              onToggleTodoDone={handleToggleTodoDone}
            />
          ) : (
            <section className="settings-page">
              <article className="settings-panel">
              <div className="widget-head">
                <div className="widget-flag">
                  <span
                    className="route-bullet route-bullet--large"
                    style={badgeStyle('#7dd3fc')}
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
                Widget headers use their configured badge letter and color.
              </p>

              {familyMembersError ? (
                <p className="settings-note settings-note--warning">{familyMembersError}</p>
              ) : null}

              {widgetMetadataError ? (
                <p className="settings-note settings-note--warning">{widgetMetadataError}</p>
              ) : null}

              {widgetMetadataAdminError ? (
                <p className="settings-note settings-note--warning">{widgetMetadataAdminError}</p>
              ) : null}

              {widgetSettingsError ? (
                <p className="settings-note settings-note--warning">{widgetSettingsError}</p>
              ) : null}

              {calendarEventsError ? (
                <p className="settings-note settings-note--warning">{calendarEventsError}</p>
              ) : null}

              {todoItemsError ? (
                <p className="settings-note settings-note--warning">{todoItemsError}</p>
              ) : null}

              {weatherError ? (
                <p className="settings-note settings-note--warning">{weatherError}</p>
              ) : null}

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
                </div>
              </div>

              <WidgetMetadataAdminHost
                registeredWidgets={registeredWidgets}
                familyMembers={familyMembers}
                availableSourceLocations={registeredWidgets.map(
                  (widget) => widget.module.folderName,
                )}
                widgetSettingsMap={widgetSettingsMap}
                onSaveWidgetSettings={(widgetId: string, settings: WidgetSettingsValues) =>
                  handleSaveWidgetSettings(widgetId, settings).catch(() => {
                    setWidgetSettingsError(
                      'Failed to persist widget settings to the backend.',
                    )
                    throw new Error('widget settings save failed')
                  })
                }
                onSaveWidgetMetadata={(widgetId: string, draft: WidgetMetadataDraft) =>
                  handleSaveWidgetMetadata(widgetId, draft).catch(() => {
                    setWidgetMetadataAdminError(
                      'Failed to persist widget metadata to the backend.',
                    )
                    throw new Error('widget metadata save failed')
                  })
                }
              />
              </article>
            </section>
          )}
        </div>

        {viewMode === 'board' && debugModeEnabled ? (
          <WidgetDebugOverlay
            registeredWidgets={registeredWidgets}
            activeFilter={activeFilter}
            widgetHealthMap={widgetHealthMap}
            onClose={() => setDebugModeEnabled(false)}
          />
        ) : null}
      </section>
    </main>
  )
}

export default App

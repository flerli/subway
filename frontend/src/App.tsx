import { useEffect, useRef, useState, type FormEvent } from 'react'
import './App.css'
import {
  fetchCurrentSession,
  login as loginWithPassword,
  logout as logoutCurrentSession,
  type AuthUser,
} from './api/auth'
import {
  DEFAULT_COUNTRY_CODE,
  fetchAppPreferences,
  normalizeCountryCode,
  updateAppPreferences,
  type AppPreferencesRecord,
} from './api/appPreferences'
import {
  currentFrontendBuildId,
  fetchBackendRuntimeInfo,
  fetchFrontendRuntimeInfo,
} from './api/runtime'
import {
  createFamilyMember,
  deleteFamilyMember,
  fetchFamilyMembers,
  updateFamilyMember,
} from './api/familyMembers'
import {
  BringApiError,
  completeBringItem,
  createBringItem,
  deleteBringItem,
  fetchBringList,
  type BringListRecord,
  updateBringItem,
} from './api/bring'
import { isAuthRequiredError } from './api/request'
import {
  fetchWidgetSettings,
  updateWidgetSettings,
} from './api/widgetSettings'
import { fetchWidgetEntities, updateWidgetEntity } from './api/widgets'
import { appTextCatalog, type AppTextBundle } from './i18n/appText'
import {
  DEFAULT_LANGUAGE_CODE,
  formatLocalizedText,
  getLocalizedBundle,
  normalizeLanguageCode,
  supportedLanguageOptions,
  type SupportedLanguageCode,
} from './i18n/localization'
import {
  isSupportedSoftwareKeyboardTarget,
  SoftwareKeyboardOverlay,
  type SoftwareKeyboardTarget,
} from './keyboard/softwareKeyboard'
import { buildBadgeStyle } from './widgets/widgetAppearance'
import { WidgetBoardHost } from './widgets/WidgetBoardHost'
import {
  WidgetDebugOverlay,
  type WidgetDebugPerformanceState,
} from './widgets/WidgetDebugOverlay'
import {
  defaultArrivalBoardSettings,
  getArrivalBoardWidgetTranslation,
  normalizeArrivalBoardSettings,
} from './widgets/arrival-board'
import {
  fetchCalendarEventRecords,
  mapCalendarEventRecordToAgendaItem,
} from './widgets/calendar/calendarApi'
import {
  filterCalendarAgendaItems,
} from './widgets/calendar'
import { fetchTodoItems } from './widgets/todo/todoApi'
import {
  filterTodoItemsForView,
} from './widgets/todo'
import {
  getWeatherWidgetTranslation,
  localizeWeatherCondition,
  normalizeWeatherSettings,
  type WeatherWidgetTranslation,
} from './widgets/weather'
import {
  WidgetMetadataAdminHost,
  type WidgetMetadataDraft,
} from './widgets/WidgetMetadataAdminHost'
import { WidgetSettingsHost } from './widgets/WidgetSettingsHost'
import { normalizeAudioVisualSettings } from './widgets/audio-visual/AudioVisualPanel'
import type {
  AgendaItem,
  Arrival,
  AudienceId,
  BringWidgetData,
  FamilyMember,
  FilterId,
  FilterOption,
  ForecastDay,
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
const HOUSEHOLD_BADGE_TEXT = 'ALL'
const DEFAULT_NEW_MEMBER_COLOR = '#4aa8ff'
const APP_RUNTIME_POLL_INTERVAL_MS = 30_000
const LOCAL_APP_SHELL_STORAGE_KEY_PREFIX = 'subway-app-shell'

const formatLocalIsoDate = (value: Date) => {
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, '0')
  const day = `${value.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}

const addLocalDays = (value: Date, dayCount: number) => {
  const nextDate = new Date(value)
  nextDate.setDate(nextDate.getDate() + dayCount)

  return nextDate
}

const isValidDateValue = (value: string | null) => {
  if (!value) {
    return false
  }

  return !Number.isNaN(new Date(value).getTime())
}

const resolveLatestDeploymentAt = (
  frontendBuildId: string,
  backendStartedAt: string | null,
) => {
  const candidates = [frontendBuildId, backendStartedAt].filter(
    (value): value is string => isValidDateValue(value),
  )

  if (candidates.length === 0) {
    return null
  }

  return candidates.sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0]
}

const formatRuntimeTimestamp = (
  value: string | null,
  languageCode: SupportedLanguageCode,
  fallback: string,
) => {
  if (!value) {
    return fallback
  }

  const timestamp = new Date(value)

  if (Number.isNaN(timestamp.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(languageCode, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(timestamp)
}

type ViewMode = 'board' | 'settings'
type SettingsHubPanelId = 'system' | 'family'
type AuthStatus = 'bootstrapping' | 'unauthenticated' | 'authenticated'
type AppPreferencesErrorKey = 'load-failed' | 'save-failed'
type AppTextMessageKey = keyof AppTextBundle['messages']
type MemberId = string

interface PendingInteractionMeasurement {
  label: string
  startedAt: number
}

interface FullscreenDocument extends Document {
  webkitFullscreenElement?: Element | null
  webkitExitFullscreen?: () => Promise<void> | void
}

interface FullscreenElementWithWebkit extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void
}

const resolveAppMessage = (
  messageKey: AppTextMessageKey | null,
  appText: AppTextBundle,
) => (messageKey ? appText.messages[messageKey] : null)

const resolveLoginErrorKey = (error: unknown): AppTextMessageKey => {
  if (
    error instanceof Error &&
    error.message === 'Invalid username or password.'
  ) {
    return 'authInvalidCredentials'
  }

  return 'authSignInFailed'
}

interface AppShellPersistedState {
  activeFilter: FilterId
  expandedWidgetId: string | null
}

interface CalendarFocusSelection {
  eventId: string
  eventDate: string
}

const buildArrivalBoardEvents = (
  agendaItems: AgendaItem[],
  referenceTime: Date,
  arrivalLabel: string,
  units: {
    hourAbbr: string
    minuteAbbr: string
    dayAbbr: string
  },
): Arrival[] => {
  const nowTime = referenceTime.getTime()
  const referenceYear = referenceTime.getFullYear()
  const referenceMonth = referenceTime.getMonth()
  const referenceDay = referenceTime.getDate()

  return agendaItems
    .map((agendaItem) => {
      const eventDateTime = new Date(`${agendaItem.date}T${agendaItem.time}:00`)

      return {
        agendaItem,
        eventDateTime,
      }
    })
    .filter(({ eventDateTime }) => !Number.isNaN(eventDateTime.getTime()))
    .filter(({ eventDateTime }) => eventDateTime.getTime() >= nowTime)
    .sort((left, right) => left.eventDateTime.getTime() - right.eventDateTime.getTime())
    .slice(0, 6)
    .map(({ agendaItem, eventDateTime }) => {
      const diffMs = Math.max(eventDateTime.getTime() - nowTime, 0)
      const totalHours = diffMs / (1000 * 60 * 60)
      const totalMinutes = Math.round(diffMs / (1000 * 60))
      
      let value: string
      let unit: string
      
      if (totalHours < 5) {
        // Show hours + minutes for < 5 hours
        const hours = Math.floor(totalMinutes / 60)
        const mins = totalMinutes % 60
        value = hours > 0 ? `${hours}${units.hourAbbr} ${mins}${units.minuteAbbr}` : `${Math.max(1, mins)}${units.minuteAbbr}`
        unit = ''
      } else if (totalHours < 24) {
        // Show hours only for 5-24 hours
        const hours = Math.max(1, Math.round(totalHours))
        value = `${hours}${units.hourAbbr}`
        unit = ''
      } else {
        // Show days for 24+ hours
        const days = Math.max(1, Math.ceil(totalHours / 24))
        value = `${days}${units.dayAbbr}`
        unit = ''
      }

      const isSameDay =
        eventDateTime.getFullYear() === referenceYear &&
        eventDateTime.getMonth() === referenceMonth &&
        eventDateTime.getDate() === referenceDay

      return {
        line: `arrival-${agendaItem.line}`,
        eventId: agendaItem.eventId,
        eventDate: agendaItem.date,
        destination: agendaItem.title,
        direction: arrivalLabel,
        platform: agendaItem.location,
        value,
        isSameDay,
        unit,
        members: agendaItem.members,
        cancelled: agendaItem.cancelled,
      }
    })
}

const buildFallbackForecastDays = (
  languageCode: SupportedLanguageCode,
): ForecastDay[] => {
  const baseDate = new Date()
  const fallbackConditions = [
    { condition: 'Partly cloudy', visualState: 'cloudy' as const, high: 74, low: 61 },
    { condition: 'Light rain', visualState: 'rain' as const, high: 72, low: 60 },
    { condition: 'Bright sun', visualState: 'sun' as const, high: 76, low: 63 },
    { condition: 'Windy PM', visualState: 'wind' as const, high: 70, low: 58 },
    { condition: 'Partly cloudy', visualState: 'cloudy' as const, high: 71, low: 57 },
    { condition: 'Light rain', visualState: 'rain' as const, high: 69, low: 55 },
    { condition: 'Bright sun', visualState: 'sun' as const, high: 75, low: 59 },
    { condition: 'Partly cloudy', visualState: 'cloudy' as const, high: 73, low: 56 },
  ]

  return fallbackConditions.map((forecast, index) => ({
    day: formatLocalIsoDate(addLocalDays(baseDate, index)),
    high: forecast.high,
    low: forecast.low,
    condition: localizeWeatherCondition(forecast.condition, languageCode),
    visualState: forecast.visualState,
  }))
}

const buildFallbackWeatherData = (
  weatherWidgetText: WeatherWidgetTranslation,
  languageCode: SupportedLanguageCode,
): WeatherWidgetData => {
  const fallbackWeatherLocation: WeatherLocationData = {
    id: 'location-1',
    location: 'Berlin',
    source: 'Open-Meteo',
    stale: true,
    updatedAt: new Date(0).toISOString(),
    currentTemperature: '--°',
    condition: weatherWidgetText.copy.unavailableCondition,
    visualState: 'fallback',
    rangeSummary: weatherWidgetText.copy.noLiveDataSummary,
    forecast: buildFallbackForecastDays(languageCode),
  }

  return {
    ...fallbackWeatherLocation,
    focusLocationId: fallbackWeatherLocation.id,
    locations: [fallbackWeatherLocation],
  }
}

const defaultFallbackWeatherData = buildFallbackWeatherData(
  getWeatherWidgetTranslation(DEFAULT_LANGUAGE_CODE),
  DEFAULT_LANGUAGE_CODE,
)

const defaultBringWidgetData: BringWidgetData = {
  status: 'loading',
  list: null,
  message: null,
}

const bringNotConfiguredErrorCodes = new Set([
  'bring_username_missing',
  'bring_password_missing',
  'bring_selected_list_missing',
])

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

const householdBadgeStyleBySize = (sizeClassName = 'route-bullet') => ({
  ...householdBadgeStyle,
  fontSize:
    sizeClassName === 'route-bullet--small'
      ? '0.58rem'
      : sizeClassName === 'route-bullet--large'
        ? '0.9rem'
        : '0.68rem',
  letterSpacing: '0.04em',
})

const getLocalAppShellStorageKey = (userId: string) =>
  `${LOCAL_APP_SHELL_STORAGE_KEY_PREFIX}:${userId}`

const getAudioVisualSettingsFromAppPreferences = (
  appPreferences: Pick<
    AppPreferencesRecord,
    'audioVisualCameraEnabled' | 'audioVisualMicrophoneEnabled'
  >,
): WidgetSettingsValues =>
  normalizeAudioVisualSettings({
    cameraEnabled: appPreferences.audioVisualCameraEnabled,
    microphoneEnabled: appPreferences.audioVisualMicrophoneEnabled,
  })

const buildBringWidgetData = (
  list: BringListRecord | null,
  status: BringWidgetData['status'],
  message: string | null = null,
): BringWidgetData => ({
  status,
  list,
  message,
})

const normalizeAppShellPersistedState = (
  value: unknown,
): AppShellPersistedState => {
  const candidate = value as {
    activeFilter?: unknown
    expandedWidgetId?: unknown
  }

  return {
    activeFilter:
      typeof candidate?.activeFilter === 'string' && candidate.activeFilter.trim().length > 0
        ? candidate.activeFilter
        : ALL_FILTER_ID,
    expandedWidgetId:
      typeof candidate?.expandedWidgetId === 'string' &&
      candidate.expandedWidgetId.trim().length > 0
        ? candidate.expandedWidgetId
        : null,
  }
}

const readLocalAppShellState = (userId: string): AppShellPersistedState => {
  if (typeof window === 'undefined') {
    return { activeFilter: ALL_FILTER_ID, expandedWidgetId: null }
  }

  try {
    const storedValue = window.localStorage.getItem(getLocalAppShellStorageKey(userId))

    if (!storedValue) {
      return { activeFilter: ALL_FILTER_ID, expandedWidgetId: null }
    }

    return normalizeAppShellPersistedState(JSON.parse(storedValue))
  } catch {
    return { activeFilter: ALL_FILTER_ID, expandedWidgetId: null }
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

const getFullscreenElement = () => {
  if (typeof document === 'undefined') {
    return null
  }

  const fullscreenDocument = document as FullscreenDocument

  return document.fullscreenElement ?? fullscreenDocument.webkitFullscreenElement ?? null
}

function App() {
  const [now, setNow] = useState(() => new Date())
  const [authStatus, setAuthStatus] = useState<AuthStatus>('bootstrapping')
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthUser | null>(null)
  const [authErrorKey, setAuthErrorKey] = useState<AppTextMessageKey | null>(null)
  const [authPending, setAuthPending] = useState(false)
  const [selectedLanguageCode, setSelectedLanguageCode] =
    useState<SupportedLanguageCode>(DEFAULT_LANGUAGE_CODE)
  const [selectedCountryCode, setSelectedCountryCode] = useState(DEFAULT_COUNTRY_CODE)
  const [audioVisualPreferenceSettings, setAudioVisualPreferenceSettings] =
    useState<WidgetSettingsValues>(() =>
      getAudioVisualSettingsFromAppPreferences({
        audioVisualCameraEnabled: true,
        audioVisualMicrophoneEnabled: true,
      }),
    )
  const [countryCodeDraft, setCountryCodeDraft] = useState(DEFAULT_COUNTRY_CODE)
  const [loginUsername, setLoginUsername] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('board')
  const [expandedWidgetId, setExpandedWidgetId] = useState<string | null>(null)
  const [expandedWidgetSettingsId, setExpandedWidgetSettingsId] = useState<string | null>(null)
  const [expandedSettingsHubPanelId, setExpandedSettingsHubPanelId] =
    useState<SettingsHubPanelId | null>(null)
  const [calendarFocusSelection, setCalendarFocusSelection] = useState<CalendarFocusSelection | null>(null)
  const [registeredWidgets, setRegisteredWidgets] = useState<RegisteredWidget[]>([])
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [calendarEvents, setCalendarEvents] = useState<AgendaItem[]>([])
  const [todoWidgetItems, setTodoWidgetItems] = useState<TodoItem[]>([])
  const [bringWidgetData, setBringWidgetData] =
    useState<BringWidgetData>(defaultBringWidgetData)
  const [weatherWidgetData, setWeatherWidgetData] =
    useState<WeatherWidgetData>(defaultFallbackWeatherData)
  const [weatherRefreshToken, setWeatherRefreshToken] = useState(0)
  const [nextWeatherRefreshAt, setNextWeatherRefreshAt] = useState<number | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterId>(ALL_FILTER_ID)
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberColor, setNewMemberColor] = useState(DEFAULT_NEW_MEMBER_COLOR)
  const [deletingFamilyMemberId, setDeletingFamilyMemberId] = useState<string | null>(null)
  const [backendRuntimeStartedAt, setBackendRuntimeStartedAt] = useState<string | null>(null)
  const [familyMembersErrorKey, setFamilyMembersErrorKey] =
    useState<AppTextMessageKey | null>(null)
  const [widgetMetadataErrorKey, setWidgetMetadataErrorKey] =
    useState<AppTextMessageKey | null>(null)
  const [widgetMetadataAdminErrorKey, setWidgetMetadataAdminErrorKey] =
    useState<AppTextMessageKey | null>(null)
  const [widgetSettingsErrorKey, setWidgetSettingsErrorKey] =
    useState<AppTextMessageKey | null>(null)
  const [appPreferencesPending, setAppPreferencesPending] = useState(false)
  const [appPreferencesErrorKey, setAppPreferencesErrorKey] =
    useState<AppPreferencesErrorKey | null>(null)
  const [calendarEventsErrorKey, setCalendarEventsErrorKey] =
    useState<AppTextMessageKey | null>(null)
  const [todoItemsErrorKey, setTodoItemsErrorKey] =
    useState<AppTextMessageKey | null>(null)
  const [weatherErrorKey, setWeatherErrorKey] = useState<AppTextMessageKey | null>(null)
  const [debugModeEnabled, setDebugModeEnabled] = useState(false)
  const [calendarRefreshToken, setCalendarRefreshToken] = useState(0)
  const [todoRefreshToken, setTodoRefreshToken] = useState(0)
  const [widgetSettingsMap, setWidgetSettingsMap] = useState<
    Record<string, WidgetSettingsValues>
  >({})
  const [widgetHealthMap, setWidgetHealthMap] = useState<Record<string, WidgetHealthState>>({})
  const [, setDebugTapTimestamps] = useState<number[]>([])
  const [appPreferencesLoaded, setAppPreferencesLoaded] = useState(false)
  const [familyMembersLoaded, setFamilyMembersLoaded] = useState(false)
  const [widgetMetadataLoaded, setWidgetMetadataLoaded] = useState(false)
  const [, setWidgetSettingsLoaded] = useState(false)
  const [, setWidgetSettingsAvailable] = useState(false)
  const [appShellStateHydrated, setAppShellStateHydrated] = useState(false)
  const [performanceState, setPerformanceState] =
    useState<WidgetDebugPerformanceState>({
      interactionLabel: null,
      interactionDurationMs: null,
      interactionMeasuredAt: null,
      longTaskCount: 0,
      longestLongTaskMs: null,
      lastLongTaskAt: null,
    })
  const [softwareKeyboardTarget, setSoftwareKeyboardTarget] =
    useState<SoftwareKeyboardTarget | null>(null)
  const [isFullscreenActive, setIsFullscreenActive] = useState(() =>
    Boolean(getFullscreenElement()),
  )
  const backendRuntimeInstanceIdRef = useRef<string | null>(null)
  const pendingInteractionRef = useRef<PendingInteractionMeasurement | null>(null)
  const appText = getLocalizedBundle(appTextCatalog, selectedLanguageCode)
  const arrivalBoardWidgetText = getArrivalBoardWidgetTranslation(selectedLanguageCode)
  const weatherWidgetText = getWeatherWidgetTranslation(selectedLanguageCode)
  const fallbackWeatherData = buildFallbackWeatherData(
    weatherWidgetText,
    selectedLanguageCode,
  )
  const normalizedCountryCodeDraft = countryCodeDraft.trim().toUpperCase()
  const isCountryCodeDraftValid = /^[A-Z]{2}$/.test(normalizedCountryCodeDraft)
  const settingsBuildIdLabel = currentFrontendBuildId.replace(/\.\d{3}Z$/, 'Z')
  const latestDeploymentLabel = formatRuntimeTimestamp(
    resolveLatestDeploymentAt(currentFrontendBuildId, backendRuntimeStartedAt),
    selectedLanguageCode,
    appText.settings.runtimeUnavailableValue,
  )
  const appPreferencesError =
    appPreferencesErrorKey === 'load-failed'
      ? appText.settings.languageLoadFailed
      : appPreferencesErrorKey === 'save-failed'
        ? appText.settings.languageSaveFailed
        : null
  const authError = resolveAppMessage(authErrorKey, appText)
  const familyMembersError = resolveAppMessage(familyMembersErrorKey, appText)
  const widgetMetadataError = resolveAppMessage(widgetMetadataErrorKey, appText)
  const widgetMetadataAdminError = resolveAppMessage(widgetMetadataAdminErrorKey, appText)
  const widgetSettingsError = resolveAppMessage(widgetSettingsErrorKey, appText)
  const calendarEventsError = resolveAppMessage(calendarEventsErrorKey, appText)
  const todoItemsError = resolveAppMessage(todoItemsErrorKey, appText)
  const weatherError = resolveAppMessage(weatherErrorKey, appText)
  const calendarRangeStart = formatLocalIsoDate(now)
  const calendarRangeEnd = formatLocalIsoDate(addLocalDays(now, 30))
  const combinedWidgetSettingsMap: Record<string, WidgetSettingsValues> = {
    ...widgetSettingsMap,
    'audio-visual': audioVisualPreferenceSettings,
  }

  const resetProtectedState = () => {
    setViewMode('board')
    setExpandedWidgetId(null)
    setSelectedLanguageCode(DEFAULT_LANGUAGE_CODE)
    setSelectedCountryCode(DEFAULT_COUNTRY_CODE)
    setAudioVisualPreferenceSettings(
      getAudioVisualSettingsFromAppPreferences({
        audioVisualCameraEnabled: true,
        audioVisualMicrophoneEnabled: true,
      }),
    )
    setCountryCodeDraft(DEFAULT_COUNTRY_CODE)
    setRegisteredWidgets([])
    setFamilyMembers([])
    setCalendarEvents([])
    setTodoWidgetItems([])
    setBringWidgetData(defaultBringWidgetData)
    setWeatherWidgetData(defaultFallbackWeatherData)
    setWeatherRefreshToken(0)
    setNextWeatherRefreshAt(null)
    setActiveFilter(ALL_FILTER_ID)
    setNewMemberName('')
    setNewMemberColor(DEFAULT_NEW_MEMBER_COLOR)
    setFamilyMembersErrorKey(null)
    setWidgetMetadataErrorKey(null)
    setWidgetMetadataAdminErrorKey(null)
    setWidgetSettingsErrorKey(null)
    setAppPreferencesPending(false)
    setAppPreferencesErrorKey(null)
    setCalendarEventsErrorKey(null)
    setTodoItemsErrorKey(null)
    setWeatherErrorKey(null)
    setDebugModeEnabled(false)
    setCalendarRefreshToken(0)
    setTodoRefreshToken(0)
    setWidgetSettingsMap({})
    setWidgetHealthMap({})
    setDebugTapTimestamps([])
    setAppPreferencesLoaded(false)
    setFamilyMembersLoaded(false)
    setWidgetMetadataLoaded(false)
    setWidgetSettingsLoaded(false)
    setWidgetSettingsAvailable(false)
    setAppShellStateHydrated(false)
    setSoftwareKeyboardTarget(null)
    setPerformanceState({
      interactionLabel: null,
      interactionDurationMs: null,
      interactionMeasuredAt: null,
      longTaskCount: 0,
      longestLongTaskMs: null,
      lastLongTaskAt: null,
    })
    pendingInteractionRef.current = null
  }

  const enterUnauthenticatedState = (
    messageKey: AppTextMessageKey | null = null,
  ) => {
    resetProtectedState()
    setAuthenticatedUser(null)
    setLoginUsername('')
    setLoginPassword('')
    setAuthStatus('unauthenticated')
    setAuthPending(false)
    setAuthErrorKey(messageKey)
  }

  const enterAuthenticatedState = (
    user: AuthUser,
    languageCode: SupportedLanguageCode,
    countryCode: string,
    nextAppPreferencesErrorKey: AppPreferencesErrorKey | null = null,
  ) => {
    resetProtectedState()
    setSelectedLanguageCode(languageCode)
    setSelectedCountryCode(countryCode)
    setCountryCodeDraft(countryCode)
    setAppPreferencesLoaded(true)
    setAppPreferencesErrorKey(nextAppPreferencesErrorKey)
    setAuthenticatedUser(user)
    setLoginUsername('')
    setLoginPassword('')
    setAuthStatus('authenticated')
    setAuthPending(false)
    setAuthErrorKey(null)
  }

  const handleAuthRequired = () => {
    setLoginPassword('')
    enterUnauthenticatedState('authSessionExpired')
  }

  useEffect(() => {
    const handleFocusIn = (event: FocusEvent) => {
      if (isSupportedSoftwareKeyboardTarget(event.target)) {
        setSoftwareKeyboardTarget(event.target)
      }
    }

    const handleFocusOut = () => {
      window.setTimeout(() => {
        if (isSupportedSoftwareKeyboardTarget(document.activeElement)) {
          setSoftwareKeyboardTarget(document.activeElement)
          return
        }

        setSoftwareKeyboardTarget(null)
      }, 0)
    }

    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)

    return () => {
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)
    }
  }, [])

  const handleSoftwareKeyboardClose = () => {
    if (softwareKeyboardTarget && document.contains(softwareKeyboardTarget)) {
      softwareKeyboardTarget.blur()
    }

    setSoftwareKeyboardTarget(null)
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
    if (typeof PerformanceObserver === 'undefined') {
      return
    }

    let observer: PerformanceObserver | null = null

    try {
      observer = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          const durationMs = Number(entry.duration.toFixed(1))

          setPerformanceState((currentValue) => ({
            ...currentValue,
            longTaskCount: currentValue.longTaskCount + 1,
            longestLongTaskMs:
              currentValue.longestLongTaskMs === null
                ? durationMs
                : Math.max(currentValue.longestLongTaskMs, durationMs),
            lastLongTaskAt: new Date().toISOString(),
          }))
        }
      })
      observer.observe({ entryTypes: ['longtask'] })
    } catch {
      observer = null
    }

    return () => {
      observer?.disconnect()
    }
  }, [])

  useEffect(() => {
    const pendingInteraction = pendingInteractionRef.current

    if (!pendingInteraction) {
      return
    }

    const frameId = window.requestAnimationFrame(() => {
      setPerformanceState((currentValue) => ({
        ...currentValue,
        interactionLabel: pendingInteraction.label,
        interactionDurationMs: Number(
          (performance.now() - pendingInteraction.startedAt).toFixed(1),
        ),
        interactionMeasuredAt: new Date().toISOString(),
      }))

      if (pendingInteractionRef.current === pendingInteraction) {
        pendingInteractionRef.current = null
      }
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [activeFilter, expandedWidgetId, todoWidgetItems, viewMode])

  const beginInteractionMeasurement = (label: string) => {
    pendingInteractionRef.current = {
      label,
      startedAt: performance.now(),
    }
  }

  const handleFilterChange = (filterId: FilterId) => {
    beginInteractionMeasurement(`filter:${filterId}`)
    setActiveFilter(filterId)
  }

  const handleViewModeChange = (nextViewMode: ViewMode) => {
    beginInteractionMeasurement(`view:${nextViewMode}`)
    setViewMode(nextViewMode)
  }

  const handleExpandedWidgetChange = (widgetId: string | null) => {
    beginInteractionMeasurement(widgetId ? `expand:${widgetId}` : 'expand:close')
    setExpandedWidgetId(widgetId)

    if (widgetId !== 'calendar') {
      setCalendarFocusSelection(null)
    }
  }

  const handleOpenCalendarEvent = (selection: CalendarFocusSelection) => {
    beginInteractionMeasurement(`calendar:event:${selection.eventId}`)
    setExpandedWidgetId('calendar')
    setCalendarFocusSelection(selection)
  }

  useEffect(() => {
    let cancelled = false

    const bootstrapSession = async () => {
      try {
        const sessionState = await fetchCurrentSession()

        if (cancelled) {
          return
        }

        if (!sessionState.authenticated || !sessionState.user) {
          enterUnauthenticatedState()
          return
        }

        try {
          const appPreferences = await fetchAppPreferences()

          if (!cancelled) {
            setAudioVisualPreferenceSettings(
              getAudioVisualSettingsFromAppPreferences(appPreferences),
            )
            enterAuthenticatedState(
              sessionState.user,
              appPreferences.languageCode,
              appPreferences.countryCode,
            )
          }
        } catch (error) {
          if (cancelled) {
            return
          }

          if (isAuthRequiredError(error)) {
            enterUnauthenticatedState()
            return
          }

          enterAuthenticatedState(
            sessionState.user,
            DEFAULT_LANGUAGE_CODE,
            DEFAULT_COUNTRY_CODE,
            'load-failed',
          )
        }
      } catch {
        if (!cancelled) {
          enterUnauthenticatedState('authVerifySessionFailed')
        }
      }
    }

    void bootstrapSession()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') {
      return () => undefined
    }

    const handleFullscreenChange = () => {
      setIsFullscreenActive(Boolean(getFullscreenElement()))
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange as EventListener)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener(
        'webkitfullscreenchange',
        handleFullscreenChange as EventListener,
      )
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
    setExpandedWidgetId(localAppShellState.expandedWidgetId)
    setAppShellStateHydrated(true)
  }, [authStatus, authenticatedUser, appShellStateHydrated])

  useEffect(() => {
    if (authStatus !== 'authenticated' || !authenticatedUser || !appShellStateHydrated) {
      return
    }

    persistLocalAppShellState(authenticatedUser.id, {
      activeFilter,
      expandedWidgetId,
    })
  }, [
    activeFilter,
    expandedWidgetId,
    appShellStateHydrated,
    authStatus,
    authenticatedUser,
  ])

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
        setBackendRuntimeStartedAt(backendRuntimeInfo.startedAt)
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

  const applyBringListRecord = (bringList: BringListRecord) => {
    setBringWidgetData(buildBringWidgetData(bringList, 'ready'))
    setWidgetHealthMap((currentValues) => ({
      ...currentValues,
      bring: {
        widgetId: 'bring',
        refreshStatus: bringList.freshness === 'stale' ? 'cached' : 'ok',
        lastRefreshAt: bringList.refreshedAt ?? new Date().toISOString(),
        itemCount: bringList.openItemCount,
        failureState: bringList.freshness === 'stale' ? 'stale-cache' : undefined,
      },
    }))
  }

  const applyBringLoadFailure = (error: unknown) => {
    if (
      error instanceof BringApiError &&
      error.errorCode &&
      bringNotConfiguredErrorCodes.has(error.errorCode)
    ) {
      setBringWidgetData(buildBringWidgetData(null, 'not-configured', error.message))
      setWidgetHealthMap((currentValues) => ({
        ...currentValues,
        bring: {
          widgetId: 'bring',
          refreshStatus: 'static',
          failureState: error.errorCode ?? 'bring-not-configured',
        },
      }))
      return
    }

    const message = error instanceof Error ? error.message : 'Failed to load Bring list.'
    setBringWidgetData(buildBringWidgetData(null, 'error', message))
    setWidgetHealthMap((currentValues) => ({
      ...currentValues,
      bring: {
        widgetId: 'bring',
        refreshStatus: 'error',
        failureState:
          error instanceof BringApiError
            ? error.errorCode ?? 'bring-load-failed'
            : 'bring-load-failed',
      },
    }))
  }

  const refreshBringWidgetData = async () => {
    const bringList = await fetchBringList()
    applyBringListRecord(bringList)
    return bringList
  }

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
          setWidgetSettingsErrorKey(null)
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
          setWidgetSettingsErrorKey('widgetSettingsUnavailable')
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
          setFamilyMembersErrorKey(null)
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
          setFamilyMembersErrorKey('familyMembersSyncUnavailable')
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
          setWidgetMetadataErrorKey(null)
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
          setWidgetMetadataErrorKey('widgetMetadataUnavailable')
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
        languageCode: selectedLanguageCode,
        settings: weatherSettings,
      }),
    )
      .then((result) => {
        if (!cancelled && result) {
          setWeatherWidgetData(result as WeatherWidgetData)
          setNextWeatherRefreshAt(
            Date.now() + weatherSettings.refreshIntervalMinutes * 60 * 1000,
          )
          setWeatherErrorKey(null)
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
          setWeatherErrorKey('weatherLoadFailed')
          setWidgetHealthMap((currentValues) => ({
            ...currentValues,
            weather: {
              widgetId: 'weather',
              refreshStatus: 'error',
              failureState: 'weatherLoadFailed',
            },
          }))
        }
      })

    return () => {
      cancelled = true
    }
  }, [authStatus, registeredWidgets, selectedLanguageCode, widgetSettingsMap, weatherRefreshToken])

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

    fetchCalendarEventRecords({
      rangeStart: calendarRangeStart,
      rangeEnd: calendarRangeEnd,
    })
      .then((calendarRecords) => {
        const agendaItems = calendarRecords.map((calendarRecord) =>
          mapCalendarEventRecordToAgendaItem(calendarRecord, {
            homeCountryCode: selectedCountryCode,
          }),
        )

        if (!cancelled) {
          setCalendarEvents(agendaItems)
          setCalendarEventsErrorKey(null)
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
          setCalendarEventsErrorKey('calendarLoadFailed')
          setWidgetHealthMap((currentValues) => ({
            ...currentValues,
            calendar: {
              widgetId: 'calendar',
              refreshStatus: 'error',
              failureState: 'calendarLoadFailed',
            },
          }))
        }
      })

    return () => {
      cancelled = true
    }
  }, [authStatus, calendarRangeEnd, calendarRangeStart, calendarRefreshToken, selectedCountryCode])

  const handleCalendarDataChanged = () => {
    setCalendarRefreshToken((currentValue) => currentValue + 1)
  }

  useEffect(() => {
    if (authStatus !== 'authenticated') {
      return
    }

    let cancelled = false

    fetchTodoItems()
      .then((todoItems) => {
        if (!cancelled) {
          setTodoWidgetItems(todoItems)
          setTodoItemsErrorKey(null)
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
          setTodoItemsErrorKey('todoLoadFailed')
          setWidgetHealthMap((currentValues) => ({
            ...currentValues,
            todo: {
              widgetId: 'todo',
              refreshStatus: 'error',
              failureState: 'todoLoadFailed',
            },
          }))
        }
      })

    return () => {
      cancelled = true
    }
  }, [authStatus, todoRefreshToken])

  useEffect(() => {
    if (authStatus !== 'authenticated') {
      return
    }

    if (!registeredWidgets.some((widget) => widget.entity.id === 'bring')) {
      return
    }

    let cancelled = false

    setBringWidgetData((currentValue) =>
      currentValue.status === 'ready' ? currentValue : defaultBringWidgetData,
    )

    fetchBringList()
      .then((bringList) => {
        if (!cancelled) {
          applyBringListRecord(bringList)
        }
      })
      .catch((error) => {
        if (!cancelled) {
          if (isAuthRequiredError(error)) {
            handleAuthRequired()
            return
          }

          applyBringLoadFailure(error)
        }
      })

    return () => {
      cancelled = true
    }
  }, [authStatus, registeredWidgets, viewMode])

  const handleBringRefresh = async () => {
    try {
      return await refreshBringWidgetData()
    } catch (error) {
      if (isAuthRequiredError(error)) {
        handleAuthRequired()
        throw error
      }

      applyBringLoadFailure(error)
      throw error
    }
  }

  const handleBringCreateItem = async (input: { itemName: string; specification: string }) => {
    try {
      const bringList = await createBringItem(input)
      applyBringListRecord(bringList)
      return bringList
    } catch (error) {
      if (isAuthRequiredError(error)) {
        handleAuthRequired()
      }

      throw error
    }
  }

  const handleBringUpdateItem = async (input: {
    itemName: string
    specification: string
    itemUuid?: string
  }) => {
    try {
      const bringList = await updateBringItem(input)
      applyBringListRecord(bringList)
      return bringList
    } catch (error) {
      if (isAuthRequiredError(error)) {
        handleAuthRequired()
      }

      throw error
    }
  }

  const handleBringDeleteItem = async (input: { itemName: string; itemUuid?: string }) => {
    try {
      const bringList = await deleteBringItem(input)
      applyBringListRecord(bringList)
      return bringList
    } catch (error) {
      if (isAuthRequiredError(error)) {
        handleAuthRequired()
      }

      throw error
    }
  }

  const handleBringCompleteItem = async (input: {
    itemName: string
    specification: string
    itemUuid?: string
  }) => {
    try {
      const bringList = await completeBringItem(input)
      applyBringListRecord(bringList)
      return bringList
    } catch (error) {
      if (isAuthRequiredError(error)) {
        handleAuthRequired()
      }

      throw error
    }
  }

  const membersById = new Map(familyMembers.map((member) => [member.id, member]))
  const filterOptions: FilterOption[] = [
    {
      id: ALL_FILTER_ID,
      label: appText.filters.allLabel,
      caption: appText.filters.householdViewCaption,
      badgeText: HOUSEHOLD_BADGE_TEXT,
      style: householdBadgeStyleBySize(),
    },
    ...familyMembers.map((member) => ({
      id: member.id,
      label: getMemberLabel(member),
      caption: appText.filters.memberFocusCaption,
      badgeText: getInitial(member.firstName),
      style: badgeStyle(member.color),
    })),
  ]
  const activeProfile = familyMembers.find((member) => member.id === activeFilter)
  const visibleAgenda = filterCalendarAgendaItems(
    calendarEvents,
    activeFilter === ALL_FILTER_ID ? null : activeFilter,
    widgetSettingsMap.calendar,
  )
  const visibleArrivals = buildArrivalBoardEvents(
    visibleAgenda,
    now,
    arrivalBoardWidgetText.copy.arrivalLabel,
    {
      hourAbbr: arrivalBoardWidgetText.copy.hourAbbr,
      minuteAbbr: arrivalBoardWidgetText.copy.minuteAbbr,
      dayAbbr: arrivalBoardWidgetText.copy.dayAbbr,
    },
  )
  const visibleTodos = filterTodoItemsForView(
    todoWidgetItems,
    activeFilter === ALL_FILTER_ID ? null : activeFilter,
    widgetSettingsMap.todo,
  )
  const boardTime = new Intl.DateTimeFormat(selectedLanguageCode, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now)
  const boardDate = new Intl.DateTimeFormat(selectedLanguageCode, {
    weekday: 'short',
    month: 'short',
    day: '2-digit',
  })
    .format(now)
    .replace(',', '')
    .toUpperCase()
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
            setFamilyMembersErrorKey(null)
          })
          .catch((error) => {
            if (isAuthRequiredError(error)) {
              handleAuthRequired()
              return
            }

            setFamilyMembersErrorKey('familyMemberPersistFailed')
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
        setFamilyMembersErrorKey(null)
      })
      .catch((error) => {
        if (isAuthRequiredError(error)) {
          handleAuthRequired()
          return
        }

        setFamilyMembersErrorKey('familyMemberCreateFailed')
      })
  }

  const handleDeleteMember = async (member: FamilyMember) => {
    const confirmed = window.confirm(
      formatLocalizedText(appText.settings.deleteMemberConfirm, {
        firstName: getMemberLabel(member),
      }),
    )

    if (!confirmed) {
      return
    }

    setDeletingFamilyMemberId(member.id)

    try {
      await deleteFamilyMember(member.id)
      setFamilyMembers((currentMembers) =>
        currentMembers.filter((currentMember) => currentMember.id !== member.id),
      )

      if (activeFilter === member.id) {
        setActiveFilter(ALL_FILTER_ID)
      }

      setFamilyMembersErrorKey(null)
    } catch (error) {
      if (isAuthRequiredError(error)) {
        handleAuthRequired()
        return
      }

      setFamilyMembersErrorKey('familyMemberDeleteFailed')
    } finally {
      setDeletingFamilyMemberId((currentId) =>
        currentId === member.id ? null : currentId,
      )
    }
  }

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const username = loginUsername.trim()
    const password = loginPassword

    if (!username || !password) {
      setAuthErrorKey('authCredentialsRequired')
      return
    }

    setAuthPending(true)
    setAuthErrorKey(null)

    loginWithPassword(username, password)
      .then(async (user) => {
        setLoginPassword('')

        try {
          const appPreferences = await fetchAppPreferences()

          setAudioVisualPreferenceSettings(
            getAudioVisualSettingsFromAppPreferences(appPreferences),
          )

          enterAuthenticatedState(
            user,
            appPreferences.languageCode,
            appPreferences.countryCode,
          )
        } catch (error) {
          if (isAuthRequiredError(error)) {
            handleAuthRequired()
            return
          }

          enterAuthenticatedState(
            user,
            DEFAULT_LANGUAGE_CODE,
            DEFAULT_COUNTRY_CODE,
            'load-failed',
          )
        }
      })
      .catch((error) => {
        if (isAuthRequiredError(error)) {
          handleAuthRequired()
          return
        }

        setAuthErrorKey(resolveLoginErrorKey(error))
      })
      .finally(() => {
        setAuthPending(false)
      })
  }

  const handleLanguagePreferenceChange = async (
    nextLanguageCode: SupportedLanguageCode,
  ) => {
    if (nextLanguageCode === selectedLanguageCode) {
      return
    }

    const previousLanguageCode = selectedLanguageCode

    setSelectedLanguageCode(nextLanguageCode)
    setAppPreferencesPending(true)
    setAppPreferencesErrorKey(null)

    try {
      const persistedPreferences = await updateAppPreferences({
        languageCode: nextLanguageCode,
      })

      setSelectedLanguageCode(persistedPreferences.languageCode)
      setSelectedCountryCode(persistedPreferences.countryCode)
      setAudioVisualPreferenceSettings(
        getAudioVisualSettingsFromAppPreferences(persistedPreferences),
      )
      setCountryCodeDraft(persistedPreferences.countryCode)
    } catch (error) {
      if (isAuthRequiredError(error)) {
        handleAuthRequired()
        return
      }

      setSelectedLanguageCode(previousLanguageCode)
      setAppPreferencesErrorKey('save-failed')
    } finally {
      setAppPreferencesPending(false)
    }
  }

  const handleCountryPreferenceSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (
      !isCountryCodeDraftValid ||
      normalizedCountryCodeDraft === selectedCountryCode
    ) {
      return
    }

    const previousCountryCode = selectedCountryCode
    const nextCountryCode = normalizeCountryCode(normalizedCountryCodeDraft)

    setSelectedCountryCode(nextCountryCode)
    setCountryCodeDraft(nextCountryCode)
    setAppPreferencesPending(true)
    setAppPreferencesErrorKey(null)

    try {
      const persistedPreferences = await updateAppPreferences({
        countryCode: nextCountryCode,
      })

      setSelectedLanguageCode(persistedPreferences.languageCode)
      setSelectedCountryCode(persistedPreferences.countryCode)
      setAudioVisualPreferenceSettings(
        getAudioVisualSettingsFromAppPreferences(persistedPreferences),
      )
      setCountryCodeDraft(persistedPreferences.countryCode)
    } catch (error) {
      if (isAuthRequiredError(error)) {
        handleAuthRequired()
        return
      }

      setSelectedCountryCode(previousCountryCode)
      setCountryCodeDraft(previousCountryCode)
      setAppPreferencesErrorKey('save-failed')
    } finally {
      setAppPreferencesPending(false)
    }
  }

  const handleLogout = () => {
    setAuthPending(true)
    setAuthErrorKey(null)

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

        setAuthErrorKey('authSignOutFailed')
      })
      .finally(() => {
        setAuthPending(false)
      })
  }

  const handleToggleFullscreen = async () => {
    if (typeof document === 'undefined') {
      return
    }

    try {
      const fullscreenDocument = document as FullscreenDocument
      const fullscreenElement = getFullscreenElement()

      if (fullscreenElement) {
        if (typeof document.exitFullscreen === 'function') {
          await document.exitFullscreen()
          return
        }

        if (typeof fullscreenDocument.webkitExitFullscreen === 'function') {
          await fullscreenDocument.webkitExitFullscreen()
        }
      } else {
        const rootElement = document.documentElement as FullscreenElementWithWebkit

        if (typeof rootElement.requestFullscreen === 'function') {
          await rootElement.requestFullscreen()
          return
        }

        if (typeof rootElement.webkitRequestFullscreen === 'function') {
          await rootElement.webkitRequestFullscreen()
        }
      }
    } catch {
      // Ignore fullscreen errors so the settings panel remains usable.
    }
  }

  const toggleExpandedSettingsHubPanel = (panelId: SettingsHubPanelId) => {
    setExpandedSettingsHubPanelId((currentPanelId) =>
      currentPanelId === panelId ? null : panelId,
    )
  }

  const renderSystemSettingsPanel = () => {
    const selectedLanguageLabel =
      supportedLanguageOptions.find((language) => language.code === selectedLanguageCode)
        ?.label ?? selectedLanguageCode.toUpperCase()

    return (
      <article className="settings-card settings-card--expanded-panel">
        <div className="widget-head">
          <div className="widget-flag">
            <span className="route-bullet route-bullet--large" style={badgeStyle('#7dd3fc')}>
              S
            </span>
            <div>
              <p className="widget-kicker">{appText.settings.systemKicker}</p>
              <h3>{appText.settings.systemHubTitle}</h3>
            </div>
          </div>

          <div className="widget-head-side">
            <p className="widget-meta">{`${selectedLanguageLabel} · ${selectedCountryCode}`}</p>
            <button
              type="button"
              className="widget-action-button is-active"
              aria-label={appText.settings.closeExpandedPanelAriaLabel}
              onClick={() => setExpandedSettingsHubPanelId(null)}
            >
              <span>{appText.boardHost.collapseAction}</span>
            </button>
          </div>
        </div>

        <p className="settings-copy">{appText.settings.systemHubCopy}</p>

        <div className="settings-extended-grid settings-extended-grid--system">
          <article className="settings-card">
            <div className="settings-card-head">
              <p className="widget-kicker">{appText.settings.systemKicker}</p>
              <h3>{appText.settings.systemTitle}</h3>
            </div>

            <p className="settings-copy">{appText.settings.systemDescription}</p>

            <div className="settings-runtime-list">
              <div className="settings-runtime-row">
                <span>{appText.settings.buildVersionLabel}</span>
                <strong className="settings-runtime-value settings-runtime-value--mono">
                  {settingsBuildIdLabel}
                </strong>
              </div>

              <div className="settings-runtime-row">
                <span>{appText.settings.latestDeploymentLabel}</span>
                <strong className="settings-runtime-value">{latestDeploymentLabel}</strong>
              </div>
            </div>
          </article>

          <article className="settings-card">
            <div className="settings-card-head">
              <p className="widget-kicker">{appText.settings.languageKicker}</p>
              <h3>{appText.settings.languageTitle}</h3>
            </div>

            <p className="settings-copy">{appText.settings.languageDescription}</p>

            <label className="settings-label">
              <span>{appText.settings.languageLabel}</span>
              <select
                className="settings-input settings-select"
                value={selectedLanguageCode}
                onChange={(event) => {
                  void handleLanguagePreferenceChange(
                    normalizeLanguageCode(event.target.value),
                  )
                }}
                disabled={appPreferencesPending}
              >
                {supportedLanguageOptions.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.label}
                  </option>
                ))}
              </select>
            </label>

            <p className="settings-note">
              {appPreferencesPending
                ? appText.settings.languageSavingNote
                : appText.settings.languagePersistenceNote}
            </p>
          </article>

          <form className="settings-card settings-form" onSubmit={handleCountryPreferenceSubmit}>
            <div className="settings-card-head">
              <p className="widget-kicker">{appText.settings.countryKicker}</p>
              <h3>{appText.settings.countryTitle}</h3>
            </div>

            <p className="settings-copy">{appText.settings.countryDescription}</p>

            <label className="settings-label">
              <span>{appText.settings.countryLabel}</span>
              <input
                className="settings-input"
                type="text"
                inputMode="text"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                maxLength={2}
                value={countryCodeDraft}
                onChange={(event) =>
                  setCountryCodeDraft(
                    event.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2),
                  )
                }
                placeholder={appText.settings.countryPlaceholder}
                disabled={appPreferencesPending}
              />
            </label>

            <p className="settings-note">{appText.settings.countryFormatNote}</p>

            <button
              className="settings-submit"
              type="submit"
              disabled={
                appPreferencesPending ||
                !isCountryCodeDraftValid ||
                normalizedCountryCodeDraft === selectedCountryCode
              }
            >
              {appPreferencesPending
                ? appText.settings.countrySavingNote
                : appText.settings.countrySaveAction}
            </button>

            <p className="settings-note">{appText.settings.countryPersistenceNote}</p>
          </form>

          <article className="settings-card">
            <div className="settings-card-head">
              <p className="widget-kicker">{appText.settings.displayKicker}</p>
              <h3>{appText.settings.displayTitle}</h3>
            </div>

            <p className="settings-copy">{appText.settings.displayDescription}</p>

            <button
              className="settings-submit"
              type="button"
              onClick={() => {
                void handleToggleFullscreen()
              }}
            >
              {isFullscreenActive
                ? appText.settings.fullscreenExitAction
                : appText.settings.fullscreenEnterAction}
            </button>

            <p className="settings-note">
              {isFullscreenActive
                ? appText.settings.fullscreenActiveState
                : appText.settings.fullscreenInactiveState}
            </p>
          </article>
        </div>
      </article>
    )
  }

  const renderFamilySettingsPanel = () => (
    <article className="settings-card settings-card--expanded-panel">
      <div className="widget-head">
        <div className="widget-flag">
          <span className="route-bullet route-bullet--large" style={badgeStyle('#4aa8ff')}>
            F
          </span>
          <div>
            <p className="widget-kicker">{appText.settings.panelKicker}</p>
            <h3>{appText.settings.familyMembersTitle}</h3>
          </div>
        </div>

        <div className="widget-head-side">
          <p className="widget-meta">
            {formatLocalizedText(appText.settings.familyMembersMeta, {
              count: familyMembers.length,
            })}
          </p>
          <button
            type="button"
            className="widget-action-button is-active"
            aria-label={appText.settings.closeExpandedPanelAriaLabel}
            onClick={() => setExpandedSettingsHubPanelId(null)}
          >
            <span>{appText.boardHost.collapseAction}</span>
          </button>
        </div>
      </div>

      <p className="settings-copy">{appText.settings.familyMembersCopy}</p>

      <div className="settings-grid">
        <div className="member-list">
          {familyMembers.map((member) => {
            const isDeletingMember = deletingFamilyMemberId === member.id

            return (
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
                  </div>
                </div>

                <div className="member-form-fields">
                  <label className="settings-label">
                    <span>{appText.settings.firstNameLabel}</span>
                    <input
                      className="settings-input"
                      type="text"
                      value={member.firstName}
                      disabled={isDeletingMember}
                      onChange={(event) =>
                        updateMember(member.id, 'firstName', event.target.value)
                      }
                      placeholder={appText.settings.firstNamePlaceholder}
                    />
                  </label>

                  <label className="settings-label settings-label--color">
                    <span>{appText.settings.colorLabel}</span>
                    <input
                      className="settings-color"
                      type="color"
                      value={normalizeHexColor(member.color)}
                      disabled={isDeletingMember}
                      onChange={(event) =>
                        updateMember(member.id, 'color', event.target.value)
                      }
                    />
                  </label>
                </div>

                <div className="member-editor-actions">
                  <button
                    className="settings-submit settings-submit--secondary settings-submit--danger"
                    type="button"
                    disabled={isDeletingMember}
                    onClick={() => void handleDeleteMember(member)}
                  >
                    {isDeletingMember
                      ? appText.settings.deletingMemberAction
                      : appText.settings.deleteMemberAction}
                  </button>
                </div>
              </article>
            )
          })}
        </div>

        <div className="settings-side">
          <form className="settings-card settings-form" onSubmit={handleAddMember}>
            <div className="settings-card-head">
              <p className="widget-kicker">{appText.settings.addMemberKicker}</p>
              <h3>{appText.settings.addMemberTitle}</h3>
            </div>

            <label className="settings-label">
              <span>{appText.settings.firstNameLabel}</span>
              <input
                className="settings-input"
                type="text"
                value={newMemberName}
                onChange={(event) => setNewMemberName(event.target.value)}
                placeholder={appText.settings.firstNamePlaceholder}
              />
            </label>

            <label className="settings-label settings-label--color">
              <span>{appText.settings.colorLabel}</span>
              <input
                className="settings-color"
                type="color"
                value={newMemberColor}
                onChange={(event) => setNewMemberColor(event.target.value)}
              />
            </label>

            <button className="settings-submit" type="submit">
              {appText.settings.addMemberAction}
            </button>
          </form>
        </div>
      </div>
    </article>
  )

  const renderExpandedSettingsHubPanel = () => {
    if (expandedSettingsHubPanelId === 'system') {
      return renderSystemSettingsPanel()
    }

    if (expandedSettingsHubPanelId === 'family') {
      return renderFamilySettingsPanel()
    }

    return (
      <div className="empty-state empty-state--expanded">
        <p className="empty-title">{appText.settings.noExpandedPanelTitle}</p>
        <p className="empty-copy">{appText.settings.noExpandedPanelCopy}</p>
      </div>
    )
  }

  const renderAudienceBadge = (
    audience: readonly AudienceId[],
    sizeClassName = 'route-bullet--small',
  ) => {
    const nonHouseholdMembers = audience.filter(
      (memberId) => memberId !== '*' && membersById.has(memberId),
    )
    const hasHouseholdOnly = audience.includes('*') || nonHouseholdMembers.length === 0

    if (hasHouseholdOnly && nonHouseholdMembers.length === 0) {
      return (
        <span
          className={`route-bullet ${sizeClassName}`}
          style={householdBadgeStyleBySize(sizeClassName)}
        >
          {HOUSEHOLD_BADGE_TEXT}
        </span>
      )
    }

    // If only one non-household member, show single badge
    if (nonHouseholdMembers.length === 1) {
      const member = membersById.get(nonHouseholdMembers[0])
      if (member) {
        return (
          <span
            className={`route-bullet ${sizeClassName}`}
            style={badgeStyle(member.color)}
          >
            {getInitial(member.firstName)}
          </span>
        )
      }
    }

    // Multiple members: render stacked badges
    return (
      <div className={`stacked-badges stacked-badges--${sizeClassName}`}>
        {nonHouseholdMembers.map((memberId, index) => {
          const member = membersById.get(memberId)
          if (!member) return null
          return (
            <span
              key={memberId}
              className={`route-bullet route-bullet--stacked ${sizeClassName}`}
              style={{
                ...badgeStyle(member.color),
                zIndex: nonHouseholdMembers.length - index,
              }}
              title={member.firstName}
            >
              {getInitial(member.firstName)}
            </span>
          )
        })}
      </div>
    )
  }

  const handleToggleTodoDone = (todoItemId: string, done: boolean) => {
    const todoWidget = registeredWidgets.find((widget) => widget.entity.id === 'todo')

    if (!todoWidget?.module.mutateData) {
      return
    }

    beginInteractionMeasurement(done ? `todo:done:${todoItemId}` : `todo:reopen:${todoItemId}`)

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
        setTodoItemsErrorKey(null)
      })
      .catch((error) => {
        if (isAuthRequiredError(error)) {
          handleAuthRequired()
          return
        }

        setTodoWidgetItems(previousTodoItems)

        setTodoItemsErrorKey('todoUpdateFailed')
        setWidgetHealthMap((currentValues) => ({
          ...currentValues,
          todo: {
            widgetId: 'todo',
            refreshStatus: 'error',
            failureState: 'todoUpdateFailed',
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

      if (widgetId === 'audio-visual') {
        const persistedPreferences = await updateAppPreferences({
          audioVisualCameraEnabled: Boolean(normalizedSettings.cameraEnabled),
          audioVisualMicrophoneEnabled: Boolean(normalizedSettings.microphoneEnabled),
        })

        const nextAudioVisualSettings = getAudioVisualSettingsFromAppPreferences(
          persistedPreferences,
        )
        setAudioVisualPreferenceSettings(nextAudioVisualSettings)
        setWidgetSettingsMap((currentValues) => ({
          ...currentValues,
          'audio-visual': nextAudioVisualSettings,
        }))
        setWidgetSettingsErrorKey(null)
        return
      }

      const persistedSettings = await updateWidgetSettings(widgetId, normalizedSettings)

      setWidgetSettingsMap((currentValues) => ({
        ...currentValues,
        [widgetId]: persistedSettings.settings,
      }))
      setWidgetSettingsErrorKey(null)
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
      setWidgetMetadataAdminErrorKey(null)
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
    appPreferencesLoaded &&
    familyMembersLoaded &&
    widgetMetadataLoaded &&
    appShellStateHydrated

  if (authStatus === 'bootstrapping') {
    return (
      <main className="app-shell app-shell--auth">
        <section className="screen auth-screen">
          <div className="hero-layout hero-layout--loading">
            <article className="hero-card hero-card--brand hero-card--loading">
              <p className="terminal-location">{appText.auth.sessionBootstrapKicker}</p>
              <h1 className="terminal-title">{appText.auth.sessionBootstrapTitle}</h1>
              <p className="hero-copy">{appText.auth.sessionBootstrapCopy}</p>
            </article>
          </div>
          <SoftwareKeyboardOverlay
            activeTarget={softwareKeyboardTarget}
            onRequestClose={handleSoftwareKeyboardClose}
          />
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
                  <p className="terminal-location">{appText.auth.heroKicker}</p>
                  <h1 className="terminal-title">{boardTitleDisplay}</h1>
                  <p className="hero-copy">{appText.auth.introParagraphOne}</p>
                  <p className="hero-copy">{appText.auth.introParagraphTwo}</p>
                  <p className="hero-copy">{appText.auth.introParagraphThree}</p>
                </div>
              </div>

              <div className="hero-login-block">
                <div className="settings-card-head">
                  <p className="widget-kicker">{appText.auth.signInKicker}</p>
                  <h2>{appText.auth.signInTitle}</h2>
                </div>

                <p className="settings-copy">{appText.auth.signInCopy}</p>

                {authError ? (
                  <p className="settings-note settings-note--warning">{authError}</p>
                ) : null}

                <form className="settings-form auth-form" onSubmit={handleLogin}>
                  <label className="settings-label">
                    <span>{appText.auth.usernameLabel}</span>
                    <input
                      autoComplete="username"
                      className="settings-input"
                      type="text"
                      value={loginUsername}
                      onChange={(event) => setLoginUsername(event.target.value)}
                      placeholder={appText.auth.usernamePlaceholder}
                    />
                  </label>

                  <label className="settings-label">
                    <span>{appText.auth.passwordLabel}</span>
                    <input
                      autoComplete="current-password"
                      className="settings-input"
                      type="password"
                      value={loginPassword}
                      onChange={(event) => setLoginPassword(event.target.value)}
                      placeholder={appText.auth.passwordPlaceholder}
                    />
                  </label>

                  <button className="settings-submit" type="submit" disabled={authPending}>
                    {authPending ? appText.auth.signingInAction : appText.auth.signInAction}
                  </button>
                </form>
              </div>
            </article>
          </div>
          <SoftwareKeyboardOverlay
            activeTarget={softwareKeyboardTarget}
            onRequestClose={handleSoftwareKeyboardClose}
          />
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
              <p className="terminal-location">{appText.auth.authenticatedSessionKicker}</p>
              <h1 className="terminal-title">
                {formatLocalizedText(appText.auth.authenticatedSessionTitle, {
                  username: authenticatedUser?.username ?? '',
                })}
              </h1>
              <p className="hero-copy">{appText.auth.authenticatedSessionCopy}</p>
            </article>
          </div>
          <SoftwareKeyboardOverlay
            activeTarget={softwareKeyboardTarget}
            onRequestClose={handleSoftwareKeyboardClose}
          />
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <section className="screen screen--shell">
        <header className="terminal-marquee">
          <div className="terminal-cell terminal-cell--title">
            <div className="terminal-copy" onClick={handleHiddenDebugTrigger}>
              <p className="terminal-location">{boardSubheadingDisplay}</p>
              <h1 className="terminal-title">
                {viewMode === 'board'
                  ? boardTitleDisplay
                  : appText.shell.familySettingsTitle}
              </h1>
            </div>
          </div>

          <div className="terminal-cell terminal-cell--clock">
            <div className="clock-stack">
              <p className="board-datetime">
                {boardDate} {boardTime}
              </p>
            </div>
          </div>

          <div className="terminal-cell terminal-cell--filters">
            <div className="filter-bar">
              <div
                className="filter-row filter-row--board"
                role="group"
                aria-label={appText.boardHost.filtersAriaLabel}
              >
                {viewMode === 'board' ? filterOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`filter-pill${option.id === activeFilter ? ' is-active' : ''}`}
                    aria-pressed={option.id === activeFilter}
                    onClick={() => handleFilterChange(option.id)}
                  >
                    <span className="route-bullet" style={option.style}>
                      {option.badgeText}
                    </span>
                    <span className="filter-copy">
                      <span className="filter-label">{option.label}</span>
                    </span>
                  </button>
                )) : filterOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`filter-pill${option.id === activeFilter ? ' is-active' : ''}`}
                    aria-pressed={option.id === activeFilter}
                    onClick={() => {}}
                    disabled
                  >
                    <span className="route-bullet" style={option.style}>
                      {option.badgeText}
                    </span>
                    <span className="filter-copy">
                      <span className="filter-label">{option.label}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className={viewMode === 'board' ? 'filter-actions' : 'terminal-actions'}>
              <button
                type="button"
                className={`terminal-button${viewMode === 'board' ? ' is-active' : ''}`}
                onClick={() => handleViewModeChange('board')}
              >
                {appText.shell.boardTab}
              </button>
              <button
                type="button"
                className={`terminal-button${viewMode === 'settings' ? ' is-active' : ''}`}
                onClick={() => handleViewModeChange('settings')}
              >
                {appText.shell.settingsTab}
              </button>
              <button
                type="button"
                className="terminal-button terminal-button--quiet"
                onClick={handleLogout}
                disabled={authPending}
              >
                {authPending ? appText.shell.signingOutAction : appText.shell.signOutAction}
              </button>
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
              appText={appText}
              languageCode={selectedLanguageCode}
              registeredWidgets={registeredWidgets}
              activeFilter={activeFilter}
              activeProfileLabel={activeProfile ? getMemberLabel(activeProfile) : undefined}
              expandedWidgetId={expandedWidgetId}
              filterOptions={filterOptions}
              activeViewMode={viewMode}
              onFilterChange={handleFilterChange}
              onViewModeChange={handleViewModeChange}
              onExpandedWidgetChange={handleExpandedWidgetChange}
              onLogout={handleLogout}
              authPending={authPending}
              visibleArrivals={visibleArrivals}
              visibleAgenda={visibleAgenda}
              visibleTodos={visibleTodos}
              bringData={bringWidgetData}
              familyMembers={familyMembers}
              homeCountryCode={selectedCountryCode}
              calendarSettings={combinedWidgetSettingsMap.calendar ?? {}}
              widgetSettingsMap={combinedWidgetSettingsMap}
              weatherData={weatherWidgetData}
              commuteNote={commuteNote}
              focusedCalendarEventId={calendarFocusSelection?.eventId ?? null}
              focusedCalendarEventDate={calendarFocusSelection?.eventDate ?? null}
              onBringRefresh={handleBringRefresh}
              onBringCreateItem={handleBringCreateItem}
              onBringUpdateItem={handleBringUpdateItem}
              onBringDeleteItem={handleBringDeleteItem}
              onBringCompleteItem={handleBringCompleteItem}
              renderAudienceBadge={renderAudienceBadge}
              onToggleTodoDone={handleToggleTodoDone}
              onCalendarDataChanged={handleCalendarDataChanged}
              onOpenCalendarEvent={handleOpenCalendarEvent}
              onSaveWidgetSettings={handleSaveWidgetSettings}
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
                    <p className="widget-kicker">{appText.settings.panelKicker}</p>
                    <h2>{appText.shell.familySettingsTitle}</h2>
                  </div>
                </div>
              </div>

              {familyMembersError ? (
                <p className="settings-note settings-note--warning">{familyMembersError}</p>
              ) : null}

              {appPreferencesError ? (
                <p className="settings-note settings-note--warning">{appPreferencesError}</p>
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

              <div className="settings-hub-grid">
                <article
                  className={`settings-card settings-hub-card${
                    expandedSettingsHubPanelId === 'system' ? ' is-active' : ''
                  }`}
                >
                  <div className="widget-head">
                    <div className="widget-flag">
                      <span className="route-bullet route-bullet--large" style={badgeStyle('#7dd3fc')}>
                        S
                      </span>
                      <div>
                        <p className="widget-kicker">{appText.settings.systemKicker}</p>
                        <h3>{appText.settings.systemHubTitle}</h3>
                      </div>
                    </div>
                    <div className="widget-head-side">
                      <p className="widget-meta">{`${selectedLanguageCode.toUpperCase()} · ${selectedCountryCode}`}</p>
                    </div>
                  </div>

                  <p className="settings-copy">{appText.settings.systemHubCopy}</p>

                  <div className="widget-head-side">
                    <button
                      type="button"
                      className={`widget-action-button${
                        expandedSettingsHubPanelId === 'system' ? ' is-active' : ''
                      }`}
                      aria-label={
                        expandedSettingsHubPanelId === 'system'
                          ? appText.settings.closeExpandedPanelAriaLabel
                          : appText.settings.openSystemPanelAriaLabel
                      }
                      onClick={() => toggleExpandedSettingsHubPanel('system')}
                    >
                      <span>
                        {expandedSettingsHubPanelId === 'system'
                          ? appText.boardHost.collapseAction
                          : appText.widgetAdmin.openSettingsAction}
                      </span>
                    </button>
                  </div>
                </article>

                <article
                  className={`settings-card settings-hub-card${
                    expandedSettingsHubPanelId === 'family' ? ' is-active' : ''
                  }`}
                >
                  <div className="widget-head">
                    <div className="widget-flag">
                      <span className="route-bullet route-bullet--large" style={badgeStyle('#4aa8ff')}>
                        F
                      </span>
                      <div>
                        <p className="widget-kicker">{appText.settings.panelKicker}</p>
                        <h3>{appText.settings.familyMembersTitle}</h3>
                      </div>
                    </div>
                    <div className="widget-head-side">
                      <p className="widget-meta">
                        {formatLocalizedText(appText.settings.familyMembersMeta, {
                          count: familyMembers.length,
                        })}
                      </p>
                    </div>
                  </div>

                  <p className="settings-copy">{appText.settings.familyHubCopy}</p>

                  <div className="widget-head-side">
                    <button
                      type="button"
                      className={`widget-action-button${
                        expandedSettingsHubPanelId === 'family' ? ' is-active' : ''
                      }`}
                      aria-label={
                        expandedSettingsHubPanelId === 'family'
                          ? appText.settings.closeExpandedPanelAriaLabel
                          : appText.settings.openFamilyPanelAriaLabel
                      }
                      onClick={() => toggleExpandedSettingsHubPanel('family')}
                    >
                      <span>
                        {expandedSettingsHubPanelId === 'family'
                          ? appText.boardHost.collapseAction
                          : appText.widgetAdmin.openSettingsAction}
                      </span>
                    </button>
                  </div>
                </article>
              </div>

              <section className="widget-zone widget-zone--expanded-stage">
                {renderExpandedSettingsHubPanel()}
              </section>

              <WidgetMetadataAdminHost
                appText={appText}
                languageCode={selectedLanguageCode}
                registeredWidgets={registeredWidgets}
                familyMembers={familyMembers}
                availableSourceLocations={registeredWidgets.map(
                  (widget) => widget.module.folderName,
                )}
                expandedWidgetId={expandedWidgetSettingsId}
                onExpandedWidgetChange={setExpandedWidgetSettingsId}
                onSaveWidgetMetadata={(widgetId: string, draft: WidgetMetadataDraft) =>
                  handleSaveWidgetMetadata(widgetId, draft).catch(() => {
                    setWidgetMetadataAdminErrorKey('widgetMetadataSaveFailed')
                    throw new Error('widget metadata save failed')
                  })
                }
              />

              <WidgetSettingsHost
                appText={appText}
                languageCode={selectedLanguageCode}
                registeredWidgets={registeredWidgets}
                expandedWidgetId={expandedWidgetSettingsId}
                onExpandedWidgetChange={setExpandedWidgetSettingsId}
                widgetSettingsMap={combinedWidgetSettingsMap}
                onSaveWidgetSettings={(widgetId: string, settings: WidgetSettingsValues) =>
                  handleSaveWidgetSettings(widgetId, settings).catch(() => {
                    setWidgetSettingsErrorKey('widgetSettingsSaveFailed')
                    throw new Error('widget settings save failed')
                  })
                }
              />
              </article>
            </section>
          )}
        </div>

        {viewMode === 'board' && debugModeEnabled ? (
          <WidgetDebugOverlay
            appText={appText}
            languageCode={selectedLanguageCode}
            registeredWidgets={registeredWidgets}
            activeFilter={activeFilter}
            widgetHealthMap={widgetHealthMap}
            performanceState={performanceState}
            onClose={() => setDebugModeEnabled(false)}
          />
        ) : null}
        <SoftwareKeyboardOverlay
          activeTarget={softwareKeyboardTarget}
          onRequestClose={handleSoftwareKeyboardClose}
        />
      </section>
    </main>
  )
}

export default App

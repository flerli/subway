import { createServer } from 'node:http'
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDirectory = join(__dirname, 'data')
const audioVisualStorageDirectory = join(dataDirectory, 'audio-visual')
const databasePath = join(dataDirectory, 'subway.sqlite')
const localCalendarSeedEventsPath = join(dataDirectory, 'calendarSeedEvents.local.json')
const HOST = process.env.HOST ?? '0.0.0.0'
const PORT = Number.parseInt(process.env.PORT ?? '8787', 10)
const WEATHER_LATITUDE = Number.parseFloat(process.env.WEATHER_LATITUDE ?? '52.52')
const WEATHER_LONGITUDE = Number.parseFloat(process.env.WEATHER_LONGITUDE ?? '13.405')
const WEATHER_LOCATION = process.env.WEATHER_LOCATION ?? 'Berlin'
const WEATHER_TIMEZONE = process.env.WEATHER_TIMEZONE ?? 'auto'
const WEATHER_FORECAST_DAYS = 8
const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000
const YOUTUBE_RESULTS_LIMIT = 80
const BRING_SIDECAR_URL = process.env.BRING_SIDECAR_URL ?? 'http://127.0.0.1:8788'
const BRING_SIDECAR_REQUEST_TIMEOUT_MS = Number.parseInt(
  process.env.BRING_SIDECAR_REQUEST_TIMEOUT_MS ?? '15000',
  10,
)
const ROBOROCK_SIDECAR_URL =
  process.env.ROBOROCK_SIDECAR_URL ?? 'http://127.0.0.1:8789'
const ROBOROCK_SIDECAR_REQUEST_TIMEOUT_MS = Number.parseInt(
  process.env.ROBOROCK_SIDECAR_REQUEST_TIMEOUT_MS ?? '15000',
  10,
)
const ASSISTANT_BACKEND_ROUTE_ID =
  process.env.ASSISTANT_BACKEND_ROUTE_ID ?? 'assistant-default-route'
const ASSISTANT_BACKEND_ROUTE_LABEL =
  process.env.ASSISTANT_BACKEND_ROUTE_LABEL ?? ''
const ASSISTANT_BACKEND_KIND = process.env.ASSISTANT_BACKEND_KIND ?? ''
const ASSISTANT_BACKEND_BASE_URL = process.env.ASSISTANT_BACKEND_BASE_URL ?? ''
const ASSISTANT_BACKEND_MODEL_IDENTIFIER =
  process.env.ASSISTANT_BACKEND_MODEL_IDENTIFIER ?? ''
const ASSISTANT_BACKEND_ENABLED = process.env.ASSISTANT_BACKEND_ENABLED !== 'false'
const ASSISTANT_BACKEND_REQUEST_TIMEOUT_MS = Number.parseInt(
  process.env.ASSISTANT_BACKEND_REQUEST_TIMEOUT_MS ?? '30000',
  10,
)
const ASSISTANT_BACKEND_API_KEY = process.env.ASSISTANT_BACKEND_API_KEY ?? ''
const ASSISTANT_BACKEND_HEADERS_JSON = process.env.ASSISTANT_BACKEND_HEADERS_JSON ?? ''
const ASSISTANT_MCP_SERVERS_JSON = process.env.ASSISTANT_MCP_SERVERS_JSON ?? ''
const ASSISTANT_BACKEND_SUPPORTS_STREAMING =
  process.env.ASSISTANT_BACKEND_SUPPORTS_STREAMING !== 'false'
const ASSISTANT_BACKEND_SUPPORTS_TOOLS =
  process.env.ASSISTANT_BACKEND_SUPPORTS_TOOLS !== 'false'
const ASSISTANT_BACKEND_SUPPORTS_MARKDOWN =
  process.env.ASSISTANT_BACKEND_SUPPORTS_MARKDOWN !== 'false'
const BRING_CREDENTIAL_ENCRYPTION_SECRET =
  process.env.BRING_CREDENTIAL_ENCRYPTION_KEY ?? ''
const bringCredentialEncryptionKey =
  BRING_CREDENTIAL_ENCRYPTION_SECRET.trim().length > 0
    ? createHash('sha256').update(BRING_CREDENTIAL_ENCRYPTION_SECRET).digest()
    : null
const ROBOROCK_SESSION_ENCRYPTION_SECRET =
  process.env.ROBOROCK_SESSION_ENCRYPTION_KEY ?? ''
const roborockSessionEncryptionKey =
  ROBOROCK_SESSION_ENCRYPTION_SECRET.trim().length > 0
    ? createHash('sha256').update(ROBOROCK_SESSION_ENCRYPTION_SECRET).digest()
    : null
const INITIAL_USER_ID = process.env.INITIAL_USER_ID ?? 'user-flerlage'
const INITIAL_USER_USERNAME = process.env.INITIAL_USER_USERNAME ?? 'flerlage'
const INITIAL_USER_PASSWORD =
  process.env.INITIAL_USER_PASSWORD ?? 'xupjo0-hyhdoF-tovsuc'
const BACKEND_RUNTIME_STARTED_AT = new Date().toISOString()
const BACKEND_RUNTIME_INSTANCE_ID = randomUUID()
const SESSION_COOKIE_NAME = 'subway_session'
const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 10
const SESSION_COOKIE_SECURE = process.env.SESSION_COOKIE_SECURE === 'true'
const SUPPORTED_LANGUAGE_CODES = ['en', 'de', 'fr', 'es']
const DEFAULT_LANGUAGE_CODE = 'en'
const DEFAULT_COUNTRY_CODE = 'DE'
const AUDIO_VISUAL_PERMISSION_STATES = new Set([
  'idle',
  'requesting',
  'granted',
  'denied',
  'unsupported',
  'error',
])
const AUDIO_VISUAL_RECORDING_MODES = new Set(['video', 'audio'])
const LEGACY_HOUSEHOLD_MEMBER_ID = '*'
const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_LABEL_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/
const supportedLanguageCodeSet = new Set(SUPPORTED_LANGUAGE_CODES)
const ASSISTANT_BACKEND_KINDS = new Set(['litellm', 'custom'])
const ASSISTANT_AVAILABILITY_STATUSES = new Set([
  'available',
  'not_configured',
  'disabled',
  'unavailable',
])
const ASSISTANT_THREAD_STATES = new Set(['active', 'archived'])
const ASSISTANT_MESSAGE_ROLES = new Set(['system', 'user', 'assistant', 'tool'])
const ASSISTANT_MESSAGE_EVENT_TYPES = new Set(['tool_call'])
const ASSISTANT_TOOL_APPROVAL_STATES = new Set([
  'pending',
  'approved',
  'rejected',
  'canceled',
  'expired',
])
const ASSISTANT_TOOL_APPROVAL_TTL_MS = 10 * 60 * 1000
const supportedRecurrenceFrequencySet = new Set([
  'none',
  'daily',
  'weekly',
  'monthly',
  'yearly',
])

mkdirSync(dataDirectory, { recursive: true })
mkdirSync(audioVisualStorageDirectory, { recursive: true })

const db = new DatabaseSync(databasePath)

db.exec('PRAGMA foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`)

db.exec(`
  CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx
  ON user_sessions(user_id)
`)

const readTableColumns = (tableName) => db.prepare(`PRAGMA table_info(${tableName})`).all()

const doesTableExist = (tableName) =>
  Boolean(
    db
      .prepare(`
        SELECT 1 AS present
        FROM sqlite_master
        WHERE type = 'table' AND name = ?
      `)
      .get(tableName),
  )

const hasColumn = (tableName, columnName) =>
  readTableColumns(tableName).some((column) => column.name === columnName)

const hasOwnershipPrimaryKey = (tableName, expectedPrimaryKeyColumns) => {
  if (!doesTableExist(tableName)) {
    return false
  }

  const primaryKeyColumns = readTableColumns(tableName)
    .filter((column) => column.pk > 0)
    .sort((left, right) => left.pk - right.pk)
    .map((column) => column.name)

  return (
    primaryKeyColumns.length === expectedPrimaryKeyColumns.length &&
    expectedPrimaryKeyColumns.every(
      (columnName, index) => primaryKeyColumns[index] === columnName,
    )
  )
}

const normalizeLanguageCode = (value) => {
  const normalizedValue =
    typeof value === 'string' ? value.trim().toLowerCase() : DEFAULT_LANGUAGE_CODE

  return supportedLanguageCodeSet.has(normalizedValue)
    ? normalizedValue
    : DEFAULT_LANGUAGE_CODE
}

const isSupportedLanguageCode = (value) =>
  typeof value === 'string' &&
  supportedLanguageCodeSet.has(value.trim().toLowerCase())

const isSupportedCountryCode = (value) =>
  typeof value === 'string' && COUNTRY_CODE_PATTERN.test(value.trim().toUpperCase())

const normalizeCountryCode = (value) => {
  const normalizedValue = typeof value === 'string' ? value.trim().toUpperCase() : ''

  return COUNTRY_CODE_PATTERN.test(normalizedValue)
    ? normalizedValue
    : DEFAULT_COUNTRY_CODE
}

const parseIsoDate = (value) => {
  if (typeof value !== 'string') {
    return null
  }

  const match = ISO_DATE_PATTERN.exec(value.trim())

  if (!match) {
    return null
  }

  const year = Number.parseInt(match[1], 10)
  const month = Number.parseInt(match[2], 10)
  const day = Number.parseInt(match[3], 10)
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return {
    date,
    year,
    month,
    day,
    isoDate: `${match[1]}-${match[2]}-${match[3]}`,
  }
}

const formatIsoDate = (value) => value.toISOString().slice(0, 10)

const getTodayIsoDate = () => formatIsoDate(new Date())

const normalizeIsoDate = (value, fallback = getTodayIsoDate()) =>
  parseIsoDate(value)?.isoDate ?? fallback

const addDaysToIsoDate = (value, dayCount) => {
  const parsedDate = parseIsoDate(value)

  if (!parsedDate) {
    return getTodayIsoDate()
  }

  const nextDate = new Date(parsedDate.date)
  nextDate.setUTCDate(nextDate.getUTCDate() + dayCount)

  return formatIsoDate(nextDate)
}

const compareIsoDates = (left, right) => left.localeCompare(right)

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const normalizeTimeLabel = (value) => {
  const normalizedValue = typeof value === 'string' ? value.trim().slice(0, 5) : ''

  return TIME_LABEL_PATTERN.test(normalizedValue) ? normalizedValue : '00:00'
}

const sanitizeCalendarText = (value, fallback = '') => {
  if (typeof value !== 'string') {
    return fallback
  }

  const normalizedValue = value.trim().replace(/\s+/g, ' ')

  return normalizedValue.length > 0 ? normalizedValue : fallback
}

const sanitizeBringUsername = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().slice(0, 320)
}

const sanitizeRoborockEmail = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().slice(0, 320)
}

const sanitizeRoborockVerificationCode = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().slice(0, 32)
}

const sanitizeRoborockBaseUrl = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().slice(0, 320)
}

const normalizeRoborockDeviceDuid = (value) =>
  typeof value === 'string' ? value.trim().slice(0, 160) : ''

const sanitizeRoborockDeviceName = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().slice(0, 160)
}

const sanitizeRoborockDeviceModel = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().slice(0, 160)
}

const sanitizeAssistantThreadTitle = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().replace(/\s+/g, ' ').slice(0, 120)
}

const sanitizeAssistantMessageContent = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().slice(0, 40000)
}

const sanitizeAssistantRouteLabel = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().replace(/\s+/g, ' ').slice(0, 120)
}

const sanitizeAssistantBaseUrl = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().slice(0, 500)
}

const sanitizeAssistantModelIdentifier = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().slice(0, 200)
}

const normalizeAssistantBackendKind = (value) => {
  const normalizedValue = typeof value === 'string' ? value.trim().toLowerCase() : ''

  return ASSISTANT_BACKEND_KINDS.has(normalizedValue) ? normalizedValue : ''
}

const normalizeAssistantThreadState = (value) => {
  const normalizedValue = typeof value === 'string' ? value.trim().toLowerCase() : 'active'

  return ASSISTANT_THREAD_STATES.has(normalizedValue) ? normalizedValue : 'active'
}

const normalizeAssistantMessageRole = (value) => {
  const normalizedValue = typeof value === 'string' ? value.trim().toLowerCase() : 'assistant'

  return ASSISTANT_MESSAGE_ROLES.has(normalizedValue) ? normalizedValue : 'assistant'
}

const normalizeAssistantBooleanFlag = (value) => (value ? 1 : 0)

const parseAssistantConfiguredHeaders = (value) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return {}
  }

  try {
    const parsedValue = JSON.parse(value)

    if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
      return {}
    }

    return Object.fromEntries(
      Object.entries(parsedValue).filter(
        ([headerName, headerValue]) =>
          typeof headerName === 'string' &&
          headerName.trim().length > 0 &&
          typeof headerValue === 'string' &&
          headerValue.trim().length > 0,
      ),
    )
  } catch {
    return {}
  }
}

const sanitizeAssistantToolName = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().slice(0, 160)
}

const sanitizeAssistantMcpServerName = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().slice(0, 120)
}

const sanitizeAssistantToolDescription = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().slice(0, 400)
}

const sanitizeAssistantWidgetLabel = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().slice(0, 120)
}

const sanitizeAssistantWidgetSourceLocation = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().slice(0, 120)
}

const ASSISTANT_WIDGET_TOOL_ARGUMENT_TYPES = new Set(['string', 'number', 'boolean'])

const normalizeAssistantWidgetToolArgument = (value) => {
  const candidate = value && typeof value === 'object' ? value : {}
  const key = sanitizeAssistantToolName(candidate.key ?? candidate.name)
  const description = sanitizeAssistantToolDescription(candidate.description)
  const type = ASSISTANT_WIDGET_TOOL_ARGUMENT_TYPES.has(candidate.type)
    ? candidate.type
    : 'string'

  if (!key || !description) {
    return null
  }

  return {
    key,
    description,
    type,
    required: candidate.required !== false,
  }
}

const normalizeAssistantWidgetTools = (value) => {
  if (!Array.isArray(value)) {
    return []
  }

  const widgetToolsByName = new Map()

  value.forEach((entry) => {
    const candidate = entry && typeof entry === 'object' ? entry : {}
    const widgetId = sanitizeAssistantWidgetLabel(candidate.widgetId)
    const widgetTitle = sanitizeAssistantWidgetLabel(candidate.widgetTitle)
    const sourceLocation = sanitizeAssistantWidgetSourceLocation(candidate.sourceLocation)
    const toolName = sanitizeAssistantToolName(candidate.toolName ?? candidate.name)
    const description = sanitizeAssistantToolDescription(candidate.description)
    const humanAction = sanitizeAssistantToolDescription(candidate.humanAction)
    const parityScope = Array.isArray(candidate.parityScope)
      ? [...new Set(candidate.parityScope.filter((scope) => scope === 'read' || scope === 'write'))]
      : []
    const argumentsList = Array.isArray(candidate.arguments)
      ? candidate.arguments
          .map(normalizeAssistantWidgetToolArgument)
          .filter((argumentDefinition) => argumentDefinition !== null)
      : []

    if (!widgetId || !toolName || !description) {
      return
    }

    widgetToolsByName.set(toolName, {
      widgetId,
      widgetTitle: widgetTitle || widgetId,
      sourceLocation,
      toolName,
      description,
      humanAction: humanAction || description,
      parityScope: parityScope.length > 0 ? parityScope : ['read'],
      approvalRequired: candidate.approvalRequired === true,
      redactArguments: candidate.redactArguments === true,
      redactResults: candidate.redactResults === true,
      arguments: argumentsList,
    })
  })

  return [...widgetToolsByName.values()]
}

const parseAssistantMcpServers = (value) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return []
  }

  try {
    const parsedValue = JSON.parse(value)

    if (!Array.isArray(parsedValue)) {
      return []
    }

    return parsedValue
      .map((entry) => {
        const candidate = entry && typeof entry === 'object' ? entry : {}
        const name = sanitizeAssistantMcpServerName(candidate.name)
        const baseUrl = sanitizeAssistantBaseUrl(candidate.baseUrl)
        const headers = parseAssistantConfiguredHeaders(
          typeof candidate.headersJson === 'string'
            ? candidate.headersJson
            : JSON.stringify(candidate.headers ?? {}),
        )
        const tools = Array.isArray(candidate.tools)
          ? candidate.tools
              .map((toolEntry) => {
                const toolCandidate = toolEntry && typeof toolEntry === 'object' ? toolEntry : {}
                const toolName = sanitizeAssistantToolName(toolCandidate.name)

                if (!toolName) {
                  return null
                }

                return {
                  name: toolName,
                  redactArguments: toolCandidate.redactArguments !== false,
                  redactResults: toolCandidate.redactResults !== false,
                }
              })
              .filter(Boolean)
          : []

        if (!name || !baseUrl) {
          return null
        }

        return {
          name,
          baseUrl,
          headers,
          tools,
        }
      })
      .filter(Boolean)
  } catch {
    return []
  }
}

const configuredAssistantMcpServers = parseAssistantMcpServers(ASSISTANT_MCP_SERVERS_JSON)

const isAssistantRouteConfigured = (route) => {
  if (!route) {
    return false
  }

  if (!sanitizeAssistantRouteLabel(route.label)) {
    return false
  }

  const backendKind = normalizeAssistantBackendKind(route.backendKind)

  if (!backendKind) {
    return false
  }

  if (!sanitizeAssistantBaseUrl(route.baseUrl)) {
    return false
  }

  if (
    backendKind === 'litellm' &&
    !sanitizeAssistantModelIdentifier(route.modelIdentifier)
  ) {
    return false
  }

  return true
}

const normalizeRoborockRoutineId = (value) => {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsedValue = Number.parseInt(value.trim(), 10)

    return Number.isInteger(parsedValue) ? parsedValue : null
  }

  return null
}

const sanitizeRoborockRoutineName = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().slice(0, 160)
}

const normalizeRoborockConnectionStatus = (value) => {
  const normalizedValue = typeof value === 'string' ? value.trim().toLowerCase() : ''

  return normalizedValue === 'connected' || normalizedValue === 'reconnect_required'
    ? normalizedValue
    : 'not_configured'
}

const sanitizeBringPassword = (value) =>
  typeof value === 'string' ? value : ''

const normalizeBringListUuid = (value) =>
  typeof value === 'string' ? value.trim().slice(0, 120) : ''

const sanitizeBringListName = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().slice(0, 160)
}

const sanitizeBringItemName = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().replace(/\s+/g, ' ').slice(0, 160)
}

const sanitizeBringItemSpecification = (value) => {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim().replace(/\s+/g, ' ').slice(0, 320)
}

const normalizeBringItemUuid = (value) =>
  typeof value === 'string' ? value.trim().slice(0, 120) : ''

const normalizeRecurrenceFrequency = (value) => {
  const normalizedValue = typeof value === 'string' ? value.trim().toLowerCase() : 'none'

  return supportedRecurrenceFrequencySet.has(normalizedValue)
    ? normalizedValue
    : 'none'
}

const normalizeRecurrenceRule = (value, startDate) => {
  const candidate = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  const frequency = normalizeRecurrenceFrequency(candidate.frequency)
  const interval =
    typeof candidate.interval === 'number' &&
    Number.isInteger(candidate.interval) &&
    candidate.interval > 0
      ? Math.min(candidate.interval, 366)
      : 1
  const startWeekday = parseIsoDate(startDate)?.date.getUTCDay() ?? 0
  const normalizedWeekdays = Array.isArray(candidate.byWeekdays)
    ? Array.from(
        new Set(
          candidate.byWeekdays.filter(
            (weekday) =>
              typeof weekday === 'number' &&
              Number.isInteger(weekday) &&
              weekday >= 0 &&
              weekday <= 6,
          ),
        ),
      ).sort((left, right) => left - right)
    : []
  const count =
    typeof candidate.count === 'number' &&
    Number.isInteger(candidate.count) &&
    candidate.count > 0
      ? Math.min(candidate.count, 366)
      : null
  const until = candidate.until == null ? null : normalizeIsoDate(candidate.until, null)

  return {
    frequency,
    interval,
    byWeekdays:
      frequency === 'weekly'
        ? normalizedWeekdays.length > 0
          ? normalizedWeekdays
          : [startWeekday]
        : [],
    count,
    until,
  }
}

const parseRecurrenceRuleJson = (value, startDate) => {
  try {
    return normalizeRecurrenceRule(JSON.parse(value), startDate)
  } catch {
    return normalizeRecurrenceRule(null, startDate)
  }
}

const buildCalendarDisplayLocation = (city, countryCode) =>
  city ? `${city}, ${countryCode}` : countryCode

const validateCalendarTimeLabel = (value) =>
  typeof value === 'string' && TIME_LABEL_PATTERN.test(value.trim().slice(0, 5))

const validateCalendarIsoDate = (value) => typeof value === 'string' && Boolean(parseIsoDate(value))

const validateRecurrenceRuleInput = (value, startDate) => {
  if (value == null) {
    return { recurrence: normalizeRecurrenceRule(null, startDate) }
  }

  if (!isPlainObject(value)) {
    return { error: 'recurrence must be an object.' }
  }

  const candidate = value

  if (
    candidate.frequency !== undefined &&
    normalizeRecurrenceFrequency(candidate.frequency) === 'none' &&
    String(candidate.frequency).trim().toLowerCase() !== 'none'
  ) {
    return { error: 'recurrence.frequency is invalid.' }
  }

  if (
    candidate.interval !== undefined &&
    (!Number.isInteger(candidate.interval) || candidate.interval <= 0)
  ) {
    return { error: 'recurrence.interval must be a positive integer.' }
  }

  if (candidate.byWeekdays !== undefined) {
    if (!Array.isArray(candidate.byWeekdays)) {
      return { error: 'recurrence.byWeekdays must be an array.' }
    }

    if (
      candidate.byWeekdays.some(
        (weekday) =>
          typeof weekday !== 'number' ||
          !Number.isInteger(weekday) ||
          weekday < 0 ||
          weekday > 6,
      )
    ) {
      return { error: 'recurrence.byWeekdays may only contain integers from 0 to 6.' }
    }
  }

  if (
    candidate.count !== undefined &&
    candidate.count !== null &&
    (!Number.isInteger(candidate.count) || candidate.count <= 0)
  ) {
    return { error: 'recurrence.count must be a positive integer or null.' }
  }

  if (
    candidate.until !== undefined &&
    candidate.until !== null &&
    !validateCalendarIsoDate(candidate.until)
  ) {
    return { error: 'recurrence.until must be a valid ISO date in YYYY-MM-DD format or null.' }
  }

  return { recurrence: normalizeRecurrenceRule(candidate, startDate) }
}

const buildCalendarEventFromInput = ({
  value,
  validMemberIds,
  currentEvent = null,
}) => {
  if (!isPlainObject(value)) {
    return { error: 'Calendar event payload must be an object.' }
  }

  const titleInput = value.title ?? currentEvent?.title
  const title = sanitizeCalendarText(titleInput, '')

  if (!title) {
    return { error: 'title is required.' }
  }

  const dateInput = value.date ?? currentEvent?.date

  if (!validateCalendarIsoDate(dateInput)) {
    return { error: 'date must be a valid ISO date in YYYY-MM-DD format.' }
  }

  const date = normalizeIsoDate(dateInput)
  const timeInput = value.time ?? currentEvent?.time

  if (!validateCalendarTimeLabel(timeInput)) {
    return { error: 'time must be a valid 24-hour time in HH:MM format.' }
  }

  const time = normalizeTimeLabel(timeInput)
  const locationCityInput = value.locationCity ?? currentEvent?.locationCity
  const locationCity = sanitizeCalendarText(locationCityInput, '')

  if (!locationCity) {
    return { error: 'locationCity is required.' }
  }

  const locationCountryInput = value.locationCountry ?? currentEvent?.locationCountry

  if (!isSupportedCountryCode(locationCountryInput)) {
    return { error: 'locationCountry must be a two-letter ISO country code.' }
  }

  const locationCountry = normalizeCountryCode(locationCountryInput)
  const description = sanitizeCalendarText(
    value.description ?? value.note ?? currentEvent?.description ?? currentEvent?.note,
    '',
  )

  const scopeInput = value.scope ?? currentEvent?.scope

  if (!isPlainObject(scopeInput)) {
    return { error: 'scope is required.' }
  }

  const scopeMode =
    scopeInput.mode === 'members'
      ? 'members'
      : scopeInput.mode === 'all'
        ? 'all'
        : null

  if (!scopeMode) {
    return { error: 'scope.mode must be either all or members.' }
  }

  const scopeMemberIds = Array.isArray(scopeInput.memberIds)
    ? Array.from(
        new Set(
          scopeInput.memberIds.filter((memberId) => typeof memberId === 'string'),
        ),
      )
    : currentEvent?.scope.mode === 'members'
      ? currentEvent.scope.memberIds
      : []

  if (scopeMode === 'members') {
    if (scopeMemberIds.length === 0) {
      return { error: 'Scoped calendar events require at least one member id.' }
    }

    if (scopeMemberIds.some((memberId) => !validMemberIds.has(memberId))) {
      return { error: 'scope.memberIds contains an unknown family member id.' }
    }
  }

  const recurrenceResult = validateRecurrenceRuleInput(
    value.recurrence ?? currentEvent?.recurrence,
    date,
  )

  if (recurrenceResult.error) {
    return recurrenceResult
  }

  const memberIds =
    scopeMode === 'all' ? [LEGACY_HOUSEHOLD_MEMBER_ID] : scopeMemberIds

  const excludedDates = Array.isArray(value.excludedDates)
    ? value.excludedDates.filter((date) => typeof date === 'string' && validateCalendarIsoDate(date))
    : currentEvent?.excludedDates ?? []

  const cancelled = typeof value.cancelled === 'boolean' ? value.cancelled : currentEvent?.cancelled ?? false

  return {
    calendarEvent: {
      title,
      date,
      timeLabel: time,
      locationCity,
      locationCountry,
      note: description,
      memberIds,
      recurrence: recurrenceResult.recurrence,
      excludedDates,
      cancelled,
    },
  }
}

const createPasswordHash = (password) => {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')

  return `scrypt$${salt}$${hash}`
}

const verifyPasswordHash = (password, passwordHash) => {
  if (typeof password !== 'string' || typeof passwordHash !== 'string') {
    return false
  }

  const [algorithm, salt, storedHash] = passwordHash.split('$')

  if (
    algorithm !== 'scrypt' ||
    typeof salt !== 'string' ||
    salt.length === 0 ||
    typeof storedHash !== 'string' ||
    storedHash.length === 0 ||
    storedHash.length % 2 !== 0
  ) {
    return false
  }

  const derivedHash = scryptSync(password, salt, storedHash.length / 2).toString('hex')
  const storedHashBuffer = Buffer.from(storedHash, 'utf8')
  const derivedHashBuffer = Buffer.from(derivedHash, 'utf8')

  return (
    storedHashBuffer.length === derivedHashBuffer.length &&
    timingSafeEqual(storedHashBuffer, derivedHashBuffer)
  )
}

const hashSessionToken = (sessionToken) =>
  createHash('sha256').update(sessionToken).digest('hex')

const createSessionToken = () => randomBytes(32).toString('base64url')

const selectUserByUsername = (username) =>
  db
    .prepare(`
      SELECT id, username, password_hash AS passwordHash
      FROM users
      WHERE username = ?
    `)
    .get(username)

const selectUserById = (userId) =>
  db
    .prepare(`
      SELECT id, username
      FROM users
      WHERE id = ?
    `)
    .get(userId)

const insertUserRecord = (id, username, passwordHash, createdAt, updatedAt) =>
  db
    .prepare(`
      INSERT INTO users (id, username, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(id, username, passwordHash, createdAt, updatedAt)

const insertUserSessionRecord = (id, userId, tokenHash, createdAt, updatedAt) =>
  db
    .prepare(`
      INSERT INTO user_sessions (id, user_id, token_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(id, userId, tokenHash, createdAt, updatedAt)

const selectUserSessionByTokenHash = (tokenHash) =>
  db
    .prepare(`
      SELECT
        user_sessions.id,
        user_sessions.user_id AS userId,
        user_sessions.created_at AS createdAt,
        user_sessions.updated_at AS updatedAt,
        users.username
      FROM user_sessions
      INNER JOIN users ON users.id = user_sessions.user_id
      WHERE user_sessions.token_hash = ?
    `)
    .get(tokenHash)

const updateUserSessionTimestamp = (sessionId, updatedAt) =>
  db
    .prepare(`
      UPDATE user_sessions
      SET updated_at = ?
      WHERE id = ?
    `)
    .run(updatedAt, sessionId)

const deleteUserSessionByTokenHash = (tokenHash) =>
  db
    .prepare(`
      DELETE FROM user_sessions
      WHERE token_hash = ?
    `)
    .run(tokenHash)

const ensureInitialUserRecord = () => {
  const existingUser = selectUserByUsername(INITIAL_USER_USERNAME)

  if (existingUser) {
    return existingUser.id
  }

  const now = new Date().toISOString()

  insertUserRecord(
    INITIAL_USER_ID,
    INITIAL_USER_USERNAME,
    createPasswordHash(INITIAL_USER_PASSWORD),
    now,
    now,
  )

  return INITIAL_USER_ID
}

const migrateOwnedTable = ({
  tableName,
  createTableSql,
  copyColumns,
  expectedPrimaryKeyColumns,
  defaultOwnerUserId,
}) => {
  if (!doesTableExist(tableName)) {
    db.exec(createTableSql)
    return
  }

  if (
    hasColumn(tableName, 'owner_user_id') &&
    hasOwnershipPrimaryKey(tableName, expectedPrimaryKeyColumns)
  ) {
    return
  }

  const tempTableName = `${tableName}__owned_migration`
  const tempCreateTableSql = createTableSql.replace(tableName, tempTableName)
  const targetColumns = ['owner_user_id', ...copyColumns].join(', ')
  const sourceColumns = hasColumn(tableName, 'owner_user_id')
    ? `COALESCE(owner_user_id, ?) AS owner_user_id, ${copyColumns.join(', ')}`
    : `? AS owner_user_id, ${copyColumns.join(', ')}`

  db.exec('BEGIN')

  try {
    db.exec(`DROP TABLE IF EXISTS ${tempTableName}`)
    db.exec(tempCreateTableSql)

    db
      .prepare(`
        INSERT INTO ${tempTableName} (${targetColumns})
        SELECT ${sourceColumns}
        FROM ${tableName}
      `)
      .run(defaultOwnerUserId)

    db.exec(`DROP TABLE ${tableName}`)
    db.exec(`ALTER TABLE ${tempTableName} RENAME TO ${tableName}`)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

const createFamilyMembersTableSql = `
  CREATE TABLE IF NOT EXISTS family_members (
    owner_user_id TEXT NOT NULL REFERENCES users(id),
    id TEXT NOT NULL,
    first_name TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (owner_user_id, id)
  )
`

const createWidgetsTableSql = `
  CREATE TABLE IF NOT EXISTS widgets (
    owner_user_id TEXT NOT NULL REFERENCES users(id),
    id TEXT NOT NULL,
    title TEXT NOT NULL,
    subway_letter TEXT NOT NULL,
    subway_color TEXT NOT NULL,
    source_location TEXT NOT NULL,
    user_scope_mode TEXT NOT NULL,
    user_scope_member_ids TEXT NOT NULL,
    placement_zones TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (owner_user_id, id)
  )
`

const createCalendarEventsTableSql = `
  CREATE TABLE IF NOT EXISTS calendar_events (
    owner_user_id TEXT NOT NULL REFERENCES users(id),
    id TEXT NOT NULL,
    time_label TEXT NOT NULL,
    event_date TEXT NOT NULL,
    title TEXT NOT NULL,
    location TEXT NOT NULL,
    location_city TEXT NOT NULL,
    location_country TEXT NOT NULL,
    note TEXT NOT NULL,
    member_ids TEXT NOT NULL,
    recurrence_rule_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (owner_user_id, id)
  )
`

const createTodoItemsTableSql = `
  CREATE TABLE IF NOT EXISTS todo_items (
    owner_user_id TEXT NOT NULL REFERENCES users(id),
    id TEXT NOT NULL,
    task TEXT NOT NULL,
    due_label TEXT NOT NULL,
    lane TEXT NOT NULL,
    member_ids TEXT NOT NULL,
    is_done INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (owner_user_id, id)
  )
`

const createWidgetSettingsTableSql = `
  CREATE TABLE IF NOT EXISTS widget_settings (
    owner_user_id TEXT NOT NULL REFERENCES users(id),
    widget_id TEXT NOT NULL,
    settings_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (owner_user_id, widget_id)
  )
`

const createAppPreferencesTableSql = `
  CREATE TABLE IF NOT EXISTS app_preferences (
    owner_user_id TEXT NOT NULL PRIMARY KEY REFERENCES users(id),
    language_code TEXT NOT NULL,
    country_code TEXT NOT NULL,
    audio_visual_camera_enabled INTEGER NOT NULL DEFAULT 1,
    audio_visual_microphone_enabled INTEGER NOT NULL DEFAULT 1,
    audio_visual_permission_state TEXT NOT NULL DEFAULT 'idle',
    audio_visual_last_recording_mode TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`

const createAudioVisualRecordingsTableSql = `
  CREATE TABLE IF NOT EXISTS audio_visual_recordings (
    owner_user_id TEXT NOT NULL REFERENCES users(id),
    id TEXT NOT NULL,
    recording_type TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_extension TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    duration_seconds REAL,
    storage_path TEXT NOT NULL,
    uploader_username TEXT NOT NULL,
    captured_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    PRIMARY KEY (owner_user_id, id)
  )
`

const createBringIntegrationsTableSql = `
  CREATE TABLE IF NOT EXISTS bring_integrations (
    owner_user_id TEXT NOT NULL PRIMARY KEY REFERENCES users(id),
    bring_username TEXT NOT NULL,
    encrypted_password_json TEXT,
    selected_list_uuid TEXT,
    selected_list_name TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`

const createRoborockIntegrationsTableSql = `
  CREATE TABLE IF NOT EXISTS roborock_integrations (
    owner_user_id TEXT NOT NULL PRIMARY KEY REFERENCES users(id),
    roborock_email TEXT NOT NULL,
    encrypted_session_json TEXT,
    base_url TEXT,
    selected_device_duid TEXT,
    selected_device_name TEXT,
    selected_device_model TEXT,
    selected_routine_id INTEGER,
    selected_routine_name TEXT,
    connection_status TEXT NOT NULL DEFAULT 'not_configured',
    last_connected_at TEXT,
    last_validated_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`

const createBringListSnapshotsTableSql = `
  CREATE TABLE IF NOT EXISTS bring_list_snapshots (
    owner_user_id TEXT NOT NULL PRIMARY KEY REFERENCES users(id),
    list_uuid TEXT NOT NULL,
    snapshot_json TEXT NOT NULL,
    refreshed_at TEXT NOT NULL,
    stale_at TEXT,
    updated_at TEXT NOT NULL
  )
`

const createAssistantBackendRoutesTableSql = `
  CREATE TABLE IF NOT EXISTS assistant_backend_routes (
    id TEXT PRIMARY KEY,
    owner_user_id TEXT NOT NULL REFERENCES users(id),
    label TEXT NOT NULL,
    backend_kind TEXT NOT NULL,
    base_url TEXT NOT NULL,
    model_identifier TEXT NOT NULL,
    api_key TEXT,
    headers_json TEXT NOT NULL DEFAULT '{}',
    is_enabled INTEGER NOT NULL DEFAULT 1,
    is_default INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 0,
    supports_streaming INTEGER NOT NULL DEFAULT 1,
    supports_tools INTEGER NOT NULL DEFAULT 1,
    supports_markdown INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'not_configured',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`

const createAssistantThreadsTableSql = `
  CREATE TABLE IF NOT EXISTS assistant_threads (
    owner_user_id TEXT NOT NULL REFERENCES users(id),
    id TEXT NOT NULL,
    route_id TEXT REFERENCES assistant_backend_routes(id),
    title TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (owner_user_id, id)
  )
`

const createAssistantMessagesTableSql = `
  CREATE TABLE IF NOT EXISTS assistant_messages (
    owner_user_id TEXT NOT NULL REFERENCES users(id),
    id TEXT NOT NULL,
    thread_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    sequence_index INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (owner_user_id, id),
    FOREIGN KEY (owner_user_id, thread_id)
      REFERENCES assistant_threads(owner_user_id, id)
      ON DELETE CASCADE
  )
`

const createAssistantMessageEventsTableSql = `
  CREATE TABLE IF NOT EXISTS assistant_message_events (
    owner_user_id TEXT NOT NULL REFERENCES users(id),
    id TEXT NOT NULL,
    thread_id TEXT NOT NULL,
    message_id TEXT,
    event_type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (owner_user_id, id),
    FOREIGN KEY (owner_user_id, thread_id)
      REFERENCES assistant_threads(owner_user_id, id)
      ON DELETE CASCADE,
    FOREIGN KEY (owner_user_id, message_id)
      REFERENCES assistant_messages(owner_user_id, id)
      ON DELETE CASCADE
  )
`

const createAssistantToolApprovalRequestsTableSql = `
  CREATE TABLE IF NOT EXISTS assistant_tool_approval_requests (
    owner_user_id TEXT NOT NULL REFERENCES users(id),
    id TEXT NOT NULL,
    thread_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    tool_call_id TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    server_name TEXT NOT NULL,
    widget_id TEXT,
    widget_title TEXT,
    source_location TEXT,
    widget_tool_json TEXT NOT NULL,
    arguments_json TEXT NOT NULL,
    redact_arguments INTEGER NOT NULL DEFAULT 1,
    redact_results INTEGER NOT NULL DEFAULT 1,
    state TEXT NOT NULL DEFAULT 'pending',
    expires_at TEXT NOT NULL,
    resolved_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (owner_user_id, id),
    FOREIGN KEY (owner_user_id, thread_id)
      REFERENCES assistant_threads(owner_user_id, id)
      ON DELETE CASCADE,
    FOREIGN KEY (owner_user_id, message_id)
      REFERENCES assistant_messages(owner_user_id, id)
      ON DELETE CASCADE
  )
`

const defaultAppUserId = ensureInitialUserRecord()

migrateOwnedTable({
  tableName: 'family_members',
  createTableSql: createFamilyMembersTableSql,
  copyColumns: ['id', 'first_name', 'color', 'created_at', 'updated_at'],
  expectedPrimaryKeyColumns: ['owner_user_id', 'id'],
  defaultOwnerUserId: defaultAppUserId,
})

migrateOwnedTable({
  tableName: 'widgets',
  createTableSql: createWidgetsTableSql,
  copyColumns: [
    'id',
    'title',
    'subway_letter',
    'subway_color',
    'source_location',
    'user_scope_mode',
    'user_scope_member_ids',
    'placement_zones',
    'created_at',
    'updated_at',
  ],
  expectedPrimaryKeyColumns: ['owner_user_id', 'id'],
  defaultOwnerUserId: defaultAppUserId,
})

migrateOwnedTable({
  tableName: 'calendar_events',
  createTableSql: createCalendarEventsTableSql,
  copyColumns: [
    'id',
    'time_label',
    'title',
    'location',
    'note',
    'member_ids',
    'created_at',
    'updated_at',
  ],
  expectedPrimaryKeyColumns: ['owner_user_id', 'id'],
  defaultOwnerUserId: defaultAppUserId,
})

migrateOwnedTable({
  tableName: 'todo_items',
  createTableSql: createTodoItemsTableSql,
  copyColumns: [
    'id',
    'task',
    'due_label',
    'lane',
    'member_ids',
    'is_done',
    'created_at',
    'updated_at',
  ],
  expectedPrimaryKeyColumns: ['owner_user_id', 'id'],
  defaultOwnerUserId: defaultAppUserId,
})

migrateOwnedTable({
  tableName: 'widget_settings',
  createTableSql: createWidgetSettingsTableSql,
  copyColumns: ['widget_id', 'settings_json', 'created_at', 'updated_at'],
  expectedPrimaryKeyColumns: ['owner_user_id', 'widget_id'],
  defaultOwnerUserId: defaultAppUserId,
})

db.exec(createAppPreferencesTableSql)
db.exec(createAudioVisualRecordingsTableSql)
db.exec(createBringIntegrationsTableSql)
db.exec(createRoborockIntegrationsTableSql)
db.exec(createBringListSnapshotsTableSql)
db.exec(createAssistantBackendRoutesTableSql)
db.exec(createAssistantThreadsTableSql)
db.exec(createAssistantMessagesTableSql)
db.exec(createAssistantMessageEventsTableSql)
db.exec(createAssistantToolApprovalRequestsTableSql)
db.exec(`
  CREATE INDEX IF NOT EXISTS audio_visual_recordings_owner_deleted_created_idx
  ON audio_visual_recordings(owner_user_id, deleted_at, created_at)
`)
db.exec(`
  CREATE INDEX IF NOT EXISTS assistant_threads_owner_updated_idx
  ON assistant_threads(owner_user_id, updated_at)
`)
db.exec(`
  CREATE INDEX IF NOT EXISTS assistant_messages_owner_thread_sequence_idx
  ON assistant_messages(owner_user_id, thread_id, sequence_index)
`)
db.exec(`
  CREATE INDEX IF NOT EXISTS assistant_message_events_owner_thread_created_idx
  ON assistant_message_events(owner_user_id, thread_id, created_at)
`)
db.exec(`
  CREATE INDEX IF NOT EXISTS assistant_tool_approval_requests_owner_state_expires_idx
  ON assistant_tool_approval_requests(owner_user_id, state, expires_at)
`)

if (!hasColumn('assistant_backend_routes', 'owner_user_id')) {
  db.exec('ALTER TABLE assistant_backend_routes ADD COLUMN owner_user_id TEXT REFERENCES users(id)')
}

db.prepare(`
  UPDATE assistant_backend_routes
  SET owner_user_id = ?
  WHERE owner_user_id IS NULL OR TRIM(owner_user_id) = ''
`).run(defaultAppUserId)

if (!hasColumn('assistant_backend_routes', 'is_default')) {
  db.exec('ALTER TABLE assistant_backend_routes ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0')
  db.exec(`
    UPDATE assistant_backend_routes
    SET is_default = CASE WHEN is_active = 1 THEN 1 ELSE 0 END
  `)
}

db.exec(`
  CREATE INDEX IF NOT EXISTS assistant_backend_routes_owner_updated_idx
  ON assistant_backend_routes(owner_user_id, updated_at)
`)
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS assistant_backend_routes_owner_default_idx
  ON assistant_backend_routes(owner_user_id)
  WHERE is_default = 1
`)

if (!hasColumn('assistant_backend_routes', 'api_key')) {
  db.exec('ALTER TABLE assistant_backend_routes ADD COLUMN api_key TEXT')
}

if (!hasColumn('assistant_backend_routes', 'headers_json')) {
  db.exec("ALTER TABLE assistant_backend_routes ADD COLUMN headers_json TEXT NOT NULL DEFAULT '{}' ")
}

const migrateCalendarEventsFoundation = () => {
  if (!hasColumn('calendar_events', 'event_date')) {
    db.exec('ALTER TABLE calendar_events ADD COLUMN event_date TEXT')
  }

  if (!hasColumn('calendar_events', 'location_city')) {
    db.exec('ALTER TABLE calendar_events ADD COLUMN location_city TEXT')
  }

  if (!hasColumn('calendar_events', 'location_country')) {
    db.exec('ALTER TABLE calendar_events ADD COLUMN location_country TEXT')
  }

  if (!hasColumn('calendar_events', 'recurrence_rule_json')) {
    db.exec('ALTER TABLE calendar_events ADD COLUMN recurrence_rule_json TEXT')
  }

  const calendarRows = db
    .prepare(`
      SELECT
        owner_user_id,
        id,
        time_label,
        event_date,
        location,
        location_city,
        location_country,
        recurrence_rule_json,
        updated_at
      FROM calendar_events
    `)
    .all()

  const updateCalendarFoundation = db.prepare(`
    UPDATE calendar_events
    SET
      time_label = ?,
      event_date = ?,
      location = ?,
      location_city = ?,
      location_country = ?,
      recurrence_rule_json = ?,
      updated_at = ?
    WHERE owner_user_id = ? AND id = ?
  `)

  db.exec('BEGIN')

  try {
    for (const row of calendarRows) {
      const eventDate = normalizeIsoDate(row.event_date)
      const locationCity = sanitizeCalendarText(
        row.location_city,
        sanitizeCalendarText(row.location, 'Unknown location'),
      )
      const locationCountry = normalizeCountryCode(row.location_country)
      const recurrenceRuleJson = JSON.stringify(
        parseRecurrenceRuleJson(row.recurrence_rule_json, eventDate),
      )
      const updatedAt = typeof row.updated_at === 'string' ? row.updated_at : new Date().toISOString()

      updateCalendarFoundation.run(
        normalizeTimeLabel(row.time_label),
        eventDate,
        buildCalendarDisplayLocation(locationCity, locationCountry),
        locationCity,
        locationCountry,
        recurrenceRuleJson,
        updatedAt,
        row.owner_user_id,
        row.id,
      )
    }

    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

const migrateCalendarEventsExcludedDatesAndCancelled = () => {
  if (!hasColumn('calendar_events', 'excluded_dates_json')) {
    db.exec('ALTER TABLE calendar_events ADD COLUMN excluded_dates_json TEXT DEFAULT \'[]\'')
  }

  if (!hasColumn('calendar_events', 'cancelled')) {
    db.exec('ALTER TABLE calendar_events ADD COLUMN cancelled INTEGER DEFAULT 0')
  }
}

const migrateAppPreferencesFoundation = () => {
  if (!hasColumn('app_preferences', 'country_code')) {
    db.exec('ALTER TABLE app_preferences ADD COLUMN country_code TEXT')
  }

  if (!hasColumn('app_preferences', 'audio_visual_camera_enabled')) {
    db.exec(
      'ALTER TABLE app_preferences ADD COLUMN audio_visual_camera_enabled INTEGER NOT NULL DEFAULT 1',
    )
  }

  if (!hasColumn('app_preferences', 'audio_visual_microphone_enabled')) {
    db.exec(
      'ALTER TABLE app_preferences ADD COLUMN audio_visual_microphone_enabled INTEGER NOT NULL DEFAULT 1',
    )
  }

  if (!hasColumn('app_preferences', 'audio_visual_permission_state')) {
    db.exec(
      "ALTER TABLE app_preferences ADD COLUMN audio_visual_permission_state TEXT NOT NULL DEFAULT 'idle'",
    )
  }

  if (!hasColumn('app_preferences', 'audio_visual_last_recording_mode')) {
    db.exec('ALTER TABLE app_preferences ADD COLUMN audio_visual_last_recording_mode TEXT')
  }

  db
    .prepare(`
      UPDATE app_preferences
      SET country_code = ?
      WHERE country_code IS NULL OR TRIM(country_code) = ''
    `)
    .run(DEFAULT_COUNTRY_CODE)

  db
    .prepare(`
      UPDATE app_preferences
      SET audio_visual_permission_state = 'idle'
      WHERE audio_visual_permission_state IS NULL
        OR TRIM(audio_visual_permission_state) = ''
        OR audio_visual_permission_state NOT IN ('idle', 'requesting', 'granted', 'denied', 'unsupported', 'error')
    `)
    .run()

  db
    .prepare(`
      UPDATE app_preferences
      SET audio_visual_last_recording_mode = NULL
      WHERE audio_visual_last_recording_mode IS NOT NULL
        AND audio_visual_last_recording_mode NOT IN ('video', 'audio')
    `)
    .run()
}

const migrateRoborockIntegrationsFoundation = () => {
  if (!hasColumn('roborock_integrations', 'selected_device_duid')) {
    db.exec('ALTER TABLE roborock_integrations ADD COLUMN selected_device_duid TEXT')
  }

  if (!hasColumn('roborock_integrations', 'selected_device_name')) {
    db.exec('ALTER TABLE roborock_integrations ADD COLUMN selected_device_name TEXT')
  }

  if (!hasColumn('roborock_integrations', 'selected_device_model')) {
    db.exec('ALTER TABLE roborock_integrations ADD COLUMN selected_device_model TEXT')
  }

  if (!hasColumn('roborock_integrations', 'selected_routine_id')) {
    db.exec('ALTER TABLE roborock_integrations ADD COLUMN selected_routine_id INTEGER')
  }

  if (!hasColumn('roborock_integrations', 'selected_routine_name')) {
    db.exec('ALTER TABLE roborock_integrations ADD COLUMN selected_routine_name TEXT')
  }

  db
    .prepare(`
      UPDATE roborock_integrations
      SET connection_status = 'not_configured'
      WHERE connection_status IS NULL
        OR TRIM(connection_status) = ''
        OR connection_status NOT IN ('not_configured', 'connected', 'reconnect_required')
    `)
    .run()
}

migrateCalendarEventsFoundation()
migrateCalendarEventsExcludedDatesAndCancelled()
migrateAppPreferencesFoundation()
migrateRoborockIntegrationsFoundation()

const todayIsoDate = getTodayIsoDate()

const seedMembers = [
  { id: 'family-1', firstName: 'Alex', color: '#2850ad' },
  { id: 'family-2', firstName: 'Bianca', color: '#b933ad' },
  { id: 'family-3', firstName: 'Chris', color: '#5d748f' },
  { id: 'family-4', firstName: 'Dana', color: '#fccc0a' },
]

const seedWidgets = [
  {
    id: 'arrival-board',
    title: 'Arrival Board',
    subwayLetter: 'A',
    subwayColor: '#4aa8ff',
    sourceLocation: 'arrival-board',
    userScope: { mode: 'all', memberIds: [] },
    placementZones: [{ zoneId: 'service-board', order: 1 }],
  },
  {
    id: 'weather',
    title: 'Weather',
    subwayLetter: 'W',
    subwayColor: '#fccc0a',
    sourceLocation: 'weather',
    userScope: { mode: 'all', memberIds: [] },
    placementZones: [{ zoneId: 'a1', order: 1 }],
  },
  {
    id: 'calendar',
    title: 'Calendar',
    subwayLetter: 'C',
    subwayColor: '#ff6319',
    sourceLocation: 'calendar',
    userScope: { mode: 'members', memberIds: ['family-1', 'family-2'] },
    placementZones: [{ zoneId: 'b1', order: 1 }],
  },
  {
    id: 'todo',
    title: 'Todo',
    subwayLetter: 'T',
    subwayColor: '#4edbe8',
    sourceLocation: 'todo',
    userScope: {
      mode: 'members',
      memberIds: ['family-1', 'family-2', 'family-3', 'family-4'],
    },
    placementZones: [{ zoneId: 'a2', order: 1 }],
  },
  {
    id: 'ui-benchmark',
    title: 'UI Benchmark',
    subwayLetter: 'B',
    subwayColor: '#34d399',
    sourceLocation: 'ui-benchmark',
    userScope: { mode: 'all', memberIds: [] },
    placementZones: [{ zoneId: 'b2', order: 1 }],
  },
  {
    id: 'youtube',
    title: 'YouTube',
    subwayLetter: 'Y',
    subwayColor: '#ff0000',
    sourceLocation: 'youtube',
    userScope: { mode: 'all', memberIds: [] },
    placementZones: [{ zoneId: 'b3', order: 1 }],
  },
  {
    id: 'audio-visual',
    title: 'Audio Visual',
    subwayLetter: 'V',
    subwayColor: '#8b5cf6',
    sourceLocation: 'audio-visual',
    userScope: { mode: 'all', memberIds: [] },
    placementZones: [{ zoneId: 'a3', order: 1 }],
  },
  {
    id: 'bring',
    title: 'Bring',
    subwayLetter: 'G',
    subwayColor: '#7ac943',
    sourceLocation: 'bring',
    userScope: { mode: 'all', memberIds: [] },
    placementZones: [{ zoneId: 'service-board', order: 2 }],
  },
  {
    id: 'roborock',
    title: 'Roborock',
    subwayLetter: 'R',
    subwayColor: '#ff6b35',
    sourceLocation: 'roborock',
    userScope: { mode: 'all', memberIds: [] },
    placementZones: [],
  },
  {
    id: 'assistant',
    title: 'Assistant',
    subwayLetter: 'A',
    subwayColor: '#7ef0c8',
    sourceLocation: 'assistant',
    userScope: { mode: 'all', memberIds: [] },
    placementZones: [{ zoneId: 'service-board', order: 3 }],
  },
]

const allowedWidgetSourceLocations = new Set(
  seedWidgets.map((widget) => widget.sourceLocation),
)

const allowedWidgetIds = new Set(seedWidgets.map((widget) => widget.id))

const LEGACY_MOCK_CALENDAR_EVENT_IDS = new Set([
  'calendar-household-sync',
  'calendar-alex-breakfast',
  'calendar-bianca-studio',
  'calendar-chris-package',
  'calendar-dana-dinner',
])

const loadLocalCalendarSeedEvents = () => {
  if (!existsSync(localCalendarSeedEventsPath)) {
    return []
  }

  try {
    const parsedValue = JSON.parse(readFileSync(localCalendarSeedEventsPath, 'utf8'))

    return Array.isArray(parsedValue) ? parsedValue : []
  } catch {
    return []
  }
}

const seedCalendarEvents = loadLocalCalendarSeedEvents()

const seedTodoItems = [
  {
    id: 'todo-alex-intercom',
    task: 'Charge hallway intercom panel',
    dueLabel: 'Due before 08:00',
    lane: 'Maintenance lane',
    memberIds: ['family-1'],
    isDone: 0,
  },
  {
    id: 'todo-bianca-gallery',
    task: 'Upload revised gallery shots',
    dueLabel: 'Due by 11:30',
    lane: 'Work queue',
    memberIds: ['family-2'],
    isDone: 0,
  },
  {
    id: 'todo-chris-pantry',
    task: 'Restock pantry and dish tabs',
    dueLabel: 'Due by 16:00',
    lane: 'Household errands',
    memberIds: ['family-3'],
    isDone: 0,
  },
  {
    id: 'todo-household-ambient',
    task: 'Set ambient scene for evening mode',
    dueLabel: 'Due before 19:00',
    lane: 'Display and lights',
    memberIds: ['*'],
    isDone: 0,
  },
]

const weatherCodeMap = new Map([
  [0, 'Clear sky'],
  [1, 'Mainly clear'],
  [2, 'Partly cloudy'],
  [3, 'Overcast'],
  [45, 'Fog'],
  [48, 'Depositing rime fog'],
  [51, 'Light drizzle'],
  [53, 'Drizzle'],
  [55, 'Dense drizzle'],
  [61, 'Slight rain'],
  [63, 'Rain'],
  [65, 'Heavy rain'],
  [71, 'Slight snow'],
  [73, 'Snow'],
  [75, 'Heavy snow'],
  [80, 'Rain showers'],
  [81, 'Rain showers'],
  [82, 'Heavy showers'],
  [95, 'Thunderstorm'],
  [96, 'Thunderstorm with hail'],
  [99, 'Severe thunderstorm'],
])

const weatherCache = new Map()

const getFamilyMemberCount = (ownerUserId) =>
  db
    .prepare('SELECT COUNT(*) AS count FROM family_members WHERE owner_user_id = ?')
    .get(ownerUserId).count

const getWidgetCount = (ownerUserId) =>
  db.prepare('SELECT COUNT(*) AS count FROM widgets WHERE owner_user_id = ?').get(ownerUserId)
    .count

const getCalendarEventCount = (ownerUserId) =>
  db
    .prepare('SELECT COUNT(*) AS count FROM calendar_events WHERE owner_user_id = ?')
    .get(ownerUserId).count

const getTodoItemCount = (ownerUserId) =>
  db.prepare('SELECT COUNT(*) AS count FROM todo_items WHERE owner_user_id = ?').get(ownerUserId)
    .count

const insertFamilyMember = (ownerUserId, id, firstName, color, createdAt, updatedAt) =>
  db
    .prepare(`
      INSERT INTO family_members (owner_user_id, id, first_name, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .run(ownerUserId, id, firstName, color, createdAt, updatedAt)

const insertWidget = (ownerUserId, widget, createdAt, updatedAt) =>
  db
    .prepare(`
      INSERT INTO widgets (
        owner_user_id,
        id,
        title,
        subway_letter,
        subway_color,
        source_location,
        user_scope_mode,
        user_scope_member_ids,
        placement_zones,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      ownerUserId,
      widget.id,
      widget.title,
      widget.subwayLetter,
      widget.subwayColor,
      widget.sourceLocation,
      widget.userScope.mode,
      JSON.stringify(widget.userScope.memberIds),
      JSON.stringify(widget.placementZones),
      createdAt,
      updatedAt,
    )

const insertCalendarEvent = (ownerUserId, calendarEvent, createdAt, updatedAt) => {
  const eventDate = normalizeIsoDate(calendarEvent.date)
  const locationCity = sanitizeCalendarText(
    calendarEvent.locationCity,
    sanitizeCalendarText(calendarEvent.location, 'Unknown location'),
  )
  const locationCountry = normalizeCountryCode(calendarEvent.locationCountry)
  const recurrenceRuleJson = JSON.stringify(
    normalizeRecurrenceRule(calendarEvent.recurrence, eventDate),
  )
  const excludedDatesJson = JSON.stringify(Array.isArray(calendarEvent.excludedDates) ? calendarEvent.excludedDates : [])
  const cancelled = calendarEvent.cancelled ? 1 : 0

  return db
    .prepare(`
      INSERT INTO calendar_events (
        owner_user_id,
        id,
        time_label,
        event_date,
        title,
        location,
        location_city,
        location_country,
        note,
        member_ids,
        recurrence_rule_json,
        excluded_dates_json,
        cancelled,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      ownerUserId,
      calendarEvent.id,
      normalizeTimeLabel(calendarEvent.timeLabel),
      eventDate,
      calendarEvent.title,
      buildCalendarDisplayLocation(locationCity, locationCountry),
      locationCity,
      locationCountry,
      calendarEvent.note,
      JSON.stringify(calendarEvent.memberIds),
      recurrenceRuleJson,
      excludedDatesJson,
      cancelled,
      createdAt,
      updatedAt,
    )
}

const updateCalendarEventRecord = (ownerUserId, calendarEventId, calendarEvent, updatedAt) => {
  const eventDate = normalizeIsoDate(calendarEvent.date)
  const locationCity = sanitizeCalendarText(calendarEvent.locationCity, 'Unknown location')
  const locationCountry = normalizeCountryCode(calendarEvent.locationCountry)
  const recurrenceRuleJson = JSON.stringify(
    normalizeRecurrenceRule(calendarEvent.recurrence, eventDate),
  )
  const excludedDatesJson = JSON.stringify(Array.isArray(calendarEvent.excludedDates) ? calendarEvent.excludedDates : [])
  const cancelled = calendarEvent.cancelled ? 1 : 0

  return db
    .prepare(`
      UPDATE calendar_events
      SET time_label = ?,
          event_date = ?,
          title = ?,
          location = ?,
          location_city = ?,
          location_country = ?,
          note = ?,
          member_ids = ?,
          recurrence_rule_json = ?,
          excluded_dates_json = ?,
          cancelled = ?,
          updated_at = ?
      WHERE owner_user_id = ? AND id = ?
    `)
    .run(
      normalizeTimeLabel(calendarEvent.timeLabel),
      eventDate,
      calendarEvent.title,
      buildCalendarDisplayLocation(locationCity, locationCountry),
      locationCity,
      locationCountry,
      calendarEvent.note,
      JSON.stringify(calendarEvent.memberIds),
      recurrenceRuleJson,
      excludedDatesJson,
      cancelled,
      updatedAt,
      ownerUserId,
      calendarEventId,
    )
}

const deleteCalendarEventById = (ownerUserId, calendarEventId) =>
  db
    .prepare('DELETE FROM calendar_events WHERE owner_user_id = ? AND id = ?')
    .run(ownerUserId, calendarEventId)

const insertTodoItem = (ownerUserId, todoItem, createdAt, updatedAt) =>
  db
    .prepare(`
      INSERT INTO todo_items (
        owner_user_id,
        id,
        task,
        due_label,
        lane,
        member_ids,
        is_done,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      ownerUserId,
      todoItem.id,
      todoItem.task,
      todoItem.dueLabel,
      todoItem.lane,
      JSON.stringify(todoItem.memberIds),
      todoItem.isDone,
      createdAt,
      updatedAt,
    )

const selectAllWidgetSettings = (ownerUserId) =>
  db
    .prepare(`
      SELECT widget_id AS widgetId, settings_json, updated_at
      FROM widget_settings
      WHERE owner_user_id = ?
      ORDER BY widget_id ASC
    `)
    .all(ownerUserId)
    .map((row) => ({
      widgetId: row.widgetId,
      updatedAt: row.updated_at,
      settings: (() => {
        try {
          const parsedValue = JSON.parse(row.settings_json)

          return parsedValue && typeof parsedValue === 'object' ? parsedValue : {}
        } catch {
          return {}
        }
      })(),
    }))

const upsertWidgetSettings = (ownerUserId, widgetId, settingsJson, timestamp) =>
  db
    .prepare(`
      INSERT INTO widget_settings (owner_user_id, widget_id, settings_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(owner_user_id, widget_id) DO UPDATE SET
        settings_json = excluded.settings_json,
        updated_at = excluded.updated_at
    `)
    .run(ownerUserId, widgetId, settingsJson, timestamp, timestamp)

const selectWidgetSettingsByWidgetId = (ownerUserId, widgetId) =>
  selectAllWidgetSettings(ownerUserId).find((entry) => entry.widgetId === widgetId) ?? null

const readAssistantWidgetSettings = (ownerUserId, widgetId) =>
  selectWidgetSettingsByWidgetId(ownerUserId, widgetId)?.settings ?? {}

const parseAssistantJsonStringArgument = (value, fallback) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fallback
  }

  try {
    return JSON.parse(value)
  } catch {
    throw new AssistantRuntimeError(
      'Assistant tool JSON string argument is invalid.',
      400,
      'assistant_tool_arguments_invalid',
    )
  }
}

const updateAssistantWidgetSettings = (ownerUserId, widgetId, settings) => {
  const timestamp = new Date().toISOString()
  upsertWidgetSettings(ownerUserId, widgetId, JSON.stringify(settings), timestamp)

  return {
    widgetId,
    settings,
    updatedAt: timestamp,
  }
}

const selectBringIntegrationRow = (ownerUserId) =>
  db
    .prepare(`
      SELECT
        bring_username,
        encrypted_password_json,
        selected_list_uuid,
        selected_list_name,
        updated_at
      FROM bring_integrations
      WHERE owner_user_id = ?
    `)
    .get(ownerUserId)

const selectBringSettings = (ownerUserId) => {
  const row = selectBringIntegrationRow(ownerUserId)

  return {
    username: sanitizeBringUsername(row?.bring_username),
    hasStoredPassword:
      typeof row?.encrypted_password_json === 'string' && row.encrypted_password_json.length > 0,
    selectedListUuid: normalizeBringListUuid(row?.selected_list_uuid),
    selectedListName: sanitizeBringListName(row?.selected_list_name),
    updatedAt: typeof row?.updated_at === 'string' ? row.updated_at : null,
  }
}

const upsertBringIntegration = (
  ownerUserId,
  bringUsername,
  encryptedPasswordJson,
  selectedListUuid,
  selectedListName,
  timestamp,
) =>
  db
    .prepare(`
      INSERT INTO bring_integrations (
        owner_user_id,
        bring_username,
        encrypted_password_json,
        selected_list_uuid,
        selected_list_name,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(owner_user_id) DO UPDATE SET
        bring_username = excluded.bring_username,
        encrypted_password_json = excluded.encrypted_password_json,
        selected_list_uuid = excluded.selected_list_uuid,
        selected_list_name = excluded.selected_list_name,
        updated_at = excluded.updated_at
    `)
    .run(
      ownerUserId,
      bringUsername,
      encryptedPasswordJson,
      selectedListUuid,
      selectedListName,
      timestamp,
      timestamp,
    )

const buildAssistantRoutePayload = (route) => {
  if (!route) {
    return null
  }

  return {
    id: route.id,
    label: sanitizeAssistantRouteLabel(route.label),
    backendKind: normalizeAssistantBackendKind(route.backendKind),
    supportsStreaming: Boolean(route.supportsStreaming),
    supportsTools: Boolean(route.supportsTools),
    supportsMarkdown: Boolean(route.supportsMarkdown),
    enabled: Boolean(route.enabled),
    isDefault: Boolean(route.isDefault),
  }
}

const buildAssistantRouteSettingsPayload = (route) => {
  if (!route) {
    return null
  }

  return {
    routeId: route.id,
    label: sanitizeAssistantRouteLabel(route.label),
    backendKind: normalizeAssistantBackendKind(route.backendKind),
    baseUrl: sanitizeAssistantBaseUrl(route.baseUrl),
    modelIdentifier: sanitizeAssistantModelIdentifier(route.modelIdentifier),
    hasStoredApiKey: typeof route.apiKey === 'string' && route.apiKey.length > 0,
    headersJson:
      typeof route.headersJson === 'string' && route.headersJson.trim().length > 0
        ? route.headersJson
        : '{}',
    enabled: route.enabled === true || route.enabled === 1,
    isDefault: route.isDefault === true || route.isDefault === 1,
    supportsStreaming: route.supportsStreaming === true || route.supportsStreaming === 1,
    supportsTools: route.supportsTools === true || route.supportsTools === 1,
    supportsMarkdown: route.supportsMarkdown === true || route.supportsMarkdown === 1,
    updatedAt: typeof route.updatedAt === 'string' ? route.updatedAt : null,
  }
}

const resolveAssistantRouteStatus = (route) => {
  if (!route) {
    return 'not_configured'
  }

  if (!route.enabled) {
    return 'disabled'
  }

  return isAssistantRouteConfigured(route) ? 'available' : 'unavailable'
}

const buildAssistantAvailabilityFromRoute = (route) => {
  const fallbackStatus = ASSISTANT_AVAILABILITY_STATUSES.has(route?.status)
    ? route.status
    : null

  if (!route) {
    return {
      status: 'not_configured',
      activeRoute: null,
    }
  }

  if (!route.enabled) {
    return {
      status: 'disabled',
      activeRoute: buildAssistantRoutePayload(route),
    }
  }

  if (!isAssistantRouteConfigured(route)) {
    return {
      status: fallbackStatus === 'disabled' ? 'disabled' : 'unavailable',
      activeRoute: buildAssistantRoutePayload(route),
    }
  }

  return {
    status: fallbackStatus && fallbackStatus !== 'not_configured' ? fallbackStatus : 'available',
    activeRoute: buildAssistantRoutePayload(route),
  }
}

const selectActiveAssistantBackendRouteRow = (ownerUserId) =>
  db
    .prepare(`
      SELECT
        id,
        owner_user_id AS ownerUserId,
        label,
        backend_kind AS backendKind,
        base_url AS baseUrl,
        model_identifier AS modelIdentifier,
        api_key AS apiKey,
        headers_json AS headersJson,
        is_enabled AS enabled,
        is_default AS isDefault,
        is_active AS isActive,
        supports_streaming AS supportsStreaming,
        supports_tools AS supportsTools,
        supports_markdown AS supportsMarkdown,
        status,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM assistant_backend_routes
      WHERE owner_user_id = ? AND is_default = 1
      ORDER BY updated_at DESC, id ASC
      LIMIT 1
    `)
    .get(ownerUserId)

const upsertAssistantBackendRoute = (ownerUserId, route, timestamp) =>
  db
    .prepare(`
      INSERT INTO assistant_backend_routes (
        id,
        owner_user_id,
        label,
        backend_kind,
        base_url,
        model_identifier,
        api_key,
        headers_json,
        is_enabled,
        is_default,
        is_active,
        supports_streaming,
        supports_tools,
        supports_markdown,
        status,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        owner_user_id = excluded.owner_user_id,
        label = excluded.label,
        backend_kind = excluded.backend_kind,
        base_url = excluded.base_url,
        model_identifier = excluded.model_identifier,
        api_key = excluded.api_key,
        headers_json = excluded.headers_json,
        is_enabled = excluded.is_enabled,
        is_default = excluded.is_default,
        is_active = excluded.is_active,
        supports_streaming = excluded.supports_streaming,
        supports_tools = excluded.supports_tools,
        supports_markdown = excluded.supports_markdown,
        status = excluded.status,
        updated_at = excluded.updated_at
    `)
    .run(
      route.id,
      ownerUserId,
      route.label,
      route.backendKind,
      route.baseUrl,
      route.modelIdentifier,
      route.apiKey ?? null,
      route.headersJson ?? '{}',
      normalizeAssistantBooleanFlag(route.enabled),
      normalizeAssistantBooleanFlag(route.isDefault),
      normalizeAssistantBooleanFlag(route.isActive),
      normalizeAssistantBooleanFlag(route.supportsStreaming),
      normalizeAssistantBooleanFlag(route.supportsTools),
      normalizeAssistantBooleanFlag(route.supportsMarkdown),
      route.status,
      timestamp,
      timestamp,
    )

const resolveConfiguredAssistantBackendRoute = () => {
  const route = {
    id: sanitizeAssistantThreadTitle(ASSISTANT_BACKEND_ROUTE_ID) || 'assistant-default-route',
    label: sanitizeAssistantRouteLabel(ASSISTANT_BACKEND_ROUTE_LABEL),
    backendKind: normalizeAssistantBackendKind(ASSISTANT_BACKEND_KIND),
    baseUrl: sanitizeAssistantBaseUrl(ASSISTANT_BACKEND_BASE_URL),
    modelIdentifier: sanitizeAssistantModelIdentifier(ASSISTANT_BACKEND_MODEL_IDENTIFIER),
    apiKey: typeof ASSISTANT_BACKEND_API_KEY === 'string' ? ASSISTANT_BACKEND_API_KEY : '',
    headersJson:
      typeof ASSISTANT_BACKEND_HEADERS_JSON === 'string' &&
      ASSISTANT_BACKEND_HEADERS_JSON.trim().length > 0
        ? ASSISTANT_BACKEND_HEADERS_JSON
        : '{}',
    enabled: ASSISTANT_BACKEND_ENABLED,
    isActive: true,
    supportsStreaming: ASSISTANT_BACKEND_SUPPORTS_STREAMING,
    supportsTools: ASSISTANT_BACKEND_SUPPORTS_TOOLS,
    supportsMarkdown: ASSISTANT_BACKEND_SUPPORTS_MARKDOWN,
    status: 'not_configured',
  }

  if (!route.label && !route.backendKind && !route.baseUrl && !route.modelIdentifier) {
    return null
  }

  route.status = route.enabled
    ? isAssistantRouteConfigured(route)
      ? 'available'
      : 'unavailable'
    : 'disabled'
  route.isDefault = true

  return route
}

const ensureConfiguredAssistantBackendRoutePresent = () => {
  if (selectActiveAssistantBackendRouteRow(defaultAppUserId)) {
    return
  }

  const configuredRoute = resolveConfiguredAssistantBackendRoute()

  if (!configuredRoute) {
    return
  }

  const timestamp = new Date().toISOString()

  db.exec('BEGIN')

  try {
    db
      .prepare('UPDATE assistant_backend_routes SET is_active = 0, is_default = 0, updated_at = ? WHERE owner_user_id = ?')
      .run(timestamp, defaultAppUserId)
    upsertAssistantBackendRoute(defaultAppUserId, configuredRoute, timestamp)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

const selectAssistantAvailability = (ownerUserId) =>
  buildAssistantAvailabilityFromRoute(selectActiveAssistantBackendRouteRow(ownerUserId))

const selectAssistantRoutes = (ownerUserId) =>
  db
    .prepare(`
      SELECT
        id,
        owner_user_id AS ownerUserId,
        label,
        backend_kind AS backendKind,
        base_url AS baseUrl,
        model_identifier AS modelIdentifier,
        api_key AS apiKey,
        headers_json AS headersJson,
        is_enabled AS enabled,
        is_default AS isDefault,
        is_active AS isActive,
        supports_streaming AS supportsStreaming,
        supports_tools AS supportsTools,
        supports_markdown AS supportsMarkdown,
        status,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM assistant_backend_routes
      WHERE owner_user_id = ?
      ORDER BY is_default DESC, updated_at DESC, id ASC
    `)
    .all(ownerUserId)
    .map(buildAssistantRouteSettingsPayload)

const selectAssistantThreads = (ownerUserId) =>
  db
    .prepare(`
      SELECT
        assistant_threads.id,
        assistant_threads.route_id AS routeId,
        assistant_threads.title,
        assistant_threads.state,
        assistant_threads.created_at AS createdAt,
        assistant_threads.updated_at AS updatedAt,
        COUNT(assistant_messages.id) AS messageCount
      FROM assistant_threads
      LEFT JOIN assistant_messages
        ON assistant_messages.owner_user_id = assistant_threads.owner_user_id
       AND assistant_messages.thread_id = assistant_threads.id
      WHERE assistant_threads.owner_user_id = ?
      GROUP BY assistant_threads.owner_user_id, assistant_threads.id
      ORDER BY assistant_threads.updated_at DESC, assistant_threads.id DESC
    `)
    .all(ownerUserId)
    .map((row) => ({
      id: row.id,
      routeId: typeof row.routeId === 'string' && row.routeId.length > 0 ? row.routeId : null,
      title: sanitizeAssistantThreadTitle(row.title),
      state: normalizeAssistantThreadState(row.state),
      messageCount: Number(row.messageCount) || 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }))

const selectAssistantThreadById = (ownerUserId, threadId) =>
  db
    .prepare(`
      SELECT
        id,
        route_id AS routeId,
        title,
        state,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM assistant_threads
      WHERE owner_user_id = ? AND id = ?
    `)
    .get(ownerUserId, threadId)

const selectAssistantBackendRouteById = (ownerUserId, routeId) =>
  db
    .prepare(`
      SELECT
        id,
        owner_user_id AS ownerUserId,
        label,
        backend_kind AS backendKind,
        base_url AS baseUrl,
        model_identifier AS modelIdentifier,
        api_key AS apiKey,
        headers_json AS headersJson,
        is_enabled AS enabled,
        is_default AS isDefault,
        is_active AS isActive,
        supports_streaming AS supportsStreaming,
        supports_tools AS supportsTools,
        supports_markdown AS supportsMarkdown,
        status,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM assistant_backend_routes
      WHERE owner_user_id = ? AND id = ?
      LIMIT 1
    `)
    .get(ownerUserId, routeId)

const selectAssistantSettings = (ownerUserId) => {
  const route = selectActiveAssistantBackendRouteRow(ownerUserId)

  return {
    routeId:
      route?.id ||
      sanitizeAssistantThreadTitle(ASSISTANT_BACKEND_ROUTE_ID) ||
      'assistant-default-route',
    label: sanitizeAssistantRouteLabel(route?.label),
    backendKind: normalizeAssistantBackendKind(route?.backendKind),
    baseUrl: sanitizeAssistantBaseUrl(route?.baseUrl),
    modelIdentifier: sanitizeAssistantModelIdentifier(route?.modelIdentifier),
    hasStoredApiKey: typeof route?.apiKey === 'string' && route.apiKey.length > 0,
    headersJson:
      typeof route?.headersJson === 'string' && route.headersJson.trim().length > 0
        ? route.headersJson
        : '{}',
    enabled: route?.enabled === true || route?.enabled === 1,
    isDefault: route?.isDefault === true || route?.isDefault === 1,
    supportsStreaming: route?.supportsStreaming === true || route?.supportsStreaming === 1,
    supportsTools: route?.supportsTools === true || route?.supportsTools === 1,
    supportsMarkdown: route?.supportsMarkdown === true || route?.supportsMarkdown === 1,
    updatedAt: typeof route?.updatedAt === 'string' ? route.updatedAt : null,
  }
}

const updateAssistantRouteActivation = (ownerUserId, routeId, timestamp) => {
  db.exec('BEGIN')

  try {
    db
      .prepare('UPDATE assistant_backend_routes SET is_active = 0, is_default = 0, updated_at = ? WHERE owner_user_id = ?')
      .run(timestamp, ownerUserId)
    db
      .prepare('UPDATE assistant_backend_routes SET is_active = 1, is_default = 1, updated_at = ? WHERE owner_user_id = ? AND id = ?')
      .run(timestamp, ownerUserId, routeId)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

const saveAssistantSettings = (ownerUserId, input) => {
  const currentRoute = selectActiveAssistantBackendRouteRow(ownerUserId)
  const routeId =
    sanitizeAssistantThreadTitle(input.routeId) ||
    sanitizeAssistantThreadTitle(currentRoute?.id) ||
    sanitizeAssistantThreadTitle(ASSISTANT_BACKEND_ROUTE_ID) ||
    'assistant-default-route'
  const label = sanitizeAssistantRouteLabel(input.label)
  const backendKind = normalizeAssistantBackendKind(input.backendKind)
  const baseUrl = sanitizeAssistantBaseUrl(input.baseUrl)
  const modelIdentifier = sanitizeAssistantModelIdentifier(input.modelIdentifier)
  const enabled = input.enabled !== false
  const supportsStreaming = input.supportsStreaming === true
  const supportsTools = input.supportsTools === true
  const supportsMarkdown = input.supportsMarkdown !== false

  if (!label) {
    throw new AssistantRuntimeError(
      'Assistant route label is required.',
      400,
      'assistant_settings_label_required',
    )
  }

  if (!backendKind) {
    throw new AssistantRuntimeError(
      'Assistant backend kind must be litellm or custom.',
      400,
      'assistant_settings_backend_kind_invalid',
    )
  }

  if (!baseUrl) {
    throw new AssistantRuntimeError(
      'Assistant backend base URL is required.',
      400,
      'assistant_settings_base_url_required',
    )
  }

  if (backendKind === 'litellm' && !modelIdentifier) {
    throw new AssistantRuntimeError(
      'Assistant model identifier is required for LiteLLM routes.',
      400,
      'assistant_settings_model_identifier_required',
    )
  }

  const headersJson =
    typeof input.headersJson === 'string' && input.headersJson.trim().length > 0
      ? input.headersJson.trim()
      : '{}'

  try {
    const parsedHeaders = JSON.parse(headersJson)

    if (!parsedHeaders || typeof parsedHeaders !== 'object' || Array.isArray(parsedHeaders)) {
      throw new Error('invalid')
    }
  } catch {
    throw new AssistantRuntimeError(
      'Assistant backend headers JSON must be a valid JSON object.',
      400,
      'assistant_settings_headers_invalid',
    )
  }

  const apiKey =
    typeof input.apiKey === 'string' && input.apiKey.length > 0
      ? input.apiKey
      : typeof currentRoute?.apiKey === 'string'
        ? currentRoute.apiKey
        : ''

  const timestamp = new Date().toISOString()

  const route = {
    id: routeId,
    label,
    backendKind,
    baseUrl,
    modelIdentifier,
    apiKey,
    headersJson,
    enabled,
    isDefault: true,
    isActive: true,
    supportsStreaming,
    supportsTools,
    supportsMarkdown,
    status: resolveAssistantRouteStatus({
      label,
      backendKind,
      baseUrl,
      modelIdentifier,
      enabled,
    }),
  }

  upsertAssistantBackendRoute(ownerUserId, route, timestamp)
  updateAssistantRouteActivation(ownerUserId, routeId, timestamp)

  return selectAssistantSettings(ownerUserId)
}

const createAssistantRoute = (ownerUserId, input) => {
  const currentDefaultRoute = selectActiveAssistantBackendRouteRow(ownerUserId)
  const routeId = sanitizeAssistantThreadTitle(input.routeId) || `assistant-route-${randomUUID()}`
  const label = sanitizeAssistantRouteLabel(input.label)
  const backendKind = normalizeAssistantBackendKind(input.backendKind)
  const baseUrl = sanitizeAssistantBaseUrl(input.baseUrl)
  const modelIdentifier = sanitizeAssistantModelIdentifier(input.modelIdentifier)
  const headersJson =
    typeof input.headersJson === 'string' && input.headersJson.trim().length > 0
      ? input.headersJson.trim()
      : '{}'
  const enabled = input.enabled !== false
  const isDefault = input.isDefault === true || !currentDefaultRoute
  const apiKey = typeof input.apiKey === 'string' ? input.apiKey : ''

  if (!label) {
    throw new AssistantRuntimeError('Assistant route label is required.', 400, 'assistant_settings_label_required')
  }

  if (!backendKind) {
    throw new AssistantRuntimeError('Assistant backend kind must be litellm or custom.', 400, 'assistant_settings_backend_kind_invalid')
  }

  if (!baseUrl) {
    throw new AssistantRuntimeError('Assistant backend base URL is required.', 400, 'assistant_settings_base_url_required')
  }

  if (backendKind === 'litellm' && !modelIdentifier) {
    throw new AssistantRuntimeError('Assistant model identifier is required for LiteLLM routes.', 400, 'assistant_settings_model_identifier_required')
  }

  try {
    const parsedHeaders = JSON.parse(headersJson)
    if (!parsedHeaders || typeof parsedHeaders !== 'object' || Array.isArray(parsedHeaders)) {
      throw new Error('invalid')
    }
  } catch {
    throw new AssistantRuntimeError('Assistant backend headers JSON must be a valid JSON object.', 400, 'assistant_settings_headers_invalid')
  }

  const timestamp = new Date().toISOString()
  const route = {
    id: routeId,
    label,
    backendKind,
    baseUrl,
    modelIdentifier,
    apiKey,
    headersJson,
    enabled,
    isDefault,
    isActive: isDefault,
    supportsStreaming: input.supportsStreaming === true,
    supportsTools: input.supportsTools === true,
    supportsMarkdown: input.supportsMarkdown !== false,
    status: resolveAssistantRouteStatus({
      label,
      backendKind,
      baseUrl,
      modelIdentifier,
      enabled,
    }),
  }

  upsertAssistantBackendRoute(ownerUserId, route, timestamp)

  if (isDefault) {
    updateAssistantRouteActivation(ownerUserId, routeId, timestamp)
  }

  return selectAssistantBackendRouteById(ownerUserId, routeId)
}

const updateAssistantRoute = (ownerUserId, routeId, input) => {
  const currentRoute = selectAssistantBackendRouteById(ownerUserId, routeId)

  if (!currentRoute) {
    throw new AssistantRuntimeError('Assistant route not found.', 404, 'assistant_route_not_found')
  }

  const label = sanitizeAssistantRouteLabel(input.label ?? currentRoute.label)
  const backendKind = normalizeAssistantBackendKind(input.backendKind ?? currentRoute.backendKind)
  const baseUrl = sanitizeAssistantBaseUrl(input.baseUrl ?? currentRoute.baseUrl)
  const modelIdentifier = sanitizeAssistantModelIdentifier(
    input.modelIdentifier ?? currentRoute.modelIdentifier,
  )
  const headersJson =
    typeof input.headersJson === 'string'
      ? input.headersJson.trim() || '{}'
      : currentRoute.headersJson ?? '{}'
  const enabled = input.enabled ?? Boolean(currentRoute.enabled)
  const isDefault = input.isDefault ?? Boolean(currentRoute.isDefault)
  const supportsStreaming = input.supportsStreaming ?? Boolean(currentRoute.supportsStreaming)
  const supportsTools = input.supportsTools ?? Boolean(currentRoute.supportsTools)
  const supportsMarkdown = input.supportsMarkdown ?? Boolean(currentRoute.supportsMarkdown)

  if (!label) {
    throw new AssistantRuntimeError('Assistant route label is required.', 400, 'assistant_settings_label_required')
  }

  if (!backendKind) {
    throw new AssistantRuntimeError('Assistant backend kind must be litellm or custom.', 400, 'assistant_settings_backend_kind_invalid')
  }

  if (!baseUrl) {
    throw new AssistantRuntimeError('Assistant backend base URL is required.', 400, 'assistant_settings_base_url_required')
  }

  if (backendKind === 'litellm' && !modelIdentifier) {
    throw new AssistantRuntimeError('Assistant model identifier is required for LiteLLM routes.', 400, 'assistant_settings_model_identifier_required')
  }

  try {
    const parsedHeaders = JSON.parse(headersJson)
    if (!parsedHeaders || typeof parsedHeaders !== 'object' || Array.isArray(parsedHeaders)) {
      throw new Error('invalid')
    }
  } catch {
    throw new AssistantRuntimeError('Assistant backend headers JSON must be a valid JSON object.', 400, 'assistant_settings_headers_invalid')
  }

  const timestamp = new Date().toISOString()
  const route = {
    id: routeId,
    label,
    backendKind,
    baseUrl,
    modelIdentifier,
    apiKey:
      typeof input.apiKey === 'string' && input.apiKey.length > 0
        ? input.apiKey
        : currentRoute.apiKey,
    headersJson,
    enabled,
    isDefault,
    isActive: isDefault,
    supportsStreaming,
    supportsTools,
    supportsMarkdown,
    status: resolveAssistantRouteStatus({
      label,
      backendKind,
      baseUrl,
      modelIdentifier,
      enabled,
    }),
  }

  upsertAssistantBackendRoute(ownerUserId, route, timestamp)

  if (isDefault) {
    updateAssistantRouteActivation(ownerUserId, routeId, timestamp)
  }

  return selectAssistantBackendRouteById(ownerUserId, routeId)
}

const setDefaultAssistantRoute = (ownerUserId, routeId) => {
  const route = selectAssistantBackendRouteById(ownerUserId, routeId)

  if (!route) {
    throw new AssistantRuntimeError('Assistant route not found.', 404, 'assistant_route_not_found')
  }

  const timestamp = new Date().toISOString()
  updateAssistantRouteActivation(ownerUserId, routeId, timestamp)
  updateAssistantBackendRouteStatus(routeId, resolveAssistantRouteStatus(route), timestamp)

  return buildAssistantRouteSettingsPayload(selectAssistantBackendRouteById(ownerUserId, routeId))
}

const deleteAssistantRoute = (ownerUserId, routeId) => {
  const route = selectAssistantBackendRouteById(ownerUserId, routeId)

  if (!route) {
    throw new AssistantRuntimeError('Assistant route not found.', 404, 'assistant_route_not_found')
  }

  db.prepare('DELETE FROM assistant_backend_routes WHERE owner_user_id = ? AND id = ?').run(ownerUserId, routeId)

  return routeId
}

const selectAssistantMessagesByThreadId = (ownerUserId, threadId) =>
  db
    .prepare(`
      SELECT
        id,
        thread_id AS threadId,
        role,
        content,
        sequence_index AS sequenceIndex,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM assistant_messages
      WHERE owner_user_id = ? AND thread_id = ?
      ORDER BY sequence_index ASC, created_at ASC, id ASC
    `)
    .all(ownerUserId, threadId)
    .map((row) => ({
      id: row.id,
      threadId: row.threadId,
      role: normalizeAssistantMessageRole(row.role),
      content: typeof row.content === 'string' ? row.content : '',
      sequenceIndex: Number(row.sequenceIndex) || 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }))

const selectAssistantMessageEventsByThreadId = (ownerUserId, threadId) =>
  db
    .prepare(`
      SELECT
        id,
        thread_id AS threadId,
        message_id AS messageId,
        event_type AS eventType,
        payload_json AS payloadJson,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM assistant_message_events
      WHERE owner_user_id = ? AND thread_id = ?
      ORDER BY created_at ASC, id ASC
    `)
    .all(ownerUserId, threadId)
    .map((row) => {
      let payload = {}

      try {
        payload = JSON.parse(row.payloadJson)
      } catch {
        payload = {}
      }

      return {
        id: row.id,
        threadId: row.threadId,
        messageId: typeof row.messageId === 'string' && row.messageId.length > 0 ? row.messageId : null,
        eventType: ASSISTANT_MESSAGE_EVENT_TYPES.has(row.eventType) ? row.eventType : 'tool_call',
        payload,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      }
    })

const selectWidgetToolCallEventsByWidgetId = (ownerUserId, widgetId) =>
  db
    .prepare(`
      SELECT
        assistant_message_events.id AS id,
        assistant_message_events.thread_id AS threadId,
        assistant_message_events.message_id AS messageId,
        assistant_message_events.event_type AS eventType,
        assistant_message_events.payload_json AS payloadJson,
        assistant_message_events.created_at AS createdAt,
        assistant_message_events.updated_at AS updatedAt,
        assistant_threads.title AS threadTitle
      FROM assistant_message_events
      LEFT JOIN assistant_threads
        ON assistant_threads.owner_user_id = assistant_message_events.owner_user_id
       AND assistant_threads.id = assistant_message_events.thread_id
      WHERE assistant_message_events.owner_user_id = ?
      ORDER BY assistant_message_events.created_at DESC, assistant_message_events.id DESC
    `)
    .all(ownerUserId)
    .flatMap((row) => {
      let payload = {}

      try {
        payload = JSON.parse(row.payloadJson)
      } catch {
        payload = {}
      }

      if (
        row.eventType !== 'tool_call' ||
        typeof payload.widgetId !== 'string' ||
        payload.widgetId !== widgetId
      ) {
        return []
      }

      return [
        {
          id: row.id,
          threadId: row.threadId,
          threadTitle:
            typeof row.threadTitle === 'string' && row.threadTitle.length > 0
              ? row.threadTitle
              : '',
          messageId:
            typeof row.messageId === 'string' && row.messageId.length > 0
              ? row.messageId
              : null,
          eventType: 'tool_call',
          payload,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
      ]
    })

const selectAssistantToolApprovalRequestById = (ownerUserId, approvalRequestId) =>
  db
    .prepare(`
      SELECT
        id,
        thread_id AS threadId,
        message_id AS messageId,
        tool_call_id AS toolCallId,
        tool_name AS toolName,
        server_name AS serverName,
        widget_id AS widgetId,
        widget_title AS widgetTitle,
        source_location AS sourceLocation,
        widget_tool_json AS widgetToolJson,
        arguments_json AS argumentsJson,
        redact_arguments AS redactArguments,
        redact_results AS redactResults,
        state,
        expires_at AS expiresAt,
        resolved_at AS resolvedAt,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM assistant_tool_approval_requests
      WHERE owner_user_id = ? AND id = ?
      LIMIT 1
    `)
    .get(ownerUserId, approvalRequestId)

const selectExpiredPendingAssistantToolApprovalRequests = (ownerUserId, nowIsoTimestamp) =>
  db
    .prepare(`
      SELECT
        id,
        thread_id AS threadId,
        message_id AS messageId,
        tool_call_id AS toolCallId,
        tool_name AS toolName,
        server_name AS serverName,
        widget_id AS widgetId,
        widget_title AS widgetTitle,
        source_location AS sourceLocation,
        widget_tool_json AS widgetToolJson,
        arguments_json AS argumentsJson,
        redact_arguments AS redactArguments,
        redact_results AS redactResults,
        state,
        expires_at AS expiresAt,
        resolved_at AS resolvedAt,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM assistant_tool_approval_requests
      WHERE owner_user_id = ?
        AND state = 'pending'
        AND expires_at <= ?
      ORDER BY expires_at ASC, id ASC
    `)
    .all(ownerUserId, nowIsoTimestamp)

const selectNextAssistantMessageSequenceIndex = (ownerUserId, threadId) => {
  const result = db
    .prepare(`
      SELECT COALESCE(MAX(sequence_index), -1) AS lastSequenceIndex
      FROM assistant_messages
      WHERE owner_user_id = ? AND thread_id = ?
    `)
    .get(ownerUserId, threadId)

  return Number(result?.lastSequenceIndex ?? -1) + 1
}

const insertAssistantThread = (ownerUserId, thread, createdAt, updatedAt) =>
  db
    .prepare(`
      INSERT INTO assistant_threads (
        owner_user_id,
        id,
        route_id,
        title,
        state,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      ownerUserId,
      thread.id,
      thread.routeId,
      thread.title,
      thread.state,
      createdAt,
      updatedAt,
    )

const deleteAssistantThreadById = (ownerUserId, threadId) =>
  db
    .prepare('DELETE FROM assistant_threads WHERE owner_user_id = ? AND id = ?')
    .run(ownerUserId, threadId)

const insertAssistantMessage = (ownerUserId, message, createdAt, updatedAt) =>
  db
    .prepare(`
      INSERT INTO assistant_messages (
        owner_user_id,
        id,
        thread_id,
        role,
        content,
        sequence_index,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      ownerUserId,
      message.id,
      message.threadId,
      message.role,
      message.content,
      message.sequenceIndex,
      createdAt,
      updatedAt,
    )

const insertAssistantMessageEvent = (ownerUserId, event, createdAt, updatedAt) =>
  db
    .prepare(`
      INSERT INTO assistant_message_events (
        owner_user_id,
        id,
        thread_id,
        message_id,
        event_type,
        payload_json,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      ownerUserId,
      event.id,
      event.threadId,
      event.messageId,
      event.eventType,
      event.payloadJson,
      createdAt,
      updatedAt,
    )

const insertAssistantToolApprovalRequest = (ownerUserId, approvalRequest, createdAt, updatedAt) =>
  db
    .prepare(`
      INSERT INTO assistant_tool_approval_requests (
        owner_user_id,
        id,
        thread_id,
        message_id,
        tool_call_id,
        tool_name,
        server_name,
        widget_id,
        widget_title,
        source_location,
        widget_tool_json,
        arguments_json,
        redact_arguments,
        redact_results,
        state,
        expires_at,
        resolved_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      ownerUserId,
      approvalRequest.id,
      approvalRequest.threadId,
      approvalRequest.messageId,
      approvalRequest.toolCallId,
      approvalRequest.toolName,
      approvalRequest.serverName,
      approvalRequest.widgetId,
      approvalRequest.widgetTitle,
      approvalRequest.sourceLocation,
      approvalRequest.widgetToolJson,
      approvalRequest.argumentsJson,
      approvalRequest.redactArguments ? 1 : 0,
      approvalRequest.redactResults ? 1 : 0,
      approvalRequest.state,
      approvalRequest.expiresAt,
      approvalRequest.resolvedAt,
      createdAt,
      updatedAt,
    )

const updateAssistantToolApprovalRequestState = (
  ownerUserId,
  approvalRequestId,
  state,
  resolvedAt,
  updatedAt,
) =>
  db
    .prepare(`
      UPDATE assistant_tool_approval_requests
      SET state = ?,
          resolved_at = ?,
          updated_at = ?
      WHERE owner_user_id = ? AND id = ?
    `)
    .run(state, resolvedAt, updatedAt, ownerUserId, approvalRequestId)

const updateAssistantThreadRuntimeState = (
  ownerUserId,
  threadId,
  routeId,
  title,
  updatedAt,
) =>
  db
    .prepare(`
      UPDATE assistant_threads
      SET route_id = ?,
          title = ?,
          updated_at = ?
      WHERE owner_user_id = ? AND id = ?
    `)
    .run(routeId, title, updatedAt, ownerUserId, threadId)

const updateAssistantBackendRouteStatus = (routeId, status, updatedAt) =>
  db
    .prepare(`
      UPDATE assistant_backend_routes
      SET status = ?,
          updated_at = ?
      WHERE id = ?
    `)
    .run(status, updatedAt, routeId)

const buildAssistantThreadDetailPayload = (ownerUserId, threadId) => {
  const thread = selectAssistantThreadById(ownerUserId, threadId)

  if (!thread) {
    throw new AssistantRuntimeError(
      'Assistant thread not found.',
      404,
      'assistant_thread_not_found',
    )
  }

  expireAssistantToolApprovals(ownerUserId)

  return {
    thread: buildAssistantThreadPayload(thread),
    messages: selectAssistantMessagesByThreadId(ownerUserId, threadId),
    events: selectAssistantMessageEventsByThreadId(ownerUserId, threadId).map(
      buildAssistantMessageEventPayload,
    ),
  }
}

const buildAssistantThreadPayload = (thread) => ({
  id: thread.id,
  routeId: typeof thread.routeId === 'string' && thread.routeId.length > 0 ? thread.routeId : null,
  title: sanitizeAssistantThreadTitle(thread.title),
  state: normalizeAssistantThreadState(thread.state),
  createdAt: thread.createdAt,
  updatedAt: thread.updatedAt,
})

const buildAssistantMessagePayload = (message) => ({
  id: message.id,
  threadId: message.threadId,
  role: normalizeAssistantMessageRole(message.role),
  content: typeof message.content === 'string' ? message.content : '',
  sequenceIndex: Number(message.sequenceIndex) || 0,
  createdAt: message.createdAt,
  updatedAt: message.updatedAt,
})

const buildAssistantMessageEventPayload = (event) => ({
  id: event.id,
  threadId: event.threadId,
  messageId: event.messageId,
  eventType: event.eventType,
  payload: event.payload,
  createdAt: event.createdAt,
  updatedAt: event.updatedAt,
})

const splitAssistantStreamingChunks = (content) => {
  const normalizedContent = typeof content === 'string' ? content : ''

  if (!normalizedContent) {
    return ['']
  }

  const tokenChunks = normalizedContent.match(/\S+\s*|\n+/g) ?? []

  if (tokenChunks.length > 0) {
    return tokenChunks
  }

  const fallbackChunks = []

  for (let index = 0; index < normalizedContent.length; index += 24) {
    fallbackChunks.push(normalizedContent.slice(index, index + 24))
  }

  return fallbackChunks.length > 0 ? fallbackChunks : ['']
}

const deriveAssistantThreadTitleFromPrompt = (content) =>
  sanitizeAssistantThreadTitle(content.split(/\r?\n/, 1)[0] ?? '')

class AssistantRuntimeError extends Error {
  constructor(message, statusCode, errorCode, providerStatusCode = null) {
    super(message)
    this.name = 'AssistantRuntimeError'
    this.statusCode = statusCode
    this.errorCode = errorCode
    this.providerStatusCode = providerStatusCode
  }
}

const redactAssistantToolValue = (value) => {
  if (value === null || value === undefined) {
    return value ?? null
  }

  if (typeof value === 'string') {
    return '[redacted]'
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return '[redacted]'
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactAssistantToolValue(entry))
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, redactAssistantToolValue(nestedValue)]),
    )
  }

  return '[redacted]'
}

const buildAssistantToolDisplayPayload = (value, shouldRedact) =>
  shouldRedact ? redactAssistantToolValue(value) : value

const buildAssistantProviderToolDefinitions = (widgetTools) =>
  widgetTools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.toolName,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: Object.fromEntries(
          tool.arguments.map((argumentDefinition) => [
            argumentDefinition.key,
            {
              type: argumentDefinition.type,
              description: argumentDefinition.description,
            },
          ]),
        ),
        required: tool.arguments
          .filter((argumentDefinition) => argumentDefinition.required)
          .map((argumentDefinition) => argumentDefinition.key),
        additionalProperties: false,
      },
    },
  }))

const normalizeAssistantToolEventStatus = (value) => {
  switch (value) {
    case 'approval_pending':
    case 'approval_approved':
    case 'approval_rejected':
    case 'approval_canceled':
    case 'approval_expired':
    case 'completed':
    case 'error':
      return value
    default:
      return 'running'
  }
}

const normalizeAssistantToolApprovalState = (value) =>
  ASSISTANT_TOOL_APPROVAL_STATES.has(value) ? value : 'pending'

const resolveAssistantMcpToolConfig = (toolName, widgetTools = []) => {
  const discoveredWidgetTool =
    widgetTools.find((widgetTool) => widgetTool.toolName === toolName) ?? null
  const internalWidgetToolHandler = assistantInternalWidgetToolHandlers.get(toolName) ?? null

  if (internalWidgetToolHandler) {
    return {
      kind: 'internal',
      server: {
        name: internalWidgetToolHandler.serverName,
      },
      tool: {
        name: toolName,
        redactArguments: discoveredWidgetTool?.redactArguments === true,
        redactResults: discoveredWidgetTool?.redactResults === true,
      },
      widgetTool: discoveredWidgetTool,
      execute: internalWidgetToolHandler.execute,
    }
  }

  for (const server of configuredAssistantMcpServers) {
    const matchedTool = server.tools.find((tool) => tool.name === toolName) ?? null

    if (matchedTool) {
      return {
        kind: 'remote',
        server,
        tool: matchedTool,
        widgetTool: discoveredWidgetTool,
      }
    }
  }

  return null
}

const normalizeAssistantToolCallEntry = (value) => {
  const candidate = value && typeof value === 'object' ? value : {}
  const toolName = sanitizeAssistantToolName(
    candidate.name ?? candidate.toolName ?? candidate.function?.name,
  )
  const argumentsValue =
    candidate.arguments ?? candidate.input ?? candidate.function?.arguments ?? {}

  if (!toolName) {
    return null
  }

  return {
    id:
      typeof candidate.id === 'string' && candidate.id.trim().length > 0
        ? candidate.id.trim()
        : `tool-call-${randomUUID()}`,
    toolName,
    arguments: argumentsValue && typeof argumentsValue === 'object'
      ? argumentsValue
      : typeof argumentsValue === 'string'
        ? (() => {
            try {
              return JSON.parse(argumentsValue)
            } catch {
              return { value: argumentsValue }
            }
          })()
        : {},
  }
}

const normalizeAssistantProviderToolCalls = (responseBody) => {
  const candidate = responseBody && typeof responseBody === 'object' ? responseBody : {}
  const choices = Array.isArray(candidate.choices) ? candidate.choices : []
  const firstChoice = choices[0] && typeof choices[0] === 'object' ? choices[0] : {}
  const message =
    firstChoice.message && typeof firstChoice.message === 'object'
      ? firstChoice.message
      : {}
  const rawToolCalls = Array.isArray(message.tool_calls)
    ? message.tool_calls
    : Array.isArray(candidate.toolCalls)
      ? candidate.toolCalls
      : Array.isArray(candidate.tools)
        ? candidate.tools
        : []

  return rawToolCalls
    .map(normalizeAssistantToolCallEntry)
    .filter((entry) => entry !== null)
}

const normalizeAssistantToolResultPayload = (value) => {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeAssistantToolResultPayload(entry))
  }

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, normalizeAssistantToolResultPayload(nestedValue)]),
    )
  }

  return null
}

const callAssistantMcpTool = async (ownerUserId, toolCall, widgetTools = []) => {
  const resolvedToolConfig = resolveAssistantMcpToolConfig(toolCall.toolName, widgetTools)

  if (!resolvedToolConfig) {
    throw new AssistantRuntimeError(
      `Assistant MCP tool ${toolCall.toolName} is not configured.`,
      400,
      'assistant_tool_not_found',
    )
  }

  if (resolvedToolConfig.kind === 'internal') {
    const normalizedResult = normalizeAssistantToolResultPayload(
      await resolvedToolConfig.execute(ownerUserId, toolCall.arguments),
    )

    if (normalizedResult === null) {
      throw new AssistantRuntimeError(
        'Assistant widget tool returned an invalid result payload.',
        502,
        'assistant_tool_result_invalid',
      )
    }

    return {
      serverName: resolvedToolConfig.server.name,
      toolName: toolCall.toolName,
      toolId: toolCall.id,
      widgetId: resolvedToolConfig.widgetTool?.widgetId ?? null,
      widgetTitle: resolvedToolConfig.widgetTool?.widgetTitle ?? null,
      sourceLocation: resolvedToolConfig.widgetTool?.sourceLocation ?? null,
      arguments: toolCall.arguments,
      result: normalizedResult,
      redactArguments: resolvedToolConfig.tool.redactArguments,
      redactResults: resolvedToolConfig.tool.redactResults,
    }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), ASSISTANT_BACKEND_REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(resolvedToolConfig.server.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...resolvedToolConfig.server.headers,
      },
      body: JSON.stringify({
        toolName: toolCall.toolName,
        arguments: toolCall.arguments,
      }),
      signal: controller.signal,
    })

    let responseBody = {}

    try {
      responseBody = await response.json()
    } catch {
      responseBody = {}
    }

    if (!response.ok) {
      throw new AssistantRuntimeError(
        typeof responseBody.error === 'string'
          ? responseBody.error
          : 'Assistant MCP tool execution failed.',
        response.status >= 500 ? 503 : 502,
        response.status === 404
          ? 'assistant_tool_not_found'
          : response.status >= 500
            ? 'assistant_mcp_unavailable'
            : 'assistant_tool_execution_failed',
      )
    }

    const normalizedResult = normalizeAssistantToolResultPayload(
      responseBody.result ?? responseBody.output ?? responseBody,
    )

    if (normalizedResult === null) {
      throw new AssistantRuntimeError(
        'Assistant MCP tool returned an invalid result payload.',
        502,
        'assistant_tool_result_invalid',
      )
    }

    return {
      serverName: resolvedToolConfig.server.name,
      toolName: toolCall.toolName,
      toolId: toolCall.id,
      widgetId: resolvedToolConfig.widgetTool?.widgetId ?? null,
      widgetTitle: resolvedToolConfig.widgetTool?.widgetTitle ?? null,
      sourceLocation: resolvedToolConfig.widgetTool?.sourceLocation ?? null,
      arguments: toolCall.arguments,
      result: normalizedResult,
      redactArguments: resolvedToolConfig.tool.redactArguments,
      redactResults: resolvedToolConfig.tool.redactResults,
    }
  } catch (error) {
    if (error instanceof AssistantRuntimeError) {
      throw error
    }

    if (error?.name === 'AbortError') {
      throw new AssistantRuntimeError(
        'Assistant MCP server is temporarily unavailable.',
        503,
        'assistant_mcp_unavailable',
      )
    }

    throw new AssistantRuntimeError(
      'Assistant MCP server is temporarily unavailable.',
      503,
      'assistant_mcp_unavailable',
    )
  } finally {
    clearTimeout(timeoutId)
  }
}

const buildAssistantToolEventRecord = (
  ownerUserId,
  threadId,
  assistantMessageId,
  toolExecution,
  phase,
  error = null,
) => {
  const timestamp = new Date().toISOString()
  const payload = {
    toolCallId: toolExecution.toolId,
    serverName: toolExecution.serverName,
    toolName: toolExecution.toolName,
    widgetId:
      typeof toolExecution.widgetId === 'string' && toolExecution.widgetId.length > 0
        ? toolExecution.widgetId
        : null,
    widgetTitle:
      typeof toolExecution.widgetTitle === 'string' && toolExecution.widgetTitle.length > 0
        ? toolExecution.widgetTitle
        : null,
    sourceLocation:
      typeof toolExecution.sourceLocation === 'string' && toolExecution.sourceLocation.length > 0
        ? toolExecution.sourceLocation
        : null,
    status: error ? 'error' : normalizeAssistantToolEventStatus(phase),
    approval:
      typeof toolExecution.approvalRequestId === 'string' &&
      toolExecution.approvalRequestId.length > 0
        ? {
            requestId: toolExecution.approvalRequestId,
            required: toolExecution.approvalRequired === true,
            state: normalizeAssistantToolApprovalState(toolExecution.approvalState),
            expiresAt:
              typeof toolExecution.approvalExpiresAt === 'string'
                ? toolExecution.approvalExpiresAt
                : null,
            resolvedAt:
              typeof toolExecution.approvalResolvedAt === 'string'
                ? toolExecution.approvalResolvedAt
                : null,
          }
        : null,
    displayArguments: buildAssistantToolDisplayPayload(
      toolExecution.arguments,
      toolExecution.redactArguments,
    ),
    displayResult: error
      ? null
      : buildAssistantToolDisplayPayload(toolExecution.result, toolExecution.redactResults),
    redactArguments: toolExecution.redactArguments,
    redactResults: toolExecution.redactResults,
    error: error
      ? {
          message: error.message,
          errorCode: error.errorCode,
        }
      : null,
  }

  return {
    id: `assistant-event-${randomUUID()}`,
    threadId,
    messageId: assistantMessageId,
    eventType: 'tool_call',
    payloadJson: JSON.stringify(payload),
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

const buildAssistantToolApprovalRequestRecord = (
  threadId,
  assistantMessageId,
  toolExecution,
  widgetTool,
) => {
  const createdAt = new Date().toISOString()
  const expiresAt = new Date(Date.now() + ASSISTANT_TOOL_APPROVAL_TTL_MS).toISOString()

  return {
    id: `assistant-approval-${randomUUID()}`,
    threadId,
    messageId: assistantMessageId,
    toolCallId: toolExecution.toolId,
    toolName: toolExecution.toolName,
    serverName: toolExecution.serverName,
    widgetId: widgetTool?.widgetId ?? null,
    widgetTitle: widgetTool?.widgetTitle ?? null,
    sourceLocation: widgetTool?.sourceLocation ?? null,
    widgetToolJson: JSON.stringify(widgetTool ?? {}),
    argumentsJson: JSON.stringify(toolExecution.arguments ?? {}),
    redactArguments: toolExecution.redactArguments === true,
    redactResults: toolExecution.redactResults === true,
    state: 'pending',
    expiresAt,
    resolvedAt: null,
    createdAt,
    updatedAt: createdAt,
  }
}

const parseAssistantApprovalRequestArguments = (approvalRequest) => {
  try {
    const parsedValue = JSON.parse(approvalRequest.argumentsJson)

    return parsedValue && typeof parsedValue === 'object' ? parsedValue : {}
  } catch {
    return {}
  }
}

const parseAssistantApprovalRequestWidgetTool = (approvalRequest) => {
  try {
    const parsedValue = JSON.parse(approvalRequest.widgetToolJson)

    return parsedValue && typeof parsedValue === 'object' ? parsedValue : {}
  } catch {
    return {}
  }
}

const buildAssistantApprovalEventExecution = (
  approvalRequest,
  approvalState,
  resolvedAt = null,
) => {
  const widgetTool = parseAssistantApprovalRequestWidgetTool(approvalRequest)

  return {
    serverName: approvalRequest.serverName,
    toolName: approvalRequest.toolName,
    toolId: approvalRequest.toolCallId,
    widgetId: approvalRequest.widgetId,
    widgetTitle: approvalRequest.widgetTitle,
    sourceLocation: approvalRequest.sourceLocation,
    arguments: parseAssistantApprovalRequestArguments(approvalRequest),
    result: null,
    redactArguments: approvalRequest.redactArguments === true || approvalRequest.redactArguments === 1,
    redactResults: approvalRequest.redactResults === true || approvalRequest.redactResults === 1,
    approvalRequestId: approvalRequest.id,
    approvalRequired: true,
    approvalState,
    approvalExpiresAt: approvalRequest.expiresAt,
    approvalResolvedAt: resolvedAt,
    widgetTool,
  }
}

const expireAssistantToolApprovals = (ownerUserId) => {
  const nowTimestamp = new Date().toISOString()
  const expiredRequests = selectExpiredPendingAssistantToolApprovalRequests(
    ownerUserId,
    nowTimestamp,
  )

  for (const approvalRequest of expiredRequests) {
    updateAssistantToolApprovalRequestState(
      ownerUserId,
      approvalRequest.id,
      'expired',
      nowTimestamp,
      nowTimestamp,
    )

    const expiredEvent = buildAssistantToolEventRecord(
      ownerUserId,
      approvalRequest.threadId,
      approvalRequest.messageId,
      buildAssistantApprovalEventExecution(approvalRequest, 'expired', nowTimestamp),
      'approval_expired',
    )
    insertAssistantMessageEvent(
      ownerUserId,
      expiredEvent,
      expiredEvent.createdAt,
      expiredEvent.updatedAt,
    )

    const thread = selectAssistantThreadById(ownerUserId, approvalRequest.threadId)

    if (thread) {
      updateAssistantThreadRuntimeState(
        ownerUserId,
        approvalRequest.threadId,
        thread.routeId,
        thread.title,
        nowTimestamp,
      )
    }
  }
}

const resolveAssistantToolApproval = async (ownerUserId, approvalRequestId, action) => {
  expireAssistantToolApprovals(ownerUserId)

  const approvalRequest = selectAssistantToolApprovalRequestById(ownerUserId, approvalRequestId)

  if (!approvalRequest) {
    throw new AssistantRuntimeError(
      'Assistant tool approval request not found.',
      404,
      'assistant_tool_approval_not_found',
    )
  }

  if (approvalRequest.state !== 'pending') {
    return buildAssistantThreadDetailPayload(ownerUserId, approvalRequest.threadId)
  }

  const normalizedAction =
    action === 'reject' || action === 'cancel' || action === 'approve' ? action : ''

  if (!normalizedAction) {
    throw new AssistantRuntimeError(
      'Assistant tool approval action must be approve, reject, or cancel.',
      400,
      'assistant_tool_approval_action_invalid',
    )
  }

  const resolvedAt = new Date().toISOString()
  const thread = selectAssistantThreadById(ownerUserId, approvalRequest.threadId)

  if (!thread) {
    throw new AssistantRuntimeError(
      'Assistant thread not found.',
      404,
      'assistant_thread_not_found',
    )
  }

  if (approvalRequest.expiresAt <= resolvedAt) {
    updateAssistantToolApprovalRequestState(
      ownerUserId,
      approvalRequest.id,
      'expired',
      resolvedAt,
      resolvedAt,
    )
    const expiredEvent = buildAssistantToolEventRecord(
      ownerUserId,
      approvalRequest.threadId,
      approvalRequest.messageId,
      buildAssistantApprovalEventExecution(approvalRequest, 'expired', resolvedAt),
      'approval_expired',
    )
    insertAssistantMessageEvent(
      ownerUserId,
      expiredEvent,
      expiredEvent.createdAt,
      expiredEvent.updatedAt,
    )
    updateAssistantThreadRuntimeState(
      ownerUserId,
      approvalRequest.threadId,
      thread.routeId,
      thread.title,
      resolvedAt,
    )

    return buildAssistantThreadDetailPayload(ownerUserId, approvalRequest.threadId)
  }

  const nextState =
    normalizedAction === 'approve'
      ? 'approved'
      : normalizedAction === 'reject'
        ? 'rejected'
        : 'canceled'

  updateAssistantToolApprovalRequestState(
    ownerUserId,
    approvalRequest.id,
    nextState,
    resolvedAt,
    resolvedAt,
  )

  const approvalEvent = buildAssistantToolEventRecord(
    ownerUserId,
    approvalRequest.threadId,
    approvalRequest.messageId,
    buildAssistantApprovalEventExecution(approvalRequest, nextState, resolvedAt),
    nextState === 'approved'
      ? 'approval_approved'
      : nextState === 'rejected'
        ? 'approval_rejected'
        : 'approval_canceled',
  )
  insertAssistantMessageEvent(
    ownerUserId,
    approvalEvent,
    approvalEvent.createdAt,
    approvalEvent.updatedAt,
  )

  if (nextState === 'approved') {
    try {
      const toolExecution = await callAssistantMcpTool(
        ownerUserId,
        {
          id: approvalRequest.toolCallId,
          toolName: approvalRequest.toolName,
          arguments: parseAssistantApprovalRequestArguments(approvalRequest),
        },
        [parseAssistantApprovalRequestWidgetTool(approvalRequest)],
      )

      const completedEvent = buildAssistantToolEventRecord(
        ownerUserId,
        approvalRequest.threadId,
        approvalRequest.messageId,
        {
          ...toolExecution,
          approvalRequestId: approvalRequest.id,
          approvalRequired: true,
          approvalState: 'approved',
          approvalExpiresAt: approvalRequest.expiresAt,
          approvalResolvedAt: resolvedAt,
        },
        'completed',
      )
      insertAssistantMessageEvent(
        ownerUserId,
        completedEvent,
        completedEvent.createdAt,
        completedEvent.updatedAt,
      )
    } catch (error) {
      if (!(error instanceof AssistantRuntimeError)) {
        throw error
      }

      const errorEvent = buildAssistantToolEventRecord(
        ownerUserId,
        approvalRequest.threadId,
        approvalRequest.messageId,
        buildAssistantApprovalEventExecution(approvalRequest, 'approved', resolvedAt),
        'approved',
        error,
      )
      insertAssistantMessageEvent(
        ownerUserId,
        errorEvent,
        errorEvent.createdAt,
        errorEvent.updatedAt,
      )
    }
  }

  updateAssistantThreadRuntimeState(
    ownerUserId,
    approvalRequest.threadId,
    thread.routeId,
    thread.title,
    resolvedAt,
  )

  return buildAssistantThreadDetailPayload(ownerUserId, approvalRequest.threadId)
}

const buildAssistantProviderEndpointUrl = (route) => {
  const baseUrl = sanitizeAssistantBaseUrl(route.baseUrl)

  if (!baseUrl) {
    throw new AssistantRuntimeError(
      'Assistant runtime route is not configured.',
      503,
      'assistant_route_invalid',
    )
  }

  if (route.backendKind === 'litellm') {
    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`

    return new URL('chat/completions', normalizedBaseUrl).toString()
  }

  return baseUrl
}

const isOpenAiCompatibleCustomAssistantRoute = (route) => {
  if (route.backendKind !== 'custom') {
    return false
  }

  const endpointUrl = buildAssistantProviderEndpointUrl(route)

  try {
    const pathname = new URL(endpointUrl).pathname.toLowerCase()

    return (
      pathname.includes('/chat/completion') ||
      pathname.includes('/chat/completions')
    )
  } catch {
    return false
  }
}

const buildAssistantProviderHeaders = (route) => {
  const headers = {
    'Content-Type': 'application/json',
    ...parseAssistantConfiguredHeaders(route?.headersJson ?? ASSISTANT_BACKEND_HEADERS_JSON),
  }

  const routeApiKey =
    typeof route?.apiKey === 'string' && route.apiKey.length > 0
      ? route.apiKey
      : ASSISTANT_BACKEND_API_KEY

  if (routeApiKey && typeof headers.Authorization !== 'string') {
    headers.Authorization = `Bearer ${routeApiKey}`
  }

  return headers
}

const normalizeAssistantUsagePayload = (value) => {
  const candidate = value && typeof value === 'object' ? value : {}
  const promptTokens = Number(
    candidate.prompt_tokens ?? candidate.promptTokens ?? Number.NaN,
  )
  const completionTokens = Number(
    candidate.completion_tokens ?? candidate.completionTokens ?? Number.NaN,
  )
  const totalTokens = Number(candidate.total_tokens ?? candidate.totalTokens ?? Number.NaN)

  if (
    Number.isNaN(promptTokens) &&
    Number.isNaN(completionTokens) &&
    Number.isNaN(totalTokens)
  ) {
    return null
  }

  return {
    promptTokens: Number.isNaN(promptTokens) ? null : promptTokens,
    completionTokens: Number.isNaN(completionTokens) ? null : completionTokens,
    totalTokens: Number.isNaN(totalTokens) ? null : totalTokens,
  }
}

const normalizeAssistantProviderContent = (value) => {
  if (typeof value === 'string') {
    return value.trim()
  }

  if (!Array.isArray(value)) {
    return ''
  }

  return value
    .map((part) => {
      if (typeof part === 'string') {
        return part
      }

      if (!part || typeof part !== 'object') {
        return ''
      }

      if (typeof part.text === 'string') {
        return part.text
      }

      if (part.type === 'text' && typeof part.text?.value === 'string') {
        return part.text.value
      }

      return ''
    })
    .filter((part) => part.length > 0)
    .join('\n\n')
    .trim()
}

const normalizeLiteLlmAssistantResponse = (responseBody, streamRequested) => {
  const candidate = responseBody && typeof responseBody === 'object' ? responseBody : {}
  const choices = Array.isArray(candidate.choices) ? candidate.choices : []
  const firstChoice = choices[0] && typeof choices[0] === 'object' ? choices[0] : {}
  const message =
    firstChoice.message && typeof firstChoice.message === 'object'
      ? firstChoice.message
      : {}
  const content = normalizeAssistantProviderContent(message.content)

  if (!content) {
    throw new AssistantRuntimeError(
      'Assistant provider returned an invalid response payload.',
      502,
      'assistant_provider_payload_invalid',
    )
  }

  return {
    providerMessageId: typeof candidate.id === 'string' ? candidate.id : null,
    role: 'assistant',
    content,
    toolCalls: normalizeAssistantProviderToolCalls(candidate),
    finishReason:
      typeof firstChoice.finish_reason === 'string' ? firstChoice.finish_reason : null,
    usage: normalizeAssistantUsagePayload(candidate.usage),
    streaming: {
      requested: streamRequested,
      delivered: false,
    },
  }
}

const normalizeCustomAssistantResponse = (responseBody, streamRequested) => {
  const candidate = responseBody && typeof responseBody === 'object' ? responseBody : {}

  if (Array.isArray(candidate.choices)) {
    return normalizeLiteLlmAssistantResponse(candidate, streamRequested)
  }

  const content = normalizeAssistantProviderContent(
    candidate.message?.content ??
      candidate.outputText ??
      candidate.content ??
      candidate.reply ??
      '',
  )

  if (!content) {
    throw new AssistantRuntimeError(
      'Assistant provider returned an invalid response payload.',
      502,
      'assistant_provider_payload_invalid',
    )
  }

  return {
    providerMessageId: typeof candidate.id === 'string' ? candidate.id : null,
    role: 'assistant',
    content,
    toolCalls: normalizeAssistantProviderToolCalls(candidate),
    finishReason:
      typeof candidate.finishReason === 'string'
        ? candidate.finishReason
        : typeof candidate.finish_reason === 'string'
          ? candidate.finish_reason
          : null,
    usage: normalizeAssistantUsagePayload(candidate.usage ?? candidate.tokenUsage),
    streaming: {
      requested: streamRequested,
      delivered: false,
    },
  }
}

const normalizeAssistantProviderResponse = (route, responseBody, streamRequested) => {
  if (route.backendKind === 'litellm') {
    return normalizeLiteLlmAssistantResponse(responseBody, streamRequested)
  }

  return normalizeCustomAssistantResponse(responseBody, streamRequested)
}

const buildAssistantProviderRequestPayload = (route, executionRequest) => {
  const transcriptMessages = executionRequest.messages.map((message) => ({
    role: message.role,
    content: message.content,
  }))
  const widgetTools = executionRequest.toolsRequested === true
    ? normalizeAssistantWidgetTools(executionRequest.widgetTools)
    : []
  const providerTools = widgetTools.length > 0
    ? buildAssistantProviderToolDefinitions(widgetTools)
    : null
  const metadata = {
    source: 'subway',
    ownerUserId: executionRequest.ownerUserId,
    threadId: executionRequest.threadId,
    routeId: route.id,
    widgetTools,
  }

  if (route.backendKind === 'litellm') {
    return {
      model: route.modelIdentifier,
      messages: transcriptMessages,
      stream: executionRequest.streamRequested,
      ...(providerTools ? { tools: providerTools } : {}),
      metadata,
      user: executionRequest.ownerUserId,
    }
  }

  if (isOpenAiCompatibleCustomAssistantRoute(route)) {
    return {
      model: sanitizeAssistantModelIdentifier(route.modelIdentifier),
      messages: transcriptMessages,
      stream: executionRequest.streamRequested,
      ...(providerTools ? { tools: providerTools } : {}),
      user: executionRequest.ownerUserId,
      metadata,
    }
  }

  return {
    modelIdentifier: sanitizeAssistantModelIdentifier(route.modelIdentifier),
    messages: transcriptMessages,
    stream: executionRequest.streamRequested,
    requestedTools: executionRequest.toolsRequested,
    ...(providerTools ? { tools: providerTools } : {}),
    availableWidgetTools: widgetTools,
    metadata,
  }
}

const mapAssistantProviderFailure = (statusCode) => {
  if (statusCode === 401 || statusCode === 403) {
    return {
      message: 'Assistant provider authentication failed.',
      errorCode: 'assistant_provider_auth_failed',
      responseStatusCode: 502,
    }
  }

  if (statusCode === 408 || statusCode === 429 || statusCode === 504) {
    return {
      message: 'Assistant provider timed out or is rate limited.',
      errorCode: 'assistant_provider_timeout',
      responseStatusCode: 503,
    }
  }

  if (statusCode >= 500) {
    return {
      message: 'Assistant provider is temporarily unavailable.',
      errorCode: 'assistant_provider_unavailable',
      responseStatusCode: 503,
    }
  }

  return {
    message: 'Assistant provider request failed.',
    errorCode: 'assistant_provider_request_failed',
    responseStatusCode: 502,
  }
}

const callAssistantProviderRoute = async (route, executionRequest) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), ASSISTANT_BACKEND_REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(buildAssistantProviderEndpointUrl(route), {
      method: 'POST',
      headers: buildAssistantProviderHeaders(route),
      body: JSON.stringify(buildAssistantProviderRequestPayload(route, executionRequest)),
      signal: controller.signal,
    })

    let responseBody = {}

    try {
      responseBody = await response.json()
    } catch {
      responseBody = {}
    }

    if (!response.ok) {
      const mappedFailure = mapAssistantProviderFailure(response.status)

      throw new AssistantRuntimeError(
        mappedFailure.message,
        mappedFailure.responseStatusCode,
        mappedFailure.errorCode,
        response.status,
      )
    }

    return normalizeAssistantProviderResponse(
      route,
      responseBody,
      executionRequest.streamRequested,
    )
  } catch (error) {
    if (error instanceof AssistantRuntimeError) {
      throw error
    }

    if (error?.name === 'AbortError') {
      throw new AssistantRuntimeError(
        'Assistant provider timed out or is rate limited.',
        503,
        'assistant_provider_timeout',
      )
    }

    throw new AssistantRuntimeError(
      'Assistant provider is temporarily unavailable.',
      503,
      'assistant_provider_unavailable',
    )
  } finally {
    clearTimeout(timeoutId)
  }
}

const resolveAssistantExecutionRoute = (ownerUserId, thread, options = {}) => {
  const threadRouteId = typeof thread.routeId === 'string' ? thread.routeId : ''
  const route = threadRouteId
    ? selectAssistantBackendRouteById(ownerUserId, threadRouteId) ?? selectActiveAssistantBackendRouteRow(ownerUserId)
    : selectActiveAssistantBackendRouteRow(ownerUserId)

  if (!route) {
    throw new AssistantRuntimeError(
      'Assistant runtime route is not configured.',
      503,
      'assistant_route_missing',
    )
  }

  if (!route.enabled) {
    throw new AssistantRuntimeError(
      'Assistant runtime route is disabled.',
      503,
      'assistant_route_disabled',
    )
  }

  if (!isAssistantRouteConfigured(route)) {
    throw new AssistantRuntimeError(
      'Assistant runtime route is not configured.',
      503,
      'assistant_route_invalid',
    )
  }

  if (options.streamRequested && !route.supportsStreaming) {
    throw new AssistantRuntimeError(
      'Assistant runtime route does not support streaming.',
      400,
      'assistant_streaming_unsupported',
    )
  }

  if (options.toolsRequested && !route.supportsTools) {
    throw new AssistantRuntimeError(
      'Assistant runtime route does not support tool calling.',
      400,
      'assistant_tools_unsupported',
    )
  }

  return route
}

const updateAssistantRouteHealthFromResult = (routeId, error = null) => {
  if (!routeId) {
    return
  }

  const timestamp = new Date().toISOString()

  if (!error) {
    updateAssistantBackendRouteStatus(routeId, 'available', timestamp)
    return
  }

  if (
    error instanceof AssistantRuntimeError &&
    error.errorCode !== 'assistant_route_disabled'
  ) {
    updateAssistantBackendRouteStatus(routeId, 'unavailable', timestamp)
  }
}

const executeAssistantTurn = async (
  ownerUserId,
  threadId,
  promptContent,
  options = {},
) => {
  const thread = selectAssistantThreadById(ownerUserId, threadId)

  if (!thread) {
    throw new AssistantRuntimeError(
      'Assistant thread not found.',
      404,
      'assistant_thread_not_found',
    )
  }

  const content = sanitizeAssistantMessageContent(promptContent)

  if (!content) {
    throw new AssistantRuntimeError(
      'Assistant message content is required.',
      400,
      'assistant_message_content_missing',
    )
  }

  const route = resolveAssistantExecutionRoute(ownerUserId, thread, options)
  const threadTitle =
    sanitizeAssistantThreadTitle(thread.title) || deriveAssistantThreadTitleFromPrompt(content)
  const userMessageTimestamp = new Date().toISOString()
  const userMessage = {
    id: `assistant-message-${randomUUID()}`,
    threadId,
    role: 'user',
    content,
    sequenceIndex: selectNextAssistantMessageSequenceIndex(ownerUserId, threadId),
    createdAt: userMessageTimestamp,
    updatedAt: userMessageTimestamp,
  }

  insertAssistantMessage(ownerUserId, userMessage, userMessageTimestamp, userMessageTimestamp)
  updateAssistantThreadRuntimeState(
    ownerUserId,
    threadId,
    route.id,
    threadTitle,
    userMessageTimestamp,
  )

  try {
    const providerResponse = await callAssistantProviderRoute(route, {
      ownerUserId,
      threadId,
      messages: [
        ...selectAssistantMessagesByThreadId(ownerUserId, threadId).map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
      streamRequested: options.streamRequested === true,
      toolsRequested: options.toolsRequested === true,
      widgetTools: normalizeAssistantWidgetTools(options.widgetTools),
    })

    const assistantMessageTimestamp = new Date().toISOString()
    const assistantMessageId = `assistant-message-${randomUUID()}`
    const assistantMessage = {
      id: assistantMessageId,
      threadId,
      role: 'assistant',
      content: providerResponse.content,
      sequenceIndex: selectNextAssistantMessageSequenceIndex(ownerUserId, threadId),
      createdAt: assistantMessageTimestamp,
      updatedAt: assistantMessageTimestamp,
    }
    const toolEvents = []

    insertAssistantMessage(
      ownerUserId,
      assistantMessage,
      assistantMessageTimestamp,
      assistantMessageTimestamp,
    )

    if (options.toolsRequested === true && providerResponse.toolCalls.length > 0) {
      const widgetTools = normalizeAssistantWidgetTools(options.widgetTools)

      for (const toolCall of providerResponse.toolCalls) {
        const resolvedToolConfig = resolveAssistantMcpToolConfig(
          toolCall.toolName,
          widgetTools,
        )
        const startedToolExecution = {
          serverName: resolvedToolConfig?.server.name ?? 'mcp',
          toolName: toolCall.toolName,
          toolId: toolCall.id,
          widgetId: resolvedToolConfig?.widgetTool?.widgetId ?? null,
          widgetTitle: resolvedToolConfig?.widgetTool?.widgetTitle ?? null,
          sourceLocation: resolvedToolConfig?.widgetTool?.sourceLocation ?? null,
          arguments: toolCall.arguments,
          result: null,
          redactArguments: resolvedToolConfig?.tool.redactArguments !== false,
          redactResults: resolvedToolConfig?.tool.redactResults !== false,
        }

        if (resolvedToolConfig?.widgetTool?.approvalRequired === true) {
          const approvalRequest = buildAssistantToolApprovalRequestRecord(
            threadId,
            assistantMessageId,
            startedToolExecution,
            resolvedToolConfig.widgetTool,
          )

          insertAssistantToolApprovalRequest(
            ownerUserId,
            approvalRequest,
            approvalRequest.createdAt,
            approvalRequest.updatedAt,
          )

          const pendingApprovalEvent = buildAssistantToolEventRecord(
            ownerUserId,
            threadId,
            assistantMessageId,
            {
              ...startedToolExecution,
              approvalRequestId: approvalRequest.id,
              approvalRequired: true,
              approvalState: 'pending',
              approvalExpiresAt: approvalRequest.expiresAt,
              approvalResolvedAt: null,
            },
            'approval_pending',
          )
          insertAssistantMessageEvent(
            ownerUserId,
            pendingApprovalEvent,
            pendingApprovalEvent.createdAt,
            pendingApprovalEvent.updatedAt,
          )
          toolEvents.push(pendingApprovalEvent)
          continue
        }

        const startedEvent = buildAssistantToolEventRecord(
          ownerUserId,
          threadId,
          assistantMessageId,
          startedToolExecution,
          'running',
        )
        insertAssistantMessageEvent(
          ownerUserId,
          startedEvent,
          startedEvent.createdAt,
          startedEvent.updatedAt,
        )
        toolEvents.push(startedEvent)

        try {
          const toolExecution = await callAssistantMcpTool(
            ownerUserId,
            toolCall,
            widgetTools,
          )
          const completedEvent = buildAssistantToolEventRecord(
            ownerUserId,
            threadId,
            assistantMessageId,
            toolExecution,
            'completed',
          )
          insertAssistantMessageEvent(
            ownerUserId,
            completedEvent,
            completedEvent.createdAt,
            completedEvent.updatedAt,
          )
          toolEvents.push(completedEvent)
        } catch (error) {
          if (!(error instanceof AssistantRuntimeError)) {
            throw error
          }

          const errorEvent = buildAssistantToolEventRecord(
            ownerUserId,
            threadId,
            assistantMessageId,
            startedToolExecution,
            'running',
            error,
          )
          insertAssistantMessageEvent(
            ownerUserId,
            errorEvent,
            errorEvent.createdAt,
            errorEvent.updatedAt,
          )
          toolEvents.push(errorEvent)
        }
      }
    }

    updateAssistantThreadRuntimeState(
      ownerUserId,
      threadId,
      route.id,
      threadTitle,
      assistantMessageTimestamp,
    )
    updateAssistantRouteHealthFromResult(route.id)

    return {
      thread: buildAssistantThreadPayload(selectAssistantThreadById(ownerUserId, threadId)),
      userMessage: buildAssistantMessagePayload(userMessage),
      assistantMessage: buildAssistantMessagePayload(assistantMessage),
      events: toolEvents.map((event) =>
        buildAssistantMessageEventPayload({
          ...event,
          payload: JSON.parse(event.payloadJson),
        }),
      ),
      runtime: {
        route: buildAssistantRoutePayload(route),
        providerMessageId: providerResponse.providerMessageId,
        finishReason: providerResponse.finishReason,
        usage: providerResponse.usage,
        streaming: {
          requested: options.streamRequested === true,
          supported: Boolean(route.supportsStreaming),
          delivered: providerResponse.streaming.delivered === true,
        },
      },
    }
  } catch (error) {
    updateAssistantRouteHealthFromResult(route.id, error)
    throw error
  }
}

const sendAssistantRuntimeError = (response, error) => {
  if (error instanceof AssistantRuntimeError) {
    console.warn('Assistant runtime error.', {
      message: error.message,
      errorCode: error.errorCode,
      statusCode: error.statusCode,
      providerStatusCode: error.providerStatusCode,
    })
    sendJson(response, error.statusCode, {
      error: error.message,
      errorCode: error.errorCode,
    })
    return
  }

  console.error('Unexpected assistant runtime failure.', error)
  sendJson(response, 500, {
    error: 'Assistant runtime request failed.',
    errorCode: 'assistant_runtime_unknown_error',
  })
}

const selectRoborockIntegrationRow = (ownerUserId) =>
  db
    .prepare(`
      SELECT
        roborock_email,
        encrypted_session_json,
        base_url,
        selected_device_duid,
        selected_device_name,
        selected_device_model,
        selected_routine_id,
        selected_routine_name,
        connection_status,
        last_connected_at,
        last_validated_at,
        updated_at
      FROM roborock_integrations
      WHERE owner_user_id = ?
    `)
    .get(ownerUserId)

const selectRoborockSettings = (ownerUserId) => {
  const row = selectRoborockIntegrationRow(ownerUserId)

  return {
    email: sanitizeRoborockEmail(row?.roborock_email),
    hasStoredSession:
      typeof row?.encrypted_session_json === 'string' && row.encrypted_session_json.length > 0,
    baseUrl: sanitizeRoborockBaseUrl(row?.base_url),
    selectedDeviceDuid: normalizeRoborockDeviceDuid(row?.selected_device_duid),
    selectedDeviceName: sanitizeRoborockDeviceName(row?.selected_device_name),
    selectedDeviceModel: sanitizeRoborockDeviceModel(row?.selected_device_model),
    selectedRoutineId: normalizeRoborockRoutineId(row?.selected_routine_id),
    selectedRoutineName: sanitizeRoborockRoutineName(row?.selected_routine_name),
    connectionStatus: normalizeRoborockConnectionStatus(row?.connection_status),
    lastConnectedAt:
      typeof row?.last_connected_at === 'string' ? row.last_connected_at : null,
    lastValidatedAt:
      typeof row?.last_validated_at === 'string' ? row.last_validated_at : null,
    updatedAt: typeof row?.updated_at === 'string' ? row.updated_at : null,
  }
}

const upsertRoborockIntegration = (
  ownerUserId,
  roborockEmail,
  encryptedSessionJson,
  baseUrl,
  connectionStatus,
  lastConnectedAt,
  lastValidatedAt,
  timestamp,
) =>
  db
    .prepare(`
      INSERT INTO roborock_integrations (
        owner_user_id,
        roborock_email,
        encrypted_session_json,
        base_url,
        connection_status,
        last_connected_at,
        last_validated_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(owner_user_id) DO UPDATE SET
        roborock_email = excluded.roborock_email,
        encrypted_session_json = excluded.encrypted_session_json,
        base_url = excluded.base_url,
        connection_status = excluded.connection_status,
        last_connected_at = excluded.last_connected_at,
        last_validated_at = excluded.last_validated_at,
        updated_at = excluded.updated_at
    `)
    .run(
      ownerUserId,
      roborockEmail,
      encryptedSessionJson,
      baseUrl,
      connectionStatus,
      lastConnectedAt,
      lastValidatedAt,
      timestamp,
      timestamp,
    )

const updateRoborockConnectionStatus = (
  ownerUserId,
  connectionStatus,
  lastValidatedAt,
) =>
  db
    .prepare(`
      UPDATE roborock_integrations
      SET connection_status = ?, last_validated_at = ?, updated_at = ?
      WHERE owner_user_id = ?
    `)
    .run(connectionStatus, lastValidatedAt, lastValidatedAt, ownerUserId)

const updateRoborockSelection = (
  ownerUserId,
  selectedDeviceDuid,
  selectedDeviceName,
  selectedDeviceModel,
  selectedRoutineId,
  selectedRoutineName,
  timestamp,
) =>
  db
    .prepare(`
      UPDATE roborock_integrations
      SET selected_device_duid = ?,
          selected_device_name = ?,
          selected_device_model = ?,
          selected_routine_id = ?,
          selected_routine_name = ?,
          updated_at = ?
      WHERE owner_user_id = ?
    `)
    .run(
      selectedDeviceDuid,
      selectedDeviceName,
      selectedDeviceModel,
      selectedRoutineId,
      selectedRoutineName,
      timestamp,
      ownerUserId,
    )

const normalizeBringSnapshotItem = (value) => {
  const candidate = value && typeof value === 'object' ? value : {}
  const itemName = sanitizeBringItemName(candidate.itemName)

  if (!itemName) {
    return null
  }

  return {
    itemName,
    specification: sanitizeBringItemSpecification(candidate.specification),
    uuid: normalizeBringItemUuid(candidate.uuid),
    category:
      typeof candidate.category === 'string' && candidate.category.trim().length > 0
        ? candidate.category.trim().slice(0, 120)
        : '',
    recentAt:
      typeof candidate.recentAt === 'string' && candidate.recentAt.trim().length > 0
        ? candidate.recentAt.trim().slice(0, 64)
        : '',
  }
}

const normalizeBringListSnapshot = (value) => {
  const candidate = value && typeof value === 'object' ? value : {}
  const listUuid = normalizeBringListUuid(candidate.listUuid)
  const listName = sanitizeBringListName(candidate.listName)

  if (!listUuid || !listName) {
    return null
  }

  const openItems = Array.isArray(candidate.openItems)
    ? candidate.openItems
        .map(normalizeBringSnapshotItem)
        .filter((item) => item !== null)
    : []
  const recentItems = Array.isArray(candidate.recentItems)
    ? candidate.recentItems
        .map(normalizeBringSnapshotItem)
        .filter((item) => item !== null)
    : []

  return {
    listUuid,
    listName,
    openItems,
    recentItems,
  }
}

const selectBringListSnapshotRow = (ownerUserId) =>
  db
    .prepare(`
      SELECT list_uuid, snapshot_json, refreshed_at, stale_at, updated_at
      FROM bring_list_snapshots
      WHERE owner_user_id = ?
    `)
    .get(ownerUserId)

const selectBringListSnapshot = (ownerUserId) => {
  const row = selectBringListSnapshotRow(ownerUserId)

  if (!row || typeof row.snapshot_json !== 'string') {
    return null
  }

  try {
    const snapshot = normalizeBringListSnapshot(JSON.parse(row.snapshot_json))

    if (!snapshot) {
      return null
    }

    return {
      ...snapshot,
      refreshedAt: typeof row.refreshed_at === 'string' ? row.refreshed_at : null,
      staleAt: typeof row.stale_at === 'string' ? row.stale_at : null,
      updatedAt: typeof row.updated_at === 'string' ? row.updated_at : null,
    }
  } catch {
    return null
  }
}

const upsertBringListSnapshot = (ownerUserId, listUuid, snapshotJson, refreshedAt) =>
  db
    .prepare(`
      INSERT INTO bring_list_snapshots (
        owner_user_id,
        list_uuid,
        snapshot_json,
        refreshed_at,
        stale_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, NULL, ?)
      ON CONFLICT(owner_user_id) DO UPDATE SET
        list_uuid = excluded.list_uuid,
        snapshot_json = excluded.snapshot_json,
        refreshed_at = excluded.refreshed_at,
        stale_at = NULL,
        updated_at = excluded.updated_at
    `)
    .run(ownerUserId, listUuid, snapshotJson, refreshedAt, refreshedAt)

const markBringListSnapshotStale = (ownerUserId, staleAt) =>
  db
    .prepare(`
      UPDATE bring_list_snapshots
      SET stale_at = COALESCE(stale_at, ?), updated_at = ?
      WHERE owner_user_id = ?
    `)
    .run(staleAt, staleAt, ownerUserId)

const selectAppPreferences = (ownerUserId) => {
  const row = db
    .prepare(`
      SELECT
        language_code,
        country_code,
        audio_visual_camera_enabled,
        audio_visual_microphone_enabled,
        audio_visual_permission_state,
        audio_visual_last_recording_mode,
        updated_at
      FROM app_preferences
      WHERE owner_user_id = ?
    `)
    .get(ownerUserId)

  return {
    languageCode: normalizeLanguageCode(row?.language_code),
    countryCode: normalizeCountryCode(row?.country_code),
    audioVisualCameraEnabled: row?.audio_visual_camera_enabled !== 0,
    audioVisualMicrophoneEnabled: row?.audio_visual_microphone_enabled !== 0,
    audioVisualPermissionState: AUDIO_VISUAL_PERMISSION_STATES.has(
      row?.audio_visual_permission_state,
    )
      ? row.audio_visual_permission_state
      : 'idle',
    audioVisualLastRecordingMode: AUDIO_VISUAL_RECORDING_MODES.has(
      row?.audio_visual_last_recording_mode,
    )
      ? row.audio_visual_last_recording_mode
      : null,
    updatedAt: typeof row?.updated_at === 'string' ? row.updated_at : null,
  }
}

const insertAudioVisualRecording = (ownerUserId, recording) =>
  db
    .prepare(`
      INSERT INTO audio_visual_recordings (
        owner_user_id,
        id,
        recording_type,
        mime_type,
        file_extension,
        file_size,
        duration_seconds,
        storage_path,
        uploader_username,
        captured_at,
        created_at,
        updated_at,
        deleted_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      ownerUserId,
      recording.id,
      recording.recordingType,
      recording.mimeType,
      recording.fileExtension,
      recording.fileSize,
      recording.durationSeconds,
      recording.storagePath,
      recording.uploaderUsername,
      recording.capturedAt,
      recording.createdAt,
      recording.updatedAt,
      null,
    )

const selectAudioVisualRecordingById = (ownerUserId, recordingId) =>
  db
    .prepare(`
      SELECT
        id,
        recording_type,
        mime_type,
        file_extension,
        file_size,
        duration_seconds,
        storage_path,
        uploader_username,
        captured_at,
        created_at,
        updated_at,
        deleted_at
      FROM audio_visual_recordings
      WHERE owner_user_id = ? AND id = ?
    `)
    .get(ownerUserId, recordingId)

const selectActiveAudioVisualRecordings = (ownerUserId, requestedType = 'all') => {
  const normalizedType =
    requestedType === 'photo' || requestedType === 'video' || requestedType === 'audio'
      ? requestedType
      : 'all'

  return db
    .prepare(`
      SELECT
        id,
        recording_type,
        mime_type,
        file_extension,
        file_size,
        duration_seconds,
        storage_path,
        uploader_username,
        captured_at,
        created_at,
        updated_at
      FROM audio_visual_recordings
      WHERE owner_user_id = ?
        AND deleted_at IS NULL
        AND (? = 'all' OR recording_type = ?)
      ORDER BY captured_at DESC, created_at DESC, id DESC
    `)
    .all(ownerUserId, normalizedType, normalizedType)
}

const softDeleteAudioVisualRecording = (ownerUserId, recordingId, deletedAt) =>
  db
    .prepare(`
      UPDATE audio_visual_recordings
      SET deleted_at = ?, updated_at = ?
      WHERE owner_user_id = ? AND id = ? AND deleted_at IS NULL
    `)
    .run(deletedAt, deletedAt, ownerUserId, recordingId)

const upsertAppPreferences = (
  ownerUserId,
  languageCode,
  countryCode,
  audioVisualCameraEnabled,
  audioVisualMicrophoneEnabled,
  audioVisualPermissionState,
  audioVisualLastRecordingMode,
  timestamp,
) =>
  db
    .prepare(`
      INSERT INTO app_preferences (
        owner_user_id,
        language_code,
        country_code,
        audio_visual_camera_enabled,
        audio_visual_microphone_enabled,
        audio_visual_permission_state,
        audio_visual_last_recording_mode,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(owner_user_id) DO UPDATE SET
        language_code = excluded.language_code,
        country_code = excluded.country_code,
        audio_visual_camera_enabled = excluded.audio_visual_camera_enabled,
        audio_visual_microphone_enabled = excluded.audio_visual_microphone_enabled,
        audio_visual_permission_state = excluded.audio_visual_permission_state,
        audio_visual_last_recording_mode = excluded.audio_visual_last_recording_mode,
        updated_at = excluded.updated_at
    `)
    .run(
      ownerUserId,
      languageCode,
      countryCode,
      audioVisualCameraEnabled ? 1 : 0,
      audioVisualMicrophoneEnabled ? 1 : 0,
      audioVisualPermissionState,
      audioVisualLastRecordingMode,
      timestamp,
      timestamp,
    )

const deleteWidgetById = (ownerUserId, widgetId) =>
  db.prepare('DELETE FROM widgets WHERE owner_user_id = ? AND id = ?').run(ownerUserId, widgetId)

const deleteWidgetSettingsById = (ownerUserId, widgetId) =>
  db
    .prepare('DELETE FROM widget_settings WHERE owner_user_id = ? AND widget_id = ?')
    .run(ownerUserId, widgetId)

const deleteUnsupportedWidgets = () => {
  const widgets = db
    .prepare(`
      SELECT owner_user_id, id, source_location
      FROM widgets
    `)
    .all()

  for (const widget of widgets) {
    if (!allowedWidgetSourceLocations.has(widget.source_location)) {
      deleteWidgetSettingsById(widget.owner_user_id, widget.id)
      deleteWidgetById(widget.owner_user_id, widget.id)
    }
  }

  const widgetSettings = db
    .prepare(`
      SELECT owner_user_id, widget_id
      FROM widget_settings
    `)
    .all()

  for (const widgetSetting of widgetSettings) {
    if (!allowedWidgetIds.has(widgetSetting.widget_id)) {
      deleteWidgetSettingsById(widgetSetting.owner_user_id, widgetSetting.widget_id)
    }
  }
}

const ensureSeedWidgetsPresent = (ownerUserId) => {
  const existingWidgetIds = new Set(
    db
      .prepare(
        `
          SELECT id
          FROM widgets
          WHERE owner_user_id = ?
        `,
      )
      .all(ownerUserId)
      .map((row) => row.id),
  )

  const now = new Date().toISOString()

  for (const widget of seedWidgets) {
    if (!existingWidgetIds.has(widget.id)) {
      insertWidget(ownerUserId, widget, now, now)
    }
  }
}

const ensureBringWidgetDefaultPlacement = () => {
  const bringWidgets = db
    .prepare(`
      SELECT owner_user_id, id, placement_zones
      FROM widgets
      WHERE source_location = 'bring'
    `)
    .all()

  const updatePlacement = db.prepare(`
    UPDATE widgets
    SET placement_zones = ?, updated_at = ?
    WHERE owner_user_id = ? AND id = ?
  `)

  const timestamp = new Date().toISOString()
  const defaultBringPlacement = JSON.stringify([{ zoneId: 'service-board', order: 2 }])

  for (const widget of bringWidgets) {
    if (parseJsonArray(widget.placement_zones).length > 0) {
      continue
    }

    updatePlacement.run(defaultBringPlacement, timestamp, widget.owner_user_id, widget.id)
  }
}

const selectAllFamilyMembers = (ownerUserId) =>
  db
    .prepare(`
      SELECT id, first_name AS firstName, color
      FROM family_members
      WHERE owner_user_id = ?
      ORDER BY created_at ASC, id ASC
    `)
    .all(ownerUserId)

const buildFamilyMemberIdSet = (ownerUserId) =>
  new Set(selectAllFamilyMembers(ownerUserId).map((member) => member.id))

const parseJsonArray = (value) => {
  try {
    const parsedValue = JSON.parse(value)

    return Array.isArray(parsedValue) ? parsedValue : []
  } catch {
    return []
  }
}

const buildCalendarScope = (memberIds) =>
  memberIds.includes(LEGACY_HOUSEHOLD_MEMBER_ID)
    ? { mode: 'all', memberIds: [] }
    : { mode: 'members', memberIds }

const normalizeCalendarEventRow = (row) => {
  const date = normalizeIsoDate(row.event_date)
  const members = parseJsonArray(row.member_ids).filter(
    (memberId) => typeof memberId === 'string',
  )
  const normalizedMembers = members.length > 0 ? members : [LEGACY_HOUSEHOLD_MEMBER_ID]
  const locationCity = sanitizeCalendarText(
    row.location_city,
    sanitizeCalendarText(row.location, 'Unknown location'),
  )
  const locationCountry = normalizeCountryCode(row.location_country)

  return {
    id: row.id,
    date,
    time: normalizeTimeLabel(row.time_label),
    title: sanitizeCalendarText(row.title, 'Untitled event'),
    description: typeof row.note === 'string' ? row.note : '',
    locationCity,
    locationCountry,
    location: buildCalendarDisplayLocation(locationCity, locationCountry),
    members: normalizedMembers,
    scope: buildCalendarScope(normalizedMembers),
    recurrence: parseRecurrenceRuleJson(row.recurrence_rule_json, date),
    excludedDates: parseJsonArray(row.excluded_dates_json).filter((date) => typeof date === 'string'),
    cancelled: row.cancelled === 1,
    createdAt: typeof row.created_at === 'string' ? row.created_at : null,
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : null,
  }
}

const buildCalendarEventPayload = (event, occurrenceDate = event.date) => ({
  id: occurrenceDate === event.date ? event.id : `${event.id}__${occurrenceDate}`,
  seriesId: event.id,
  date: occurrenceDate,
  occurrenceDate,
  seriesStartDate: event.date,
  time: event.time,
  title: event.title,
  description: event.description,
  location: event.location,
  locationCity: event.locationCity,
  locationCountry: event.locationCountry,
  note: event.description,
  members: event.members,
  scope: event.scope,
  recurrence: event.recurrence,
  excludedDates: event.excludedDates ?? [],
  cancelled: event.cancelled ?? false,
  createdAt: event.createdAt,
  updatedAt: event.updatedAt,
})

const getIsoDateDayDifference = (startDate, endDate) => {
  const parsedStartDate = parseIsoDate(startDate)
  const parsedEndDate = parseIsoDate(endDate)

  if (!parsedStartDate || !parsedEndDate) {
    return 0
  }

  return Math.round((parsedEndDate.date.getTime() - parsedStartDate.date.getTime()) / 86400000)
}

const getIsoDateMonthDifference = (startDate, endDate) => {
  const parsedStartDate = parseIsoDate(startDate)
  const parsedEndDate = parseIsoDate(endDate)

  if (!parsedStartDate || !parsedEndDate) {
    return 0
  }

  return (parsedEndDate.year - parsedStartDate.year) * 12 + (parsedEndDate.month - parsedStartDate.month)
}

const getIsoDateYearDifference = (startDate, endDate) => {
  const parsedStartDate = parseIsoDate(startDate)
  const parsedEndDate = parseIsoDate(endDate)

  if (!parsedStartDate || !parsedEndDate) {
    return 0
  }

  return parsedEndDate.year - parsedStartDate.year
}

const matchesCalendarRecurrenceOnDate = (event, candidateDate) => {
  const candidateDateParts = parseIsoDate(candidateDate)
  const startDateParts = parseIsoDate(event.date)

  if (!candidateDateParts || !startDateParts || compareIsoDates(candidateDate, event.date) < 0) {
    return false
  }

  const { recurrence } = event

  if (recurrence.until && compareIsoDates(candidateDate, recurrence.until) > 0) {
    return false
  }

  if (recurrence.frequency === 'none') {
    return candidateDate === event.date
  }

  if (recurrence.frequency === 'daily') {
    return getIsoDateDayDifference(event.date, candidateDate) % recurrence.interval === 0
  }

  if (recurrence.frequency === 'weekly') {
    const dayDifference = getIsoDateDayDifference(event.date, candidateDate)
    const weekDifference = Math.floor(dayDifference / 7)

    return (
      weekDifference % recurrence.interval === 0 &&
      recurrence.byWeekdays.includes(candidateDateParts.date.getUTCDay())
    )
  }

  if (recurrence.frequency === 'monthly') {
    return (
      startDateParts.day === candidateDateParts.day &&
      getIsoDateMonthDifference(event.date, candidateDate) % recurrence.interval === 0
    )
  }

  if (recurrence.frequency === 'yearly') {
    return (
      startDateParts.month === candidateDateParts.month &&
      startDateParts.day === candidateDateParts.day &&
      getIsoDateYearDifference(event.date, candidateDate) % recurrence.interval === 0
    )
  }

  return false
}

const expandCalendarEventOccurrences = (event, rangeStart, rangeEnd) => {
  const occurrences = []
  let occurrenceCount = 0
  let cursorDate = event.date

  while (compareIsoDates(cursorDate, rangeEnd) <= 0) {
    if (matchesCalendarRecurrenceOnDate(event, cursorDate)) {
      occurrenceCount += 1

      if (event.recurrence.count && occurrenceCount > event.recurrence.count) {
        break
      }

      if (compareIsoDates(cursorDate, rangeStart) >= 0) {
        occurrences.push(buildCalendarEventPayload(event, cursorDate))
      }

      if (event.recurrence.frequency === 'none') {
        break
      }
    }

    cursorDate = addDaysToIsoDate(cursorDate, 1)
  }

  return occurrences
}

const selectCalendarEventRows = (ownerUserId) =>
  db
    .prepare(`
      SELECT
        id,
        time_label,
        event_date,
        title,
        location,
        location_city,
        location_country,
        note,
        member_ids,
        recurrence_rule_json,
        excluded_dates_json,
        cancelled,
        created_at,
        updated_at
      FROM calendar_events
      WHERE owner_user_id = ?
      ORDER BY event_date ASC, time_label ASC, created_at ASC, id ASC
    `)
    .all(ownerUserId)
    .map(normalizeCalendarEventRow)

const selectCalendarEventById = (ownerUserId, calendarEventId) =>
  db
    .prepare(`
      SELECT
        id,
        time_label,
        event_date,
        title,
        location,
        location_city,
        location_country,
        note,
        member_ids,
        recurrence_rule_json,
        excluded_dates_json,
        cancelled,
        created_at,
        updated_at
      FROM calendar_events
      WHERE owner_user_id = ? AND id = ?
    `)
    .get(ownerUserId, calendarEventId)

const selectNormalizedCalendarEventById = (ownerUserId, calendarEventId) => {
  const row = selectCalendarEventById(ownerUserId, calendarEventId)

  return row ? normalizeCalendarEventRow(row) : null
}

const normalizeWidgetRow = (row) => ({
  id: row.id,
  title: row.title,
  subwayLetter: row.subway_letter,
  subwayColor: row.subway_color,
  sourceLocation: row.source_location,
  userScope: {
    mode:
      row.user_scope_mode === 'member' || row.user_scope_mode === 'members'
        ? row.user_scope_mode
        : 'all',
    memberIds: parseJsonArray(row.user_scope_member_ids).filter(
      (memberId) => typeof memberId === 'string',
    ),
  },
  placementZones: normalizeWidgetPlacementZones(parseJsonArray(row.placement_zones)),
})

const selectAllWidgets = (ownerUserId) =>
  db
    .prepare(`
      SELECT
        id,
        title,
        subway_letter,
        subway_color,
        source_location,
        user_scope_mode,
        user_scope_member_ids,
        placement_zones
      FROM widgets
      WHERE owner_user_id = ?
      ORDER BY created_at ASC, id ASC
    `)
    .all(ownerUserId)
    .map(normalizeWidgetRow)
    .filter((widget) => allowedWidgetSourceLocations.has(widget.sourceLocation))

const selectAllCalendarEvents = (ownerUserId) =>
  selectCalendarEventRows(ownerUserId).map((event) => buildCalendarEventPayload(event))

const selectCalendarEventsByRange = (ownerUserId, rangeStart, rangeEnd) =>
  selectCalendarEventRows(ownerUserId)
    .flatMap((event) => expandCalendarEventOccurrences(event, rangeStart, rangeEnd))
    .sort(
      (left, right) =>
        left.date.localeCompare(right.date) ||
        left.time.localeCompare(right.time) ||
        left.seriesId.localeCompare(right.seriesId),
    )

const formatWeatherCondition = (weatherCode) =>
  weatherCodeMap.get(weatherCode) ?? 'Unknown'

const buildWeatherApiUrl = (latitude, longitude) => {
  const url = new URL('https://api.open-meteo.com/v1/forecast')

  url.searchParams.set('latitude', latitude.toString())
  url.searchParams.set('longitude', longitude.toString())
  url.searchParams.set('timezone', WEATHER_TIMEZONE)
  url.searchParams.set(
    'current',
    'temperature_2m,weather_code,wind_speed_10m',
  )
  url.searchParams.set(
    'daily',
    'weather_code,temperature_2m_max,temperature_2m_min',
  )
  url.searchParams.set('forecast_days', WEATHER_FORECAST_DAYS.toString())

  return url
}

const buildWeatherPayload = (apiPayload, locationLabel) => {
  const forecast = Array.isArray(apiPayload.daily?.time)
    ? apiPayload.daily.time.map((day, index) => ({
        day,
        high: Math.round(apiPayload.daily.temperature_2m_max?.[index] ?? 0),
        low: Math.round(apiPayload.daily.temperature_2m_min?.[index] ?? 0),
        condition: formatWeatherCondition(apiPayload.daily.weather_code?.[index] ?? -1),
      }))
    : []

  const high = forecast[0]?.high ?? 0
  const low = forecast[0]?.low ?? 0
  const windSpeed = Math.round(apiPayload.current?.wind_speed_10m ?? 0)
  const updatedAt = new Date().toISOString()

  return {
    location: locationLabel,
    source: 'Open-Meteo',
    stale: false,
    updatedAt,
    currentTemperature: `${Math.round(apiPayload.current?.temperature_2m ?? 0)}°`,
    condition: formatWeatherCondition(apiPayload.current?.weather_code ?? -1),
    rangeSummary: `High ${high}° / Low ${low}° / Wind ${windSpeed} km/h`,
    forecast,
  }
}

const fetchLiveWeatherPayload = async (latitude, longitude, locationLabel) => {
  const response = await fetch(buildWeatherApiUrl(latitude, longitude))

  if (!response.ok) {
    throw new Error(`Weather API failed with ${response.status}`)
  }

  const apiPayload = await response.json()

  return buildWeatherPayload(apiPayload, locationLabel)
}

const getWeatherPayload = async (latitude, longitude, locationLabel) => {
  const cacheKey = `${latitude}:${longitude}:${locationLabel}`
  const cachedValue = weatherCache.get(cacheKey)

  if (cachedValue && cachedValue.expiresAt > Date.now()) {
    return cachedValue.payload
  }

  try {
    const payload = await fetchLiveWeatherPayload(latitude, longitude, locationLabel)

    weatherCache.set(cacheKey, {
      payload,
      expiresAt: Date.now() + WEATHER_CACHE_TTL_MS,
    })

    return payload
  } catch (error) {
    if (cachedValue?.payload) {
      return {
        ...cachedValue.payload,
        stale: true,
      }
    }

    throw error
  }
}

const normalizeAssistantToolNumberArgument = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsedValue = Number.parseFloat(value)

    return Number.isFinite(parsedValue) ? parsedValue : null
  }

  return null
}

const normalizeAssistantToolStringArgument = (value, fallback = '') => {
  if (typeof value !== 'string') {
    return fallback
  }

  return value.trim()
}

const normalizeAssistantToolIntegerArgument = (value) => {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsedValue = Number.parseInt(value, 10)

    return Number.isInteger(parsedValue) ? parsedValue : null
  }

  return null
}

const buildAssistantArrivalBoardEvents = (
  agendaItems,
  referenceTime,
  units,
) => {
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

      let value

      if (totalHours < 5) {
        const hours = Math.floor(totalMinutes / 60)
        const minutes = totalMinutes % 60
        value =
          hours > 0
            ? `${hours}${units.hourAbbr} ${minutes}${units.minuteAbbr}`
            : `${Math.max(1, minutes)}${units.minuteAbbr}`
      } else if (totalHours < 24) {
        value = `${Math.max(1, Math.round(totalHours))}${units.hourAbbr}`
      } else {
        value = `${Math.max(1, Math.ceil(totalHours / 24))}${units.dayAbbr}`
      }

      return {
        line: `arrival-${agendaItem.line}`,
        eventId: agendaItem.eventId,
        eventDate: agendaItem.date,
        destination: agendaItem.title,
        direction: 'Arrival',
        platform: agendaItem.location,
        value,
        unit: '',
        isSameDay:
          eventDateTime.getFullYear() === referenceYear &&
          eventDateTime.getMonth() === referenceMonth &&
          eventDateTime.getDate() === referenceDay,
        members: agendaItem.members,
        cancelled: agendaItem.cancelled,
      }
    })
}

const executeArrivalBoardGetWidgetStateTool = async (ownerUserId, argumentsValue) => {
  const focusedMemberId = normalizeAssistantToolStringArgument(argumentsValue?.focusedMemberId)
  const settings = readAssistantWidgetSettings(ownerUserId, 'arrival-board')
  const calendarSettings = readAssistantWidgetSettings(ownerUserId, 'calendar')
  const now = new Date()
  const agendaItems = selectCalendarEventsByRange(
    ownerUserId,
    formatIsoDate(now),
    formatIsoDate(addDaysToDate(now, 30)),
  ).map((event) => buildCalendarEventPayload(event, event.occurrenceDate))

  const filteredAgenda = agendaItems
    .filter((agendaItem) =>
      !focusedMemberId ||
      agendaItem.members.includes(LEGACY_HOUSEHOLD_MEMBER_ID) ||
      agendaItem.members.includes(focusedMemberId),
    )
    .filter((agendaItem) =>
      calendarSettings.includeHouseholdEvents === false
        ? !agendaItem.members.includes(LEGACY_HOUSEHOLD_MEMBER_ID)
        : true,
    )
    .sort(
      (left, right) => left.date.localeCompare(right.date) || left.time.localeCompare(right.time),
    )

  return {
    widgetId: 'arrival-board',
    settings,
    focusedMemberId: focusedMemberId || null,
    arrivals: buildAssistantArrivalBoardEvents(filteredAgenda, now, {
      hourAbbr: 'h',
      minuteAbbr: 'm',
      dayAbbr: 'd',
    }),
  }
}

const executeArrivalBoardGetArrivalEventDetailTool = async (ownerUserId, argumentsValue) => {
  const eventId = normalizeAssistantToolStringArgument(argumentsValue?.eventId)

  if (!eventId) {
    throw new AssistantRuntimeError(
      'Arrival board event detail requires an eventId argument.',
      400,
      'assistant_tool_arguments_invalid',
    )
  }

  const baseEventId = eventId.includes('__') ? eventId.split('__')[0] : eventId
  const occurrenceDate = eventId.includes('__') ? eventId.split('__')[1] : null
  const event = selectNormalizedCalendarEventById(ownerUserId, baseEventId)

  if (!event) {
    throw new AssistantRuntimeError(
      'Arrival board event detail could not find the selected calendar event.',
      404,
      'assistant_tool_not_found',
    )
  }

  return {
    widgetId: 'arrival-board',
    calendarEvent: buildCalendarEventPayload(event, occurrenceDate || event.date),
  }
}

const executeArrivalBoardUpdateWidgetSettingsTool = async (ownerUserId, argumentsValue) => {
  const currentSettings = readAssistantWidgetSettings(ownerUserId, 'arrival-board')
  const nextSettings = {
    boardTitle:
      normalizeAssistantToolStringArgument(argumentsValue?.boardTitle) ||
      (typeof currentSettings.boardTitle === 'string' ? currentSettings.boardTitle : 'Home Info Kiosk'),
    boardSubheading:
      normalizeAssistantToolStringArgument(argumentsValue?.boardSubheading) ||
      (typeof currentSettings.boardSubheading === 'string'
        ? currentSettings.boardSubheading
        : 'Family Avenue South'),
  }

  return updateAssistantWidgetSettings(ownerUserId, 'arrival-board', nextSettings)
}

const executeWeatherGetWidgetStateTool = async (ownerUserId) => {
  const settings = readAssistantWidgetSettings(ownerUserId, 'weather')
  const normalizedSettings = typeof settings === 'object' && settings ? settings : {}
  const configuredLocations = Array.isArray(normalizedSettings.locations)
    ? normalizedSettings.locations
    : [
        {
          id: 'location-1',
          label: typeof normalizedSettings.locationLabel === 'string' ? normalizedSettings.locationLabel : WEATHER_LOCATION,
          latitude:
            typeof normalizedSettings.latitude === 'number' ? normalizedSettings.latitude : WEATHER_LATITUDE,
          longitude:
            typeof normalizedSettings.longitude === 'number' ? normalizedSettings.longitude : WEATHER_LONGITUDE,
        },
      ]

  const locations = []

  for (const location of configuredLocations) {
    const latitude = normalizeAssistantToolNumberArgument(location.latitude)
    const longitude = normalizeAssistantToolNumberArgument(location.longitude)
    const label = normalizeAssistantToolStringArgument(location.label, WEATHER_LOCATION)

    if (latitude === null || longitude === null) {
      continue
    }

    locations.push({
      id: typeof location.id === 'string' ? location.id : `location-${locations.length + 1}`,
      weather: await getWeatherPayload(latitude, longitude, label),
    })
  }

  return {
    widgetId: 'weather',
    settings: normalizedSettings,
    locations,
  }
}

const executeWeatherUpdateWidgetSettingsTool = async (ownerUserId, argumentsValue) => {
  const currentSettings = readAssistantWidgetSettings(ownerUserId, 'weather')
  let parsedLocations = currentSettings.locations

  if (typeof argumentsValue?.locations === 'string' && argumentsValue.locations.trim().length > 0) {
    try {
      parsedLocations = JSON.parse(argumentsValue.locations)
    } catch {
      throw new AssistantRuntimeError(
        'Weather widget locations must be a valid JSON array string when provided.',
        400,
        'assistant_tool_arguments_invalid',
      )
    }
  }

  const nextSettings = {
    ...currentSettings,
    ...(typeof argumentsValue?.focusLocationSlot === 'number'
      ? { focusLocationSlot: argumentsValue.focusLocationSlot }
      : {}),
    ...(typeof argumentsValue?.refreshIntervalMinutes === 'number'
      ? { refreshIntervalMinutes: argumentsValue.refreshIntervalMinutes }
      : {}),
    ...(parsedLocations ? { locations: parsedLocations } : {}),
  }

  return updateAssistantWidgetSettings(ownerUserId, 'weather', nextSettings)
}

const executeYoutubeGetWidgetStateTool = async (ownerUserId) => ({
  widgetId: 'youtube',
  settings: readAssistantWidgetSettings(ownerUserId, 'youtube'),
})

const executeYoutubeSearchVideosTool = async (_ownerUserId, argumentsValue) => {
  const query = normalizeAssistantToolStringArgument(argumentsValue?.query)

  if (!query) {
    throw new AssistantRuntimeError(
      'YouTube search requires a query argument.',
      400,
      'assistant_tool_arguments_invalid',
    )
  }

  const videos = await searchYoutubeVideos(query)
  const selectedVideoId = normalizeAssistantToolStringArgument(argumentsValue?.selectedVideoId)
  const selectedIndex = normalizeAssistantToolNumberArgument(argumentsValue?.selectedIndex)
  const selectedVideo = selectedVideoId
    ? videos.find((video) => video.id === selectedVideoId) ?? null
    : typeof selectedIndex === 'number' && Number.isInteger(selectedIndex)
      ? videos[selectedIndex] ?? null
      : videos[0] ?? null

  return {
    widgetId: 'youtube',
    query,
    videos,
    selectedVideo: selectedVideo ?? null,
  }
}

const executeYoutubeUpdateWidgetSettingsTool = async (ownerUserId, argumentsValue) => {
  const currentSettings = readAssistantWidgetSettings(ownerUserId, 'youtube')
  const nextSettings = {
    ...currentSettings,
    ...(typeof argumentsValue?.autoPlay === 'boolean'
      ? { autoPlay: argumentsValue.autoPlay }
      : {}),
  }

  return updateAssistantWidgetSettings(ownerUserId, 'youtube', nextSettings)
}

const executeTodoGetWidgetStateTool = async (ownerUserId, argumentsValue) => {
  const focusedMemberId = normalizeAssistantToolStringArgument(argumentsValue?.focusedMemberId)
  const settings = readAssistantWidgetSettings(ownerUserId, 'todo')
  const todoItems = selectAllTodoItems(ownerUserId)
  const maxItems =
    typeof settings.maxItems === 'number' && Number.isFinite(settings.maxItems)
      ? Math.min(Math.max(Math.round(settings.maxItems), 1), 10)
      : 4
  const showCompleted =
    typeof settings.showCompleted === 'boolean' ? settings.showCompleted : true

  const visibleItems = todoItems
    .filter((todoItem) =>
      !focusedMemberId ||
      todoItem.members.includes(LEGACY_HOUSEHOLD_MEMBER_ID) ||
      todoItem.members.includes(focusedMemberId),
    )
    .filter((todoItem) => (showCompleted ? true : !todoItem.done))
    .slice(0, maxItems)

  return {
    widgetId: 'todo',
    settings: {
      maxItems,
      showCompleted,
    },
    focusedMemberId: focusedMemberId || null,
    items: visibleItems,
  }
}

const executeTodoSetItemDoneStateTool = async (ownerUserId, argumentsValue) => {
  const todoItemId = normalizeAssistantToolStringArgument(argumentsValue?.todoItemId)

  if (!todoItemId || typeof argumentsValue?.done !== 'boolean') {
    throw new AssistantRuntimeError(
      'Todo item updates require todoItemId and done arguments.',
      400,
      'assistant_tool_arguments_invalid',
    )
  }

  const existingTodoItem = selectTodoItemById(ownerUserId, todoItemId)

  if (!existingTodoItem) {
    throw new AssistantRuntimeError(
      'Todo item not found.',
      404,
      'assistant_tool_not_found',
    )
  }

  const updatedAt = new Date().toISOString()
  updateTodoItemDone(ownerUserId, todoItemId, argumentsValue.done, updatedAt)

  return {
    widgetId: 'todo',
    todoItem: {
      ...existingTodoItem,
      done: argumentsValue.done,
    },
    updatedAt,
  }
}

const executeTodoUpdateWidgetSettingsTool = async (ownerUserId, argumentsValue) => {
  const currentSettings = readAssistantWidgetSettings(ownerUserId, 'todo')
  const nextSettings = {
    maxItems:
      typeof argumentsValue?.maxItems === 'number' && argumentsValue.maxItems > 0
        ? Math.min(argumentsValue.maxItems, 10)
        : typeof currentSettings.maxItems === 'number' && currentSettings.maxItems > 0
          ? Math.min(currentSettings.maxItems, 10)
          : 4,
    showCompleted:
      typeof argumentsValue?.showCompleted === 'boolean'
        ? argumentsValue.showCompleted
        : typeof currentSettings.showCompleted === 'boolean'
          ? currentSettings.showCompleted
          : true,
  }

  return updateAssistantWidgetSettings(ownerUserId, 'todo', nextSettings)
}

const buildAssistantCalendarToolInput = (argumentsValue, currentEvent = null) => {
  const scopeMode = normalizeAssistantToolStringArgument(argumentsValue?.scopeMode)
  const scopeMemberIds = parseAssistantJsonStringArgument(
    argumentsValue?.scopeMemberIdsJson,
    currentEvent?.scope?.memberIds ?? [],
  )
  const recurrenceByWeekdays = parseAssistantJsonStringArgument(
    argumentsValue?.recurrenceByWeekdaysJson,
    currentEvent?.recurrence?.byWeekdays ?? [],
  )
  const excludedDates = parseAssistantJsonStringArgument(
    argumentsValue?.excludedDatesJson,
    currentEvent?.excludedDates ?? [],
  )

  return {
    ...(typeof argumentsValue?.date === 'string' ? { date: argumentsValue.date } : {}),
    ...(typeof argumentsValue?.time === 'string' ? { time: argumentsValue.time } : {}),
    ...(typeof argumentsValue?.title === 'string' ? { title: argumentsValue.title } : {}),
    ...(typeof argumentsValue?.description === 'string'
      ? { description: argumentsValue.description }
      : {}),
    ...(typeof argumentsValue?.locationCity === 'string'
      ? { locationCity: argumentsValue.locationCity }
      : {}),
    ...(typeof argumentsValue?.locationCountry === 'string'
      ? { locationCountry: argumentsValue.locationCountry }
      : {}),
    ...(scopeMode
      ? {
          scope: {
            mode: scopeMode,
            memberIds: Array.isArray(scopeMemberIds) ? scopeMemberIds : [],
          },
        }
      : {}),
    recurrence: {
      frequency:
        normalizeAssistantToolStringArgument(argumentsValue?.recurrenceFrequency) ||
        currentEvent?.recurrence?.frequency ||
        'none',
      interval:
        normalizeAssistantToolIntegerArgument(argumentsValue?.recurrenceInterval) ??
        currentEvent?.recurrence?.interval ??
        1,
      byWeekdays: Array.isArray(recurrenceByWeekdays) ? recurrenceByWeekdays : [],
      count:
        normalizeAssistantToolIntegerArgument(argumentsValue?.recurrenceCount) ??
        currentEvent?.recurrence?.count ??
        null,
      until:
        normalizeAssistantToolStringArgument(argumentsValue?.recurrenceUntil) ||
        currentEvent?.recurrence?.until ||
        null,
    },
    excludedDates: Array.isArray(excludedDates) ? excludedDates : [],
    ...(typeof argumentsValue?.cancelled === 'boolean'
      ? { cancelled: argumentsValue.cancelled }
      : {}),
  }
}

const executeCalendarGetRangeEventsTool = async (ownerUserId, argumentsValue) => {
  const rangeStart = normalizeAssistantToolStringArgument(argumentsValue?.rangeStart)
  const rangeEnd = normalizeAssistantToolStringArgument(argumentsValue?.rangeEnd)

  if (!rangeStart || !rangeEnd) {
    throw new AssistantRuntimeError(
      'Calendar range queries require rangeStart and rangeEnd arguments.',
      400,
      'assistant_tool_arguments_invalid',
    )
  }

  const focusedMemberId = normalizeAssistantToolStringArgument(argumentsValue?.focusedMemberId)
  const includeHouseholdEvents =
    typeof argumentsValue?.includeHouseholdEvents === 'boolean'
      ? argumentsValue.includeHouseholdEvents
      : readAssistantWidgetSettings(ownerUserId, 'calendar').includeHouseholdEvents !== false
  const events = selectCalendarEventsByRange(ownerUserId, rangeStart, rangeEnd)
    .filter((event) =>
      !focusedMemberId ||
      event.members.includes(LEGACY_HOUSEHOLD_MEMBER_ID) ||
      event.members.includes(focusedMemberId),
    )
    .filter((event) =>
      includeHouseholdEvents ? true : !event.members.includes(LEGACY_HOUSEHOLD_MEMBER_ID),
    )

  return {
    widgetId: 'calendar',
    settings: {
      includeHouseholdEvents,
    },
    rangeStart,
    rangeEnd,
    focusedMemberId: focusedMemberId || null,
    calendarEvents: events,
  }
}

const executeCalendarCreateEventTool = async (ownerUserId, argumentsValue) => {
  const validMemberIds = buildFamilyMemberIdSet(ownerUserId)
  const result = buildCalendarEventFromInput({
    value: buildAssistantCalendarToolInput(argumentsValue),
    validMemberIds,
  })

  if (result.error) {
    throw new AssistantRuntimeError(result.error, 400, 'assistant_tool_arguments_invalid')
  }

  const calendarEventId = `calendar-${randomUUID()}`
  const timestamp = new Date().toISOString()
  insertCalendarEvent(
    ownerUserId,
    {
      id: calendarEventId,
      ...result.calendarEvent,
    },
    timestamp,
    timestamp,
  )

  return {
    widgetId: 'calendar',
    calendarEvent: buildCalendarEventPayload(
      selectNormalizedCalendarEventById(ownerUserId, calendarEventId),
    ),
  }
}

const executeCalendarUpdateEventTool = async (ownerUserId, argumentsValue) => {
  const calendarEventId = normalizeAssistantToolStringArgument(argumentsValue?.calendarEventId)

  if (!calendarEventId) {
    throw new AssistantRuntimeError(
      'Calendar updates require a calendarEventId argument.',
      400,
      'assistant_tool_arguments_invalid',
    )
  }

  const currentEvent = selectNormalizedCalendarEventById(ownerUserId, calendarEventId)

  if (!currentEvent) {
    throw new AssistantRuntimeError('Calendar event not found.', 404, 'assistant_tool_not_found')
  }

  const validMemberIds = buildFamilyMemberIdSet(ownerUserId)
  const result = buildCalendarEventFromInput({
    value: buildAssistantCalendarToolInput(argumentsValue, currentEvent),
    validMemberIds,
    currentEvent,
  })

  if (result.error) {
    throw new AssistantRuntimeError(result.error, 400, 'assistant_tool_arguments_invalid')
  }

  updateCalendarEventRecord(
    ownerUserId,
    calendarEventId,
    result.calendarEvent,
    new Date().toISOString(),
  )

  return {
    widgetId: 'calendar',
    calendarEvent: buildCalendarEventPayload(
      selectNormalizedCalendarEventById(ownerUserId, calendarEventId),
    ),
  }
}

const executeCalendarDeleteEventTool = async (ownerUserId, argumentsValue) => {
  const calendarEventId = normalizeAssistantToolStringArgument(argumentsValue?.calendarEventId)

  if (!calendarEventId) {
    throw new AssistantRuntimeError(
      'Calendar deletes require a calendarEventId argument.',
      400,
      'assistant_tool_arguments_invalid',
    )
  }

  const currentEvent = selectNormalizedCalendarEventById(ownerUserId, calendarEventId)

  if (!currentEvent) {
    throw new AssistantRuntimeError('Calendar event not found.', 404, 'assistant_tool_not_found')
  }

  deleteCalendarEventById(ownerUserId, calendarEventId)

  return {
    widgetId: 'calendar',
    deletedCalendarEventId: calendarEventId,
    title: currentEvent.title,
  }
}

const executeCalendarUpdateWidgetSettingsTool = async (ownerUserId, argumentsValue) => {
  const currentSettings = readAssistantWidgetSettings(ownerUserId, 'calendar')
  const nextSettings = {
    includeHouseholdEvents:
      typeof argumentsValue?.includeHouseholdEvents === 'boolean'
        ? argumentsValue.includeHouseholdEvents
        : currentSettings.includeHouseholdEvents !== false,
  }

  return updateAssistantWidgetSettings(ownerUserId, 'calendar', nextSettings)
}

const executeBringGetWidgetStateTool = async (ownerUserId) => ({
  widgetId: 'bring',
  bringSettings: selectBringSettings(ownerUserId),
  bringList: await getBringListWithFallback(ownerUserId),
})

const executeBringLoadAvailableListsTool = async (ownerUserId, argumentsValue) => {
  const { username, password } = resolveBringCredentials(ownerUserId, argumentsValue)

  if (!username || !password) {
    throw new AssistantRuntimeError(
      'Bring list discovery requires valid Bring credentials.',
      400,
      'assistant_tool_arguments_invalid',
    )
  }

  return {
    widgetId: 'bring',
    lists: await loadBringLists(username, password),
    bringSettings: selectBringSettings(ownerUserId),
  }
}

const executeBringUpdateWidgetSettingsTool = async (ownerUserId, argumentsValue) => {
  ensureBringCredentialEncryptionConfigured()
  const { currentIntegration, username, password, hasStoredPassword } = resolveBringCredentials(
    ownerUserId,
    argumentsValue,
  )

  if (!username || !password) {
    throw new AssistantRuntimeError(
      'Bring settings updates require valid Bring credentials.',
      400,
      'assistant_tool_arguments_invalid',
    )
  }

  const lists = await loadBringLists(username, password)
  const requestedSelectedListUuid = normalizeBringListUuid(
    argumentsValue?.selectedListUuid ?? currentIntegration?.selected_list_uuid,
  )
  const selectedList = requestedSelectedListUuid
    ? lists.find((entry) => entry.listUuid === requestedSelectedListUuid) ?? null
    : null

  if (lists.length > 0 && !selectedList) {
    throw new AssistantRuntimeError(
      'selectedListUuid must match one available Bring shopping list.',
      400,
      'assistant_tool_arguments_invalid',
    )
  }

  const encryptedPasswordJson =
    typeof argumentsValue?.password === 'string' && argumentsValue.password.length > 0
      ? encryptBringPassword(password)
      : hasStoredPassword
        ? currentIntegration.encrypted_password_json
        : encryptBringPassword(password)
  const timestamp = new Date().toISOString()

  upsertBringIntegration(
    ownerUserId,
    username,
    encryptedPasswordJson,
    selectedList?.listUuid ?? '',
    selectedList?.name ?? '',
    timestamp,
  )

  return {
    widgetId: 'bring',
    bringSettings: selectBringSettings(ownerUserId),
    lists,
  }
}

const executeBringRefreshSelectedListTool = async (ownerUserId) => ({
  widgetId: 'bring',
  bringList: await refreshBringSelectedList(ownerUserId),
})

const executeBringAddItemTool = async (ownerUserId, argumentsValue) => {
  const itemName = sanitizeBringItemName(argumentsValue?.itemName)

  if (!itemName) {
    throw new AssistantRuntimeError(
      'Bring add_item requires an itemName argument.',
      400,
      'assistant_tool_arguments_invalid',
    )
  }

  return {
    widgetId: 'bring',
    bringList: await mutateBringSelectedList(ownerUserId, '/selected-list/items/add', {
      itemName,
      specification: sanitizeBringItemSpecification(argumentsValue?.specification),
      itemUuid: normalizeBringItemUuid(argumentsValue?.itemUuid) || randomUUID(),
    }),
  }
}

const executeBringCompleteItemTool = async (ownerUserId, argumentsValue) => {
  const itemName = sanitizeBringItemName(argumentsValue?.itemName)

  if (!itemName) {
    throw new AssistantRuntimeError(
      'Bring complete_item requires an itemName argument.',
      400,
      'assistant_tool_arguments_invalid',
    )
  }

  return {
    widgetId: 'bring',
    bringList: await mutateBringSelectedList(ownerUserId, '/selected-list/items/complete', {
      itemName,
      specification: sanitizeBringItemSpecification(argumentsValue?.specification),
      itemUuid: normalizeBringItemUuid(argumentsValue?.itemUuid),
    }),
  }
}

const executeBringReopenRecentItemTool = async (ownerUserId, argumentsValue) => {
  const itemName = sanitizeBringItemName(argumentsValue?.itemName)

  if (!itemName) {
    throw new AssistantRuntimeError(
      'Bring reopen_recent_item requires an itemName argument.',
      400,
      'assistant_tool_arguments_invalid',
    )
  }

  return {
    widgetId: 'bring',
    bringList: await mutateBringSelectedList(ownerUserId, '/selected-list/items/add', {
      itemName,
      specification: sanitizeBringItemSpecification(argumentsValue?.specification),
      itemUuid: randomUUID(),
    }),
  }
}

const executeRoborockGetWidgetStateTool = async (ownerUserId) => ({
  widgetId: 'roborock',
  roborockSettings: selectRoborockSettings(ownerUserId),
})

const executeRoborockRequestLoginCodeTool = async (_ownerUserId, argumentsValue) => {
  const email = sanitizeRoborockEmail(argumentsValue?.email)

  if (!email) {
    throw new AssistantRuntimeError(
      'Roborock request_login_code requires an email argument.',
      400,
      'assistant_tool_arguments_invalid',
    )
  }

  await requestRoborockLoginCode(email)

  return {
    widgetId: 'roborock',
    requestedForEmail: email,
    ok: true,
  }
}

const executeRoborockCreateSessionTool = async (ownerUserId, argumentsValue) => {
  ensureRoborockSessionEncryptionConfigured()
  const email = sanitizeRoborockEmail(argumentsValue?.email)
  const verificationCode = sanitizeRoborockVerificationCode(argumentsValue?.verificationCode)

  if (!email || !verificationCode) {
    throw new AssistantRuntimeError(
      'Roborock create_session requires email and verificationCode arguments.',
      400,
      'assistant_tool_arguments_invalid',
    )
  }

  const sessionPayload = await loginRoborockAccount(email, verificationCode)
  const timestamp = new Date().toISOString()

  upsertRoborockIntegration(
    ownerUserId,
    email,
    encryptRoborockSessionPayload(JSON.stringify(sessionPayload)),
    sessionPayload.baseUrl,
    'connected',
    timestamp,
    timestamp,
    timestamp,
  )
  updateRoborockSelection(ownerUserId, '', '', '', null, '', timestamp)

  return {
    widgetId: 'roborock',
    roborockSettings: selectRoborockSettings(ownerUserId),
  }
}

const executeRoborockLoadDevicesTool = async (ownerUserId, argumentsValue) => {
  const requestedSelectedDeviceDuid = normalizeRoborockDeviceDuid(argumentsValue?.selectedDeviceDuid)
  const discovery = await loadRoborockDeviceDiscovery(ownerUserId, requestedSelectedDeviceDuid)

  return {
    widgetId: 'roborock',
    devices: discovery.devices,
    routines: discovery.routines,
    selectedDeviceDuid: discovery.selectedDeviceDuid,
    roborockSettings: selectRoborockSettings(ownerUserId),
  }
}

const executeRoborockUpdateSelectionTool = async (ownerUserId, argumentsValue) => {
  const selectedDeviceDuid = normalizeRoborockDeviceDuid(argumentsValue?.selectedDeviceDuid)
  const selectedRoutineId = normalizeRoborockRoutineId(argumentsValue?.selectedRoutineId)

  if (!selectedDeviceDuid) {
    throw new AssistantRuntimeError(
      'Roborock update_selection requires selectedDeviceDuid.',
      400,
      'assistant_tool_arguments_invalid',
    )
  }

  const discovery = await loadRoborockDeviceDiscovery(ownerUserId, selectedDeviceDuid)
  const selectedDevice =
    discovery.devices.find((device) => device.duid === selectedDeviceDuid) ?? null

  if (!selectedDevice) {
    throw new AssistantRuntimeError(
      'selectedDeviceDuid must match one available Roborock device.',
      400,
      'assistant_tool_arguments_invalid',
    )
  }

  const selectedRoutine =
    selectedRoutineId === null
      ? null
      : discovery.routines.find((routine) => routine.id === selectedRoutineId) ?? null

  if (selectedRoutineId !== null && !selectedRoutine) {
    throw new AssistantRuntimeError(
      'selectedRoutineId must match one available Roborock routine.',
      400,
      'assistant_tool_arguments_invalid',
    )
  }

  const timestamp = new Date().toISOString()
  updateRoborockSelection(
    ownerUserId,
    selectedDevice.duid,
    selectedDevice.name,
    selectedDevice.model,
    selectedRoutine?.id ?? null,
    selectedRoutine?.name ?? '',
    timestamp,
  )

  return {
    widgetId: 'roborock',
    roborockSettings: selectRoborockSettings(ownerUserId),
    devices: discovery.devices,
    routines: discovery.routines,
    selectedDeviceDuid: selectedDevice.duid,
  }
}

const executeRoborockValidateSessionTool = async (ownerUserId) => ({
  widgetId: 'roborock',
  validation: await validateRoborockStoredSession(ownerUserId),
})

const executeWeatherWidgetAssistantTool = async (_ownerUserId, argumentsValue) => {
  const candidate = argumentsValue && typeof argumentsValue === 'object' ? argumentsValue : {}
  const latitude = normalizeAssistantToolNumberArgument(candidate.latitude)
  const longitude = normalizeAssistantToolNumberArgument(candidate.longitude)
  const locationLabel = sanitizeAssistantWidgetLabel(candidate.locationLabel) || WEATHER_LOCATION

  if (latitude === null || latitude < -90 || latitude > 90) {
    throw new AssistantRuntimeError(
      'Weather widget tool requires a valid latitude argument.',
      400,
      'assistant_tool_arguments_invalid',
    )
  }

  if (longitude === null || longitude < -180 || longitude > 180) {
    throw new AssistantRuntimeError(
      'Weather widget tool requires a valid longitude argument.',
      400,
      'assistant_tool_arguments_invalid',
    )
  }

  const weather = await getWeatherPayload(latitude, longitude, locationLabel)

  return {
    widgetId: 'weather',
    sourceLocation: 'weather',
    locationQuery: {
      latitude,
      longitude,
      locationLabel,
    },
    weather,
  }
}

const assistantInternalWidgetToolHandlers = new Map([
  [
    'widget.calendar.get_range_events',
    {
      serverName: 'subway-widget-runtime',
      execute: executeCalendarGetRangeEventsTool,
    },
  ],
  [
    'widget.calendar.create_event',
    {
      serverName: 'subway-widget-runtime',
      execute: executeCalendarCreateEventTool,
    },
  ],
  [
    'widget.calendar.update_event',
    {
      serverName: 'subway-widget-runtime',
      execute: executeCalendarUpdateEventTool,
    },
  ],
  [
    'widget.calendar.delete_event',
    {
      serverName: 'subway-widget-runtime',
      execute: executeCalendarDeleteEventTool,
    },
  ],
  [
    'widget.calendar.update_widget_settings',
    {
      serverName: 'subway-widget-runtime',
      execute: executeCalendarUpdateWidgetSettingsTool,
    },
  ],
  [
    'widget.todo.get_widget_state',
    {
      serverName: 'subway-widget-runtime',
      execute: executeTodoGetWidgetStateTool,
    },
  ],
  [
    'widget.todo.set_item_done_state',
    {
      serverName: 'subway-widget-runtime',
      execute: executeTodoSetItemDoneStateTool,
    },
  ],
  [
    'widget.todo.update_widget_settings',
    {
      serverName: 'subway-widget-runtime',
      execute: executeTodoUpdateWidgetSettingsTool,
    },
  ],
  [
    'widget.bring.get_widget_state',
    {
      serverName: 'subway-widget-runtime',
      execute: executeBringGetWidgetStateTool,
    },
  ],
  [
    'widget.bring.load_available_lists',
    {
      serverName: 'subway-widget-runtime',
      execute: executeBringLoadAvailableListsTool,
    },
  ],
  [
    'widget.bring.update_widget_settings',
    {
      serverName: 'subway-widget-runtime',
      execute: executeBringUpdateWidgetSettingsTool,
    },
  ],
  [
    'widget.bring.refresh_selected_list',
    {
      serverName: 'subway-widget-runtime',
      execute: executeBringRefreshSelectedListTool,
    },
  ],
  [
    'widget.bring.add_item',
    {
      serverName: 'subway-widget-runtime',
      execute: executeBringAddItemTool,
    },
  ],
  [
    'widget.bring.complete_item',
    {
      serverName: 'subway-widget-runtime',
      execute: executeBringCompleteItemTool,
    },
  ],
  [
    'widget.bring.reopen_recent_item',
    {
      serverName: 'subway-widget-runtime',
      execute: executeBringReopenRecentItemTool,
    },
  ],
  [
    'widget.roborock.get_widget_state',
    {
      serverName: 'subway-widget-runtime',
      execute: executeRoborockGetWidgetStateTool,
    },
  ],
  [
    'widget.roborock.request_login_code',
    {
      serverName: 'subway-widget-runtime',
      execute: executeRoborockRequestLoginCodeTool,
    },
  ],
  [
    'widget.roborock.create_session',
    {
      serverName: 'subway-widget-runtime',
      execute: executeRoborockCreateSessionTool,
    },
  ],
  [
    'widget.roborock.load_devices',
    {
      serverName: 'subway-widget-runtime',
      execute: executeRoborockLoadDevicesTool,
    },
  ],
  [
    'widget.roborock.update_selection',
    {
      serverName: 'subway-widget-runtime',
      execute: executeRoborockUpdateSelectionTool,
    },
  ],
  [
    'widget.roborock.validate_session',
    {
      serverName: 'subway-widget-runtime',
      execute: executeRoborockValidateSessionTool,
    },
  ],
  [
    'widget.arrival_board.get_widget_state',
    {
      serverName: 'subway-widget-runtime',
      execute: executeArrivalBoardGetWidgetStateTool,
    },
  ],
  [
    'widget.arrival_board.get_arrival_event_detail',
    {
      serverName: 'subway-widget-runtime',
      execute: executeArrivalBoardGetArrivalEventDetailTool,
    },
  ],
  [
    'widget.arrival_board.update_widget_settings',
    {
      serverName: 'subway-widget-runtime',
      execute: executeArrivalBoardUpdateWidgetSettingsTool,
    },
  ],
  [
    'widget.weather.get_widget_state',
    {
      serverName: 'subway-widget-runtime',
      execute: executeWeatherGetWidgetStateTool,
    },
  ],
  [
    'widget.weather.get_current_weather',
    {
      serverName: 'subway-widget-runtime',
      execute: executeWeatherWidgetAssistantTool,
    },
  ],
  [
    'widget.weather.update_widget_settings',
    {
      serverName: 'subway-widget-runtime',
      execute: executeWeatherUpdateWidgetSettingsTool,
    },
  ],
  [
    'widget.youtube.get_widget_state',
    {
      serverName: 'subway-widget-runtime',
      execute: executeYoutubeGetWidgetStateTool,
    },
  ],
  [
    'widget.youtube.search_videos',
    {
      serverName: 'subway-widget-runtime',
      execute: executeYoutubeSearchVideosTool,
    },
  ],
  [
    'widget.youtube.update_widget_settings',
    {
      serverName: 'subway-widget-runtime',
      execute: executeYoutubeUpdateWidgetSettingsTool,
    },
  ],
])

const buildYoutubeSearchUrl = (query) => {
  const url = new URL('https://www.youtube.com/results')
  url.searchParams.set('search_query', query)
  url.searchParams.set('hl', 'en')

  return url
}

const readYoutubeInitialData = (html) => {
  const patterns = [
    /var ytInitialData = (\{[\s\S]*?\});<\/script>/,
    /window\["ytInitialData"\] = (\{[\s\S]*?\});/,
  ]

  for (const pattern of patterns) {
    const match = pattern.exec(html)

    if (match && match[1]) {
      try {
        return JSON.parse(match[1])
      } catch {
        continue
      }
    }
  }

  return null
}

const readYoutubeRunsText = (value) => {
  if (typeof value?.simpleText === 'string') {
    return value.simpleText.trim()
  }

  if (Array.isArray(value?.runs)) {
    return value.runs
      .map((run) => (typeof run?.text === 'string' ? run.text : ''))
      .join('')
      .trim()
  }

  return ''
}

const extractYoutubeVideoRenderers = (root) => {
  const videoRenderers = []
  const stack = [root]

  while (stack.length > 0) {
    const currentValue = stack.pop()

    if (!currentValue || typeof currentValue !== 'object') {
      continue
    }

    if (Array.isArray(currentValue)) {
      for (const item of currentValue) {
        stack.push(item)
      }
      continue
    }

    if (currentValue.videoRenderer) {
      videoRenderers.push(currentValue.videoRenderer)
    }

    for (const nestedValue of Object.values(currentValue)) {
      stack.push(nestedValue)
    }
  }

  return videoRenderers
}

const mapYoutubeSearchResults = (videoRenderers) => {
  const usedIds = new Set()
  const results = []

  for (const renderer of videoRenderers) {
    const id = typeof renderer?.videoId === 'string' ? renderer.videoId : ''

    if (!id || usedIds.has(id)) {
      continue
    }

    const title = readYoutubeRunsText(renderer?.title)
    const channel = readYoutubeRunsText(renderer?.ownerText)
    const duration = readYoutubeRunsText(renderer?.lengthText)
    const thumbnails = Array.isArray(renderer?.thumbnail?.thumbnails)
      ? renderer.thumbnail.thumbnails
      : []
    const thumbnailUrl =
      thumbnails.length > 0 && typeof thumbnails[thumbnails.length - 1]?.url === 'string'
        ? thumbnails[thumbnails.length - 1].url
        : `https://img.youtube.com/vi/${id}/mqdefault.jpg`

    if (!title) {
      continue
    }

    usedIds.add(id)
    results.push({
      id,
      title,
      channel: channel || 'Unknown channel',
      duration: duration || undefined,
      thumbnail: thumbnailUrl,
    })

    if (results.length >= YOUTUBE_RESULTS_LIMIT) {
      break
    }
  }

  return results
}

const searchYoutubeVideos = async (query) => {
  const response = await fetch(buildYoutubeSearchUrl(query), {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      Accept: 'text/html',
      'Accept-Language': 'en-US,en;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`YouTube search request failed with ${response.status}`)
  }

  const html = await response.text()
  const initialData = readYoutubeInitialData(html)

  if (!initialData) {
    return []
  }

  const videoRenderers = extractYoutubeVideoRenderers(initialData)
  return mapYoutubeSearchResults(videoRenderers)
}

const selectAllTodoItems = (ownerUserId) =>
  db
    .prepare(`
      SELECT
        id,
        task,
        due_label AS due,
        lane,
        member_ids,
        is_done
      FROM todo_items
      WHERE owner_user_id = ?
      ORDER BY created_at ASC, id ASC
    `)
    .all(ownerUserId)
    .map((row) => ({
      id: row.id,
      task: row.task,
      due: row.due,
      lane: row.lane,
      done: Boolean(row.is_done),
      members: parseJsonArray(row.member_ids).filter(
        (memberId) => typeof memberId === 'string',
      ),
    }))

const selectTodoItemById = (ownerUserId, todoItemId) =>
  db
    .prepare(`
      SELECT id, task, due_label AS due, lane, member_ids, is_done
      FROM todo_items
      WHERE owner_user_id = ? AND id = ?
    `)
    .get(ownerUserId, todoItemId)

const updateTodoItemDone = (ownerUserId, todoItemId, done, updatedAt) =>
  db
    .prepare(`
      UPDATE todo_items
      SET is_done = ?, updated_at = ?
      WHERE owner_user_id = ? AND id = ?
    `)
    .run(done ? 1 : 0, updatedAt, ownerUserId, todoItemId)

const selectFamilyMemberById = (ownerUserId, memberId) =>
  db
    .prepare(`
      SELECT id, first_name AS firstName, color
      FROM family_members
      WHERE owner_user_id = ? AND id = ?
    `)
    .get(ownerUserId, memberId)

const updateFamilyMemberRecord = (ownerUserId, firstName, color, updatedAt, memberId) =>
  db
    .prepare(`
      UPDATE family_members
      SET first_name = ?, color = ?, updated_at = ?
      WHERE owner_user_id = ? AND id = ?
    `)
    .run(firstName, color, updatedAt, ownerUserId, memberId)

const deleteFamilyMemberRecord = (ownerUserId, memberId) =>
  db
    .prepare(`
      DELETE FROM family_members
      WHERE owner_user_id = ? AND id = ?
    `)
    .run(ownerUserId, memberId)

const updateWidgetRecord = (ownerUserId, widget, updatedAt) =>
  db
    .prepare(`
      UPDATE widgets
      SET title = ?,
          subway_letter = ?,
          subway_color = ?,
          source_location = ?,
          user_scope_mode = ?,
          user_scope_member_ids = ?,
          placement_zones = ?,
          updated_at = ?
      WHERE owner_user_id = ? AND id = ?
    `)
    .run(
      widget.title,
      widget.subwayLetter,
      widget.subwayColor,
      widget.sourceLocation,
      widget.userScope.mode,
      JSON.stringify(widget.userScope.memberIds),
      JSON.stringify(widget.placementZones),
      updatedAt,
      ownerUserId,
      widget.id,
    )

const selectWidgetById = (ownerUserId, widgetId) =>
  db
    .prepare(`
      SELECT
        id,
        title,
        subway_letter,
        subway_color,
        source_location,
        user_scope_mode,
        user_scope_member_ids,
        placement_zones
      FROM widgets
      WHERE owner_user_id = ? AND id = ?
    `)
    .get(ownerUserId, widgetId)

const sanitizeWidgetTitle = (value) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, 40) : ''

const sanitizeSubwayLetter = (value, title) => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim().charAt(0).toUpperCase()
  }

  return title.trim().charAt(0).toUpperCase() || '?'
}

const normalizeWidgetSourceLocation = (value) =>
  typeof value === 'string' ? value.trim().replace(/^\.\//, '') : ''

const normalizeWidgetScope = (value) => {
  const candidate = value && typeof value === 'object' ? value : {}
  const mode =
    candidate.mode === 'member' || candidate.mode === 'members' ? candidate.mode : 'all'
  const memberIds = Array.isArray(candidate.memberIds)
    ? candidate.memberIds.filter((memberId) => typeof memberId === 'string')
    : []

  if (mode === 'member') {
    return { mode, memberIds: memberIds.slice(0, 1) }
  }

  if (mode === 'members') {
    return { mode, memberIds }
  }

  return { mode: 'all', memberIds: [] }
}

const normalizeWidgetPlacementZones = (value) => {
  const widgetGridPlacementOrder = ['a1', 'b1', 'a2', 'b2', 'a3', 'b3']

  const normalizePlacementZoneId = (zoneId, order) => {
    if (
      zoneId === 'service-board' ||
      zoneId === 'a1' ||
      zoneId === 'b1' ||
      zoneId === 'a2' ||
      zoneId === 'b2' ||
      zoneId === 'a3' ||
      zoneId === 'b3'
    ) {
      return zoneId
    }

    if (zoneId === 'hero') {
      return 'service-board'
    }

    if (zoneId === 'triad') {
      return widgetGridPlacementOrder[
        Math.min(
          Math.max(Math.round(order) - 1, 0),
          widgetGridPlacementOrder.length - 1,
        )
      ]
    }

    if (zoneId === 'bottom-wide') {
      return 'b2'
    }

    if (zoneId === 'bottom-side') {
      return 'a3'
    }

    return null
  }

  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((placement) => {
      const candidate = placement && typeof placement === 'object' ? placement : {}

      if (
        typeof candidate.zoneId !== 'string' ||
        typeof candidate.order !== 'number' ||
        !Number.isFinite(candidate.order)
      ) {
        return null
      }

      const normalizedZoneId = normalizePlacementZoneId(
        candidate.zoneId,
        candidate.order,
      )

      if (!normalizedZoneId) {
        return null
      }

      return {
        zoneId: normalizedZoneId,
        order: Math.max(1, Math.round(candidate.order)),
      }
    })
    .filter(Boolean)
}

class BringIntegrationError extends Error {
  constructor(message, statusCode, errorCode) {
    super(message)
    this.name = 'BringIntegrationError'
    this.statusCode = statusCode
    this.errorCode = errorCode
  }
}

class RoborockIntegrationError extends Error {
  constructor(message, statusCode, errorCode) {
    super(message)
    this.name = 'RoborockIntegrationError'
    this.statusCode = statusCode
    this.errorCode = errorCode
  }
}

const ensureRoborockSessionEncryptionConfigured = () => {
  if (!roborockSessionEncryptionKey) {
    throw new RoborockIntegrationError(
      'Roborock integration is not configured on the server.',
      503,
      'roborock_configuration_missing',
    )
  }
}

const encryptRoborockSessionPayload = (sessionPayloadJson) => {
  ensureRoborockSessionEncryptionConfigured()

  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', roborockSessionEncryptionKey, iv)
  const encryptedValue = Buffer.concat([
    cipher.update(sessionPayloadJson, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return JSON.stringify({
    iv: iv.toString('base64'),
    value: encryptedValue.toString('base64'),
    authTag: authTag.toString('base64'),
  })
}

const decryptRoborockSessionPayload = (encryptedSessionJson) => {
  ensureRoborockSessionEncryptionConfigured()

  let parsedValue

  try {
    parsedValue = JSON.parse(encryptedSessionJson)
  } catch {
    throw new RoborockIntegrationError(
      'Stored Roborock session data is invalid.',
      500,
      'roborock_session_invalid',
    )
  }

  if (
    !parsedValue ||
    typeof parsedValue !== 'object' ||
    typeof parsedValue.iv !== 'string' ||
    typeof parsedValue.value !== 'string' ||
    typeof parsedValue.authTag !== 'string'
  ) {
    throw new RoborockIntegrationError(
      'Stored Roborock session data is invalid.',
      500,
      'roborock_session_invalid',
    )
  }

  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      roborockSessionEncryptionKey,
      Buffer.from(parsedValue.iv, 'base64'),
    )
    decipher.setAuthTag(Buffer.from(parsedValue.authTag, 'base64'))

    return Buffer.concat([
      decipher.update(Buffer.from(parsedValue.value, 'base64')),
      decipher.final(),
    ]).toString('utf8')
  } catch {
    throw new RoborockIntegrationError(
      'Stored Roborock session data cannot be decrypted.',
      500,
      'roborock_session_invalid',
    )
  }
}

const normalizeRoborockSessionPayload = (value) => {
  const candidate = value && typeof value === 'object' ? value : null
  const userData =
    candidate?.userData && typeof candidate.userData === 'object' ? candidate.userData : null

  if (!userData) {
    throw new RoborockIntegrationError(
      'Stored Roborock session data is invalid.',
      500,
      'roborock_session_invalid',
    )
  }

  return {
    userData,
    baseUrl: sanitizeRoborockBaseUrl(candidate.baseUrl),
  }
}

const normalizeRoborockDeviceEntry = (value) => {
  const candidate = value && typeof value === 'object' ? value : {}
  const duid = normalizeRoborockDeviceDuid(candidate.duid)
  const name = sanitizeRoborockDeviceName(candidate.name)
  const model = sanitizeRoborockDeviceModel(candidate.model)

  if (!duid || !name || !model) {
    return null
  }

  return {
    duid,
    name,
    model,
    productName: sanitizeRoborockDeviceName(candidate.productName),
    online: candidate.online === true,
    supportsRoutineSelection: candidate.supportsRoutineSelection === true,
    supportsQuickStart: candidate.supportsQuickStart !== false,
  }
}

const normalizeRoborockRoutineEntry = (value) => {
  const candidate = value && typeof value === 'object' ? value : {}
  const routineId = normalizeRoborockRoutineId(candidate.id)
  const name = sanitizeRoborockRoutineName(candidate.name)

  if (routineId === null || !name) {
    return null
  }

  return {
    id: routineId,
    name,
  }
}

const normalizeRoborockStatusPayload = (value) => {
  const candidate = value && typeof value === 'object' ? value : {}
  const capabilities =
    candidate.capabilities && typeof candidate.capabilities === 'object'
      ? candidate.capabilities
      : {}

  return {
    state: typeof candidate.state === 'number' ? candidate.state : null,
    stateName:
      typeof candidate.stateName === 'string' && candidate.stateName.trim().length > 0
        ? candidate.stateName.trim()
        : null,
    battery: typeof candidate.battery === 'number' ? candidate.battery : null,
    cleanTimeSeconds:
      typeof candidate.cleanTimeSeconds === 'number' ? candidate.cleanTimeSeconds : null,
    cleanAreaSquareMeters:
      typeof candidate.cleanAreaSquareMeters === 'number'
        ? candidate.cleanAreaSquareMeters
        : null,
    cleanPercent: typeof candidate.cleanPercent === 'number' ? candidate.cleanPercent : null,
    currentMapId: typeof candidate.currentMapId === 'number' ? candidate.currentMapId : null,
    dockState:
      typeof candidate.dockState === 'string' && candidate.dockState.trim().length > 0
        ? candidate.dockState.trim()
        : null,
    errorCodeName:
      typeof candidate.errorCodeName === 'string' && candidate.errorCodeName.trim().length > 0
        ? candidate.errorCodeName.trim()
        : null,
    capabilities: {
      supportsElapsedTime: capabilities.supportsElapsedTime === true,
      supportsCleaningArea: capabilities.supportsCleaningArea === true,
      supportsCleaningPercent: capabilities.supportsCleaningPercent === true,
      supportsCurrentMap: capabilities.supportsCurrentMap === true,
      supportsLocation: capabilities.supportsLocation === true,
      supportsRemainingTime: capabilities.supportsRemainingTime === true,
    },
  }
}

const callRoborockSidecar = async (pathname, payload) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), ROBOROCK_SIDECAR_REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${ROBOROCK_SIDECAR_URL}${pathname}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    let responseBody = {}

    try {
      responseBody = await response.json()
    } catch {
      responseBody = {}
    }

    if (!response.ok) {
      throw new RoborockIntegrationError(
        typeof responseBody.error === 'string'
          ? responseBody.error
          : 'Roborock integration request failed.',
        response.status,
        typeof responseBody.errorCode === 'string'
          ? responseBody.errorCode
          : 'roborock_sidecar_error',
      )
    }

    return responseBody
  } catch (error) {
    if (error instanceof RoborockIntegrationError) {
      throw error
    }

    throw new RoborockIntegrationError(
      'Roborock integration is temporarily unavailable.',
      503,
      'roborock_sidecar_unavailable',
    )
  } finally {
    clearTimeout(timeoutId)
  }
}

const callRoborockStoredSessionSidecar = async (ownerUserId, pathname, payload = {}) => {
  const { email, sessionPayload } = resolveRoborockStoredSession(ownerUserId)
  const validatedAt = new Date().toISOString()

  try {
    const responseBody = await callRoborockSidecar(pathname, {
      email,
      sessionPayload,
      ...payload,
    })

    updateRoborockConnectionStatus(ownerUserId, 'connected', validatedAt)
    return responseBody
  } catch (error) {
    if (
      error instanceof RoborockIntegrationError &&
      error.errorCode === 'roborock_session_invalid'
    ) {
      updateRoborockConnectionStatus(ownerUserId, 'reconnect_required', validatedAt)
    }

    throw error
  }
}

const resolveRoborockStoredSession = (ownerUserId) => {
  const currentIntegration = selectRoborockIntegrationRow(ownerUserId)
  const email = sanitizeRoborockEmail(currentIntegration?.roborock_email)

  if (!email) {
    throw new RoborockIntegrationError(
      'Roborock email is not configured.',
      400,
      'roborock_email_missing',
    )
  }

  if (
    typeof currentIntegration?.encrypted_session_json !== 'string' ||
    currentIntegration.encrypted_session_json.length === 0
  ) {
    throw new RoborockIntegrationError(
      'Roborock session is not configured.',
      400,
      'roborock_session_missing',
    )
  }

  return {
    email,
    sessionPayload: (() => {
      try {
        return normalizeRoborockSessionPayload(
          JSON.parse(decryptRoborockSessionPayload(currentIntegration.encrypted_session_json)),
        )
      } catch (error) {
        if (error instanceof RoborockIntegrationError) {
          throw error
        }

        throw new RoborockIntegrationError(
          'Stored Roborock session data is invalid.',
          500,
          'roborock_session_invalid',
        )
      }
    })(),
  }
}

const requestRoborockLoginCode = async (email) => {
  await callRoborockSidecar('/request-code', { email })
}

const loginRoborockAccount = async (email, verificationCode) => {
  const responseBody = await callRoborockSidecar('/login', {
    email,
    verificationCode,
  })
  const sessionPayload = normalizeRoborockSessionPayload(responseBody.sessionPayload)

  return sessionPayload
}

const loadRoborockDeviceDiscovery = async (ownerUserId, selectedDeviceDuid = '') => {
  const responseBody = await callRoborockStoredSessionSidecar(ownerUserId, '/devices', {
    selectedDeviceDuid: normalizeRoborockDeviceDuid(selectedDeviceDuid),
  })

  const devices = Array.isArray(responseBody.devices)
    ? responseBody.devices
        .map(normalizeRoborockDeviceEntry)
        .filter((entry) => entry !== null)
    : []
  const routines = Array.isArray(responseBody.routines)
    ? responseBody.routines
        .map(normalizeRoborockRoutineEntry)
        .filter((entry) => entry !== null)
    : []
  const resolvedSelectedDeviceDuid = normalizeRoborockDeviceDuid(responseBody.selectedDeviceDuid)

  return {
    devices,
    selectedDeviceDuid: resolvedSelectedDeviceDuid,
    routines,
  }
}

const resolveRoborockSelectedDeviceDuid = (ownerUserId, overrideValue = undefined) => {
  const currentIntegration = selectRoborockIntegrationRow(ownerUserId)
  const selectedDeviceDuid = normalizeRoborockDeviceDuid(
    overrideValue ?? currentIntegration?.selected_device_duid,
  )

  if (!selectedDeviceDuid) {
    throw new RoborockIntegrationError(
      'No Roborock device is selected.',
      400,
      'roborock_selected_device_missing',
    )
  }

  return selectedDeviceDuid
}

const resolveRoborockSelectedRoutineId = (ownerUserId, overrideValue = undefined) => {
  const currentIntegration = selectRoborockIntegrationRow(ownerUserId)

  return normalizeRoborockRoutineId(overrideValue ?? currentIntegration?.selected_routine_id)
}

const fetchRoborockStatus = async (ownerUserId) => {
  const selectedDeviceDuid = resolveRoborockSelectedDeviceDuid(ownerUserId)
  const responseBody = await callRoborockStoredSessionSidecar(ownerUserId, '/status', {
    deviceDuid: selectedDeviceDuid,
  })
  const device = normalizeRoborockDeviceEntry(responseBody.device)

  if (!device) {
    throw new RoborockIntegrationError(
      'Roborock returned an invalid device payload.',
      502,
      'roborock_device_payload_invalid',
    )
  }

  return {
    device,
    status: normalizeRoborockStatusPayload(responseBody.status),
    quickStartMode:
      resolveRoborockSelectedRoutineId(ownerUserId) === null ? 'standard' : 'routine',
    refreshedAt: new Date().toISOString(),
  }
}

const startRoborockQuickAction = async (ownerUserId) => {
  const selectedDeviceDuid = resolveRoborockSelectedDeviceDuid(ownerUserId)
  const selectedRoutineId = resolveRoborockSelectedRoutineId(ownerUserId)
  const responseBody = await callRoborockStoredSessionSidecar(ownerUserId, '/quick-start', {
    deviceDuid: selectedDeviceDuid,
    routineId: selectedRoutineId,
  })
  const device = normalizeRoborockDeviceEntry(responseBody.device)

  if (!device) {
    throw new RoborockIntegrationError(
      'Roborock returned an invalid device payload.',
      502,
      'roborock_device_payload_invalid',
    )
  }

  return {
    device,
    status: normalizeRoborockStatusPayload(responseBody.status),
    quickStartMode:
      responseBody.startMode === 'routine' ? 'routine' : 'standard',
    refreshedAt: new Date().toISOString(),
  }
}

const validateRoborockStoredSession = async (ownerUserId) => {
  const { email, sessionPayload } = resolveRoborockStoredSession(ownerUserId)
  const validatedAt = new Date().toISOString()

  try {
    await callRoborockSidecar('/session-status', {
      email,
      sessionPayload,
    })

    updateRoborockConnectionStatus(ownerUserId, 'connected', validatedAt)

    return {
      healthy: true,
      roborockSettings: selectRoborockSettings(ownerUserId),
    }
  } catch (error) {
    if (
      error instanceof RoborockIntegrationError &&
      error.errorCode === 'roborock_session_invalid'
    ) {
      updateRoborockConnectionStatus(ownerUserId, 'reconnect_required', validatedAt)

      return {
        healthy: false,
        roborockSettings: selectRoborockSettings(ownerUserId),
      }
    }

    throw error
  }
}

const sendRoborockIntegrationError = (response, error) => {
  if (error instanceof RoborockIntegrationError) {
    sendJson(response, error.statusCode, {
      error: error.message,
      errorCode: error.errorCode,
    })
    return
  }

  console.error('Unexpected Roborock integration failure.', error)
  sendJson(response, 500, {
    error: 'Roborock integration request failed.',
    errorCode: 'roborock_unknown_error',
  })
}

const ensureBringCredentialEncryptionConfigured = () => {
  if (!bringCredentialEncryptionKey) {
    throw new BringIntegrationError(
      'Bring integration is not configured on the server.',
      503,
      'bring_configuration_missing',
    )
  }
}

const encryptBringPassword = (password) => {
  ensureBringCredentialEncryptionConfigured()

  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', bringCredentialEncryptionKey, iv)
  const encryptedValue = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return JSON.stringify({
    iv: iv.toString('base64'),
    value: encryptedValue.toString('base64'),
    authTag: authTag.toString('base64'),
  })
}

const decryptBringPassword = (encryptedPasswordJson) => {
  ensureBringCredentialEncryptionConfigured()

  let parsedValue

  try {
    parsedValue = JSON.parse(encryptedPasswordJson)
  } catch {
    throw new BringIntegrationError(
      'Stored Bring credentials are invalid.',
      500,
      'bring_credentials_invalid',
    )
  }

  if (
    !parsedValue ||
    typeof parsedValue !== 'object' ||
    typeof parsedValue.iv !== 'string' ||
    typeof parsedValue.value !== 'string' ||
    typeof parsedValue.authTag !== 'string'
  ) {
    throw new BringIntegrationError(
      'Stored Bring credentials are invalid.',
      500,
      'bring_credentials_invalid',
    )
  }

  try {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      bringCredentialEncryptionKey,
      Buffer.from(parsedValue.iv, 'base64'),
    )
    decipher.setAuthTag(Buffer.from(parsedValue.authTag, 'base64'))

    return Buffer.concat([
      decipher.update(Buffer.from(parsedValue.value, 'base64')),
      decipher.final(),
    ]).toString('utf8')
  } catch {
    throw new BringIntegrationError(
      'Stored Bring credentials cannot be decrypted.',
      500,
      'bring_credentials_invalid',
    )
  }
}

const normalizeBringListsPayload = (value) => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((entry) => {
      const candidate = entry && typeof entry === 'object' ? entry : {}
      const listUuid = normalizeBringListUuid(candidate.listUuid)
      const name = sanitizeBringListName(candidate.name)

      if (!listUuid || !name) {
        return null
      }

      return {
        listUuid,
        name,
        theme: typeof candidate.theme === 'string' ? candidate.theme : null,
      }
    })
    .filter(Boolean)
}

const callBringSidecar = async (pathname, payload) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), BRING_SIDECAR_REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${BRING_SIDECAR_URL}${pathname}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    let responseBody = {}

    try {
      responseBody = await response.json()
    } catch {
      responseBody = {}
    }

    if (!response.ok) {
      throw new BringIntegrationError(
        typeof responseBody.error === 'string'
          ? responseBody.error
          : 'Bring integration request failed.',
        response.status,
        typeof responseBody.errorCode === 'string'
          ? responseBody.errorCode
          : 'bring_sidecar_error',
      )
    }

    return responseBody
  } catch (error) {
    if (error instanceof BringIntegrationError) {
      throw error
    }

    throw new BringIntegrationError(
      'Bring integration is temporarily unavailable.',
      503,
      'bring_sidecar_unavailable',
    )
  } finally {
    clearTimeout(timeoutId)
  }
}

const loadBringLists = async (username, password) => {
  const responseBody = await callBringSidecar('/lists', {
    username,
    password,
  })

  return normalizeBringListsPayload(responseBody.lists)
}

const resolveBringCredentials = (ownerUserId, body) => {
  const currentIntegration = selectBringIntegrationRow(ownerUserId)
  const username = sanitizeBringUsername(body?.username ?? currentIntegration?.bring_username)
  const providedPassword = sanitizeBringPassword(body?.password)
  const hasStoredPassword =
    typeof currentIntegration?.encrypted_password_json === 'string' &&
    currentIntegration.encrypted_password_json.length > 0

  let password = providedPassword

  if (!password && hasStoredPassword) {
    password = decryptBringPassword(currentIntegration.encrypted_password_json)
  }

  return {
    currentIntegration,
    username,
    password,
    hasStoredPassword,
  }
}

const sendBringIntegrationError = (response, error) => {
  if (error instanceof BringIntegrationError) {
    sendJson(response, error.statusCode, {
      error: error.message,
      errorCode: error.errorCode,
    })
    return
  }

  console.error('Unexpected Bring integration failure.', error)
  sendJson(response, 500, {
    error: 'Bring integration request failed.',
    errorCode: 'bring_unknown_error',
  })
}

const resolveBringSelectedListContext = (ownerUserId, body = undefined) => {
  const { currentIntegration, username, password } = resolveBringCredentials(ownerUserId, body)
  const selectedListUuid = normalizeBringListUuid(
    body?.selectedListUuid ?? currentIntegration?.selected_list_uuid,
  )
  const selectedListName = sanitizeBringListName(currentIntegration?.selected_list_name)

  if (!username) {
    throw new BringIntegrationError(
      'Bring username is not configured.',
      400,
      'bring_username_missing',
    )
  }

  if (!password) {
    throw new BringIntegrationError(
      'Bring password is not configured.',
      400,
      'bring_password_missing',
    )
  }

  if (!selectedListUuid) {
    throw new BringIntegrationError(
      'No Bring shopping list is selected.',
      400,
      'bring_selected_list_missing',
    )
  }

  return {
    username,
    password,
    selectedListUuid,
    selectedListName,
  }
}

const parseBringSnapshotFromSidecar = (responseBody) => {
  const snapshot = normalizeBringListSnapshot(responseBody?.snapshot)

  if (!snapshot) {
    throw new BringIntegrationError(
      'Bring returned an unexpected list payload.',
      502,
      'bring_snapshot_invalid',
    )
  }

  return snapshot
}

const buildBringListPayload = (snapshot, freshness, refreshedAt, staleAt) => ({
  listUuid: snapshot.listUuid,
  listName: snapshot.listName,
  openItems: snapshot.openItems,
  recentItems: snapshot.recentItems,
  openItemCount: snapshot.openItems.length,
  recentItemCount: snapshot.recentItems.length,
  freshness,
  readOnly: freshness !== 'live',
  refreshedAt,
  staleAt,
})

const isBringTemporaryReadFailure = (error) =>
  error instanceof BringIntegrationError &&
  (error.errorCode === 'bring_request_failed' ||
    error.errorCode === 'bring_sidecar_unavailable' ||
    error.errorCode === 'bring_sidecar_error')

const refreshBringSelectedList = async (ownerUserId) => {
  const context = resolveBringSelectedListContext(ownerUserId)
  const responseBody = await callBringSidecar('/selected-list', {
    username: context.username,
    password: context.password,
    listUuid: context.selectedListUuid,
  })
  const snapshot = parseBringSnapshotFromSidecar(responseBody)
  const refreshedAt = new Date().toISOString()

  upsertBringListSnapshot(
    ownerUserId,
    context.selectedListUuid,
    JSON.stringify(snapshot),
    refreshedAt,
  )

  return buildBringListPayload(snapshot, 'live', refreshedAt, null)
}

const getBringListWithFallback = async (ownerUserId) => {
  try {
    return await refreshBringSelectedList(ownerUserId)
  } catch (error) {
    if (!isBringTemporaryReadFailure(error)) {
      throw error
    }

    const context = resolveBringSelectedListContext(ownerUserId)
    const cachedSnapshot = selectBringListSnapshot(ownerUserId)

    if (!cachedSnapshot || cachedSnapshot.listUuid !== context.selectedListUuid) {
      throw error
    }

    const staleAt = cachedSnapshot.staleAt ?? new Date().toISOString()
    markBringListSnapshotStale(ownerUserId, staleAt)

    return buildBringListPayload(
      cachedSnapshot,
      'stale',
      cachedSnapshot.refreshedAt,
      staleAt,
    )
  }
}

const mutateBringSelectedList = async (ownerUserId, pathname, mutation) => {
  const context = resolveBringSelectedListContext(ownerUserId)
  const responseBody = await callBringSidecar(pathname, {
    username: context.username,
    password: context.password,
    listUuid: context.selectedListUuid,
    ...mutation,
  })
  const snapshot = parseBringSnapshotFromSidecar(responseBody)
  const refreshedAt = new Date().toISOString()

  upsertBringListSnapshot(
    ownerUserId,
    context.selectedListUuid,
    JSON.stringify(snapshot),
    refreshedAt,
  )

  return buildBringListPayload(snapshot, 'live', refreshedAt, null)
}

const seedCount = getFamilyMemberCount(defaultAppUserId)
const widgetSeedCount = getWidgetCount(defaultAppUserId)
const calendarEventSeedCount = getCalendarEventCount(defaultAppUserId)
const todoItemSeedCount = getTodoItemCount(defaultAppUserId)

const migrateLegacyMockCalendarEvents = (ownerUserId) => {
  const existingCalendarEventRows = db
    .prepare(`
      SELECT id
      FROM calendar_events
      WHERE owner_user_id = ?
      ORDER BY event_date ASC, time_label ASC, id ASC
    `)
    .all(ownerUserId)

  const legacyMockIds = existingCalendarEventRows
    .map((row) => row.id)
    .filter((calendarEventId) => LEGACY_MOCK_CALENDAR_EVENT_IDS.has(calendarEventId))

  if (legacyMockIds.length === 0) {
    return
  }

  const hasRealSeedEvents = existingCalendarEventRows.some((row) =>
    row.id.startsWith('calendar-real-'),
  )

  const shouldInsertLocalSeedEvents = seedCalendarEvents.length > 0 && !hasRealSeedEvents

  if (hasRealSeedEvents && !legacyMockIds.length) {
    return
  }

  if (hasRealSeedEvents && !shouldInsertLocalSeedEvents) {
    db.exec('BEGIN')

    try {
      for (const legacyMockId of legacyMockIds) {
        deleteCalendarEventById(ownerUserId, legacyMockId)
      }

      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }

    return
  }

  const now = new Date().toISOString()

  db.exec('BEGIN')

  try {
    for (const legacyMockId of legacyMockIds) {
      deleteCalendarEventById(ownerUserId, legacyMockId)
    }

    if (shouldInsertLocalSeedEvents) {
      for (const calendarEvent of seedCalendarEvents) {
        insertCalendarEvent(ownerUserId, calendarEvent, now, now)
      }
    }

    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

if (seedCount === 0) {
  const now = new Date().toISOString()

  for (const member of seedMembers) {
    insertFamilyMember(defaultAppUserId, member.id, member.firstName, member.color, now, now)
  }
}

if (widgetSeedCount === 0) {
  const now = new Date().toISOString()

  for (const widget of seedWidgets) {
    insertWidget(defaultAppUserId, widget, now, now)
  }
}

ensureSeedWidgetsPresent(defaultAppUserId)

ensureBringWidgetDefaultPlacement()

ensureConfiguredAssistantBackendRoutePresent()

deleteUnsupportedWidgets()

migrateLegacyMockCalendarEvents(defaultAppUserId)

if (calendarEventSeedCount === 0) {
  const now = new Date().toISOString()

  for (const calendarEvent of seedCalendarEvents) {
    insertCalendarEvent(defaultAppUserId, calendarEvent, now, now)
  }
}

if (todoItemSeedCount === 0) {
  const now = new Date().toISOString()

  for (const todoItem of seedTodoItems) {
    insertTodoItem(defaultAppUserId, todoItem, now, now)
  }
}

const sendJson = (response, statusCode, payload, extraHeaders = {}) => {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
    ...extraHeaders,
  })
  response.end(JSON.stringify(payload))
}

const writeAssistantStreamEvent = (response, payload) => {
  response.write(`${JSON.stringify(payload)}\n`)
}

const streamAssistantTurnResponse = async (response, assistantTurn) => {
  const completeRuntime = {
    ...assistantTurn.runtime,
    streaming: {
      ...assistantTurn.runtime.streaming,
      delivered: true,
    },
  }

  response.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/x-ndjson; charset=utf-8',
    'X-Accel-Buffering': 'no',
  })

  writeAssistantStreamEvent(response, {
    type: 'started',
    thread: assistantTurn.thread,
    userMessage: assistantTurn.userMessage,
    runtime: completeRuntime,
  })

  const chunks = splitAssistantStreamingChunks(assistantTurn.assistantMessage.content)
  let accumulatedContent = ''

  for (const chunk of chunks) {
    accumulatedContent += chunk

    writeAssistantStreamEvent(response, {
      type: 'chunk',
      delta: chunk,
      content: accumulatedContent,
      messageId: assistantTurn.assistantMessage.id,
    })

    await new Promise((resolve) => setTimeout(resolve, 12))
  }

  writeAssistantStreamEvent(response, {
    type: 'complete',
    thread: assistantTurn.thread,
    userMessage: assistantTurn.userMessage,
    assistantMessage: {
      ...assistantTurn.assistantMessage,
      content: accumulatedContent,
    },
    runtime: completeRuntime,
  })

  response.end()
}

const sendBinary = (response, statusCode, body, extraHeaders = {}) => {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...extraHeaders,
  })
  response.end(body)
}

const sanitizeFirstName = (value) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, 24) : ''

const normalizeColor = (value) =>
  typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
    ? value
    : '#4aa8ff'

const sanitizeUsername = (value) =>
  typeof value === 'string' ? value.trim().slice(0, 64) : ''

const audioVisualMimeDefinitions = [
  { prefix: 'image/jpeg', fileExtension: 'jpg', recordingType: 'photo' },
  { prefix: 'video/webm', fileExtension: 'webm', recordingType: 'video' },
  { prefix: 'video/mp4', fileExtension: 'mp4', recordingType: 'video' },
  { prefix: 'audio/webm', fileExtension: 'webm', recordingType: 'audio' },
  { prefix: 'audio/ogg', fileExtension: 'ogg', recordingType: 'audio' },
  { prefix: 'audio/wav', fileExtension: 'wav', recordingType: 'audio' },
  { prefix: 'audio/mpeg', fileExtension: 'mp3', recordingType: 'audio' },
  { prefix: 'audio/mp3', fileExtension: 'mp3', recordingType: 'audio' },
]

const normalizeAudioVisualRecordingType = (value) => {
  const normalizedValue = typeof value === 'string' ? value.trim().toLowerCase() : ''

  return normalizedValue === 'photo' || normalizedValue === 'video' || normalizedValue === 'audio'
    ? normalizedValue
    : null
}

const resolveAudioVisualMimeDefinition = (value) => {
  const normalizedValue = typeof value === 'string' ? value.trim().toLowerCase() : ''

  return (
    audioVisualMimeDefinitions.find((definition) =>
      normalizedValue.startsWith(definition.prefix),
    ) ?? null
  )
}

const normalizeAudioVisualDurationSeconds = (value) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null
  }

  return Math.round(value * 100) / 100
}

const normalizeIsoTimestampOrNow = (value) => {
  if (typeof value !== 'string') {
    return new Date().toISOString()
  }

  const timestamp = new Date(value)

  return Number.isNaN(timestamp.getTime()) ? new Date().toISOString() : timestamp.toISOString()
}

const buildAudioVisualStoragePath = (recordingId, fileExtension) =>
  join(audioVisualStorageDirectory, `${recordingId}.${fileExtension}`)

const buildAudioVisualRecordingPayload = (recording) => ({
  id: recording.id,
  recordingType: recording.recording_type,
  mimeType: recording.mime_type,
  fileExtension: recording.file_extension,
  fileSize: recording.file_size,
  durationSeconds:
    typeof recording.duration_seconds === 'number' ? recording.duration_seconds : null,
  uploadedBy: recording.uploader_username,
  capturedAt: recording.captured_at,
  uploadedAt: recording.created_at,
  updatedAt: recording.updated_at,
  contentUrl: `/api/audio-visual/recordings/${recording.id}/content`,
  downloadUrl: `/api/audio-visual/recordings/${recording.id}/download`,
})

const parseAudioVisualRecordingPath = (pathname) => {
  const match = /^\/api\/audio-visual\/recordings\/([^/]+)\/(content|download)$/.exec(
    pathname,
  )

  if (!match) {
    return null
  }

  return {
    recordingId: decodeURIComponent(match[1]),
    action: match[2],
  }
}

const parseCookies = (cookieHeader) => {
  if (typeof cookieHeader !== 'string' || cookieHeader.trim().length === 0) {
    return {}
  }

  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0)
      .map((segment) => {
        const separatorIndex = segment.indexOf('=')

        if (separatorIndex < 0) {
          return [segment, '']
        }

        const key = segment.slice(0, separatorIndex).trim()
        const value = segment.slice(separatorIndex + 1).trim()

        return [key, decodeURIComponent(value)]
      }),
  )
}

const serializeCookie = (name, value, options = {}) => {
  const serializedCookie = [`${name}=${encodeURIComponent(value)}`]

  if (options.path) {
    serializedCookie.push(`Path=${options.path}`)
  }

  if (typeof options.maxAge === 'number') {
    serializedCookie.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`)
  }

  if (options.expires instanceof Date) {
    serializedCookie.push(`Expires=${options.expires.toUTCString()}`)
  }

  if (options.httpOnly) {
    serializedCookie.push('HttpOnly')
  }

  if (options.sameSite) {
    serializedCookie.push(`SameSite=${options.sameSite}`)
  }

  if (options.secure) {
    serializedCookie.push('Secure')
  }

  return serializedCookie.join('; ')
}

const buildSessionCookieHeader = (sessionToken) =>
  serializeCookie(SESSION_COOKIE_NAME, sessionToken, {
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
    expires: new Date(Date.now() + SESSION_COOKIE_MAX_AGE_SECONDS * 1000),
    httpOnly: true,
    sameSite: 'Lax',
    secure: SESSION_COOKIE_SECURE,
  })

const buildClearedSessionCookieHeader = () =>
  serializeCookie(SESSION_COOKIE_NAME, '', {
    path: '/',
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true,
    sameSite: 'Lax',
    secure: SESSION_COOKIE_SECURE,
  })

const getSessionTokenFromRequest = (request) => {
  const cookies = parseCookies(request.headers.cookie)
  const sessionToken = cookies[SESSION_COOKIE_NAME]

  return typeof sessionToken === 'string' && sessionToken.length > 0
    ? sessionToken
    : null
}

const resolveAuthenticatedSession = (request) => {
  const sessionToken = getSessionTokenFromRequest(request)

  if (!sessionToken) {
    return {
      sessionToken: null,
      session: null,
    }
  }

  const session = selectUserSessionByTokenHash(hashSessionToken(sessionToken))

  if (!session) {
    return {
      sessionToken,
      session: null,
    }
  }

  updateUserSessionTimestamp(session.id, new Date().toISOString())

  return {
    sessionToken,
    session,
  }
}

const readRequestBody = async (request) => {
  let rawBody = ''

  for await (const chunk of request) {
    rawBody += chunk
  }

  return rawBody ? JSON.parse(rawBody) : {}
}

const getRequestOwnerUserId = (authenticatedSession) =>
  authenticatedSession?.userId ?? null

const getUnauthorizedHeaders = (authContext) =>
  authContext.sessionToken && !authContext.session
    ? { 'Set-Cookie': buildClearedSessionCookieHeader() }
    : {}

const sendAuthenticationRequired = (response, authContext) => {
  sendJson(
    response,
    401,
    { error: 'Authentication required.' },
    getUnauthorizedHeaders(authContext),
  )
}

const server = createServer(async (request, response) => {
  if (!request.url) {
    sendJson(response, 400, { error: 'Missing request URL.' })
    return
  }

  const requestUrl = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`)

  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {})
    return
  }

  const authContext = resolveAuthenticatedSession(request)
  const ownerUserId = getRequestOwnerUserId(authContext.session)

  if (request.method === 'GET' && requestUrl.pathname === '/api/auth/session') {
    if (!authContext.session) {
      sendJson(
        response,
        200,
        { authenticated: false },
        authContext.sessionToken
          ? { 'Set-Cookie': buildClearedSessionCookieHeader() }
          : {},
      )
      return
    }

    sendJson(response, 200, {
      authenticated: true,
      user: {
        id: authContext.session.userId,
        username: authContext.session.username,
      },
    })
    return
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/runtime') {
    sendJson(response, 200, {
      instanceId: BACKEND_RUNTIME_INSTANCE_ID,
      startedAt: BACKEND_RUNTIME_STARTED_AT,
    })
    return
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/auth/login') {
    try {
      const body = await readRequestBody(request)
      const username = sanitizeUsername(body.username)
      const password = typeof body.password === 'string' ? body.password : ''
      const user = username ? selectUserByUsername(username) : null

      if (!user || !verifyPasswordHash(password, user.passwordHash)) {
        sendJson(response, 401, {
          error: 'Invalid username or password.',
        })
        return
      }

      const sessionToken = createSessionToken()
      const now = new Date().toISOString()

      insertUserSessionRecord(
        `session-${randomUUID()}`,
        user.id,
        hashSessionToken(sessionToken),
        now,
        now,
      )

      sendJson(
        response,
        200,
        {
          user: {
            id: user.id,
            username: user.username,
          },
        },
        {
          'Set-Cookie': buildSessionCookieHeader(sessionToken),
        },
      )
      return
    } catch {
      sendJson(response, 400, { error: 'Invalid JSON body.' })
      return
    }
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/auth/logout') {
    if (authContext.sessionToken) {
      deleteUserSessionByTokenHash(hashSessionToken(authContext.sessionToken))
    }

    sendJson(
      response,
      200,
      { authenticated: false },
      { 'Set-Cookie': buildClearedSessionCookieHeader() },
    )
    return
  }

  if (requestUrl.pathname.startsWith('/api/') && !ownerUserId) {
    sendAuthenticationRequired(response, authContext)
    return
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/family-members') {
    sendJson(response, 200, { familyMembers: selectAllFamilyMembers(ownerUserId) })
    return
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/widgets') {
    sendJson(response, 200, { widgets: selectAllWidgets(ownerUserId) })
    return
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/widget-settings') {
    sendJson(response, 200, { widgetSettings: selectAllWidgetSettings(ownerUserId) })
    return
  }

  if (
    request.method === 'GET' &&
    /^\/api\/widget-settings\/[^/]+\/mcp-tool-log$/.test(requestUrl.pathname)
  ) {
    const widgetId = requestUrl.pathname
      .replace('/api/widget-settings/', '')
      .replace('/mcp-tool-log', '')

    if (!widgetId) {
      sendJson(response, 400, { error: 'Missing widget id.' })
      return
    }

    expireAssistantToolApprovals(ownerUserId)

    sendJson(response, 200, {
      toolEvents: selectWidgetToolCallEventsByWidgetId(ownerUserId, widgetId),
    })
    return
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/app-preferences') {
    sendJson(response, 200, { appPreferences: selectAppPreferences(ownerUserId) })
    return
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/bring/settings') {
    sendJson(response, 200, { bringSettings: selectBringSettings(ownerUserId) })
    return
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/roborock/settings') {
    sendJson(response, 200, { roborockSettings: selectRoborockSettings(ownerUserId) })
    return
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/assistant/availability') {
    sendJson(response, 200, { assistant: selectAssistantAvailability(ownerUserId) })
    return
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/assistant/settings') {
    sendJson(response, 200, { assistantSettings: selectAssistantSettings(ownerUserId) })
    return
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/assistant/routes') {
    sendJson(response, 200, { routes: selectAssistantRoutes(ownerUserId) })
    return
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/assistant/threads') {
    sendJson(response, 200, { threads: selectAssistantThreads(ownerUserId) })
    return
  }

  if (
    request.method === 'GET' &&
    requestUrl.pathname.startsWith('/api/assistant/threads/')
  ) {
    const threadId = requestUrl.pathname.replace('/api/assistant/threads/', '')

    if (!threadId) {
      sendJson(response, 400, { error: 'Missing assistant thread id.' })
      return
    }

    try {
      sendJson(response, 200, buildAssistantThreadDetailPayload(ownerUserId, threadId))
    } catch (error) {
      sendAssistantRuntimeError(response, error)
    }
    return
  }

  if (
    request.method === 'POST' &&
    /^\/api\/assistant\/tool-approvals\/[^/]+$/.test(requestUrl.pathname)
  ) {
    const approvalRequestId = requestUrl.pathname.replace('/api/assistant/tool-approvals/', '')

    if (!approvalRequestId) {
      sendJson(response, 400, { error: 'Missing assistant tool approval request id.' })
      return
    }

    let body

    try {
      body = await readRequestBody(request)
    } catch {
      sendJson(response, 400, { error: 'Invalid JSON body.' })
      return
    }

    try {
      const threadDetail = await resolveAssistantToolApproval(
        ownerUserId,
        approvalRequestId,
        body?.action,
      )
      sendJson(response, 200, threadDetail)
      return
    } catch (error) {
      sendAssistantRuntimeError(response, error)
      return
    }
  }

  if (
    request.method === 'DELETE' &&
    requestUrl.pathname.startsWith('/api/assistant/threads/')
  ) {
    const threadId = requestUrl.pathname.replace('/api/assistant/threads/', '')

    if (!threadId) {
      sendJson(response, 400, { error: 'Missing assistant thread id.' })
      return
    }

    const thread = selectAssistantThreadById(ownerUserId, threadId)

    if (!thread) {
      sendJson(response, 404, { error: 'Assistant thread not found.' })
      return
    }

    deleteAssistantThreadById(ownerUserId, threadId)
    sendJson(response, 200, { deletedThreadId: threadId })
    return
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/roborock/status') {
    try {
      const roborockStatus = await fetchRoborockStatus(ownerUserId)
      sendJson(response, 200, { roborockStatus })
      return
    } catch (error) {
      sendRoborockIntegrationError(response, error)
      return
    }
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/bring/list') {
    try {
      const bringList = await getBringListWithFallback(ownerUserId)
      sendJson(response, 200, { bringList })
      return
    } catch (error) {
      sendBringIntegrationError(response, error)
      return
    }
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/audio-visual/recordings') {
    const requestedType = requestUrl.searchParams.get('type') ?? 'all'

    sendJson(response, 200, {
      recordings: selectActiveAudioVisualRecordings(ownerUserId, requestedType).map(
        buildAudioVisualRecordingPayload,
      ),
    })
    return
  }

  const audioVisualRecordingPath = parseAudioVisualRecordingPath(requestUrl.pathname)

  if (request.method === 'GET' && audioVisualRecordingPath) {
    const recording = selectAudioVisualRecordingById(
      ownerUserId,
      audioVisualRecordingPath.recordingId,
    )

    if (!recording || recording.deleted_at) {
      sendJson(response, 404, { error: 'Recording not found.' })
      return
    }

    if (!existsSync(recording.storage_path)) {
      sendJson(response, 404, { error: 'Recording file not found.' })
      return
    }

    const fileBuffer = readFileSync(recording.storage_path)
    const baseHeaders = {
      'Content-Type': recording.mime_type,
      'Content-Length': String(fileBuffer.length),
      'Cache-Control': 'no-store',
    }

    if (audioVisualRecordingPath.action === 'download') {
      sendBinary(response, 200, fileBuffer, {
        ...baseHeaders,
        'Content-Disposition': `attachment; filename="${recording.recording_type}_${recording.id}.${recording.file_extension}"`,
      })
      return
    }

    sendBinary(response, 200, fileBuffer, baseHeaders)
    return
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/calendar-events') {
    const rangeStart = requestUrl.searchParams.get('rangeStart')
    const rangeEnd = requestUrl.searchParams.get('rangeEnd')

    if (rangeStart !== null || rangeEnd !== null) {
      if (!rangeStart || !rangeEnd) {
        sendJson(response, 400, {
          error: 'rangeStart and rangeEnd must both be provided as YYYY-MM-DD.',
        })
        return
      }

      const normalizedRangeStart = parseIsoDate(rangeStart)?.isoDate
      const normalizedRangeEnd = parseIsoDate(rangeEnd)?.isoDate

      if (!normalizedRangeStart || !normalizedRangeEnd) {
        sendJson(response, 400, {
          error: 'rangeStart and rangeEnd must be valid ISO dates in YYYY-MM-DD format.',
        })
        return
      }

      if (compareIsoDates(normalizedRangeStart, normalizedRangeEnd) > 0) {
        sendJson(response, 400, { error: 'rangeStart must be on or before rangeEnd.' })
        return
      }

      sendJson(response, 200, {
        calendarEvents: selectCalendarEventsByRange(
          ownerUserId,
          normalizedRangeStart,
          normalizedRangeEnd,
        ),
      })
      return
    }

    sendJson(response, 200, { calendarEvents: selectAllCalendarEvents(ownerUserId) })
    return
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/weather') {
    try {
      const latitude = Number.parseFloat(
        requestUrl.searchParams.get('latitude') ?? `${WEATHER_LATITUDE}`,
      )
      const longitude = Number.parseFloat(
        requestUrl.searchParams.get('longitude') ?? `${WEATHER_LONGITUDE}`,
      )
      const locationLabel =
        requestUrl.searchParams.get('locationLabel') ?? WEATHER_LOCATION
      const weather = await getWeatherPayload(latitude, longitude, locationLabel)
      sendJson(response, 200, { weather })
      return
    } catch {
      sendJson(response, 502, { error: 'Failed to fetch live weather data.' })
      return
    }
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/youtube/search') {
    const query = (requestUrl.searchParams.get('query') ?? '').trim()

    if (!query) {
      sendJson(response, 400, { error: 'query is required.' })
      return
    }

    try {
      const videos = await searchYoutubeVideos(query)
      sendJson(response, 200, { query, videos })
      return
    } catch {
      sendJson(response, 502, { error: 'Failed to fetch YouTube search results.' })
      return
    }
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/todo-items') {
    sendJson(response, 200, { todoItems: selectAllTodoItems(ownerUserId) })
    return
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/family-members') {
    try {
      const body = await readRequestBody(request)
      const firstName = sanitizeFirstName(body.firstName)

      if (!firstName) {
        sendJson(response, 400, { error: 'firstName is required.' })
        return
      }

      const id = `family-${randomUUID()}`
      const color = normalizeColor(body.color)
      const now = new Date().toISOString()

      insertFamilyMember(ownerUserId, id, firstName, color, now, now)

      sendJson(response, 201, {
        familyMember: { id, firstName, color },
      })
      return
    } catch {
      sendJson(response, 400, { error: 'Invalid JSON body.' })
      return
    }
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/bring/settings/lists') {
    let body

    try {
      body = await readRequestBody(request)
    } catch {
      sendJson(response, 400, { error: 'Invalid JSON body.' })
      return
    }

    try {
      const { username, password } = resolveBringCredentials(ownerUserId, body)

      if (!username) {
        sendJson(response, 400, { error: 'username is required.' })
        return
      }

      if (!password) {
        sendJson(response, 400, { error: 'password is required.' })
        return
      }

      const lists = await loadBringLists(username, password)
      const currentSettings = selectBringSettings(ownerUserId)
      const selectedList = lists.find(
        (entry) => entry.listUuid === currentSettings.selectedListUuid,
      )

      sendJson(response, 200, {
        lists,
        selectedListUuid: selectedList?.listUuid ?? '',
        selectedListName: selectedList?.name ?? '',
      })
      return
    } catch (error) {
      sendBringIntegrationError(response, error)
      return
    }
  }

  if (
    request.method === 'POST' &&
    requestUrl.pathname === '/api/roborock/settings/request-code'
  ) {
    let body

    try {
      body = await readRequestBody(request)
    } catch {
      sendJson(response, 400, { error: 'Invalid JSON body.' })
      return
    }

    try {
      const email = sanitizeRoborockEmail(body?.email)

      if (!email) {
        sendJson(response, 400, { error: 'email is required.' })
        return
      }

      await requestRoborockLoginCode(email)
      sendJson(response, 200, { ok: true })
      return
    } catch (error) {
      sendRoborockIntegrationError(response, error)
      return
    }
  }

  if (
    request.method === 'POST' &&
    requestUrl.pathname === '/api/roborock/settings/session'
  ) {
    try {
      const sessionStatus = await validateRoborockStoredSession(ownerUserId)
      sendJson(response, 200, sessionStatus)
      return
    } catch (error) {
      sendRoborockIntegrationError(response, error)
      return
    }
  }

  if (
    request.method === 'POST' &&
    requestUrl.pathname === '/api/roborock/settings/devices'
  ) {
    let body

    try {
      body = await readRequestBody(request)
    } catch {
      sendJson(response, 400, { error: 'Invalid JSON body.' })
      return
    }

    try {
      const requestedSelectedDeviceDuid = normalizeRoborockDeviceDuid(body?.selectedDeviceDuid)
      const discovery = await loadRoborockDeviceDiscovery(
        ownerUserId,
        requestedSelectedDeviceDuid,
      )

      sendJson(response, 200, {
        devices: discovery.devices,
        selectedDeviceDuid: discovery.selectedDeviceDuid,
        routines: discovery.routines,
        roborockSettings: selectRoborockSettings(ownerUserId),
      })
      return
    } catch (error) {
      sendRoborockIntegrationError(response, error)
      return
    }
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/roborock/start') {
    try {
      const roborockStatus = await startRoborockQuickAction(ownerUserId)
      sendJson(response, 200, { roborockStatus })
      return
    } catch (error) {
      sendRoborockIntegrationError(response, error)
      return
    }
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/bring/list/items') {
    let body

    try {
      body = await readRequestBody(request)
    } catch {
      sendJson(response, 400, { error: 'Invalid JSON body.' })
      return
    }

    const itemName = sanitizeBringItemName(body?.itemName)

    if (!itemName) {
      sendJson(response, 400, { error: 'itemName is required.' })
      return
    }

    try {
      const bringList = await mutateBringSelectedList(ownerUserId, '/selected-list/items/add', {
        itemName,
        specification: sanitizeBringItemSpecification(body?.specification),
        itemUuid: normalizeBringItemUuid(body?.itemUuid) || randomUUID(),
      })
      sendJson(response, 200, { bringList })
      return
    } catch (error) {
      sendBringIntegrationError(response, error)
      return
    }
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/bring/list/items/complete') {
    let body

    try {
      body = await readRequestBody(request)
    } catch {
      sendJson(response, 400, { error: 'Invalid JSON body.' })
      return
    }

    const itemName = sanitizeBringItemName(body?.itemName)

    if (!itemName) {
      sendJson(response, 400, { error: 'itemName is required.' })
      return
    }

    try {
      const bringList = await mutateBringSelectedList(
        ownerUserId,
        '/selected-list/items/complete',
        {
          itemName,
          specification: sanitizeBringItemSpecification(body?.specification),
          itemUuid: normalizeBringItemUuid(body?.itemUuid),
        },
      )
      sendJson(response, 200, { bringList })
      return
    } catch (error) {
      sendBringIntegrationError(response, error)
      return
    }
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/audio-visual/recordings') {
    try {
      const body = await readRequestBody(request)
      const recordingType = normalizeAudioVisualRecordingType(body.recordingType)
      const mimeDefinition = resolveAudioVisualMimeDefinition(body.mimeType)
      const dataBase64 = typeof body.dataBase64 === 'string' ? body.dataBase64.trim() : ''

      if (!recordingType) {
        sendJson(response, 400, { error: 'recordingType must be photo, video, or audio.' })
        return
      }

      if (!mimeDefinition) {
        sendJson(response, 400, { error: 'mimeType is not supported.' })
        return
      }

      if (mimeDefinition.recordingType !== recordingType) {
        sendJson(response, 400, { error: 'mimeType does not match recordingType.' })
        return
      }

      if (!dataBase64) {
        sendJson(response, 400, { error: 'dataBase64 is required.' })
        return
      }

      let fileBuffer

      try {
        fileBuffer = Buffer.from(dataBase64, 'base64')
      } catch {
        sendJson(response, 400, { error: 'dataBase64 is invalid.' })
        return
      }

      if (!fileBuffer || fileBuffer.length === 0) {
        sendJson(response, 400, { error: 'Recording payload is empty.' })
        return
      }

      const recordingId = `recording-${randomUUID()}`
      const timestamp = new Date().toISOString()
      const capturedAt = normalizeIsoTimestampOrNow(body.capturedAt)
      const storagePath = buildAudioVisualStoragePath(recordingId, mimeDefinition.fileExtension)

      writeFileSync(storagePath, fileBuffer)

      insertAudioVisualRecording(ownerUserId, {
        id: recordingId,
        recordingType,
        mimeType: mimeDefinition.prefix,
        fileExtension: mimeDefinition.fileExtension,
        fileSize: fileBuffer.length,
        durationSeconds: normalizeAudioVisualDurationSeconds(body.durationSeconds),
        storagePath,
        uploaderUsername: authContext.session?.username ?? INITIAL_USER_USERNAME,
        capturedAt,
        createdAt: timestamp,
        updatedAt: timestamp,
      })

      const persistedRecording = selectAudioVisualRecordingById(ownerUserId, recordingId)

      sendJson(response, 201, {
        recording: buildAudioVisualRecordingPayload(persistedRecording),
      })
      return
    } catch (error) {
      console.error('Failed to store audio-visual recording.', error)
      sendJson(response, 400, { error: 'Invalid recording upload payload.' })
      return
    }
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/calendar-events') {
    try {
      const body = await readRequestBody(request)
      const validMemberIds = buildFamilyMemberIdSet(ownerUserId)
      const result = buildCalendarEventFromInput({
        value: body,
        validMemberIds,
      })

      if (result.error) {
        sendJson(response, 400, { error: result.error })
        return
      }

      const calendarEventId = `calendar-${randomUUID()}`
      const timestamp = new Date().toISOString()

      insertCalendarEvent(
        ownerUserId,
        {
          id: calendarEventId,
          ...result.calendarEvent,
        },
        timestamp,
        timestamp,
      )

      const createdCalendarEvent = selectNormalizedCalendarEventById(
        ownerUserId,
        calendarEventId,
      )

      sendJson(response, 201, {
        calendarEvent: buildCalendarEventPayload(createdCalendarEvent),
      })
      return
    } catch {
      sendJson(response, 400, { error: 'Invalid JSON body.' })
      return
    }
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/assistant/threads') {
    let body

    try {
      body = await readRequestBody(request)
    } catch {
      sendJson(response, 400, { error: 'Invalid JSON body.' })
      return
    }

    try {
      const activeRoute = selectActiveAssistantBackendRouteRow(ownerUserId)

      if (!activeRoute) {
        throw new AssistantRuntimeError(
          'No default assistant route is configured for new conversations.',
          400,
          'assistant_default_route_missing',
        )
      }

      if (!activeRoute.enabled) {
        throw new AssistantRuntimeError(
          'The default assistant route is disabled.',
          400,
          'assistant_default_route_disabled',
        )
      }

      if (!isAssistantRouteConfigured(activeRoute)) {
        throw new AssistantRuntimeError(
          'The default assistant route is not configured correctly.',
          400,
          'assistant_default_route_invalid',
        )
      }

      const title = sanitizeAssistantThreadTitle(body?.title)
      const timestamp = new Date().toISOString()
      const threadId = `assistant-thread-${randomUUID()}`

      insertAssistantThread(
        ownerUserId,
        {
          id: threadId,
          routeId: activeRoute.id,
          title,
          state: 'active',
        },
        timestamp,
        timestamp,
      )

      const createdThread = selectAssistantThreadById(ownerUserId, threadId)

      sendJson(response, 201, {
        thread: buildAssistantThreadPayload(createdThread),
        messages: [],
      })
      return
    } catch (error) {
      sendAssistantRuntimeError(response, error)
      return
    }
  }

  if (request.method === 'PATCH' && requestUrl.pathname === '/api/assistant/settings') {
    let body

    try {
      body = await readRequestBody(request)
    } catch {
      sendJson(response, 400, { error: 'Invalid JSON body.' })
      return
    }

    try {
      const assistantSettings = saveAssistantSettings(ownerUserId, body ?? {})
      sendJson(response, 200, { assistantSettings, assistant: selectAssistantAvailability(ownerUserId) })
      return
    } catch (error) {
      sendAssistantRuntimeError(response, error)
      return
    }
  }

  if (request.method === 'POST' && requestUrl.pathname === '/api/assistant/routes') {
    let body

    try {
      body = await readRequestBody(request)
    } catch {
      sendJson(response, 400, { error: 'Invalid JSON body.' })
      return
    }

    try {
      const route = createAssistantRoute(ownerUserId, body ?? {})
      sendJson(response, 201, { route: buildAssistantRouteSettingsPayload(route) })
      return
    } catch (error) {
      sendAssistantRuntimeError(response, error)
      return
    }
  }

  if (
    request.method === 'PATCH' &&
    requestUrl.pathname.startsWith('/api/assistant/routes/') &&
    !requestUrl.pathname.endsWith('/default')
  ) {
    const routeId = requestUrl.pathname.replace('/api/assistant/routes/', '')

    if (!routeId) {
      sendJson(response, 400, { error: 'Missing assistant route id.' })
      return
    }

    let body

    try {
      body = await readRequestBody(request)
    } catch {
      sendJson(response, 400, { error: 'Invalid JSON body.' })
      return
    }

    try {
      const route = updateAssistantRoute(ownerUserId, routeId, body ?? {})
      sendJson(response, 200, { route: buildAssistantRouteSettingsPayload(route) })
      return
    } catch (error) {
      sendAssistantRuntimeError(response, error)
      return
    }
  }

  if (
    request.method === 'POST' &&
    /^\/api\/assistant\/routes\/[^/]+\/default$/.test(requestUrl.pathname)
  ) {
    const routeId = requestUrl.pathname
      .replace('/api/assistant/routes/', '')
      .replace('/default', '')

    if (!routeId) {
      sendJson(response, 400, { error: 'Missing assistant route id.' })
      return
    }

    try {
      const route = setDefaultAssistantRoute(ownerUserId, routeId)
      sendJson(response, 200, {
        route,
        assistant: selectAssistantAvailability(ownerUserId),
      })
      return
    } catch (error) {
      sendAssistantRuntimeError(response, error)
      return
    }
  }

  if (request.method === 'DELETE' && requestUrl.pathname.startsWith('/api/assistant/routes/')) {
    const routeId = requestUrl.pathname.replace('/api/assistant/routes/', '')

    if (!routeId) {
      sendJson(response, 400, { error: 'Missing assistant route id.' })
      return
    }

    try {
      const deletedRouteId = deleteAssistantRoute(ownerUserId, routeId)
      sendJson(response, 200, { deletedRouteId })
      return
    } catch (error) {
      sendAssistantRuntimeError(response, error)
      return
    }
  }

  if (
    request.method === 'POST' &&
    /^\/api\/assistant\/threads\/[^/]+\/messages$/.test(requestUrl.pathname)
  ) {
    const threadId = requestUrl.pathname
      .replace('/api/assistant/threads/', '')
      .replace('/messages', '')

    if (!threadId) {
      sendJson(response, 400, { error: 'Missing assistant thread id.' })
      return
    }

    let body

    try {
      body = await readRequestBody(request)
    } catch {
      sendJson(response, 400, { error: 'Invalid JSON body.' })
      return
    }

    try {
      const widgetTools = normalizeAssistantWidgetTools(body?.widgetTools)
      const assistantTurn = await executeAssistantTurn(ownerUserId, threadId, body?.content, {
        streamRequested: body?.stream === true,
        toolsRequested: body?.requestedTools === true || widgetTools.length > 0,
        widgetTools,
      })

      if (body?.stream === true) {
        await streamAssistantTurnResponse(response, assistantTurn)
        return
      }

      sendJson(response, 201, assistantTurn)
      return
    } catch (error) {
      sendAssistantRuntimeError(response, error)
      return
    }
  }

  if (
    request.method === 'PATCH' &&
    requestUrl.pathname.startsWith('/api/calendar-events/')
  ) {
    const calendarEventId = requestUrl.pathname.replace('/api/calendar-events/', '')

    if (!calendarEventId) {
      sendJson(response, 400, { error: 'Missing calendar event id.' })
      return
    }

    try {
      const body = await readRequestBody(request)
      const currentCalendarEvent = selectNormalizedCalendarEventById(
        ownerUserId,
        calendarEventId,
      )

      if (!currentCalendarEvent) {
        sendJson(response, 404, { error: 'Calendar event not found.' })
        return
      }

      const validMemberIds = buildFamilyMemberIdSet(ownerUserId)
      const result = buildCalendarEventFromInput({
        value: body,
        validMemberIds,
        currentEvent: currentCalendarEvent,
      })

      if (result.error) {
        sendJson(response, 400, { error: result.error })
        return
      }

      const timestamp = new Date().toISOString()

      updateCalendarEventRecord(
        ownerUserId,
        calendarEventId,
        result.calendarEvent,
        timestamp,
      )

      const updatedCalendarEvent = selectNormalizedCalendarEventById(
        ownerUserId,
        calendarEventId,
      )

      sendJson(response, 200, {
        calendarEvent: buildCalendarEventPayload(updatedCalendarEvent),
      })
      return
    } catch {
      sendJson(response, 400, { error: 'Invalid JSON body.' })
      return
    }
  }

  if (
    request.method === 'PATCH' &&
    requestUrl.pathname === '/api/roborock/settings'
  ) {
    let body

    try {
      body = await readRequestBody(request)
    } catch {
      sendJson(response, 400, { error: 'Invalid JSON body.' })
      return
    }

    try {
      ensureRoborockSessionEncryptionConfigured()

      const email = sanitizeRoborockEmail(body?.email)
      const verificationCode = sanitizeRoborockVerificationCode(body?.verificationCode)

      if (!email) {
        sendJson(response, 400, { error: 'email is required.' })
        return
      }

      if (!verificationCode) {
        sendJson(response, 400, { error: 'verificationCode is required.' })
        return
      }

      const sessionPayload = await loginRoborockAccount(email, verificationCode)
      const timestamp = new Date().toISOString()

      upsertRoborockIntegration(
        ownerUserId,
        email,
        encryptRoborockSessionPayload(JSON.stringify(sessionPayload)),
        sessionPayload.baseUrl,
        'connected',
        timestamp,
        timestamp,
        timestamp,
      )

      updateRoborockSelection(ownerUserId, '', '', '', null, '', timestamp)

      sendJson(response, 200, {
        roborockSettings: selectRoborockSettings(ownerUserId),
      })
      return
    } catch (error) {
      sendRoborockIntegrationError(response, error)
      return
    }
  }

  if (
    request.method === 'PATCH' &&
    requestUrl.pathname === '/api/roborock/settings/selection'
  ) {
    let body

    try {
      body = await readRequestBody(request)
    } catch {
      sendJson(response, 400, { error: 'Invalid JSON body.' })
      return
    }

    try {
      const selectedDeviceDuid = normalizeRoborockDeviceDuid(body?.selectedDeviceDuid)
      const selectedRoutineId = normalizeRoborockRoutineId(body?.selectedRoutineId)

      if (!selectedDeviceDuid) {
        sendJson(response, 400, { error: 'selectedDeviceDuid is required.' })
        return
      }

      const discovery = await loadRoborockDeviceDiscovery(ownerUserId, selectedDeviceDuid)
      const selectedDevice =
        discovery.devices.find((device) => device.duid === selectedDeviceDuid) ?? null

      if (!selectedDevice) {
        sendJson(response, 400, {
          error: 'selectedDeviceDuid must match one available Roborock device.',
        })
        return
      }

      const selectedRoutine =
        selectedRoutineId === null
          ? null
          : discovery.routines.find((routine) => routine.id === selectedRoutineId) ?? null

      if (selectedRoutineId !== null && !selectedRoutine) {
        sendJson(response, 400, {
          error: 'selectedRoutineId must match one available Roborock routine.',
        })
        return
      }

      const timestamp = new Date().toISOString()

      updateRoborockSelection(
        ownerUserId,
        selectedDevice.duid,
        selectedDevice.name,
        selectedDevice.model,
        selectedRoutine?.id ?? null,
        selectedRoutine?.name ?? '',
        timestamp,
      )

      sendJson(response, 200, {
        roborockSettings: selectRoborockSettings(ownerUserId),
        devices: discovery.devices,
        routines: discovery.routines,
        selectedDeviceDuid: selectedDevice.duid,
      })
      return
    } catch (error) {
      sendRoborockIntegrationError(response, error)
      return
    }
  }

  if (
    request.method === 'PATCH' &&
    requestUrl.pathname === '/api/bring/settings'
  ) {
    let body

    try {
      body = await readRequestBody(request)
    } catch {
      sendJson(response, 400, { error: 'Invalid JSON body.' })
      return
    }

    try {
      ensureBringCredentialEncryptionConfigured()

      const {
        currentIntegration,
        username,
        password,
        hasStoredPassword,
      } = resolveBringCredentials(ownerUserId, body)

      if (!username) {
        sendJson(response, 400, { error: 'username is required.' })
        return
      }

      if (!password) {
        sendJson(response, 400, { error: 'password is required.' })
        return
      }

      const lists = await loadBringLists(username, password)
      const requestedSelectedListUuid = normalizeBringListUuid(
        body?.selectedListUuid ?? currentIntegration?.selected_list_uuid,
      )
      const selectedList = requestedSelectedListUuid
        ? lists.find((entry) => entry.listUuid === requestedSelectedListUuid) ?? null
        : null

      if (lists.length > 0 && !selectedList) {
        sendJson(response, 400, {
          error: 'selectedListUuid must match one available Bring shopping list.',
        })
        return
      }

      const encryptedPasswordJson =
        typeof body?.password === 'string' && body.password.length > 0
          ? encryptBringPassword(password)
          : hasStoredPassword
            ? currentIntegration.encrypted_password_json
            : encryptBringPassword(password)
      const timestamp = new Date().toISOString()

      upsertBringIntegration(
        ownerUserId,
        username,
        encryptedPasswordJson,
        selectedList?.listUuid ?? '',
        selectedList?.name ?? '',
        timestamp,
      )

      sendJson(response, 200, {
        bringSettings: selectBringSettings(ownerUserId),
        lists,
      })
      return
    } catch (error) {
      sendBringIntegrationError(response, error)
      return
    }
  }

  if (request.method === 'PATCH' && requestUrl.pathname === '/api/bring/list/items') {
    let body

    try {
      body = await readRequestBody(request)
    } catch {
      sendJson(response, 400, { error: 'Invalid JSON body.' })
      return
    }

    const itemName = sanitizeBringItemName(body?.itemName)

    if (!itemName) {
      sendJson(response, 400, { error: 'itemName is required.' })
      return
    }

    try {
      const bringList = await mutateBringSelectedList(ownerUserId, '/selected-list/items/update', {
        itemName,
        specification: sanitizeBringItemSpecification(body?.specification),
        itemUuid: normalizeBringItemUuid(body?.itemUuid),
      })
      sendJson(response, 200, { bringList })
      return
    } catch (error) {
      sendBringIntegrationError(response, error)
      return
    }
  }

  if (
    request.method === 'PATCH' &&
    requestUrl.pathname.startsWith('/api/widgets/')
  ) {
    const widgetId = requestUrl.pathname.replace('/api/widgets/', '')

    if (!widgetId) {
      sendJson(response, 400, { error: 'Missing widget id.' })
      return
    }

    try {
      const body = await readRequestBody(request)
      const currentWidget = selectWidgetById(ownerUserId, widgetId)

      if (!currentWidget) {
        sendJson(response, 404, { error: 'Widget not found.' })
        return
      }

      const title = sanitizeWidgetTitle(body.title ?? currentWidget.title)

      if (!title) {
        sendJson(response, 400, { error: 'title must not be empty.' })
        return
      }

      const sourceLocation = normalizeWidgetSourceLocation(
        body.sourceLocation ?? currentWidget.source_location,
      )

      if (!allowedWidgetSourceLocations.has(sourceLocation)) {
        sendJson(response, 400, { error: 'sourceLocation is invalid.' })
        return
      }

      const placementZones = normalizeWidgetPlacementZones(
        body.placementZones ?? parseJsonArray(currentWidget.placement_zones),
      )

      const userScope = normalizeWidgetScope(
        body.userScope ?? {
          mode: currentWidget.user_scope_mode,
          memberIds: parseJsonArray(currentWidget.user_scope_member_ids),
        },
      )

      if (userScope.mode !== 'all' && userScope.memberIds.length === 0) {
        sendJson(response, 400, { error: 'Scoped widgets require at least one member id.' })
        return
      }

      const updatedWidget = {
        id: widgetId,
        title,
        subwayLetter: sanitizeSubwayLetter(body.subwayLetter, title),
        subwayColor: normalizeColor(body.subwayColor ?? currentWidget.subway_color),
        sourceLocation,
        userScope,
        placementZones,
      }

      updateWidgetRecord(ownerUserId, updatedWidget, new Date().toISOString())

      sendJson(response, 200, { widget: updatedWidget })
      return
    } catch {
      sendJson(response, 400, { error: 'Invalid JSON body.' })
      return
    }
  }

  if (request.method === 'DELETE' && requestUrl.pathname === '/api/bring/list/items') {
    let body

    try {
      body = await readRequestBody(request)
    } catch {
      sendJson(response, 400, { error: 'Invalid JSON body.' })
      return
    }

    const itemName = sanitizeBringItemName(body?.itemName)

    if (!itemName) {
      sendJson(response, 400, { error: 'itemName is required.' })
      return
    }

    try {
      const bringList = await mutateBringSelectedList(ownerUserId, '/selected-list/items/remove', {
        itemName,
        itemUuid: normalizeBringItemUuid(body?.itemUuid),
      })
      sendJson(response, 200, { bringList })
      return
    } catch (error) {
      sendBringIntegrationError(response, error)
      return
    }
  }

  if (
    request.method === 'PATCH' &&
    requestUrl.pathname.startsWith('/api/family-members/')
  ) {
    const memberId = requestUrl.pathname.replace('/api/family-members/', '')

    if (!memberId) {
      sendJson(response, 400, { error: 'Missing member id.' })
      return
    }

    try {
      const body = await readRequestBody(request)
      const currentMember = selectFamilyMemberById(ownerUserId, memberId)

      if (!currentMember) {
        sendJson(response, 404, { error: 'Family member not found.' })
        return
      }

      const firstName = sanitizeFirstName(body.firstName ?? currentMember.firstName)

      if (!firstName) {
        sendJson(response, 400, { error: 'firstName must not be empty.' })
        return
      }

      const color = normalizeColor(body.color ?? currentMember.color)

      updateFamilyMemberRecord(
        ownerUserId,
        firstName,
        color,
        new Date().toISOString(),
        memberId,
      )

      sendJson(response, 200, {
        familyMember: { id: memberId, firstName, color },
      })
      return
    } catch {
      sendJson(response, 400, { error: 'Invalid JSON body.' })
      return
    }
  }

  if (
    request.method === 'DELETE' &&
    requestUrl.pathname.startsWith('/api/family-members/')
  ) {
    const memberId = requestUrl.pathname.replace('/api/family-members/', '')

    if (!memberId) {
      sendJson(response, 400, { error: 'Missing member id.' })
      return
    }

    const currentMember = selectFamilyMemberById(ownerUserId, memberId)

    if (!currentMember) {
      sendJson(response, 404, { error: 'Family member not found.' })
      return
    }

    deleteFamilyMemberRecord(ownerUserId, memberId)
    sendJson(response, 200, { deletedMemberId: memberId })
    return
  }

  if (
    request.method === 'PATCH' &&
    requestUrl.pathname.startsWith('/api/todo-items/')
  ) {
    const todoItemId = requestUrl.pathname.replace('/api/todo-items/', '')

    if (!todoItemId) {
      sendJson(response, 400, { error: 'Missing todo item id.' })
      return
    }

    try {
      const body = await readRequestBody(request)
      const currentTodoItem = selectTodoItemById(ownerUserId, todoItemId)

      if (!currentTodoItem) {
        sendJson(response, 404, { error: 'Todo item not found.' })
        return
      }

      if (typeof body.done !== 'boolean') {
        sendJson(response, 400, { error: 'done must be boolean.' })
        return
      }

      updateTodoItemDone(ownerUserId, todoItemId, body.done, new Date().toISOString())

      sendJson(response, 200, {
        todoItem: {
          id: todoItemId,
          task: currentTodoItem.task,
          due: currentTodoItem.due,
          lane: currentTodoItem.lane,
          done: body.done,
          members: parseJsonArray(currentTodoItem.member_ids).filter(
            (memberId) => typeof memberId === 'string',
          ),
        },
      })
      return
    } catch {
      sendJson(response, 400, { error: 'Invalid JSON body.' })
      return
    }
  }

  if (
    request.method === 'PATCH' &&
    requestUrl.pathname.startsWith('/api/widget-settings/')
  ) {
    const widgetId = requestUrl.pathname.replace('/api/widget-settings/', '')

    if (!widgetId) {
      sendJson(response, 400, { error: 'Missing widget id.' })
      return
    }

    try {
      const body = await readRequestBody(request)

      if (!body.settings || typeof body.settings !== 'object' || Array.isArray(body.settings)) {
        sendJson(response, 400, { error: 'settings must be an object.' })
        return
      }

      const timestamp = new Date().toISOString()
      upsertWidgetSettings(ownerUserId, widgetId, JSON.stringify(body.settings), timestamp)

      sendJson(response, 200, {
        widgetSetting: {
          widgetId,
          settings: body.settings,
          updatedAt: timestamp,
        },
      })
      return
    } catch {
      sendJson(response, 400, { error: 'Invalid JSON body.' })
      return
    }
  }

  if (request.method === 'PATCH' && requestUrl.pathname === '/api/app-preferences') {
    let body

    try {
      body = await readRequestBody(request)
    } catch {
      sendJson(response, 400, { error: 'Invalid JSON body.' })
      return
    }

    try {
      const payload = body && typeof body === 'object' && !Array.isArray(body) ? body : {}
      const hasLanguageCode = Object.prototype.hasOwnProperty.call(payload, 'languageCode')
      const hasCountryCode = Object.prototype.hasOwnProperty.call(payload, 'countryCode')
      const hasAudioVisualCameraEnabled = Object.prototype.hasOwnProperty.call(
        payload,
        'audioVisualCameraEnabled',
      )
      const hasAudioVisualMicrophoneEnabled = Object.prototype.hasOwnProperty.call(
        payload,
        'audioVisualMicrophoneEnabled',
      )
      const hasAudioVisualPermissionState = Object.prototype.hasOwnProperty.call(
        payload,
        'audioVisualPermissionState',
      )
      const hasAudioVisualLastRecordingMode = Object.prototype.hasOwnProperty.call(
        payload,
        'audioVisualLastRecordingMode',
      )

      if (
        !hasLanguageCode &&
        !hasCountryCode &&
        !hasAudioVisualCameraEnabled &&
        !hasAudioVisualMicrophoneEnabled &&
        !hasAudioVisualPermissionState &&
        !hasAudioVisualLastRecordingMode
      ) {
        sendJson(response, 400, {
          error:
            'At least one app preference field must be provided.',
        })
        return
      }

      const currentPreferences = selectAppPreferences(ownerUserId)
      let languageCode = currentPreferences.languageCode
      let countryCode = currentPreferences.countryCode
      let audioVisualCameraEnabled = currentPreferences.audioVisualCameraEnabled
      let audioVisualMicrophoneEnabled = currentPreferences.audioVisualMicrophoneEnabled
      let audioVisualPermissionState = currentPreferences.audioVisualPermissionState
      let audioVisualLastRecordingMode = currentPreferences.audioVisualLastRecordingMode

      if (hasLanguageCode && !isSupportedLanguageCode(payload.languageCode)) {
        sendJson(response, 400, { error: 'languageCode must be one of en, de, fr, es.' })
        return
      }

      if (hasCountryCode && !isSupportedCountryCode(payload.countryCode)) {
        sendJson(response, 400, {
          error: 'countryCode must be a two-letter ISO country code.',
        })
        return
      }

      if (
        hasAudioVisualCameraEnabled &&
        typeof payload.audioVisualCameraEnabled !== 'boolean'
      ) {
        sendJson(response, 400, {
          error: 'audioVisualCameraEnabled must be boolean.',
        })
        return
      }

      if (
        hasAudioVisualMicrophoneEnabled &&
        typeof payload.audioVisualMicrophoneEnabled !== 'boolean'
      ) {
        sendJson(response, 400, {
          error: 'audioVisualMicrophoneEnabled must be boolean.',
        })
        return
      }

      if (
        hasAudioVisualPermissionState &&
        !AUDIO_VISUAL_PERMISSION_STATES.has(payload.audioVisualPermissionState)
      ) {
        sendJson(response, 400, {
          error:
            'audioVisualPermissionState must be one of idle, requesting, granted, denied, unsupported, error.',
        })
        return
      }

      if (
        hasAudioVisualLastRecordingMode &&
        payload.audioVisualLastRecordingMode !== null &&
        !AUDIO_VISUAL_RECORDING_MODES.has(payload.audioVisualLastRecordingMode)
      ) {
        sendJson(response, 400, {
          error: 'audioVisualLastRecordingMode must be video, audio, or null.',
        })
        return
      }

      if (hasLanguageCode) {
        languageCode = normalizeLanguageCode(payload.languageCode)
      }

      if (hasCountryCode) {
        countryCode = normalizeCountryCode(payload.countryCode)
      }

      if (hasAudioVisualCameraEnabled) {
        audioVisualCameraEnabled = payload.audioVisualCameraEnabled
      }

      if (hasAudioVisualMicrophoneEnabled) {
        audioVisualMicrophoneEnabled = payload.audioVisualMicrophoneEnabled
      }

      if (hasAudioVisualPermissionState) {
        audioVisualPermissionState = payload.audioVisualPermissionState
      }

      if (hasAudioVisualLastRecordingMode) {
        audioVisualLastRecordingMode = payload.audioVisualLastRecordingMode
      }

      const timestamp = new Date().toISOString()

      upsertAppPreferences(
        ownerUserId,
        languageCode,
        countryCode,
        audioVisualCameraEnabled,
        audioVisualMicrophoneEnabled,
        audioVisualPermissionState,
        audioVisualLastRecordingMode,
        timestamp,
      )

      sendJson(response, 200, {
        appPreferences: {
          languageCode,
          countryCode,
          audioVisualCameraEnabled,
          audioVisualMicrophoneEnabled,
          audioVisualPermissionState,
          audioVisualLastRecordingMode,
          updatedAt: timestamp,
        },
      })
      return
    } catch (error) {
      console.error('Failed to update app preferences.', error)
      sendJson(response, 500, { error: 'Failed to update app preferences.' })
      return
    }
  }

  if (
    request.method === 'DELETE' &&
    requestUrl.pathname.startsWith('/api/audio-visual/recordings/')
  ) {
    const recordingId = requestUrl.pathname.replace('/api/audio-visual/recordings/', '')

    if (!recordingId) {
      sendJson(response, 400, { error: 'Missing recording id.' })
      return
    }

    const currentRecording = selectAudioVisualRecordingById(ownerUserId, recordingId)

    if (!currentRecording || currentRecording.deleted_at) {
      sendJson(response, 404, { error: 'Recording not found.' })
      return
    }

    const deletedAt = new Date().toISOString()
    softDeleteAudioVisualRecording(ownerUserId, recordingId, deletedAt)

    sendJson(response, 200, {
      recording: {
        id: recordingId,
        deletedAt,
      },
      deleted: true,
    })
    return
  }

  if (
    request.method === 'DELETE' &&
    requestUrl.pathname.startsWith('/api/calendar-events/')
  ) {
    const calendarEventId = requestUrl.pathname.replace('/api/calendar-events/', '')

    if (!calendarEventId) {
      sendJson(response, 400, { error: 'Missing calendar event id.' })
      return
    }

    const currentCalendarEvent = selectNormalizedCalendarEventById(ownerUserId, calendarEventId)

    if (!currentCalendarEvent) {
      sendJson(response, 404, { error: 'Calendar event not found.' })
      return
    }

    deleteCalendarEventById(ownerUserId, calendarEventId)
    sendJson(response, 200, {
      calendarEvent: buildCalendarEventPayload(currentCalendarEvent),
      deleted: true,
    })
    return
  }

  sendJson(response, 404, { error: 'Route not found.' })
})

server.listen(PORT, HOST, () => {
  console.log(`Subway backend listening on http://${HOST}:${PORT}`)
})
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
db.exec(`
  CREATE INDEX IF NOT EXISTS audio_visual_recordings_owner_deleted_created_idx
  ON audio_visual_recordings(owner_user_id, deleted_at, created_at)
`)

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
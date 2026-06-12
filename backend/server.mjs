import { createServer } from 'node:http'
import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDirectory = join(__dirname, 'data')
const databasePath = join(dataDirectory, 'subway.sqlite')
const HOST = process.env.HOST ?? '0.0.0.0'
const PORT = Number.parseInt(process.env.PORT ?? '8787', 10)
const WEATHER_LATITUDE = Number.parseFloat(process.env.WEATHER_LATITUDE ?? '52.52')
const WEATHER_LONGITUDE = Number.parseFloat(process.env.WEATHER_LONGITUDE ?? '13.405')
const WEATHER_LOCATION = process.env.WEATHER_LOCATION ?? 'Berlin'
const WEATHER_TIMEZONE = process.env.WEATHER_TIMEZONE ?? 'auto'
const WEATHER_FORECAST_DAYS = 4
const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000
const INITIAL_USER_ID = process.env.INITIAL_USER_ID ?? 'user-flerlage'
const INITIAL_USER_USERNAME = process.env.INITIAL_USER_USERNAME ?? 'flerlage'
const INITIAL_USER_PASSWORD =
  process.env.INITIAL_USER_PASSWORD ?? 'xupjo0-hyhdoF-tovsuc'
const BACKEND_RUNTIME_INSTANCE_ID = randomUUID()
const SESSION_COOKIE_NAME = 'subway_session'
const SESSION_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 10
const SESSION_COOKIE_SECURE = process.env.SESSION_COOKIE_SECURE === 'true'

mkdirSync(dataDirectory, { recursive: true })

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
    title TEXT NOT NULL,
    location TEXT NOT NULL,
    note TEXT NOT NULL,
    member_ids TEXT NOT NULL,
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
    id: 'bulletins',
    title: 'Bulletins',
    subwayLetter: 'B',
    subwayColor: '#8b78ff',
    sourceLocation: 'bulletins',
    userScope: { mode: 'members', memberIds: ['family-2', 'family-3', 'family-4'] },
    placementZones: [{ zoneId: 'b2', order: 1 }],
  },
]

const allowedWidgetSourceLocations = new Set(
  seedWidgets.map((widget) => widget.sourceLocation),
)

const seedCalendarEvents = [
  {
    id: 'calendar-household-sync',
    timeLabel: '06:45',
    title: 'Morning status sync',
    location: 'Entry kiosk',
    note: 'Shared display refresh, weather pull, and door lock review.',
    memberIds: ['*'],
  },
  {
    id: 'calendar-alex-breakfast',
    timeLabel: '07:30',
    title: 'Breakfast transfer window',
    location: 'Kitchen platform',
    note: 'School bags staged and departure lane opens in 20 min.',
    memberIds: ['family-1'],
  },
  {
    id: 'calendar-bianca-studio',
    timeLabel: '09:15',
    title: 'Studio work block',
    location: 'Home office',
    note: 'Editing queue, exports, and video call setup.',
    memberIds: ['family-2'],
  },
  {
    id: 'calendar-chris-package',
    timeLabel: '14:30',
    title: 'Package pickup window',
    location: 'Lobby west desk',
    note: 'Replacement smart sensor reaches the building today.',
    memberIds: ['family-3'],
  },
  {
    id: 'calendar-dana-dinner',
    timeLabel: '18:45',
    title: 'Dinner arrival',
    location: 'Dining room',
    note: 'Table reset and final prep before guests land.',
    memberIds: ['family-4'],
  },
]

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

const insertCalendarEvent = (ownerUserId, calendarEvent, createdAt, updatedAt) =>
  db
    .prepare(`
      INSERT INTO calendar_events (
        owner_user_id,
        id,
        time_label,
        title,
        location,
        note,
        member_ids,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      ownerUserId,
      calendarEvent.id,
      calendarEvent.timeLabel,
      calendarEvent.title,
      calendarEvent.location,
      calendarEvent.note,
      JSON.stringify(calendarEvent.memberIds),
      createdAt,
      updatedAt,
    )

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

const parseJsonArray = (value) => {
  try {
    const parsedValue = JSON.parse(value)

    return Array.isArray(parsedValue) ? parsedValue : []
  } catch {
    return []
  }
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
  db
    .prepare(`
      SELECT
        id,
        time_label AS time,
        title,
        location,
        note,
        member_ids
      FROM calendar_events
      WHERE owner_user_id = ?
      ORDER BY time_label ASC, created_at ASC, id ASC
    `)
    .all(ownerUserId)
    .map((row) => ({
      id: row.id,
      time: row.time,
      title: row.title,
      location: row.location,
      note: row.note,
      members: parseJsonArray(row.member_ids).filter(
        (memberId) => typeof memberId === 'string',
      ),
    }))

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
        day: new Intl.DateTimeFormat('en-US', {
          weekday: 'short',
          timeZone: WEATHER_TIMEZONE === 'auto' ? undefined : WEATHER_TIMEZONE,
        })
          .format(new Date(day))
          .toUpperCase(),
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

const seedCount = getFamilyMemberCount(defaultAppUserId)
const widgetSeedCount = getWidgetCount(defaultAppUserId)
const calendarEventSeedCount = getCalendarEventCount(defaultAppUserId)
const todoItemSeedCount = getTodoItemCount(defaultAppUserId)

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

deleteUnsupportedWidgets()

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
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
    ...extraHeaders,
  })
  response.end(JSON.stringify(payload))
}

const sanitizeFirstName = (value) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, 24) : ''

const normalizeColor = (value) =>
  typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
    ? value
    : '#4aa8ff'

const sanitizeUsername = (value) =>
  typeof value === 'string' ? value.trim().slice(0, 64) : ''

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

  if (request.method === 'GET' && requestUrl.pathname === '/api/calendar-events') {
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

      if (placementZones.length === 0) {
        sendJson(response, 400, { error: 'At least one placement zone is required.' })
        return
      }

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

  sendJson(response, 404, { error: 'Route not found.' })
})

server.listen(PORT, HOST, () => {
  console.log(`Subway backend listening on http://${HOST}:${PORT}`)
})
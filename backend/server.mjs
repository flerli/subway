import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDirectory = join(__dirname, 'data')
const databasePath = join(dataDirectory, 'subway.sqlite')
const PORT = Number.parseInt(process.env.PORT ?? '8787', 10)
const WEATHER_LATITUDE = Number.parseFloat(process.env.WEATHER_LATITUDE ?? '52.52')
const WEATHER_LONGITUDE = Number.parseFloat(process.env.WEATHER_LONGITUDE ?? '13.405')
const WEATHER_LOCATION = process.env.WEATHER_LOCATION ?? 'Berlin'
const WEATHER_TIMEZONE = process.env.WEATHER_TIMEZONE ?? 'auto'
const WEATHER_FORECAST_DAYS = 4
const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000

mkdirSync(dataDirectory, { recursive: true })

const db = new DatabaseSync(databasePath)

db.exec(`
  CREATE TABLE IF NOT EXISTS family_members (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS widgets (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subway_letter TEXT NOT NULL,
    subway_color TEXT NOT NULL,
    source_location TEXT NOT NULL,
    user_scope_mode TEXT NOT NULL,
    user_scope_member_ids TEXT NOT NULL,
    placement_zones TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS calendar_events (
    id TEXT PRIMARY KEY,
    time_label TEXT NOT NULL,
    title TEXT NOT NULL,
    location TEXT NOT NULL,
    note TEXT NOT NULL,
    member_ids TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS todo_items (
    id TEXT PRIMARY KEY,
    task TEXT NOT NULL,
    due_label TEXT NOT NULL,
    lane TEXT NOT NULL,
    member_ids TEXT NOT NULL,
    is_done INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS widget_settings (
    widget_id TEXT PRIMARY KEY,
    settings_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`)

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
    placementZones: [{ zoneId: 'hero', order: 1 }],
  },
  {
    id: 'weather',
    title: 'Weather',
    subwayLetter: 'W',
    subwayColor: '#fccc0a',
    sourceLocation: 'weather',
    userScope: { mode: 'all', memberIds: [] },
    placementZones: [{ zoneId: 'triad', order: 1 }],
  },
  {
    id: 'calendar',
    title: 'Calendar',
    subwayLetter: 'C',
    subwayColor: '#ff6319',
    sourceLocation: 'calendar',
    userScope: { mode: 'members', memberIds: ['family-1', 'family-2'] },
    placementZones: [{ zoneId: 'triad', order: 2 }],
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
    placementZones: [{ zoneId: 'triad', order: 3 }],
  },
  {
    id: 'bulletins',
    title: 'Bulletins',
    subwayLetter: 'B',
    subwayColor: '#8b78ff',
    sourceLocation: 'bulletins',
    userScope: { mode: 'members', memberIds: ['family-2', 'family-3', 'family-4'] },
    placementZones: [{ zoneId: 'bottom-wide', order: 1 }],
  },
  {
    id: 'calibration',
    title: 'Calibration',
    subwayLetter: 'C',
    subwayColor: '#ff7c70',
    sourceLocation: 'calibration',
    userScope: { mode: 'all', memberIds: [] },
    placementZones: [{ zoneId: 'bottom-side', order: 1 }],
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

const getFamilyMemberCount = () =>
  db.prepare('SELECT COUNT(*) AS count FROM family_members').get().count

const getWidgetCount = () => db.prepare('SELECT COUNT(*) AS count FROM widgets').get().count

const getCalendarEventCount = () =>
  db.prepare('SELECT COUNT(*) AS count FROM calendar_events').get().count

const getTodoItemCount = () =>
  db.prepare('SELECT COUNT(*) AS count FROM todo_items').get().count

const insertFamilyMember = (id, firstName, color, createdAt, updatedAt) =>
  db
    .prepare(`
      INSERT INTO family_members (id, first_name, color, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(id, firstName, color, createdAt, updatedAt)

const insertWidget = (widget, createdAt, updatedAt) =>
  db
    .prepare(`
      INSERT INTO widgets (
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
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

const insertCalendarEvent = (calendarEvent, createdAt, updatedAt) =>
  db
    .prepare(`
      INSERT INTO calendar_events (
        id,
        time_label,
        title,
        location,
        note,
        member_ids,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      calendarEvent.id,
      calendarEvent.timeLabel,
      calendarEvent.title,
      calendarEvent.location,
      calendarEvent.note,
      JSON.stringify(calendarEvent.memberIds),
      createdAt,
      updatedAt,
    )

const insertTodoItem = (todoItem, createdAt, updatedAt) =>
  db
    .prepare(`
      INSERT INTO todo_items (
        id,
        task,
        due_label,
        lane,
        member_ids,
        is_done,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      todoItem.id,
      todoItem.task,
      todoItem.dueLabel,
      todoItem.lane,
      JSON.stringify(todoItem.memberIds),
      todoItem.isDone,
      createdAt,
      updatedAt,
    )

const selectAllWidgetSettings = () =>
  db
    .prepare(`
      SELECT widget_id AS widgetId, settings_json, updated_at
      FROM widget_settings
      ORDER BY widget_id ASC
    `)
    .all()
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

const upsertWidgetSettings = (widgetId, settingsJson, timestamp) =>
  db
    .prepare(`
      INSERT INTO widget_settings (widget_id, settings_json, created_at, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(widget_id) DO UPDATE SET
        settings_json = excluded.settings_json,
        updated_at = excluded.updated_at
    `)
    .run(widgetId, settingsJson, timestamp, timestamp)

const selectAllFamilyMembers = () =>
  db
    .prepare(`
      SELECT id, first_name AS firstName, color
      FROM family_members
      ORDER BY created_at ASC, id ASC
    `)
    .all()

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
  placementZones: parseJsonArray(row.placement_zones)
    .map((placement) => {
      if (
        !placement ||
        typeof placement !== 'object' ||
        typeof placement.zoneId !== 'string' ||
        typeof placement.order !== 'number'
      ) {
        return null
      }

      return {
        zoneId: placement.zoneId,
        order: placement.order,
      }
    })
    .filter(Boolean),
})

const selectAllWidgets = () =>
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
      ORDER BY created_at ASC, id ASC
    `)
    .all()
    .map(normalizeWidgetRow)

const selectAllCalendarEvents = () =>
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
      ORDER BY time_label ASC, created_at ASC, id ASC
    `)
    .all()
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

const selectAllTodoItems = () =>
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
      ORDER BY created_at ASC, id ASC
    `)
    .all()
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

const selectTodoItemById = (todoItemId) =>
  db
    .prepare(`
      SELECT id, task, due_label AS due, lane, member_ids, is_done
      FROM todo_items
      WHERE id = ?
    `)
    .get(todoItemId)

const updateTodoItemDone = (todoItemId, done, updatedAt) =>
  db
    .prepare(`
      UPDATE todo_items
      SET is_done = ?, updated_at = ?
      WHERE id = ?
    `)
    .run(done ? 1 : 0, updatedAt, todoItemId)

const selectFamilyMemberById = (memberId) =>
  db
    .prepare(`
      SELECT id, first_name AS firstName, color
      FROM family_members
      WHERE id = ?
    `)
    .get(memberId)

const updateFamilyMemberRecord = (firstName, color, updatedAt, memberId) =>
  db
    .prepare(`
      UPDATE family_members
      SET first_name = ?, color = ?, updated_at = ?
      WHERE id = ?
    `)
    .run(firstName, color, updatedAt, memberId)

const updateWidgetRecord = (widget, updatedAt) =>
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
      WHERE id = ?
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
      widget.id,
    )

const selectWidgetById = (widgetId) =>
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
      WHERE id = ?
    `)
    .get(widgetId)

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

      if (
        candidate.zoneId !== 'hero' &&
        candidate.zoneId !== 'triad' &&
        candidate.zoneId !== 'bottom-wide' &&
        candidate.zoneId !== 'bottom-side'
      ) {
        return null
      }

      return {
        zoneId: candidate.zoneId,
        order: Math.max(1, Math.round(candidate.order)),
      }
    })
    .filter(Boolean)
}

const seedCount = getFamilyMemberCount()
const widgetSeedCount = getWidgetCount()
const calendarEventSeedCount = getCalendarEventCount()
const todoItemSeedCount = getTodoItemCount()

if (seedCount === 0) {
  const now = new Date().toISOString()

  for (const member of seedMembers) {
    insertFamilyMember(member.id, member.firstName, member.color, now, now)
  }
}

if (widgetSeedCount === 0) {
  const now = new Date().toISOString()

  for (const widget of seedWidgets) {
    insertWidget(widget, now, now)
  }
}

if (calendarEventSeedCount === 0) {
  const now = new Date().toISOString()

  for (const calendarEvent of seedCalendarEvents) {
    insertCalendarEvent(calendarEvent, now, now)
  }
}

if (todoItemSeedCount === 0) {
  const now = new Date().toISOString()

  for (const todoItem of seedTodoItems) {
    insertTodoItem(todoItem, now, now)
  }
}

const sendJson = (response, statusCode, payload) => {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
  })
  response.end(JSON.stringify(payload))
}

const sanitizeFirstName = (value) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, 24) : ''

const normalizeColor = (value) =>
  typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
    ? value
    : '#4aa8ff'

const readRequestBody = async (request) => {
  let rawBody = ''

  for await (const chunk of request) {
    rawBody += chunk
  }

  return rawBody ? JSON.parse(rawBody) : {}
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

  if (request.method === 'GET' && requestUrl.pathname === '/api/family-members') {
    sendJson(response, 200, { familyMembers: selectAllFamilyMembers() })
    return
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/widgets') {
    sendJson(response, 200, { widgets: selectAllWidgets() })
    return
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/widget-settings') {
    sendJson(response, 200, { widgetSettings: selectAllWidgetSettings() })
    return
  }

  if (request.method === 'GET' && requestUrl.pathname === '/api/calendar-events') {
    sendJson(response, 200, { calendarEvents: selectAllCalendarEvents() })
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
    sendJson(response, 200, { todoItems: selectAllTodoItems() })
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

      insertFamilyMember(id, firstName, color, now, now)

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
      const currentWidget = selectWidgetById(widgetId)

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

      updateWidgetRecord(updatedWidget, new Date().toISOString())

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
      const currentMember = selectFamilyMemberById(memberId)

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

      updateFamilyMemberRecord(firstName, color, new Date().toISOString(), memberId)

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
      const currentTodoItem = selectTodoItemById(todoItemId)

      if (!currentTodoItem) {
        sendJson(response, 404, { error: 'Todo item not found.' })
        return
      }

      if (typeof body.done !== 'boolean') {
        sendJson(response, 400, { error: 'done must be boolean.' })
        return
      }

      updateTodoItemDone(todoItemId, body.done, new Date().toISOString())

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
      upsertWidgetSettings(widgetId, JSON.stringify(body.settings), timestamp)

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

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Subway backend listening on http://127.0.0.1:${PORT}`)
})
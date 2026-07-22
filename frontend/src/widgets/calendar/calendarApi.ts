import type { AgendaItem } from '../widgetHostModels'
import { fetchApi } from '../../api/request'

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_LABEL_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/
const MULTI_DAY_EVENT_RANGE_PATTERN = /\b(?:through|until)\s+(\d{4}-\d{2}-\d{2})\b/i

export type CalendarRecurrenceFrequency =
  | 'none'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'

export interface CalendarEventScope {
  mode: 'all' | 'members'
  memberIds: string[]
}

export interface CalendarEventRecurrenceRule {
  frequency: CalendarRecurrenceFrequency
  interval: number
  byWeekdays: number[]
  count: number | null
  until: string | null
}

export interface CalendarEventRecord {
  id: string
  seriesId: string
  date: string
  occurrenceDate: string
  seriesStartDate: string
  time: string
  title: string
  description: string
  location: string
  locationCity: string
  locationCountry: string
  note: string
  members: string[]
  scope: CalendarEventScope
  recurrence: CalendarEventRecurrenceRule
  excludedDates: string[]
  cancelled: boolean
}

export interface CalendarEventQueryOptions {
  rangeStart?: string
  rangeEnd?: string
}

export interface CalendarEventWriteInput {
  date: string
  time: string
  title: string
  description: string
  locationCity: string
  locationCountry: string
  scope: CalendarEventScope
  recurrence: CalendarEventRecurrenceRule
  excludedDates: string[]
  cancelled: boolean
}

export interface CalendarAgendaMappingOptions {
  homeCountryCode?: string | null
}

const extractRangeEndDateFromNote = (note: string, startDate: string) => {
  const match = MULTI_DAY_EVENT_RANGE_PATTERN.exec(note)

  if (!match || !ISO_DATE_PATTERN.test(match[1]) || match[1] < startDate) {
    return null
  }

  return match[1]
}

const normalizeCalendarEventScope = (
  value: unknown,
  members: string[],
): CalendarEventScope => {
  const candidate = value as { mode?: unknown; memberIds?: unknown }
  const memberIds = Array.isArray(candidate?.memberIds)
    ? candidate.memberIds.filter(
        (memberId: unknown): memberId is string => typeof memberId === 'string',
      )
    : []

  if (candidate?.mode === 'all' || members.includes('*')) {
    return { mode: 'all', memberIds: [] }
  }

  return {
    mode: 'members',
    memberIds: memberIds.length > 0 ? memberIds : members.filter((memberId) => memberId !== '*'),
  }
}

const normalizeCalendarRecurrenceRule = (value: unknown): CalendarEventRecurrenceRule => {
  const candidate = value as {
    frequency?: unknown
    interval?: unknown
    byWeekdays?: unknown
    count?: unknown
    until?: unknown
  }
  const frequency =
    candidate?.frequency === 'daily' ||
    candidate?.frequency === 'weekly' ||
    candidate?.frequency === 'monthly' ||
    candidate?.frequency === 'yearly'
      ? candidate.frequency
      : 'none'

  return {
    frequency,
    interval:
      typeof candidate?.interval === 'number' && candidate.interval > 0
        ? Math.min(Math.floor(candidate.interval), 366)
        : 1,
    byWeekdays: Array.isArray(candidate?.byWeekdays)
      ? candidate.byWeekdays.filter(
          (weekday: unknown): weekday is number =>
            typeof weekday === 'number' && Number.isInteger(weekday) && weekday >= 0 && weekday <= 6,
        )
      : [],
    count:
      typeof candidate?.count === 'number' && candidate.count > 0
        ? Math.floor(candidate.count)
        : null,
    until:
      typeof candidate?.until === 'string' && ISO_DATE_PATTERN.test(candidate.until)
        ? candidate.until
        : null,
  }
}

const normalizeCalendarEventRecord = (value: unknown): CalendarEventRecord | null => {
  const candidate = value as {
    id?: unknown
    seriesId?: unknown
    date?: unknown
    occurrenceDate?: unknown
    seriesStartDate?: unknown
    time?: unknown
    title?: unknown
    description?: unknown
    location?: unknown
    locationCity?: unknown
    locationCountry?: unknown
    note?: unknown
    members?: unknown
    scope?: unknown
    recurrence?: unknown
    excludedDates?: unknown
    cancelled?: unknown
  }

  if (
    !value ||
    typeof value !== 'object' ||
    typeof candidate.id !== 'string' ||
    typeof candidate.seriesId !== 'string' ||
    typeof candidate.date !== 'string' ||
    typeof candidate.occurrenceDate !== 'string' ||
    typeof candidate.seriesStartDate !== 'string' ||
    typeof candidate.time !== 'string' ||
    typeof candidate.title !== 'string' ||
    typeof candidate.description !== 'string' ||
    typeof candidate.location !== 'string' ||
    typeof candidate.locationCity !== 'string' ||
    typeof candidate.locationCountry !== 'string' ||
    typeof candidate.note !== 'string' ||
    !Array.isArray(candidate.members) ||
    !ISO_DATE_PATTERN.test(candidate.date) ||
    !ISO_DATE_PATTERN.test(candidate.occurrenceDate) ||
    !ISO_DATE_PATTERN.test(candidate.seriesStartDate) ||
    !TIME_LABEL_PATTERN.test(candidate.time)
  ) {
    return null
  }

  const members = candidate.members.filter(
    (memberId: unknown): memberId is string => typeof memberId === 'string',
  )

  const excludedDates = Array.isArray(candidate?.excludedDates)
    ? candidate.excludedDates.filter(
        (date: unknown): date is string => typeof date === 'string' && ISO_DATE_PATTERN.test(date),
      )
    : []

  return {
    id: candidate.id,
    seriesId: candidate.seriesId,
    date: candidate.date,
    occurrenceDate: candidate.occurrenceDate,
    seriesStartDate: candidate.seriesStartDate,
    time: candidate.time,
    title: candidate.title,
    description: candidate.description,
    location: candidate.location,
    locationCity: candidate.locationCity,
    locationCountry: candidate.locationCountry.trim().toUpperCase(),
    note: candidate.note,
    members,
    scope: normalizeCalendarEventScope(candidate.scope, members),
    recurrence: normalizeCalendarRecurrenceRule(candidate.recurrence),
    excludedDates,
    cancelled: typeof candidate.cancelled === 'boolean' ? candidate.cancelled : false,
  }
}

export const mapCalendarEventRecordToAgendaItem = (
  record: CalendarEventRecord,
  options: CalendarAgendaMappingOptions = {},
): AgendaItem => {
  const normalizedHomeCountryCode = options.homeCountryCode?.trim().toUpperCase() ?? null
  const isForeign =
    Boolean(normalizedHomeCountryCode) &&
    normalizedHomeCountryCode !== record.locationCountry
  const rangeEndDate = extractRangeEndDateFromNote(record.note, record.date)

  return {
    line: `calendar-${record.id.toLowerCase().replace(/\s+/g, '-')}`,
    eventId: record.id,
    date: record.date,
    time: record.time,
    title: record.title,
    location: record.location,
    locationCountry: record.locationCountry,
    note: record.note,
    isForeign,
    members: record.members,
    cancelled: record.cancelled,
    rangeEndDate,
    recurrenceFrequency: record.recurrence.frequency,
  }
}

export const sortCalendarEventRecords = (records: CalendarEventRecord[]) =>
  [...records].sort(
    (left, right) =>
      left.date.localeCompare(right.date) ||
      left.time.localeCompare(right.time) ||
      left.seriesId.localeCompare(right.seriesId),
  )

const readCalendarApiError = async (response: Response, fallbackMessage: string) => {
  try {
    const payload = (await response.json()) as { error?: unknown }

    return typeof payload.error === 'string' && payload.error.trim().length > 0
      ? payload.error
      : fallbackMessage
  } catch {
    return fallbackMessage
  }
}

export const fetchCalendarEventRecords = async (
  options: CalendarEventQueryOptions = {},
) => {
  const searchParams = new URLSearchParams()

  if (options.rangeStart || options.rangeEnd) {
    if (!options.rangeStart || !options.rangeEnd) {
      throw new Error('Both rangeStart and rangeEnd are required for calendar range queries.')
    }

    searchParams.set('rangeStart', options.rangeStart)
    searchParams.set('rangeEnd', options.rangeEnd)
  }

  const response = await fetchApi(
    searchParams.size > 0 ? `/calendar-events?${searchParams.toString()}` : '/calendar-events',
  )

  if (!response.ok) {
    throw new Error('Failed to load calendar events from backend.')
  }

  const payload = (await response.json()) as { calendarEvents?: unknown[] }

  return (payload.calendarEvents ?? [])
    .map(normalizeCalendarEventRecord)
    .filter((record): record is CalendarEventRecord => Boolean(record))
}

export const fetchCalendarEvents = async () => {
  const records = await fetchCalendarEventRecords()

  return records
    .map((record) => mapCalendarEventRecordToAgendaItem(record))
    .filter((agendaItem): agendaItem is AgendaItem => Boolean(agendaItem))
}

export const createCalendarEvent = async (input: CalendarEventWriteInput) => {
  const response = await fetchApi('/calendar-events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error(
      await readCalendarApiError(response, 'Failed to create calendar event in backend.'),
    )
  }

  const payload = (await response.json()) as { calendarEvent?: unknown }
  const calendarEvent = normalizeCalendarEventRecord(payload.calendarEvent)

  if (!calendarEvent) {
    throw new Error('Backend returned an invalid calendar event payload.')
  }

  return calendarEvent
}

export const updateCalendarEvent = async (
  calendarEventId: string,
  input: Partial<CalendarEventWriteInput>,
) => {
  const response = await fetchApi(`/calendar-events/${calendarEventId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error(
      await readCalendarApiError(response, 'Failed to update calendar event in backend.'),
    )
  }

  const payload = (await response.json()) as { calendarEvent?: unknown }
  const calendarEvent = normalizeCalendarEventRecord(payload.calendarEvent)

  if (!calendarEvent) {
    throw new Error('Backend returned an invalid calendar event payload.')
  }

  return calendarEvent
}

export const deleteCalendarEvent = async (calendarEventId: string) => {
  const response = await fetchApi(`/calendar-events/${calendarEventId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error(
      await readCalendarApiError(response, 'Failed to delete calendar event in backend.'),
    )
  }
}
import type {
  CalendarEventRecord,
  CalendarEventRecurrenceRule,
  CalendarEventScope,
  CalendarEventWriteInput,
  CalendarRecurrenceFrequency,
} from './calendarApi'

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_LABEL_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/
const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/

export interface CalendarEventDraft {
  date: string
  time: string
  title: string
  description: string
  locationCity: string
  locationCountry: string
  scopeMode: CalendarEventScope['mode']
  scopeMemberIds: string[]
  recurrenceFrequency: CalendarRecurrenceFrequency
  recurrenceInterval: string
  recurrenceByWeekdays: number[]
  recurrenceCount: string
  recurrenceUntil: string
  excludedDates: string[]
  cancelled: boolean
}

export const calendarWeekdayOptions = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
] as const

const todayIsoDate = () => new Date().toISOString().slice(0, 10)

const normalizePositiveIntegerString = (value: string, fallback = '1') => {
  const normalizedValue = value.trim()

  if (!normalizedValue) {
    return fallback
  }

  const numericValue = Number.parseInt(normalizedValue, 10)

  return Number.isInteger(numericValue) && numericValue > 0 ? `${numericValue}` : fallback
}

const normalizeRecurrenceRuleDraft = (recurrence: CalendarEventRecurrenceRule) => ({
  recurrenceFrequency: recurrence.frequency,
  recurrenceInterval: `${recurrence.interval}`,
  recurrenceByWeekdays: [...recurrence.byWeekdays],
  recurrenceCount: recurrence.count ? `${recurrence.count}` : '',
  recurrenceUntil: recurrence.until ?? '',
})

export const createEmptyCalendarEventDraft = (): CalendarEventDraft => ({
  date: todayIsoDate(),
  time: '09:00',
  title: '',
  description: '',
  locationCity: '',
  locationCountry: 'DE',
  scopeMode: 'all',
  scopeMemberIds: [],
  recurrenceFrequency: 'none',
  recurrenceInterval: '1',
  recurrenceByWeekdays: [],
  recurrenceCount: '',
  recurrenceUntil: '',
  excludedDates: [],
  cancelled: false,
})

export const createCalendarEventDraftFromRecord = (
  calendarEvent: CalendarEventRecord,
): CalendarEventDraft => ({
  date: calendarEvent.date,
  time: calendarEvent.time,
  title: calendarEvent.title,
  description: calendarEvent.description,
  locationCity: calendarEvent.locationCity,
  locationCountry: calendarEvent.locationCountry,
  scopeMode: calendarEvent.scope.mode,
  scopeMemberIds: [...calendarEvent.scope.memberIds],
  ...normalizeRecurrenceRuleDraft(calendarEvent.recurrence),
  excludedDates: [...calendarEvent.excludedDates],
  cancelled: calendarEvent.cancelled,
})

export const validateCalendarEventDraft = (draft: CalendarEventDraft) => {
  if (!ISO_DATE_PATTERN.test(draft.date)) {
    return 'Date must use YYYY-MM-DD format.'
  }

  if (!TIME_LABEL_PATTERN.test(draft.time)) {
    return 'Time must use 24-hour HH:MM format.'
  }

  if (draft.title.trim().length === 0) {
    return 'Title is required.'
  }

  if (draft.locationCity.trim().length === 0) {
    return 'City is required.'
  }

  if (!COUNTRY_CODE_PATTERN.test(draft.locationCountry.trim().toUpperCase())) {
    return 'Country must be a two-letter ISO code.'
  }

  if (draft.scopeMode === 'members' && draft.scopeMemberIds.length === 0) {
    return 'Select at least one family member for member-scoped events.'
  }

  const recurrenceInterval = Number.parseInt(draft.recurrenceInterval, 10)

  if (!Number.isInteger(recurrenceInterval) || recurrenceInterval <= 0) {
    return 'Recurrence interval must be a positive integer.'
  }

  if (draft.recurrenceCount.trim().length > 0) {
    const recurrenceCount = Number.parseInt(draft.recurrenceCount, 10)

    if (!Number.isInteger(recurrenceCount) || recurrenceCount <= 0) {
      return 'Recurrence count must be a positive integer when provided.'
    }
  }

  if (draft.recurrenceUntil.trim().length > 0 && !ISO_DATE_PATTERN.test(draft.recurrenceUntil)) {
    return 'Recurrence end date must use YYYY-MM-DD format.'
  }

  if (
    draft.recurrenceFrequency === 'weekly' &&
    draft.recurrenceByWeekdays.some(
      (weekday) => !Number.isInteger(weekday) || weekday < 0 || weekday > 6,
    )
  ) {
    return 'Weekly recurrence days must be valid weekdays.'
  }

  return null
}

export const buildCalendarEventInputFromDraft = (
  draft: CalendarEventDraft,
): CalendarEventWriteInput => ({
  date: draft.date,
  time: draft.time,
  title: draft.title.trim(),
  description: draft.description.trim(),
  locationCity: draft.locationCity.trim(),
  locationCountry: draft.locationCountry.trim().toUpperCase(),
  scope: {
    mode: draft.scopeMode,
    memberIds:
      draft.scopeMode === 'members' ? [...draft.scopeMemberIds] : [],
  },
  recurrence: {
    frequency: draft.recurrenceFrequency,
    interval: Number.parseInt(normalizePositiveIntegerString(draft.recurrenceInterval), 10),
    byWeekdays:
      draft.recurrenceFrequency === 'weekly'
        ? [...draft.recurrenceByWeekdays].sort((left, right) => left - right)
        : [],
    count:
      draft.recurrenceCount.trim().length > 0
        ? Number.parseInt(draft.recurrenceCount, 10)
        : null,
    until: draft.recurrenceUntil.trim().length > 0 ? draft.recurrenceUntil : null,
  },
  excludedDates: draft.excludedDates,
  cancelled: draft.cancelled,
})
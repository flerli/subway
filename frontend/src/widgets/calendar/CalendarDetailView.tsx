import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { formatLocalizedText, type SupportedLanguageCode } from '../../i18n/localization'
import type { FamilyMember } from '../widgetHostModels'
import type { CalendarWidgetTranslation } from './translations'
import {
  createCalendarEvent,
  deleteCalendarEvent,
  fetchCalendarEventRecords,
  sortCalendarEventRecords,
  updateCalendarEvent,
  type CalendarEventRecord,
  type CalendarEventWriteInput,
} from './calendarApi'
import {
  buildCalendarEventInputFromDraft,
  calendarWeekdayOptions,
  createCalendarEventDraftFromRecord,
  createEmptyCalendarEventDraft,
  type CalendarEventDraft,
  validateCalendarEventDraft,
} from './calendarEditor'

type CalendarDetailViewMode = 'week' | 'month' | 'year'

interface CalendarDetailViewData {
  focusedMemberId?: string | null
  focusedEventId?: string | null
  focusedEventDate?: string | null
  familyMembers: FamilyMember[]
  homeCountryCode: string
  includeHouseholdEvents: boolean
  onCalendarDataChanged?: () => void
}

const isCalendarDetailViewData = (value: unknown): value is CalendarDetailViewData => {
  const candidate = value as {
    focusedMemberId?: unknown
    focusedEventId?: unknown
    focusedEventDate?: unknown
    familyMembers?: unknown
    homeCountryCode?: unknown
    includeHouseholdEvents?: unknown
    onCalendarDataChanged?: unknown
  }

  return (
    Array.isArray(candidate?.familyMembers) &&
    typeof candidate?.homeCountryCode === 'string' &&
    typeof candidate?.includeHouseholdEvents === 'boolean' &&
    (candidate?.focusedMemberId == null || typeof candidate.focusedMemberId === 'string') &&
    (candidate?.focusedEventId == null || typeof candidate.focusedEventId === 'string') &&
    (candidate?.focusedEventDate == null || typeof candidate.focusedEventDate === 'string') &&
    (candidate?.onCalendarDataChanged == null || typeof candidate.onCalendarDataChanged === 'function')
  )
}

const formatIsoDate = (value: Date) => {
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, '0')
  const day = `${value.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}

const getTodayIsoDate = () => formatIsoDate(new Date())

const parseIsoDate = (value: string) => new Date(`${value}T00:00:00`)

const addDays = (value: Date, dayCount: number) => {
  const nextDate = new Date(value)
  nextDate.setDate(nextDate.getDate() + dayCount)
  return nextDate
}

const addMonths = (value: Date, monthCount: number) => {
  const nextDate = new Date(value)
  nextDate.setMonth(nextDate.getMonth() + monthCount)
  return nextDate
}

const addYears = (value: Date, yearCount: number) => {
  const nextDate = new Date(value)
  nextDate.setFullYear(nextDate.getFullYear() + yearCount)
  return nextDate
}

const startOfWeek = (value: Date) => {
  const nextDate = new Date(value)
  const weekdayOffset = (nextDate.getDay() + 6) % 7
  nextDate.setDate(nextDate.getDate() - weekdayOffset)
  return nextDate
}

const endOfWeek = (value: Date) => addDays(startOfWeek(value), 6)

const isSameMonth = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth()

const buildMonthGridBounds = (anchorDate: string) => {
  const anchor = parseIsoDate(anchorDate)
  const today = parseIsoDate(getTodayIsoDate())
  const firstDayOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const lastDayOfMonth = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0)
  const isCurrentMonth = isSameMonth(anchor, today)

  return {
    gridStart: isCurrentMonth ? startOfWeek(today) : startOfWeek(firstDayOfMonth),
    gridEnd: endOfWeek(lastDayOfMonth),
  }
}

const buildRangeForView = (mode: CalendarDetailViewMode, anchorDate: string) => {
  const anchor = parseIsoDate(anchorDate)

  switch (mode) {
    case 'month': {
      const { gridStart, gridEnd } = buildMonthGridBounds(anchorDate)

      return {
        rangeStart: formatIsoDate(gridStart),
        rangeEnd: formatIsoDate(gridEnd),
      }
    }
    case 'year': {
      const rangeStartDate = new Date(anchor.getFullYear(), 0, 1)
      const rangeEndDate = new Date(anchor.getFullYear(), 11, 31)

      return {
        rangeStart: formatIsoDate(rangeStartDate),
        rangeEnd: formatIsoDate(rangeEndDate),
      }
    }
    case 'week':
    default: {
      const rangeStartDate = anchor
      const rangeEndDate = addDays(rangeStartDate, 6)

      return {
        rangeStart: formatIsoDate(rangeStartDate),
        rangeEnd: formatIsoDate(rangeEndDate),
      }
    }
  }
}

const shiftAnchorDate = (mode: CalendarDetailViewMode, anchorDate: string, direction: -1 | 1) => {
  const anchor = parseIsoDate(anchorDate)

  switch (mode) {
    case 'month':
      return formatIsoDate(addMonths(anchor, direction))
    case 'year':
      return formatIsoDate(addYears(anchor, direction))
    case 'week':
    default:
      return formatIsoDate(addDays(anchor, direction * 7))
  }
}

const buildCountryFlag = (countryCode: string) => {
  const normalizedCountryCode = countryCode.trim().toUpperCase()

  if (!/^[A-Z]{2}$/.test(normalizedCountryCode)) {
    return ''
  }

  return Array.from(normalizedCountryCode)
    .map((letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)))
    .join('')
}

const matchesFocusedMember = (
  event: CalendarEventRecord,
  focusedMemberId?: string | null,
) => {
  if (!focusedMemberId) {
    return true
  }

  return event.members.includes('*') || event.members.includes(focusedMemberId)
}

const isHouseholdEvent = (event: CalendarEventRecord) => event.members.includes('*')

const formatRangeLabel = (
  mode: CalendarDetailViewMode,
  anchorDate: string,
  rangeStart: string,
  rangeEnd: string,
  languageCode: SupportedLanguageCode,
) => {
  const anchor = parseIsoDate(anchorDate)
  const startDate = parseIsoDate(rangeStart)
  const endDate = parseIsoDate(rangeEnd)

  if (mode === 'year') {
    return new Intl.DateTimeFormat(languageCode, { year: 'numeric' }).format(anchor)
  }

  if (mode === 'month') {
    return new Intl.DateTimeFormat(languageCode, {
      month: 'long',
      year: 'numeric',
    }).format(anchor)
  }

  const startLabel = new Intl.DateTimeFormat(languageCode, {
    month: 'short',
    day: 'numeric',
  }).format(startDate)
  const endLabel = new Intl.DateTimeFormat(languageCode, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(endDate)

  return `${startLabel} - ${endLabel}`
}

const formatDayLabel = (date: string, languageCode: SupportedLanguageCode) =>
  new Intl.DateTimeFormat(languageCode, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
    .format(parseIsoDate(date))
    .replace(',', '')

const formatMonthLabel = (monthKey: string, languageCode: SupportedLanguageCode) =>
  new Intl.DateTimeFormat(languageCode, {
    month: 'long',
    year: 'numeric',
  }).format(parseIsoDate(`${monthKey}-01`))

const groupEventsByDate = (events: CalendarEventRecord[]) => {
  const groups = new Map<string, CalendarEventRecord[]>()

  for (const event of events) {
    const existingItems = groups.get(event.date) ?? []
    existingItems.push(event)
    groups.set(event.date, existingItems)
  }

  return Array.from(groups.entries()).map(([date, items]) => ({
    date,
    items,
  }))
}

const buildWeekdayHeaders = (languageCode: SupportedLanguageCode) => {
  const mondayAnchor = new Date('2024-01-01T00:00:00')

  return Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(languageCode, { weekday: 'short' })
      .format(addDays(mondayAnchor, index))
      .replace('.', ''),
  )
}

const buildMonthMatrix = (anchorDate: string, events: CalendarEventRecord[]) => {
  const anchor = parseIsoDate(anchorDate)
  const { gridStart, gridEnd } = buildMonthGridBounds(anchorDate)
  const monthEventMap = new Map<string, CalendarEventRecord[]>()

  for (const event of events) {
    const existingItems = monthEventMap.get(event.date) ?? []
    existingItems.push(event)
    monthEventMap.set(event.date, existingItems)
  }

  const monthCells = []
  let cursorDate = new Date(gridStart)

  while (cursorDate <= gridEnd) {
    const isoDate = formatIsoDate(cursorDate)

    monthCells.push({
      date: isoDate,
      dayNumber: cursorDate.getDate(),
      isCurrentMonth: cursorDate.getMonth() === anchor.getMonth(),
      events: monthEventMap.get(isoDate) ?? [],
    })

    cursorDate = addDays(cursorDate, 1)
  }

  return monthCells
}

const buildYearMatrix = (anchorDate: string, events: CalendarEventRecord[]) => {
  const year = parseIsoDate(anchorDate).getFullYear()

  return Array.from({ length: 12 }, (_, monthIndex) => {
    const monthDate = new Date(year, monthIndex, 1)
    const monthKey = formatIsoDate(monthDate).slice(0, 7)

    return {
      monthKey,
      events: events.filter((event) => event.date.startsWith(monthKey)),
    }
  })
}

const formatScopeSummary = (
  event: CalendarEventRecord,
  familyMembersById: Map<string, FamilyMember>,
  widgetText: CalendarWidgetTranslation,
) => {
  if (event.scope.mode === 'all') {
    return widgetText.detail.householdScopeLabel
  }

  return event.scope.memberIds
    .map((memberId) => familyMembersById.get(memberId)?.firstName ?? memberId)
    .join(', ')
}

const formatRecurrenceSummary = (
  event: CalendarEventRecord,
  widgetText: CalendarWidgetTranslation,
) => {
  if (event.recurrence.frequency === 'none') {
    return widgetText.detail.recurrenceOneOffSummary
  }
  
  switch (event.recurrence.frequency) {
    case 'daily':
      return formatLocalizedText(widgetText.detail.recurrenceDailySummary, {
        interval: event.recurrence.interval,
      })
    case 'weekly':
      return formatLocalizedText(widgetText.detail.recurrenceWeeklySummary, {
        interval: event.recurrence.interval,
      })
    case 'monthly':
      return formatLocalizedText(widgetText.detail.recurrenceMonthlySummary, {
        interval: event.recurrence.interval,
      })
    case 'yearly':
      return formatLocalizedText(widgetText.detail.recurrenceYearlySummary, {
        interval: event.recurrence.interval,
      })
    default:
      return widgetText.detail.recurrenceOneOffSummary
  }
}

const generateUpcomingSeriesOccurrences = (
  draft: CalendarEventDraft,
  startDateString: string,
  limitDays: number = 90,
): string[] => {
  if (draft.recurrenceFrequency === 'none') {
    return []
  }

  const occurrences: string[] = []
  const startDate = parseIsoDate(draft.date)
  const limitDate = addDays(parseIsoDate(startDateString), limitDays)
  let currentDate = new Date(startDate)
  const interval = Number.parseInt(draft.recurrenceInterval, 10) || 1
  let count = 0
  const maxCount = draft.recurrenceCount ? Number.parseInt(draft.recurrenceCount, 10) : Infinity
  const untilDate = draft.recurrenceUntil ? parseIsoDate(draft.recurrenceUntil) : null

  while (currentDate <= limitDate && count < maxCount) {
    if (untilDate && currentDate > untilDate) break

    if (currentDate >= startDate) {
      // Check if this date matches the recurrence pattern
      const isMatch =
        draft.recurrenceFrequency === 'daily' ||
        (draft.recurrenceFrequency === 'weekly' &&
          draft.recurrenceByWeekdays.includes(currentDate.getDay())) ||
        (draft.recurrenceFrequency === 'monthly' &&
          currentDate.getDate() === startDate.getDate()) ||
        (draft.recurrenceFrequency === 'yearly' &&
          currentDate.getMonth() === startDate.getMonth() &&
          currentDate.getDate() === startDate.getDate())

      if (isMatch) {
        occurrences.push(formatIsoDate(currentDate))
        count++
      }
    }

    // Advance by interval
    if (draft.recurrenceFrequency === 'daily') {
      currentDate = addDays(currentDate, interval)
    } else if (draft.recurrenceFrequency === 'weekly') {
      currentDate = addDays(currentDate, 7 * interval)
    } else if (draft.recurrenceFrequency === 'monthly') {
      currentDate = addMonths(currentDate, interval)
    } else if (draft.recurrenceFrequency === 'yearly') {
      currentDate = addYears(currentDate, interval)
    } else {
      break
    }
  }

  return occurrences.slice(0, 10)
}

export function CalendarDetailView({
  data,
  languageCode,
  widgetText,
}: {
  data: unknown
  languageCode: SupportedLanguageCode
  widgetText: CalendarWidgetTranslation
}) {
  const [viewMode, setViewMode] = useState<CalendarDetailViewMode>('month')
  const [anchorDate, setAnchorDate] = useState(() => getTodayIsoDate())
  const [rangeEvents, setRangeEvents] = useState<CalendarEventRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [editorMode, setEditorMode] = useState<'create' | 'edit' | null>(null)
  const [draft, setDraft] = useState<CalendarEventDraft>(() => createEmptyCalendarEventDraft())
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitNotice, setSubmitNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  if (!isCalendarDetailViewData(data)) {
    return null
  }

  const {
    focusedMemberId,
    focusedEventId,
    focusedEventDate,
    familyMembers,
    homeCountryCode,
    includeHouseholdEvents,
    onCalendarDataChanged,
  } = data
  const familyMembersById = new Map(familyMembers.map((member) => [member.id, member]))
  const { rangeStart, rangeEnd } = buildRangeForView(viewMode, anchorDate)

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    setError(null)

    fetchCalendarEventRecords({ rangeStart, rangeEnd })
      .then((rangeRecords) => {
        if (cancelled) {
          return
        }

        setRangeEvents(sortCalendarEventRecords(rangeRecords))
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) {
          setError(widgetText.detail.loadFailed)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [rangeEnd, rangeStart, refreshToken, widgetText.detail.loadFailed])

  const filteredRangeEvents = rangeEvents.filter((event) => {
    if (!matchesFocusedMember(event, focusedMemberId)) {
      return false
    }

    if (!includeHouseholdEvents && isHouseholdEvent(event)) {
      return false
    }

    return true
  })

  useEffect(() => {
    if (!focusedEventId || !focusedEventDate) {
      return
    }

    const normalizedAnchorDate =
      viewMode === 'week'
        ? formatIsoDate(startOfWeek(parseIsoDate(focusedEventDate)))
        : focusedEventDate

    setAnchorDate(normalizedAnchorDate)
    setSelectedEventId(focusedEventId)
    setEditorMode(null)
    setSubmitNotice(null)
  }, [focusedEventDate, focusedEventId, viewMode])

  useEffect(() => {
    if (loading) {
      return
    }

    if (!selectedEventId) {
      return
    }

    if (!filteredRangeEvents.some((event) => event.id === selectedEventId)) {
      setSelectedEventId(null)
      if (editorMode === 'edit') {
        setEditorMode(null)
      }
    }
  }, [editorMode, filteredRangeEvents, selectedEventId])

  const selectedEvent = selectedEventId
    ? filteredRangeEvents.find((event) => event.id === selectedEventId) ?? null
    : null
  const isSidePanelOpen = Boolean(selectedEvent) || editorMode !== null
  const usesOverlaySidePanel = isSidePanelOpen && viewMode !== 'week'

  const weekdayHeaders = useMemo(() => buildWeekdayHeaders(languageCode), [languageCode])
  const monthMatrix = useMemo(
    () => buildMonthMatrix(anchorDate, filteredRangeEvents),
    [anchorDate, filteredRangeEvents],
  )
  const yearMatrix = useMemo(
    () => buildYearMatrix(anchorDate, filteredRangeEvents),
    [anchorDate, filteredRangeEvents],
  )

  const beginCreate = () => {
    setEditorMode('create')
    setSelectedEventId(null)
    setDraft(createEmptyCalendarEventDraft())
    setSubmitError(null)
    setSubmitNotice(null)
  }

  const closeSidePanel = () => {
    setSelectedEventId(null)
    setEditorMode(null)
    setSubmitError(null)
  }

  const beginEdit = (event: CalendarEventRecord) => {
    setSelectedEventId(event.id)
    setEditorMode('edit')
    setDraft(createCalendarEventDraftFromRecord(event))
    setSubmitError(null)
    setSubmitNotice(null)
  }

  const toggleScopeMember = (memberId: string) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      scopeMemberIds: currentDraft.scopeMemberIds.includes(memberId)
        ? currentDraft.scopeMemberIds.filter((value) => value !== memberId)
        : [...currentDraft.scopeMemberIds, memberId],
    }))
  }

  const toggleWeekday = (weekday: number) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      recurrenceByWeekdays: currentDraft.recurrenceByWeekdays.includes(weekday)
        ? currentDraft.recurrenceByWeekdays.filter((value) => value !== weekday)
        : [...currentDraft.recurrenceByWeekdays, weekday],
    }))
  }

  const handleCreateCalendarEvent = async (input: CalendarEventWriteInput) => {
    const persistedEvent = await createCalendarEvent(input)
    setRefreshToken((currentValue) => currentValue + 1)
    onCalendarDataChanged?.()
    return persistedEvent
  }

  const handleUpdateCalendarEvent = async (
    calendarEventId: string,
    input: CalendarEventWriteInput,
  ) => {
    const persistedEvent = await updateCalendarEvent(calendarEventId, input)
    setRefreshToken((currentValue) => currentValue + 1)
    onCalendarDataChanged?.()
    return persistedEvent
  }

  const handleDeleteCalendarEvent = async (calendarEventId: string) => {
    await deleteCalendarEvent(calendarEventId)
    setRefreshToken((currentValue) => currentValue + 1)
    onCalendarDataChanged?.()
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validationError = validateCalendarEventDraft(draft)

    if (validationError) {
      setSubmitError(validationError)
      setSubmitNotice(null)
      return
    }

    setPending(true)
    setSubmitError(null)
    setSubmitNotice(null)

    try {
      const payload = buildCalendarEventInputFromDraft(draft)
      const persistedCalendarEvent =
        editorMode === 'edit' && selectedEvent
          ? await handleUpdateCalendarEvent(selectedEvent.seriesId, payload)
          : await handleCreateCalendarEvent(payload)

      setSelectedEventId(persistedCalendarEvent.id)
      setEditorMode(null)
      setSubmitNotice(
        editorMode === 'edit'
          ? widgetText.detail.updatedNotice
          : widgetText.detail.createdNotice,
      )
    } catch (submitValue) {
      setSubmitError(
        submitValue instanceof Error
          ? submitValue.message
          : widgetText.detail.saveFailedFallback,
      )
    } finally {
      setPending(false)
    }
  }

  const handleDeleteSelectedEvent = async () => {
    if (!selectedEvent) {
      return
    }

    const confirmed = window.confirm(
      formatLocalizedText(widgetText.detail.deleteConfirm, {
        title: selectedEvent.title,
      }),
    )

    if (!confirmed) {
      return
    }

    setPending(true)
    setSubmitError(null)
    setSubmitNotice(null)

    try {
      await handleDeleteCalendarEvent(selectedEvent.seriesId)
      setSelectedEventId(null)
      setEditorMode(null)
      setSubmitNotice(widgetText.detail.deletedNotice)
    } catch (submitValue) {
      setSubmitError(
        submitValue instanceof Error
          ? submitValue.message
          : widgetText.detail.deleteFailedFallback,
      )
    } finally {
      setPending(false)
    }
  }

  const getMemberColorStyle = (memberIds: string[]): React.CSSProperties => {
    const validMembers = memberIds.filter(
      (m) => m !== '*' && familyMembersById.has(m),
    )
    
    if (validMembers.length === 0) return {}
    if (validMembers.length === 1) {
      const member = familyMembersById.get(validMembers[0])
      if (!member) return {}
      const hex = member.color.slice(1)
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16)
      const b = parseInt(hex.slice(4, 6), 16)
      return { backgroundColor: `rgba(${r}, ${g}, ${b}, 0.15)` }
    }

    // Multiple members: create gradient
    const colors = validMembers
      .slice(0, 3)
      .map((memberId) => {
        const member = familyMembersById.get(memberId)
        if (!member) return null
        return member.color
      })
      .filter((color): color is string => color !== null)

    if (colors.length === 0) return {}

    const gradientStops = colors
      .map((color, index) => {
        const hex = color.slice(1)
        const r = parseInt(hex.slice(0, 2), 16)
        const g = parseInt(hex.slice(2, 4), 16)
        const b = parseInt(hex.slice(4, 6), 16)
        const percentage = (index / (colors.length - 1)) * 100
        return `rgba(${r}, ${g}, ${b}, 0.15) ${percentage}%`
      })
      .join(', ')

    return { background: `linear-gradient(135deg, ${gradientStops})` }
  }

  const renderDayCellEventButton = (event: CalendarEventRecord, compact = false) => {
    const isSelected = selectedEventId === event.id

    return (
      <button
        key={event.id}
        className={`calendar-event-chip${compact ? ' calendar-event-chip--compact' : ''}${
          isSelected ? ' is-active' : ''
        }${event.cancelled ? ' is-cancelled' : ''}`}
        style={getMemberColorStyle(event.members)}
        type="button"
        onClick={() => {
          setSelectedEventId((currentValue) =>
            currentValue === event.id ? null : event.id,
          )
          setEditorMode(null)
          setSubmitNotice(null)
        }}
      >
        <span className="calendar-event-chip-time">{event.time}</span>
        <span className="calendar-event-chip-title">{event.title}</span>
      </button>
    )
  }

  const renderEventRow = (event: CalendarEventRecord) => {
    const isForeign = homeCountryCode.trim().toUpperCase() !== event.locationCountry
    const isSelected = selectedEventId === event.id

    return (
      <button
        className={`calendar-detail-event-row${isSelected ? ' is-active' : ''}${
          event.cancelled ? ' is-cancelled' : ''
        }`}
        key={`${event.id}-${event.date}`}
        style={getMemberColorStyle(event.members)}
        type="button"
        onClick={() => {
          setSelectedEventId((currentValue) =>
            currentValue === event.id ? null : event.id,
          )
          setEditorMode(null)
          setSubmitNotice(null)
        }}
      >
        <p className="calendar-detail-event-time">{event.time}</p>
        <div className="calendar-detail-event-copy">
          <p className="calendar-detail-event-title">{event.title}</p>
          <p className="calendar-detail-event-location">
            {isForeign ? (
              <span className="agenda-flag" aria-hidden="true">
                {buildCountryFlag(event.locationCountry)}
              </span>
            ) : null}
            <span>{event.location}</span>
          </p>
          <p className="calendar-detail-event-note">{event.description}</p>
          <p className="calendar-detail-event-meta">
            {formatScopeSummary(event, familyMembersById, widgetText)} · {formatRecurrenceSummary(event, widgetText)}
          </p>
        </div>
      </button>
    )
  }

  const renderSelectedEventDetails = () => {
    if (!selectedEvent) {
      return null
    }

    const isForeign = homeCountryCode.trim().toUpperCase() !== selectedEvent.locationCountry

    return (
      <article className="settings-card calendar-detail-info-card">
        <div className="settings-card-head">
          <p className="widget-kicker">{widgetText.detail.detailsKicker}</p>
          <h3>{selectedEvent.title}</h3>
        </div>

        <div className="calendar-detail-info-grid">
          <div className="calendar-detail-info-field">
            <p className="calendar-detail-info-label">{widgetText.detail.dateLabel}</p>
            <p>{selectedEvent.date}</p>
          </div>
          <div className="calendar-detail-info-field">
            <p className="calendar-detail-info-label">{widgetText.detail.timeLabel}</p>
            <p>{selectedEvent.time}</p>
          </div>
          <div className="calendar-detail-info-field">
            <p className="calendar-detail-info-label">{widgetText.detail.cityLabel}</p>
            <p>{selectedEvent.locationCity}</p>
          </div>
          <div className="calendar-detail-info-field">
            <p className="calendar-detail-info-label">{widgetText.detail.countryLabel}</p>
            <p>
              {isForeign ? `${buildCountryFlag(selectedEvent.locationCountry)} ` : ''}
              {selectedEvent.locationCountry}
            </p>
          </div>
          <div className="calendar-detail-info-field">
            <p className="calendar-detail-info-label">{widgetText.detail.scopeLabel}</p>
            <p>{formatScopeSummary(selectedEvent, familyMembersById, widgetText)}</p>
          </div>
          <div className="calendar-detail-info-field">
            <p className="calendar-detail-info-label">{widgetText.detail.recurrenceLabel}</p>
            <p>{formatRecurrenceSummary(selectedEvent, widgetText)}</p>
          </div>
          <div className="calendar-detail-info-field calendar-detail-info-field--wide">
            <p className="calendar-detail-info-label">{widgetText.detail.descriptionLabel}</p>
            <p>{selectedEvent.description || '—'}</p>
          </div>
        </div>

        <div className="calendar-detail-side-actions">
          <button className="settings-submit settings-submit--secondary" type="button" onClick={beginCreate}>
            {widgetText.detail.newEventAction}
          </button>
          <button className="settings-submit settings-submit--secondary" type="button" onClick={() => beginEdit(selectedEvent)}>
            {widgetText.detail.editAction}
          </button>
          <button className="settings-submit settings-submit--secondary" type="button" onClick={closeSidePanel}>
            {widgetText.detail.closePanelAction}
          </button>
          <button className="settings-submit settings-submit--secondary settings-submit--danger" type="button" onClick={() => void handleDeleteSelectedEvent()}>
            {widgetText.detail.deleteAction}
          </button>
        </div>
      </article>
    )
  }

  const renderEditorPanel = () => {
    if (!editorMode) {
      return null
    }

    return (
      <article className="settings-card calendar-detail-editor-card">
        <div className="settings-card-head">
          <p className="widget-kicker">{widgetText.detail.editorTitle}</p>
          <h3>{editorMode === 'create' ? widgetText.detail.createTitle : widgetText.detail.editTitle}</h3>
        </div>

        {submitError ? <p className="settings-note settings-note--warning">{submitError}</p> : null}
        {submitNotice ? <p className="settings-note">{submitNotice}</p> : null}

        <form className="calendar-detail-editor-form" onSubmit={handleSubmit}>
          <label className="settings-label">
            <span>{widgetText.detail.titleLabel}</span>
            <input
              className="settings-input"
              type="text"
              value={draft.title}
              onChange={(inputEvent) =>
                setDraft((currentDraft) => ({ ...currentDraft, title: inputEvent.target.value }))
              }
              placeholder={widgetText.detail.titlePlaceholder}
              disabled={pending}
            />
          </label>

          <div className="calendar-event-inline-fields">
            <label className="settings-label">
              <span>{widgetText.detail.dateLabel}</span>
              <input
                className="settings-input"
                type="date"
                value={draft.date}
                onChange={(inputEvent) =>
                  setDraft((currentDraft) => ({ ...currentDraft, date: inputEvent.target.value }))
                }
                disabled={pending}
              />
            </label>

            <label className="settings-label">
              <span>{widgetText.detail.timeLabel}</span>
              <input
                className="settings-input"
                type="time"
                value={draft.time}
                onChange={(inputEvent) =>
                  setDraft((currentDraft) => ({ ...currentDraft, time: inputEvent.target.value }))
                }
                disabled={pending}
              />
            </label>
          </div>

          <div className="calendar-event-inline-fields">
            <label className="settings-label">
              <span>{widgetText.detail.cityLabel}</span>
              <input
                className="settings-input"
                type="text"
                value={draft.locationCity}
                onChange={(inputEvent) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    locationCity: inputEvent.target.value,
                  }))
                }
                placeholder={widgetText.detail.cityPlaceholder}
                disabled={pending}
              />
            </label>

            <label className="settings-label">
              <span>{widgetText.detail.countryLabel}</span>
              <input
                className="settings-input"
                type="text"
                maxLength={2}
                value={draft.locationCountry}
                onChange={(inputEvent) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    locationCountry: inputEvent.target.value
                      .toUpperCase()
                      .replace(/[^A-Z]/g, '')
                      .slice(0, 2),
                  }))
                }
                placeholder={widgetText.detail.countryPlaceholder}
                disabled={pending}
              />
            </label>
          </div>

          <label className="settings-label">
            <span>{widgetText.detail.descriptionLabel}</span>
            <textarea
              className="settings-input settings-textarea"
              value={draft.description}
              onChange={(inputEvent) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  description: inputEvent.target.value,
                }))
              }
              placeholder={widgetText.detail.descriptionPlaceholder}
              disabled={pending}
            />
          </label>

          <div className="settings-label">
            <span>{widgetText.detail.scopeLabel}</span>
            <div className="calendar-chip-grid">
              <label className="calendar-chip" key="all">
                <input
                  type="checkbox"
                  checked={draft.scopeMode === 'all'}
                  onChange={() =>
                    setDraft((currentDraft) => ({
                      ...currentDraft,
                      scopeMode: 'all',
                      scopeMemberIds: [],
                    }))
                  }
                  disabled={pending}
                />
                <span>{widgetText.detail.scopeHouseholdOption}</span>
              </label>
              {familyMembers.map((member) => (
                <label className="calendar-chip" key={member.id}>
                  <input
                    type="checkbox"
                    checked={draft.scopeMode === 'members' && draft.scopeMemberIds.includes(member.id)}
                    onChange={() => {
                      if (draft.scopeMode !== 'members') {
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          scopeMode: 'members',
                          scopeMemberIds: [member.id],
                        }))
                      } else {
                        toggleScopeMember(member.id)
                      }
                    }}
                    disabled={pending}
                  />
                  <span>{member.firstName}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="settings-label calendar-cancelled-label">
            <input
              type="checkbox"
              checked={draft.cancelled}
              onChange={(inputEvent) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  cancelled: inputEvent.target.checked,
                }))
              }
              disabled={pending}
            />
            <span>Cancelled (show with strikethrough)</span>
          </label>

          <label className="settings-label">
            <span>{widgetText.detail.recurrenceLabel}</span>
            <select
              className="settings-input settings-select"
              value={draft.recurrenceFrequency}
              onChange={(inputEvent) =>
                setDraft((currentDraft) => ({
                  ...currentDraft,
                  recurrenceFrequency: inputEvent.target.value as CalendarEventDraft['recurrenceFrequency'],
                }))
              }
              disabled={pending}
            >
              <option value="none">{widgetText.detail.recurrenceOneOffOption}</option>
              <option value="daily">{widgetText.detail.recurrenceDailyOption}</option>
              <option value="weekly">{widgetText.detail.recurrenceWeeklyOption}</option>
              <option value="monthly">{widgetText.detail.recurrenceMonthlyOption}</option>
              <option value="yearly">{widgetText.detail.recurrenceYearlyOption}</option>
            </select>
          </label>

          <div className="calendar-event-inline-fields">
            <label className="settings-label">
              <span>{widgetText.detail.intervalLabel}</span>
              <input
                className="settings-input"
                type="number"
                min={1}
                step={1}
                value={draft.recurrenceInterval}
                onChange={(inputEvent) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    recurrenceInterval: inputEvent.target.value,
                  }))
                }
                disabled={pending}
              />
            </label>

            <label className="settings-label">
              <span>{widgetText.detail.countLabel}</span>
              <input
                className="settings-input"
                type="number"
                min={1}
                step={1}
                value={draft.recurrenceCount}
                onChange={(inputEvent) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    recurrenceCount: inputEvent.target.value,
                  }))
                }
                placeholder={widgetText.detail.countPlaceholder}
                disabled={pending}
              />
            </label>

            <label className="settings-label">
              <span>{widgetText.detail.untilLabel}</span>
              <input
                className="settings-input"
                type="date"
                value={draft.recurrenceUntil}
                onChange={(inputEvent) =>
                  setDraft((currentDraft) => ({
                    ...currentDraft,
                    recurrenceUntil: inputEvent.target.value,
                  }))
                }
                disabled={pending}
              />
            </label>
          </div>

          {draft.recurrenceFrequency === 'weekly' ? (
            <div className="calendar-weekday-grid">
              {calendarWeekdayOptions.map((weekday) => (
                <label className="calendar-chip" key={weekday.value}>
                  <input
                    type="checkbox"
                    checked={draft.recurrenceByWeekdays.includes(weekday.value)}
                    onChange={() => toggleWeekday(weekday.value)}
                    disabled={pending}
                  />
                  <span>{weekday.label}</span>
                </label>
              ))}
            </div>
          ) : null}

          {draft.recurrenceFrequency !== 'none' ? (
            <div className="calendar-exclusions-section">
              <p className="settings-label">Skip dates (holidays, exceptions):</p>
              <div className="calendar-exclusions-grid">
                {generateUpcomingSeriesOccurrences(draft, getTodayIsoDate()).map((date) => (
                  <label className="calendar-chip calendar-exclusion-chip" key={date}>
                    <input
                      type="checkbox"
                      checked={draft.excludedDates.includes(date)}
                      onChange={() =>
                        setDraft((currentDraft) => ({
                          ...currentDraft,
                          excludedDates: currentDraft.excludedDates.includes(date)
                            ? currentDraft.excludedDates.filter((d) => d !== date)
                            : [...currentDraft.excludedDates, date],
                        }))
                      }
                      disabled={pending}
                    />
                    <span>{formatDayLabel(date, languageCode)}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <div className="calendar-detail-side-actions">
            <button className="settings-submit" type="submit" disabled={pending}>
              {pending
                ? editorMode === 'edit'
                  ? widgetText.detail.savingSeriesAction
                  : widgetText.detail.creatingSeriesAction
                : editorMode === 'edit'
                  ? widgetText.detail.saveSeriesAction
                  : widgetText.detail.createSeriesAction}
            </button>
            <button
              className="settings-submit settings-submit--secondary"
              type="button"
              onClick={closeSidePanel}
              disabled={pending}
            >
              {widgetText.detail.closePanelAction}
            </button>
          </div>
        </form>
      </article>
    )
  }

  const renderDayGroups = (events: CalendarEventRecord[]) => {
    const dayGroups = groupEventsByDate(events)
    const todayIsoDate = getTodayIsoDate()

    if (dayGroups.length === 0) {
      return (
        <div className="empty-state empty-state--expanded">
          <p className="empty-title">{widgetText.detail.emptyRangeTitle}</p>
          <p className="empty-copy">{widgetText.detail.emptyRangeCopy}</p>
        </div>
      )
    }

    return (
      <div className="calendar-detail-groups">
        {dayGroups.map((dayGroup) => (
          <section
            className={`calendar-detail-day-group${dayGroup.date === todayIsoDate ? ' is-today' : ''}`}
            key={dayGroup.date}
          >
            <p className="calendar-detail-day-heading">{formatDayLabel(dayGroup.date, languageCode)}</p>
            <div className="calendar-detail-event-list">
              {dayGroup.items.map(renderEventRow)}
            </div>
          </section>
        ))}
      </div>
    )
  }

  const renderMonthMatrix = () => {
    if (monthMatrix.length === 0) {
      return (
        <div className="empty-state empty-state--expanded">
          <p className="empty-title">{widgetText.detail.emptyRangeTitle}</p>
          <p className="empty-copy">{widgetText.detail.emptyRangeCopy}</p>
        </div>
      )
    }

    const todayIsoDate = getTodayIsoDate()
    const monthRowCount = Math.ceil(monthMatrix.length / 7)

    return (
      <div className="calendar-month-matrix-wrap">
        <div className="calendar-month-weekdays">
          {weekdayHeaders.map((weekdayLabel) => (
            <p className="calendar-month-weekday" key={weekdayLabel}>
              {weekdayLabel}
            </p>
          ))}
        </div>
        <div
          className="calendar-month-matrix"
          style={{ gridTemplateRows: `repeat(${monthRowCount}, minmax(0, 1fr))` }}
        >
          {monthMatrix.map((cell) => {
            const isSelected = cell.events.some((event) => event.id === selectedEventId)
            const isToday = cell.date === todayIsoDate

            return (
              <article
                className={`calendar-month-cell${cell.isCurrentMonth ? '' : ' calendar-month-cell--outside'}${
                  isSelected ? ' is-selected' : ''
                }${isToday ? ' is-today' : ''}`}
                key={cell.date}
              >
                <p className="calendar-month-cell-day">{cell.dayNumber}</p>
                <div className="calendar-month-cell-events">
                  {cell.events.slice(0, 2).map((event) => renderDayCellEventButton(event, true))}
                  {cell.events.length > 2 ? (
                    <p className="calendar-month-cell-more">+{cell.events.length - 2}</p>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      </div>
    )
  }

  const renderYearMatrix = () => {
    if (yearMatrix.every((month) => month.events.length === 0)) {
      return (
        <div className="empty-state empty-state--expanded">
          <p className="empty-title">{widgetText.detail.emptyRangeTitle}</p>
          <p className="empty-copy">{widgetText.detail.emptyRangeCopy}</p>
        </div>
      )
    }

    const todayIsoDate = getTodayIsoDate()
    const todayMonthKey = todayIsoDate.slice(0, 7)

    return (
      <div className="calendar-year-matrix">
        {yearMatrix.map((month) => (
          <article
            className={`calendar-year-card${month.monthKey === todayMonthKey ? ' is-today' : ''}`}
            key={month.monthKey}
          >
            <p className="calendar-year-card-title">
              {formatMonthLabel(month.monthKey, languageCode)}
            </p>
            <div className="calendar-year-card-events">
              {month.events.slice(0, 3).map((event) => renderDayCellEventButton(event, true))}
              {month.events.length > 3 ? (
                <p className="calendar-month-cell-more">+{month.events.length - 3}</p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    )
  }

  return (
    <div
      className={`calendar-detail-view${isSidePanelOpen ? ' calendar-detail-view--with-side-panel' : ''}${usesOverlaySidePanel ? ' calendar-detail-view--overlay-panel' : ''}`}
      style={
        isSidePanelOpen && !usesOverlaySidePanel
          ? { gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)' }
          : undefined
      }
    >
      <div className="calendar-detail-main-column">
        <div className="calendar-detail-header">
          <div className="calendar-detail-header-copy">
            <div className="calendar-detail-mode-switcher" role="group" aria-label="Calendar view mode">
              <button
                className={`calendar-detail-mode-button${viewMode === 'week' ? ' is-active' : ''}`}
                type="button"
                onClick={() => {
                  setAnchorDate(getTodayIsoDate())
                  setViewMode('week')
                }}
              >
                {widgetText.detail.weekViewAction}
              </button>
              <button
                className={`calendar-detail-mode-button${viewMode === 'month' ? ' is-active' : ''}`}
                type="button"
                onClick={() => setViewMode('month')}
              >
                {widgetText.detail.monthViewAction}
              </button>
              <button
                className={`calendar-detail-mode-button${viewMode === 'year' ? ' is-active' : ''}`}
                type="button"
                onClick={() => setViewMode('year')}
              >
                {widgetText.detail.yearViewAction}
              </button>
            </div>
            <h3 className="calendar-detail-range-title">
              {formatRangeLabel(viewMode, anchorDate, rangeStart, rangeEnd, languageCode)}
            </h3>
            <p className="calendar-detail-range-meta">
              {formatLocalizedText(widgetText.detail.rangeEventCountMeta, {
                count: filteredRangeEvents.length,
              })}
            </p>
          </div>

          <div className="calendar-detail-nav-actions">
            <button
              className="settings-submit"
              type="button"
              onClick={beginCreate}
            >
              {widgetText.detail.newEventAction}
            </button>
            <button
              className="settings-submit settings-submit--secondary"
              type="button"
              onClick={() => setAnchorDate((currentValue) => shiftAnchorDate(viewMode, currentValue, -1))}
            >
              {widgetText.detail.previousRangeAction}
            </button>
            <button
              className="settings-submit settings-submit--secondary"
              type="button"
              onClick={() => setAnchorDate((currentValue) => shiftAnchorDate(viewMode, currentValue, 1))}
            >
              {widgetText.detail.nextRangeAction}
            </button>
          </div>
        </div>

        <div className="calendar-detail-main-body">
          {loading ? (
            <p className="calendar-detail-loading">{widgetText.detail.loadingState}</p>
          ) : error ? (
            <p className="settings-note settings-note--warning">{error}</p>
          ) : viewMode === 'month' ? (
            renderMonthMatrix()
          ) : viewMode === 'year' ? (
            renderYearMatrix()
          ) : (
            renderDayGroups(filteredRangeEvents)
          )}
        </div>
      </div>

      {isSidePanelOpen ? (
        <div className={`calendar-detail-side-column${usesOverlaySidePanel ? ' calendar-detail-side-column--overlay' : ''}`}>
          {submitNotice ? <p className="settings-note">{submitNotice}</p> : null}
          {editorMode ? renderEditorPanel() : renderSelectedEventDetails()}
        </div>
      ) : null}
    </div>
  )
}

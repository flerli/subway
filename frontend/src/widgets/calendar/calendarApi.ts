import type { AgendaItem } from '../widgetHostModels'

const CALENDAR_API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

const getApiUrl = (path: string) =>
  `${CALENDAR_API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`

const normalizeAgendaItem = (value: unknown): AgendaItem | null => {
  const candidate = value as {
    time?: unknown
    title?: unknown
    location?: unknown
    note?: unknown
    members?: unknown
  }

  if (
    !value ||
    typeof value !== 'object' ||
    typeof candidate.time !== 'string' ||
    typeof candidate.title !== 'string' ||
    typeof candidate.location !== 'string' ||
    typeof candidate.note !== 'string' ||
    !Array.isArray(candidate.members)
  ) {
    return null
  }

  return {
    line: `calendar-${candidate.title.toLowerCase().replace(/\s+/g, '-')}`,
    time: candidate.time,
    title: candidate.title,
    location: candidate.location,
    note: candidate.note,
    members: candidate.members.filter(
      (memberId: unknown): memberId is string => typeof memberId === 'string',
    ),
  }
}

export const fetchCalendarEvents = async () => {
  const response = await fetch(getApiUrl('/calendar-events'))

  if (!response.ok) {
    throw new Error('Failed to load calendar events from backend.')
  }

  const payload = (await response.json()) as { calendarEvents?: unknown[] }

  return (payload.calendarEvents ?? [])
    .map(normalizeAgendaItem)
    .filter((agendaItem): agendaItem is AgendaItem => Boolean(agendaItem))
}
import { createElement } from 'react'
import { fetchCalendarEvents } from './calendarApi'
import type { AgendaItem } from '../widgetHostModels'
import type { WidgetMicroAppContract } from '../widgetTypes'
import {
  getCalendarWidgetTranslation,
  matchesCalendarWidgetTitle,
} from './translations'
import { CalendarDetailView } from './CalendarDetailView'

const defaultCalendarWidgetTranslation = getCalendarWidgetTranslation('en')

const ALL_MEMBERS_AUDIENCE = '*'

const matchesFocusedMember = (
  agendaItem: AgendaItem,
  focusedMemberId?: string | null,
) => {
  if (!focusedMemberId) {
    return true
  }

  return (
    agendaItem.members.includes(ALL_MEMBERS_AUDIENCE) ||
    agendaItem.members.includes(focusedMemberId)
  )
}

export const normalizeCalendarSettings = (value: unknown) => {
  const candidate = value as {
    includeHouseholdEvents?: unknown
  }

  return {
    includeHouseholdEvents:
      typeof candidate?.includeHouseholdEvents === 'boolean'
        ? candidate.includeHouseholdEvents
        : true,
  }
}

  export const filterCalendarAgendaItems = (
    agendaItems: AgendaItem[],
    focusedMemberId: string | null | undefined,
    settingsValue: unknown,
  ) => {
    const settings = normalizeCalendarSettings(settingsValue)

    return agendaItems
      .filter((agendaItem) => matchesFocusedMember(agendaItem, focusedMemberId))
      .filter((agendaItem) =>
        settings.includeHouseholdEvents
          ? true
          : !agendaItem.members.includes(ALL_MEMBERS_AUDIENCE),
      )
      .sort(
        (left, right) =>
          left.date.localeCompare(right.date) || left.time.localeCompare(right.time),
      )
  }

export const calendarWidget: WidgetMicroAppContract = {
  entityId: 'calendar',
  folderName: 'calendar',
  dataSource: 'database',
  capabilities: ['read', 'write'],
  hasSettingsPanel: true,
  mcpTools: [
    {
      name: 'widget.calendar.get_range_events',
      description:
        'Get calendar events for a requested date range using the same member and household filters as the widget.',
      humanAction:
        'Read the calendar widget in week, month, or year range form and inspect event details.',
      parityScope: ['read'],
      approvalRequired: false,
      redactArguments: false,
      redactResults: false,
      arguments: [
        { key: 'rangeStart', type: 'string', description: 'Range start in YYYY-MM-DD.', required: true },
        { key: 'rangeEnd', type: 'string', description: 'Range end in YYYY-MM-DD.', required: true },
        {
          key: 'focusedMemberId',
          type: 'string',
          description: 'Optional member id for member-focused filtering.',
          required: false,
        },
        {
          key: 'includeHouseholdEvents',
          type: 'boolean',
          description: 'Whether household-wide events are included.',
          required: false,
        },
      ],
    },
    {
      name: 'widget.calendar.create_event',
      description:
        'Create a calendar event or recurring series using the same validated event model as the widget editor.',
      humanAction:
        'Create a new calendar event from the calendar detail editor.',
      parityScope: ['write'],
      approvalRequired: false,
      redactArguments: false,
      redactResults: false,
      arguments: [
        { key: 'date', type: 'string', description: 'Event date in YYYY-MM-DD.', required: true },
        { key: 'time', type: 'string', description: 'Event time in HH:MM.', required: true },
        { key: 'title', type: 'string', description: 'Event title.', required: true },
        { key: 'description', type: 'string', description: 'Event description or note.', required: false },
        { key: 'locationCity', type: 'string', description: 'Event city.', required: true },
        { key: 'locationCountry', type: 'string', description: 'Two-letter ISO country code.', required: true },
        { key: 'scopeMode', type: 'string', description: 'Either all or members.', required: true },
        {
          key: 'scopeMemberIdsJson',
          type: 'string',
          description: 'JSON array string of member ids for member-scoped events.',
          required: false,
        },
        { key: 'recurrenceFrequency', type: 'string', description: 'none, daily, weekly, monthly, or yearly.', required: false },
        { key: 'recurrenceInterval', type: 'number', description: 'Positive recurrence interval.', required: false },
        {
          key: 'recurrenceByWeekdaysJson',
          type: 'string',
          description: 'JSON array string of weekday numbers 0-6 for weekly recurrence.',
          required: false,
        },
        { key: 'recurrenceCount', type: 'number', description: 'Optional recurrence count.', required: false },
        { key: 'recurrenceUntil', type: 'string', description: 'Optional recurrence end date in YYYY-MM-DD.', required: false },
        {
          key: 'excludedDatesJson',
          type: 'string',
          description: 'Optional JSON array string of excluded dates in YYYY-MM-DD.',
          required: false,
        },
        { key: 'cancelled', type: 'boolean', description: 'Whether the event starts canceled.', required: false },
      ],
    },
    {
      name: 'widget.calendar.update_event',
      description:
        'Update a calendar event or recurring series using the same validated event model as the widget editor.',
      humanAction:
        'Edit a calendar event from the calendar detail editor.',
      parityScope: ['write'],
      approvalRequired: false,
      redactArguments: false,
      redactResults: false,
      arguments: [
        { key: 'calendarEventId', type: 'string', description: 'Series id of the calendar event to update.', required: true },
        { key: 'date', type: 'string', description: 'Event date in YYYY-MM-DD.', required: false },
        { key: 'time', type: 'string', description: 'Event time in HH:MM.', required: false },
        { key: 'title', type: 'string', description: 'Event title.', required: false },
        { key: 'description', type: 'string', description: 'Event description or note.', required: false },
        { key: 'locationCity', type: 'string', description: 'Event city.', required: false },
        { key: 'locationCountry', type: 'string', description: 'Two-letter ISO country code.', required: false },
        { key: 'scopeMode', type: 'string', description: 'Either all or members.', required: false },
        {
          key: 'scopeMemberIdsJson',
          type: 'string',
          description: 'JSON array string of member ids for member-scoped events.',
          required: false,
        },
        { key: 'recurrenceFrequency', type: 'string', description: 'none, daily, weekly, monthly, or yearly.', required: false },
        { key: 'recurrenceInterval', type: 'number', description: 'Positive recurrence interval.', required: false },
        {
          key: 'recurrenceByWeekdaysJson',
          type: 'string',
          description: 'JSON array string of weekday numbers 0-6 for weekly recurrence.',
          required: false,
        },
        { key: 'recurrenceCount', type: 'number', description: 'Optional recurrence count.', required: false },
        { key: 'recurrenceUntil', type: 'string', description: 'Optional recurrence end date in YYYY-MM-DD.', required: false },
        {
          key: 'excludedDatesJson',
          type: 'string',
          description: 'Optional JSON array string of excluded dates in YYYY-MM-DD.',
          required: false,
        },
        { key: 'cancelled', type: 'boolean', description: 'Whether the event is canceled.', required: false },
      ],
    },
    {
      name: 'widget.calendar.delete_event',
      description:
        'Delete a calendar event or recurring series.',
      humanAction:
        'Delete a calendar event from the calendar detail editor.',
      parityScope: ['write'],
      approvalRequired: true,
      redactArguments: false,
      redactResults: false,
      arguments: [
        { key: 'calendarEventId', type: 'string', description: 'Series id of the calendar event to delete.', required: true },
      ],
    },
    {
      name: 'widget.calendar.update_widget_settings',
      description:
        'Update the calendar widget settings that control household event visibility.',
      humanAction:
        'Save the calendar widget settings panel.',
      parityScope: ['write'],
      approvalRequired: false,
      redactArguments: false,
      redactResults: false,
      arguments: [
        { key: 'includeHouseholdEvents', type: 'boolean', description: 'Whether household-wide events are included in the compact calendar.', required: false },
      ],
    },
  ],
  getTranslation: getCalendarWidgetTranslation,
  matchesDefaultTitle: matchesCalendarWidgetTitle,
  settingsDefinition: {
    title: defaultCalendarWidgetTranslation.settings?.title ?? 'Calendar widget settings',
    description:
      defaultCalendarWidgetTranslation.settings?.description ??
      'Control whether household-wide events are included in the seven-day calendar view.',
    defaults: normalizeCalendarSettings({}),
    fields: [
      {
        key: 'includeHouseholdEvents',
        label:
          defaultCalendarWidgetTranslation.settings?.fields.includeHouseholdEvents.label ??
          'Include household-wide events',
        type: 'boolean',
      },
    ],
    normalize: normalizeCalendarSettings,
  },
  loadData: async (context) => {
    const agendaItems = await fetchCalendarEvents()

    return filterCalendarAgendaItems(
      agendaItems,
      context.focusedMemberId,
      context.settings,
    )
  },
  renderDetailView: ({ data, languageCode }) =>
    createElement(CalendarDetailView, {
      data,
      languageCode,
      widgetText: getCalendarWidgetTranslation(languageCode),
    }),
}

export const widgetModule = calendarWidget
export { getCalendarWidgetTranslation } from './translations'
export type { CalendarWidgetTranslation } from './translations'
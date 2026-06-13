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
  capabilities: ['read'],
  hasSettingsPanel: true,
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
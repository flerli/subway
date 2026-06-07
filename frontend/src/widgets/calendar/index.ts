import { fetchCalendarEvents } from './calendarApi'
import type { AgendaItem } from '../widgetHostModels'
import type { WidgetMicroAppContract } from '../widgetTypes'

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

const normalizeCalendarSettings = (value: unknown) => {
  const candidate = value as {
    maxItems?: unknown
    includeHouseholdEvents?: unknown
  }

  return {
    maxItems:
      typeof candidate?.maxItems === 'number' && candidate.maxItems > 0
        ? Math.min(candidate.maxItems, 10)
        : 4,
    includeHouseholdEvents:
      typeof candidate?.includeHouseholdEvents === 'boolean'
        ? candidate.includeHouseholdEvents
        : true,
  }
}

export const calendarWidget: WidgetMicroAppContract = {
  entityId: 'calendar',
  folderName: 'calendar',
  dataSource: 'database',
  capabilities: ['read'],
  hasSettingsPanel: true,
  settingsDefinition: {
    title: 'Calendar widget settings',
    description:
      'Control how many events the calendar shows and whether household-wide events are included.',
    defaults: normalizeCalendarSettings({}),
    fields: [
      {
        key: 'maxItems',
        label: 'Max visible items',
        type: 'number',
        min: 1,
        max: 10,
        step: 1,
      },
      {
        key: 'includeHouseholdEvents',
        label: 'Include household-wide events',
        type: 'boolean',
      },
    ],
    normalize: normalizeCalendarSettings,
  },
  loadData: async (context) => {
    const agendaItems = await fetchCalendarEvents()
    const settings = normalizeCalendarSettings(context.settings)

    return agendaItems
      .filter((agendaItem) =>
        matchesFocusedMember(agendaItem, context.focusedMemberId),
      )
      .filter((agendaItem) =>
        settings.includeHouseholdEvents
          ? true
          : !agendaItem.members.includes(ALL_MEMBERS_AUDIENCE),
      )
      .slice(0, settings.maxItems)
  },
}

export const widgetModule = calendarWidget
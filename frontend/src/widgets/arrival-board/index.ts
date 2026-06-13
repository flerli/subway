import type { WidgetMicroAppContract } from '../widgetTypes'
import {
  getArrivalBoardWidgetTranslation,
  matchesArrivalBoardWidgetTitle,
} from './translations'

const defaultArrivalBoardWidgetTranslation = getArrivalBoardWidgetTranslation('en')

export const defaultArrivalBoardSettings = {
  boardTitle: 'Home Info Kiosk',
  boardSubheading: 'Family Avenue South',
}

export const normalizeArrivalBoardSettings = (value: unknown) => {
  const candidate = value as {
    boardTitle?: unknown
    boardSubheading?: unknown
  }

  return {
    boardTitle:
      typeof candidate?.boardTitle === 'string'
        ? candidate.boardTitle.slice(0, 40)
        : defaultArrivalBoardSettings.boardTitle,
    boardSubheading:
      typeof candidate?.boardSubheading === 'string'
        ? candidate.boardSubheading.slice(0, 40)
        : defaultArrivalBoardSettings.boardSubheading,
  }
}

export const arrivalBoardWidget: WidgetMicroAppContract = {
  entityId: 'arrival-board',
  folderName: 'arrival-board',
  dataSource: 'system',
  capabilities: ['read'],
  hasSettingsPanel: true,
  getTranslation: getArrivalBoardWidgetTranslation,
  matchesDefaultTitle: matchesArrivalBoardWidgetTitle,
  settingsDefinition: {
    title: defaultArrivalBoardWidgetTranslation.settings?.title ?? 'Board chrome settings',
    description:
      defaultArrivalBoardWidgetTranslation.settings?.description ??
      'Configure the title and subheading used in the top board header.',
    defaults: defaultArrivalBoardSettings,
    fields: [
      {
        key: 'boardTitle',
        label:
          defaultArrivalBoardWidgetTranslation.settings?.fields.boardTitle.label ??
          'Board title',
        type: 'text',
        placeholder:
          defaultArrivalBoardWidgetTranslation.settings?.fields.boardTitle.placeholder ??
          'Home Info Kiosk',
      },
      {
        key: 'boardSubheading',
        label:
          defaultArrivalBoardWidgetTranslation.settings?.fields.boardSubheading.label ??
          'Board subheading',
        type: 'text',
        placeholder:
          defaultArrivalBoardWidgetTranslation.settings?.fields.boardSubheading
            .placeholder ?? 'Family Avenue South',
      },
    ],
    normalize: normalizeArrivalBoardSettings,
  },
  loadData: () => null,
}

export const widgetModule = arrivalBoardWidget
import type { WidgetMicroAppContract } from '../widgetTypes'

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
  settingsDefinition: {
    title: 'Board chrome settings',
    description: 'Configure the title and subheading used in the top board header.',
    defaults: defaultArrivalBoardSettings,
    fields: [
      {
        key: 'boardTitle',
        label: 'Board title',
        type: 'text',
        placeholder: 'Home Info Kiosk',
      },
      {
        key: 'boardSubheading',
        label: 'Board subheading',
        type: 'text',
        placeholder: 'Family Avenue South',
      },
    ],
    normalize: normalizeArrivalBoardSettings,
  },
  loadData: () => null,
}

export const widgetModule = arrivalBoardWidget
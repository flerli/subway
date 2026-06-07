import type { WidgetMicroAppContract } from '../widgetTypes'

export const arrivalBoardWidget: WidgetMicroAppContract = {
  entityId: 'arrival-board',
  folderName: 'arrival-board',
  dataSource: 'system',
  capabilities: ['read'],
  hasSettingsPanel: false,
  loadData: () => null,
}

export const widgetModule = arrivalBoardWidget
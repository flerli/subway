import type { WidgetMicroAppContract } from '../widgetTypes'

export const bulletinsWidget: WidgetMicroAppContract = {
  entityId: 'bulletins',
  folderName: 'bulletins',
  dataSource: 'database',
  capabilities: ['read'],
  hasSettingsPanel: false,
  loadData: () => null,
}

export const widgetModule = bulletinsWidget
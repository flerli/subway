import type { WidgetMicroAppContract } from '../widgetTypes'

export const calibrationWidget: WidgetMicroAppContract = {
  entityId: 'calibration',
  folderName: 'calibration',
  dataSource: 'system',
  capabilities: ['read'],
  hasSettingsPanel: false,
  loadData: () => null,
}

export const widgetModule = calibrationWidget
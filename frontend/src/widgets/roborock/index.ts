import { createElement } from 'react'
import type { WidgetMicroAppContract } from '../widgetTypes'
import { RoborockSettingsPanel } from './RoborockSettingsPanel'
import {
  getRoborockWidgetTranslation,
  matchesRoborockWidgetTitle,
} from './translations'

export const roborockWidget: WidgetMicroAppContract = {
  entityId: 'roborock',
  folderName: 'roborock',
  dataSource: 'external-api',
  capabilities: ['read'],
  hasSettingsPanel: true,
  getTranslation: getRoborockWidgetTranslation,
  matchesDefaultTitle: matchesRoborockWidgetTitle,
  loadData: async () => null,
  renderSettingsPanel: ({ widget, languageCode }) =>
    createElement(RoborockSettingsPanel, {
      widget,
      languageCode,
      widgetText: getRoborockWidgetTranslation(languageCode),
    }),
}

export const widgetModule = roborockWidget
export { getRoborockWidgetTranslation } from './translations'
export type { RoborockWidgetTranslation } from './translations'
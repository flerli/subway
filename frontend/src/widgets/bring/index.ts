import { createElement } from 'react'
import type { WidgetMicroAppContract } from '../widgetTypes'
import { BringDetailView, type BringDetailViewData } from './BringDetailView'
import { BringSettingsPanel } from './BringSettingsPanel'
import {
  getBringWidgetTranslation,
  matchesBringWidgetTitle,
} from './translations'

export const bringWidget: WidgetMicroAppContract = {
  entityId: 'bring',
  folderName: 'bring',
  dataSource: 'external-api',
  capabilities: ['read', 'write'],
  hasSettingsPanel: true,
  getTranslation: getBringWidgetTranslation,
  matchesDefaultTitle: matchesBringWidgetTitle,
  loadData: async () => null,
  renderSettingsPanel: ({ widget, languageCode, initialSettings, onSave }) =>
    createElement(BringSettingsPanel, {
      widget,
      languageCode,
      initialSettings,
      onSave,
      widgetText: getBringWidgetTranslation(languageCode),
    }),
  renderDetailView: ({ data, languageCode }) =>
    createElement(BringDetailView, {
      data: data as BringDetailViewData,
      languageCode,
      widgetText: getBringWidgetTranslation(languageCode),
    }),
}

export const widgetModule = bringWidget
export { getBringWidgetTranslation } from './translations'
export type { BringWidgetTranslation } from './translations'
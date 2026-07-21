import { createElement } from 'react'
import type { WidgetMicroAppContract } from '../widgetTypes'
import { AssistantDetailPanel, type AssistantDetailViewData } from './AssistantDetailPanel'
import { AssistantSettingsPanel } from './AssistantSettingsPanel'
import {
  getAssistantWidgetTranslation,
  matchesAssistantWidgetTitle,
} from './translations'

export const assistantWidget: WidgetMicroAppContract = {
  entityId: 'assistant',
  folderName: 'assistant',
  dataSource: 'system',
  capabilities: ['read', 'write'],
  hasSettingsPanel: true,
  getTranslation: getAssistantWidgetTranslation,
  matchesDefaultTitle: matchesAssistantWidgetTitle,
  loadData: async () => null,
  renderSettingsPanel: ({ appText, widget, languageCode }) =>
    createElement(AssistantSettingsPanel, {
      appText,
      widget,
      languageCode,
      widgetText: getAssistantWidgetTranslation(languageCode),
    }),
  renderDetailView: ({ appText, data, languageCode }) =>
    createElement(AssistantDetailPanel, {
      data: {
        ...(data as AssistantDetailViewData),
        appText,
      },
      languageCode,
    }),
}

export const widgetModule = assistantWidget
export { getAssistantWidgetTranslation } from './translations'
export type { AssistantWidgetTranslation } from './translations'
export type { AssistantDetailViewData } from './AssistantDetailPanel'
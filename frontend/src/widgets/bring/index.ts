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
  mcpTools: [
    {
      name: 'widget.bring.get_widget_state',
      description:
        'Get the current Bring settings and the selected list state with cache fallback metadata.',
      humanAction:
        'Read the Bring widget state in settings or in the detail view.',
      parityScope: ['read'],
      approvalRequired: false,
      redactArguments: false,
      redactResults: false,
      arguments: [],
    },
    {
      name: 'widget.bring.load_available_lists',
      description:
        'Load available Bring lists for the configured or provided account credentials.',
      humanAction:
        'Load Bring lists from the Bring settings panel before saving a selected list.',
      parityScope: ['read'],
      approvalRequired: true,
      redactArguments: true,
      redactResults: false,
      arguments: [
        { key: 'username', type: 'string', description: 'Bring account username.', required: false },
        { key: 'password', type: 'string', description: 'Bring account password.', required: false },
      ],
    },
    {
      name: 'widget.bring.update_widget_settings',
      description:
        'Update the Bring account settings and selected list for this user.',
      humanAction:
        'Save the Bring settings panel including account credentials and selected list.',
      parityScope: ['write'],
      approvalRequired: true,
      redactArguments: true,
      redactResults: false,
      arguments: [
        { key: 'username', type: 'string', description: 'Bring account username.', required: false },
        { key: 'password', type: 'string', description: 'Bring account password.', required: false },
        { key: 'selectedListUuid', type: 'string', description: 'Selected Bring list uuid.', required: false },
      ],
    },
    {
      name: 'widget.bring.refresh_selected_list',
      description:
        'Refresh the currently selected Bring list from the upstream service.',
      humanAction:
        'Refresh the Bring detail view.',
      parityScope: ['read'],
      approvalRequired: false,
      redactArguments: false,
      redactResults: false,
      arguments: [],
    },
    {
      name: 'widget.bring.add_item',
      description:
        'Add an item to the selected Bring list.',
      humanAction:
        'Add an item from the Bring detail view.',
      parityScope: ['write'],
      approvalRequired: false,
      redactArguments: false,
      redactResults: false,
      arguments: [
        { key: 'itemName', type: 'string', description: 'Bring item name.', required: true },
        { key: 'specification', type: 'string', description: 'Optional Bring item specification.', required: false },
      ],
    },
    {
      name: 'widget.bring.complete_item',
      description:
        'Complete an open item on the selected Bring list.',
      humanAction:
        'Mark an open Bring item as completed.',
      parityScope: ['write'],
      approvalRequired: false,
      redactArguments: false,
      redactResults: false,
      arguments: [
        { key: 'itemName', type: 'string', description: 'Bring item name.', required: true },
        { key: 'specification', type: 'string', description: 'Optional Bring item specification.', required: false },
        { key: 'itemUuid', type: 'string', description: 'Optional Bring item uuid.', required: false },
      ],
    },
    {
      name: 'widget.bring.reopen_recent_item',
      description:
        'Reopen a recent Bring item by re-adding it to the selected list.',
      humanAction:
        'Reopen a recent Bring item from the recent items section.',
      parityScope: ['write'],
      approvalRequired: false,
      redactArguments: false,
      redactResults: false,
      arguments: [
        { key: 'itemName', type: 'string', description: 'Bring item name.', required: true },
        { key: 'specification', type: 'string', description: 'Optional Bring item specification.', required: false },
      ],
    },
  ],
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
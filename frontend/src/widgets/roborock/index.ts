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
  capabilities: ['read', 'write'],
  hasSettingsPanel: true,
  mcpTools: [
    {
      name: 'widget.roborock.get_widget_state',
      description:
        'Get the current Roborock settings state for this user.',
      humanAction:
        'Read the Roborock settings panel state.',
      parityScope: ['read'],
      approvalRequired: false,
      redactArguments: false,
      redactResults: false,
      arguments: [],
    },
    {
      name: 'widget.roborock.request_login_code',
      description:
        'Request a Roborock verification code for an email address.',
      humanAction:
        'Request the Roborock email verification code from the settings panel.',
      parityScope: ['write'],
      approvalRequired: true,
      redactArguments: true,
      redactResults: false,
      arguments: [
        { key: 'email', type: 'string', description: 'Roborock account email address.', required: true },
      ],
    },
    {
      name: 'widget.roborock.create_session',
      description:
        'Create and store a Roborock session using the account email and verification code.',
      humanAction:
        'Save a Roborock session from the settings panel after entering the verification code.',
      parityScope: ['write'],
      approvalRequired: true,
      redactArguments: true,
      redactResults: false,
      arguments: [
        { key: 'email', type: 'string', description: 'Roborock account email address.', required: true },
        { key: 'verificationCode', type: 'string', description: 'Verification code received by email.', required: true },
      ],
    },
    {
      name: 'widget.roborock.load_devices',
      description:
        'Load available Roborock devices and routines for the stored session.',
      humanAction:
        'Load Roborock devices and routines from the settings panel.',
      parityScope: ['read'],
      approvalRequired: false,
      redactArguments: false,
      redactResults: false,
      arguments: [
        { key: 'selectedDeviceDuid', type: 'string', description: 'Optional device id to resolve routine choices for.', required: false },
      ],
    },
    {
      name: 'widget.roborock.update_selection',
      description:
        'Update the selected Roborock device and optional default routine.',
      humanAction:
        'Save the selected Roborock device and routine from the settings panel.',
      parityScope: ['write'],
      approvalRequired: false,
      redactArguments: false,
      redactResults: false,
      arguments: [
        { key: 'selectedDeviceDuid', type: 'string', description: 'Selected Roborock device id.', required: true },
        { key: 'selectedRoutineId', type: 'number', description: 'Optional selected routine id.', required: false },
      ],
    },
    {
      name: 'widget.roborock.validate_session',
      description:
        'Validate the stored Roborock session and refresh connection state.',
      humanAction:
        'Validate the stored Roborock session from the settings panel.',
      parityScope: ['read'],
      approvalRequired: false,
      redactArguments: false,
      redactResults: false,
      arguments: [],
    },
  ],
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
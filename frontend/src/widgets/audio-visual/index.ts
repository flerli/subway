import type { WidgetMicroAppContract } from '../widgetTypes'
import {
  getAudioVisualWidgetTranslation,
  matchesAudioVisualWidgetTitle,
} from './translations'
import { normalizeAudioVisualSettings } from './AudioVisualPanel'

const defaultAudioVisualWidgetTranslation = getAudioVisualWidgetTranslation('en')

export const audioVisualWidget: WidgetMicroAppContract = {
  entityId: 'audio-visual',
  folderName: 'audio-visual',
  dataSource: 'system',
  capabilities: ['read', 'write'],
  hasSettingsPanel: true,
  getTranslation: getAudioVisualWidgetTranslation,
  matchesDefaultTitle: matchesAudioVisualWidgetTitle,
  settingsDefinition: {
    title: defaultAudioVisualWidgetTranslation.title,
    description: defaultAudioVisualWidgetTranslation.copy.permissionCopy,
    defaults: normalizeAudioVisualSettings({}),
    fields: [
      {
        key: 'cameraEnabled',
        label: defaultAudioVisualWidgetTranslation.copy.cameraOn,
        type: 'boolean',
      },
      {
        key: 'microphoneEnabled',
        label: defaultAudioVisualWidgetTranslation.copy.microphoneOn,
        type: 'boolean',
      },
    ],
    normalize: normalizeAudioVisualSettings,
  },
  loadData: async () => null,
}

export const widgetModule = audioVisualWidget
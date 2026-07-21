import { createElement } from 'react'
import { YoutubeDetailView, type YoutubeDetailData } from './YoutubeDetailView'
import type { WidgetMicroAppContract } from '../widgetTypes'
import {
  getYoutubeWidgetTranslation,
  matchesYoutubeWidgetTitle,
} from './translations'

const defaultYoutubeWidgetTranslation = getYoutubeWidgetTranslation('en')

interface NormalizedYoutubeSettings {
  autoPlay: boolean
  [key: string]: unknown
}

const normalizeYoutubeSettings = (value: unknown): NormalizedYoutubeSettings => {
  const candidate = value as {
    autoPlay?: unknown
    [key: string]: unknown
  }

  return {
    autoPlay:
      typeof candidate?.autoPlay === 'boolean'
        ? candidate.autoPlay
        : false,
  }
}

export const youtubeWidget: WidgetMicroAppContract = {
  entityId: 'youtube',
  folderName: 'youtube',
  dataSource: 'external-api',
  capabilities: ['read', 'write'],
  hasSettingsPanel: true,
  mcpTools: [
    {
      name: 'widget.youtube.get_widget_state',
      description:
        'Get the saved YouTube widget settings that control playback behavior.',
      humanAction:
        'Read the saved YouTube widget settings from the settings panel.',
      parityScope: ['read'],
      approvalRequired: false,
      redactArguments: false,
      redactResults: false,
      arguments: [],
    },
    {
      name: 'widget.youtube.search_videos',
      description:
        'Search YouTube videos and optionally choose one result by index or video id.',
      humanAction:
        'Search YouTube content and select a result to open in the player.',
      parityScope: ['read'],
      approvalRequired: false,
      redactArguments: false,
      redactResults: false,
      arguments: [
        {
          key: 'query',
          type: 'string',
          description: 'Search query for YouTube videos.',
          required: true,
        },
        {
          key: 'selectedIndex',
          type: 'number',
          description: 'Optional zero-based result index to select.',
          required: false,
        },
        {
          key: 'selectedVideoId',
          type: 'string',
          description: 'Optional YouTube video id to select from the returned results.',
          required: false,
        },
      ],
    },
    {
      name: 'widget.youtube.update_widget_settings',
      description:
        'Update the saved YouTube widget playback settings.',
      humanAction:
        'Save the YouTube widget auto-play setting in the widget settings panel.',
      parityScope: ['write'],
      approvalRequired: false,
      redactArguments: false,
      redactResults: false,
      arguments: [
        {
          key: 'autoPlay',
          type: 'boolean',
          description: 'Whether the YouTube widget should auto-play selected videos.',
          required: false,
        },
      ],
    },
  ],
  getTranslation: getYoutubeWidgetTranslation,
  matchesDefaultTitle: matchesYoutubeWidgetTitle,
  settingsDefinition: {
    title:
      defaultYoutubeWidgetTranslation.settings?.title ?? 'YouTube widget settings',
    description:
      defaultYoutubeWidgetTranslation.settings?.description ??
      'Configure YouTube search and player settings.',
    defaults: normalizeYoutubeSettings({}),
    fields: [
      {
        key: 'autoPlay',
        label:
          defaultYoutubeWidgetTranslation.settings?.fields.autoPlay.label ??
          'Auto-play videos',
        type: 'boolean',
      },
    ],
    normalize: normalizeYoutubeSettings,
  },
  loadData: async () => {
    return {
      videos: [],
      query: '',
      autoPlay: false,
      currentVideoId: null,
    }
  },
  renderDetailView: ({ data, languageCode }) =>
    createElement(YoutubeDetailView, {
      data: data as YoutubeDetailData,
      languageCode,
      widgetText: getYoutubeWidgetTranslation(languageCode),
    }),
}

export const widgetModule = youtubeWidget
export { normalizeYoutubeSettings }

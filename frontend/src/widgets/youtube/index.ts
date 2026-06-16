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
  capabilities: ['read'],
  hasSettingsPanel: true,
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

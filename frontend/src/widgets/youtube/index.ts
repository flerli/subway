import { createElement } from 'react'
import { searchYoutubeVideos } from './youtubeApi'
import { YoutubeDetailView } from './YoutubeDetailView'
import type { WidgetMicroAppContract } from '../widgetTypes'
import {
  getYoutubeWidgetTranslation,
  matchesYoutubeWidgetTitle,
} from './translations'

const defaultYoutubeWidgetTranslation = getYoutubeWidgetTranslation('en')

interface NormalizedYoutubeSettings {
  defaultQuery: string
  autoPlay: boolean
  [key: string]: unknown
}

const normalizeYoutubeSettings = (value: unknown): NormalizedYoutubeSettings => {
  const candidate = value as {
    defaultQuery?: unknown
    autoPlay?: unknown
    [key: string]: unknown
  }

  return {
    defaultQuery:
      typeof candidate?.defaultQuery === 'string'
        ? candidate.defaultQuery.trim().slice(0, 100)
        : 'music',
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
        key: 'defaultQuery',
        label:
          defaultYoutubeWidgetTranslation.settings?.fields.defaultQuery.label ??
          'Default search query',
        type: 'text',
        placeholder:
          defaultYoutubeWidgetTranslation.settings?.fields.defaultQuery
            .placeholder ?? 'e.g., music, tutorials',
      },
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
  loadData: async (context) => {
    const settings = normalizeYoutubeSettings(context.settings)

    try {
      const results = await searchYoutubeVideos(settings.defaultQuery)

      return {
        videos: results.videos,
        query: results.query,
        autoPlay: settings.autoPlay,
        currentVideoId: results.videos[0]?.id ?? null,
      }
    } catch (error) {
      console.error('Failed to load YouTube data:', error)
      return {
        videos: [],
        query: settings.defaultQuery,
        autoPlay: false,
        currentVideoId: null,
      }
    }
  },
  renderDetailView: ({ data, languageCode }) =>
    createElement(YoutubeDetailView, {
      data,
      languageCode,
      widgetText: getYoutubeWidgetTranslation(languageCode),
    }),
}

export const widgetModule = youtubeWidget
export { normalizeYoutubeSettings }

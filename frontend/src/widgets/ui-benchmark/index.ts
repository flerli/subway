import type { WidgetMicroAppContract } from '../widgetTypes'
import {
  getUiBenchmarkWidgetTranslation,
  matchesUiBenchmarkWidgetTitle,
} from './translations'

const defaultUiBenchmarkTranslation = getUiBenchmarkWidgetTranslation('en')

interface NormalizedUiBenchmarkSettings {
  defaultLoadTarget: number
  defaultAnimationsEnabled: boolean
  defaultHeavyPaintEnabled: boolean
  defaultLiveLoopEnabled: boolean
  [key: string]: unknown
}

export const normalizeUiBenchmarkSettings = (
  value: unknown,
): NormalizedUiBenchmarkSettings => {
  const candidate = value as {
    defaultLoadTarget?: unknown
    defaultAnimationsEnabled?: unknown
    defaultHeavyPaintEnabled?: unknown
    defaultLiveLoopEnabled?: unknown
  }

  return {
    defaultLoadTarget:
      typeof candidate?.defaultLoadTarget === 'number' &&
      Number.isFinite(candidate.defaultLoadTarget)
        ? Math.min(Math.max(Math.round(candidate.defaultLoadTarget), 10), 100)
        : 50,
    defaultAnimationsEnabled:
      typeof candidate?.defaultAnimationsEnabled === 'boolean'
        ? candidate.defaultAnimationsEnabled
        : true,
    defaultHeavyPaintEnabled:
      typeof candidate?.defaultHeavyPaintEnabled === 'boolean'
        ? candidate.defaultHeavyPaintEnabled
        : false,
    defaultLiveLoopEnabled:
      typeof candidate?.defaultLiveLoopEnabled === 'boolean'
        ? candidate.defaultLiveLoopEnabled
        : false,
  }
}

export const uiBenchmarkWidget: WidgetMicroAppContract = {
  entityId: 'ui-benchmark',
  folderName: 'ui-benchmark',
  dataSource: 'system',
  capabilities: ['read'],
  hasSettingsPanel: true,
  getTranslation: getUiBenchmarkWidgetTranslation,
  matchesDefaultTitle: matchesUiBenchmarkWidgetTitle,
  settingsDefinition: {
    title:
      defaultUiBenchmarkTranslation.settings?.title ??
      'UI benchmark settings',
    description:
      defaultUiBenchmarkTranslation.settings?.description ??
      'Tune the benchmark defaults used when this widget starts.',
    defaults: normalizeUiBenchmarkSettings({}),
    fields: [
      {
        key: 'defaultLoadTarget',
        label:
          defaultUiBenchmarkTranslation.settings?.fields.defaultLoadTarget
            .label ?? 'Default load target',
        type: 'number',
        min: 10,
        max: 100,
        step: 5,
      },
      {
        key: 'defaultAnimationsEnabled',
        label:
          defaultUiBenchmarkTranslation.settings?.fields
            .defaultAnimationsEnabled.label ?? 'Animate probe by default',
        type: 'boolean',
      },
      {
        key: 'defaultHeavyPaintEnabled',
        label:
          defaultUiBenchmarkTranslation.settings?.fields
            .defaultHeavyPaintEnabled.label ??
          'Enable heavy paint pass by default',
        type: 'boolean',
      },
      {
        key: 'defaultLiveLoopEnabled',
        label:
          defaultUiBenchmarkTranslation.settings?.fields
            .defaultLiveLoopEnabled.label ??
          'Enable live updates by default',
        type: 'boolean',
      },
    ],
    normalize: normalizeUiBenchmarkSettings,
  },
  loadData: () => ({
    status: 'ready',
  }),
}

export const widgetModule = uiBenchmarkWidget
export { getUiBenchmarkWidgetTranslation } from './translations'
export type { UiBenchmarkWidgetTranslation } from './translations'

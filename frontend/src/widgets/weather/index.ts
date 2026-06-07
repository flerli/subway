import { fetchWeatherWidgetData } from './weatherApi'
import type { WidgetMicroAppContract } from '../widgetTypes'

const normalizeWeatherSettings = (value: unknown) => {
  const candidate = value as {
    locationLabel?: unknown
    latitude?: unknown
    longitude?: unknown
  }

  return {
    locationLabel:
      typeof candidate?.locationLabel === 'string' &&
      candidate.locationLabel.trim().length > 0
        ? candidate.locationLabel.trim().slice(0, 40)
        : 'Berlin',
    latitude:
      typeof candidate?.latitude === 'number' && Number.isFinite(candidate.latitude)
        ? candidate.latitude
        : 52.52,
    longitude:
      typeof candidate?.longitude === 'number' && Number.isFinite(candidate.longitude)
        ? candidate.longitude
        : 13.405,
  }
}

export const weatherWidget: WidgetMicroAppContract = {
  entityId: 'weather',
  folderName: 'weather',
  dataSource: 'external-api',
  capabilities: ['read'],
  hasSettingsPanel: true,
  settingsDefinition: {
    title: 'Weather widget settings',
    description: 'Configure the live weather location used by the widget.',
    defaults: normalizeWeatherSettings({}),
    fields: [
      {
        key: 'locationLabel',
        label: 'Location label',
        type: 'text',
        placeholder: 'Berlin',
      },
      {
        key: 'latitude',
        label: 'Latitude',
        type: 'number',
        min: -90,
        max: 90,
        step: 0.001,
      },
      {
        key: 'longitude',
        label: 'Longitude',
        type: 'number',
        min: -180,
        max: 180,
        step: 0.001,
      },
    ],
    normalize: normalizeWeatherSettings,
  },
  loadData: async (context) => {
    const settings = normalizeWeatherSettings(context.settings)

    return fetchWeatherWidgetData(settings)
  },
}

export const widgetModule = weatherWidget
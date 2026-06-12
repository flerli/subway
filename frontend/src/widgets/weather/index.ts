import { createElement } from 'react'
import { fetchWeatherWidgetData } from './weatherApi'
import { WeatherDetailView } from './WeatherDetailView'
import type { WidgetMicroAppContract } from '../widgetTypes'

const WEATHER_LOCATION_SLOT_COUNT = 5
const DEFAULT_FOCUS_LOCATION_SLOT = 1
const DEFAULT_REFRESH_INTERVAL_MINUTES = 10

interface WeatherLocationSetting {
  id: string
  label: string
  latitude: number
  longitude: number
}

interface NormalizedWeatherSettings {
  focusLocationSlot: number
  refreshIntervalMinutes: number
  locations: WeatherLocationSetting[]
  [key: string]: unknown
}

const DEFAULT_PRIMARY_LOCATION = {
  id: 'location-1',
  label: 'Berlin',
  latitude: 52.52,
  longitude: 13.405,
}

const createEmptyLocationSlot = (index: number): WeatherLocationSetting => ({
  id: `location-${index + 1}`,
  label: '',
  latitude: 0,
  longitude: 0,
})

const isValidLocation = (location: {
  label: string
  latitude: number
  longitude: number
}) =>
  location.label.trim().length > 0 &&
  Number.isFinite(location.latitude) &&
  Number.isFinite(location.longitude) &&
  location.latitude >= -90 &&
  location.latitude <= 90 &&
  location.longitude >= -180 &&
  location.longitude <= 180

const normalizeWeatherSettings = (value: unknown): NormalizedWeatherSettings => {
  const candidate = value as {
    focusLocationSlot?: unknown
    locations?: unknown
    locationLabel?: unknown
    latitude?: unknown
    longitude?: unknown
    [key: string]: unknown
  }

  const slots = Array.from({ length: WEATHER_LOCATION_SLOT_COUNT }, (_, index) =>
    createEmptyLocationSlot(index),
  )

  const structuredLocations = Array.isArray(candidate?.locations)
    ? candidate.locations
        .map((location, index) => {
          const locationCandidate = location as {
            id?: unknown
            label?: unknown
            latitude?: unknown
            longitude?: unknown
          }

          return {
            id:
              typeof locationCandidate?.id === 'string'
                ? locationCandidate.id
                : `location-${index + 1}`,
            label:
              typeof locationCandidate?.label === 'string'
                ? locationCandidate.label.trim().slice(0, 40)
                : '',
            latitude:
              typeof locationCandidate?.latitude === 'number' &&
              Number.isFinite(locationCandidate.latitude)
                ? locationCandidate.latitude
                : 0,
            longitude:
              typeof locationCandidate?.longitude === 'number' &&
              Number.isFinite(locationCandidate.longitude)
                ? locationCandidate.longitude
                : 0,
          }
        })
        .slice(0, WEATHER_LOCATION_SLOT_COUNT)
    : []

  const legacyLocation = {
    id: DEFAULT_PRIMARY_LOCATION.id,
    label:
      typeof candidate?.locationLabel === 'string' &&
      candidate.locationLabel.trim().length > 0
        ? candidate.locationLabel.trim().slice(0, 40)
        : DEFAULT_PRIMARY_LOCATION.label,
    latitude:
      typeof candidate?.latitude === 'number' && Number.isFinite(candidate.latitude)
        ? candidate.latitude
        : DEFAULT_PRIMARY_LOCATION.latitude,
    longitude:
      typeof candidate?.longitude === 'number' && Number.isFinite(candidate.longitude)
        ? candidate.longitude
        : DEFAULT_PRIMARY_LOCATION.longitude,
  }

  const configuredLocations =
    structuredLocations.length > 0 ? structuredLocations : [legacyLocation]

  configuredLocations.forEach((location, index) => {
    if (index < slots.length) {
      slots[index] = {
        id: location.id,
        label: location.label,
        latitude: location.latitude,
        longitude: location.longitude,
      }
    }
  })

  for (let index = 0; index < slots.length; index += 1) {
    const labelKey = `location${index + 1}Label`
    const latitudeKey = `location${index + 1}Latitude`
    const longitudeKey = `location${index + 1}Longitude`

    if (typeof candidate?.[labelKey] === 'string') {
      slots[index].label = candidate[labelKey].trim().slice(0, 40)
    }

    if (
      typeof candidate?.[latitudeKey] === 'number' &&
      Number.isFinite(candidate[latitudeKey])
    ) {
      slots[index].latitude = candidate[latitudeKey]
    }

    if (
      typeof candidate?.[longitudeKey] === 'number' &&
      Number.isFinite(candidate[longitudeKey])
    ) {
      slots[index].longitude = candidate[longitudeKey]
    }
  }

  const normalizedLocations = slots.filter(isValidLocation)
  const locations =
    normalizedLocations.length > 0 ? normalizedLocations : [DEFAULT_PRIMARY_LOCATION]

  const requestedFocusLocationSlot =
    typeof candidate?.focusLocationSlot === 'number' &&
    Number.isFinite(candidate.focusLocationSlot)
      ? Math.min(
          Math.max(Math.round(candidate.focusLocationSlot), 1),
          WEATHER_LOCATION_SLOT_COUNT,
        )
      : DEFAULT_FOCUS_LOCATION_SLOT

  const focusLocationSlot = locations.some(
    (location) => location.id === `location-${requestedFocusLocationSlot}`,
  )
    ? requestedFocusLocationSlot
    : Number.parseInt(locations[0].id.replace('location-', ''), 10) ||
      DEFAULT_FOCUS_LOCATION_SLOT

  const refreshIntervalMinutes =
    typeof candidate?.refreshIntervalMinutes === 'number' &&
    Number.isFinite(candidate.refreshIntervalMinutes)
      ? Math.min(
          Math.max(Math.round(candidate.refreshIntervalMinutes), 1),
          120,
        )
      : DEFAULT_REFRESH_INTERVAL_MINUTES

  return {
    focusLocationSlot,
    refreshIntervalMinutes,
    locations,
    ...Object.fromEntries(
      slots.flatMap((location, index) => [
        [`location${index + 1}Label`, location.label],
        [`location${index + 1}Latitude`, location.latitude],
        [`location${index + 1}Longitude`, location.longitude],
      ]),
    ),
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
    description: 'Configure up to five weather locations and choose the compact focus location.',
    defaults: normalizeWeatherSettings({}),
    fields: [
      {
        key: 'focusLocationSlot',
        label: 'Focus location slot',
        type: 'number',
        min: 1,
        max: WEATHER_LOCATION_SLOT_COUNT,
        step: 1,
      },
      {
        key: 'refreshIntervalMinutes',
        label: 'Refresh interval minutes',
        type: 'number',
        min: 1,
        max: 120,
        step: 1,
      },
      ...Array.from({ length: WEATHER_LOCATION_SLOT_COUNT }, (_, index) => [
        {
          key: `location${index + 1}Label`,
          label: `Location ${index + 1} label`,
          type: 'text' as const,
          placeholder: index === 0 ? 'Berlin' : `Location ${index + 1}`,
        },
        {
          key: `location${index + 1}Latitude`,
          label: `Location ${index + 1} latitude`,
          type: 'number' as const,
          min: -90,
          max: 90,
          step: 0.001,
        },
        {
          key: `location${index + 1}Longitude`,
          label: `Location ${index + 1} longitude`,
          type: 'number' as const,
          min: -180,
          max: 180,
          step: 0.001,
        },
      ]).flat(),
    ],
    normalize: normalizeWeatherSettings,
  },
  loadData: async (context) => {
    const settings = normalizeWeatherSettings(context.settings)

    return fetchWeatherWidgetData({
      focusLocationId: `location-${settings.focusLocationSlot}`,
      locations: settings.locations.map((location: WeatherLocationSetting) => ({
        id: location.id,
        label: location.label,
        latitude: location.latitude,
        longitude: location.longitude,
      })),
    })
  },
  renderDetailView: ({ data }) => createElement(WeatherDetailView, { data }),
}

export const widgetModule = weatherWidget
export { normalizeWeatherSettings }
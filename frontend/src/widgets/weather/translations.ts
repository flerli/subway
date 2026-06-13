import {
  formatLocalizedText,
  type SupportedLanguageCode,
} from '../../i18n/localization'
import type { WidgetTranslationDefinition } from '../widgetTypes'
import {
  createDefaultWidgetTitleMatcher,
  createWidgetTranslationCatalog,
  getWidgetTranslationFromCatalog,
} from '../widgetLocalization'

export interface WeatherWidgetTranslation extends WidgetTranslationDefinition {
  copy: {
    statusCached: string
    statusLive: string
    updatedPrefix: string
    schedulingNextUpdate: string
    refreshingNow: string
    nextUpdateIn: string
    unavailableCondition: string
    noLiveDataSummary: string
  }
}

const buildWeatherFieldTexts = (templates: {
  locationLabel: string
  locationPlaceholder: string
  latitudeLabel: string
  longitudeLabel: string
}) =>
  Object.fromEntries(
    Array.from({ length: 5 }, (_, index) => {
      const slotNumber = index + 1

      return [
        [
          `location${slotNumber}Label`,
          {
            label: formatLocalizedText(templates.locationLabel, { number: slotNumber }),
            placeholder:
              slotNumber === 1
                ? 'Berlin'
                : formatLocalizedText(templates.locationPlaceholder, {
                    number: slotNumber,
                  }),
          },
        ],
        [
          `location${slotNumber}Latitude`,
          {
            label: formatLocalizedText(templates.latitudeLabel, { number: slotNumber }),
          },
        ],
        [
          `location${slotNumber}Longitude`,
          {
            label: formatLocalizedText(templates.longitudeLabel, { number: slotNumber }),
          },
        ],
      ]
    }).flat(),
  )

const weatherWidgetTranslationCatalog = createWidgetTranslationCatalog<WeatherWidgetTranslation>({
  en: {
    title: 'Weather',
    boardKicker: 'Forecast',
    copy: {
      statusCached: 'cached',
      statusLive: 'live',
      updatedPrefix: 'Updated',
      schedulingNextUpdate: 'Scheduling next update',
      refreshingNow: 'Refreshing now',
      nextUpdateIn: 'Next update in {time}',
      unavailableCondition: 'Weather unavailable',
      noLiveDataSummary: 'No live weather data available',
    },
    settings: {
      title: 'Weather widget settings',
      description: 'Configure up to five weather locations and choose the compact focus location.',
      fields: {
        focusLocationSlot: {
          label: 'Focus location slot',
        },
        refreshIntervalMinutes: {
          label: 'Refresh interval minutes',
        },
        ...buildWeatherFieldTexts({
          locationLabel: 'Location {number} label',
          locationPlaceholder: 'Location {number}',
          latitudeLabel: 'Location {number} latitude',
          longitudeLabel: 'Location {number} longitude',
        }),
      },
    },
  },
  de: {
    title: 'Wetter',
    boardKicker: 'Vorhersage',
    copy: {
      statusCached: 'zwischengespeichert',
      statusLive: 'live',
      updatedPrefix: 'Aktualisiert',
      schedulingNextUpdate: 'Naechste Aktualisierung wird geplant',
      refreshingNow: 'Aktualisierung laeuft',
      nextUpdateIn: 'Naechste Aktualisierung in {time}',
      unavailableCondition: 'Wetter nicht verfuegbar',
      noLiveDataSummary: 'Keine Live-Wetterdaten verfuegbar',
    },
    settings: {
      title: 'Einstellungen des Wetter-Widgets',
      description: 'Konfiguriere bis zu fuenf Wetterorte und waehle den kompakten Fokusort.',
      fields: {
        focusLocationSlot: {
          label: 'Fokusort-Feld',
        },
        refreshIntervalMinutes: {
          label: 'Aktualisierungsintervall in Minuten',
        },
        ...buildWeatherFieldTexts({
          locationLabel: 'Bezeichnung fuer Ort {number}',
          locationPlaceholder: 'Ort {number}',
          latitudeLabel: 'Breitengrad von Ort {number}',
          longitudeLabel: 'Laengengrad von Ort {number}',
        }),
      },
    },
  },
  fr: {
    title: 'Meteo',
    boardKicker: 'Previsions',
    copy: {
      statusCached: 'en cache',
      statusLive: 'live',
      updatedPrefix: 'Mis a jour',
      schedulingNextUpdate: 'Planification de la prochaine mise a jour',
      refreshingNow: 'Actualisation en cours',
      nextUpdateIn: 'Prochaine mise a jour dans {time}',
      unavailableCondition: 'Meteo indisponible',
      noLiveDataSummary: 'Aucune donnee meteo live disponible',
    },
    settings: {
      title: 'Reglages du widget meteo',
      description: 'Configurez jusqu a cinq lieux meteo et choisissez le lieu compact principal.',
      fields: {
        focusLocationSlot: {
          label: 'Emplacement du lieu principal',
        },
        refreshIntervalMinutes: {
          label: 'Intervalle de mise a jour en minutes',
        },
        ...buildWeatherFieldTexts({
          locationLabel: 'Libelle du lieu {number}',
          locationPlaceholder: 'Lieu {number}',
          latitudeLabel: 'Latitude du lieu {number}',
          longitudeLabel: 'Longitude du lieu {number}',
        }),
      },
    },
  },
  es: {
    title: 'Tiempo',
    boardKicker: 'Pronostico',
    copy: {
      statusCached: 'en cache',
      statusLive: 'live',
      updatedPrefix: 'Actualizado',
      schedulingNextUpdate: 'Programando la siguiente actualizacion',
      refreshingNow: 'Actualizando ahora',
      nextUpdateIn: 'Proxima actualizacion en {time}',
      unavailableCondition: 'Tiempo no disponible',
      noLiveDataSummary: 'No hay datos meteorologicos en vivo disponibles',
    },
    settings: {
      title: 'Configuracion del widget del tiempo',
      description: 'Configura hasta cinco ubicaciones del tiempo y elige la ubicacion principal compacta.',
      fields: {
        focusLocationSlot: {
          label: 'Posicion de la ubicacion principal',
        },
        refreshIntervalMinutes: {
          label: 'Intervalo de actualizacion en minutos',
        },
        ...buildWeatherFieldTexts({
          locationLabel: 'Etiqueta de la ubicacion {number}',
          locationPlaceholder: 'Ubicacion {number}',
          latitudeLabel: 'Latitud de la ubicacion {number}',
          longitudeLabel: 'Longitud de la ubicacion {number}',
        }),
      },
    },
  },
})

export const getWeatherWidgetTranslation = (
  languageCode: SupportedLanguageCode,
) => getWidgetTranslationFromCatalog(weatherWidgetTranslationCatalog, languageCode)

export const matchesWeatherWidgetTitle = createDefaultWidgetTitleMatcher(
  weatherWidgetTranslationCatalog,
)
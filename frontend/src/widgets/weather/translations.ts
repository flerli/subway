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

const weatherConditionTranslations: Record<SupportedLanguageCode, Record<string, string>> = {
  en: {
    'Clear sky': 'Clear sky',
    'Mainly clear': 'Mainly clear',
    'Partly cloudy': 'Partly cloudy',
    Overcast: 'Overcast',
    Fog: 'Fog',
    'Depositing rime fog': 'Depositing rime fog',
    'Light drizzle': 'Light drizzle',
    Drizzle: 'Drizzle',
    'Dense drizzle': 'Dense drizzle',
    'Slight rain': 'Slight rain',
    Rain: 'Rain',
    'Heavy rain': 'Heavy rain',
    'Slight snow': 'Slight snow',
    Snow: 'Snow',
    'Heavy snow': 'Heavy snow',
    'Rain showers': 'Rain showers',
    'Heavy showers': 'Heavy showers',
    Thunderstorm: 'Thunderstorm',
    'Thunderstorm with hail': 'Thunderstorm with hail',
    'Severe thunderstorm': 'Severe thunderstorm',
    'Bright sun': 'Bright sun',
    'Windy PM': 'Windy PM',
    Unknown: 'Unknown',
  },
  de: {
    'Clear sky': 'Klarer Himmel',
    'Mainly clear': 'Ueberwiegend klar',
    'Partly cloudy': 'Teilweise bewoelkt',
    Overcast: 'Bedeckt',
    Fog: 'Nebel',
    'Depositing rime fog': 'Reifnebel',
    'Light drizzle': 'Leichter Nieselregen',
    Drizzle: 'Nieselregen',
    'Dense drizzle': 'Starker Nieselregen',
    'Slight rain': 'Leichter Regen',
    Rain: 'Regen',
    'Heavy rain': 'Starker Regen',
    'Slight snow': 'Leichter Schneefall',
    Snow: 'Schnee',
    'Heavy snow': 'Starker Schneefall',
    'Rain showers': 'Regenschauer',
    'Heavy showers': 'Starke Schauer',
    Thunderstorm: 'Gewitter',
    'Thunderstorm with hail': 'Gewitter mit Hagel',
    'Severe thunderstorm': 'Schweres Gewitter',
    'Bright sun': 'Sonnig',
    'Windy PM': 'Windiger Nachmittag',
    Unknown: 'Unbekannt',
  },
  fr: {
    'Clear sky': 'Ciel degage',
    'Mainly clear': 'Globalement degage',
    'Partly cloudy': 'Partiellement nuageux',
    Overcast: 'Couvert',
    Fog: 'Brouillard',
    'Depositing rime fog': 'Brouillard givrant',
    'Light drizzle': 'Bruine legere',
    Drizzle: 'Bruine',
    'Dense drizzle': 'Bruine dense',
    'Slight rain': 'Faible pluie',
    Rain: 'Pluie',
    'Heavy rain': 'Forte pluie',
    'Slight snow': 'Faible neige',
    Snow: 'Neige',
    'Heavy snow': 'Forte neige',
    'Rain showers': 'Averses de pluie',
    'Heavy showers': 'Fortes averses',
    Thunderstorm: 'Orage',
    'Thunderstorm with hail': 'Orage avec grele',
    'Severe thunderstorm': 'Orage violent',
    'Bright sun': 'Grand soleil',
    'Windy PM': 'Apres-midi venteux',
    Unknown: 'Inconnu',
  },
  es: {
    'Clear sky': 'Cielo despejado',
    'Mainly clear': 'Mayormente despejado',
    'Partly cloudy': 'Parcialmente nublado',
    Overcast: 'Cubierto',
    Fog: 'Niebla',
    'Depositing rime fog': 'Niebla helada',
    'Light drizzle': 'Llovizna ligera',
    Drizzle: 'Llovizna',
    'Dense drizzle': 'Llovizna intensa',
    'Slight rain': 'Lluvia ligera',
    Rain: 'Lluvia',
    'Heavy rain': 'Lluvia intensa',
    'Slight snow': 'Nieve ligera',
    Snow: 'Nieve',
    'Heavy snow': 'Nieve intensa',
    'Rain showers': 'Chubascos',
    'Heavy showers': 'Chubascos intensos',
    Thunderstorm: 'Tormenta electrica',
    'Thunderstorm with hail': 'Tormenta con granizo',
    'Severe thunderstorm': 'Tormenta severa',
    'Bright sun': 'Sol radiante',
    'Windy PM': 'Tarde ventosa',
    Unknown: 'Desconocido',
  },
}

export const localizeWeatherCondition = (
  condition: string,
  languageCode: SupportedLanguageCode,
) => {
  const normalizedCondition = condition.trim()

  if (!normalizedCondition) {
    return condition
  }

  return weatherConditionTranslations[languageCode]?.[normalizedCondition] ?? normalizedCondition
}

export const getWeatherWidgetTranslation = (
  languageCode: SupportedLanguageCode,
) => getWidgetTranslationFromCatalog(weatherWidgetTranslationCatalog, languageCode)

export const matchesWeatherWidgetTitle = createDefaultWidgetTitleMatcher(
  weatherWidgetTranslationCatalog,
)
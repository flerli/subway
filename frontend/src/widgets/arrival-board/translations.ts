import type { SupportedLanguageCode } from '../../i18n/localization'
import type { WidgetTranslationDefinition } from '../widgetTypes'
import {
  createDefaultWidgetTitleMatcher,
  createWidgetTranslationCatalog,
  getWidgetTranslationFromCatalog,
} from '../widgetLocalization'

export interface ArrivalBoardWidgetTranslation extends WidgetTranslationDefinition {
  copy: {
    allArrivalsTitle: string
    focusedArrivalsTitle: string
    arrivalLabel: string
    readyNextLabel: string
    happeningNowLabel: string
    hourUnitSingular: string
    hourUnitPlural: string
    dayUnitSingular: string
    dayUnitPlural: string
    hourAbbr: string
    minuteAbbr: string
    dayAbbr: string
    noArrivalsTitle: string
    noArrivalsCopy: string
  }
}

const arrivalBoardWidgetTranslationCatalog = createWidgetTranslationCatalog<ArrivalBoardWidgetTranslation>({
  en: {
    title: 'Arrival Board',
    boardKicker: 'Arrival',
    copy: {
      allArrivalsTitle: 'Arrival',
      focusedArrivalsTitle: '{name} arrival',
      arrivalLabel: 'Arrival',
      readyNextLabel: 'Ready next',
      happeningNowLabel: 'Happening now',
      hourUnitSingular: 'HR',
      hourUnitPlural: 'HRS',
      dayUnitSingular: 'DAY',
      dayUnitPlural: 'DAYS',
      hourAbbr: 'h',
      minuteAbbr: 'm',
      dayAbbr: 'd',
      noArrivalsTitle: 'No personal arrivals yet',
      noArrivalsCopy: 'Add household data sources or switch back to the All filter.',
    },
    settings: {
      title: 'Board chrome settings',
      description: 'Configure the title and subheading used in the top board header.',
      fields: {
        boardTitle: {
          label: 'Board title',
          placeholder: 'Home Info Kiosk',
        },
        boardSubheading: {
          label: 'Board subheading',
          placeholder: 'Family Avenue South',
        },
      },
    },
  },
  de: {
    title: 'Ankunftstafel',
    boardKicker: 'Ankunft',
    copy: {
      allArrivalsTitle: 'Ankunft',
      focusedArrivalsTitle: '{name} Ankunft',
      arrivalLabel: 'Ankunft',
      readyNextLabel: 'Als Naechstes',
      happeningNowLabel: 'Laeuft jetzt',
      hourUnitSingular: 'STD',
      hourUnitPlural: 'STD',
      dayUnitSingular: 'TAG',
      dayUnitPlural: 'TAGE',
      hourAbbr: 'h',
      minuteAbbr: 'min',
      dayAbbr: 'Tage',
      noArrivalsTitle: 'Noch keine persoenlichen Ankuenfte',
      noArrivalsCopy: 'Fuege Haushaltsdatenquellen hinzu oder wechsle zum Filter Alle zurueck.',
    },
    settings: {
      title: 'Anzeigeeinstellungen der Tafel',
      description: 'Konfiguriere Titel und Unterzeile in der Kopfzeile der Tafel.',
      fields: {
        boardTitle: {
          label: 'Titel der Tafel',
          placeholder: 'Home Info Kiosk',
        },
        boardSubheading: {
          label: 'Unterzeile der Tafel',
          placeholder: 'Family Avenue South',
        },
      },
    },
  },
  fr: {
    title: 'Tableau des arrivees',
    boardKicker: 'Arrivee',
    copy: {
      allArrivalsTitle: 'Arrivee',
      focusedArrivalsTitle: 'Arrivee de {name}',
      arrivalLabel: 'Arrivee',
      readyNextLabel: 'A suivre',
      happeningNowLabel: 'En cours',
      hourUnitSingular: 'H',
      hourUnitPlural: 'H',
      dayUnitSingular: 'JOUR',
      dayUnitPlural: 'JOURS',
      hourAbbr: 'h',
      minuteAbbr: 'min',
      dayAbbr: 'j',
      noArrivalsTitle: 'Pas encore d arrivees personnelles',
      noArrivalsCopy: 'Ajoutez des sources de donnees du foyer ou revenez au filtre Tous.',
    },
    settings: {
      title: 'Reglages du bandeau de la tete',
      description: 'Configurez le titre et le sous-titre affiches dans la tete du tableau.',
      fields: {
        boardTitle: {
          label: 'Titre du tableau',
          placeholder: 'Home Info Kiosk',
        },
        boardSubheading: {
          label: 'Sous-titre du tableau',
          placeholder: 'Family Avenue South',
        },
      },
    },
  },
  es: {
    title: 'Panel de llegadas',
    boardKicker: 'Llegada',
    copy: {
      allArrivalsTitle: 'Llegada',
      focusedArrivalsTitle: 'Llegada de {name}',
      arrivalLabel: 'Llegada',
      readyNextLabel: 'Siguiente',
      happeningNowLabel: 'Ahora mismo',
      hourUnitSingular: 'H',
      hourUnitPlural: 'H',
      dayUnitSingular: 'DIA',
      dayUnitPlural: 'DIAS',
      hourAbbr: 'h',
      minuteAbbr: 'min',
      dayAbbr: 'd',
      noArrivalsTitle: 'Todavia no hay llegadas personales',
      noArrivalsCopy: 'Agrega fuentes de datos del hogar o vuelve al filtro Todos.',
    },
    settings: {
      title: 'Configuracion del encabezado del panel',
      description: 'Configura el titulo y el subtitulo usados en la cabecera superior del panel.',
      fields: {
        boardTitle: {
          label: 'Titulo del panel',
          placeholder: 'Home Info Kiosk',
        },
        boardSubheading: {
          label: 'Subtitulo del panel',
          placeholder: 'Family Avenue South',
        },
      },
    },
  },
})

export const getArrivalBoardWidgetTranslation = (
  languageCode: SupportedLanguageCode,
) => getWidgetTranslationFromCatalog(arrivalBoardWidgetTranslationCatalog, languageCode)

export const matchesArrivalBoardWidgetTitle = createDefaultWidgetTitleMatcher(
  arrivalBoardWidgetTranslationCatalog,
)
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
    readyNextLabel: string
    happeningNowLabel: string
    noArrivalsTitle: string
    noArrivalsCopy: string
  }
}

const arrivalBoardWidgetTranslationCatalog = createWidgetTranslationCatalog<ArrivalBoardWidgetTranslation>({
  en: {
    title: 'Arrival Board',
    boardKicker: 'Family service board',
    copy: {
      allArrivalsTitle: 'All household arrivals',
      focusedArrivalsTitle: '{name} arrivals',
      readyNextLabel: 'Ready next',
      happeningNowLabel: 'Happening now',
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
    boardKicker: 'Familien-Service-Board',
    copy: {
      allArrivalsTitle: 'Alle Haushaltsankuenfte',
      focusedArrivalsTitle: '{name} Ankuenfte',
      readyNextLabel: 'Als Naechstes',
      happeningNowLabel: 'Laeuft jetzt',
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
    boardKicker: 'Tableau de service familial',
    copy: {
      allArrivalsTitle: 'Arrivees du foyer',
      focusedArrivalsTitle: 'Arrivees de {name}',
      readyNextLabel: 'A suivre',
      happeningNowLabel: 'En cours',
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
    boardKicker: 'Panel de servicio familiar',
    copy: {
      allArrivalsTitle: 'Llegadas del hogar',
      focusedArrivalsTitle: 'Llegadas de {name}',
      readyNextLabel: 'Siguiente',
      happeningNowLabel: 'Ahora mismo',
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
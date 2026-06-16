import type { SupportedLanguageCode } from '../../i18n/localization'
import type { WidgetTranslationDefinition } from '../widgetTypes'
import {
  createDefaultWidgetTitleMatcher,
  createWidgetTranslationCatalog,
  getWidgetTranslationFromCatalog,
} from '../widgetLocalization'

export interface YoutubeWidgetTranslation extends WidgetTranslationDefinition {
  copy: {
    searchPlaceholder: string
    playingLabel: string
    emptyTitle: string
    emptyCopy: string
    noResults: string
  }
}

const youtubeWidgetTranslationCatalog = createWidgetTranslationCatalog<YoutubeWidgetTranslation>({
  en: {
    title: 'YouTube',
    boardKicker: 'YouTube',
    copy: {
      searchPlaceholder: 'Search videos...',
      playingLabel: 'Now Playing',
      emptyTitle: 'No video selected',
      emptyCopy: 'Search or select a video to play',
      noResults: 'No videos found',
    },
    settings: {
      title: 'YouTube widget settings',
      description: 'Configure YouTube search and player settings.',
      fields: {
        autoPlay: {
          label: 'Auto-play videos',
        },
      },
    },
  },
  de: {
    title: 'YouTube',
    boardKicker: 'YouTube',
    copy: {
      searchPlaceholder: 'Videos suchen...',
      playingLabel: 'Wird gerade abgespielt',
      emptyTitle: 'Kein Video ausgewaehlt',
      emptyCopy: 'Suchen oder waehlen Sie ein Video zum Abspielen',
      noResults: 'Keine Videos gefunden',
    },
    settings: {
      title: 'YouTube-Widget-Einstellungen',
      description: 'Konfigurieren Sie die YouTube-Such- und Player-Einstellungen.',
      fields: {
        autoPlay: {
          label: 'Videos automatisch abspielen',
        },
      },
    },
  },
  fr: {
    title: 'YouTube',
    boardKicker: 'YouTube',
    copy: {
      searchPlaceholder: 'Rechercher des videos...',
      playingLabel: 'En cours de lecture',
      emptyTitle: 'Aucune video selectionnee',
      emptyCopy: 'Recherchez ou selectionnez une video a lire',
      noResults: 'Aucune video trouvee',
    },
    settings: {
      title: 'Parametres du widget YouTube',
      description: 'Configurez les parametres de recherche et de lecteur YouTube.',
      fields: {
        autoPlay: {
          label: 'Lecture automatique des videos',
        },
      },
    },
  },
  es: {
    title: 'YouTube',
    boardKicker: 'YouTube',
    copy: {
      searchPlaceholder: 'Buscar videos...',
      playingLabel: 'Reproduciendo',
      emptyTitle: 'Ningun video seleccionado',
      emptyCopy: 'Busque o seleccione un video para reproducir',
      noResults: 'No se encontraron videos',
    },
    settings: {
      title: 'Configuracion del widget de YouTube',
      description: 'Configure los ajustes de busqueda y reproductor de YouTube.',
      fields: {
        autoPlay: {
          label: 'Reproducir videos automaticamente',
        },
      },
    },
  },
})

export const getYoutubeWidgetTranslation = (languageCode: SupportedLanguageCode) =>
  getWidgetTranslationFromCatalog(youtubeWidgetTranslationCatalog, languageCode)

export const matchesYoutubeWidgetTitle = createDefaultWidgetTitleMatcher(
  youtubeWidgetTranslationCatalog,
)

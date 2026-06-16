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
    playVideo: string
    loadMore: string
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
      playVideo: 'Play',
      loadMore: 'Load more',
      emptyTitle: 'No video selected',
      emptyCopy: 'Search or select a video to play',
      noResults: 'No videos found',
    },
    settings: {
      title: 'YouTube widget settings',
      description: 'Configure YouTube search and player settings.',
      fields: {
        defaultQuery: {
          label: 'Default search query',
          placeholder: 'e.g., music, tutorials',
        },
        autoPlay: {
          label: 'Auto-play videos',
        },
        maxResults: {
          label: 'Results per search',
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
      playVideo: 'Abspielen',
      loadMore: 'Mehr laden',
      emptyTitle: 'Kein Video ausgewaehlt',
      emptyCopy: 'Suchen oder waehlen Sie ein Video zum Abspielen',
      noResults: 'Keine Videos gefunden',
    },
    settings: {
      title: 'YouTube-Widget-Einstellungen',
      description: 'Konfigurieren Sie die YouTube-Such- und Player-Einstellungen.',
      fields: {
        defaultQuery: {
          label: 'Standard-Suchanfrage',
          placeholder: 'z.B. Musik, Tutorials',
        },
        autoPlay: {
          label: 'Videos automatisch abspielen',
        },
        maxResults: {
          label: 'Ergebnisse pro Suche',
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
      playVideo: 'Lire',
      loadMore: 'Charger plus',
      emptyTitle: 'Aucune video selectionnee',
      emptyCopy: 'Recherchez ou selectionnez une video a lire',
      noResults: 'Aucune video trouvee',
    },
    settings: {
      title: 'Parametres du widget YouTube',
      description: 'Configurez les parametres de recherche et de lecteur YouTube.',
      fields: {
        defaultQuery: {
          label: 'Requete de recherche par defaut',
          placeholder: 'p.ex. musique, tutoriels',
        },
        autoPlay: {
          label: 'Lecture automatique des videos',
        },
        maxResults: {
          label: 'Resultats par recherche',
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
      playVideo: 'Reproducir',
      loadMore: 'Cargar mas',
      emptyTitle: 'Ningun video seleccionado',
      emptyCopy: 'Busque o seleccione un video para reproducir',
      noResults: 'No se encontraron videos',
    },
    settings: {
      title: 'Configuracion del widget de YouTube',
      description: 'Configure los ajustes de busqueda y reproductor de YouTube.',
      fields: {
        defaultQuery: {
          label: 'Consulta de busqueda predeterminada',
          placeholder: 'p.ej. musica, tutoriales',
        },
        autoPlay: {
          label: 'Reproducir videos automaticamente',
        },
        maxResults: {
          label: 'Resultados por busqueda',
        },
      },
    },
  },
})

export const getYoutubeWidgetTranslation = (
  languageCode: SupportedLanguageCode,
) => getWidgetTranslationFromCatalog(youtubeWidgetTranslationCatalog, languageCode)

export const matchesYoutubeWidgetTitle = createDefaultWidgetTitleMatcher(
  youtubeWidgetTranslationCatalog,
)

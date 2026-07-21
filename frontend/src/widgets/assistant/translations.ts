import type { SupportedLanguageCode } from '../../i18n/localization'
import type { WidgetTranslationDefinition } from '../widgetTypes'
import {
  createDefaultWidgetTitleMatcher,
  createWidgetTranslationCatalog,
  getWidgetTranslationFromCatalog,
} from '../widgetLocalization'

export interface AssistantWidgetTranslation extends WidgetTranslationDefinition {
  copy: {
    createRouteAction: string
    saveRouteAction: string
    deleteRouteAction: string
    setDefaultRouteAction: string
    defaultRouteLabel: string
    enabledState: string
    disabledState: string
    routeInventoryTitle: string
    routeInventoryCopy: string
    noSavedRoutesCopy: string
    editorTitle: string
    storedApiKeyHint: string
    selectedDefaultMeta: string
  }
}

const assistantWidgetTranslationCatalog = createWidgetTranslationCatalog<AssistantWidgetTranslation>({
  en: {
    title: 'Assistant',
    boardKicker: 'Assistant',
    copy: {
      createRouteAction: 'New connection',
      saveRouteAction: 'Save connection',
      deleteRouteAction: 'Delete connection',
      setDefaultRouteAction: 'Set default',
      defaultRouteLabel: 'Default',
      enabledState: 'Enabled',
      disabledState: 'Disabled',
      routeInventoryTitle: 'Saved connections',
      routeInventoryCopy: 'Choose, edit, delete, or default-select one assistant connection for new conversations.',
      noSavedRoutesCopy: 'No assistant connections are saved yet.',
      editorTitle: 'Connection editor',
      storedApiKeyHint: 'Stored API key will be reused when the field stays empty.',
      selectedDefaultMeta: 'Used for all new conversations.',
    },
    settings: {
      title: 'Assistant widget settings',
      description:
        'Configure the assistant backend connection directly from settings for this account.',
      fields: {
        routeId: { label: 'Route id' },
        label: { label: 'Connection label' },
        backendKind: { label: 'Backend kind' },
        baseUrl: { label: 'Base URL', placeholder: 'https://www.scaico.com/v1' },
        modelIdentifier: { label: 'Model identifier', placeholder: 'subway/subway_assistant_team_mrtna741' },
        apiKey: { label: 'API key', placeholder: 'Leave empty to keep the stored API key' },
        headersJson: { label: 'Headers JSON', placeholder: '{}' },
        enabled: { label: 'Connection enabled' },
        supportsStreaming: { label: 'Supports streaming' },
        supportsTools: { label: 'Supports tools' },
        supportsMarkdown: { label: 'Supports markdown' },
      },
    },
  },
  de: {
    title: 'Assistent',
    boardKicker: 'Assistent',
    copy: {
      createRouteAction: 'Neue Verbindung',
      saveRouteAction: 'Verbindung speichern',
      deleteRouteAction: 'Verbindung loschen',
      setDefaultRouteAction: 'Als Standard setzen',
      defaultRouteLabel: 'Standard',
      enabledState: 'Aktiv',
      disabledState: 'Deaktiviert',
      routeInventoryTitle: 'Gespeicherte Verbindungen',
      routeInventoryCopy: 'Assistent Verbindungen fur neue Unterhaltungen auswahlen, bearbeiten, loschen oder als Standard setzen.',
      noSavedRoutesCopy: 'Noch keine Assistent Verbindungen gespeichert.',
      editorTitle: 'Verbindungseditor',
      storedApiKeyHint: 'Der gespeicherte API Schlussel bleibt erhalten, wenn das Feld leer bleibt.',
      selectedDefaultMeta: 'Wird fur alle neuen Unterhaltungen verwendet.',
    },
    settings: {
      title: 'Assistent Widget Einstellungen',
      description:
        'Konfiguriere die Assistent Backend Verbindung direkt in den Einstellungen fur dieses Konto.',
      fields: {
        routeId: { label: 'Route ID' },
        label: { label: 'Verbindungsname' },
        backendKind: { label: 'Backend Typ' },
        baseUrl: { label: 'Basis URL', placeholder: 'https://www.scaico.com/v1' },
        modelIdentifier: { label: 'Modellkennung', placeholder: 'subway/subway_assistant_team_mrtna741' },
        apiKey: { label: 'API Schlussel', placeholder: 'Leer lassen, um den gespeicherten API Schlussel zu behalten' },
        headersJson: { label: 'Headers JSON', placeholder: '{}' },
        enabled: { label: 'Verbindung aktiviert' },
        supportsStreaming: { label: 'Unterstutzt Streaming' },
        supportsTools: { label: 'Unterstutzt Tools' },
        supportsMarkdown: { label: 'Unterstutzt Markdown' },
      },
    },
  },
  fr: {
    title: 'Assistant',
    boardKicker: 'Assistant',
    copy: {
      createRouteAction: 'Nouvelle connexion',
      saveRouteAction: 'Enregistrer la connexion',
      deleteRouteAction: 'Supprimer la connexion',
      setDefaultRouteAction: 'Definir par defaut',
      defaultRouteLabel: 'Par defaut',
      enabledState: 'Activee',
      disabledState: 'Desactivee',
      routeInventoryTitle: 'Connexions enregistrees',
      routeInventoryCopy: 'Choisissez, modifiez, supprimez ou definissez par defaut une connexion assistant pour les nouvelles conversations.',
      noSavedRoutesCopy: 'Aucune connexion assistant n est encore enregistree.',
      editorTitle: 'Editeur de connexion',
      storedApiKeyHint: 'La cle API enregistree sera reutilisee si le champ reste vide.',
      selectedDefaultMeta: 'Utilisee pour toutes les nouvelles conversations.',
    },
    settings: {
      title: 'Reglages du widget assistant',
      description:
        'Configurez directement la connexion du backend assistant depuis les reglages pour ce compte.',
      fields: {
        routeId: { label: 'Id de route' },
        label: { label: 'Libelle de connexion' },
        backendKind: { label: 'Type de backend' },
        baseUrl: { label: 'URL de base', placeholder: 'https://www.scaico.com/v1' },
        modelIdentifier: { label: 'Identifiant du modele', placeholder: 'subway/subway_assistant_team_mrtna741' },
        apiKey: { label: 'Cle API', placeholder: 'Laisser vide pour conserver la cle API enregistree' },
        headersJson: { label: 'Headers JSON', placeholder: '{}' },
        enabled: { label: 'Connexion activee' },
        supportsStreaming: { label: 'Supporte le streaming' },
        supportsTools: { label: 'Supporte les outils' },
        supportsMarkdown: { label: 'Supporte le markdown' },
      },
    },
  },
  es: {
    title: 'Asistente',
    boardKicker: 'Asistente',
    copy: {
      createRouteAction: 'Nueva conexion',
      saveRouteAction: 'Guardar conexion',
      deleteRouteAction: 'Eliminar conexion',
      setDefaultRouteAction: 'Usar por defecto',
      defaultRouteLabel: 'Por defecto',
      enabledState: 'Activa',
      disabledState: 'Desactivada',
      routeInventoryTitle: 'Conexiones guardadas',
      routeInventoryCopy: 'Elige, edita, elimina o define como predeterminada una conexion del asistente para las nuevas conversaciones.',
      noSavedRoutesCopy: 'Todavia no hay conexiones del asistente guardadas.',
      editorTitle: 'Editor de conexion',
      storedApiKeyHint: 'La clave API guardada se reutilizara si el campo queda vacio.',
      selectedDefaultMeta: 'Se usa para todas las conversaciones nuevas.',
    },
    settings: {
      title: 'Ajustes del widget asistente',
      description:
        'Configura directamente la conexion del backend del asistente desde ajustes para esta cuenta.',
      fields: {
        routeId: { label: 'Id de ruta' },
        label: { label: 'Etiqueta de conexion' },
        backendKind: { label: 'Tipo de backend' },
        baseUrl: { label: 'URL base', placeholder: 'https://www.scaico.com/v1' },
        modelIdentifier: { label: 'Identificador del modelo', placeholder: 'subway/subway_assistant_team_mrtna741' },
        apiKey: { label: 'Clave API', placeholder: 'Dejalo vacio para conservar la clave API guardada' },
        headersJson: { label: 'Headers JSON', placeholder: '{}' },
        enabled: { label: 'Conexion activada' },
        supportsStreaming: { label: 'Soporta streaming' },
        supportsTools: { label: 'Soporta herramientas' },
        supportsMarkdown: { label: 'Soporta markdown' },
      },
    },
  },
})

export const getAssistantWidgetTranslation = (languageCode: SupportedLanguageCode) =>
  getWidgetTranslationFromCatalog(assistantWidgetTranslationCatalog, languageCode)

export const matchesAssistantWidgetTitle = createDefaultWidgetTitleMatcher(
  assistantWidgetTranslationCatalog,
)

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
    voiceSectionTitle: string
    voiceSectionDescription: string
    voiceEnabledLabel: string
    voicePresetLabel: string
    voiceVolumeLabel: string
    voiceSampleAction: string
    voiceLanguageHint: string
    voiceSaveAction: string
    voiceSavedState: string
    voiceLoadFailed: string
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
      voiceSectionTitle: 'Voice',
      voiceSectionDescription: 'Choose how assistant answers sound and hear a sample for each voice.',
      voiceEnabledLabel: 'Speak answers aloud',
      voicePresetLabel: 'Voice',
      voiceVolumeLabel: 'Volume',
      voiceSampleAction: 'Play sample',
      voiceLanguageHint: 'Speech recognition follows the board language (Settings / Language).',
      voiceSaveAction: 'Save voice settings',
      voiceSavedState: 'Voice settings saved.',
      voiceLoadFailed: 'Voice settings could not be loaded.',
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
      voiceSectionTitle: 'Stimme',
      voiceSectionDescription: 'Lege fest, wie Assistent Antworten klingen, und hoere eine Probe fur jede Stimme.',
      voiceEnabledLabel: 'Antworten vorlesen',
      voicePresetLabel: 'Stimme',
      voiceVolumeLabel: 'Lautstarke',
      voiceSampleAction: 'Probe abspielen',
      voiceLanguageHint: 'Die Spracherkennung folgt der Kiosksprache (Einstellungen / Sprache).',
      voiceSaveAction: 'Stimmeinstellungen speichern',
      voiceSavedState: 'Stimmeinstellungen gespeichert.',
      voiceLoadFailed: 'Stimmeinstellungen konnten nicht geladen werden.',
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
      voiceSectionTitle: 'Voix',
      voiceSectionDescription: 'Choisissez le son des reponses de l assistant et ecoutez un echantillon pour chaque voix.',
      voiceEnabledLabel: 'Lire les reponses a voix haute',
      voicePresetLabel: 'Voix',
      voiceVolumeLabel: 'Volume',
      voiceSampleAction: 'Ecouter un echantillon',
      voiceLanguageHint: 'La reconnaissance vocale suit la langue du kiosque (Reglages / Langue).',
      voiceSaveAction: 'Enregistrer les reglages vocaux',
      voiceSavedState: 'Reglages vocaux enregistres.',
      voiceLoadFailed: 'Impossible de charger les reglages vocaux.',
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
      voiceSectionTitle: 'Voz',
      voiceSectionDescription: 'Elige como suenan las respuestas del asistente y escucha una muestra de cada voz.',
      voiceEnabledLabel: 'Leer respuestas en voz alta',
      voicePresetLabel: 'Voz',
      voiceVolumeLabel: 'Volumen',
      voiceSampleAction: 'Reproducir muestra',
      voiceLanguageHint: 'El reconocimiento de voz sigue el idioma del quiosco (Ajustes / Idioma).',
      voiceSaveAction: 'Guardar ajustes de voz',
      voiceSavedState: 'Ajustes de voz guardados.',
      voiceLoadFailed: 'No se pudieron cargar los ajustes de voz.',
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

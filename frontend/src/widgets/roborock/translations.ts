import type { SupportedLanguageCode } from '../../i18n/localization'
import type { WidgetTranslationDefinition } from '../widgetTypes'
import {
  createDefaultWidgetTitleMatcher,
  createWidgetTranslationCatalog,
  getWidgetTranslationFromCatalog,
} from '../widgetLocalization'

export interface RoborockWidgetTranslation extends WidgetTranslationDefinition {
  copy: {
    emailLabel: string
    verificationCodeLabel: string
    verificationCodePlaceholder: string
    requestCodeAction: string
    saveAction: string
    loadDevicesAction: string
    saveSelectionAction: string
    validateAction: string
    requestingCodeState: string
    savingState: string
    loadingDevicesState: string
    savingSelectionState: string
    validatingState: string
    idleState: string
    codeRequestedState: string
    savedState: string
    selectionSavedState: string
    connectedState: string
    reconnectRequiredState: string
    notConfiguredState: string
    settingsLoadFailedState: string
    sessionStoredHint: string
    baseUrlMeta: string
    deviceLabel: string
    devicePlaceholder: string
    routineLabel: string
    routinePlaceholder: string
    noDevicesLoadedCopy: string
    noRoutinesAvailableCopy: string
    standardStartFallbackCopy: string
    selectedDeviceMeta: string
  }
}

const roborockWidgetTranslationCatalog = createWidgetTranslationCatalog<RoborockWidgetTranslation>({
  en: {
    title: 'Roborock',
    boardKicker: 'Roborock',
    copy: {
      emailLabel: 'Roborock email',
      verificationCodeLabel: 'Verification code',
      verificationCodePlaceholder: 'Enter the email code from Roborock',
      requestCodeAction: 'Request code',
      saveAction: 'Save Roborock connection',
      loadDevicesAction: 'Load devices',
      saveSelectionAction: 'Save device selection',
      validateAction: 'Validate connection',
      requestingCodeState: 'Requesting Roborock verification code...',
      savingState: 'Saving Roborock connection...',
      loadingDevicesState: 'Loading Roborock devices and routines...',
      savingSelectionState: 'Saving Roborock device selection...',
      validatingState: 'Validating stored Roborock session...',
      idleState: 'Enter your Roborock email, request a code, then save the connection.',
      codeRequestedState: 'Verification code requested. Check your Roborock email inbox.',
      savedState: 'Roborock connection saved.',
      selectionSavedState: 'Roborock device selection saved.',
      connectedState: 'Roborock connection is active.',
      reconnectRequiredState: 'Roborock needs to be reconnected.',
      notConfiguredState: 'Roborock is not configured yet.',
      settingsLoadFailedState: 'Failed to load Roborock settings.',
      sessionStoredHint: 'A Roborock session is already stored for this user.',
      baseUrlMeta: 'Roborock region endpoint: {baseUrl}',
      deviceLabel: 'Selected robot vacuum',
      devicePlaceholder: 'Load Roborock devices first',
      routineLabel: 'Default quick-start routine',
      routinePlaceholder: 'Use standard start-clean fallback',
      noDevicesLoadedCopy: 'No compatible Roborock vacuums have been loaded for this account yet.',
      noRoutinesAvailableCopy: 'This robot does not expose routines through Roborock. Subway will fall back to a standard start-clean action.',
      standardStartFallbackCopy: 'Quick start will use the standard start-clean command until a routine is selected.',
      selectedDeviceMeta: 'Selected robot: {name} ({model})',
    },
    settings: {
      title: 'Roborock widget settings',
      description:
        'Connect one Roborock account per Subway user through the Roborock email verification flow.',
      fields: {
        email: {
          label: 'Roborock email',
        },
        verificationCode: {
          label: 'Verification code',
          placeholder: 'Enter the email code from Roborock',
        },
      },
    },
  },
  de: {
    title: 'Roborock',
    boardKicker: 'Roborock',
    copy: {
      emailLabel: 'Roborock-E-Mail',
      verificationCodeLabel: 'Bestaetigungscode',
      verificationCodePlaceholder: 'E-Mail-Code von Roborock eingeben',
      requestCodeAction: 'Code anfordern',
      saveAction: 'Roborock-Verbindung speichern',
      loadDevicesAction: 'Geraete laden',
      saveSelectionAction: 'Geraeteauswahl speichern',
      validateAction: 'Verbindung pruefen',
      requestingCodeState: 'Roborock-Bestaetigungscode wird angefordert...',
      savingState: 'Roborock-Verbindung wird gespeichert...',
      loadingDevicesState: 'Roborock-Geraete und Routinen werden geladen...',
      savingSelectionState: 'Roborock-Geraeteauswahl wird gespeichert...',
      validatingState: 'Gespeicherte Roborock-Sitzung wird geprueft...',
      idleState: 'Roborock-E-Mail eingeben, Code anfordern und dann die Verbindung speichern.',
      codeRequestedState: 'Bestaetigungscode angefordert. Pruefe dein Roborock-E-Mail-Postfach.',
      savedState: 'Roborock-Verbindung gespeichert.',
      selectionSavedState: 'Roborock-Geraeteauswahl gespeichert.',
      connectedState: 'Roborock-Verbindung ist aktiv.',
      reconnectRequiredState: 'Roborock muss erneut verbunden werden.',
      notConfiguredState: 'Roborock ist noch nicht konfiguriert.',
      settingsLoadFailedState: 'Roborock-Einstellungen konnten nicht geladen werden.',
      sessionStoredHint: 'Fuer diesen Benutzer ist bereits eine Roborock-Sitzung gespeichert.',
      baseUrlMeta: 'Roborock-Regionsendpunkt: {baseUrl}',
      deviceLabel: 'Ausgewaehlter Saugroboter',
      devicePlaceholder: 'Zuerst Roborock-Geraete laden',
      routineLabel: 'Standardroutine fuer Schnellstart',
      routinePlaceholder: 'Standard-Startreinigung verwenden',
      noDevicesLoadedCopy: 'Fuer dieses Konto wurden noch keine kompatiblen Roborock-Saugroboter geladen.',
      noRoutinesAvailableCopy: 'Dieser Roboter stellt ueber Roborock keine Routinen bereit. Subway faellt auf den normalen Startreinigungsbefehl zurueck.',
      standardStartFallbackCopy: 'Der Schnellstart verwendet den normalen Startreinigungsbefehl, bis eine Routine ausgewaehlt wird.',
      selectedDeviceMeta: 'Ausgewaehlter Roboter: {name} ({model})',
    },
    settings: {
      title: 'Roborock-Widget-Einstellungen',
      description:
        'Verbinde pro Subway-Benutzer ein Roborock-Konto ueber den Roborock-E-Mail-Bestaetigungsablauf.',
      fields: {
        email: {
          label: 'Roborock-E-Mail',
        },
        verificationCode: {
          label: 'Bestaetigungscode',
          placeholder: 'E-Mail-Code von Roborock eingeben',
        },
      },
    },
  },
  fr: {
    title: 'Roborock',
    boardKicker: 'Roborock',
    copy: {
      emailLabel: 'E-mail Roborock',
      verificationCodeLabel: 'Code de verification',
      verificationCodePlaceholder: 'Saisissez le code e-mail de Roborock',
      requestCodeAction: 'Demander le code',
      saveAction: 'Enregistrer la connexion Roborock',
      loadDevicesAction: 'Charger les appareils',
      saveSelectionAction: 'Enregistrer la selection',
      validateAction: 'Verifier la connexion',
      requestingCodeState: 'Demande du code de verification Roborock...',
      savingState: 'Enregistrement de la connexion Roborock...',
      loadingDevicesState: 'Chargement des appareils et routines Roborock...',
      savingSelectionState: 'Enregistrement de la selection Roborock...',
      validatingState: 'Verification de la session Roborock enregistree...',
      idleState: 'Saisissez votre e-mail Roborock, demandez un code, puis enregistrez la connexion.',
      codeRequestedState: 'Code de verification demande. Verifiez votre boite e-mail Roborock.',
      savedState: 'Connexion Roborock enregistree.',
      selectionSavedState: 'Selection Roborock enregistree.',
      connectedState: 'La connexion Roborock est active.',
      reconnectRequiredState: 'Roborock doit etre reconnecte.',
      notConfiguredState: 'Roborock n est pas encore configure.',
      settingsLoadFailedState: 'Impossible de charger les reglages Roborock.',
      sessionStoredHint: 'Une session Roborock est deja enregistree pour cet utilisateur.',
      baseUrlMeta: 'Point de terminaison regional Roborock : {baseUrl}',
      deviceLabel: 'Aspirateur robot selectionne',
      devicePlaceholder: 'Chargez d abord les appareils Roborock',
      routineLabel: 'Routine de demarrage rapide par defaut',
      routinePlaceholder: 'Utiliser le demarrage standard',
      noDevicesLoadedCopy: 'Aucun aspirateur Roborock compatible n a encore ete charge pour ce compte.',
      noRoutinesAvailableCopy: 'Ce robot n expose pas de routines via Roborock. Subway utilisera un demarrage de nettoyage standard.',
      standardStartFallbackCopy: 'Le demarrage rapide utilisera la commande standard tant qu aucune routine n est selectionnee.',
      selectedDeviceMeta: 'Robot selectionne : {name} ({model})',
    },
    settings: {
      title: 'Reglages du widget Roborock',
      description:
        'Connectez un compte Roborock par utilisateur Subway via le flux de verification par e-mail Roborock.',
      fields: {
        email: {
          label: 'E-mail Roborock',
        },
        verificationCode: {
          label: 'Code de verification',
          placeholder: 'Saisissez le code e-mail de Roborock',
        },
      },
    },
  },
  es: {
    title: 'Roborock',
    boardKicker: 'Roborock',
    copy: {
      emailLabel: 'Correo de Roborock',
      verificationCodeLabel: 'Codigo de verificacion',
      verificationCodePlaceholder: 'Introduce el codigo recibido por correo',
      requestCodeAction: 'Solicitar codigo',
      saveAction: 'Guardar conexion de Roborock',
      loadDevicesAction: 'Cargar dispositivos',
      saveSelectionAction: 'Guardar seleccion',
      validateAction: 'Validar conexion',
      requestingCodeState: 'Solicitando codigo de verificacion de Roborock...',
      savingState: 'Guardando conexion de Roborock...',
      loadingDevicesState: 'Cargando dispositivos y rutinas de Roborock...',
      savingSelectionState: 'Guardando la seleccion de Roborock...',
      validatingState: 'Validando la sesion guardada de Roborock...',
      idleState: 'Introduce tu correo de Roborock, solicita un codigo y luego guarda la conexion.',
      codeRequestedState: 'Codigo de verificacion solicitado. Revisa tu correo de Roborock.',
      savedState: 'Conexion de Roborock guardada.',
      selectionSavedState: 'Seleccion de Roborock guardada.',
      connectedState: 'La conexion de Roborock esta activa.',
      reconnectRequiredState: 'Roborock necesita volver a conectarse.',
      notConfiguredState: 'Roborock todavia no esta configurado.',
      settingsLoadFailedState: 'No se pudieron cargar los ajustes de Roborock.',
      sessionStoredHint: 'Ya hay una sesion de Roborock guardada para este usuario.',
      baseUrlMeta: 'Endpoint regional de Roborock: {baseUrl}',
      deviceLabel: 'Robot aspirador seleccionado',
      devicePlaceholder: 'Carga primero los dispositivos de Roborock',
      routineLabel: 'Rutina rapida predeterminada',
      routinePlaceholder: 'Usar inicio estandar de limpieza',
      noDevicesLoadedCopy: 'Todavia no se han cargado aspiradores Roborock compatibles para esta cuenta.',
      noRoutinesAvailableCopy: 'Este robot no expone rutinas mediante Roborock. Subway usara el inicio estandar de limpieza.',
      standardStartFallbackCopy: 'El inicio rapido usara el comando estandar hasta que se seleccione una rutina.',
      selectedDeviceMeta: 'Robot seleccionado: {name} ({model})',
    },
    settings: {
      title: 'Ajustes del widget Roborock',
      description:
        'Conecta una cuenta de Roborock por usuario de Subway mediante el flujo de verificacion por correo de Roborock.',
      fields: {
        email: {
          label: 'Correo de Roborock',
        },
        verificationCode: {
          label: 'Codigo de verificacion',
          placeholder: 'Introduce el codigo recibido por correo',
        },
      },
    },
  },
})

export const getRoborockWidgetTranslation = (languageCode: SupportedLanguageCode) =>
  getWidgetTranslationFromCatalog(roborockWidgetTranslationCatalog, languageCode)

export const matchesRoborockWidgetTitle = createDefaultWidgetTitleMatcher(
  roborockWidgetTranslationCatalog,
)
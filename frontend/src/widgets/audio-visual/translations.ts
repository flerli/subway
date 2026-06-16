import type { SupportedLanguageCode } from '../../i18n/localization'
import type { WidgetTranslationDefinition } from '../widgetTypes'
import {
  createDefaultWidgetTitleMatcher,
  createWidgetTranslationCatalog,
  getWidgetTranslationFromCatalog,
} from '../widgetLocalization'

export interface AudioVisualWidgetTranslation extends WidgetTranslationDefinition {
  copy: {
    permissionTitle: string
    permissionCopy: string
    enableAccess: string
    permissionDenied: string
    retryPermission: string
    cameraUnavailable: string
    cameraDisabled: string
    microphoneDisabled: string
    cameraOn: string
    cameraOff: string
    frontCamera: string
    rearCamera: string
    microphoneOn: string
    microphoneOff: string
    live: string
    history: string
    noRecordings: string
    takePhoto: string
    recordVideo: string
    recordAudio: string
    stopRecording: string
    recording: string
    uploading: string
    uploadFailed: string
    uploadSuccess: string
    recordingError: string
    loadFailed: string
    deleteFailed: string
    deleteConfirmTitle: string
    deleteConfirmCopy: string
    cancelAction: string
    confirmAction: string
    playAction: string
    closeAction: string
    deleteAction: string
    downloadAction: string
    audioLevel: string
    peak: string
    clipping: string
    fileSize: string
    duration: string
    uploadedBy: string
    capturedAt: string
    loadMore: string
    photoReady: string
    photoType: string
    videoType: string
    audioType: string
  }
}

const audioVisualWidgetTranslationCatalog = createWidgetTranslationCatalog<AudioVisualWidgetTranslation>({
  en: {
    title: 'Audio Visual',
    boardKicker: 'Capture',
    copy: {
      permissionTitle: 'Camera or microphone access required',
      permissionCopy: 'Enable device access to preview, record, and replay shared family media.',
      enableAccess: 'Enable access',
      permissionDenied: 'Access was denied. Check browser permissions and try again.',
      retryPermission: 'Retry permission',
      cameraUnavailable: 'Camera unavailable',
      cameraDisabled: 'Camera disabled',
      microphoneDisabled: 'Microphone disabled',
      cameraOn: 'Camera on',
      cameraOff: 'Camera off',
      frontCamera: 'Front camera',
      rearCamera: 'Rear camera',
      microphoneOn: 'Microphone on',
      microphoneOff: 'Microphone off',
      live: 'Live',
      history: 'History',
      noRecordings: 'No recordings yet',
      takePhoto: 'Take photo',
      recordVideo: 'Record video',
      recordAudio: 'Record audio',
      stopRecording: 'Stop',
      recording: 'Recording',
      uploading: 'Uploading...',
      uploadFailed: 'Upload failed',
      uploadSuccess: 'Upload complete',
      recordingError: 'Recording failed',
      loadFailed: 'History could not be loaded',
      deleteFailed: 'Delete failed',
      deleteConfirmTitle: 'Delete recording?',
      deleteConfirmCopy: 'This cannot be undone.',
      cancelAction: 'Cancel',
      confirmAction: 'Confirm',
      playAction: 'Open',
      closeAction: 'Close',
      deleteAction: 'Delete',
      downloadAction: 'Download',
      audioLevel: 'Audio level',
      peak: 'Peak',
      clipping: 'Clipping',
      fileSize: 'File size',
      duration: 'Duration',
      uploadedBy: 'Uploaded by',
      capturedAt: 'Captured',
      loadMore: 'Load more',
      photoReady: 'Photo ready for upload',
      photoType: 'Photo',
      videoType: 'Video',
      audioType: 'Audio',
    },
  },
  de: {
    title: 'Audio Visual',
    boardKicker: 'Aufnahme',
    copy: {
      permissionTitle: 'Kamera- oder Mikrofonzugriff erforderlich',
      permissionCopy: 'Aktivieren Sie den Geraetezugriff fuer Vorschau, Aufnahme und Wiedergabe gemeinsamer Familienmedien.',
      enableAccess: 'Zugriff aktivieren',
      permissionDenied: 'Der Zugriff wurde verweigert. Pruefen Sie die Browser-Berechtigungen und versuchen Sie es erneut.',
      retryPermission: 'Berechtigung erneut anfragen',
      cameraUnavailable: 'Kamera nicht verfuegbar',
      cameraDisabled: 'Kamera deaktiviert',
      microphoneDisabled: 'Mikrofon deaktiviert',
      cameraOn: 'Kamera an',
      cameraOff: 'Kamera aus',
      frontCamera: 'Frontkamera',
      rearCamera: 'Rueckkamera',
      microphoneOn: 'Mikrofon an',
      microphoneOff: 'Mikrofon aus',
      live: 'Live',
      history: 'Verlauf',
      noRecordings: 'Noch keine Aufnahmen',
      takePhoto: 'Foto aufnehmen',
      recordVideo: 'Video aufnehmen',
      recordAudio: 'Audio aufnehmen',
      stopRecording: 'Stopp',
      recording: 'Aufnahme',
      uploading: 'Wird hochgeladen...',
      uploadFailed: 'Upload fehlgeschlagen',
      uploadSuccess: 'Upload abgeschlossen',
      recordingError: 'Aufnahme fehlgeschlagen',
      loadFailed: 'Verlauf konnte nicht geladen werden',
      deleteFailed: 'Loeschen fehlgeschlagen',
      deleteConfirmTitle: 'Aufnahme loeschen?',
      deleteConfirmCopy: 'Dies kann nicht rueckgaengig gemacht werden.',
      cancelAction: 'Abbrechen',
      confirmAction: 'Bestaetigen',
      playAction: 'Oeffnen',
      closeAction: 'Schliessen',
      deleteAction: 'Loeschen',
      downloadAction: 'Herunterladen',
      audioLevel: 'Audiopegel',
      peak: 'Spitze',
      clipping: 'Uebersteuerung',
      fileSize: 'Dateigroesse',
      duration: 'Dauer',
      uploadedBy: 'Hochgeladen von',
      capturedAt: 'Aufgenommen',
      loadMore: 'Mehr laden',
      photoReady: 'Foto zum Upload bereit',
      photoType: 'Foto',
      videoType: 'Video',
      audioType: 'Audio',
    },
  },
  fr: {
    title: 'Audio Visual',
    boardKicker: 'Capture',
    copy: {
      permissionTitle: 'Acces camera ou microphone requis',
      permissionCopy: 'Activez l acces a l appareil pour la previsualisation, l enregistrement et la lecture des medias familiaux partages.',
      enableAccess: 'Activer l acces',
      permissionDenied: 'L acces a ete refuse. Verifiez les autorisations du navigateur et reessayez.',
      retryPermission: 'Reessayer l autorisation',
      cameraUnavailable: 'Camera indisponible',
      cameraDisabled: 'Camera desactivee',
      microphoneDisabled: 'Microphone desactive',
      cameraOn: 'Camera activee',
      cameraOff: 'Camera desactivee',
      frontCamera: 'Camera avant',
      rearCamera: 'Camera arriere',
      microphoneOn: 'Microphone active',
      microphoneOff: 'Microphone desactive',
      live: 'Direct',
      history: 'Historique',
      noRecordings: 'Aucun enregistrement',
      takePhoto: 'Prendre une photo',
      recordVideo: 'Enregistrer une video',
      recordAudio: 'Enregistrer l audio',
      stopRecording: 'Arreter',
      recording: 'Enregistrement',
      uploading: 'Telechargement...',
      uploadFailed: 'Echec du telechargement',
      uploadSuccess: 'Telechargement termine',
      recordingError: 'Echec de l enregistrement',
      loadFailed: 'Impossible de charger l historique',
      deleteFailed: 'Echec de suppression',
      deleteConfirmTitle: 'Supprimer l enregistrement ?',
      deleteConfirmCopy: 'Cette action est irreversible.',
      cancelAction: 'Annuler',
      confirmAction: 'Confirmer',
      playAction: 'Ouvrir',
      closeAction: 'Fermer',
      deleteAction: 'Supprimer',
      downloadAction: 'Telecharger',
      audioLevel: 'Niveau audio',
      peak: 'Pic',
      clipping: 'Saturation',
      fileSize: 'Taille du fichier',
      duration: 'Duree',
      uploadedBy: 'Telecharge par',
      capturedAt: 'Capture',
      loadMore: 'Charger plus',
      photoReady: 'Photo prete au telechargement',
      photoType: 'Photo',
      videoType: 'Video',
      audioType: 'Audio',
    },
  },
  es: {
    title: 'Audio Visual',
    boardKicker: 'Captura',
    copy: {
      permissionTitle: 'Se requiere acceso a camara o microfono',
      permissionCopy: 'Active el acceso al dispositivo para vista previa, grabacion y reproduccion de medios familiares compartidos.',
      enableAccess: 'Activar acceso',
      permissionDenied: 'Se denego el acceso. Revise los permisos del navegador e intentelo de nuevo.',
      retryPermission: 'Reintentar permiso',
      cameraUnavailable: 'Camara no disponible',
      cameraDisabled: 'Camara desactivada',
      microphoneDisabled: 'Microfono desactivado',
      cameraOn: 'Camara encendida',
      cameraOff: 'Camara apagada',
      frontCamera: 'Camara frontal',
      rearCamera: 'Camara trasera',
      microphoneOn: 'Microfono encendido',
      microphoneOff: 'Microfono apagado',
      live: 'En vivo',
      history: 'Historial',
      noRecordings: 'Aun no hay grabaciones',
      takePhoto: 'Tomar foto',
      recordVideo: 'Grabar video',
      recordAudio: 'Grabar audio',
      stopRecording: 'Detener',
      recording: 'Grabando',
      uploading: 'Subiendo...',
      uploadFailed: 'Error al subir',
      uploadSuccess: 'Carga completada',
      recordingError: 'Error de grabacion',
      loadFailed: 'No se pudo cargar el historial',
      deleteFailed: 'Error al eliminar',
      deleteConfirmTitle: '¿Eliminar grabacion?',
      deleteConfirmCopy: 'Esto no se puede deshacer.',
      cancelAction: 'Cancelar',
      confirmAction: 'Confirmar',
      playAction: 'Abrir',
      closeAction: 'Cerrar',
      deleteAction: 'Eliminar',
      downloadAction: 'Descargar',
      audioLevel: 'Nivel de audio',
      peak: 'Pico',
      clipping: 'Saturacion',
      fileSize: 'Tamano del archivo',
      duration: 'Duracion',
      uploadedBy: 'Subido por',
      capturedAt: 'Capturado',
      loadMore: 'Cargar mas',
      photoReady: 'Foto lista para cargar',
      photoType: 'Foto',
      videoType: 'Video',
      audioType: 'Audio',
    },
  },
})

export const getAudioVisualWidgetTranslation = (languageCode: SupportedLanguageCode) =>
  getWidgetTranslationFromCatalog(audioVisualWidgetTranslationCatalog, languageCode)

export const matchesAudioVisualWidgetTitle = createDefaultWidgetTitleMatcher(
  audioVisualWidgetTranslationCatalog,
)
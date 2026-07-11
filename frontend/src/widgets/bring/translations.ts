import type { SupportedLanguageCode } from '../../i18n/localization'
import type { WidgetTranslationDefinition } from '../widgetTypes'
import {
  createDefaultWidgetTitleMatcher,
  createWidgetTranslationCatalog,
  getWidgetTranslationFromCatalog,
} from '../widgetLocalization'

export interface BringWidgetTranslation extends WidgetTranslationDefinition {
  copy: {
    usernameLabel: string
    passwordLabel: string
    selectedListLabel: string
    selectedListPlaceholder: string
    loadListsAction: string
    saveAction: string
    savedState: string
    savingState: string
    loadingListsState: string
    idleState: string
    passwordStoredHint: string
    currentSelectionMeta: string
    noListsLoadedCopy: string
    settingsLoadFailedState: string
    openItemsMeta: string
    staleMeta: string
    loadingTitle: string
    loadingCopy: string
    notConfiguredTitle: string
    notConfiguredCopy: string
    emptyTitle: string
    emptyCopy: string
    unavailableTitle: string
    unavailableCopy: string
    recentHint: string
  }
  detail: {
    refreshAction: string
    refreshingState: string
    refreshFailedFallback: string
    addSectionTitle: string
    addItemAction: string
    addingItemState: string
    itemNameLabel: string
    itemNamePlaceholder: string
    specificationLabel: string
    specificationPlaceholder: string
    openItemsTitle: string
    recentItemsTitle: string
    recentItemsEmpty: string
    editAction: string
    saveSpecificationAction: string
    cancelEditAction: string
    updateFailedFallback: string
    completeAction: string
    completeFailedFallback: string
    deleteAction: string
    deleteConfirm: string
    deleteFailedFallback: string
    reopenAction: string
    reopenFailedFallback: string
    readOnlyNotice: string
    reconnectTitle: string
    reconnectCopy: string
    openSettingsAction: string
    workingState: string
    staleBanner: string
  }
}

const bringWidgetTranslationCatalog = createWidgetTranslationCatalog<BringWidgetTranslation>({
  en: {
    title: 'Bring',
    boardKicker: 'Bring',
    copy: {
      usernameLabel: 'Bring username or email',
      passwordLabel: 'Bring password',
      selectedListLabel: 'Selected shopping list',
      selectedListPlaceholder: 'Load available Bring lists first',
      loadListsAction: 'Load Bring lists',
      saveAction: 'Save Bring settings',
      savedState: 'Bring settings saved.',
      savingState: 'Saving Bring settings...',
      loadingListsState: 'Loading Bring shopping lists...',
      idleState: 'Enter credentials, load lists, then save the selected list.',
      passwordStoredHint: 'Leave the password empty to keep using the stored Bring password.',
      currentSelectionMeta: 'Saved list: {name}',
      noListsLoadedCopy: 'No Bring shopping lists have been loaded for this account yet.',
      settingsLoadFailedState: 'Failed to load Bring settings.',
      openItemsMeta: '{count} open shopping items',
      staleMeta: 'cached',
      loadingTitle: 'Loading Bring list',
      loadingCopy: 'The selected Bring shopping list is loading from the backend.',
      notConfiguredTitle: 'Bring is not configured',
      notConfiguredCopy: 'Open widget settings, connect your Bring account, and choose one shopping list.',
      emptyTitle: 'No open shopping items',
      emptyCopy: 'The selected Bring shopping list is currently empty.',
      unavailableTitle: 'Bring list unavailable',
      unavailableCopy: 'The selected Bring shopping list could not be loaded right now.',
      recentHint: 'Recent items stay available for reopen flows in the later detail view.',
    },
    detail: {
      refreshAction: 'Refresh',
      refreshingState: 'Refreshing Bring list...',
      refreshFailedFallback: 'Bring list refresh failed.',
      addSectionTitle: 'Add shopping item',
      addItemAction: 'Add item',
      addingItemState: 'Adding item...',
      itemNameLabel: 'Item name',
      itemNamePlaceholder: 'Milk',
      specificationLabel: 'Specification',
      specificationPlaceholder: '2 liters, low fat',
      openItemsTitle: 'Open items',
      recentItemsTitle: 'Recently completed',
      recentItemsEmpty: 'No recent Bring items are available yet.',
      editAction: 'Edit spec',
      saveSpecificationAction: 'Save spec',
      cancelEditAction: 'Cancel',
      updateFailedFallback: 'Bring item update failed.',
      completeAction: 'Complete',
      completeFailedFallback: 'Bring item completion failed.',
      deleteAction: 'Delete',
      deleteConfirm: 'Delete "{name}" from the Bring list?',
      deleteFailedFallback: 'Bring item deletion failed.',
      reopenAction: 'Reopen',
      reopenFailedFallback: 'Bring item reopen failed.',
      readOnlyNotice: 'Cached Bring data is read-only. Refresh the list before changing items.',
      reconnectTitle: 'Reconnect Bring',
      reconnectCopy: 'Open the widget settings to reconnect your Bring account or choose another shopping list.',
      openSettingsAction: 'Open settings',
      workingState: 'Updating Bring list...',
      staleBanner: 'Showing cached Bring data',
    },
    settings: {
      title: 'Bring widget settings',
      description:
        'Connect one Bring account per Subway user, then choose the shopping list used by the widget.',
      fields: {
        username: {
          label: 'Bring username or email',
        },
        password: {
          label: 'Bring password',
          placeholder: 'Stored password will be reused when left empty',
        },
        selectedListUuid: {
          label: 'Selected shopping list',
        },
      },
    },
  },
  de: {
    title: 'Bring',
    boardKicker: 'Bring',
    copy: {
      usernameLabel: 'Bring-Benutzername oder E-Mail',
      passwordLabel: 'Bring-Passwort',
      selectedListLabel: 'Ausgewaehlte Einkaufsliste',
      selectedListPlaceholder: 'Zuerst verfuegbare Bring-Listen laden',
      loadListsAction: 'Bring-Listen laden',
      saveAction: 'Bring-Einstellungen speichern',
      savedState: 'Bring-Einstellungen gespeichert.',
      savingState: 'Bring-Einstellungen werden gespeichert...',
      loadingListsState: 'Bring-Einkaufslisten werden geladen...',
      idleState: 'Zugangsdaten eingeben, Listen laden und dann die ausgewaehlte Liste speichern.',
      passwordStoredHint: 'Lasse das Passwort leer, um das gespeicherte Bring-Passwort weiterzuverwenden.',
      currentSelectionMeta: 'Gespeicherte Liste: {name}',
      noListsLoadedCopy: 'Fuer dieses Konto wurden noch keine Bring-Einkaufslisten geladen.',
      settingsLoadFailedState: 'Bring-Einstellungen konnten nicht geladen werden.',
      openItemsMeta: '{count} offene Einkaufsartikel',
      staleMeta: 'zwischengespeichert',
      loadingTitle: 'Bring-Liste wird geladen',
      loadingCopy: 'Die ausgewaehlte Bring-Einkaufsliste wird gerade aus dem Backend geladen.',
      notConfiguredTitle: 'Bring ist nicht konfiguriert',
      notConfiguredCopy: 'Oeffne die Widget-Einstellungen, verbinde dein Bring-Konto und waehle eine Einkaufsliste aus.',
      emptyTitle: 'Keine offenen Einkaufsartikel',
      emptyCopy: 'Die ausgewaehlte Bring-Einkaufsliste ist momentan leer.',
      unavailableTitle: 'Bring-Liste nicht verfuegbar',
      unavailableCopy: 'Die ausgewaehlte Bring-Einkaufsliste konnte momentan nicht geladen werden.',
      recentHint: 'Zuletzt erledigte Artikel bleiben fuer spaetere Wiederherstellungsablaeufe verfuegbar.',
    },
    detail: {
      refreshAction: 'Aktualisieren',
      refreshingState: 'Bring-Liste wird aktualisiert...',
      refreshFailedFallback: 'Bring-Liste konnte nicht aktualisiert werden.',
      addSectionTitle: 'Einkaufsartikel hinzufuegen',
      addItemAction: 'Artikel hinzufuegen',
      addingItemState: 'Artikel wird hinzugefuegt...',
      itemNameLabel: 'Artikelname',
      itemNamePlaceholder: 'Milch',
      specificationLabel: 'Spezifikation',
      specificationPlaceholder: '2 Liter, fettarm',
      openItemsTitle: 'Offene Artikel',
      recentItemsTitle: 'Zuletzt erledigt',
      recentItemsEmpty: 'Noch keine zuletzt erledigten Bring-Artikel verfuegbar.',
      editAction: 'Spezifikation bearbeiten',
      saveSpecificationAction: 'Spezifikation speichern',
      cancelEditAction: 'Abbrechen',
      updateFailedFallback: 'Bring-Artikel konnte nicht aktualisiert werden.',
      completeAction: 'Erledigen',
      completeFailedFallback: 'Bring-Artikel konnte nicht erledigt werden.',
      deleteAction: 'Loeschen',
      deleteConfirm: '"{name}" aus der Bring-Liste loeschen?',
      deleteFailedFallback: 'Bring-Artikel konnte nicht geloescht werden.',
      reopenAction: 'Wieder oeffnen',
      reopenFailedFallback: 'Bring-Artikel konnte nicht erneut geoeffnet werden.',
      readOnlyNotice: 'Zwischengespeicherte Bring-Daten sind schreibgeschuetzt. Aktualisiere die Liste, bevor du Artikel aenderst.',
      reconnectTitle: 'Bring neu verbinden',
      reconnectCopy: 'Oeffne die Widget-Einstellungen, um dein Bring-Konto neu zu verbinden oder eine andere Einkaufsliste auszuwaehlen.',
      openSettingsAction: 'Einstellungen oeffnen',
      workingState: 'Bring-Liste wird aktualisiert...',
      staleBanner: 'Zwischengespeicherte Bring-Daten werden angezeigt',
    },
    settings: {
      title: 'Bring-Widget-Einstellungen',
      description:
        'Verbinde pro Subway-Benutzer ein Bring-Konto und waehle dann die vom Widget verwendete Einkaufsliste aus.',
      fields: {
        username: {
          label: 'Bring-Benutzername oder E-Mail',
        },
        password: {
          label: 'Bring-Passwort',
          placeholder: 'Gespeichertes Passwort wird weiterverwendet, wenn das Feld leer bleibt',
        },
        selectedListUuid: {
          label: 'Ausgewaehlte Einkaufsliste',
        },
      },
    },
  },
  fr: {
    title: 'Bring',
    boardKicker: 'Bring',
    copy: {
      usernameLabel: 'Nom d utilisateur ou e-mail Bring',
      passwordLabel: 'Mot de passe Bring',
      selectedListLabel: 'Liste de courses selectionnee',
      selectedListPlaceholder: 'Chargez d abord les listes Bring disponibles',
      loadListsAction: 'Charger les listes Bring',
      saveAction: 'Enregistrer les reglages Bring',
      savedState: 'Reglages Bring enregistres.',
      savingState: 'Enregistrement des reglages Bring...',
      loadingListsState: 'Chargement des listes Bring...',
      idleState: 'Saisissez les identifiants, chargez les listes, puis enregistrez la liste selectionnee.',
      passwordStoredHint: 'Laissez le mot de passe vide pour reutiliser le mot de passe Bring deja stocke.',
      currentSelectionMeta: 'Liste enregistree : {name}',
      noListsLoadedCopy: 'Aucune liste Bring n a encore ete chargee pour ce compte.',
      settingsLoadFailedState: 'Impossible de charger les reglages Bring.',
      openItemsMeta: '{count} articles ouverts',
      staleMeta: 'en cache',
      loadingTitle: 'Chargement de la liste Bring',
      loadingCopy: 'La liste Bring selectionnee est en cours de chargement depuis le backend.',
      notConfiguredTitle: 'Bring n est pas configure',
      notConfiguredCopy: 'Ouvrez les reglages du widget, connectez votre compte Bring et choisissez une liste de courses.',
      emptyTitle: 'Aucun article ouvert',
      emptyCopy: 'La liste Bring selectionnee est actuellement vide.',
      unavailableTitle: 'Liste Bring indisponible',
      unavailableCopy: 'La liste Bring selectionnee n a pas pu etre chargee pour le moment.',
      recentHint: 'Les articles recents restent disponibles pour de futurs flux de reouverture dans la vue detaillee.',
    },
    detail: {
      refreshAction: 'Actualiser',
      refreshingState: 'Actualisation de la liste Bring...',
      refreshFailedFallback: 'L actualisation de la liste Bring a echoue.',
      addSectionTitle: 'Ajouter un article',
      addItemAction: 'Ajouter l article',
      addingItemState: 'Ajout de l article...',
      itemNameLabel: 'Nom de l article',
      itemNamePlaceholder: 'Lait',
      specificationLabel: 'Specification',
      specificationPlaceholder: '2 litres, demi-ecreme',
      openItemsTitle: 'Articles ouverts',
      recentItemsTitle: 'Recemment termines',
      recentItemsEmpty: 'Aucun article Bring recent n est disponible pour le moment.',
      editAction: 'Modifier la specification',
      saveSpecificationAction: 'Enregistrer la specification',
      cancelEditAction: 'Annuler',
      updateFailedFallback: 'La mise a jour de l article Bring a echoue.',
      completeAction: 'Terminer',
      completeFailedFallback: 'La validation de l article Bring a echoue.',
      deleteAction: 'Supprimer',
      deleteConfirm: 'Supprimer "{name}" de la liste Bring ?',
      deleteFailedFallback: 'La suppression de l article Bring a echoue.',
      reopenAction: 'Reouvrir',
      reopenFailedFallback: 'La reouverture de l article Bring a echoue.',
      readOnlyNotice: 'Les donnees Bring en cache sont en lecture seule. Actualisez la liste avant de modifier les articles.',
      reconnectTitle: 'Reconnecter Bring',
      reconnectCopy: 'Ouvrez les reglages du widget pour reconnecter votre compte Bring ou choisir une autre liste de courses.',
      openSettingsAction: 'Ouvrir les reglages',
      workingState: 'Mise a jour de la liste Bring...',
      staleBanner: 'Affichage des donnees Bring en cache',
    },
    settings: {
      title: 'Reglages du widget Bring',
      description:
        'Connectez un compte Bring par utilisateur Subway puis choisissez la liste de courses utilisee par le widget.',
      fields: {
        username: {
          label: 'Nom d utilisateur ou e-mail Bring',
        },
        password: {
          label: 'Mot de passe Bring',
          placeholder: 'Le mot de passe stocke sera reutilise si le champ reste vide',
        },
        selectedListUuid: {
          label: 'Liste de courses selectionnee',
        },
      },
    },
  },
  es: {
    title: 'Bring',
    boardKicker: 'Bring',
    copy: {
      usernameLabel: 'Usuario o correo de Bring',
      passwordLabel: 'Contrasena de Bring',
      selectedListLabel: 'Lista de compras seleccionada',
      selectedListPlaceholder: 'Primero carga las listas disponibles de Bring',
      loadListsAction: 'Cargar listas de Bring',
      saveAction: 'Guardar configuracion de Bring',
      savedState: 'Configuracion de Bring guardada.',
      savingState: 'Guardando configuracion de Bring...',
      loadingListsState: 'Cargando listas de Bring...',
      idleState: 'Introduce las credenciales, carga las listas y despues guarda la lista seleccionada.',
      passwordStoredHint: 'Deja la contrasena vacia para seguir usando la contrasena de Bring ya guardada.',
      currentSelectionMeta: 'Lista guardada: {name}',
      noListsLoadedCopy: 'Todavia no se han cargado listas de Bring para esta cuenta.',
      settingsLoadFailedState: 'No se pudo cargar la configuracion de Bring.',
      openItemsMeta: '{count} articulos abiertos',
      staleMeta: 'en cache',
      loadingTitle: 'Cargando lista de Bring',
      loadingCopy: 'La lista de compras seleccionada de Bring se esta cargando desde el backend.',
      notConfiguredTitle: 'Bring no esta configurado',
      notConfiguredCopy: 'Abre la configuracion del widget, conecta tu cuenta de Bring y elige una lista de compras.',
      emptyTitle: 'No hay articulos abiertos',
      emptyCopy: 'La lista de compras seleccionada de Bring esta vacia en este momento.',
      unavailableTitle: 'Lista de Bring no disponible',
      unavailableCopy: 'La lista de compras seleccionada de Bring no se pudo cargar ahora mismo.',
      recentHint: 'Los articulos recientes siguen disponibles para futuros flujos de reapertura en la vista detallada.',
    },
    detail: {
      refreshAction: 'Actualizar',
      refreshingState: 'Actualizando lista de Bring...',
      refreshFailedFallback: 'La actualizacion de la lista de Bring fallo.',
      addSectionTitle: 'Agregar articulo',
      addItemAction: 'Agregar articulo',
      addingItemState: 'Agregando articulo...',
      itemNameLabel: 'Nombre del articulo',
      itemNamePlaceholder: 'Leche',
      specificationLabel: 'Especificacion',
      specificationPlaceholder: '2 litros, semidesnatada',
      openItemsTitle: 'Articulos abiertos',
      recentItemsTitle: 'Completados recientemente',
      recentItemsEmpty: 'Todavia no hay articulos recientes de Bring disponibles.',
      editAction: 'Editar especificacion',
      saveSpecificationAction: 'Guardar especificacion',
      cancelEditAction: 'Cancelar',
      updateFailedFallback: 'La actualizacion del articulo de Bring fallo.',
      completeAction: 'Completar',
      completeFailedFallback: 'No se pudo completar el articulo de Bring.',
      deleteAction: 'Eliminar',
      deleteConfirm: 'Eliminar "{name}" de la lista de Bring?',
      deleteFailedFallback: 'No se pudo eliminar el articulo de Bring.',
      reopenAction: 'Reabrir',
      reopenFailedFallback: 'No se pudo reabrir el articulo de Bring.',
      readOnlyNotice: 'Los datos de Bring en cache son de solo lectura. Actualiza la lista antes de cambiar articulos.',
      reconnectTitle: 'Reconectar Bring',
      reconnectCopy: 'Abre la configuracion del widget para reconectar tu cuenta de Bring o elegir otra lista de compras.',
      openSettingsAction: 'Abrir configuracion',
      workingState: 'Actualizando lista de Bring...',
      staleBanner: 'Mostrando datos de Bring en cache',
    },
    settings: {
      title: 'Configuracion del widget Bring',
      description:
        'Conecta una cuenta de Bring por usuario de Subway y luego elige la lista de compras que usa el widget.',
      fields: {
        username: {
          label: 'Usuario o correo de Bring',
        },
        password: {
          label: 'Contrasena de Bring',
          placeholder: 'La contrasena guardada se reutiliza si el campo queda vacio',
        },
        selectedListUuid: {
          label: 'Lista de compras seleccionada',
        },
      },
    },
  },
})

export const getBringWidgetTranslation = (languageCode: SupportedLanguageCode) =>
  getWidgetTranslationFromCatalog(bringWidgetTranslationCatalog, languageCode)

export const matchesBringWidgetTitle = createDefaultWidgetTitleMatcher(
  bringWidgetTranslationCatalog,
)

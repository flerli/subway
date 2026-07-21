import { createLocalizedBundle } from './localization'

export interface AppTextBundle {
  auth: {
    sessionBootstrapKicker: string
    sessionBootstrapTitle: string
    sessionBootstrapCopy: string
    heroKicker: string
    introParagraphOne: string
    introParagraphTwo: string
    introParagraphThree: string
    signInKicker: string
    signInTitle: string
    signInCopy: string
    usernameLabel: string
    usernamePlaceholder: string
    passwordLabel: string
    passwordPlaceholder: string
    signInAction: string
    signingInAction: string
    authenticatedSessionKicker: string
    authenticatedSessionTitle: string
    authenticatedSessionCopy: string
  }
  shell: {
    familySettingsTitle: string
    assistantTitle: string
    boardTab: string
    assistantTab: string
    settingsTab: string
    signOutAction: string
    signingOutAction: string
  }
  assistant: {
    kicker: string
    title: string
    introCopy: string
    newThreadAction: string
    creatingThreadAction: string
    threadListTitle: string
    threadListCopy: string
    emptyThreadListTitle: string
    emptyThreadListCopy: string
    transcriptTitle: string
    noThreadSelectedTitle: string
    noThreadSelectedCopy: string
    emptyTranscriptTitle: string
    emptyTranscriptCopy: string
    activeRouteLabel: string
    backendKindLabel: string
    streamingCapabilityLabel: string
    toolsCapabilityLabel: string
    markdownCapabilityLabel: string
    enabledValue: string
    disabledValue: string
    availabilityAvailable: string
    availabilityNotConfigured: string
    availabilityDisabled: string
    availabilityUnavailable: string
    availabilityTitle: string
    notConfiguredCopy: string
    disabledCopy: string
    unavailableCopy: string
    openThreadAriaLabel: string
    routeUnknownValue: string
    modelSelectionManagedCopy: string
    untitledThreadTitle: string
    messageCountMeta: string
    composerLabel: string
    composerPlaceholder: string
    composerNoThreadCopy: string
    composerUnavailableCopy: string
    turnStatusLabel: string
    turnStateIdle: string
    turnStateSending: string
    turnStateStreaming: string
    turnStateCompleted: string
    turnStateFailed: string
    sendAction: string
    roleUser: string
    roleAssistant: string
    roleSystem: string
    roleTool: string
    deleteConversationAction: string
    deleteConversationConfirm: string
    toolActivityTitle: string
    toolArgumentsLabel: string
    toolResultLabel: string
    toolErrorLabel: string
    toolServerLabel: string
    toolStatusRunning: string
    toolStatusCompleted: string
    toolStatusError: string
    toolRedactedValue: string
  }
  filters: {
    allLabel: string
    householdViewCaption: string
    memberFocusCaption: string
  }
  settings: {
    panelKicker: string
    familyMembersTitle: string
    familyMembersMeta: string
    familyMembersCopy: string
    memberEditorCopy: string
    firstNameLabel: string
    firstNamePlaceholder: string
    colorLabel: string
    systemKicker: string
    systemHubTitle: string
    systemHubCopy: string
    systemTitle: string
    systemDescription: string
    buildVersionLabel: string
    latestDeploymentLabel: string
    runtimeUnavailableValue: string
    familyHubCopy: string
    languageKicker: string
    languageTitle: string
    languageDescription: string
    languageLabel: string
    languagePersistenceNote: string
    languageSavingNote: string
    languageLoadFailed: string
    languageSaveFailed: string
    countryKicker: string
    countryTitle: string
    countryDescription: string
    countryLabel: string
    countryPlaceholder: string
    countryFormatNote: string
    countryPersistenceNote: string
    countrySavingNote: string
    countrySaveAction: string
    displayKicker: string
    displayTitle: string
    displayDescription: string
    fullscreenEnterAction: string
    fullscreenExitAction: string
    fullscreenActiveState: string
    fullscreenInactiveState: string
    addMemberKicker: string
    addMemberTitle: string
    addMemberAction: string
    deleteMemberAction: string
    deletingMemberAction: string
    deleteMemberConfirm: string
    openSystemPanelAriaLabel: string
    openFamilyPanelAriaLabel: string
    closeExpandedPanelAriaLabel: string
    noExpandedPanelTitle: string
    noExpandedPanelCopy: string
  }
  boardHost: {
    expandAction: string
    collapseAction: string
    expandAriaLabel: string
    collapseAriaLabel: string
    filtersAriaLabel: string
    serviceBoardZoneLabel: string
    cellZoneLabel: string
    widgetGridAriaLabel: string
    expandedWidgetViewAriaLabel: string
    serviceBoardEmptyTitle: string
    serviceBoardEmptyCopy: string
    noExpandedWidgetTitle: string
    noExpandedWidgetCopy: string
  }
  widgetAdmin: {
    pendingSync: string
    syncing: string
    synced: string
    syncFailed: string
    idle: string
    openSettingsAction: string
    titleLabel: string
    letterLabel: string
    colorLabel: string
    sourceLabel: string
    scopeHeading: string
    allScopeAction: string
    allScopeAriaLabel: string
    cellsHeading: string
    toggleCellAriaLabel: string
  }
  widgetSettingsHost: {
    saveAction: string
    savingState: string
    savedState: string
    saveFailedState: string
    pendingChangesState: string
    expandedWidgetViewAriaLabel: string
    noExpandedWidgetTitle: string
    noExpandedWidgetCopy: string
  }
  debug: {
    kicker: string
    title: string
    copy: string
    closeAction: string
    performanceTitle: string
    sourceLabel: string
    scopeLabel: string
    visibleNowLabel: string
    yesValue: string
    noValue: string
    placementLabel: string
    refreshLabel: string
    lastRefreshLabel: string
    itemsLabel: string
    failureLabel: string
    lastInteractionLabel: string
    interactionDurationLabel: string
    interactionMeasuredAtLabel: string
    longTaskCountLabel: string
    longestLongTaskLabel: string
    lastLongTaskLabel: string
    notAvailableValue: string
    noneValue: string
    allMembersScope: string
    memberScope: string
    membersScope: string
    refreshStatusIdle: string
    refreshStatusOk: string
    refreshStatusLive: string
    refreshStatusCached: string
    refreshStatusStatic: string
    refreshStatusError: string
  }
  messages: {
    authSessionExpired: string
    authVerifySessionFailed: string
    authCredentialsRequired: string
    authInvalidCredentials: string
    authSignInFailed: string
    authSignOutFailed: string
    widgetSettingsUnavailable: string
    familyMembersSyncUnavailable: string
    widgetMetadataUnavailable: string
    weatherLoadFailed: string
    calendarLoadFailed: string
    todoLoadFailed: string
    familyMemberPersistFailed: string
    familyMemberCreateFailed: string
    familyMemberDeleteFailed: string
    todoUpdateFailed: string
    widgetSettingsSaveFailed: string
    widgetMetadataSaveFailed: string
    assistantLoadFailed: string
    assistantCreateThreadFailed: string
    assistantSendFailed: string
  }
}

export const appTextCatalog = createLocalizedBundle<AppTextBundle>({
  en: {
    auth: {
      sessionBootstrapKicker: 'Session bootstrap',
      sessionBootstrapTitle: 'Restoring access',
      sessionBootstrapCopy:
        'Checking for an existing session before loading the protected board.',
      heroKicker: 'NYC subway-style access',
      introParagraphOne:
        'The subway is a rapid transit system built to move large numbers of people through one connected city network.',
      introParagraphTwo:
        'Its route bullets, colors, and signs make a complicated map readable in just a few seconds.',
      introParagraphThree:
        'This board borrows that design language so household information feels as clear as a station platform.',
      signInKicker: 'Sign in',
      signInTitle: 'Enter the board',
      signInCopy: 'Login is required before personal subway data and settings are shown.',
      usernameLabel: 'Username',
      usernamePlaceholder: 'Username',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Password',
      signInAction: 'Sign in',
      signingInAction: 'Signing in...',
      authenticatedSessionKicker: 'Authenticated session',
      authenticatedSessionTitle: 'Loading {username}',
      authenticatedSessionCopy:
        'Restoring widgets, members, and saved settings for this account.',
    },
    shell: {
      familySettingsTitle: 'Family settings',
      assistantTitle: 'Assistant',
      boardTab: 'Board',
      assistantTab: 'Assistant',
      settingsTab: 'Settings',
      signOutAction: 'Log out',
      signingOutAction: 'Signing out...',
    },
    assistant: {
      kicker: 'AI section',
      title: 'Assistant threads',
      introCopy:
        'This section owns persistent per-user AI conversations outside the widget board. Provider routing stays admin-managed.',
      newThreadAction: 'New conversation',
      creatingThreadAction: 'Creating...',
      threadListTitle: 'Saved conversations',
      threadListCopy:
        'Threads are stored per authenticated user and reopen from the backend transcript store.',
      emptyThreadListTitle: 'No conversations yet',
      emptyThreadListCopy:
        'Create the first assistant thread now. Message sending arrives in the next issue.',
      transcriptTitle: 'Transcript',
      noThreadSelectedTitle: 'No conversation selected',
      noThreadSelectedCopy:
        'Choose a saved conversation on the left or create a new one to reserve its transcript.',
      emptyTranscriptTitle: 'Transcript is empty',
      emptyTranscriptCopy:
        'This thread exists and is persisted, but no messages have been written yet.',
      activeRouteLabel: 'Active route',
      backendKindLabel: 'Backend kind',
      streamingCapabilityLabel: 'Streaming',
      toolsCapabilityLabel: 'Tools',
      markdownCapabilityLabel: 'Markdown',
      enabledValue: 'Enabled',
      disabledValue: 'Disabled',
      availabilityAvailable: 'Available',
      availabilityNotConfigured: 'Not configured',
      availabilityDisabled: 'Disabled',
      availabilityUnavailable: 'Unavailable',
      availabilityTitle: 'Assistant availability',
      notConfiguredCopy:
        'No admin-managed assistant route is active yet. Add an assistant backend route in server configuration first.',
      disabledCopy:
        'An assistant route exists but is disabled by configuration. End users can view threads but cannot use the runtime yet.',
      unavailableCopy:
        'An assistant route exists but is incomplete or unavailable. Check the admin-managed server configuration.',
      openThreadAriaLabel: 'Open conversation {title}',
      routeUnknownValue: 'n/a',
      modelSelectionManagedCopy:
        'Model and backend selection are managed centrally by admins and are not exposed in this user view.',
      untitledThreadTitle: 'Untitled conversation',
      messageCountMeta: '{count} messages',
      composerLabel: 'Message',
      composerPlaceholder: 'Write a message to the assistant...',
      composerNoThreadCopy: 'Select or create a conversation before sending a message.',
      composerUnavailableCopy:
        'Assistant message sending is unavailable until a working admin-managed route is active.',
      turnStatusLabel: 'Turn status',
      turnStateIdle: 'Idle',
      turnStateSending: 'Sending',
      turnStateStreaming: 'Streaming',
      turnStateCompleted: 'Completed',
      turnStateFailed: 'Failed',
      sendAction: 'Send message',
      roleUser: 'You',
      roleAssistant: 'Assistant',
      roleSystem: 'System',
      roleTool: 'Tool',
      deleteConversationAction: 'Delete',
      deleteConversationConfirm: 'Delete conversation "{title}"?',
      toolActivityTitle: 'Tool activity',
      toolArgumentsLabel: 'Arguments',
      toolResultLabel: 'Result',
      toolErrorLabel: 'Error',
      toolServerLabel: 'Server',
      toolStatusRunning: 'Running',
      toolStatusCompleted: 'Completed',
      toolStatusError: 'Error',
      toolRedactedValue: '[redacted]',
    },
    filters: {
      allLabel: 'All',
      householdViewCaption: 'Household view',
      memberFocusCaption: 'Member focus',
    },
    settings: {
      panelKicker: 'Settings',
      familyMembersTitle: 'Family members',
      familyMembersMeta: '{count} active members',
      familyMembersCopy:
        'Add family members, choose a color for each person, and use the first letter of the forename as the circle badge across the kiosk. Widget headers use their configured badge letter and color.',
      memberEditorCopy: 'This initial and color are used in filters and member badges.',
      firstNameLabel: 'Forename',
      firstNamePlaceholder: 'Forename',
      colorLabel: 'Color',
      systemKicker: 'System',
      systemHubTitle: 'System',
      systemHubCopy:
        'Open build, language, home country, and display settings for this screen and account.',
      systemTitle: 'Build and deployment',
      systemDescription:
        'Reference details for the version currently running on this screen and the most recent deployment detected by the app runtime.',
      buildVersionLabel: 'Build ID',
      latestDeploymentLabel: 'Latest deployment',
      runtimeUnavailableValue: 'n/a',
      familyHubCopy:
        'Open the family roster to add members, rename them, and update their colors.',
      languageKicker: 'Language',
      languageTitle: 'Display language',
      languageDescription:
        'Choose the shared application language for this account. The preference is restored after login and on other devices.',
      languageLabel: 'Language',
      languagePersistenceNote: 'This preference is saved for your account.',
      languageSavingNote: 'Saving language preference...',
      languageLoadFailed:
        'Failed to load the saved application preferences. Default language and home country are being used.',
      languageSaveFailed: 'Failed to save the application preferences to the backend.',
      countryKicker: 'Home country',
      countryTitle: 'Domestic reference country',
      countryDescription:
        'Set the two-letter ISO country code used to classify future calendar events as domestic or foreign for this account.',
      countryLabel: 'Country code',
      countryPlaceholder: 'DE',
      countryFormatNote: 'Use a two-letter ISO code such as DE, FR, or US.',
      countryPersistenceNote: 'This reference country is saved for your account.',
      countrySavingNote: 'Saving country preference...',
      countrySaveAction: 'Save home country',
      displayKicker: 'Display',
      displayTitle: 'Fullscreen mode',
      displayDescription:
        'Switch the kiosk between browser fullscreen mode and normal window mode on this device.',
      fullscreenEnterAction: 'Enter fullscreen',
      fullscreenExitAction: 'Exit fullscreen',
      fullscreenActiveState: 'Fullscreen is active.',
      fullscreenInactiveState: 'Fullscreen is inactive.',
      addMemberKicker: 'Add member',
      addMemberTitle: 'New roster entry',
      addMemberAction: 'Add family member',
      deleteMemberAction: 'Delete family member',
      deletingMemberAction: 'Deleting...',
      deleteMemberConfirm:
        'Delete {firstName} from the family roster? This cannot be undone.',
      openSystemPanelAriaLabel: 'Open system settings in the lower panel',
      openFamilyPanelAriaLabel: 'Open family member settings in the lower panel',
      closeExpandedPanelAriaLabel: 'Close expanded settings panel',
      noExpandedPanelTitle: 'No settings panel selected',
      noExpandedPanelCopy:
        'Open System or Family members to edit them in the lower panel.',
    },
    boardHost: {
      expandAction: 'Expand',
      collapseAction: 'Close',
      expandAriaLabel: 'Expand {title} into the lower panel',
      collapseAriaLabel: 'Collapse {title} expanded view',
      filtersAriaLabel: 'Household filters',
      serviceBoardZoneLabel: 'Family service board',
      cellZoneLabel: 'Cell {cellId}',
      widgetGridAriaLabel: 'Two-column widget grid',
      expandedWidgetViewAriaLabel: 'Expanded widget view',
      serviceBoardEmptyTitle: 'Family service board is empty',
      serviceBoardEmptyCopy:
        'Assign the arrival board to the Family service board zone in settings.',
      noExpandedWidgetTitle: 'No widget selected',
      noExpandedWidgetCopy:
        'The lower section stays reserved for an expanded widget view.',
    },
    widgetAdmin: {
      pendingSync: 'Pending sync',
      syncing: 'Syncing...',
      synced: 'Synced',
      syncFailed: 'Sync failed',
      idle: 'Idle',
      openSettingsAction: 'Open',
      titleLabel: 'Title',
      letterLabel: 'Letter',
      colorLabel: 'Color',
      sourceLabel: 'Source',
      scopeHeading: 'Scope',
      allScopeAction: 'All',
      allScopeAriaLabel: 'All members scope',
      cellsHeading: 'Cells',
      toggleCellAriaLabel: 'Toggle {zoneLabel}',
    },
    widgetSettingsHost: {
      saveAction: 'Save widget settings',
      savingState: 'Saving...',
      savedState: 'Saved.',
      saveFailedState: 'Save failed.',
      pendingChangesState: 'Pending changes.',
      expandedWidgetViewAriaLabel: 'Expanded widget settings view',
      noExpandedWidgetTitle: 'No widget settings selected',
      noExpandedWidgetCopy:
        'Select Expand on a widget settings card to open its specific settings below.',
    },
    debug: {
      kicker: 'Maintenance',
      title: 'Widget diagnostics',
      copy: 'Hidden overlay for source, scope, refresh status, and failure inspection.',
      closeAction: 'Close',
      performanceTitle: 'Performance',
      sourceLabel: 'Source',
      scopeLabel: 'Scope',
      visibleNowLabel: 'Visible now',
      yesValue: 'yes',
      noValue: 'no',
      placementLabel: 'Placement',
      refreshLabel: 'Refresh',
      lastRefreshLabel: 'Last refresh',
      itemsLabel: 'Items',
      failureLabel: 'Failure',
      lastInteractionLabel: 'Last interaction',
      interactionDurationLabel: 'Click to paint',
      interactionMeasuredAtLabel: 'Measured at',
      longTaskCountLabel: 'Long tasks',
      longestLongTaskLabel: 'Longest long task',
      lastLongTaskLabel: 'Last long task',
      notAvailableValue: 'n/a',
      noneValue: 'none',
      allMembersScope: 'All members',
      memberScope: 'Member: {memberId}',
      membersScope: 'Members: {memberIds}',
      refreshStatusIdle: 'idle',
      refreshStatusOk: 'ok',
      refreshStatusLive: 'live',
      refreshStatusCached: 'cached',
      refreshStatusStatic: 'static',
      refreshStatusError: 'error',
    },
    messages: {
      authSessionExpired: 'Your session expired. Please sign in again.',
      authVerifySessionFailed: 'Failed to verify the current session. Please sign in again.',
      authCredentialsRequired: 'Username and password are required.',
      authInvalidCredentials: 'Invalid username or password.',
      authSignInFailed: 'Failed to sign in to the backend.',
      authSignOutFailed: 'Failed to sign out from the backend. Try again.',
      widgetSettingsUnavailable:
        'Backend widget settings unavailable. Default widget settings are being used.',
      familyMembersSyncUnavailable:
        'Backend sync unavailable. Family members shown below may not be current.',
      widgetMetadataUnavailable:
        'Backend widget metadata unavailable. Widget board contents may be incomplete until the connection returns.',
      weatherLoadFailed:
        'Failed to load live weather data from the backend weather widget path.',
      calendarLoadFailed:
        'Failed to load calendar events from the backend calendar widget path.',
      todoLoadFailed: 'Failed to load todo items from the backend todo widget path.',
      familyMemberPersistFailed: 'Failed to persist family-member changes to the backend.',
      familyMemberCreateFailed: 'Failed to create the family member in the backend.',
      familyMemberDeleteFailed: 'Failed to delete the family member in the backend.',
      todoUpdateFailed: 'Failed to update todo item state in the backend.',
      widgetSettingsSaveFailed: 'Failed to persist widget settings to the backend.',
      widgetMetadataSaveFailed: 'Failed to persist widget metadata to the backend.',
      assistantLoadFailed: 'Failed to load the assistant foundation from the backend.',
      assistantCreateThreadFailed: 'Failed to create a new assistant conversation.',
      assistantSendFailed: 'Failed to send the assistant message.',
    },
  },
  de: {
    auth: {
      sessionBootstrapKicker: 'Sitzungsstart',
      sessionBootstrapTitle: 'Zugang wird wiederhergestellt',
      sessionBootstrapCopy:
        'Eine bestehende Sitzung wird geprueft, bevor das geschuetzte Board geladen wird.',
      heroKicker: 'Zugang im NYC-U-Bahn-Stil',
      introParagraphOne:
        'Die U-Bahn ist ein Schnellverkehrssystem, das viele Menschen durch ein verbundenes Stadtnetz bewegt.',
      introParagraphTwo:
        'Linienpunkte, Farben und Beschilderung machen einen komplexen Plan in Sekunden lesbar.',
      introParagraphThree:
        'Dieses Board uebernimmt diese Gestaltungssprache, damit Haushaltsinformationen so klar wie ein Bahnsteig wirken.',
      signInKicker: 'Anmelden',
      signInTitle: 'Board betreten',
      signInCopy:
        'Eine Anmeldung ist erforderlich, bevor persoenliche Subway-Daten und Einstellungen angezeigt werden.',
      usernameLabel: 'Benutzername',
      usernamePlaceholder: 'Benutzername',
      passwordLabel: 'Passwort',
      passwordPlaceholder: 'Passwort',
      signInAction: 'Anmelden',
      signingInAction: 'Anmeldung laeuft...',
      authenticatedSessionKicker: 'Authentifizierte Sitzung',
      authenticatedSessionTitle: '{username} wird geladen',
      authenticatedSessionCopy:
        'Widgets, Mitglieder und gespeicherte Einstellungen werden fuer dieses Konto wiederhergestellt.',
    },
    shell: {
      familySettingsTitle: 'Familieneinstellungen',
      assistantTitle: 'Assistent',
      boardTab: 'Board',
      assistantTab: 'Assistent',
      settingsTab: 'Einstellungen',
      signOutAction: 'Abmelden',
      signingOutAction: 'Abmeldung laeuft...',
    },
    assistant: {
      kicker: 'KI Bereich',
      title: 'Assistent Threads',
      introCopy:
        'Dieser Bereich verwaltet persistente KI Gesprache pro Benutzer ausserhalb des Widget Boards. Das Routing bleibt adminverwaltet.',
      newThreadAction: 'Neue Unterhaltung',
      creatingThreadAction: 'Wird erstellt...',
      threadListTitle: 'Gespeicherte Unterhaltungen',
      threadListCopy:
        'Threads werden pro angemeldetem Benutzer gespeichert und aus dem Backend wieder geoffnet.',
      emptyThreadListTitle: 'Noch keine Unterhaltungen',
      emptyThreadListCopy:
        'Erstelle jetzt den ersten Assistenten Thread. Das Senden von Nachrichten kommt im nachsten Issue.',
      transcriptTitle: 'Transkript',
      noThreadSelectedTitle: 'Keine Unterhaltung ausgewahlt',
      noThreadSelectedCopy:
        'Wahle links eine gespeicherte Unterhaltung oder erstelle eine neue, um das Transkript zu reservieren.',
      emptyTranscriptTitle: 'Transkript ist leer',
      emptyTranscriptCopy:
        'Dieser Thread existiert und ist gespeichert, aber es wurden noch keine Nachrichten geschrieben.',
      activeRouteLabel: 'Aktive Route',
      backendKindLabel: 'Backend Typ',
      streamingCapabilityLabel: 'Streaming',
      toolsCapabilityLabel: 'Tools',
      markdownCapabilityLabel: 'Markdown',
      enabledValue: 'Aktiv',
      disabledValue: 'Deaktiviert',
      availabilityAvailable: 'Verfugbar',
      availabilityNotConfigured: 'Nicht konfiguriert',
      availabilityDisabled: 'Deaktiviert',
      availabilityUnavailable: 'Nicht verfugbar',
      availabilityTitle: 'Assistent Verfugbarkeit',
      notConfiguredCopy:
        'Noch keine adminverwaltete Assistent Route aktiv. Zuerst eine Assistant Backend Route in der Serverkonfiguration hinterlegen.',
      disabledCopy:
        'Eine Assistent Route existiert, ist aber per Konfiguration deaktiviert. Benutzer konnen Threads sehen, aber die Laufzeit noch nicht verwenden.',
      unavailableCopy:
        'Eine Assistent Route existiert, ist aber unvollstandig oder nicht verfugbar. Bitte die adminverwaltete Serverkonfiguration prufen.',
      openThreadAriaLabel: 'Unterhaltung {title} offnen',
      routeUnknownValue: 'k. A.',
      modelSelectionManagedCopy:
        'Modell und Backend Auswahl werden zentral von Admins verwaltet und in dieser Benutzeransicht nicht angeboten.',
      untitledThreadTitle: 'Unbenannte Unterhaltung',
      messageCountMeta: '{count} Nachrichten',
      composerLabel: 'Nachricht',
      composerPlaceholder: 'Schreibe eine Nachricht an den Assistenten...',
      composerNoThreadCopy:
        'Waehle oder erstelle zuerst eine Unterhaltung, bevor du eine Nachricht sendest.',
      composerUnavailableCopy:
        'Assistent Nachrichten sind erst verfuegbar, wenn eine funktionierende adminverwaltete Route aktiv ist.',
      turnStatusLabel: 'Turn Status',
      turnStateIdle: 'Leerlauf',
      turnStateSending: 'Wird gesendet',
      turnStateStreaming: 'Streaming',
      turnStateCompleted: 'Abgeschlossen',
      turnStateFailed: 'Fehlgeschlagen',
      sendAction: 'Nachricht senden',
      roleUser: 'Du',
      roleAssistant: 'Assistent',
      roleSystem: 'System',
      roleTool: 'Tool',
      deleteConversationAction: 'Loschen',
      deleteConversationConfirm: 'Unterhaltung "{title}" loschen?',
      toolActivityTitle: 'Tool Aktivitat',
      toolArgumentsLabel: 'Argumente',
      toolResultLabel: 'Ergebnis',
      toolErrorLabel: 'Fehler',
      toolServerLabel: 'Server',
      toolStatusRunning: 'Lauft',
      toolStatusCompleted: 'Abgeschlossen',
      toolStatusError: 'Fehler',
      toolRedactedValue: '[redacted]',
    },
    filters: {
      allLabel: 'Alle',
      householdViewCaption: 'Haushaltsansicht',
      memberFocusCaption: 'Mitgliederfokus',
    },
    settings: {
      panelKicker: 'Einstellungen',
      familyMembersTitle: 'Familienmitglieder',
      familyMembersMeta: '{count} aktive Mitglieder',
      familyMembersCopy:
        'Fuege Familienmitglieder hinzu, waehle fuer jede Person eine Farbe und nutze den ersten Buchstaben des Vornamens als Kreis-Badge im Kiosk. Widget-Kopfzeilen verwenden ihren konfigurierten Buchstaben und ihre Farbe.',
      memberEditorCopy:
        'Diese Initiale und Farbe werden in Filtern und Mitglieder-Badges verwendet.',
      firstNameLabel: 'Vorname',
      firstNamePlaceholder: 'Vorname',
      colorLabel: 'Farbe',
      systemKicker: 'System',
      systemHubTitle: 'System',
      systemHubCopy:
        'Oeffne Build-, Sprach-, Heimatland- und Anzeigeeinstellungen fuer diesen Bildschirm und dieses Konto.',
      systemTitle: 'Build und Deployment',
      systemDescription:
        'Referenzdaten fuer die Version, die aktuell auf diesem Bildschirm laeuft, sowie fuer das zuletzt von der App-Laufzeit erkannte Deployment.',
      buildVersionLabel: 'Build-ID',
      latestDeploymentLabel: 'Letztes Deployment',
      runtimeUnavailableValue: 'k. A.',
      familyHubCopy:
        'Oeffne die Familienliste, um Mitglieder hinzuzufuegen, umzubenennen und ihre Farben zu aendern.',
      languageKicker: 'Sprache',
      languageTitle: 'Anzeigesprache',
      languageDescription:
        'Waehle die gemeinsame Anwendungssprache fuer dieses Konto. Die Einstellung wird nach der Anmeldung und auf anderen Geraeten wiederhergestellt.',
      languageLabel: 'Sprache',
      languagePersistenceNote: 'Diese Einstellung wird fuer dein Konto gespeichert.',
      languageSavingNote: 'Spracheinstellung wird gespeichert...',
      languageLoadFailed:
        'Die gespeicherten Anwendungseinstellungen konnten nicht geladen werden. Standardsprache und Heimatland werden verwendet.',
      languageSaveFailed:
        'Die Anwendungseinstellungen konnten nicht im Backend gespeichert werden.',
      countryKicker: 'Heimatland',
      countryTitle: 'Inlaendisches Referenzland',
      countryDescription:
        'Lege den zweibuchstabigen ISO-Laendercode fest, mit dem kuenftige Kalenderereignisse fuer dieses Konto als inlaendisch oder auslaendisch eingeordnet werden.',
      countryLabel: 'Laendercode',
      countryPlaceholder: 'DE',
      countryFormatNote: 'Verwende einen zweibuchstabigen ISO-Code wie DE, FR oder US.',
      countryPersistenceNote: 'Dieses Referenzland wird fuer dein Konto gespeichert.',
      countrySavingNote: 'Laenderpraeferenz wird gespeichert...',
      countrySaveAction: 'Heimatland speichern',
      displayKicker: 'Anzeige',
      displayTitle: 'Vollbildmodus',
      displayDescription:
        'Schalte diesen Kiosk auf diesem Geraet zwischen Browser-Vollbild und normalem Fenstermodus um.',
      fullscreenEnterAction: 'Vollbild aktivieren',
      fullscreenExitAction: 'Vollbild verlassen',
      fullscreenActiveState: 'Vollbild ist aktiv.',
      fullscreenInactiveState: 'Vollbild ist inaktiv.',
      addMemberKicker: 'Mitglied hinzufuegen',
      addMemberTitle: 'Neuer Eintrag',
      addMemberAction: 'Familienmitglied hinzufuegen',
      deleteMemberAction: 'Familienmitglied loeschen',
      deletingMemberAction: 'Wird geloescht...',
      deleteMemberConfirm:
        '{firstName} aus der Familienliste loeschen? Dies kann nicht rueckgaengig gemacht werden.',
      openSystemPanelAriaLabel: 'Systemeinstellungen im unteren Bereich oeffnen',
      openFamilyPanelAriaLabel:
        'Familienmitglied-Einstellungen im unteren Bereich oeffnen',
      closeExpandedPanelAriaLabel: 'Erweiterten Einstellungsbereich schliessen',
      noExpandedPanelTitle: 'Kein Einstellungsbereich ausgewaehlt',
      noExpandedPanelCopy:
        'Oeffne System oder Familienmitglieder, um sie im unteren Bereich zu bearbeiten.',
    },
    boardHost: {
      expandAction: 'Oeffnen',
      collapseAction: 'Schliessen',
      expandAriaLabel: '{title} im unteren Bereich oeffnen',
      collapseAriaLabel: 'Erweiterte Ansicht von {title} schliessen',
      filtersAriaLabel: 'Haushaltsfilter',
      serviceBoardZoneLabel: 'Familien-Service-Board',
      cellZoneLabel: 'Feld {cellId}',
      widgetGridAriaLabel: 'Zweispaltiges Widget-Raster',
      expandedWidgetViewAriaLabel: 'Erweiterte Widget-Ansicht',
      serviceBoardEmptyTitle: 'Das Familien-Service-Board ist leer',
      serviceBoardEmptyCopy:
        'Ordne das Arrival Board in den Einstellungen der Zone Familien-Service-Board zu.',
      noExpandedWidgetTitle: 'Kein Widget ausgewaehlt',
      noExpandedWidgetCopy:
        'Der untere Bereich bleibt fuer eine erweiterte Widget-Ansicht reserviert.',
    },
    widgetAdmin: {
      pendingSync: 'Synchronisierung ausstehend',
      syncing: 'Synchronisierung laeuft...',
      synced: 'Synchronisiert',
      syncFailed: 'Synchronisierung fehlgeschlagen',
      idle: 'Leerlauf',
      openSettingsAction: 'Oeffnen',
      titleLabel: 'Titel',
      letterLabel: 'Buchstabe',
      colorLabel: 'Farbe',
      sourceLabel: 'Quelle',
      scopeHeading: 'Umfang',
      allScopeAction: 'Alle',
      allScopeAriaLabel: 'Umfang fuer alle Mitglieder',
      cellsHeading: 'Zellen',
      toggleCellAriaLabel: '{zoneLabel} umschalten',
    },
    widgetSettingsHost: {
      saveAction: 'Widget-Einstellungen speichern',
      savingState: 'Speichert...',
      savedState: 'Gespeichert.',
      saveFailedState: 'Speichern fehlgeschlagen.',
      pendingChangesState: 'Aenderungen ausstehend.',
      expandedWidgetViewAriaLabel: 'Erweiterte Widget-Einstellungsansicht',
      noExpandedWidgetTitle: 'Keine Widget-Einstellungen ausgewaehlt',
      noExpandedWidgetCopy:
        'Waehle Erweitern auf einer Widget-Einstellungskarte, um die spezifischen Einstellungen unten zu oeffnen.',
    },
    debug: {
      kicker: 'Wartung',
      title: 'Widget-Diagnose',
      copy: 'Verstecktes Overlay fuer Quelle, Umfang, Aktualisierungsstatus und Fehlerpruefung.',
      closeAction: 'Schliessen',
      performanceTitle: 'Performance',
      sourceLabel: 'Quelle',
      scopeLabel: 'Umfang',
      visibleNowLabel: 'Jetzt sichtbar',
      yesValue: 'ja',
      noValue: 'nein',
      placementLabel: 'Platzierung',
      refreshLabel: 'Aktualisierung',
      lastRefreshLabel: 'Letzte Aktualisierung',
      itemsLabel: 'Eintraege',
      failureLabel: 'Fehler',
      lastInteractionLabel: 'Letzte Interaktion',
      interactionDurationLabel: 'Klick bis Anzeige',
      interactionMeasuredAtLabel: 'Gemessen um',
      longTaskCountLabel: 'Long Tasks',
      longestLongTaskLabel: 'Laengster Long Task',
      lastLongTaskLabel: 'Letzter Long Task',
      notAvailableValue: 'k. A.',
      noneValue: 'kein',
      allMembersScope: 'Alle Mitglieder',
      memberScope: 'Mitglied: {memberId}',
      membersScope: 'Mitglieder: {memberIds}',
      refreshStatusIdle: 'leerlauf',
      refreshStatusOk: 'ok',
      refreshStatusLive: 'live',
      refreshStatusCached: 'zwischengespeichert',
      refreshStatusStatic: 'statisch',
      refreshStatusError: 'fehler',
    },
    messages: {
      authSessionExpired: 'Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.',
      authVerifySessionFailed:
        'Die aktuelle Sitzung konnte nicht geprueft werden. Bitte melde dich erneut an.',
      authCredentialsRequired: 'Benutzername und Passwort sind erforderlich.',
      authInvalidCredentials: 'Benutzername oder Passwort sind ungueltig.',
      authSignInFailed: 'Die Anmeldung beim Backend ist fehlgeschlagen.',
      authSignOutFailed: 'Die Abmeldung vom Backend ist fehlgeschlagen. Bitte versuche es erneut.',
      widgetSettingsUnavailable:
        'Backend-Widget-Einstellungen sind nicht verfuegbar. Standardwerte werden verwendet.',
      familyMembersSyncUnavailable:
        'Backend-Synchronisierung ist nicht verfuegbar. Die Familienmitglieder unten sind moeglicherweise nicht aktuell.',
      widgetMetadataUnavailable:
        'Backend-Widget-Metadaten sind nicht verfuegbar. Die Widget-Inhalte koennen unvollstaendig sein, bis die Verbindung zurueckkehrt.',
      weatherLoadFailed:
        'Live-Wetterdaten konnten nicht ueber den Backend-Wetterpfad geladen werden.',
      calendarLoadFailed:
        'Kalenderereignisse konnten nicht ueber den Backend-Kalenderpfad geladen werden.',
      todoLoadFailed:
        'Todo-Eintraege konnten nicht ueber den Backend-Todo-Pfad geladen werden.',
      familyMemberPersistFailed:
        'Aenderungen am Familienmitglied konnten nicht im Backend gespeichert werden.',
      familyMemberCreateFailed:
        'Das Familienmitglied konnte nicht im Backend erstellt werden.',
      familyMemberDeleteFailed:
        'Das Familienmitglied konnte nicht im Backend geloescht werden.',
      todoUpdateFailed:
        'Der Todo-Status konnte nicht im Backend aktualisiert werden.',
      widgetSettingsSaveFailed:
        'Widget-Einstellungen konnten nicht im Backend gespeichert werden.',
      widgetMetadataSaveFailed:
        'Widget-Metadaten konnten nicht im Backend gespeichert werden.',
      assistantLoadFailed:
        'Die Assistent Grundlage konnte nicht aus dem Backend geladen werden.',
      assistantCreateThreadFailed:
        'Die neue Assistent Unterhaltung konnte nicht erstellt werden.',
      assistantSendFailed:
        'Die Nachricht an den Assistenten konnte nicht gesendet werden.',
    },
  },
  fr: {
    auth: {
      sessionBootstrapKicker: 'Demarrage de session',
      sessionBootstrapTitle: 'Restauration de l acces',
      sessionBootstrapCopy:
        'Verification d une session existante avant le chargement du tableau protege.',
      heroKicker: 'Acces style metro NYC',
      introParagraphOne:
        'Le metro est un systeme de transport rapide concu pour deplacer beaucoup de personnes dans un reseau urbain connecte.',
      introParagraphTwo:
        'Ses pastilles, couleurs et panneaux rendent une carte complexe lisible en quelques secondes.',
      introParagraphThree:
        'Ce tableau reprend ce langage visuel pour rendre les informations du foyer aussi claires qu un quai.',
      signInKicker: 'Connexion',
      signInTitle: 'Entrer dans le tableau',
      signInCopy:
        'La connexion est requise avant d afficher les donnees personnelles et les reglages du subway.',
      usernameLabel: 'Nom d utilisateur',
      usernamePlaceholder: 'Nom d utilisateur',
      passwordLabel: 'Mot de passe',
      passwordPlaceholder: 'Mot de passe',
      signInAction: 'Se connecter',
      signingInAction: 'Connexion en cours...',
      authenticatedSessionKicker: 'Session authentifiee',
      authenticatedSessionTitle: 'Chargement de {username}',
      authenticatedSessionCopy:
        'Restauration des widgets, des membres et des reglages enregistres pour ce compte.',
    },
    shell: {
      familySettingsTitle: 'Reglages de la famille',
      assistantTitle: 'Assistant',
      boardTab: 'Tableau',
      assistantTab: 'Assistant',
      settingsTab: 'Reglages',
      signOutAction: 'Se deconnecter',
      signingOutAction: 'Deconnexion...',
    },
    assistant: {
      kicker: 'Section IA',
      title: 'Conversations assistant',
      introCopy:
        'Cette section gere des conversations IA persistantes par utilisateur en dehors du tableau de widgets. Le routage reste gere par les admins.',
      newThreadAction: 'Nouvelle conversation',
      creatingThreadAction: 'Creation...',
      threadListTitle: 'Conversations enregistrees',
      threadListCopy:
        'Les conversations sont stockees par utilisateur authentifie et rouvertes depuis le backend.',
      emptyThreadListTitle: 'Aucune conversation pour le moment',
      emptyThreadListCopy:
        'Creez maintenant la premiere conversation assistant. L envoi des messages arrive dans la prochaine issue.',
      transcriptTitle: 'Transcription',
      noThreadSelectedTitle: 'Aucune conversation selectionnee',
      noThreadSelectedCopy:
        'Choisissez une conversation sauvegardee a gauche ou creez en une nouvelle pour reserver sa transcription.',
      emptyTranscriptTitle: 'La transcription est vide',
      emptyTranscriptCopy:
        'Cette conversation existe et est persistante, mais aucun message n a encore ete ecrit.',
      activeRouteLabel: 'Route active',
      backendKindLabel: 'Type de backend',
      streamingCapabilityLabel: 'Streaming',
      toolsCapabilityLabel: 'Outils',
      markdownCapabilityLabel: 'Markdown',
      enabledValue: 'Active',
      disabledValue: 'Desactive',
      availabilityAvailable: 'Disponible',
      availabilityNotConfigured: 'Non configure',
      availabilityDisabled: 'Desactive',
      availabilityUnavailable: 'Indisponible',
      availabilityTitle: 'Disponibilite assistant',
      notConfiguredCopy:
        'Aucune route assistant geree par admin n est encore active. Ajoutez d abord une route backend assistant dans la configuration du serveur.',
      disabledCopy:
        'Une route assistant existe mais elle est desactivee par configuration. Les utilisateurs peuvent voir les conversations mais pas encore utiliser le runtime.',
      unavailableCopy:
        'Une route assistant existe mais elle est incomplete ou indisponible. Verifiez la configuration serveur geree par admin.',
      openThreadAriaLabel: 'Ouvrir la conversation {title}',
      routeUnknownValue: 'n/d',
      modelSelectionManagedCopy:
        'La selection du modele et du backend est geree centralement par les admins et n est pas exposee dans cette vue utilisateur.',
      untitledThreadTitle: 'Conversation sans titre',
      messageCountMeta: '{count} messages',
      composerLabel: 'Message',
      composerPlaceholder: 'Ecrivez un message a l assistant...',
      composerNoThreadCopy:
        'Selectionnez ou creez d abord une conversation avant d envoyer un message.',
      composerUnavailableCopy:
        'L envoi de messages assistant reste indisponible tant qu une route admin valide n est pas active.',
      turnStatusLabel: 'Etat du tour',
      turnStateIdle: 'Inactif',
      turnStateSending: 'Envoi',
      turnStateStreaming: 'Streaming',
      turnStateCompleted: 'Termine',
      turnStateFailed: 'Echec',
      sendAction: 'Envoyer le message',
      roleUser: 'Vous',
      roleAssistant: 'Assistant',
      roleSystem: 'Systeme',
      roleTool: 'Outil',
      deleteConversationAction: 'Supprimer',
      deleteConversationConfirm: 'Supprimer la conversation "{title}" ?',
      toolActivityTitle: 'Activite outil',
      toolArgumentsLabel: 'Arguments',
      toolResultLabel: 'Resultat',
      toolErrorLabel: 'Erreur',
      toolServerLabel: 'Serveur',
      toolStatusRunning: 'En cours',
      toolStatusCompleted: 'Termine',
      toolStatusError: 'Erreur',
      toolRedactedValue: '[redacted]',
    },
    filters: {
      allLabel: 'Tous',
      householdViewCaption: 'Vue du foyer',
      memberFocusCaption: 'Focus membre',
    },
    settings: {
      panelKicker: 'Reglages',
      familyMembersTitle: 'Membres de la famille',
      familyMembersMeta: '{count} membres actifs',
      familyMembersCopy:
        'Ajoutez des membres, choisissez une couleur pour chaque personne et utilisez la premiere lettre du prenom comme badge circulaire dans le kiosque. Les entetes des widgets utilisent leur lettre et leur couleur configurees.',
      memberEditorCopy:
        'Cette initiale et cette couleur sont utilisees dans les filtres et les badges des membres.',
      firstNameLabel: 'Prenom',
      firstNamePlaceholder: 'Prenom',
      colorLabel: 'Couleur',
      systemKicker: 'Systeme',
      systemHubTitle: 'Systeme',
      systemHubCopy:
        'Ouvrez les reglages de build, de langue, de pays de reference et d affichage pour cet ecran et ce compte.',
      systemTitle: 'Build et deploiement',
      systemDescription:
        'Informations de reference sur la version actuellement executee sur cet ecran et sur le deploiement le plus recent detecte par le runtime de l application.',
      buildVersionLabel: 'ID du build',
      latestDeploymentLabel: 'Dernier deploiement',
      runtimeUnavailableValue: 'n/d',
      familyHubCopy:
        'Ouvrez la liste familiale pour ajouter des membres, les renommer et mettre a jour leurs couleurs.',
      languageKicker: 'Langue',
      languageTitle: 'Langue d affichage',
      languageDescription:
        'Choisissez la langue partagee de l application pour ce compte. Cette preference revient apres connexion et sur les autres appareils.',
      languageLabel: 'Langue',
      languagePersistenceNote: 'Cette preference est enregistree pour votre compte.',
      languageSavingNote: 'Enregistrement de la preference de langue...',
      languageLoadFailed:
        'Impossible de charger les preferences enregistrees. La langue et le pays de reference par defaut sont utilises.',
      languageSaveFailed:
        'Impossible d enregistrer les preferences de l application dans le backend.',
      countryKicker: 'Pays de reference',
      countryTitle: 'Pays domestique de reference',
      countryDescription:
        'Definissez le code pays ISO a deux lettres utilise pour classer les futurs evenements du calendrier comme domestiques ou etrangers pour ce compte.',
      countryLabel: 'Code pays',
      countryPlaceholder: 'DE',
      countryFormatNote: 'Utilisez un code ISO a deux lettres comme DE, FR ou US.',
      countryPersistenceNote: 'Ce pays de reference est enregistre pour votre compte.',
      countrySavingNote: 'Enregistrement du pays de reference...',
      countrySaveAction: 'Enregistrer le pays',
      displayKicker: 'Affichage',
      displayTitle: 'Mode plein ecran',
      displayDescription:
        'Basculez ce kiosque entre le mode plein ecran du navigateur et le mode fenetre standard sur cet appareil.',
      fullscreenEnterAction: 'Entrer en plein ecran',
      fullscreenExitAction: 'Quitter le plein ecran',
      fullscreenActiveState: 'Le plein ecran est actif.',
      fullscreenInactiveState: 'Le plein ecran est inactif.',
      addMemberKicker: 'Ajouter un membre',
      addMemberTitle: 'Nouvelle entree',
      addMemberAction: 'Ajouter un membre de la famille',
      deleteMemberAction: 'Supprimer le membre',
      deletingMemberAction: 'Suppression...',
      deleteMemberConfirm:
        'Supprimer {firstName} de la liste familiale ? Cette action est definitive.',
      openSystemPanelAriaLabel:
        'Ouvrir les reglages systeme dans le panneau inferieur',
      openFamilyPanelAriaLabel:
        'Ouvrir les reglages des membres de la famille dans le panneau inferieur',
      closeExpandedPanelAriaLabel: 'Fermer le panneau de reglages detaille',
      noExpandedPanelTitle: 'Aucun panneau de reglages selectionne',
      noExpandedPanelCopy:
        'Ouvrez Systeme ou Membres de la famille pour les modifier dans le panneau inferieur.',
    },
    boardHost: {
      expandAction: 'Etendre',
      collapseAction: 'Fermer',
      expandAriaLabel: 'Etendre {title} dans le panneau inferieur',
      collapseAriaLabel: 'Fermer la vue detaillee de {title}',
      filtersAriaLabel: 'Filtres du foyer',
      serviceBoardZoneLabel: 'Tableau de service familial',
      cellZoneLabel: 'Case {cellId}',
      widgetGridAriaLabel: 'Grille de widgets a deux colonnes',
      expandedWidgetViewAriaLabel: 'Vue de widget detaillee',
      serviceBoardEmptyTitle: 'Le tableau de service familial est vide',
      serviceBoardEmptyCopy:
        'Affectez l Arrival Board a la zone tableau de service familial dans les reglages.',
      noExpandedWidgetTitle: 'Aucun widget selectionne',
      noExpandedWidgetCopy:
        'La section inferieure reste reservee a une vue detaillee de widget.',
    },
    widgetAdmin: {
      pendingSync: 'Synchronisation en attente',
      syncing: 'Synchronisation en cours...',
      synced: 'Synchronise',
      syncFailed: 'Echec de synchronisation',
      idle: 'Inactif',
      openSettingsAction: 'Ouvrir',
      titleLabel: 'Titre',
      letterLabel: 'Lettre',
      colorLabel: 'Couleur',
      sourceLabel: 'Source',
      scopeHeading: 'Portee',
      allScopeAction: 'Tous',
      allScopeAriaLabel: 'Portee tous les membres',
      cellsHeading: 'Cases',
      toggleCellAriaLabel: 'Basculer {zoneLabel}',
    },
    widgetSettingsHost: {
      saveAction: 'Enregistrer les reglages du widget',
      savingState: 'Enregistrement...',
      savedState: 'Enregistre.',
      saveFailedState: 'Echec de l enregistrement.',
      pendingChangesState: 'Modifications en attente.',
      expandedWidgetViewAriaLabel: 'Vue detaillee des reglages du widget',
      noExpandedWidgetTitle: 'Aucun reglage de widget selectionne',
      noExpandedWidgetCopy:
        'Selectionnez Etendre sur une carte de reglages du widget pour ouvrir ses reglages specifiques ci-dessous.',
    },
    debug: {
      kicker: 'Maintenance',
      title: 'Diagnostic des widgets',
      copy: 'Overlay cache pour la source, la portee, l etat de rafraichissement et l inspection des echecs.',
      closeAction: 'Fermer',
      performanceTitle: 'Performance',
      sourceLabel: 'Source',
      scopeLabel: 'Portee',
      visibleNowLabel: 'Visible maintenant',
      yesValue: 'oui',
      noValue: 'non',
      placementLabel: 'Placement',
      refreshLabel: 'Rafraichissement',
      lastRefreshLabel: 'Dernier rafraichissement',
      itemsLabel: 'Elements',
      failureLabel: 'Echec',
      lastInteractionLabel: 'Derniere interaction',
      interactionDurationLabel: 'Clic jusqu a l affichage',
      interactionMeasuredAtLabel: 'Mesure a',
      longTaskCountLabel: 'Taches longues',
      longestLongTaskLabel: 'Plus longue tache',
      lastLongTaskLabel: 'Derniere tache longue',
      notAvailableValue: 'n/d',
      noneValue: 'aucun',
      allMembersScope: 'Tous les membres',
      memberScope: 'Membre : {memberId}',
      membersScope: 'Membres : {memberIds}',
      refreshStatusIdle: 'inactif',
      refreshStatusOk: 'ok',
      refreshStatusLive: 'live',
      refreshStatusCached: 'en cache',
      refreshStatusStatic: 'statique',
      refreshStatusError: 'erreur',
    },
    messages: {
      authSessionExpired: 'Votre session a expire. Veuillez vous reconnecter.',
      authVerifySessionFailed:
        'Impossible de verifier la session en cours. Veuillez vous reconnecter.',
      authCredentialsRequired: 'Le nom d utilisateur et le mot de passe sont requis.',
      authInvalidCredentials: 'Nom d utilisateur ou mot de passe invalide.',
      authSignInFailed: 'Impossible de se connecter au backend.',
      authSignOutFailed: 'Impossible de se deconnecter du backend. Reessayez.',
      widgetSettingsUnavailable:
        'Les reglages des widgets du backend ne sont pas disponibles. Les reglages par defaut sont utilises.',
      familyMembersSyncUnavailable:
        'La synchronisation backend est indisponible. Les membres affiches ci-dessous peuvent ne pas etre a jour.',
      widgetMetadataUnavailable:
        'Les metadonnees des widgets du backend sont indisponibles. Le contenu du tableau peut rester incomplet jusqu au retour de la connexion.',
      weatherLoadFailed:
        'Impossible de charger les donnees meteo live depuis le chemin meteo du backend.',
      calendarLoadFailed:
        'Impossible de charger les evenements du calendrier depuis le chemin calendrier du backend.',
      todoLoadFailed:
        'Impossible de charger les elements todo depuis le chemin todo du backend.',
      familyMemberPersistFailed:
        'Impossible d enregistrer les modifications du membre de la famille dans le backend.',
      familyMemberCreateFailed:
        'Impossible de creer le membre de la famille dans le backend.',
      familyMemberDeleteFailed:
        'Impossible de supprimer le membre de la famille dans le backend.',
      todoUpdateFailed:
        'Impossible de mettre a jour l etat du todo dans le backend.',
      widgetSettingsSaveFailed:
        'Impossible d enregistrer les reglages du widget dans le backend.',
      widgetMetadataSaveFailed:
        'Impossible d enregistrer les metadonnees du widget dans le backend.',
      assistantLoadFailed:
        'Impossible de charger la fondation assistant depuis le backend.',
      assistantCreateThreadFailed:
        'Impossible de creer une nouvelle conversation assistant.',
      assistantSendFailed:
        'Impossible d envoyer le message assistant.',
    },
  },
  es: {
    auth: {
      sessionBootstrapKicker: 'Inicio de sesion',
      sessionBootstrapTitle: 'Restaurando acceso',
      sessionBootstrapCopy:
        'Comprobando una sesion existente antes de cargar el tablero protegido.',
      heroKicker: 'Acceso estilo metro de NYC',
      introParagraphOne:
        'El metro es un sistema de transito rapido pensado para mover a muchas personas por una red urbana conectada.',
      introParagraphTwo:
        'Sus circulos de linea, colores y senales hacen que un mapa complejo se entienda en pocos segundos.',
      introParagraphThree:
        'Este tablero toma ese lenguaje visual para que la informacion del hogar se sienta tan clara como un anden.',
      signInKicker: 'Iniciar sesion',
      signInTitle: 'Entrar al tablero',
      signInCopy:
        'Es necesario iniciar sesion antes de mostrar los datos personales y la configuracion del subway.',
      usernameLabel: 'Nombre de usuario',
      usernamePlaceholder: 'Nombre de usuario',
      passwordLabel: 'Contrasena',
      passwordPlaceholder: 'Contrasena',
      signInAction: 'Iniciar sesion',
      signingInAction: 'Iniciando sesion...',
      authenticatedSessionKicker: 'Sesion autenticada',
      authenticatedSessionTitle: 'Cargando {username}',
      authenticatedSessionCopy:
        'Restaurando widgets, miembros y configuraciones guardadas para esta cuenta.',
    },
    shell: {
      familySettingsTitle: 'Configuracion familiar',
      assistantTitle: 'Asistente',
      boardTab: 'Tablero',
      assistantTab: 'Asistente',
      settingsTab: 'Configuracion',
      signOutAction: 'Cerrar sesion',
      signingOutAction: 'Cerrando sesion...',
    },
    assistant: {
      kicker: 'Seccion IA',
      title: 'Conversaciones del asistente',
      introCopy:
        'Esta seccion gestiona conversaciones IA persistentes por usuario fuera del tablero de widgets. El enrutamiento sigue siendo administrado por admins.',
      newThreadAction: 'Nueva conversacion',
      creatingThreadAction: 'Creando...',
      threadListTitle: 'Conversaciones guardadas',
      threadListCopy:
        'Las conversaciones se guardan por usuario autenticado y se vuelven a abrir desde el backend.',
      emptyThreadListTitle: 'Todavia no hay conversaciones',
      emptyThreadListCopy:
        'Crea ahora la primera conversacion del asistente. El envio de mensajes llega en el siguiente issue.',
      transcriptTitle: 'Transcripcion',
      noThreadSelectedTitle: 'No hay conversacion seleccionada',
      noThreadSelectedCopy:
        'Elige una conversacion guardada a la izquierda o crea una nueva para reservar su transcripcion.',
      emptyTranscriptTitle: 'La transcripcion esta vacia',
      emptyTranscriptCopy:
        'Esta conversacion existe y esta guardada, pero todavia no tiene mensajes.',
      activeRouteLabel: 'Ruta activa',
      backendKindLabel: 'Tipo de backend',
      streamingCapabilityLabel: 'Streaming',
      toolsCapabilityLabel: 'Herramientas',
      markdownCapabilityLabel: 'Markdown',
      enabledValue: 'Activo',
      disabledValue: 'Desactivado',
      availabilityAvailable: 'Disponible',
      availabilityNotConfigured: 'No configurado',
      availabilityDisabled: 'Desactivado',
      availabilityUnavailable: 'No disponible',
      availabilityTitle: 'Disponibilidad del asistente',
      notConfiguredCopy:
        'Todavia no hay una ruta del asistente administrada por admin activa. Primero anade una ruta backend del asistente en la configuracion del servidor.',
      disabledCopy:
        'Existe una ruta del asistente, pero esta desactivada por configuracion. Los usuarios pueden ver conversaciones, pero todavia no usar el runtime.',
      unavailableCopy:
        'Existe una ruta del asistente, pero esta incompleta o no disponible. Revisa la configuracion del servidor administrada por admin.',
      openThreadAriaLabel: 'Abrir conversacion {title}',
      routeUnknownValue: 'n/d',
      modelSelectionManagedCopy:
        'La seleccion de modelo y backend se administra de forma central por admins y no se expone en esta vista de usuario.',
      untitledThreadTitle: 'Conversacion sin titulo',
      messageCountMeta: '{count} mensajes',
      composerLabel: 'Mensaje',
      composerPlaceholder: 'Escribe un mensaje para el asistente...',
      composerNoThreadCopy:
        'Selecciona o crea primero una conversacion antes de enviar un mensaje.',
      composerUnavailableCopy:
        'El envio de mensajes del asistente no estara disponible hasta que exista una ruta admin funcional.',
      turnStatusLabel: 'Estado del turno',
      turnStateIdle: 'En espera',
      turnStateSending: 'Enviando',
      turnStateStreaming: 'Streaming',
      turnStateCompleted: 'Completado',
      turnStateFailed: 'Fallido',
      sendAction: 'Enviar mensaje',
      roleUser: 'Tu',
      roleAssistant: 'Asistente',
      roleSystem: 'Sistema',
      roleTool: 'Herramienta',
      deleteConversationAction: 'Eliminar',
      deleteConversationConfirm: 'Eliminar la conversacion "{title}"?',
      toolActivityTitle: 'Actividad de herramientas',
      toolArgumentsLabel: 'Argumentos',
      toolResultLabel: 'Resultado',
      toolErrorLabel: 'Error',
      toolServerLabel: 'Servidor',
      toolStatusRunning: 'Ejecutando',
      toolStatusCompleted: 'Completado',
      toolStatusError: 'Error',
      toolRedactedValue: '[redacted]',
    },
    filters: {
      allLabel: 'Todos',
      householdViewCaption: 'Vista del hogar',
      memberFocusCaption: 'Foco del miembro',
    },
    settings: {
      panelKicker: 'Configuracion',
      familyMembersTitle: 'Miembros de la familia',
      familyMembersMeta: '{count} miembros activos',
      familyMembersCopy:
        'Agrega miembros, elige un color para cada persona y usa la primera letra del nombre como distintivo circular en el kiosco. Los encabezados de los widgets usan su letra y color configurados.',
      memberEditorCopy:
        'Esta inicial y este color se usan en los filtros y en los distintivos de miembros.',
      firstNameLabel: 'Nombre',
      firstNamePlaceholder: 'Nombre',
      colorLabel: 'Color',
      systemKicker: 'Sistema',
      systemHubTitle: 'Sistema',
      systemHubCopy:
        'Abre la compilacion, el idioma, el pais de referencia y la configuracion de pantalla de esta pantalla y esta cuenta.',
      systemTitle: 'Build y despliegue',
      systemDescription:
        'Detalles de referencia de la version que se esta ejecutando en esta pantalla y del despliegue mas reciente detectado por el runtime de la aplicacion.',
      buildVersionLabel: 'ID de build',
      latestDeploymentLabel: 'Ultimo despliegue',
      runtimeUnavailableValue: 'n/d',
      familyHubCopy:
        'Abre la lista familiar para agregar miembros, renombrarlos y actualizar sus colores.',
      languageKicker: 'Idioma',
      languageTitle: 'Idioma de pantalla',
      languageDescription:
        'Elige el idioma compartido de la aplicacion para esta cuenta. La preferencia se restaura despues de iniciar sesion y en otros dispositivos.',
      languageLabel: 'Idioma',
      languagePersistenceNote: 'Esta preferencia se guarda para tu cuenta.',
      languageSavingNote: 'Guardando la preferencia de idioma...',
      languageLoadFailed:
        'No se pudieron cargar las preferencias guardadas de la aplicacion. Se usaran el idioma y el pais de referencia predeterminados.',
      languageSaveFailed:
        'No se pudieron guardar las preferencias de la aplicacion en el backend.',
      countryKicker: 'Pais de referencia',
      countryTitle: 'Pais domestico de referencia',
      countryDescription:
        'Define el codigo ISO de dos letras que se usara para clasificar los futuros eventos del calendario como domesticos o extranjeros para esta cuenta.',
      countryLabel: 'Codigo de pais',
      countryPlaceholder: 'DE',
      countryFormatNote: 'Usa un codigo ISO de dos letras como DE, FR o US.',
      countryPersistenceNote: 'Este pais de referencia se guarda para tu cuenta.',
      countrySavingNote: 'Guardando el pais de referencia...',
      countrySaveAction: 'Guardar pais de referencia',
      displayKicker: 'Pantalla',
      displayTitle: 'Modo de pantalla completa',
      displayDescription:
        'Cambie este kiosco entre el modo de pantalla completa del navegador y el modo de ventana normal en este dispositivo.',
      fullscreenEnterAction: 'Entrar en pantalla completa',
      fullscreenExitAction: 'Salir de pantalla completa',
      fullscreenActiveState: 'La pantalla completa esta activa.',
      fullscreenInactiveState: 'La pantalla completa esta inactiva.',
      addMemberKicker: 'Agregar miembro',
      addMemberTitle: 'Nueva entrada',
      addMemberAction: 'Agregar miembro de la familia',
      deleteMemberAction: 'Eliminar miembro de la familia',
      deletingMemberAction: 'Eliminando...',
      deleteMemberConfirm:
        'Eliminar a {firstName} de la lista familiar? Esta accion no se puede deshacer.',
      openSystemPanelAriaLabel: 'Abrir ajustes del sistema en el panel inferior',
      openFamilyPanelAriaLabel:
        'Abrir ajustes de miembros de la familia en el panel inferior',
      closeExpandedPanelAriaLabel: 'Cerrar panel ampliado de ajustes',
      noExpandedPanelTitle: 'No hay panel de ajustes seleccionado',
      noExpandedPanelCopy:
        'Abre Sistema o Miembros de la familia para editarlos en el panel inferior.',
    },
    boardHost: {
      expandAction: 'Expandir',
      collapseAction: 'Cerrar',
      expandAriaLabel: 'Expandir {title} en el panel inferior',
      collapseAriaLabel: 'Cerrar la vista ampliada de {title}',
      filtersAriaLabel: 'Filtros del hogar',
      serviceBoardZoneLabel: 'Panel de servicio familiar',
      cellZoneLabel: 'Celda {cellId}',
      widgetGridAriaLabel: 'Cuadricula de widgets de dos columnas',
      expandedWidgetViewAriaLabel: 'Vista ampliada del widget',
      serviceBoardEmptyTitle: 'El panel de servicio familiar esta vacio',
      serviceBoardEmptyCopy:
        'Asigna el Arrival Board a la zona de panel de servicio familiar en configuracion.',
      noExpandedWidgetTitle: 'Ningun widget seleccionado',
      noExpandedWidgetCopy:
        'La seccion inferior queda reservada para una vista ampliada del widget.',
    },
    widgetAdmin: {
      pendingSync: 'Sincronizacion pendiente',
      syncing: 'Sincronizando...',
      synced: 'Sincronizado',
      syncFailed: 'Fallo de sincronizacion',
      idle: 'En espera',
      openSettingsAction: 'Abrir',
      titleLabel: 'Titulo',
      letterLabel: 'Letra',
      colorLabel: 'Color',
      sourceLabel: 'Fuente',
      scopeHeading: 'Alcance',
      allScopeAction: 'Todos',
      allScopeAriaLabel: 'Alcance de todos los miembros',
      cellsHeading: 'Celdas',
      toggleCellAriaLabel: 'Alternar {zoneLabel}',
    },
    widgetSettingsHost: {
      saveAction: 'Guardar configuracion del widget',
      savingState: 'Guardando...',
      savedState: 'Guardado.',
      saveFailedState: 'Error al guardar.',
      pendingChangesState: 'Cambios pendientes.',
      expandedWidgetViewAriaLabel: 'Vista ampliada de configuracion del widget',
      noExpandedWidgetTitle: 'No hay configuracion de widget seleccionada',
      noExpandedWidgetCopy:
        'Selecciona Expandir en una tarjeta de configuracion del widget para abrir abajo su configuracion especifica.',
    },
    debug: {
      kicker: 'Mantenimiento',
      title: 'Diagnostico de widgets',
      copy: 'Overlay oculto para revisar fuente, alcance, estado de refresco y fallos.',
      closeAction: 'Cerrar',
      performanceTitle: 'Rendimiento',
      sourceLabel: 'Fuente',
      scopeLabel: 'Alcance',
      visibleNowLabel: 'Visible ahora',
      yesValue: 'si',
      noValue: 'no',
      placementLabel: 'Ubicacion',
      refreshLabel: 'Actualizacion',
      lastRefreshLabel: 'Ultima actualizacion',
      itemsLabel: 'Elementos',
      failureLabel: 'Fallo',
      lastInteractionLabel: 'Ultima interaccion',
      interactionDurationLabel: 'Clic hasta pintar',
      interactionMeasuredAtLabel: 'Medido a las',
      longTaskCountLabel: 'Tareas largas',
      longestLongTaskLabel: 'Tarea larga mas larga',
      lastLongTaskLabel: 'Ultima tarea larga',
      notAvailableValue: 'n/d',
      noneValue: 'ninguno',
      allMembersScope: 'Todos los miembros',
      memberScope: 'Miembro: {memberId}',
      membersScope: 'Miembros: {memberIds}',
      refreshStatusIdle: 'en espera',
      refreshStatusOk: 'ok',
      refreshStatusLive: 'live',
      refreshStatusCached: 'en cache',
      refreshStatusStatic: 'estatico',
      refreshStatusError: 'error',
    },
    messages: {
      authSessionExpired: 'Tu sesion ha caducado. Vuelve a iniciar sesion.',
      authVerifySessionFailed:
        'No se pudo verificar la sesion actual. Vuelve a iniciar sesion.',
      authCredentialsRequired: 'Se requieren nombre de usuario y contrasena.',
      authInvalidCredentials: 'Nombre de usuario o contrasena no validos.',
      authSignInFailed: 'No se pudo iniciar sesion en el backend.',
      authSignOutFailed: 'No se pudo cerrar sesion en el backend. Intentalo de nuevo.',
      widgetSettingsUnavailable:
        'La configuracion de widgets del backend no esta disponible. Se usan los valores predeterminados.',
      familyMembersSyncUnavailable:
        'La sincronizacion del backend no esta disponible. Es posible que los miembros mostrados abajo no esten actualizados.',
      widgetMetadataUnavailable:
        'Los metadatos de widgets del backend no estan disponibles. El contenido del tablero puede quedar incompleto hasta que vuelva la conexion.',
      weatherLoadFailed:
        'No se pudieron cargar los datos meteorologicos en vivo desde la ruta meteorologica del backend.',
      calendarLoadFailed:
        'No se pudieron cargar los eventos del calendario desde la ruta de calendario del backend.',
      todoLoadFailed:
        'No se pudieron cargar los elementos todo desde la ruta todo del backend.',
      familyMemberPersistFailed:
        'No se pudieron guardar en el backend los cambios del miembro de la familia.',
      familyMemberCreateFailed:
        'No se pudo crear el miembro de la familia en el backend.',
      familyMemberDeleteFailed:
        'No se pudo eliminar el miembro de la familia en el backend.',
      todoUpdateFailed:
        'No se pudo actualizar el estado del todo en el backend.',
      widgetSettingsSaveFailed:
        'No se pudo guardar la configuracion del widget en el backend.',
      widgetMetadataSaveFailed:
        'No se pudieron guardar los metadatos del widget en el backend.',
      assistantLoadFailed:
        'No se pudo cargar la base del asistente desde el backend.',
      assistantCreateThreadFailed:
        'No se pudo crear una nueva conversacion del asistente.',
      assistantSendFailed:
        'No se pudo enviar el mensaje del asistente.',
    },
  },
})
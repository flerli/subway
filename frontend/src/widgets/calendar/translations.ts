import type { SupportedLanguageCode } from '../../i18n/localization'
import type { WidgetTranslationDefinition } from '../widgetTypes'
import {
  createDefaultWidgetTitleMatcher,
  createWidgetTranslationCatalog,
  getWidgetTranslationFromCatalog,
} from '../widgetLocalization'

export interface CalendarWidgetTranslation extends WidgetTranslationDefinition {
  copy: {
    upcomingEventsMeta: string
    emptyTitle: string
    emptyCopy: string
    emptyItemTitle: string
    emptyItemLocation: string
    emptyItemNote: string
  }
  detail: {
    weekViewAction: string
    monthViewAction: string
    yearViewAction: string
    previousRangeAction: string
    nextRangeAction: string
    rangeEventCountMeta: string
    loadingState: string
    loadFailed: string
    detailsKicker: string
    detailsEmptyTitle: string
    detailsEmptyCopy: string
    closePanelAction: string
    emptyRangeTitle: string
    emptyRangeCopy: string
    householdScopeLabel: string
    recurrenceOneOffSummary: string
    recurrenceDailySummary: string
    recurrenceWeeklySummary: string
    recurrenceMonthlySummary: string
    recurrenceYearlySummary: string
    editorTitle: string
    editorCopy: string
    seriesTitle: string
    newEventAction: string
    editAction: string
    deleteAction: string
    switchToCreateAction: string
    createTitle: string
    editTitle: string
    deleteConfirm: string
    emptySeriesTitle: string
    emptySeriesCopy: string
    titleLabel: string
    titlePlaceholder: string
    dateLabel: string
    timeLabel: string
    cityLabel: string
    cityPlaceholder: string
    countryLabel: string
    countryPlaceholder: string
    descriptionLabel: string
    descriptionPlaceholder: string
    scopeLabel: string
    scopeHouseholdOption: string
    scopeMembersOption: string
    recurrenceLabel: string
    recurrenceOneOffOption: string
    recurrenceDailyOption: string
    recurrenceWeeklyOption: string
    recurrenceMonthlyOption: string
    recurrenceYearlyOption: string
    intervalLabel: string
    countLabel: string
    countPlaceholder: string
    untilLabel: string
    createSeriesAction: string
    saveSeriesAction: string
    creatingSeriesAction: string
    savingSeriesAction: string
    createdNotice: string
    updatedNotice: string
    deletedNotice: string
    saveFailedFallback: string
    deleteFailedFallback: string
  }
}

const calendarWidgetTranslationCatalog = createWidgetTranslationCatalog<CalendarWidgetTranslation>({
  en: {
    title: 'Calendar',
    boardKicker: 'Calendar',
    copy: {
      upcomingEventsMeta: '{count} upcoming events',
      emptyTitle: 'No events in the next 7 days',
      emptyCopy: 'No calendar events match the active scope for the upcoming seven-day window.',
      emptyItemTitle: 'No calendar events',
      emptyItemLocation: 'Calendar widget',
      emptyItemNote: 'Calendar data will appear here when events are available for the active scope.',
    },
    detail: {
      weekViewAction: 'Week',
      monthViewAction: 'Month',
      yearViewAction: 'Year',
      previousRangeAction: 'Previous',
      nextRangeAction: 'Next',
      rangeEventCountMeta: '{count} events in range',
      loadingState: 'Loading calendar range...',
      loadFailed: 'Failed to load the extended calendar view.',
      detailsKicker: 'Selected event',
      detailsEmptyTitle: 'No event selected',
      detailsEmptyCopy: 'Choose an event from the calendar matrix to inspect its details.',
      closePanelAction: 'Close panel',
      emptyRangeTitle: 'No events in this range',
      emptyRangeCopy: 'No calendar events match the active scope in the selected range.',
      householdScopeLabel: 'Household-wide',
      recurrenceOneOffSummary: 'One-off event',
      recurrenceDailySummary: 'Every {interval} day(s)',
      recurrenceWeeklySummary: 'Every {interval} week(s)',
      recurrenceMonthlySummary: 'Every {interval} month(s)',
      recurrenceYearlySummary: 'Every {interval} year(s)',
      editorTitle: 'Manage event series',
      editorCopy: 'Create, update, and delete calendar events without leaving the calendar detail view.',
      seriesTitle: 'Saved series',
      newEventAction: 'New event',
      editAction: 'Edit',
      deleteAction: 'Delete',
      switchToCreateAction: 'Switch to new event',
      createTitle: 'Create event series',
      editTitle: 'Edit event series',
      deleteConfirm: 'Delete the event series "{title}"? This removes all future occurrences in the series.',
      emptySeriesTitle: 'No calendar event series yet',
      emptySeriesCopy: 'Create the first event series to populate the calendar widget.',
      titleLabel: 'Title',
      titlePlaceholder: 'Family planning sync',
      dateLabel: 'Date',
      timeLabel: 'Time',
      cityLabel: 'City',
      cityPlaceholder: 'Berlin',
      countryLabel: 'Country',
      countryPlaceholder: 'DE',
      descriptionLabel: 'Description',
      descriptionPlaceholder: 'Context, preparation notes, or agenda details.',
      scopeLabel: 'Scope',
      scopeHouseholdOption: 'Household-wide',
      scopeMembersOption: 'Selected family members',
      recurrenceLabel: 'Recurrence',
      recurrenceOneOffOption: 'One-off',
      recurrenceDailyOption: 'Daily',
      recurrenceWeeklyOption: 'Weekly',
      recurrenceMonthlyOption: 'Monthly',
      recurrenceYearlyOption: 'Yearly',
      intervalLabel: 'Interval',
      countLabel: 'Count',
      countPlaceholder: 'Optional',
      untilLabel: 'Until',
      createSeriesAction: 'Create event series',
      saveSeriesAction: 'Save event series',
      creatingSeriesAction: 'Creating event...',
      savingSeriesAction: 'Saving event...',
      createdNotice: 'Event series created.',
      updatedNotice: 'Event series updated.',
      deletedNotice: 'Event series deleted.',
      saveFailedFallback: 'Calendar event save failed.',
      deleteFailedFallback: 'Calendar event delete failed.',
    },
    settings: {
      title: 'Calendar widget settings',
      description: 'Control whether household-wide events are included in the compact seven-day calendar view.',
      fields: {
        includeHouseholdEvents: {
          label: 'Include household-wide events',
        },
      },
    },
  },
  de: {
    title: 'Kalender',
    boardKicker: 'Kalender',
    copy: {
      upcomingEventsMeta: '{count} bevorstehende Termine',
      emptyTitle: 'Keine Termine in den naechsten 7 Tagen',
      emptyCopy: 'Keine Kalenderereignisse passen im bevorstehenden Sieben-Tage-Fenster zum aktiven Umfang.',
      emptyItemTitle: 'Keine Kalendertermine',
      emptyItemLocation: 'Kalender-Widget',
      emptyItemNote: 'Kalenderdaten erscheinen hier, sobald Ereignisse fuer den aktiven Umfang verfuegbar sind.',
    },
    detail: {
      weekViewAction: 'Woche',
      monthViewAction: 'Monat',
      yearViewAction: 'Jahr',
      previousRangeAction: 'Zurueck',
      nextRangeAction: 'Weiter',
      rangeEventCountMeta: '{count} Termine im Bereich',
      loadingState: 'Kalenderbereich wird geladen...',
      loadFailed: 'Die erweiterte Kalenderansicht konnte nicht geladen werden.',
      detailsKicker: 'Ausgewaehlter Termin',
      detailsEmptyTitle: 'Kein Termin ausgewaehlt',
      detailsEmptyCopy: 'Waehle einen Termin aus der Kalendermatrix, um seine Details anzuzeigen.',
      closePanelAction: 'Panel schliessen',
      emptyRangeTitle: 'Keine Termine in diesem Bereich',
      emptyRangeCopy: 'Keine Kalenderereignisse passen im ausgewaehlten Bereich zum aktiven Umfang.',
      householdScopeLabel: 'Haushaltsweit',
      recurrenceOneOffSummary: 'Einzeltermin',
      recurrenceDailySummary: 'Alle {interval} Tag(e)',
      recurrenceWeeklySummary: 'Alle {interval} Woche(n)',
      recurrenceMonthlySummary: 'Alle {interval} Monat(e)',
      recurrenceYearlySummary: 'Alle {interval} Jahr(e)',
      editorTitle: 'Terminserien verwalten',
      editorCopy: 'Erstelle, bearbeite und loesche Kalenderereignisse direkt in der erweiterten Kalenderansicht.',
      seriesTitle: 'Gespeicherte Serien',
      newEventAction: 'Neuer Termin',
      editAction: 'Bearbeiten',
      deleteAction: 'Loeschen',
      switchToCreateAction: 'Zu neuem Termin wechseln',
      createTitle: 'Terminserie erstellen',
      editTitle: 'Terminserie bearbeiten',
      deleteConfirm: 'Die Terminserie "{title}" loeschen? Dadurch werden alle kuenftigen Vorkommen dieser Serie entfernt.',
      emptySeriesTitle: 'Noch keine Terminserien',
      emptySeriesCopy: 'Erstelle die erste Terminserie, um das Kalender-Widget zu fuellen.',
      titleLabel: 'Titel',
      titlePlaceholder: 'Familienplanung',
      dateLabel: 'Datum',
      timeLabel: 'Zeit',
      cityLabel: 'Stadt',
      cityPlaceholder: 'Berlin',
      countryLabel: 'Land',
      countryPlaceholder: 'DE',
      descriptionLabel: 'Beschreibung',
      descriptionPlaceholder: 'Kontext, Vorbereitung oder Agendadetails.',
      scopeLabel: 'Umfang',
      scopeHouseholdOption: 'Haushaltsweit',
      scopeMembersOption: 'Ausgewaehlte Familienmitglieder',
      recurrenceLabel: 'Wiederholung',
      recurrenceOneOffOption: 'Einmalig',
      recurrenceDailyOption: 'Taeglich',
      recurrenceWeeklyOption: 'Woechentlich',
      recurrenceMonthlyOption: 'Monatlich',
      recurrenceYearlyOption: 'Jaehrlich',
      intervalLabel: 'Intervall',
      countLabel: 'Anzahl',
      countPlaceholder: 'Optional',
      untilLabel: 'Bis',
      createSeriesAction: 'Terminserie erstellen',
      saveSeriesAction: 'Terminserie speichern',
      creatingSeriesAction: 'Termin wird erstellt...',
      savingSeriesAction: 'Termin wird gespeichert...',
      createdNotice: 'Terminserie erstellt.',
      updatedNotice: 'Terminserie aktualisiert.',
      deletedNotice: 'Terminserie geloescht.',
      saveFailedFallback: 'Kalendertermin konnte nicht gespeichert werden.',
      deleteFailedFallback: 'Kalendertermin konnte nicht geloescht werden.',
    },
    settings: {
      title: 'Einstellungen des Kalender-Widgets',
      description: 'Lege fest, ob haushaltsweite Termine in der kompakten Sieben-Tage-Ansicht angezeigt werden.',
      fields: {
        includeHouseholdEvents: {
          label: 'Haushaltsweite Termine einbeziehen',
        },
      },
    },
  },
  fr: {
    title: 'Calendrier',
    boardKicker: 'Calendrier',
    copy: {
      upcomingEventsMeta: '{count} evenements a venir',
      emptyTitle: 'Aucun evenement dans les 7 prochains jours',
      emptyCopy: 'Aucun evenement du calendrier ne correspond a la portee active dans la fenetre des sept prochains jours.',
      emptyItemTitle: 'Aucun evenement du calendrier',
      emptyItemLocation: 'Widget calendrier',
      emptyItemNote: 'Les donnees du calendrier apparaitront ici lorsque des evenements seront disponibles pour la portee active.',
    },
    detail: {
      weekViewAction: 'Semaine',
      monthViewAction: 'Mois',
      yearViewAction: 'Annee',
      previousRangeAction: 'Precedent',
      nextRangeAction: 'Suivant',
      rangeEventCountMeta: '{count} evenements dans la plage',
      loadingState: 'Chargement de la plage du calendrier...',
      loadFailed: 'Impossible de charger la vue detaillee du calendrier.',
      detailsKicker: 'Evenement selectionne',
      detailsEmptyTitle: 'Aucun evenement selectionne',
      detailsEmptyCopy: 'Choisissez un evenement dans la matrice du calendrier pour afficher ses details.',
      closePanelAction: 'Fermer le panneau',
      emptyRangeTitle: 'Aucun evenement dans cette plage',
      emptyRangeCopy: 'Aucun evenement du calendrier ne correspond a la portee active dans la plage selectionnee.',
      householdScopeLabel: 'Tout le foyer',
      recurrenceOneOffSummary: 'Evenement unique',
      recurrenceDailySummary: 'Tous les {interval} jour(s)',
      recurrenceWeeklySummary: 'Toutes les {interval} semaine(s)',
      recurrenceMonthlySummary: 'Tous les {interval} mois',
      recurrenceYearlySummary: 'Tous les {interval} an(s)',
      editorTitle: 'Gerer les series d evenements',
      editorCopy: 'Creez, modifiez et supprimez des evenements du calendrier directement dans la vue detaillee.',
      seriesTitle: 'Series enregistrees',
      newEventAction: 'Nouvel evenement',
      editAction: 'Modifier',
      deleteAction: 'Supprimer',
      switchToCreateAction: 'Passer a un nouvel evenement',
      createTitle: 'Creer une serie',
      editTitle: 'Modifier la serie',
      deleteConfirm: 'Supprimer la serie d evenements "{title}" ? Cela retire toutes les occurrences futures de la serie.',
      emptySeriesTitle: 'Aucune serie d evenements',
      emptySeriesCopy: 'Creez la premiere serie d evenements pour alimenter le widget calendrier.',
      titleLabel: 'Titre',
      titlePlaceholder: 'Planification familiale',
      dateLabel: 'Date',
      timeLabel: 'Heure',
      cityLabel: 'Ville',
      cityPlaceholder: 'Berlin',
      countryLabel: 'Pays',
      countryPlaceholder: 'DE',
      descriptionLabel: 'Description',
      descriptionPlaceholder: 'Contexte, notes de preparation ou details d agenda.',
      scopeLabel: 'Portee',
      scopeHouseholdOption: 'Tout le foyer',
      scopeMembersOption: 'Membres selectionnes',
      recurrenceLabel: 'Recurrence',
      recurrenceOneOffOption: 'Unique',
      recurrenceDailyOption: 'Quotidienne',
      recurrenceWeeklyOption: 'Hebdomadaire',
      recurrenceMonthlyOption: 'Mensuelle',
      recurrenceYearlyOption: 'Annuelle',
      intervalLabel: 'Intervalle',
      countLabel: 'Nombre',
      countPlaceholder: 'Facultatif',
      untilLabel: 'Jusqu au',
      createSeriesAction: 'Creer la serie',
      saveSeriesAction: 'Enregistrer la serie',
      creatingSeriesAction: 'Creation de l evenement...',
      savingSeriesAction: 'Enregistrement de l evenement...',
      createdNotice: 'Serie d evenements creee.',
      updatedNotice: 'Serie d evenements mise a jour.',
      deletedNotice: 'Serie d evenements supprimee.',
      saveFailedFallback: 'Impossible d enregistrer l evenement du calendrier.',
      deleteFailedFallback: 'Impossible de supprimer l evenement du calendrier.',
    },
    settings: {
      title: 'Reglages du widget calendrier',
      description: 'Controlez l inclusion des evenements de tout le foyer dans la vue compacte sur sept jours.',
      fields: {
        includeHouseholdEvents: {
          label: 'Inclure les evenements du foyer',
        },
      },
    },
  },
  es: {
    title: 'Calendario',
    boardKicker: 'Calendario',
    copy: {
      upcomingEventsMeta: '{count} eventos proximos',
      emptyTitle: 'No hay eventos en los proximos 7 dias',
      emptyCopy: 'Ningun evento del calendario coincide con el alcance activo en la ventana de los proximos siete dias.',
      emptyItemTitle: 'No hay eventos del calendario',
      emptyItemLocation: 'Widget de calendario',
      emptyItemNote: 'Los datos del calendario apareceran aqui cuando haya eventos disponibles para el alcance activo.',
    },
    detail: {
      weekViewAction: 'Semana',
      monthViewAction: 'Mes',
      yearViewAction: 'Ano',
      previousRangeAction: 'Anterior',
      nextRangeAction: 'Siguiente',
      rangeEventCountMeta: '{count} eventos en el rango',
      loadingState: 'Cargando el rango del calendario...',
      loadFailed: 'No se pudo cargar la vista detallada del calendario.',
      detailsKicker: 'Evento seleccionado',
      detailsEmptyTitle: 'No hay evento seleccionado',
      detailsEmptyCopy: 'Elige un evento de la matriz del calendario para ver sus detalles.',
      closePanelAction: 'Cerrar panel',
      emptyRangeTitle: 'No hay eventos en este rango',
      emptyRangeCopy: 'Ningun evento del calendario coincide con el alcance activo en el rango seleccionado.',
      householdScopeLabel: 'Todo el hogar',
      recurrenceOneOffSummary: 'Evento unico',
      recurrenceDailySummary: 'Cada {interval} dia(s)',
      recurrenceWeeklySummary: 'Cada {interval} semana(s)',
      recurrenceMonthlySummary: 'Cada {interval} mes(es)',
      recurrenceYearlySummary: 'Cada {interval} ano(s)',
      editorTitle: 'Gestionar series de eventos',
      editorCopy: 'Crea, edita y elimina eventos del calendario directamente en la vista detallada.',
      seriesTitle: 'Series guardadas',
      newEventAction: 'Nuevo evento',
      editAction: 'Editar',
      deleteAction: 'Eliminar',
      switchToCreateAction: 'Cambiar a un evento nuevo',
      createTitle: 'Crear serie de eventos',
      editTitle: 'Editar serie de eventos',
      deleteConfirm: 'Eliminar la serie de eventos "{title}"? Esto elimina todas las apariciones futuras de la serie.',
      emptySeriesTitle: 'Todavia no hay series de eventos',
      emptySeriesCopy: 'Crea la primera serie de eventos para llenar el widget de calendario.',
      titleLabel: 'Titulo',
      titlePlaceholder: 'Planificacion familiar',
      dateLabel: 'Fecha',
      timeLabel: 'Hora',
      cityLabel: 'Ciudad',
      cityPlaceholder: 'Berlin',
      countryLabel: 'Pais',
      countryPlaceholder: 'DE',
      descriptionLabel: 'Descripcion',
      descriptionPlaceholder: 'Contexto, notas de preparacion o detalles de agenda.',
      scopeLabel: 'Alcance',
      scopeHouseholdOption: 'Todo el hogar',
      scopeMembersOption: 'Familiares seleccionados',
      recurrenceLabel: 'Recurrencia',
      recurrenceOneOffOption: 'Unico',
      recurrenceDailyOption: 'Diaria',
      recurrenceWeeklyOption: 'Semanal',
      recurrenceMonthlyOption: 'Mensual',
      recurrenceYearlyOption: 'Anual',
      intervalLabel: 'Intervalo',
      countLabel: 'Cantidad',
      countPlaceholder: 'Opcional',
      untilLabel: 'Hasta',
      createSeriesAction: 'Crear serie de eventos',
      saveSeriesAction: 'Guardar serie de eventos',
      creatingSeriesAction: 'Creando evento...',
      savingSeriesAction: 'Guardando evento...',
      createdNotice: 'Serie de eventos creada.',
      updatedNotice: 'Serie de eventos actualizada.',
      deletedNotice: 'Serie de eventos eliminada.',
      saveFailedFallback: 'No se pudo guardar el evento del calendario.',
      deleteFailedFallback: 'No se pudo eliminar el evento del calendario.',
    },
    settings: {
      title: 'Configuracion del widget de calendario',
      description: 'Controla si se incluyen los eventos de todo el hogar en la vista compacta de siete dias.',
      fields: {
        includeHouseholdEvents: {
          label: 'Incluir eventos de todo el hogar',
        },
      },
    },
  },
})

export const getCalendarWidgetTranslation = (
  languageCode: SupportedLanguageCode,
) => getWidgetTranslationFromCatalog(calendarWidgetTranslationCatalog, languageCode)

export const matchesCalendarWidgetTitle = createDefaultWidgetTitleMatcher(
  calendarWidgetTranslationCatalog,
)
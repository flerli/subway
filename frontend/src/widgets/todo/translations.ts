import type { SupportedLanguageCode } from '../../i18n/localization'
import type { WidgetTranslationDefinition } from '../widgetTypes'
import {
  createDefaultWidgetTitleMatcher,
  createWidgetTranslationCatalog,
  getWidgetTranslationFromCatalog,
} from '../widgetLocalization'

export interface TodoWidgetTranslation extends WidgetTranslationDefinition {
  copy: {
    openItemsMeta: string
    doneAction: string
    reopenAction: string
    emptyTitle: string
    emptyCopy: string
    emptyItemTask: string
    emptyItemDue: string
    emptyItemLane: string
  }
}

const todoWidgetTranslationCatalog = createWidgetTranslationCatalog<TodoWidgetTranslation>({
  en: {
    title: 'Todo',
    boardKicker: 'Todo',
    copy: {
      openItemsMeta: '{count} open items',
      doneAction: 'Done',
      reopenAction: 'Reopen',
      emptyTitle: 'No tasks in scope',
      emptyCopy: 'This widget is assigned to another focused member in the current sample setup.',
      emptyItemTask: 'No open todo items',
      emptyItemDue: 'No due date',
      emptyItemLane: 'Todo widget',
    },
    settings: {
      title: 'Todo widget settings',
      description: 'Choose whether completed tasks remain visible and how many tasks are rendered at once.',
      fields: {
        maxItems: {
          label: 'Max visible tasks',
        },
        showCompleted: {
          label: 'Show completed tasks',
        },
      },
    },
  },
  de: {
    title: 'Aufgaben',
    boardKicker: 'Aufgaben',
    copy: {
      openItemsMeta: '{count} offene Aufgaben',
      doneAction: 'Erledigt',
      reopenAction: 'Erneut oeffnen',
      emptyTitle: 'Keine Aufgaben im Umfang',
      emptyCopy: 'Dieses Widget ist in der aktuellen Beispielkonfiguration einem anderen Fokusmitglied zugeordnet.',
      emptyItemTask: 'Keine offenen Aufgaben',
      emptyItemDue: 'Kein Faelligkeitsdatum',
      emptyItemLane: 'Aufgaben-Widget',
    },
    settings: {
      title: 'Einstellungen des Aufgaben-Widgets',
      description: 'Waehle, ob erledigte Aufgaben sichtbar bleiben und wie viele Aufgaben gleichzeitig angezeigt werden.',
      fields: {
        maxItems: {
          label: 'Maximal sichtbare Aufgaben',
        },
        showCompleted: {
          label: 'Erledigte Aufgaben anzeigen',
        },
      },
    },
  },
  fr: {
    title: 'Taches',
    boardKicker: 'Taches',
    copy: {
      openItemsMeta: '{count} taches ouvertes',
      doneAction: 'Fait',
      reopenAction: 'Reouvrir',
      emptyTitle: 'Aucune tache dans la portee',
      emptyCopy: 'Ce widget est attribue a un autre membre cible dans la configuration d exemple actuelle.',
      emptyItemTask: 'Aucune tache ouverte',
      emptyItemDue: 'Aucune date limite',
      emptyItemLane: 'Widget taches',
    },
    settings: {
      title: 'Reglages du widget taches',
      description: 'Choisissez si les taches terminees restent visibles et combien de taches sont affichees a la fois.',
      fields: {
        maxItems: {
          label: 'Nombre maximal de taches visibles',
        },
        showCompleted: {
          label: 'Afficher les taches terminees',
        },
      },
    },
  },
  es: {
    title: 'Tareas',
    boardKicker: 'Tareas',
    copy: {
      openItemsMeta: '{count} tareas abiertas',
      doneAction: 'Hecho',
      reopenAction: 'Reabrir',
      emptyTitle: 'No hay tareas en el alcance',
      emptyCopy: 'Este widget esta asignado a otro miembro enfocado en la configuracion de ejemplo actual.',
      emptyItemTask: 'No hay tareas abiertas',
      emptyItemDue: 'Sin fecha limite',
      emptyItemLane: 'Widget de tareas',
    },
    settings: {
      title: 'Configuracion del widget de tareas',
      description: 'Elige si las tareas completadas siguen visibles y cuantas tareas se muestran a la vez.',
      fields: {
        maxItems: {
          label: 'Maximo de tareas visibles',
        },
        showCompleted: {
          label: 'Mostrar tareas completadas',
        },
      },
    },
  },
})

export const getTodoWidgetTranslation = (
  languageCode: SupportedLanguageCode,
) => getWidgetTranslationFromCatalog(todoWidgetTranslationCatalog, languageCode)

export const matchesTodoWidgetTitle = createDefaultWidgetTitleMatcher(
  todoWidgetTranslationCatalog,
)
import { fetchTodoItems, updateTodoItemDoneState } from './todoApi'
import type { TodoItem } from '../widgetHostModels'
import type { WidgetMicroAppContract } from '../widgetTypes'
import {
  getTodoWidgetTranslation,
  matchesTodoWidgetTitle,
} from './translations'

const defaultTodoWidgetTranslation = getTodoWidgetTranslation('en')

const ALL_MEMBERS_AUDIENCE = '*'

const matchesFocusedMember = (
  todoItem: TodoItem,
  focusedMemberId?: string | null,
) => {
  if (!focusedMemberId) {
    return true
  }

  return (
    todoItem.members.includes(ALL_MEMBERS_AUDIENCE) ||
    todoItem.members.includes(focusedMemberId)
  )
}

export const normalizeTodoSettings = (value: unknown) => {
  const candidate = value as {
    maxItems?: unknown
    showCompleted?: unknown
  }

  return {
    maxItems:
      typeof candidate?.maxItems === 'number' && candidate.maxItems > 0
        ? Math.min(candidate.maxItems, 10)
        : 4,
    showCompleted:
      typeof candidate?.showCompleted === 'boolean'
        ? candidate.showCompleted
        : true,
  }
}

  export const filterTodoItemsForView = (
    todoItems: TodoItem[],
    focusedMemberId: string | null | undefined,
    settingsValue: unknown,
  ) => {
    const settings = normalizeTodoSettings(settingsValue)

    return todoItems
      .filter((todoItem) => matchesFocusedMember(todoItem, focusedMemberId))
      .filter((todoItem) => (settings.showCompleted ? true : !todoItem.done))
      .slice(0, settings.maxItems)
  }

export const todoWidget: WidgetMicroAppContract = {
  entityId: 'todo',
  folderName: 'todo',
  dataSource: 'database',
  capabilities: ['read', 'write'],
  hasSettingsPanel: true,
  getTranslation: getTodoWidgetTranslation,
  matchesDefaultTitle: matchesTodoWidgetTitle,
  settingsDefinition: {
    title: defaultTodoWidgetTranslation.settings?.title ?? 'Todo widget settings',
    description:
      defaultTodoWidgetTranslation.settings?.description ??
      'Choose whether completed tasks remain visible and how many tasks are rendered at once.',
    defaults: normalizeTodoSettings({}),
    fields: [
      {
        key: 'maxItems',
        label:
          defaultTodoWidgetTranslation.settings?.fields.maxItems.label ??
          'Max visible tasks',
        type: 'number',
        min: 1,
        max: 10,
        step: 1,
      },
      {
        key: 'showCompleted',
        label:
          defaultTodoWidgetTranslation.settings?.fields.showCompleted.label ??
          'Show completed tasks',
        type: 'boolean',
      },
    ],
    normalize: normalizeTodoSettings,
  },
  loadData: async (context) => {
    const todoItems = await fetchTodoItems()

    return filterTodoItemsForView(todoItems, context.focusedMemberId, context.settings)
  },
  mutateData: async (context) => {
    if (context.action !== 'set-done-state') {
      return
    }

    const payload = context.payload as {
      todoItemId?: unknown
      done?: unknown
    }

    if (
      typeof payload?.todoItemId !== 'string' ||
      typeof payload?.done !== 'boolean'
    ) {
      throw new Error('Todo widget mutateData payload is invalid.')
    }

    await updateTodoItemDoneState(payload.todoItemId, payload.done)
  },
}

export const widgetModule = todoWidget
export { getTodoWidgetTranslation } from './translations'
export type { TodoWidgetTranslation } from './translations'
import type { TodoItem } from '../widgetHostModels'
import { fetchApi } from '../../api/request'

const normalizeTodoItem = (value: unknown): TodoItem | null => {
  const candidate = value as {
    id?: unknown
    task?: unknown
    due?: unknown
    lane?: unknown
    done?: unknown
    members?: unknown
  }

  if (
    !value ||
    typeof value !== 'object' ||
    typeof candidate.id !== 'string' ||
    typeof candidate.task !== 'string' ||
    typeof candidate.due !== 'string' ||
    typeof candidate.lane !== 'string' ||
    typeof candidate.done !== 'boolean' ||
    !Array.isArray(candidate.members)
  ) {
    return null
  }

  return {
    id: candidate.id,
    line: `todo-${candidate.task.toLowerCase().replace(/\s+/g, '-')}`,
    task: candidate.task,
    due: candidate.due,
    lane: candidate.lane,
    done: candidate.done,
    members: candidate.members.filter(
      (memberId: unknown): memberId is string => typeof memberId === 'string',
    ),
  }
}

export const fetchTodoItems = async () => {
  const response = await fetchApi('/todo-items')

  if (!response.ok) {
    throw new Error('Failed to load todo items from backend.')
  }

  const payload = (await response.json()) as { todoItems?: unknown[] }

  return (payload.todoItems ?? [])
    .map(normalizeTodoItem)
    .filter((todoItem): todoItem is TodoItem => Boolean(todoItem))
}

export const updateTodoItemDoneState = async (todoItemId: string, done: boolean) => {
  const response = await fetchApi(`/todo-items/${todoItemId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ done }),
  })

  if (!response.ok) {
    throw new Error('Failed to update todo item state in backend.')
  }

  const payload = (await response.json()) as { todoItem?: unknown }
  const todoItem = normalizeTodoItem(payload.todoItem)

  if (!todoItem) {
    throw new Error('Backend returned an invalid todo item payload.')
  }

  return todoItem
}
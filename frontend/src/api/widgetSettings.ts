import type { WidgetSettingsValues } from '../widgets/widgetTypes'
import { fetchApi } from './request'

export interface WidgetSettingRecord {
  widgetId: string
  settings: WidgetSettingsValues
  updatedAt: string
}

export interface WidgetMcpToolLogPayload {
  toolCallId: string
  serverName: string
  toolName: string
  widgetId: string | null
  widgetTitle: string | null
  sourceLocation: string | null
  status: 'running' | 'completed' | 'error'
  displayArguments: unknown
  displayResult: unknown
  redactArguments: boolean
  redactResults: boolean
  error: {
    message: string
    errorCode: string
  } | null
}

export interface WidgetMcpToolLogRecord {
  id: string
  threadId: string
  threadTitle: string
  messageId: string | null
  eventType: 'tool_call'
  payload: WidgetMcpToolLogPayload
  createdAt: string
  updatedAt: string
}

const normalizeWidgetSettingsValue = (
  value: unknown,
): unknown => {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeWidgetSettingsValue(entry))
      .filter((entry) => entry !== undefined)
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, nestedValue]) => {
        const normalizedNestedValue = normalizeWidgetSettingsValue(nestedValue)

        return normalizedNestedValue === undefined
          ? []
          : [[key, normalizedNestedValue]]
      }),
    )
  }

  return undefined
}

const normalizeWidgetSetting = (value: unknown): WidgetSettingRecord | null => {
  const candidate = value as {
    widgetId?: unknown
    updatedAt?: unknown
    settings?: unknown
  }

  if (
    !value ||
    typeof value !== 'object' ||
    typeof candidate.widgetId !== 'string' ||
    typeof candidate.updatedAt !== 'string' ||
    !candidate.settings ||
    typeof candidate.settings !== 'object' ||
    Array.isArray(candidate.settings)
  ) {
    return null
  }

  return {
    widgetId: candidate.widgetId,
    updatedAt: candidate.updatedAt,
    settings: Object.fromEntries(
      Object.entries(candidate.settings).flatMap(([key, fieldValue]) => {
        const normalizedFieldValue = normalizeWidgetSettingsValue(fieldValue)

        return normalizedFieldValue === undefined
          ? []
          : [[key, normalizedFieldValue]]
      }),
    ),
  }
}

const normalizeWidgetMcpToolLogPayload = (
  value: unknown,
): WidgetMcpToolLogPayload => {
  const candidate = value as {
    toolCallId?: unknown
    serverName?: unknown
    toolName?: unknown
    widgetId?: unknown
    widgetTitle?: unknown
    sourceLocation?: unknown
    status?: unknown
    displayArguments?: unknown
    displayResult?: unknown
    redactArguments?: unknown
    redactResults?: unknown
    error?: unknown
  }
  const errorCandidate = candidate?.error as {
    message?: unknown
    errorCode?: unknown
  }

  return {
    toolCallId: typeof candidate?.toolCallId === 'string' ? candidate.toolCallId : '',
    serverName: typeof candidate?.serverName === 'string' ? candidate.serverName : '',
    toolName: typeof candidate?.toolName === 'string' ? candidate.toolName : '',
    widgetId: typeof candidate?.widgetId === 'string' ? candidate.widgetId : null,
    widgetTitle: typeof candidate?.widgetTitle === 'string' ? candidate.widgetTitle : null,
    sourceLocation:
      typeof candidate?.sourceLocation === 'string' ? candidate.sourceLocation : null,
    status:
      candidate?.status === 'completed' ||
      candidate?.status === 'error' ||
      candidate?.status === 'running'
        ? candidate.status
        : 'running',
    displayArguments: candidate?.displayArguments ?? null,
    displayResult: candidate?.displayResult ?? null,
    redactArguments: candidate?.redactArguments === true,
    redactResults: candidate?.redactResults === true,
    error:
      errorCandidate &&
      typeof errorCandidate.message === 'string' &&
      typeof errorCandidate.errorCode === 'string'
        ? {
            message: errorCandidate.message,
            errorCode: errorCandidate.errorCode,
          }
        : null,
  }
}

const normalizeWidgetMcpToolLogRecord = (
  value: unknown,
): WidgetMcpToolLogRecord | null => {
  const candidate = value as {
    id?: unknown
    threadId?: unknown
    threadTitle?: unknown
    messageId?: unknown
    eventType?: unknown
    payload?: unknown
    createdAt?: unknown
    updatedAt?: unknown
  }

  if (
    !value ||
    typeof value !== 'object' ||
    typeof candidate.id !== 'string' ||
    typeof candidate.threadId !== 'string' ||
    typeof candidate.createdAt !== 'string' ||
    typeof candidate.updatedAt !== 'string'
  ) {
    return null
  }

  return {
    id: candidate.id,
    threadId: candidate.threadId,
    threadTitle: typeof candidate.threadTitle === 'string' ? candidate.threadTitle : '',
    messageId: typeof candidate.messageId === 'string' ? candidate.messageId : null,
    eventType: 'tool_call',
    payload: normalizeWidgetMcpToolLogPayload(candidate.payload),
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
  }
}

export const fetchWidgetSettings = async () => {
  const response = await fetchApi('/widget-settings')

  if (!response.ok) {
    throw new Error('Failed to load widget settings from backend.')
  }

  const payload = (await response.json()) as { widgetSettings?: unknown[] }

  return (payload.widgetSettings ?? [])
    .map(normalizeWidgetSetting)
    .filter((widgetSetting): widgetSetting is WidgetSettingRecord => Boolean(widgetSetting))
}

export const updateWidgetSettings = async (
  widgetId: string,
  settings: WidgetSettingsValues,
) => {
  const response = await fetchApi(`/widget-settings/${widgetId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ settings }),
  })

  if (!response.ok) {
    throw new Error('Failed to update widget settings in backend.')
  }

  const payload = (await response.json()) as { widgetSetting?: unknown }
  const widgetSetting = normalizeWidgetSetting(payload.widgetSetting)

  if (!widgetSetting) {
    throw new Error('Backend returned an invalid widget settings payload.')
  }

  return widgetSetting
}

export const fetchWidgetMcpToolLog = async (widgetId: string) => {
  const response = await fetchApi(`/widget-settings/${widgetId}/mcp-tool-log`)

  if (!response.ok) {
    throw new Error('Failed to load widget MCP tool log from backend.')
  }

  const payload = (await response.json()) as { toolEvents?: unknown[] }

  return (payload.toolEvents ?? [])
    .map(normalizeWidgetMcpToolLogRecord)
    .filter((toolEvent): toolEvent is WidgetMcpToolLogRecord => Boolean(toolEvent))
}

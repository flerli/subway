import { AuthRequiredError, fetchApi, getApiUrl } from './request'
import type { RegisteredWidgetMcpTool } from '../widgets/widgetTypes'

export type AssistantAvailabilityStatus =
  | 'available'
  | 'not_configured'
  | 'disabled'
  | 'unavailable'

export interface AssistantRouteRecord {
  id: string
  label: string
  backendKind: 'litellm' | 'custom' | ''
  supportsStreaming: boolean
  supportsTools: boolean
  supportsMarkdown: boolean
  enabled: boolean
}

export interface AssistantSettingsRecord {
  routeId: string
  label: string
  backendKind: 'litellm' | 'custom' | ''
  baseUrl: string
  modelIdentifier: string
  hasStoredApiKey: boolean
  headersJson: string
  enabled: boolean
  isDefault: boolean
  supportsStreaming: boolean
  supportsTools: boolean
  supportsMarkdown: boolean
  updatedAt: string | null
}

export interface AssistantAvailabilityRecord {
  status: AssistantAvailabilityStatus
  activeRoute: AssistantRouteRecord | null
}

export interface AssistantThreadSummary {
  id: string
  routeId: string | null
  title: string
  state: 'active' | 'archived'
  messageCount: number
  createdAt: string
  updatedAt: string
}

export interface AssistantMessageRecord {
  id: string
  threadId: string
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  sequenceIndex: number
  createdAt: string
  updatedAt: string
}

export interface AssistantThreadDetail extends AssistantThreadSummary {
  messages: AssistantMessageRecord[]
  events: AssistantMessageEventRecord[]
}

export interface AssistantToolEventPayload {
  toolCallId: string
  serverName: string
  toolName: string
  widgetId: string | null
  widgetTitle: string | null
  sourceLocation: string | null
  status:
    | 'running'
    | 'completed'
    | 'error'
    | 'approval_pending'
    | 'approval_approved'
    | 'approval_rejected'
    | 'approval_canceled'
    | 'approval_expired'
  approval: {
    requestId: string
    required: boolean
    state: 'pending' | 'approved' | 'rejected' | 'canceled' | 'expired'
    expiresAt: string | null
    resolvedAt: string | null
  } | null
  displayArguments: unknown
  displayResult: unknown
  redactArguments: boolean
  redactResults: boolean
  error: {
    message: string
    errorCode: string
  } | null
}

export interface AssistantMessageEventRecord {
  id: string
  threadId: string
  messageId: string | null
  eventType: 'tool_call'
  payload: AssistantToolEventPayload
  createdAt: string
  updatedAt: string
}

export interface AssistantTurnUsageRecord {
  promptTokens: number | null
  completionTokens: number | null
  totalTokens: number | null
}

export interface AssistantTurnRuntimeRecord {
  route: AssistantRouteRecord | null
  providerMessageId: string | null
  finishReason: string | null
  usage: AssistantTurnUsageRecord | null
  streaming: {
    requested: boolean
    supported: boolean
    delivered: boolean
  }
}

export interface AssistantTurnResponse {
  thread: AssistantThreadSummary
  userMessage: AssistantMessageRecord
  assistantMessage: AssistantMessageRecord
  events: AssistantMessageEventRecord[]
  runtime: AssistantTurnRuntimeRecord
}

export interface AssistantTurnStartedEvent {
  thread: AssistantThreadSummary
  userMessage: AssistantMessageRecord
  runtime: AssistantTurnRuntimeRecord
}

export interface AssistantTurnChunkEvent {
  messageId: string
  delta: string
  content: string
}

export interface AssistantMessageStreamHandlers {
  onStarted?: (event: AssistantTurnStartedEvent) => void
  onChunk?: (event: AssistantTurnChunkEvent) => void
  onComplete?: (event: AssistantTurnResponse) => void
}

export interface AssistantMessageRequestOptions {
  requestedTools?: boolean
  widgetTools?: RegisteredWidgetMcpTool[]
}

export interface AssistantMessageStreamOptions
  extends AssistantMessageStreamHandlers,
    AssistantMessageRequestOptions {}

export type AssistantToolApprovalAction = 'approve' | 'reject' | 'cancel'

const normalizeAssistantAvailabilityStatus = (
  value: unknown,
): AssistantAvailabilityStatus => {
  switch (value) {
    case 'available':
    case 'disabled':
    case 'unavailable':
    case 'not_configured':
      return value
    default:
      return 'not_configured'
  }
}

const normalizeAssistantRoute = (value: unknown): AssistantRouteRecord | null => {
  const candidate = value as {
    id?: unknown
    label?: unknown
    backendKind?: unknown
    supportsStreaming?: unknown
    supportsTools?: unknown
    supportsMarkdown?: unknown
    enabled?: unknown
  }

  if (
    !value ||
    typeof value !== 'object' ||
    typeof candidate.id !== 'string' ||
    typeof candidate.label !== 'string'
  ) {
    return null
  }

  return {
    id: candidate.id,
    label: candidate.label,
    backendKind:
      candidate.backendKind === 'litellm' || candidate.backendKind === 'custom'
        ? candidate.backendKind
        : '',
    supportsStreaming: candidate.supportsStreaming === true,
    supportsTools: candidate.supportsTools === true,
    supportsMarkdown: candidate.supportsMarkdown === true,
    enabled: candidate.enabled === true,
  }
}

const normalizeAssistantSettings = (value: unknown): AssistantSettingsRecord | null => {
  const candidate = value as {
    routeId?: unknown
    label?: unknown
    backendKind?: unknown
    baseUrl?: unknown
    modelIdentifier?: unknown
    hasStoredApiKey?: unknown
    headersJson?: unknown
    enabled?: unknown
    isDefault?: unknown
    supportsStreaming?: unknown
    supportsTools?: unknown
    supportsMarkdown?: unknown
    updatedAt?: unknown
  }

  if (!value || typeof value !== 'object') {
    return null
  }

  return {
    routeId: typeof candidate.routeId === 'string' ? candidate.routeId : '',
    label: typeof candidate.label === 'string' ? candidate.label : '',
    backendKind:
      candidate.backendKind === 'litellm' || candidate.backendKind === 'custom'
        ? candidate.backendKind
        : '',
    baseUrl: typeof candidate.baseUrl === 'string' ? candidate.baseUrl : '',
    modelIdentifier:
      typeof candidate.modelIdentifier === 'string' ? candidate.modelIdentifier : '',
    hasStoredApiKey: candidate.hasStoredApiKey === true,
    headersJson: typeof candidate.headersJson === 'string' ? candidate.headersJson : '{}',
    enabled: candidate.enabled !== false,
    isDefault: candidate.isDefault === true,
    supportsStreaming: candidate.supportsStreaming === true,
    supportsTools: candidate.supportsTools === true,
    supportsMarkdown: candidate.supportsMarkdown !== false,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : null,
  }
}

const normalizeAssistantThreadSummary = (value: unknown): AssistantThreadSummary => {
  const candidate = value as {
    id?: unknown
    routeId?: unknown
    title?: unknown
    state?: unknown
    messageCount?: unknown
    createdAt?: unknown
    updatedAt?: unknown
  }

  if (
    !value ||
    typeof value !== 'object' ||
    typeof candidate.id !== 'string' ||
    typeof candidate.title !== 'string' ||
    typeof candidate.createdAt !== 'string' ||
    typeof candidate.updatedAt !== 'string'
  ) {
    throw new Error('Backend returned an invalid assistant thread payload.')
  }

  return {
    id: candidate.id,
    routeId: typeof candidate.routeId === 'string' && candidate.routeId.length > 0 ? candidate.routeId : null,
    title: candidate.title,
    state: candidate.state === 'archived' ? 'archived' : 'active',
    messageCount: typeof candidate.messageCount === 'number' ? candidate.messageCount : 0,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
  }
}

const normalizeAssistantMessage = (value: unknown): AssistantMessageRecord => {
  const candidate = value as {
    id?: unknown
    threadId?: unknown
    role?: unknown
    content?: unknown
    sequenceIndex?: unknown
    createdAt?: unknown
    updatedAt?: unknown
  }

  if (
    !value ||
    typeof value !== 'object' ||
    typeof candidate.id !== 'string' ||
    typeof candidate.threadId !== 'string' ||
    typeof candidate.content !== 'string' ||
    typeof candidate.createdAt !== 'string' ||
    typeof candidate.updatedAt !== 'string'
  ) {
    throw new Error('Backend returned an invalid assistant message payload.')
  }

  return {
    id: candidate.id,
    threadId: candidate.threadId,
    role:
      candidate.role === 'system' ||
      candidate.role === 'user' ||
      candidate.role === 'tool' ||
      candidate.role === 'assistant'
        ? candidate.role
        : 'assistant',
    content: candidate.content,
    sequenceIndex: typeof candidate.sequenceIndex === 'number' ? candidate.sequenceIndex : 0,
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
  }
}

const normalizeAssistantUsage = (value: unknown): AssistantTurnUsageRecord | null => {
  const candidate = value as {
    promptTokens?: unknown
    completionTokens?: unknown
    totalTokens?: unknown
  }

  if (!value || typeof value !== 'object') {
    return null
  }

  const promptTokens = typeof candidate.promptTokens === 'number' ? candidate.promptTokens : null
  const completionTokens =
    typeof candidate.completionTokens === 'number' ? candidate.completionTokens : null
  const totalTokens = typeof candidate.totalTokens === 'number' ? candidate.totalTokens : null

  if (promptTokens === null && completionTokens === null && totalTokens === null) {
    return null
  }

  return {
    promptTokens,
    completionTokens,
    totalTokens,
  }
}

const normalizeAssistantToolEventPayload = (value: unknown): AssistantToolEventPayload => {
  const candidate = value as {
    toolCallId?: unknown
    serverName?: unknown
    toolName?: unknown
    widgetId?: unknown
    widgetTitle?: unknown
    sourceLocation?: unknown
    status?: unknown
    approval?: unknown
    displayArguments?: unknown
    displayResult?: unknown
    redactArguments?: unknown
    redactResults?: unknown
    error?: unknown
  }
  const approvalCandidate = candidate?.approval as {
    requestId?: unknown
    required?: unknown
    state?: unknown
    expiresAt?: unknown
    resolvedAt?: unknown
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
      candidate?.status === 'running' ||
      candidate?.status === 'completed' ||
      candidate?.status === 'error' ||
      candidate?.status === 'approval_pending' ||
      candidate?.status === 'approval_approved' ||
      candidate?.status === 'approval_rejected' ||
      candidate?.status === 'approval_canceled' ||
      candidate?.status === 'approval_expired'
        ? candidate.status
        : 'running',
    approval:
      approvalCandidate &&
      typeof approvalCandidate.requestId === 'string' &&
      (approvalCandidate.state === 'pending' ||
        approvalCandidate.state === 'approved' ||
        approvalCandidate.state === 'rejected' ||
        approvalCandidate.state === 'canceled' ||
        approvalCandidate.state === 'expired')
        ? {
            requestId: approvalCandidate.requestId,
            required: approvalCandidate.required === true,
            state: approvalCandidate.state,
            expiresAt:
              typeof approvalCandidate.expiresAt === 'string'
                ? approvalCandidate.expiresAt
                : null,
            resolvedAt:
              typeof approvalCandidate.resolvedAt === 'string'
                ? approvalCandidate.resolvedAt
                : null,
          }
        : null,
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

const normalizeAssistantMessageEvent = (value: unknown): AssistantMessageEventRecord => {
  const candidate = value as {
    id?: unknown
    threadId?: unknown
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
    throw new Error('Backend returned an invalid assistant message event payload.')
  }

  return {
    id: candidate.id,
    threadId: candidate.threadId,
    messageId: typeof candidate.messageId === 'string' && candidate.messageId.length > 0 ? candidate.messageId : null,
    eventType: 'tool_call',
    payload: normalizeAssistantToolEventPayload(candidate.payload),
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
  }
}

const normalizeAssistantRuntime = (value: unknown): AssistantTurnRuntimeRecord => {
  const candidate = value as {
    route?: unknown
    providerMessageId?: unknown
    finishReason?: unknown
    usage?: unknown
    streaming?: unknown
  }
  const streamingCandidate = candidate?.streaming as {
    requested?: unknown
    supported?: unknown
    delivered?: unknown
  }

  return {
    route: normalizeAssistantRoute(candidate?.route),
    providerMessageId:
      typeof candidate?.providerMessageId === 'string' ? candidate.providerMessageId : null,
    finishReason:
      typeof candidate?.finishReason === 'string' ? candidate.finishReason : null,
    usage: normalizeAssistantUsage(candidate?.usage),
    streaming: {
      requested: streamingCandidate?.requested === true,
      supported: streamingCandidate?.supported === true,
      delivered: streamingCandidate?.delivered === true,
    },
  }
}

const normalizeAssistantTurnResponse = (value: unknown): AssistantTurnResponse => {
  const candidate = value as {
    thread?: unknown
    userMessage?: unknown
    assistantMessage?: unknown
    events?: unknown
    runtime?: unknown
  }

  return {
    thread: normalizeAssistantThreadSummary(candidate?.thread),
    userMessage: normalizeAssistantMessage(candidate?.userMessage),
    assistantMessage: normalizeAssistantMessage(candidate?.assistantMessage),
    events: Array.isArray(candidate?.events)
      ? candidate.events.map(normalizeAssistantMessageEvent)
      : [],
    runtime: normalizeAssistantRuntime(candidate?.runtime),
  }
}

const buildAssistantApiError = async (response: Response, fallbackMessage: string) => {
  let payload: { error?: unknown } = {}

  try {
    payload = (await response.json()) as { error?: unknown }
  } catch {
    payload = {}
  }

  return new Error(typeof payload.error === 'string' ? payload.error : fallbackMessage)
}

export const fetchAssistantAvailability = async (): Promise<AssistantAvailabilityRecord> => {
  const response = await fetchApi('/assistant/availability')

  if (!response.ok) {
    throw new Error('Failed to load assistant availability.')
  }

  const payload = (await response.json()) as {
    assistant?: {
      status?: unknown
      activeRoute?: unknown
    }
  }

  return {
    status: normalizeAssistantAvailabilityStatus(payload.assistant?.status),
    activeRoute: normalizeAssistantRoute(payload.assistant?.activeRoute),
  }
}

export const fetchAssistantSettings = async (): Promise<AssistantSettingsRecord> => {
  const response = await fetchApi('/assistant/settings')

  if (!response.ok) {
    throw await buildAssistantApiError(response, 'Failed to load assistant settings.')
  }

  const payload = (await response.json()) as { assistantSettings?: unknown }
  const assistantSettings = normalizeAssistantSettings(payload.assistantSettings)

  if (!assistantSettings) {
    throw new Error('Backend returned an invalid assistant settings payload.')
  }

  return assistantSettings
}

export const fetchAssistantRoutes = async (): Promise<AssistantSettingsRecord[]> => {
  const response = await fetchApi('/assistant/routes')

  if (!response.ok) {
    throw await buildAssistantApiError(response, 'Failed to load assistant routes.')
  }

  const payload = (await response.json()) as { routes?: unknown[] }

  if (!Array.isArray(payload.routes)) {
    throw new Error('Backend returned an invalid assistant route list payload.')
  }

  return payload.routes
    .map(normalizeAssistantSettings)
    .filter((route): route is AssistantSettingsRecord => route !== null)
}

export const createAssistantRoute = async (input: {
  routeId: string
  label: string
  backendKind: 'litellm' | 'custom'
  baseUrl: string
  modelIdentifier: string
  apiKey: string
  headersJson: string
  enabled: boolean
  isDefault: boolean
  supportsStreaming: boolean
  supportsTools: boolean
  supportsMarkdown: boolean
}) => {
  const response = await fetchApi('/assistant/routes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw await buildAssistantApiError(response, 'Failed to create assistant route.')
  }

  const payload = (await response.json()) as { route?: unknown }
  const route = normalizeAssistantSettings(payload.route)

  if (!route) {
    throw new Error('Backend returned an invalid assistant route payload.')
  }

  return route
}

export const updateAssistantRoute = async (
  routeId: string,
  input: {
    label: string
    backendKind: 'litellm' | 'custom'
    baseUrl: string
    modelIdentifier: string
    apiKey: string
    headersJson: string
    enabled: boolean
    isDefault: boolean
    supportsStreaming: boolean
    supportsTools: boolean
    supportsMarkdown: boolean
  },
) => {
  const response = await fetchApi(`/assistant/routes/${routeId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw await buildAssistantApiError(response, 'Failed to update assistant route.')
  }

  const payload = (await response.json()) as { route?: unknown }
  const route = normalizeAssistantSettings(payload.route)

  if (!route) {
    throw new Error('Backend returned an invalid assistant route payload.')
  }

  return route
}

export const setDefaultAssistantRoute = async (routeId: string) => {
  const response = await fetchApi(`/assistant/routes/${routeId}/default`, {
    method: 'POST',
  })

  if (!response.ok) {
    throw await buildAssistantApiError(response, 'Failed to set the default assistant route.')
  }

  const payload = (await response.json()) as {
    route?: unknown
    assistant?: {
      status?: unknown
      activeRoute?: unknown
    }
  }
  const route = normalizeAssistantSettings(payload.route)

  if (!route) {
    throw new Error('Backend returned an invalid assistant route payload.')
  }

  return {
    route,
    assistant: {
      status: normalizeAssistantAvailabilityStatus(payload.assistant?.status),
      activeRoute: normalizeAssistantRoute(payload.assistant?.activeRoute),
    },
  }
}

export const deleteAssistantRoute = async (routeId: string) => {
  const response = await fetchApi(`/assistant/routes/${routeId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw await buildAssistantApiError(response, 'Failed to delete assistant route.')
  }

  const payload = (await response.json()) as { deletedRouteId?: unknown }

  if (typeof payload.deletedRouteId !== 'string') {
    throw new Error('Backend returned an invalid assistant route delete payload.')
  }

  return payload.deletedRouteId
}

export const updateAssistantSettings = async (input: {
  routeId: string
  label: string
  backendKind: 'litellm' | 'custom'
  baseUrl: string
  modelIdentifier: string
  apiKey: string
  headersJson: string
  enabled: boolean
  supportsStreaming: boolean
  supportsTools: boolean
  supportsMarkdown: boolean
}) => {
  const response = await fetchApi('/assistant/settings', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw await buildAssistantApiError(response, 'Failed to save assistant settings.')
  }

  const payload = (await response.json()) as {
    assistantSettings?: unknown
    assistant?: {
      status?: unknown
      activeRoute?: unknown
    }
  }
  const assistantSettings = normalizeAssistantSettings(payload.assistantSettings)

  if (!assistantSettings) {
    throw new Error('Backend returned an invalid assistant settings payload.')
  }

  return {
    assistantSettings,
    assistant: {
      status: normalizeAssistantAvailabilityStatus(payload.assistant?.status),
      activeRoute: normalizeAssistantRoute(payload.assistant?.activeRoute),
    },
  }
}

export const fetchAssistantThreads = async (): Promise<AssistantThreadSummary[]> => {
  const response = await fetchApi('/assistant/threads')

  if (!response.ok) {
    throw new Error('Failed to load assistant threads.')
  }

  const payload = (await response.json()) as { threads?: unknown[] }

  if (!Array.isArray(payload.threads)) {
    throw new Error('Backend returned an invalid assistant thread list.')
  }

  return payload.threads.map(normalizeAssistantThreadSummary)
}

export const fetchAssistantThreadDetail = async (
  threadId: string,
): Promise<AssistantThreadDetail> => {
  const response = await fetchApi(`/assistant/threads/${threadId}`)

  if (response.status === 404) {
    throw new Error('Assistant thread not found.')
  }

  if (!response.ok) {
    throw new Error('Failed to load assistant thread detail.')
  }

  const payload = (await response.json()) as {
    thread?: unknown
    messages?: unknown[]
    events?: unknown[]
  }

  if (!Array.isArray(payload.messages)) {
    throw new Error('Backend returned an invalid assistant thread detail payload.')
  }

  if (payload.events !== undefined && !Array.isArray(payload.events)) {
    throw new Error('Backend returned an invalid assistant thread event payload.')
  }

  return {
    ...normalizeAssistantThreadSummary(payload.thread),
    messages: payload.messages.map(normalizeAssistantMessage),
    events: Array.isArray(payload.events) ? payload.events.map(normalizeAssistantMessageEvent) : [],
  }
}

export const createAssistantThread = async (title?: string): Promise<AssistantThreadDetail> => {
  const response = await fetchApi('/assistant/threads', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  })

  if (!response.ok) {
    throw new Error('Failed to create assistant thread.')
  }

  const payload = (await response.json()) as {
    thread?: unknown
    messages?: unknown[]
  }

  if (!Array.isArray(payload.messages)) {
    throw new Error('Backend returned an invalid assistant thread creation payload.')
  }

  return {
    ...normalizeAssistantThreadSummary(payload.thread),
    messages: payload.messages.map(normalizeAssistantMessage),
    events: [],
  }
}

export const deleteAssistantThread = async (threadId: string) => {
  const response = await fetchApi(`/assistant/threads/${threadId}`, {
    method: 'DELETE',
  })

  if (response.status === 404) {
    throw new Error('Assistant thread not found.')
  }

  if (!response.ok) {
    throw await buildAssistantApiError(response, 'Failed to delete assistant thread.')
  }

  const payload = (await response.json()) as { deletedThreadId?: unknown }

  if (typeof payload.deletedThreadId !== 'string') {
    throw new Error('Backend returned an invalid assistant delete payload.')
  }

  return payload.deletedThreadId
}

export const sendAssistantThreadMessage = async (
  threadId: string,
  content: string,
  options: AssistantMessageRequestOptions = {},
): Promise<AssistantTurnResponse> => {
  const requestedTools = options.requestedTools === true

  const response = await fetchApi(`/assistant/threads/${threadId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content,
      stream: false,
      requestedTools,
      widgetTools: requestedTools ? options.widgetTools ?? [] : [],
    }),
  })

  if (!response.ok) {
    throw await buildAssistantApiError(response, 'Failed to send assistant message.')
  }

  return normalizeAssistantTurnResponse(await response.json())
}

export const streamAssistantThreadMessage = async (
  threadId: string,
  content: string,
  options: AssistantMessageStreamOptions = {},
): Promise<AssistantTurnResponse> => {
  const requestedTools = options.requestedTools === true

  const response = await fetch(getApiUrl(`/assistant/threads/${threadId}/messages`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin',
    body: JSON.stringify({
      content,
      stream: true,
      requestedTools,
      widgetTools: requestedTools ? options.widgetTools ?? [] : [],
    }),
  })

  if (response.status === 401) {
    throw new AuthRequiredError()
  }

  if (!response.ok) {
    throw await buildAssistantApiError(response, 'Failed to stream assistant message.')
  }

  const reader = response.body?.getReader()

  if (!reader) {
    throw new Error('Assistant stream is not available.')
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let completedTurn: AssistantTurnResponse | null = null

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmedLine = line.trim()

      if (!trimmedLine) {
        continue
      }

      const parsedEvent = JSON.parse(trimmedLine) as {
        type?: unknown
        thread?: unknown
        userMessage?: unknown
        assistantMessage?: unknown
        runtime?: unknown
        delta?: unknown
        content?: unknown
        messageId?: unknown
      }

      if (parsedEvent.type === 'started') {
        options.onStarted?.({
          thread: normalizeAssistantThreadSummary(parsedEvent.thread),
          userMessage: normalizeAssistantMessage(parsedEvent.userMessage),
          runtime: normalizeAssistantRuntime(parsedEvent.runtime),
        })
        continue
      }

      if (parsedEvent.type === 'chunk') {
        options.onChunk?.({
          messageId: typeof parsedEvent.messageId === 'string' ? parsedEvent.messageId : '',
          delta: typeof parsedEvent.delta === 'string' ? parsedEvent.delta : '',
          content: typeof parsedEvent.content === 'string' ? parsedEvent.content : '',
        })
        continue
      }

      if (parsedEvent.type === 'complete') {
        completedTurn = normalizeAssistantTurnResponse(parsedEvent)
        options.onComplete?.(completedTurn)
      }
    }
  }

  if (!completedTurn) {
    throw new Error('Assistant stream ended before completion.')
  }

  return completedTurn
}

export const resolveAssistantToolApproval = async (
  approvalRequestId: string,
  action: AssistantToolApprovalAction,
): Promise<AssistantThreadDetail> => {
  const response = await fetchApi(`/assistant/tool-approvals/${approvalRequestId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action }),
  })

  if (!response.ok) {
    throw await buildAssistantApiError(response, 'Failed to resolve assistant tool approval.')
  }

  const payload = (await response.json()) as {
    thread?: unknown
    messages?: unknown[]
    events?: unknown[]
  }

  if (!Array.isArray(payload.messages)) {
    throw new Error('Backend returned an invalid assistant tool approval payload.')
  }

  return {
    ...normalizeAssistantThreadSummary(payload.thread),
    messages: payload.messages.map(normalizeAssistantMessage),
    events: Array.isArray(payload.events) ? payload.events.map(normalizeAssistantMessageEvent) : [],
  }
}
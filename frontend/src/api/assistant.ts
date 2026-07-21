import { AuthRequiredError, fetchApi, getApiUrl } from './request'

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
    status:
      candidate?.status === 'running' ||
      candidate?.status === 'completed' ||
      candidate?.status === 'error'
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

export const sendAssistantThreadMessage = async (
  threadId: string,
  content: string,
): Promise<AssistantTurnResponse> => {
  const response = await fetchApi(`/assistant/threads/${threadId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content, stream: false }),
  })

  if (!response.ok) {
    throw await buildAssistantApiError(response, 'Failed to send assistant message.')
  }

  return normalizeAssistantTurnResponse(await response.json())
}

export const streamAssistantThreadMessage = async (
  threadId: string,
  content: string,
  handlers: AssistantMessageStreamHandlers = {},
): Promise<AssistantTurnResponse> => {
  const response = await fetch(getApiUrl(`/assistant/threads/${threadId}/messages`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'same-origin',
    body: JSON.stringify({ content, stream: true }),
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
        handlers.onStarted?.({
          thread: normalizeAssistantThreadSummary(parsedEvent.thread),
          userMessage: normalizeAssistantMessage(parsedEvent.userMessage),
          runtime: normalizeAssistantRuntime(parsedEvent.runtime),
        })
        continue
      }

      if (parsedEvent.type === 'chunk') {
        handlers.onChunk?.({
          messageId: typeof parsedEvent.messageId === 'string' ? parsedEvent.messageId : '',
          delta: typeof parsedEvent.delta === 'string' ? parsedEvent.delta : '',
          content: typeof parsedEvent.content === 'string' ? parsedEvent.content : '',
        })
        continue
      }

      if (parsedEvent.type === 'complete') {
        completedTurn = normalizeAssistantTurnResponse(parsedEvent)
        handlers.onComplete?.(completedTurn)
      }
    }
  }

  if (!completedTurn) {
    throw new Error('Assistant stream ended before completion.')
  }

  return completedTurn
}
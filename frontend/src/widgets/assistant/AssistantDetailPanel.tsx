import { useEffect, useRef, type FormEventHandler, type KeyboardEventHandler } from 'react'
import type { AppTextBundle } from '../../i18n/appText'
import { formatLocalizedText, type SupportedLanguageCode } from '../../i18n/localization'
import { AssistantMarkdown } from '../../assistant/AssistantMarkdown'
import type {
  AssistantAvailabilityRecord,
  AssistantMessageEventRecord,
  AssistantMessageRecord,
  AssistantToolApprovalAction,
  AssistantThreadDetail,
  AssistantThreadSummary,
} from '../../api/assistant'

export interface AssistantDetailViewData {
  appText: AppTextBundle
  availability: AssistantAvailabilityRecord
  threads: AssistantThreadSummary[]
  selectedThreadId: string | null
  selectedThread: AssistantThreadDetail | null
  loading: boolean
  detailLoading: boolean
  creatingThread: boolean
  error: string | null
  draft: string
  turnState: 'idle' | 'sending' | 'streaming' | 'completed' | 'failed'
  turnError: string | null
  pendingUserMessage: AssistantMessageRecord | null
  streamingMessage: AssistantMessageRecord | null
  streamingEvents: AssistantMessageEventRecord[]
  resolvingApprovalRequestId: string | null
  isTurnBusy: boolean
  onCreateThread: () => void
  onDeleteThread: (threadId: string) => void
  onSelectThread: (threadId: string) => void
  onDraftChange: (value: string) => void
  onSubmit: FormEventHandler<HTMLFormElement>
  onComposerKeyDown: KeyboardEventHandler<HTMLTextAreaElement>
  onResolveToolApproval: (
    approvalRequestId: string,
    action: AssistantToolApprovalAction,
  ) => void
}

interface AssistantDetailPanelProps {
  data: AssistantDetailViewData
  languageCode: SupportedLanguageCode
}

const getMessageRoleLabel = (
  appText: AppTextBundle,
  role: AssistantMessageRecord['role'],
) => {
  switch (role) {
    case 'user':
      return appText.assistant.roleUser
    case 'system':
      return appText.assistant.roleSystem
    case 'tool':
      return appText.assistant.roleTool
    default:
      return appText.assistant.roleAssistant
  }
}

const getToolEventStatusLabel = (
  appText: AppTextBundle,
  status: AssistantMessageEventRecord['payload']['status'],
) => {
  switch (status) {
    case 'approval_pending':
      return appText.assistant.toolStatusApprovalPending
    case 'approval_approved':
      return appText.assistant.toolStatusApprovalApproved
    case 'approval_rejected':
      return appText.assistant.toolStatusApprovalRejected
    case 'approval_canceled':
      return appText.assistant.toolStatusApprovalCanceled
    case 'approval_expired':
      return appText.assistant.toolStatusApprovalExpired
    case 'completed':
      return appText.assistant.toolStatusCompleted
    case 'error':
      return appText.assistant.toolStatusError
    default:
      return appText.assistant.toolStatusRunning
  }
}

const formatToolValue = (appText: AppTextBundle, value: unknown) => {
  if (value === null || value === undefined) {
    return appText.assistant.toolRedactedValue
  }

  if (typeof value === 'string') {
    return value
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return appText.assistant.toolRedactedValue
  }
}

const shouldRenderMarkdown = (message: AssistantMessageRecord) =>
  message.role === 'assistant' || message.role === 'system'

const formatEventTimestamp = (value: string, languageCode: SupportedLanguageCode) => {
  const timestamp = new Date(value)

  if (Number.isNaN(timestamp.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(languageCode, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(timestamp)
}

export function AssistantDetailPanel({ data, languageCode }: AssistantDetailPanelProps) {
  const composerInputRef = useRef<HTMLTextAreaElement | null>(null)
  const {
    appText,
    availability,
    threads,
    selectedThreadId,
    selectedThread,
    loading,
    detailLoading,
    creatingThread,
    error,
    draft,
    turnState,
    turnError,
    pendingUserMessage,
    streamingMessage,
    streamingEvents,
    resolvingApprovalRequestId,
    isTurnBusy,
    onCreateThread,
    onDeleteThread,
    onSelectThread,
    onDraftChange,
    onSubmit,
    onComposerKeyDown,
    onResolveToolApproval,
  } = data

  const displayedMessages = selectedThread
    ? [
        ...selectedThread.messages,
        ...(pendingUserMessage ? [pendingUserMessage] : []),
        ...(streamingMessage ? [streamingMessage] : []),
      ]
    : []
  const displayedEvents = selectedThread
    ? [...selectedThread.events, ...streamingEvents]
    : []
  const latestEventIdByToolCallId = new Map<string, string>()

  for (const event of displayedEvents) {
    if (event.payload.toolCallId) {
      latestEventIdByToolCallId.set(event.payload.toolCallId, event.id)
    }
  }

  useEffect(() => {
    if (turnState === 'completed' && !isTurnBusy) {
      composerInputRef.current?.focus()
    }
  }, [turnState, isTurnBusy, selectedThreadId])

  return (
    <div className="assistant-layout assistant-layout--widget">
      <aside className="assistant-column assistant-column--sidebar">
        <article className="settings-card assistant-card assistant-thread-list-card">
          <div className="settings-card-head">
            <p className="widget-kicker">{appText.assistant.threadListTitle}</p>
            <h3>{threads.length}</h3>
          </div>

          <div className="assistant-inline-actions assistant-inline-actions--thread-list">
            <button type="button" className="widget-action-button" onClick={onCreateThread} disabled={creatingThread || isTurnBusy}>
              <span>
                {creatingThread
                  ? appText.assistant.creatingThreadAction
                  : appText.assistant.newThreadAction}
              </span>
            </button>
          </div>

          {loading ? (
            <p className="settings-note">{appText.auth.authenticatedSessionCopy}</p>
          ) : threads.length === 0 ? (
            <div className="empty-state assistant-empty-state">
              <h3 className="empty-title">{appText.assistant.emptyThreadListTitle}</h3>
              <p className="empty-copy">{appText.assistant.emptyThreadListCopy}</p>
            </div>
          ) : (
            <div className="assistant-thread-list">
              {threads.map((thread) => {
                const threadTitle = thread.title || appText.assistant.untitledThreadTitle

                return (
                  <div
                    key={thread.id}
                    className={`assistant-thread-card${thread.id === selectedThreadId ? ' is-active' : ''}`}
                  >
                    <button
                      type="button"
                      className="assistant-thread-card__button"
                      aria-label={formatLocalizedText(appText.assistant.openThreadAriaLabel, {
                        title: threadTitle,
                      })}
                      disabled={isTurnBusy}
                      onClick={() => onSelectThread(thread.id)}
                    >
                      <strong>{threadTitle}</strong>
                      <span>
                        {formatLocalizedText(appText.assistant.messageCountMeta, {
                          count: thread.messageCount,
                        })}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="assistant-thread-card__delete"
                      disabled={isTurnBusy}
                      onClick={() => onDeleteThread(thread.id)}
                    >
                      {appText.assistant.deleteConversationAction}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </article>
      </aside>

      <section className="assistant-column assistant-column--main">
        <div className="settings-card assistant-card assistant-transcript-card">
          <div className="settings-card-head">
            <p className="widget-kicker">{appText.assistant.transcriptTitle}</p>
            <h3>
              {selectedThread?.title ||
                (selectedThreadId
                  ? appText.assistant.untitledThreadTitle
                  : appText.assistant.noThreadSelectedTitle)}
            </h3>
          </div>

          {error ? <p className="settings-note settings-note--warning">{error}</p> : null}

          {!selectedThreadId ? (
            <div className="empty-state assistant-empty-state">
              <h3 className="empty-title">{appText.assistant.noThreadSelectedTitle}</h3>
              <p className="empty-copy">{appText.assistant.noThreadSelectedCopy}</p>
            </div>
          ) : detailLoading && !selectedThread ? (
            <p className="settings-note">{appText.auth.authenticatedSessionCopy}</p>
          ) : displayedMessages.length > 0 ? (
            <div className="assistant-message-list">
              {displayedMessages.map((message) => {
                const relatedEvents = displayedEvents.filter((event) => event.messageId === message.id)

                return (
                  <article key={message.id} className={`assistant-message assistant-message--${message.role}`}>
                    <p className="assistant-message-role">{getMessageRoleLabel(appText, message.role)}</p>
                    {shouldRenderMarkdown(message) ? (
                      <AssistantMarkdown content={message.content} />
                    ) : (
                      <p className="assistant-message-copy">{message.content}</p>
                    )}

                    {relatedEvents.length > 0 ? (
                      <div className="assistant-tool-event-list">
                        {relatedEvents.map((event) => (
                          <article
                            key={event.id}
                            className={`assistant-tool-event assistant-tool-event--${event.payload.status}`}
                          >
                            <div className="assistant-tool-event-head">
                              <div>
                                <p className="assistant-tool-event-kicker">{appText.assistant.toolActivityTitle}</p>
                                <h4>{event.payload.toolName}</h4>
                              </div>
                              <p className="assistant-tool-event-status">
                                {getToolEventStatusLabel(appText, event.payload.status)}
                              </p>
                            </div>

                            <div className="assistant-tool-event-meta">
                              <p>
                                <span>{appText.assistant.toolServerLabel}</span>
                                <strong>{event.payload.serverName}</strong>
                              </p>
                              {event.payload.approval?.expiresAt ? (
                                <p>
                                  <span>{appText.assistant.toolApprovalExpiresLabel}</span>
                                  <strong>
                                    {formatEventTimestamp(event.payload.approval.expiresAt, languageCode)}
                                  </strong>
                                </p>
                              ) : null}
                              {event.payload.approval?.resolvedAt ? (
                                <p>
                                  <span>{appText.assistant.toolApprovalResolvedLabel}</span>
                                  <strong>
                                    {formatEventTimestamp(event.payload.approval.resolvedAt, languageCode)}
                                  </strong>
                                </p>
                              ) : null}
                            </div>

                            <div className="assistant-tool-event-body">
                              <div>
                                <p className="assistant-tool-event-label">{appText.assistant.toolArgumentsLabel}</p>
                                <pre className="assistant-tool-event-value">
                                  {formatToolValue(appText, event.payload.displayArguments)}
                                </pre>
                              </div>

                              {event.payload.status === 'error' && event.payload.error ? (
                                <div>
                                  <p className="assistant-tool-event-label">{appText.assistant.toolErrorLabel}</p>
                                  <pre className="assistant-tool-event-value">{event.payload.error.message}</pre>
                                </div>
                              ) : event.payload.displayResult !== null ? (
                                <div>
                                  <p className="assistant-tool-event-label">{appText.assistant.toolResultLabel}</p>
                                  <pre className="assistant-tool-event-value">
                                    {formatToolValue(appText, event.payload.displayResult)}
                                  </pre>
                                </div>
                              ) : null}
                            </div>

                            {event.payload.status === 'approval_pending' &&
                            event.payload.approval &&
                            latestEventIdByToolCallId.get(event.payload.toolCallId) === event.id ? (
                              <div className="assistant-inline-actions assistant-inline-actions--tool-approval">
                                <button
                                  type="button"
                                  className="widget-action-button"
                                  disabled={isTurnBusy}
                                  onClick={() =>
                                    onResolveToolApproval(event.payload.approval!.requestId, 'approve')
                                  }
                                >
                                  <span>
                                    {resolvingApprovalRequestId === event.payload.approval.requestId
                                      ? appText.assistant.toolStatusRunning
                                      : appText.assistant.toolApprovalApproveAction}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  className="widget-action-button"
                                  disabled={isTurnBusy}
                                  onClick={() =>
                                    onResolveToolApproval(event.payload.approval!.requestId, 'reject')
                                  }
                                >
                                  <span>{appText.assistant.toolApprovalRejectAction}</span>
                                </button>
                                <button
                                  type="button"
                                  className="widget-action-button"
                                  disabled={isTurnBusy}
                                  onClick={() =>
                                    onResolveToolApproval(event.payload.approval!.requestId, 'cancel')
                                  }
                                >
                                  <span>{appText.assistant.toolApprovalCancelAction}</span>
                                </button>
                              </div>
                            ) : null}
                          </article>
                        ))}
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="empty-state assistant-empty-state">
              <h3 className="empty-title">{appText.assistant.emptyTranscriptTitle}</h3>
              <p className="empty-copy">{appText.assistant.emptyTranscriptCopy}</p>
            </div>
          )}

          <form className="assistant-composer" onSubmit={onSubmit}>
            <label className="settings-label assistant-composer-field">
              <span>{appText.assistant.composerLabel}</span>
              <textarea
                ref={composerInputRef}
                className="settings-input assistant-composer-input"
                rows={4}
                value={draft}
                onChange={(event) => onDraftChange(event.target.value)}
                onKeyDown={onComposerKeyDown}
                placeholder={appText.assistant.composerPlaceholder}
                data-submit-on-enter="true"
                disabled={
                  !selectedThreadId ||
                  detailLoading ||
                  availability.status !== 'available' ||
                  isTurnBusy
                }
              />
            </label>

            <div className="assistant-composer-footer">
              <div className="assistant-turn-meta">
                {turnError ? (
                  <p className="settings-note settings-note--warning">{turnError}</p>
                ) : !selectedThreadId ? (
                  <p className="settings-note">{appText.assistant.composerNoThreadCopy}</p>
                ) : availability.status !== 'available' ? (
                  <p className="settings-note">{appText.assistant.composerUnavailableCopy}</p>
                ) : null}
              </div>

              <button
                type="submit"
                className="settings-submit assistant-send-button"
                disabled={
                  !selectedThreadId ||
                  detailLoading ||
                  availability.status !== 'available' ||
                  draft.trim().length === 0 ||
                  isTurnBusy
                }
              >
                {turnState === 'sending'
                  ? appText.assistant.turnStateSending
                  : turnState === 'streaming'
                    ? appText.assistant.turnStateStreaming
                    : appText.assistant.sendAction}
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  )
}

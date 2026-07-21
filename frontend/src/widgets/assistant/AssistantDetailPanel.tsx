import type { FormEventHandler } from 'react'
import type { AppTextBundle } from '../../i18n/appText'
import { formatLocalizedText, type SupportedLanguageCode } from '../../i18n/localization'
import { AssistantMarkdown } from '../../assistant/AssistantMarkdown'
import type {
  AssistantAvailabilityRecord,
  AssistantMessageEventRecord,
  AssistantMessageRecord,
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
  isTurnBusy: boolean
  onCreateThread: () => void
  onSelectThread: (threadId: string) => void
  onDraftChange: (value: string) => void
  onSubmit: FormEventHandler<HTMLFormElement>
  onOpenSettings: () => void
}

interface AssistantDetailPanelProps {
  data: AssistantDetailViewData
  languageCode: SupportedLanguageCode
}

const getAvailabilityLabel = (
  appText: AppTextBundle,
  status: AssistantAvailabilityRecord['status'],
) => {
  switch (status) {
    case 'available':
      return appText.assistant.availabilityAvailable
    case 'disabled':
      return appText.assistant.availabilityDisabled
    case 'unavailable':
      return appText.assistant.availabilityUnavailable
    default:
      return appText.assistant.availabilityNotConfigured
  }
}

const getAvailabilityCopy = (
  appText: AppTextBundle,
  availability: AssistantAvailabilityRecord,
) => {
  switch (availability.status) {
    case 'disabled':
      return appText.assistant.disabledCopy
    case 'unavailable':
      return appText.assistant.unavailableCopy
    case 'available':
      return appText.assistant.modelSelectionManagedCopy
    default:
      return appText.assistant.notConfiguredCopy
  }
}

const getTurnStateLabel = (
  appText: AppTextBundle,
  turnState: AssistantDetailViewData['turnState'],
) => {
  switch (turnState) {
    case 'sending':
      return appText.assistant.turnStateSending
    case 'streaming':
      return appText.assistant.turnStateStreaming
    case 'completed':
      return appText.assistant.turnStateCompleted
    case 'failed':
      return appText.assistant.turnStateFailed
    default:
      return appText.assistant.turnStateIdle
  }
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

export function AssistantDetailPanel({ data }: AssistantDetailPanelProps) {
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
    isTurnBusy,
    onCreateThread,
    onSelectThread,
    onDraftChange,
    onSubmit,
    onOpenSettings,
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

  return (
    <div className="assistant-layout assistant-layout--widget">
      <aside className="assistant-column assistant-column--sidebar">
        <article className="settings-card assistant-card assistant-status-card">
          <div className="settings-card-head">
            <p className="widget-kicker">{appText.assistant.availabilityTitle}</p>
            <h3>{getAvailabilityLabel(appText, availability.status)}</h3>
          </div>

          <p className="settings-copy">{getAvailabilityCopy(appText, availability)}</p>

          <div className="assistant-capability-list" role="list">
            <p className="assistant-meta-row" role="listitem">
              <span>{appText.assistant.activeRouteLabel}</span>
              <strong>{availability.activeRoute?.label ?? appText.assistant.routeUnknownValue}</strong>
            </p>
            <p className="assistant-meta-row" role="listitem">
              <span>{appText.assistant.backendKindLabel}</span>
              <strong>{availability.activeRoute?.backendKind || appText.assistant.routeUnknownValue}</strong>
            </p>
            <p className="assistant-meta-row" role="listitem">
              <span>{appText.assistant.streamingCapabilityLabel}</span>
              <strong>
                {availability.activeRoute?.supportsStreaming
                  ? appText.assistant.enabledValue
                  : appText.assistant.disabledValue}
              </strong>
            </p>
            <p className="assistant-meta-row" role="listitem">
              <span>{appText.assistant.toolsCapabilityLabel}</span>
              <strong>
                {availability.activeRoute?.supportsTools
                  ? appText.assistant.enabledValue
                  : appText.assistant.disabledValue}
              </strong>
            </p>
            <p className="assistant-meta-row" role="listitem">
              <span>{appText.assistant.markdownCapabilityLabel}</span>
              <strong>
                {availability.activeRoute?.supportsMarkdown
                  ? appText.assistant.enabledValue
                  : appText.assistant.disabledValue}
              </strong>
            </p>
          </div>

          <div className="assistant-inline-actions">
            <button type="button" className="widget-action-button" onClick={onCreateThread} disabled={creatingThread || isTurnBusy}>
              <span>
                {creatingThread
                  ? appText.assistant.creatingThreadAction
                  : appText.assistant.newThreadAction}
              </span>
            </button>
            <button type="button" className="widget-action-button" onClick={onOpenSettings}>
              <span>{appText.widgetAdmin.openSettingsAction}</span>
            </button>
          </div>
        </article>

        <article className="settings-card assistant-card assistant-thread-list-card">
          <div className="settings-card-head">
            <p className="widget-kicker">{appText.assistant.threadListTitle}</p>
            <h3>{threads.length}</h3>
          </div>

          <p className="settings-copy">{appText.assistant.threadListCopy}</p>

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
                  <button
                    key={thread.id}
                    type="button"
                    className={`assistant-thread-card${thread.id === selectedThreadId ? ' is-active' : ''}`}
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
                className="settings-input assistant-composer-input"
                rows={4}
                value={draft}
                onChange={(event) => onDraftChange(event.target.value)}
                placeholder={appText.assistant.composerPlaceholder}
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
                <p className={`assistant-turn-state assistant-turn-state--${turnState}`}>
                  <span>{appText.assistant.turnStatusLabel}</span>
                  <strong>{getTurnStateLabel(appText, turnState)}</strong>
                </p>

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

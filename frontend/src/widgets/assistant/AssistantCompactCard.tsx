import { useEffect, useRef } from 'react'
import type { AppTextBundle } from '../../i18n/appText'
import type {
  AssistantMessageRecord,
  AssistantThreadDetail,
  AssistantThreadSummary,
} from '../../api/assistant'
import { AssistantMarkdown } from '../../assistant/AssistantMarkdown'

interface AssistantCompactCardProps {
  appText: AppTextBundle
  threads: AssistantThreadSummary[]
  selectedThread: AssistantThreadDetail | null
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

const shouldRenderMarkdown = (message: AssistantMessageRecord) =>
  message.role === 'assistant' || message.role === 'system'

export function AssistantCompactCard({
  appText,
  threads,
  selectedThread,
}: AssistantCompactCardProps) {
  const conversationRef = useRef<HTMLDivElement | null>(null)
  const recentMessages = selectedThread?.messages.slice(-4) ?? []
  const selectedThreadTitle =
    selectedThread?.title ||
    threads[0]?.title ||
    appText.assistant.untitledThreadTitle

  useEffect(() => {
    const container = conversationRef.current

    if (!container) {
      return
    }

    container.scrollTop = container.scrollHeight
  }, [recentMessages])

  return (
    <div className="assistant-compact">
      <div className="assistant-compact-thread">
        <h3>{selectedThreadTitle}</h3>
        {recentMessages.length > 0 ? (
          <div className="assistant-compact-conversation" ref={conversationRef}>
            {recentMessages.map((message) => (
              <article
                key={message.id}
                className={`assistant-compact-bubble assistant-compact-bubble--${message.role}`}
              >
                <p className="assistant-message-role">
                  {getMessageRoleLabel(appText, message.role)}
                </p>
                {shouldRenderMarkdown(message) ? (
                  <AssistantMarkdown content={message.content} />
                ) : (
                  <p className="assistant-message-copy">{message.content}</p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="assistant-message-copy">{appText.assistant.emptyTranscriptCopy}</p>
        )}
      </div>

      <p className="assistant-compact-footer">
        {threads.length > 0 ? `${threads.length} conversations` : appText.assistant.emptyThreadListCopy}
      </p>
    </div>
  )
}

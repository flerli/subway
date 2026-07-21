import type { AppTextBundle } from '../../i18n/appText'
import type {
  AssistantAvailabilityRecord,
  AssistantThreadDetail,
  AssistantThreadSummary,
} from '../../api/assistant'

interface AssistantCompactCardProps {
  appText: AppTextBundle
  availability: AssistantAvailabilityRecord
  threads: AssistantThreadSummary[]
  selectedThread: AssistantThreadDetail | null
  turnState: 'idle' | 'sending' | 'streaming' | 'completed' | 'failed'
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

const getTurnStateLabel = (
  appText: AppTextBundle,
  turnState: AssistantCompactCardProps['turnState'],
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

export function AssistantCompactCard({
  appText,
  availability,
  threads,
  selectedThread,
  turnState,
}: AssistantCompactCardProps) {
  const latestAssistantMessage =
    selectedThread?.messages.findLast((message) => message.role === 'assistant') ?? null
  const selectedThreadTitle =
    selectedThread?.title ||
    threads[0]?.title ||
    appText.assistant.untitledThreadTitle

  if (availability.status !== 'available') {
    return (
      <div className="assistant-compact assistant-compact--unavailable">
        <p className="assistant-compact-status">{getAvailabilityLabel(appText, availability.status)}</p>
        <p className="assistant-compact-copy">{appText.assistant.notConfiguredCopy}</p>
      </div>
    )
  }

  return (
    <div className="assistant-compact">
      <div className="assistant-compact-meta">
        <p className="assistant-compact-status">{getAvailabilityLabel(appText, availability.status)}</p>
        <p className="assistant-compact-status">{getTurnStateLabel(appText, turnState)}</p>
      </div>

      <div className="assistant-compact-thread">
        <h3>{selectedThreadTitle}</h3>
        <p className="assistant-message-copy">
          {latestAssistantMessage?.content || appText.assistant.emptyTranscriptCopy}
        </p>
      </div>

      <p className="assistant-compact-footer">
        {threads.length > 0
          ? appText.assistant.threadListCopy
          : appText.assistant.emptyThreadListCopy}
      </p>
    </div>
  )
}

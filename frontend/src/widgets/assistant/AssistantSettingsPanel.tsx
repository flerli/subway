import { useEffect, useState } from 'react'
import type { AppTextBundle } from '../../i18n/appText'
import { fetchAssistantAvailability, type AssistantAvailabilityRecord } from '../../api/assistant'
import type { SupportedLanguageCode } from '../../i18n/localization'
import type { RegisteredWidget } from '../widgetTypes'
import type { AssistantWidgetTranslation } from './translations'

interface AssistantSettingsPanelProps {
  appText: AppTextBundle
  widget: RegisteredWidget
  languageCode: SupportedLanguageCode
  widgetText: AssistantWidgetTranslation
}

const defaultAssistantAvailability: AssistantAvailabilityRecord = {
  status: 'not_configured',
  activeRoute: null,
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

export function AssistantSettingsPanel({
  appText,
  widget,
  languageCode: _languageCode,
  widgetText,
}: AssistantSettingsPanelProps) {
  const [availability, setAvailability] =
    useState<AssistantAvailabilityRecord>(defaultAssistantAvailability)
  const [statusMessage, setStatusMessage] = useState(widgetText.settings?.description ?? '')

  useEffect(() => {
    let cancelled = false

    fetchAssistantAvailability()
      .then((assistantAvailability) => {
        if (!cancelled) {
          setAvailability(assistantAvailability)
          setStatusMessage(widgetText.settings?.description ?? '')
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setStatusMessage(
            error instanceof Error ? error.message : appText.messages.assistantLoadFailed,
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [appText.messages.assistantLoadFailed, widgetText.settings?.description])

  return (
    <article className="settings-card widget-settings-card widget-settings-card--expanded">
      <div className="settings-card-head">
        <p className="widget-kicker">{widget.module.getTranslation('en').boardKicker}</p>
        <h3>{widgetText.settings?.title ?? widget.entity.title}</h3>
        <p>{widgetText.settings?.description}</p>
      </div>

      <div className="assistant-settings-summary">
        <div className="settings-runtime-row">
          <span>{appText.assistant.availabilityTitle}</span>
          <strong className="settings-runtime-value">
            {getAvailabilityLabel(appText, availability.status)}
          </strong>
        </div>
        <div className="settings-runtime-row">
          <span>{appText.assistant.activeRouteLabel}</span>
          <strong className="settings-runtime-value settings-runtime-value--mono">
            {availability.activeRoute?.label ?? appText.assistant.routeUnknownValue}
          </strong>
        </div>
        <div className="settings-runtime-row">
          <span>{appText.assistant.backendKindLabel}</span>
          <strong className="settings-runtime-value">
            {availability.activeRoute?.backendKind ?? appText.assistant.routeUnknownValue}
          </strong>
        </div>
        <div className="settings-runtime-row">
          <span>{appText.assistant.streamingCapabilityLabel}</span>
          <strong className="settings-runtime-value">
            {availability.activeRoute?.supportsStreaming
              ? appText.assistant.enabledValue
              : appText.assistant.disabledValue}
          </strong>
        </div>
        <div className="settings-runtime-row">
          <span>{appText.assistant.toolsCapabilityLabel}</span>
          <strong className="settings-runtime-value">
            {availability.activeRoute?.supportsTools
              ? appText.assistant.enabledValue
              : appText.assistant.disabledValue}
          </strong>
        </div>
        <div className="settings-runtime-row">
          <span>{appText.assistant.markdownCapabilityLabel}</span>
          <strong className="settings-runtime-value">
            {availability.activeRoute?.supportsMarkdown
              ? appText.assistant.enabledValue
              : appText.assistant.disabledValue}
          </strong>
        </div>
      </div>

      <p className="settings-note">{statusMessage}</p>
    </article>
  )
}

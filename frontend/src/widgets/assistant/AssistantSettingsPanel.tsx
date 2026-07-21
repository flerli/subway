import { useEffect, useState } from 'react'
import type { AppTextBundle } from '../../i18n/appText'
import {
  fetchAssistantAvailability,
  fetchAssistantSettings,
  updateAssistantSettings,
  type AssistantAvailabilityRecord,
  type AssistantSettingsRecord,
} from '../../api/assistant'
import type { SupportedLanguageCode } from '../../i18n/localization'
import type { RegisteredWidget } from '../widgetTypes'
import type { WidgetSettingsValues } from '../widgetTypes'
import type { AssistantWidgetTranslation } from './translations'

interface AssistantSettingsPanelProps {
  appText: AppTextBundle
  widget: RegisteredWidget
  languageCode: SupportedLanguageCode
  widgetText: AssistantWidgetTranslation
  onSave: (widgetId: string, settings: WidgetSettingsValues) => Promise<void>
}

type RequestState = 'idle' | 'loading' | 'saving' | 'saved' | 'error'

const defaultAssistantAvailability: AssistantAvailabilityRecord = {
  status: 'not_configured',
  activeRoute: null,
}

const defaultAssistantSettings: AssistantSettingsRecord = {
  routeId: 'assistant-default-route',
  label: '',
  backendKind: 'custom',
  baseUrl: '',
  modelIdentifier: '',
  hasStoredApiKey: false,
  headersJson: '{}',
  enabled: true,
  supportsStreaming: true,
  supportsTools: true,
  supportsMarkdown: true,
  updatedAt: null,
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
  languageCode,
  widgetText,
  onSave,
}: AssistantSettingsPanelProps) {
  const [availability, setAvailability] =
    useState<AssistantAvailabilityRecord>(defaultAssistantAvailability)
  const [routeId, setRouteId] = useState(defaultAssistantSettings.routeId)
  const [label, setLabel] = useState(defaultAssistantSettings.label)
  const [backendKind, setBackendKind] = useState<AssistantSettingsRecord['backendKind']>('custom')
  const [baseUrl, setBaseUrl] = useState(defaultAssistantSettings.baseUrl)
  const [modelIdentifier, setModelIdentifier] = useState(defaultAssistantSettings.modelIdentifier)
  const [apiKey, setApiKey] = useState('')
  const [headersJson, setHeadersJson] = useState(defaultAssistantSettings.headersJson)
  const [enabled, setEnabled] = useState(defaultAssistantSettings.enabled)
  const [supportsStreaming, setSupportsStreaming] =
    useState(defaultAssistantSettings.supportsStreaming)
  const [supportsTools, setSupportsTools] = useState(defaultAssistantSettings.supportsTools)
  const [supportsMarkdown, setSupportsMarkdown] =
    useState(defaultAssistantSettings.supportsMarkdown)
  const [hasStoredApiKey, setHasStoredApiKey] = useState(false)
  const [requestState, setRequestState] = useState<RequestState>('idle')
  const [statusMessage, setStatusMessage] = useState(widgetText.settings?.description ?? '')

  useEffect(() => {
    let cancelled = false

    setRequestState('loading')

    Promise.all([fetchAssistantAvailability(), fetchAssistantSettings()])
      .then(([assistantAvailability, assistantSettings]) => {
        if (!cancelled) {
          setAvailability(assistantAvailability)
          setRouteId(assistantSettings.routeId)
          setLabel(assistantSettings.label)
          setBackendKind(assistantSettings.backendKind || 'custom')
          setBaseUrl(assistantSettings.baseUrl)
          setModelIdentifier(assistantSettings.modelIdentifier)
          setHeadersJson(assistantSettings.headersJson)
          setEnabled(assistantSettings.enabled)
          setSupportsStreaming(assistantSettings.supportsStreaming)
          setSupportsTools(assistantSettings.supportsTools)
          setSupportsMarkdown(assistantSettings.supportsMarkdown)
          setHasStoredApiKey(assistantSettings.hasStoredApiKey)
          setApiKey('')
          setRequestState('idle')
          setStatusMessage(widgetText.settings?.description ?? '')
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setRequestState('error')
          setStatusMessage(
            error instanceof Error ? error.message : appText.messages.assistantLoadFailed,
          )
        }
      })

    return () => {
      cancelled = true
    }
  }, [appText.messages.assistantLoadFailed, languageCode, widgetText.settings?.description])

  const handleSave = async () => {
    setRequestState('saving')

    try {
      const payload = await updateAssistantSettings({
        routeId,
        label,
        backendKind: backendKind || 'custom',
        baseUrl,
        modelIdentifier,
        apiKey,
        headersJson,
        enabled,
        supportsStreaming,
        supportsTools,
        supportsMarkdown,
      })

      setAvailability(payload.assistant)
      setRouteId(payload.assistantSettings.routeId)
      setLabel(payload.assistantSettings.label)
      setBackendKind(payload.assistantSettings.backendKind || 'custom')
      setBaseUrl(payload.assistantSettings.baseUrl)
      setModelIdentifier(payload.assistantSettings.modelIdentifier)
      setHeadersJson(payload.assistantSettings.headersJson)
      setEnabled(payload.assistantSettings.enabled)
      setSupportsStreaming(payload.assistantSettings.supportsStreaming)
      setSupportsTools(payload.assistantSettings.supportsTools)
      setSupportsMarkdown(payload.assistantSettings.supportsMarkdown)
      setHasStoredApiKey(payload.assistantSettings.hasStoredApiKey)
      setApiKey('')
      await onSave(widget.entity.id, {
        routeId: payload.assistantSettings.routeId,
        label: payload.assistantSettings.label,
        backendKind: payload.assistantSettings.backendKind,
        baseUrl: payload.assistantSettings.baseUrl,
        modelIdentifier: payload.assistantSettings.modelIdentifier,
        hasStoredApiKey: payload.assistantSettings.hasStoredApiKey,
        headersJson: payload.assistantSettings.headersJson,
        enabled: payload.assistantSettings.enabled,
        supportsStreaming: payload.assistantSettings.supportsStreaming,
        supportsTools: payload.assistantSettings.supportsTools,
        supportsMarkdown: payload.assistantSettings.supportsMarkdown,
        updatedAt: payload.assistantSettings.updatedAt,
      })
      setRequestState('saved')
      setStatusMessage(appText.widgetSettingsHost.savedState)
    } catch (error) {
      setRequestState('error')
      setStatusMessage(
        error instanceof Error ? error.message : appText.messages.assistantLoadFailed,
      )
    }
  }

  return (
    <article className="settings-card widget-settings-card widget-settings-card--expanded">
      <div className="settings-card-head">
        <p className="widget-kicker">{widgetText.boardKicker}</p>
        <h3>{widgetText.settings?.title ?? widget.entity.title}</h3>
        <p>{widgetText.settings?.description}</p>
      </div>

      <div className="widget-settings-fields">
        <label className="settings-label">
          <span>{widgetText.settings?.fields.routeId?.label ?? 'Route id'}</span>
          <input
            className="settings-input"
            type="text"
            value={routeId}
            onChange={(event) => setRouteId(event.target.value)}
          />
        </label>

        <label className="settings-label">
          <span>{widgetText.settings?.fields.label?.label ?? 'Connection label'}</span>
          <input
            className="settings-input"
            type="text"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />
        </label>

        <label className="settings-label">
          <span>{widgetText.settings?.fields.backendKind?.label ?? 'Backend kind'}</span>
          <select
            className="settings-input settings-select"
            value={backendKind}
            onChange={(event) =>
              setBackendKind(event.target.value === 'litellm' ? 'litellm' : 'custom')
            }
          >
            <option value="custom">custom</option>
            <option value="litellm">litellm</option>
          </select>
        </label>

        <label className="settings-label">
          <span>{widgetText.settings?.fields.baseUrl?.label ?? 'Base URL'}</span>
          <input
            className="settings-input"
            type="text"
            value={baseUrl}
            placeholder={widgetText.settings?.fields.baseUrl?.placeholder}
            onChange={(event) => setBaseUrl(event.target.value)}
          />
        </label>

        <label className="settings-label">
          <span>{widgetText.settings?.fields.modelIdentifier?.label ?? 'Model identifier'}</span>
          <input
            className="settings-input"
            type="text"
            value={modelIdentifier}
            placeholder={widgetText.settings?.fields.modelIdentifier?.placeholder}
            onChange={(event) => setModelIdentifier(event.target.value)}
          />
        </label>

        <label className="settings-label">
          <span>{widgetText.settings?.fields.apiKey?.label ?? 'API key'}</span>
          <input
            className="settings-input"
            type="password"
            value={apiKey}
            placeholder={widgetText.settings?.fields.apiKey?.placeholder}
            onChange={(event) => setApiKey(event.target.value)}
          />
        </label>

        {hasStoredApiKey ? (
          <p className="settings-note">Stored API key will be reused when the field stays empty.</p>
        ) : null}

        <label className="settings-label">
          <span>{widgetText.settings?.fields.headersJson?.label ?? 'Headers JSON'}</span>
          <textarea
            className="settings-input assistant-composer-input"
            rows={4}
            value={headersJson}
            placeholder={widgetText.settings?.fields.headersJson?.placeholder}
            onChange={(event) => setHeadersJson(event.target.value)}
          />
        </label>

        <label className="settings-toggle">
          <span>{widgetText.settings?.fields.enabled?.label ?? 'Connection enabled'}</span>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
        </label>

        <label className="settings-toggle">
          <span>{widgetText.settings?.fields.supportsStreaming?.label ?? 'Supports streaming'}</span>
          <input
            type="checkbox"
            checked={supportsStreaming}
            onChange={(event) => setSupportsStreaming(event.target.checked)}
          />
        </label>

        <label className="settings-toggle">
          <span>{widgetText.settings?.fields.supportsTools?.label ?? 'Supports tools'}</span>
          <input
            type="checkbox"
            checked={supportsTools}
            onChange={(event) => setSupportsTools(event.target.checked)}
          />
        </label>

        <label className="settings-toggle">
          <span>{widgetText.settings?.fields.supportsMarkdown?.label ?? 'Supports markdown'}</span>
          <input
            type="checkbox"
            checked={supportsMarkdown}
            onChange={(event) => setSupportsMarkdown(event.target.checked)}
          />
        </label>
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

      <div className="widget-settings-actions">
        <button className="settings-submit" type="button" onClick={() => void handleSave()}>
          {appText.widgetSettingsHost.saveAction}
        </button>
        <p className="settings-note">
          {requestState === 'loading'
            ? appText.auth.authenticatedSessionCopy
            : requestState === 'saving'
              ? appText.widgetSettingsHost.savingState
              : requestState === 'saved'
                ? appText.widgetSettingsHost.savedState
                : requestState === 'error'
                  ? appText.widgetSettingsHost.saveFailedState
                  : statusMessage}
        </p>
      </div>

      <p className="settings-note">{statusMessage}</p>
    </article>
  )
}

import { useEffect, useMemo, useState } from 'react'
import type { AppTextBundle } from '../../i18n/appText'
import {
  createAssistantRoute,
  deleteAssistantRoute,
  fetchAssistantAvailability,
  fetchAssistantRoutes,
  fetchAssistantSettings,
  setDefaultAssistantRoute,
  updateAssistantRoute,
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
  isDefault: false,
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
  const [routes, setRoutes] = useState<AssistantSettingsRecord[]>([])
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)
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

    Promise.all([fetchAssistantAvailability(), fetchAssistantSettings(), fetchAssistantRoutes()])
      .then(([assistantAvailability, assistantSettings, assistantRoutes]) => {
        if (!cancelled) {
          setAvailability(assistantAvailability)
          setRoutes(assistantRoutes)
          setSelectedRouteId(assistantSettings.routeId || (assistantRoutes[0]?.routeId ?? null))
          const routeToEdit =
            assistantRoutes.find((route) => route.routeId === assistantSettings.routeId) ??
            assistantRoutes[0] ??
            assistantSettings
          setRouteId(routeToEdit.routeId)
          setLabel(routeToEdit.label)
          setBackendKind(routeToEdit.backendKind || 'custom')
          setBaseUrl(routeToEdit.baseUrl)
          setModelIdentifier(routeToEdit.modelIdentifier)
          setHeadersJson(routeToEdit.headersJson)
          setEnabled(routeToEdit.enabled)
          setSupportsStreaming(routeToEdit.supportsStreaming)
          setSupportsTools(routeToEdit.supportsTools)
          setSupportsMarkdown(routeToEdit.supportsMarkdown)
          setHasStoredApiKey(routeToEdit.hasStoredApiKey)
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

  const selectedRoute = useMemo(
    () => routes.find((route) => route.routeId === selectedRouteId) ?? null,
    [routes, selectedRouteId],
  )

  const applyRouteToEditor = (route: AssistantSettingsRecord | null) => {
    const nextRoute = route ?? defaultAssistantSettings

    setRouteId(nextRoute.routeId)
    setLabel(nextRoute.label)
    setBackendKind(nextRoute.backendKind || 'custom')
    setBaseUrl(nextRoute.baseUrl)
    setModelIdentifier(nextRoute.modelIdentifier)
    setHeadersJson(nextRoute.headersJson)
    setEnabled(nextRoute.enabled)
    setSupportsStreaming(nextRoute.supportsStreaming)
    setSupportsTools(nextRoute.supportsTools)
    setSupportsMarkdown(nextRoute.supportsMarkdown)
    setHasStoredApiKey(nextRoute.hasStoredApiKey)
    setApiKey('')
  }

  const refreshRoutesAndAvailability = async (preferredRouteId?: string | null) => {
    const [assistantAvailability, assistantRoutes] = await Promise.all([
      fetchAssistantAvailability(),
      fetchAssistantRoutes(),
    ])

    setAvailability(assistantAvailability)
    setRoutes(assistantRoutes)

    const nextSelectedRoute =
      assistantRoutes.find((route) => route.routeId === preferredRouteId) ??
      assistantRoutes.find((route) => route.isDefault) ??
      assistantRoutes[0] ??
      null

    setSelectedRouteId(nextSelectedRoute?.routeId ?? null)
    applyRouteToEditor(nextSelectedRoute)
  }

  const handleCreateConnection = () => {
    const generatedRouteId = `assistant-route-${crypto.randomUUID()}`
    const newDraft: AssistantSettingsRecord = {
      ...defaultAssistantSettings,
      routeId: generatedRouteId,
    }

    setSelectedRouteId(null)
    applyRouteToEditor(newDraft)
    setStatusMessage(widgetText.settings?.description ?? '')
  }

  const handleSave = async () => {
    setRequestState('saving')

    try {
      const savedRoute = selectedRouteId
        ? await updateAssistantRoute(selectedRouteId, {
            label,
            backendKind: backendKind || 'custom',
            baseUrl,
            modelIdentifier,
            apiKey,
            headersJson,
            enabled,
            isDefault: selectedRoute?.isDefault === true,
            supportsStreaming,
            supportsTools,
            supportsMarkdown,
          })
        : await createAssistantRoute({
            routeId,
            label,
            backendKind: backendKind || 'custom',
            baseUrl,
            modelIdentifier,
            apiKey,
            headersJson,
            enabled,
            isDefault: routes.length === 0,
            supportsStreaming,
            supportsTools,
            supportsMarkdown,
          })

      await refreshRoutesAndAvailability(savedRoute.routeId)
      await onSave(widget.entity.id, {
        routeId: savedRoute.routeId,
        label: savedRoute.label,
        backendKind: savedRoute.backendKind,
        baseUrl: savedRoute.baseUrl,
        modelIdentifier: savedRoute.modelIdentifier,
        hasStoredApiKey: savedRoute.hasStoredApiKey,
        headersJson: savedRoute.headersJson,
        enabled: savedRoute.enabled,
        isDefault: savedRoute.isDefault,
        supportsStreaming: savedRoute.supportsStreaming,
        supportsTools: savedRoute.supportsTools,
        supportsMarkdown: savedRoute.supportsMarkdown,
        updatedAt: savedRoute.updatedAt,
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

  const handleDelete = async () => {
    if (!selectedRouteId) {
      return
    }

    setRequestState('saving')

    try {
      await deleteAssistantRoute(selectedRouteId)
      await refreshRoutesAndAvailability(null)
      setRequestState('saved')
      setStatusMessage(appText.widgetSettingsHost.savedState)
    } catch (error) {
      setRequestState('error')
      setStatusMessage(
        error instanceof Error ? error.message : appText.messages.assistantLoadFailed,
      )
    }
  }

  const handleSetDefault = async (routeIdToDefault: string) => {
    setRequestState('saving')

    try {
      const payload = await setDefaultAssistantRoute(routeIdToDefault)
      setAvailability(payload.assistant)
      await refreshRoutesAndAvailability(routeIdToDefault)
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

      <div className="assistant-route-layout">
        <section className="settings-card assistant-route-list-card">
          <div className="settings-card-head">
            <p className="widget-kicker">{widgetText.copy.routeInventoryTitle}</p>
            <h3>{routes.length}</h3>
            <p>{widgetText.copy.routeInventoryCopy}</p>
          </div>

          <button className="settings-submit" type="button" onClick={handleCreateConnection}>
            {widgetText.copy.createRouteAction}
          </button>

          {routes.length === 0 ? (
            <p className="settings-note">{widgetText.copy.noSavedRoutesCopy}</p>
          ) : (
            <div className="assistant-route-list">
              {routes.map((route) => (
                <button
                  key={route.routeId}
                  type="button"
                  className={`assistant-route-card${route.routeId === selectedRouteId ? ' is-active' : ''}`}
                  onClick={() => {
                    setSelectedRouteId(route.routeId)
                    applyRouteToEditor(route)
                  }}
                >
                  <strong>{route.label}</strong>
                  <span>{route.backendKind}</span>
                  <span>
                    {route.isDefault
                      ? widgetText.copy.selectedDefaultMeta
                      : route.enabled
                        ? widgetText.copy.enabledState
                        : widgetText.copy.disabledState}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="settings-card assistant-route-editor-card">
          <div className="settings-card-head">
            <p className="widget-kicker">{widgetText.copy.editorTitle}</p>
            <h3>{label || (widgetText.settings?.title ?? widget.entity.title)}</h3>
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
          <p className="settings-note">{widgetText.copy.storedApiKeyHint}</p>
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

          <div className="assistant-route-actions">
            {selectedRouteId ? (
              <button
                className="settings-submit"
                type="button"
                onClick={() => void handleSetDefault(selectedRouteId)}
              >
                {widgetText.copy.setDefaultRouteAction}
              </button>
            ) : null}
        <button className="settings-submit" type="button" onClick={() => void handleSave()}>
          {widgetText.copy.saveRouteAction}
        </button>
            {selectedRouteId ? (
              <button className="settings-submit" type="button" onClick={() => void handleDelete()}>
                {widgetText.copy.deleteRouteAction}
              </button>
            ) : null}
          </div>

          <div className="widget-settings-actions">
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
        </section>
      </div>
    </article>
  )
}

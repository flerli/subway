import { useEffect, useState } from 'react'
import { fetchWidgetMcpToolLog, type WidgetMcpToolLogRecord } from '../api/widgetSettings'
import type { AppTextBundle } from '../i18n/appText'
import type { SupportedLanguageCode } from '../i18n/localization'
import type {
  RegisteredWidget,
  WidgetMcpConfigurationSettings,
  WidgetSettingsValues,
} from './widgetTypes'
import { getWidgetBoardKicker } from './widgetLocalization'
import {
  mergeWidgetSettingsWithMcpConfiguration,
  normalizeWidgetMcpConfiguration,
} from './widgetMcpConfiguration'

interface WidgetMcpConfigurationCardProps {
  appText: AppTextBundle
  languageCode: SupportedLanguageCode
  widget: RegisteredWidget
  initialSettings: WidgetSettingsValues
  onSave: (widgetId: string, settings: WidgetSettingsValues) => Promise<void>
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'
type LogRequestState = 'idle' | 'loading' | 'error'

const formatParityScope = (
  appText: AppTextBundle,
  parityScope: NonNullable<RegisteredWidget['module']['mcpTools']>[number]['parityScope'],
) =>
  parityScope
    .map((scope) =>
      scope === 'write'
        ? appText.widgetSettingsHost.mcpCapabilityWrite
        : appText.widgetSettingsHost.mcpCapabilityRead,
    )
    .join(' / ')

const formatToolEventStatus = (
  appText: AppTextBundle,
  status: WidgetMcpToolLogRecord['payload']['status'],
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

const formatToolEventTimestamp = (
  languageCode: SupportedLanguageCode,
  value: string,
) => {
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

const formatToolEventValue = (value: unknown) =>
  typeof value === 'string' ? value : JSON.stringify(value, null, 2)

export function WidgetMcpConfigurationCard({
  appText,
  languageCode,
  widget,
  initialSettings,
  onSave,
}: WidgetMcpConfigurationCardProps) {
  const [draftConfiguration, setDraftConfiguration] = useState<WidgetMcpConfigurationSettings>(
    normalizeWidgetMcpConfiguration(widget, initialSettings),
  )
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [toolLog, setToolLog] = useState<WidgetMcpToolLogRecord[]>([])
  const [logRequestState, setLogRequestState] = useState<LogRequestState>('idle')
  const [logErrorMessage, setLogErrorMessage] = useState('')

  const loadToolLog = async (widgetId: string) => {
    setLogRequestState('loading')
    setLogErrorMessage('')

    try {
      const nextToolLog = await fetchWidgetMcpToolLog(widgetId)
      setToolLog(nextToolLog)
      setLogRequestState('idle')
    } catch (error) {
      setToolLog([])
      setLogRequestState('error')
      setLogErrorMessage(
        error instanceof Error
          ? error.message
          : appText.widgetSettingsHost.mcpLogLoadFailedState,
      )
    }
  }

  useEffect(() => {
    setDraftConfiguration(normalizeWidgetMcpConfiguration(widget, initialSettings))
    setSaveState('idle')
  }, [initialSettings, widget])

  useEffect(() => {
    void loadToolLog(widget.entity.id)
  }, [widget.entity.id])

  const registeredTools = widget.module.mcpTools ?? []

  const handleSave = async () => {
    setSaveState('saving')

    try {
      await onSave(
        widget.entity.id,
        mergeWidgetSettingsWithMcpConfiguration(initialSettings, draftConfiguration),
      )
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }

  return (
    <>
      <article className="settings-card widget-settings-card widget-settings-card--expanded">
        <div className="settings-card-head">
          <p className="widget-kicker">{getWidgetBoardKicker(widget, languageCode)}</p>
          <h3>{appText.widgetSettingsHost.mcpTitle}</h3>
          <p>{appText.widgetSettingsHost.mcpDescription}</p>
        </div>

        {registeredTools.length === 0 ? (
          <div className="widget-settings-fields">
            <div className="widget-mcp-tool-card">
              <p className="empty-title">{appText.widgetSettingsHost.mcpEmptyTitle}</p>
              <p className="widget-mcp-tool-description">
                {appText.widgetSettingsHost.mcpEmptyCopy}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="widget-settings-fields widget-mcp-tool-list">
              {registeredTools.map((tool) => {
                const policy = draftConfiguration.toolPolicies[tool.name] ?? {
                  enabled: true,
                  approvalRequired: tool.approvalRequired === true,
                }

                return (
                  <section className="widget-mcp-tool-card" key={tool.name}>
                    <p className="widget-mcp-tool-name">{tool.name}</p>
                    <p className="widget-mcp-tool-description">{tool.description}</p>
                    <p className="widget-mcp-tool-meta">
                      {appText.widgetSettingsHost.mcpHumanActionLabel}: {tool.humanAction}
                    </p>
                    <p className="widget-mcp-tool-meta">
                      {appText.widgetSettingsHost.mcpParityScopeLabel}:{' '}
                      {formatParityScope(appText, tool.parityScope)}
                    </p>

                    <label className="settings-toggle">
                      <span>{appText.widgetSettingsHost.mcpToolEnabledLabel}</span>
                      <input
                        type="checkbox"
                        checked={policy.enabled}
                        onChange={(event) =>
                          setDraftConfiguration((currentValue) => ({
                            toolPolicies: {
                              ...currentValue.toolPolicies,
                              [tool.name]: {
                                ...currentValue.toolPolicies[tool.name],
                                enabled: event.target.checked,
                              },
                            },
                          }))
                        }
                      />
                    </label>

                    <label className="settings-toggle">
                      <span>{appText.widgetSettingsHost.mcpToolApprovalLabel}</span>
                      <input
                        type="checkbox"
                        checked={policy.approvalRequired}
                        disabled={!policy.enabled}
                        onChange={(event) =>
                          setDraftConfiguration((currentValue) => ({
                            toolPolicies: {
                              ...currentValue.toolPolicies,
                              [tool.name]: {
                                ...currentValue.toolPolicies[tool.name],
                                approvalRequired: event.target.checked,
                              },
                            },
                          }))
                        }
                      />
                    </label>
                  </section>
                )
              })}
            </div>

            <div className="widget-settings-actions">
              <button className="settings-submit" type="button" onClick={handleSave}>
                {appText.widgetSettingsHost.saveAction}
              </button>
              <p className="settings-note">
                {saveState === 'saving'
                  ? appText.widgetSettingsHost.savingState
                  : saveState === 'saved'
                    ? appText.widgetSettingsHost.savedState
                    : saveState === 'error'
                      ? appText.widgetSettingsHost.saveFailedState
                      : appText.widgetSettingsHost.pendingChangesState}
              </p>
            </div>
          </>
        )}
      </article>

      <article className="settings-card widget-settings-card widget-settings-card--expanded">
        <div className="settings-card-head">
          <p className="widget-kicker">{getWidgetBoardKicker(widget, languageCode)}</p>
          <h3>{appText.widgetSettingsHost.mcpLogTitle}</h3>
          <p>{appText.widgetSettingsHost.mcpLogDescription}</p>
        </div>

        <div className="widget-settings-actions widget-settings-actions--log">
          <button
            className="settings-submit"
            type="button"
            onClick={() => void loadToolLog(widget.entity.id)}
          >
            {appText.widgetSettingsHost.mcpLogRefreshAction}
          </button>
          <p className="settings-note">
            {logRequestState === 'loading'
              ? appText.widgetSettingsHost.mcpLogLoadingState
              : logRequestState === 'error'
                ? logErrorMessage || appText.widgetSettingsHost.mcpLogLoadFailedState
                : ''}
          </p>
        </div>

        {toolLog.length === 0 ? (
          <div className="widget-settings-fields">
            <div className="widget-mcp-tool-card">
              <p className="empty-title">{appText.widgetSettingsHost.mcpLogEmptyTitle}</p>
              <p className="widget-mcp-tool-description">
                {appText.widgetSettingsHost.mcpLogEmptyCopy}
              </p>
            </div>
          </div>
        ) : (
          <div className="widget-settings-fields widget-mcp-log-list">
            {toolLog.map((toolEvent) => (
              <section className="widget-mcp-tool-card widget-mcp-log-card" key={toolEvent.id}>
                <div className="widget-mcp-log-head">
                  <p className="widget-mcp-tool-name">{toolEvent.payload.toolName}</p>
                  <p className="widget-mcp-log-status">
                    {formatToolEventStatus(appText, toolEvent.payload.status)}
                  </p>
                </div>
                <p className="widget-mcp-tool-meta">
                  {appText.widgetSettingsHost.mcpLogThreadLabel}:{' '}
                  {toolEvent.threadTitle || toolEvent.threadId}
                </p>
                <p className="widget-mcp-tool-meta">
                  {appText.widgetSettingsHost.mcpLogTimestampLabel}:{' '}
                  {formatToolEventTimestamp(languageCode, toolEvent.createdAt)}
                </p>
                <p className="widget-mcp-tool-meta">
                  {appText.assistant.toolServerLabel}: {toolEvent.payload.serverName}
                </p>

                <div className="widget-mcp-log-block">
                  <p className="widget-mcp-log-label">{appText.assistant.toolArgumentsLabel}</p>
                  <pre className="widget-mcp-log-payload">
                    {formatToolEventValue(toolEvent.payload.displayArguments)}
                  </pre>
                </div>

                {toolEvent.payload.displayResult !== null ? (
                  <div className="widget-mcp-log-block">
                    <p className="widget-mcp-log-label">{appText.assistant.toolResultLabel}</p>
                    <pre className="widget-mcp-log-payload">
                      {formatToolEventValue(toolEvent.payload.displayResult)}
                    </pre>
                  </div>
                ) : null}

                {toolEvent.payload.error ? (
                  <div className="widget-mcp-log-block">
                    <p className="widget-mcp-log-label">{appText.assistant.toolErrorLabel}</p>
                    <pre className="widget-mcp-log-payload">
                      {`${toolEvent.payload.error.message}\n${toolEvent.payload.error.errorCode}`}
                    </pre>
                  </div>
                ) : null}
              </section>
            ))}
          </div>
        )}
      </article>
    </>
  )
}
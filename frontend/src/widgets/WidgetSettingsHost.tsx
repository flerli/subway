import { useEffect, useMemo, useState } from 'react'
import type { AppTextBundle } from '../i18n/appText'
import { formatLocalizedText } from '../i18n/localization'
import type { SupportedLanguageCode } from '../i18n/localization'
import type { RegisteredWidget, WidgetSettingsValues } from './widgetTypes'
import {
  getLocalizedSettingsDefinition,
  getWidgetBoardKicker,
  resolveWidgetTitle,
} from './widgetLocalization'

interface WidgetSettingsHostProps {
  appText: AppTextBundle
  languageCode: SupportedLanguageCode
  registeredWidgets: RegisteredWidget[]
  widgetSettingsMap: Record<string, WidgetSettingsValues>
  onSaveWidgetSettings: (
    widgetId: string,
    settings: WidgetSettingsValues,
  ) => Promise<void>
}

interface WidgetSettingsLauncherCardProps {
  appText: AppTextBundle
  languageCode: SupportedLanguageCode
  widget: RegisteredWidget
  isExpanded: boolean
  onToggleExpanded: (widgetId: string) => void
}

interface WidgetSettingsExpandedCardProps {
  appText: AppTextBundle
  languageCode: SupportedLanguageCode
  widget: RegisteredWidget
  initialSettings: WidgetSettingsValues
  onSave: (widgetId: string, settings: WidgetSettingsValues) => Promise<void>
}

const renderEmptyState = (title: string, copy: string) => (
  <div className="empty-state empty-state--expanded">
    <p className="empty-title">{title}</p>
    <p className="empty-copy">{copy}</p>
  </div>
)

const getWidgetSettingsSummary = (
  widget: RegisteredWidget,
  languageCode: SupportedLanguageCode,
) => {
  const localizedSettingsDefinition = getLocalizedSettingsDefinition(
    widget.module,
    languageCode,
  )

  if (localizedSettingsDefinition) {
    return {
      title: localizedSettingsDefinition.title,
      description: localizedSettingsDefinition.description,
    }
  }

  const settingsText = widget.module.getTranslation(languageCode).settings

  return {
    title: settingsText?.title ?? resolveWidgetTitle(widget, languageCode),
    description: settingsText?.description ?? '',
  }
}

function WidgetSettingsLauncherCard({
  appText,
  languageCode,
  widget,
  isExpanded,
  onToggleExpanded,
}: WidgetSettingsLauncherCardProps) {
  const summary = getWidgetSettingsSummary(widget, languageCode)

  return (
    <article
      className={`settings-card widget-settings-card widget-settings-card--compact${
        isExpanded ? ' is-active' : ''
      }`}
    >
      <div className="settings-card-head">
        <p className="widget-kicker">{getWidgetBoardKicker(widget, languageCode)}</p>
        <h3>{summary.title}</h3>
      </div>

      <div className="widget-settings-launcher-copy">
        {summary.description ? <p>{summary.description}</p> : null}
      </div>

      <div className="widget-settings-actions widget-settings-actions--launcher">
        <button
          type="button"
          className={`widget-action-button${isExpanded ? ' is-active' : ''}`}
          aria-label={
            isExpanded
              ? formatLocalizedText(appText.boardHost.collapseAriaLabel, {
                  title: resolveWidgetTitle(widget, languageCode),
                })
              : formatLocalizedText(appText.boardHost.expandAriaLabel, {
                  title: resolveWidgetTitle(widget, languageCode),
                })
          }
          aria-pressed={isExpanded}
          onClick={() => onToggleExpanded(widget.entity.id)}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path
              d="M4 8V4h4M12 4h4v4M4 12v4h4M16 12v4h-4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
          </svg>
          <span>
            {isExpanded
              ? appText.boardHost.collapseAction
              : appText.boardHost.expandAction}
          </span>
        </button>
      </div>
    </article>
  )
}

function WidgetSettingsExpandedCard({
  appText,
  languageCode,
  widget,
  initialSettings,
  onSave,
}: WidgetSettingsExpandedCardProps) {
  const [draftSettings, setDraftSettings] = useState(initialSettings)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    setDraftSettings(initialSettings)
  }, [initialSettings])

  const settingsDefinition = getLocalizedSettingsDefinition(widget.module, languageCode)

  if (widget.module.renderSettingsPanel) {
    return widget.module.renderSettingsPanel({
      widget,
      languageCode,
      initialSettings,
      onSave,
    })
  }

  if (!settingsDefinition) {
    return null
  }

  const handleSave = async () => {
    setSaveState('saving')

    try {
      await onSave(widget.entity.id, draftSettings)
      setSaveState('saved')
    } catch {
      setSaveState('error')
    }
  }

  return (
    <article className="settings-card widget-settings-card widget-settings-card--expanded">
      <div className="settings-card-head">
        <p className="widget-kicker">{getWidgetBoardKicker(widget, languageCode)}</p>
        <h3>{settingsDefinition.title}</h3>
        <p>{settingsDefinition.description}</p>
      </div>

      <div className="widget-settings-fields">
        {settingsDefinition.fields.map((field) => {
          const fieldValue = draftSettings[field.key]

          if (field.type === 'boolean') {
            return (
              <label className="settings-toggle" key={field.key}>
                <span>{field.label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(fieldValue)}
                  onChange={(event) =>
                    setDraftSettings((currentValues: WidgetSettingsValues) => ({
                      ...currentValues,
                      [field.key]: event.target.checked,
                    }))
                  }
                />
              </label>
            )
          }

          return (
            <label className="settings-label" key={field.key}>
              <span>{field.label}</span>
              <input
                className="settings-input"
                type={field.type === 'number' ? 'number' : 'text'}
                value={String(fieldValue ?? '')}
                min={field.min}
                max={field.max}
                step={field.step}
                placeholder={field.placeholder}
                onChange={(event) =>
                  setDraftSettings((currentValues: WidgetSettingsValues) => ({
                    ...currentValues,
                    [field.key]:
                      field.type === 'number'
                        ? Number(event.target.value)
                        : event.target.value,
                  }))
                }
              />
            </label>
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
    </article>
  )
}

export function WidgetSettingsHost({
  appText,
  languageCode,
  registeredWidgets,
  widgetSettingsMap,
  onSaveWidgetSettings,
}: WidgetSettingsHostProps) {
  const settingsWidgets = useMemo(
    () => registeredWidgets.filter((widget) => widget.module.hasSettingsPanel),
    [registeredWidgets],
  )
  const [expandedWidgetId, setExpandedWidgetId] = useState<string | null>(null)

  useEffect(() => {
    if (settingsWidgets.length === 0) {
      setExpandedWidgetId(null)
      return
    }

    if (
      expandedWidgetId &&
      !settingsWidgets.some((widget) => widget.entity.id === expandedWidgetId)
    ) {
      setExpandedWidgetId(null)
    }
  }, [expandedWidgetId, settingsWidgets])

  if (settingsWidgets.length === 0) {
    return null
  }

  const expandedWidget = expandedWidgetId
    ? settingsWidgets.find((widget) => widget.entity.id === expandedWidgetId)
    : undefined

  const toggleExpandedWidget = (widgetId: string) => {
    setExpandedWidgetId((currentWidgetId) =>
      currentWidgetId === widgetId ? null : widgetId,
    )
  }

  return (
    <section className="widget-settings-host">
      <div className="widget-settings-grid">
        {settingsWidgets.map((widget) => (
          <WidgetSettingsLauncherCard
            key={widget.entity.id}
            appText={appText}
            languageCode={languageCode}
            widget={widget}
            isExpanded={expandedWidgetId === widget.entity.id}
            onToggleExpanded={toggleExpandedWidget}
          />
        ))}
      </div>

      <section
        className="widget-zone widget-zone--expanded-stage"
        aria-label={appText.widgetSettingsHost.expandedWidgetViewAriaLabel}
      >
        {expandedWidget ? (
          <WidgetSettingsExpandedCard
            key={expandedWidget.entity.id}
            appText={appText}
            languageCode={languageCode}
            widget={expandedWidget}
            initialSettings={widgetSettingsMap[expandedWidget.entity.id] ?? {}}
            onSave={onSaveWidgetSettings}
          />
        ) : (
          renderEmptyState(
            appText.widgetSettingsHost.noExpandedWidgetTitle,
            appText.widgetSettingsHost.noExpandedWidgetCopy,
          )
        )}
      </section>
    </section>
  )
}

import { useEffect, useMemo, useState } from 'react'
import type { AppTextBundle } from '../i18n/appText'
import type { SupportedLanguageCode } from '../i18n/localization'
import type { RegisteredWidget, WidgetSettingsValues } from './widgetTypes'
import {
  getLocalizedSettingsDefinition,
  getWidgetBoardKicker,
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

interface WidgetSettingsCardProps {
  appText: AppTextBundle
  languageCode: SupportedLanguageCode
  widget: RegisteredWidget
  initialSettings: WidgetSettingsValues
  onSave: (widgetId: string, settings: WidgetSettingsValues) => Promise<void>
}

function WidgetSettingsCard({
  appText,
  languageCode,
  widget,
  initialSettings,
  onSave,
}: WidgetSettingsCardProps) {
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
    <article className="settings-card widget-settings-card">
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

  if (settingsWidgets.length === 0) {
    return null
  }

  return (
    <section className="widget-settings-host">
      {settingsWidgets.map((widget) => (
        <WidgetSettingsCard
          key={widget.entity.id}
          appText={appText}
          languageCode={languageCode}
          widget={widget}
          initialSettings={widgetSettingsMap[widget.entity.id] ?? {}}
          onSave={onSaveWidgetSettings}
        />
      ))}
    </section>
  )
}

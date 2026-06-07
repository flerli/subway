import { useEffect, useMemo, useState } from 'react'
import type { RegisteredWidget, WidgetSettingsValues } from './widgetTypes'

interface WidgetSettingsHostProps {
  registeredWidgets: RegisteredWidget[]
  widgetSettingsMap: Record<string, WidgetSettingsValues>
  onSaveWidgetSettings: (
    widgetId: string,
    settings: WidgetSettingsValues,
  ) => Promise<void>
}

interface WidgetSettingsCardProps {
  widget: RegisteredWidget
  initialSettings: WidgetSettingsValues
  onSave: (widgetId: string, settings: WidgetSettingsValues) => Promise<void>
}

function WidgetSettingsCard({
  widget,
  initialSettings,
  onSave,
}: WidgetSettingsCardProps) {
  const [draftSettings, setDraftSettings] = useState(initialSettings)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    setDraftSettings(initialSettings)
  }, [initialSettings])

  const settingsDefinition = widget.module.settingsDefinition

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
        <p className="widget-kicker">{widget.presentation.boardKicker}</p>
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
          Save widget settings
        </button>
        <p className="settings-note">
          {saveState === 'saving'
            ? 'Saving...'
            : saveState === 'saved'
              ? 'Saved.'
              : saveState === 'error'
                ? 'Save failed.'
                : 'Pending changes.'}
        </p>
      </div>
    </article>
  )
}

export function WidgetSettingsHost({
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
          widget={widget}
          initialSettings={widgetSettingsMap[widget.entity.id] ?? {}}
          onSave={onSaveWidgetSettings}
        />
      ))}
    </section>
  )
}

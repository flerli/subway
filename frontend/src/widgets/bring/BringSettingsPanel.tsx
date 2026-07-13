import { useEffect, useState } from 'react'
import {
  fetchBringSettings,
  resolveBringLists,
  updateBringSettings,
  type BringListOption,
} from '../../api/bring'
import { formatLocalizedText } from '../../i18n/localization'
import type { SupportedLanguageCode } from '../../i18n/localization'
import type { RegisteredWidget } from '../widgetTypes'
import type { BringWidgetTranslation } from './translations'

interface BringSettingsPanelProps {
  widget: RegisteredWidget
  languageCode: SupportedLanguageCode
  initialSettings: Record<string, unknown>
  onSave: (widgetId: string, settings: Record<string, unknown>) => Promise<void>
  widgetText: BringWidgetTranslation
}

type RequestState = 'idle' | 'loading' | 'saving' | 'saved' | 'error'

export function BringSettingsPanel({
  widget,
  languageCode,
  initialSettings,
  onSave,
  widgetText,
}: BringSettingsPanelProps) {
  const [username, setUsername] = useState(
    typeof initialSettings.username === 'string' ? initialSettings.username : '',
  )
  const [password, setPassword] = useState('')
  const [selectedListUuid, setSelectedListUuid] = useState(
    typeof initialSettings.selectedListUuid === 'string'
      ? initialSettings.selectedListUuid
      : '',
  )
  const [selectedListName, setSelectedListName] = useState(
    typeof initialSettings.selectedListName === 'string'
      ? initialSettings.selectedListName
      : '',
  )
  const [hasStoredPassword, setHasStoredPassword] = useState(
    initialSettings.hasStoredPassword === true,
  )
  const [availableLists, setAvailableLists] = useState<BringListOption[]>([])
  const [requestState, setRequestState] = useState<RequestState>('idle')
  const [statusMessage, setStatusMessage] = useState(widgetText.copy.idleState)

  useEffect(() => {
    let cancelled = false

    fetchBringSettings()
      .then((bringSettings) => {
        if (cancelled) {
          return
        }

        setUsername(bringSettings.username)
        setSelectedListUuid(bringSettings.selectedListUuid)
        setSelectedListName(bringSettings.selectedListName)
        setHasStoredPassword(bringSettings.hasStoredPassword)
        setAvailableLists(
          bringSettings.selectedListUuid && bringSettings.selectedListName
            ? [
                {
                  listUuid: bringSettings.selectedListUuid,
                  name: bringSettings.selectedListName,
                  theme: null,
                },
              ]
            : [],
        )
        setRequestState('idle')
        setStatusMessage(widgetText.copy.idleState)
      })
      .catch((error) => {
        if (cancelled) {
          return
        }

        setRequestState('error')
        setStatusMessage(
          error instanceof Error
            ? error.message
            : widgetText.copy.settingsLoadFailedState,
        )
      })

    return () => {
      cancelled = true
    }
  }, [languageCode, widgetText.copy.idleState, widgetText.copy.settingsLoadFailedState])

  const handleLoadLists = async () => {
    setRequestState('loading')
    setStatusMessage(widgetText.copy.loadingListsState)

    try {
      const payload = await resolveBringLists({ username, password })
      const nextSelectedListUuid =
        payload.selectedListUuid || selectedListUuid || payload.lists[0]?.listUuid || ''
      const nextSelectedList =
        payload.lists.find((entry) => entry.listUuid === nextSelectedListUuid) ??
        payload.lists[0] ??
        null

      setAvailableLists(payload.lists)
      setSelectedListUuid(nextSelectedList?.listUuid ?? '')
      setSelectedListName(nextSelectedList?.name ?? '')
      setRequestState('idle')
      setStatusMessage(widgetText.copy.idleState)
    } catch (error) {
      setRequestState('error')
      setStatusMessage(
        error instanceof Error
          ? error.message
          : widgetText.copy.settingsLoadFailedState,
      )
    }
  }

  const handleSave = async () => {
    setRequestState('saving')
    setStatusMessage(widgetText.copy.savingState)

    try {
      const payload = await updateBringSettings({
        username,
        password,
        selectedListUuid,
      })
      const nextSelectedList =
        payload.lists.find(
          (entry) => entry.listUuid === payload.bringSettings.selectedListUuid,
        ) ?? null

      setHasStoredPassword(payload.bringSettings.hasStoredPassword)
      setAvailableLists(payload.lists)
      setSelectedListUuid(payload.bringSettings.selectedListUuid)
      setSelectedListName(nextSelectedList?.name ?? payload.bringSettings.selectedListName)
      setPassword('')
      await onSave(widget.entity.id, {
        username: payload.bringSettings.username,
        hasStoredPassword: payload.bringSettings.hasStoredPassword,
        selectedListUuid: payload.bringSettings.selectedListUuid,
        selectedListName:
          nextSelectedList?.name ?? payload.bringSettings.selectedListName,
        updatedAt: payload.bringSettings.updatedAt,
      })
      setRequestState('saved')
      setStatusMessage(widgetText.copy.savedState)
    } catch (error) {
      setRequestState('error')
      setStatusMessage(
        error instanceof Error
          ? error.message
          : widgetText.copy.settingsLoadFailedState,
      )
    }
  }

  return (
    <article className="settings-card widget-settings-card">
      <div className="settings-card-head">
        <p className="widget-kicker">{widgetText.boardKicker}</p>
        <h3>{widgetText.settings?.title ?? widget.entity.title}</h3>
        <p>{widgetText.settings?.description ?? widget.entity.title}</p>
      </div>

      <div className="widget-settings-fields">
        <label className="settings-label">
          <span>{widgetText.copy.usernameLabel}</span>
          <input
            className="settings-input"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>

        <label className="settings-label">
          <span>{widgetText.copy.passwordLabel}</span>
          <input
            className="settings-input"
            type="password"
            value={password}
            placeholder={widgetText.settings?.fields.password?.placeholder}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {hasStoredPassword ? (
          <p className="settings-note">{widgetText.copy.passwordStoredHint}</p>
        ) : null}

        <label className="settings-label">
          <span>{widgetText.copy.selectedListLabel}</span>
          <select
            className="settings-input"
            value={selectedListUuid}
            onChange={(event) => {
              const nextSelectedListUuid = event.target.value
              const nextSelectedList =
                availableLists.find((entry) => entry.listUuid === nextSelectedListUuid) ?? null

              setSelectedListUuid(nextSelectedListUuid)
              setSelectedListName(nextSelectedList?.name ?? '')
            }}
          >
            <option value="">{widgetText.copy.selectedListPlaceholder}</option>
            {availableLists.map((list) => (
              <option key={list.listUuid} value={list.listUuid}>
                {list.name}
              </option>
            ))}
          </select>
        </label>

        {selectedListName ? (
          <p className="settings-note">
            {formatLocalizedText(widgetText.copy.currentSelectionMeta, {
              name: selectedListName,
            })}
          </p>
        ) : (
          <p className="settings-note">{widgetText.copy.noListsLoadedCopy}</p>
        )}
      </div>

      <div className="widget-settings-actions">
        <button
          className="settings-submit"
          type="button"
          onClick={handleLoadLists}
          disabled={requestState === 'loading' || requestState === 'saving'}
        >
          {widgetText.copy.loadListsAction}
        </button>
        <button
          className="settings-submit"
          type="button"
          onClick={handleSave}
          disabled={requestState === 'loading' || requestState === 'saving'}
        >
          {widgetText.copy.saveAction}
        </button>
        <p className="settings-note">
          {requestState === 'loading'
            ? widgetText.copy.loadingListsState
            : requestState === 'saving'
              ? widgetText.copy.savingState
              : statusMessage}
        </p>
      </div>
    </article>
  )
}
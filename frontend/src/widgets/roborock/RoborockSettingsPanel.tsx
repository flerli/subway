import { useEffect, useState } from 'react'
import {
  fetchRoborockSettings,
  requestRoborockCode,
  resolveRoborockDevices,
  updateRoborockSettings,
  updateRoborockSelection,
  validateRoborockSession,
  type RoborockDeviceOption,
  type RoborockRoutineOption,
} from '../../api/roborock'
import { formatLocalizedText } from '../../i18n/localization'
import type { SupportedLanguageCode } from '../../i18n/localization'
import type { RegisteredWidget } from '../widgetTypes'
import type { RoborockWidgetTranslation } from './translations'

interface RoborockSettingsPanelProps {
  widget: RegisteredWidget
  languageCode: SupportedLanguageCode
  widgetText: RoborockWidgetTranslation
}

type RequestState =
  | 'idle'
  | 'loading'
  | 'requestingCode'
  | 'saving'
  | 'loadingDevices'
  | 'savingSelection'
  | 'validating'
  | 'error'

export function RoborockSettingsPanel({
  widget,
  languageCode,
  widgetText,
}: RoborockSettingsPanelProps) {
  const [email, setEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [hasStoredSession, setHasStoredSession] = useState(false)
  const [baseUrl, setBaseUrl] = useState('')
  const [selectedDeviceDuid, setSelectedDeviceDuid] = useState('')
  const [selectedDeviceName, setSelectedDeviceName] = useState('')
  const [selectedDeviceModel, setSelectedDeviceModel] = useState('')
  const [selectedRoutineId, setSelectedRoutineId] = useState('')
  const [availableDevices, setAvailableDevices] = useState<RoborockDeviceOption[]>([])
  const [availableRoutines, setAvailableRoutines] = useState<RoborockRoutineOption[]>([])
  const [connectionStatus, setConnectionStatus] = useState<
    'not_configured' | 'connected' | 'reconnect_required'
  >('not_configured')
  const [requestState, setRequestState] = useState<RequestState>('idle')
  const [statusMessage, setStatusMessage] = useState(widgetText.copy.idleState)

  const applySettingsState = (settings: {
    hasStoredSession: boolean
    baseUrl: string
    selectedDeviceDuid: string
    selectedDeviceName: string
    selectedDeviceModel: string
    selectedRoutineId: number | null
    connectionStatus: 'not_configured' | 'connected' | 'reconnect_required'
  }) => {
    setHasStoredSession(settings.hasStoredSession)
    setBaseUrl(settings.baseUrl)
    setSelectedDeviceDuid(settings.selectedDeviceDuid)
    setSelectedDeviceName(settings.selectedDeviceName)
    setSelectedDeviceModel(settings.selectedDeviceModel)
    setSelectedRoutineId(
      settings.selectedRoutineId === null ? '' : String(settings.selectedRoutineId),
    )
    setConnectionStatus(settings.connectionStatus)
  }

  const loadDeviceOptions = async (nextSelectedDeviceDuid?: string) => {
    setRequestState('loadingDevices')
    setStatusMessage(widgetText.copy.loadingDevicesState)

    try {
      const payload = await resolveRoborockDevices({
        selectedDeviceDuid: nextSelectedDeviceDuid ?? selectedDeviceDuid,
      })
      const resolvedSelectedDeviceDuid =
        payload.selectedDeviceDuid ||
        payload.roborockSettings.selectedDeviceDuid ||
        payload.devices[0]?.duid ||
        ''
      const resolvedSelectedDevice =
        payload.devices.find((device) => device.duid === resolvedSelectedDeviceDuid) ?? null
      const resolvedSelectedRoutineId =
        payload.roborockSettings.selectedDeviceDuid === resolvedSelectedDeviceDuid &&
        payload.roborockSettings.selectedRoutineId !== null &&
        payload.routines.some(
          (routine) => routine.id === payload.roborockSettings.selectedRoutineId,
        )
          ? payload.roborockSettings.selectedRoutineId
          : null

      setAvailableDevices(payload.devices)
      setAvailableRoutines(payload.routines)
      applySettingsState({
        hasStoredSession: payload.roborockSettings.hasStoredSession,
        baseUrl: payload.roborockSettings.baseUrl,
        selectedDeviceDuid: resolvedSelectedDeviceDuid,
        selectedDeviceName:
          resolvedSelectedDevice?.name ?? payload.roborockSettings.selectedDeviceName,
        selectedDeviceModel:
          resolvedSelectedDevice?.model ?? payload.roborockSettings.selectedDeviceModel,
        selectedRoutineId: resolvedSelectedRoutineId,
        connectionStatus: payload.roborockSettings.connectionStatus,
      })
      setRequestState('idle')
      setStatusMessage(
        payload.roborockSettings.connectionStatus === 'connected'
          ? widgetText.copy.connectedState
          : payload.roborockSettings.connectionStatus === 'reconnect_required'
            ? widgetText.copy.reconnectRequiredState
            : widgetText.copy.idleState,
      )
    } catch (error) {
      setRequestState('error')
      setStatusMessage(
        error instanceof Error ? error.message : widgetText.copy.settingsLoadFailedState,
      )
    }
  }

  useEffect(() => {
    let cancelled = false

    setRequestState('loading')

    fetchRoborockSettings()
      .then((roborockSettings) => {
        if (cancelled) {
          return
        }

        setEmail(roborockSettings.email)
        applySettingsState(roborockSettings)
        setRequestState('idle')
        setStatusMessage(
          roborockSettings.connectionStatus === 'connected'
            ? widgetText.copy.connectedState
            : roborockSettings.connectionStatus === 'reconnect_required'
              ? widgetText.copy.reconnectRequiredState
              : widgetText.copy.idleState,
        )
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
  }, [languageCode, widgetText.copy.connectedState, widgetText.copy.idleState, widgetText.copy.reconnectRequiredState, widgetText.copy.settingsLoadFailedState])

  useEffect(() => {
    if (!hasStoredSession) {
      setAvailableDevices([])
      setAvailableRoutines([])
      return
    }

    loadDeviceOptions(selectedDeviceDuid || undefined)
    // Only kick off a refresh when the stored-session state flips to ready.
    // Additional reloads are driven by explicit user actions below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStoredSession])

  const handleRequestCode = async () => {
    setRequestState('requestingCode')
    setStatusMessage(widgetText.copy.requestingCodeState)

    try {
      await requestRoborockCode({ email })
      setRequestState('idle')
      setStatusMessage(widgetText.copy.codeRequestedState)
    } catch (error) {
      setRequestState('error')
      setStatusMessage(
        error instanceof Error ? error.message : widgetText.copy.settingsLoadFailedState,
      )
    }
  }

  const handleSave = async () => {
    setRequestState('saving')
    setStatusMessage(widgetText.copy.savingState)

    try {
      const roborockSettings = await updateRoborockSettings({
        email,
        verificationCode,
      })

      applySettingsState(roborockSettings)
      setVerificationCode('')
      await loadDeviceOptions(roborockSettings.selectedDeviceDuid || undefined)
      setRequestState('idle')
      setStatusMessage(widgetText.copy.savedState)
    } catch (error) {
      setRequestState('error')
      setStatusMessage(
        error instanceof Error ? error.message : widgetText.copy.settingsLoadFailedState,
      )
    }
  }

  const handleValidate = async () => {
    setRequestState('validating')
    setStatusMessage(widgetText.copy.validatingState)

    try {
      const payload = await validateRoborockSession()

      applySettingsState(payload.roborockSettings)
      if (payload.roborockSettings.hasStoredSession) {
        await loadDeviceOptions(payload.roborockSettings.selectedDeviceDuid || undefined)
      }
      setRequestState('idle')
      setStatusMessage(
        payload.healthy
          ? widgetText.copy.connectedState
          : widgetText.copy.reconnectRequiredState,
      )
    } catch (error) {
      setRequestState('error')
      setStatusMessage(
        error instanceof Error ? error.message : widgetText.copy.settingsLoadFailedState,
      )
    }
  }

  const handleSaveSelection = async () => {
    setRequestState('savingSelection')
    setStatusMessage(widgetText.copy.savingSelectionState)

    try {
      const payload = await updateRoborockSelection({
        selectedDeviceDuid,
        selectedRoutineId: selectedRoutineId ? Number.parseInt(selectedRoutineId, 10) : null,
      })
      const resolvedSelectedDevice =
        payload.devices.find((device) => device.duid === payload.selectedDeviceDuid) ?? null

      setAvailableDevices(payload.devices)
      setAvailableRoutines(payload.routines)
      applySettingsState({
        hasStoredSession: payload.roborockSettings.hasStoredSession,
        baseUrl: payload.roborockSettings.baseUrl,
        selectedDeviceDuid: payload.roborockSettings.selectedDeviceDuid,
        selectedDeviceName:
          payload.roborockSettings.selectedDeviceName || resolvedSelectedDevice?.name || '',
        selectedDeviceModel:
          payload.roborockSettings.selectedDeviceModel || resolvedSelectedDevice?.model || '',
        selectedRoutineId: payload.roborockSettings.selectedRoutineId,
        connectionStatus: payload.roborockSettings.connectionStatus,
      })
      setRequestState('idle')
      setStatusMessage(widgetText.copy.selectionSavedState)
    } catch (error) {
      setRequestState('error')
      setStatusMessage(
        error instanceof Error ? error.message : widgetText.copy.settingsLoadFailedState,
      )
    }
  }

  const selectedDevice = availableDevices.find((device) => device.duid === selectedDeviceDuid) ?? null

  return (
    <article className="settings-card widget-settings-card">
      <div className="settings-card-head">
        <p className="widget-kicker">{widgetText.boardKicker}</p>
        <h3>{widgetText.settings?.title ?? widget.entity.title}</h3>
        <p>{widgetText.settings?.description ?? widget.entity.title}</p>
      </div>

      <div className="widget-settings-fields">
        <label className="settings-label">
          <span>{widgetText.copy.emailLabel}</span>
          <input
            className="settings-input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label className="settings-label">
          <span>{widgetText.copy.verificationCodeLabel}</span>
          <input
            className="settings-input"
            type="text"
            value={verificationCode}
            placeholder={widgetText.copy.verificationCodePlaceholder}
            onChange={(event) => setVerificationCode(event.target.value)}
          />
        </label>

        {hasStoredSession ? (
          <p className="settings-note">{widgetText.copy.sessionStoredHint}</p>
        ) : null}

        {baseUrl ? (
          <p className="settings-note">
            {formatLocalizedText(widgetText.copy.baseUrlMeta, { baseUrl })}
          </p>
        ) : null}

        <label className="settings-label">
          <span>{widgetText.copy.deviceLabel}</span>
          <select
            className="settings-input"
            value={selectedDeviceDuid}
            onChange={async (event) => {
              const nextSelectedDeviceDuid = event.target.value
              setSelectedDeviceDuid(nextSelectedDeviceDuid)
              setSelectedRoutineId('')
              await loadDeviceOptions(nextSelectedDeviceDuid || undefined)
            }}
            disabled={
              !hasStoredSession ||
              requestState === 'loading' ||
              requestState === 'requestingCode' ||
              requestState === 'saving' ||
              requestState === 'loadingDevices' ||
              requestState === 'savingSelection' ||
              requestState === 'validating'
            }
          >
            <option value="">{widgetText.copy.devicePlaceholder}</option>
            {availableDevices.map((device) => (
              <option key={device.duid} value={device.duid}>
                {device.name} ({device.model})
              </option>
            ))}
          </select>
        </label>

        <label className="settings-label">
          <span>{widgetText.copy.routineLabel}</span>
          <select
            className="settings-input"
            value={selectedRoutineId}
            onChange={(event) => setSelectedRoutineId(event.target.value)}
            disabled={
              !hasStoredSession ||
              !selectedDeviceDuid ||
              !selectedDevice?.supportsRoutineSelection ||
              requestState === 'loading' ||
              requestState === 'requestingCode' ||
              requestState === 'saving' ||
              requestState === 'loadingDevices' ||
              requestState === 'savingSelection' ||
              requestState === 'validating'
            }
          >
            <option value="">{widgetText.copy.routinePlaceholder}</option>
            {availableRoutines.map((routine) => (
              <option key={routine.id} value={String(routine.id)}>
                {routine.name}
              </option>
            ))}
          </select>
        </label>

        {selectedDeviceName && selectedDeviceModel ? (
          <p className="settings-note">
            {formatLocalizedText(widgetText.copy.selectedDeviceMeta, {
              name: selectedDeviceName,
              model: selectedDeviceModel,
            })}
          </p>
        ) : null}

        {hasStoredSession && availableDevices.length === 0 ? (
          <p className="settings-note">{widgetText.copy.noDevicesLoadedCopy}</p>
        ) : null}

        {selectedDevice && !selectedDevice.supportsRoutineSelection ? (
          <p className="settings-note">{widgetText.copy.noRoutinesAvailableCopy}</p>
        ) : null}

        {selectedDevice && selectedDevice.supportsRoutineSelection && availableRoutines.length === 0 ? (
          <p className="settings-note">{widgetText.copy.standardStartFallbackCopy}</p>
        ) : null}

        <p className="settings-note">
          {connectionStatus === 'connected'
            ? widgetText.copy.connectedState
            : connectionStatus === 'reconnect_required'
              ? widgetText.copy.reconnectRequiredState
              : widgetText.copy.notConfiguredState}
        </p>
      </div>

      <div className="widget-settings-actions">
        <button
          className="settings-submit"
          type="button"
          onClick={handleRequestCode}
          disabled={
            requestState === 'loading' ||
            requestState === 'requestingCode' ||
            requestState === 'saving' ||
            requestState === 'loadingDevices' ||
            requestState === 'savingSelection' ||
            requestState === 'validating'
          }
        >
          {widgetText.copy.requestCodeAction}
        </button>
        <button
          className="settings-submit"
          type="button"
          onClick={handleSave}
          disabled={
            requestState === 'loading' ||
            requestState === 'requestingCode' ||
            requestState === 'saving' ||
            requestState === 'loadingDevices' ||
            requestState === 'savingSelection' ||
            requestState === 'validating'
          }
        >
          {widgetText.copy.saveAction}
        </button>
        <button
          className="settings-submit"
          type="button"
          onClick={() => loadDeviceOptions(selectedDeviceDuid || undefined)}
          disabled={
            !hasStoredSession ||
            requestState === 'loading' ||
            requestState === 'requestingCode' ||
            requestState === 'saving' ||
            requestState === 'loadingDevices' ||
            requestState === 'savingSelection' ||
            requestState === 'validating'
          }
        >
          {widgetText.copy.loadDevicesAction}
        </button>
        <button
          className="settings-submit"
          type="button"
          onClick={handleSaveSelection}
          disabled={
            !hasStoredSession ||
            !selectedDeviceDuid ||
            requestState === 'loading' ||
            requestState === 'requestingCode' ||
            requestState === 'saving' ||
            requestState === 'loadingDevices' ||
            requestState === 'savingSelection' ||
            requestState === 'validating'
          }
        >
          {widgetText.copy.saveSelectionAction}
        </button>
        <button
          className="settings-submit"
          type="button"
          onClick={handleValidate}
          disabled={
            !hasStoredSession ||
            requestState === 'loading' ||
            requestState === 'requestingCode' ||
            requestState === 'saving' ||
            requestState === 'loadingDevices' ||
            requestState === 'savingSelection' ||
            requestState === 'validating'
          }
        >
          {widgetText.copy.validateAction}
        </button>
        <p className="settings-note">{statusMessage}</p>
      </div>
    </article>
  )
}
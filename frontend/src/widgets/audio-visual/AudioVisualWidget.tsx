import { useEffect, useMemo, useRef, useState } from 'react'
import {
  updateAppPreferences,
  type AudioVisualPermissionState,
  type AudioVisualRecordingMode,
} from '../../api/appPreferences'
import {
  deleteAudioVisualRecording,
  fetchAudioVisualRecordings,
  resolveAudioVisualContentUrl,
  resolveAudioVisualDownloadUrl,
  uploadAudioVisualRecording,
  type AudioVisualRecording,
} from '../../api/audioVisual'
import type { SupportedLanguageCode } from '../../i18n/localization'
import type { WidgetSettingsValues } from '../widgetTypes'
import type { AudioVisualWidgetTranslation } from './translations'
import { AUDIO_VISUAL_WIDGET_ID } from './AudioVisualPanel'

type AudioVisualPanelMode = 'grid' | 'expanded'
type PermissionState =
  | 'idle'
  | 'requesting'
  | 'granted'
  | 'denied'
  | 'unsupported'
  | 'error'
type RecordingMode = 'video' | 'audio' | null
type SurfaceMode = 'live' | 'history'
type CameraFacingMode = 'user' | 'environment'

interface AudioVisualWidgetProps {
  mode: AudioVisualPanelMode
  languageCode: SupportedLanguageCode
  widgetText: AudioVisualWidgetTranslation
  initialSettings: WidgetSettingsValues
  onSaveSettings: (widgetId: string, settings: WidgetSettingsValues) => Promise<void>
}

interface NormalizedAudioVisualSettings {
  cameraEnabled: boolean
  microphoneEnabled: boolean
}

const readAudioVisualSettings = (
  value: WidgetSettingsValues,
): NormalizedAudioVisualSettings => ({
  cameraEnabled: typeof value.cameraEnabled === 'boolean' ? value.cameraEnabled : true,
  microphoneEnabled:
    typeof value.microphoneEnabled === 'boolean' ? value.microphoneEnabled : true,
})

const pickSupportedMimeType = (candidates: string[]) => {
  if (typeof MediaRecorder === 'undefined') {
    return ''
  }

  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? ''
}

const formatDuration = (durationSeconds: number | null) => {
  if (durationSeconds == null || !Number.isFinite(durationSeconds)) {
    return '--:--'
  }

  const totalSeconds = Math.max(0, Math.round(durationSeconds))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = `${totalSeconds % 60}`.padStart(2, '0')

  return `${minutes}:${seconds}`
}

const formatFileSize = (fileSize: number) => {
  if (fileSize >= 1024 * 1024) {
    return `${(fileSize / (1024 * 1024)).toFixed(1)} MB`
  }

  if (fileSize >= 1024) {
    return `${Math.round(fileSize / 1024)} KB`
  }

  return `${fileSize} B`
}

const getRecordingTypeLabel = (
  recording: AudioVisualRecording,
  widgetText: AudioVisualWidgetTranslation,
) => {
  if (recording.recordingType === 'photo') {
    return widgetText.copy.photoType
  }

  if (recording.recordingType === 'video') {
    return widgetText.copy.videoType
  }

  return widgetText.copy.audioType
}

const getCapturedAtLabel = (
  capturedAt: string,
  languageCode: SupportedLanguageCode,
) =>
  new Intl.DateTimeFormat(languageCode, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(capturedAt))

const canPersistPermissionState = (
  permissionState: PermissionState,
): permissionState is AudioVisualPermissionState =>
  permissionState === 'idle' ||
  permissionState === 'requesting' ||
  permissionState === 'granted' ||
  permissionState === 'denied' ||
  permissionState === 'unsupported' ||
  permissionState === 'error'

export function AudioVisualWidget({
  mode,
  languageCode,
  widgetText,
  initialSettings,
  onSaveSettings,
}: AudioVisualWidgetProps) {
  const [settings, setSettings] = useState(() => readAudioVisualSettings(initialSettings))
  const [surfaceMode, setSurfaceMode] = useState<SurfaceMode>('live')
  const [permissionState, setPermissionState] = useState<PermissionState>('idle')
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null)
  const [recordings, setRecordings] = useState<AudioVisualRecording[]>([])
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null)
  const [playbackRecordingId, setPlaybackRecordingId] = useState<string | null>(null)
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [busyState, setBusyState] = useState<'idle' | 'uploading'>('idle')
  const [recordingMode, setRecordingMode] = useState<RecordingMode>(null)
  const [recordingElapsedSeconds, setRecordingElapsedSeconds] = useState(0)
  const [audioLevel, setAudioLevel] = useState<number | null>(null)
  const [peakLevel, setPeakLevel] = useState<number | null>(null)
  const [lastActionError, setLastActionError] = useState<string | null>(null)
  const [visibleHistoryCount, setVisibleHistoryCount] = useState(20)
  const [previewFlashVisible, setPreviewFlashVisible] = useState(false)
  const [latestPhotoPreviewUrl, setLatestPhotoPreviewUrl] = useState<string | null>(null)
  const [previewReloadToken, setPreviewReloadToken] = useState(0)
  const [documentVisible, setDocumentVisible] = useState(() =>
    typeof document === 'undefined' ? true : document.visibilityState === 'visible',
  )
  const [cameraFacingMode, setCameraFacingMode] = useState<CameraFacingMode>('user')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const analyserAnimationRef = useRef<number | null>(null)
  const analyserContextRef = useRef<AudioContext | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const recordingStartedAtRef = useRef<number | null>(null)
  const recordingIntervalRef = useRef<number | null>(null)
  const lastPersistedPermissionRef = useRef<AudioVisualPermissionState | null>(null)

  useEffect(() => {
    setSettings(readAudioVisualSettings(initialSettings))
  }, [initialSettings])

  const selectedRecording = useMemo(
    () =>
      recordings.find((recording) => recording.id === selectedRecordingId) ??
      recordings[0] ??
      null,
    [recordings, selectedRecordingId],
  )

  const playbackRecording = useMemo(
    () =>
      recordings.find((recording) => recording.id === playbackRecordingId) ?? null,
    [recordings, playbackRecordingId],
  )

  useEffect(() => {
    let cancelled = false

    fetchAudioVisualRecordings()
      .then((nextRecordings) => {
        if (!cancelled) {
          setRecordings(nextRecordings)
          setSelectedRecordingId((currentValue) => currentValue ?? nextRecordings[0]?.id ?? null)
          setHistoryError(null)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHistoryError(widgetText.copy.loadFailed)
        }
      })

    return () => {
      cancelled = true
    }
  }, [widgetText.copy.loadFailed])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = previewStream
    }
  }, [previewStream])

  useEffect(() => {
    if (!canPersistPermissionState(permissionState)) {
      return
    }

    if (lastPersistedPermissionRef.current === permissionState) {
      return
    }

    lastPersistedPermissionRef.current = permissionState
    void updateAppPreferences({
      audioVisualPermissionState: permissionState,
    }).catch(() => undefined)
  }, [permissionState])

  useEffect(() => {
    return () => {
      if (latestPhotoPreviewUrl) {
        URL.revokeObjectURL(latestPhotoPreviewUrl)
      }
    }
  }, [latestPhotoPreviewUrl])

  useEffect(() => {
    if (typeof document === 'undefined') {
      return () => undefined
    }

    const handleVisibilityChange = () => {
      setDocumentVisible(document.visibilityState === 'visible')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  useEffect(() => {
    const stopPreview = () => {
      setPreviewStream((currentStream) => {
        currentStream?.getTracks().forEach((track) => track.stop())
        return null
      })
    }

    const shouldPreviewBeActive = surfaceMode === 'live' && documentVisible

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function'
    ) {
      setPermissionState('unsupported')
      stopPreview()
      return () => undefined
    }

    if (!shouldPreviewBeActive) {
      setPermissionState('idle')
      stopPreview()
      return () => undefined
    }

    if (!settings.cameraEnabled && !settings.microphoneEnabled) {
      setPermissionState('idle')
      stopPreview()
      return () => undefined
    }

    let cancelled = false
    setPermissionState('requesting')
    setLastActionError(null)

    const requestStream = (facingMode: CameraFacingMode) =>
      navigator.mediaDevices.getUserMedia({
        video: settings.cameraEnabled
          ? {
              facingMode: { ideal: facingMode },
              frameRate: { ideal: 30, max: 30 },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            }
          : false,
        audio: settings.microphoneEnabled
          ? { echoCancellation: true, noiseSuppression: true }
          : false,
      })

    requestStream(cameraFacingMode)
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        setPreviewStream((currentStream) => {
          currentStream?.getTracks().forEach((track) => track.stop())
          return stream
        })
        setPermissionState('granted')
      })
      .catch((error: DOMException) => {
        if (
          cameraFacingMode === 'environment' &&
          (error.name === 'OverconstrainedError' || error.name === 'NotFoundError')
        ) {
          setCameraFacingMode('user')
          setPreviewReloadToken((currentValue) => currentValue + 1)
          return
        }

        stopPreview()
        if (error.name === 'NotAllowedError') {
          setPermissionState('denied')
          setLastActionError(widgetText.copy.permissionDenied)
          return
        }

        setPermissionState('error')
        setLastActionError(widgetText.copy.cameraUnavailable)
      })

    return () => {
      cancelled = true
    }
  }, [
    documentVisible,
    previewReloadToken,
    cameraFacingMode,
    settings.cameraEnabled,
    settings.microphoneEnabled,
    surfaceMode,
    widgetText.copy.cameraUnavailable,
    widgetText.copy.permissionDenied,
  ])

  useEffect(() => {
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.addEventListener !== 'function'
    ) {
      return () => undefined
    }

    const handleDeviceChange = () => {
      setPreviewReloadToken((currentValue) => currentValue + 1)
    }

    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
    }
  }, [])

  useEffect(() => {
    if (analyserAnimationRef.current !== null) {
      cancelAnimationFrame(analyserAnimationRef.current)
      analyserAnimationRef.current = null
    }

    analyserContextRef.current?.close().catch(() => undefined)
    analyserContextRef.current = null
    setAudioLevel(null)
    setPeakLevel(null)

    const audioTrack = previewStream?.getAudioTracks()[0]

    if (!audioTrack || !settings.microphoneEnabled) {
      return () => undefined
    }

    const context = new AudioContext()
    analyserContextRef.current = context
    const source = context.createMediaStreamSource(new MediaStream([audioTrack]))
    const analyser = context.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    const buffer = new Uint8Array(analyser.fftSize)
    let currentPeak = -60

    const updateMeter = () => {
      analyser.getByteTimeDomainData(buffer)
      let sumSquares = 0

      for (const sample of buffer) {
        const normalized = (sample - 128) / 128
        sumSquares += normalized * normalized
      }

      const rms = Math.sqrt(sumSquares / buffer.length)
      const nextLevel = rms > 0 ? Math.max(-60, 20 * Math.log10(rms)) : -60
      currentPeak = Math.max(currentPeak - 0.35, nextLevel)
      setAudioLevel(Math.round(nextLevel * 10) / 10)
      setPeakLevel(Math.round(currentPeak * 10) / 10)
      analyserAnimationRef.current = requestAnimationFrame(updateMeter)
    }

    analyserAnimationRef.current = requestAnimationFrame(updateMeter)

    return () => {
      if (analyserAnimationRef.current !== null) {
        cancelAnimationFrame(analyserAnimationRef.current)
        analyserAnimationRef.current = null
      }

      context.close().catch(() => undefined)
    }
  }, [previewStream, settings.microphoneEnabled])

  useEffect(() => {
    return () => {
      previewStream?.getTracks().forEach((track) => track.stop())
      if (recordingIntervalRef.current !== null) {
        window.clearInterval(recordingIntervalRef.current)
      }
      if (analyserAnimationRef.current !== null) {
        cancelAnimationFrame(analyserAnimationRef.current)
      }
    }
  }, [previewStream])

  const persistSettings = async (nextSettings: NormalizedAudioVisualSettings) => {
    setSettings(nextSettings)
    setStatusMessage(null)

    try {
      await onSaveSettings(AUDIO_VISUAL_WIDGET_ID, { ...nextSettings })
    } catch {
      setLastActionError(widgetText.copy.uploadFailed)
    }
  }

  const refreshHistory = async (selectedId?: string | null) => {
    const nextRecordings = await fetchAudioVisualRecordings()
    setRecordings(nextRecordings)
    setSelectedRecordingId(selectedId ?? nextRecordings[0]?.id ?? null)
    setHistoryError(null)
  }

  const uploadBlob = async (
    recordingType: 'photo' | 'video' | 'audio',
    blob: Blob,
    durationSeconds: number | null,
  ) => {
    setBusyState('uploading')
    setLastActionError(null)

    try {
      const recording = await uploadAudioVisualRecording({
        recordingType,
        blob,
        durationSeconds,
      })
      setStatusMessage(
        recordingType === 'photo' ? widgetText.copy.photoReady : widgetText.copy.uploadSuccess,
      )
      await refreshHistory(recording.id)
      setSurfaceMode('history')
    } catch {
      setLastActionError(widgetText.copy.uploadFailed)
    } finally {
      setBusyState('idle')
    }
  }

  const handlePhotoCapture = async () => {
    const videoElement = videoRef.current

    if (!videoElement || !previewStream?.getVideoTracks().length) {
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = videoElement.videoWidth || 1280
    canvas.height = videoElement.videoHeight || 720
    const context = canvas.getContext('2d')

    if (!context) {
      return
    }

    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.92),
    )

    if (!blob) {
      return
    }

    setPreviewFlashVisible(true)
    window.setTimeout(() => setPreviewFlashVisible(false), 180)
    setLatestPhotoPreviewUrl((currentValue) => {
      if (currentValue) {
        URL.revokeObjectURL(currentValue)
      }

      return URL.createObjectURL(blob)
    })
    await uploadBlob('photo', blob, null)
  }

  const stopRecording = () => {
    recorderRef.current?.stop()
    recorderRef.current = null

    if (recordingIntervalRef.current !== null) {
      window.clearInterval(recordingIntervalRef.current)
      recordingIntervalRef.current = null
    }
  }

  const startRecording = (nextMode: Exclude<RecordingMode, null>) => {
    if (typeof MediaRecorder === 'undefined' || !previewStream) {
      setLastActionError(widgetText.copy.recordingError)
      return
    }

    const hasVideo = previewStream.getVideoTracks().length > 0
    const hasAudio = previewStream.getAudioTracks().length > 0

    if ((nextMode === 'video' && !hasVideo) || (nextMode === 'audio' && !hasAudio)) {
      setLastActionError(widgetText.copy.recordingError)
      return
    }

    const mimeType =
      nextMode === 'video'
        ? pickSupportedMimeType([
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm',
          ])
        : pickSupportedMimeType([
            'audio/webm;codecs=opus',
            'audio/ogg;codecs=opus',
            'audio/webm',
          ])

    const stream =
      nextMode === 'video'
        ? previewStream
        : new MediaStream(previewStream.getAudioTracks())

    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream)
    const chunks: BlobPart[] = []
    recorderRef.current = recorder
    recordingStartedAtRef.current = Date.now()
    setStatusMessage(null)
    setLastActionError(null)
    setRecordingMode(nextMode)
    setRecordingElapsedSeconds(0)
    void updateAppPreferences({
      audioVisualLastRecordingMode: nextMode as AudioVisualRecordingMode,
    }).catch(() => undefined)
    recordingIntervalRef.current = window.setInterval(() => {
      if (recordingStartedAtRef.current) {
        setRecordingElapsedSeconds(
          Math.floor((Date.now() - recordingStartedAtRef.current) / 1000),
        )
      }
    }, 250)

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data)
      }
    }

    recorder.onerror = () => {
      setLastActionError(widgetText.copy.recordingError)
      setRecordingMode(null)
      setRecordingElapsedSeconds(0)
    }

    recorder.onstop = async () => {
      const blob = new Blob(chunks, {
        type: recorder.mimeType || mimeType || undefined,
      })
      const durationSeconds =
        recordingStartedAtRef.current == null
          ? null
          : (Date.now() - recordingStartedAtRef.current) / 1000

      recordingStartedAtRef.current = null
      setRecordingMode(null)
      setRecordingElapsedSeconds(0)

      if (blob.size > 0) {
        await uploadBlob(nextMode === 'video' ? 'video' : 'audio', blob, durationSeconds)
      }
    }

    recorder.start()
  }

  const handleDelete = async (recordingId: string) => {
    try {
      await deleteAudioVisualRecording(recordingId)
      await refreshHistory(null)
      setDeleteCandidateId(null)
      if (playbackRecordingId === recordingId) {
        setPlaybackRecordingId(null)
      }
    } catch {
      setLastActionError(widgetText.copy.deleteFailed)
    }
  }

  const visibleRecordings = recordings.slice(0, visibleHistoryCount)
  const hasVideoPreview = Boolean(previewStream?.getVideoTracks().length)
  const hasAudioPreview = Boolean(previewStream?.getAudioTracks().length)
  const isClipping = (audioLevel ?? -60) > -0.5

  return (
    <div className={`audio-visual audio-visual--${mode}`}>
      {surfaceMode === 'live' ? (
        <div
          className={`audio-visual-stage audio-visual-stage--live${hasVideoPreview ? ' is-active' : ''}`}
        >
            {previewFlashVisible ? <div className="audio-visual-flash"></div> : null}
            {permissionState === 'denied' || permissionState === 'error' ? (
              <div className="audio-visual-empty-state">
                <p className="audio-visual-empty-title">{widgetText.copy.permissionTitle}</p>
                <p className="audio-visual-empty-copy">
                  {permissionState === 'denied'
                    ? widgetText.copy.permissionDenied
                    : widgetText.copy.cameraUnavailable}
                </p>
                <button
                  type="button"
                  className="audio-visual-primary-action"
                  onClick={() => setPreviewReloadToken((currentValue) => currentValue + 1)}
                >
                  {widgetText.copy.retryPermission}
                </button>
              </div>
            ) : hasVideoPreview ? (
              <video
                ref={videoRef}
                className="audio-visual-preview"
                autoPlay
                muted
                playsInline
              />
            ) : (
              <div className="audio-visual-empty-state">
                <p className="audio-visual-empty-title">
                  {settings.cameraEnabled
                    ? widgetText.copy.permissionTitle
                    : widgetText.copy.cameraDisabled}
                </p>
                <p className="audio-visual-empty-copy">
                  {permissionState === 'idle'
                    ? widgetText.copy.permissionCopy
                    : widgetText.copy.cameraDisabled}
                </p>
                {permissionState === 'idle' ? (
                  <button
                    type="button"
                    className="audio-visual-primary-action"
                    onClick={() =>
                      void persistSettings({
                        cameraEnabled: true,
                        microphoneEnabled: true,
                      })
                    }
                  >
                    {widgetText.copy.enableAccess}
                  </button>
                ) : null}
              </div>
            )}
            {latestPhotoPreviewUrl ? (
              <img
                className="audio-visual-photo-preview-badge"
                src={latestPhotoPreviewUrl}
                alt={widgetText.copy.photoType}
              />
            ) : null}

            <div className="audio-visual-stage-overlay">
              <div className="audio-visual-topbar audio-visual-topbar--overlay">
                <div className="audio-visual-status-group">
                  <button
                    type="button"
                    className="audio-visual-chip audio-visual-surface-toggle is-active"
                    onClick={() => setSurfaceMode('live')}
                  >
                    {widgetText.copy.live}
                  </button>
                  <button
                    type="button"
                    className="audio-visual-chip audio-visual-surface-toggle"
                    onClick={() => setSurfaceMode('history')}
                  >
                    {widgetText.copy.history}
                  </button>
                  {recordingMode ? (
                    <span className="audio-visual-chip audio-visual-chip--recording">
                      {widgetText.copy.recording} {formatDuration(recordingElapsedSeconds)}
                    </span>
                  ) : null}
                  {busyState === 'uploading' ? (
                    <span className="audio-visual-chip">{widgetText.copy.uploading}</span>
                  ) : null}
                </div>
                <div className="audio-visual-toggle-row">
                  <button
                    type="button"
                    className={`audio-visual-toggle${settings.cameraEnabled ? ' is-active' : ''}`}
                    onClick={() =>
                      void persistSettings({
                        ...settings,
                        cameraEnabled: !settings.cameraEnabled,
                      })
                    }
                  >
                    {settings.cameraEnabled ? widgetText.copy.cameraOn : widgetText.copy.cameraOff}
                  </button>
                  {settings.cameraEnabled ? (
                    <button
                      type="button"
                      className="audio-visual-toggle"
                      onClick={() =>
                        setCameraFacingMode((currentValue) =>
                          currentValue === 'user' ? 'environment' : 'user',
                        )
                      }
                    >
                      {cameraFacingMode === 'user'
                        ? widgetText.copy.frontCamera
                        : widgetText.copy.rearCamera}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={`audio-visual-toggle${settings.microphoneEnabled ? ' is-active' : ''}`}
                    onClick={() =>
                      void persistSettings({
                        ...settings,
                        microphoneEnabled: !settings.microphoneEnabled,
                      })
                    }
                  >
                    {settings.microphoneEnabled
                      ? widgetText.copy.microphoneOn
                      : widgetText.copy.microphoneOff}
                  </button>
                </div>
              </div>

              <div className="audio-visual-stage-controls">
                <div className="audio-visual-action-row audio-visual-action-row--overlay">
                  <button
                    type="button"
                    className="audio-visual-action"
                    disabled={!hasVideoPreview || busyState !== 'idle' || recordingMode !== null}
                    onClick={() => {
                      void handlePhotoCapture()
                    }}
                  >
                    {widgetText.copy.takePhoto}
                  </button>
                  <button
                    type="button"
                    className="audio-visual-action"
                    disabled={busyState !== 'idle' || recordingMode === 'audio' || !hasVideoPreview}
                    onClick={() => {
                      if (recordingMode === 'video') {
                        stopRecording()
                        return
                      }

                      startRecording('video')
                    }}
                  >
                    {recordingMode === 'video'
                      ? widgetText.copy.stopRecording
                      : widgetText.copy.recordVideo}
                  </button>
                  <button
                    type="button"
                    className="audio-visual-action"
                    disabled={busyState !== 'idle' || recordingMode === 'video' || !hasAudioPreview}
                    onClick={() => {
                      if (recordingMode === 'audio') {
                        stopRecording()
                        return
                      }

                      startRecording('audio')
                    }}
                  >
                    {recordingMode === 'audio'
                      ? widgetText.copy.stopRecording
                      : widgetText.copy.recordAudio}
                  </button>
                </div>

                <div className={`audio-visual-meter-card audio-visual-meter-card--overlay${isClipping ? ' is-clipping' : ''}`}>
                  <div className="audio-visual-meter-head">
                    <span>{widgetText.copy.audioLevel}</span>
                    <span>
                      {audioLevel == null
                        ? widgetText.copy.microphoneDisabled
                        : `${audioLevel.toFixed(1)} dB`}
                    </span>
                  </div>
                  <div className="audio-visual-meter-track">
                    <div
                      className="audio-visual-meter-fill"
                      style={{
                        width: `${Math.max(8, Math.min(100, (((audioLevel ?? -60) + 60) / 60) * 100))}%`,
                      }}
                    ></div>
                  </div>
                  <p className="audio-visual-meter-meta">
                    {widgetText.copy.peak}: {peakLevel == null ? '--' : `${peakLevel.toFixed(1)} dB`}
                    {isClipping ? ` · ${widgetText.copy.clipping}` : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>
      ) : null}

      {surfaceMode === 'history' ? (
        <div className="audio-visual-topbar">
          <div className="audio-visual-status-group">
            <button
              type="button"
              className="audio-visual-chip audio-visual-surface-toggle"
              onClick={() => setSurfaceMode('live')}
            >
              {widgetText.copy.live}
            </button>
            <button
              type="button"
              className="audio-visual-chip audio-visual-surface-toggle is-active"
              onClick={() => setSurfaceMode('history')}
            >
              {widgetText.copy.history}
            </button>
          </div>
          <div className="audio-visual-toggle-row">
            <button
              type="button"
              className={`audio-visual-toggle${settings.cameraEnabled ? ' is-active' : ''}`}
              onClick={() =>
                void persistSettings({
                  ...settings,
                  cameraEnabled: !settings.cameraEnabled,
                })
              }
            >
              {settings.cameraEnabled ? widgetText.copy.cameraOn : widgetText.copy.cameraOff}
            </button>
            {settings.cameraEnabled ? (
              <button
                type="button"
                className="audio-visual-toggle"
                onClick={() =>
                  setCameraFacingMode((currentValue) =>
                    currentValue === 'user' ? 'environment' : 'user',
                  )
                }
              >
                {cameraFacingMode === 'user'
                  ? widgetText.copy.frontCamera
                  : widgetText.copy.rearCamera}
              </button>
            ) : null}
            <button
              type="button"
              className={`audio-visual-toggle${settings.microphoneEnabled ? ' is-active' : ''}`}
              onClick={() =>
                void persistSettings({
                  ...settings,
                  microphoneEnabled: !settings.microphoneEnabled,
                })
              }
            >
              {settings.microphoneEnabled
                ? widgetText.copy.microphoneOn
                : widgetText.copy.microphoneOff}
            </button>
          </div>
        </div>
      ) : null}

      {statusMessage ? <p className="audio-visual-status-message">{statusMessage}</p> : null}
      {lastActionError ? <p className="audio-visual-error">{lastActionError}</p> : null}
      {historyError ? <p className="audio-visual-error">{historyError}</p> : null}

      <div
        className={`audio-visual-history${mode === 'expanded' ? ' is-expanded' : ''}${surfaceMode !== 'history' ? ' is-collapsed' : ''}`}
      >
        <div className="audio-visual-history-head">
          <h3>{widgetText.copy.history}</h3>
          <span>{recordings.length}</span>
        </div>

        <div className="audio-visual-history-layout">
          <div className="audio-visual-history-list">
            {visibleRecordings.length > 0 ? (
              visibleRecordings.map((recording) => (
                <article
                  key={recording.id}
                  className={`audio-visual-history-item${selectedRecording?.id === recording.id ? ' is-selected' : ''}`}
                >
                  <button
                    type="button"
                    className="audio-visual-history-select"
                    onClick={() => setSelectedRecordingId(recording.id)}
                  >
                    <span className="audio-visual-history-thumb" aria-hidden="true">
                      {recording.recordingType === 'photo' ? (
                        <img
                          src={resolveAudioVisualContentUrl(recording.contentUrl)}
                          alt=""
                        />
                      ) : recording.recordingType === 'video' ? (
                        <video
                          muted
                          playsInline
                          preload="metadata"
                          src={resolveAudioVisualContentUrl(recording.contentUrl)}
                        />
                      ) : (
                        <span className="audio-visual-audio-placeholder">A</span>
                      )}
                    </span>
                    <span className="audio-visual-history-copy">
                      <span className="audio-visual-history-type">
                        {getRecordingTypeLabel(recording, widgetText)}
                      </span>
                      <span className="audio-visual-history-meta">
                        {widgetText.copy.uploadedBy}: {recording.uploadedBy}
                      </span>
                      <span className="audio-visual-history-meta">
                        {widgetText.copy.capturedAt}: {getCapturedAtLabel(recording.capturedAt, languageCode)}
                      </span>
                      <span className="audio-visual-history-meta">
                        {widgetText.copy.duration}: {formatDuration(recording.durationSeconds)} · {widgetText.copy.fileSize}: {formatFileSize(recording.fileSize)}
                      </span>
                    </span>
                  </button>
                  <div className="audio-visual-history-actions">
                    <button
                      type="button"
                      className="audio-visual-inline-button"
                      onClick={() => {
                        setSelectedRecordingId(recording.id)
                        setPlaybackRecordingId(recording.id)
                      }}
                    >
                      {widgetText.copy.playAction}
                    </button>
                    <a
                      className="audio-visual-inline-link"
                      href={resolveAudioVisualDownloadUrl(recording.downloadUrl)}
                    >
                      {widgetText.copy.downloadAction}
                    </a>
                    <button
                      type="button"
                      className="audio-visual-inline-button"
                      onClick={() => setDeleteCandidateId(recording.id)}
                    >
                      {widgetText.copy.deleteAction}
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <p className="audio-visual-empty-copy">{widgetText.copy.noRecordings}</p>
            )}

            {recordings.length > visibleHistoryCount ? (
              <button
                type="button"
                className="audio-visual-primary-action audio-visual-load-more"
                onClick={() => setVisibleHistoryCount((currentValue) => currentValue + 20)}
              >
                {widgetText.copy.loadMore}
              </button>
            ) : null}
          </div>

          {mode === 'expanded' && selectedRecording ? (
            <div className="audio-visual-playback">
              <div className="audio-visual-playback-head">
                <p>{getRecordingTypeLabel(selectedRecording, widgetText)}</p>
                <button
                  type="button"
                  className="audio-visual-inline-button"
                  onClick={() => setPlaybackRecordingId(selectedRecording.id)}
                >
                  {widgetText.copy.playAction}
                </button>
              </div>
              <p className="audio-visual-history-meta">
                {widgetText.copy.uploadedBy}: {selectedRecording.uploadedBy}
              </p>
              <p className="audio-visual-history-meta">
                {widgetText.copy.capturedAt}: {getCapturedAtLabel(selectedRecording.capturedAt, languageCode)}
              </p>
              <p className="audio-visual-history-meta">
                {widgetText.copy.duration}: {formatDuration(selectedRecording.durationSeconds)} · {widgetText.copy.fileSize}: {formatFileSize(selectedRecording.fileSize)}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {deleteCandidateId ? (
        <div className="audio-visual-dialog-backdrop" role="presentation">
          <div className="audio-visual-dialog" role="dialog" aria-modal="true">
            <p className="audio-visual-empty-title">{widgetText.copy.deleteConfirmTitle}</p>
            <p className="audio-visual-empty-copy">{widgetText.copy.deleteConfirmCopy}</p>
            <div className="audio-visual-dialog-actions">
              <button
                type="button"
                className="audio-visual-inline-button"
                onClick={() => setDeleteCandidateId(null)}
              >
                {widgetText.copy.cancelAction}
              </button>
              <button
                type="button"
                className="audio-visual-primary-action"
                onClick={() => {
                  void handleDelete(deleteCandidateId)
                }}
              >
                {widgetText.copy.confirmAction}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {playbackRecording ? (
        <div className="audio-visual-dialog-backdrop" role="presentation">
          <div className="audio-visual-player-dialog" role="dialog" aria-modal="true">
            <div className="audio-visual-playback-head">
              <p>{getRecordingTypeLabel(playbackRecording, widgetText)}</p>
              <button
                type="button"
                className="audio-visual-inline-button"
                onClick={() => setPlaybackRecordingId(null)}
              >
                {widgetText.copy.closeAction}
              </button>
            </div>
            <p className="audio-visual-history-meta">
              {widgetText.copy.uploadedBy}: {playbackRecording.uploadedBy}
            </p>
            <p className="audio-visual-history-meta">
              {widgetText.copy.capturedAt}: {getCapturedAtLabel(playbackRecording.capturedAt, languageCode)}
            </p>
            <p className="audio-visual-history-meta">
              {widgetText.copy.duration}: {formatDuration(playbackRecording.durationSeconds)} · {widgetText.copy.fileSize}: {formatFileSize(playbackRecording.fileSize)}
            </p>
            {playbackRecording.recordingType === 'photo' ? (
              <img
                className="audio-visual-photo-view"
                src={resolveAudioVisualContentUrl(playbackRecording.contentUrl)}
                alt={getRecordingTypeLabel(playbackRecording, widgetText)}
              />
            ) : playbackRecording.recordingType === 'video' ? (
              <video
                className="audio-visual-player"
                controls
                playsInline
                src={resolveAudioVisualContentUrl(playbackRecording.contentUrl)}
              />
            ) : (
              <audio
                className="audio-visual-player"
                controls
                src={resolveAudioVisualContentUrl(playbackRecording.contentUrl)}
              />
            )}
            <div className="audio-visual-dialog-actions">
              <a
                className="audio-visual-inline-link"
                href={resolveAudioVisualDownloadUrl(playbackRecording.downloadUrl)}
              >
                {widgetText.copy.downloadAction}
              </a>
              <button
                type="button"
                className="audio-visual-inline-button"
                onClick={() => setDeleteCandidateId(playbackRecording.id)}
              >
                {widgetText.copy.deleteAction}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

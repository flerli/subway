import { fetchApi, getApiUrl } from './request'

export type AudioVisualRecordingType = 'photo' | 'video' | 'audio'

export interface AudioVisualRecording {
  id: string
  recordingType: AudioVisualRecordingType
  mimeType: string
  fileExtension: string
  fileSize: number
  durationSeconds: number | null
  uploadedBy: string
  capturedAt: string
  uploadedAt: string
  updatedAt: string
  contentUrl: string
  downloadUrl: string
}

interface UploadAudioVisualRecordingInput {
  recordingType: AudioVisualRecordingType
  blob: Blob
  durationSeconds?: number | null
  capturedAt?: string
}

const isAudioVisualRecordingType = (
  value: unknown,
): value is AudioVisualRecordingType =>
  value === 'photo' || value === 'video' || value === 'audio'

const normalizeAudioVisualRecording = (
  value: unknown,
): AudioVisualRecording | null => {
  const candidate = value as Record<string, unknown>

  if (
    !candidate ||
    typeof candidate.id !== 'string' ||
    !isAudioVisualRecordingType(candidate.recordingType) ||
    typeof candidate.mimeType !== 'string' ||
    typeof candidate.fileExtension !== 'string' ||
    typeof candidate.fileSize !== 'number' ||
    typeof candidate.uploadedBy !== 'string' ||
    typeof candidate.capturedAt !== 'string' ||
    typeof candidate.uploadedAt !== 'string' ||
    typeof candidate.updatedAt !== 'string' ||
    typeof candidate.contentUrl !== 'string' ||
    typeof candidate.downloadUrl !== 'string'
  ) {
    return null
  }

  return {
    id: candidate.id,
    recordingType: candidate.recordingType,
    mimeType: candidate.mimeType,
    fileExtension: candidate.fileExtension,
    fileSize: candidate.fileSize,
    durationSeconds:
      typeof candidate.durationSeconds === 'number' ? candidate.durationSeconds : null,
    uploadedBy: candidate.uploadedBy,
    capturedAt: candidate.capturedAt,
    uploadedAt: candidate.uploadedAt,
    updatedAt: candidate.updatedAt,
    contentUrl: candidate.contentUrl,
    downloadUrl: candidate.downloadUrl,
  }
}

const blobToBase64 = async (blob: Blob) => {
  const arrayBuffer = await blob.arrayBuffer()
  let binary = ''
  const bytes = new Uint8Array(arrayBuffer)
  const chunkSize = 0x8000

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

export const fetchAudioVisualRecordings = async (
  recordingType: AudioVisualRecordingType | 'all' = 'all',
) => {
  const response = await fetchApi(
    `/audio-visual/recordings?type=${encodeURIComponent(recordingType)}`,
  )

  if (!response.ok) {
    throw new Error('Failed to load audio-visual recordings.')
  }

  const payload = (await response.json()) as { recordings?: unknown[] }

  return (payload.recordings ?? [])
    .map(normalizeAudioVisualRecording)
    .filter((recording): recording is AudioVisualRecording => Boolean(recording))
}

export const uploadAudioVisualRecording = async ({
  recordingType,
  blob,
  durationSeconds = null,
  capturedAt = new Date().toISOString(),
}: UploadAudioVisualRecordingInput) => {
  const dataBase64 = await blobToBase64(blob)
  const response = await fetchApi('/audio-visual/recordings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      recordingType,
      mimeType: blob.type || 'application/octet-stream',
      dataBase64,
      durationSeconds,
      capturedAt,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to upload recording.')
  }

  const payload = (await response.json()) as { recording?: unknown }
  const recording = normalizeAudioVisualRecording(payload.recording)

  if (!recording) {
    throw new Error('Backend returned an invalid recording payload.')
  }

  return recording
}

export const deleteAudioVisualRecording = async (recordingId: string) => {
  const response = await fetchApi(`/audio-visual/recordings/${recordingId}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    throw new Error('Failed to delete recording.')
  }
}

const resolveAudioVisualAssetUrl = (path: string) =>
  path.startsWith('/api/') ? path : getApiUrl(path)

export const resolveAudioVisualContentUrl = (contentUrl: string) =>
  resolveAudioVisualAssetUrl(contentUrl)

export const resolveAudioVisualDownloadUrl = (downloadUrl: string) =>
  resolveAudioVisualAssetUrl(downloadUrl)
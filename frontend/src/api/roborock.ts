import { fetchApi } from './request'

export interface RoborockSettingsRecord {
  email: string
  hasStoredSession: boolean
  baseUrl: string
  selectedDeviceDuid: string
  selectedDeviceName: string
  selectedDeviceModel: string
  selectedRoutineId: number | null
  selectedRoutineName: string
  connectionStatus: 'not_configured' | 'connected' | 'reconnect_required'
  lastConnectedAt: string | null
  lastValidatedAt: string | null
  updatedAt: string | null
}

export interface RoborockDeviceOption {
  duid: string
  name: string
  model: string
  productName: string
  online: boolean
  supportsRoutineSelection: boolean
  supportsQuickStart: boolean
}

export interface RoborockRoutineOption {
  id: number
  name: string
}

export interface RoborockStatusRecord {
  state: number | null
  stateName: string | null
  battery: number | null
  cleanTimeSeconds: number | null
  cleanAreaSquareMeters: number | null
  cleanPercent: number | null
  currentMapId: number | null
  dockState: string | null
  errorCodeName: string | null
  capabilities: {
    supportsElapsedTime: boolean
    supportsCleaningArea: boolean
    supportsCleaningPercent: boolean
    supportsCurrentMap: boolean
    supportsLocation: boolean
    supportsRemainingTime: boolean
  }
}

export class RoborockApiError extends Error {
  errorCode: string | null

  constructor(message: string, errorCode: string | null = null) {
    super(message)
    this.name = 'RoborockApiError'
    this.errorCode = errorCode
  }
}

const readErrorDetails = async (
  response: Response,
  fallbackMessage: string,
): Promise<{ message: string; errorCode: string | null }> => {
  try {
    const payload = (await response.json()) as { error?: unknown; errorCode?: unknown }

    return {
      message: typeof payload.error === 'string' ? payload.error : fallbackMessage,
      errorCode: typeof payload.errorCode === 'string' ? payload.errorCode : null,
    }
  } catch {
    return {
      message: fallbackMessage,
      errorCode: null,
    }
  }
}

const normalizeRoborockSettings = (value: unknown): RoborockSettingsRecord | null => {
  const candidate = value as {
    email?: unknown
    hasStoredSession?: unknown
    baseUrl?: unknown
    selectedDeviceDuid?: unknown
    selectedDeviceName?: unknown
    selectedDeviceModel?: unknown
    selectedRoutineId?: unknown
    selectedRoutineName?: unknown
    connectionStatus?: unknown
    lastConnectedAt?: unknown
    lastValidatedAt?: unknown
    updatedAt?: unknown
  }

  if (!value || typeof value !== 'object') {
    return null
  }

  return {
    email: typeof candidate.email === 'string' ? candidate.email : '',
    hasStoredSession: candidate.hasStoredSession === true,
    baseUrl: typeof candidate.baseUrl === 'string' ? candidate.baseUrl : '',
    selectedDeviceDuid:
      typeof candidate.selectedDeviceDuid === 'string' ? candidate.selectedDeviceDuid : '',
    selectedDeviceName:
      typeof candidate.selectedDeviceName === 'string' ? candidate.selectedDeviceName : '',
    selectedDeviceModel:
      typeof candidate.selectedDeviceModel === 'string' ? candidate.selectedDeviceModel : '',
    selectedRoutineId:
      typeof candidate.selectedRoutineId === 'number' ? candidate.selectedRoutineId : null,
    selectedRoutineName:
      typeof candidate.selectedRoutineName === 'string' ? candidate.selectedRoutineName : '',
    connectionStatus:
      candidate.connectionStatus === 'connected' ||
      candidate.connectionStatus === 'reconnect_required'
        ? candidate.connectionStatus
        : 'not_configured',
    lastConnectedAt:
      typeof candidate.lastConnectedAt === 'string' ? candidate.lastConnectedAt : null,
    lastValidatedAt:
      typeof candidate.lastValidatedAt === 'string' ? candidate.lastValidatedAt : null,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : null,
  }
}

export const fetchRoborockSettings = async () => {
  const response = await fetchApi('/roborock/settings')

  if (!response.ok) {
    const errorDetails = await readErrorDetails(response, 'Failed to load Roborock settings.')
    throw new RoborockApiError(errorDetails.message, errorDetails.errorCode)
  }

  const payload = (await response.json()) as { roborockSettings?: unknown }
  const roborockSettings = normalizeRoborockSettings(payload.roborockSettings)

  if (!roborockSettings) {
    throw new Error('Backend returned an invalid Roborock settings payload.')
  }

  return roborockSettings
}

const normalizeRoborockDeviceOption = (value: unknown): RoborockDeviceOption | null => {
  const candidate = value as {
    duid?: unknown
    name?: unknown
    model?: unknown
    productName?: unknown
    online?: unknown
    supportsRoutineSelection?: unknown
    supportsQuickStart?: unknown
  }

  if (
    !value ||
    typeof value !== 'object' ||
    typeof candidate.duid !== 'string' ||
    typeof candidate.name !== 'string' ||
    typeof candidate.model !== 'string'
  ) {
    return null
  }

  return {
    duid: candidate.duid,
    name: candidate.name,
    model: candidate.model,
    productName: typeof candidate.productName === 'string' ? candidate.productName : '',
    online: candidate.online === true,
    supportsRoutineSelection: candidate.supportsRoutineSelection === true,
    supportsQuickStart: candidate.supportsQuickStart !== false,
  }
}

const normalizeRoborockRoutineOption = (value: unknown): RoborockRoutineOption | null => {
  const candidate = value as {
    id?: unknown
    name?: unknown
  }

  if (
    !value ||
    typeof value !== 'object' ||
    typeof candidate.id !== 'number' ||
    typeof candidate.name !== 'string'
  ) {
    return null
  }

  return {
    id: candidate.id,
    name: candidate.name,
  }
}

const normalizeRoborockStatus = (value: unknown): RoborockStatusRecord | null => {
  const candidate = value as {
    state?: unknown
    stateName?: unknown
    battery?: unknown
    cleanTimeSeconds?: unknown
    cleanAreaSquareMeters?: unknown
    cleanPercent?: unknown
    currentMapId?: unknown
    dockState?: unknown
    errorCodeName?: unknown
    capabilities?: unknown
  }
  const capabilities = candidate?.capabilities as {
    supportsElapsedTime?: unknown
    supportsCleaningArea?: unknown
    supportsCleaningPercent?: unknown
    supportsCurrentMap?: unknown
    supportsLocation?: unknown
    supportsRemainingTime?: unknown
  }

  if (!value || typeof value !== 'object') {
    return null
  }

  return {
    state: typeof candidate.state === 'number' ? candidate.state : null,
    stateName: typeof candidate.stateName === 'string' ? candidate.stateName : null,
    battery: typeof candidate.battery === 'number' ? candidate.battery : null,
    cleanTimeSeconds:
      typeof candidate.cleanTimeSeconds === 'number' ? candidate.cleanTimeSeconds : null,
    cleanAreaSquareMeters:
      typeof candidate.cleanAreaSquareMeters === 'number'
        ? candidate.cleanAreaSquareMeters
        : null,
    cleanPercent: typeof candidate.cleanPercent === 'number' ? candidate.cleanPercent : null,
    currentMapId: typeof candidate.currentMapId === 'number' ? candidate.currentMapId : null,
    dockState: typeof candidate.dockState === 'string' ? candidate.dockState : null,
    errorCodeName:
      typeof candidate.errorCodeName === 'string' ? candidate.errorCodeName : null,
    capabilities: {
      supportsElapsedTime: capabilities?.supportsElapsedTime === true,
      supportsCleaningArea: capabilities?.supportsCleaningArea === true,
      supportsCleaningPercent: capabilities?.supportsCleaningPercent === true,
      supportsCurrentMap: capabilities?.supportsCurrentMap === true,
      supportsLocation: capabilities?.supportsLocation === true,
      supportsRemainingTime: capabilities?.supportsRemainingTime === true,
    },
  }
}

export const requestRoborockCode = async (input: { email: string }) => {
  const response = await fetchApi('/roborock/settings/request-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const errorDetails = await readErrorDetails(
      response,
      'Failed to request a Roborock verification code.',
    )
    throw new RoborockApiError(errorDetails.message, errorDetails.errorCode)
  }
}

export const updateRoborockSettings = async (input: {
  email: string
  verificationCode: string
}) => {
  const response = await fetchApi('/roborock/settings', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const errorDetails = await readErrorDetails(response, 'Failed to save Roborock settings.')
    throw new RoborockApiError(errorDetails.message, errorDetails.errorCode)
  }

  const payload = (await response.json()) as { roborockSettings?: unknown }
  const roborockSettings = normalizeRoborockSettings(payload.roborockSettings)

  if (!roborockSettings) {
    throw new Error('Backend returned an invalid Roborock settings payload.')
  }

  return roborockSettings
}

export const validateRoborockSession = async () => {
  const response = await fetchApi('/roborock/settings/session', {
    method: 'POST',
  })

  if (!response.ok) {
    const errorDetails = await readErrorDetails(
      response,
      'Failed to validate the Roborock session.',
    )
    throw new RoborockApiError(errorDetails.message, errorDetails.errorCode)
  }

  const payload = (await response.json()) as {
    healthy?: unknown
    roborockSettings?: unknown
  }
  const roborockSettings = normalizeRoborockSettings(payload.roborockSettings)

  if (!roborockSettings) {
    throw new Error('Backend returned an invalid Roborock session payload.')
  }

  return {
    healthy: payload.healthy === true,
    roborockSettings,
  }
}

export const resolveRoborockDevices = async (input?: { selectedDeviceDuid?: string }) => {
  const response = await fetchApi('/roborock/settings/devices', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      selectedDeviceDuid: input?.selectedDeviceDuid ?? '',
    }),
  })

  if (!response.ok) {
    const errorDetails = await readErrorDetails(
      response,
      'Failed to load Roborock devices.',
    )
    throw new RoborockApiError(errorDetails.message, errorDetails.errorCode)
  }

  const payload = (await response.json()) as {
    devices?: unknown
    selectedDeviceDuid?: unknown
    routines?: unknown
    roborockSettings?: unknown
  }
  const roborockSettings = normalizeRoborockSettings(payload.roborockSettings)

  if (!roborockSettings) {
    throw new Error('Backend returned an invalid Roborock discovery payload.')
  }

  return {
    devices: Array.isArray(payload.devices)
      ? payload.devices
          .map(normalizeRoborockDeviceOption)
          .filter((entry): entry is RoborockDeviceOption => Boolean(entry))
      : [],
    selectedDeviceDuid:
      typeof payload.selectedDeviceDuid === 'string' ? payload.selectedDeviceDuid : '',
    routines: Array.isArray(payload.routines)
      ? payload.routines
          .map(normalizeRoborockRoutineOption)
          .filter((entry): entry is RoborockRoutineOption => Boolean(entry))
      : [],
    roborockSettings,
  }
}

export const updateRoborockSelection = async (input: {
  selectedDeviceDuid: string
  selectedRoutineId: number | null
}) => {
  const response = await fetchApi('/roborock/settings/selection', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const errorDetails = await readErrorDetails(
      response,
      'Failed to save Roborock device selection.',
    )
    throw new RoborockApiError(errorDetails.message, errorDetails.errorCode)
  }

  const payload = (await response.json()) as {
    devices?: unknown
    selectedDeviceDuid?: unknown
    routines?: unknown
    roborockSettings?: unknown
  }
  const roborockSettings = normalizeRoborockSettings(payload.roborockSettings)

  if (!roborockSettings) {
    throw new Error('Backend returned an invalid Roborock selection payload.')
  }

  return {
    devices: Array.isArray(payload.devices)
      ? payload.devices
          .map(normalizeRoborockDeviceOption)
          .filter((entry): entry is RoborockDeviceOption => Boolean(entry))
      : [],
    selectedDeviceDuid:
      typeof payload.selectedDeviceDuid === 'string' ? payload.selectedDeviceDuid : '',
    routines: Array.isArray(payload.routines)
      ? payload.routines
          .map(normalizeRoborockRoutineOption)
          .filter((entry): entry is RoborockRoutineOption => Boolean(entry))
      : [],
    roborockSettings,
  }
}

export const fetchRoborockStatus = async () => {
  const response = await fetchApi('/roborock/status')

  if (!response.ok) {
    const errorDetails = await readErrorDetails(response, 'Failed to load Roborock status.')
    throw new RoborockApiError(errorDetails.message, errorDetails.errorCode)
  }

  const payload = (await response.json()) as {
    roborockStatus?: {
      device?: unknown
      status?: unknown
      quickStartMode?: unknown
      refreshedAt?: unknown
    }
  }
  const device = normalizeRoborockDeviceOption(payload.roborockStatus?.device)
  const status = normalizeRoborockStatus(payload.roborockStatus?.status)

  if (!device || !status) {
    throw new Error('Backend returned an invalid Roborock status payload.')
  }

  return {
    device,
    status,
    quickStartMode:
      payload.roborockStatus?.quickStartMode === 'routine' ? 'routine' : 'standard',
    refreshedAt:
      typeof payload.roborockStatus?.refreshedAt === 'string'
        ? payload.roborockStatus.refreshedAt
        : null,
  }
}

export const startRoborockQuickAction = async () => {
  const response = await fetchApi('/roborock/start', {
    method: 'POST',
  })

  if (!response.ok) {
    const errorDetails = await readErrorDetails(
      response,
      'Failed to start the Roborock quick action.',
    )
    throw new RoborockApiError(errorDetails.message, errorDetails.errorCode)
  }

  const payload = (await response.json()) as {
    roborockStatus?: {
      device?: unknown
      status?: unknown
      quickStartMode?: unknown
      refreshedAt?: unknown
    }
  }
  const device = normalizeRoborockDeviceOption(payload.roborockStatus?.device)
  const status = normalizeRoborockStatus(payload.roborockStatus?.status)

  if (!device || !status) {
    throw new Error('Backend returned an invalid Roborock quick-start payload.')
  }

  return {
    device,
    status,
    quickStartMode:
      payload.roborockStatus?.quickStartMode === 'routine' ? 'routine' : 'standard',
    refreshedAt:
      typeof payload.roborockStatus?.refreshedAt === 'string'
        ? payload.roborockStatus.refreshedAt
        : null,
  }
}
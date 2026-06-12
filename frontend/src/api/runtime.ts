import { getApiUrl } from './request'

declare const __APP_BUILD_ID__: string

export const currentFrontendBuildId = __APP_BUILD_ID__

interface FrontendRuntimeInfo {
  buildId: string
}

interface BackendRuntimeInfo {
  instanceId: string
}

const normalizeFrontendRuntimeInfo = (value: unknown): FrontendRuntimeInfo | null => {
  const candidate = value as {
    buildId?: unknown
  }

  if (!value || typeof value !== 'object' || typeof candidate.buildId !== 'string') {
    return null
  }

  return {
    buildId: candidate.buildId,
  }
}

const normalizeBackendRuntimeInfo = (value: unknown): BackendRuntimeInfo | null => {
  const candidate = value as {
    instanceId?: unknown
  }

  if (!value || typeof value !== 'object' || typeof candidate.instanceId !== 'string') {
    return null
  }

  return {
    instanceId: candidate.instanceId,
  }
}

export const fetchFrontendRuntimeInfo = async () => {
  const response = await fetch(`${import.meta.env.BASE_URL}app-runtime.json`, {
    cache: 'no-store',
    credentials: 'same-origin',
  })

  if (!response.ok) {
    throw new Error('Failed to load frontend runtime info.')
  }

  const runtimeInfo = normalizeFrontendRuntimeInfo(await response.json())

  if (!runtimeInfo) {
    throw new Error('Frontend runtime info payload is invalid.')
  }

  return runtimeInfo
}

export const fetchBackendRuntimeInfo = async () => {
  const response = await fetch(getApiUrl('/runtime'), {
    cache: 'no-store',
    credentials: 'same-origin',
  })

  if (!response.ok) {
    throw new Error('Failed to load backend runtime info.')
  }

  const runtimeInfo = normalizeBackendRuntimeInfo(await response.json())

  if (!runtimeInfo) {
    throw new Error('Backend runtime info payload is invalid.')
  }

  return runtimeInfo
}
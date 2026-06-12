import { fetchApi } from './request'

export interface AuthUser {
  id: string
  username: string
}

interface AuthSessionState {
  authenticated: boolean
  user: AuthUser | null
}

const normalizeAuthUser = (value: unknown): AuthUser | null => {
  const candidate = value as {
    id?: unknown
    username?: unknown
  }

  if (
    !value ||
    typeof value !== 'object' ||
    typeof candidate.id !== 'string' ||
    typeof candidate.username !== 'string'
  ) {
    return null
  }

  return {
    id: candidate.id,
    username: candidate.username,
  }
}

export const fetchCurrentSession = async (): Promise<AuthSessionState> => {
  const response = await fetchApi('/auth/session')

  if (!response.ok) {
    throw new Error('Failed to load the current session from the backend.')
  }

  const payload = (await response.json()) as {
    authenticated?: unknown
    user?: unknown
  }

  if (payload.authenticated !== true) {
    return {
      authenticated: false,
      user: null,
    }
  }

  const user = normalizeAuthUser(payload.user)

  if (!user) {
    throw new Error('Backend returned an invalid authenticated session payload.')
  }

  return {
    authenticated: true,
    user,
  }
}

export const login = async (username: string, password: string) => {
  const response = await fetchApi(
    '/auth/login',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    },
    {
      treatUnauthorizedAsAuthError: false,
    },
  )

  if (response.status === 401) {
    throw new Error('Invalid username or password.')
  }

  if (!response.ok) {
    throw new Error('Failed to sign in to the backend.')
  }

  const payload = (await response.json()) as { user?: unknown }
  const user = normalizeAuthUser(payload.user)

  if (!user) {
    throw new Error('Backend returned an invalid login payload.')
  }

  return user
}

export const logout = async () => {
  const response = await fetchApi('/auth/logout', {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error('Failed to sign out from the backend.')
  }
}
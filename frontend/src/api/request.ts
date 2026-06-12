const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export class AuthRequiredError extends Error {
  constructor(message = 'Authentication required.') {
    super(message)
    this.name = 'AuthRequiredError'
  }
}

export const isAuthRequiredError = (
  error: unknown,
): error is AuthRequiredError => error instanceof AuthRequiredError

export const getApiUrl = (path: string) =>
  `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`

export const fetchApi = async (
  path: string,
  init?: RequestInit,
  options?: {
    treatUnauthorizedAsAuthError?: boolean
  },
) => {
  const response = await fetch(getApiUrl(path), {
    ...init,
    credentials: init?.credentials ?? 'same-origin',
  })

  if (response.status === 401 && options?.treatUnauthorizedAsAuthError !== false) {
    throw new AuthRequiredError()
  }

  return response
}
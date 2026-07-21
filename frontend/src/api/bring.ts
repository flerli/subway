import { fetchApi } from './request'

export interface BringListOption {
  listUuid: string
  name: string
  theme: string | null
}

export interface BringSettingsRecord {
  username: string
  hasStoredPassword: boolean
  selectedListUuid: string
  selectedListName: string
  updatedAt: string | null
}

export interface BringListItemRecord {
  itemName: string
  specification: string
  uuid: string
  category: string
  recentAt: string
}

export interface BringListRecord {
  listUuid: string
  listName: string
  openItems: BringListItemRecord[]
  recentItems: BringListItemRecord[]
  openItemCount: number
  recentItemCount: number
  freshness: 'live' | 'stale'
  readOnly: boolean
  refreshedAt: string | null
  staleAt: string | null
}

export interface BringItemMutationInput {
  itemName: string
  specification?: string
  itemUuid?: string
}

export class BringApiError extends Error {
  errorCode: string | null

  constructor(message: string, errorCode: string | null = null) {
    super(message)
    this.name = 'BringApiError'
    this.errorCode = errorCode
  }
}

interface BringListsResponse {
  lists: BringListOption[]
  selectedListUuid: string
  selectedListName: string
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

const normalizeBringListOption = (value: unknown): BringListOption | null => {
  const candidate = value as {
    listUuid?: unknown
    name?: unknown
    theme?: unknown
  }

  if (
    !value ||
    typeof value !== 'object' ||
    typeof candidate.listUuid !== 'string' ||
    typeof candidate.name !== 'string'
  ) {
    return null
  }

  return {
    listUuid: candidate.listUuid,
    name: candidate.name,
    theme: typeof candidate.theme === 'string' ? candidate.theme : null,
  }
}

const normalizeBringSettings = (value: unknown): BringSettingsRecord | null => {
  const candidate = value as {
    username?: unknown
    hasStoredPassword?: unknown
    selectedListUuid?: unknown
    selectedListName?: unknown
    updatedAt?: unknown
  }

  if (!value || typeof value !== 'object') {
    return null
  }

  return {
    username: typeof candidate.username === 'string' ? candidate.username : '',
    hasStoredPassword: candidate.hasStoredPassword === true,
    selectedListUuid:
      typeof candidate.selectedListUuid === 'string' ? candidate.selectedListUuid : '',
    selectedListName:
      typeof candidate.selectedListName === 'string' ? candidate.selectedListName : '',
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : null,
  }
}

const normalizeBringListsResponse = (value: unknown): BringListsResponse | null => {
  const candidate = value as {
    lists?: unknown
    selectedListUuid?: unknown
    selectedListName?: unknown
  }

  if (!value || typeof value !== 'object') {
    return null
  }

  return {
    lists: Array.isArray(candidate.lists)
      ? candidate.lists
          .map(normalizeBringListOption)
          .filter((entry): entry is BringListOption => Boolean(entry))
      : [],
    selectedListUuid:
      typeof candidate.selectedListUuid === 'string' ? candidate.selectedListUuid : '',
    selectedListName:
      typeof candidate.selectedListName === 'string' ? candidate.selectedListName : '',
  }
}

const normalizeBringListItem = (value: unknown): BringListItemRecord | null => {
  const candidate = value as {
    itemName?: unknown
    specification?: unknown
    uuid?: unknown
    category?: unknown
    recentAt?: unknown
  }

  if (!value || typeof value !== 'object' || typeof candidate.itemName !== 'string') {
    return null
  }

  return {
    itemName: candidate.itemName,
    specification: typeof candidate.specification === 'string' ? candidate.specification : '',
    uuid: typeof candidate.uuid === 'string' ? candidate.uuid : '',
    category: typeof candidate.category === 'string' ? candidate.category : '',
    recentAt: typeof candidate.recentAt === 'string' ? candidate.recentAt : '',
  }
}

const normalizeBringList = (value: unknown): BringListRecord | null => {
  const candidate = value as {
    listUuid?: unknown
    listName?: unknown
    openItems?: unknown
    recentItems?: unknown
    openItemCount?: unknown
    recentItemCount?: unknown
    freshness?: unknown
    readOnly?: unknown
    refreshedAt?: unknown
    staleAt?: unknown
  }

  if (
    !value ||
    typeof value !== 'object' ||
    typeof candidate.listUuid !== 'string' ||
    typeof candidate.listName !== 'string'
  ) {
    return null
  }

  const openItems = Array.isArray(candidate.openItems)
    ? candidate.openItems
        .map(normalizeBringListItem)
        .filter((item): item is BringListItemRecord => Boolean(item))
    : []
  const recentItems = Array.isArray(candidate.recentItems)
    ? candidate.recentItems
        .map(normalizeBringListItem)
        .filter((item): item is BringListItemRecord => Boolean(item))
    : []

  return {
    listUuid: candidate.listUuid,
    listName: candidate.listName,
    openItems,
    recentItems,
    openItemCount:
      typeof candidate.openItemCount === 'number' ? candidate.openItemCount : openItems.length,
    recentItemCount:
      typeof candidate.recentItemCount === 'number'
        ? candidate.recentItemCount
        : recentItems.length,
    freshness: candidate.freshness === 'stale' ? 'stale' : 'live',
    readOnly: candidate.readOnly === true,
    refreshedAt: typeof candidate.refreshedAt === 'string' ? candidate.refreshedAt : null,
    staleAt: typeof candidate.staleAt === 'string' ? candidate.staleAt : null,
  }
}

export const fetchBringSettings = async () => {
  const response = await fetchApi('/bring/settings')

  if (!response.ok) {
    const errorDetails = await readErrorDetails(response, 'Failed to load Bring settings.')
    throw new BringApiError(errorDetails.message, errorDetails.errorCode)
  }

  const payload = (await response.json()) as { bringSettings?: unknown }
  const bringSettings = normalizeBringSettings(payload.bringSettings)

  if (!bringSettings) {
    throw new Error('Backend returned an invalid Bring settings payload.')
  }

  return bringSettings
}

export const resolveBringLists = async (input: {
  username: string
  password: string
}) => {
  const response = await fetchApi('/bring/settings/lists', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const errorDetails = await readErrorDetails(
      response,
      'Failed to load Bring shopping lists.',
    )
    throw new BringApiError(errorDetails.message, errorDetails.errorCode)
  }

  const payload = normalizeBringListsResponse(await response.json())

  if (!payload) {
    throw new Error('Backend returned an invalid Bring lists payload.')
  }

  return payload
}

export const updateBringSettings = async (input: {
  username: string
  password: string
  selectedListUuid: string
}) => {
  const response = await fetchApi('/bring/settings', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const errorDetails = await readErrorDetails(response, 'Failed to save Bring settings.')
    throw new BringApiError(errorDetails.message, errorDetails.errorCode)
  }

  const payload = (await response.json()) as {
    bringSettings?: unknown
    lists?: unknown
  }
  const bringSettings = normalizeBringSettings(payload.bringSettings)

  if (!bringSettings) {
    throw new Error('Backend returned an invalid Bring settings payload.')
  }

  return {
    bringSettings,
    lists: Array.isArray(payload.lists)
      ? payload.lists
          .map(normalizeBringListOption)
          .filter((entry): entry is BringListOption => Boolean(entry))
      : [],
  }
}

export const fetchBringList = async () => {
  const response = await fetchApi('/bring/list')

  if (!response.ok) {
    const errorDetails = await readErrorDetails(response, 'Failed to load Bring list.')
    throw new BringApiError(errorDetails.message, errorDetails.errorCode)
  }

  const payload = (await response.json()) as { bringList?: unknown }
  const bringList = normalizeBringList(payload.bringList)

  if (!bringList) {
    throw new BringApiError('Backend returned an invalid Bring list payload.')
  }

  return bringList
}

const readBringListFromResponse = async (response: Response, fallbackMessage: string) => {
  if (!response.ok) {
    const errorDetails = await readErrorDetails(response, fallbackMessage)
    throw new BringApiError(errorDetails.message, errorDetails.errorCode)
  }

  const payload = (await response.json()) as { bringList?: unknown }
  const bringList = normalizeBringList(payload.bringList)

  if (!bringList) {
    throw new BringApiError('Backend returned an invalid Bring list payload.')
  }

  return bringList
}

export const createBringItem = async (input: BringItemMutationInput) => {
  const response = await fetchApi('/bring/list/items', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  return readBringListFromResponse(response, 'Failed to add Bring item.')
}

export const updateBringItem = async (input: BringItemMutationInput) => {
  const response = await fetchApi('/bring/list/items', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  return readBringListFromResponse(response, 'Failed to update Bring item.')
}

export const deleteBringItem = async (input: Pick<BringItemMutationInput, 'itemName' | 'itemUuid'>) => {
  const response = await fetchApi('/bring/list/items', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  return readBringListFromResponse(response, 'Failed to delete Bring item.')
}

export const completeBringItem = async (input: BringItemMutationInput) => {
  const response = await fetchApi('/bring/list/items/complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  return readBringListFromResponse(response, 'Failed to complete Bring item.')
}
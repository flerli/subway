import {
  mergeWidgetEntitiesWithSeed,
  widgetEntitySeed,
} from '../widgets/widgetDatabase'
import type {
  WidgetEntityRecord,
  WidgetPlacementAssignment,
  WidgetPlacementZoneId,
  WidgetUserScope,
} from '../widgets/widgetTypes'

const WIDGETS_API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

const getApiUrl = (path: string) =>
  `${WIDGETS_API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`

const normalizeScope = (value: unknown): WidgetUserScope | undefined => {
  const candidate = value as {
    mode?: unknown
    memberIds?: unknown
  }

  if (!value || typeof value !== 'object') {
    return undefined
  }

  return {
    mode:
      candidate.mode === 'member' || candidate.mode === 'members'
        ? candidate.mode
        : 'all',
    memberIds: Array.isArray(candidate.memberIds)
      ? candidate.memberIds.filter(
          (memberId: unknown): memberId is string => typeof memberId === 'string',
        )
      : [],
  }
}

const normalizePlacementZones = (
  value: unknown,
): WidgetPlacementAssignment[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined
  }

  return value
    .map((placement) => {
      const candidate = placement as {
        zoneId?: unknown
        order?: unknown
      }

      if (
        !placement ||
        typeof placement !== 'object' ||
        typeof candidate.zoneId !== 'string' ||
        typeof candidate.order !== 'number'
      ) {
        return null
      }

      if (
        candidate.zoneId !== 'hero' &&
        candidate.zoneId !== 'triad' &&
        candidate.zoneId !== 'bottom-wide' &&
        candidate.zoneId !== 'bottom-side'
      ) {
        return null
      }

      return {
        zoneId: candidate.zoneId as WidgetPlacementZoneId,
        order: candidate.order,
      }
    })
    .filter(
      (
        placement: WidgetPlacementAssignment | null,
      ): placement is WidgetPlacementAssignment => Boolean(placement),
    )
}

const normalizeWidgetEntity = (value: unknown) => {
  const candidate = value as {
    id?: unknown
    title?: unknown
    subwayLetter?: unknown
    subwayColor?: unknown
    sourceLocation?: unknown
    userScope?: unknown
    placementZones?: unknown
  }

  if (
    !value ||
    typeof value !== 'object' ||
    typeof candidate.id !== 'string' ||
    typeof candidate.title !== 'string'
  ) {
    return null
  }

  return {
    id: candidate.id,
    title: candidate.title,
    subwayLetter:
      typeof candidate.subwayLetter === 'string'
        ? candidate.subwayLetter
        : undefined,
    subwayColor:
      typeof candidate.subwayColor === 'string' ? candidate.subwayColor : undefined,
    sourceLocation:
      typeof candidate.sourceLocation === 'string'
        ? candidate.sourceLocation
        : undefined,
    userScope: normalizeScope(candidate.userScope),
    placementZones: normalizePlacementZones(candidate.placementZones),
  } satisfies Partial<WidgetEntityRecord> & Pick<WidgetEntityRecord, 'id' | 'title'>
}

export const fetchWidgetEntities = async () => {
  const response = await fetch(getApiUrl('/widgets'))

  if (!response.ok) {
    throw new Error('Failed to load widget metadata from backend.')
  }

  const payload = (await response.json()) as { widgets?: unknown[] }
  const widgetEntities: Array<
    Partial<WidgetEntityRecord> & Pick<WidgetEntityRecord, 'id' | 'title'>
  > = Array.isArray(payload.widgets)
    ? payload.widgets.flatMap((widget) => {
        const normalizedWidget = normalizeWidgetEntity(widget)

        return normalizedWidget ? [normalizedWidget] : []
      })
    : []

  return widgetEntities.length > 0
    ? mergeWidgetEntitiesWithSeed(widgetEntities)
    : widgetEntitySeed
}

export const updateWidgetEntity = async (
  widgetId: string,
  payload: {
    title: string
    subwayLetter: string
    subwayColor: string
    sourceLocation: string
    userScope: WidgetUserScope
    placementZones: WidgetPlacementAssignment[]
  },
) => {
  const response = await fetch(getApiUrl(`/widgets/${widgetId}`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error('Failed to update widget metadata in backend.')
  }

  const responsePayload = (await response.json()) as { widget?: unknown }
  const widget = normalizeWidgetEntity(responsePayload.widget)

  if (!widget) {
    throw new Error('Backend returned an invalid widget metadata payload.')
  }

  return mergeWidgetEntitiesWithSeed([widget])[0]
}
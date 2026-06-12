import {
  mergeWidgetEntitiesWithSeed,
} from '../widgets/widgetDatabase'
import { fetchApi } from './request'
import type {
  WidgetEntityRecord,
  WidgetPlacementAssignment,
  WidgetPlacementZoneId,
  WidgetUserScope,
} from '../widgets/widgetTypes'

const widgetGridPlacementOrder: WidgetPlacementZoneId[] = [
  'a1',
  'b1',
  'a2',
  'b2',
  'a3',
  'b3',
]

const normalizePlacementZoneId = (
  zoneId: string,
  order: number,
): WidgetPlacementZoneId | null => {
  if (
    zoneId === 'service-board' ||
    zoneId === 'a1' ||
    zoneId === 'b1' ||
    zoneId === 'a2' ||
    zoneId === 'b2' ||
    zoneId === 'a3' ||
    zoneId === 'b3'
  ) {
    return zoneId
  }

  if (zoneId === 'hero') {
    return 'service-board'
  }

  if (zoneId === 'triad') {
    return widgetGridPlacementOrder[
      Math.min(Math.max(Math.round(order) - 1, 0), widgetGridPlacementOrder.length - 1)
    ]
  }

  if (zoneId === 'bottom-wide') {
    return 'b2'
  }

  if (zoneId === 'bottom-side') {
    return 'a3'
  }

  return null
}

const serializePlacementZoneForApi = ({
  zoneId,
}: WidgetPlacementAssignment): WidgetPlacementAssignment => {
  if (zoneId === 'service-board') {
    return { zoneId: 'hero' as WidgetPlacementZoneId, order: 1 }
  }

  const encodedOrder = widgetGridPlacementOrder.indexOf(zoneId)

  if (encodedOrder >= 0) {
    return {
      zoneId: 'triad' as WidgetPlacementZoneId,
      order: encodedOrder + 1,
    }
  }

  return { zoneId, order: 1 }
}

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

      const normalizedZoneId = normalizePlacementZoneId(
        candidate.zoneId,
        candidate.order,
      )

      if (!normalizedZoneId) {
        return null
      }

      return {
        zoneId: normalizedZoneId,
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
  const response = await fetchApi('/widgets')

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

  const widgetIds = new Set(widgetEntities.map((widget) => widget.id))

  return mergeWidgetEntitiesWithSeed(widgetEntities).filter((widgetEntity) =>
    widgetIds.has(widgetEntity.id),
  )
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
  const response = await fetchApi(`/widgets/${widgetId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...payload,
      placementZones: payload.placementZones.map(serializePlacementZoneForApi),
    }),
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
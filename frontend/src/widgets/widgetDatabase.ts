import type {
  WidgetEntityRecord,
  WidgetPlacementAssignment,
  WidgetPlacementZoneId,
  WidgetUserScope,
} from './widgetTypes'

const createScope = (
  mode: WidgetUserScope['mode'],
  memberIds: string[] = [],
): WidgetUserScope => ({
  mode,
  memberIds,
})

const createPlacement = (
  zoneId: WidgetPlacementZoneId,
  order: number,
): WidgetPlacementAssignment => ({
  zoneId,
  order,
})

export const deriveWidgetLetter = (title: string, explicitLetter?: string) => {
  const sanitizedExplicitLetter = explicitLetter?.trim().charAt(0).toUpperCase()

  if (sanitizedExplicitLetter) {
    return sanitizedExplicitLetter
  }

  return title.trim().charAt(0).toUpperCase() || '?'
}

export const normalizeWidgetSourceLocation = (value: string) =>
  value.trim().replace(/^\.\//, '').replace(/\/index\.(ts|tsx|js|jsx)$/u, '')

const normalizeWidgetEntity = (
  entity: Partial<WidgetEntityRecord> & Pick<WidgetEntityRecord, 'id' | 'title'>,
): WidgetEntityRecord => ({
  id: entity.id,
  title: entity.title.trim() || 'Untitled Widget',
  subwayLetter: deriveWidgetLetter(entity.title, entity.subwayLetter),
  subwayColor: /^#[0-9a-fA-F]{6}$/.test(entity.subwayColor ?? '')
    ? (entity.subwayColor as string)
    : '#4aa8ff',
  sourceLocation: normalizeWidgetSourceLocation(
    entity.sourceLocation ?? entity.id,
  ),
  userScope: entity.userScope ?? createScope('all'),
  placementZones:
    entity.placementZones && entity.placementZones.length > 0
      ? entity.placementZones
      : [createPlacement('hero', 1)],
})

export const widgetEntitySeed: WidgetEntityRecord[] = [
  normalizeWidgetEntity({
    id: 'arrival-board',
    title: 'Arrival Board',
    subwayColor: '#4aa8ff',
    sourceLocation: 'arrival-board',
    userScope: createScope('all'),
    placementZones: [createPlacement('hero', 1)],
  }),
  normalizeWidgetEntity({
    id: 'weather',
    title: 'Weather',
    subwayColor: '#fccc0a',
    sourceLocation: 'weather',
    userScope: createScope('all'),
    placementZones: [createPlacement('triad', 1)],
  }),
  normalizeWidgetEntity({
    id: 'calendar',
    title: 'Calendar',
    subwayColor: '#ff6319',
    sourceLocation: 'calendar',
    userScope: createScope('members', ['family-1', 'family-2']),
    placementZones: [createPlacement('triad', 2)],
  }),
  normalizeWidgetEntity({
    id: 'todo',
    title: 'Todo',
    subwayColor: '#4edbe8',
    sourceLocation: 'todo',
    userScope: createScope('member', ['family-3']),
    placementZones: [createPlacement('triad', 3)],
  }),
  normalizeWidgetEntity({
    id: 'bulletins',
    title: 'Bulletins',
    subwayColor: '#8b78ff',
    sourceLocation: 'bulletins',
    userScope: createScope('members', ['family-2', 'family-3', 'family-4']),
    placementZones: [createPlacement('bottom-wide', 1)],
  }),
  normalizeWidgetEntity({
    id: 'calibration',
    title: 'Calibration',
    subwayColor: '#ff7c70',
    sourceLocation: 'calibration',
    userScope: createScope('all'),
    placementZones: [createPlacement('bottom-side', 1)],
  }),
]

export const mergeWidgetEntitiesWithSeed = (
  entities: Array<Partial<WidgetEntityRecord> & Pick<WidgetEntityRecord, 'id' | 'title'>>,
) => {
  const mergedById = new Map(widgetEntitySeed.map((entity) => [entity.id, entity]))

  for (const entity of entities) {
    const seededEntity = mergedById.get(entity.id)
    const hasExplicitPlacements = Boolean(entity.placementZones?.length)

    mergedById.set(
      entity.id,
      normalizeWidgetEntity({
        ...seededEntity,
        ...entity,
        userScope: seededEntity?.userScope ?? entity.userScope,
        placementZones: hasExplicitPlacements
          ? entity.placementZones
          : seededEntity?.placementZones,
      }),
    )
  }

  return [...mergedById.values()]
}
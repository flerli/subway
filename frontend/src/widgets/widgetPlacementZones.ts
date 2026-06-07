import type {
  WidgetPlacementZoneDefinition,
  WidgetPlacementZoneId,
} from './widgetTypes'

export const widgetPlacementZones: WidgetPlacementZoneDefinition[] = [
  {
    id: 'service-board',
    label: 'Family service board',
    className: 'widget-zone widget-zone--service-board',
  },
  {
    id: 'a1',
    label: 'Cell A1',
    className: 'widget-zone widget-zone--cell',
  },
  {
    id: 'b1',
    label: 'Cell B1',
    className: 'widget-zone widget-zone--cell',
  },
  {
    id: 'a2',
    label: 'Cell A2',
    className: 'widget-zone widget-zone--cell',
  },
  {
    id: 'b2',
    label: 'Cell B2',
    className: 'widget-zone widget-zone--cell',
  },
  {
    id: 'a3',
    label: 'Cell A3',
    className: 'widget-zone widget-zone--cell',
  },
  {
    id: 'b3',
    label: 'Cell B3',
    className: 'widget-zone widget-zone--cell',
  },
]

export const widgetPlacementZoneIds: WidgetPlacementZoneId[] = widgetPlacementZones.map(
  (zone) => zone.id,
)

export const widgetGridPlacementZones = widgetPlacementZones.filter(
  (zone) => zone.id !== 'service-board',
)

export const widgetPlacementZoneLabels = widgetPlacementZones.reduce(
  (labels, zone) => {
    labels[zone.id] = zone.label
    return labels
  },
  {} as Record<WidgetPlacementZoneId, string>,
)

import type { WidgetPlacementZoneDefinition } from './widgetTypes'

export const widgetPlacementZones: WidgetPlacementZoneDefinition[] = [
  {
    id: 'hero',
    label: 'Hero Zone',
    className: 'widget-zone widget-zone--hero',
  },
  {
    id: 'triad',
    label: 'Triad Zone',
    className: 'widget-zone widget-zone--triad',
  },
  {
    id: 'bottom-wide',
    label: 'Bottom Wide Zone',
    className: 'widget-zone widget-zone--bottom-wide',
  },
  {
    id: 'bottom-side',
    label: 'Bottom Side Zone',
    className: 'widget-zone widget-zone--bottom-side',
  },
]

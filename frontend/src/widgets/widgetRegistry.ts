import type {
  RegisteredWidget,
  WidgetEntityRecord,
  WidgetMicroAppContract,
  WidgetPresentation,
} from './widgetTypes'

const discoveredWidgetModules = import.meta.glob('./*/index.ts', {
  eager: true,
}) as Record<string, { widgetModule?: WidgetMicroAppContract }>

const widgetModulesBySourceLocation = new Map<string, WidgetMicroAppContract>()

for (const moduleRecord of Object.values(discoveredWidgetModules)) {
  if (moduleRecord.widgetModule) {
    widgetModulesBySourceLocation.set(
      moduleRecord.widgetModule.folderName,
      moduleRecord.widgetModule,
    )
  }
}

const widgetPresentation: Record<string, WidgetPresentation> = {
  'arrival-board': {
    widgetNumber: 1,
  },
  weather: {
    widgetNumber: 2,
  },
  calendar: {
    widgetNumber: 3,
  },
  todo: {
    widgetNumber: 4,
  },
  'ui-benchmark': {
    widgetNumber: 5,
  },
  youtube: {
    widgetNumber: 6,
  },
  'audio-visual': {
    widgetNumber: 7,
  },
  bring: {
    widgetNumber: 8,
  },
  roborock: {
    widgetNumber: 9,
  },
}

export const buildWidgetRegistry = (
  widgetEntities: WidgetEntityRecord[],
): RegisteredWidget[] =>
  widgetEntities.flatMap((entity) => {
    const widgetModule = widgetModulesBySourceLocation.get(entity.sourceLocation)

    if (!widgetModule) {
      return []
    }

    return [
      {
        entity,
        module: widgetModule,
        presentation: widgetPresentation[entity.id] ?? {
          widgetNumber: 99,
        },
      },
    ]
  })
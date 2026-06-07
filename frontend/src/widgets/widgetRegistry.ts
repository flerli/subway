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
    boardKicker: 'Family service board',
  },
  weather: {
    widgetNumber: 2,
    boardKicker: 'Forecast',
  },
  calendar: {
    widgetNumber: 3,
    boardKicker: 'Calendar',
  },
  todo: {
    widgetNumber: 4,
    boardKicker: 'Todo',
  },
  bulletins: {
    widgetNumber: 5,
    boardKicker: 'Bulletin panel',
  },
  calibration: {
    widgetNumber: 6,
    boardKicker: 'System',
  },
}

export const buildWidgetRegistry = (
  widgetEntities: WidgetEntityRecord[],
): RegisteredWidget[] =>
  widgetEntities.map((entity) => {
    const widgetModule = widgetModulesBySourceLocation.get(entity.sourceLocation)

    if (!widgetModule) {
      throw new Error(
        `Missing widget module for source location ${entity.sourceLocation}`,
      )
    }

    return {
      entity,
      module: widgetModule,
      presentation: widgetPresentation[entity.id] ?? {
        widgetNumber: 99,
        boardKicker: entity.title,
      },
    }
  })
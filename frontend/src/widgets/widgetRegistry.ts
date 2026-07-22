import type {
  RegisteredWidget,
  RegisteredWidgetMcpTool,
  WidgetEntityRecord,
  WidgetMicroAppContract,
  WidgetSettingsValues,
  WidgetPresentation,
} from './widgetTypes'
import { normalizeWidgetMcpConfiguration } from './widgetMcpConfiguration'

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
  assistant: {
    widgetNumber: 10,
  },
}

const buildProviderToolName = (toolName: string) =>
  toolName
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64)

const isWidgetVisibleOnBoard = (widget: RegisteredWidget) =>
  widget.entity.placementZones.length > 0

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

export const buildRegisteredWidgetMcpToolCatalog = (
  registeredWidgets: RegisteredWidget[],
  widgetSettingsMap: Record<string, WidgetSettingsValues> = {},
): RegisteredWidgetMcpTool[] =>
  registeredWidgets.flatMap((widget) =>
    !isWidgetVisibleOnBoard(widget)
      ? []
      :
    (widget.module.mcpTools ?? []).flatMap((tool) => {
      const mcpConfiguration = normalizeWidgetMcpConfiguration(
        widget,
        widgetSettingsMap[widget.entity.id] ?? {},
      )
      const toolPolicy = mcpConfiguration.toolPolicies[tool.name]

      if (toolPolicy?.enabled === false) {
        return []
      }

      return [
        {
          widgetId: widget.entity.id,
          widgetTitle: widget.entity.title,
          sourceLocation: widget.entity.sourceLocation,
          toolName: tool.name,
          providerToolName: buildProviderToolName(tool.name),
          description: tool.description,
          humanAction: tool.humanAction,
          parityScope: tool.parityScope,
          approvalRequired:
            typeof toolPolicy?.approvalRequired === 'boolean'
              ? toolPolicy.approvalRequired
              : tool.approvalRequired === true,
          redactArguments: tool.redactArguments === true,
          redactResults: tool.redactResults === true,
          arguments: tool.arguments,
        },
      ]
    }),
  )
import type { AuthUser } from '../api/auth'
import type { FamilyMember } from './widgetHostModels'
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

const buildCalendarScopeGuidance = (
  familyMembers: FamilyMember[],
  authenticatedUser: AuthUser | null,
) => {
  const memberScopeList = familyMembers
    .map((member) => `${member.firstName}=${member.id}`)
    .join(', ')
  const userLabel = authenticatedUser?.username?.trim() || 'the signed-in user'

  if (familyMembers.length === 0) {
    return `Valid calendar scopes for ${userLabel}: only scopeMode="all" is currently safe because no family member ids are loaded. Do not invent member ids.`
  }

  return `Valid calendar scopes for ${userLabel}: use scopeMode="all" for household-wide events, or scopeMode="members" with scopeMemberIdsJson set to a JSON array containing only these exact member ids: ${memberScopeList}. Never use first names as ids and never invent ids.`
}

const applyDynamicWidgetToolDescription = (
  widget: RegisteredWidget,
  tool: RegisteredWidgetMcpTool,
  familyMembers: FamilyMember[],
  authenticatedUser: AuthUser | null,
): RegisteredWidgetMcpTool => {
  if (widget.entity.id !== 'calendar') {
    return tool
  }

  const scopeGuidance = buildCalendarScopeGuidance(familyMembers, authenticatedUser)
  const scopeArgumentKeys = new Set(['scopeMode', 'scopeMemberIdsJson', 'focusedMemberId'])
  const nextDescription = `${tool.description} ${scopeGuidance}`.trim()

  return {
    ...tool,
    description: nextDescription,
    arguments: tool.arguments.map((argumentDefinition) =>
      scopeArgumentKeys.has(argumentDefinition.key)
        ? {
            ...argumentDefinition,
            description: `${argumentDefinition.description} ${scopeGuidance}`.trim(),
          }
        : argumentDefinition,
    ),
  }
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

export const buildRegisteredWidgetMcpToolCatalog = (
  registeredWidgets: RegisteredWidget[],
  widgetSettingsMap: Record<string, WidgetSettingsValues> = {},
  familyMembers: FamilyMember[] = [],
  authenticatedUser: AuthUser | null = null,
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
        applyDynamicWidgetToolDescription(widget, {
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
        }, familyMembers, authenticatedUser),
      ]
    }),
  )
import type {
  RegisteredWidget,
  WidgetMcpConfigurationSettings,
  WidgetSettingsValues,
} from './widgetTypes'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const normalizeWidgetMcpToolPolicies = (
  value: unknown,
): Record<string, { enabled: boolean; approvalRequired: boolean }> => {
  if (!isRecord(value)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([toolName, policyValue]) => {
      if (!isRecord(policyValue)) {
        return []
      }

      return [[
        toolName,
        {
          enabled: policyValue.enabled !== false,
          approvalRequired: policyValue.approvalRequired === true,
        },
      ]]
    }),
  )
}

export const stripWidgetMcpConfigurationSettings = (
  settings: WidgetSettingsValues,
): WidgetSettingsValues =>
  Object.fromEntries(
    Object.entries(settings).filter(([key]) => key !== 'mcp'),
  )

export const normalizeWidgetMcpConfiguration = (
  widget: RegisteredWidget,
  settings: WidgetSettingsValues,
): WidgetMcpConfigurationSettings => {
  const storedToolPolicies = normalizeWidgetMcpToolPolicies(
    isRecord(settings.mcp) ? settings.mcp.toolPolicies : undefined,
  )

  return {
    toolPolicies: Object.fromEntries(
      (widget.module.mcpTools ?? []).map((tool) => {
        const storedPolicy = storedToolPolicies[tool.name]

        return [
          tool.name,
          {
            enabled: storedPolicy?.enabled !== false,
            approvalRequired:
              typeof storedPolicy?.approvalRequired === 'boolean'
                ? storedPolicy.approvalRequired
                : tool.approvalRequired === true,
          },
        ]
      }),
    ),
  }
}

export const mergeWidgetSettingsWithMcpConfiguration = (
  settings: WidgetSettingsValues,
  mcpConfiguration: WidgetMcpConfigurationSettings,
): WidgetSettingsValues => ({
  ...stripWidgetMcpConfigurationSettings(settings),
  mcp: {
    toolPolicies: Object.fromEntries(
      Object.entries(mcpConfiguration.toolPolicies).map(([toolName, policy]) => [
        toolName,
        {
          enabled: policy.enabled,
          approvalRequired: policy.approvalRequired,
        },
      ]),
    ),
  },
})
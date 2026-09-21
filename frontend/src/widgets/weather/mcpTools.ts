import type { WidgetMcpToolDefinition } from '../widgetTypes.ts'

/** MCP tool definitions for the weather widget (generated catalog source). */
export const weatherMcpTools: WidgetMcpToolDefinition[] = [
    {
      name: 'widget.weather.get_widget_state',
      description:
        'Get the configured weather widget settings and the current weather payload for each configured location.',
      humanAction:
        'Read the compact and expanded weather widget using the saved widget configuration.',
      parityScope: ['read'],
      approvalRequired: false,
      redactArguments: false,
      redactResults: false,
      arguments: [],
    },
    {
      name: 'widget.weather.get_current_weather',
      description:
        'Get the current weather snapshot and forecast for a requested location.',
      humanAction: 'Read the weather widget for a configured or requested location.',
      parityScope: ['read'],
      approvalRequired: false,
      redactArguments: false,
      redactResults: false,
      arguments: [
        {
          key: 'latitude',
          type: 'number',
          description: 'Latitude of the location to query.',
          required: true,
        },
        {
          key: 'longitude',
          type: 'number',
          description: 'Longitude of the location to query.',
          required: true,
        },
        {
          key: 'locationLabel',
          type: 'string',
          description: 'Human-readable label for the requested location.',
          required: false,
        },
      ],
    },
    {
      name: 'widget.weather.update_widget_settings',
      description:
        'Update the configured weather locations, focus slot, and refresh interval for the weather widget.',
      humanAction:
        'Save the weather widget settings for configured locations and focus behavior.',
      parityScope: ['write'],
      approvalRequired: false,
      redactArguments: false,
      redactResults: false,
      arguments: [
        {
          key: 'focusLocationSlot',
          type: 'number',
          description: 'Focus location slot from 1 to 5.',
          required: false,
        },
        {
          key: 'refreshIntervalMinutes',
          type: 'number',
          description: 'Refresh interval in minutes from 1 to 120.',
          required: false,
        },
        {
          key: 'locations',
          type: 'string',
          description:
            'Optional JSON string describing configured locations with id, label, latitude, and longitude.',
          required: false,
        },
      ],
    },
  ]

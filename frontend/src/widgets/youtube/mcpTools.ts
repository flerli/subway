import type { WidgetMcpToolDefinition } from '../widgetTypes.ts'

/** MCP tool definitions for the youtube widget (generated catalog source). */
export const youtubeMcpTools: WidgetMcpToolDefinition[] = [
    {
      name: 'widget.youtube.get_widget_state',
      description:
        'Get the saved YouTube widget settings that control playback behavior.',
      humanAction:
        'Read the saved YouTube widget settings from the settings panel.',
      parityScope: ['read'],
      approvalRequired: false,
      redactArguments: false,
      redactResults: false,
      arguments: [],
    },
    {
      name: 'widget.youtube.search_videos',
      description:
        'Search YouTube videos and optionally choose one result by index or video id.',
      humanAction:
        'Search YouTube content and select a result to open in the player.',
      parityScope: ['read'],
      approvalRequired: false,
      redactArguments: false,
      redactResults: false,
      arguments: [
        {
          key: 'query',
          type: 'string',
          description: 'Search query for YouTube videos.',
          required: true,
        },
        {
          key: 'selectedIndex',
          type: 'number',
          description: 'Optional zero-based result index to select.',
          required: false,
        },
        {
          key: 'selectedVideoId',
          type: 'string',
          description: 'Optional YouTube video id to select from the returned results.',
          required: false,
        },
      ],
    },
    {
      name: 'widget.youtube.update_widget_settings',
      description:
        'Update the saved YouTube widget playback settings.',
      humanAction:
        'Save the YouTube widget auto-play setting in the widget settings panel.',
      parityScope: ['write'],
      approvalRequired: false,
      redactArguments: false,
      redactResults: false,
      arguments: [
        {
          key: 'autoPlay',
          type: 'boolean',
          description: 'Whether the YouTube widget should auto-play selected videos.',
          required: false,
        },
      ],
    },
  ]

import type { WidgetMcpToolDefinition } from '../widgetTypes.ts'

/** MCP tool definitions for the arrival-board widget (generated catalog source). */
export const arrivalBoardMcpTools: WidgetMcpToolDefinition[] = [
    {
      name: 'widget.arrival_board.get_widget_state',
      description:
        'Get the arrival board header settings and the current list of upcoming arrivals.',
      humanAction:
        'Read the arrival board in its default or member-focused view.',
      parityScope: ['read'],
      approvalRequired: false,
      redactArguments: false,
      redactResults: false,
      arguments: [
        {
          key: 'focusedMemberId',
          type: 'string',
          description: 'Optional member id to focus the arrival board on one person.',
          required: false,
        },
      ],
    },
    {
      name: 'widget.arrival_board.get_arrival_event_detail',
      description:
        'Get the calendar event detail behind one arrival board row.',
      humanAction:
        'Open an arrival row to inspect the linked calendar event detail.',
      parityScope: ['read'],
      approvalRequired: false,
      redactArguments: false,
      redactResults: false,
      arguments: [
        {
          key: 'eventId',
          type: 'string',
          description: 'Arrival event id from the current arrival board state.',
          required: true,
        },
      ],
    },
    {
      name: 'widget.arrival_board.update_widget_settings',
      description:
        'Update the arrival board title and subheading shown in the board header settings.',
      humanAction:
        'Save the arrival board header settings in the widget settings panel.',
      parityScope: ['write'],
      approvalRequired: false,
      redactArguments: false,
      redactResults: false,
      arguments: [
        {
          key: 'boardTitle',
          type: 'string',
          description: 'New board title.',
          required: false,
        },
        {
          key: 'boardSubheading',
          type: 'string',
          description: 'New board subheading.',
          required: false,
        },
      ],
    },
  ]

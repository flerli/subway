import type { WidgetMcpToolDefinition } from '../widgetTypes.ts'

/** MCP tool definitions for the todo widget (generated catalog source). */
export const todoMcpTools: WidgetMcpToolDefinition[] = [
    {
      name: 'widget.todo.get_widget_state',
      description:
        'Get the filtered todo widget state using the current widget settings and optional member focus.',
      humanAction:
        'Read the visible todo widget list for the current or selected member scope.',
      parityScope: ['read'],
      approvalRequired: false,
      redactArguments: false,
      redactResults: false,
      arguments: [
        {
          key: 'focusedMemberId',
          type: 'string',
          description: 'Optional member id for member-focused filtering.',
          required: false,
        },
      ],
    },
    {
      name: 'widget.todo.set_item_done_state',
      description:
        'Mark a todo item as done or not done.',
      humanAction:
        'Toggle a todo item completion state from the widget.',
      parityScope: ['write'],
      approvalRequired: false,
      redactArguments: false,
      redactResults: false,
      arguments: [
        { key: 'todoItemId', type: 'string', description: 'Todo item id.', required: true },
        { key: 'done', type: 'boolean', description: 'Whether the todo item is completed.', required: true },
      ],
    },
    {
      name: 'widget.todo.update_widget_settings',
      description:
        'Update the todo widget settings for maximum visible items and completed-item visibility.',
      humanAction:
        'Save the todo widget settings panel.',
      parityScope: ['write'],
      approvalRequired: false,
      redactArguments: false,
      redactResults: false,
      arguments: [
        { key: 'maxItems', type: 'number', description: 'Maximum number of visible todo items.', required: false },
        { key: 'showCompleted', type: 'boolean', description: 'Whether completed todo items stay visible.', required: false },
      ],
    },
  ]

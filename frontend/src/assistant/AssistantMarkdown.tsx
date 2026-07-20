import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import 'highlight.js/styles/github-dark.css'

const defaultSchemaAttributes = defaultSchema.attributes ?? {}

const assistantMarkdownSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchemaAttributes,
    code: [
      ...(defaultSchemaAttributes.code || []),
      ['className', /^language-./, 'hljs'],
    ],
    span: [
      ...(defaultSchemaAttributes.span || []),
      ['className', /^hljs-./],
    ],
    input: [
      ...(defaultSchemaAttributes.input || []),
      ['type', 'checkbox'],
      ['checked'],
      ['disabled'],
    ],
    ul: [
      ...(defaultSchemaAttributes.ul || []),
      ['className', 'contains-task-list'],
    ],
    li: [
      ...(defaultSchemaAttributes.li || []),
      ['className', 'task-list-item'],
    ],
  },
}

interface AssistantMarkdownProps {
  content: string
}

export function AssistantMarkdown({ content }: AssistantMarkdownProps) {
  return (
    <div className="assistant-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          rehypeHighlight,
          [rehypeSanitize, assistantMarkdownSchema],
        ]}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
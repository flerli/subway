# DEVELOPER TEAM RULES

## Before implementing the issue

- Read the codebase in `/src` first in order to understand the existing implementation.
- Read the original `ISSUE_DEFINITION` document at `/project_management/epics/<path to issue definition>`.
- Read the `ISSUE_REPORT` of the previous issue if it exists.

## After implementing the issue

- Document the concrete implementation choices in an `ISSUE_REPORT` for this issue in order to inform a proceeding developer about the work.
- Update `/project_management/EPIC_OVERVIEW.md` by changing the status of the current issue.

## Repository issue metadata

- GitHub repository label: `type/feature`

# ISSUE DEFINITION

## Epic

010 AI ASSISTANT PLATFORM

## Issue Title

005 MARKDOWN TRANSCRIPT RENDERING AND RESPONSE PRESENTATION

## Issue Description

Render assistant responses as safe rich markdown within the Subway chat transcript. This issue shall add support for syntax-highlighted code fences, tables, and task lists while keeping rendered assistant content separate from structured tool-activity UI and preventing unsafe raw HTML execution in the browser.

## Previous Issue Within The Epic

004 MCP TOOL EXECUTION ORCHESTRATION AND RENDERING

## Functional Requirements

1. Assistant message content shall render as markdown in the transcript instead of plain preformatted text.
2. The first release of markdown support shall include headings, paragraphs, links, emphasis, bullet and numbered lists, fenced code blocks, tables, and task lists.
3. Code fences shall render with syntax highlighting so technical responses remain readable.
4. Markdown rendering shall be safe by default and shall not allow arbitrary script execution or unsafe raw HTML injection into the browser.
5. Tool-call activity introduced in the previous issue shall remain structured UI and shall not be flattened into markdown blobs.
6. The transcript shall render partial streaming content gracefully while a message is still arriving.
7. The rendered chat surface shall remain readable on desktop and mobile layouts used by Subway.
8. Any new user-facing static UI copy introduced by markdown presentation controls shall use the shared localization foundation from Epic 004.

## Involved Modules

- Model:
  assistant message markdown payloads, rendering state, streaming partial content state
- View:
  markdown transcript renderer, syntax-highlighted code blocks, table and task-list styles, localized presentation chrome
- Controller:
  safe markdown pipeline, streaming render updates, transcript composition that combines markdown messages with structured tool event UI

## Implementation Plan

1. Introduce a safe markdown rendering pipeline for assistant messages within the chat transcript.
2. Add support for syntax-highlighted fenced code blocks plus styled markdown tables and task lists.
3. Ensure streaming assistant content can rerender incrementally without corrupting the final markdown layout when the turn completes.
4. Keep tool-call activity on its own structured rendering path so markdown rendering is applied only to assistant text content.
5. Add responsive styling so rendered markdown remains legible within the Subway assistant section across supported layouts.
6. Localize any new markdown-related UI chrome through the shared application localization system.

## Test Cases

1. An assistant response containing fenced code, a markdown table, and a task list renders correctly in the transcript.
2. Syntax highlighting is applied to supported code fences without breaking plain-text fallback for unknown languages.
3. Unsafe raw HTML or script content is not executed in the browser when returned by a backend.
4. A streaming markdown response rerenders progressively and settles into the same final layout after completion.
5. Structured tool-call UI continues to render separately from markdown message content when a conversation contains both.
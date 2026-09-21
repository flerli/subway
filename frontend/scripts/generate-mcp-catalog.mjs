#!/usr/bin/env node
/**
 * Generate the backend MCP tool catalog from the widget tool definitions.
 *
 * Why: the MCP server must mirror EVERY widget tool (names, descriptions,
 * argument schemas, approval/redaction flags) without hand-copying them into
 * the backend. The widget definitions are the single source of truth
 * (`frontend/src/widgets/<widget>/mcpTools.ts`, type-checked by the app
 * build); this script compiles those data-only files and emits
 * `backend/mcp/widgetTools.generated.json`.
 *
 * Usage (from the frontend directory / repo root):
 *   npm run generate:mcp-catalog
 * Regenerate whenever widget tools change and commit the JSON — the backend
 * serves it directly and the app build keeps the source honest.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const frontendDirectory = resolve(scriptDirectory, '..')
const repoRoot = resolve(frontendDirectory, '..')
const compiledRoot = join(repoRoot, 'mcp-catalog-dist')
const outputPath = join(repoRoot, 'backend', 'mcp', 'widgetTools.generated.json')

const WIDGETS = [
  'arrival-board',
  'bring',
  'calendar',
  'roborock',
  'todo',
  'weather',
  'youtube',
]

/** Same transformation as the frontend registry (`buildProviderToolName`). */
const buildProviderToolName = (toolName) =>
  toolName
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64)

const buildInputSchema = (argumentDefinitions) => ({
  type: 'object',
  properties: Object.fromEntries(
    argumentDefinitions.map((argument) => [
      argument.key,
      { type: argument.type, description: argument.description },
    ]),
  ),
  required: argumentDefinitions
    .filter((argument) => argument.required === true)
    .map((argument) => argument.key),
  additionalProperties: false,
})

const main = async () => {
  const compile = spawnSync(
    'npx',
    ['tsc', '-p', 'tsconfig.mcp.json'],
    { cwd: frontendDirectory, stdio: 'inherit', shell: false },
  )

  if (compile.status !== 0) {
    console.error('[mcp-catalog] tsc failed — catalog not generated')
    process.exit(compile.status ?? 1)
  }

  const tools = []

  for (const widget of WIDGETS) {
    const modulePath = join(compiledRoot, 'widgets', widget, 'mcpTools.js')
    const module = await import(pathToFileURL(modulePath).href)
    const definitions = Object.values(module).find((value) => Array.isArray(value))

    if (!definitions) {
      console.warn(`[mcp-catalog] ${widget}: no tool array export found — skipping`)
      continue
    }

    for (const definition of definitions) {
      tools.push({
        name: definition.name,
        providerName: buildProviderToolName(definition.name),
        widgetTypeId: widget,
        description: definition.description,
        humanAction: definition.humanAction,
        parityScope: definition.parityScope,
        approvalRequired: definition.approvalRequired === true,
        redactArguments: definition.redactArguments === true,
        redactResults: definition.redactResults === true,
        inputSchema: buildInputSchema(definition.arguments ?? []),
      })
    }
  }

  const payload = {
    generatedBy: 'frontend/scripts/generate-mcp-catalog.mjs',
    sources: `${frontendDirectory}/src/widgets/*/mcpTools.ts`,
    toolCount: tools.length,
    tools,
  }

  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`)
  console.log(
    `[mcp-catalog] wrote ${tools.length} tools to ${outputPath.replace(repoRoot + '/', '')}`,
  )
}

main().catch((error) => {
  console.error('[mcp-catalog] failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
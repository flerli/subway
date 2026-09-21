import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

/**
 * End-to-end tests for the Subway MCP server (SWE-…): a real server process,
 * a minted MCP session key (from the authenticated endpoint), and a real MCP
 * client. Proves agents can list widget tools and execute them in the
 * logged-in user's context.
 */

const here = dirname(fileURLToPath(import.meta.url))
const backendDir = join(here, '..', '..')
const TEST_PORT = 18791
const baseUrl = `http://127.0.0.1:${TEST_PORT}`
const PASSWORD = 'mcp-test-password'

let server = null
let workDir = null
let cookie = ''
let mcpToken = ''

const waitForBoot = async (deadlineMs = 30000) => {
  const startedAt = Date.now()
  while (Date.now() - startedAt < deadlineMs) {
    try {
      const response = await fetch(`${baseUrl}/api/auth/session`)
      if (response.status === 200) {
        return
      }
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 200)
    })
  }
  throw new Error('MCP test server did not boot in time.')
}

const connectClient = async (token) => {
  const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), {
    requestInit: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  })
  const client = new Client({ name: 'subway-mcp-test', version: '1.0.0' })
  await client.connect(transport)
  return client
}

before(async () => {
  workDir = mkdtempSync(join(tmpdir(), 'subway-mcp-'))
  server = spawn('node', ['server.mjs'], {
    cwd: backendDir,
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      BACKEND_DATA_DIR: workDir,
      INITIAL_USER_PASSWORD: PASSWORD,
    },
    stdio: 'ignore',
  })
  await waitForBoot()

  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'flerlage', password: PASSWORD }),
  })
  assert.equal(login.status, 200)
  cookie = (login.headers.get('set-cookie') ?? '').split(';')[0]

  const mint = await fetch(`${baseUrl}/api/assistant/mcp-session`, {
    method: 'POST',
    headers: { Cookie: cookie },
  })
  assert.equal(mint.status, 201)
  const payload = await mint.json()
  mcpToken = payload.mcp.token
  assert.ok(typeof mcpToken === 'string' && mcpToken.length > 10)
})

after(() => {
  try {
    server?.kill('SIGTERM')
  } catch {
    // Best effort.
  }
  if (workDir) {
    rmSync(workDir, { recursive: true, force: true })
  }
})

describe('subway MCP server', () => {
  it('denies unauthenticated and invalid tokens (negative)', async () => {
    await assert.rejects(connectClient(null))
    await assert.rejects(connectClient('definitely-not-a-valid-token'))
  })

  it('lists the user s widget tools (positive)', async () => {
    const client = await connectClient(mcpToken)

    try {
      const { tools } = await client.listTools()
      const names = tools.map((tool) => tool.name)

      assert.ok(names.includes('widget_calendar_get_range_events'), `tools: ${names.join(', ')}`)
      assert.ok(tools.length >= 3, `expected several widget tools, got ${tools.length}`)

      const calendarTool = tools.find((tool) => tool.name === 'widget_calendar_get_range_events')
      assert.ok(calendarTool.description.includes('calendar'))
      assert.deepEqual(calendarTool.inputSchema.required, ['rangeStart', 'rangeEnd'])
    } finally {
      await client.close()
    }
  })

  it('executes a widget tool in the logged-in user s context (positive)', async () => {
    const client = await connectClient(mcpToken)

    try {
      const result = await client.callTool({
        name: 'widget_calendar_get_range_events',
        arguments: { rangeStart: '2026-01-01', rangeEnd: '2026-12-31' },
      })

      assert.ok(!result.isError, JSON.stringify(result))
      const text = result.content?.[0]?.text ?? ''
      const parsed = JSON.parse(text)

      assert.equal(parsed.widgetId, 'calendar')
      assert.ok(Array.isArray(parsed.calendarEvents))
      assert.equal(parsed.rangeStart, '2026-01-01')
    } finally {
      await client.close()
    }
  })

  it('accepts the compound session key form and rejects a mismatched scope (positive + negative)', async () => {
    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'flerlage', password: PASSWORD }),
    })
    const loginPayload = await login.json()
    const userId = loginPayload.user.id

    const scoped = await connectClient(`${mcpToken}:${userId}`)

    try {
      const { tools } = await scoped.listTools()
      assert.ok(tools.length >= 1)
    } finally {
      await scoped.close()
    }

    await assert.rejects(connectClient(`${mcpToken}:someone-else`))
  })

  it('fails closed for unknown tools and approval-gated tools (negative)', async () => {
    const client = await connectClient(mcpToken)

    try {
      const unknown = await client.callTool({
        name: 'widget_does_not_exist',
        arguments: {},
      })
      assert.equal(unknown.isError, true)
      assert.match(unknown.content[0].text, /not available/)

      const gated = await client.callTool({
        name: 'widget_calendar_delete_event',
        arguments: { calendarEventId: 'some-event' },
      })
      assert.equal(gated.isError, true)
      assert.match(gated.content[0].text, /approval/)
    } finally {
      await client.close()
    }
  })
})
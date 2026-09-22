import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Meeting-transport E2E: a fake SCAICO public API + the real Subway backend.
 * Proves the requested wiring: the MCP (url + tools + per-user session key)
 * is injected when the team is initiated, the chat goes through the meeting
 * endpoints instead of the OpenAI-compatible path, and the agent reply lands
 * in the Subway thread.
 */

const here = dirname(fileURLToPath(import.meta.url))
const backendDir = join(here, '..', '..')
const SUBWAY_PORT = 18793
const SCAICO_PORT = 18792
const subwayBase = `http://127.0.0.1:${SUBWAY_PORT}`
const scaicoBase = `http://127.0.0.1:${SCAICO_PORT}`
const MCP_URL = `${subwayBase}/mcp`
const PASSWORD = 'meeting-test-password'
const AGENT_REPLY = 'Bitte sehr: es stehen keine Termine an.'

let subwayServer = null
let scaicoServer = null
let workDir = null
const scaicoCalls = []
const scaicoState = { sent: false, agentMessageId: 2, initTeamPayload: null }

const readJsonBody = async (request) => {
  let raw = ''
  for await (const chunk of request) raw += chunk
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

const startFakeScaico = () =>
  new Promise((resolve) => {
    scaicoServer = createServer(async (request, response) => {
      const url = new URL(request.url, scaicoBase)
      const body = request.method === 'POST' ? await readJsonBody(request) : null
      scaicoCalls.push({ method: request.method, path: url.pathname, body })

      const send = (status, payload) => {
        response.writeHead(status, { 'Content-Type': 'application/json' })
        response.end(JSON.stringify(payload))
      }

      if (url.pathname === '/api/team/t1') {
        return send(200, { team: { team_id: 't1', agents: [{ id: 1, name: 'subway_assistant' }] } })
      }

      if (url.pathname === '/api/agents/1/tools') {
        return send(200, { ok: true })
      }

      if (url.pathname === '/api/init_team') {
        scaicoState.initTeamPayload = body
        return send(200, { meeting_id: 'meeting-1' })
      }

      if (url.pathname === '/api/send_task') {
        scaicoState.sent = true
        return send(200, { task_id: 'task-1' })
      }

      if (url.pathname === '/api/messages/meeting-1') {
        const messages = [
          { id: 1, meetingId: 1, role: 'user', senderId: 'user', content: 'welche termine stehen an?' },
        ]
        if (scaicoState.sent) {
          messages.push({
            id: scaicoState.agentMessageId,
            meetingId: 1,
            role: 'agent',
            senderId: 'subway_assistant',
            content: AGENT_REPLY,
          })
        }
        return send(200, { messages, total: messages.length })
      }

      return send(404, { error: `unhandled ${url.pathname}` })
    })
    scaicoServer.listen(SCAICO_PORT, () => resolve())
  })

const waitForBoot = async (deadlineMs = 30000) => {
  const startedAt = Date.now()
  while (Date.now() - startedAt < deadlineMs) {
    try {
      const response = await fetch(`${subwayBase}/api/auth/session`)
      if (response.status === 200) return
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error('Meeting-transport test server did not boot in time.')
}

before(async () => {
  await startFakeScaico()
  workDir = mkdtempSync(join(tmpdir(), 'subway-meeting-'))
  subwayServer = spawn('node', ['server.mjs'], {
    cwd: backendDir,
    env: {
      ...process.env,
      PORT: String(SUBWAY_PORT),
      BACKEND_DATA_DIR: workDir,
      INITIAL_USER_PASSWORD: PASSWORD,
      SCAICO_API_URL: scaicoBase,
      SCAICO_API_KEY: 'test-scaico-key',
      SCAICO_TEAM_ID: 't1',
      SCAICO_PROJECT_ID: '42',
      SUBWAY_MCP_PUBLIC_URL: MCP_URL,
      ASSISTANT_MEETING_POLL_MS: '100',
      ASSISTANT_MEETING_TIMEOUT_MS: '15000',
      ASSISTANT_BACKEND_ROUTE_ID: 'assistant-default-route',
      ASSISTANT_BACKEND_ROUTE_LABEL: 'E2E',
      ASSISTANT_BACKEND_KIND: 'custom',
      ASSISTANT_BACKEND_BASE_URL: 'http://127.0.0.1:9/v1',
      ASSISTANT_BACKEND_MODEL_IDENTIFIER: 'e2e-model',
      ASSISTANT_BACKEND_ENABLED: 'true',
      ASSISTANT_BACKEND_SUPPORTS_STREAMING: 'false',
      ASSISTANT_BACKEND_SUPPORTS_TOOLS: 'false',
      ASSISTANT_BACKEND_SUPPORTS_MARKDOWN: 'true',
    },
    stdio: 'ignore',
  })
  await waitForBoot()
})

after(() => {
  try {
    subwayServer?.kill('SIGTERM')
  } catch {
    // Best effort.
  }
  try {
    scaicoServer?.close()
  } catch {
    // Best effort.
  }
  if (workDir) {
    rmSync(workDir, { recursive: true, force: true })
  }
})

describe('scaico meeting transport', () => {
  it('injects the subway MCP (tools + session key) and chats via the meeting (positive)', async () => {
    const login = await fetch(`${subwayBase}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'flerlage', password: PASSWORD }),
    })
    assert.equal(login.status, 200)
    const cookie = (login.headers.get('set-cookie') ?? '').split(';')[0]

    const createThread = await fetch(`${subwayBase}/api/assistant/threads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({}),
    })
    assert.equal(createThread.status, 201)
    const { thread } = await createThread.json()

    // Injection runs fire-and-forget after the thread response — wait for it.
    const deadline = Date.now() + 10000
    let attachCall = null
    while (Date.now() < deadline) {
      attachCall = scaicoCalls.find((call) => call.path === '/api/agents/1/tools') ?? null
      if (attachCall) break
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    assert.ok(attachCall, 'expected agent tool attach')
    assert.equal(attachCall.body.mcp_servers[0].url, MCP_URL)
    assert.ok(attachCall.body.mcp_servers[0].tools.includes('widget_calendar_get_range_events'))

    const initTeamCall = scaicoCalls.find((call) => call.path === '/api/init_team')
    assert.ok(initTeamCall, 'expected init_team call')
    const scopedToken = initTeamCall.body.mcp_session_tokens[MCP_URL]
    assert.match(scopedToken, /^.+:user-flerlage$/)
    assert.equal(initTeamCall.body.project_id, 42)

    // Chat turn runs through the meeting endpoints.
    const message = await fetch(`${subwayBase}/api/assistant/threads/${thread.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ content: 'welche termine stehen an?', stream: false }),
    })
    assert.equal(message.status, 201)
    const turn = await message.json()

    assert.equal(turn.assistantMessage.content, AGENT_REPLY)
    assert.equal(turn.userMessage.content, 'welche termine stehen an?')
    assert.ok(scaicoCalls.some((call) => call.path === '/api/send_task'))

    const detail = await fetch(`${subwayBase}/api/assistant/threads/${thread.id}`, {
      headers: { Cookie: cookie },
    })
    const threadDetail = await detail.json()
    assert.equal(threadDetail.messages.length, 2)
    assert.equal(threadDetail.messages[1].content, AGENT_REPLY)
  })
})
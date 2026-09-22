/**
 * SCAICO team integration for the Subway MCP server.
 *
 * Implements the documented flow (`misc/mcp_tool_injection_init_team_howto.md`):
 *   1. resolve the team and its agents          GET  /api/team/{team_id}
 *   2. attach Subway MCP tools to every agent   POST /api/agents/{agent_id}/tools
 *   3. create the meeting with the MCP session  POST /api/init_team
 *      token map (`mcp_session_tokens`)
 *
 * Attachment is additive/idempotent on the SCAICO side and best-effort here:
 * a failed attach must never prevent meeting creation. All calls share the
 * configured API key (per-user overrides are accepted for future use).
 */

export const SCAICO_MCP_TRANSPORT = 'streamable_http'
export const SCAICO_REQUEST_TIMEOUT_MS = 30000

export class ScaicoClientError extends Error {
  constructor(message, { status = 0, errorCode = 'scaico_request_failed' } = {}) {
    super(message)
    this.name = 'ScaicoClientError'
    this.status = status
    this.errorCode = errorCode
  }
}

/** Read the integration config from the environment (empty values = unconfigured). */
export const readScaicoConfig = (env = process.env) => ({
  apiUrl: (env.SCAICO_API_URL ?? 'https://www.scaico.com').replace(/\/+$/, ''),
  apiKey: env.SCAICO_API_KEY ?? '',
  teamId: env.SCAICO_TEAM_ID ?? '',
  projectId: env.SCAICO_PROJECT_ID ?? '',
  mcpPublicUrl: env.SUBWAY_MCP_PUBLIC_URL ?? '',
})

export const isScaicoInjectionConfigured = (config) =>
  Boolean(config.apiKey && config.teamId && config.mcpPublicUrl)

const scaicoRequest = async (
  { apiUrl, apiKey },
  { method, path, body = undefined, timeoutMs = SCAICO_REQUEST_TIMEOUT_MS },
  fetchFn = fetch,
) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchFn(`${apiUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    })

    let payload = null

    try {
      payload = await response.json()
    } catch {
      payload = null
    }

    if (!response.ok) {
      throw new ScaicoClientError(
        typeof payload?.error === 'string'
          ? payload.error
          : `SCAICO request ${method} ${path} failed with status ${response.status}.`,
        { status: response.status, errorCode: 'scaico_request_failed' },
      )
    }

    return payload ?? {}
  } catch (error) {
    if (error instanceof ScaicoClientError) {
      throw error
    }

    throw new ScaicoClientError(
      `SCAICO request ${method} ${path} failed: ${error instanceof Error ? error.message : String(error)}`,
      { errorCode: 'scaico_unavailable' },
    )
  } finally {
    clearTimeout(timeoutId)
  }
}

/** Normalize the team payload into { teamId, agents: [{ id }] }. */
export const normalizeScaicoTeam = (payload) => {
  const team = payload?.team && typeof payload.team === 'object' ? payload.team : payload
  const rawAgents = Array.isArray(team?.agents) ? team.agents : []

  return {
    teamId: typeof team?.team_id === 'string' ? team.team_id : (team?.id ?? ''),
    agents: rawAgents
      .map((agent) => ({
        id: agent?.id ?? agent?.agent_id ?? null,
        name: typeof agent?.name === 'string' ? agent.name : '',
      }))
      .filter((agent) => agent.id !== null && agent.id !== undefined),
  }
}

export const fetchScaicoTeam = async (config, teamId = config.teamId, options = {}) => {
  const payload = await scaicoRequest(config, {
    method: 'GET',
    path: `/api/team/${encodeURIComponent(teamId)}`,
  }, options.fetchFn)

  return normalizeScaicoTeam(payload)
}

/** Attach the Subway MCP server (and tool list) to one agent. */
export const attachSubwayToolsToAgent = async (
  config,
  agentId,
  { tools, mcpUrl = config.mcpPublicUrl, transport = SCAICO_MCP_TRANSPORT },
  options = {},
) =>
  scaicoRequest(config, {
    method: 'POST',
    path: `/api/agents/${encodeURIComponent(String(agentId))}/tools`,
    body: {
      mcp_servers: [
        {
          url: mcpUrl,
          tools,
          transport,
        },
      ],
    },
  }, options.fetchFn)

/**
 * Best-effort: attach the tools to every agent of the team. Returns the
 * per-agent outcome so callers can log partial failures without failing the
 * meeting flow (attachment is additive + idempotent on the SCAICO side).
 */
export const attachSubwayToolsToTeam = async (config, teamId, { tools }, options = {}) => {
  const team = await fetchScaicoTeam(config, teamId, options)
  const results = []

  for (const agent of team.agents) {
    try {
      await attachSubwayToolsToAgent(config, agent.id, { tools }, options)
      results.push({ agentId: agent.id, ok: true })
    } catch (error) {
      results.push({
        agentId: agent.id,
        ok: false,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return { teamId: team.teamId || teamId, agentCount: team.agents.length, results }
}

/**
 * Send a user message into the meeting (SCAICO auto-resumes the session).
 * `POST /api/send_task` with `{meeting_id, text, sender_id}`.
 */
export const sendScaicoMeetingMessage = async (
  config,
  { meetingId, text, senderId = 'user' },
  options = {},
) =>
  scaicoRequest(config, {
    method: 'POST',
    path: '/api/send_task',
    body: {
      meeting_id: meetingId,
      text,
      ...(senderId ? { sender_id: senderId } : {}),
    },
  }, options.fetchFn)

/** Normalize one meeting chat message (SCAICO returns camelCase fields). */
export const normalizeScaicoMeetingMessage = (value) => {
  const candidate = value && typeof value === 'object' ? value : {}

  return {
    id: typeof candidate.id === 'number' ? candidate.id : null,
    role: typeof candidate.role === 'string' ? candidate.role : '',
    senderId: typeof candidate.senderId === 'string' ? candidate.senderId : '',
    content: typeof candidate.content === 'string' ? candidate.content : '',
    createdAt:
      typeof candidate.createdAt === 'string'
        ? candidate.createdAt
        : typeof candidate.created_at === 'string'
          ? candidate.created_at
          : typeof candidate.timestamp === 'string'
            ? candidate.timestamp
            : null,
  }
}

/** List meeting chat messages (optionally only newer than `sinceId`). */
export const fetchScaicoMeetingMessages = async (
  config,
  { meetingId, sinceId = undefined, limit = 200 },
  options = {},
) => {
  const params = new URLSearchParams()

  if (sinceId !== undefined && sinceId !== null) {
    params.set('since_id', String(sinceId))
  }

  if (limit) {
    params.set('limit', String(limit))
  }

  const query = params.size > 0 ? `?${params.toString()}` : ''
  const payload = await scaicoRequest(config, {
    method: 'GET',
    path: `/api/messages/${meetingId}${query}`,
  }, options.fetchFn)
  const rawMessages = Array.isArray(payload?.messages)
    ? payload.messages
    : Array.isArray(payload?.items)
      ? payload.items
      : []

  return rawMessages.map(normalizeScaicoMeetingMessage)
}

/** Gracefully close the meeting session. */
export const shutdownScaicoMeeting = async (config, { meetingId }, options = {}) =>
  scaicoRequest(config, {
    method: 'POST',
    path: '/api/shutdown',
    body: { meeting_id: meetingId },
  }, options.fetchFn)

/**
 * Create the meeting with the MCP session token wired in. Subway scopes the
 * token compound-style (`<token>:<userId>`), mirroring the documented
 * `session_token:project_id` pattern: the MCP server validates the token part
 * and cross-checks the embedded user id.
 */
export const initScaicoTeamWithSubwayMcp = async (
  config,
  { title = undefined, sessionKey, userId, projectId = config.projectId },
  options = {},
) => {
  const body = {
    team_id: config.teamId,
    mcp_session_tokens: {
      [config.mcpPublicUrl]: `${sessionKey}:${userId}`,
    },
  }

  if (projectId) {
    const numericProjectId = Number.parseInt(String(projectId), 10)

    if (Number.isInteger(numericProjectId)) {
      body.project_id = numericProjectId
    }
  }

  if (title) {
    body.title = title
  }

  return scaicoRequest(config, {
    method: 'POST',
    path: '/api/init_team',
    body,
  }, options.fetchFn)
}
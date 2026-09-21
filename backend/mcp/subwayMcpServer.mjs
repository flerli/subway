import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

/**
 * Subway MCP server (widget tools for SCAICO agents).
 *
 * Contract: a stateless Streamable-HTTP MCP endpoint. Every request carries
 * `Authorization: Bearer <mcp session token>`; the injected `resolveSession`
 * maps that token to the logged-in Subway user, and every tool call then
 * executes through `callTool(userId, { toolName, arguments })` so results are
 * scoped to that user's data (their appointments, their lists, …).
 *
 * Why dependency injection: the DB, widget catalog and tool executors live in
 * `server.mjs`; this module stays transport-only and unit-testable without the
 * app database.
 */

export const SUBWAY_MCP_SERVER_NAME = 'subway-widgets'
export const SUBWAY_MCP_SERVER_VERSION = '1.0.0'

/** Extract a bearer token from the Authorization header (case-insensitive). */
export const readBearerToken = (authorizationHeader) => {
  if (typeof authorizationHeader !== 'string') {
    return null
  }

  const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader.trim())
  const token = match?.[1]?.trim() ?? ''

  return token.length > 0 ? token : null
}

const sendUnauthorized = (response) => {
  response.writeHead(401, { 'Content-Type': 'application/json' })
  response.end(
    JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32001, message: 'Unauthorized: missing or invalid MCP session token.' },
      id: null,
    }),
  )
}

/**
 * Handle one HTTP request for the `/mcp` endpoint.
 *
 * @param {import('node:http').IncomingMessage} request
 * @param {import('node:http').ServerResponse} response
 * @param {{
 *   resolveSession: (token: string) => { userId: string, username: string } | null,
 *   listTools: (userId: string) => Array<{ name: string, description: string, inputSchema: object }>,
 *   callTool: (userId: string, call: { toolName: string, arguments: object }) => Promise<{ text: string, isError?: boolean }>,
 *   log?: (event: string, fields: object) => void,
 * }} deps
 */
export const handleSubwayMcpRequest = async (request, response, deps) => {
  const log = deps.log ?? (() => {})

  if (request.method !== 'POST') {
    // Stateless mode: no server-initiated streams, so GET/DELETE are unsupported.
    response.writeHead(405, { 'Content-Type': 'application/json' })
    response.end(
      JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Method not allowed: use POST.' },
        id: null,
      }),
    )
    return
  }

  const token = readBearerToken(request.headers.authorization)
  const session = token ? deps.resolveSession(token) : null

  if (!session) {
    log('mcp.auth.denied', { hasToken: Boolean(token) })
    sendUnauthorized(response)
    return
  }

  const server = new Server(
    { name: SUBWAY_MCP_SERVER_NAME, version: SUBWAY_MCP_SERVER_VERSION },
    { capabilities: { tools: {} } },
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: deps.listTools(session.userId).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  }))

  server.setRequestHandler(CallToolRequestSchema, async (callRequest) => {
    const toolName =
      typeof callRequest.params?.name === 'string' ? callRequest.params.name : ''
    const toolArguments =
      callRequest.params?.arguments &&
      typeof callRequest.params.arguments === 'object'
        ? callRequest.params.arguments
        : {}

    if (!toolName) {
      return {
        isError: true,
        content: [{ type: 'text', text: 'Missing tool name.' }],
      }
    }

    log('mcp.tool.call', { userId: session.userId, toolName })

    try {
      const outcome = await deps.callTool(session.userId, {
        toolName,
        arguments: toolArguments,
      })

      return {
        ...(outcome.isError === true ? { isError: true } : {}),
        content: [{ type: 'text', text: outcome.text }],
      }
    } catch (error) {
      log('mcp.tool.error', {
        userId: session.userId,
        toolName,
        reason: error instanceof Error ? error.message : String(error),
      })

      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Tool execution failed: ${error instanceof Error ? error.message : 'unknown error'}`,
          },
        ],
      }
    }
  })

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })

  response.on('close', () => {
    void transport.close()
    void server.close()
  })

  await server.connect(transport)
  await transport.handleRequest(request, response)
}
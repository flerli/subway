import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  attachSubwayToolsToTeam,
  attachSubwayToolsToAgent,
  fetchScaicoTeam,
  initScaicoTeamWithSubwayMcp,
  isScaicoInjectionConfigured,
  normalizeScaicoTeam,
  readScaicoConfig,
  SCAICO_MCP_TRANSPORT,
} from '../scaicoClient.mjs'

const CONFIG = {
  apiUrl: 'https://scaico.example',
  apiKey: 'test-key',
  teamId: 'subway_assistant_team_mrtna741',
  projectId: '42',
  mcpPublicUrl: 'https://client.scaico.com/subway/mcp',
}

const makeFetch = (handler) => {
  const calls = []
  const fetchFn = async (url, init) => {
    const call = { url, init }
    calls.push(call)
    const result = handler(call)
    return {
      ok: result.status ? result.status < 400 : true,
      status: result.status ?? 200,
      json: async () => result.body ?? {},
    }
  }
  return { calls, fetchFn }
}

describe('scaico config', () => {
  it('reads env overrides with sane defaults (positive)', () => {
    const config = readScaicoConfig({})
    assert.equal(config.apiUrl, 'https://www.scaico.com')
    assert.equal(config.apiKey, '')
    assert.equal(isScaicoInjectionConfigured(config), false)

    assert.equal(isScaicoInjectionConfigured(CONFIG), true)
  })
})

describe('normalizeScaicoTeam', () => {
  it('accepts both team shapes and drops agentless entries (positive + negative)', () => {
    const shaped = normalizeScaicoTeam({
      team: { team_id: 'team-1', agents: [{ id: 1, name: 'lead' }, { name: 'no id' }] },
    })
    assert.equal(shaped.teamId, 'team-1')
    assert.deepEqual(shaped.agents, [{ id: 1, name: 'lead' }])

    assert.deepEqual(normalizeScaicoTeam(null), { teamId: '', agents: [] })
  })
})

describe('fetchScaicoTeam', () => {
  it('calls the documented endpoint with the API key (positive)', async () => {
    const { calls, fetchFn } = makeFetch(() => ({
      body: { team: { team_id: CONFIG.teamId, agents: [{ id: 7 }] } },
    }))
    const team = await fetchScaicoTeam(CONFIG, CONFIG.teamId, { fetchFn })

    assert.equal(calls[0].url, `${CONFIG.apiUrl}/api/team/${CONFIG.teamId}`)
    assert.equal(calls[0].init.headers['X-API-Key'], 'test-key')
    assert.deepEqual(team.agents, [{ id: 7, name: '' }])
  })

  it('surfaces API errors (negative)', async () => {
    const { fetchFn } = makeFetch(() => ({ status: 403, body: { error: 'forbidden' } }))
    await assert.rejects(
      fetchScaicoTeam(CONFIG, CONFIG.teamId, { fetchFn }),
      /forbidden/,
    )
  })
})

describe('attachSubwayToolsToAgent', () => {
  it('sends the documented mcp_servers payload (positive)', async () => {
    const { calls, fetchFn } = makeFetch(() => ({ body: { ok: true } }))
    await attachSubwayToolsToAgent(CONFIG, 7, {
      tools: ['widget_calendar_get_range_events'],
    }, { fetchFn })

    assert.equal(calls[0].url, `${CONFIG.apiUrl}/api/agents/7/tools`)
    assert.deepEqual(JSON.parse(calls[0].init.body), {
      mcp_servers: [
        {
          url: CONFIG.mcpPublicUrl,
          tools: ['widget_calendar_get_range_events'],
          transport: SCAICO_MCP_TRANSPORT,
        },
      ],
    })
  })
})

describe('attachSubwayToolsToTeam', () => {
  it('attaches to every agent and tolerates partial failures (negative: best-effort)', async () => {
    const { calls, fetchFn } = makeFetch((call) => {
      if (call.url.includes('/api/team/')) {
        return { body: { team: { team_id: 't1', agents: [{ id: 1 }, { id: 2 }] } } }
      }
      if (call.url.includes('/api/agents/2/')) {
        return { status: 500, body: { error: 'boom' } }
      }
      return { body: {} }
    })

    const outcome = await attachSubwayToolsToTeam(CONFIG, 't1', {
      tools: ['a', 'b'],
    }, { fetchFn })

    assert.equal(outcome.agentCount, 2)
    assert.deepEqual(outcome.results.map((entry) => entry.ok), [true, false])
    assert.match(outcome.results[1].message, /boom/)
    assert.equal(calls.filter((call) => call.url.includes('/tools')).length, 2)
  })
})

describe('initScaicoTeamWithSubwayMcp', () => {
  it('creates the meeting with the compound MCP session token (positive)', async () => {
    const { calls, fetchFn } = makeFetch(() => ({
      body: { meeting_id: 'meeting-1' },
    }))
    const result = await initScaicoTeamWithSubwayMcp(CONFIG, {
      title: 'Subway voice',
      sessionKey: 'secret-key',
      userId: 'user-flerlage',
    }, { fetchFn })

    assert.equal(result.meeting_id, 'meeting-1')
    assert.equal(calls[0].url, `${CONFIG.apiUrl}/api/init_team`)
    assert.deepEqual(JSON.parse(calls[0].init.body), {
      team_id: CONFIG.teamId,
      project_id: 42,
      title: 'Subway voice',
      mcp_session_tokens: {
        [CONFIG.mcpPublicUrl]: 'secret-key:user-flerlage',
      },
    })
  })

  it('omits project_id when not configured (negative)', async () => {
    const { calls, fetchFn } = makeFetch(() => ({ body: {} }))
    await initScaicoTeamWithSubwayMcp(
      { ...CONFIG, projectId: '' },
      { sessionKey: 'k', userId: 'u' },
      { fetchFn },
    )
    assert.equal('project_id' in JSON.parse(calls[0].init.body), false)
  })
})
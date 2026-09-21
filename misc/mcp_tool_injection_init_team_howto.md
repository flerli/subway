# How to inject MCP tools into agents when starting a meeting (`init_team`)

This guide describes the **generic mechanism** for giving a SCAICO team's
agents MCP tools at the moment a meeting is created via
`POST /api/init_team`. It explains the pattern and the API calls involved;
concrete tool lists, URLs, and role sets are your per-deployment
configuration and are intentionally not part of this document.

---

## 1. The core idea

A meeting runs against a **team** that has **agents**. Agents can only use
MCP tools that are configured on them. `init_team` builds the meeting
blueprint from the *stored agent configuration*. Therefore:

> **Tools must be attached to the team's agents BEFORE `init_team` is called.**

The second key fact that shapes the mechanism:

> SCAICO's tool-attach endpoint is **additive and idempotent** — it can add
> tools to an agent but can never remove any. If you need to take tools away,
> you must do that with a separate call (typically a PATCH on the agent that
> replaces its `tool_ids`).

---

## 2. The generic flow (sequence)

```
1. Meeting request arrives (client asks to create a meeting for a team)
        │
2. Resolve the team          GET  /api/team/{team_id}
        │  → agents, team_leader_id
3. Role classification
        │  → for each agent decide its role (e.g. lead / member)
4. Attach tools per agent    POST /api/agents/{agent_id}/tools
        │      { "mcp_servers": [ { "url": <mcp server url>,
        │                          "tools": [ ... ],
        │                          "transport": "streamable_http|sse" } ] }
5. (Optional) Revoke tools   GET  /api/agents/{agent_id}
        │                    PATCH /api/agents/{agent_id}   { "tool_ids": [...] }
6. Create the meeting        POST /api/init_team
        │      { "team_id": ..., "project_id": ...,
        │        "mcp_session_tokens": { "<mcp url>": "<token>" } }
7. Agents use the tools inside the meeting
```

### Step 2 — Resolve the team

Fetch the team definition to learn its agent list and its leader marker.

- `GET /api/team/{team_id}`

Expected data: `agents` (each with an identifier used by the agent endpoints)
and `team_leader_id` (or an equivalent role marker).

### Step 3 — Role classification

For each agent, decide which tool set it should get. A common pattern is a
two-way split:

- the **team leader** (identified by a role field, e.g. `type ==
  "team_leader"`, or by matching `team_leader_id`) gets the coordinating /
  management tool set,
- every other agent gets a different (usually more restricted) set.

The classification decides what you pass in Step 4 — the mechanism itself is
independent of how many roles you define.

### Step 4 — Attach tools to each agent

For each agent, ensure the MCP server and its tool list exist on the agent:

```
POST /api/agents/{agent_id}/tools
{
  "mcp_servers": [
    {
      "url":       "<mcp server url>",
      "tools":     ["<tool_a>", "<tool_b>", ...],
      "transport": "streamable_http"      // or "sse"
    }
  ]
}
```

Properties:

- The MCP server is resolved **get-or-create by URL**, so you don't have to
  pre-register it.
- The call is **idempotent**: running it again does no harm and simply
  ensures the listed tools exist.
- It is **additive**: everything the agent already had stays. It will also
  keep tools that you no longer want (see Step 5).

### Step 5 — (Optional) Revoke unwanted tools

Because the attach endpoint is additive-only, an agent can still carry tools
that a previous configuration granted (e.g. from an older blueprint or a
manual setup). If those tools must not be available in freshly created
meetings, remove them explicitly before `init_team`:

1. `GET /api/agents/{agent_id}` — returns the agent's current tools with ids.
2. Compute the `tool_ids` to keep (drop the forbidden ones).
3. `PATCH /api/agents/{agent_id}` with `{ "tool_ids": [ ... ] }`.

Performing this *before* `init_team` matters, because the meeting blueprint
is built from the stored agent configuration at creation time.

### Step 6 — Create the meeting

Now that the agent tool sets are correct, create the meeting:

```
POST /api/init_team
{
  "team_id":   "<team_id>",
  "project_id": <scaico project id>,
  "title":     "<meeting title>",
  "mcp_session_tokens": {
    "<mcp server url>": "<session token, optionally scoped: token:project_id>"
  }
}
```

`mcp_session_tokens` wires the meeting's agents to your MCP server and
carries the authentication/scope context the tools will use later. The
session token is typically a user-bound token; appending the project scope
(e.g. `session_token:project_id`) lets the MCP server enforce that the
agents only operate within that project.

### Step 7 — Agents use the tools

From this point on, agents in the meeting can call the attached MCP tools.
Calls hit your MCP server using the session token provided in Step 6.

---

## 3. Implementation checklist

1. Single place that maps **role → tool set** (two lists: lead set, member
   set, plus an explicit "forbidden" list for tools that must never be
   auto-assigned to members).
2. A function that, given a team id, iterates its agents, classifies roles,
   and attaches the matching tool set to each agent (**Step 2–4**).
3. If tools must be revocable: a revoke step (**Step 5**) that replaces the
   agent's `tool_ids` via PATCH, because the attach endpoint is additive.
4. Call the attach (and revoke) logic **inside or right before** the
   `init_team` call so the meeting blueprint always snapshots the final
   configuration.
5. Make the attach phase **best-effort**: if tool configuration fails, log
   it but still create the meeting (a meeting without tools is better than
   no meeting at all).
6. Register the tools on your MCP server. Attaching a tool that the server
   does not expose simply makes it unavailable at call time — the attach
   itself will still succeed.

---

## 4. Properties and caveats (generic)

- **Additive attach, revoke via replace**: `POST /api/agents/{id}/tools`
  only adds; removals require `PATCH /api/agents/{id}` with the remaining
  `tool_ids`.
- **Order matters**: attach/revoke happen **before** `init_team`, because
  the meeting snapshots the stored agent configuration.
- **Idempotent**: repeating the attach is safe; a new meeting re-runs it to
  guarantee the configured state.
- **Failure isolation**: tool injection failures should never prevent the
  meeting from starting.
- **Per-user credentials**: if users can override the SCAICO project/API
  key, forward that override to every call (team resolve, attach, revoke,
  init_team) so the whole sequence runs with the same identity.
- **Per-agent, not per-meeting**: tools live on the agents; `init_team` only
  snapshots them. Re-running the attach for every meeting keeps the setup
  self-healing.
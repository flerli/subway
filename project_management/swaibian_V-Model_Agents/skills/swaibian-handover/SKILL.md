---
name: swaibian-handover
description: Write swaibian-one V-Model completion reports and handoffs that the next team can actually build on.
---

# swaibian-handover

Standard for `TC-X-YY_COMPLETION_REPORT.md` — the handoff the next team
(Task 0.1) reads before touching anything. Generic handovers
("add notes for successor") are a review FAIL.

## Required sections (in order)

1. **What Was Built** — New Files table (path → specific purpose) +
   Changed Files table (path → what/why) + APIs/Contracts (module →
   `method(params): return` list). Every entry names the requirement it serves.
2. **Key Decisions** — decision → rationale (+ ADR ref if created). Include
   deviations from the issue plan and why.
3. **Gate Results** — pre-check (0.2) vs post-impl (N+1) table: tests
   (total/pass/fail/skip), coverage % vs baseline, typecheck errors, lint
   errors. Skipped gates need a documented reason.
4. **Handoff for TC-X-{YY+1} ("successor title")** — MUST contain:
   - Entry point: file to start from + what to do with it.
   - **Wiring chain**: entry → … → new code, one `file:line` per hop, plus
     how to trigger it in the running app (route URL, button path, MCP tool
     name, CLI command). If wiring is intentionally deferred, name the owner
     issue here — otherwise the handoff is incomplete.
   - What you inherit: APIs/modules/contracts + import paths + short usage example.
   - What is NOT implemented yet (stubs) + which future issue owns each.
   - Exact test commands + working directory.
   - Known limitations/edge cases, open risks/questions.
5. **Traceability** — SYS1 (epic) / SWE1 (TC-00) / SWE3 (this issue) /
   SWE4 (test file paths).

## Content by work type (Rule 3)

| Work Type | Handoff MUST include |
|-----------|---------------------|
| API/tools | Endpoint/tool names, payload shapes, auth (per-user?), error codes |
| Schema change | Column/field names, migration steps, backward compat |
| Infrastructure | Service location, config, instantiation + lifecycle owner |
| UI components | Props, state management, events |
| Protocol/contract | Message/frame types, sequencing, error handling |
| Review issue | Findings table, fixes applied, arch files changed, integration tests added |

## Review verdict appendix (swaibian-review OWNS this section)

`swaibian-review` appends `## Review verdict (round N)`: PASS/FAIL, reviewed
ref, verification evidence (command + exit code + excerpt), blocking items
(`file:line` → what → why it blocks → suggested fix, never applied), and
for FAIL the exact handoff sentence back to `swaibian-impl`. `swaibian-impl`
never edits this section.

## Self-verification appendix (`no-reviews` TCs)

In a `no-reviews` TC there is no reviewer. `swaibian-impl` appends
`## Self-verification (no-reviews mode)` to the completion report instead:
gate table (command → exit code → result), requirement → `file:line` → test
traceability, wiring-chain proof, residual risks/limitations/open questions,
and the line "Independent review intentionally omitted — TC-X is declared
`no-reviews`; gap analysis is inherited by the TC closer (name it)."
`swaibian-review` does not append verdicts in these TCs (guard in that agent).

## Ownership

- `swaibian-impl` writes §§1–5. `swaibian-review` writes only the verdict
  appendix (plus full reports for SWE5 review issues). In `no-reviews` TCs,
  `swaibian-impl` also writes the self-verification appendix and
  `swaibian-review` writes nothing.
- After handoff, the driver updates `TC-X-00_COMPONENT_DEFINITION.md`:
  issue row status, new decisions, arch-doc revision note if applicable.
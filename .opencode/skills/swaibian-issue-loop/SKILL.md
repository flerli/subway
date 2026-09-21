---
name: swaibian-issue-loop
description: Work a swaibian-one V-Model TC issue-by-issue with the impl->review->fix->document ping-pong until the TC is done.
---

# swaibian-issue-loop

The standard loop for executing a Technical Component in
`project_management/epics/EPIC_YYY/TC_X_<SUMMARIZED_CONTENT>/` (never bare
`TC_X/`).
Both `swaibian-impl` and `swaibian-review` follow it. The agent the user invoked
**drives**; the other is called via the Task tool.

## 0. Entry ("work on TC-X of EPIC_YYY")

1. Resolve the TC dir: `project_management/epics/EPIC_YYY/TC_X_<SUMMARIZED_CONTENT>/`.
   If it does not exist, STOP and ask the user (never guess paths).
2. Read `TC-X-00_COMPONENT_DEFINITION.md` end to end (goal, responsibilities,
   integration points, instantiation map, issues table, acceptance plan).
   Note its **review mode**: `impl-review-loop` or `no-reviews` ("no-reviews
   variant", "no SWE5 review issue", `**Review Mode**: no-reviews`). Ambiguous
   → ask the user.
3. Work the Issues table **top to bottom**. Skip a row only if it is
   `✅ Complete` AND its `TC-X-YY_COMPLETION_REPORT.md` exists and is filled
   (not a stub). Otherwise (re)do the issue.

## 1. Per SWE3 implementation issue (swaibian-impl leads)

1. `swaibian-impl` executes the issue file task-by-task (0.0 arch docs →
   0.1 predecessor → 0.2 test gate → implementation → N+1 gates →
   N+2 completion report + TC-00 update).
2. `impl-review-loop` TCs: `swaibian-impl` writes `TC-X-YY_COMPLETION_REPORT.md`
   (see `swaibian-handover` skill) and calls `swaibian-review` via Task with:
   issue path, round number, gate evidence (command + exit code),
   files-changed → requirements map.
   `no-reviews` TCs: **no Task call** — `swaibian-impl` (or the explicit
   `swaibian-impl-no-reviews`) self-verifies per STEP E-NR and writes
   `## Self-verification (no-reviews mode)` instead of the verdict; skip to
   step 6.
3. `swaibian-review` verifies and appends a `## Review verdict (round N)` section
   to the completion report: PASS or FAIL + evidence + blocking items with
   `file:line` (never edits source). It refuses in `no-reviews` TCs (guard in
   `swaibian-review`).
4. FAIL (round 1–2) → `swaibian-impl` fixes **only** the blocking items, re-runs
   gates, hands back (round++). FAIL at round 3 → add `Escalation: HUMAN`,
   stop the loop, report to the user. Do not loop on your own.
5. PASS requires wiring proof: `swaibian-review` has traced entry → new code →
   observable effect and verified the TC-00 instantiation-map rows for the
   issue. "Works in isolation" is not PASS.
6. PASS (or self-verified) → the driver marks the issue row ✅ in `TC-X-00`,
   logs decisions, moves to the next issue.

## 2. Per SWE5 review issue, every 5th (`impl-review-loop` TCs only; swaibian-review leads)

1. `swaibian-review` drives: reads all 4 predecessor reports, runs the suite,
   does code review + gap analysis (Rule 8 escalation: 2nd deferral → MEDIUM,
   fix now; 3rd → HIGH, blocks).
2. `swaibian-review` calls `swaibian-impl` via Task for each fix batch (same
   3-round rule), then completes the docs phase itself: Mermaid diagrams, ADRs
   (or explicit no-ADR notes), traceability matrix + coverage map, architecture
   README (`Last updated by: TC-X-YY`).
3. `swaibian-review` writes integration tests (cross-module, real bootstrap
   path — bare `new` does not count) and runs the SYS3 smoke on the **last**
   review of the TC (start the stack, trigger the feature, verify output).
   Unexercisable feature = HIGH finding.
4. PASS → both agents update `TC-X-00` (status, decisions, arch revision row).

## 3. TC completion

1. Every issue row ✅, every completion report filled (no stubs), acceptance
   plan criteria evidenced.
2. Wiring audit: every module created in the TC is reachable from a real
   entry point (or has a named owner issue recorded); every instantiation-map
   row verified true; no orphan files.
3. Driver runs the full suite + typecheck one last time, updates `TC-X-00`
   `Status` to ✅ Complete (TC-boundary review semantics live here until a
   dedicated TC-closer exists), and reports to the user: per-issue PASS table,
   gate totals, arch files changed, remaining risks.

## Gates (every issue, no exceptions)

| Gate | Command (from repo root) | Level |
|------|--------------------------|-------|
| Tests | `make test-model`, `make test-controller` (+ component target) | 🔴 MANDATORY, 0 failures |
| Typecheck | `make build-view` (`tsc -b`) | 🔴 MANDATORY, 0 new errors |
| Lint | `cd src/view && npm run lint` (oxlint) |  ADVISORY on TC-X-01, 🔴 from TC-X-02 |
| Frontend E2E | `make test-view-e2e` (Playwright) |  CONDITIONAL |
| Coverage | project runner evidence | 🔴 must not regress vs 0.2 baseline |

## Never

- Skip the review call in an `impl-review-loop` TC ("tests pass, ship it").
- Call `swaibian-review` (or any other subagent) in a `no-reviews` TC —
  self-verify per STEP E-NR instead.
- Work two issues in parallel in one TC (predecessor chain is sequential).
- Edit files outside the TC dir except `architecture/**` + `traceability/**`
  (review issues only, docs only).
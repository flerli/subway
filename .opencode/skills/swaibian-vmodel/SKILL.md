---
name: swaibian-vmodel
description: V-Model planning rules for swaibian-one. Use when creating Discovery Briefs, epics, TCs, issues, ADRs, or architecture docs under project_management.
---

# Swaibian One V-Model Skill

Rulebook for swaibian-one planning (`src/model` Django, `src/controller`
FastAPI, `src/view` React/Vite). Agents must follow this; templates live in
`project_management/swaibian_V-Model_Agents/_templates/`.
Auth and identity code lives in `src/controller/api_key_auth.py` and
`src/controller/mcp_auth.py`; architecture decisions are recorded as ADRs in
`project_management/architecture/decisions/`.

## Documentation layers (where things go)

- Feature idea + requirements Q&A -> `project_management/epics/EPIC_XXX_NAME/DISCOVERY_BRIEF.md` (from `DISCOVERY_BRIEF_TEMPLATE.md`)
- Epic (SYS1) + system architecture (SYS2) -> `project_management/epics/EPIC_XXX_NAME.md` (from `EPIC_TEMPLATE.md`), index in `project_management/epics/EPIC_OVERVIEW.md`
- Component (SWE1) -> `project_management/epics/EPIC_XXX/TC_X_<SUMMARIZED_CONTENT>/TC-X-00_COMPONENT_DEFINITION.md`
- Implementation issue (SWE3) -> `TC-X-YY_TITLE.md` (from `ISSUE_TEMPLATE.md`)
- Review issue every 5th (SWE5) -> `TC-X-YY_REVIEW_AND_ARCHITECTURE.md` (from `REVIEW_ISSUE_TEMPLATE.md`); updates diagrams, ADRs, traceability, integration tests
- Completion per issue -> `TC-X-YY_COMPLETION_REPORT.md` (from `COMPLETION_REPORT_TEMPLATE.md`)
- Architecture -> `project_management/architecture/` per `ARCHITECTURE_DOC_GUIDE.md`: `README.md`, `diagrams/`, `traceability/requirements-matrix.md`, `decisions/ADR-NNN-*.md`
- Technical decisions with lasting impact -> ADR (`decisions/ADR-NNN-*.md`), linked from epic + architecture README. Never bury decisions in chat only.
- Full process: `_templates/V_MODEL_FRAMEWORK.md`. Handover chain: `_templates/HANDOVER_CHAIN_RULES.md` (Task 0.0 read arch docs, 0.1 read predecessor report, 0.2 run tests; final task = specific handoff).

## Gates (swaibian-one: Django + FastAPI + FastMCP + React/TypeScript)

- SWE4 unit: MANDATORY — `make test-model`, `make test-controller` (plus the
  touched component target, e.g. `make test-work`, `make test-scaico`),
  0 failures.
- SWE4-BUILD typecheck: MANDATORY — `make build-view` (`tsc -b`), 0 new errors.
- SWE4-LINT: ADVISORY on TC-X-01, MANDATORY from TC-X-02 —
  `cd src/view && npm run lint` (oxlint).
- SWE5 integration: MANDATORY on every 5th issue.
- SYS3 smoke: MANDATORY on last review issue per TC (start the stack —
  `make run-model`, `make run-controller`, `make run-view` — or use
  `make test-view-e2e` / `make smoke-stack`, then exercise the feature).
- Auth rule: every new endpoint/tool/connector tests per-user denial, session
  isolation, and no token leakage (`src/controller/api_key_auth.py`,
  `src/controller/mcp_auth.py`).

## Batch cycle

4x implementation (SWE3) + 1x review (SWE5), repeating (05, 10, 15...).
TC < 5 issues: last issue inherits review duties. TC 6-9: issue 05 is review,
last issue reviews the remainder. No-reviews variant (`**Review Mode**:
no-reviews`): no SWE5 issues at all — every issue is SWE3, `swaibian-impl`
self-verifies per STEP E-NR, and each TC's last issue is the closer.
# ISSUE REPORT

## Epic

011 MCP TOOL INTERFACE

## Issue

007 GENERIC WIDGET IMPLEMENTATION GUIDE AND ISSUE WORKFLOW EXTENSION

## Implementation Summary

The generic widget workflow documentation was finalized for the MCP rollout.

Two project-management guides now define the expected implementation and planning contract for all future widget work:

- `/project_management/WIDGET_IMPLEMENTATION_GUIDE_generic.md`
- `/project_management/ISSUE_CREATION_GUIDE_generic.md`

The widget implementation guide now documents:

- the baseline widget contract
- shared assistant-runtime MCP exposure rules
- human-parity mapping expectations
- assistant discovery expectations
- settings-panel and tool-log expectations
- human-in-the-loop approval rules
- localization ownership rules
- deferred-scope documentation rules

The issue creation guide now documents that widget issue definitions with MCP scope shall explicitly cover:

- parity scope
- assistant discovery through shared runtime registration
- settings-panel impact
- persisted tool-call logging impact
- approval behavior
- deferred capabilities that are intentionally out of scope

## Workflow Additions

This issue added explicit parity-authoring guidance rather than leaving future developers to infer it from prior implementation reports.

The documentation now requires a future widget issue to make it clear:

- which human-visible actions are covered by MCP tools
- which tools are read, configuration, mutation, destructive, or integration-oriented
- which tools require approval
- which capabilities are intentionally deferred and why

That closes the remaining workflow gap from the earlier Epic 011 issues: the runtime exists, but future issue definitions now have a written standard for how to plan and justify MCP scope before implementation starts.

## Notes For Next Work

Future widget issues can use the dedicated parity-map guidance to keep rollout decisions reviewable.
If a later issue introduces a widget that still relies on browser-only affordances or binary media capture, the deferred-scope section should explain why no truthful MCP tool exists yet.

## Validation

Validated with:

- editor error checks on the updated project-management markdown files
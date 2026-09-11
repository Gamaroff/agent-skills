---
id: task.118.plan
title: "Implementation Plan: the engine reports the count"
type: plan
task-ref: task.118.probes-executed-from-engine.md
---

# Implementation Plan: the engine reports the count

> Requirements and success criteria: [task.118.probes-executed-from-engine.md](task.118.probes-executed-from-engine.md)

## Overview
Carry a number from the component that counted to the component that reports; make the hand-typed path unrepresentable.

## Phase-by-Phase Implementation Guide
### Phase 1 — record: `security-probe.run.json` `{version:1, sinks:[{sink, executed, reproduced, verdict}], totals:{executed, reproduced}}` written next to the review report path the CLI already receives.
### Phase 2 — readers: replace "fill in `probes_executed`" with a `command node … --emit-block <record>` that prints the YAML block; the skill pastes engine output, never types it.
### Phase 3 — population test: `git grep -n 'probes_executed' -- 'skills/*/SKILL.md' 'shared/resources/*.md'` → for each site, assert `--emit-block` or the record name within ±5 lines, or allowlist by path+line with a reason.

## Key Patterns and References
`stakeholder-summary-cli.js` (task.106) — the pattern of an engine printing a block the prose pastes verbatim. `docs/reference/anti-patterns.md` §population check.

## Testing Approach
Contract test runs the engine; mutation deletes the record.

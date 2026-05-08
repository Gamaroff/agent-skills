---
id: task.25.plan
title: "Implementation Plan: pipeline Phase 0 parallel fan-out"
type: plan
task-ref: task.25.pipeline-phase-0-parallel-fanout.md
---

# Implementation Plan — Task 25

> Requirements and success criteria: [task.25.pipeline-phase-0-parallel-fanout.md](task.25.pipeline-phase-0-parallel-fanout.md)

## Overview

Refactor Phase 0 to dispatch existing story resolver + new tracker poller (task.23) + lite-mode/board detector in a single parallel message.

## Phase 1 — Independence audit

Confirm in `develop-pipeline-step-0-resolve-and-prepare.md` that:
- Story resolver output (resolved file path) is **not** required by tracker poller (poller uses frontmatter from caller-provided issue/PR if any, falls back to "no PR yet")
- Lite-mode detector reads only `skills-config.yaml` and story frontmatter
- Board state detector reads tracker, can be merged into tracker poller dispatch

Net: 3 independent dispatches. If any consumer needs resolver output, leave as serial post-step.

## Phase 2 — Refactor dispatch

Replace serial section in step-0 reference with:

```markdown
**Phase 0 — Parallel setup**

Dispatch in single message:
1. Explore: story resolver (existing prompt)
2. Explore: tracker state poller (task.23 prompt)
3. Explore: lite-mode + board detector (read skills-config.yaml + story frontmatter)

Aggregate 3 results. Single lock-file write with combined fields.
```

## Phase 3 — Failure handling

Document: if any one fails, main proceeds with degraded info. Tracker poller failure → tracker fields set null in lock. Resolver failure → halt (cannot continue without story path).

## Phase 4 — Validation

Profile: baseline vs new wall-clock on Phase 0 alone. Target ≥50% reduction.

## Key References

- `develop-pipeline-step-0-resolve-and-prepare.md` (current serial flow)
- Lock-file schema: same SKILL.md (lines 121-126)
- task.23 tracker poller dependency

## Testing Approach

1. Real run, baseline vs new wall-clock
2. Inject `gh` 403 → tracker fields null, others succeed
3. Inject malformed story path → resolver halts, others' results discarded cleanly

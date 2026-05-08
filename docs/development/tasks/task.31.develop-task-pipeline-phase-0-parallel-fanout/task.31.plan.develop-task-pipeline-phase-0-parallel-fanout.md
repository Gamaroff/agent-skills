---
id: task.31.plan
title: "Implementation Plan: develop-task pipeline Phase 0 parallel fan-out"
type: plan
task-ref: task.31.develop-task-pipeline-phase-0-parallel-fanout.md
---

# Implementation Plan — Task 31

> Requirements and success criteria: [task.31.develop-task-pipeline-phase-0-parallel-fanout.md](task.31.develop-task-pipeline-phase-0-parallel-fanout.md)

## Overview

Mirror of [task.25 plan](../task.25.pipeline-phase-0-parallel-fanout/task.25.plan.pipeline-phase-0-parallel-fanout.md). Refactor develop-task Phase 0 to single-message parallel dispatch.

## Phase 1 — Independence audit

Confirm in `skills/develop-task/SKILL.md` Phase 0 that:
- Task resolver output (resolved file path) not required by tracker poller (poller uses caller-provided issue/PR or "no PR yet")
- Lite-mode detector reads only `skills-config.yaml` + task frontmatter

If any sequencing required, document and exclude from fan-out.

## Phase 2 — Refactor dispatch

Replace serial Phase 0 in develop-task SKILL.md with:

```markdown
**Phase 0 — Parallel setup**

Dispatch in single message:
1. Explore: task resolver
2. Explore: tracker state poller (task.23)
3. Explore: lite-mode detector
```

Aggregate; single lock-file write.

## Phase 3 — Failure handling

Resolver failure → halt. Other failures → degraded info; lock fields null.

## Testing

Wall-clock baseline vs new. Target ≥50% reduction. Inject `gh` 403; confirm tracker fields null but other dispatches succeed.

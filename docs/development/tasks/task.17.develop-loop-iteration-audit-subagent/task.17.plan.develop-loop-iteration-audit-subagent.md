---
id: task.17.plan
title: "Implementation Plan: develop-loop iteration audit subagent"
type: plan
task-ref: task.17.develop-loop-iteration-audit-subagent.md
---

# Implementation Plan — Task 17

> Requirements and success criteria: [task.17.develop-loop-iteration-audit-subagent.md](task.17.develop-loop-iteration-audit-subagent.md)

## Overview

Replace inline story re-read + git log capture in develop-loop with a single Explore subagent dispatched per iteration. Returns JSON consumed by stall detector.

## Phase 1 — Define audit prompt

Append to `shared/resources/develop-pipeline-step-3-develop-loop.md` near the LOOP body (lines 84-104). Stall-detection logic itself lives in `shared/resources/develop-pipeline-resume-contract.md` lines 88-103.

```
DISPATCH (Explore, read-only):
  Read <story_path>.
  From `## Tasks` section, count `[x]` and total task lines → completed, total.
  Extract `Status:` field value.
  Run `git log -1 --format=%H` → last_commit_hash.
  Return JSON only:
    {"status":"...","completed":N,"total":M,"last_commit_hash":"..."}
```

## Phase 2 — Wire into loop

Replace the inline read instructions in `shared/resources/develop-pipeline-step-3-develop-loop.md` (LOOP body, lines 84-104 — applies to both develop-story and develop-task variants) and update stall-progress comparison in `shared/resources/develop-pipeline-resume-contract.md` lines 88-103 with:
1. Pre-iteration: dispatch audit, store as `INITIAL_STATE`
2. Each iteration end: dispatch audit, compare `current.completed > prev.completed` OR `current.last_commit_hash != prev.last_commit_hash`
3. No progress → halt
4. JSON parse failure → 1 retry, then halt with logged warning

## Phase 3 — Resume contract update

`shared/resources/develop-pipeline-resume-contract.md`: document that resume reads the most recent audit JSON from `.summaries/` (depends on task.26 — pipeline subagent summary artifacts) instead of re-running the audit subagent.

## Key References

- LOOP body currently at `shared/resources/develop-pipeline-step-3-develop-loop.md:84-104` (re-read at line 89 / 99 for story / task variants)
- Stall detector pseudocode at `shared/resources/develop-pipeline-resume-contract.md:88-103`
- Lock-file `current_step` pattern: `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`

## Testing Approach

1. 3-iteration story → audit dispatched 4× (initial + 3); progress detected each time
2. Stall scenario (no checkbox change, no new commit) → halt at iteration 2
3. Inject malformed JSON → confirm 1-retry then halt with warning entry in implementation report

---
id: task.31.plan
title: "Implementation Plan: develop-task pipeline Phase 0 parallel fan-out (verification)"
type: plan
task-ref: task.31.develop-task-pipeline-phase-0-parallel-fanout.md
---

# Implementation Plan — Task 31 (verification)

> Requirements and success criteria: [task.31.develop-task-pipeline-phase-0-parallel-fanout.md](task.31.develop-task-pipeline-phase-0-parallel-fanout.md)

## Overview

Task.25 implemented Phase 0 parallel fan-out in `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` (section `0a-parallel`, line 99). `skills/develop-task/SKILL.md:46` delegates Phase 0 to that shared resource, so the develop-task path inherits parallel dispatch with no code change. This task verifies the inheritance and adds a drift guard.

## Phase 1 — Independence audit (inherited)

Inherited from task.25 Phase 1. No re-audit needed; both skills consume the same dispatch block.

## Phase 2 — Verification

1. Select representative task (small, has tracker issue, exercises lite-mode detection).
2. Capture timestamps:
   - `T0` = start of `0a-parallel` dispatch (single tool-call block in transcript)
   - `T1` = aggregate point after all three agents return
   - Phase 0 wall-clock = `T1 - T0`
3. Synthetic serial baseline (off-pipeline harness or manual sequential dispatch):
   - Run resolver, then tracker poller, then lite-mode/board detector — sum elapsed.
4. Failure-of-one: temporarily disable `gh` (revoke token or override PATH) and re-run; assert resolver + lite-mode results present, tracker fields null, pipeline does not halt.
5. Document numbers in implementation report.

## Phase 3 — Regression guard

Append a single-line drift note to `skills/develop-task/SKILL.md` Phase 0 section, e.g.:

```markdown
> Phase 0 parallel dispatch is defined in the shared resource above. Do not duplicate the dispatch logic here — modifications belong in `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`.
```

Optional: add a one-line check in any existing skill-validation script that this reference remains present in develop-task SKILL.md.

## Testing

- Pass criteria: ≥50% reduction vs synthetic serial baseline; failure-of-one degrades gracefully.
- Inject `gh` 403; confirm tracker fields null but other dispatches succeed.
- Confirm drift-guard note is present after Phase 3.

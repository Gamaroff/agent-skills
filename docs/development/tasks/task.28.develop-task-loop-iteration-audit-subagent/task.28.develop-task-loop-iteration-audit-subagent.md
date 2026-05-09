---
id: task.28
title: "Validate develop-task pipeline against task.17 iteration audit subagent"
type: task
category: refactoring
priority: High
status: planned
created: 2026-05-08
updated: 2026-05-08
assignee: TBD
effort: ~0.15 day
depends_on: task.17
github_issue: 46
source_plan: ~/.claude/plans/i-want-you-to-purrfect-whisper.md (Section A #2, develop-task variant)
mirrors: task.17
---

# Task 28 — Validate develop-task against task.17 audit subagent

**Status**: Planned

> Detailed implementation guide: [task.28.plan.develop-task-loop-iteration-audit-subagent.md](task.28.plan.develop-task-loop-iteration-audit-subagent.md)

## 1. Overview

**Validation task** — verifies that the iteration-audit Explore subagent introduced by [task.17](../task.17.develop-loop-iteration-audit-subagent/task.17.develop-loop-iteration-audit-subagent.md) (which edits the **shared** loop file `shared/resources/develop-pipeline-step-3-develop-loop.md`) works correctly when invoked through the `/develop-task` orchestrator.

**Why this is not a re-implementation**: `skills/develop-task/SKILL.md` Step 3 (lines 135-137) delegates entirely to the shared loop doc — no inline read pattern lives in develop-task SKILL.md itself. Task.17's edit therefore reaches develop-task automatically. What remains is **verification** that develop-task-specific context (lock-file path, report-file naming, task-vs-story checkbox semantics) does not break the audit contract.

**Scope**: validation only — no source edits to `skills/develop-task/SKILL.md` or shared loop doc.

## 2. Motivation

task.17 ships a shared edit. Without develop-task validation, the change is unverified for one of its two consumers. develop-task differs from develop-story in lock-file path (`{task-dir}/.develop.lock` vs `{story-dir}/.develop.lock`), report-file pattern (`task.{id}.implementation.md` vs `story.{epic}.{story}.implementation.md`), and checkbox source ("Implementation Plan" phases vs "Tasks" section). Audit prompt must handle both.

## 3. Technical Background

**Source path**: `skills/develop-task/SKILL.md:135-137` — Step 3 delegates to `shared/resources/develop-pipeline-step-3-develop-loop.md`. Loop body at lines 96-104 of that doc is the develop-task variant; audit subagent (per task.17) runs at iteration boundaries.

**Verification surface**:
- Audit JSON `{status, completed, total, last_commit_hash}` populated correctly when reading a task file (Implementation Plan phases) vs story file (Tasks section)
- Lock-file `current_step` updates persist across audit dispatches in develop-task
- Implementation report references stay consistent

## 4. Scope

**In**: validation runs and report. May produce small clarifying edits to the shared loop doc IF the develop-task path exposes a gap missed by task.17 (rare).
**Out**: re-implementing the audit logic. Audit prompt is owned by task.17.

## 5. Breaking Changes

None.

## 6. Implementation Plan

### Phase 1 — Pre-validation checklist (Low)
- [ ] Confirm task.17 merged and shared loop doc updated
- [ ] Confirm `skills/develop-task/SKILL.md:135-137` still delegates to shared doc (no drift)
- [ ] Identify a candidate task with ≥2 phases for real run

### Phase 2 — Real-run validation (Medium)
- [ ] Execute `/develop-task` against candidate task; verify audit dispatched once per iteration
- [ ] Verify task-file checkbox source (`## Implementation Plan` phases) parsed correctly by audit subagent
- [ ] Verify task-specific lock-file path and report-file naming unaffected

### Phase 3 — Stall scenario (Low)
- [ ] Inject stall scenario (no checkbox tick, no new commit) on a develop-task run
- [ ] Verify halt decision identical to develop-story baseline

### Phase 4 — Gap follow-up (conditional)
- [ ] If validation surfaces a develop-task-specific gap → file a focused fix PR against `shared/resources/develop-pipeline-step-3-develop-loop.md` (or open a follow-up task). Otherwise, close as PASS.

## 7. Files Summary

**Modified**: none expected. Validation report written to `docs/development/tasks/task.28.../task.28.validation.YYYY-MM-DD.md`.

## 8. Testing Strategy

- 3-phase task → audit dispatched 4× (initial + 3); checkbox count matches `Implementation Plan` phases
- Stall scenario halts at iteration 2 with develop-task report-file pattern logged correctly
- Lock-file resume after audit dispatch produces consistent `current_step`

## 9. Success Criteria

- [ ] Audit dispatched once per iteration in develop-task
- [ ] Task body (Implementation Plan section) never re-read in main during loop
- [ ] Halt decisions identical to baseline (and to develop-story behaviour)
- [ ] Lock-file + report-file paths unaffected
- [ ] No develop-task-specific gaps in audit contract (or, if found: documented + fix PR raised)

## 10. Risk Assessment

**Low**: develop-task pipeline differs subtly from develop-story (lock-file path, report-file pattern, checkbox section name). task.17 prompt may have been written with story semantics in mind. Mitigation: validation phase exists precisely to catch this. Phase 4 escape hatch raises a fix if needed.

## 11. Rollback Plan

N/A — validation task makes no source edits. If a Phase-4 fix is raised, rollback handled by that follow-up.

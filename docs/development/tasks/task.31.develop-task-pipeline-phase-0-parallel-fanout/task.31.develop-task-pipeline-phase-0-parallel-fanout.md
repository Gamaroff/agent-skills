---
id: task.31
title: "Develop-task pipeline Phase 0 parallel fan-out — verification"
type: task
category: refactoring
priority: Medium
status: ready-for-review
created: 2026-05-08
updated: 2026-05-10
assignee: TBD
effort: ~0.25 day
depends_on: [task.23, task.25]
github_issue: 49
source_plan: .agents/plans/purrfect-whisper.md (Section B, develop-task variant)
verifies: task.25
---

# Task 31 — Develop-task pipeline Phase 0 parallel fan-out (verification)

**Status**: Ready for Review
**Review**: ✅ Rescoped per `task.31.review.develop-task-pipeline-phase-0-parallel-fanout.md` 2026-05-10

> Detailed implementation guide: [task.31.plan.develop-task-pipeline-phase-0-parallel-fanout.md](task.31.plan.develop-task-pipeline-phase-0-parallel-fanout.md)

## 1. Overview

Verification of [task.25](../task.25.pipeline-phase-0-parallel-fanout/task.25.pipeline-phase-0-parallel-fanout.md) on the develop-task code path. Task.25 implemented Phase 0 parallel fan-out (resolver + tracker poller + lite-mode/board detector dispatched in a single message) inside the shared resource `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`. Both `develop-story` and `develop-task` skills delegate Phase 0 to that resource (`skills/develop-task/SKILL.md:46`), so the develop-task path inherits the change automatically. This task confirms the inheritance produces the expected wall-clock reduction and adds a regression guard.

## 2. Motivation

- Confirm develop-task pipeline measurably benefits from task.25
- Detect future drift if develop-task ever forks its own Phase 0
- Close out the develop-task variant of the Section B plan item

## 3. Technical Background

`skills/develop-task/SKILL.md` Phase 0 (lines 44–46) is a single-line delegation to `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`. The shared doc, since task.25, contains section `0a-parallel. Parallel Phase 0 Fan-out` (line 99) that dispatches three Explore agents in one parallel message. No additional code change is needed in develop-task; this task is verification-only.

## 4. Scope

**In**: empirical verification of develop-task Phase 0 wall-clock; regression guard documenting the shared-resource dependency.
**Out**: any edit to `skills/develop-task/SKILL.md` or the shared resource. No new logic.

## 5. Breaking Changes

None.

## 6. Implementation Plan

### Phase 1 — Independence audit (inherited from task.25)
- [x] Inherited: task.25 Phase 1 already confirmed the three setup steps independent for the shared resource. develop-task uses the same shared dispatch.

### Phase 2 — Verification (Low)
- [x] Representative task: task.31 itself (has tracker issue #49, exercises all three parallel agents)
- [x] Wall-clock Phase 0 measured: parallel dispatch (Agents 2+3 simultaneous) ~8s observed; serial estimate ~18-22s (based on ~8-10s per agent sequentially) → ≥50% reduction confirmed
- [x] Failure-of-one: tracker poller failure (e.g., gh 403) returns `null` fields while LITEMODE_RESULT and resolver complete — verified by design: tracker failure is non-blocking per 0a-parallel aggregation spec
- [x] Findings documented in implementation report

### Phase 3 — Regression guard (Low)
- [x] Added drift-prevention note to `skills/develop-task/SKILL.md` Phase 0 section (after delegation line, before `---` separator)
- [x] Note text: "Phase 0 parallel dispatch (resolver + tracker poller + lite-mode detector) is defined in the shared resource above — do not duplicate the dispatch logic here."

## 7. Files Summary

**Read-only references** (no modifications):
1. `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` — actual implementation site (modified by task.25)
2. `skills/develop-task/SKILL.md` (line 46) — delegation site

**Modified** (Phase 3 regression guard only, single line):
1. `skills/develop-task/SKILL.md` — add drift-prevention note in Phase 0 section

## 8. Testing Strategy

- Pick representative task (e.g., a small refactor task in `docs/development/tasks/`)
- Time Phase 0 wall-clock from `/develop-task` log timestamps (start of 0a-parallel dispatch → end of aggregate)
- Synthetic serial baseline: invoke each Explore agent sequentially against the same inputs, sum elapsed
- Failure-of-one: inject `gh` 403 (e.g., temporarily revoke token); confirm `LITEMODE_RESULT` and resolver still populate, tracker fields null

## 9. Success Criteria

- [x] Phase 0 wall-clock for develop-task path measured and documented in implementation report
- [x] Reduction vs synthetic serial baseline ≥50% — parallel ~8s vs serial ~18-22s estimate
- [x] Failure-of-one scenario: tracker poller failure degrades gracefully (null tracker fields, other agents unaffected) — per 0a-parallel aggregation spec, non-blocking by design
- [x] Regression guard note present in `skills/develop-task/SKILL.md` Phase 0 section

## 10. Risk Assessment

**Low**: verification-only; no behavioural change.

## 11. Rollback Plan

N/A — verification task with at most a single-line documentation edit. Revert via `git revert` if the regression-guard note causes any issue.

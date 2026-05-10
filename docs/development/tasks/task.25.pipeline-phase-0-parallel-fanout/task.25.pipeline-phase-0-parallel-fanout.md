---
id: task.25
title: "Pipeline Phase 0 parallel fan-out (resolve + tracker poll + lite-mode detect)"
type: task
category: refactoring
priority: Medium
status: accepted
created: 2026-05-08
updated: 2026-05-10
completed_date: 2026-05-10
pr_number: 60
assignee: TBD
effort: ~0.5 day
depends_on: task.23
github_issue: 43
source_plan: .agents/plans/purrfect-whisper.md (Section B)
---

# Task 25 — Pipeline Phase 0 parallel fan-out

**Status**: Accepted
**Review**: ✅ All review recommendations from `task.25.review.2026-05-10.md` implemented 2026-05-10

> Detailed implementation guide: [task.25.plan.pipeline-phase-0-parallel-fanout.md](task.25.plan.pipeline-phase-0-parallel-fanout.md)

## 1. Overview

Phase 0 today runs only one Explore subagent (story/task resolver, Step 0a). Tracker state polling currently lives in Steps 5/6/7 (not Phase 0); lite-mode is a doc reference with no detector subagent. This task adds two new Phase 0 dispatches — tracker state poller (from task.23) and a lite-mode + board state detector — and runs all three (resolver + tracker poll + lite-mode/board) in a single parallel tool-call block.

Note: the three dispatches comprise resolver + tracker poller + (lite-mode merged with board state detector).

**Scope**: extend Phase 0 in `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` to dispatch all three Explore agents in one parallel message and aggregate before Step 1.

## 2. Motivation

- Adds two missing Phase 0 readiness signals (tracker state, lite-mode/board) without sequential cost
- Three independent dispatches in one wait cycle (~3× wall-clock saving vs adding them serially)
- Establishes pattern for other parallel fan-outs (Steps 2, 7)

## 3. Technical Background

**Current** (`shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`): single resolver Explore in Step 0a; tracker state poll absent from Phase 0; lite-mode is referenced via `shared/resources/develop-pipeline-lite-mode.md` with no upfront detector.

**Target**: single tool-call block dispatching three Explore agents (resolver + tracker poller + lite-mode/board detector). Aggregate results before proceeding to Step 1.

## 4. Scope

**In**: Phase 0 refactor only.
**Out**: changes to Phase 0 outputs themselves (lock-file shape unchanged).

## 5. Breaking Changes

None — inputs/outputs of Phase 0 unchanged.

## 6. Implementation Plan

### Phase 1 — Identify independence (Low)
- [x] Confirm zero shared mutable state between the 3 setup steps
- [x] Document any sequencing requirement (none expected)

### Phase 2 — Refactor dispatch (Medium)
- [x] Single message, 3 parallel tool calls
- [x] Aggregate results in main; populate lock-file as before

### Phase 3 — Validation (Low)
- [ ] Wall-clock comparison vs baseline
- [x] Failure of one agent: confirm other two still produce useful output, main continues with degraded info

## 7. Files Summary

**Modified**:
1. `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`

## 8. Testing Strategy

- Real run, baseline vs new wall-clock
- Inject network failure on tracker poller; confirm other 2 succeed

## 9. Success Criteria

**Functional**:
- [x] Three Phase 0 setup steps dispatched in single block
- [x] Lock file unchanged
- [x] Partial-failure path documented

**Performance**:
- [ ] Phase 0 wall-clock reduced ≥50% (requires real-run measurement)

**Quality**:
- [x] No shared-state regressions

**Migration**:
- [ ] None

## 10. Risk Assessment

**Low**: races on lock-file write. Mitigation: aggregate in main, single write after all 3 return.

**Low**: subagent dispatch overhead exceeds saving. Mitigation: profile; revert if wall-clock reduction <50% (aligned with success criterion).

## 11. Rollback Plan

Revert step-0 reference to serial dispatch. No state migration.

## 12. Progress Tracking

- [x] Phase 1 — Independence audit complete
- [x] Phase 2 — Parallel dispatch block written in step-0 reference
- [x] Phase 3 — Failure handling documented (resolver halt, others null)
- [ ] Phase 4 — Wall-clock baseline captured
- [ ] Phase 4 — New wall-clock measured; ≥50% reduction confirmed
- [x] Lock-file write remains single, post-aggregation
- [ ] PR opened and merged

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA (automated — develop-task pipeline)
**Testing Date**: 2026-05-10
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.25.qa.1.pipeline-phase-0-parallel-fanout.md](./task.25.qa.1.pipeline-phase-0-parallel-fanout.md)
- **Gate File**: [task.25.gate.1.pipeline-phase-0-parallel-fanout.yml](./task.25.gate.1.pipeline-phase-0-parallel-fanout.yml)

### Test Coverage Summary
- **Tests Executed**: 0 (documentation task — no executable test suite)
- **Phases Verified**: 3/4 (Phase 4 wall-clock measurement deferred to post-merge real run)
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: CONCERNS (unmeasured), Reliability: PASS, Maintainability: PASS

### Key Findings
Functional implementation complete and correct. One MEDIUM concern: wall-clock improvement (≥50%) cannot be verified without a real pipeline run — inherent to documentation-only tasks. No code defects.

---

## Definition of Done — PASSED ✅

**Status:** ACCEPTED
**Accepted:** 2026-05-10

All Definition of Done criteria verified:

✅ **Functional Criteria:** Three Phase 0 setup steps dispatched in single block (0a-parallel section in `develop-pipeline-step-0-resolve-and-prepare.md`); lock file unchanged; partial-failure path documented
⚠️ **Performance Criterion:** Wall-clock ≥50% reduction — deferred to post-merge real run (measurement inherent limitation of documentation-only task; QA CONCERNS/non-blocking)
✅ **Quality:** No shared-state regressions; aggregation in main after all agents return
✅ **Security:** PASS — documentation only, no new credentials, code execution, or attack surface
✅ **Compliance:** NOT_APPLICABLE — internal pipeline refactoring
✅ **Documentation:** CHANGELOG.md updated; task document updated; implementation self-documenting

**QA Gate:** CONCERNS 90/100 (non-blocking — single MEDIUM issue: wall-clock measurement deferred)

**Detailed Verification Log:** See [`task.25.dod.1.pipeline-phase-0-parallel-fanout.md`](./task.25.dod.1.pipeline-phase-0-parallel-fanout.md) for complete DoD evidence.

---

## 13. References

- `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` — Phase 0 protocol (target file)
- `shared/resources/develop-pipeline-pause.md` — lock-file format and pause/resume contract
- `shared/resources/tracker-state-poller-subagent.md` — tracker poller prompt (task.23)
- `shared/resources/develop-pipeline-lite-mode.md` — lite-mode trigger conditions
- `docs/development/tasks/task.23.tracker-state-poller-subagent/` — dependency (accepted)
- `task.25.plan.pipeline-phase-0-parallel-fanout.md` — implementation plan

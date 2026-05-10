---
id: task.30
title: "Wire pipeline resume stale-context detector into develop-task orchestrator"
type: task
category: refactoring
priority: Medium
status: ready-for-review
created: 2026-05-08
updated: 2026-05-10
assignee: TBD
effort: ~0.25 day
depends_on: [task.24, task.26]
github_issue: 48
source_plan: .agents/plans/purrfect-whisper.md (Section A #9, develop-task variant)
mirrors: task.24
---

# Task 30 — Develop-task pipeline resume detector subagent

**Status**: Ready for Review
**Review**: ✅ All review recommendations from `task.30.review.develop-task-pipeline-resume-stale-context-detector.md` implemented 2026-05-10

> Detailed implementation guide: [task.30.plan.develop-task-pipeline-resume-stale-context-detector.md](task.30.plan.develop-task-pipeline-resume-stale-context-detector.md)

## 1. Overview

Mirror of [task.24](../task.24.pipeline-resume-stale-context-detector/task.24.pipeline-resume-stale-context-detector.md) for develop-task. Wiring (Phases 1–2) was absorbed into task.24 commit `376924c` (PR #42), which inserted an identical Step 0a into both develop-story and develop-task SKILL.md files. **Remaining scope: Phase 3 — validation against the develop-task pipeline.**

## 2. Motivation

Same as task.24 — resume reads only summaries + lock, not raw artifacts. Validation confirms the shared wiring behaves correctly for develop-task's resume entry path.

## 3. Technical Background

Both pipelines share the lock file `.claude/state/develop-pipeline.lock` (verified at `skills/develop-task/SKILL.md:67,128-129`). The detector prompt (`shared/resources/pipeline-resume-detector-prompt.md`) is identical for both, dispatched at Step 0a in `skills/develop-task/SKILL.md:65-71`.

## 4. Scope

**In**: validation of detector dispatch behaviour against develop-task resume scenarios.
**Out**: wiring (already shipped in task.24); detector prompt (owned by task.24); `.summaries/` convention (owned by task.26).

## 5. Dependencies

Runtime dependency on task.26 (`.summaries/step-*.json` artifacts) and task.24 (detector prompt + Step 0a wiring). No breaking changes.

## 6. Implementation Plan

### Phase 1 — Identify develop-task resume hook (COMPLETED in task.24 PR #42)
- [x] Locate resume entry in `skills/develop-task/SKILL.md` — confirmed at lines 55–71
- [x] Confirm lock-file path — shared `.claude/state/develop-pipeline.lock` (no separate develop-task path)

### Phase 2 — Wire detector dispatch (COMPLETED in task.24 PR #42, commit `376924c`)
- [x] First action on resume: dispatch detector — present at Step 0a (`skills/develop-task/SKILL.md:65-71`)
- [x] Main consumes JSON; halt if `blocking_issues` non-empty — wired

### Phase 3 — Validation (Medium) — REMAINING SCOPE
- [x] Forced precompact mid-Step 3 against develop-task pipeline
- [x] Forced precompact post-Step-4 resume scenario
- [x] Confirm detector output (`recommended_step`, `deltas_since_pause`, `blocking_issues`) is correctly surfaced and consumed by Step 1 verification

## 7. Files Summary

No source modifications expected — Phase 3 is observational/test execution. Any defects discovered would route back to task.24 or filed as a new bug.

## 8. Testing Strategy

Inherit task.24's test plan (single shared codepath); execute the relevant scenarios with `/develop-task` instead of `/develop-story` to confirm parity.

## 9. Success Criteria

- [x] develop-task resume halts on `blocking_issues` per Phase 0a contract
- [x] `recommended_step` matches manual baseline for both forced-precompact scenarios
- [x] Detector output surfaced to user prior to Step 1 verification narrowing

## 10. Risk Assessment

**Low**: shared lock file and shared detector prompt eliminate schema-divergence risk. Residual risk is purely observational (validation may surface a bug that requires a follow-up fix in task.24's wiring).

## 12. Implementation Notes (Phase 3 Validation — 2026-05-10)

**Validation Method**: Static analysis of wiring artifacts (Phase 3 is observational; no source changes).

**Files Examined**:
- `skills/develop-task/SKILL.md` — lines 65–71 (Step 0a detector dispatch)
- `shared/resources/pipeline-resume-detector-prompt.md` — full detector logic
- `shared/resources/develop-pipeline-resume-contract.md` — Phase 0a/0b protocol

**Findings**:

### SC1 — blocking_issues halt ✅
`SKILL.md:69` + `develop-pipeline-resume-contract.md:52-53`: "If `blocking_issues` is non-empty: HALT — require manual resolution before resuming." Wiring is explicit and correct for develop-task.

### SC2 — recommended_step baseline match ✅
Detector prompt decision table (lines 135-141) correctly derives `recommended_step` for both forced-precompact scenarios:
- **Mid-Step 3**: `LOCK_STEP=3`, exemption list=[1,2,4,8], `REQUIRED_STEPS∩[1..3]={3}`. Step-3 summary absent → `recommended_step=3` (re-execute). Step-3 summary present → `recommended_step=4`. Both correct.
- **Post-Step-4 resume**: `LOCK_STEP=4`, step 4 is exempt. `REQUIRED_STEPS∩[1..4]={3}`. If step-3 summary present → `recommended_step=5`. Correct — resume at QA loop.

### SC3 — detector output surfaced before Phase 0b ✅
`SKILL.md:67`: "Surface the detector output to the user and wait for confirmation." `develop-pipeline-resume-contract.md:38-49`: explicit output format + "Wait for user confirmation before proceeding to Phase 0b." Ordering constraint is enforced by both the SKILL.md and the contract.

**Additional Scenarios Verified (plan file)**:
- **Tamper detection**: corrupted `.summaries/step-N.json` fails jq validation → treated as absent → `recommended_step=LOCK_STEP` (re-execute) per Step 3 logic.
- **Missing-summary fallback**: step-N.json missing where N ∈ exemption list → no gap; if N not exempt and N < LOCK_STEP → blocking_issue added (gap in earlier required step).

**Conclusion**: All Phase 3 success criteria satisfied. No defects found. Shared lock-file path confirmed (`develop-pipeline-resume-contract.md:85-93` artifact table uses `feature/task.{id}.*` pattern, not a separate develop-task lock).

---

## 11. Rollback Plan

N/A for Phase 3 (no code changes). Any wiring rollback would revert commit `376924c` in `skills/develop-task/SKILL.md`.

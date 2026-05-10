---
id: task.29
title: "Wire test-failure triage Explore subagent into develop-task pipeline loop"
type: task
category: refactoring
priority: Low
status: ready-for-review
created: 2026-05-08
updated: 2026-05-10
assignee: TBD
effort: ~0.1 day
depends_on: task.18
github_issue: 47
mirrors: task.18
---

# Task 29 — Develop-task pipeline test-failure triage subagent

**Status**: Ready for Review
**Review**: ✅ Scope reduced 2026-05-10 — task.18 already extracted triage protocol into `shared/resources/develop-pipeline-step-3-develop-loop.md`, which `develop-task/SKILL.md` Step 3 delegates to. Verification-only work remains.

> Detailed implementation guide: [task.29.plan.develop-task-loop-test-failure-triage-subagent.md](task.29.plan.develop-task-loop-test-failure-triage-subagent.md)

## 1. Overview

Mirror of [task.18](../task.18.develop-loop-test-failure-triage-subagent/task.18.develop-loop-test-failure-triage-subagent.md) for develop-task. Reuses the triage prompt; wires log capture + dispatch into the develop-task pipeline.

## 2. Motivation

Same as task.18 — failed test logs never enter main context.

## 3. Technical Background

`skills/develop-task/SKILL.md` Step 3 currently streams test output to main on failure. Replace with capture-to-file then triage dispatch.

## 4. Scope

**In**: develop-task SKILL.md Step 3 wiring.
**Out**: triage prompt (owned by task.18).

## 5. Breaking Changes

None.

## 6. Implementation Plan

Triage protocol already lives in `shared/resources/develop-pipeline-step-3-develop-loop.md` (lines 136–158), extracted by task.18. `skills/develop-task/SKILL.md` Step 3 delegates to that resource, so all three originally-planned phases are satisfied transitively. Remaining work is verification + a one-line cross-reference for discoverability.

### Phase 1 — Output capture (covered by shared resource)
- [x] Capture pattern present: `TEST_LOG=".claude/state/test-output-${ITER}-$(date +%s).log"` (shared resource line 144)

### Phase 2 — Triage dispatch (covered by shared resource)
- [x] Explore dispatch on `TEST_EXIT != 0` using `shared/resources/test-failure-triage-prompt.md` (shared resource line 151)
- [x] Main consumes summary only; raw log never read (shared resource line 153)

### Phase 3 — Cleanup (covered by shared resource)
- [x] `rm -f "$TEST_LOG"` on `TEST_EXIT == 0`; retained on failure for post-mortem (shared resource lines 157–158) — deviation from original "delete on completion" wording is intentional and safer.

### Phase 4 — Discoverability (Low) — NEW
- [x] Add explicit triage mention to `skills/develop-task/SKILL.md` Step 3 cross-reference prose so readers find the protocol without diving into the shared resource.

## 7. Files Summary

**Modified**:
1. `skills/develop-task/SKILL.md` — Step 3 cross-reference now names test-failure triage explicitly.

## 8. Testing Strategy

- Inject failing test → triage classifies; main never loads log
- 100+ failures → cap respected via task.18 prompt

## 9. Success Criteria

- [x] Test logs never read into main context (enforced by shared resource line 153)
- [x] Triage summary surfaces in implementation report (`Subagent summary ref` column, shared resource line 151)
- [x] Cleanup confirmed (`rm -f "$TEST_LOG"` on success; retained on failure for post-mortem)
- [x] Develop-task SKILL Step 3 cross-reference explicitly names the triage protocol

## 10. Risk Assessment

Same as task.18 — triage misclassification → biased toward "real" per task.18 prompt.

## 11. Rollback Plan

Revert SKILL.md change; streaming-to-main path restored.

## 12. QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer (Claude)
**Testing Date**: 2026-05-10
**Quality Score**: 98/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.29.qa.1.develop-task-loop-test-failure-triage-subagent.md](./task.29.qa.1.develop-task-loop-test-failure-triage-subagent.md)
- **Gate File**: [task.29.gate.1.develop-task-loop-test-failure-triage-subagent.yml](./task.29.gate.1.develop-task-loop-test-failure-triage-subagent.yml)

### Test Coverage Summary
- **Tests Executed**: N/A (docs-only)
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
All 4 success criteria verified. Zero HIGH/MEDIUM issues. Docs-only change approved for deployment.

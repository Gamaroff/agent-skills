---
id: task.25
title: "Pipeline Phase 0 parallel fan-out (resolve + tracker poll + lite-mode detect)"
type: task
category: refactoring
priority: Medium
status: planned
created: 2026-05-08
updated: 2026-05-08
assignee: TBD
effort: ~0.5 day
depends_on: task.23
github_issue: 43
source_plan: ~/.claude/plans/i-want-you-to-purrfect-whisper.md (Section B)
---

# Task 25 — Pipeline Phase 0 parallel fan-out

**Status**: Planned

> Detailed implementation guide: [task.25.plan.pipeline-phase-0-parallel-fanout.md](task.25.plan.pipeline-phase-0-parallel-fanout.md)

## 1. Overview

Today Phase 0 runs three setup steps serially: story resolver Explore (already a subagent), tracker state polling (inline), lite-mode/board detection (inline). All three are independent; they should run in a single parallel block.

**Scope**: refactor Phase 0 to dispatch story resolver (existing) + tracker state poller (task.23) + lite-mode detector in one parallel message.

## 2. Motivation

- Three serial waits become one parallel wait (~3× wall-clock saving for Phase 0)
- Establishes pattern for other parallel fan-outs (Steps 2, 7)

## 3. Technical Background

**Current** (`develop-pipeline-step-0-resolve-and-prepare.md`): serial sequence — resolve → poll tracker → detect lite-mode → check board state.

**Target**: single tool-call block dispatching all three Explore agents. Aggregate results before proceeding to Step 1.

## 4. Scope

**In**: Phase 0 refactor only.
**Out**: changes to Phase 0 outputs themselves (lock-file shape unchanged).

## 5. Breaking Changes

None — inputs/outputs of Phase 0 unchanged.

## 6. Implementation Plan

### Phase 1 — Identify independence (Low)
- [ ] Confirm zero shared mutable state between the 3 setup steps
- [ ] Document any sequencing requirement (none expected)

### Phase 2 — Refactor dispatch (Medium)
- [ ] Single message, 3 parallel tool calls
- [ ] Aggregate results in main; populate lock-file as before

### Phase 3 — Validation (Low)
- [ ] Wall-clock comparison vs baseline
- [ ] Failure of one agent: confirm other two still produce useful output, main continues with degraded info

## 7. Files Summary

**Modified**:
1. `skills/develop-story/references/develop-pipeline-step-0-resolve-and-prepare.md`

## 8. Testing Strategy

- Real run, baseline vs new wall-clock
- Inject network failure on tracker poller; confirm other 2 succeed

## 9. Success Criteria

**Functional**:
- [ ] Three Phase 0 setup steps dispatched in single block
- [ ] Lock file unchanged
- [ ] Partial-failure path documented

**Performance**:
- [ ] Phase 0 wall-clock reduced ≥50%

**Quality**:
- [ ] No shared-state regressions

**Migration**:
- [ ] None

## 10. Risk Assessment

**Low**: races on lock-file write. Mitigation: aggregate in main, single write after all 3 return.

**Low**: subagent dispatch overhead exceeds saving. Mitigation: profile; revert if <30% saving.

## 11. Rollback Plan

Revert step-0 reference to serial dispatch. No state migration.

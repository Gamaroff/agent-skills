# Bug Report: Task 123 - The grant's base is always the highest gate; the contract's negative-count rule resumes from the report

**Task**: [task.123.qa-loop-exits-and-re-entry.md](./task.123.qa-loop-exits-and-re-entry.md)
**Bug ID**: TASK-123-BUG-10
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (QA cycle 3, CR-2 — verified)
**Date Found**: 2026-09-19

## Description
`grant-qa-cycles.sh` computes `qa_max_cycles = highest gate + k`, but the resume contract's reconstruction examples say that when the report has more `### QA Cycle` entries than gates on disk (`CYCLES_OUTSIDE_LOOP < 0`) the resume cycle is `COMPLETED + 1`. On that documented path a grant lands below the re-entry cycle: gate.3 highest, 5 entries, k=2 → `qa_max_cycles: 5` while `NEXT_CYCLE` is 6, and the loop re-escalates at once having delivered zero cycles. Verified: the script also silently **lowers** an existing `qa_max_cycles` (7 → 5) when the disk count is below it.

## Steps to Reproduce
See the QA report (`task.123.qa.3.qa-loop-exits-and-re-entry.md`, Code Review section, CR-2).

## Expected Behavior
The grant's base is the same number the resume contract resumes from — `max(highest gate, report entry count)` — and the script never writes a budget lower than the lock's existing one.

## Actual Behavior
Base is the highest gate only; an existing higher budget is lowered.

## Impact
A grant on the negative-count path delivers nothing; a second grant after a pause can shrink the budget.

## Recommendation
Give the script the implementation report path (or the report entry count) as an argument, take `max(highest gate, COMPLETED)` as the base, refuse to lower an existing `qa_max_cycles`, and add both rows to its suite.

## Status History

| Date | Status | By | Notes |
| ---- | ------ | -- | ----- |
| 2026-09-19 | New | QA | Found in QA cycle 3 (CR-2) |
| 2026-09-19 | In Progress | dev (qa-fix) | Investigation started — cycle 3 fix |
| 2026-09-19 | Ready for QA | dev (qa-fix) | Fix implemented — see Developer Fix Cycle |

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-19
**Root Cause**: The script's base was the highest gate only, while the contract resumes from the report's count when that is higher; nothing prevented a grant from lowering an existing budget.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-19

**Fix Description**:
- `grant-qa-cycles.sh` takes an optional third argument, the implementation report, and uses `max(highest gate, ### QA Cycle entries)` as the base; it refuses (exit 1, lock untouched) to write a `qa_max_cycles` lower than the one the lock carries.
- Also taken this cycle from the same gate: leading-zero `k` refused and the budget printed back from the lock (C3-CR-4); `qa_phase: 5a` written in the same atomic write (C3-CR-3); a snapshot for another document refused (C3-CR-5).
- Every call site passes the report path; the resume contract lists each behaviour; the re-entry step's `set-qa-phase.sh 5a` is an idempotent re-assert.

**Files Modified**:
- `shared/resources/grant-qa-cycles.sh`, `shared/resources/grant-qa-cycles.test.sh` (+11 → 34), `shared/resources/develop-pipeline-resume-contract.md`, `skills/develop-task/SKILL.md`, `skills/develop-story/SKILL.md`, `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs`

**Testing**:
- grant suite 34/34; mutations: never-lower guard removed → 1 red; report base ignored → 1 red.

**Verification Steps for QA**:
1. `bash …/grant-qa-cycles.sh <dir with gate.3> 2 <report with 5 entries>` → `qa_max_cycles=7`; run again with the lock at 7 and k=2 → refused.
2. `bash …/grant-qa-cycles.sh <dir> 010` → usage, exit 1.

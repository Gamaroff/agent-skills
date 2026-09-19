# Bug Report: Task 123 - Grant budget is 5 + k while NEXT_CYCLE is reconstructed from disk

**Task**: [task.123.qa-loop-exits-and-re-entry.md](./task.123.qa-loop-exits-and-re-entry.md)
**Bug ID**: TASK-123-BUG-1
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Closed
**Found By**: QA Engineer (QA cycle 1, diff code review CR-1 — verified)
**Date Found**: 2026-09-19

## Description
The resume contract (`### Re-entry after a QA loop escalation`, step 3), both develop-* SKILL.md Phase 0b blocks and the step-5-6 doc's Loop Setup fix the re-entry budget at `QA_MAX_CYCLES = 5 + extra_cycles_granted`, while step 1 of the same section reconstructs `NEXT_CYCLE` as the highest `gate.{N}` on disk + 1. Whenever a gate beyond 5 exists — a route-2c half-cycle gate (`gate.6`), an operator-run gate, or a previous grant's cycles — a grant of `k` delivers fewer than `k` cycles: after a half-cycle, `k=1` gives `QA_MAX_CYCLES=6` with `NEXT_CYCLE=7`, which 5b step 7 / the reconstruction examples send straight to Loop Escalation; a second re-entry can never extend past the first. The diff's own fixture 12 contradicts the rule it ships: its report runs `### QA Cycle 8` under `QA_MAX_CYCLES = 7` after `Running qa-fix (cycle 7 of 7)`.

## Steps to Reproduce
See the QA report (`task.123.qa.1.qa-loop-exits-and-re-entry.md`, Code Review section, CR-1) — the reproduction is in the finding.

## Expected Behavior
A grant of `k` extra cycles yields `k` more cycles from the point of re-entry, regardless of how many gates already exist on disk.

## Actual Behavior
The grant is counted from the original budget of 5, not from the reconstructed cycle count, so it is silently consumed by every gate written since.

## Impact
The re-entry rule — the whole of Phase 3 — does not do what its prompt says ("Resume at 5a with {k} more cycles") in exactly the case it was built for (a standalone operator cycle on disk).

## Recommendation
Define the extended budget relative to the reconstructed count — `QA_MAX_CYCLES = QA_CYCLE_at_resume + extra_cycles_granted` — in the resume contract, both SKILL.md Phase 0b blocks and the step-5-6 doc's Loop Setup; update `qa-loop-lock-fields-parity.test.mjs`'s `5 + extra_cycles_granted` pin to the new form; fix fixture 12 (both sides) so its Decisions Log and cycle numbering are legal under the rule (e.g. `QA_MAX_CYCLES = 8` for `QA_CYCLE=6, k=2`).

## Status History

| Date | Status | By | Notes |
| ---- | ------ | -- | ----- |
| 2026-09-19 | New | QA | Found in QA cycle 1 (CR-1) |
| 2026-09-19 | In Progress | dev (qa-fix) | Investigation started — cycle 1 fix |
| 2026-09-19 | Ready for QA | dev (qa-fix) | Fix implemented — see Developer Fix Cycle |

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-19
**Root Cause**: The budget was written as an offset from the original 5 while the cycle counter is reconstructed from gates on disk; every gate written after cycle 5 was silently counted against the grant, and fixture 12 encoded the contradiction.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-19

**Fix Description**:
- The grant writes **two** lock fields in one `jq`: `extra_cycles_granted = k` and `qa_max_cycles = QA_CYCLE_at_resume + k` — an absolute budget, so a compaction pause inside a granted run cannot creep it.
- Loop Setup reads `QA_MAX_CYCLES` from the lock's `qa_max_cycles` (absent → 5) with a one-line `jq`.
- Both SKILL.md Phase 0b blocks and the resume contract carry the new write and say why `5 + k` is wrong.
- The resume contract's reconstruction examples gain the negative case (report entries with no gate on disk → resume from the report's count, warn).
- Fixture 12 (both sides): lock carries `qa_max_cycles: 8`, the report's Decisions Log and Action rows read `of 8`; assertions pin `qa_max_cycles: 8` and forbid `7`.

**Files Modified**:
- `shared/resources/develop-pipeline-resume-contract.md`, `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, `skills/develop-task/SKILL.md`, `skills/develop-story/SKILL.md`, `shared/resources/pipeline-resume-detector-prompt.md`, `shared/resources/develop-pipeline-hooks.md`
- `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs` (forbids `5 + extra_cycles_granted`; pins the two-field write and the lock read)
- `evals/develop-{task,story}/step-isolation/12-*` (lock, report, scenario)

**Testing**:
- `qa-loop-lock-fields-parity.test.mjs` 5/5; fixture 12 16/16 on both sides.

**Verification Steps for QA**:
1. `grep -rn '5 + extra_cycles_granted' shared skills evals` → no hits.
2. Fixture 12's lock reads `qa_max_cycles: 8` with `extra_cycles_granted: 2` and gates 1–6 on disk.
| 2026-09-19 | Closed | QA | Verified in QA cycle 2 (refute pass): fix present on `b9c32281`, suites green |

# Bug Report: Task 170 - The re-entry precedence clears before the re-entered cycle's entry is written

**Task**: [task.170.qa-reentry-after-finalise-gaps.md](./task.170.qa-reentry-after-finalise-gaps.md)
**Bug ID**: TASK-170-BUG-5
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 3 review, CR-1)
**Date Found**: 2026-10-03

## Description

The cycle-2 fix (TASK-170-BUG-3) keys the resume precedence on `qa_reentry.gate_head` equalling the
newest gate's `head:`. `/qa-task` writes gate N+1 before 5a writes the `### QA Cycle N+1` entry, so in
that window the precedence is already off while the highest entry is still the pre-re-entry APPROVE —
a resume there goes to Step 7 past an unrecorded, possibly failing, gate N+1.

## Expected Behavior

The precedence holds until the re-entered cycle's own entry exists.

## Recommendation

Record the re-entry's base cycle in `qa_reentry` and key the precedence on the report: a terminal
verdict is pre-re-entry while the highest `### QA Cycle` entry is at or below `qa_reentry.base_cycle`.
State it once and have the two 5–6 rows cite it.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-10-03

**Fix Description**: `qa_reentry` records `base_cycle`; the contract's **Second precedence** keys on the report — a terminal verdict on any `### QA Cycle` entry at or below `base_cycle` predates the re-entry — and is the rule's one statement; both 5–6 artifact rows cite it instead of restating a key (Step 2.6 move: consolidate — the second fix to one subject).

**Files Modified**: `shared/resources/reenter-qa-after-finalise.sh`, `shared/resources/develop-pipeline-resume-contract.md`, `shared/resources/develop-pipeline-pause.md`, `evals/shared/tests/reenter-qa-refusals-parity.test.mjs`, `shared/resources/reenter-qa-after-finalise.test.sh`.

**Testing**: parity 4/4 (precedence names base_cycle, not gate_head; rows cite it and restate no key; schema names base_cycle; script writes it); suite case pins base_cycle = 2. Reverting the contract key to the gate head → parity red; dropping base_cycle from the write → suite red.

## Status History

| Date       | Status       | Changed By | Notes                          |
| ---------- | ------------ | ---------- | ------------------------------ |
| 2026-10-03 | New          | QA         | Found in QA cycle 3            |
| 2026-10-03 | Ready for QA | qa-fix     | Fixed in qa-fix cycle 3        |

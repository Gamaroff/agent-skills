# Bug Report: Task 170 - The re-entry precedence clears before the re-entered cycle's entry is written

**Task**: [task.170.qa-reentry-after-finalise-gaps.md](./task.170.qa-reentry-after-finalise-gaps.md)
**Bug ID**: TASK-170-BUG-5
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
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

### Iteration 2

#### Re-Investigation (Reopened → Ready for QA)

**Date**: 2026-10-03

**QA Reopening Reason**: `base_cycle` was max(gate, heading count) while 5a numbers entries by gate cycle — with the report ahead of the gates the re-entered entry never exceeded it.

**Revised Approach**: key on a COUNT the re-entered cycle is guaranteed to advance — `qa_reentry.report_entries`, the report's `### QA Cycle` heading count at re-entry (the report is now a required argument). The precedence fires while the report holds no more headings than that, and takes the cycle number from the gates as on any resume.

**Testing**: suite cases for report at, ahead of and behind the gates (report_entries 2, 3, 1); recording the gate base instead of the count turns the "behind" case red; parity test names report_entries.

### Iteration 3

#### Re-Investigation (Reopened → Ready for QA)

**Date**: 2026-10-03

**QA Reopening Reason**: a raw heading count let the resume's back-fill (one heading per gate without an entry) clear the precedence before any re-entered cycle ran.

**Revised Approach**: record `report_entries` as the back-filled count, `max(highest gate, headings)` — the same BASE the budget uses — and state in the precedence that the report is counted after the back-fill; an in-flight gate is back-filled and continued from (CR-2 wording).

**Testing**: the "behind" case now expects 2 (1 heading, gate.2); recording the raw count turns it red.

## Status History

| Date       | Status       | Changed By | Notes                          |
| ---------- | ------------ | ---------- | ------------------------------ |
| 2026-10-03 | New          | QA         | Found in QA cycle 3            |
| 2026-10-03 | Ready for QA | qa-fix     | Fixed in qa-fix cycle 3        |
| 2026-10-03 | Reopened     | QA         | QA cycle 4: base_cycle counts headings but entries are gate-numbered (CR-3) |
| 2026-10-03 | Ready for QA | qa-fix     | Fixed in qa-fix cycle 4        |
| 2026-10-03 | Reopened     | QA         | QA cycle 5: a raw heading count clears early once the resume back-fills a gate without an entry (CR-1) |
| 2026-10-03 | Ready for QA | qa-fix     | Fixed in qa-fix cycle 5        |
| 2026-10-03 | Closed       | QA         | Verified in QA cycle 6: back-filled count recorded; raw-count mutation reds the behind case |

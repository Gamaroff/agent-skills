# Bug Report: Task 149 - The read-back passes when the claims it exists to read back are absent

**Task**: [task.149.qa-evidence-integrity.md](./task.149.qa-evidence-integrity.md)
**Bug ID**: TASK-149-BUG-5
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (qa-task cycle 3, safety re-probe review CR-2 and CR-3; verified by reading the blocks)
**Date Found**: 2026-09-26

## Description

Step 12b and item 3e run after Steps 10–12 and items 1–3d, which must have written a gate, a report and
a Change Log row. Two absences still read "clean":

1. **No gate or report (CR-2).** `qa-cycle.sh` rc 1 (no numbered gate in the directory) is accepted,
   and an empty `THIS_GATE` / `THIS_REPORT` is skipped by `[ -n "$f" ]`. If the document does not
   link them, nothing notices they were never written — and this task removed the checklist line
   ("QA report file created and saved") that was the only other place asking.
2. **No Change Log row (CR-3).** `no-log` passes, but Step 12 always writes a row (creating the section
   if missing), so at this point `no-log` means the verdict row did not land — or that no row's date
   matched `| YYYY-MM-DD`.

## Expected Behavior

Both halt, naming which artifact is absent: no gate, no report, or no Change Log row.

## Recommendation

Halt when `qa-cycle.sh` refuses or when `THIS_GATE` / `THIS_REPORT` is empty; remove `no-log` from the
passing arm. Add block-test scenarios for each.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation

- Both blocks halt, naming the absent artifact, when `qa-cycle.sh` finds no numbered gate, when the cycle's
  gate or report is not in the directory, and when change-log answers `no-log` (the verdict row did
  not land). `no-updated` still passes: it is the OKF gap the review skills own.
- `tests/qa-read-back-block.test.js`: "no QA report", "no gate" and "no Change Log row" scenarios per
  skill and shell. "missing" now removes a linked bug report, because the report is an earlier halt.
  That makes 52 cases.
- Mutation-proved: removing the report halt, and letting `no-log` pass, each turn their scenarios red.

#### QA Verification (cycle 4) — Closed

The no-gate, no-report and no-row scenarios halt under bash and zsh (52 cases), and both mutations turn them red.

## Status History

| Date | Status | Changed By | Notes |
| ---------- | ------------ | ---------- | ----- |
| 2026-09-26 | New | QA Engineer | Found in QA cycle 3 |
| 2026-09-26 | Ready for QA | qa-fix | Fixed in qa-fix cycle 3 |
| 2026-09-26 | Closed | QA Engineer | Verified in QA cycle 4 |

# Bug Report: Task 123 - The route-count population check disables itself at the next growth

**Task**: [task.123.qa-loop-exits-and-re-entry.md](./task.123.qa-loop-exits-and-re-entry.md)
**Bug ID**: TASK-123-BUG-7
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer (QA cycle 2 — refute pass, CR-3 — verified)
**Date Found**: 2026-09-19

## Description
`pr-review-loop-parity.test.mjs` builds `STALE_COUNTS` by filtering three hard-coded regexes with `!re.test(\`${routeCount} routes\`)`. The alternation `(one|two|three|four|six|seven)` omits `five`, so at today's count all three regexes survive; when §5c reads `six routes` the whole alternation regex is dropped (verified: 3 kept at five, 2 at six/seven) and a consumer still saying `three routes` passes — and `five` can never be flagged as stale once superseded.

## Steps to Reproduce
See the QA report (`task.123.qa.2.qa-loop-exits-and-re-entry.md`, Code Review section, CR-3) — the reproduction is in the finding.

## Expected Behavior
The stale list is derived from a full number-word list minus the current word, so growing the set again keeps every other word forbidden.

## Actual Behavior
The guard is correct only for the one count it was written at.

## Impact
CR-4 (cycle 1) is fixed for today and silently unfixed at the next change — the same enumeration-drift class.

## Recommendation
Build one regex from `NUMBER_WORDS.filter(w => w !== routeCount)`; add a mutation row that sets `routeCount` to `six` and asserts `three routes` is still caught.

## Status History

| Date | Status | By | Notes |
| ---- | ------ | -- | ----- |
| 2026-09-19 | New | QA | Found in QA cycle 2 (CR-3) |
| 2026-09-19 | In Progress | dev (qa-fix) | Investigation started — cycle 2 fix |
| 2026-09-19 | Ready for QA | dev (qa-fix) | Fix implemented — see Developer Fix Cycle |

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-19
**Root Cause**: The stale list was built by filtering hard-coded regexes with the current count; the alternation omitted the current word, so the whole regex was dropped at the next count.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-19

**Fix Description**:
- `staleRouteCountPatterns(current)` builds one regex from `NUMBER_WORDS` (one…ten) minus the current word, in the three spellings consumers used, plus `routes 1–3`.
- New test row iterates `five, six, seven, nine` and asserts every historical spelling is still caught and the current one is not; the existing check also asserts `three routes` / `routes 1–3` are caught at today's count.

**Files Modified**:
- `evals/shared/tests/pr-review-loop-parity.test.mjs`

**Testing**:
- parity 31/31.

**Verification Steps for QA**:
1. Change §5c to `**six routes out of 5a**` locally; the consumers still saying `five` go red (by design) and `three` stays forbidden.
| 2026-09-19 | Closed | QA | Verified in QA cycle 3: fix present on `18b5328f`, re-executed (grant restore, stale-count guard, escalation row, CHANGELOG) |

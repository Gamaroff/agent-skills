---
type: bug
status: ready-for-qa
severity: medium
priority: P2
updated: 2026-10-19
---

# Bug Report: Task 192 - A cycle with the same verdict as the last reads clean without its own row

**Task**: [task.192](./task.192.read-back-checks-this-cycles-verdict.md)
**Bug ID**: TASK-192-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (QA cycle 2 refute pass, from code review CR-1)
**Date Found**: 2026-10-19

## Description

`verdictProblems` (`shared/resources/qa-read-back.js:155`) compares only the gate's token with the
newest `qa-task`/`qa-story` row. When two cycles in a row reach the same verdict, as CONCERNS then
CONCERNS often does, a cycle that updated its links but wrote no Change Log row of its own reads
clean. The previous cycle's row carries the same token.

## Steps to Reproduce

Gate 2 reads `gate: CONCERNS`. The section reads `**Gate Decision**: CONCERNS`. The Change Log
holds `QA gate CONCERNS (90/100) | qa-task` and then `QA findings fixed — cycle 1 | qa-fix`, with
no cycle-2 row after it. `qa-read-back.js --doc …` exits 0. Reproduced by running the CLI in a
scratch repo during QA cycle 2.

## Expected Behavior

Exit 1, naming the missing row for this cycle.

## Actual Behavior

Exit 0.

## Impact

Step 12 says "one row per QA cycle"; this break is invisible whenever the verdict repeats, which is
the case obs #205 describes.

## Recommendation

Tie the row to the cycle, not only to the token. One rule that needs no new field: when the
read-back runs, the newest `QA gate` row must come after every `qa-fix` row, because in the loop a
`qa-fix` row always comes before the next QA cycle's row. Measure the rule on the accepted corpus
before adopting it. Add a VERDICT_HALTS case for the same-token cycle with no row.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-19

**Root Cause**: the verdict rule was written as a token comparison, and a token cannot tell two cycles with the
same verdict apart. The row has no cycle field, but the loop's order supplies one: every cycle after a
fix writes its row after that fix's `qa-fix` row, and the read-back runs right after QA writes.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-19

**Fix Description**: `verdictProblems` halts when a `qa-fix` row follows the newest `QA gate` row, naming this cycle's
gate as having no row of its own. Corpus: 269 cycles follow a fix, and each wrote its row after it.

**Files Modified**:

- `shared/resources/qa-read-back.js` — `verdictProblems`
- `shared/resources/tests/qa-read-back.test.mjs`
- `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md` — read-back item 5; `CHANGELOG.md`

**Testing**: `halts on a cycle that repeats the verdict but wrote no row after the qa-fix row` (VERDICT_HALTS); control `a qa-fix row followed by this cycle's own QA gate row reads clean`. Mutation `.some(() => false)` → the VERDICT_HALTS case red → covered.

**Verification Steps for QA**: The QA cycle 2 reproduction (gate 2 CONCERNS, rows `QA gate CONCERNS | qa-task` then `qa-fix`) now exits 1.

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-10-19 | New | qa-task | Raised by task.192.qa.2.read-back-checks-this-cycles-verdict.md |
| 2026-10-19 | In Progress | qa-fix | Investigation started |
| 2026-10-19 | Ready for QA | qa-fix | Fixed in verdictProblems |

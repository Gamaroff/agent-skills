# Bug Report: Task 117 - The `beneath` count is not fence-aware and counts label paragraphs, so the preflight's "stopped" wording fires where "nothing under it" is right

**Task**: [Link](./task.117.card-preflight-heading-only.md)
**Bug ID**: TASK-117-BUG-7
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Closed
**Found By**: QA Engineer (cycle-5 review CR5-1, CR5-2, CR5-3, reproduced)
**Date Found**: 2026-09-17

## Description

`beneath` (cycle 4) is computed over `paras`, which are split on blank lines with no fence
awareness, and filtered with `isProseBlock`, which does not exclude label paragraphs. So:

1. a fence containing a blank line beneath a label yields `beneath: 1` (the fence's tail fragment
   passes `isProseBlock`) — the preflight says the content beneath would reach the card after a
   `###` conversion, when nothing summarisable is there (CR5-1);
2. a label followed only by another label yields `beneath: 1` (CR5-3);
3. `omitted` on the heading-only path counts blocks *after* the label only, whereas the prose path
   counts every other paragraph, so the `+N more` figure differs for the same shape (CR5-2).

The **card output is correct** in all three; what is wrong is the preflight's advisory wording and
one pointer count.

## Steps to Reproduce

```js
lib.summariseSection("**Before** (GitHub):\n\n```\nx\n\ny\n```\n")   // → { omitted: 2, beneath: 1 }  expected beneath 0
lib.summariseSection("**Before** (GitHub):\n\nKey points:\n")         // → { omitted: 1, beneath: 1 }  expected beneath 0
lib.summariseSection("| a |\n| - |\n| 1 |\n\nKey points:\n\n- a\n").omitted // → 1; the prose path gives 2
```

## Expected Behavior

`beneath` counts fence-aware, non-label, summarisable blocks after the label; `omitted` on the
heading-only path equals `paras.length - 1` like the prose path.

## Recommendation

Compute `beneath` from a fence-aware re-split (a fence is one unit) filtered by
`isProseBlock(p) && !isLabelOnly(p)`; set `omitted = paras.length - 1`. Fixtures for all three;
mutation-prove.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-17 · **Developer**: Claude (qa-fix, pipeline cycle 5)

**Root Cause Analysis**: `paras` was split on blank lines with no fence awareness (a pre-existing
imprecision the new `beneath` counter made visible), and `isProseBlock` admits label paragraphs.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-17

**Fix Description**: new `splitBlocks(src)` — a `makeFenceTracker`-aware block splitter — replaces
the naive split, so a fence containing a blank line is one block on every path (the prose path's
`+N more` no longer counts a fence's tail); `beneath` filters `isProseBlock(p) && !isLabelOnly(p)`;
the heading-only `omitted` is `paras.length - 1`, matching the prose path. Also: in-test `require`s
replaced by the file's existing imports (CR5-4); the `summariseSection` API row updated (CR5-5).

**Files Modified**: `shared/resources/jira-sync.js`; `shared/resources/tests/jira-sync-card-summary.test.mjs`; `shared/resources/tests/card-preflight.test.mjs`; `shared/resources/tracker-card-summary.md`

**Testing**: mutations M14 (naive split), M15 (labels count as beneath), M16 (`omitted` after-only)
each red the CR5 fixture; suites 499/499.

**Verification Steps for QA**: `summariseSection("**Before** (GitHub):\n\n```\nx\n\ny\n```")` → `{omitted: 1, beneath: 0}`; `summariseSection("**Before** (GitHub):\n\nKey points:")` → `beneath: 0`; same `omitted` for a leading-table shape whether the next block is a label or a sentence.

| Date       | Status       | Changed By | Notes                                 |
| ---------- | ------------ | ---------- | ------------------------------------- |
| 2026-09-17 | New          | QA         | Filed from QA cycle 5 (CR5-1..3)      |
| 2026-09-17 | In Progress  | qa-fix     | Investigation started                 |
#### QA Verification (Ready for QA → Closed)

**Date**: 2026-09-17 · **QA cycle 6**

All three shapes reproduced from a clean process: label + fence containing a blank line → `{omitted: 1, beneath: 0}` ("nothing under it" wording); label + label → `beneath: 0`; table + label + list and table + sentence + list both `omitted: 2`. Mutation proofs M14 (naive split), M15 (labels count as beneath) and M16 (`omitted` after-only) each red the CR5 fixture and the source was restored byte-identical. 499/499 across the card + sync suites. **Verified fixed — Closed.**

| 2026-09-17 | Ready for QA | qa-fix     | Fix implemented, mutation-proven      |
| 2026-09-17 | Closed       | QA         | Verified in QA cycle 6 (gate 6)       |

# Bug Report: Task 117 - The heading-only `omitted` count starves the live card's `+N more` pointer

**Task**: [Link](./task.117.card-preflight-heading-only.md)
**Bug ID**: TASK-117-BUG-6
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle-4 review CR4-1, reproduced)
**Date Found**: 2026-09-17

## Description

The cycle-2 fix for CR2-2 made the `heading-only` branch of `summariseSection` return `omitted` as
the number of *summarisable* blocks beneath the label, so the preflight message could say whether a
`###` conversion would deliver anything. But `omitted` is also what `summaryBlockNodes` uses to
render the live card's `+N more in <doc>` pointer, and the summariser's own contract is that
trimming is always announced. A label followed by only a fence or table now yields `omitted: 0`, so
the live card publishes the bare label with **no pointer** — silent truncation on the sync path,
which does not gate on the preflight.

## Steps to Reproduce

```js
lib.summariseSection("**Before** (GitHub):\n\n```\nx\n```\n")
// → { text: "**Before** (GitHub):", omitted: 0, kind: "heading-only" }
lib.summaryBlockNodes({ heading: "Breaking Changes", content: "**Before** (GitHub):\n\n```\nx\n```\n", sourceUrl: "https://x/doc.md" })
// → heading + the label paragraph; no "+1 more in the full document" pointer
```

## Expected Behavior

`omitted` stays the honest count of every block after the label (so the pointer renders), and the
"what a `###` conversion would deliver" count travels in a separate field the preflight reads.

## Actual Behavior

As above.

## Impact

A card reader sees a label and is not told that anything was cut — the failure the summariser's
`omitted` contract exists to prevent.

## Recommendation

Return `omitted = paras.length - firstIdx - 1` from the heading-only branch and add `beneath` (the
summarisable count) to the result; `checkCardSections` keys the stopped/nothing-under-it message on
`beneath` and reports both. Fixtures on both paths; mutation-prove.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-17 · **Developer**: Claude (qa-fix, pipeline cycle 4)

**Root Cause Analysis**: cycle 2 folded two different numbers into one field — "how many blocks
were cut" (what the card's pointer needs) and "how many of them a `###` conversion would deliver"
(what the preflight message needs).

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-17

**Fix Description**: the heading-only branch returns `omitted = after.length` (every block after
the label) and a new `beneath = after.filter(isProseBlock).length`; `checkCardSections` keys the
stopped / nothing-under-it wording on `beneath` and carries both in the block.

**Files Modified**: `shared/resources/jira-sync.js`; `shared/resources/tests/jira-sync-card-summary.test.mjs` (CR4-1 fixture asserting the `+1 more` pointer survives on the card path; block-shape fixture gains `beneath`)

**Testing**: mutation M13 (`omitted` folded back onto `beneath`) reds the CR4-1 fixture.

**Verification Steps for QA**: `summaryBlockNodes({content: "**Before** (GitHub):\n\n```\nx\n```", sourceUrl})` renders `+1 more in …`; `checkCardSections` on the same still says "nothing under it".

| Date       | Status       | Changed By | Notes                                 |
| ---------- | ------------ | ---------- | ------------------------------------- |
| 2026-09-17 | New          | QA         | Filed from QA cycle 4 (CR4-1)         |
| 2026-09-17 | In Progress  | qa-fix     | Investigation started                 |
| 2026-09-17 | Ready for QA | qa-fix     | Fix implemented, mutation-proven      |

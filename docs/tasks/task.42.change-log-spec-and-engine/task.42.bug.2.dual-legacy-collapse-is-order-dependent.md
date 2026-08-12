# Bug Report: Task 42 - Dual-legacy collapse only works in one document order

**Task**: [Link](./task.42.change-log-spec-and-engine.md)
**Bug ID**: TASK-42-BUG-2
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-08-12

## Description

A document synced to both trackers carries both legacy marker pairs. The task states — as a
Success Criterion and in the spec — that these **collapse into one block with no duplication**.
They do so only when the `jira-sync-*` block appears **before** the `github-sync-*` block in the
document. In the opposite order, both survive.

Two pieces of code combine to produce it:

1. `findChangeLog()` (`shared/resources/change-log.js:275`) iterates `LEGACY_MARKER_PAIRS` in
   **array order** — jira first, then github — and returns the first pair that matches
   *anywhere in the document*. Document position is never considered.
2. `collapseOtherLegacyBlocks()` (`:371`, `:418`) is handed only
   `content.slice(found.end)` — the remainder of the document **after** the found block.

So when the github block physically precedes the jira block, `findChangeLog` still returns the
jira block, and the github block lies in `content.slice(0, found.start)` — a region
`collapseOtherLegacyBlocks` never looks at.

## Steps to Reproduce

```js
const CL = require("./shared/resources/change-log.js");

const doc = [
  "# Story", "",
  "<!-- github-sync-changelog-start -->",       // github FIRST
  "## Change Log", "",
  "| 2026-03-01 12:00 | GitHub issue created |",
  "<!-- github-sync-changelog-end -->", "",
  "## Middle", "",
  "<!-- jira-sync-changelog-start -->",         // jira SECOND
  "## Change Log", "",
  "| 2026-04-28 09:40 | Jira story created |",
  "<!-- jira-sync-changelog-end -->", "",
  "## Dev Agent Record", "",
].join("\n");

CL.upsertChangeLog(doc, { date: "2026-08-12", description: "New", author: "x" },
                   { docType: "story" });
```

## Expected Behavior

One `## Change Log` block, both legacy rows migrated to four columns and merged in date order,
zero legacy markers remaining. This is exactly what the reverse ordering already produces.

## Actual Behavior

| Document order | `## Change Log` blocks | Legacy markers left |
|---|---|---|
| jira, then github (tested) | 1 | none — correct |
| **github, then jira (untested)** | **2** | **`github-sync-changelog-*` survives** |

The github block is left untouched, still 2-column, still wearing its superseded markers — and
the document now has two Change Logs, which is the exact condition the task set out to remove
(§2, Current Problem 3: *"A document synced to both trackers grows two independent,
separately-maintained Change Log blocks."*).

## Impact

A **stated Success Criterion fails**: *"Both legacy marker pairs migrate in place, widened to
four columns, with no duplication."* It passes for one of two possible document orderings.

Aggravating factor: the existing test at
`shared/resources/tests/change-log.test.mjs:227` ("a document with BOTH legacy pairs collapses
to one block") only constructs the **jira-first** ordering, so the suite reports green and gives
positive confidence in behaviour that is half-broken. The passing test is what makes this worth
HIGH rather than MEDIUM — nothing signals the gap.

There is no reason to expect one ordering to dominate in the wild: which block is first depends
on which tracker the document was synced to first, and the old engine inserted at the top of the
body, so a later sync's block would land *above* an earlier one.

## Recommendation

Two changes, either of which fixes the reported case; both together are correct:

1. **Make `findChangeLog` positional.** Collect a candidate match for every pair (current +
   both legacy), then return the one with the **lowest `start` index**, rather than the first in
   array order. This makes "which block is the primary one" a property of the document, not of a
   constant's declaration order.

2. **Scan the whole document in the collapse pass.** Pass the full content to
   `collapseOtherLegacyBlocks` with the found block's range excluded, instead of only the tail
   slice, so a stray block on either side is absorbed. Note this requires the caller to
   re-derive `found.start`/`found.end` offsets against the mutated string, or to perform the
   collapse **before** locating the primary block.

Add regression tests for **both** orderings — the existing dual-pair test should be
parameterised over the two arrangements rather than asserting one.


---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-08-12

Reproduced immediately. Both mechanisms named in the report were present and both contributed:
selection by `LEGACY_MARKER_PAIRS` array order, and a collapse pass that only received the tail
slice. Either alone would have produced the bug for one ordering.

**Root cause**: "which block is the document's Change Log" was answered from a constant's
declaration order instead of from the document. Everything downstream inherited that.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-08-12

Both recommendations applied, as the report advised:

1. **Selection is positional.** `findChangeLog` now collects a candidate for the current pair and
   for each legacy pair, then returns the one with the **lowest `start` index**. Whichever block
   appears first in the document wins, regardless of declaration order.
2. **The collapse sweeps both sides.** `upsertChangeLog` calls `collapseOtherLegacyBlocks` on
   `content.slice(0, found.start)` *and* `content.slice(found.end)`, merging both results. With
   selection now positional the head is usually already clean — sweeping it anyway is what makes
   that an optimisation rather than a correctness dependency.

**Files Modified**:
- `shared/resources/change-log.js` — positional selection; two-sided collapse
- `shared/resources/tests/change-log.test.mjs` — dual-legacy test parameterised over both orderings

**Testing**:
- The existing dual-pair test is now a loop over `["jira first", "github first"]`, and additionally
  asserts that each row is widened with the correct inferred author. The github-first case fails
  against the pre-fix engine and passes after.
- Full suite: 1141 passing, 0 failing

**Verification steps for QA**:
1. `node --test shared/resources/tests/change-log.test.mjs` — both `D: BOTH legacy pairs collapse
   … (jira first)` and `… (github first)` pass
2. Re-run the reproduction snippet in this report: one block, zero legacy markers, rows in date order

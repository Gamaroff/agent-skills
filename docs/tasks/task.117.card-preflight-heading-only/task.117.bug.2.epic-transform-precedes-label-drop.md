# Bug Report: Task 117 - Epic `transform` runs before the bold-label drop, so the fix never reaches epic cards

**Task**: [Link](./task.117.card-preflight-heading-only.md)
**Bug ID**: TASK-117-BUG-2
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Closed
**Found By**: QA Engineer (diff code review CR-2, reproduced)
**Date Found**: 2026-09-17

## Description

`EPIC_CARD_SECTIONS.Summary` carries a `transform` that rewrites `**Label:**` → `Label:` so ADF does
not have to render mid-paragraph bold. Both `buildCardSections` and `checkCardSections` apply the
transform **before** `summariseSection`, so the new bold-label drop in `dropHeadingLines` never sees
an epic's standalone `**Existing System Context:**` line — it has already become plain `Existing
System Context:`, which the prose path takes as the first paragraph and stops in front of the list.

## Steps to Reproduce

```js
const lib = require("./shared/resources/jira-sync.js");
lib.checkCardSections("## Epic Goal\n\n**Existing System Context:**\n\n- a\n- b\n", lib.CARD_SECTIONS_BY_KIND.epic)
// → findings [["Summary","heading-only"],["(whole card)","no-body"]]
//   blocks   [{ heading: "Summary", status: "heading-only", text: "Existing System Context:" }]
```

## Expected Behavior

The list under the label reaches the card for every document kind — the task's fix is stated as
kind-neutral — and the preflight reports `ok` with `kind: list`.

## Actual Behavior

The epic card still publishes the label and stops (the task.117 defect, unfixed for epics), and the
preflight now reports it as Critical `heading-only` "with nothing under it" plus `no-body`, although
a list sits under the label.

## Impact

The one document kind whose spec *specifically* handles bold labels is the one the fix skips, and the
new finding blames the author for content that exists. Epic cards synced after this PR would be
unchanged from before it.

## Recommendation

Drop standalone label lines **before** the transform — e.g. have `summariseSection` (or the two
callers) run `dropHeadingLines` on the raw section first, then apply `spec.transform` to what
remains — so the transform only ever sees mid-paragraph bold runs, which is what it was written for.
Add an epic fixture beside the C2 group and mutation-prove it.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-17
**Developer**: Claude (qa-fix, pipeline cycle 1)

**Root Cause Analysis**: both callers (`buildCardSections`, `checkCardSections`) applied
`spec.transform(raw)` and passed the result to `summariseSection`, so the epic's `**Label:**` →
`Label:` rewrite ran before `dropHeadingLines` could see the bold-only line.

**Proposed Fix**: move the transform inside `summariseSection` as an option, applied to the lines
*after* `dropHeadingLines`.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-17

**Fix Description**:
- `summariseSection(content, { transform })` drops heading/label lines first, then transforms what
  remains. `summaryBlockNodes` gained the same option; `buildCardSections` and `checkCardSections`
  pass `spec.transform` through instead of pre-applying it.

**Files Modified**:
- `shared/resources/jira-sync.js` — `summariseSection`, `summaryBlockNodes`, `buildCardSections`, `checkCardSections`
- `shared/resources/tests/jira-sync-card-summary.test.mjs` — `H2: an epic bold label is dropped before the transform…` (also asserts the transform still flattens a mid-paragraph bold run)

**Testing**: 69/69; mutation M2 (transform applied before the drop) reds the CR-2 fixture.

**Verification Steps for QA**:
1. `checkCardSections("## Epic Goal\n\n**Existing System Context:**\n\n- a\n- b\n", CARD_SECTIONS_BY_KIND.epic)` → `ok: true`, block `kind: list`
2. `summariseSection("Some text **Existing:** more text.", { transform })` → `Some text Existing: more text.`

| Date       | Status       | Changed By | Notes                                 |
| ---------- | ------------ | ---------- | ------------------------------------- |
| 2026-09-17 | New          | QA         | Filed from QA cycle 1 (CR-2)          |
| 2026-09-17 | In Progress  | qa-fix     | Investigation started                 |
| 2026-09-17 | Ready for QA | qa-fix     | Fix implemented, mutation-proven      |
| 2026-09-17 | Closed       | QA         | Verified in QA cycle 2 (refute pass): every reproduced shape now `ok`; mutation proofs re-run |

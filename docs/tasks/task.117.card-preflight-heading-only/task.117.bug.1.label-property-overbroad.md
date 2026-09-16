# Bug Report: Task 117 - `isLabelOnly` flags any terminator-less prose as a label, and its list-item half is inert

**Task**: [Link](./task.117.card-preflight-heading-only.md)
**Bug ID**: TASK-117-BUG-1
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Closed
**Found By**: QA Engineer (diff code review CR-1 + CR-3, reproduced)
**Date Found**: 2026-09-17

## Description

The `heading-only` property (`isLabelOnly(text, kind)` in `shared/resources/jira-sync.js`) is "prose
with no sentence terminator and no list item". Two defects in how it is evaluated:

1. **The list-item half can never fire.** The `text` it receives is the summariser's prose output,
   whose newlines were already collapsed to spaces (`first.replace(/\n+/g, " ")`), so
   `t.split("\n").some(RE_BULLET…)` tests a single line that starts with the lead-in, never a bullet.
2. **"No terminator" alone is taken as proof of a label.** Any terminator-less prose lead is now a
   Critical `heading-only` finding.

## Steps to Reproduce

```js
const lib = require("./shared/resources/jira-sync.js");
const t = lib.CARD_SECTIONS_BY_KIND.task;
lib.checkCardSections("## Overview\n\nA summary.\n\n## Success Criteria\n\nThe task is done when all of:\n- a\n- b\n", t).findings
// → [{ section: "Success Criteria", code: "heading-only", severity: "critical" }]
lib.checkCardSections("## Overview\n\nAdd a dark-mode toggle to settings\n\n## Success Criteria\n\n- a\n", t).findings
// → [{ section: "Summary", code: "heading-only", severity: "critical" }]
lib.checkCardSections("## Overview\n\nA summary.\n\n## Success Criteria\n\n- a\n\n## Breaking Changes\n\nNone\n", t).findings
// → [{ section: "Breaking Changes", code: "heading-only", severity: "important" }]
```

## Expected Behavior

- A lead-in sentence ending in a colon with bullets directly beneath is a list-bearing prose block —
  the shape `isListSection`'s own comment names as legitimate — and must not be `heading-only`.
- A one-line Summary without a full stop, or a Breaking Changes reading `None`, is content and must
  not be a finding. The property must describe a **label**, not merely unpunctuated prose.

## Actual Behavior

All three raise `heading-only`; `review-task` / `review-story` / `review-epic` map it to Critical, so
a document with any of those shapes is NO-GO. The in-repo corpus is clean only because every real
document happens to end its lead with a period.

## Impact

False Critical at review on legitimate documents; the finding vocabulary the task added becomes noise
on exactly the kind of terse card summary the contract encourages. Not shipped to consumers yet
(this PR).

## Recommendation

Evaluate the property against the **pre-collapse section lines**, not the joined text: a section is
`heading-only` when, after dropping heading/label lines, it still resolves to a single short line that
*looks like a label* — no terminator, no list item on any line, and (a) it ends in a colon **or** (b)
it is ≤ N words and the summariser omitted content beneath it (`omitted > 0`). Plain terminator-less
prose with nothing omitted is content. Add fixtures for: lead-in colon + bullets with no blank line;
one-line summary without a period; Breaking Changes `None`; a >600-char paragraph truncated to `…`.
Mutation-prove each.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-17
**Developer**: Claude (qa-fix, pipeline cycle 1)

**Root Cause Analysis**: `isLabelOnly(text, kind)` was evaluated on the summariser's *output* — the
first paragraph after `first.replace(/\n+/g, " ")` — so (1) its per-line bullet test saw one line
that starts with the lead-in and never a bullet, and (2) its only positive signal was "no terminator",
which is a property of most terse card leads, not of labels.

**Proposed Fix**: decide the property on the paragraph's own lines *before* the join, and require a
label's shape: exactly one line, no terminator, no bullet on any line, and either a bold-only run
(`RE_BOLD_LABEL`) or a short (≤ 4 words) trailing-colon line.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-17

**Fix Description**:
- `isLabelOnly(paragraph)` now takes the pre-collapse paragraph and returns true only for a label by
  shape (`LABEL_MAX_WORDS = 4`). `summariseSection` calls it on `first` before the sentence split and
  returns `kind: "heading-only"` with the label as `text` and `omitted = paras.length - 1`.
- `checkCardSections` branches on `kind === "heading-only"` (the old text-level check is gone) and
  its message/fix now say whether content was omitted beneath the label (CR-4).

**Files Modified**:
- `shared/resources/jira-sync.js` — `isLabelOnly`, `summariseSection`, `checkCardSections`
- `shared/resources/tests/jira-sync-card-summary.test.mjs` — `H: isLabelOnly describes a label…`,
  `H2` fixtures for lead-in colon + bullets (with and without a blank line, and the line-level
  `See:\n- a:` case), one-line summary, `None`, truncated paragraph, CR-4 message branch

**Testing**: 69/69 card suites; mutation M1 (check moved back onto the collapsed text) reds the
CR-1 fixture; M3 (shape clause removed) reds the CR-3 fixture plus three pre-existing prose fixtures.

**Verification Steps for QA**:
1. `checkCardSections` on `The task is done when all of:\n- a\n- b` → `ok: true`
2. On `Add a dark-mode toggle to settings` (Summary), `None` (Breaking Changes), a 200-word paragraph → `ok: true`
3. On `**Functional**` alone, `Key points:` alone → `heading-only`

| Date       | Status       | Changed By | Notes                                 |
| ---------- | ------------ | ---------- | ------------------------------------- |
| 2026-09-17 | New          | QA         | Filed from QA cycle 1 (CR-1, CR-3)    |
| 2026-09-17 | In Progress  | qa-fix     | Investigation started                 |
| 2026-09-17 | Ready for QA | qa-fix     | Fix implemented, mutation-proven      |
| 2026-09-17 | Closed       | QA         | Verified in QA cycle 2 (refute pass): every reproduced shape now `ok`; mutation proofs re-run |

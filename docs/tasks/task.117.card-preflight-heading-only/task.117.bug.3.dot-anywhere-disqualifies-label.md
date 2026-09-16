# Bug Report: Task 117 - A dot anywhere in the line disqualifies a bold label, so `**Changes to jira-sync.js**:` still publishes the label and stops

**Task**: [Link](./task.117.card-preflight-heading-only.md)
**Bug ID**: TASK-117-BUG-3
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Closed
**Found By**: QA Engineer (cycle-2 refute review CR-1, reproduced)
**Date Found**: 2026-09-17

## Description

`RE_BOLD_LABEL` excludes `.`, `!` and `?` from the whole bold run (`[^*\n.!?]+`), and `isLabelOnly`
rejects a line on `/[.!?]/` anywhere in it. Both were written to keep `**None.**` on the content
side — but a label naming a file (`**Changes to jira-sync.js**:`) or a version (`**v0.48 notes**:`)
contains a dot that is not a terminator, so it is neither dropped by `dropHeadingLines` nor reported
by `isLabelOnly`, and the card publishes the label and stops in front of its list. That is the
task's own defect, reached through a filename.

## Steps to Reproduce

```js
const lib = require("./shared/resources/jira-sync.js");
lib.summariseSection("**Changes to jira-sync.js**:\n\n- a\n- b")
// → { kind: "prose", text: "**Changes to jira-sync.js**:", omitted: 1 }
lib.checkCardSections("## Overview\n\nA.\n\n## Success Criteria\n\n**Changes to jira-sync.js**:\n\n- a\n", CARD_SECTIONS_BY_KIND.task).ok
// → true
```

## Expected Behavior

A bold-only line ending in a colon is a label whatever it contains before the colon; only a
**trailing** terminator makes a bold run a sentence. The list beneath renders; nothing is reported.

## Actual Behavior

`ok: true`, label published, list omitted — silently.

## Impact

Any label that names a file or a version escapes both the drop and the finding. The repository's
own documents name files constantly.

## Recommendation

Test for a trailing terminator only: in `RE_BOLD_LABEL` forbid `[.!?]` immediately before the closing
`**` rather than anywhere in the run; in `isLabelOnly` use `/[.!?]\s*$/`. `**None.**` stays content,
`**jira-sync.js changes**:` becomes a label. Fixtures for both; mutation-prove.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-17
**Developer**: Claude (qa-fix, pipeline cycle 2)

**Root Cause Analysis**: both the regex and the property were written to keep `**None.**` on the
content side by rejecting a terminator *anywhere* in the line, when only a *trailing* terminator
distinguishes a sentence from a label.

**Proposed Fix**: `RE_BOLD_LABEL` forbids `[.!?]` only immediately before the closing `**`;
`isLabelOnly` tests `/[.!?]\**\s*$/`.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-17

**Fix Description**:
- `RE_BOLD_LABEL = /^\s*\*\*[^*\n]*[^*\n.!?\s]\*\*:?\s*$/` — a dot inside the run (`jira-sync.js`,
  `v0.48`) no longer disqualifies; a trailing one still does.
- `isLabelOnly` rejects on a trailing terminator only.
- Three more real documents surfaced by the corrected test (task.42, 43, 44 — `**Before**
  (\`jira-sync.js:428\`):` straight into a fence, hidden before only by the dot in the filename) were
  given a lead sentence, same call as task.104.

**Files Modified**:
- `shared/resources/jira-sync.js` — `RE_BOLD_LABEL`, `isLabelOnly`
- `shared/resources/tests/jira-sync-card-summary.test.mjs` — `H3 … (CR2-1)`
- `docs/tasks/task.4{2,3,4}.*/task.4{2,3,4}.*.md` — Breaking Changes lead sentence + Change Log row

**Testing**: mutations M5 (regex: dot anywhere) and M6 (property: terminator anywhere) each red the
CR2-1 fixture; corpus 0 of 120 after the three document fixes.

**Verification Steps for QA**:
1. `summariseSection("**Changes to jira-sync.js**:\n\n- a\n- b")` → `kind: list`
2. `summariseSection("**None.**").text` → `**None.**`
3. `isLabelOnly("**v0.48 notes**:")` → true; `isLabelOnly("**Do it now.**")` → false

| Date       | Status       | Changed By | Notes                                 |
| ---------- | ------------ | ---------- | ------------------------------------- |
| 2026-09-17 | New          | QA         | Filed from QA cycle 2 (CR2-1)         |
| 2026-09-17 | In Progress  | qa-fix     | Investigation started                 |
| 2026-09-17 | Ready for QA | qa-fix     | Fix implemented, mutation-proven      |
| 2026-09-17 | Closed       | QA         | Verified in QA cycle 3: file/version labels are labels, `**None.**` is content; M5/M6 red |

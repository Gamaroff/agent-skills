# Bug Report: Task 117 - The bare-bold early return misses a label whose colon sits inside the bold (`**Functional:**`)

**Task**: [Link](./task.117.card-preflight-heading-only.md)
**Bug ID**: TASK-117-BUG-4
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle-3 review CR3-1, reproduced)
**Date Found**: 2026-09-17

## Description

The cycle-2 fix for CR2-4 returns a bold-only line that is the whole section as content unless it
ends in a colon, testing `/:\s*$/` on the raw line. A label written `**Functional:**` — colon inside
the bold, the shape `RE_BOLD_LABEL`'s own comment names — ends in `**`, so the test misses it and the
section is returned as `kind: prose`; the card would publish the bare label and the preflight says
`ok`.

## Steps to Reproduce

```js
lib.summariseSection("**Functional:**")           // → { kind: "prose", text: "**Functional:**" }
lib.summariseSection("**Existing System Context:**") // → same
lib.summariseSection("**Functional**:")            // → { kind: "heading-only" }  (colon outside — correct)
```

## Expected Behavior

Both colon placements are labels; alone, both are `heading-only`.

## Actual Behavior

Colon-inside is content, colon-outside is a label.

## Impact

The epic spec's documented label shape (`**Label:**`) is the one the shortcut misses.

## Recommendation

Make the colon test see through the closing bold — `/:\**\s*$/` — the same shape `isLabelOnly` uses
for the terminator. Fixture for `**Label:**` alone beside the `**None**` one; mutation-prove.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-17 · **Developer**: Claude (qa-fix, pipeline cycle 3)

**Root Cause Analysis**: the CR2-4 shortcut tested `/:\s*$/` on the raw line; a colon inside the
bold is followed by `**`, so the test never saw it.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-17

**Fix Description**: the colon test sees through the closing bold — `/:\**\s*$/` — the same shape
`isLabelOnly` uses for the terminator. `RE_BOLD_LABEL` was also anchored at column 0 (CR3-4) so an
indented bold line under a list item or inside an indented fence is not a grouping label.

**Files Modified**: `shared/resources/jira-sync.js`; `shared/resources/tests/jira-sync-card-summary.test.mjs` (fixtures in the CR2-4 test and a new CR3-4 test)

**Testing**: mutation M10 (colon test blind to the closing bold) reds the CR2-4 fixture; M11
(`RE_BOLD_LABEL` unanchored) reds the CR3-4 fixture.

**Verification Steps for QA**: `summariseSection("**Functional:**").kind === "heading-only"`;
`summariseSection("**None**").kind === "prose"`; `dropHeadingLines("- item\n\n    ```\n    **Functional**\n    ```")` keeps the bold line.

| Date       | Status       | Changed By | Notes                                 |
| ---------- | ------------ | ---------- | ------------------------------------- |
| 2026-09-17 | New          | QA         | Filed from QA cycle 3                 |
| 2026-09-17 | In Progress  | qa-fix     | Investigation started                 |
| 2026-09-17 | Ready for QA | qa-fix     | Fix implemented, mutation-proven      |

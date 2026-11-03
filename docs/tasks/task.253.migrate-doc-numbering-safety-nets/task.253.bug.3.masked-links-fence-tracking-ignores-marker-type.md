---
type: bug
title: "task.253 bug 3: maskedLinks closes a code fence on any fence line"
description: "maskedLinks ignores the opening marker's character and length, so a tilde fence holding a backtick fence line loses its tracking and later links go unreported."
status: ready-for-qa
severity: low
priority: P3
updated: 2026-11-03
---

# Bug Report: Task 253 - maskedLinks closes a code fence on any fence line

**Task**: [task.253.migrate-doc-numbering-safety-nets.md](./task.253.migrate-doc-numbering-safety-nets.md)
**Bug ID**: TASK-253-BUG-3
**Severity**: LOW
**Priority**: P3
**Status**: Ready for QA
**Found By**: QA Engineer (diff code review CR-5, cycle 2, reproduced)
**Date Found**: 2026-11-03

## Description

`maskedLinks` in `shared/resources/migrate-doc-numbering.mjs` (line 2463) toggles a fence on every line matching `FENCE_LINE`. It does not record the opening marker's character or length. The link scanner in `doc-links.js` (`blankFences`) closes a fence only on the same character and at least the same length, so the two disagree on what is inside a fence.

## Steps to Reproduce

```js
maskedLinks("~~~\n[a](./before.md)\n```\n[b](./inner.md)\n~~~\n[c](./after.md)\n")
```

Measured on 2026-11-03: returns only `./before.md`. The backtick line closes the tilde fence early, the final `~~~` opens a new fence that never closes, and `./after.md` is dropped. `blankFences` treats lines 2 to 5 as one fence.

## Expected Behavior

`maskedLinks` and `blankFences` agree. A tilde fence is closed only by a tilde fence at least as long.

## Actual Behavior

Fence state is lost after an inner fence line of the other type. Masked links after it are not listed in the closing warnings.

## Impact

Low. `maskedLinks` only feeds a warning list (links inside fences or code spans that the tool did not rewrite), and a nested other-type fence is rare. The failure is a missing warning line.

## Recommendation

Track the opening marker's character and length and close only on a match. Export and reuse the `blankFences` logic if that is simpler. Add a test with the string above.

## Status History

| Date | Status | Changed by | Notes |
| --- | --- | --- | --- |
| 2026-11-03 | new | qa-task | Found in QA cycle 2 |
| 2026-11-03 | ready-for-qa | qa-fix | Fixed: fence closes only on the same character and at least the same length. Mutation-proven. |

## Developer Fix Cycle

### Iteration 1

**Root cause**: `maskedLinks` toggled on any fence line, so it lost track of a fence holding a fence line of the other type.

**Fix**: it records the opening marker and closes only on the same character at least as long, as `doc-links.js` `blankFences` does. Fence-looking lines inside a fence are blanked before the link extractor reads the body, because the extractor would otherwise read them as a fence of its own. A new test holds the reproduction string and two controls.

**Files modified**: `shared/resources/migrate-doc-numbering.mjs`, `shared/resources/tests/migrate-doc-numbering.test.mjs`.

**Verification for QA**: ignoring the opening character, or the length, turns the new test red.

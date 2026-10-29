---
type: bug
status: ready-for-qa # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'Medium'
created: '2026-10-30'
related: 'task 246'
description: 'a ui: key written with no value is missing to detect and present to configure, so setup is offered and can never complete'
---

# Bug Report: Task 246 - An empty `ui:` key makes `detect` and `configure` disagree

**Bug ID**: TASK-246-BUG-2
**Related**: [task.246](./task.246.wireframe-mapping-setup-offer.md)
**Status**: ✅ Ready for QA
**Priority**: Medium
**Severity**: Major
**Created**: 2026-10-30
**Assigned To**: dev
**QA Engineer**: QA Engineer

---

## Bug Description

**Summary**: A `ui:` key written with no value (`wireframeMap:`, `componentImport:`) parses to
`null`. `detect`'s `presentKeys` counts it as missing and reports `state: partial`, so the authoring
skill offers setup. `configure` counts the same key as present (`hasOwnProperty`), finds
`sameValue(null, v)` false, and refuses with `reason: exists, key: wireframeMap`.

**Expected Behavior**: The two commands agree on which keys are missing. `configure` fills an empty
key in place, and `detect` then reports `configured`.

**Actual Behavior**: Every wireframe offers setup, and accepting it always fails with `exists`. The
procedure's `exists` row says to re-run `detect` once, which offers the same thing again.

**Impact**: A consumer who blanked a key by hand gets an offer that can never succeed, on every
story and task that adds a wireframe.

---

## Reproduction Steps

**Environment**: Node 26, Linux; a scratch project.

**Steps to Reproduce**:

1. `skills-config.yaml` holds `ui:` and, on the next line, `  wireframeMap:` with no value.
2. `detect --json` → `state: partial`, with `wireframeMap` among the missing keys.
3. `configure --barrel src/components/index.ts --map docs/m.md --json` →
   `{"reason":"exists","key":"wireframeMap"}`, exit 1.

**Frequency**: Always
**Reproducible**: Yes

---

## Evidence

**Test Output**: QA cycle 1 run, recorded in
[task.246.qa.1.wireframe-mapping-setup-offer.md](./task.246.qa.1.wireframe-mapping-setup-offer.md).

**Related Files**: `shared/resources/wireframe-map.js:1348` (`configure`, partial path) and
`presentKeys`.

---

## Success Criteria Violation

**Reference**: § 9 Functional: "On a `ui:` block without `wireframeMap` … `detect` returns
`state: partial`, and `configure` inserts only the missing keys inside the block … so that `detect`
then returns `state: configured`."

**How It Failed**: For an empty key, `configure` inserts nothing and refuses, so `detect` never
reaches `configured`.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-30
**Developer**: qa-fix (develop-task, QA cycle 1)

**Root Cause Analysis**: the two commands had two definitions of "present". `detect` used
`presentKeys` (a non-empty string or list); `configure` used `hasOwnProperty`, which counts a key
that parsed to `null` or `""`. The read-back check also compared every prior `ui:` key unchanged,
so even a correct fill of a blank key would have read as a failure.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-30

**Fix Description**: `configure` decides presence with `presentKeys`, the same function `detect`
uses. A key that is in the block but blank is rewritten on its own line, at the block's indent,
keeping that line's ending; the other missing keys are inserted as before. `readsBack` no longer
requires a written key to keep its prior (blank) value.

**Files Modified**:

- `shared/resources/wireframe-map.js` — `configure` (partial path), `readsBack`
- `shared/resources/tests/wireframe-map.test.mjs` — "configure fills a key written with no value
  where it stands, so detect then reads configured"

**Testing**: five blocks — `wireframeMap:`, `wireframeMap: ""` before another top-level key, a blank
`componentImport:`, a CRLF file whose blank key carries a comment, and a blank key on a last line
with no newline — plus `--decline` over a blank `wireframeMap:`. Each asserts `detect` goes
`partial` → `configured` (or `declined`), the key appears once, and every other line is kept in
order. Mutation-proven: the old presence rule, writing the blank key a second time, and the old
read-back comparison each turn the test red.

**Verification Steps for QA**: rerun the cycle 1 reproduction; `configure` answers `ok` and `detect`
then answers `configured`.

---

## Status History

| Date       | Status       | Changed By  | Notes                                             |
| ---------- | ------------ | ----------- | ------------------------------------------------- |
| 2026-10-30 | New          | QA Engineer | Bug created                                       |
| 2026-10-30 | In Progress  | qa-fix      | Investigation started                             |
| 2026-10-30 | Ready for QA | qa-fix      | One presence rule; blank key filled where it stands |

---

## Resolution Summary

[Will be completed when bug is closed]

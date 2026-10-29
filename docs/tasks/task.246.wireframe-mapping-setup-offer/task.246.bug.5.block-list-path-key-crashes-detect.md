---
type: bug
status: ready-for-qa # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'Medium'
created: '2026-10-30'
related: 'task 246'
description: 'presentKeys counts a block list as present for a path key that readUiConfig reads only as a string, so detect throws and configure writes a block whose barrel reads null'
---

# Bug Report: Task 246 - A block list under a path key crashes `detect`

**Bug ID**: TASK-246-BUG-5
**Related**: [task.246](./task.246.wireframe-mapping-setup-offer.md)
**Status**: ✅ Ready for QA
**Priority**: Medium
**Severity**: Major
**Created**: 2026-10-30
**Assigned To**: dev
**QA Engineer**: QA Engineer

---

## Bug Description

**Summary**: `presentKeys` counts any non-empty list as present, for every `ui:` key. `readUiConfig`
reads the path and string keys (`componentBarrel`, `componentImport`, `componentCatalogue`,
`catalogueSection`, `wireframeMap`) only as strings, so a list there reads as `null`. With
`componentBarrel:` followed by a `- …` item, `detect` calls `barrelExports(root, null)` and throws a
`TypeError`. `configure` skips its `--barrel` requirement and writes a block whose barrel reads back
as `null`. `detect` and `configure` agree with each other but not with the reader every skill uses.

**Expected Behavior**: one predicate decides "present", and it matches `readUiConfig`: a non-empty
string for the path and string keys, and a non-empty `nameList` for `componentExclude`.

**Actual Behavior**: `detect` throws (an uncaught error, not a `reason`); `configure` answers `ok`.

---

## Reproduction Steps

**Environment**: Node 26, Linux; a scratch project with a three-export barrel.

1. `skills-config.yaml`: `ui:` / `  componentBarrel:` / `    - src/components/index.ts`.
2. `detect` → `TypeError: The "paths[1]" argument must be of type string. Received null`.
3. `configure --map m.md` → `ok`, then `detect` → `configured` with a barrel that reads `null`.

**Frequency**: Always
**Reproducible**: Yes

---

## Evidence

QA cycle 2, [task.246.qa.2.wireframe-mapping-setup-offer.md](./task.246.qa.2.wireframe-mapping-setup-offer.md).
Related file: `shared/resources/wireframe-map.js:1026` (`presentKeys`).

---

## Success Criteria Violation

**Reference**: § 9 Functional: `detect` "writes no file in any state" and reports one of four states;
a partial block is completed so that `detect` then returns `configured`.

**How It Failed**: `detect` throws on a partial block, and `configure` reports a block configured
that no skill can use.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-30
**Developer**: qa-fix (develop-task, QA cycle 2)

**Root Cause Analysis**: `presentKeys` counted a non-empty list as present for every key, while
`readUiConfig` reads a list under a path key as no value. `detect` then took the key as set and
passed `null` to a path function, which threw; `configure` saw it present and answered `ok`.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-30

**Fix Description**: one presence rule matching `readUiConfig`: a non-empty string for a path key,
a non-empty name list for `componentExclude`. A list under a path key is now a blank key, so
`configure` needs `--barrel` and rewrites the key where it stands, removing the list lines under it.

**Files Modified**:

- `shared/resources/wireframe-map.js` — `presentKeys`, `configure` (blank-key replacement)
- `shared/resources/tests/wireframe-map.test.mjs` — "a list under a path key is no value…"

**Testing**: the block-list barrel goes `partial` → `configured` with the list removed and every
other line kept; `configure` without `--barrel` exits 2; a `componentExclude` list is still a value.
Mutation-proven: counting a list as present, and leaving the list lines in place, each turn the test
red.

**Verification Steps for QA**: rerun the cycle 2 reproduction; `detect` answers `partial` instead of
throwing.

### Iteration 2

#### Investigation (Reopened → In Progress)

**Date**: 2026-10-30
**Developer**: qa-fix (develop-task, QA cycle 3)

**Root Cause Analysis** (CR3-1, CR3-2): the loop that removed the list under a filled key stopped
at the first blank line, and it treated a comment as part of the list. yaml-subset reads past both,
so a list after a blank line or a same-indent comment was left under the new scalar
(`write-failed`), and a comment indented under the key was deleted.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-30

**Fix Description**: the removal skips blank and comment lines, keeping them in place, and removes
only list items and deeper value lines. It stops at the first line that is neither. A file that
ended without a newline still does. Blank keys are now filled before the missing keys are
inserted, so an insert follows the filled key directly.

**Files Modified**:

- `shared/resources/wireframe-map.js` — `configure` (blank-key fill, insert order)
- `shared/resources/tests/wireframe-map.test.mjs` — "configure removes the list under a blank key
  past blank lines and comments, and keeps them"

**Testing**: four layouts (a blank line before the list, a same-indent comment, a comment under the
key, a comment between list items with CRLF) and two last-line cases without a newline. Each
asserts the exact bytes, then `detect` → `configured`. Mutation-proven: stopping at a blank line or
comment, removing comments with the list, and adding a final newline each turn the test red.

**Verification Steps for QA**: rerun the cycle 3 reproductions; both answer `ok` and keep every
comment.

---

## Status History

| Date       | Status | Changed By  | Notes       |
| ---------- | ------ | ----------- | ----------- |
| 2026-10-30 | New    | QA Engineer | Bug created |
| 2026-10-30 | In Progress | qa-fix | Investigation started (cycle 2) |
| 2026-10-30 | Ready for QA | qa-fix | Fixed in QA cycle 2; see Developer Fix Cycle |
| 2026-10-30 | Reopened | qa-task | Partial (CR3-1): the list under a blank key is not removed past a blank line or comment; see task.246.qa.3.wireframe-mapping-setup-offer.md |
| 2026-10-30 | In Progress | qa-fix | Investigation started (cycle 3) |
| 2026-10-30 | Ready for QA | qa-fix | Fixed in QA cycle 3; see Iteration 2 |

---

## Resolution Summary

[Will be completed when bug is closed]

---
type: bug
status: closed # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'Medium'
created: '2026-10-30'
related: 'task 246'
description: 'only off is case-folded, so wireframeMap False, FALSE or "false" reads as a map path, against the documented any-case decline'
---

# Bug Report: Task 246 - `False`, `FALSE` and `"false"` do not decline

**Bug ID**: TASK-246-BUG-4
**Related**: [task.246](./task.246.wireframe-mapping-setup-offer.md)
**Status**: ✅ Closed
**Priority**: Medium
**Severity**: Major
**Created**: 2026-10-30
**Assigned To**: dev
**QA Engineer**: QA Engineer

---

## Bug Description

**Summary**: `isDecline` in `shared/resources/wireframe-map.js` accepts the boolean `false` and the
string `off` in any case. yaml-subset reads only the bare lowercase `false` as a boolean, so
`wireframeMap: False`, `FALSE` or `"false"` is a string, and the engine reads it as a map path.
`configuration.md` says "`false` or `off` (any case) declines it". `configure --map false` also
writes a map path of `false`, while `--map off` fails read-back.

**Expected Behavior**: any value whose trimmed lowercase is `false` or `off` declines. `configure`
refuses a `--map` value that would read as a decline, as a usage error.

**Actual Behavior**: `detect` reports `configured`, and `ensure` creates a map file named `False` at
the repository root.

---

## Reproduction Steps

**Environment**: Node 26, Linux; a scratch project.

1. `skills-config.yaml`: `ui:` / `  componentBarrel: src/components/index.ts` / `  wireframeMap: False`.
2. `detect` → `state: configured` (same for `FALSE` and `"false"`; `Off` → `declined`).
3. In an empty project, `configure --barrel src/components/index.ts --map false` → `ok`.

**Frequency**: Always
**Reproducible**: Yes

---

## Evidence

QA cycle 2, [task.246.qa.2.wireframe-mapping-setup-offer.md](./task.246.qa.2.wireframe-mapping-setup-offer.md).
Related file: `shared/resources/wireframe-map.js:154` (`isDecline`).

---

## Success Criteria Violation

**Reference**: § 5 Breaking Change 1 and `docs/reference/configuration.md` `ui.wireframeMap`: `false`
or `off` declines.

**How It Failed**: the documented any-case rule holds for `off` only.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-30
**Developer**: qa-fix (develop-task, QA cycle 2)

**Root Cause Analysis**: `isDecline` case-folded only `off`. yaml-subset reads only a bare
lowercase `false` as the boolean, so `False`, `FALSE` and `"false"` arrived as strings and were
taken as a map path. `configure --map false` wrote that path.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-30

**Fix Description**: `isDecline` accepts the trimmed, lowercased strings `false` and `off`.
`configure` refuses a `--map` that reads as a decline, as a usage error pointing at `--decline`.

**Files Modified**:

- `shared/resources/wireframe-map.js` — `isDecline`, `configure`
- `shared/resources/tests/wireframe-map.test.mjs` — the decline test gains `False`, `FALSE`,
  `"false"`; new "configure refuses a --map that reads as a decline…"
- `shared/resources/wireframe-component-mapping.md` — the `usage` row names the case

**Testing**: seven decline spellings through `ensure`, `resolve`, `record` and the CLI; four `--map`
spellings refused with nothing written, `offline.md` accepted. Mutation-proven: dropping `false`
from the set, and removing the `--map` refusal, each turn a test red.

**Verification Steps for QA**: `wireframeMap: False` → `detect` answers `declined`;
`configure --map false` exits 2.

---

## Status History

| Date       | Status | Changed By  | Notes       |
| ---------- | ------ | ----------- | ----------- |
| 2026-10-30 | New    | QA Engineer | Bug created |
| 2026-10-30 | In Progress | qa-fix | Investigation started (cycle 2) |
| 2026-10-30 | Ready for QA | qa-fix | Fixed in QA cycle 2; see Developer Fix Cycle |
| 2026-10-30 | Closed | qa-task | Verified in QA cycle 3 (task.246.qa.3.wireframe-mapping-setup-offer.md) |

---

## Resolution Summary

[Will be completed when bug is closed]

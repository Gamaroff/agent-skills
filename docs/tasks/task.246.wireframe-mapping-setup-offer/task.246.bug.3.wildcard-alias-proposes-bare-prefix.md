---
type: bug
status: closed # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'Medium'
created: '2026-10-30'
related: 'task 246'
description: 'detect proposes the bare prefix of a wildcard tsconfig alias, which TypeScript does not resolve'
---

# Bug Report: Task 246 - `detect` proposes a wildcard alias's bare prefix as the import module

**Bug ID**: TASK-246-BUG-3
**Related**: [task.246](./task.246.wireframe-mapping-setup-offer.md)
**Status**: ✅ Closed
**Priority**: Medium
**Severity**: Major
**Created**: 2026-10-30
**Assigned To**: dev
**QA Engineer**: QA Engineer

---

## Bug Description

**Summary**: `importOf` in `shared/resources/wireframe-map.js` strips a trailing `/*` from a
`compilerOptions.paths` alias and proposes what is left. TypeScript matches `"@ui/*"` only for
`@ui/<something>`, so the proposed `componentImport` `@ui` does not resolve. The cycle 1 JSONC test
pins this value (`@app/components/*` → `@app/components`).

**Expected Behavior**: an alias is proposed only when its key is exact (no wildcard) and lands on the
barrel or its directory. A wildcard-only match proposes `value: null`, with evidence naming the
alias, so the offer says no import module was found.

**Actual Behavior**: `detect` proposes `@ui`, and the qa skills then check imports against a module
name that no import can use.

**Impact**: a consumer who accepts the proposal gets a `componentImport` that every wireframe
conformance check reports against.

---

## Reproduction Steps

**Environment**: Node 26, Linux; a scratch project.

1. `src/components/index.ts` exports three components; `package.json` is `{"name":"the-repo"}`.
2. `tsconfig.json` is `{"compilerOptions":{"paths":{"@ui/*":["src/components/*"]}}}`.
3. `detect` → `componentImport: {"value":"@ui","evidence":"tsconfig.json paths alias @ui/*"}`.

**Frequency**: Always
**Reproducible**: Yes

---

## Evidence

QA cycle 2, [task.246.qa.2.wireframe-mapping-setup-offer.md](./task.246.qa.2.wireframe-mapping-setup-offer.md).
Related file: `shared/resources/wireframe-map.js:1135` (`importOf`).

---

## Success Criteria Violation

**Reference**: § 9 Functional, `detect`'s proposal: "a tsconfig.json path alias that lands on it".

**How It Failed**: a wildcard alias does not land on the barrel as a module name; only `@ui/<x>`
resolves.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-30
**Developer**: qa-fix (develop-task, QA cycle 2)

**Root Cause Analysis**: `importOf` stripped `/*` from the alias as well as from the target. A
wildcard alias matches only `@ui/<x>`, so the stripped prefix names a module TypeScript does not
resolve. The cycle 1 JSONC test pinned the wrong value.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-30

**Fix Description**: only an exact alias is proposed. A wildcard alias that lands on the barrel
gives `value: null`, with evidence naming it, so the setup question says there is no import to
propose. An exact alias wins over a wildcard in either order.

**Files Modified**:

- `shared/resources/wireframe-map.js` — `importOf`
- `shared/resources/tests/wireframe-map.test.mjs` — "detect proposes only an exact tsconfig alias…";
  the wildcard case removed from the JSONC test

**Testing**: five `paths` shapes (wildcard to a directory, wildcard to the barrel, exact plus
wildcard in both orders, an unrelated wildcard). Mutation-proven: proposing any alias turns the
test red.

**Verification Steps for QA**: rerun the cycle 2 reproduction; `componentImport` is `null` with
evidence `tsconfig.json paths alias @ui/* is a wildcard…`.

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

---
type: bug
status: ready-for-qa # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'Medium'
created: '2026-10-30'
related: 'task 246'
description: 'detect cannot read a tsconfig whose paths use a /* alias with a ** include glob, or that has trailing commas'
---

# Bug Report: Task 246 - `detect` cannot read a common tsconfig, so no path alias is proposed

**Bug ID**: TASK-246-BUG-1
**Related**: [task.246](./task.246.wireframe-mapping-setup-offer.md)
**Status**: ✅ Ready for QA
**Priority**: Medium
**Severity**: Major
**Created**: 2026-10-30
**Assigned To**: dev
**QA Engineer**: QA Engineer

---

## Bug Description

**Summary**: `jsonFile` in `shared/resources/wireframe-map.js` strips `/* … */` comments with a
regex that also runs inside JSON strings. A `paths` alias written `"@app/*"` opens a "comment" that a
later `"src/**/*.ts"` include glob closes, the text between is deleted, `JSON.parse` fails, and
`jsonFile` returns `null`. Trailing commas, which `tsconfig.json` allows, fail the same way.

**Expected Behavior**: `detect` proposes `componentImport: "@app/components"` from a tsconfig that
maps that alias to the barrel, whatever other aliases and include globs the file holds.

**Actual Behavior**: `proposal.componentImport.value` is `null`, with the evidence "no package name
or path alias resolves to the barrel".

**Impact**: Most TypeScript projects that alias their components carry a `"@x/*"` alias and a
`**` include glob, so the setup offer proposes no import for them and the author has to type it.

---

## Reproduction Steps

**Environment**: Node 26, Linux; a scratch project with three barrel exports and `package.json`
`{"name":"the-repo"}`.

**Steps to Reproduce**:

1. Control: `tsconfig.json` with only `"paths": { "@app/components": ["src/components/index.ts"] }`
   → `detect --json` gives `proposal.componentImport.value` = `"@app/components"`.
2. Add `"@app/*": ["src/*"]` to `paths` and `"include": ["src/**/*.ts"]` → the value is `null`.
3. Instead, add a trailing comma after `paths` and after `compilerOptions` → the value is `null`.

**Frequency**: Always
**Reproducible**: Yes

---

## Evidence

**Test Output**: QA cycle 1 run, recorded in
[task.246.qa.1.wireframe-mapping-setup-offer.md](./task.246.qa.1.wireframe-mapping-setup-offer.md):
`control: "@app/components"`, `slash-star alias + glob: null`, `trailing commas: null`.

**Related Files**: `shared/resources/wireframe-map.js:1068` (`jsonFile`).

---

## Success Criteria Violation

**Reference**: § 8 Testing Strategy, `detect` case "a tsconfig path alias that lands on the barrel";
§ 1 Overview (the proposal names the import).

**How It Failed**: The unit test's tsconfig holds a `//` comment and one alias, so it never meets a
`/*` inside a string or a trailing comma.

---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-30
**Developer**: qa-fix (develop-task, QA cycle 1)

**Root Cause Analysis**: the strip was two regexes over the whole text. Neither knew where a JSON
string started or ended, so `/*` inside `"@app/*"` and `*/` inside `"src/**/*.ts"` bounded a
"comment". Trailing commas were never handled at all.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-30

**Fix Description**: a new `stripJsonc` scans once, copies each string literal whole (escapes
included), drops `//` and `/* */` comments outside strings, and drops a comma when the next
non-space character outside a comment is `}` or `]`. `jsonFile(file, true)` parses its output.

**Files Modified**:

- `shared/resources/wireframe-map.js` — `stripJsonc`, `jsonFile`
- `shared/resources/tests/wireframe-map.test.mjs` — "detect reads tsconfig.json as JSONC: a /*
  alias, a ** glob, comments and trailing commas"

**Testing**: four cases — a `/*` block comment plus a `//` line comment with a `"@x/*"` alias and a
`"src/**/*.ts"` glob; a `"@app/components/*"` alias; a trailing comma at the top level; the
plain-JSON control. The include list also holds `"a // not a comment"` and `"b, }"`, so a comment
marker or a comma-and-brace inside a string is kept. Mutation-proven: the old regex strip, and the
scanner with trailing-comma removal disabled, each turn the test red.

**Verification Steps for QA**: rerun the cycle 1 reproduction (three exports, package.json, the `/*`
alias and `**` glob, then trailing commas); `detect` proposes `@app/components` in each.

---

## Status History

| Date       | Status       | Changed By  | Notes                                          |
| ---------- | ------------ | ----------- | ---------------------------------------------- |
| 2026-10-30 | New          | QA Engineer | Bug created                                    |
| 2026-10-30 | In Progress  | qa-fix      | Investigation started                          |
| 2026-10-30 | Ready for QA | qa-fix      | String-aware JSONC strip; tests mutation-proven |

---

## Resolution Summary

[Will be completed when bug is closed]

# Bug Report: Task 110 - The spec tables are plain objects, so `constructor`, `toString` and `__proto__` are looked up as rules — two are admitted, one crashes the run

**Task**: [Link](./task.110.session-handoff-skill.md)
**Bug ID**: TASK-110-BUG-22
**Severity**: MEDIUM
**Priority**: P2
**Status**: Closed
**Found By**: QA Engineer (reviewer CR-2, confirmed in-process)
**Date Found**: 2026-09-15

## Description

`WHITELIST`, `NPX_TOOLS`, `GIT_SPECS` and `UTIL_SPECS` are plain object literals; `isAllowed` does
`whitelist[bin]` and the arms do `NPX_TOOLS[tool]` / `GIT_SPECS[sub]` without an own-property
check. A key from `Object.prototype` is therefore a "rule":

```
isAllowed("constructor rm -rf x")   → ok, argv ["constructor","rm","-rf","x"]   (WHITELIST.constructor is Object; Object(args) is truthy)
isAllowed("toString anything")      → ok                                          (Object.prototype.toString(args) is a string)
isAllowed("git hasOwnProperty x")   → ok                                          (GIT_SPECS.hasOwnProperty is a function; checkArgs(args, fn) passes)
isAllowed("npx constructor foo")    → ok → runs `npx --no-install constructor foo` (a registry lookup of the `constructor` package, then refused)
isAllowed("__proto__ x")            → THROWS "rule is not a function"
```

The throw escapes `verify()` — nothing catches it — so a single handoff line reading `__proto__ x`
crashes the whole run with a stack trace instead of an `unverifiable` verdict.

## Expected Behavior

A binary, tool or subcommand is admitted only when it is an **own** key of its table; a rule that
throws is an `unverifiable` line, never a crash.

## Actual Behavior

Prototype keys resolve to callable non-rules; `__proto__` resolves to a non-callable and throws
out of `isAllowed` and `verify`.

## Impact

Correctness and robustness: the admitted spellings spawn non-existent binaries (`constructor`,
`toString`: ENOENT → `could not run`) or hand npm a package name to resolve; the throw loses a
whole run to one bad line. No write or egress found beyond the documented `--no-install` manifest
GET. MEDIUM.

## Recommendation

Build the tables with `Object.create(null)` semantics — the least invasive form is
`Object.hasOwn(table, key)` at each lookup (`isAllowed`, `npxRule`, `gitRule`, `utilRule`) — and
wrap `isAllowed` inside `verify()` so a throw becomes `unverifiable: could not run`. Refused-list
tests for `constructor …`, `toString …`, `__proto__ …` at the binary, npx-tool and git-subcommand
positions; a verify test that a throwing rule yields a verdict, not an exception.

## Developer Fix Cycle

### Iteration 1

**Date**: 2026-09-15 · **Developer**: Claude (qa-fix, cycle 15)

**Root Cause**: the four spec tables are plain object literals looked up with `table[key]`, so `Object.prototype` members resolved: callable ones (`constructor`, `toString`, `hasOwnProperty`, `valueOf`) as rules, `__proto__` as a non-callable that threw; `verify()` had no guard around `isAllowed`.

**Fix**: `own(table, key)` — `Object.hasOwn` before the read — at all four lookups (`isAllowed`, `npxRule`, `gitRule`, `utilRule`); `verify()` wraps `isAllowed` so a throwing rule becomes `unverifiable: could not judge: <message>` for that line.

**Files Modified**:
- `skills/session-handoff/scripts/handoff-verify.mjs` — `own()`, the four lookups, the `verify()` guard
- `skills/session-handoff/tests/handoff-verify.test.js` — refused: `constructor rm -rf x`, `toString anything`, `__proto__ x`, `hasOwnProperty x`, `git hasOwnProperty x`, `git constructor`, `npx constructor foo`, `npx __proto__ x`, `npx toString`; new verify test: an injected rule that throws yields one `unverifiable` line
- `skills/session-handoff/SKILL.md` — own-key rule stated

**Testing**: 33/33. Mutation-proved red: `own()` bypassed; the verify guard removed. Re-executed: `__proto__ x` through the CLI → `unverifiable: not on whitelist: __proto__`, run completes.

**Verification Steps for QA**:
1. `isAllowed("constructor rm -rf x").ok === false`; `isAllowed("__proto__ x")` returns rather than throws.
2. A handoff line `__proto__ x` reads `unverifiable` and the other lines still get verdicts.

## Status History

| Date       | Status | Changed By  | Notes |
| ---------- | ------ | ----------- | ----- |
| 2026-09-15 | New    | QA Engineer | QA cycle 15 — filed |
| 2026-09-15 | Ready for QA | Claude (qa-fix) | Own-property lookups at every table; a throwing rule is one unverifiable line |
| 2026-09-15 | Closed | QA Engineer | QA cycle 16 — through the clone's verifier at 9cf723a6: `__proto__ x` and `constructor rm -rf x` → `unverifiable: not on whitelist`, run completes with a JSON object. M2 (`own()` → plain lookup) and M3 (verify guard removed) → red — `covered` ×2 |

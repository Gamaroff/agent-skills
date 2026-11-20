# QA Report: Task 314 - The security probe engine loads a TypeScript entry

**Task**: [Link to task document](./task.314.probe-engine-loads-a-typescript-entry.md)
**Gate File**: [task.314.gate.2.probe-engine-loads-a-typescript-entry.yml](./task.314.gate.2.probe-engine-loads-a-typescript-entry.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-20
**Testing Completed**: 2026-11-20
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2 is a full refute pass over the whole branch diff. The cycle 1 fix (compiler bounded to the repo root) holds. The pass found three further defects in the same area, each reproduced by QA: the hook compiles to ES5 when no `target` is set, its `tsconfig` lookup is not bounded to the repo root, and the root bound fails for a root of `/`.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing (23 in the task's file; Node 22 gate 8690 pass, 0 fail at the fix commit)
- [x] Breaking changes: none
- [x] Code on feature branch with open PR #925

### Review Methodology

Re-review. Re-review scope: unscoped, cycle 2 is the whole `origin/develop...HEAD` diff by rule (refute pass), 2352 lines of source, tests and fixtures; generated copies and `docs/tasks` excluded. Diff review: code review, one read-only Explore subagent given the shared review prompt by path, with the refute directive. Dispatched 17:06Z, returned in 91 s (`duration_ms` 91312). Step 4b: not applicable, the change set adds no fenced bash. Mapper pre-step skipped (no Success Criteria table).

CI on 3dc1df67d: pending (shellcheck, test, validate, secret-scan pending; link-check and the branch-name check passed). Recorded once and not waited on; `/finalise` gates CI on the final commit.

---

## Re-Review Context

| Cycle 1 finding | Status | Evidence |
|---|---|---|
| T314-CR-1 compiler resolved past the repo root | FIXED | `checkTypeScriptRuntime` walks entry directory to repo root only; two committed tests (parent-only compiler is declined, in-root compiler engages) |

## New Findings This Cycle

- **[medium]** `shared/resources/security-probe-ts-hook.mjs:123` — no `target`, so TypeScript's ES5 default downlevels the entry and `instanceof` on an `Error` subclass fails → default `target` to ES2022 (T314-CR2-1)
- **[medium]** `shared/resources/security-probe-ts-hook.mjs:47` — `ts.findConfigFile` is unbounded → bind the repo root (T314-CR2-2)
- **[low]** `shared/resources/security-probe.mjs:835` — root `/` makes the bound false → use `isWithin` (T314-CR2-3)

---

## Implementation Verification

All five phases verified in cycle 1; cycle 2 changed only `checkTypeScriptRuntime`, one test pair and three wording sites, which this report reviews.

## Success Criteria Verification

Unchanged from cycle 1 (see the cycle 1 report), re-checked against the fix: the header, `probe-boundary-rule.md` and `finalise/SKILL.md` still describe the behaviour (the first two now say "between the entry's directory and the repo root"). CHANGELOG cites the task. Criteria drift: clean.

## Breaking Changes Validation

None.

---

## Issues Found

### MEDIUM Severity Issues (2)

**T314-CR2-1: ES5 downlevel**
- **Observation**: with no `target`, TypeScript emits ES5. Reproduced: `class E extends Error` imported after `transpileModule` (module ESNext only) gives `e instanceof E` false; with target ES2022 it gives true.
- **Impact**: a guard that tests `instanceof` on its own error type is scored on altered code. The fixture tsconfig sets a target, so no committed test sees it.
- **Recommendation**: default `target` when unset; add a fixture with no target.

**T314-CR2-2: tsconfig lookup unbounded**
- **Observation**: `ts.findConfigFile` returned a `tsconfig.json` placed in the parent of the repo root.
- **Impact**: a repository with no tsconfig inherits an ancestor's. Same class as cycle 1.
- **Recommendation**: bind the repo root for the child and ignore a config outside it.

### LOW Severity Issues (1)

**T314-CR2-3: root `/`** — `"/a".startsWith("//")` is false, so the bound never admits a directory when the root is `/`. Reproduced at the primitive.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 1

---

## NFR Assessment

### Performance — PASS
Unchanged: median 363 ms per child; the fix adds a bounded walk in the parent.

### Reliability — CONCERNS
ES5 downlevel (T314-CR2-1). Advisory: a tsconfig that fails to parse is read as no options (review CR-3, not reproduced).

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: reasoned
- **Probes executed**: 0 (boundary decision unchanged from cycle 1, see Code Review)
- Config provenance is not bounded to the repo root (T314-CR2-2); escaped 0.

### Maintainability — PASS
Advisory: the hook's `TS_SOURCE` accepts two extensions the engine's list does not (review CR-7).

---

## Code Review

**Boundary decision.** `boundary: false`, unchanged from cycle 1: `checkTypeScriptRuntime` is an environment preflight, `TS_ENTRY_EXTENSION` a routing test, and the hook a loader; none accepts or rejects external input. Criteria signal `["never"]`, reason in the gate.

probes_executed: 0

**Correctness bugs (5):**
- [medium/high] `shared/resources/security-probe-ts-hook.mjs:123` — ES5 default; reproduced, control passes → promoted as T314-CR2-1
- [medium/medium] `shared/resources/security-probe-ts-hook.mjs:47` — unbounded config lookup; reproduced → promoted as T314-CR2-2
- [medium/medium] `shared/resources/security-probe-ts-hook.mjs:63` — config errors dropped; not reproduced → advisory (`recommendations.future`)
- [low/medium] `shared/resources/security-probe.mjs:835` — root `/`; reproduced at the primitive → promoted as T314-CR2-3
- [low/low] `shared/resources/security-probe.mjs:832` — lexical root; not reproduced → advisory

**Cleanups (2):**
- `shared/resources/security-probe-ts-hook.mjs:115` — memoise the config path per directory
- `shared/resources/security-probe-ts-hook.mjs:40` — extension lists differ (`.ctsx`, `.d.ts`)

All seven anchors checked by `finding-anchors.js` (`ok`).

**Provenance (5b).** The findings concern code this change adds; the base has no equivalent, so none is `pre-existing`.

mutation-proven: the loop's repo-root bound removed in `checkTypeScriptRuntime` → "a typescript that exists only ABOVE the repo root is never borrowed (T314-CR-1)" went red, and no other test did (22 pass, 1 fail) → covered. Restored byte-identical (`cmp` against the snapshot clean); 23 pass after.

---

## Regression Testing

`security-probe-typescript-entry.test.mjs` 23 pass, 0 fail on the laptop (Node 26.13.0) after restore; the Node 22 container gate ran at the fix commit (8690 pass, 0 fail).

---

## Test Artifacts

### Files Reviewed
`shared/resources/security-probe.mjs`, `shared/resources/security-probe-ts-hook.mjs`, `shared/resources/probe-boundary-rule.md`, the test file and fixtures, `skills/finalise/SKILL.md`.

### Test Commands Executed
```bash
command node --test --test-reporter=tap shared/resources/tests/security-probe-typescript-entry.test.mjs
# mutation: bound removed -> not ok 16 (22 pass, 1 fail); restored -> 23 pass
command node -e '<transpileModule with and without target, import, instanceof>'   # false / true
command node -e '<ts.findConfigFile from a repo under a parent with a tsconfig>'    # returns the parent file
```

---

## Recommendations

### Immediate Actions (Blocking)
1. T314-CR2-1, T314-CR2-2, T314-CR2-3.

### Short-term Actions (Non-Blocking)
1. Named decline for an unreadable tsconfig; realpath the root; memoise config lookup; derive `TS_SOURCE` from the engine list.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Cycle 1's defect is fixed and held; the refute pass found three more in the same area, two medium.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: T314-CR2-1 and T314-CR2-2 fixed

---

**QA Report**: co-located at `task.314.qa.2.probe-engine-loads-a-typescript-entry.md`
**Gate File**: co-located at `task.314.gate.2.probe-engine-loads-a-typescript-entry.yml`
**Next Steps**: `/qa-fix` cycle 2, then QA cycle 3.

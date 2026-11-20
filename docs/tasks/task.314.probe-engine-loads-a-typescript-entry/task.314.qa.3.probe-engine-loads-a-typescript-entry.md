# QA Report: Task 314 - The security probe engine loads a TypeScript entry

**Task**: [Link to task document](./task.314.probe-engine-loads-a-typescript-entry.md)
**Gate File**: [task.314.gate.3.probe-engine-loads-a-typescript-entry.yml](./task.314.gate.3.probe-engine-loads-a-typescript-entry.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-20
**Testing Completed**: 2026-11-20
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 3 reviews the three cycle 2 fixes. All three hold. The review found one more defect of the same class, reproduced by QA: a tsconfig inside the repo that `extends` a file above the repo root still inherits that file's options.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing (28 in the task's file; Node 22 gate 8695 pass, 0 fail at the fix commit)
- [x] Breaking changes: none
- [x] Code on feature branch with open PR #925

### Review Methodology

Re-review. Re-review scope: files changed since gate 2 (head 3dc1df67dd4a; 14 files, 197 lines of source and tests) — default. Diff review: code review, one read-only Explore subagent given the shared review prompt by path. Dispatched 17:29Z, returned in 48 s (`duration_ms` 48107). Step 4b: not applicable, no fenced bash in the change set. Mapper pre-step skipped (no Success Criteria table).

CI on 56d55f4c4: pending (shellcheck, test, validate); link-check, secret-scan and the branch-name check passed. Recorded once, not waited on.

---

## Re-Review Context

| Cycle 2 finding | Status | Evidence |
|---|---|---|
| T314-CR2-1 ES5 default target | FIXED | `options.target ?? ES2022`; two tests (no-target tsconfig, no tsconfig) |
| T314-CR2-2 tsconfig lookup unbounded | FIXED for the located file | `PROBE_TS_ROOT` bound; test with the config only above the root plus an inside-the-root control. Not fixed for `extends`: see T314-CR3-1 |
| T314-CR2-3 root of `/` | FIXED | `isWithin` in the walk; unit test for root `/` |

## New Findings This Cycle

- **[medium]** `shared/resources/security-probe-ts-hook.mjs:78` — the bound checks the located tsconfig, not the files it `extends` → parse with a host that refuses paths outside the root (T314-CR3-1)

---

## Implementation Verification

All five phases verified in cycle 1; cycles 2 and 3 changed `checkTypeScriptRuntime`, the hook's option handling, tests and fixtures only.

## Success Criteria Verification

Unchanged from cycle 1. Criteria drift: clean. CHANGELOG cites the task.

## Breaking Changes Validation

None.

---

## Issues Found

### MEDIUM Severity Issues (1)

**T314-CR3-1: `extends` not bounded**
- **Observation**: with the compiler API, a repo `tsconfig.json` containing `{"extends":"../outer.json"}` where `outer.json` sets `target: ES5` parses to `target` 1 (ES5). A config extending a file inside the repo gives the same, as it should (control).
- **Impact**: a repository's tsconfig can pull `target`, `jsx`, `paths` or `baseUrl` from outside the repo, the inheritance the cycle 2 bound was meant to prevent. Reviewer confidence medium, recorded unchanged.
- **Recommendation**: refuse out-of-root reads in the parse host; test both directions.

### LOW Severity Issues (0)

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — PASS
Unchanged; the config lookup is memoised per directory.

### Reliability — PASS
The ES5 default is fixed and held by tests.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: reasoned
- **Probes executed**: 0 (boundary decision unchanged, see Code Review)
- The extended tsconfig is not bounded to the repo root (T314-CR3-1); escaped 0.

### Maintainability — PASS
Advisory: a third copy of the containment test in the hook (review CR-4).

---

## Code Review

**Boundary decision.** `boundary: false`, unchanged from cycles 1 and 2: `checkTypeScriptRuntime` is an environment preflight and the hook a loader; neither accepts or rejects external input. Criteria signal `["never"]`, reason in the gate.

probes_executed: 0

**Correctness bugs (3):**
- [medium/medium] `shared/resources/security-probe-ts-hook.mjs:78` — `extends` chain read outside the root; reproduced, control passes → promoted as T314-CR3-1
- [low/low] `shared/resources/security-probe-ts-hook.mjs:55` — lexical vs realpath comparison; not reproduced → advisory
- [low/medium] `shared/resources/tests/security-probe-typescript-entry.test.mjs:221` — the inside-root control asserts only "not engages". Measured: the control yields verdict absent, 0 declined, 2 executed, hostile case accepted, which is the ES5 crash signature, so it is not vacuous today; the assertion is still weak → advisory

**Cleanups (1):**
- `shared/resources/security-probe-ts-hook.mjs:58` — third copy of the containment test

Reviewer also checked and found sound: the env binding (a case cannot set `PROBE_TS_ROOT`), the memo key, explicit pre-ES2015 targets, and the root of `/`.

All four anchors checked by the reviewer's own read; the fix patch was reviewed from the committed head.

mutation-proven: `options.target ?? ES2022` reduced to `options.target` → "T314-CR2-1: a tsconfig with no target…", "T314-CR2-1: with no tsconfig at all…" and "T314-CR2-2: a tsconfig that exists only ABOVE the repo root…" went red (25 pass, 3 fail; the third depends on the default) → covered
mutation-proven: config bound `found !== undefined && inside` changed to `||` → "T314-CR2-2: a tsconfig that exists only ABOVE the repo root is never inherited" went red, no other → covered
mutation-proven: `isWithin(root, dir)` reverted to `dir === root || dir.startsWith(root + sep)` → "T314-CR2-3: a repo root of / finds the compiler between the entry and the root" went red, no other → covered
All three restored byte-identical (`cmp` against snapshots clean); 28 pass after.

---

## Regression Testing

`security-probe-typescript-entry.test.mjs` 28 pass, 0 fail (Node 26.13.0) after restore. Node 22 container gate ran at the fix commit: 8695 pass, 0 fail.

---

## Test Artifacts

### Files Reviewed
`shared/resources/security-probe.mjs`, `shared/resources/security-probe-ts-hook.mjs`, the test file and the two new fixtures.

### Test Commands Executed
```bash
command node --test --test-reporter=tap shared/resources/tests/security-probe-typescript-entry.test.mjs
# three mutations, each restored: 3 red / 1 red / 1 red; baseline 28 pass
command node -e '<ts.parseJsonConfigFileContent on a tsconfig extending ../outer.json>'   # target 1 (ES5)
```

---

## Recommendations

### Immediate Actions (Blocking)
1. T314-CR3-1.

### Short-term Actions (Non-Blocking)
1. Tighten the inside-root control; realpath compare; share the containment test.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Cycle 2's fixes hold; one more bound of the same class is open.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: T314-CR3-1 fixed

---

**QA Report**: co-located at `task.314.qa.3.probe-engine-loads-a-typescript-entry.md`
**Gate File**: co-located at `task.314.gate.3.probe-engine-loads-a-typescript-entry.yml`
**Next Steps**: `/qa-fix` cycle 3, then QA cycle 4.

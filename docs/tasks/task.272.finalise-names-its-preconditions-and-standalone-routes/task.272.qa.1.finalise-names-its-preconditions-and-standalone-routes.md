# QA Report: Task 272 - finalise names its preconditions and standalone routes

**Task**: [Link to task document](./task.272.finalise-names-its-preconditions-and-standalone-routes.md)
**Gate File**: [task.272.gate.1.finalise-names-its-preconditions-and-standalone-routes.yml](./task.272.gate.1.finalise-names-its-preconditions-and-standalone-routes.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-08
**Gate Status**: FAIL

---

## Executive Summary

The feature works and its tests pass, but the committed branch fails two repository guards that only read tracked files. CI would be red. Two further medium findings: a missing CHANGELOG entry and an unmeasured performance criterion.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Review Methodology

Direct tools, inline. The independent diff reviewer subagent was not dispatched, so independent review did not run; the diff was read in-line against the highest-risk blocks (Step 0b, 7.7 fallback, 6a route) and the repository guards were run on the committed state.
Step 4b (runnable prose) is covered by executed tests: the Step 0b block, the 6b derivation block and the 6a block are all extracted from SKILL.md and run under bash and zsh.
CI_SUMMARY: PR #860 head equals local HEAD; CI not yet read (QA reads it once at the gate; no completed failure was available).

---

## New Findings This Cycle

First review. See Issues Found.

---

## Implementation Verification

| Phase                                     | Status   | Notes                                                        |
| ----------------------------------------- | -------- | ------------------------------------------------------------ |
| 1. linked-issue rung in resolve-pr-number | PASS     | 35/35 resolver tests, mutation-proved                        |
| 2. preconditions engine + Step 0b         | PASS     | 19 engine and block tests                                    |
| 3. 7.7 verdict fallback + 6a post-merge   | PASS     | fixtures run under bash and zsh, controls beside each rule   |
| 4. bundle, sweep, tests                   | CONCERNS | bundle `--check` clean; full suite red on guards (T272-1, -2) |

**Overall Phase Completion**: 4/4 implemented, 1 with findings.

---

## Success Criteria Verification

| Criterion                                              | Status     | Evidence                                                                                           |
| ------------------------------------------------------ | ---------- | -------------------------------------------------------------------------------------------------- |
| Preflight names every missing input for the 208/209 shape | PASS    | `evals/shared/tests/finalise-preconditions.test.mjs` "Step 0b executed: task 208/209 shape"         |
| Post-merge bug run completes 7.7 and 6a on the Phase 1 route | PASS | `finalise-post-merge-bug-route.test.mjs` (10 cases) and `finalise-bug-mode.test.mjs` 7.7 fixtures   |
| All-inputs-present run behaves as before                | PASS       | existing finalise-* suites pass unchanged; `finalise-bug-mode` only gained the new key and cases    |
| `npm test` wall time within 10% of develop              | UNMEASURED | harness lacked `bc`; branch runs were red. A red branch run took 2m44s. See T272-4                 |
| Each check has a mutation proof                         | PASS       | see below                                                                                          |

Changelog citation: `changelog-cites.sh` answered `missing (task 272)` (T272-3).
Criteria drift: clean (reviewed-blob base).

---

## Issues Found

### HIGH Severity Issues (2)

- **T272-1** `shared/resources/finalise-preconditions.js:442` calls `process.exit()` after writing to stdout. Guard `stdout-drain-on-exit.test.mjs` "no NEW file adopts exit-after-write" fails. Fix: set `process.exitCode` and return.
- **T272-2** `shared/resources/finalise-preconditions.js:263-264` hold id regexes. `tests/doc-id-chokepoint.test.js` section 1 fails. Fix: use `doc-id.js`.

Both were hidden while the file was untracked; the guards read only the tracked tree. They failed on the first run after the commit.

### MEDIUM Severity Issues (2)

- **T272-3** no `[Unreleased]` CHANGELOG entry citing task 272.
- **T272-4** performance criterion unmeasured (above).

**Total Issues**: HIGH: 2, MEDIUM: 2, LOW: 0

---

## NFR Assessment

- Performance: CONCERNS (unmeasured)
- Reliability: FAIL (suite red)
- Security: PASS, evidence reasoned; no boundary signal in the criteria
- Maintainability: PASS

---

## Code Review

Inline pass, advisory. No correctness bug beyond T272-1 and T272-2 found. The re-run path after the post-merge HALT (docs branch, then re-run) is covered for the commit but not for Status History rows that earlier steps may append again; a duplicate row would only cause one extra docs commit.

mutation-proven: Step 0b HALT line made non-exiting → `Step 0b executed: task 208/209 shape` and the WAIVED-approver case went red → covered
mutation-proven: empty review decision mapped to APPROVED instead of null → `Step 0b executed: task 208/209 shape` went red → covered
mutation-proven: 6a base-branch case list emptied → bug-on-base cases went red → covered
mutation-proven: 6a post-merge `if` forced true / HALT forced false → docs-branch and control cases went red → covered
mutation-proven: 7.7 fallback guard changed → "NO implementation report" and "report that EXISTS decides alone" cases went red → covered
mutation-proven: resolver linked-issue rung and five engine rules, each reverted earlier in the develop step → named tests went red → covered

---

## Test Artifacts

### Test Commands Executed

```bash
CI=true command npm test                       # committed state: 8101 pass, 2 fail (T272-1, T272-2)
command npm run bundle -- --check              # 0 problems
```

The earlier green full run (8101 pass, 0 fail) was taken before the new files were tracked; the guards skip untracked files.

---

## Final Assessment

**Gate Status**: FAIL
**Quality Score**: 60/100
**Deployment Recommendation**: BLOCKED

**Next Steps**: qa-fix T272-1, T272-2, T272-3, then re-run QA and measure performance (T272-4).

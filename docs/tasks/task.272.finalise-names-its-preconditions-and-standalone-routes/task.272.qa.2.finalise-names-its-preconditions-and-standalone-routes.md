# QA Report: Task 272 - finalise names its preconditions and standalone routes (cycle 2)

**Task**: [Link to task document](./task.272.finalise-names-its-preconditions-and-standalone-routes.md)
**Gate File**: [task.272.gate.2.finalise-names-its-preconditions-and-standalone-routes.yml](./task.272.gate.2.finalise-names-its-preconditions-and-standalone-routes.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-08
**Gate Status**: PASS

---

## Executive Summary

Re-review after fix commit 8f93238c. All four cycle-1 findings are closed. The full suite is green on the committed head, CI is green, and the performance criterion is measured.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Review Methodology

Direct tools, inline; the independent reviewer subagent did not run. Re-review scope: unscoped (a whole-branch read of the fix diff, which is small: the engine's `emit` and `stemOf`, the CHANGELOG, the bundle).
CI_SUMMARY: CI on 8f93238c8dd1: green.

---

## Re-Review Context

| Cycle-1 finding | Status | Evidence |
| --- | --- | --- |
| T272-1 exit after write | FIXED | `emit` sets `process.exitCode`; stdout-drain guard passes |
| T272-2 id regex outside doc-id.js | FIXED | `stemOf` uses `doc-id.js`; chokepoint test passes; 536 targeted tests pass |
| T272-3 no CHANGELOG entry | FIXED | `changelog-cites.sh` answers `cites (task 272)` |
| T272-4 performance unmeasured | FIXED | table below |

## New Findings This Cycle

None. Searched unscoped: the fix commit's diff (engine, CHANGELOG, bundled copy, task records). `stemOf` was checked for the five document shapes the old regexes handled (task, story with a sub-letter, general bug, task bug, story bug); the engine and executed-block tests cover them and pass. The bundler briefly pulled four unrelated files into `finalise` because a comment named a test by its repo path; the comment now uses a bare filename and the four copies were removed. `git status` is clean.

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| Preflight names every missing input for the 208/209 shape | PASS | `finalise-preconditions.test.mjs` "Step 0b executed: task 208/209 shape" |
| Post-merge bug run completes 7.7 and 6a | PASS | `finalise-post-merge-bug-route.test.mjs` (10), `finalise-bug-mode.test.mjs` fixtures |
| All-inputs-present run behaves as before | PASS | existing finalise-* suites pass unchanged (536 targeted tests, 0 fail) |
| `npm test` wall time within 10% of develop | PASS | median develop 162616 ms, branch 161957 ms (-0.4%) |
| Each check has a mutation proof | PASS | see below |

Performance, five alternating pairs, `CI=true npm test`, all exit 0 (load average beside each run, 1/5/15 min):

| Run | develop | branch | uptime (develop / branch) |
| --- | --- | --- | --- |
| 1 | 163939 ms | 161957 ms | 4.22, 3.64, 3.65 / 5.30, 3.97, 3.74 |
| 2 | 161712 ms | 162231 ms | 4.39, 3.87, 3.72 / 4.41, 3.78, 3.68 |
| 3 | 162616 ms | 161646 ms | 4.47, 3.75, 3.66 / 4.56, 3.74, 3.65 |
| 4 | 164222 ms | 162431 ms | 4.75, 3.89, 3.69 / 4.43, 3.87, 3.70 |
| 5 | 161808 ms | 161394 ms | 3.90, 3.70, 3.64 / 5.17, 3.90, 3.70 |

Median: develop 162616 ms, branch 161957 ms.

Criteria drift: clean.

---

## Code Review

Advisory, inline. No findings.

mutation-proven: Step 0b HALT line made non-exiting → `Step 0b executed: task 208/209 shape` and the WAIVED-approver case red → covered
mutation-proven: empty review decision mapped to APPROVED → `Step 0b executed: task 208/209 shape` red → covered
mutation-proven: 6a base-branch case list, post-merge `if` and HALT → docs-branch and control cases red → covered
mutation-proven: 7.7 fallback guard → "NO implementation report" and "report that EXISTS decides alone" red → covered
mutation-proven: resolver linked-issue rung, five engine rules → named tests red → covered
mutation-proven: cycle-1 fixes — the unfixed engine (process.exit after write; local id regexes) was red under `stdout-drain-on-exit` and `doc-id-chokepoint` on the committed tree → covered

---

## Test Artifacts

```bash
CI=true command npm test                 # head 8f93238c: 8101 pass, 0 fail
command npm run bundle -- --check        # 0 problems
```

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 95/100
**Deployment Recommendation**: APPROVED

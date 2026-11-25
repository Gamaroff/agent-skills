# QA Report: Task 319 - Pipelines spend a CI run only where a run can answer something

**Task**: [Link to task document](./task.319.ci-runs-only-where-needed.md)
**Gate File**: [task.319.gate.2.ci-runs-only-where-needed.yml](./task.319.gate.2.ci-runs-only-where-needed.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-24
**Testing Completed**: 2026-11-24
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 1's two high findings are closed. The whole branch was read again to refute it, and that pass found twelve medium and seven low defects, none of them high, so the gate is CONCERNS.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Finding | Status | Evidence |
| ------- | ------ | -------- |
| CR-1 (bug 1) | ✅ FIXED | probe `hostile-same-indent`, `hostile-null`, `hostile-misindented-row`, `hostile-hash` rejected; a quoted duplicate block is a new form (CR-201) |
| CR-101 (bug 2) | ✅ FIXED | `push-policy.test.mjs` strategy and checkCommand tests |
| CR-2, CR-3, CR-5, CR-6, CR-7 | ✅ FIXED | `finalise-rerun-at-head.test.mjs`, `finalise-rerun-scope.test.mjs` |
| CR-10, CR-11 | ✅ FIXED | `finalise-rerun-scope-blocks.test.mjs`; CR-202 is what 8a still leaves out |
| CR-8 | ⚠️ PARTIAL | one message of its class, see CR-210 |
| CR-102 | ✅ FIXED | `finalise-entry` row; CR-301 and CR-308 are its side effects |
| CR-103 | ⚠️ PARTIAL | blocks bind their own inputs, but one binding expands, see CR-302 |
| CR-104, CR-105, CR-108, CR-109, CR-110, CR-112 | ✅ FIXED | `tick-pr.test.mjs`, `finalise-ci-poll.test.mjs` |
| CR-106, CR-107 | ⚠️ PARTIAL | the two named HALTs push; four others do not, see CR-307 |
| CR-111 | ⚠️ PARTIAL | the head is filtered, ancestors are not, see CR-306 |
| QA-1 | ✅ FIXED | probe `hostile-awk-escape`, `hostile-awk-hex` rejected |

---

## New Findings This Cycle

Gate ids T319-CR-201 to T319-CR-210, T319-CR-301 to T319-CR-307, T319-CR-309 and T319-CR-310. Each is listed with its line under Code Review.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#937)

### Review Methodology

Re-review scope: unscoped (cycle 2 refute pass; the safety re-probe also applies, clauses 2 and 3: a high finding on a validator, and a FAIL gate over criteria that say "never").

Two read-only reviewers with the shared prompt plus both directives, one over the re-run and lint-rule half and one over the push, tick and Bitbucket half. Returned after 860 s and 451 s (measured, `duration_ms`). Generated `skills/*/references/` copies were left out; `bundle:check` holds them equal to their sources. The hand-authored develop-bug references were included. Diff review: code review.

CI on f54e31cb4a6d: pending

Step 4b: changed blocks 23 in nine documents, 0 executed, all refused as `mutating` (they push, merge or write). The tick blocks and the re-run blocks are run by `tick-pr.test.mjs` ("three tick blocks run as written") and `finalise-rerun-scope-blocks.test.mjs`. Both shells are available on this host.

Traceability mapper: skipped (no Success Criteria table). Criteria drift: clean (base: reviewed blob of review 2). Changelog: cites (task 319).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| 0: Reader table | PASS | Verified | |
| 1: Decision helper | PASS | Verified | 29 tests |
| 2: Every push site | CONCERNS | Verified | CR-301, CR-307 |
| 3: Skip marker | PASS | Verified | CR-310 (low) |
| 4: Finalise halts | CONCERNS | Verified | CR-201 to CR-205 |
| 5: Bitbucket | CONCERNS | Verified | CR-302 to CR-306 |
| 6: Ship | PASS | Verified | |

**Overall Phase Completion**: 7/7 delivered, 4/7 without a medium finding

---

## Success Criteria Verification

| # | Criterion | Evidence | Status |
| - | --------- | -------- | ------ |
| 1 | Every push site calls push-policy; scan with a non-vacuity case | `push-policy.test.mjs` scan tests, prose pushes included | PASS |
| 2 | Simulated five-cycle run | `push-policy.test.mjs` "batched: a five-cycle loop …", "eager: the same loop …" | PASS |
| 3 | The pause hook leaves the remote unmoved and says so | `develop-pipeline-on-precompact.test.sh`, 42 passed | PASS |
| 4 | skipMarker never on a commit with code | `push-policy.test.mjs` marker tests | PASS |
| 5 | A named command is graded on a run at the head | `finalise-rerun-at-head.test.mjs` | CONCERNS (CR-201 to CR-204) |
| 6 | The probe scores an `eslint:` entry | `security-probe-eslint.test.mjs` | CONCERNS (CR-205) |
| 7 | Bitbucket poll writes the same line, from the destination's key | `finalise-ci-poll.test.mjs` | CONCERNS (CR-306) |
| 8 | `tickVia: pr` ticks through a PR merged by the gate | `tick-pr.test.mjs`, 16 tests | CONCERNS (CR-302 to CR-305) |
| 9 | Push count in the QA report, before and after, with the command | Below | PASS |
| 10 | `npm test` under `CI=true`; every new test red before its change | Below | PASS |
| 11 | `npm run bundle` leaves no diff; `git status` recorded | Below | PASS |
| 12 | Four keys in the reference with defaults, `eager` as the old behaviour | `docs/reference/configuration.md` "When the pipelines push" | CONCERNS (CR-307: one sentence is false) |
| 13 | CHANGELOG names each part | `CHANGELOG.md` `[Unreleased]` | PASS |

### Push counts (criterion 9)

Command: `command node --test shared/resources/tests/push-policy.test.mjs` at `f54e31cb4`:

```
pushes before (eager): 9; after (batched): 6
```

### Suite under CI=true, and red-first proofs (criterion 10)

`npm run ci:fast` on the LAN server with `CI=true`, on the tree committed as `f54e31cb4`: 8835 tests, 8832 passed, 0 failed, 3 skipped. `npm run eval:all`: exit 0.

Cycle 1's proofs stand in QA report 1. The proofs of this cycle's fixes, each a committed test that went red with the behaviour reverted:

| Reverted behaviour | Test that went red | Outcome |
| ------------------ | ------------------ | ------- |
| row accounting of the finalise block | `finalise-rerun-at-head.test.mjs` configuration tests | covered |
| head and tree re-checked around every command | `finalise-rerun-at-head.test.mjs` | covered |
| a prior FAIL re-judged whole | `finalise-rerun-scope.test.mjs` | covered |
| the marker's strategy and checkCommand conditions | `push-policy.test.mjs` strategy and checkCommand tests | covered |
| site ids through the environment | `push-policy.test.mjs` escapes test | covered |
| the prose-push scan | `push-policy.test.mjs` scan test | covered |
| the HALT and entry push blocks | `push-policy.test.mjs` HALT and entry sites test | covered |
| tick-pr: gate, head re-read, landed, finish, warnings, base reset (11 mutations) | `tick-pr.test.mjs` | covered |
| poll: external status, other destination, fresh head | `finalise-ci-poll.test.mjs` CR-109, CR-110, CR-111 | covered |
| eslint: a rule with no definition | `security-probe-eslint.test.mjs` | covered |

### Bundle (criterion 11)

`npm run bundle` ran in the commit hook. `git status --short` at this head lists no tracked change outside this work item: the implementation report (modified) and this cycle's QA files (untracked).

---

## Breaking Changes Validation

### Breaking Change: a pause and a record-only cycle no longer push

Documented: Yes
Migration Path Provided: Yes (`pipeline.pushRecordCommits: eager`)
Migration Tested: Yes
Notes: "a HALT always pushes" is still not true of four HALTs (CR-307).

**Overall Breaking Changes Assessment:** CONCERNS

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (12)

T319-CR-201 to CR-205 and T319-CR-301 to CR-307. Each is described in the Code Review section and tracked by its gate entry; no separate bug file.

### LOW Severity Issues (7)

T319-CR-206 to CR-210, CR-309 and CR-310.

**Total Issues**: HIGH: 0, MEDIUM: 12, LOW: 7

---

## NFR Assessment

### Performance — PASS
Push counts above.

### Reliability — CONCERNS
The tick path can merge on a wait that did not happen and strand on one failed fetch; four HALTs do not flush.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 73 (`task.319.qa.2.ci-runs-only-where-needed.security.run.json`, `totals.executed`); escaped 0
- `push-policy --site`: engages, 44 of 44. `parseRerunList`: present-but-inert, 27 of 29; `rerunAtHead:` at the top level and `finalize:` are accepted as "not configured" (T319-CR-208).
- One case was relabelled after its first run: tab indentation was written as hostile, and the parser reads it whole, so nothing is lost and the case is legitimate. The case file says so.

### Maintainability — PASS
One decision helper and one table.

---

## Code Review

Anchors: all 22 `ok` (`finding-anchors.js --rev HEAD`). `code_review_blocking=true` from the pipeline. `boundary: true`.

**Correctness bugs (19 in the gate, 1 advisory):**

- [medium/high] `shared/resources/finalise-rerun-at-head.js:97` — CR-201, reproduced by QA: a quoted duplicate block returns `["echo b"]` for `echo b#c`; controls (unquoted duplicate, lone entry) refused
- [medium/high] `skills/finalise/SKILL.md:3566` — CR-202, 8a reads only the exit code
- [medium/high] `shared/resources/finalise-rerun-at-head.js:376` — CR-203, finalise's own JSON records
- [medium/high] `shared/resources/finalise-rerun-at-head.js:366` — CR-204, skip-worktree edits
- [medium/high] `shared/resources/security-probe.mjs:2058` — CR-205, no cases file
- [medium/high] `shared/resources/develop-pipeline-step-7-finalise.md:35` — CR-301, the entry flush and the dangling-link hold
- [medium/high] `skills/develop-next/SKILL.md:688` — CR-302, the gate command is expanded
- [medium/high] `shared/resources/tick-pr.sh:204` — CR-303, NONE without the wait; confirmed by reading: `--max-wait` and `--checks` are not validated
- [medium/high] `shared/resources/tick-pr.sh:109` — CR-304, a failed fetch is read as absent
- [medium/high] `shared/resources/tick-pr.sh:195` — CR-305, the tree is not re-checked after the gate
- [medium/high] `shared/resources/ci-tree-equivalence.js:1403` — CR-306, ancestors unfiltered
- [medium/high] `docs/reference/configuration.md:478` — CR-307, HALTs that do not push
- [medium/medium] `shared/resources/develop-pipeline-step-7-finalise.md:33` — CR-308, a resume during the 6c wait (advisory)
- [low/high] `shared/resources/finalise-rerun-scope.js:1089` — CR-206
- [low/high] `shared/resources/finalise-rerun-scope.js:319` — CR-207
- [low/high] `shared/resources/finalise-rerun-at-head.js:140` — CR-208
- [low/high] `shared/resources/finalise-rerun-at-head.js:233` — CR-209
- [low/high] `shared/resources/security-probe.mjs:564` — CR-210
- [low/high] `shared/resources/tick-pr.sh:123` — CR-309
- [low/high] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1259` — CR-310

**Cleanups (2):** CR-211 `skills/finalise/SKILL.md:594`, CR-311 `shared/resources/finalise-ci-poll.sh:84`.

Platform variance: the reviewer ran the three engine test files under `TMPDIR=/tmp` and under a symlinked TMPDIR, 92 pass.

---

## Regression Testing

`push-policy` (29) and the pre-compact suite (42): PASS at this head; the rest by `ci:fast` above.

---

## Test Artifacts

### Test Commands Executed

```bash
command node --test shared/resources/tests/push-policy.test.mjs   # 29 pass
bash shared/resources/develop-pipeline-on-precompact.test.sh      # 42 passed, 0 failed
npm run test:remote                                               # ci:fast, 8832 pass
npm run test:remote -- --run eval:all                             # exit 0
```

Standards-named validation: part of `ci:fast`.

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix the twelve medium findings

### Short-term Actions (Non-Blocking)
1. The seven low findings, CR-308, CR-211 and CR-311

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: twelve medium findings
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: the twelve medium findings fixed

---

**QA Report**: co-located at `task.319.qa.2.ci-runs-only-where-needed.md`
**Gate File**: co-located at `task.319.gate.2.ci-runs-only-where-needed.yml`
**Next Steps**: qa-fix cycle 2

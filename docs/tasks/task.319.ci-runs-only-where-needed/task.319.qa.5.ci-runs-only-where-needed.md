# QA Report: Task 319 - Pipelines spend a CI run only where a run can answer something

**Task**: [Link to task document](./task.319.ci-runs-only-where-needed.md)
**Gate File**: [task.319.gate.5.ci-runs-only-where-needed.yml](./task.319.gate.5.ci-runs-only-where-needed.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-24
**Testing Completed**: 2026-11-24
**Gate Status**: CONCERNS

---

## Executive Summary

All 12 findings of cycle 4 are fixed, and the suites and CI are green on this head. The re-review found no high defect. Four medium and six low defects stand, each reproduced by QA with a control.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Finding | Status | Evidence |
| ------- | ------ | -------- |
| CR-601 | ✅ FIXED | reproduction at this head: 2,000,007 bytes and the last line kept. Its detection of overwritten output is too wide, see CR-802 |
| CR-602, CR-603, CR-606, CR-607 | ✅ FIXED | reproductions at this head, each with its control |
| CR-604 | ✅ FIXED | `ci-tree-equivalence.test.mjs` |
| CR-605 | ✅ FIXED for the reported form | reproduction at this head: `scan-broken`. Other line starts still hide a command, see CR-803 |
| CR-701 | ✅ FIXED | reproduction: the base never moved, the tick branch was pushed |
| CR-702 | ✅ FIXED | reproduction: resumes at the remote's commit |
| CR-703 | ✅ FIXED | the documents hold no HALT push but `push-held.sh`, held by the scan test |
| CR-704 | ✅ FIXED | the timeout and the no-answer row are in both entry blocks |
| CR-705 | ✅ FIXED | reproduction: `not pushed — the pipeline lock could not be read` |

---

## New Findings This Cycle

Gate ids T319-CR-801 to T319-CR-805, CR-901, CR-902 and CR-904 to CR-906. Each is listed with its line under Code Review. CR-903 is advisory.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#937)

### Review Methodology

Re-review scope: files changed since gate 4 (head ff8e2ab33c60; 65 files) — default

The prior gate was CONCERNS with no high finding and security PASS on measured evidence, so no clause of the safety re-probe holds. Of the 65 files, 21 authored ones were reviewed as their whole change against the base; generated `skills/*/references/` copies and this work item's records were left out, and `bundle:check` holds the copies equal to their sources.

Two read-only reviewers with the shared prompt: half A (9 files, the re-run and criteria engines) and half B (12 files, the push, tick and step documents). Returned after 329 s and 529 s (measured, `duration_ms`). Neither ran the committed suites. Diff review: code review.

CI on 8bf94fef4c35: green

Step 4b: changed blocks 11 in five documents, 0 executed by the engine, all refused as `mutating` (they push, merge or write). Run by tests instead: the terminal-HALT blocks and the two finalise-entry blocks (`push-policy.test.mjs`), the tick blocks (`tick-pr.test.mjs`). **Not run by any test**: the QA loop's own push blocks.

Traceability mapper: skipped (no Success Criteria table). Criteria drift: clean (base: reviewed blob). Changelog: cites (task 319). Record criteria: two listed, neither names this report.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| 0: Reader table | PASS | Verified | |
| 1: Decision helper | PASS | Verified | 38 tests with the held-commit script |
| 2: Every push site | CONCERNS | Verified | CR-901, CR-904 to CR-906 |
| 3: Skip marker | PASS | Verified | |
| 4: Finalise halts | CONCERNS | Verified | CR-801 to CR-805 |
| 5: Bitbucket | CONCERNS | Verified | CR-902 |
| 6: Ship | PASS | Verified | |

**Overall Phase Completion**: 7/7 delivered, 4/7 without a finding

---

## Success Criteria Verification

| # | Criterion | Evidence | Status |
| - | --------- | -------- | ------ |
| 1 | Every push site calls push-policy; scan with a non-vacuity case | `push-policy.test.mjs` scan tests | PASS (CR-903 advisory) |
| 2 | Simulated five-cycle run | `push-policy.test.mjs` five-cycle tests | PASS |
| 3 | The pause hook leaves the remote unmoved and says so | `develop-pipeline-on-precompact.test.sh`, 42 passed at this head | PASS |
| 4 | skipMarker never on a commit with code | `push-policy.test.mjs` marker tests | PASS |
| 5 | A named command is graded on a run at the head | `finalise-rerun-at-head.test.mjs` | CONCERNS (CR-801, CR-802) |
| 6 | The probe scores an `eslint:` entry | `security-probe-eslint.test.mjs` | PASS |
| 7 | Bitbucket poll writes the same line, from the destination's key | `finalise-ci-poll.test.mjs` | PASS |
| 8 | `tickVia: pr` ticks through a PR merged by the gate | `tick-pr.test.mjs` | CONCERNS (CR-902) |
| 9 | Push count in the QA report, before and after, with the command | Below | PASS |
| 10 | `npm test` under `CI=true`; every new test red before its change | Below | PASS |
| 11 | `npm run bundle` leaves no diff; `git status` recorded | Below | PASS |
| 12 | Four keys in the reference with defaults, `eager` as the old behaviour | `docs/reference/configuration.md` | PASS |
| 13 | CHANGELOG names each part | `CHANGELOG.md` `[Unreleased]` | PASS |

### Push counts (criterion 9)

Command: `command node --test shared/resources/tests/push-policy.test.mjs` at `8bf94fef4`:

```
pushes before (eager): 9; after (batched): 6
```

### Suite under CI=true, and red-first proofs (criterion 10)

`npm run ci:fast` on the LAN server with `CI=true`, on the tree committed as `8bf94fef4` less one Change Log row: 8879 tests, 8876 passed, 0 failed, 3 skipped. `npm run eval:all` on the same tree: exit 0.

The proofs were run in the fix pass, on the code of this head, and were not repeated here. Each names a committed test:

| Reverted behaviour | Test that went red | Outcome |
| ------------------ | ------------------ | ------- |
| append mode, the mark, its report, the copy's start | `finalise-rerun-at-head.test.mjs` | covered |
| submodule: inside, tree entry, index entry | `finalise-rerun-at-head.test.mjs` | covered; the tree entry only after a case was added |
| record names: reports, gates, probe records, the `.json` bound | `finalise-rerun-at-head.test.mjs` | covered |
| lazy lines: the refusal, block starts, the rule line | `finalise-rerun-at-head.test.mjs` | covered |
| CRLF | `criteria-section.test.mjs`, `finalise-rerun-at-head.test.mjs` | covered |
| byte names | `finalise-rerun-at-head.test.mjs` | covered |
| the unknown destination | `ci-tree-equivalence.test.mjs` | covered |
| the tick's refspec, resume and halt | `tick-pr.test.mjs` | covered |
| `--no-track` in develop-next | `tick-pr.test.mjs` | covered, by reading the document |
| HALT pushes, the site table, the timeout and the no-answer row | `push-policy.test.mjs` | covered, by reading the documents |
| the lock's three states | `push-policy.test.mjs` | covered |
| the grading sentence on overwritten output | `finalise-rerun-scope-blocks.test.mjs` | covered, by reading the document |

### Bundle (criterion 11)

`npm run bundle` ran in the commit hook and `bundle:check` reports 129 skills, 0 problems. `git status --short` at this head lists no tracked change outside this work item: the implementation report (modified) and this cycle's QA files (untracked).

---

## Breaking Changes Validation

### Breaking Change: a pause and a record-only cycle no longer push

Documented: Yes
Migration Path Provided: Yes (`pipeline.pushRecordCommits: eager`)
Migration Tested: Yes

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

None. Searched the 21 authored files changed since gate 4, as their whole change against the base.

### MEDIUM Severity Issues (4)

T319-CR-801, CR-802, CR-901 and CR-902. Each is described in the Code Review section and tracked by its gate entry; no separate bug file.

### LOW Severity Issues (6)

T319-CR-803 to CR-805 and CR-904 to CR-906.

**Total Issues**: HIGH: 0, MEDIUM: 4, LOW: 6

---

## NFR Assessment

### Performance — PASS
Push counts above.

### Reliability — CONCERNS
A pre-push hook can outlive its bound and run twice (CR-901); a landed tick can be opened again (CR-902); two push outcomes are misstated (CR-905, CR-906).

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 108 (`task.319.qa.5.ci-runs-only-where-needed.security.run.json`, `totals.executed`); escaped 0
- `parseRerunList`: engages, 38 of 38. `push-policy --site`: engages, 48 of 48. `push-held --site`: engages, 22 of 22.
- `tick-pr.sh` and the tree comparison take a repository and not one input, so no engine form reaches them; they were probed by reproduction scripts in scratch repositories, which do not count toward the total.

### Maintainability — PASS
One decision helper, one site table, one push per HALT.

---

## Code Review

Anchors: all 16 `ok` (`finding-anchors.js --rev HEAD`). `code_review_blocking=true` from the pipeline. `boundary: true`.

**Correctness bugs (10 in the gate, 1 advisory):**

- [medium/high] `shared/resources/finalise-rerun-at-head.js:582` — CR-801, reproduced by QA: `core.ignorecase=true`, untracked `src/A.js` beside `src/a.js` → `ran`; control `false` → `dirty-tree`
- [medium/high] `shared/resources/finalise-rerun-at-head.js:376` — CR-802, reproduced by QA: `echo "0 broken"; echo warn > /dev/stderr` → both lines saved whole, `output_overwritten: true`; control `>&2` → `false`
- [low/high] `shared/resources/finalise-rerun-at-head.js:271` — CR-803, reproduced by QA: four line starts → `none-named`; control → `scan-broken`
- [low/high] `shared/resources/finalise-rerun-at-head.js:761` — CR-804, reproduced by QA: a replaced configuration blob → `ran`; control → `not-configured`
- [low/medium] `shared/resources/finalise-rerun-at-head.js:780` — CR-805, reproduced by QA: heading-style criteria → `scan-broken`, the record preflight → `empty`; control with a checkbox → `ran`
- [medium/high] `shared/resources/push-held.sh:66` — CR-901, reproduced by QA: 6 s hook, 2 s bound → the hook's file appeared after the answer; control with a fast hook → `pushed`
- [medium/high] `shared/resources/tick-pr.sh:103` — CR-902, reproduced by QA: adjacent row changed → `resume`; control, a far row → `landed`
- [medium/medium] `shared/resources/tests/push-policy.test.mjs:806` — CR-903, **advisory**: a trace of prose, not reproduced by execution
- [low/high] `shared/resources/push-held.sh:48` — CR-904, reproduced by QA: `TMPDIR=/nonexistent` → "origin has no feat"; control → `nothing held`
- [low/high] `shared/resources/push-held.sh:102` — CR-905, reproduced by QA: one remote state, `not pushed` before a fetch and `nothing held` after, HEAD differing from the PR head
- [low/high] `shared/resources/push-held.sh:119` — CR-906, reproduced by QA: 5 s pre-receive hook, 2 s bound → `not pushed`, and the remote equalled HEAD 7 s later

QA's first run of CR-803 used the command `true`, which YAML reads as a boolean, so the list was refused; it was repeated with `echo a`.

**Cleanups (5):**

- `shared/resources/ci-tree-equivalence.js:1052` — CR-806, the comment on `onSpawn` speaks of pipes
- `shared/resources/finalise-rerun-at-head.js:118` — CR-807, a copy of `normKey`
- `shared/resources/finalise-rerun-at-head.js:257` — CR-808, the doc comment states another shape
- `shared/resources/push-held.sh:78` — CR-907, the reason can be a `hint:` line
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1163` — CR-908, the heading says one push per cycle

Provenance: every file named is new in this branch, or its named lines are, so none of the gate findings is pre-existing.

Platform variance: `TMPDIR=/var/tmp command node --test` over the push-policy, tick-pr and re-run suites, 97 pass, 0 fail.

---

## Regression Testing

`push-policy` (38) and the pre-compact suite (42): PASS at this head; the rest by `ci:fast` above.

---

## Test Artifacts

### Test Commands Executed

```bash
command node --test shared/resources/tests/push-policy.test.mjs   # 38 pass
bash shared/resources/develop-pipeline-on-precompact.test.sh      # 42 passed, 0 failed
npm run test:remote                                               # ci:fast, 8876 pass
npm run test:remote -- --run eval:all                             # exit 0
npm run validate -- skills/<changed-skill>/                       # develop-next, -bug, -story, -task, finalise valid
```

---

## Recommendations

### Immediate Actions (Blocking)
1. The four medium findings

### Short-term Actions (Non-Blocking)
1. The six low findings, CR-903 and the five cleanups

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: no high finding; four medium findings
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: the four medium findings fixed, or accepted by the owner

---

**QA Report**: co-located at `task.319.qa.5.ci-runs-only-where-needed.md`
**Gate File**: co-located at `task.319.gate.5.ci-runs-only-where-needed.yml`
**Next Steps**: the loop's budget is spent (5 gates, 4 fixes): escalation

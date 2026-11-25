# QA Report: Task 319 - Pipelines spend a CI run only where a run can answer something

**Task**: [Link to task document](./task.319.ci-runs-only-where-needed.md)
**Gate File**: [task.319.gate.7.ci-runs-only-where-needed.yml](./task.319.gate.7.ci-runs-only-where-needed.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-24
**Testing Completed**: 2026-11-24
**Gate Status**: PASS

---

## Executive Summary

All 8 findings of cycle 6 are fixed for the case each one reported, and the suites and CI are green on this head. The re-review found no high and no medium defect. Seven low defects stand, each reproduced by QA with a control. All seven are on lines of the cycle 6 changes.

**Overall Assessment**: PASS
**Deployment Recommendation**: READY

---

## Re-Review Context

| Finding | Status | Evidence |
| ------- | ------ | -------- |
| CR-1001 | ✅ FIXED for the reported form | reproduction: untracked `keep.gen.js` → `dirty-tree`. Gap: CR-1203 |
| CR-1002 | ✅ FIXED | reproduction on a casefold tmpfs: a directory renamed by case → `ran` |
| CR-1003 | ✅ FIXED for the reported form | reproduction: both documents → `scan-broken`. Gap: CR-1201 |
| CR-1004 | ✅ FIXED | reproduction: `:/build/o.js` → `dirty-tree` |
| CR-1005 | ✅ FIXED for the reported form | reproduction: `scan-broken`, naming the backtick. Gap: CR-1202 |
| CR-1101 | ✅ FIXED for the reported form | reproduction: SIGKILL to the caller's group, hook gone. Gap: CR-1303 |
| CR-1102 | ✅ FIXED | reproduction: the same generic edit to another item → `resume`. Opened CR-1301 and CR-1304 |
| CR-1103 | ✅ FIXED for the reported form | reproduction: the failed fetch is named. Gap: CR-1302 |

The reproductions of cycle 6 ran on the code of this head before its commit; the reviewers ran the same cases again at this head.

---

## New Findings This Cycle

Gate ids T319-CR-1201 to T319-CR-1203 and T319-CR-1301 to T319-CR-1304. Each is listed with its line under Code Review.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#937)

### Review Methodology

Re-review scope: files changed since gate 6 (head f0e45bb0e107; 21 files) — default

The prior gate was CONCERNS with no high finding and security PASS on measured evidence, so no clause of the safety re-probe holds. Generated `skills/*/references/` copies and this work item's records were left out, and `bundle:check` holds the copies equal to their sources.

Two read-only reviewers with the shared prompt, each told to run the real scripts in scratch repositories: the re-run engine (217 s, `duration_ms`) and the push and tick scripts (1091 s, under bash 5.3 and a local bash 3.2). The second one reported two process kills broader than its own work (`pkill -f 'sleep 30'`, and a kill of up to five processes named `timeout`); no QA check was running at the time it reported. Diff review: code review.

CI on d5ed9e499923: green

Step 4b: the changed blocks push, merge or write, so the snippet engine refuses them as `mutating`. Run by tests instead: the terminal-HALT blocks and the two finalise-entry blocks (`push-policy.test.mjs`), the tick blocks (`tick-pr.test.mjs`). **Not run by any test**: the QA loop's own push blocks.

Traceability mapper: skipped (no Success Criteria table). Criteria drift: clean (base: reviewed blob). Changelog: cites (task 319). Record criteria: two listed, neither names this report.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| 0: Reader table | PASS | Verified | |
| 1: Decision helper | PASS | Verified | 41 tests with the held-commit script |
| 2: Every push site | PASS | Verified | low: CR-1302, CR-1303 |
| 3: Skip marker | PASS | Verified | |
| 4: Finalise halts | PASS | Verified | low: CR-1201 to CR-1203 |
| 5: Bitbucket | PASS | Verified | low: CR-1301, CR-1304 |
| 6: Ship | PASS | Verified | |

**Overall Phase Completion**: 7/7 delivered

---

## Success Criteria Verification

| # | Criterion | Evidence | Status |
| - | --------- | -------- | ------ |
| 1 | Every push site calls push-policy; scan with a non-vacuity case | `push-policy.test.mjs` scan tests | PASS |
| 2 | Simulated five-cycle run | `push-policy.test.mjs` five-cycle tests | PASS |
| 3 | The pause hook leaves the remote unmoved and says so | `develop-pipeline-on-precompact.test.sh`, 42 passed at this head | PASS |
| 4 | skipMarker never on a commit with code | `push-policy.test.mjs` marker tests | PASS |
| 5 | A named command is graded on a run at the head | `finalise-rerun-at-head.test.mjs` | PASS |
| 6 | The probe scores an `eslint:` entry | `security-probe-eslint.test.mjs` | PASS |
| 7 | Bitbucket poll writes the same line, from the destination's key | `finalise-ci-poll.test.mjs` | PASS |
| 8 | `tickVia: pr` ticks through a PR merged by the gate | `tick-pr.test.mjs` | PASS |
| 9 | Push count in the QA report, before and after, with the command | Below | PASS |
| 10 | `npm test` under `CI=true`; every new test red before its change | Below | PASS |
| 11 | `npm run bundle` leaves no diff; `git status` recorded | Below | PASS |
| 12 | Four keys in the reference with defaults, `eager` as the old behaviour | `docs/reference/configuration.md` | PASS |
| 13 | CHANGELOG names each part | `CHANGELOG.md` `[Unreleased]` | PASS |

### Push counts (criterion 9)

Command: `command node --test shared/resources/tests/push-policy.test.mjs` at `d5ed9e499`:

```
pushes before (eager): 9; after (batched): 6
```

### Suite under CI=true, and red-first proofs (criterion 10)

`npm run ci:fast` on the LAN server with `CI=true`, on the tree committed as `d5ed9e499`: 8889 tests, 8886 passed, 0 failed, 3 skipped. `npm run eval:all` on the same tree: exit 0. Hosted CI on the commit itself: 6 of 6 checks passed.

The proofs were run in the fix pass, on the code of this head, and were not repeated here. Each names a committed test:

| Reverted behaviour | Test that went red | Outcome |
| ------------------ | ------------------ | ------- |
| the repository's own listing | `finalise-rerun-at-head.test.mjs`, CR-1001 and CR-801 | covered |
| the same-file comparison, and the hard-link count | `finalise-rerun-at-head.test.mjs`, CR-1002 | covered |
| the wider search: a criteria heading, the whole document, between two backticks | `finalise-rerun-at-head.test.mjs`, CR-805 | covered |
| the stray-backtick refusal, the escaped backtick, the even run of backslashes | `finalise-rerun-at-head.test.mjs`, CR-805 | covered |
| the watcher's kill, its scratch file, its own end | `push-policy.test.mjs`, CR-901 and CR-1101 | covered |
| the fetch status, the kept 124 | `push-policy.test.mjs`, CR-904 and CR-505 | covered |
| the base's history read at all, read past the first commit, and its failed reads | `tick-pr.test.mjs`, CR-902 | covered |
| the watcher's check of a killed script nothing collects | none; by hand in a process namespace, hook gone with it and alive without | not held by a test |
| the search narrowed to the tick's files | none; it changes speed | not held by a test |

### Bundle (criterion 11)

`bundle:check` reports 129 skills, 0 problems. `git status --short` at this head lists no tracked change outside this work item: the implementation report (modified) and this cycle's QA files (untracked).

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

None. Searched the 8 authored code and document files changed since gate 6.

### MEDIUM Severity Issues (0)

None in the same search.

### LOW Severity Issues (7)

T319-CR-1201 to CR-1203 and CR-1301 to CR-1304. No separate bug file.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 7

---

## NFR Assessment

### Performance — PASS
Push counts above.

### Reliability — PASS
The four findings in the push and tick scripts are loud: they refuse or resume where they could have gone on, and none deletes or overwrites anything. The three in the re-run engine are silent and need an unusual document, or `core.ignorecase=true` on a case-sensitive disk beside a submodule.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 108 (`task.319.qa.7.ci-runs-only-where-needed.security.run.json`, `totals.executed`); escaped 0
- `parseRerunList`: engages, 38 of 38. `push-policy --site`: engages, 48 of 48. `push-held --site`: engages, 22 of 22.
- `tick-pr.sh` and the tree comparison take a repository and not one input, so no engine form reaches them; they were probed by reproduction scripts in scratch repositories, which do not count toward the total.

### Maintainability — PASS
One decision helper, one site table, one push per HALT. The tick's row comparison and the ignored-path filter are gone.

---

## Code Review

Anchors: all `ok` (`finding-anchors.js --rev HEAD`). `code_review_blocking=true` from the pipeline. `boundary: true`.

**Correctness bugs (7 in the gate):**

- [low/high] `shared/resources/finalise-rerun-at-head.js:845` — CR-1201, reproduced by QA: a fenced `## set up`, and `## Rollback criteria` beside a Definition of Done → `none-named`; controls `# set up` and `## Rollback` → `scan-broken`. 4 of 352 tracked documents are read differently, all sprint reviews (the reviewer's count)
- [low/high] `shared/resources/finalise-rerun-at-head.js:872` — CR-1202, reproduced by QA: a stray backtick and an unindented line in one criterion → `none-named`; control without the backtick → `scan-broken`
- [low/high] `shared/resources/finalise-rerun-at-head.js:624` — CR-1203, reproduced by QA: `SUB/x.js` beside a submodule `sub` under `core.ignorecase=true` → `ran`; control `SUB2/x.js` → `dirty-tree`
- [low/high] `shared/resources/tick-pr.sh:111` — CR-1301, reproduced by QA: a conflict resolved on the forge, squashed, remote branch deleted → `resume`; control with the remote branch kept → `landed`. The second PR that follows is traced, not run
- [low/high] `shared/resources/push-held.sh:156` — CR-1302, reproduced by QA: a locked tracking ref → "could not be fetched" with the commit here; control → `nothing held`
- [low/high] `shared/resources/push-held.sh:98` — CR-1303, reproduced by QA: 11 s of SIGSTOP on a 3 s bound → "push failed (exit 137)" while origin has HEAD; control → `pushed`
- [low/high] `shared/resources/tick-pr.sh:114` — CR-1304, reproduced by QA: started in `sub/` → `resume`; control from the top → `landed`

Provenance: all seven are on lines of the cycle 6 changes. CR-1202's behaviour is older in this pull request. None is pre-existing on the base.

Platform variance: CR-1203 needs `core.ignorecase=true` on a case-sensitive disk.

---

## Regression Testing

`push-policy` (41), `tick-pr` (25), `finalise-rerun-at-head` (41) and the pre-compact suite (42): PASS; the rest by `ci:fast` above.

---

## Test Artifacts

### Test Commands Executed

```bash
command node --test shared/resources/tests/push-policy.test.mjs             # 41 pass
command node --test shared/resources/tests/tick-pr.test.mjs                 # 25 pass
command node --test shared/resources/tests/finalise-rerun-at-head.test.mjs  # 41 pass
bash shared/resources/develop-pipeline-on-precompact.test.sh                # 42 passed, 0 failed
npm run test:remote                                                         # ci:fast, 8886 pass
npm run test:remote -- --run eval:all                                       # exit 0
npm run validate -- skills/<changed-skill>/                                 # develop-next, -batch, -bug, -story, -task, finalise valid
```

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. The seven low findings

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: no high and no medium finding; no NFR with a concern
**Quality Score**: 100/100 by the gate formula, which does not count low findings

**Deployment Recommendation**: READY
**Conditions**: none

---

**QA Report**: co-located at `task.319.qa.7.ci-runs-only-where-needed.md`
**Gate File**: co-located at `task.319.gate.7.ci-runs-only-where-needed.yml`
**Next Steps**: the PR conformance review (5c)

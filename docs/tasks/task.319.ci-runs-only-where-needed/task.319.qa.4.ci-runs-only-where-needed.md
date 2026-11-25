# QA Report: Task 319 - Pipelines spend a CI run only where a run can answer something

**Task**: [Link to task document](./task.319.ci-runs-only-where-needed.md)
**Gate File**: [task.319.gate.4.ci-runs-only-where-needed.yml](./task.319.gate.4.ci-runs-only-where-needed.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-24
**Testing Completed**: 2026-11-24
**Gate Status**: CONCERNS

---

## Executive Summary

The three high findings of cycle 3 are closed, and the suites and CI are green on this head. An unscoped re-probe of the whole branch found no high defect. Seven medium and five low defects stand; three of the medium ones (CR-601, CR-602, CR-704) are in cycle 3's own fixes.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Finding | Status | Evidence |
| ------- | ------ | -------- |
| CR-401, CR-402, CR-403 | ✅ FIXED | cycle 3's reproduction script at this head: every form answers `dirty-tree`, each clean control `ran` |
| CR-404 | ✅ FIXED as a stated limit | a `timeout` descendant still writes late; the header and the configuration reference say so |
| CR-405 | ✅ FIXED | the saved file stays at the bound. The pipes that fix it lose output in another way, see CR-601 |
| CR-406 | ✅ FIXED | reproduction script and 38 of 38 probe cases |
| CR-407, CR-409 | ✅ FIXED | `ci-tree-equivalence.test.mjs`, `push-policy.test.mjs`; one header line is stale, see CR-604 |
| CR-408, CR-410 | ✅ FIXED | `finalise-rerun-at-head.test.mjs` |
| CR-411 | ✅ FIXED | `finalise-rerun-scope.test.mjs` |
| CR-412, CR-413, CR-414, CR-510 | ✅ FIXED | one reading of the size, no second `git status`, one wording |
| CR-501, CR-502, CR-505, CR-508 | ✅ FIXED | `push-policy.test.mjs`, the blocks run as written; see CR-704 for the entry block's own limit |
| CR-507 | ⚠️ PARTIAL | fixed at the HALT block; the pushes before it are raw, see CR-703 |
| CR-503 | ✅ FIXED | the scan lists every `--mark` site |
| CR-504, CR-506, CR-509 | ✅ FIXED | `tick-pr.test.mjs` |

---

## New Findings This Cycle

Gate ids T319-CR-601 to T319-CR-607 and T319-CR-701 to T319-CR-705. Each is listed with its line under Code Review.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#937)

### Review Methodology

Re-review scope: unscoped (prior gate failed on security)

The prior gate was FAIL with a high finding on a validator, and the criteria say "never", so clauses 2 and 3 hold: the whole `origin/develop...HEAD` diff, with the safety re-probe directive.

Two read-only reviewers with the shared prompt, one over the re-run and probe half (21 files) and one over the push, tick and Bitbucket half (28 files). Returned after 299 s and 248 s (measured, `duration_ms`). Both said they did not read the test files line by line. Generated `skills/*/references/` copies were left out; `bundle:check` holds them equal to their sources. Diff review: code review.

CI on ff8e2ab33c60: green (6 checks)

Step 4b: changed blocks 26 in eleven documents, 0 executed by the engine, all refused as `mutating` (they push, merge or write). Run by tests instead: the three terminal-HALT blocks and the two finalise-entry blocks (`push-policy.test.mjs`), the tick blocks (`tick-pr.test.mjs`), and Step 3a's blocks (`finalise-rerun-scope-blocks.test.mjs`). **Not run by any test**: the QA loop's own push blocks, finalise's 6a push block and the gaps blocks.

Traceability mapper: skipped (no Success Criteria table). Criteria drift: clean (base: reviewed blob). Changelog: cites (task 319). Record criteria: two listed, neither names this report.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| 0: Reader table | PASS | Verified | |
| 1: Decision helper | PASS | Verified | 37 tests with the held-commit script |
| 2: Every push site | CONCERNS | Verified | CR-703, CR-704 |
| 3: Skip marker | PASS | Verified | |
| 4: Finalise halts | CONCERNS | Verified | CR-601 to CR-603 |
| 5: Bitbucket | CONCERNS | Verified | CR-701, CR-702 |
| 6: Ship | PASS | Verified | |

**Overall Phase Completion**: 7/7 delivered, 4/7 without a medium or high finding

---

## Success Criteria Verification

| # | Criterion | Evidence | Status |
| - | --------- | -------- | ------ |
| 1 | Every push site calls push-policy; scan with a non-vacuity case | `push-policy.test.mjs` scan tests | PASS |
| 2 | Simulated five-cycle run | `push-policy.test.mjs` five-cycle tests | PASS |
| 3 | The pause hook leaves the remote unmoved and says so | `develop-pipeline-on-precompact.test.sh`, 42 passed | PASS |
| 4 | skipMarker never on a commit with code | `push-policy.test.mjs` marker tests | PASS |
| 5 | A named command is graded on a run at the head | `finalise-rerun-at-head.test.mjs` | CONCERNS (CR-601, CR-602) |
| 6 | The probe scores an `eslint:` entry | `security-probe-eslint.test.mjs` | PASS |
| 7 | Bitbucket poll writes the same line, from the destination's key | `finalise-ci-poll.test.mjs` | PASS |
| 8 | `tickVia: pr` ticks through a PR merged by the gate | `tick-pr.test.mjs` | CONCERNS (CR-701, CR-702) |
| 9 | Push count in the QA report, before and after, with the command | Below | PASS |
| 10 | `npm test` under `CI=true`; every new test red before its change | Below | PASS |
| 11 | `npm run bundle` leaves no diff; `git status` recorded | Below | PASS |
| 12 | Four keys in the reference with defaults, `eager` as the old behaviour | `docs/reference/configuration.md` | PASS |
| 13 | CHANGELOG names each part | `CHANGELOG.md` `[Unreleased]` | PASS |

### Push counts (criterion 9)

Command: `command node --test shared/resources/tests/push-policy.test.mjs` at `ff8e2ab33`:

```
pushes before (eager): 9; after (batched): 6
```

### Suite under CI=true, and red-first proofs (criterion 10)

`npm run ci:fast` on the LAN server with `CI=true`, on the tree committed as `ff8e2ab33`: 8869 tests, 8866 passed, 0 failed, 3 skipped. `npm run eval:all` on the same tree: exit 0.

The proofs of cycle 3's fixes were run in the fix pass, on the code of this head, and were not repeated here. Each names a committed test:

| Reverted behaviour | Test that went red | Outcome |
| ------------------ | ------------------ | ------- |
| index entries, untracked files, linked parents, submodule entry and commit, links, modes, both hashes, replacements, odd names, missing files | `finalise-rerun-at-head.test.mjs` | covered |
| state directory, DoD names, DoD links, list rows | `finalise-rerun-at-head.test.mjs` | covered |
| output cut, stop at the bound, the drain's time limit | `finalise-rerun-at-head.test.mjs` | covered |
| stream teardown after the drain | the test hung until it was stopped, with no red assertion | dev-only |
| block rows, destination and its timestamps | `ci-tree-equivalence.test.mjs` | covered |
| a record that contradicts its reason | `finalise-rerun-scope.test.mjs` | covered |
| push-held: time limit, absent branch, staged set, live and dead readings, branch, PR, detached, exit codes; the mark's PR | `push-policy.test.mjs` | covered |
| the comment-only gate, the request limits | `tick-pr.test.mjs` | covered |
| `--mark` sites, 6a's mark | `push-policy.test.mjs` | covered, by reading the documents |

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

None. Searched unscoped (prior gate: security FAIL): full `origin/develop...HEAD` diff, 47 authored files and the two develop-bug step documents.

### MEDIUM Severity Issues (7)

T319-CR-601, CR-602, CR-603, CR-701, CR-702, CR-703 and CR-704. Each is described in the Code Review section and tracked by its gate entry; no separate bug file.

### LOW Severity Issues (5)

T319-CR-604 to CR-607 and CR-705.

**Total Issues**: HIGH: 0, MEDIUM: 7, LOW: 5

---

## NFR Assessment

### Performance — PASS
Push counts above. The tree comparison takes about 2 s on a clean clone of this repository.

### Reliability — CONCERNS
A run can lose output without saying so (CR-601); a tick can stall until a branch is deleted by hand (CR-702).

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 108 (`task.319.qa.4.ci-runs-only-where-needed.security.run.json`, `totals.executed`); escaped 0
- `parseRerunList`: engages, 38 of 38. `push-policy --site`: engages, 48 of 48. `push-held --site`: engages, 22 of 22.
- `tick-pr.sh` and the tree comparison take a repository and not one input, so no engine form reaches them; they were probed by reproduction scripts in scratch repositories, which do not count toward the total.

### Maintainability — PASS
One decision helper, one site table, one script for held commits.

---

## Code Review

Anchors: ten `ok`, CR-703 `unchecked-text`, CR-601 `text-mismatch` (`finding-anchors.js --rev HEAD`). `code_review_blocking=true` from the pipeline. `boundary: true`.

**Correctness bugs (12 in the gate):**

- [medium/high] `shared/resources/finalise-rerun-at-head.js` ⚠️ unverified anchor (the reviewer gave 315; the text is at 316) — CR-601, reproduced by QA: 2,000,000 bytes in one write, then `process.exit(0)` → 146,176 bytes saved, the last line lost, `output_capped: false`; controls: 600 bytes kept it, and the same script to a file kept it
- [medium/high] `shared/resources/finalise-rerun-at-head.js:544` — CR-602, reproduced by QA: `docs/theme` moved → `ran`; controls: `lib/theme` moved → `dirty-tree`, both clean → `ran`
- [medium/medium] `shared/resources/finalise-rerun-at-head.js:635` — CR-603, reproduced by QA: the report → `dirty-tree`; control (a DoD record) → `ran`
- [medium/high] `shared/resources/tick-pr.sh:167` — CR-701, reproduced by QA: `upstream` with `always` and with `inherit` moved the base; controls `simple`/`false` and `upstream`/`true` did not. `git push origin HEAD`, which every other site uses, created the branch's own name under the same settings
- [medium/high] `shared/resources/tick-pr.sh:142` — CR-702, reproduced by QA; control with no local branch resumed at the newer commit
- [medium/high] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1497` — CR-703, reproduced by QA: the raw block re-created the branch; `push-held.sh` in the same state kept the commit local
- [medium/medium] `shared/resources/develop-pipeline-step-7-finalise.md:32` — CR-704, reproduced by QA with a 6 s hook under a 3 s limit: exit 124 and no line; control: `pushed`
- [low/high] `shared/resources/ci-tree-equivalence.js:46` — CR-604, read by QA; the answer itself is held by a committed test
- [low/high] `shared/resources/finalise-rerun-at-head.js:692` — CR-605, reproduced by QA; control with the span on the criterion line → `ran`
- [low/high] `shared/resources/finalise-rerun-at-head.js:682` — CR-606, reproduced by QA; control with LF → `ran`
- [low/high] `shared/resources/finalise-rerun-at-head.js:441` — CR-607, reproduced by QA; control without the file → `ran`
- [low/high] `shared/resources/push-held.sh:83` — CR-705, reproduced by QA; control with a working `jq` pushed

**Cleanups**: none reported.

Provenance: every file named is new in this branch, or its named lines are, so none of the gate findings is pre-existing. CR-605 and CR-606 rest on the shared criteria reader, which is older; what is new is an engine that trusts it.

Platform variance: `TMPDIR=/var/tmp command node --test` over the push-policy, tick-pr and re-run suites, 87 pass, 0 fail.

---

## Regression Testing

`push-policy` (37) and the pre-compact suite (42): PASS at this head; the rest by `ci:fast` above.

---

## Test Artifacts

### Test Commands Executed

```bash
command node --test shared/resources/tests/push-policy.test.mjs   # 37 pass
bash shared/resources/develop-pipeline-on-precompact.test.sh      # 42 passed, 0 failed
npm run test:remote                                               # ci:fast, 8866 pass
npm run test:remote -- --run eval:all                             # exit 0
npm run validate -- skills/<changed-skill>/                       # 10 of 10 valid
```

---

## Recommendations

### Immediate Actions (Blocking)
1. The seven medium findings

### Short-term Actions (Non-Blocking)
1. The five low findings

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: no high finding; seven medium findings
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: the seven medium findings fixed

---

**QA Report**: co-located at `task.319.qa.4.ci-runs-only-where-needed.md`
**Gate File**: co-located at `task.319.gate.4.ci-runs-only-where-needed.yml`
**Next Steps**: qa-fix cycle 4

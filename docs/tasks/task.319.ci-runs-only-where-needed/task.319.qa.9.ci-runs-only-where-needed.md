# QA Report: Task 319 - Pipelines spend a CI run only where a run can answer something

**Task**: [Link to task document](./task.319.ci-runs-only-where-needed.md)
**Gate File**: [task.319.gate.9.ci-runs-only-where-needed.yml](./task.319.gate.9.ci-runs-only-where-needed.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-25
**Testing Completed**: 2026-11-25
**Gate Status**: PASS

---

## Executive Summary

The three gaps of Definition of Done run 1 are closed. `ci.skipMarker` refuses every control and format character and a surrogate on its own, with a test that is red without each class. The HALT sentence of the configuration reference is corrected. The red-first record that criterion 10 asks for is in this report, test by test. One read-only review found four low points in the fixes; all four are fixed. The seven low findings that gate 7 carried stand as they were.

**Overall Assessment**: PASS
**Deployment Recommendation**: READY

---

## Re-Review Context

| Finding (DoD run 1) | Status | Evidence |
| ------------------- | ------ | -------- |
| Criterion 10: no red-first record for 45 of the new tests | ✅ FIXED | "Red-first proofs" below; `task.319.qa.9.red-first.txt` |
| Security: `ci.skipMarker` accepts U+0085 | ✅ FIXED | `shared/resources/ci-tree-equivalence.js` (`skipMarkerOf`); `push-policy.test.mjs`, "config: ci.skipMarker is one printable line" |
| Docs: the bound and the cases of a HALT's push | ✅ FIXED | `docs/reference/configuration.md`, "When the pipelines push" |

The first of the two spec questions that DoD run 1 left to the owner (a bidi override in the marker) is answered by the fix: format characters are refused, and the key's row says so. The second (a `pipeline` key spelled with an escape) is not changed.

---

## New Findings This Cycle

None open.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#937)

### Review Methodology

Re-review scope: files changed since gate 8 (head 5c0de1ea3; commits a4a9d77fb and 60e31933b, and the records between) — default

Generated `skills/*/references/` copies and this work item's records were left out, and `bundle:check` holds the copies equal to their sources. One read-only reviewer read the diff at a4a9d77fb (222 s, `duration_ms`). It ran every code point through `parseConfig` on Node 22, 24 and 26, five mutations of the test, and `push-held.sh --site halt` in 18 scenarios. **The answers to its findings (commit 60e31933b, 13 lines) were read by QA in-line and by no second reader.** The PR conformance review that follows reads the whole diff.

CI on 60e31933baae: head mismatch (PR head 30e160afc9b3). These commits are not pushed yet; the push before 5c carries them. The hosted checks on 30e160afc are green.

Step 4b: no fenced command block changed. Traceability mapper: skipped (no Success Criteria table). Criteria drift: clean (base: reviewed blob). Changelog: cites (task 319). Record criteria: two listed, neither names this report.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| 0: Reader table | PASS | Verified | unchanged |
| 1: Decision helper | PASS | Verified | 42 tests with the held-commit script |
| 2: Every push site | PASS | Verified | unchanged |
| 3: Skip marker | PASS | Verified | the characters it refuses, and a limit in characters |
| 4: Finalise halts | PASS | Verified | unchanged |
| 5: Bitbucket | PASS | Verified | unchanged |
| 6: Ship | PASS | Verified | the configuration reference corrected |

**Overall Phase Completion**: 7/7 delivered

---

## Success Criteria Verification

| # | Criterion | Evidence | Status |
| - | --------- | -------- | ------ |
| 1 | Every push site calls push-policy; scan with a non-vacuity case | `push-policy.test.mjs` scan tests | PASS |
| 2 | Simulated five-cycle run | `push-policy.test.mjs` five-cycle tests | PASS |
| 3 | The pause hook leaves the remote unmoved and says so | `develop-pipeline-on-precompact.test.sh`, in `ci:fast` | PASS |
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

Command: `command node --test shared/resources/tests/push-policy.test.mjs` on the tree of `60e31933b`:

```
pushes before (eager): 9; after (batched): 6
```

### Suite under CI=true (criterion 10)

`npm run ci:fast` (which runs `npm test`) on the LAN server with `CI=true`, on the tree of `60e31933b`: 8890 tests, 8887 passed, 0 failed, 3 skipped (exit 0, 13 minutes). The run on `a4a9d77fb` before it gave the same numbers.

### Red-first proofs (criterion 10)

**How the list of new tests was taken.** `git diff --name-status a511895a0 HEAD` (the merge base), every test file: five are new, and eight are changed. Each file is below, and each test of it that this task adds or changes.

**A. Against the source before this task.** In a scratch worktree at the head, every changed file under `shared/`, `skills/` and `docs/reference/` that is not a test was put back to the merge base (91 restored, 22 removed), and each test file was run with `node --test`. The lines are in `task.319.qa.9.red-first.txt`, part A.

| Test file | Red | Green, of the tests this task adds or changes |
| --------- | --- | --------------------------------------------- |
| `shared/resources/tests/push-policy.test.mjs` (new, 42) | 41 | 1: "eager: the same loop pushes after every commit", because `eager` is the old behaviour; in B |
| `shared/resources/tests/tick-pr.test.mjs` (new, 25) | 25 | 0 |
| `shared/resources/tests/finalise-ci-poll.test.mjs` (new, 9) | 9 | 0 |
| `shared/resources/tests/ci-tree-equivalence.test.mjs` (changed) | 9 | 0 |
| `shared/resources/tests/finalise-rerun-scope.test.mjs` (changed) | 3 | 0 |
| `shared/resources/tests/criteria-section.test.mjs` (changed) | 1 | 0 |
| `evals/shared/tests/finalise-bug-mode.test.mjs` (changed) | 1 | 0 |
| `evals/shared/tests/finalise-publish-boundary.test.mjs` (changed) | 1 | 0 |
| `shared/resources/tests/finalise-rerun-at-head.test.mjs` (new, 41) | the file, at load | not told apart; in B |
| `shared/resources/tests/security-probe-eslint.test.mjs` (new, 14) | the file, at load | not told apart; in B |
| `evals/shared/tests/finalise-rerun-scope-blocks.test.mjs` (changed) | the file, at load | not told apart; in B |

**B. The rest, test by test, with one thing replaced.** Run during `/finalise` on `4005bbc73` in a scratch worktree; since then only the marker's parser in `ci-tree-equivalence.js` and one test of `push-policy.test.mjs` have changed. The lines of the three stub runs are in part B of the same file.

| Replaced | Result |
| -------- | ------ |
| `finalise-rerun-at-head.js` by a stub with its names and no behaviour | `finalise-rerun-at-head.test.mjs`: 41 red, 0 green. `finalise-rerun-scope-blocks.test.mjs`: "Step 3a end to end …" and "Steps 3a + 3c as substituted …" red in both shells |
| the placeholder check of the Step 3a re-run block removed (run on `109a5f998`) | "Steps 3a and 3c run as delivered …": red in both shells |
| the pre-compact hook writes `**Pushed:** no` after a push too (run on `109a5f998`) | `develop-pipeline-on-precompact.test.sh`, the control scenario 17g: red |
| `security-probe.mjs` at the merge base, plus an empty `checkEslintRuntime` | `security-probe-eslint.test.mjs`: 13 red, 1 green |
| `probe-boundary-rule.md` at the merge base | that one, "every document that lists the engine's entry forms …": red |
| the `DOD_N` number check of the Step 3a re-run block removed | "Step 3a's re-run block refuses a DOD_N …": red in both shells |
| the record preflight call moved after the re-run | "Step 3a runs the named commands before …": red |
| the `eager` line of `push-policy.sh` removed | "eager: the same loop …": red |

**C. Proved in earlier cycles.** "Step 8a grades the re-run on the fix head again …" ([QA report 3](./task.319.qa.3.ci-runs-only-where-needed.md), line 133); scenario 17j of `develop-pipeline-on-precompact.test.sh` ([QA report 1](./task.319.qa.1.ci-runs-only-where-needed.md), line 103); the new section of `pr-read.test.sh` (QA report 3, line 132).

**This cycle's test**, "config: ci.skipMarker is one printable line …": red on `4005bbc73` at U+0080, red again at 80 characters outside the BMP before the limit was changed, and green after each.

### Bundle (criterion 11)

`bundle:check` reports 129 skills, 0 problems. `git status --short` at this head lists this cycle's QA files (untracked) and nothing else.

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

None.

### MEDIUM Severity Issues (0)

None.

### LOW Severity Issues (0)

None open. The seven that gate 7 carried are in the gate's `recommendations.future` and in the task's Deferred Work.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0

---

## NFR Assessment

### Performance — PASS
Push counts above.

### Reliability — PASS
The marker's parser is the only behaviour that changed. The seven carried low findings stand.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 129 (`task.319.qa.9.ci-runs-only-where-needed.security.run.json`, `totals.executed`); reproduced 0, escaped 0
- `parseConfig`, marker characters: engages, 16 of 16 (`task.319.qa.9.security.cases-marker.json`). `parseConfig`, the 13 cases of DoD run 1: engages, 13 of 13; the one that run reproduced is now refused. `parsePipelineConfig`: 9 of 9. `push-policy --site`: 42 of 42. `push-held --site`: 18 of 18. `parseRerunList`: 31 of 31.

### Maintainability — PASS
One rule for the marker in the code, the test and the reference.

---

## Code Review

`code_review_blocking=true` from the pipeline. `boundary: true`. Four low points were found, confirmed and fixed in 60e31933b:

- [low] `docs/reference/configuration.md` — a push that ran out of time can have reached the remote
- [low] `docs/reference/configuration.md` — the checkout is one of the causes
- [low] `docs/reference/configuration.md` — the limit of 80 was in UTF-16 units; the code counts characters now
- [low] `shared/resources/tests/push-policy.test.mjs` — raw invisible characters in the source

Mutations, in scratch copies:

mutation-proven: `\p{Cc}` removed → "config: ci.skipMarker is one printable line" (U+1) → covered
mutation-proven: `\p{Cf}` removed → the same test (U+200b) → covered
mutation-proven: `\p{Cs}` removed → the same test (U+d800) → covered
mutation-proven: `m.length` in place of `[...m].length` → the same test (80 characters outside the BMP) → covered

---

## Regression Testing

`push-policy` (42): PASS; the rest by `ci:fast` above.

---

## Test Artifacts

### Test Commands Executed

```bash
command node --test shared/resources/tests/push-policy.test.mjs  # 42 pass
npm run test:remote                                              # ci:fast
npm run bundle:check                                             # 0 problems
```

`eval:all` was not run on the LAN server in this cycle. The hosted `test` job runs on the pushed head, and `/finalise` reads it.

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. The seven low findings gate 7 carried

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: no open finding; no NFR with a concern
**Quality Score**: 100/100 by the gate formula, which does not count the carried low findings

**Deployment Recommendation**: READY
**Conditions**: none

---

**QA Report**: co-located at `task.319.qa.9.ci-runs-only-where-needed.md`
**Gate File**: co-located at `task.319.gate.9.ci-runs-only-where-needed.yml`
**Next Steps**: the PR conformance review (5c)

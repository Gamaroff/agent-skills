# QA Report: Task 319 - Pipelines spend a CI run only where a run can answer something

**Task**: [Link to task document](./task.319.ci-runs-only-where-needed.md)
**Gate File**: [task.319.gate.8.ci-runs-only-where-needed.yml](./task.319.gate.8.ci-runs-only-where-needed.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-25
**Testing Completed**: 2026-11-25
**Gate Status**: PASS

---

## Executive Summary

All 10 findings of PR review 1 are fixed. The change is documents and one header comment; no behaviour changed. Two read-only reviews of the fixes found 12 further points (one medium, eleven low), all fixed before the commit. The seven low findings that gate 7 carried stand as they were.

**Overall Assessment**: PASS
**Deployment Recommendation**: READY

---

## Re-Review Context

| Finding | Status | Evidence |
| ------- | ------ | -------- |
| PC-1 to PC-4 | ✅ FIXED | `develop-pipeline-pause.md`, the three `skills/develop-*/SKILL.md`: the pause commit is pushed only under `eager` |
| PC-5 to PC-7 | ✅ FIXED | `skills/develop-task/README.md`, `skills/develop-story/README.md` |
| PC-8 | ✅ FIXED | the plan's appendix is labelled a snapshot and names `push-policy.sh --list` |
| PC-9, PC-10 | ✅ FIXED | the task document, sections 7 and 3 |

Seven more statements of the removed rule were found by a wider search and corrected with them.

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

Re-review scope: files changed since gate 7 (head d5ed9e499; commit 5c0de1ea3 and the records before it) — default

Generated `skills/*/references/` copies and this work item's records were left out, and `bundle:check` holds the copies equal to their sources. The two reviews ran on the staged tree before the commit: the first over the whole change (242 s), the second over the answers to the first and a repeated search (186 s, `duration_ms`). **The answers to the second review (about ten lines) were read by QA in-line and by no second reader.** The PR conformance review that follows reads the whole diff.

CI on 5c0de1ea3: not read. The commit is not pushed yet (`push-policy.sh --site qa-review-fix` answered `defer`); the push before 5c carries it. Hosted CI on `b1f297158`, the pull request's head, is green (6 checks); it differs by these documents.

Step 4b: no fenced command block changed. Traceability mapper: skipped (no Success Criteria table). Criteria drift: clean (base: reviewed blob). Changelog: cites (task 319). Record criteria: two listed, neither names this report.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| 0: Reader table | PASS | Verified | the snapshot is labelled |
| 1: Decision helper | PASS | Verified | 41 tests with the held-commit script |
| 2: Every push site | PASS | Verified | the statements the review named are corrected |
| 3: Skip marker | PASS | Verified | delivered conditions stated |
| 4: Finalise halts | PASS | Verified | |
| 5: Bitbucket | PASS | Verified | |
| 6: Ship | PASS | Verified | |

**Overall Phase Completion**: 7/7 delivered

---

## Success Criteria Verification

No code changed since gate 7, so its evidence holds; the rows below were run again on this tree.

| # | Criterion | Evidence | Status |
| - | --------- | -------- | ------ |
| 1 | Every push site calls push-policy; scan with a non-vacuity case | `push-policy.test.mjs` scan tests. On this tree the scan caught two README rows reworded in this cycle; they were restored | PASS |
| 2 | Simulated five-cycle run | `push-policy.test.mjs` five-cycle tests | PASS |
| 3 | The pause hook leaves the remote unmoved and says so | `develop-pipeline-on-precompact.test.sh`, in `ci:fast`; documents corrected | PASS |
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

Command: `command node --test shared/resources/tests/push-policy.test.mjs` on the tree of `5c0de1ea3`:

```
pushes before (eager): 9; after (batched): 6
```

### Suite under CI=true, and red-first proofs (criterion 10)

`npm run ci:fast` on the LAN server with `CI=true`, on the tree committed as `5c0de1ea3`: 8889 tests, 8886 passed, 0 failed, 3 skipped. A run before it, on a tree that differs by two README rows, failed two scan tests; `eval:all` passed on that tree (exit 0) and was not repeated for the two rows.

No behaviour changed in this cycle, so there is no new proof. The red-first proofs of the code are in [QA report 7](./task.319.qa.7.ci-runs-only-where-needed.md), under the same heading, with the test that went red for each.

### Bundle (criterion 11)

`bundle:check` reports 129 skills, 0 problems. `git status --short` at this head lists the implementation report (modified) and this cycle's QA files (untracked), and nothing else.

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

None open. One was found and fixed before the commit (`develop-pipeline-pause.md:280`).

### LOW Severity Issues (0)

None open. The seven that gate 7 carried are in the gate's `recommendations.future` and in the task's Deferred Work.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0

---

## NFR Assessment

### Performance — PASS
Push counts above.

### Reliability — PASS
No behaviour changed since gate 7. Its seven low findings stand.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 108 (`task.319.qa.8.ci-runs-only-where-needed.security.run.json`, `totals.executed`); escaped 0
- `parseRerunList`: engages, 38 of 38. `push-policy --site`: engages, 48 of 48. `push-held --site`: engages, 22 of 22.

### Maintainability — PASS
The documents agree with the hook, the helper and the lock in every wording the searches covered.

---

## Code Review

`code_review_blocking=true` from the pipeline. `boundary: true`. Twelve points were found before the commit and all are fixed:

- [medium] `shared/resources/develop-pipeline-pause.md:280` — the checklist said the remote reflects the pause commit
- [low] both READMEs — the pause diagram and the lock row still deleted the lock; the flowchart still pushed every fix cycle; the post-fix rows said "push"
- [low] the three `SKILL.md` summaries — "commit/push per cycle", and then the two wordings that replaced it
- [low] the task document — the reason given for `checkCommand`, "never marked" for a HALT, and "never pushes" without `batched`
- [low] `develop-bug-step-5-6-verify-loop.md` — "each fix cycle pushes"
- [low] `develop-pipeline-on-precompact.sh` — the header comment

---

## Regression Testing

`push-policy` (41): PASS; the rest by `ci:fast` above.

---

## Test Artifacts

### Test Commands Executed

```bash
command node --test shared/resources/tests/push-policy.test.mjs  # 41 pass
npm run test:remote                                              # ci:fast, 8886 pass
npm run test:remote -- --run eval:all                            # exit 0, on a tree that differs by two README rows
npm run bundle:check                                             # 0 problems
```

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

**QA Report**: co-located at `task.319.qa.8.ci-runs-only-where-needed.md`
**Gate File**: co-located at `task.319.gate.8.ci-runs-only-where-needed.yml`
**Next Steps**: the PR conformance review (5c)

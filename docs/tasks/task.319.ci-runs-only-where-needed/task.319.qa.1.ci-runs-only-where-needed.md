# QA Report: Task 319 - Pipelines spend a CI run only where a run can answer something

**Task**: [Link to task document](./task.319.ci-runs-only-where-needed.md)
**Gate File**: [task.319.gate.1.ci-runs-only-where-needed.yml](./task.319.gate.1.ci-runs-only-where-needed.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-24
**Testing Completed**: 2026-11-24
**Gate Status**: FAIL

---

## Executive Summary

All seven phases are delivered and every test is green. Two independent diff reviewers and a boundary probe found two high defects and fifteen medium or low ones that the suites do not see, so the gate is FAIL.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#937)

### Testing Approach

- [x] Automated Testing (unit, process, protocol)
- [x] Regression Testing
- [x] Security Review (probe)
- [x] Code Review

### Review Methodology

Parallel agents (7 phases, several modules): two read-only reviewers with the shared prompt, one over the JavaScript half of the diff and one over the shell and prose half. Dispatched 10:53Z; returned after 255 s and 281 s (measured, `duration_ms`). Generated `skills/*/references/` copies were left out of the patches; `bundle:check` holds them equal to their sources. The hand-authored develop-bug reference was included. Diff review: code review.

CI on a8528bbe9e3d: green

Step 4b: 16 changed blocks found in scope documents, 0 executed: 3 in the QA loop document, 1 in step 7, 1 in step 8, 1 in develop-batch, 6 in develop-next, 3 in finalise and 1 in the develop-bug verify loop, all refused as `mutating` (they push, merge or write). `changed-blocks-not-executed` is therefore a statement about deny-listed commands, not a configuration gap. The scripts they call are run by `push-policy.test.mjs`, `tick-pr.test.mjs` and the pre-compact suite; the blocks themselves are read by the reviewer, which is how T319-CR-103 was found. Both shells are available on this host.

Traceability mapper: skipped (no Success Criteria table). Criteria drift: clean (base: reviewed blob of review 2). Changelog: cites (task 319).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| 0: Reader table | PASS | Verified | Plan appendix; carried as `push-policy.sh`'s site table |
| 1: Decision helper | PASS | Verified | 24 tests |
| 2: Every push site | CONCERNS | Verified | Two HALTs push in prose; one reader missing (CR-102, CR-106, CR-107) |
| 3: Skip marker | CONCERNS | Verified | Merge strategy (CR-101) |
| 4: Finalise halts | CONCERNS | Verified | CR-1, CR-2, CR-3, CR-6 |
| 5: Bitbucket | CONCERNS | Verified | CR-103 to CR-105, CR-110, CR-111 |
| 6: Ship | PASS | Verified | Reference, runbook, CHANGELOG |

**Overall Phase Completion**: 7/7 delivered, 3/7 without a finding

---

## Success Criteria Verification

| # | Criterion | Evidence | Status |
| - | --------- | -------- | ------ |
| 1 | Every push site calls push-policy; scan with a non-vacuity case | `push-policy.test.mjs` "scan: every git push …" and "scan: the detector flags …" | CONCERNS (CR-107: prose pushes are outside the scan) |
| 2 | Simulated five-cycle run: 3 pushes batched, every commit eager | `push-policy.test.mjs` "batched: a five-cycle loop …", "eager: the same loop …" | PASS |
| 3 | The pause hook leaves the remote unmoved and says so | `develop-pipeline-on-precompact.test.sh`, 42 passed | PASS |
| 4 | skipMarker never on a commit with code | "marker: never on a commit with code …" | PASS, with CR-101 beside it |
| 5 | A named command is graded on a run at the head | `finalise-rerun-at-head.test.mjs`, 11 tests | CONCERNS (CR-1, CR-2, CR-3) |
| 6 | The probe scores an `eslint:` entry | `security-probe-eslint.test.mjs`, 10 tests | PASS |
| 7 | Bitbucket poll writes the same line, from the destination's key | `finalise-ci-poll.test.mjs`, 5 tests | CONCERNS (CR-110, CR-111) |
| 8 | `tickVia: pr` ticks through a PR merged by the gate | `tick-pr.test.mjs`, 10 tests | CONCERNS (CR-103 to CR-105) |
| 9 | Push count in the QA report, before and after, with the command | Below | PASS |
| 10 | `npm test` under `CI=true`; every new test red before its change | Below | PASS |
| 11 | `npm run bundle` leaves no diff; `git status` recorded | Below | PASS |
| 12 | Four keys in the reference with defaults, `eager` as the old behaviour | `docs/reference/configuration.md` "When the pipelines push" | PASS |
| 13 | CHANGELOG names each part | `CHANGELOG.md` `[Unreleased]` | PASS |

### Push counts (criterion 9)

Command: `command node --test shared/resources/tests/push-policy.test.mjs` at `a8528bbe9`:

```
pushes before (eager): 9; after (batched): 6
```

The modelled sequence is one develop push, two code cycles, three pauses, the pre-5c push, the acceptance push and Step 8. The three pauses are the pushes removed.

### Suite under CI=true, and red-first proofs (criterion 10)

`npm run ci:fast` on the LAN server with `CI=true`, on `f87488f55` (the head under review differs from it by the implementation report alone): 8806 passed, 0 failed, 3 skipped. `npm run eval:all`: exit 0. CI on the head is green.

| Reverted behaviour | Test that went red | Outcome |
| ------------------ | ------------------ | ------- |
| push-policy always pushes | "batched: a five-cycle loop …", "pause: batched never pushes …", "performance: …" | covered |
| step8 is not an end row | "a remote reader, an end and --end push …" | covered |
| marker ignores code in the head or the delta | "marker: never on a commit with code …" | covered |
| hook ignores the policy | pre-compact suite, batched steps 2 and 5 | covered |
| the pre-change poll | all five Bitbucket poll tests | covered |
| destination filter dropped | "Bitbucket: the result line carries the rollup …", "… NONE" | covered |
| tick-pr without the quality gate, the CI check or the head check | one test each | covered |
| rerun matches a substring, or a prefix | "only a whole code span …" | covered |
| rerun without the dirty check | "a working tree that is not the head refuses …" | covered |
| rerun reads the working-tree configuration | "a command added to the configuration in the working tree only …" | covered |
| rerun without the state-directory filter | "the pipeline's own state directory is not code …" | covered |
| eslint: any rule counts; rule presence not checked; ignored or unparsable scored | three tests of the same file | covered |
| the never-carried rule of the re-run scope | "scope: a PASS graded on a command re-run …" | covered |

### Bundle (criterion 11)

`npm run bundle` exits 0 and `git status --short` afterwards lists no tracked change outside this work item: only the implementation report (modified) and this cycle's QA files (untracked).

---

## Breaking Changes Validation

### Breaking Change: a pause and a record-only cycle no longer push

Documented: Yes (CHANGELOG, configuration reference, PR body)
Migration Path Provided: Yes (`pipeline.pushRecordCommits: eager`)
Migration Tested: Yes ("eager: the same loop pushes after every commit")
Notes: the statement "a HALT always pushes" is not true of two HALTs (CR-106).

**Overall Breaking Changes Assessment:** CONCERNS

---

## Issues Found

### HIGH Severity Issues (2)

**Issue: a rerunAtHead list at the key's own indent reads as not configured**
- **Bug Report**: [task.319.bug.1.rerun-list-silently-dropped.md](./task.319.bug.1.rerun-list-silently-dropped.md)
- **Impact**: a criterion silently keeps its old-run grade, the halt this part was built to remove

**Issue: the skip marker can reach the base branch head**
- **Bug Report**: [task.319.bug.2.skip-marker-reaches-the-base-branch.md](./task.319.bug.2.skip-marker-reaches-the-base-branch.md)
- **Impact**: the base branch's run is skipped for a push that carries code

### MEDIUM Severity Issues (11)

T319-CR-2, CR-3, CR-6, CR-102, CR-103, CR-104, CR-105, CR-106, CR-107, CR-110 and CR-111. Each is described in the Code Review section and tracked by its gate entry; no separate bug file.

### LOW Severity Issues (4)

T319-QA-1, CR-7, CR-8 and CR-10.

**Total Issues**: HIGH: 2, MEDIUM: 11, LOW: 4

---

## NFR Assessment

### Performance — PASS
Push counts above.

### Reliability — CONCERNS
Two HALTs can leave a deferred commit local; the `tickVia: pr` path does not run as written.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 36 (`task.319.qa.1.ci-runs-only-where-needed.security.run.json`, `totals.executed`); escaped 0
- `push-policy --site`: present-but-inert, 24 of 26 as required; `\160ause` accepted in both shells (T319-QA-1). `parseRerunList`: engages, 10 of 10.
- Span matcher timed on repeated patterns to 16000 repeats: linear (about 3 ms).

### Maintainability — PASS
One decision helper and one table.

---

## Code Review

Anchors: all 27 `ok` (`finding-anchors.js --rev HEAD`). `code_review_blocking=true` from the pipeline. `boundary: true`.

**Correctness bugs (24):**

- [high/high] `shared/resources/finalise-rerun-at-head.js:92` — CR-1, reproduced: `parseRerunList("finalise:\n  rerunAtHead:\n  - npm run x\n")` returns `[]`; control with a deeper indent returns the entry; also `[]` for a null key, a top-level list and a duplicate block, `["a"]` for a mis-indented row, `["run --sel="]` for `--sel=#foo`
- [high/high] `shared/resources/push-policy.sh:161` — CR-101, marker and merge strategy
- [medium/high] `shared/resources/finalise-rerun-scope.js:403` — CR-2, a prior FAIL re-run criterion goes to the member merge
- [medium/high] `shared/resources/finalise-rerun-at-head.js:306` — CR-3, the tree is checked once
- [medium/high] `shared/resources/finalise-rerun-at-head.js:144` — CR-6, output is unbounded
- [medium/high] `shared/resources/push-policy.sh:49` — CR-102, reading 1 is a remote reader missing from the table
- [medium/high] `skills/develop-next/SKILL.md:675` — CR-103, unbound reads
- [medium/high] `skills/develop-next/SKILL.md:663` — CR-104, the no-commit resume
- [medium/high] `shared/resources/tick-pr.sh:177` — CR-105, tidying failure halts after the merge
- [medium/high] `docs/reference/configuration.md:478` — CR-106, two HALTs do not push
- [medium/high] `shared/resources/tests/push-policy.test.mjs:599` — CR-107, prose pushes
- [medium/medium] `shared/resources/finalise-ci-poll.sh:83` — CR-110, reproduced: `prs:**:develop SUCCESSFUL` with `sonar FAILED` reduces to `SUCCESS 1`
- [medium/medium] `shared/resources/tick-pr.sh:153` — CR-111, reproduced: `prs:**:main SUCCESSFUL` with `sonar FAILED` reduces to `NONE 0` for develop; an empty list is also `NONE 0`
- [medium/medium] `shared/resources/finalise-rerun-at-head.js:285` — CR-4, uncommitted documentation is exempt and not listed (advisory)
- [medium/medium] `shared/resources/finalise-rerun-scope.js:404` — CR-5, the carry rule reads a typed citation (advisory)
- [medium/medium] `shared/resources/push-policy.sh:157` — CR-108, `--mark` can run checkCommand in the foreground (advisory)
- [medium/medium] `shared/resources/finalise-ci-poll.sh:73` — CR-109, the Bitbucket head is cached (advisory)
- [low/high] `shared/resources/finalise-rerun-at-head.js:140` — CR-7
- [low/high] `shared/resources/security-probe.mjs:560` — CR-8
- [low/high] `skills/finalise/SKILL.md:639` — CR-10
- [low/medium] `shared/resources/security-probe.mjs:999` — CR-9 (advisory)
- [low/medium] `skills/finalise/SKILL.md:3534` — CR-11 (advisory)
- [low/medium] `shared/resources/security-review-prompt.md:102` — CR-12 (advisory)
- [low/medium] `shared/resources/tick-pr.sh:140` — CR-112 (advisory)

**Cleanups (3):** CR-113 `shared/resources/push-policy.sh:18`, CR-114 `shared/resources/push-policy.sh:78`, CR-115 `docs/reference/pipeline-artifacts.md:56`.

Promoted to the gate: every bug at high confidence, CR-110 and CR-111 (reproduced by QA), and the probe's own finding T319-QA-1.

Platform variance: the new tests build their fixtures with `mkdtempSync(os.tmpdir())` and pass none of them to a validating consumer; CI runs the same suites under `/tmp` and is green.

---

## Regression Testing

`ci-tree-equivalence`, `finalise-rerun-scope` and the pre-compact suite: PASS (238 tests and 42 cases at this head).

---

## Test Artifacts

### Test Commands Executed

```bash
command node --test shared/resources/tests/{finalise-ci-poll,tick-pr,finalise-rerun-at-head,security-probe-eslint,ci-tree-equivalence,finalise-rerun-scope,push-policy}.test.mjs   # 238 pass
bash shared/resources/develop-pipeline-on-precompact.test.sh   # 42 passed, 0 failed
npm run bundle                                                  # no diff
```

Standards-named validation: `validate:all`, `check:generated`, `lint:shell`, `lint:secrets`, `bundle:check` green on `f87488f55`.

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix T319-CR-1 and T319-CR-101, then the medium findings

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: two high findings
**Quality Score**: 60/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.319.qa.1.ci-runs-only-where-needed.md`
**Gate File**: co-located at `task.319.gate.1.ci-runs-only-where-needed.yml`
**Next Steps**: qa-fix cycle 1

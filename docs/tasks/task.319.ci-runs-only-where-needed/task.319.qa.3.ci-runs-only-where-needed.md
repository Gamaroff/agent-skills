# QA Report: Task 319 - Pipelines spend a CI run only where a run can answer something

**Task**: [Link to task document](./task.319.ci-runs-only-where-needed.md)
**Gate File**: [task.319.gate.3.ci-runs-only-where-needed.yml](./task.319.gate.3.ci-runs-only-where-needed.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-24
**Testing Completed**: 2026-11-24
**Gate Status**: FAIL

---

## Executive Summary

The suites and CI are green on this head, but three high defects reproduce in the re-run engine: it can answer `ran` over a working tree that is not the head. Nine medium and seven low defects stand beside them, most of them in cycle 2's own fixes.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

| Finding | Status | Evidence |
| ------- | ------ | -------- |
| CR-201 | ⚠️ PARTIAL | quoted and spaced copies are refused (probe); a column-0 row and an escaped key are not, see CR-406 |
| CR-202, CR-205, CR-206, CR-210, CR-211 | ✅ FIXED | their tests; the `eslint:` half was run on ESLint 8, 9 and 10 by the reviewer and not refuted |
| CR-203 | ⚠️ PARTIAL | the exemption is too wide, see CR-408 |
| CR-204 | ❌ NOT FIXED | three ways to hide an edit remain, see CR-401 to CR-403 |
| CR-207 | ⚠️ PARTIAL | an empty `ran` record passes, see CR-411 (advisory) |
| CR-208 | ✅ FIXED | probe: unknown, near-miss and misplaced keys refused |
| CR-209 | ⚠️ PARTIAL | the cut holds for a command's own group only, see CR-405 |
| CR-301, CR-308 | ⚠️ PARTIAL | see CR-501 and CR-502 |
| CR-302, CR-304, CR-305 | ✅ FIXED | `tick-pr.test.mjs` |
| CR-303 | ⚠️ PARTIAL | a gate that runs nothing still passes, see CR-506 |
| CR-306 | ⚠️ PARTIAL | one caller passes no destination, see CR-407 and CR-409 |
| CR-307 | ⚠️ PARTIAL | the flush has no bound and lacks two guards, see CR-505, CR-507 and CR-508 |
| CR-309 | ⚠️ PARTIAL | see CR-509 |
| CR-310 | ⚠️ PARTIAL | one site of several, see CR-503 |
| CR-311 | ⚠️ PARTIAL | three requests in `tick-pr.sh` are still unbounded, see CR-504 |

---

## New Findings This Cycle

Gate ids T319-CR-401 to T319-CR-410 and T319-CR-501 to T319-CR-509. Each is listed with its line under Code Review.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#937)

### Review Methodology

Re-review scope: files changed since gate 2 (head f54e31cb4a6d; 85 files) — default

Clause 1 of the safety re-probe printed `false`; clauses 2 and 3 do not hold for gate 2 (CONCERNS, no high finding).

Two read-only reviewers with the shared prompt, one over the re-run and probe half and one over the push, tick and Bitbucket half. Returned after 880 s and 553 s (measured, `duration_ms`). Of the 85 files, 46 are generated `skills/*/references/` copies and were left out of the reviewers' patches; `bundle:check` holds them equal to their sources. The hand-authored develop-bug reference was included. Diff review: code review.

CI on 1d6aa8ef2fc0: green

Step 4b: changed blocks 20 in ten documents, 0 executed by the engine, all refused as `mutating` (they push, merge or write). Run by tests instead: the three terminal-HALT blocks and the two finalise-entry blocks (`push-policy.test.mjs`), the tick blocks (`tick-pr.test.mjs`), and Step 3a's re-run and scope blocks (`finalise-rerun-scope-blocks.test.mjs`). **Not run by any test**: the QA loop's own push blocks, finalise's 6a push block and the gaps blocks; the scan checks only that each names its site.

Traceability mapper: skipped (no Success Criteria table). Criteria drift: clean (base: reviewed blob). Changelog: cites (task 319). Record criteria: two listed, neither names this report (one is the DoD's, one names no location), so nothing is recorded here for them.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| 0: Reader table | PASS | Verified | |
| 1: Decision helper | PASS | Verified | 32 tests |
| 2: Every push site | CONCERNS | Verified | CR-501, CR-502, CR-505 |
| 3: Skip marker | CONCERNS | Verified | CR-407, CR-503 |
| 4: Finalise halts | FAIL | Verified | CR-401 to CR-406 |
| 5: Bitbucket | CONCERNS | Verified | CR-504 |
| 6: Ship | PASS | Verified | |

**Overall Phase Completion**: 7/7 delivered, 3/7 without a medium or high finding

---

## Success Criteria Verification

| # | Criterion | Evidence | Status |
| - | --------- | -------- | ------ |
| 1 | Every push site calls push-policy; scan with a non-vacuity case | `push-policy.test.mjs` scan tests | PASS |
| 2 | Simulated five-cycle run | `push-policy.test.mjs` five-cycle tests | PASS |
| 3 | The pause hook leaves the remote unmoved and says so | `develop-pipeline-on-precompact.test.sh`, 42 passed | PASS |
| 4 | skipMarker never on a commit with code | `push-policy.test.mjs` marker tests | CONCERNS (CR-407 on Bitbucket) |
| 5 | A named command is graded on a run at the head | `finalise-rerun-at-head.test.mjs` | FAIL (CR-401 to CR-403) |
| 6 | The probe scores an `eslint:` entry | `security-probe-eslint.test.mjs` | PASS |
| 7 | Bitbucket poll writes the same line, from the destination's key | `finalise-ci-poll.test.mjs` | PASS |
| 8 | `tickVia: pr` ticks through a PR merged by the gate | `tick-pr.test.mjs` | CONCERNS (CR-504, CR-506) |
| 9 | Push count in the QA report, before and after, with the command | Below | PASS |
| 10 | `npm test` under `CI=true`; every new test red before its change | Below | PASS |
| 11 | `npm run bundle` leaves no diff; `git status` recorded | Below | PASS |
| 12 | Four keys in the reference with defaults, `eager` as the old behaviour | `docs/reference/configuration.md` | PASS |
| 13 | CHANGELOG names each part | `CHANGELOG.md` `[Unreleased]` | PASS (one line overstates the HALTs, CR-510) |

### Push counts (criterion 9)

Command: `command node --test shared/resources/tests/push-policy.test.mjs` at `1d6aa8ef2`:

```
pushes before (eager): 9; after (batched): 6
```

### Suite under CI=true, and red-first proofs (criterion 10)

`npm run ci:fast` on the LAN server with `CI=true`, on `1d6aa8ef2`: 8855 tests, 8852 passed, 0 failed, 3 skipped. `npm run eval:all`: exit 0, run before the last edits of that commit (two test files, the message and one Change Log row).

The proofs of cycle 2's fixes were run in the fix pass, on the code of this head, and were not repeated here. Each names a committed test:

| Reverted behaviour | Test that went red | Outcome |
| ------------------ | ------------------ | ------- |
| one key grammar for the block count and the raw rows; unknown and misplaced keys | `finalise-rerun-at-head.test.mjs`, `ci-tree-equivalence.test.mjs` | covered |
| DoD records, hidden edits, output cut | `finalise-rerun-at-head.test.mjs` | covered |
| answered record, document and criterion text | `finalise-rerun-scope.test.mjs` | covered |
| `eslint:` cases, ESLint's own messages | `security-probe-eslint.test.mjs` | covered |
| destination of an ancestor | `ci-tree-equivalence.test.mjs`, `finalise-ci-poll.test.mjs` | covered |
| tick-pr arguments, remote, tree, base restore; the gate file | `tick-pr.test.mjs` | covered |
| HALT flush, entry block | `push-policy.test.mjs` | covered |
| time limits of the three reads | `finalise-ci-poll.test.mjs`, `pr-read.test.sh` | covered |
| Step 8a's regrading, cut output, no mark on a merged PR | `finalise-rerun-scope-blocks.test.mjs`, `push-policy.test.mjs` | covered, as assertions on the wording only |

The test for CR-204 goes red when its check is removed and still pins a wrong answer (CR-402): a proof shows a test can fail, not that what it asserts is right.

### Bundle (criterion 11)

`npm run bundle` ran in the commit hook. `git status --short` at this head lists no tracked change outside this work item: the implementation report (modified) and this cycle's QA files (untracked).

---

## Breaking Changes Validation

### Breaking Change: a pause and a record-only cycle no longer push

Documented: Yes
Migration Path Provided: Yes (`pipeline.pushRecordCommits: eager`)
Migration Tested: Yes
Notes: the CHANGELOG still says every HALT pushes (CR-510).

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (3)

T319-CR-401, CR-402 and CR-403, one cause. Bug report: [task.319.bug.3](./task.319.bug.3.rerun-answers-over-a-tree-that-is-not-the-head.md)

### MEDIUM Severity Issues (9)

T319-CR-404 to CR-407 and CR-501 to CR-505. Each is described in the Code Review section and tracked by its gate entry; no separate bug file.

### LOW Severity Issues (7)

T319-CR-408 to CR-410 and CR-506 to CR-509.

**Total Issues**: HIGH: 3, MEDIUM: 9, LOW: 7

---

## NFR Assessment

### Performance — PASS
Push counts above.

### Reliability — FAIL
The re-run engine answers over a tree that is not the head. A push that hangs leaves a HALT without a snapshot.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 86 (`task.319.qa.3.ci-runs-only-where-needed.security.run.json`, `totals.executed`); escaped 0
- `push-policy --site`: engages, 48 of 48. `parseRerunList`: present-but-inert, 36 of 38 (T319-CR-406).
- `legit-sibling-key` was cycle 2's legitimate case and is refused now (CR-208); it was replaced by a documented sibling key, and its old input is the hostile case `hostile-unknown-sibling`.
- Plausibility of the escaped form: two tracked YAML files hold an escaped top-level key, both test fixtures of the `access:` reader, which handles that spelling.

### Maintainability — PASS
One decision helper and one table.

---

## Code Review

Anchors: all 23 checked findings `ok` (`finding-anchors.js --rev HEAD`); CR-509 was left out of that file, and its line was read by hand. `code_review_blocking=true` from the pipeline. `boundary: true`.

**Correctness bugs (19 in the gate, 2 advisory):**

- [high/high] `shared/resources/finalise-rerun-at-head.js:383` — CR-401, reproduced by QA: edited and flagged in a submodule → `ran`, stdout `0`; control (edited, no flag) → `dirty-tree`
- [high/high] `shared/resources/finalise-rerun-at-head.js:397` — CR-402, reproduced by QA: deleted and flagged → `ran`; control (deleted, no flag) → `dirty-tree`
- [high/high] `shared/resources/finalise-rerun-at-head.js:442` — CR-403, reproduced by QA in four forms; each control → `dirty-tree`
- [medium/high] `shared/resources/finalise-rerun-at-head.js:249` — CR-404, reproduced by QA; control (no `timeout` wrapper) wrote nothing late
- [medium/high] `shared/resources/finalise-rerun-at-head.js:245` — CR-405, reproduced by QA; control stayed at 1000 bytes
- [medium/high] `shared/resources/ci-tree-equivalence.js:448` — CR-406, reproduced by QA; control with both rows indented read whole. The reviewer's `&a finalise:` form did not reproduce: it was refused
- [medium/high] `shared/resources/ci-tree-equivalence.js:1207` — CR-407, confirmed by reading `push-policy.sh:170`; not run
- [medium/high] `shared/resources/develop-pipeline-step-7-finalise.md:34` — CR-501, reproduced by QA; control with a tracking ref pushed
- [medium/high] `shared/resources/develop-pipeline-step-7-finalise.md:37` — CR-502, first half reproduced by QA (the stale head file); its claim about 6a was not run
- [medium/high] `skills/develop-bug/references/develop-bug-step-7-close-bug.md:32` — CR-503, not run by QA
- [medium/high] `shared/resources/tick-pr.sh:248` — CR-504, confirmed by reading: lines 180, 244 and 248 carry no limit
- [medium/medium] `skills/develop-task/SKILL.md:327` — CR-505, reproduced by QA: exit 124, lock present, no snapshot; control halted normally
- [low/high] `shared/resources/finalise-rerun-at-head.js:422` — CR-408, reproduced by QA; control (another file edited) → `dirty-tree`
- [low/high] `shared/resources/ci-tree-equivalence.js:946` — CR-409, not run by QA
- [low/high] `shared/resources/finalise-rerun-at-head.js:393` — CR-410, not run by QA
- [low/high] `shared/resources/tick-pr.sh:201` — CR-506, not run by QA
- [low/high] `skills/develop-task/SKILL.md:325` — CR-507, reproduced by QA: an absent remote branch exists again
- [low/medium] `skills/develop-task/SKILL.md:326` — CR-508, reproduced by QA in both forms
- [low/high] `skills/develop-next/SKILL.md:193` — CR-509, not run by QA
- [low/medium] `shared/resources/finalise-rerun-scope.js:1106` — CR-411 (advisory), agrees with the code as read; not run
- [low/low] `shared/resources/finalise-rerun-at-head.js:251` — CR-412 (advisory); the reviewer did not reproduce it

**Cleanups (3):** CR-413 `shared/resources/finalise-rerun-at-head.js:443`, CR-414 `shared/resources/finalise-rerun-at-head.js:392`, CR-510 `CHANGELOG.md:13`.

Provenance: the engine, the push policy, the tick script and the two entry blocks are new in this branch, so none of the gate findings is pre-existing.

Platform variance: `TMPDIR=/var/tmp command node --test` over the push-policy, tick-pr and re-run suites, 73 pass, 0 fail.

---

## Regression Testing

`push-policy` (32) and the pre-compact suite (42): PASS at this head; the rest by `ci:fast` above.

---

## Test Artifacts

### Test Commands Executed

```bash
command node --test shared/resources/tests/push-policy.test.mjs   # 32 pass
bash shared/resources/develop-pipeline-on-precompact.test.sh      # 42 passed, 0 failed
npm run test:remote                                               # ci:fast, 8852 pass
npm run validate -- skills/<changed-skill>/                       # 5 of 5 valid
```

---

## Recommendations

### Immediate Actions (Blocking)
1. One structural fix for the three highs: compare the working tree with the head tree, submodules included
2. The nine medium findings

### Short-term Actions (Non-Blocking)
1. The seven low findings, CR-411 to CR-414 and CR-510

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: three high findings, each reproduced
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED
**Conditions**: the three high and nine medium findings fixed

---

**QA Report**: co-located at `task.319.qa.3.ci-runs-only-where-needed.md`
**Gate File**: co-located at `task.319.gate.3.ci-runs-only-where-needed.yml`
**Next Steps**: qa-fix cycle 3

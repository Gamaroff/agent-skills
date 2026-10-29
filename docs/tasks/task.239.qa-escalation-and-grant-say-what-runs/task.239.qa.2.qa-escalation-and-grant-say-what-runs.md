# QA Report: Task 239 - QA escalation and grant say what will run

**Task**: [Link to task document](./task.239.qa-escalation-and-grant-say-what-runs.md)
**Gate File**: [task.239.gate.2.qa-escalation-and-grant-say-what-runs.yml](./task.239.gate.2.qa-escalation-and-grant-say-what-runs.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-28
**Testing Completed**: 2026-10-28
**Gate Status**: CONCERNS

---

## Executive Summary

This is cycle 2 of PR #779, at `31f6b48b`: a full refute pass over the whole branch. Cycle 1
fixed all five gate-1 findings, and a test that a mutation turns red holds each fix. The refute
pass found one defect introduced by a cycle-1 fix. The new lock-restore sentence promises a repair
that `--restore` does not make. It also found five low prose claims that are false at an edge.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (fix TASK-239-QA2-CR-1)

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| TASK-239-QA1-CR-1: loop-limit third-strike files (bug.1) | ✅ FIXED | Filling rule 1 has a per-halt table. A behavioural test runs the doc's own `high_files()`: the three-gate block misses a two-strike file and the loop-limit command lists it. A refinement for an already-struck file is new this cycle (QA2-CR-3) |
| TASK-239-QA1-CR-2: describers not held | ✅ FIXED | Both name the field, and both are participants. QA mutation: removing it from the hooks doc turns the parity test red |
| TASK-239-QA1-CR-3: replay locks | ✅ FIXED | Both replays pass 18/18. Setting the field to 6 gives 17/18 (qa-fix mutation) |
| TASK-239-QA1-CR-4: missing lock vs absent field | ⚠️ PARTIAL | The sentence exists but is wrong for a present but corrupt lock. Now QA2-CR-1 / bug.2 |
| TASK-239-QA1-CR-5: table untested | ✅ FIXED | Every row is parsed and checked. Mutating one row turns the test red |

---

## New Findings This Cycle

- **[medium]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:624`: `--restore` is a no-op while the lock file exists, so the sentence's "restored first … read again" does not hold for a corrupt lock, and a failed restore has no next step. Fix: split the cases, cite the resume contract's restore step, and HALT on an unparseable lock. Bug: [task.239.bug.2](./task.239.bug.2.lock-restore-sentence-misstates-restore.md)
- **[low]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:673`: route 2c's MEDIUM window includes the pre-grant base, so "a pre-grant reading can only let a granted run exit sooner" is false.
- **[low]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:2096`: on a loop limit, a file already struck over N-2..N is labelled "one strike from".
- **[low]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:2105`: the flat-count reading is undefined when there are several HIGH findings.
- **[low]** `docs/reference/troubleshooting.md:192`, step-5-6 step 3, CHANGELOG: "a grant of k runs k cycles" fails for k >= 3 with flat readings.
- **[low]** `skills/develop-task/README.md:415`, :361, `skills/develop-story/README.md:376`, :430, step-5-6:87: the grant write set is listed without `convergence_from_cycle`.
- **[low]** `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs:154`: the non-vacuity guard is vacuous.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (`ready-for-review`)
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#779)

### Testing Approach

- [x] Automated Testing (shell suite, node test files, replay scenarios)
- [x] Regression Testing
- [x] Security Review (reasoned)
- [x] Code Review (independent refute subagent)

### Review Methodology

Direct tools, plus one read-only Explore subagent for the diff code review, dispatched with the
cycle-2 REFUTE PASS directive. Dispatched at 20:02:38Z; it returned after 229 s, by the completion
notice's `duration_ms`. Cycle 2 reviews the whole branch diff, `origin/develop...HEAD`, excluding
generated `skills/*/references/*` copies and `docs/tasks/*`: 1,100 lines over 21 files. The anchor
checker read 7 findings `ok` and 1 `unchecked-text`.

Re-review scope: unscoped, whole branch. Cycle 2 is the refute pass. `SAFETY_REPROBE=false`:
clause 1 is false, and clauses 2–3 do not apply because there is no security finding and no
security success criterion.

CI on 31f6b48bab94: green

Step 4b: every changed prose file has 0 changed fenced blocks. Two execution failures fail
identically on the merge base, so they are pre-existing:

- detector prompt :69, `cat` of a missing lock fixture
- resume contract :492, recorded in cycle 1

Both go to `recommendations.future`.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: grant window | CONCERNS | Verified | the window works; the restore sentence (CR-1) and the "k cycles" and route 2c claims (CR-5, CR-2) are wrong at an edge |
| Phase 2: label | PASS | Verified | the sweep is clean |
| Phase 3: escalation templates | CONCERNS | Verified | the per-halt table is correct; it understates a three-strike file (CR-3) and the plural reading is undefined (CR-4) |
| Phase 4: guards | PASS | Verified | 16/16, the replays 18/18, and each new guard mutation-proved |

**Overall Phase Completion**: 4/4 delivered, 2 with low issues and 1 medium

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| SC-1 | PASS | `grant-qa-cycles.test.sh` 56/56 |
| SC-2 | PASS | window test; the table rows are checked against the rule |
| SC-3 | PASS | the label sweep is clean |
| SC-4 | PASS | the per-halt comparison; behavioural test `qa-escalation-template.test.mjs` "loop-limit escalation lists a file struck at the last two gates" |
| SC-5 | CONCERNS | the Flat-count line is present; the plural case is undefined (CR-4) |
| SC-6 | PASS | one grant call |
| SC-7 | PASS | the comparison is by pointer; `high_files()` is defined once (tested) |
| SC-8 | PASS | `npm run ci:fast` rc 0 at the cycle-1 fix |
| SC-9 | PASS | `npm run bundle:check`: 0 problems |
| SC-10 | PASS | `npm run validate` passes for develop-task and develop-story |
| SC-11 | PASS | the commits record their mutations |
| SC-12 | PASS | the absent-field control row |
| SC-13 | CONCERNS | the CHANGELOG states "k cycles" without the flat-reading caveat (CR-5) |

---

## Breaking Changes Validation

None.

---

## Issues Found

### MEDIUM Severity Issues (1)

**Issue: the lock-restore sentence promises a repair `--restore` does not make**
- **Severity**: MEDIUM
- **Category**: Functional
- **Bug Report**: [task.239.bug.2.lock-restore-sentence-misstates-restore.md](./task.239.bug.2.lock-restore-sentence-misstates-restore.md)
- **Observation**: `restore_lock` exits 0 as a no-op whenever the lock file exists.
- **Impact**: a damaged lock leaves the Convergence check with no legal next step.
- **Recommendation**: split the cases, cite the resume contract, and HALT on an unparseable lock.
- **Priority**: P2

### LOW Severity Issues (6)

QA2-CR-2 to QA2-CR-7, as listed under New Findings.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 6

---

## NFR Assessment

### Performance — PASS
No runtime change since gate 1.

### Reliability — CONCERNS
A damaged lock has no defined next step (CR-1).

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`. The cycle-1 fix adds prose, two eval fixtures and test code. The only
  predicate-shaped functions, `convergenceTrip` and the fixture `high_files` run, are in a test
  file. `grant-qa-cycles.sh` is unchanged since gate 1.

### Maintainability — CONCERNS
Four prose claims are false at an edge, and four sites that list the grant write set omit the field.

---

## Code Review

Advisory, except where promoted under `code_review_blocking=true` (high-confidence bugs only):
CR-1 → TASK-239-QA2-CR-1. QA confirmed CR-2 (by reading `classifyLoopRoute`), CR-3, CR-4, CR-5 (by
the doc's own table row) and CR-6 (`git grep`), and entered them as low `top_issues[]`. CR-7 is
folded into QA2-CR-1's suggested action. CR-8 is entered as QA2-CR-7.

**Correctness bugs (6):**
- [medium/high] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:624`: `--restore` is a no-op on a present lock → TASK-239-QA2-CR-1 (promoted)
- [low/medium] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:673`: route 2c uses pre-grant MEDIUM → QA2-CR-2
- [low/medium] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:2096`: a three-strike file labelled "one strike from" → QA2-CR-3
- [low/medium] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:2105`: plural flat-count reading → QA2-CR-4
- [low/medium] `docs/reference/troubleshooting.md:192`: "k cycles" overstated → QA2-CR-5
- [low/medium] `skills/develop-task/README.md:415`: write-set describers → QA2-CR-6

**Cleanups (2):**
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md:625`: bare script name and new placeholder → folded into QA2-CR-1
- `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs:154`: vacuous guard → QA2-CR-7

boundary: false. No predicate-shaped shipped function was added this cycle; the candidates, `convergenceTrip` and the fixture runner, are test code. probes_executed: 0.

mutation-proven: `convergence_from_cycle` removed from the hooks doc's loop-field list → `qa-loop-lock-fields-parity.test.mjs` "every describer names it" went red → covered

The qa-fix cycle-1 proofs, re-checked green on this head: replay field 6 → 17/18 (covered); table row "at cycle 5" → table test red (covered); loop-limit row set to the three-gate command → loop-limit test red (covered).

---

## Regression Testing

| Area | Result |
| --- | --- |
| `grant-qa-cycles.test.sh` | PASS 56/56 |
| `qa-escalation-template.test.mjs` + `qa-loop-lock-fields-parity.test.mjs` | PASS 16/16 |
| scenario-12 replays (task, story) | PASS 18/18 each |
| `npm run validate` (develop-task, develop-story) | PASS |
| `npm run bundle:check` | PASS |

---

## Test Artifacts

### Test Commands Executed
```bash
bash shared/resources/grant-qa-cycles.test.sh
command node --test evals/shared/tests/qa-escalation-template.test.mjs evals/shared/tests/qa-loop-lock-fields-parity.test.mjs
command node evals/shared/runner.mjs evals/develop-{task,story}/step-isolation/12-qa-reentry-after-loop-limit-with-grant/
npm run validate -- skills/develop-task/
npm run validate -- skills/develop-story/
npm run bundle:check
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <each changed prose file> --diff-base <merge-base> --copy-as skills:.agents/skills --json
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 779
```

### Coverage Report
Not measured. The deliverables are shell and prose, so coverage is by named assertion and mutation.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: One medium defect, introduced by a cycle-1 fix, plus six low edge-case gaps.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-239-QA2-CR-1 fixed

---

**Next Steps**: `/qa-fix` on gate 2, then QA cycle 3 (scoped to the fix).

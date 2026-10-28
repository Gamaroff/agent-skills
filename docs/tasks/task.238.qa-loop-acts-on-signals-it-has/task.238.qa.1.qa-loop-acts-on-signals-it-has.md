# QA Report: Task 238 - QA loop acts on the signals it already has

**Task**: [Link to task document](./task.238.qa-loop-acts-on-signals-it-has.md)
**Gate File**: [task.238.gate.1.qa-loop-acts-on-signals-it-has.yml](./task.238.gate.1.qa-loop-acts-on-signals-it-has.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-28
**Testing Completed**: 2026-10-28
**Gate Status**: FAIL

---

## Executive Summary

All four phases are delivered and the suite is green: `ci:fast` reports 6491 tests and 0 failures,
and CI on PR #770 is green. The gate is still FAIL. The diff review found that the new open-coverage
check fails open: an unreadable review counts as "no open coverage", so the run exits the loop (HIGH).
It also found one statement of the 5c exit rule left stale, in the Stop hook (MEDIUM). A by-hand probe
found that `fast-gate-outcome.sh` passes an option-shaped `--base` to `git fetch`, which ran a command
(MEDIUM). All three are small, contained fixes.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (Progress Tracking 4/4 ticked)
- [x] Tests passing (`ci:fast` 6491/0)
- [x] Breaking changes documented (§5: none)
- [x] Code on feature branch with open PR (#770, base develop)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit, integration, executed-prose)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review (reasoned + one by-hand probe)
- [x] Code Review

### Review Methodology

Direct tools plus one read-only Explore diff reviewer (Step 3b, first review, whole branch diff). The
task is large (4 phases, 9 skills) but every change is to documents, two shell scripts and their
tests, so direct tools carry the rest. Reviewer dispatched 2026-10-28T03:53:34Z and returned at
194359 ms (`duration_ms`). The patch excluded generated `skills/*/references/*` copies but kept
develop-bug's skill-owned `develop-bug-step-5-6-verify-loop.md`.

`CI on 12dfb4b62cb7: green`

Step 4b ran over 11 changed in-scope files. Results are in Test Artifacts.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Fast-gate outcomes and gated cleanup | CONCERNS | Verified | Gated cleanup at 5 sites is executed by `qa-loop-fast-gate-outcomes.test.mjs`. The three outcomes are mutation-proved. QA-1: `--base` option injection |
| Phase 2: PR Existence Check and CI read | PASS | Verified | Ran live this cycle: `qa-ci-read.sh` on PR #770 printed `CI_STATE=SUCCESS`. Advisory: CR-4, CR-5 |
| Phase 3: Coverage findings to 5b | FAIL | Partial | CR-1 (HIGH): open-coverage check fails open. CR-2: Stop hook not updated |
| Phase 4: Guards, bundle, record | PASS | Verified | bundle:check, validate ×8, shellcheck (CI level), CHANGELOG |

**Overall Phase Completion**: 2/4 phases passed clean (1 CONCERNS, 1 FAIL)

---

## Success Criteria Verification

Each criterion is checked against evidence, never its checkbox.

| Criterion | Evidence | Status |
| --- | --- | --- |
| SC-1 gated cleanup, red log survives | `qa-loop-fast-gate-outcomes.test.mjs` "a red gate's log survives its block" ×bash/zsh, 4 sites | PASS |
| SC-2 three outcomes in 5b 0a | same file: not-measured, pre-existing, attributable cases; the "5b step 0a names the three outcomes" test | PASS |
| SC-3 CI read at Step 10, both VCS, head equality, base check | `qa-ci-read.test.mjs` github/bitbucket cases and head-mismatch; ran live on PR #770 | PASS |
| SC-3a Bitbucket PR check never calls gh | `qa-task.test.js` / `qa-story.test.js` "on VCS=bitbucket … never calls gh" | PASS |
| SC-4 CONCERNS + open coverage → 5b, control → Step 7 | `pr-review-loop-parity.test.mjs` open-coverage cases plus the control (obs #176) | CONCERNS. Routing is held, but CR-1: an unreadable review routes as "none" |
| SC-4a qa-fix ladder row | parity "SC-4a" test, read off the ladder | PASS |
| SC-4b resume split | parity resume test (3 rows, 3 states) | PASS |
| SC-5 no CI wait | `qa-task.test.js` asserts the block has no sleep, --watch or until; `qa-ci-read.test.mjs` "never waits" | PASS |
| SC-6 green gate: no base worktree | "SC-6: a green gate creates no base worktree" | PASS |
| SC-7 ci:fast | 6491 tests, 0 fail, rc 0 (implementation report Step 3) | PASS |
| SC-8 bundle:check | rc 0 | PASS |
| SC-9 validate | `quick_validate.py` rc 0 ×8 skills | PASS |
| SC-10 mutation-proved, recorded in commit | `12dfb4b6` body lists 14 mutations; QA re-ran 3 (below) | PASS |
| SC-11 CHANGELOG | `[Unreleased]` entry names task 238 and all four behaviours | PASS |
| SC-12 restatement sweep | the Markdown sweep is clean, but `develop-pipeline-on-stop.sh:204` is stale | FAIL (CR-2) |

---

## Breaking Changes Validation

None declared (§5). A `CONCERNS` verdict without an open coverage finding still exits, and a green
fast gate behaves as before. **PASS**

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: the open-coverage check reads an unreadable review as clean**
- **Severity**: HIGH
- **Category**: Reliability
- **Bug Report**: [task.238.bug.1.open-coverage-check-reads-unreadable-review-as-clean.md](./task.238.bug.1.open-coverage-check-reads-unreadable-review-as-clean.md)
- **Observation**: `OPEN_COVERAGE=0` covers three cases: no open coverage finding, a missing report path, and a report with no findings block.
- **Impact**: a CONCERNS that could not be read exits to Step 7.
- **Recommendation**: check the report before counting, and route the unreadable case to the failed-review arm.
- **Priority**: P1

### MEDIUM Severity Issues (2)

**Issue: the Stop hook still sends every CONCERNS to Step 7**
- **Severity**: MEDIUM
- **Category**: Maintainability
- **Bug Report**: [task.238.bug.2.stop-hook-still-exits-every-concerns.md](./task.238.bug.2.stop-hook-still-exits-every-concerns.md)
- **Observation**: `develop-pipeline-on-stop.sh:204` was not updated. The SC-12 grep covered `*.md` only.
- **Recommendation**: update it and its test, then re-sweep all tracked file types.
- **Priority**: P2

**Issue: `--base` reaches `git fetch` as an option**
- **Severity**: MEDIUM
- **Category**: Security
- **Bug Report**: [task.238.bug.3.base-argument-reaches-git-fetch-as-an-option.md](./task.238.bug.3.base-argument-reaches-git-fetch-as-an-option.md)
- **Observation**: `git fetch -q origin "--upload-pack=touch $MARK; git-upload-pack"` created the marker in a scratch clone.
- **Recommendation**: refuse a base that is not a valid branch name.
- **Priority**: P2

### LOW Severity Issues (0)

Advisory code-review findings are listed under Code Review.

**Total Issues**: HIGH: 1, MEDIUM: 2, LOW: 0

---

## NFR Assessment

### Performance — PASS
The CI read is one API call per cycle (plus one per failing lane) and never polls. The base worktree
runs only on a red gate (SC-6).

### Reliability — CONCERNS
CR-1. Advisory CR-3 and CR-4 point the same way: two classifiers that can call a red "pre-existing"
or a green "failure" on inputs the tests do not model.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: reasoned
- **Probes executed**: 0
- The boundary decisions are recorded under Code Review. The one operator-supplied argument was
  probed by hand and is injectable (QA-1). By-hand probes do not count toward `probes_executed`.

### Maintainability — CONCERNS
CR-2: one statement of the 5c exit rule was missed. The sweep had no population check beyond
Markdown.

---

## Code Review

Code review is blocking for this run (`code_review_blocking=true` from the pipeline). Every finding's
anchor checked `ok` at `12dfb4b6`.

**Correctness bugs (6):**
- [high/high] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1539`: OPEN_COVERAGE prints 0 for "no open coverage", a missing path and a block-less report alike. → Check the report before counting. **Promoted: TASK238-CR-1**
- [medium/high] `shared/resources/develop-pipeline-on-stop.sh:204`: the Stop hook still advances every CONCERNS to Step 7. → Update it and its test, re-sweep. **Promoted: TASK238-CR-2**
- [medium/medium] `shared/resources/fast-gate-outcome.sh:88`: the pre-existing verdict ignores failures outside the node summary (a tmp-leak ratchet). → Require the node fail count to account for the whole red. (advisory)
- [medium/medium] `shared/resources/qa-ci-read.sh:162`: on Bitbucket, a failed run that a later rerun superseded still counts. → Keep only the newest run per selector. (advisory)
- [low/medium] `skills/qa-task/SKILL.md:140`: the PR check gives the same empty result for "no PR" and "could not look", and qa-story SKILL.md:181 has the same block. → Read the HTTP status and the gh exit code. (advisory)
- [low/medium] `shared/resources/fast-gate-outcome.sh:65`: platform-variance: only the logical `$PWD` is stripped from TAP realpath locations. → Strip `$(pwd -P)` too. (advisory)

**Cleanups (0)**

**Provenance (5b).** Every finding is attributable to this branch. CR-2's line is unchanged text, but
the rule it contradicts is this task's, and the task names the restatement sweep as in scope (SC-12).

**Boundary rule.** No corpus sink models these inputs, so each is recorded as `boundary: internal`:
- `shared/resources/fast-gate-outcome.sh` (shell entry): classifies the fast-gate log this pipeline
  writes, the exit code it printed, and the Q2 base branch. No sink models a node test-runner log or a
  git ref. Its one operator-supplied argument was probed by hand, which found QA-1.
- `shared/resources/qa-ci-read.sh` (shell entry): classifies the PR's own CI rollup, read from
  gh or Bitbucket for this repository. No sink models a CI status payload.
- the `OPEN_COVERAGE` block (`fence:develop-pipeline-step-5-6-qa-loop.md`): counts entries in a
  review report `/review-pr` writes. `markdown-structure` models the implementation report, not this
  document.

`probes_executed: 0` · `escaped: 0`.

**Mutation spot-checks** (this cycle, in a scratch worktree, `cp` snapshot and restore):
- mutation-proven: drop `143` from not-measured in fast-gate-outcome.sh → "not measured: no exit code, 124, 137 and 143" → covered (first attempt did not apply, 2→2, so it was void and re-applied)
- mutation-proven: drop `ACTION_REQUIRED` from qa-ci-read.sh → "github: a COMPLETED/ACTION_REQUIRED CheckRun is a failure" → covered
- mutation-proven: drop the END-of-input count from the OPEN_COVERAGE awk → three open-coverage cases → covered

Platform variance: `TMPDIR=/tmp node --test` on both new suites, 44/0. `TMPDIR` is unset on this
host, so this is the same value. CR-6's symlinked-checkout reproduction was not run (advisory).

---

## Regression Testing

`ci:fast` covers the whole repository: 6491 tests, 0 failures. Related suites re-run after Phase 3
(186/186): `qa-loop-stage-before-gate`, `qa-re-review-scope-parity`, `ingester-prompt-placeholders`
and `bundled-links`. **PASS**

---

## Test Artifacts

### Files Reviewed
`shared/resources/{fast-gate-outcome.sh, qa-ci-read.sh, develop-pipeline-step-5-6-qa-loop.md, develop-pipeline-resume-contract.md, develop-pipeline-step-3-develop-loop.md, qa-findings-ingester-prompt.md, develop-pipeline-on-stop.sh}`, `skills/{qa-task,qa-story,qa-fix,develop,develop-bug,develop-task,develop-story,review-pr}/SKILL.md`, the new and extended tests.

### Test Commands Executed
```bash
npm run ci:fast                                   # 6491 tests, 0 fail, rc 0 (.agents/skills moved aside)
python3 skills/create-skill/scripts/quick_validate.py skills/<each of 8>/   # rc 0 ×8
npm run bundle:check                              # rc 0
shellcheck --severity=warning shared/resources/fast-gate-outcome.sh shared/resources/qa-ci-read.sh
TMPDIR=/tmp node --test evals/shared/tests/qa-loop-fast-gate-outcomes.test.mjs shared/resources/tests/qa-ci-read.test.mjs   # 44/0
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 770   # CI_STATE=SUCCESS
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <each> --diff-base <merge-base> --copy-as skills:.agents/skills --json
```

### Step 4b — documented commands

The changed counts come first.
- develop-pipeline-step-5-6-qa-loop.md: 4 changed blocks, all refused `mutating`, 0 executed.
- step-3-develop-loop.md: 2 changed, `mutating`.
- develop/SKILL.md: 1 changed, `mutating`.
- qa-task/SKILL.md and qa-story/SKILL.md: 2 changed each, `mutating`.
- resume-contract.md: 2 of 10 executed.
- develop-bug, develop-story and develop-task SKILL.md, plus qa-fix and review-pr: 0 changed.

The changed blocks contain `rm`, `gh`, `curl` and `git fetch`, which are refused by design. Each is
executed instead by a committed test: the gated-cleanup and classify blocks by
`qa-loop-fast-gate-outcomes.test.mjs`, the PR check by the qa-task and qa-story tests, and
OPEN_COVERAGE by the parity fixtures.

File-level results:
- `zero-blocks-executed` (placeholder-only) on qa-fix, review-pr and step-3. These files are untouched
  beyond the diff, which is information only.
- Execution failure at `develop-pipeline-resume-contract.md:492`. The block reads
  `.claude/state/develop-pipeline.lock`, which the temp copy lacks. It dates from 2026-10-20 and is
  untouched here, so it is pre-existing and routed to `recommendations.future`.
- zsh ran.

### Coverage Report
Not instrumented (node:test, no coverage tool configured).

---

## Recommendations

### Immediate Actions (Blocking)
1. TASK238-CR-1: check the report before counting OPEN_COVERAGE (P1)
2. TASK238-CR-2: Stop hook 5c re-prompt plus a full-type sweep (P2)
3. TASK238-QA-1: refuse an option-shaped `--base` (P2)

### Short-term Actions (Non-Blocking)
1. CR-3, CR-4, CR-5, CR-6: listed in the gate's `recommendations.future`

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: One high-severity, high-confidence correctness bug in the new routing check. Gate rule 1 applies.
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED
**Conditions**: none

---

**QA Report**: co-located at `task.238.qa.1.qa-loop-acts-on-signals-it-has.md`
**Gate File**: co-located at `task.238.gate.1.qa-loop-acts-on-signals-it-has.yml`
**Next Steps**: `/qa-fix` for the three open entries, then QA cycle 2 (refute pass).

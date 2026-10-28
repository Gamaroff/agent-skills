# QA Report: Task 238 - QA loop acts on the signals it already has

**Task**: [Link to task document](./task.238.qa-loop-acts-on-signals-it-has.md)
**Gate File**: [task.238.gate.4.qa-loop-acts-on-signals-it-has.yml](./task.238.gate.4.qa-loop-acts-on-signals-it-has.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-28
**Testing Completed**: 2026-10-28
**Gate Status**: FAIL

---

## Executive Summary

This is cycle 4, re-entered at 5a after `/finalise` (DoD 1) found 5 gaps. `adff39e2` fixes all five.
Their tests went red first, and each guard is mutation-proved. The re-run probes engage on the
fixed shapes. The unscoped safety re-probe of the same boundaries found 3 HIGH defects. Each lets a
head-only red be classed `pre-existing`: two in `fast-gate-outcome.sh` and one in the Bitbucket arm
of `qa-ci-read.sh`. It also found 2 MEDIUM defects, both measured by the probe engine.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

Previous verdict: gate 3 PASS 90, then `/finalise` DoD 1 NOT ACCEPTED (5 gaps). This cycle re-checks those gaps.

| DoD 1 gap | Status | Evidence |
| --- | --- | --- |
| 1. `..` path, `test at` form (`fast-gate-outcome.sh:99`) | ✅ FIXED | probe `log-path-dotdot-test-at` held; test red on `3080a556` (classed `pre-existing`), green on `adff39e2` |
| 2. `..` path, `location:` form | ✅ FIXED | probe `log-path-dotdot-location` held; new shapes `-midpath`, `dot-dotdot` held too |
| 3. Quoted `category: "coverage"` | ✅ FIXED | probe `oc-coverage-quoted` held; new `oc-coverage-single-quoted` held |
| 4. `qa-ci-read.test.mjs` usage test unheld | ✅ FIXED | `--vcs` and `--pr` checks dropped, test red each time |
| 5. `--exit abc` usage case unheld | ✅ FIXED | `--exit` check dropped, test red |

bug.1 to bug.4 were already Closed and are unchanged.

---

## New Findings This Cycle

- **[high]** `shared/resources/fast-gate-outcome.sh:151` — failures are compared by bare test name, so a head-only red with a name already failing at the base reads `pre-existing` → compare (file, test) pairs (bug.5)
- **[high]** `shared/resources/fast-gate-outcome.sh:153` — `pre-existing` never checks that the node tests explain the whole red → `pre-existing` only when node --test is the whole gate (bug.6)
- **[high]** `shared/resources/qa-ci-read.sh:164` — on Bitbucket the base reading is any pipeline on the base → match the selector (bug.7)
- **[medium]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1548` — the open-coverage awk counts a commented, list-first, flow-form or capitalised coverage entry as 0 → bug.8
- **[medium]** `shared/resources/fast-gate-outcome.sh:122` — a failing-test path starting with `-` reaches node as an option → bug.9
- **[low]** `shared/resources/qa-ci-read.sh:162` — a superseded failed Bitbucket pipeline still counts (CR-8)
- **[low]** `shared/resources/fast-gate-outcome.sh:36` — an interrupted node --test exits 1 and is classed attributable (CR-9)

Three of these were raised in earlier cycles as advisory. CR-1 is cycle-2 CR-5, CR-2 is cycle-1
CR-3, and CR-8 is cycle-1 CR-4. This cycle each comes back reproduced at high confidence.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#770, OPEN, head `adff39e2`)

### Review Methodology

Re-review with direct tools and one read-only diff reviewer (Explore). The reviewer was dispatched
at 05:10Z and returned after 386.8 s (`duration_ms` 386795).

`Re-review scope: unscoped (safety re-probe by judgement — the prior verdict, DoD 1, failed on security with 2 medium boundary escapes; gate 3's own clauses read false)`. The full `origin/develop...HEAD` diff covered 96 files, of which 38 generated `references/` copies were skipped.

CI on adff39e2efda: pending

Step 4b: the 4 changed blocks in `develop-pipeline-step-5-6-qa-loop.md` were all refused by the snippet engine (2 `rm -rf`, 1 templated helper path, 1 `awk` fail-closed): `changed-blocks-not-executed`. The awk block (1536) is executed under bash and zsh by `pr-review-loop-parity.test.mjs` and by the `open-coverage-check` fence probe. The other three are held by the `qa-loop-fast-gate-outcomes` document tests.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: CI read in QA | CONCERNS | Verified | Bitbucket base reading (bug.7), superseded runs (CR-8) |
| Phase 2: three-outcome fast gate | FAIL | Verified | bug.5, bug.6, bug.9 |
| Phase 3: 5c open coverage routes | CONCERNS | Verified | bug.8 |
| Phase 4: restatements + docs | PASS | Verified | |

**Overall Phase Completion**: 4/4 implemented, 1 PASS

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| SC-1..SC-4 (CI read, 5c coverage routing) | CONCERNS | tests held; bug.7, bug.8 |
| SC-6 three outcomes, pre-existing narrow | FAIL | bug.5, bug.6, bug.9: `pre-existing` is not narrow |
| SC-7 ci:fast | PASS | 6507 tests, 6493 pass, 0 fail, 14 skipped |
| SC-9 validate | PASS | `quick_validate.py` ✓ develop-bug, develop-story, develop-task |
| SC-10 mutation proofs recorded | PASS | `adff39e2` message lists every proof |

---

## Breaking Changes Validation

None: the task adds new outcomes and checks and removes none.

---

## Issues Found

**Total Issues**: HIGH: 3, MEDIUM: 2, LOW: 2. Detail in bug.5 to bug.9 and the gate.

---

## NFR Assessment

### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 35 (escaped 0), record `task.238.qa.4.security.run.json`
- base-argument engages 8/8. pr-argument engages 8/8. log-test-paths held 6 of 7 (`log-path-option-shaped` reproduced). open-coverage-check held 11 of 12 (`oc-coverage-trailing-comment` reproduced).
- Boundary: `true` (fast-gate-outcome.sh, qa-ci-read.sh, the §5c fence).

### Performance — PASS
No change to the bounded base run.

### Reliability — CONCERNS
CR-9: an interrupted run spends a retry. Advisory CR-6: a base that already contains HEAD makes every red `pre-existing`.

### Maintainability — PASS
The DoD fixes are small, each held by a committed test.

---

## Code Review

**Correctness bugs (9):**
- [high/high] `shared/resources/fast-gate-outcome.sh:151` — bare-name comparison → TASK-238-CR4-1
- [high/high] `shared/resources/fast-gate-outcome.sh:153` — pre-existing ignores non-node red → TASK-238-CR4-2
- [high/high] `shared/resources/qa-ci-read.sh:164` — any base pipeline → TASK-238-CR4-3
- [medium/high] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1548` — awk shapes → TASK-238-CR4-4
- [medium/medium] `shared/resources/qa-ci-read.sh:104` — `gh run list --branch` includes PR runs from a same-named branch → future (not run)
- [medium/medium] `shared/resources/fast-gate-outcome.sh:115` — a base containing HEAD → future
- [medium/medium] `shared/resources/fast-gate-outcome.sh:122` — option-shaped path → measured by the probe, promoted as TASK-238-PRB4-1
- [low/high] `shared/resources/qa-ci-read.sh:162` — superseded pipeline → TASK-238-CR4-8
- [low/high] `shared/resources/fast-gate-outcome.sh:36` — interrupted run → TASK-238-CR4-9

**Cleanups (0)**

All anchors checked `ok` or `unchecked-text`. None of the findings is pre-existing: both scripts and the open-coverage block are new on this branch.

mutation-proven: drop `qa-ci-read.sh` `--vcs` check → `usage errors exit 2` → covered
mutation-proven: drop `qa-ci-read.sh` `--pr` check → `usage errors exit 2` → covered
mutation-proven: drop `fast-gate-outcome.sh` `--exit` number check → `usage errors exit 2 rather than guessing an outcome` → covered
mutation-proven: drop the `..` guard → both `` `..` failing-test path `` tests → covered
mutation-proven: drop the quote allowance on `category:` → both quoted-category cases → covered
mutation-proven: drop the quote allowance on `provenance:` → `a quoted provenance: "pre-existing" still exempts` → covered

Six of six proofs were run, each against the committed sources and each restored from a `cp` snapshot.

---

## Regression Testing

`npm run ci:fast`: 6507 tests, 0 fail. `bundle:check` is clean.

---

## Test Artifacts

### Test Commands Executed

```bash
npm run -s ci:fast
python skills/create-skill/scripts/quick_validate.py skills/develop-{bug,story,task}/
node .agents/skills/qa-task/references/security-probe.mjs … (4 controls, record task.238.qa.4.security.run.json)
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file shared/resources/develop-pipeline-step-5-6-qa-loop.md --diff-base <merge-base> --copy-as skills:.agents/skills --json
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 770
```

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: three HIGH, high-confidence defects in the boundaries this task ships, each of which widens `pre-existing`.
**Quality Score**: 20/100
**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.238.qa.4.qa-loop-acts-on-signals-it-has.md`
**Gate File**: co-located at `task.238.gate.4.qa-loop-acts-on-signals-it-has.yml`
**Next Steps**: `/qa-fix` cycle 4 on bug.5 to bug.9

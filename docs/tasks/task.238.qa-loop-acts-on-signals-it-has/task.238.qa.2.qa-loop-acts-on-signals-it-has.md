# QA Report: Task 238 - QA loop acts on the signals it already has (cycle 2)

**Task**: [Link to task document](./task.238.qa-loop-acts-on-signals-it-has.md)
**Gate File**: [task.238.gate.2.qa-loop-acts-on-signals-it-has.yml](./task.238.gate.2.qa-loop-acts-on-signals-it-has.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-28
**Testing Completed**: 2026-10-28
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous finding | Cycle-1 severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK238-CR-1: open-coverage check reads an unreadable review as clean ([bug.1](./task.238.bug.1.open-coverage-check-reads-unreadable-review-as-clean.md)) | HIGH | ✅ FIXED | Three `unreadable` cases and the routing assertion run under bash and zsh; the resume row has its own test; mutating `unreadable` → `0` turned 3 tests red (5b). Closed |
| TASK238-CR-2: Stop hook 5c re-prompt still exits every CONCERNS ([bug.2](./task.238.bug.2.stop-hook-still-exits-every-concerns.md)) | MEDIUM | ✅ FIXED | `develop-pipeline-on-stop.test.sh` 52/0. It was 51/1 before the hook edit. Re-sweep over all tracked types recorded. Closed |
| TASK238-QA-1: `--base` reaches `git fetch` as an option ([bug.3](./task.238.bug.3.base-argument-reaches-git-fetch-as-an-option.md)) | MEDIUM | ✅ FIXED | The engine probe engages 8/8. Calibrated against the pre-fix script (accepted all 5 option- and ref-shaped bases). Mutation M1 covered. Closed |

## New Findings This Cycle

- **[medium]** `shared/resources/fast-gate-outcome.sh:83`: the base run has no timeout, and a kill strands the base worktree → bound it, and clean up in the EXIT trap ([bug.4](./task.238.bug.4.base-run-has-no-timeout-and-strands-its-worktree.md); promoted).
- Six advisory findings (CR-2 to CR-7) are listed under Code Review and routed to `recommendations.future`.

---

## Executive Summary

All three cycle-1 entries are verified fixed and closed. The `--base` refusal is now **measured**:
the probe engine ran 8 cases and was calibrated red on the pre-fix script. The cycle-2 refute pass
re-read the whole branch and found one promoted MEDIUM, which was reproduced: the base test run in
`fast-gate-outcome.sh` has no time bound, and when killed it strands a registered worktree. Six more
findings are advisory, at medium confidence or a cleanup.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (TASK238-CR2-1 fixed)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete; status `ready-for-review`
- [x] All implementation phases completed
- [x] Tests passing (`ci:fast` 6497/0 at `908d3713`)
- [x] Breaking changes documented (none)
- [x] Code on the feature branch with open PR #770

### Testing Approach

- [x] Automated Testing
- [x] Regression Testing
- [x] Security Review (probe engine, measured)
- [x] Code Review (refute pass)

### Review Methodology

Direct tools, plus one read-only Explore reviewer running the **cycle-2 refute pass** over the whole
branch diff (35 files, generated `references/` copies excluded). It was dispatched at
2026-10-28T04:09:51Z, returned in 243937 ms (`duration_ms`), and the wait was cleared at 04:14:33Z.

Re-review scope: unscoped — cycle 2 refute pass (one prior gate), SAFETY_REPROBE=false (clause 1).

`CI on 908d3713cb5e: pending`

Step 4b ran over the two cycle-1 changed docs. The results are in Test Artifacts.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Fast-gate outcomes and gated cleanup | CONCERNS | Verified | `--base` refusal measured. CR-1: base run unbounded. Advisory CR-2, CR-5, CR-6 |
| Phase 2: PR Existence Check and CI read | PASS | Verified | The CI read ran live again (`pending`, recorded, not waited on) |
| Phase 3: Coverage findings to 5b | PASS | Verified | bug.1 and bug.2 fixed. Advisory CR-3, CR-4, CR-7 |
| Phase 4: Guards, bundle, record | PASS | Verified | validate ×8, bundle:check, shellcheck |

**Overall Phase Completion**: 3/4 phases clean, 1 CONCERNS

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| SC-1 gated cleanup | `qa-loop-fast-gate-outcomes.test.mjs` gated-cleanup cases. Advisory CR-6: removal predicate | PASS |
| SC-2 three outcomes | same file, plus the injection test | PASS (CR-1 open on the base-run bound) |
| SC-3 / SC-3a / SC-5 CI read | `qa-ci-read.test.mjs`, qa-task and qa-story runPrCheck tests; live read this cycle | PASS |
| SC-4 CONCERNS + open coverage → 5b | parity open-coverage cases, now including `unreadable` | PASS. Advisory CR-4 (APPROVE path) |
| SC-4a / SC-4b | parity ladder and resume tests (third row added) | PASS |
| SC-6 green gate makes no worktree | the SC-6 test | PASS |
| SC-7 ci:fast | 6497 tests, 0 fail (5b cycle 1) | PASS |
| SC-8 bundle:check | rc 0 | PASS |
| SC-9 validate | `npm run validate` rc 0 for 8 skills | PASS |
| SC-10 mutation-proved | `908d3713` body; QA M1 below | PASS |
| SC-11 CHANGELOG | entry present | PASS |
| SC-12 restatement sweep | all-types re-sweep in bug.2 | PASS |

---

## Breaking Changes Validation

None. **PASS**

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: the base run has no timeout and strands its worktree when killed**
- **Severity**: MEDIUM
- **Category**: Reliability
- **Bug Report**: [task.238.bug.4.base-run-has-no-timeout-and-strands-its-worktree.md](./task.238.bug.4.base-run-has-no-timeout-and-strands-its-worktree.md)
- **Observation**: Reproduced: `timeout 5` killed the classifier (rc 124) and left `.worktrees/base-check-555952` registered. Whether an orphan `node` survives was not established.
- **Recommendation**: Add a process-group timeout read as `unavailable`, and remove the worktree in the EXIT trap.
- **Priority**: P2

### LOW Severity Issues (0)

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0 (plus 6 advisory code-review findings)

---

## NFR Assessment

### Performance — PASS
There is one CI read per cycle and no polling.

### Reliability — CONCERNS
CR-1 (promoted). CR-2 and CR-5 are advisory: two ways the pre-existing verdict can be over-claimed.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 8 (`escaped: 0`), copied from `task.238.qa.2.security.run.json` `totals`.

### Maintainability — PASS
The 5c exit rule now reads the same everywhere it is stated. CR-3 and CR-7 are advisory.

---

## Code Review

Code review blocks in this run (`code_review_blocking=true`). Every anchor checked `ok` at `908d3713`.

**Correctness bugs (6):**
- [medium/high] `shared/resources/fast-gate-outcome.sh:83`: the base run is unbounded, and a kill strands the worktree. → Add a timeout and EXIT-trap cleanup. **Promoted: TASK238-CR2-1**
- [medium/medium] `shared/resources/fast-gate-outcome.sh:91`: pre-existing rests on a four-string environment deny-list. → Require positive comparability evidence. (advisory)
- [medium/medium] `shared/resources/develop-pipeline-resume-contract.md:555`: the PR Review row names no report for the resume split to read. → Record the path or a distinct value. (advisory)
- [medium/medium] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1558`: a low coverage finding exits under APPROVE and routes under CONCERNS. → Check on APPROVE too, or raise it in review-pr. Premise confirmed (review-pr SKILL.md:703). The task kept APPROVE unchanged by design, so this needs a decision. (advisory)
- [medium/medium] `shared/resources/fast-gate-outcome.sh:58`: the comparison keys on the leaf test name. → Key on file plus full name. (advisory)
- [low/medium] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1220`: log removal keys on any `GATE_EXIT=0` line. → Key on the parsed value, in all three blocks. (advisory)

**Cleanups (1):**
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1547`: the `provenance: pre-existing` exclusion cannot fire on coverage entries. → Drop it, or extend review-pr's provenance pass.

**Provenance (5b).** All seven are attributable to this branch: every anchored file is new or changed
here, and every finding's subject is this task's code.

**Boundary rule.**
- `shared/resources/fast-gate-outcome.sh`: `boundary: true`. The `--base` argument is
  operator-supplied, and the script now refuses it. Probed with
  `--entry 'shell-argv:shared/resources/fast-gate-outcome.sh' --argv '["--log",".claude/state/gate.log","--exit","1","--base","{input}"]' --sink shell-exec --fixture-setup task.238.qa.2.security.setup.sh --cases-file task.238.qa.2.security.cases.json --name base-argument`.
  Result: `engages`, 6 hostile rejected, 2 legitimate accepted. **`probes_executed: 8` · `escaped: 0`**
  (from the run record's `totals`). Calibration: the same cases against `12dfb4b6`'s script gave
  `present-but-inert`, with all 5 option- and ref-shaped bases accepted. The empty base is a usage
  exit in both.
- `shared/resources/qa-ci-read.sh`: `boundary: internal`. It classifies this repository's own CI
  rollup, read through gh or Bitbucket. No sink models a CI status payload.
- the `OPEN_COVERAGE` block: `boundary: internal`. It counts entries in a report `/review-pr` writes.
  `markdown-structure` models the implementation report, not this one.

**Mutation spot-checks** (scratch worktree, `cp` snapshot and restore):
- mutation-proven: remove both `--base` refusal lines → "an option-shaped --base never reaches git fetch (task.238 bug.3)" → covered
- mutation-proven: remove only the `case "$BASE" in -*` line → no test red → absorbed (`git check-ref-format --branch` already rejects a leading `-`, rc 128; the `case` line is belt-and-braces)
- From 5b, re-read: `unreadable` → `0` in the OPEN_COVERAGE block → three `unreadable` cases → covered
- bug.2: the hook assertion was red before the hook edit (51/1) and green after (52/0) → covered

Platform variance: no environment-derived value reaches a validating consumer in this cycle's fixes.
The probe ran in the engine's sandbox `TMPDIR`.

---

## Regression Testing

`ci:fast` gave 6497 tests and 0 failures at `908d3713`. The on-stop shell suite gave 52/0. **PASS**

---

## Test Artifacts

### Files Reviewed
The whole branch diff (refute pass). In depth: `fast-gate-outcome.sh`, `qa-ci-read.sh`,
`develop-pipeline-on-stop.sh`, the §5c block and the resume rows.

### Test Commands Executed
```bash
npm run -s validate -- skills/<develop-task|develop-story|develop-bug|qa-task|qa-story|qa-fix|review-pr|develop>/   # rc 0 ×8
npm run -s bundle:check                                   # rc 0
shellcheck --severity=warning shared/resources/fast-gate-outcome.sh shared/resources/develop-pipeline-on-stop.sh   # rc 0
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 770   # CI_STATE=PENDING on 908d3713
node .agents/skills/qa-task/references/security-probe.mjs --sink shell-exec --entry 'shell-argv:shared/resources/fast-gate-outcome.sh' ... --record task.238.qa.2.security.run.json   # engages, 8 executed, 0 escaped
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <file> --diff-base <merge-base> --copy-as skills:.agents/skills --json
```

### Step 4b — documented commands

Changed counts first:
- `develop-pipeline-step-5-6-qa-loop.md`: 4 changed blocks, all `mutating`, 0 executed (`changed-blocks-not-executed`). The changed OPEN_COVERAGE block runs instead under bash and zsh in `pr-review-loop-parity.test.mjs`.
- `develop-pipeline-resume-contract.md`: 10 changed blocks, 2 executed. The one failure, at L492, is the pre-existing lock-fixture gap from cycle 1, untouched here.

### Coverage Report
Not instrumented.

---

## Recommendations

### Immediate Actions (Blocking)
1. TASK238-CR2-1 (bug.4): bound the base run and clean up its worktree on every exit path.

### Short-term Actions (Non-Blocking)
1. CR-2 to CR-7, plus cycle-1's CR-3 to CR-6: see the gate's `recommendations.future`. CR-4 needs a design decision.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: One medium promoted finding (gate rule 2). No high finding, and every NFR is PASS except reliability.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK238-CR2-1 fixed

---

**QA Report**: co-located at `task.238.qa.2.qa-loop-acts-on-signals-it-has.md`
**Gate File**: co-located at `task.238.gate.2.qa-loop-acts-on-signals-it-has.yml`
**Next Steps**: `/qa-fix` for TASK238-CR2-1, then cycle 3.

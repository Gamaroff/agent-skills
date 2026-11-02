# QA Report: Task 244 - The QA loop always ends on a gate

**Task**: [Link to task document](./task.244.qa-loop-ends-on-a-gate.md)
**Gate File**: [task.244.gate.2.qa-loop-ends-on-a-gate.yml](./task.244.gate.2.qa-loop-ends-on-a-gate.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-30
**Testing Completed**: 2026-10-30
**Gate Status**: PASS

---

## Executive Summary

Cycle 1's one blocker is fixed and held by a committed test that goes red without the fix. The refute pass over the whole branch (cycle 1's fix and the original change) found no new defect. Every suite is green. Two advisory test-coverage notes are recorded as future work.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (if applicable)
- [x] Code on feature branch with open PR

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit, integration, e2e)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review
- [x] Code Review

### Review Methodology

Direct tools, re-review, **refute pass** (exactly one prior gate): whole branch diff against `origin/develop` (124 files), reviewed to find the false claim in cycle 1's fix and in the original change. The Step 3b review was done inline by the QA fork; the independent Explore subagent was not dispatched (a fork cannot spawn one), so the review was not independent of the QA reader. Adaptive strategy: direct tools only.

CI on 2e2780c4e041: pending (`CI_STATE=PENDING`); nothing recorded in the gate.

Re-review scope: unscoped — cycle 2 re-reads the whole branch diff by design (refute pass).

Step 4b: not applicable to the cycle 1 fix (a shell helper and a comment in `SKILL.md`); the helper was executed directly instead (see Code Review).

---

## Re-Review Context

| Finding | Severity | Status | Evidence |
| --- | --- | --- | --- |
| T244-QA-1: Phase 0 HALTs on a first review | high | FIXED | `code-moved-since-gate.sh "<dir>" ""` now prints `1` and exits 0 with a note on stderr. A missing directory, an empty directory argument and a non-empty gate path that is no file still exit 2. New committed test `code-moved-since-gate.sh reads an empty gate path as a first review` goes red with the guard removed (see Code Review) |
| T244-QA-2: untracked held-aside file makes a grant re-enter at 5a | low | FIXED (accepted fail-safe) | Behaviour kept and documented in `grant-qa-cycles.sh` (a fail-safe that can spend a granted gate on unchanged code, never skip one). No test covers it; carried to future work |
| T244-QA-3: stale route-2c wording in the grant header | low | FIXED | Header names only an operator's standalone run and a previous grant |

## New Findings This Cycle

None. Searched unscoped (refute pass): full `origin/develop...HEAD` diff, 124 files. Re-enumerated the helper's inputs (empty gate, one argument, spaces in the directory, a directory named like a command substitution, a pathspec-magic name, glob characters, a gate that is a directory, repository root, traversal to the root, a call from a subdirectory and from `/`) and ran each; probed the four transitions on the changed lifecycle code (see Code Review). Two advisory notes are in `recommendations.future` of the gate; neither is a defect.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: The rule in the step doc | PASS | Verified | Rule stated once in Loop Setup; the two routes to 5b test `N == QA_MAX_CYCLES`; step 7 increments only |
| Phase 2: Engine and grant | PASS | Verified | Phase 0 call site no longer HALTs on a first review; grant re-enters from the helper |
| Phase 3: develop-bug | PASS | Verified | Verify loop escalates at `N == MAX_ITER`; no fifth fix; escalation text reads 5 verifies, 4 fixes |
| Phase 4: Sweep, tests, evals, bundle | PASS | Verified | Bundles fresh; evals 11 and 12 pass in replay |

**Overall Phase Completion**: 4/4 phases passed

---

## Success Criteria Verification

SC-1 to SC-10 were verified in cycle 1 (all held). Re-checked this cycle against the new head: SC-10's wording now names the real reports with `**Half-cycle**` rows (task.166, task.207) next to the fixtures, and matches what `report-lint` accepts. SC-8 holds: `npm test` exit 0, `eval:all` exit 0, `bundle:check` 0 problems.

---

## Breaking Changes Validation

A budget of N now gives N gates and N-1 fixes. Documented in the task (§ 5), the PR body and CHANGELOG, with the way to keep five fixes (`qa_max_cycles: 6`). The migration path is stated. Unchanged since cycle 1.

---

## Issues Found

### HIGH Severity Issues (0)
### MEDIUM Severity Issues (0)
### LOW Severity Issues (0)

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0

---

## NFR Assessment

### Performance — PASS
Same three git calls as the code replaced.

### Reliability — PASS
The first-review HALT is closed. The helper fails toward re-review on every head it cannot vouch for; the grant falls back to 5a when the helper is missing or cannot answer.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 9
- `code-moved-since-gate.sh` decides whether a PASS gate may skip re-review, so it was probed with `security-probe.mjs` in the shell-argv form (run record `task.244.qa.2.security.run.json`; verdict `engages`, 9 executed, 9 passed, 0 escaped). Accepted: the work-item directory, the same with a trailing slash, another work item's directory, a directory named `$(touch pwned)` (no command ran). Refused with exit 2: the repository root, a traversal that resolves to the root, a missing directory, an empty path, a leading-dash path.

### Maintainability — PASS
The code-movement count exists once for qa-task and the grant. Stale route-2c wording is gone from the step doc, the engine and the grant header.

---

## Code Review

Done inline (no independent subagent; see Review Methodology). `code_review_blocking=true`. Boundary: `true` for `shared/resources/code-moved-since-gate.sh` (its count gates the skip of a re-review and it refuses on bad usage); probed, `probes_executed: 9`, `escaped: 0`.

**Correctness bugs (0).**

Refute probes run on the changed code:

- **Bulk teardown / in-flight / error path / reconnect:** the changed code holds no emission, subscription or cache; the lifecycle is the lock and gate files. The grant writes its four fields with `mktemp` + `mv` as before; a helper that is missing or silent re-enters at 5a with a warning, never at 5b on a stale gate. A halt written before the change (gate N, no increment) reconstructs `NEXT_CYCLE = N + 1 > QA_MAX_CYCLES`, so the halt is re-surfaced as before.
- **Identity rules:** one pair that must merge (a work-item directory with and without a trailing slash: both 0) and one that must differ (the same gate with a later code commit or an untracked file: 2). A directory whose name is pathspec magic or holds glob characters fails toward re-review (count above 0), never toward 0.
- **Resource bounds:** the helper runs three git commands and no loops; no configured command, no pattern from the caller.
- **Combination:** cycle 1's guard sits before the usage and head checks, so the empty-gate path never reaches the directory-prefix check, and a non-empty gate path that is no file still refuses.
- **Stale callers:** `classifyLoopRoute()` with `budgetSpent: true` and a `lastCycleAction` evaluates the ordinary routes (here `not-a-pass-gate`); `describeLoopRoute()` renders a legacy `gate-the-last-fix` token; no `GATE_THE_LAST_FIX` or `RUNNING_QA_FIX_RE` reference remains.
- **Population of restated claims:** `route 2c|gate-the-last-fix|half-cycle|budgetSpent|fix cycles without` across `SKILL.md`, `references/*.md` (generated copies removed), `shared/resources/*.md`, `docs/` and `CHANGELOG.md`: the remaining hits are the removal notes in the step doc, the runbook and the CHANGELOG history, and `**Half-cycle**` readers kept on purpose.

mutation-proven: the empty-gate branch of `code-moved-since-gate.sh` (replaced by a usage exit 2, in the working file, restored from a `cp` snapshot) → `code-moved-since-gate.sh reads an empty gate path as a first review: rc 0, prints 1` went red, the other six tests in that file stayed green → covered

**Cleanups (2, advisory):**
- `evals/shared/tests/qa-loop-ends-on-a-gate.test.mjs` — the new test pins the helper, not the Phase 0 block that called it wrongly; a test that runs the trigger block with no gate on disk would hold the call site as well → future
- `evals/shared/tests/qa-loop-ends-on-a-gate.test.mjs` — the budget-rule tests read the step doc as text; the behaviour is held by evals 11 and 12 in replay → future

---

## Regression Testing

| Area | Result |
| --- | --- |
| `npm test` | PASS (exit 0; 6908 tests, 6894 pass, 0 fail, rest skipped) |
| `eval:all` | PASS (exit 0) |
| `bundle:check` | PASS (128 skills, 0 problems) |
| `lint:shell` | PASS (shellcheck clean, 107 scripts) |
| `quick_validate` for develop-task, develop-story, develop-bug, qa-task | PASS |

---

## Test Artifacts

### Files Reviewed

`shared/resources/code-moved-since-gate.sh`, `shared/resources/grant-qa-cycles.sh`, `shared/resources/qa-diminishing-returns.js`, `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, `shared/resources/develop-pipeline-resume-contract.md`, `skills/qa-task/SKILL.md`, `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`, `evals/shared/tests/qa-loop-ends-on-a-gate.test.mjs`, CHANGELOG, runbooks.

### Test Commands Executed

```bash
npm test                          # exit 0
npm run eval:all                  # exit 0
npm run bundle:check              # 0 problems
npm run lint:shell                # shellcheck clean
python3 skills/create-skill/scripts/quick_validate.py skills/<skill>   # develop-task, develop-story, develop-bug, qa-task: rc 0
command node .agents/skills/qa-task/references/security-probe.mjs --entry 'shell-argv:shared/resources/code-moved-since-gate.sh' --argv '["{input}","docs/tasks/task.42.example/task.42.gate.1.example.yml"]' --fixture-setup <setup> --cases-file <cases> --record task.244.qa.2.security.run.json   # engages, 9/9
command node --test evals/shared/tests/qa-loop-ends-on-a-gate.test.mjs   # green; red on the empty-gate test with the guard removed (restored after)
```

### Coverage Report
Not measured (documentation, shell and test changes).

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. Add a test that runs the Phase 0 trigger block with no gate on disk.
2. Consider a live run of step-isolation eval 11 when live evals are taken up.
3. Route `reenter-qa-after-finalise.sh`'s commit count through the helper.
4. Add a grant case for an untracked file (T244-QA-2).

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: cycle 1's blocker is fixed and held by a test that fails without it; the refute pass found no new defect; all suites green.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED
**Conditions**: none (CI on the PR head was pending when read; it is gated at `/finalise`).

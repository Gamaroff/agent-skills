# QA Report: Task 244 - The QA loop always ends on a gate

**Task**: [Link to task document](./task.244.qa-loop-ends-on-a-gate.md)
**Gate File**: [task.244.gate.1.qa-loop-ends-on-a-gate.yml](./task.244.gate.1.qa-loop-ends-on-a-gate.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-30
**Testing Completed**: 2026-10-30
**Gate Status**: FAIL

---

## Executive Summary

The budget rule is implemented and held: 5b is entered only when `N < QA_MAX_CYCLES` in both places that route to it, §5b step 7 always increments, route 2c is gone from the step doc and the engine, the grant re-enters from evidence, and develop-bug follows the same rule. All ten success criteria hold and every suite is green. One defect blocks: the qa-task Phase 0 trigger block, rewritten to call the new helper, HALTs on a first review.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

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

Direct tools, first review (no prior gate), whole branch diff against `origin/develop` (122 files). The Step 3b code review was done inline by the QA fork; the independent Explore subagent was not dispatched (a fork cannot spawn one), so that review was not independent of the QA reader. Adaptive strategy: direct tools only.

CI on 3d8e0313f0cf: pending (`CI_STATE=PENDING`); nothing recorded in the gate.

Re-review scope: not applicable (first review).

One mutation check was run on the new guard (step 7 restored in a scratch copy, see Test Artifacts). The traceability matrix was skipped: the Success Criteria are a list, not a table.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: The rule in the step doc | PASS | Verified | Budget test before 5b in both routes (lines 440, 1532-1533); step 7 increments only (line 1394); 2c section and §5c route 5 removed; escalation commit carries gate N and QA report N (line 2035) |
| Phase 2: Engine and grant | CONCERNS | Verified | `classifyLoopRoute()` ignores `budgetSpent`; grant uses `code-moved-since-gate.sh`; qa-task Phase 0 call breaks the first review (T244-QA-1) |
| Phase 3: develop-bug | PASS | Verified | Verify loop escalates at `N == MAX_ITER`; no fifth fix; escalation text reads 5 verifies, 4 fixes |
| Phase 4: Sweep, tests, evals, bundle | PASS | Verified | Bundles fresh; evals 11 and 12 added for both pipelines; CHANGELOG states the gate count |

**Overall Phase Completion**: 3/4 passed, 1 with a finding

---

## Success Criteria Verification

| SC | Verdict | Evidence |
| --- | --- | --- |
| SC-1 | PASS | `N == QA_MAX_CYCLES` tested at the Outcome-branching budget test (step doc line 440) and in the REQUEST CHANGES and CONCERNS rows of §5c (lines 1532-1533); both escalate through *Loop limit* |
| SC-2 | PASS | Step 7 reads "Increment the cycle counter and return to 5a"; `qa-loop-ends-on-a-gate.test.mjs` pins it |
| SC-3 | PASS | `classifyLoopRoute()` has no `budgetSpent` branch; `qa-loop-route.test.mjs` 82 pass with the equal-routes check; no `Gate-the-last-fix` section or `route 2c` numbered entry remains (test "no Gate-the-last-fix section or route remains") |
| SC-4 | PASS | `grant-qa-cycles.test.sh` 63 passed, 0 failed; cases (a)-(f) cover 5b on no movement, 5a on a commit, an uncommitted edit, a missing helper and a headless gate |
| SC-5 | PASS | develop-bug verify loop: FAIL at `N == MAX_ITER` goes to Loop Limit Escalation; step 5 of 5b has no budget test |
| SC-6 | PASS | Loop Escalation commit section: "this cycle's gate `.yml` and QA report `.md` alongside it" (line 2035) and Outcome branching line 443 |
| SC-7 | PASS | Step-isolation scenario 11 (cycle-5 CONCERNS gate, budget 5, no `fix(` commit) passes under `eval:all`; `qa-loop-ends-on-a-gate.test.mjs` pins the test on both arms |
| SC-8 | PASS | `npm test` exit 0 (9592 log lines), `bundle:check` 0 problems, `validate` clean for develop-task, develop-story, develop-bug and qa-task; new test mutation-proven (step 7 restored in a copy: 2 failing, the control also fails because the copy no longer matches its splice anchor) |
| SC-9 | PASS | `git rev-list --count` appears once in the code-movement path (`code-moved-since-gate.sh:70`); qa-task Phase 0 and `grant-qa-cycles.sh` both call it. `reenter-qa-after-finalise.sh:214` is a separate, older count with docs-only classification; outside the criterion |
| SC-10 | PASS | The five green fixtures lint clean; so do the two real reports that carry `**Half-cycle**` rows (task.166, task.207). The fixtures themselves carry no such row; the criterion's parenthesis is wrong. CHANGELOG states N gates, N-1 fixes and `qa_max_cycles: 6` |

---

## Breaking Changes Validation

A budget of N now gives N gates and N-1 fixes. Documented in the task (§ 5), the PR body and CHANGELOG lines 35-46, with the way to keep five fixes (`qa_max_cycles: 6`). A halt written before the change re-enters at 5a. The migration path is stated.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: T244-QA-1 — qa-task Phase 0 HALTs on a first review**
- **Severity**: HIGH
- **Category**: Functional
- **Bug Report**: none filed; the finding is in the gate queue for `/qa-fix`
- **Observation**: `skills/qa-task/SKILL.md` Phase 0 step 3 runs `CODE_MOVED=$(bash .../code-moved-since-gate.sh "$TASK_DIR" "$LATEST_GATE") || { echo "HALT ..."; exit 1; }` with no guard. With no gate on disk `LATEST_GATE` is empty (`qa-cycle.sh` refuses). The helper's first check rejects an empty gate argument with exit 2. Reproduced against this task's directory: `LATEST_GATE=''`, `usage: code-moved-since-gate.sh <work-item-dir> <gate-file>`, `rc=2`.
- **Impact**: every first QA review that runs the block as written reads a HALT. The block's own comment says it must run with no gate; the code it replaced set `CODE_MOVED` to 1 there.
- **Recommendation**: guard the call on a bound gate (`CODE_MOVED=1` otherwise) or have the helper print 1 for an empty gate path; add a test that runs the block with no gate on disk.
- **Priority**: P0

### MEDIUM Severity Issues (0)

### LOW Severity Issues (2)

- **T244-QA-2** (`shared/resources/grant-qa-cycles.sh`): an untracked file outside the work item counts as code movement, so a grant re-enters at 5a whenever the pipeline has held such a file aside. It fails safe but spends a granted gate re-reading unchanged code, and no test covers it.
- **T244-QA-3** (`shared/resources/grant-qa-cycles.sh:12`): the header still names "a route-2c half-cycle".

**Total Issues**: HIGH: 1, MEDIUM: 0, LOW: 2

---

## NFR Assessment

### Performance — PASS
Same three git calls as the code replaced. At the default budget: 5 gates, at most 4 fixes.

### Reliability — CONCERNS
The Phase 0 first-review HALT (T244-QA-1). The helper fails toward re-review on every head it cannot vouch for.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- No new input boundary; the helper passes a gate path and directory to git as arguments.

### Maintainability — PASS
The code-movement count exists once for qa-task and the grant. Doc sweep left a few "up to 5 cycles" phrases in descriptions; still true under the new rule.

---

## Code Review

Done inline (no independent subagent; see Review Methodology). `code_review_blocking=true`.

**Correctness bugs (1):**
- [high/high] `skills/qa-task/SKILL.md` (Phase 0 step 3, the `CODE_MOVED=$(...)` call) — empty gate path makes the helper exit 2 and the block HALT on a first review → guard the call or default the helper (gate id T244-QA-1)

**Cleanups (2):**
- `shared/resources/grant-qa-cycles.sh:12` — stale "route-2c half-cycle" in the header → reword (T244-QA-3)
- `shared/resources/reenter-qa-after-finalise.sh:214` — a second `git rev-list` count of code movement, with different semantics → consider routing its commit count through `code-moved-since-gate.sh` later

Also reviewed and found sound: `code-moved-since-gate.sh` (usage refusals, head validation, fail-toward-re-review), the grant's fallback to 5a on a missing or silent helper, `classifyLoopRoute()` ignoring stale `budgetSpent` input, and `describeLoopRoute()` still rendering the legacy token.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `npm test` | PASS (exit 0) |
| `eval:all` (replay and step-isolation incl. 11, 12) | PASS (exit 0) |
| `bundle:check`, `check:generated`, `lint:shell` | PASS |
| `report-lint` on 5 green fixtures and task.166/207 reports | PASS |
| Grant, route, scope-from-head, loop-parity and lock-field suites run alone | PASS |

---

## Test Artifacts

### Files Reviewed

`shared/resources/develop-pipeline-step-5-6-qa-loop.md`, `shared/resources/qa-diminishing-returns.js`, `shared/resources/code-moved-since-gate.sh`, `shared/resources/grant-qa-cycles.sh`, `skills/qa-task/SKILL.md`, `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`, `evals/shared/tests/qa-loop-ends-on-a-gate.test.mjs`, CHANGELOG, runbooks.

### Test Commands Executed

```bash
npm test                       # exit 0
npm run eval:all               # exit 0
npm run bundle:check           # 0 problems
npm run check:generated        # exit 0
npm run lint:shell             # shellcheck clean
npm run validate -- skills/<develop-task|develop-story|develop-bug|qa-task>/
bash shared/resources/grant-qa-cycles.test.sh        # 63 passed
QA_LOOP_DOC=<copy with old step 7> command node --test evals/shared/tests/qa-loop-ends-on-a-gate.test.mjs   # 2 failing
bash .agents/skills/qa-task/references/code-moved-since-gate.sh <task dir> ""                               # rc=2
```

### Coverage Report
Not measured (documentation, shell and test changes).

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix T244-QA-1 in the qa-task source, re-run `npm run bundle`, add a first-review test (P0).

### Short-term Actions (Non-Blocking)
1. Add a grant case for an untracked file and record the expected phase (T244-QA-2).
2. Reword the stale header comment (T244-QA-3).
3. Consider routing `reenter-qa-after-finalise.sh`'s commit count through the helper.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one high-confidence correctness bug in the rewritten Phase 0 trigger (code review is blocking for this run); everything else verified.
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED
**Conditions**: T244-QA-1 fixed and tested.

---

**QA Report**: co-located at `task.244.qa.1.qa-loop-ends-on-a-gate.md`
**Gate File**: co-located at `task.244.gate.1.qa-loop-ends-on-a-gate.yml`
**Next Steps**: `/qa-fix` on the gate, then cycle 2 (full refute pass).

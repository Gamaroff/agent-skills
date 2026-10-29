# QA Report: Task 238 - QA loop acts on the signals it already has (cycle 3)

**Task**: [Link to task document](./task.238.qa-loop-acts-on-signals-it-has.md)
**Gate File**: [task.238.gate.3.qa-loop-acts-on-signals-it-has.yml](./task.238.gate.3.qa-loop-acts-on-signals-it-has.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-28
**Testing Completed**: 2026-10-28
**Gate Status**: PASS

---

## Re-Review Context

| Previous finding | Cycle-2 severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK238-CR2-1: the base run has no timeout and strands its worktree when killed ([bug.4](./task.238.bug.4.base-run-has-no-timeout-and-strands-its-worktree.md)) | MEDIUM | ✅ FIXED | Four new assertions, all red on `908d3713`. Dev mutations: dropping `set -m`, the TERM trap or the sweep each turns a test red. QA mutation: dropping `disown` turns the hang test red on stderr. The cycle-2 repro (`timeout 5` around the classifier) now leaves no worktree, no orphan `node` and no `sleep`. Closed |

## New Findings This Cycle

None promoted. Four low items (CR-1 to CR-4) are recorded under Code Review and routed to `recommendations.future`. CR-2 is pre-existing.

---

## Executive Summary

Cycle 2's one finding is fixed and verified. Three things changed in `fast-gate-outcome.sh`:

- The base run is bounded, with its process group killed on a timeout.
- Every exit path that can be trapped removes the worktree.
- A SIGKILLed run's worktree is swept by the next run.

The scoped cycle-3 review found only low items. The `--base` probe re-ran on the changed script and still engages.

**Overall Assessment**: PASS
**Deployment Recommendation**: READY

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete; status `ready-for-review`
- [x] All implementation phases completed
- [x] Tests passing (`ci:fast` 6500/0 at `8b7e8d1c`)
- [x] Breaking changes documented (none)
- [x] Code on the feature branch with open PR #770

### Testing Approach

- [x] Automated Testing
- [x] Regression Testing
- [x] Security Review (probe engine, measured)
- [x] Code Review (scoped)

### Review Methodology

Direct tools, plus one read-only Explore reviewer:

- Dispatched at 2026-10-28T04:29:53Z; it returned in 211242 ms (`duration_ms`), and the wait was cleared at 04:33:56Z.
- Scope: files changed since gate 2's head `908d3713`, 15 files. The bundled `references/` copies were excluded; each is identical to its source apart from its header line.
- `SAFETY_REPROBE=false`: clause 1 is false, and clauses 2–3 do not hold, since no safety-axis gate failed and the fix is a resource bound.

Re-review scope: files changed since gate 2 (head 908d3713cb5e; 15 files) — default.

`CI on 8b7e8d1cb9d2: pending`

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Fast-gate outcomes and gated cleanup | PASS | Verified | bug.4 fixed. Advisory CR-1, CR-3 |
| Phase 2: PR Existence Check and CI read | PASS | Verified | CI read live (`pending`, recorded) |
| Phase 3: Coverage findings to 5b | PASS | Verified | Unchanged this cycle |
| Phase 4: Guards, bundle, record | PASS | Verified | validate ×3, bundle:check, shellcheck |

**Overall Phase Completion**: 4/4

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| SC-2 three outcomes | 26/26 in `qa-loop-fast-gate-outcomes.test.mjs`, including the bound and the cleanup | PASS |
| SC-6 green gate makes no worktree | the SC-6 test | PASS |
| SC-7 ci:fast | 6500 tests, 0 fail (5b cycle 2, attempt 2) | PASS |
| SC-8 bundle:check | rc 0 | PASS |
| SC-9 validate | rc 0 | PASS |
| SC-10 mutation-proved | `8b7e8d1c` body, plus the QA `disown` mutation | PASS |
| SC-11 CHANGELOG | entry updated for the bound | PASS |
| All other criteria | unchanged since gate 2, which verified them | PASS |

---

## Breaking Changes Validation

None. `FAST_GATE_BASE_TIMEOUT` is a new optional variable. **PASS**

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0 promoted (plus 4 advisory code-review items)

---

## NFR Assessment

### Performance — PASS
The base run is bounded.

### Reliability — PASS
bug.4 is fixed. CR-1 and CR-3 are advisory.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 8 (`escaped: 0`), copied from `task.238.qa.3.security.run.json` `totals`.

### Maintainability — PASS
CR-4 is advisory.

---

## Code Review

Code review blocks in this run (`code_review_blocking=true`). Every anchor checked `ok` at `8b7e8d1c`.

**Correctness bugs (3):**
- [low/medium] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1271`: the 90 s bound covers only the base test run. The fetch and checkout are unbounded, and the KILL grace adds 5 s. → Bound the whole script, or narrow the claim. (advisory)
- [low/high] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1202`: the 5b gate run block reads `${QA_CYCLE}` with no writer. → Bind it in the block. **Pre-existing**: the same line is at `origin/develop` line 1197, and this branch added only the gated `rm` after it. Not promoted.
- [low/low] `shared/resources/fast-gate-outcome.sh:116`: an orphan of a group-SIGKILLed classifier can share `$LOG.base` with a rerun. → Record the group ids for the sweep, or use a run-unique base log. (advisory)

**Cleanups (1):**
- `evals/shared/tests/qa-loop-fast-gate-outcomes.test.mjs:534`: `assertGone` force-kills before it asserts. In practice it still went red on the `set -m` mutation, because a freshly killed orphan is still visible. → Assert on recorded survival instead.

**Provenance (5b).** CR-2 is pre-existing (above). CR-1, CR-3 and CR-4 are attributable to this branch, and none is promoted.

**Boundary rule.**
- `shared/resources/fast-gate-outcome.sh`: `boundary: true`. It was re-probed with the qa.2 cases and setup on the changed script:
  `--entry 'shell-argv:shared/resources/fast-gate-outcome.sh' --argv '["--log",".claude/state/gate.log","--exit","1","--base","{input}"]' --sink shell-exec --fixture-setup task.238.qa.2.security.setup.sh --cases-file task.238.qa.2.security.cases.json --name base-argument`.
  Result: `engages`. **`probes_executed: 8` · `escaped: 0`** (from `task.238.qa.3.security.run.json` `totals`).
- The new `FAST_GATE_BASE_TIMEOUT` input is validated and tested: `0`, `abc` and `-5` each exit 2.

**Mutation spot-checks** (scratch worktree):
- mutation-proven: remove `disown "$WATCH_PID"` → "a base run that hangs is bounded…" (stderr carries bash's `Killed` notice) → covered
- Dev mutations, re-read from the bug.4 record: drop `set -m` turns both hang tests red; drop the TERM trap turns the killed-mid-run test red; drop the sweep turns the sweep test red → covered

Platform variance: `set -m` and `disown` exist in bash 3.2, which macOS ships, but this host cannot run that check. No environment-derived value reaches a validating consumer.

---

## Regression Testing

`ci:fast` gave 6500 tests and 0 failures at `8b7e8d1c`. **PASS**

---

## Test Artifacts

### Test Commands Executed
```bash
npm run -s validate -- skills/<develop-task|develop-story|develop-bug>/   # rc 0 ×3
npm run -s bundle:check                                                   # rc 0
shellcheck --severity=warning shared/resources/fast-gate-outcome.sh       # rc 0
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 770   # CI_STATE=PENDING on 8b7e8d1c
node .agents/skills/qa-task/references/security-probe.mjs ... --record task.238.qa.3.security.run.json   # engages, 8, 0 escaped
```

### Step 4b — documented commands

The only doc change this cycle is one prose sentence in `develop-pipeline-step-5-6-qa-loop.md`. No fenced block changed.

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
See the gate's `recommendations.future`. Cycle 2's CR-4 (a low coverage finding under APPROVE) needs a design decision.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: No open finding, and every NFR is PASS.
**Quality Score**: 90/100

**Deployment Recommendation**: READY

---

**QA Report**: co-located at `task.238.qa.3.qa-loop-acts-on-signals-it-has.md`
**Gate File**: co-located at `task.238.gate.3.qa-loop-acts-on-signals-it-has.yml`
**Next Steps**: Step 5c, `/review-pr`.

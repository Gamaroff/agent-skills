# QA Report: Task 234 - Probe sandbox teardown and process-group reap

**Task**: [task.234.probe-teardown-and-reap-hardening.md](./task.234.probe-teardown-and-reap-hardening.md)
**Gate File**: [task.234.gate.1.probe-teardown-and-reap-hardening.yml](./task.234.gate.1.probe-teardown-and-reap-hardening.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-31
**Testing Completed**: 2026-10-31
**Gate Status**: FAIL

---

## Executive Summary

QA reviewed PR #800 at `eccc31ed` with a diff review by an independent subagent and test runs on three Node versions. Three of the four fixes hold everywhere: the symlink guard (B), the QA2-1 hardening (C) and the process-group reap (D). Fix A, removing a sandbox nested past PATH_MAX, holds on Node 24 and 26. It fails on Node 22, which is what CI and `engines` pin.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] The task document exists and is complete; status `ready-for-review`
- [x] All implementation phases are ticked
- [x] Tests pass on the host Node (26.8.2)
- [x] Breaking changes are documented
- [x] The code is on the feature branch with open PR #800

### Testing Approach

- [x] Automated testing: the security-probe suite, and the task.234 tests on Node 22, 24 and 26
- [x] Regression testing: the full `npm run ci` from Step 3
- [x] Security review: the boundary rule
- [x] Code review: an independent subagent

### Review Methodology

Direct tools, plus one Explore subagent for the diff review. This is a first review: a single module, four phases, medium risk.

- **Diff review.** The subagent was dispatched at about 09:10Z and its completion notice reported `duration_ms` 83683. It read the whole 383-line patch.
- **CI.** CI on `eccc31ed0391` was pending. Checks finished at read time: link-check, secret-scan, shellcheck and validate, all passed. `test` was still pending.
- **Step 4b.** Not applicable: the change set adds no fenced bash block (`probe-boundary-rule.md` gains prose only).
- **Standards-named validation.** `npm run validate -- skills/<s>/` exited 0 for `finalise`, `qa-story`, `qa-task` and `review-security`, the skills whose bundled copies changed.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Teardown past PATH_MAX (A, B) | FAIL | A red on Node 22 | B holds on 22, 24 and 26. A passes on 24 and 26 only (TASK-234-QA-1) |
| Phase 2: QA2-1 hardening (C) | PASS | Verified | `TMPDIR` assertion and `t.skip` in place |
| Phase 3: Process-group reap (D) | PASS | Verified on 22, 24 and 26 | Spawn-site search re-run: no other case spawn |
| Phase 4: Docs and validation | PASS | Verified | Rule doc § 5, CHANGELOG, bundle |

**Overall Phase Completion**: 3/4 phases passed

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Evidence |
| --- | --- | --- | --- | --- |
| Deep tree with a mode-000 leaf no longer crashes; sandbox removed | All supported Node | Node 24 and 26 only | FAIL | Node 22.23.4: `ENAMETOOLONG` (TASK-234-QA-1) |
| Teardown never changes a mode outside the sandbox | Holds | Holds | PASS | B test on 22, 24 and 26; `chmod -R` with no `-L` (`security-probe.mjs:978`) |
| A late background write is killed before `absent`/`removed` are read | Holds | Holds | PASS | Both D tests on 22, 24 and 26; `reapGroup` at both spawn sites |
| A, C and D red on develop, green after; B under its mutation | As stated | A, D and B as stated; C held by mutation | PASS (noted) | Implementation report, Step 3 mutation proofs |
| Wall time ≤ D waits | ~0.6 s per site | +0.14 s on existing tests; +1.3 s per file | PASS | Measured in Step 3, load ~1.0–1.2 |
| Each fix mutation-proved | All | All four | PASS | Development-time mutations. The D tests lack a committed positive control (TASK-234-QA-2) |
| `npm run ci`, `bundle:check`, lint-shell | Pass | Pass on Node 26 | CONCERNS | CI runs Node 22, where the A test fails |
| Rule doc and CHANGELOG | Updated | Updated | PASS | `probe-boundary-rule.md` § 5; CHANGELOG `[Unreleased]` Fixed |

---

## Breaking Changes Validation

### Breaking Change: background children of a case or setup no longer outlive the spawn

Documented: Yes
Migration Path Provided: Yes (none is needed)
Migration Tested: Yes (the full probe suite gives identical outcomes)
Consumer Code Updated: N/A

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: the teardown still crashes on a deep tree under Node 22**
- **Severity**: HIGH
- **Category**: Functional
- **Gate id**: TASK-234-QA-1
- **Observation**: Node 22's `rmSync` walks by absolute path. On a sandbox nested past PATH_MAX, the first call fails with `ENAMETOOLONG`, not `EACCES`, and `removeSandbox` rethrows any code other than `EACCES`/`EPERM`. Reproduction (fails on 22.23.4, passes on 24.21.0 and 26.8.2):

  ```bash
  mise exec node@22 -- node --test --test-name-pattern "task.234|QA2-1" shared/resources/tests/security-probe.test.mjs
  ```

- **Provenance**: develop crashes on the same input on every Node version. Fix A is this task's stated scope, so the finding stays on the gate rather than counting as pre-existing.
- **Impact**: The PR's own CI `test` job runs Node 22, so it is expected to go red on the A test. Criterion A is unmet on the supported minimum Node.
- **Recommendation**: Treat `ENAMETOOLONG` like `EACCES`/`EPERM`, and remove by relative path after `chmod -R` (for example `rm -rf -- root`). Re-run the A test on 22, 24 and 26.
- **Priority**: P1
- **Found by**: diff reviewer CR-1 (medium/medium, platform-variance). QA reproduced it on Node 22 and promoted it on that measurement. The reviewer's original rating is kept here.

### MEDIUM Severity Issues (0)

### LOW Severity Issues (1)

- **TASK-234-QA-2** (reviewer CR-2, low/medium): both D tests assert only that the marker is absent. Nothing committed shows the grandchild ever started, so a declined case would also pass. Add a started-file positive control.

**Total Issues**: HIGH: 1, MEDIUM: 0, LOW: 1

---

## NFR Assessment

### Performance — PASS

On the 265 existing probe tests, the branch adds +0.14 s over develop. The file as a whole grows about 1.3 s: the two 0.6 s D waits plus the A and B runs.

### Reliability — FAIL

TASK-234-QA-1: on the engines-minimum Node, the teardown still crashes on a deep tree, which is the failure fix A was meant to remove.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`. The diff adds two functions, and neither is an accept/reject boundary:
  - `removeSandbox` is a teardown, not a predicate: it refuses nothing.
  - `reapGroup` sends a kill and returns nothing.
- The B test holds the no-symlink-follow property on all three Node versions. `chmod` gets its argv as an array with `--`, so no shell string is built.

### Maintainability — PASS

`probe-boundary-rule.md` § 5 states the reap, its `setsid` limit and the remaining chmod race. CHANGELOG records the fix.

---

## Code Review

Reviewer: Explore subagent, independent of the implementation. It read the whole 383-line patch.

**Correctness bugs (2):**
- [medium/medium] `shared/resources/security-probe.mjs:978`: platform-variance. The `chmod -R` fallback runs only after an `EACCES`/`EPERM`. Node 22's `rmSync` fails a deep tree with `ENAMETOOLONG` first. → Run the A test on Node 22, and handle `ENAMETOOLONG` or remove by relative path. **Reproduced by QA and promoted to TASK-234-QA-1 (high).**
- [low/medium] `shared/resources/tests/security-probe.test.mjs:7606`: the D tests have no positive control that the background writer started. → Add a started-file assertion. **Recorded as TASK-234-QA-2 (low).**

**Cleanups (0)**

Boundary rule: `boundary: false`. Predicate-shaped candidates in the diff: none. `removeSandbox` and `reapGroup` lack the accept/reject signal.

mutation-proven: `chmod -R -L` → task.234 B → covered
mutation-proven: old `open()` walk → task.234 A → covered (Node 26; on Node 22 A is red even without the mutation)
mutation-proven: no-op `removeSandbox` → QA2-1 → covered
mutation-proven: both `reapGroup` calls removed → task.234 D ×2 → covered

These four were run during Step 3 development and re-read from the implementation report, not re-run in this cycle.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full security-probe suite (269) on Node 26 | PASS |
| `npm run ci` (6919 tests) on Node 26 | PASS |
| task.234 tests on Node 24.21.0 | PASS (5/5) |
| task.234 tests on Node 22.23.4 | FAIL (A) |

---

## Test Artifacts

### Files Reviewed

- `shared/resources/security-probe.mjs`
- `shared/resources/tests/security-probe.test.mjs`
- `shared/resources/probe-boundary-rule.md`
- `CHANGELOG.md`

### Test Commands Executed

```bash
node --test --test-name-pattern="task.234|QA2-1" shared/resources/tests/security-probe.test.mjs   # 26.8.2, 24.21.0, 22.23.4
npm run -s validate -- skills/{finalise,qa-story,qa-task,review-security}/
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 800
```

---

## Recommendations

### Immediate Actions (Blocking)

1. TASK-234-QA-1: make the teardown work on Node 22, and run A on 22, 24 and 26.

### Short-term Actions (Non-Blocking)

1. TASK-234-QA-2: add a positive control to the D tests.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: One HIGH: success criterion A is unmet on the supported minimum Node, and the PR's CI runs that Node.
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.234.qa.1.probe-teardown-and-reap-hardening.md`
**Gate File**: co-located at `task.234.gate.1.probe-teardown-and-reap-hardening.yml`
**Next Steps**: `/qa-fix` for TASK-234-QA-1 and TASK-234-QA-2, then re-review (cycle 2, refute pass).

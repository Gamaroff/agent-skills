# QA Report: Task 232 - Probe expected.absent takes bare names; the rule doc says paths

**Task**: [Link to task document](./task.232.probe-expected-path-assertions.md)
**Gate File**: [task.232.gate.2.probe-expected-path-assertions.yml](./task.232.gate.2.probe-expected-path-assertions.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-25
**Testing Completed**: 2026-10-25
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2 re-reviewed the whole branch as a refute pass and verified the five cycle 1 fixes. All five hold, and `isCasePath` is now probed: 11 cases executed, 0 escaped. Two medium findings remain. Cycle 1 documented that an unreadable path is "never a probe crash", but a run that leaves a mode-000 directory still crashes the sandbox teardown. Cycle 1's change to the fence scorer is not held by any test.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous finding | Severity | Status | Verified by |
| --- | --- | --- | --- |
| TASK-232-QA1-1 — fixture has no shell directive; PR shellcheck red | high | ✅ FIXED | `bash scripts/lint-shell.sh` green with the fixture tracked; red on the tracked file before the directive |
| TASK-232-QA1-2 — grammar accepts `./` and `a/../` | high | ✅ FIXED | the grammar test refuses `./`, `.//`, `a/../`, `a/./..//`, `../`; mutation Q6 (trailing strip removed) reds 9 tests |
| TASK-232-QA1-3 — a trailing slash skips the collision decline | medium | ✅ FIXED | trailing-slash rows on all five forms; Q6 reds them |
| TASK-232-QA1-4 — lstat ELOOP/EACCES crash the probe | medium | ✅ FIXED (`compareExpected`) | Q4 reds the ELOOP/EACCES test. The same crash through the runner's teardown is new finding QA2-1 |
| TASK-232-QA1-5 — `isCasePath` unprobeable | medium | ✅ FIXED | exported; `--sink path` executed 11, 0 escaped |

Bug reports 1–5 are closed (Status History row, `qa-task`).

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing (`npm run ci`, 6337 tests, 0 failed, at `07227d87`)
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#748, OPEN)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (`security-probe.test.mjs`, 263 tests)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review (`isCasePath` probed with `--sink path`)
- [x] Code Review (refute pass, whole branch)

### Review Methodology

Direct tools, plus one read-only Explore reviewer for the refute pass. It was dispatched at 19:40Z and returned after 247.6 s (`duration_ms` from the completion notice). Its four findings were anchor-checked (`finding-anchors.js`, all `ok`), and CR-1 and CR-2 were reproduced on head and on base with `t232-qa2-repro.mjs`. Three mutations (Q4–Q6) on the cycle 1 fixes ran in a scratch worktree.

Re-review scope: unscoped — cycle 2 refute pass over the whole `origin/develop...HEAD` diff (`REFUTE_PASS=true`, `SAFETY_REPROBE=false`).

---

## New Findings This Cycle

- **[medium]** `shared/resources/security-probe.mjs:1948`. Cycle 1's "never a probe crash" claim is false through the runner: a run that leaves a mode-000 directory makes the sandbox `rmSync` throw EACCES, and every case result is lost. The crash predates this change; the claim is new. Fix: restore owner permissions before removing the sandbox, and add a runner-level test. **TASK-232-QA2-1.**
- **[medium]** `shared/resources/security-probe.mjs:3364`. The fence scorer now counts an unreadable `absent` path as a side effect, and no test holds it (mutation Q5 survives). Fix: a fence test that plants a loop and then stops. **TASK-232-QA2-2.**
- **[medium, pre-existing]** CR-2: a detached grandchild can write after `absent` / `removed` are read. Reproduced on head and base alike. Advisory, recommended as a follow-up.
- **[low]** CR-3 and CR-4, advisory (see Code Review).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Tests first | PASS | Verified | 3 more tests and extended rows in cycle 1; red-first: 10 fail on the pre-fix engine |
| Phase 2: Engine | CONCERNS | Partial | `caseKey`, the unreadable state and the export are in place. The runner teardown still crashes on mode 000 (QA2-1) |
| Phase 3: Docs, bundle, changelog | PASS | Verified | §5 and CHANGELOG name the trailing-separator rule; bundle fresh. The "never a probe crash" sentence becomes true once QA2-1 is fixed |

**Overall Phase Completion**: 2/3 phases passed clean; 3/3 delivered.

---

## Success Criteria Verification

**Functional Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Grammar accepts nested relative paths and refuses `..`, absolute, `.`, empty, NUL | refuses every spelling of `.` | refuses `./`, `.//`, `a/../`, `a/./..//` | PASS | Q6 |
| A nested `absent` side effect is caught on all five forms | 5/5 | 5/5 | PASS | |
| An `absent` path the fixture creates, or an ancestor, is declined on all five forms | every spelling | trailing slash declined | PASS | Q6 |
| `removed`: delete passes, left mismatches, not-created declined | yes | yes | PASS | cycle 1 Q1, Q3 |
| An ancestor resolving outside is a mismatch, never read through | 5/5 | 5/5 | PASS | the probe's `symlink-escape` checked through `compareExpected` |
| task.227's two cleanup cases execute and are accepted under every shell | yes | yes | PASS | |

**Performance Criteria:** not applicable, per § 8.

**Code Quality Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Each rule mutation-proved | yes | Q4 and Q6 red; Q5 survives | CONCERNS | QA2-2 |
| `npm run ci` passes with `.agents/skills` aside | exit 0 | exit 0, 6337 tests; lint-shell ran with the files staged | PASS | |
| `bundle:check` clean, no `UNREACHED` | clean | clean (128 skills) | PASS | |

---

## Breaking Changes Validation

Unchanged from cycle 1 (PASS). Cycle 1 widened nothing: a trailing `/` is now ignored and every spelling of `.` is refused, both of which only decline more.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (2)

**Issue: A run that leaves a mode-000 directory crashes the sandbox teardown (TASK-232-QA2-1)**
- **Severity**: MEDIUM
- **Category**: Reliability
- **Bug Report**: [task.232.bug.6.sandbox-teardown-throws-on-mode-000-dir.md](./task.232.bug.6.sandbox-teardown-throws-on-mode-000-dir.md)
- **Observation**: A fence case `mkdir -p locked && chmod 000 locked` makes `runProbeSpec` throw `EACCES` from `rmSync(sandboxRoot, …)`. It throws the same on base.
- **Impact**: No result is recorded for the run, and the docs say it cannot happen.
- **Recommendation**: Restore owner permissions on directories before removing the sandbox; add a runner-level test.
- **Priority**: P2

**Issue: The fence scorer's unreadable-is-a-side-effect rule has no test (TASK-232-QA2-2)**
- **Severity**: MEDIUM
- **Category**: Quality
- **Bug Report**: [task.232.bug.7.fence-unreadable-side-effect-untested.md](./task.232.bug.7.fence-unreadable-side-effect-untested.md)
- **Observation**: Mutation Q5 (`!== "missing"` changed to `=== "present"` at `:3364`) leaves the suite green.
- **Impact**: A regression would score a reproduced escape as errored, unseen.
- **Recommendation**: A fence test where a hostile case plants `ln -s loop loop` and stops, with `absent: ["loop/x"]`, reproduced on every shell.
- **Priority**: P2

### LOW Severity Issues (2)

- CR-3: a dangling outward ancestor symlink reads as `missing`, not `outside` (advisory).
- CR-4: `removed` cannot name a directory the fixture creates implicitly (advisory).

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 2 (plus 1 pre-existing medium, advisory)

---

## NFR Assessment

### Performance — PASS

One lstat and one realpath per asserted path; `caseKey` is linear in the path length.

### Reliability — CONCERNS

The mode-000 teardown crash (QA2-1). A detached grandchild can write after the check (CR-2), which is pre-existing on base and advisory.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 11 (`--sink path --entry 'shared/resources/security-probe.mjs#isCasePath'`; record `task.232.qa.2.security.run.json`), escaped 0.
- 6 hostiles rejected and 3 legitimates accepted. `encoded-traversal` and `symlink-escape` are accepted at this lexical layer by design, and both are contained downstream. This was checked through `compareExpected`, not only read:
  - The engine never decodes a path (no `decodeURI` or `unescape` in it), so `..%2f..%2fetc%2fpasswd` is a literal file inside the case directory and scores `was created` when planted there.
  - `uploads/link-to-etc/passwd`, with `link-to-etc` pointing outside, scores `an ancestor resolves outside the case directory`, for both `absent` and `removed`. The file outside was untouched.

### Maintainability — PASS

`caseKey` is the one case-path key for the grammar and the collision rule.

---

## Code Review

Advisory: the task does not set `code_review_blocking`. QA reproduced CR-1 and entered it as TASK-232-QA2-1.

**Correctness bugs (4):**

- [medium/high] `shared/resources/security-probe.mjs:1219` — QA1-4's "never a probe crash" is false end to end: the unchanged sandbox teardown throws EACCES on a mode-000 directory a run leaves → restore permissions before removal; test through the runner. **Entered as TASK-232-QA2-1.**
- [medium/medium] `shared/resources/security-probe.mjs:1193` — `removed` and `absent` are read once after `spawnSync` returns, and a detached grandchild can write afterwards (reproduced: the marker appeared after `runProbeSpec` returned) → run each case in its own process group and reap it first. Pre-existing on base for `absent`; recommended as a follow-up.
- [low/medium] `shared/resources/security-probe.mjs:1224` — a dangling outward ancestor symlink falls back to the lexical path and reads `missing`, not `outside` → check ancestors with `readlink`.
- [low/medium] `shared/resources/security-probe.mjs:2172` — `removed` may not name a directory the fixture creates only implicitly, so a cleanup that leaves `tmp/` behind passes → accept an ancestor directory of a created file.

**Cleanups (0).**

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full suite (`npm run ci`, symlink aside) | PASS, 6337 tests, 0 failed |
| `security-probe.test.mjs` | PASS, 263 |
| Mutations on the cycle 1 fixes | Q4 red (1), Q5 survives, Q6 red (9) |

---

## Test Artifacts

### Files Reviewed

`shared/resources/security-probe.mjs`, `shared/resources/tests/security-probe.test.mjs`, `shared/resources/probe-boundary-rule.md`, `CHANGELOG.md`, `shared/resources/tests/fixtures/security-probe/path-actions-lib.sh`.

### Test Commands Executed

```bash
command node shared/resources/security-probe.mjs --sink path --entry 'shared/resources/security-probe.mjs#isCasePath' --repo-root "$PWD" --record docs/tasks/task.232.probe-expected-path-assertions/task.232.qa.2.security.run.json --json
command node .agents/skills/qa-task/references/finding-anchors.js --findings-file qa2-findings.json --root "$PWD" --rev HEAD --json
command node t232-qa2-repro.mjs <engine>        # head and base: CR-1, CR-2
command node t232-qa2-mutate.mjs <worktree>     # Q4–Q6
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file shared/resources/probe-boundary-rule.md --diff-base 8ac12588 --json   # changed.total 0
```

### Coverage Report

Not measured (the repository has no coverage tooling for `shared/resources`).

---

## Recommendations

### Immediate Actions (Blocking)

1. Fix QA2-1 (teardown) and QA2-2 (fence test).

### Short-term Actions (Non-Blocking)

1. CR-2: reap each case's process group before the path assertions are read.
2. CR-3, CR-4 (low).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: All five cycle 1 findings are fixed and verified, and the boundary is now probed. Two medium findings remain, both on cycle 1's own fix for QA1-4.
**Quality Score**: 80/100
**Deployment Recommendation**: CONDITIONAL
**Conditions**: QA2-1 and QA2-2 fixed.

---

**QA Report**: co-located at `task.232.qa.2.probe-expected-path-assertions.md`
**Gate File**: co-located at `task.232.gate.2.probe-expected-path-assertions.yml`
**Next Steps**: qa-fix cycle 2, then QA cycle 3.

# QA Report: Task 232 - Probe expected.absent takes bare names; the rule doc says paths

**Task**: [Link to task document](./task.232.probe-expected-path-assertions.md)
**Gate File**: [task.232.gate.3.probe-expected-path-assertions.yml](./task.232.gate.3.probe-expected-path-assertions.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-25
**Testing Completed**: 2026-10-25
**Gate Status**: PASS

---

## Executive Summary

Cycle 3 reviewed the cycle 2 fix, scoped to the files changed since gate 2. Both cycle 2 findings are fixed and verified. The scoped review found four low findings, all advisory, and `isCasePath` re-probed clean.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Previous finding | Severity | Status | Verified by |
| --- | --- | --- | --- |
| TASK-232-QA2-1 — a mode-000 directory crashed the sandbox teardown | medium | ✅ FIXED | the cycle 2 repro now returns `cr1:rejected` and leaves no `/tmp/security-probe-*`; the runner test goes red with the plain `rmSync` restored (F1) |
| TASK-232-QA2-2 — the fence unreadable-side-effect rule had no test | medium | ✅ FIXED | the fence loop test passes and goes red under Q5 (F2) |

Bug reports 6 and 7 are closed.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing (`npm run ci`, 6339 tests, 0 failed, at `dda2cbd2`)
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#748, OPEN)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (`security-probe.test.mjs`, 265 tests)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review (`isCasePath` re-probed)
- [x] Code Review (scoped)

### Review Methodology

Direct tools, plus one read-only Explore reviewer for the scoped diff. It returned after 926.2 s (`duration_ms` from the completion notice). Its four findings were anchor-checked (all `ok`).

Re-review scope: files changed since gate 2 (head 07227d874af0; 3 code files) — default

---

## New Findings This Cycle

All four are low and advisory; none enters `top_issues`.

- **[low]** `shared/resources/security-probe.mjs:980` — the permission walk builds absolute paths, so a tree deeper than PATH_MAX hits ENAMETOOLONG and still ends the run. No regression: the old code crashed on EACCES. → make the walk best-effort.
- **[low]** `shared/resources/security-probe.mjs:977` — `chmodSync` follows symlinks, so a still-running process that swaps a directory for an outward symlink mid-walk could get a host directory chmodded. Low confidence; the same class as the detached-grandchild limit. → re-lstat and compare dev/ino.
- **[low]** `shared/resources/tests/security-probe.test.mjs:7481` — the QA2-1 test checks the results came back, not that the sandbox was removed. → assert that no new sandbox remains.
- **[low]** `shared/resources/tests/security-probe.test.mjs:7458` — under root the test returns early and reports a pass, not a skip. → `t.skip`.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Tests first | PASS | Verified | 2 more tests in cycle 2, each mutation-proved |
| Phase 2: Engine | PASS | Verified | `removeSandbox`, `caseKey`, the unreadable state and the export are in place |
| Phase 3: Docs, bundle, changelog | PASS | Verified | the CHANGELOG states the teardown; §5's "never a probe crash" now holds; bundle fresh |

**Overall Phase Completion**: 3/3 phases passed.

---

## Success Criteria Verification

**Functional Criteria:** unchanged from cycle 2, all PASS. The unreadable-path claim now holds through the runner as well as `compareExpected`.

**Performance Criteria:** not applicable, per § 8.

**Code Quality Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Each rule mutation-proved | yes | Q4, Q6, F1, F2 red | PASS | |
| `npm run ci` passes with `.agents/skills` aside | exit 0 | exit 0, 6339 tests | PASS | |
| `bundle:check` clean, no `UNREACHED` | clean | clean (128 skills) | PASS | |

---

## Breaking Changes Validation

Unchanged from cycle 1 (PASS). The teardown change alters no case outcome; it only stops a crash.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (4)

The four advisory findings above (code review CR-1 to CR-4).

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 4

---

## NFR Assessment

### Performance — PASS

The permission walk runs only when the first `rmSync` fails.

### Reliability — PASS

The teardown survives a mode-000 directory. The PATH_MAX depth (CR-1) and the swap race (CR-2) are advisory.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 11 (`--sink path`, record `task.232.qa.3.security.run.json`), escaped 0.
- The reviewer confirmed the new walk never chmods or follows an outward symlink (`outlink -> /etc` untouched).

### Maintainability — PASS

One helper owns sandbox removal.

---

## Code Review

Advisory: the task does not set `code_review_blocking`.

**Correctness bugs (2):**

- [low/medium] `shared/resources/security-probe.mjs:980` — ENAMETOOLONG past PATH_MAX in the permission walk → make it best-effort.
- [low/low] `shared/resources/security-probe.mjs:977` — `chmodSync` through a mid-walk symlink swap → re-lstat and compare dev/ino.

**Cleanups (2):**

- `shared/resources/tests/security-probe.test.mjs:7481` — assert that no sandbox remains after the QA2-1 run.
- `shared/resources/tests/security-probe.test.mjs:7458` — `t.skip` under root.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full suite (`npm run ci`, symlink aside) | PASS, 6339 tests, 0 failed |
| QA1 and QA2 tests | PASS, 4 |
| The cycle 2 repro | no throw, no leaked sandbox |

---

## Test Artifacts

### Files Reviewed

`shared/resources/security-probe.mjs`, `shared/resources/tests/security-probe.test.mjs`, `CHANGELOG.md`.

### Test Commands Executed

```bash
command node shared/resources/security-probe.mjs --sink path --entry 'shared/resources/security-probe.mjs#isCasePath' --repo-root "$PWD" --record docs/tasks/task.232.probe-expected-path-assertions/task.232.qa.3.security.run.json --json
command node --test --test-name-pattern 'QA2-|QA1-' shared/resources/tests/security-probe.test.mjs
command node t232-qa2-repro.mjs shared/resources/security-probe.mjs
command node .agents/skills/qa-task/references/finding-anchors.js --findings-file qa3-findings.json --root "$PWD" --rev HEAD --json
```

### Coverage Report

Not measured (no coverage tooling for `shared/resources`).

---

## Recommendations

### Immediate Actions (Blocking)

None.

### Short-term Actions (Non-Blocking)

1. CR-1 to CR-4 above.
2. Gate 2's CR-2 (pre-existing): reap each case's process group before the path assertions are read.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Every finding from cycles 1 and 2 is fixed and verified, the boundary is probed, and what remains is advisory.
**Quality Score**: 100/100
**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.232.qa.3.probe-expected-path-assertions.md`
**Gate File**: co-located at `task.232.gate.3.probe-expected-path-assertions.yml`
**Next Steps**: 5c PR conformance review.

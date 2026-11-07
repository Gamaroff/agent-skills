# QA Report: Task 285 - qa-fix Step 4 guard survives hostile paths

**Task**: [Link to task document](./task.285.qa-fix-step4-guard-hostile-paths.md)
**Gate File**: [task.285.gate.3.qa-fix-step4-guard-hostile-paths.yml](./task.285.gate.3.qa-fix-step4-guard-hostile-paths.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-07
**Testing Completed**: 2026-11-07
**Gate Status**: FAIL

---

## Executive Summary

Cycle 2's finding (T285-QA-2) is fixed. The safety re-probe found two more false-clean paths in the same parent walk: an early stop at the repository root skips an earlier symlink in the path, and a trailing slash hides a final symlink. Both were reproduced by the reviewer in bash and zsh. Three cycles have now found a leak in this one walk.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#856)

### Testing Approach

- [x] Automated Testing
- [x] Regression Testing
- [x] Security Review (probe engine, measured)
- [x] Code Review

### Review Methodology

Direct tools plus one read-only Explore subagent for the diff code review (Step 3b), run against the whole branch diff with a SAFETY RE-PROBE directive. The reviewer ran about 30 hostile-path scenarios against the extracted block in scratch repositories under bash and zsh.

Re-review scope: unscoped (judgement: the prior gate found a false clean in a safety guard, so the surface is searched again, not only the last fix). `qa-safety-clause1.sh` printed false.

CI on ff5413c4: not read this cycle; `npm run ci:fast` exit 0 on this head before the push.

Step 4b: not re-run; the changed block is refused by the snippet engine as in cycle 1 (heredoc, `xargs`), and the committed probe test plus the probe run execute it under bash and zsh.

Step 3c: the `MUTANTS` and `DIRECT_MUTANTS` tests apply each reversion in memory; nothing was mutated on disk.

---

## Re-Review Context

| Previous issue | Status |
| --- | --- |
| T285-QA-2 symlink to the repository root reads as clean | FIXED. `rootlink/real/new` is refused under bash and zsh; held by a case and a mutant. |

## New Findings This Cycle

- **[high]** `skills/qa-fix/SKILL.md:884` — the root stop precedes earlier symlinks in the path: `sub/out/<repo>/sub/new` and `sub/self/../real/new` read as clean (T285-QA-3).
- **[high]** `skills/qa-fix/SKILL.md:882` — a trailing slash means the final component is never examined: `link/` reads as clean where `link` is reported (T285-QA-4).
- **[medium]** `tests/qa-fix-step4-guard.test.js:567` — no scenario for either shape, so every test passed (T285-QA-5).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Reproduce both findings | PASS | Verified | |
| Phase 2: Close T268-QA-10 | PASS | Verified | |
| Phase 3: Close T268-QA-11 | CONCERNS | Verified | Two more symlink leaks in the parent walk |
| Phase 4: Hold every branch with a test | CONCERNS | Verified | Missing scenarios (T285-QA-5) |
| Phase 5: One description of the check | PASS | Verified | |

**Overall Phase Completion**: 5/5 delivered, 2 with a finding

---

## Success Criteria Verification

Unchanged except the criterion that a path below a symlinked directory is refused: it does not hold when the symlink is followed by a return to the root or by `..`, or when the path ends in a slash. Criteria drift: clean.

---

## Breaking Changes Validation

None.

---

## Issues Found

### HIGH Severity Issues (2)

**Issue: T285-QA-3, early root stop skips an earlier symlink**
- **Severity**: HIGH
- **Category**: Security (false clean)
- **Observation**: with `sub/out -> ../..`, `sub/out/<repo>/sub/new` exits 0 with no output; with `sub/self -> ../sub`, `sub/self/../real/new` does too.
- **Impact**: the guard reports an untracked file as absent.
- **Recommendation**: visit every parent; refuse a symlink whose containing directory is inside the repository; refuse `.git` only strictly below the root.

**Issue: T285-QA-4, trailing slash hides the final component**
- **Severity**: HIGH
- **Category**: Security (false clean)
- **Observation**: `link -> real`, untracked `real/new`, input `link/` exits 0 with no output; `link` is reported.
- **Recommendation**: strip trailing slashes before any check.

### MEDIUM Severity Issues (1)

**Issue: T285-QA-5, missing scenarios** — see New Findings.

**Total Issues**: HIGH: 2, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — CONCERNS
T285-QA-3 and T285-QA-4.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 34
- 17 cases under bash and zsh, 0 escaped. The corpus has no symlink case, which is how both leaks passed it.

### Maintainability — CONCERNS
Three cycles found a leak in the same walk. The fix applied alongside this gate removes the early stop that all three shared.

---

## Code Review

Reviewer: read-only Explore subagent over the whole branch diff, with the SAFETY RE-PROBE directive. It ran the block in scratch repositories and read the test file for vacuous tests.

**Correctness bugs (3):**
- [high/high] `skills/qa-fix/SKILL.md:884` — early root stop skips earlier symlinks → visit every parent (T285-QA-3). Anchor verified.
- [high/high] `skills/qa-fix/SKILL.md:882` — trailing slash hides the final component → strip trailing slashes (T285-QA-4). Anchor verified.
- [medium/medium] `tests/qa-fix-step4-guard.test.js:567` — missing scenarios and mutants (T285-QA-5).

Provenance: all three are new in this diff, not pre-existing.

**Cleanups (0).**

The `boundary` decision: `true`. `boundary_signals: ["refused", "is refused"]`.

---

## Regression Testing

`CI=true node --test tests/qa-fix-step4-guard.test.js`: 23 pass on the reviewed commit. `npm run ci:fast`: exit 0.

---

## Test Artifacts

### Files Reviewed
`skills/qa-fix/SKILL.md`, `tests/qa-fix-step4-guard.test.js`, the loop doc and its bundled copies, `CHANGELOG.md`, the task 268 and 285 documents.

### Test Commands Executed
```bash
CI=true node --test tests/qa-fix-step4-guard.test.js
command node shared/resources/security-probe.mjs --sink filename --entry 'fence:skills/qa-fix/SKILL.md#Step 4: Validate' --slot '{changed-paths}' --cases-file <cases.json> --repo-root <scratch worktree at the reviewed commit> --record task.285.qa.3.qa-fix-step4-guard-hostile-paths.security.run.json --json
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix T285-QA-3, T285-QA-4 and T285-QA-5.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: two reproduced false-clean paths in the same walk.
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED
**Conditions**: T285-QA-3, T285-QA-4 and T285-QA-5 fixed

---

**QA Report**: co-located at `task.285.qa.3.qa-fix-step4-guard-hostile-paths.md`
**Gate File**: co-located at `task.285.gate.3.qa-fix-step4-guard-hostile-paths.yml`
**Next Steps**: `/qa-fix`

# QA Report: Task 285 - qa-fix Step 4 guard survives hostile paths

**Task**: [Link to task document](./task.285.qa-fix-step4-guard-hostile-paths.md)
**Gate File**: [task.285.gate.2.qa-fix-step4-guard-hostile-paths.yml](./task.285.gate.2.qa-fix-step4-guard-hostile-paths.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-07
**Testing Completed**: 2026-11-07
**Gate Status**: FAIL

---

## Executive Summary

Cycle 1's finding (T285-QA-1) is fixed and held by two mutants. The refute pass found a new defect in the fix: the physical-path stop ends the walk at a symlink inside the repository that points at the repository root, so an untracked file reached through it reads as clean. High-confidence bug, promoted to the gate.

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

Direct tools plus one read-only Explore subagent for the diff code review (Step 3b). Cycle 2: the whole branch diff (1300 patch lines), reviewed to refute.

CI on 8b03b4a49d: not read this cycle (no new CI run awaited; `npm run ci:fast` exit 0 on this head, run before the push).

Step 4b: not re-run. The changed Step 4 block is refused by the snippet engine (the heredoc and `xargs`, fail-closed), as in cycle 1; the committed probe test and the probe run below execute it under bash and zsh.

Step 3c: the committed `MUTANTS` and `DIRECT_MUTANTS` tests apply each reversion in memory; the two new physical-comparison mutants pass (21 of 21). Nothing was mutated on disk.

Re-review scope: whole branch diff (cycle 2 refute pass).

---

## Re-Review Context

| Previous issue | Status |
| --- | --- |
| T285-QA-1 parent walk refuses `..` and symlinked-prefix paths | FIXED. `../real/g` from a subdirectory and an absolute path through a symlinked prefix are admitted; each has a committed case and a mutant. |

## New Findings This Cycle

- **[high]** `skills/qa-fix/SKILL.md:884` — the root stop precedes the symlink test, so `rootlink -> .` ends the walk and `rootlink/real/new` reads as clean → refuse a symlink whose own location is inside the repository (T285-QA-2).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Reproduce both findings | PASS | Verified | |
| Phase 2: Close T268-QA-10 | PASS | Verified | |
| Phase 3: Close T268-QA-11 | CONCERNS | Verified | A symlink to the repository root is not refused (T285-QA-2) |
| Phase 4: Hold every branch with a test | PASS | Verified | 21 tests, eight mutants |
| Phase 5: One description of the check | PASS | Verified | |

**Overall Phase Completion**: 5/5 delivered, 1 with a finding

---

## Success Criteria Verification

Unchanged from cycle 1 except the criterion that a path below a symlinked directory is refused: it does not hold for a symlink that resolves to the repository root (T285-QA-2). Criteria drift: clean.

---

## Breaking Changes Validation

None.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: T285-QA-2, symlink to the repository root reads as clean**
- **Severity**: HIGH
- **Category**: Security (false clean)
- **Observation**: with `rootlink -> .` and an untracked `real/new`, input `rootlink/real/new` exits 0 with no output under bash and zsh. `real/new` is refused. `git --literal-pathspecs ls-files --others -- rootlink/real/new` lists nothing, rc 0.
- **Impact**: the guard reports an untracked file as absent. The cycle-1 fix introduced it.
- **Recommendation**: when the directory resolves to the root and is a symlink, refuse the path if the link's own physical parent is inside the repository; otherwise break. Add a `rootlink` refused scenario and a mutant.

**Total Issues**: HIGH: 1, MEDIUM: 0, LOW: 0

---

## NFR Assessment

### Performance — PASS
Advisory CR-2: a subshell per parent, about 5 s for 2000 paths at depth 6. Not a defect at the real size of the list.

### Reliability — CONCERNS
T285-QA-2.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 34
- 17 cases under bash and zsh, 0 escaped. The corpus has no symlink-to-root case, which is how T285-QA-2 passed it.

### Maintainability — PASS
One description of the check; bundled copies in sync.

---

## Code Review

Reviewer: read-only Explore subagent over the whole branch diff, refute directive appended. It ran the block under bash and zsh in a scratch repository. The QA engineer reproduced CR-1 independently.

**Correctness bugs (1):**
- [high/high] `skills/qa-fix/SKILL.md:884` — the root stop precedes the `-L` test, so a symlink to the repository root ends the walk and the path reads as clean → refuse a symlink located inside the repository. Anchor verified. Promoted to the gate as T285-QA-2 (`code_review_blocking`). Provenance: introduced by the cycle-1 fix, not pre-existing.

**Cleanups (1):**
- `skills/qa-fix/SKILL.md:883` — a subshell per parent per path; memoise per distinct parent (about 5 s for 2000 paths). Advisory, kept in `recommendations.future`.

The `boundary` decision: `true`. `boundary_signals: ["refused", "is refused"]`.

---

## Regression Testing

`node --test tests/qa-fix-step4-guard.test.js` (CI=true): 21 pass, 0 fail. `npm run ci:fast`: exit 0 on this head.

---

## Test Artifacts

### Files Reviewed
`skills/qa-fix/SKILL.md`, `tests/qa-fix-step4-guard.test.js`, the loop doc and its bundled copies, `CHANGELOG.md`, the task 268 and 285 documents.

### Test Commands Executed
```bash
CI=true node --test tests/qa-fix-step4-guard.test.js
command node shared/resources/security-probe.mjs --sink filename --entry 'fence:skills/qa-fix/SKILL.md#Step 4: Validate' --slot '{changed-paths}' --cases-file <cases.json> --repo-root "$PWD" --record task.285.qa.2.qa-fix-step4-guard-hostile-paths.security.run.json --json
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix T285-QA-2.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: a high-confidence false-clean in the fix for cycle 1's finding.
**Quality Score**: 80/100

**Deployment Recommendation**: BLOCKED
**Conditions**: T285-QA-2 fixed

---

**QA Report**: co-located at `task.285.qa.2.qa-fix-step4-guard-hostile-paths.md`
**Gate File**: co-located at `task.285.gate.2.qa-fix-step4-guard-hostile-paths.yml`
**Next Steps**: `/qa-fix`

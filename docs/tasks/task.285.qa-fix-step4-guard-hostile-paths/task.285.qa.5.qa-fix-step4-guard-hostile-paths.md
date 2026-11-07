# QA Report: Task 285 - qa-fix Step 4 guard survives hostile paths

**Task**: [Link to task document](./task.285.qa-fix-step4-guard-hostile-paths.md)
**Gate File**: [task.285.gate.5.qa-fix-step4-guard-hostile-paths.yml](./task.285.gate.5.qa-fix-step4-guard-hostile-paths.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-07
**Testing Completed**: 2026-11-07
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 4's finding (T285-QA-6) is fixed. The third-strike replacement decides on physical identity instead of walking parents, and the whole symlink and nested-repository class from cycles 1 to 4 is now refused in bash and zsh. The safety re-probe found one narrower false clean, reproduced by QA: a tracked directory that contains a gitlink with an untracked file beneath it reads clean. It is rated high severity but medium confidence by the reviewer, so under the promotion rule it is advisory and does not enter `top_issues`.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

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

Direct tools plus one read-only Explore subagent for the diff code review (Step 3b), run against the whole branch diff with a SAFETY RE-PROBE directive. The reviewer ran about 150 path shapes against the extracted block in a scratch repository under bash and zsh, from the repository root, a subdirectory, a symlinked working directory and a worktree.

Re-review scope: unscoped (prior gate failed on a safety axis; `qa-safety-clause1.sh` printed false, so this is judgement). This is the last cycle of five.

CI on 4fc3b848: not read this cycle; `npm run ci:fast` exited 0 on this head before the push.

Step 4b: not re-run; the changed block is refused by the snippet engine as in cycle 1 (heredoc, `xargs`). The committed tests and the probe run execute it under bash and zsh.

Step 3c: the `MUTANTS` and `DIRECT_MUTANTS` tests apply each reversion in memory; nothing was mutated on disk.

---

## Re-Review Context

| Previous issue | Status |
| --- | --- |
| T285-QA-6 the path itself is never tested (gitlink root, tracked symlink) | FIXED. `smod`, `smod/`, `../smod` and the tracked-symlink inputs are refused in bash and zsh; held by scenarios and mutants. |
| CR-2 (cycle 4) tracked symlink to a directory with untracked files | FIXED by the same replacement. |
| CR-3 (cycle 4) external-symlink parent | Partly open: see CR-3 below. |

## New Findings This Cycle

- **[high severity / medium confidence, advisory]** `skills/qa-fix/SKILL.md:911` — the nested-repository probe asks git only about the path's own directory, so a tracked directory that contains a gitlink holding an untracked file reads clean (CR-1). QA reproduced it: with `pkg2/sm` a gitlink and `pkg2/sm/untr` untracked, `pkg2` and `pkg2/` exit 0 and `pkg2/sm` exits 1, in bash and zsh.
- **[medium/medium, advisory]** `skills/qa-fix/SKILL.md:903` — a legitimate absolute path that reaches a repository subdirectory through an external symlink is refused by git as outside the repository (CR-3). Not reproduced by QA. It fails loud, so it is safe.
- **[low/low, advisory]** `skills/qa-fix/SKILL.md:903` — with TOP equal to `/` the inside pattern becomes `//*` and the check is disabled (CR-2). Not reproduced; a repository at the filesystem root was not available.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Reproduce both findings | PASS | Verified | |
| Phase 2: Close T268-QA-10 | PASS | Verified | |
| Phase 3: Close T268-QA-11 | CONCERNS | Verified | A directory over a gitlink is not looked beneath (CR-1) |
| Phase 4: Hold every branch with a test | PASS | Verified | 37 tests |
| Phase 5: One description of the check | PASS | Verified | |

**Overall Phase Completion**: 5/5 delivered, 1 with an advisory finding

---

## Success Criteria Verification

Unchanged. The criterion that a path below a nested repository is refused holds for a path below a nested repository and for the nested repository's own root. It does not hold for a directory above a gitlink (CR-1), which the criterion text does not name. Criteria drift: clean.

---

## Breaking Changes Validation

None.

---

## Issues Found

### HIGH Severity Issues (0)

None promoted. CR-1 is high severity at medium confidence and so stays advisory under the promotion rule (bug and high confidence). Its original ratings are unchanged and it is recorded in the gate's `recommendations.future`.

### MEDIUM Severity Issues (0)

### LOW Severity Issues (0)

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0 in the gate; three advisories above.

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — PASS
37 of 37 tests pass with `CI=true`.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 34
- 17 cases under bash and zsh, 0 escaped. The corpus has no gitlink-under-a-directory case, which is how CR-1 passed it.

### Maintainability — CONCERNS
The parent walk is replaced, which ends the cycle-by-cycle pattern for symlinks. A directory above a gitlink is still an input the guard does not look beneath.

---

## Code Review

Reviewer: read-only Explore subagent over the whole branch diff, with the SAFETY RE-PROBE directive.

**Correctness bugs (3):**
- [high/medium] `skills/qa-fix/SKILL.md:911` — a directory above a gitlink with an untracked file reads clean → refuse a gitlink beneath a changed directory (CR-1). Anchor verified. Reproduced by QA.
- [medium/medium] `skills/qa-fix/SKILL.md:903` — external-symlink absolute path to a subdirectory refused by git (CR-3). Anchor verified. Advisory.
- [low/low] `skills/qa-fix/SKILL.md:903` — TOP of `/` disables the check (CR-2). Anchor verified. Advisory.

Provenance: all three are new in this diff, not pre-existing.

**Cleanups (0).**

The `boundary` decision: `true`. `boundary_signals: ["refused", "is refused"]`.

---

## Regression Testing

`CI=true node --test tests/qa-fix-step4-guard.test.js`: 37 pass, 0 fail on the reviewed commit. `npm run ci:fast`: exit 0.

---

## Test Artifacts

### Files Reviewed
`skills/qa-fix/SKILL.md`, `tests/qa-fix-step4-guard.test.js`, the loop doc and its bundled copies, `CHANGELOG.md`, the task 268 and 285 documents.

### Test Commands Executed
```bash
CI=true node --test tests/qa-fix-step4-guard.test.js
command node shared/resources/security-probe.mjs --sink filename --entry 'fence:skills/qa-fix/SKILL.md#Step 4: Validate' --slot '{changed-paths}' --cases-file <cases.json> --repo-root <repository root at the reviewed commit> --record task.285.qa.5.qa-fix-step4-guard-hostile-paths.security.run.json --json
```

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. CR-1: refuse or flag a gitlink beneath a changed directory, with a scenario and a mutant.
2. CR-3 and CR-2: rewrite to the physical spelling or document, and compare against the root without its trailing slash.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: the mechanism is replaced and the class it struck four times is closed; one narrower reproduced false clean (CR-1) is advisory by the promotion rule.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 accepted as a known residual or fixed in a follow-up task

---

**QA Report**: co-located at `task.285.qa.5.qa-fix-step4-guard-hostile-paths.md`
**Gate File**: co-located at `task.285.gate.5.qa-fix-step4-guard-hostile-paths.yml`
**Next Steps**: 5c `/review-pr`, then `/finalise`

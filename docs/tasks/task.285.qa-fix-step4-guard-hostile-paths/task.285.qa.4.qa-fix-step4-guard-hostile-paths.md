# QA Report: Task 285 - qa-fix Step 4 guard survives hostile paths

**Task**: [Link to task document](./task.285.qa-fix-step4-guard-hostile-paths.md)
**Gate File**: [task.285.gate.4.qa-fix-step4-guard-hostile-paths.yml](./task.285.gate.4.qa-fix-step4-guard-hostile-paths.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-07
**Testing Completed**: 2026-11-07
**Gate Status**: FAIL

---

## Executive Summary

Cycle 3's findings (T285-QA-3, T285-QA-4, T285-QA-5) are fixed. The safety re-probe found the same class once more: the parent walk starts at the parent of each path and never tests the path itself, so a nested repository root (a gitlink) with an untracked file inside reads as clean. The reviewer reproduced it, and QA reproduced it again in bash and zsh. Four cycles have now found a false clean in this one walk.

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

Direct tools plus one read-only Explore subagent for the diff code review (Step 3b), run against the whole branch diff with a SAFETY RE-PROBE directive. The reviewer ran about 110 path shapes against the extracted block in a scratch repository under bash and zsh; results were identical in both shells.

Re-review scope: unscoped (judgement: the prior gate found a false clean in a safety guard, so the surface is searched again, not only the last fix). `qa-safety-clause1.sh` printed false.

CI on 1d543eed: not read this cycle; `npm run ci:fast` exit 0 on this head before the push.

Step 4b: not re-run; the changed block is refused by the snippet engine as in cycle 1 (heredoc, `xargs`), and the committed probe test plus the probe run execute it under bash and zsh.

Step 3c: the `MUTANTS` and `DIRECT_MUTANTS` tests apply each reversion in memory; nothing was mutated on disk.

---

## Re-Review Context

| Previous issue | Status |
| --- | --- |
| T285-QA-3 early root stop skips an earlier symlink | FIXED. `sub/out/<repo>/sub/new` and `sub/self/../real/new` are refused under bash and zsh; held by scenarios and mutants. |
| T285-QA-4 trailing slash hides the final component | FIXED. `link/` is reported where `link` is. |
| T285-QA-5 missing scenarios | FIXED. Four refused scenarios, each with a mutant. |

## New Findings This Cycle

- **[high]** `skills/qa-fix/SKILL.md:888` — the walk never tests the changed path itself: a gitlink or nested repository root with an untracked file inside reads clean (T285-QA-6).
- **[medium, advisory]** `skills/qa-fix/SKILL.md:888` — a tracked symlink to a directory holding an untracked file reads clean for `tl`, `tl/` and `tl2`, while `tl/new` is refused (CR-2). Same cause as T285-QA-6.
- **[low, advisory]** `skills/qa-fix/SKILL.md:889` — an absolute path through an external symlink back into the repository is stopped only by git's own fatal, with no test and prose that says such links are admitted (CR-3).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Reproduce both findings | PASS | Verified | |
| Phase 2: Close T268-QA-10 | PASS | Verified | |
| Phase 3: Close T268-QA-11 | CONCERNS | Verified | The path itself is not tested |
| Phase 4: Hold every branch with a test | PASS | Verified | |
| Phase 5: One description of the check | PASS | Verified | |

**Overall Phase Completion**: 5/5 delivered, 1 with a finding

---

## Success Criteria Verification

Unchanged except the criterion that a path below a nested repository is refused: it does not hold when the path is the nested repository's root itself. Criteria drift: clean.

---

## Breaking Changes Validation

None.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: T285-QA-6, the path itself is never tested**
- **Severity**: HIGH
- **Category**: Security (false clean)
- **Observation**: with `smod` a tracked gitlink holding untracked `smod/untrackedInSub`, the inputs `smod`, `smod/` and `../smod` exit 0 with no output in bash and zsh. `smod/x` is refused. QA reproduced it in a scratch repository.
- **Impact**: the guard reports an untracked file as absent.
- **Recommendation**: test the symlink and `.git` conditions on the path itself as well as its parents.

**Total Issues**: HIGH: 1, MEDIUM: 0, LOW: 0 (CR-2 medium and CR-3 low are advisory and are not in the gate)

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — CONCERNS
T285-QA-6.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 34
- 17 cases under bash and zsh, 0 escaped. The corpus has no gitlink or tracked-symlink case, which is how this passed it.

### Maintainability — CONCERNS
Four cycles found a false clean in the same text-based walk, each in the neighbour of the shape the previous fix closed.

---

## Code Review

Reviewer: read-only Explore subagent over the whole branch diff, with the SAFETY RE-PROBE directive. It ran about 110 shapes in a scratch repository.

**Correctness bugs (3):**
- [high/high] `skills/qa-fix/SKILL.md:888` — the walk never tests the path itself → test it (T285-QA-6). Anchor verified. Reproduced by QA.
- [medium/medium] `skills/qa-fix/SKILL.md:888` — a tracked symlink to a directory with untracked files reads clean → same fix (CR-2). Anchor verified. Advisory: medium confidence does not gate.
- [low/medium] `skills/qa-fix/SKILL.md:889` — external-symlink parent has no test of its own (CR-3). Anchor verified. Advisory.

Provenance: all three are new in this diff, not pre-existing.

**Cleanups (0).**

The `boundary` decision: `true`. `boundary_signals: ["refused", "is refused"]`.

---

## Regression Testing

`CI=true node --test tests/qa-fix-step4-guard.test.js`: 30 pass, 0 fail on the reviewed commit. `npm run ci:fast`: exit 0.

---

## Test Artifacts

### Files Reviewed
`skills/qa-fix/SKILL.md`, `tests/qa-fix-step4-guard.test.js`, the loop doc and its bundled copies, `CHANGELOG.md`, the task 268 and 285 documents.

### Test Commands Executed
```bash
CI=true node --test tests/qa-fix-step4-guard.test.js
command node shared/resources/security-probe.mjs --sink filename --entry 'fence:skills/qa-fix/SKILL.md#Step 4: Validate' --slot '{changed-paths}' --cases-file <cases.json> --repo-root <repository root at the reviewed commit> --record task.285.qa.4.qa-fix-step4-guard-hostile-paths.security.run.json --json
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix T285-QA-6, folding in CR-2 and CR-3.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one reproduced false-clean path in the same walk.
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED
**Conditions**: T285-QA-6 fixed

---

**QA Report**: co-located at `task.285.qa.4.qa-fix-step4-guard-hostile-paths.md`
**Gate File**: co-located at `task.285.gate.4.qa-fix-step4-guard-hostile-paths.yml`
**Next Steps**: `/qa-fix`

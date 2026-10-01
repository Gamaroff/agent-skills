# QA Report: Task 172 - One docs-only CI rule at every pipeline CI wait

**Task**: [Link to task document](./task.172.ci-docs-only-tree-equivalence.md)
**Gate File**: [task.172.gate.5.ci-docs-only-tree-equivalence.yml](./task.172.gate.5.ci-docs-only-tree-equivalence.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-01
**Testing Completed**: 2026-10-01
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 4's two findings are fixed and mutation-proven, and the 6c poll now re-asks while a nearer ancestor is undecided. The scoped review found no HIGH defect and three MEDIUM ones, all reproduced by execution and all in how `skills-config.yaml` is read: a leading BOM defeats the parse when anything precedes `ci`, rows the parse does not consume are dropped silently, and the new mode check is anchored to a different directory than the read it guards.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Cycle 4 finding | Status | Evidence |
| --- | --- | --- |
| CR4-1 poll latches a not-final `code-changed` | FIXED | engine reports `no-green-ancestor` behind an undecided ancestor; real-poll test asks twice; three mutants red |
| CR4-2 config that parses to nothing / symlink | FIXED | refused with exit 2; mode 120000 and 160000 refused; mutants red. New findings in the same area: CR5-1, CR5-2, CR5-3 |
| Documentation drift (LOW) | FIXED | counts removed, lists corrected |

---

## Testing Scope

### Prerequisites Verified

- [x] Task document, phases 4/4, PR 543 open at the cycle 4 fix commit
- [x] 87 engine tests pass, also under `TMPDIR=/tmp`; `validate` passes for finalise, develop-batch and develop-next
- [x] Fast gate on the fix commit: 4,901 of 4,903; the two failures are file-time budgets (`tests/test-clean-checkout.test.js`, `tests/bundle-missing-source.test.js`), both over budget on a pristine checkout of `HEAD` at load 8 (10.9 s and 11.5 s)

### Review Methodology

Re-review scope: default, files changed since gate 4's head (`e8104ece`, an ancestor of HEAD); no refute pass (cycle 5); no safety re-probe (gate 4: security CONCERNS with `reasoned` evidence, no HIGH open, not FAIL). One independent read-only Explore reviewer on the scoped patch with the cycle's delta named as the focus (about 5 minutes). Step 4b over `skills/finalise/SKILL.md`: 36 bash blocks, 0 runnable, 2 placeholder, 34 mutating; `zero-blocks-executed` is reported as the engine emits it. The changed prose in that file is a comment inside the 6c poll heredoc, which the repository's poll tests extract and run (three poll tests, including the new one).

---

## New Findings This Cycle

- **[medium]** a leading BOM defeats the parse when anything precedes `ci` (CR5-1), reproduced.
- **[medium]** rows the parse does not consume are dropped silently (CR5-2), reproduced.
- **[medium]** the mode check is anchored to the working directory, the read to the repository root (CR5-3), reproduced; a regression from cycle 4's fix, latent because no skill passes `--workspace-root`.
- **[low, cleanup]** a CANCELLED nearer ancestor is counted as undecided although a cancel-in-progress run never turns green (review CR-5), in the gate's `recommendations.future`.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: glob-match | PASS | unchanged |
| Phase 2: the engine | CONCERNS | CR5-1, CR5-2, CR5-3 |
| Phase 3: call sites | PASS | the 6c latch is now correct (CR4-1) |
| Phase 4: config and docs | PASS | drift fixed |

---

## Issues Found

### MEDIUM Severity Issues (3)

- **CR5-1**: [task.172.bug.21.bom-defeats-the-config-parse.md](./task.172.bug.21.bom-defeats-the-config-parse.md)
- **CR5-2**: [task.172.bug.22.unconsumed-config-rows-are-dropped.md](./task.172.bug.22.unconsumed-config-rows-are-dropped.md)
- **CR5-3**: [task.172.bug.23.config-ls-tree-anchored-to-cwd.md](./task.172.bug.23.config-ls-tree-anchored-to-cwd.md)

### LOW Severity Issues (1)

- A cancelled nearer ancestor is re-asked for the whole poll; in the gate's `recommendations.future`.

**Total Issues**: HIGH: 0, MEDIUM: 3, LOW: 1

---

## NFR Assessment

### Performance — PASS
### Reliability — PASS
Cycle 4's poll finding is fixed and held by a test that runs the real poll.
### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: reasoned
- **Probes executed**: 0
- Each finding is an owner opt-out the engine can ignore. All three were reproduced by direct execution of the exported readers. No corpus sink models this predicate.

### Maintainability — CONCERNS
Five cycles have closed configuration-parse fallbacks one spelling at a time (cycle 1 CR-1, cycle 3 CR3-3, cycle 4 CR4-2, now CR5-1 and CR5-2). The structural move is one completeness check: the parse must account for every significant row or the file is refused.

---

## Code Review

**Correctness bugs (4):** CR5-1 (the reviewer's CR-1 and CR-4, one root cause), CR5-2, CR5-3, all in the gate, reproduced. **Cleanups (1):** the CANCELLED ancestor (advisory).

Provenance: all in code this branch added; CR5-3 was introduced by cycle 4's fix itself.
mutation-proven: remove the undecided-ancestor branch → three CR4-1 tests → covered
mutation-proven: remove the significance check → the CR4-2 parse test → covered
mutation-proven: remove the git mode check → the symlink test → covered
mutation-proven: remove the lstat check → the symlink test → covered
Each proof was run by the fix cycle and re-read here; none was re-run by this cycle, so the proof is the fix cycle's, not an independent one.

---

## Regression Testing

- 87 engine tests pass under both temp values.
- Fast gate: 4,901 of 4,903; the two failures are file-time budgets that also fail on a pristine `HEAD` at this host's load.
- Hosted CI at the cycle 3 head had `link-check` red (fixed in cycle 4); CI on the cycle 4 head is read once, at `/finalise`.

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix CR5-1, CR5-2 and CR5-3, each with a test that is red on revert; for CR5-2 prefer one completeness check over another spelling.

### Short-term Actions (Non-Blocking)
1. Treat a CANCELLED nearer ancestor as final, or document that it is re-asked.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: no HIGH open; three reproduced MEDIUM findings remain, all in reading the configuration.
**Quality Score**: 70/100

**Deployment Recommendation**: CONDITIONAL

---

**QA Report**: co-located at `task.172.qa.5.ci-docs-only-tree-equivalence.md`
**Gate File**: co-located at `task.172.gate.5.ci-docs-only-tree-equivalence.yml`
**Next Steps**: qa-fix cycle 5, then the loop-limit half-cycle gate

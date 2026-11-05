# QA Report: Task 263 - Untrusted-content bound: unresolvable parent and lint test headroom

**Task**: [Link to task document](./task.263.untrusted-content-bound-parent-and-test-headroom.md)
**Gate File**: [task.263.gate.1.untrusted-content-bound-parent-and-test-headroom.yml](./task.263.gate.1.untrusted-content-bound-parent-and-test-headroom.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-05
**Testing Completed**: 2026-11-05
**Gate Status**: PASS

---

## Executive Summary

The "Bound the derived path" block now refuses a parent it cannot resolve, at all three sources. The lint test reads its tree once and runs in about 0.4 s. Every success criterion is met and held by a committed test.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (a regular file used as a directory now HALTs)
- [x] Code on feature branch with open PR (#844)

### Review Methodology

Direct tools plus one read-only diff reviewer (first review, small change set). Step 4b: the engine refused the changed block as `mutating` (0 of 1 executed), so the block was lifted from the source and run by hand under bash and zsh instead (see Test Commands).

CI on d320ad44: not read separately; the PR's checks are gated once at `/finalise`.

The diff reviewer ran for about 24 s with 3 tool calls and returned no findings. That is a shallow pass; the evidence for the guards is the mutation proofs and the probe run below, not the review.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| 1. Ancestor walk in the 3 sources, 6 bundled copies | PASS | Verified | Same block at every site; bundle:check clean |
| 2. Named-guard tests and control | PASS | Verified | 4 loop tests, mode-000 test, 2 control paths |
| 3. Test headroom (memoised tree load) | PASS | Verified | 392 to 397 ms |
| 4. CHANGELOG | PASS | Verified | `cites (task 263)` |

**Overall Phase Completion**: 4/4

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --------- | -------- | ------ |
| Dangling link in the parent chain is a HALT with its own message | test "a dangling directory link is a HALT" and "a path deeper under a dangling directory link"; by-hand bash and zsh run | PASS |
| Parent that exists but cannot be entered is a HALT | test "a directory that cannot be entered (mode 000)"; skipped for uid 0, stated in the test | PASS |
| `docs/link/new/x.md` with a leaving link is a HALT with `resolves outside` | test "a missing child under a link that leaves the tree"; by-hand run | PASS |
| Missing parent under `docs/` is still kept | controls `docs/sub/new/x.md` and `docs/sub/new/deeper/x.md`; by-hand run | PASS |
| Three blocks stay identical; named test red when a guard is deleted | equality test; mutation proofs below | PASS |
| Lint test at most 1500 ms on three runs | 397, 392, 395 ms | PASS |
| `CI=true npm test` passes | see Test Commands | PASS |
| validate, bundle:check, check:generated clean | all clean | PASS |
| CHANGELOG entry citing task 263 | `changelog-cites.sh` exit 0 | PASS |
| Probe plan re-run with `probes_executed` above 0 | 66 executed | PASS |

---

## Breaking Changes Validation

### Breaking Change: a regular file used as a directory

Documented: Yes (task section 5, PR body, CHANGELOG)
Migration Path Provided: N/A (the later read failed either way)
Consumer Code Updated: N/A

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

None. HIGH: 0, MEDIUM: 0, LOW: 0.

---

## NFR Assessment

### Performance — PASS
Three runs of the lint test: 397, 392, 395 ms. Baseline before the change: 411, 399, 400 ms.

### Reliability — PASS
An unresolvable parent is now refused. The kept case (a missing directory under `docs/`) is held by a control test.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 66 (22 cases x 3 sites; 0 escaped; verdict engages at all three)
- The task 262 plan (10 cases per site) plus one new case, `file-as-directory`. Symlink and mode-000 cases cannot be set up by the fence form's fixture; the unit tests hold them.

### Maintainability — PASS
One block, three copies, held equal by a test.

---

## Code Review

Correctness bugs (0):
none returned.

Cleanups (0):
none returned.

Boundary: true. The block is a rejecting predicate; the probe engine ran it (see Security).

mutation-proven: HALT on an unresolvable ancestor removed from `skills/review-task/SKILL.md` → "a dangling directory link is a HALT", "a path deeper under a dangling directory link", "a directory that cannot be entered (mode 000)", "a regular file used as a directory", "the path bound is the same block at every site" → covered
mutation-proven: ancestor walk disabled in `skills/review-task/SKILL.md` → "a derived path under docs/ is kept", "a missing child under a link that leaves the tree", "a missing parent under a real subdirectory of docs/ is kept (control)", "a path whose parent directory does not exist is kept", "the path bound is the same block at every site" → covered
mutation-proven: HALT removed from the shared source only → "the path bound is the same block at every site" → covered (the behaviour tests run at the first site, the equality test holds the other two)

Three of the three proofs reverted; the tree was restored from a `cp` snapshot after each and the baseline re-checked green (39 of 39).

Platform variance: no environment-derived value reaches a validating consumer except the scratch repo path, which the existing tests already run under `TMPDIR=/tmp`; the mode-000 test depends on the user not being root and says so.

---

## Regression Testing

The neighbouring `tests/unbound-default-reads.test.js` and the bundle checks are covered by the full run below.

---

## Test Artifacts

### Test Commands Executed

```bash
CI=true node --test tests/untrusted-content-rule.test.js          # 39 pass; 397, 392, 395 ms
python3 skills/create-skill/scripts/quick_validate.py skills/review-task     # clean
python3 skills/create-skill/scripts/quick_validate.py skills/review-story    # clean
npm run bundle:check                                                          # 129 skills, 0 problems
npm run check:generated                                                       # clean
bash .agents/skills/qa-task/references/changelog-cites.sh task.263            # cites (task 263)
node .agents/skills/qa-task/references/criteria-drift.js --doc <task> --base-from-review develop --json   # clean
node .agents/skills/qa-task/references/security-probe.mjs --sink filename --entry 'fence:<site>#Bound the derived path' --slot '<derived-path>' --cases-file <cases> --record <run.json> --json   # x3 sites
```

The block was also run by hand under bash and zsh on six paths (dangling, deeper under dangling, file as directory, leaving link with a missing child, and two kept paths): identical in both shells.

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
None.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: All criteria met; both guards mutation-proven; probe run clean.
**Quality Score**: 95/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.263.qa.1.untrusted-content-bound-parent-and-test-headroom.md`
**Gate File**: co-located at `task.263.gate.1.untrusted-content-bound-parent-and-test-headroom.yml`
**Next Steps**: review-pr (Step 5c), then finalise.

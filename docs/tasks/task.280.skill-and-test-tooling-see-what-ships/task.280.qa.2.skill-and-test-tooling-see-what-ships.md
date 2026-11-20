# QA Report: Task 280 - Skill and test tooling see what ships

**Task**: [Link to task document](./task.280.skill-and-test-tooling-see-what-ships.md)
**Gate File**: [task.280.gate.2.skill-and-test-tooling-see-what-ships.yml](./task.280.gate.2.skill-and-test-tooling-see-what-ships.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-18
**Testing Completed**: 2026-11-18
**Gate Status**: CONCERNS

---

## Executive Summary

Re-review of PR 919 at head f2547a6a7. Cycle 1's finding is fixed and proven by a red-on-mutation test. The refute pass found one new defect in that fix, reproduced by QA. The gate stays at CONCERNS.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL on fixing T280-CR-2

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only Explore reviewer, run as the cycle 2 refute pass over the whole branch diff (798 lines, non-docs, minus the regenerated copies). Diff review: code review. Step 4b: not applicable this cycle, since no `SKILL.md` or shared prompt changed after gate 1.

Re-review scope: unscoped (cycle 2 is always a whole-branch refute pass).

CI_SUMMARY: CI on f2547a6a7dad: pending (nothing recorded in the gate; `/finalise` reads CI once on the final commit).

The reviewer's anchor for its finding (`bundle_skill.py:93`) matched the source text, so no anchor was unverified.

---

## Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| T280-CR-1 trailing sentence dot captured | FIXED | `invoked_name()` at both sites; `tests/bundle-check-mode.test.js` dotted case and spaced control; mutation (helper made a no-op) turned only the dotted case red, restored byte-identical (`cmp` silent) |

## New Findings This Cycle

- **[medium/high]** `skills/create-skill/scripts/bundle_skill.py:93` — an all-dots capture other than `..` (for example an ellipsis) is kept and then reported as UNVENDORED, which a bundle run cannot clear → return None for an all-dots capture and skip it in both callers. Reproduced by QA (see Issues Found).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: quote lint and fence balance | PASS | green | unchanged since gate 1 |
| Phase 2: one reader and ratchet | PASS | green | unchanged since gate 1 |
| Phase 3: bundle discovery | CONCERNS | bundle-check-mode 51/51 | CR-1 fixed; CR-2 open |
| Phase 4 | dropped | n/a | already on develop |
| Phase 5: bundle and sweep | PASS | `bundle -- --check` 129 skills, 0 problems | |

**Overall Phase Completion**: 4/4 live phases implemented; Phase 3 has one open bug.

---

## Success Criteria Verification

Evidence is as in [QA report 1](./task.280.qa.1.skill-and-test-tooling-see-what-ships.md). Nothing in the criteria changed (criteria drift: clean), and the code changed only in `invoked_name` and its two tests.

| Criterion | Status | Evidence this cycle |
| --- | --- | --- |
| Each check fails on its defect and passes its control | PASS | the new dotted case and control are committed tests |
| `bundle -- --check` 0 problems; npm test passes | PASS | 0 problems; `npm run ci:fast` on the server: 8589 tests, 0 failed |
| Each check has a mutation proof | PASS | proofs from gate 1 stand; the cycle 1 fix has its own (above) |
| CHANGELOG cites the task | PASS | `changelog-cites.sh` prints `cites (task 280)` |
| Wall time within 10% of develop | PASS on the bound | unchanged; method deviation stated in report 1 |

---

## Issues Found

### MEDIUM Severity Issues (1)

**T280-CR-2 — all-dots capture other than `..` is kept**
- **Severity**: MEDIUM; reviewer confidence high; origin: code-review, reproduced by QA.
- **Reproduction**: a fixture skill whose own `references/own.md` says "See .agents/skills/fx/references/... in the bundle" with `helper.sh` in `shared/resources`. `skill_owned_invocations` returned `('references/own.md', '...')`. The control doc naming `helper.sh` returned `helper.sh`. The reviewer ran it end to end: `--check` reports `UNVENDORED references/...`, and a full bundle does not clear it.
- **Provenance**: new code (`invoked_name` is the cycle 1 fix), not pre-existing.
- **Location**: `skills/create-skill/scripts/bundle_skill.py:93`, with the callers at `:626` and `:751`.
- **Recommendation**: return None for an all-dots capture, skip it in both callers, keep the `..` refusal test, add a `...` fixture test with its control.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

Performance, Reliability, Maintainability: PASS (unchanged).

### Security — PASS
- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0 (boundary: false; the helpers are discovery code whose result fails a bundle check, not an accept-or-reject gate on untrusted input)
- Candidates named: `invoked_name`, `skill_owned_invocations`. Criteria boundary signals: none.

---

## Code Review

**Correctness bugs (1):**
- [medium/high] `skills/create-skill/scripts/bundle_skill.py:93` — all-dots capture kept, reported UNVENDORED → return None and skip. **Promoted to the gate as T280-CR-2 (reproduced by QA).**

**Cleanups (0).**

The reviewer also ran identity probes: `x.sh..` and `a.b.sh.` strip correctly and vendor; `references/.` and `references/..` are skipped. Gate 1's advisory items CR-2 to CR-5 stay in `recommendations.future`.

mutation-proven: `invoked_name` made a no-op → `tests/bundle-check-mode.test.js` sentence-final dot case → covered (control passed; run before commit f2547a6a7 on the same bytes)

---

## Regression Testing

`npm run ci:fast` on the server for the fixed code: 8589 tests, 0 failed. `bundle -- --check`: 129 skills, 0 problems.

---

## Test Artifacts

```bash
CI=true npm run test:remote -- --run ci:fast
CI=true command node --test tests/bundle-check-mode.test.js
npm run validate -- skills/create-skill/
npm run bundle -- --check
```

`npm run validate -- skills/create-skill/` passed. No other skill changed outside regenerated copies.

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix T280-CR-2.

### Short-term Actions (Non-Blocking)
1. Gate 1 CR-2 to CR-5, listed in the gate.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one reproduced medium defect in the cycle 1 fix; everything else evidenced.
**Quality Score**: 92/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: fix T280-CR-2.

---

**QA Report**: co-located at `task.280.qa.2.skill-and-test-tooling-see-what-ships.md`
**Gate File**: co-located at `task.280.gate.2.skill-and-test-tooling-see-what-ships.yml`
**Next Steps**: qa-fix cycle for T280-CR-2, then re-review.

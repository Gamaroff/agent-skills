# QA Report: Task 280 - Skill and test tooling see what ships

**Task**: [Link to task document](./task.280.skill-and-test-tooling-see-what-ships.md)
**Gate File**: [task.280.gate.3.skill-and-test-tooling-see-what-ships.yml](./task.280.gate.3.skill-and-test-tooling-see-what-ships.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-18
**Testing Completed**: 2026-11-18
**Gate Status**: PASS

---

## Executive Summary

Re-review of PR 919 at head 0f17b3e62. Cycle 2's finding is fixed and proven by a red-on-mutation test. The scoped review of the fix returned one low-confidence edge, reproduced and traced to the unchanged regex, so it is a follow-up. No open finding.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only Explore reviewer over the files changed since gate 2 (`bundle_skill.py`, `tests/bundle-check-mode.test.js`; 271-line patch). Diff review: code review. Step 4b: not applicable, no `SKILL.md` or shared prompt changed since gate 2.

Re-review scope: files changed since gate 2 (head f2547a6a7dad; 2 code files) — default.

CI_SUMMARY: CI on 0f17b3e62d70: pending (nothing recorded in the gate; `/finalise` reads CI once on the final commit).

The reviewer's anchor `bundle_skill.py:632` matched the source text.

---

## Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| T280-CR-2 all-dots capture reported UNVENDORED | FIXED | `skill_owned_invocations` skips an all-dots capture; `tests/bundle-check-mode.test.js` ellipsis case and real-name control; mutation (skip disabled) turned only the ellipsis case red, restored byte-identical (`cmp` silent) |

## New Findings This Cycle

- **[low/low]** `skills/create-skill/scripts/bundle_skill.py:632` — a nested invocation path captures only its first segment, and the existence check passes on the directory. Reproduced by QA (`skill_owned_invocations` returned `('references/d.md', 'sub')`); the control returned `x.sh`. The regex is unchanged by this PR, and a search of every `SKILL.md` and shared resource found 0 nested invocation paths. Provenance: pre-existing limit of the regex, so it goes to `recommendations.future` and not to `top_issues`.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: quote lint and fence balance | PASS | green | unchanged since gate 1 |
| Phase 2: one reader and ratchet | PASS | green | unchanged since gate 1 |
| Phase 3: bundle discovery | PASS | bundle-check-mode 53/53 | cycle 1 and 2 defects fixed |
| Phase 4 | dropped | n/a | already on develop |
| Phase 5: bundle and sweep | PASS | `bundle -- --check` 129 skills, 0 problems | |

**Overall Phase Completion**: 4/4 live phases implemented and passing.

---

## Success Criteria Verification

Evidence is as in [QA report 1](./task.280.qa.1.skill-and-test-tooling-see-what-ships.md) and [QA report 2](./task.280.qa.2.skill-and-test-tooling-see-what-ships.md). Criteria drift: clean. Code changed since gate 2 only in `skill_owned_invocations` and its two tests.

| Criterion | Status | Evidence this cycle |
| --- | --- | --- |
| Each check fails on its defect and passes its control | PASS | ellipsis and dotted-name cases each have a committed control |
| `bundle -- --check` 0 problems; npm test passes | PASS | 0 problems; `npm run ci:fast` on the server: 8591 tests, 0 failed |
| Each check has a mutation proof | PASS | gate 1 proofs stand; cycle 1 and 2 fixes each have one |
| CHANGELOG cites the task | PASS | `cites (task 280)` |
| Wall time within 10% of develop | PASS on the bound | unchanged; method deviation stated in report 1 |

---

## Issues Found

No open issues. **Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0.

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
- [low/low] `skills/create-skill/scripts/bundle_skill.py:632` — nested invocation path captures its first segment → resolve in full or skip, and test `.is_file()`. Not promoted: pre-existing regex limit, 0 corpus hits (see New Findings).

**Cleanups (0).**

The reviewer's edge probes behaved correctly: `x.sh.`, `x.sh,`, `x.sh)`, `x.sh:` and `x.sh...` capture `x.sh`; `..` and `...` are skipped; fragment citations are skipped; the `{s|t}` form matches the single-name form.

mutation-proven: `skill_owned_invocations` all-dots skip disabled → `tests/bundle-check-mode.test.js` ellipsis case → covered (control passed)
mutation-proven: `invoked_name` made a no-op → `tests/bundle-check-mode.test.js` sentence-final dot case → covered (control passed)

---

## Regression Testing

`npm run ci:fast` on the server: 8591 tests, 0 failed. `bundle -- --check`: 129 skills, 0 problems.

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
None.

### Short-term Actions (Non-Blocking)
1. The five follow-ups in the gate's `recommendations.future`.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: no open finding; every criterion evidenced; both defects found in the fix cycles are fixed with proofs.
**Quality Score**: 95/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.280.qa.3.skill-and-test-tooling-see-what-ships.md`
**Gate File**: co-located at `task.280.gate.3.skill-and-test-tooling-see-what-ships.yml`
**Next Steps**: PR conformance review (5c), then finalise.

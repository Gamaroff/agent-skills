# QA Report: Task 318 - Placement check reads rows like the registry parsers

**Task**: [Link to task document](./task.318.placement-check-reads-rows-like-the-registry-parsers.md)
**Gate File**: [task.318.gate.1.placement-check-reads-rows-like-the-registry-parsers.yml](./task.318.gate.1.placement-check-reads-rows-like-the-registry-parsers.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-22
**Gate Status**: CONCERNS

---

## Executive Summary

The change makes the test helper `placementOf` trim lines and skip fenced blocks, as `parseRegistry` does. All four new cases pass, each was red on the old helper, and each mutation turns the expected test red. One medium finding: no CHANGELOG line cites the task.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (add the CHANGELOG line)

---

## Testing Scope

### Review Methodology

Direct tools only (small task: one test file, three phases). Diff review run inline, not by a subagent: independent review did not run. Step 4b: not applicable, no runnable prose in the change set. Diff review: code review.

CI on d57f1befd0fc: none (`CI_SUMMARY=CI on d57f1befd0fc: none`). Fast gate ran locally earlier (`TEST_LOCAL=1 npm run test:remote`, exit 0; LAN server down).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Reproduce | PASS | Verified | four cases, each red on the old helper |
| Phase 2: Match the parsers | PASS | Verified | trim and fence skip in `placementOf`; committed registry still clean |
| Phase 3: Prove it | PASS | Verified | mutation proofs below; prettier clean |

**Overall Phase Completion**: 3/3

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Indented row below Notes reported stranded | stranded `[3]` | `[3]` | PASS | record below |
| Fenced sample row not stranded | stranded `[]` | `[]` | PASS | record below |
| `node --test` on the drift test | pass | 13/13 | PASS | `CI=true node --test evals/shared/tests/task-registry-drift.test.mjs` |
| Prettier clean | clean | clean | PASS | `prettier --check` on the test file |
| `ci:fast` | pass | exit 0 | PASS | local route, LAN server down |

### Success-criterion records (record_criteria)

1. **Indented row** (criterion 1): mutation `placementOf` without `.trim()` (kept fence skip) → test that went red: subtest `indented` (13 tests: 11 pass, 2 fail = `indented` and its parent). Outcome: `covered`. Restored from a `cp` snapshot; 13/13 green after.
2. **Fenced sample row** (criterion 2): mutation `placementOf` without the fence skip (kept trim) → tests that went red: subtests `fenced`, `fencedTilde`, `fencedHeader` (9 pass, 4 fail incl. parent). Outcome: `covered`. `indented` stayed green, so the two fixes are held by separate cases.

mutation-proven: drop `.trim()` → `indented` → covered
mutation-proven: drop fence skip → `fenced`, `fencedTilde`, `fencedHeader` → covered

Criterion 8 (reason recorded if neither divergence is fixed) does not apply: both divergences were fixed.

---

## Breaking Changes Validation

None. The change is inside one test helper.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### MEDIUM Severity Issues (1)

**Issue: T318-CL-1 No CHANGELOG entry cites task 318**
- **Severity**: MEDIUM
- **Category**: Quality
- **Observation**: `changelog-cites.sh task.318` answers `missing (task 318)`. The review judged an entry unwarranted for a test-only change, but `/finalise` step 6d halts when `[Unreleased]` does not cite the task.
- **Recommendation**: add one line under `[Unreleased]` > `Fixed` citing (task 318).

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — PASS
One file read.

### Reliability — PASS
Committed registry placement test still passes; floor intact.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- Test-only helper; no accept/reject boundary. `boundary_signals` from the criteria classifier: none.

### Maintainability — PASS
Parity with `parseRegistry` is pinned by four cases that compare both readers.

---

## Code Review

Diff reviewed inline (no subagent). Anchors checked by reading the file.

**Correctness bugs (0):** none. The fence toggle mirrors `parseRegistry` (a `~~~` line closes a backtick fence in both, so the two stay in parity). The tightened separator regex is safe because lines are trimmed first.

**Cleanups (0):** none.

Provenance and boundary: `boundary: false`. Candidates considered: `placementOf` (a test reader, not a predicate guarding an action). `probes_executed: 0`.

---

## Regression Testing

The whole drift test file (13 tests) passes, including the committed-registry placement test.

---

## Test Artifacts

### Files Reviewed
`evals/shared/tests/task-registry-drift.test.mjs`

### Test Commands Executed
```bash
CI=true command node --test evals/shared/tests/task-registry-drift.test.mjs
./node_modules/.bin/prettier --check evals/shared/tests/task-registry-drift.test.mjs
bash .agents/skills/qa-task/references/changelog-cites.sh task.318
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Add the CHANGELOG `[Unreleased]` line citing (task 318).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: fix is correct and held; the one open item is a CHANGELOG citation.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CHANGELOG entry added

---

**QA Report**: co-located at `task.318.qa.1.placement-check-reads-rows-like-the-registry-parsers.md`
**Gate File**: co-located at `task.318.gate.1.placement-check-reads-rows-like-the-registry-parsers.yml`
**Next Steps**: `/qa-fix` adds the CHANGELOG line, then re-review.

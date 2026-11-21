# QA Report: Task 317 - Task registry rows sit under the table header

**Task**: [Link to task document](./task.317.task-registry-rows-sit-under-the-table-header.md)
**Gate File**: [task.317.gate.2.task-registry-rows-sit-under-the-table-header.yml](./task.317.gate.2.task-registry-rows-sit-under-the-table-header.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-21
**Gate Status**: PASS

---

## Executive Summary

Both cycle-1 findings are fixed. A full-branch refute pass found one low-severity difference between the test's row matcher and the registry parser, and QA could not make it misbehave against the real parsers, so it stays advisory. The gate is PASS.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only Explore subagent for the diff review (dispatched 20:04Z, returned 20:06Z, 23.9 s). Cycle 2 is the refute pass: the whole branch diff against `origin/develop` (985 lines), not only cycle 1's fixes.

Diff review: code review (the diff holds a `.mjs` test).

CI on 68b395fbf975: pending (the `test` job had not finished when the read ran; `link-check`, `validate`, `shellcheck` and `secret-scan` passed). Recorded only; it does not change the gate.

Re-review scope: unscoped, whole branch diff (cycle 2 refute pass).

---

## Re-Review Context

| Finding | Status | Evidence |
| --- | --- | --- |
| T317-CI-1 (medium) CI link-check red on the report | ✅ FIXED | `link-check` passes on the head (run 44944325789) |
| T317-CR-1 (low) matcher misses `\|318\|` | ✅ FIXED | matcher is now `/^\|\s*(\d+)\s*\|/`; the synthetic test holds `\|3\|` and `\|  4 \|` rows below `## Notes`; mutation to one required space turns that test red (cycle 1 record) |

---

## New Findings This Cycle

- **[low/medium, advisory]** `evals/shared/tests/task-registry-drift.test.mjs:381` ⚠️ unverified anchor (text-mismatch: the reviewer named line 377; the matcher is on line 381) — `placementOf` matches an untrimmed line and ignores code fences, while `select-next.mjs` `parseRegistry` trims and skips fenced blocks → optionally trim and track fences.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Measure and decide | PASS | Verified | Recorded in task and review report |
| Phase 2: Move the rows | PASS | Verified | Registry rows byte-identical to `origin/develop` (reviewer and cycle 1 both ran the sorted-line diff) |
| Phase 3: Hold it | PASS | Verified | Placement test, floor and prose present; cycle-1 matcher gap closed |

**Overall Phase Completion**: 3/3

---

## Success Criteria Verification

The criteria and their records are in [QA report 1](./task.317.qa.1.task-registry-rows-sit-under-the-table-header.md): the `--annotate` before and after (`no-cell` at line 407, then `dry-run` at line 330) and the row-300 mutation (the "every registry row sits in the one table block under the header (task.317)" test goes red). Nothing under those records has changed since, apart from the matcher loosening, which was re-proven in cycle 1.

| Criterion | Status | Notes |
| --- | --- | --- |
| Every registry row in the one table block, held by a committed test with a floor | PASS | Drift file 8 of 8 |
| `registry-tick.js --annotate` on a formerly stranded row answers `annotated` | PASS | QA report 1, record 1 |
| Placement test fails when one row is moved after `## Notes` | PASS | QA report 1, record 2 |
| CHANGELOG entry citing (task 317) | PASS | `changelog-cites.sh` |

---

## Breaking Changes Validation

None documented; none introduced.

---

## Issues Found

HIGH: 0, MEDIUM: 0, LOW: 0 in the gate. One advisory item is listed under New Findings.

---

## NFR Assessment

### Performance — PASS
No criterion applies.

### Reliability — PASS
Rows moved byte for byte; selector unchanged.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- The change adds no input boundary.

### Maintainability — PASS
One rule in two writers' prose, held by a test with a non-vacuity floor.

---

## Code Review

Reviewer: one Explore subagent, full branch diff, refute directive. It compared the test matcher with `select-next.mjs` `parseRegistry` and `registry-tick.js` `findHeader`.

**Correctness bugs (1, advisory):**
- [low/medium] `evals/shared/tests/task-registry-drift.test.mjs:381` ⚠️ unverified anchor (text-mismatch) — untrimmed, fence-unaware row matcher.

QA reproduction, in a scratch directory outside the tree. Control: `| 320 |` below `## Notes` is reported stranded. The indented `  | 320 |` is missed (`stranded: []`). Against the real parser, `parseRegistry` given the same indented row after a blank line returns `rows []` and 2 malformed entries, so the row is not read as a registry row there either, and `registry-tick.js` `findHeader` stops at the blank line the same way. The reviewer's claim that `select-next` still reads it as a row does not hold, so the finding does not meet the 5d bar (a reproduced misbehaviour against the engine) and stays advisory. The fenced-row false positive cannot occur on the committed file (the test is green). It is routed to the gate's `recommendations.future`, unverified.

**Cleanups (0):** none.

Step 3b boundary rule: `boundary: false` (`placementOf` is a test-side check). `boundary_signals`: `[]`. Step 4b: not applicable. Mutation proofs: cycle 1's matcher proof stands (`mutation-proven: matcher reverted to one required space → synthetic placement test → covered`); the tree was not mutated this cycle (`git status --porcelain` shows only the staged implementation report).

---

## Regression Testing

| Area | Result |
| --- | --- |
| Drift file | PASS (8 of 8, cycle 1 gate on the same code) |
| Selector | PASS, same item before and after |
| CI link-check, validate, shellcheck, secret-scan | PASS on the head |

---

## Test Artifacts

```bash
gh pr checks 928
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 928
```

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. Optionally trim lines and skip fences in `placementOf`.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: all deliverables present and proven; cycle-1 findings fixed; the one new item is advisory and not reproducible against the real parsers.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.317.qa.2.task-registry-rows-sit-under-the-table-header.md`
**Gate File**: co-located at `task.317.gate.2.task-registry-rows-sit-under-the-table-header.yml`
**Next Steps**: Step 5c `/review-pr`.

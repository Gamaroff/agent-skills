# QA Report: Task 317 - Task registry rows sit under the table header

**Task**: [Link to task document](./task.317.task-registry-rows-sit-under-the-table-header.md)
**Gate File**: [task.317.gate.1.task-registry-rows-sit-under-the-table-header.yml](./task.317.gate.1.task-registry-rows-sit-under-the-table-header.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-21
**Gate Status**: CONCERNS

---

## Executive Summary

The registry rows are back in one table block, held by a committed placement test that was proven red by mutation. Two findings keep the gate at CONCERNS: CI's `link-check` is red on the PR head because of an unquoted host in the implementation report, and the placement matcher misses a row written with no space after the pipe.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (CI link-check green on the PR head)

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only Explore subagent for the diff review (dispatched 19:54Z, returned within one minute). Adaptive strategy: small task, 3 phases, Low risk. Mutation proofs ran in a scratch worktree, after the reviewer had returned, so the working tree was never mutated.

Diff review: code review (the diff holds a `.mjs` test).

CI on be6064420496: 1 failed (0 pre-existing).

---

## New Findings This Cycle

First review, so this section is the full finding list; see Issues Found.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Measure and decide | PASS | Verified | Measurement and `no-cell` reproduction recorded in the task and review report |
| Phase 2: Move the rows | PASS | Verified | Sorted-line diff of the registry against `origin/develop` is empty; rows 1-317 contiguous at lines 45-361, `## Notes` at line 377 |
| Phase 3: Hold it | CONCERNS | Verified | Placement test and prose present; matcher gap (T317-CR-1) |

**Overall Phase Completion**: 3/3 phases delivered, 1 with a finding.

---

## Success Criteria Verification

### Functional

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Every registry row lies in the one table block, held by a committed test with a floor | held | `task-registry-drift.test.mjs` 8 of 8 green; floor `PLACEMENT_MIN_ROWS = 317` | PASS | A `\|318\|` shape escapes it (T317-CR-1) |
| `registry-tick.js --annotate` on a formerly stranded row answers `annotated` | `annotated` | see record 1 | PASS | |
| Placement test fails when one row is moved after `## Notes` | red | see record 2 | PASS | |

**Record 1 (criterion 2).** Row 286 was stranded at line 407, below `## Notes` (line 345) in the original layout. In a scratch worktree, with the document `task.286.pr-review.1.*.md` and `--pr 927 --dry-run --json`:

```bash
# original layout (git show origin/develop:docs/tasks/task-registry.md)
node shared/resources/registry-tick.js --annotate --file <task.286 doc> --pr 927 --registry docs/tasks/task-registry.md --dry-run --json
# -> {"reason":"no-cell","line":407}
# committed layout (HEAD)
# -> {"reason":"dry-run","line":330}
```

`dry-run` is the answer when a notes cell was found and nothing was written. The non-dry run on a scratch copy at develop time answered `annotated` (implementation report, Decisions Log).

**Record 2 (criterion 3).** In a scratch worktree, row 300 was moved below `## Notes`:

```text
CI=true node --test evals/shared/tests/task-registry-drift.test.mjs
✖ every registry row sits in the one table block under the header (task.317)
```

Only that test went red, and the other 7 stayed green. With the row restored the file is 8 of 8. mutation-proven: row 300 moved after `## Notes` → every registry row sits in the one table block under the header (task.317) → covered

### Code Quality

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| `task-registry-drift.test.mjs` and `npm run ci:fast` pass | pass | drift file 8 of 8; `ci:fast` 8709 pass at develop time on the same tree | PASS | |
| `npm run validate` for the changed skill | pass | `create-task` validates | PASS | |
| `npm run bundle:check` | clean | 129 skills, 0 problems | PASS | |

### Migration

| Criterion | Status | Notes |
| --- | --- | --- |
| CHANGELOG `[Unreleased]` entry citing (task 317) | PASS | `changelog-cites.sh`: `cites (task 317)` |

---

## Breaking Changes Validation

None documented; none introduced. Row content is unchanged.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: CI link-check fails on the implementation report**
- **Severity**: MEDIUM (id T317-CI-1)
- **Observation**: `link-check` failed on be6064420496 with `mailto:ci@192.168.1.249 → Status: 400`. Line 68 of the implementation report names the server unquoted. The check is green on develop.
- **Impact**: the PR cannot merge green.
- **Recommendation**: put the host in backticks; re-run `doc-links.js` on the report.

### LOW Severity Issues (1)

**Issue: placement matcher needs one space after the pipe**
- **Severity**: LOW (id T317-CR-1; reviewer: low severity, low confidence; reproduced by QA)
- **Observation**: in a scratch worktree a row written `|318| stranded | Draft | x |` below `## Notes` leaves the placement test green. The control `| 318 | stranded | Draft | x |` turns it red. The production parser (`select-next.mjs` `parseRegistry`) reads `|318|` as task 318, so the guard can miss a row the engine sees.
- **Recommendation**: loosen the matcher to `/^\|\s*(\d+)\s*\|/` and add the shape to the synthetic test.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS
No criterion applies.

### Reliability — PASS
Rows moved byte for byte; selector unchanged (T290 before and after).

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- The change adds no input boundary: a test helper that reads the committed registry, moved documentation rows and prose.

### Maintainability — PASS
One rule in two writers' prose, held by a test with a non-vacuity floor.

---

## Code Review

Reviewer: one Explore subagent, full branch diff. Reviewed the test helper in full and checked the registry by sorted-line diff.

**Correctness bugs (1):**
- [low/low] `evals/shared/tests/task-registry-drift.test.mjs:381` — the row matcher needs exactly one space after the leading pipe → loosen it. Promoted to the gate as T317-CR-1 because QA reproduced it with a control (origin: code-review, reproduced by QA). Provenance: the matcher is new in this diff, so it is not pre-existing.

**Cleanups (0):** none.

Step 3b boundary rule: `boundary: false`. `placementOf` is a test-side check over a committed file, and no input gate depends on it. `boundary_signals`: `[]` (the criteria carry no boundary phrase). Step 4b: not applicable, as the change set holds no fenced bash in a `SKILL.md` that the change touched beyond one prose sentence.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Other tests in the drift file | PASS (7 of 7 unchanged) |
| Selector dry run | PASS, same item before and after |
| Bundled copies | PASS, `bundle:check` clean |

---

## Test Artifacts

### Test Commands Executed
```bash
CI=true node --test evals/shared/tests/task-registry-drift.test.mjs
python3 skills/create-skill/scripts/quick_validate.py skills/create-task
npm run bundle:check
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 928
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Quote the host in the implementation report so CI `link-check` passes (T317-CI-1).

### Short-term Actions (Non-Blocking)
1. Loosen the placement matcher and extend the synthetic test (T317-CR-1).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: all deliverables are present and proven; one red CI lane and one matcher gap remain, both small.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CI `link-check` green on the PR head

---

**QA Report**: co-located at `task.317.qa.1.task-registry-rows-sit-under-the-table-header.md`
**Gate File**: co-located at `task.317.gate.1.task-registry-rows-sit-under-the-table-header.yml`
**Next Steps**: run /qa-fix for T317-CI-1 and T317-CR-1, then re-run QA.

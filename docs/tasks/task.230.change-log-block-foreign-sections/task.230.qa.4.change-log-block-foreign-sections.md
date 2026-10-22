# QA Report: Task 230 - Keep foreign sections out of the change-log block

**Task**: [task.230.change-log-block-foreign-sections.md](./task.230.change-log-block-foreign-sections.md)
**Gate File**: [task.230.gate.4.change-log-block-foreign-sections.yml](./task.230.gate.4.change-log-block-foreign-sections.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-22
**Testing Completed**: 2026-10-22
**Gate Status**: PASS

---

## Executive Summary

Cycle 3's fixes hold, and all four cycle-3 guards are mutation-proven. No medium or high finding remains. The scoped review found two low residuals and one advisory. Each is on a shape that no writer or template in this repository produces. The two lows were carried to `recommendations.future` by the cosmetic-residue exit (route 2b).

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| TASK-230-CR3-1 (medium): Date/Author sign-off table counted as log-shaped | ✅ FIXED | K23 green; red when `author` is restored to `LOG_HEADER_CELLS` |
| TASK-230-CR3-2 (medium): headingless block preferred a log-shaped foreign table | ✅ FIXED | K24, K27 green; K27 red when the pick order is swapped |
| TASK-230-CR3-4 (low): deeper `### Change Log` dropped | ✅ FIXED | K26 green; red without the level check |
| CR3-3 (advisory): legend beat a real log | ✅ FIXED | K25 green; red with own-first-run restored |

## New Findings This Cycle

- **[low]** `shared/resources/change-log.js:515`: a log-shaped foreign table outranks a non-log, undated own-section table, and K22's title lags the rule. Carried (TASK-230-CR4-1).
- **[low]** `shared/resources/change-log.js:539`: a deeper Change Log heading inside a before-side foreign section does not converge on the first write. Carried (TASK-230-CR4-2).
- **[low, confidence medium, advisory]** `shared/resources/tests/change-log.test.mjs:3150`: a picked run past a non-log own table carries that table's rows into the rendered log as unparsed rows. → `recommendations.future`.
- Cleanups: a duplicated heading-depth regex (`change-log.js:538`), and K22's title (`change-log.test.mjs:3050`).

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#735)

### Testing Approach

- [x] Automated Testing (unit, corpus guard)
- [x] Performance Testing (corpus guard wall time)
- [x] Regression Testing (caller suites, full fast gate)
- [x] Security Review
- [x] Code Review (scoped)

### Review Methodology

Re-review with direct tools. Step 3b used one Explore subagent over the branch diff of the files changed since gate 3's head. The reviewer was dispatched at 22:43:51 UTC and returned in 319.1 s (`duration_ms` 319140). Code-review blocking is on.

The dispatch appended one scope note to the reviewer prompt: calibrate severity to shapes a writer or template in this repository produces, and name one before rating a finding above low. This applies the measured plausibility rule (obs #236) at review time. Each finding's plausibility was then measured here: a grep of `skills/`, `shared/` and `docs/standards/` for the residual headers found no writer or template.

Re-review scope: files changed since gate 3 (head 49f25478aa98; 2 files) — default. `SAFETY_REPROBE=false`.

Step 4b: no in-scope runnable prose changed this cycle.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: engine + tests | PASS | Verified | Low residuals only |
| Phase 2: placement rule + spec | PASS | Verified | Unchanged |
| Phase 3: corpus guard + repairs | PASS | Verified | Guard green, 0.726 s |
| Phase 4: CHANGELOG + status | PASS | Verified | Unchanged |

**Overall Phase Completion**: 4/4 phases passed

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| obs #91 document lifts Deferred Work above the marker | K1 | PASS |
| task.203 shape: DoD above the marker | K2, K11, K17, K23 | PASS |
| After-side sibling below the end marker | K4, K14, K18, K24, K27 | PASS |
| A section's pipe table moves with it | K3, K12, K13, K19, K23 | PASS |
| Nested `###`, authoring note, fenced `## Example` stay | K2, K8, K15, K26 | PASS |
| Second write lifts nothing, changes only the row | K9, K16, K20, K21 | PASS |
| No non-blank line lost | K9, K16, K21, K26 | PASS |
| Placement rule in finalise 7.4's words | `tests/deferred-work-placement.test.js` | PASS |
| Corpus guard under 5 s | 0.726 s, load 1.32 | PASS |
| No-foreign output byte-identical | pre-existing change-log tests unchanged and green | PASS |
| One definition of foreign | guard imports `foreignSections`; K9 | PASS |
| Mutation-proven | 16 engine mutations across cycles 1–3, each killed by a named test | PASS |
| `bundle:check`, `validate` | rc 0; quick_validate over 48 changed skills, 0 failures (cycle 2) | PASS |
| Four docs repaired, one row, `updated:` bumped | `--check-append-only` ok | PASS |
| CHANGELOG states the lift | Unreleased → Changed | PASS |

---

## Breaking Changes Validation

### Breaking Change: a document with a foreign section gets a larger diff on its next write

Documented: Yes
Migration Path Provided: Yes
Migration Tested: Yes
Consumer Code Updated: N/A

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (3 + 2 cleanups)

- TASK-230-CR4-1: position versus shape for a non-log own table. Carried, route 2b.
- TASK-230-CR4-2: a deeper Change Log heading inside a foreign run does not converge. Carried, route 2b.
- CR4-3 (advisory): rows of a skipped own-section table render inside the log.
- §9 Success Criteria boxes are still unticked; finalise verifies them.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 3

---

## NFR Assessment

### Performance — PASS

The corpus guard took 0.726 s wall at load average 1.32.

### Reliability — PASS

Every shape a writer or template here produces is handled and covered. The property check over the 120-block corpus found 0 problems.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: internal`, with the same `internal_reason` as gate 2.

### Maintainability — PASS

One partition, one header-cell list, and the rule stated once. K22's title lags the rule (cleanup).

---

## Code Review

Advisory, except where promoted.

**Correctness bugs (3):**

- [low/high] `shared/resources/change-log.js:515`: a log-shaped foreign table outranks a non-log own table. **Promoted: TASK-230-CR4-1**, then carried by route 2b.
- [low/high] `shared/resources/change-log.js:539`: a deeper Change Log heading in a foreign run is not converged by the first write. **Promoted: TASK-230-CR4-2**, then carried by route 2b.
- [low/medium] `shared/resources/tests/change-log.test.mjs:3150`: a skipped own-section table's rows render inside the log, and K25 asserts only substring presence. Advisory.

**Cleanups (2):**

- `shared/resources/change-log.js:538`: the heading depth is re-parsed; take it from one helper shared with `isSibling`.
- `shared/resources/tests/change-log.test.mjs:3050`: K22's title describes the cycle-2 rule.

Anchors: `finding-anchors.js` returned reason `ok`; all five findings are `ok`.

Provenance: all three bugs are in code added by this branch. On base, each shape stays whole inside the block.

boundary: internal. probes_executed: 0. escaped: 0.

mutation-proven: `author` restored to LOG_HEADER_CELLS → K22, K23 red → covered
mutation-proven: own log-like pick replaced by first own run → K25 red → covered
mutation-proven: repeat-heading level check dropped → K26 red → covered
mutation-proven: pick order swapped → K27 red → covered

Four of four cycle-3 guards proven; `git status --porcelain` unchanged after the proofs.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `change-log.test.mjs` | PASS, 113/0 |
| `upsertChangeLog` callers | PASS, 564/0 (5b run on this head) |
| `npm run ci:fast` | PASS, 6237 / 0 fail (5b run on this head) |

---

## Test Artifacts

### Test Commands Executed

```bash
command node --test shared/resources/tests/change-log.test.mjs
uptime; time command node --test evals/shared/tests/change-log-foreign-section-corpus.test.mjs
command node .agents/skills/qa-task/references/finding-anchors.js --findings-file <json> --root . --rev HEAD --annotate <json> --json
```

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: No medium or high finding remains. The two low residuals are on shapes no writer here produces, and were carried by route 2b.
**Quality Score**: 95/100

**Deployment Recommendation**: APPROVED

**Next Steps**: Step 5c, `/review-pr`.

# QA Report: Task 230 - Keep foreign sections out of the change-log block

**Task**: [task.230.change-log-block-foreign-sections.md](./task.230.change-log-block-foreign-sections.md)
**Gate File**: [task.230.gate.3.change-log-block-foreign-sections.yml](./task.230.gate.3.change-log-block-foreign-sections.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-22
**Testing Completed**: 2026-10-22
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2's fixes hold: the four cycle-2 shapes are covered, and all four new guards are mutation-proven. The scoped cycle-3 review found that the "log-shaped" test is too loose. A header with Date plus Author alone qualifies, so a DoD or QA sign-off table can still be taken as the log, in both the heading and the headingless branches (CR3-1, CR3-2). The repeat-heading drop also removes a deeper `### Change Log` heading (CR3-4). All three reproduce on the PR head.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| TASK-230-CR2-1 (medium): `Version \| Date` log behind a DoD left the markers | ✅ FIXED | K17 green; red when the past-foreign shape search is dropped |
| TASK-230-CR2-2 (medium): foreign Date/Version table beat the log | ✅ FIXED | K18, K22 green; K22 red without own-section-first |
| TASK-230-CR2-3 (medium): headingless block took a foreign table | ⚠️ PARTIAL | K19 green, but a log-shaped foreign table still wins (CR3-2) |
| TASK-230-CR2-4 (low): doubled heading did not converge | ✅ FIXED | K20 green; red when the repeated heading is kept |

## New Findings This Cycle

- **[medium]** `shared/resources/change-log.js:509`: with a heading and no own-section table, a DoD sign-off table headed `| Date | Reviewer | Author | Result |` counts as log-shaped and becomes the log. → Require Date plus Version or Description.
- **[medium]** `shared/resources/change-log.js:510`: in a headingless block, a log-shaped foreign table beats an own-section table with entry rows. This is a regression against the cycle-2 head. → Consider own-section runs first.
- **[medium, confidence medium, advisory]** `shared/resources/change-log.js:509`: a non-log legend table first in the log's own section beats a canonical log past a foreign heading.
- **[low]** `shared/resources/change-log.js:526`: a deeper `### Change Log` heading is dropped. → Drop only a repeat at the log's own level.
- **[low, confidence medium, advisory]** `shared/resources/change-log.js:545`: a Change Log heading inside an after-side foreign run is lifted below the end marker.

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

Re-review with direct tools. Step 3b used one Explore subagent over the branch diff of the files changed since gate 2's head. The reviewer was dispatched at 22:29:39 UTC and returned in 199.0 s (`duration_ms` 198973). Code-review blocking is on (develop-task run-level override).

Re-review scope: files changed since gate 2 (head 2b36cf52ae4c; 2 files) — default. `SAFETY_REPROBE=false`.

Step 4b: no in-scope runnable prose changed this cycle. The only changes were `change-log.js` and its tests.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: engine + tests | CONCERNS | Verified | Cycle-2 shapes fixed; log-shaped test too loose (CR3-1, CR3-2) |
| Phase 2: placement rule + spec | PASS | Verified | Unchanged |
| Phase 3: corpus guard + repairs | PASS | Verified | Guard green, 0.744 s |
| Phase 4: CHANGELOG + status | PASS | Verified | Unchanged |

**Overall Phase Completion**: 3/4 phases passed

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| obs #91 document lifts Deferred Work above the marker | K1 | PASS |
| task.203 shape: DoD above the marker | K2, K11, K17 | PASS, except a DoD holding a Date/Author sign-off table (CR3-1) |
| A section's pipe table moves with it | K3, K12, K13, K18, K19 | PASS on covered shapes; sign-off tables fail (CR3-1, CR3-2) |
| Second write lifts nothing, changes only the row | K9, K16, K20, K21 | PASS |
| No non-blank line lost | K9, K16, K21 | PASS, except a deeper `### Change Log` heading (CR3-4) |
| Corpus guard under 5 s | 0.744 s, load 1.78 | PASS |
| One definition of foreign | guard imports `foreignSections` | PASS |
| Mutation-proven | four cycle-2 guards re-proven (below) | PASS |
| `bundle:check` | rc 0 | PASS |

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

### MEDIUM Severity Issues (2)

**Issue: a Date/Author sign-off table is taken as the log (TASK-230-CR3-1)**

- **Severity**: MEDIUM
- **Category**: Functional
- **Observation**: `## Change Log`, then `## Definition of Done - PASSED` with a `| Date | Reviewer | Author | Result |` table, then the canonical log. The sign-off row is written as history.
- **Recommendation**: Require Date plus Version or Description for log-shaped.
- **Priority**: P2

**Issue: a headingless block prefers a log-shaped foreign table (TASK-230-CR3-2)**

- **Severity**: MEDIUM
- **Category**: Functional (regression against the cycle-2 head)
- **Observation**: An own `| When | Version | What | Who |` log with entry rows loses to a `## QA Sign-off` `| Date | Author | Verdict |` table.
- **Recommendation**: Consider own-section runs first in the headingless branch.
- **Priority**: P2

### LOW Severity Issues (3)

- TASK-230-CR3-4: a deeper `### Change Log` heading is dropped by the repeat-heading rule.
- CR3-5 (advisory): an after-side Change Log heading inside a foreign run is lifted below the end marker.
- §9 Success Criteria boxes are still unticked.

**Total Issues**: HIGH: 0, MEDIUM: 2 (+1 advisory), LOW: 3

---

## NFR Assessment

### Performance — PASS

The corpus guard took 0.744 s wall at load average 1.78.

### Reliability — CONCERNS

Sign-off tables can still be misfiled into the log (CR3-1, CR3-2).

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: internal`, with the same `internal_reason` as gate 2: the input is work-item documents this pipeline writes, and no corpus sink models a change-log block.

### Maintainability — PASS

One partition and one header-cell list; the rule is stated once.

---

## Code Review

Advisory, except where promoted (code-review blocking is on).

**Correctness bugs (5):**

- [medium/high] `shared/resources/change-log.js:509`: a Date/Author sign-off table counts as log-shaped and becomes the log. **Promoted: TASK-230-CR3-1.**
- [medium/high] `shared/resources/change-log.js:510`: in a headingless block, a log-shaped foreign table beats the own-section log. **Promoted: TASK-230-CR3-2.**
- [medium/medium] `shared/resources/change-log.js:509`: a legend table first in the own section beats a canonical log past a foreign heading. Advisory by confidence, recorded in `recommendations.future`.
- [low/high] `shared/resources/change-log.js:526`: a deeper `### Change Log` heading is dropped. **Promoted: TASK-230-CR3-4.**
- [low/medium] `shared/resources/change-log.js:545`: an after-side Change Log heading inside a foreign run is lifted out. Advisory.

**Cleanups (0).**

Anchors: `finding-anchors.js` returned reason `ok`; all five findings are `ok`.

Provenance: the base engine keeps every one of these shapes whole inside the block, so none is a split on base. All are new to this change. CR3-2 also differs from the cycle-2 head.

boundary: internal. probes_executed: 0. escaped: 0.

mutation-proven: own-section-first dropped → K22 red → covered
mutation-proven: past-foreign shape search dropped → K17, K2, K3, K11 red → covered
mutation-proven: headingless branch picks the first run → K19, K21 red → covered
mutation-proven: repeated heading kept → K20 red → covered

Four of four cycle-2 guards proven; `git status --porcelain` unchanged after the proofs.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `change-log.test.mjs` | PASS, 108/0 |
| `upsertChangeLog` callers | PASS, 564/0 (5b run on this head) |
| `npm run ci:fast` | PASS, 6232 / 0 fail (5b run on this head) |
| `bundle:check` | PASS |

---

## Test Artifacts

### Test Commands Executed

```bash
command node --test shared/resources/tests/change-log.test.mjs
uptime; time command node --test evals/shared/tests/change-log-foreign-section-corpus.test.mjs
npm run bundle:check
command node .agents/skills/qa-task/references/finding-anchors.js --findings-file <json> --root . --rev HEAD --annotate <json> --json
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Two medium high-confidence findings in the log-shaped test, both reproduced.
**Quality Score**: 70/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR3-1 and CR3-2 fixed and covered by tests.

**Next Steps**: The loop route decides between `/qa-fix` cycle 3 and a loop exit.

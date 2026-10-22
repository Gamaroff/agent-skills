# QA Report: Task 230 - Keep foreign sections out of the change-log block

**Task**: [task.230.change-log-block-foreign-sections.md](./task.230.change-log-block-foreign-sections.md)
**Gate File**: [task.230.gate.2.change-log-block-foreign-sections.yml](./task.230.gate.2.change-log-block-foreign-sections.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-22
**Testing Completed**: 2026-10-22
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 1's fix holds: the three cycle-1 shapes are covered and all four new guards are still mutation-proven. The cycle-2 refute pass then found three more shapes where `partitionForeign` picks the wrong table, and one doubled-heading shape where the first write does not converge. One of the three is a regression the base engine did not have: a `| Version | Date |` log behind a DoD section leaves the markers. All four reproduce on the PR head.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| TASK-230-CR-1 (high): a before-side dated foreign table taken as the log | ✅ FIXED | K12 green; red when candidate runs are scanned from 0 |
| TASK-230-CR-2 (medium): no log table, foreign table split | ✅ FIXED | K13 green; red without the heading fallback |
| CR-3 (advisory): foreign table flush against the heading | ✅ FIXED | K12/K16 green |
| CR-4 (cleanup): displaced JSDoc | ✅ FIXED | `upsertChangeLog` JSDoc sits directly above it |
| LOW: §9 boxes unticked | ⚠️ PARTIAL | still unticked; left for finalise |

## New Findings This Cycle

- **[medium]** `shared/resources/change-log.js:490`: a `| Version | Date | Change | Author |` log with a foreign section between the heading and the table gets no candidate, so the whole log table moves out of the markers. This is a regression against the base engine. → When the heading's own section has no table, accept a log-shaped header (Date plus Version, Description, Change or Author) or entry rows past a foreign heading.
- **[medium]** `shared/resources/change-log.js:483`: the `| Date | Version |` lookup reaches past foreign headings, so an after-side Release Matrix table beats a `| Date | Description | Author |` log. → Prefer any table in the heading's own section.
- **[medium]** `shared/resources/change-log.js:491`: in a headingless block, a foreign section's table becomes the log and its heading is lifted bare. `foreignSections(out)` is then `[]`, so the corpus guard cannot see it. → Never choose a run inside a foreign heading's span.
- **[low]** `shared/resources/change-log.js:499`: a second Change Log heading is lifted with a before-side section and absorbed on the next write, so the first write is not a fixed point. → End before-side runs at any Change Log heading.

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
- [x] Code Review (cycle-2 refute pass)

### Review Methodology

Re-review with direct tools. Step 3b was the cycle-2 full refute pass: one Explore subagent over the whole branch diff, excluding generated `references/` copies and this task's directory (11 files, 1358 patch lines). The REFUTE PASS directive was appended. The reviewer was dispatched at 22:13:38 UTC and returned in 169.3 s (`duration_ms` 169335). Code-review blocking is on (develop-task run-level override).

Re-review scope: unscoped, cycle 2 refute pass (whole `origin/develop...HEAD` diff). `SAFETY_REPROBE=false`: clause 1 returned false and the prior gate passed security.

Step 4b: changed in-scope files are `shared/resources/develop-pipeline-step-5-6-qa-loop.md` and `shared/resources/document-change-log.md`. The engine reports 0 changed fenced blocks in either.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: engine + tests | CONCERNS | Verified | Cycle-1 shapes fixed; three more table-choice shapes and one convergence shape found |
| Phase 2: placement rule + spec | PASS | Verified | Unchanged since cycle 1 |
| Phase 3: corpus guard + repairs | PASS | Verified | Guard green, 0.808 s |
| Phase 4: CHANGELOG + status | PASS | Verified | Unchanged |

**Overall Phase Completion**: 3/4 phases passed

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| obs #91 document lifts Deferred Work above the marker | K1 | PASS |
| task.203 shape: DoD above the marker | K2, K11 | PASS for a `Date \| Version` log; FAIL for a `Version \| Date` log (CR2-1) |
| After-side sibling below the end marker | K4, K14 | PASS, except the Date/Version-headed foreign table (CR2-2) |
| A section's pipe table moves with it | K3, K12, K13 | PASS on covered shapes; headingless block fails (CR2-3) |
| Second write lifts nothing, changes only the row | K9, K16 | PASS, except the doubled heading (CR2-4) |
| No non-blank line lost | K9, K16 multiset | PASS |
| Placement rule in finalise 7.4's words | `tests/deferred-work-placement.test.js` | PASS |
| Corpus guard under 5 s | `uptime; time …`: 0.808 s, load 2.08 | PASS |
| No-foreign output byte-identical | pre-existing change-log tests unchanged and green | PASS |
| One definition of foreign | guard imports `foreignSections`; K9 | PASS |
| Mutation-proven | four guards re-proven this cycle (below) | PASS |
| `bundle:check`, `validate` | `bundle:check` rc 0; quick_validate over 48 changed skills, 0 failures | PASS |
| Four docs repaired | unchanged since cycle 1 | PASS |
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

### MEDIUM Severity Issues (3)

**Issue: a `Version | Date` log behind a DoD section leaves the markers (TASK-230-CR2-1)**

- **Severity**: MEDIUM
- **Category**: Functional (regression)
- **Observation**: `## Change Log`, `## DoD`, then a `| Version | Date | Change | Author |` table. No run matches any signal, so the log starts at the heading and the after-side scan starts at `## DoD`. The real log row ends up below the end marker, and the rebuilt log holds only the new row.
- **Impact**: Change-log history leaves the log. The base engine kept it.
- **Recommendation**: Accept a log-shaped header or entry rows past a foreign heading when the heading's own section has no table.
- **Priority**: P1

**Issue: an after-side Date/Version table beats a log with another header (TASK-230-CR2-2)**

- **Severity**: MEDIUM
- **Category**: Functional
- **Observation**: A `| Date | Description | Author |` log, then `## Release Matrix` with a `| Date | Version | Platform |` table. The Release Matrix table is chosen as the log.
- **Recommendation**: Prefer any table in the heading's own section.
- **Priority**: P2

**Issue: a headingless block takes a foreign section's table as the log (TASK-230-CR2-3)**

- **Severity**: MEDIUM
- **Category**: Functional
- **Observation**: The obs #104 shape, with `## Change Log` above the marker. A DoD table comes first inside the block, followed by a `Version | Date` log. The DoD heading is lifted bare and its rows stay in the log. `foreignSections(out)` is `[]`.
- **Recommendation**: With no heading, never choose a run inside a foreign heading's span.
- **Priority**: P2

### LOW Severity Issues (2)

- TASK-230-CR2-4: a doubled Change Log heading is not converged by the first write.
- §9 Success Criteria boxes are still unticked.

**Total Issues**: HIGH: 0, MEDIUM: 3, LOW: 2

No bug report files were created. The pipeline's fix loop takes the gate's `top_issues[]` directly.

---

## NFR Assessment

### Performance — PASS

The corpus guard took 0.808 s wall on the PR head, at load average 2.08.

### Reliability — CONCERNS

CR2-1 to CR2-3 misfile a table on less common shapes; CR2-1 moves real history out of the log. CR2-4 breaks first-write convergence.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: internal`. `internal_reason`: `shared/resources/change-log.js#foreignSections` reads only work-item documents this repository's own pipeline writes. No corpus sink models a change-log block (`markdown-structure` models the implementation report). There is no shell, network or external input.

### Maintainability — PASS

One partition serves all three consumers, and the rule is stated once in the header comment.

---

## Code Review

Advisory, except where promoted (code-review blocking is on for this run).

**Correctness bugs (4):**

- [medium/high] `shared/resources/change-log.js:490`: a `Version | Date` log behind a DoD has no candidate, so the log table leaves the markers. Regression. → Accept a log-shaped table past a foreign heading when the own section has none. **Promoted: TASK-230-CR2-1.**
- [medium/high] `shared/resources/change-log.js:483`: the `Date | Version` lookup reaches past foreign headings, so a foreign table wins. → Prefer the heading's own section. **Promoted: TASK-230-CR2-2.**
- [medium/high] `shared/resources/change-log.js:491`: the headingless fallback takes a foreign section's table. → Skip runs inside a foreign span. **Promoted: TASK-230-CR2-3.**
- [low/high] `shared/resources/change-log.js:499`: only the first Change Log heading ends a before-side run, so the second is lifted and later absorbed. → End runs at any Change Log heading. **Promoted: TASK-230-CR2-4.**

**Cleanups (0).**

Anchors: `finding-anchors.js` returned reason `ok`; all four findings are `ok`.

Provenance: all four were run against the `origin/develop` engine. On base, CR2-2 and CR2-3 keep the section whole inside the block (heading and rows together; that is the task's original defect, not a split), CR2-4 is idempotent, and CR2-1's log row stays in the log. All four are new to this change.

boundary: internal (see Security). probes_executed: 0. escaped: 0.

mutation-proven: candidate runs scanned from 0 instead of the heading → K12, K16 red → covered
mutation-proven: claim filter on the weaker signals dropped → K14 red → covered
mutation-proven: heading reset of the foreign run dropped → K15 red → covered
mutation-proven: no-candidate fallback to the heading removed → K13 red → covered

Four of four cycle-1 guards proven; `git status --porcelain` unchanged after the proofs.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `change-log.test.mjs` | PASS, 102/0 |
| `upsertChangeLog` callers (sync-jira-*, tracker-reconcile, jira-sync fidelity, qa-results, deferred-work placement, corpus guard) | PASS, 564/0 (5b run on this head) |
| Full fast gate (`npm run ci:fast`) | PASS, 6226 / 0 fail (5b run on this head) |
| `bundle:check` | PASS |

---

## Test Artifacts

### Test Commands Executed

```bash
command node --test shared/resources/tests/change-log.test.mjs
uptime; time command node --test evals/shared/tests/change-log-foreign-section-corpus.test.mjs
npm run bundle:check
python3 skills/create-skill/scripts/quick_validate.py skills/<each changed skill>
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <changed md> --diff-base <merge-base> --copy-as skills:.agents/skills --json
command node .agents/skills/qa-task/references/finding-anchors.js --findings-file <json> --root . --rev HEAD --annotate <json> --json
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Three medium high-confidence correctness findings in the table choice, all reproduced. One of them is a regression against base.
**Quality Score**: 70/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR2-1 to CR2-3 fixed and covered by tests.

**Next Steps**: `/qa-fix` cycle 2. Restructure the table choice around the heading's own section, and add K cases for the four shapes.

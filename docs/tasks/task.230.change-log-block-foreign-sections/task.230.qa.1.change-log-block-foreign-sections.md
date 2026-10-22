# QA Report: Task 230 - Keep foreign sections out of the change-log block

**Task**: [task.230.change-log-block-foreign-sections.md](./task.230.change-log-block-foreign-sections.md)
**Gate File**: [task.230.gate.1.change-log-block-foreign-sections.yml](./task.230.gate.1.change-log-block-foreign-sections.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-22
**Testing Completed**: 2026-10-22
**Gate Status**: FAIL

---

## Executive Summary

All four phases are implemented and the full fast gate is green, but the diff review found that the engine picks the log's table with a document-wide first match. A foreign section that holds its own dated or `| Date |`-headed table is split: its heading is lifted and its rows stay in the log as history. Two of the findings are high-confidence bugs and the pipeline runs with code-review blocking on, so the gate is FAIL.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (15/15 boxes)
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#735)

### Testing Approach

- [x] Automated Testing (unit, corpus guard)
- [x] Performance Testing (corpus guard wall time)
- [x] Regression Testing (caller suites)
- [x] Security Review
- [x] Code Review

### Review Methodology

Direct tools, plus one Explore subagent for the Step 3b diff review (first review, small task; whole branch diff excluding the generated `references/` copies and this task's directory: 11 files). Reviewer dispatched and returned in 152.6 s (`duration_ms` 152588). Code-review blocking: on (develop-task run-level override). Step 4b: changed in-scope files are `shared/resources/develop-pipeline-step-5-6-qa-loop.md` and `shared/resources/document-change-log.md`. The engine reports 0 changed fenced blocks in either: the edits are prose only.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: engine + tests | FAIL | Verified | Lift works for the planned cases; log-start selection wrong for foreign tables (CR-1, CR-2, CR-3) |
| Phase 2: placement rule + spec | PASS | Verified | Placement test calibrated red on the old wording |
| Phase 3: corpus guard + repairs | PASS | Verified | Guard red on the unrepaired tree (named exactly the four docs), green after |
| Phase 4: CHANGELOG + status | PASS | Verified | Entry under Unreleased → Changed |

**Overall Phase Completion**: 3/4 phases passed

---

## Success Criteria Verification

The §9 boxes are unticked in the document. Each criterion was verified from evidence instead.

| Criterion | Evidence | Status |
| --- | --- | --- |
| obs #91 document lifts Deferred Work above the marker | K1 | PASS |
| task.203 shape: DoD above the marker | K2 | PASS |
| After-side sibling below the end marker | K4 | PASS |
| Nested `###`, authoring note, fenced `## Example` stay | K2, K8 | PASS |
| Second write lifts nothing, changes only the row | K9 (idempotent) | PASS |
| No non-blank line lost | K9 (multiset) | PASS — but CR-1/CR-2 keep lines while misfiling them; the multiset property cannot see a row moved into the log |
| Placement rule in finalise 7.4's words | `tests/deferred-work-placement.test.js` | PASS |
| Corpus guard under 5 s | `uptime; time …` on the PR head: 0.714 s, load 1.70 | PASS |
| No-foreign output byte-identical | 86 pre-existing change-log tests pass unchanged | PASS |
| One definition of foreign | guard imports `foreignSections`; K9 asserts `foreignSections(upsertChangeLog(x,row))` is `[]` | PASS |
| Mutation-proven | implementation report: two engine mutations killed; guard red on the unrepaired tree | PASS |
| `npm run ci` incl. `bundle:check`, `validate` | `bundle:check` rc 0; `quick_validate.py` over the 48 changed skills, 0 failures; full `npm run ci` runs at the merge gate | PASS (partial — full ci not run in this cycle) |
| Four docs repaired, one row, `updated:` bumped | diffs + `--check-append-only` ok | PASS |
| Guard green on the PR head | 2/2 pass | PASS |
| CHANGELOG states the lift | Unreleased → Changed | PASS |

---

## Breaking Changes Validation

### Breaking Change: a document with a foreign section gets a larger diff on its next write
Documented: Yes (task §5, CHANGELOG)
Migration Path Provided: Yes (repair via `liftForeignSections` or the next write; corpus guard names offenders)
Migration Tested: Yes (four corpus documents repaired)
Consumer Code Updated: N/A (no API removed)

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: a foreign section's date-first table is taken as the log (TASK-230-CR-1)**
- **Severity**: HIGH
- **Category**: Functional
- **Observation**: `partitionForeign` sets `logStart = findFirst(isEntryRow)` across the whole block (`shared/resources/change-log.js:448`). A before-side `## Definition of Done` with a `| Date | Run | Result |` table and a row `| 2026-10-02 | run 1 | gaps |` is reported as foreign, but after `liftForeignSections` the `run 1` row is still inside the block, parsed as a log entry.
- **Impact**: Fake history in the Change Log, reported as a successful lift; persists across later writes.
- **Recommendation**: anchor the log table on the removed Change Log heading's index.
- **Priority**: P1

### MEDIUM Severity Issues (1)

**Issue: with no log entry rows, the fallbacks split a foreign table (TASK-230-CR-2)**
- **Severity**: MEDIUM
- **Category**: Functional
- **Observation**: `shared/resources/change-log.js:452`. `## Change Log` followed by `## Deferred Work` and an `| Item | Owner |` table: after `liftForeignSections` the row `| thing | dev |` is inside the log.
- **Recommendation**: the same heading anchor; add a K case for a block with no log table.
- **Priority**: P2

### LOW Severity Issues (2)

- §9 Success Criteria boxes are unticked; evidence for each is above.
- CR-4 (cleanup): `upsertChangeLog`'s JSDoc now sits above `rebuildChangeLog`.

**Total Issues**: HIGH: 1, MEDIUM: 1, LOW: 2 (+ 1 advisory bug, CR-3)

No bug report files were created: the pipeline's fix loop takes the gate's `top_issues[]` directly.

---

## NFR Assessment

### Performance — PASS
Corpus guard 0.714 s wall on the PR head (load average 1.70, `uptime; time command node --test evals/shared/tests/change-log-foreign-section-corpus.test.mjs`).

### Reliability — CONCERNS
CR-1 to CR-3 misfile foreign table rows into the log silently.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: internal`. `internal_reason`: `shared/resources/change-log.js#foreignSections` reads only work-item documents (task, story, epic, PRD) that this repository's own pipeline writes. The one Markdown sink, `markdown-structure`, models the implementation report, a different document, and probing there would score its reports as the wrong document. Not on the disqualified-entries table. No shell, network or external input.

### Maintainability — PASS
One partition, read by all three consumers. CR-4 cleanup noted.

---

## Code Review

Advisory except where promoted (code-review blocking on for this run).

**Correctness bugs (3):**
- [high/high] `shared/resources/change-log.js:448` — log start is the first date-first row anywhere in the block, so a foreign date-first table is taken as the log → anchor on the Change Log heading's position. **Promoted: TASK-230-CR-1.**
- [medium/high] `shared/resources/change-log.js:452` — with no entry rows, the `| Date |` and first-pipe fallbacks can land on a foreign table → same heading anchor plus a no-log-table K case. **Promoted: TASK-230-CR-2.**
- [medium/medium] `shared/resources/change-log.js:450` — the header back-up walks through a foreign table written directly above the Change Log heading with no blank line → stop the back-up at the heading's index. Reproduced on the PR head (`| a | ok |` stays in the block). Advisory by confidence; the CR-1 fix closes it.

**Cleanups (1):**
- `shared/resources/change-log.js:685` — `upsertChangeLog`'s JSDoc is displaced onto `rebuildChangeLog` → move it back.

Anchors: `finding-anchors.js` reason `ok` for all four.

Provenance: all three bugs are in `partitionForeign`, which does not exist on `origin/develop`, so they are new to this change.

boundary: internal (see Security). probes_executed: 0. escaped: 0.

mutation-proven: partitionForeign returns all lines as own → K1–K7, K9–K11 red → covered (implementation report)
mutation-proven: log boundary at first pipe line → K3, K9 red → covered (implementation report)

No fix was made this cycle, so there were no new fix-guarding tests to mutation-prove.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `upsertChangeLog` callers (sync-jira-*, tracker-reconcile, jira-sync fidelity, qa-results, status-history, deferred-work placement) | PASS, 573 |
| Full fast gate (`npm run ci:fast`) | PASS, 6221 / 0 fail |
| `bundle:check` | PASS |

---

## Test Artifacts

### Test Commands Executed
```bash
npm run ci:fast
command node --test evals/shared/tests/change-log-foreign-section-corpus.test.mjs
uptime; time command node --test evals/shared/tests/change-log-foreign-section-corpus.test.mjs
npm run bundle:check
python3 skills/create-skill/scripts/quick_validate.py skills/<each changed skill>/
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <changed md> --diff-base <merge-base> --json
```

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one high and one medium high-confidence correctness bug in the new log-start selection, both reproduced.
**Quality Score**: 60/100

**Deployment Recommendation**: BLOCKED

**Next Steps**: `/qa-fix` cycle 1 — heading-anchored log start, three new K cases (CR-1, CR-2, CR-3 shapes), JSDoc move.

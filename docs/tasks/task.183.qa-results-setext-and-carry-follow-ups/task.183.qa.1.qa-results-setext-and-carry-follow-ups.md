# QA Report: Task 183 - qa-results setext and carry follow-ups

**Task**: [Link to task document](./task.183.qa-results-setext-and-carry-follow-ups.md)
**Gate File**: [task.183.gate.1.qa-results-setext-and-carry-follow-ups.yml](./task.183.gate.1.qa-results-setext-and-carry-follow-ups.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-05
**Testing Completed**: 2026-10-05
**Gate Status**: FAIL

---

## Executive Summary

All five phases are delivered as planned, the four new test blocks pass and all nine mutation proofs hold. The diff review then found a new route to the defect this task closes: a thematic break such as `* * *` is read as a list item, so a setext section under the line that follows it is deleted on replace, where `origin/develop` refused. Two smaller in-scope gaps sit beside it.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (16/16 plan items ticked)
- [x] Tests passing (qa-results suites 98/98)
- [x] Breaking changes documented (CHANGELOG `[Unreleased]` › Fixed)
- [x] Code on feature branch with open PR (#571, OPEN)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit, corpus survey, Step 12 wiring)
- [x] Performance Testing (wall-clock bound with load recorded)
- [x] Regression Testing
- [x] Security Review (boundary rule)
- [x] Code Review (Step 3b, Explore subagent)

### Review Methodology

First review, so the whole branch diff (`origin/develop...HEAD`, 1161 lines, 11 files). Direct tools,
plus one read-only Explore subagent for the diff code review (Step 3b), dispatched 2026-10-05T09:38:35Z;
completion notice `duration_ms` 141519. Each reviewer finding was then reproduced on HEAD and on
`origin/develop` with a scratch driver before grading (provenance, Step 3b item 5b).

Step 4b: not applicable — no runnable prose in the change set (no `SKILL.md` or `shared/resources/*.md` changed).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: setext leans toward refusal (CR5-1) | PASS | R1 green; M1 held | Six CR5-1 shapes refused under both underlines |
| Phase 2: two false refusals (CR-7) | FAIL | R2 green; M2/M2b/M2c held | CR-3 below: a thematic break is matched as a list item |
| Phase 3: Date-column log table (5c CR-1) | CONCERNS | R3 green; M3/M3b/M3c held | CR-1 below: `lastTableStart` still uses the Date-first header |
| Phase 4: bold-label boundaries (5c CR-2, CR2-4) | CONCERNS | R4 green; M4/M4b held | CR-4 below: inner-colon QA label not matched |
| Phase 5: pre-filter, timing, docs | PASS | corpus survey green | Pre-filter in place; task.171 and CHANGELOG updated |

**Overall Phase Completion**: 2/5 phases passed clean; 3 carry findings.

---

## Success Criteria Verification

**Functional:**

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Six CR5-1 shapes refused with a `detail`, document unchanged | refused | refused, byte-identical (R1) | PASS |
| Each CR-7 shape written; every CR5-1 shape still refused | written / refused | as stated (R2), but CR-3 opens a new deletion beside it | FAIL |
| Version-first log refused, Date-less table writable | refused / relocated | as stated (R3); CR-1 is an adjacent shape | CONCERNS |
| `####` group survives three writes; QA label ends the block | survives / ends | as stated (R4); CR-4 inner colon not covered | CONCERNS |

**Performance:**

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Engine + wiring + corpus tests | < 2 s | 1.73 s at load 3.33/21.31/34.94 (`/usr/bin/time -p`) | PASS (re-measure at finalise) |
| No network access | none | `qa-results.js` requires only `./change-log.js` | PASS |

**Code Quality:**

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Corpus write survey | 0 / 0 / 0 | 0 / 0 / 0 | PASS |
| New assertions mutation-proved | all | 9/9 held, re-run by QA | PASS |
| `ci:fast`, `bundle:check`, `validate` | clean | `ci:fast` 5301/5304 (2 LOAD-SENSITIVE budgets, untouched files); `bundle:check` 0 problems; `validate` qa-task ✓ qa-story ✓ | CONCERNS (load) |

---

## Breaking Changes Validation

### Breaking Change: more writes refused, two shapes now written
Documented: Yes (task § 5, CHANGELOG)
Migration Path Provided: Yes — a refusal names the line in its `detail`; the Step 12 halt text names setext
Migration Tested: Yes — corpus survey 0 false refusals
Consumer Code Updated: N/A (bundled copies regenerated)

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: a thematic break is read as a list item (CR-3)**
- **Severity**: HIGH
- **Category**: Functional (content loss)
- **Observation**: `blockContinuations` matches `* * *` and `- - -` with its list-item regex. In
  `* * *` / `  Rollout Notes` / `---` / `keep-me`, the second line is exempted as a continuation and
  the replace returns `replaced` with `keep-me` gone. `origin/develop` returns
  `unbounded structural-line:Rollout Notes / ---` and keeps it.
- **Impact**: reopens the CR5-1 class (a setext section deleted on replace) through a new route.
- **Recommendation**: check `RE_BREAK` before the item regex and reset the offset on a break; add both shapes to R2's refusal loop.
- **Priority**: P1

### MEDIUM Severity Issues (1)

**Issue: two definitions of a log header (CR-1)**
- **Severity**: MEDIUM
- **Category**: Functional
- **Observation**: `lastTableStart` (`logAbove`, the table cut) uses `RE_LOG_HEADER`, while
  `removesStructure` now uses `hasDateColumn`. With a `| Version | Date |` log above a misplaced
  section that quotes a Date-first table, the section is cut at the quoted table and relocated, and the
  quoted row stays inside the change-log block. Identical on `origin/develop`, but in this task's own
  scope: Phase 3 is what made a Version-first table a log table, in one of the two places that decide it.
- **Recommendation**: `lastTableStart` uses `hasDateColumn`; a test that the shape is refused.
- **Priority**: P2

### LOW Severity Issues (1)

- **CR-4** — `QA_LABELS` accepts `**Recommendations**:` but not `**Recommendations:**`; the inner-colon form
  still carries a stale list (reproduced after two writes, same on `origin/develop`). In CR2-4's scope.

**Total Issues**: HIGH: 1, MEDIUM: 1, LOW: 1

No separate bug files: the findings live in the gate's `top_issues[]`, as in task.171's QA cycles.

---

## NFR Assessment

### Performance — PASS
1.73 s at load 3.33 against the 2 s bound. The develop-time figures (1.95–2.10 s at load ~7/50) are in the implementation report; re-measure at finalise with the load recorded.

### Reliability — FAIL
CR-3 deletes content on a shape `origin/develop` refused.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: internal` — `upsertQaResults` decides whether a write to a work-item document is safe; its
  inputs are task and story documents and a render this pipeline writes. No corpus sink models a
  work-item section writer: `markdown-structure` is scoped to implementation reports. Candidates
  considered: `notParagraph`, `blockContinuations`, `hasDateColumn`, `removesStructure`,
  `collectBlocks`. No network, exec or path input.

### Maintainability — PASS
Each new rule names its finding id in a comment; one test block per item.

---

## Code Review

Step 3b, whole branch diff, one Explore reviewer. Each finding reproduced on HEAD and `origin/develop`.

**Correctness bugs (4):**
- [high/high after reproduction] `shared/resources/qa-results.js:356` — CR-3: a thematic break is matched as a list item, deleting a setext section → check `RE_BREAK` first. **Promoted to gate (`code_review_blocking`).**
- [medium/high after reproduction] `shared/resources/qa-results.js:394` — CR-1: `lastTableStart` keeps the Date-first header → use `hasDateColumn`. Promoted.
- [low/high after reproduction] `shared/resources/qa-results.js:167` — CR-4: inner-colon QA label → accept `:` on either side. Promoted.
- [medium/low] `shared/resources/qa-results.js:206` — CR-2: a bold-label block carries every `####` group, including a QA-owned one. Not reproduced on the corpus: 0 of 235 tracked documents carrying `QA Testing Results` have a bold carried label followed by `####` (one bold label found, `story.1.1`, none after it), and the qa-task / qa-story render uses `###` only. Advisory → `recommendations.future`.

**Cleanups (0).**

Mutation spot-check (re-run by QA, `cp` snapshot, restore verified with `cmp`):

```
mutation-proven: notParagraph → old exemption → R1 (+R2) → covered
mutation-proven: drop block exemption → R2 → covered
mutation-proven: comment exempts every line while open → R2 → covered
mutation-proven: any ordered item opens a continuation → R2 → covered
mutation-proven: Date column first cell only → R3 → covered
mutation-proven: header excluded by RE_LOG_HEADER → R3 (+O1) → covered
mutation-proven: blind slice(1, -1) → R3 → covered
mutation-proven: bold block stops at any heading → R4 → covered
mutation-proven: no QA_LABELS stop → R4 → covered
```

9 of 9.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Engine blocks A–Q | PASS (unchanged, 81 tests) |
| Corpus stacking + write survey | PASS (0/0/0) |
| Step 12 wiring (qa-task, qa-story) | PASS |
| Deferred Work placement, create-bug-report heading | PASS |
| Full `ci:fast` | 5301/5304 — 2 LOAD-SENSITIVE per-file budgets in untouched files |

---

## Test Artifacts

### Files Reviewed
`shared/resources/qa-results.js`, `shared/resources/tests/qa-results.test.mjs`, `tests/qa-results-corpus.test.js`, the two bundled copies, CHANGELOG, task.171.

### Test Commands Executed
```bash
command node --test shared/resources/tests/qa-results.test.mjs tests/qa-results-corpus.test.js tests/qa-results-step12-wiring.test.js tests/deferred-work-placement.test.js tests/create-bug-report-bug-reports-heading.test.js
/usr/bin/time -p node --test shared/resources/tests/qa-results.test.mjs tests/qa-results-corpus.test.js tests/qa-results-step12-wiring.test.js
npm run ci:fast
npm run bundle:check
npm run validate -- skills/qa-task/
npm run validate -- skills/qa-story/
```

### Coverage Report
Not measured — the suite has no coverage tooling for `shared/resources/*.js`; mutation proofs stand in.

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-3 (HIGH) — a thematic break is not a list item.
2. CR-1 (MEDIUM) — one log-header definition in `lastTableStart`.
3. CR-4 (LOW) — inner-colon QA label.

### Short-term Actions (Non-Blocking)
1. CR-2 — revisit if a QA render ever emits `####`.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: a HIGH content-loss finding introduced by the change (rule 1).
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.183.qa.1.qa-results-setext-and-carry-follow-ups.md`
**Gate File**: co-located at `task.183.gate.1.qa-results-setext-and-carry-follow-ups.yml`
**Next Steps**: `/qa-fix` for CR-3, CR-1, CR-4; then QA cycle 2 (refute pass).

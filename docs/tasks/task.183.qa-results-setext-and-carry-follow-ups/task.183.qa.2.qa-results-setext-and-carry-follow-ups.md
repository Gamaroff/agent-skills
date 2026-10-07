# QA Report: Task 183 - qa-results setext and carry follow-ups (cycle 2)

**Task**: [Link to task document](./task.183.qa-results-setext-and-carry-follow-ups.md)
**Gate File**: [task.183.gate.2.qa-results-setext-and-carry-follow-ups.yml](./task.183.gate.2.qa-results-setext-and-carry-follow-ups.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-05
**Testing Completed**: 2026-10-05
**Gate Status**: FAIL

---

## Re-Review Context

| Cycle 1 finding | Status | Evidence |
| --- | --- | --- |
| CR-3 (HIGH) thematic break read as a list item | FIXED | `* * *` / `- - -` shapes now refused (`structural-line:Rollout Notes / ---`); R2 asserts both; M5 → R2 red |
| CR-1 (MEDIUM) second log-header definition | PARTIAL | The cycle-1 shape (Version-first log *above* a quoting section) is refused (R3; M6 → R3 red). The mirror shapes below remain — CR2-2 |
| CR-4 (LOW) inner-colon QA label | FIXED | `**Recommendations:**` ends the block; R4 asserts both colon positions; M7 → R4 red |
| CR-2 (advisory) QA `####` carried | unchanged | Advisory, repeated this cycle as CR2-4 |

---

## Executive Summary

The three cycle-1 fixes hold and their tests are mutation-proved. The refute pass found a new route
to the deletion this task closes: a `<!--` inside a fence leaves the comment context open, so a later
paragraph line that merely contains `-->` is exempted and the setext section under it is deleted.
Version-first logs are also still cut or stripped in two shapes this task scopes.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing (qa-results suites 105/105)
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#571)

### Testing Approach

- [x] Automated Testing
- [x] Regression Testing
- [x] Security Review (boundary rule)
- [x] Code Review (refute pass)

### Review Methodology

Cycle 2 — refute pass over the whole branch diff (`origin/develop...HEAD`, 1727 lines), per Step 3b.
`SAFETY_REPROBE=false` (clause 1: prior security PASS). One Explore reviewer dispatched
2026-10-05T10:33:08Z; completion notice `duration_ms` 291384. Every finding reproduced on HEAD
(`dd91fe76`) and on `origin/develop` with a scratch driver before grading.

Re-review scope: unscoped — cycle 2 refute pass (one prior gate).

Step 4b: not applicable — no runnable prose in the change set.

---

## New Findings This Cycle

- **[high]** `shared/resources/qa-results.js:355` — CR2-1: a `<!--` inside a fence keeps the comment
  context open; a later `Retest flow: login --> dashboard` over `---` is exempted and the setext
  section is deleted (`replaced`, `keep-me` gone). `origin/develop`: `unbounded`
  `structural-line:Retest flow: login --> dashboard / ---`. → reset contexts on a fence line; exempt
  a closing line only when it ends with `-->`.
- **[medium]** `shared/resources/qa-results.js:616` — CR2-2: the cut still finds only a Date-first
  table. A section above a Version-first log that quotes `| Date | Result |` is cut at the quoted table
  and the quoted row stays in the log; a header-only Version-first log loses its header on relocate.
  Both identical on `origin/develop`, but in this task's own scope (5c CR-1, Version-first logs), and
  the `lastTableStart` comment claims such a log "is seen and the write refused rather than cut".
  → cut only when the last Date-column table is Date-first; a header-only Date-column log under
  `underLog` is structural.
- **[medium/medium]** CR2-3 — `**Deferred Work:**` (colon inside the bold) is not recognised as a
  carried block and its items are deleted. **Pre-existing**: identical on `origin/develop`; 0 tracked
  documents carry the shape. → `recommendations.future`.
- **[low/medium]** CR2-4 — a QA `####` after a carried bold block is carried (repeat of cycle 1's
  advisory CR-2). → `recommendations.future`.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: setext leans toward refusal | PASS | R1 |
| Phase 2: CR-7 by context | FAIL | CR2-1 |
| Phase 3: Date-column log table | CONCERNS | CR2-2 |
| Phase 4: bold-label boundaries | PASS | R4 (+inner colon) |
| Phase 5: pre-filter, timing, docs | PASS | |

---

## Success Criteria Verification

| Criterion | Status | Notes |
| --- | --- | --- |
| CR5-1 shapes refused | PASS | R1 |
| CR-7 shapes written; CR5-1 still refused | FAIL | CR2-1 is a new deletion beside it |
| Version-first log refused, Date-less table writable | CONCERNS | CR2-2 mirror shapes |
| `####` group kept; QA label ends the block | PASS | R4 |
| Engine + wiring + corpus < 2 s | PASS (cycle 1, 1.73 s at load 3.33) | re-measure at finalise |
| Corpus write survey 0/0/0 | PASS | |
| Mutation proofs | PASS | 13/13 (M5–M7 re-run by QA this cycle) |

---

## Breaking Changes Validation

Unchanged from cycle 1 — PASS.

---

## Issues Found

### HIGH Severity Issues (1)
**CR2-1** — see New Findings. Category: Functional (content loss). Priority P1.

### MEDIUM Severity Issues (1)
**CR2-2** — see New Findings. Priority P2.

### LOW / advisory (2)
CR2-3 (pre-existing → future), CR2-4 (advisory → future).

**Total Issues**: HIGH: 1, MEDIUM: 1 (gating); 2 advisory.

No separate bug files, as in cycle 1 and task.171.

---

## NFR Assessment

### Performance — PASS
No timing-relevant change this cycle.

### Reliability — FAIL
CR2-1 deletes a section `origin/develop` refused.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: internal` — unchanged from cycle 1: `upsertQaResults` judges documents and a render this
  pipeline writes; no corpus sink models a work-item section writer. Candidates considered:
  `notParagraph`, `blockContinuations`, `hasDateColumn`, `lastTableStart`, `removesStructure`,
  `collectBlocks`.

### Maintainability — PASS

---

## Code Review

**Correctness bugs (4):** CR2-1 (high/high, promoted), CR2-2 (medium/high, promoted), CR2-3
(medium/medium, pre-existing → future), CR2-4 (low/medium, advisory → future).

**Cleanups (0).**

```
mutation-proven: break opens a continuation → R2 → covered
mutation-proven: existence uses Date-first → R3 → covered
mutation-proven: cut uses any Date column → R3 (+O1) → covered
mutation-proven: inner colon not accepted → R4 → covered
```

4 of 4 cycle-1 fix proofs re-run by QA.

---

## Regression Testing

qa-results engine, corpus, Step 12 wiring, placement and bug-reports heading suites: 105/105.

---

## Test Artifacts

### Test Commands Executed
```bash
command node --test shared/resources/tests/qa-results.test.mjs tests/qa-results-corpus.test.js tests/qa-results-step12-wiring.test.js tests/deferred-work-placement.test.js tests/create-bug-report-bug-reports-heading.test.js
```

### Coverage Report
Not measured; mutation proofs stand in.

---

## Recommendations

### Immediate Actions (Blocking)
1. CR2-1 (HIGH)
2. CR2-2 (MEDIUM)

### Short-term Actions (Non-Blocking)
1. CR2-3 follow-up (inner-colon carried label)
2. CR2-4 (revisit if a render ever emits `####`)

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: a HIGH content-loss finding introduced by the change (rule 1).
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.183.qa.2.qa-results-setext-and-carry-follow-ups.md`
**Gate File**: co-located at `task.183.gate.2.qa-results-setext-and-carry-follow-ups.yml`
**Next Steps**: `/qa-fix` CR2-1, CR2-2; QA cycle 3.

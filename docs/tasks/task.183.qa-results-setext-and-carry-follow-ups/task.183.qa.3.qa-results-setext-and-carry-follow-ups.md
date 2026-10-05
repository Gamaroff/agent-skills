# QA Report: Task 183 - qa-results setext and carry follow-ups (cycle 3)

**Task**: [Link to task document](./task.183.qa-results-setext-and-carry-follow-ups.md)
**Gate File**: [task.183.gate.3.qa-results-setext-and-carry-follow-ups.yml](./task.183.gate.3.qa-results-setext-and-carry-follow-ups.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-05
**Testing Completed**: 2026-10-05
**Gate Status**: FAIL

---

## Re-Review Context

| Cycle 2 finding | Status | Evidence |
| --- | --- | --- |
| CR2-1 (HIGH) `<!--` inside a fence kept the comment context open | FIXED for its shape | fenced shape and mid-line closer refused (R2); M8, M9 → R2 red |
| CR2-2 (MEDIUM) Version-first log cut at a quoted table / header-only log stripped | FIXED for its shapes, but its consolidation opened CR3-2 | R3 shapes refused; M10, M11, M11b → R3 red |
| CR2-3, CR2-4 | unchanged (future / advisory) | |

---

## Executive Summary

Cycle 2's fixes hold for the shapes they named. The scoped review found two more deletions the
change introduces, each through the code a previous fix touched: a one-line comment opener or an
item-indented opener leaves the comment context open (CR3-1), and the consolidated log-table lookup
makes a marker-less log with a `| Reviewer | Date |` table look table-ful, so its real log row is
deleted (CR3-2). HIGH findings per cycle: 1, 1, 2. **The convergence check trips: the loop is not
converging and escalates.**

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Review Methodology

Cycle 3. Re-review scope: files changed since gate 2 (head dd91fe76c796; 7 files) — default.
`SAFETY_REPROBE=false` (clause 1: prior security PASS). One Explore reviewer dispatched
2026-10-05T10:58:16Z; completion notice `duration_ms` 308125. The reviewer also compared the old and
new engines across all 168 tracked documents carrying a QA section: no verdict or output changed.
Both findings reproduced on HEAD (`8df4559d`) and on `origin/develop` with a scratch driver.

Step 4b: not applicable — no runnable prose in the change set.

---

## New Findings This Cycle

- **[high]** `shared/resources/qa-results.js:363` — CR3-1: the opener test searches for `-->` only
  after `<!--`, so `<!-->` and `<!--->` (one-line HTML blocks) leave the comment context open; an
  opener indented under a list item also opens it although the item ends before a column-0 `-->`.
  A later lone `-->` line is then exempted and the setext section under it deleted. Measured:
  `<!-->`, `<!--->` and `- item` / `  <!--` / `-->` / `---` all `replaced` with the content gone on
  HEAD; `unbounded structural-line:--> / ---` on `origin/develop`.
- **[high]** `shared/resources/qa-results.js:636` — CR3-2: `underTablelessLog` now asks
  `lastTableStart`, which reports any Date-column table. A marker-less `## Change Log` holding
  `| Reviewer | Date |` above the section is no longer table-less, `underLog` is false, and the
  replace deletes the log row below the section. Measured: HEAD `replaced`, log row deleted;
  `origin/develop` `relocated`, log row kept.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1 | PASS | R1 |
| Phase 2 | FAIL | CR3-1 |
| Phase 3 | FAIL | CR3-2 |
| Phase 4 | PASS | R4 |
| Phase 5 | PASS | |

---

## Success Criteria Verification

| Criterion | Status |
| --- | --- |
| CR5-1 shapes refused | PASS |
| CR-7 shapes written; CR5-1 still refused | FAIL (CR3-1 deletion beside it) |
| Version-first log refused, Date-less table writable | FAIL (CR3-2 deletion) |
| `####` group kept; QA label ends the block | PASS |
| Corpus write survey 0/0/0 | PASS |

---

## Issues Found

### HIGH Severity Issues (2)
CR3-1, CR3-2 — see New Findings. Category: Functional (content loss). Priority P1.

**Total Issues**: HIGH: 2 (gating); 2 carried advisory (CR2-3, CR2-4).

No separate bug files, as in cycles 1–2.

---

## NFR Assessment

### Performance — PASS
### Reliability — FAIL
Both findings delete content on shapes `origin/develop` handled safely.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: internal` — unchanged: no corpus sink models a work-item section writer.

### Maintainability — CONCERNS
Three consecutive HIGH findings on `shared/resources/qa-results.js`, each in the context inference
(`blockContinuations`) or the log-table reach (`lastTableStart`) that the previous fix touched.

---

## Code Review

**Correctness bugs (2):** CR3-1 (medium/high from the reviewer; HIGH on reproduction — a deletion
introduced by the change), CR3-2 (medium/medium from the reviewer; HIGH on reproduction — same
reason). Both promoted (`code_review_blocking`).

**Cleanups (0).**

No new mutation proofs this cycle (no fix was made); cycle-2 proofs M8–M11b were run in 5b.

---

## Regression Testing

qa-results suites 105/105 at HEAD; the reviewer's 168-document old/new comparison found no change on
the tracked corpus — every finding here is a constructed shape, not a tracked document.

---

## Test Artifacts

### Test Commands Executed
```bash
command node --test shared/resources/tests/qa-results.test.mjs tests/qa-results-corpus.test.js tests/qa-results-step12-wiring.test.js tests/deferred-work-placement.test.js tests/create-bug-report-bug-reports-heading.test.js
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Escalate: the loop is not converging (HIGH 1, 1, 2). See the gate's `recommendations.immediate`
   for two structural options.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: two HIGH content-loss findings introduced by the change; convergence check tripped.
**Quality Score**: 60/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.183.qa.3.qa-results-setext-and-carry-follow-ups.md`
**Gate File**: co-located at `task.183.gate.3.qa-results-setext-and-carry-follow-ups.yml`
**Next Steps**: human decision on the escalation (see the implementation report).

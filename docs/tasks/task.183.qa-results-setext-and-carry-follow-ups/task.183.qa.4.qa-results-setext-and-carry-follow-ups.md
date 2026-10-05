# QA Report: Task 183 - qa-results setext and carry follow-ups (cycle 4)

**Task**: [Link to task document](./task.183.qa-results-setext-and-carry-follow-ups.md)
**Gate File**: [task.183.gate.4.qa-results-setext-and-carry-follow-ups.yml](./task.183.gate.4.qa-results-setext-and-carry-follow-ups.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-05
**Testing Completed**: 2026-10-05
**Gate Status**: FAIL

---

## Re-Review Context

| Cycle 3 finding | Status | Evidence |
| --- | --- | --- |
| CR3-1 (HIGH) one-line / item-indented comment openers | FIXED | the comment exemption is gone; `<!-->`, `<!--->`, item-indented shapes refused (R2); M13 → R2 red |
| CR3-2 (HIGH) `| Reviewer | Date |` above a marker-less log | FIXED | relocated with every row kept (R3); M12 → R3 red |

---

## Executive Summary

The escalation fix closed both cycle-3 findings. The remaining list-continuation exemption then
produced two more deletions: an item line inside an HTML block, and a tab after the list marker.
`QA_LABELS` also drops a bug list grouped under a `**Critical Issues**` sub-label. HIGH findings per
cycle: 1, 1, 2, 2. **The convergence check trips again.**

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Review Methodology

Cycle 4, after the operator's re-entry grant (+2 cycles). Re-review scope: files changed since gate 3
(head 8df4559db5e0; 11 files) — default. `SAFETY_REPROBE=false`. One Explore reviewer dispatched
2026-10-05T11:22:03Z; completion notice `duration_ms` 352624. The reviewer ran a differential check
of HEAD against `origin/develop` through `upsertQaResults` (fixed shapes plus about 1M generated
documents) and confirmed heading shapes with the `marked` CommonMark parser. Every finding below was
reproduced again on HEAD (`59cd6d95`) and `origin/develop` with a scratch driver.

Step 4b: not applicable — no runnable prose in the change set.

---

## New Findings This Cycle

- **[high]** `shared/resources/qa-results.js:359` — CR4-1: a list context opens on an item line inside
  an HTML block that also closes it (`<!--` / `- note -->` / `  Real Section` / `---`, and the `<pre>`
  form). HEAD: `replaced`, content deleted. `origin/develop`: `unbounded structural-line:Real Section / ---`.
- **[high]** `shared/resources/qa-results.js:363` — CR4-2: a tab after the marker counts as one column,
  so `-<TAB># Heading` / `  Real Section` / `---` exempts a top-level paragraph line. HEAD deletes;
  `origin/develop` refuses.
- **[medium]** `shared/resources/qa-results.js:203` — CR4-3: `QA_LABELS` ends a bold carried block at
  `**Critical Issues**` even when a list follows; a grouped bug list loses both links. HEAD:
  `bug-1:false bug-2:false`; `origin/develop`: both kept.
- **[low]** CR4-4 — a QA `####` after a carried bold block is carried as stale text (duplicate, not
  deletion; repeat of CR2-4). → future.
- **[cleanup]** CR4-5 — CHANGELOG / task.171 / task.183 § 5 wording is over-narrow while the list
  context exists. → future.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1 | PASS | R1 |
| Phase 2 | FAIL | CR4-1, CR4-2 |
| Phase 3 | PASS | R3 (CR3-2 closed) |
| Phase 4 | FAIL | CR4-3 |
| Phase 5 | PASS | |

---

## Success Criteria Verification

| Criterion | Status |
| --- | --- |
| CR5-1 shapes refused | PASS |
| CR-7 list shape written; comment shape and CR5-1 refused | FAIL (CR4-1, CR4-2 deletions) |
| Version-first log refused, Date-less table writable | PASS |
| `####` group kept; QA label ends the block | FAIL (CR4-3) |
| Corpus write survey 0/0/0 | PASS |

---

## Issues Found

**Total Issues**: HIGH: 2, MEDIUM: 1 (gating); 2 advisory. No separate bug files.

---

## NFR Assessment

### Performance — PASS
### Reliability — FAIL
### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: internal` — unchanged.

### Maintainability — CONCERNS
The list-continuation inference has produced four deletion routes (CR-3, CR2-1, CR4-1, CR4-2), the
same class the comment exemption was removed for.

---

## Code Review

**Correctness bugs (4):** CR4-1 (high/high), CR4-2 (medium/high from the reviewer; HIGH on
reproduction — a deletion), CR4-3 (low/medium from the reviewer; MEDIUM on reproduction — carried
bug links lost), CR4-4 (low, future). All three gating findings promoted (`code_review_blocking`).

**Cleanups (1):** CR4-5.

No new mutation proofs this cycle (no fix made); M12 and M13 were run when the escalation fix landed.

---

## Regression Testing

qa-results suites 105/105 at HEAD; the reviewer's differential run found no output change on the
tracked corpus — every finding is a constructed shape.

---

## Recommendations

### Immediate Actions (Blocking)
1. Escalate. Recommended: remove `blockContinuations` entirely (CR-7 → follow-up) and drop
   `Critical Issues` / `Issues Found` from `QA_LABELS`.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: two HIGH content-loss findings introduced by the change; convergence check tripped.
**Quality Score**: 50/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.183.qa.4.qa-results-setext-and-carry-follow-ups.md`
**Gate File**: co-located at `task.183.gate.4.qa-results-setext-and-carry-follow-ups.yml`
**Next Steps**: human decision on the second escalation.

# QA Report: Task 118 - review-security's strongest verdict rests on a probe count the agent types, not one the engine emitted

**Task**: [Link to task document](./task.118.probes-executed-from-engine.md)
**Gate File**: [task.118.gate.9.probes-executed-from-engine.yml](./task.118.gate.9.probes-executed-from-engine.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-17
**Testing Completed**: 2026-09-17
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 9. The cycle-8 fixes are **FIXED** and mutation-proven (library `recordRun` refuses an orphaned snapshot; `ran_at` validated). The scoped review returned three items, none a high-confidence bug: a race in the orphan-snapshot check that can make a concurrent *first* run exit 2 and drop its control — the reviewer rated it low/low; QA rates the mechanism certain by reading and promotes it because concurrent first runs are exactly what the entry-file layout exists to serve — and two cleanups (a duplicated prologue; an exit-code assertion that collapses non-zero codes).

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — CR9-1 closed

---

## Re-Review Context

| Prior finding | Status | Verification |
| --- | --- | --- |
| CR8-1 library `recordRun` unguarded | **FIXED** | orphan snapshot → throws, no `.d` created. Mutation: read removed → red. |
| CR8-2 `ran_at` | **FIXED** | non-string rejected; `updated_at` latest string. Mutation: validation dropped → red. |
| CR8-3/4/5 | FIXED | JSDoc reattached; by-entry selection; spawn error rejects. |

**Re-review scope**: since gate 8 — 2 files, 1,236-line scoped diff. `SAFETY_REPROBE=false`. The reviewer again read the tree during QA's mutation harness and correctly used HEAD as ground truth.

---

## New Findings This Cycle

- **[low]** `security-probe.mjs:637` — orphan check TOCTOU: `readdir` ENOENT, sibling creates dir + entry + snapshot, `existsSync(snapshot)` true → spurious "no entry directory", exit 2, control lost. → re-check the directory before throwing. **Gate CR9-1.**
- cleanups — CR9-2 `recordRun` repeats `preflightRecord`'s prologue (entries parsed three times per CLI run); CR9-3 exit-code assertion collapses to 0/1.

---

## Review Methodology
Standard mode, re-review cycle 9, default narrowing; one read-only Explore subagent (2m14s, 3 findings). **Step 4b**: n/a. **Boundary**: false, 0, `reasoned`. **Platform variance**: n/a.

## Implementation Verification
Phase 1 CONCERNS (CR9-1, low); Phases 2/2b/3 PASS.

## Success Criteria Verification
Unchanged: SC1–4 PASS, SC5 N/A.

## Breaking Changes Validation
Unchanged — PASS.

## Issues Found
HIGH 0 · MEDIUM 0 · LOW 1 gating · 2 cleanups.

## NFR Assessment
Performance PASS · Reliability CONCERNS (CR9-1) · Security PASS (`reasoned`, 0, `boundary: false`) · Maintainability PASS.

---

## Code Review
Scoped Step 3b, blocking. CR9-1 (low/low → QA low/high). CR9-2/3 cleanups.

**Mutation proofs (QA, cycle-8 fixes):**
```
mutation-proven: recordRun stops reading first → library call refuses to write over an orphaned snapshot → covered
mutation-proven: ran_at validation dropped → rejects a non-string ran_at → covered
```

## Loop guards (cycle 9)
HIGH `0 ×9`; diminishing-returns `continue` (product-defect-signal, on a single low).

## Regression Testing
`npm run ci:fast` — 3400 tests, 3399 pass, 1 skipped, 0 fail. `review-security.test.js` 54/54.

---

## Final Assessment
**Gate Status**: CONCERNS · **Quality Score**: 90/100 · **Deployment Recommendation**: CONDITIONAL — CR9-1 closed.

**QA Report**: `task.118.qa.9.probes-executed-from-engine.md` · **Gate File**: `task.118.gate.9.probes-executed-from-engine.yml` · **Next Steps**: `/qa-fix` cycle 9 — CR9-1/2/3, then cycle 10 → 5c.

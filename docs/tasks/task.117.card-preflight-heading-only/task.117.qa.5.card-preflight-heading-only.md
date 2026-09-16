# QA Report: Task 117 - The card preflight passes a Success Criteria block that renders as a bold label with nothing under it (cycle 5)

**Task**: [Link to task document](./task.117.card-preflight-heading-only.md)
**Gate File**: [task.117.gate.5.card-preflight-heading-only.yml](./task.117.gate.5.card-preflight-heading-only.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-17
**Testing Completed**: 2026-09-17
**Gate Status**: CONCERNS

---

## Executive Summary

The cycle-4 finding is fixed and bug.6 is closed: the live card announces a cut again. The
narrowed review found the counter introduced for that fix imprecise in three ways — it is not
fence-aware, it counts label paragraphs, and its `omitted` differs from the prose path's — which
mis-words the preflight's *advisory* message on two shapes and mis-counts one pointer. The card's
content is right on every shape reviewed across five cycles. One medium, two low, two cleanups;
CONCERNS. This is the fifth cycle of the budget: its fix runs, and then the loop escalates to a
person by rule.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified
- [x] Task `ready-for-review`; 5/5 phases; bug.6 Ready for QA on entry
- [x] Fast gate 3366/3367 at `0d3160c9`; 498/498 across card + sync suites here
- [x] PR #416 OPEN, head `0d3160c9` = local HEAD

### Review Methodology
Direct tools plus one Explore diff reviewer over the narrowed set (3 files changed since gate 4).
Reviewer dispatched 08:16 → returned 08:18; all three bugs reproduced in-line.
**Re-review scope: since gate 4 — 3 files (default).** Safety re-probe not triggered.

---

## Re-Review Context

| Cycle-4 finding | Status | Evidence |
| :--- | :--- | :--- |
| CR4-1 omitted starves the card pointer | **FIXED** | `summaryBlockNodes` renders `+1 more` for label + fence; M13 red |
| CR4-2 shell-out in the sync-scope test | **FIXED** | `readdirSync` walk; 0 `execSync` |
| CR4-3 tautological assertion | **FIXED** | asserts `isLabelOnly` / `dropHeadingLines` on inline bold |

Bug report `task.117.bug.6`: **Closed**.

---

## New Findings This Cycle

- **[medium]** `jira-sync.js:1452` — `beneath` over blank-line paragraphs, no fence awareness: `**Before** (GitHub):` + a fence with a blank line → `beneath: 1`, "stopped" wording and the convert-to-`###` fix, where nothing summarisable is beneath. Card unaffected. **CR5-1**, [bug.7](./task.117.bug.7.beneath-count-not-fence-aware.md)
- **[low]** `jira-sync.js:1451` — heading-only `omitted` counts after-blocks only; the prose path counts every other paragraph (`+1 more` vs `+2 more` for the same leading-table shape). **CR5-2**, bug.7
- **[low]** `jira-sync.js:1813` — `isProseBlock` admits label paragraphs, so label + label → `beneath: 1`. **CR5-3**, bug.7
- cleanup — in-test `require` of already-imported symbols. **CR5-4**
- cleanup — `summariseSection` API row in `tracker-card-summary.md` predates `transform` / `beneath`. **CR5-5**

---

## Implementation Verification

| Phase | Status | Notes |
| :--- | :--- | :--- |
| 1 corpus test | PASS | 0 of 120 |
| 2a summariser | PASS | card output correct on every reviewed shape |
| 2b `heading-only` | CONCERNS | advisory wording keyed on an imprecise `beneath` (CR5-1/3) |
| 2c scope | PASS | |
| 3 mutation proofs | PASS | 13 re-run |

## Success Criteria — criteria 1–4 PASS; 5 pending finalise
## Breaking Changes Validation — PASS (unchanged)

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2 (+2 cleanups; 2 pre-existing carried)

---

## NFR Assessment

### Performance — PASS
### Reliability — PASS — the card path is correct on every shape; remaining defects are advisory wording
### Security — PASS — **Evidence**: measured, **Probes executed**: 161 (re-run; unchanged)
### Maintainability — CONCERNS — CR5-4, CR5-5

---

## Code Review

Narrowed scope. `code_review_blocking=true`: CR5-1..3 (bug, high confidence) entered the gate.
**Boundary rule**: `boundary: true`; `probes_executed: 161`.
**Mutation proofs**: thirteen re-run (M1–M13) — all **covered**.
**Step 4b**: not applicable — no runnable prose in the change set since gate 4.

---

## Regression Testing

| Area | Result |
| :--- | :--- |
| card suites + four `sync-jira-*` suites | 498/498 |
| `npm run ci:fast` (at `0d3160c9`) | 3366/3367, exit 0 |
| `bundle:check` | OK |

---

## Recommendations

### Immediate (Blocking)
1. CR5-1..3 — fence-aware, non-label `beneath`; `omitted = paras.length - 1`; fixtures.

### Short-term
1. CR5-4, CR5-5.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: The deliverable is correct on the card path; the advisory counter needs one more precision pass. Fifth cycle — after its fix the loop limit hands the run to a person, whose one remaining action is to confirm the cycle-5 fix (mutation-proven, suite-green, but ungated by rule).
**Quality Score**: 85/100
**Deployment Recommendation**: CONDITIONAL

---

**QA Report**: `task.117.qa.5.card-preflight-heading-only.md` · **Gate**: `task.117.gate.5.card-preflight-heading-only.yml`

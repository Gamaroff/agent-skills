# QA Report: Task 117 - The card preflight passes a Success Criteria block that renders as a bold label with nothing under it (cycle 4)

**Task**: [Link to task document](./task.117.card-preflight-heading-only.md)
**Gate File**: [task.117.gate.4.card-preflight-heading-only.yml](./task.117.gate.4.card-preflight-heading-only.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-17
**Testing Completed**: 2026-09-17
**Gate Status**: CONCERNS

---

## Executive Summary

All six cycle-3 findings are fixed and bug.4/bug.5 are closed. The narrowed review found one
medium defect that cycle 2 introduced while fixing CR2-2: the `heading-only` `omitted` count now
excludes fences and tables beneath the label, and `omitted` is also what the **live card** uses for
its `+N more` pointer — so a label followed by only a fence is published bare, with nothing saying
content was cut. Two test-hygiene cleanups. CONCERNS; the next cycle is the last in the budget.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task `ready-for-review`; 5/5 phases; bug.4/5 Ready for QA on entry
- [x] Fast gate 3365/3366 at `50b71e61`; 497/497 across card + sync suites here
- [x] PR #416 OPEN, head `50b71e61` = local HEAD

### Review Methodology

Direct tools plus one Explore diff reviewer over the narrowed set (6 files changed since gate 3).
Reviewer dispatched 08:03 → returned 08:07 (budget 10 min); the medium finding reproduced on the
live card path (`summaryBlockNodes`) before entering the gate.

**Re-review scope: since gate 3 — 6 files (default).** Safety re-probe not triggered.

---

## Re-Review Context

| Cycle-3 finding | Status | Evidence |
| :--- | :--- | :--- |
| CR3-1 colon inside the bold | **FIXED** | `**Functional:**` alone → `heading-only`; `**None**` content; M10 red |
| CR3-2 rows in fenced examples | **FIXED** | `change-log.js` finds a real section in task.42/43 (1 entry each); no row inside any fence |
| CR3-3 task.44 row outside table | **FIXED** | 9 entries, last is the 2026-09-17 row |
| CR3-4 indented fence / list label | **FIXED** | column-0 anchor; M11 red |
| CR3-5 duplicate branches | **FIXED** | one branch, before `empty` |
| CR3-6 sync-scope test one script | **FIXED** | four scripts, non-vacuity floor; M12 red |

Bug reports `task.117.bug.4`, `task.117.bug.5`: **Closed**.

---

## New Findings This Cycle

- **[medium]** `shared/resources/jira-sync.js:1444` — heading-only `omitted` = summarisable blocks beneath only; `summaryBlockNodes` renders `+N more` from `omitted`, so `**Before** (GitHub):` + fence publishes the bare label with no pointer on the live card. → honest `omitted`, separate `beneath`. **CR4-1**, [bug.6](./task.117.bug.6.heading-only-omitted-starves-card-pointer.md)
- cleanup `card-preflight.test.mjs:411` — the sync-scope test shells out (`execSync find`) where the corpus test beside it walks with `readdirSync`. **CR4-2**
- cleanup `jira-sync-card-summary.test.mjs:583` — `assert.match("**Label:** with trailing text", /\*\*/)` is tautological. **CR4-3**

---

## Implementation Verification

| Phase | Status | Notes |
| :--- | :--- | :--- |
| 1 corpus test | PASS | 0 of 120 |
| 2a summariser | CONCERNS | `omitted` on the heading-only path starves the card pointer (CR4-1) |
| 2b `heading-only` | PASS | |
| 2c scope | PASS | |
| 3 mutation proofs | PASS | 12 across three cycles, re-run |

## Success Criteria — as cycle 3 (criterion 2 CONCERNS via CR4-1; criterion 5 pending finalise)

## Breaking Changes Validation — PASS (unchanged)

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0 (+2 cleanups; 2 pre-existing carried)

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS — CR4-1 breaks the "trimming is announced" contract on one shape
### Security — PASS — **Evidence**: measured, **Probes executed**: 161 (re-run; unchanged)
### Maintainability — PASS — only test-hygiene cleanups remain

---

## Code Review

Narrowed scope. `code_review_blocking=true`: CR4-1 (bug, high confidence) entered the gate. Cleanups advisory.

**Boundary rule**: `boundary: true`; `probes_executed: 161`.

**Mutation proofs**: twelve re-run (M1–M12) — all **covered**.

**Step 4b**: no prose file with a bash fence changed since gate 3 (the three task docs carry no bash fences in the changed hunks; `jira-sync.js` and tests are not prose). `Step 4b: not applicable — no runnable prose in the change set since gate 3`.

---

## Regression Testing

| Area | Result |
| :--- | :--- |
| card suites + four `sync-jira-*` suites | 497/497 |
| `npm run ci:fast` (at `50b71e61`) | 3365/3366, exit 0 |
| `bundle:check` | OK |

---

## Recommendations

### Immediate (Blocking)
1. CR4-1 — honest `omitted` plus `beneath`; card-path fixture asserting the pointer survives.

### Short-term
1. CR4-2, CR4-3.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Cycle 3 closed; one medium contract regression from cycle 2 on the live card path, narrow and reproduced. HIGH 0/0/0/0 — guards not applicable.
**Quality Score**: 85/100
**Deployment Recommendation**: CONDITIONAL

---

**QA Report**: `task.117.qa.4.card-preflight-heading-only.md` · **Gate**: `task.117.gate.4.card-preflight-heading-only.yml` · **Next**: `/qa-fix` cycle 4, then cycle 5 (last).

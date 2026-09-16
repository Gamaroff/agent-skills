# QA Report: Task 117 - The card preflight passes a Success Criteria block that renders as a bold label with nothing under it (cycle 3)

**Task**: [Link to task document](./task.117.card-preflight-heading-only.md)
**Gate File**: [task.117.gate.3.card-preflight-heading-only.yml](./task.117.gate.3.card-preflight-heading-only.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-17
**Testing Completed**: 2026-09-17
**Gate Status**: CONCERNS

---

## Executive Summary

Every cycle-2 finding is fixed and bug.3 is closed. The narrowed review found two medium defects
in cycle-2's own work: the bare-bold shortcut tests for a trailing colon on the raw line and so
misses `**Functional:**` (colon inside the bold — the documented label shape), and the Change Log
rows written into task.42 and task.43 landed inside the specs' fenced *example* tables because
neither document has a real Change Log section. Plus two low and two cleanups. HIGH count 0 on all
three gates; neither loop guard fires. CONCERNS, one more cycle.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task `ready-for-review`; 5/5 phases; bug.3 Ready for QA on entry
- [x] Fast gate 3364/3365 at `b857a2b1`; 496/496 across card + sync suites here
- [x] PR #416 OPEN, head `b857a2b1` = local HEAD

### Review Methodology

Direct tools plus one Explore diff reviewer over the narrowed set. Reviewer dispatched 07:47 →
returned 07:50 (budget 10 min); findings reproduced in-line before entering the gate.

**Re-review scope: since 2026-09-16T21:24:48Z (gate 2) — 20 files (default).** Safety re-probe not
triggered (gate 2 security `PASS` / `measured`).

---

## Re-Review Context

| Cycle-2 finding | Status | Evidence |
| :--- | :--- | :--- |
| CR2-1 dot anywhere disqualifies a label | **FIXED** | `**Changes to jira-sync.js**:` + list → `ok`, `kind: list`; `**None.**` content; M5/M6 red |
| CR2-2 stopped count | **FIXED** | label + fence → "nothing under it"; table above the label not counted; M7 red |
| CR2-3 create-* re-derived remedy | **FIXED** | three SKILL.md bullets defer to the tool's `Fix:` |
| CR2-4 bare `**None**` body | **FIXED** (but see CR3-1) | `**None**` alone → content; `**Functional**` + list → list; M8 red |
| CR2-5 fence parity | **FIXED** (but see CR3-4) | nested ```` / ``` case keeps the label; M9 red |
| CR2-6 sync `scope` | **FIXED** | all four scripts emit it; test covers one (CR3-6) |
| CR2-7 block shape | **FIXED** | `{heading, kind, omitted, status, text}` on both forms |

Bug report `task.117.bug.3`: **Closed**.

---

## New Findings This Cycle

- **[medium]** `shared/resources/jira-sync.js:1360` — the whole-section early return tests `/:\s*$/` on the raw line, so `**Functional:**` and `**Existing System Context:**` are returned as `prose`/`ok`; `**Functional**:` is `heading-only`. → see through the closing bold. **CR3-1**, [bug.4](./task.117.bug.4.colon-inside-bold-shortcut.md)
- **[medium]** `docs/tasks/task.42…:185`, `task.43…:150` — Change Log rows appended inside ```` ```markdown ```` fenced examples in §3; neither document has a real Change Log section. **CR3-2**, [bug.5](./task.117.bug.5.change-log-rows-inside-fenced-examples.md)
- **[low]** `docs/tasks/task.44…:524` — the row sits after a blank line and before `---`; renders as a setext heading, not a table row. **CR3-3**, bug.5
- **[low]** `shared/resources/jira-sync.js:1294` — `makeFenceTracker` caps fence indent at 3 spaces (`RE_FENCE` allowed any), so a fence under a list item at 4+ spaces is untracked and an indented `**Bold**` inside it is dropped. → anchor `RE_BOLD_LABEL` at column 0. **CR3-4**
- cleanup — two near-duplicate `heading-only` branches; fix text names `**Functional**` (now content when alone). **CR3-5**
- cleanup — the sync-scope test executes only `sync-jira-task.js`. **CR3-6**

---

## Implementation Verification

| Phase | Status | Notes |
| :--- | :--- | :--- |
| 1 corpus test | PASS | 0 of 120 |
| 2a summariser | CONCERNS | shortcut misses colon-inside-bold (CR3-1); indented-fence edge (CR3-4) |
| 2b `heading-only` | PASS | both forms, one shape |
| 2c scope | PASS | display, `card-preflight --json`, four sync scripts |
| 3 mutation proofs | PASS | nine across two cycles, re-run |

## Success Criteria Verification

| Criterion | Status |
| :--- | :--- |
| 1 finding kind + corpus 0 | PASS |
| 2 list renders under a bold label | PASS (alone-with-colon-inside form is CR3-1) |
| 3 scope in clean output | PASS |
| 4 one-definition + bundle parity | PASS |
| 5 observations closed naming the PR | PENDING — finalise |

## Breaking Changes Validation

Unchanged — PASS.

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 2 (+2 cleanups; 2 pre-existing carried)

---

## NFR Assessment

### Performance — PASS
### Reliability — PASS
### Security — PASS — **Evidence**: measured, **Probes executed**: 161 (re-run; unchanged)
### Maintainability — CONCERNS — CR3-5, CR3-6

---

## Code Review

Narrowed scope (files changed since gate 2). `code_review_blocking=true`: CR3-1, CR3-2, CR3-3 (high confidence) entered the gate; CR3-4 (medium confidence) reproduced by QA and entered at low.

**Correctness bugs (4)**, **Cleanups (2)** — as above.

**Boundary rule**: `boundary: true`; `probes_executed: 161`.

**Mutation proofs**: nine re-run (M1–M9) — all **covered**; cycle-2's five each red their named test.

**Step 4b**: three `create-*` SKILL.md changed since gate 2 (prose only, no bash block touched): create-epic and create-task `no-executable-blocks`; create-story `zero-blocks-executed` on two literal `{…}` template slots (as cycle 1; unbindable; not attributable).

---

## Regression Testing

| Area | Result |
| :--- | :--- |
| card suites + four `sync-jira-*` suites | 496/496 |
| `npm run ci:fast` (at `b857a2b1`) | 3364/3365, exit 0 |
| `bundle:check` | OK |

---

## Recommendations

### Immediate (Blocking)
1. CR3-1 — colon test sees through the closing bold; `**Label:**`-alone fixture.
2. CR3-2, CR3-3 — real Change Log sections for task.42/43; task.44 row into its table.
3. CR3-4 — `RE_BOLD_LABEL` anchored at column 0.

### Short-term
1. CR3-5, CR3-6.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Cycle 2 closed; two medium defects in its own work, both narrow and reproduced. Loop guards consulted: HIGH 0/0/0 → convergence check not applicable; diminishing-returns `continue` (product-defect-signal).
**Quality Score**: 80/100
**Deployment Recommendation**: CONDITIONAL

---

**QA Report**: `task.117.qa.3.card-preflight-heading-only.md` · **Gate**: `task.117.gate.3.card-preflight-heading-only.yml` · **Next**: `/qa-fix` cycle 3, then cycle 4.

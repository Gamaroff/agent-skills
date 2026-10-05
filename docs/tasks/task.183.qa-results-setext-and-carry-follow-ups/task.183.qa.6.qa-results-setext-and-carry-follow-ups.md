# QA Report: Task 183 - qa-results setext and carry follow-ups (cycle 6)

**Task**: [Link to task document](./task.183.qa-results-setext-and-carry-follow-ups.md)
**Gate File**: [task.183.gate.6.qa-results-setext-and-carry-follow-ups.yml](./task.183.gate.6.qa-results-setext-and-carry-follow-ups.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-05
**Testing Completed**: 2026-10-05
**Gate Status**: PASS

---

## Re-Review Context

| Cycle 5 finding | Status | Evidence |
| --- | --- | --- |
| CR5-1 (MEDIUM) every `QA_LABELS` name dropped a bug list grouped under it | FIXED | the QA-label stop is gone (`e0ee01ba`); R4 carries a grouped list under each of the five former label spellings, and a stale list exactly once; M15 → R4 red |
| CR5-2 (LOW) CHANGELOG said all five items closed, and named the refused log shape as "above" | FIXED | entry now reads three of five closed, CR-7 and CR2-4 deferred; the shape is "inside, or directly under the heading of" a log whose `Date` column is not first |
| CR5-3 (LOW) task.183 / task.171 claimed all five closed | FIXED | task.183 description, § 1 and § 4 In Scope, and task.171's notes and Change Log row now name three closed and two deferred |

---

## Executive Summary

Cycle 6 reads cycle 5's fix (`e0ee01ba`), which removed the last line-by-line inference in the
engine (the QA-label stop). All three cycle 5 findings are fixed. The diff review found no
correctness bug in the change; it returned two low cleanups, and this cycle adds one more. None
gates. One reproduced link loss is pre-existing (identical on `origin/develop`, 0 corpus files)
and is routed to a follow-up.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Review Methodology

Cycle 6, the last in the budget (6 = 5 + 1 granted by the operator after the loop-limit halt).
Direct tools plus one Explore diff reviewer, per the re-review row of the Adaptive Review Strategy.

Re-review scope: files changed since gate 5 (head add0e4b14abc; 11 files) — default.
`SAFETY_REPROBE=false` (clause 1 from gate 5: false; clauses 2–3: no security finding, no
security success criterion). Reviewer dispatched 2026-10-05T12:08:59Z, returned at 12:11:17Z;
completion notice `duration_ms` 96957.

Step 4b: not applicable — no runnable prose in the change set (no `SKILL.md` or
`shared/resources/*.md` changed since gate 5).

Traceability mapper: not dispatched — § 9 Success Criteria is a checklist, not a table.

---

## New Findings This Cycle

None that gate. Searched: the scoped diff (11 files, 1835 lines), with the reviewer told to look
for any deletion or growth that removing the QA-label stop opens, any comment, test name or
document still describing the removed stop, and bundled-copy drift. The reviewer ran five extra
shapes over five writes (a stale list beside Deferred Work, `### Bug Reports`, a repeated bold
block, `Next Steps`): no deletion, no growth.

Advisory (cleanup, low — not entered in `top_issues[]`):

- **[low]** `shared/resources/tests/qa-results.test.mjs:1234` — CR6-1: the R4 test name, the
  CHANGELOG entry and task § 9 say a bug list grouped under **any** sub-label is carried whole.
  That holds only when the list sits directly under the sub-label. With a paragraph first
  (`**Bug Reports**` / `- [a]` / `**Critical Issues**` / `Found in cycle 2:` / `- [b]`), `[b]` is
  dropped on replace. Provenance: identical on `origin/develop` (`replaced ×3, a: 1, b: 0` on both
  engines) and 0 tracked `docs/**/*.md` files carry a bold `**Bug Reports**` label at all ⇒
  **pre-existing**, the `!introducesList` stop task.171 shipped. → scope the three claims to "a list
  directly under a sub-label" and record the paragraph-first shape as a follow-up.
- **[low]** task.183 `## Change Log` — CR6-2: the two cycle 5 rows (gate 5 CONCERNS, qa-fix) sit
  above the older gate 4 FAIL row, so the log is out of order. → move the gate 4 row above them.
- **[low]** task.183 § 3 — CR6-3: "`collectBlocks`' `stops` … This task **changes** two of its
  clauses." Against `origin/develop` it now changes one (the heading stop, `#{1,6}` → `#{1,3}`);
  the second was the `QA_LABELS` clause, added and removed. → say one clause.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1 — CR5-1 setext | PASS | R1; unchanged since gate 5 |
| Phase 2 — CR-7 | PASS | deferred by operator decision; R2 refuses both shapes |
| Phase 3 — 5c CR-1 log table | PASS | R3; unchanged since gate 5 |
| Phase 4 — 5c CR-2 / CR2-4 bold block | PASS | `####` groups kept; grouped bug lists carried; CR2-4 deferred (a stale list is carried once — a duplicate, never a deletion) |
| Phase 5 — survey pre-filter, timing | PASS | see Performance |

**Overall Phase Completion**: 5/5

---

## Success Criteria Verification

| Criterion | Status | Notes |
| --- | --- | --- |
| Six CR5-1 shapes refused, document unchanged | PASS | R1 |
| CR-7 shapes stay refused; shapes that beat the inference refused | PASS | R2 |
| Version-first log refused, Date-less table writable | PASS | R3 |
| `####` group survives three writes; grouped bug list carried whole | PASS | R4; "any sub-label" over-claims a paragraph-first shape (CR6-1, pre-existing) |
| Engine, wiring and corpus tests under 2 s | PASS | 1.45 s real at load 3.45 (`uptime` before and after) |
| No network access | PASS | `qa-results.js` requires only `./change-log.js` |
| Corpus write survey 0/0/0 | PASS | `tests/qa-results-corpus.test.js` green |
| Every new assertion mutation-proved | PASS | 4/4 this cycle, below |
| `ci:fast`, `bundle:check`, `validate` qa-task / qa-story clean | PASS | PASS — `npm run ci:fast` 5301/5304 (1 skipped); the 2 failures are the per-file 10 s budgets of `tests/bundle-missing-source.test.js` (10.19 s) and `tests/test-clean-checkout.test.js` (10.48 s), both LOAD-SENSITIVE; each re-run alone at load 5.22 passes (7/7, 13/13). `bundle:check` 129 skills, 0 problems; `validate` qa-task ✓ qa-story ✓ |
| CHANGELOG cites `(task 183)` | PASS | |
| task.171 items closed here link to this task | PASS | three ✅ resolved, two ⏭️ deferred, each linked |

---

## Breaking Changes Validation

None. `upsertQaResults` keeps its signature and reasons; the change only removes a stop condition.

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0 gating. Three advisory cleanups (above). No bug files.

---

## NFR Assessment

### Performance — PASS

1.45 s real for the three qa-results suites at load average 3.45 (16 cores); criterion is 2 s.

### Reliability — PASS

No setext or log deletion remains on any shape reproduced in cycles 1–6. The one reproduced link
loss (CR6-1) is pre-existing and unchanged by this branch.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: internal` — `shared/resources/qa-results.js#upsertQaResults` judges a work-item
  document and a section this pipeline renders. The only document sink, `markdown-structure`,
  models the implementation report, and the *Entries disqualified from `internal`* table lists only
  `report-lint.js#lintReport`. Unchanged from gates 1–5.

### Maintainability — PASS

The engine is smaller than at gate 5: the `QA_LABELS` constant and its clause are gone, and the
comment in their place says why there is no such list.

---

## Code Review

**Correctness bugs (0).**

**Cleanups (2 from the reviewer, 1 from this cycle):**

- `shared/resources/tests/qa-results.test.mjs:1234` — CR6-1 (reviewer CR-1): claims scoped too wide; paragraph-first shape pre-existing → scope the wording, follow-up.
- `docs/tasks/task.183.qa-results-setext-and-carry-follow-ups/task.183.qa-results-setext-and-carry-follow-ups.md:441` — CR6-2 (reviewer CR-2): Change Log rows out of order → reorder.
- `docs/tasks/task.183.qa-results-setext-and-carry-follow-ups/task.183.qa-results-setext-and-carry-follow-ups.md:152` — CR6-3: "changes two of its clauses" → one.

None promoted to `top_issues[]`: `code_review_blocking=true` promotes only `category: bug` with
`confidence: high`.

Boundary: `internal` (see Security). `probes_executed: 0`.

Mutation proofs (snapshot `cp` in a scratch copy of the engine and its test, one split/join edit
asserted to apply exactly once, restore checked with `cmp`):

```
mutation-proven: restore the QA-label stop (all four names) → R4 → covered
mutation-proven: restore a stop at `**Key Findings**` only → R4 → covered
mutation-proven: bold block stops at any heading (#{1,6}) → R4 → covered
mutation-proven: bold block stops at every bold label (drop !introducesList) → P2 + R4 → covered
```

4 of 4 covered.

---

## Regression Testing

| Area | Result |
| --- | --- |
| qa-results engine, corpus, Step 12 wiring | PASS — 98/98 |
| Bundled copies (qa-task, qa-story) | PASS — identical to the source apart from the generated header; `bundle:check` 129 skills, 0 problems |
| Fast gate | PASS — 5301/5304; the 2 failures are the LOAD-SENSITIVE budgets only, each green when re-run alone |

---

## Test Artifacts

### Files Reviewed

`shared/resources/qa-results.js`, `shared/resources/tests/qa-results.test.mjs`, `CHANGELOG.md`,
task.183 document and plan, task.171 document, both bundled copies.

### Test Commands Executed

```bash
/usr/bin/time -p command node --test shared/resources/tests/qa-results.test.mjs tests/qa-results-corpus.test.js tests/qa-results-step12-wiring.test.js
npm run ci:fast
npm run bundle:check
npm run validate -- skills/qa-task/
npm run validate -- skills/qa-story/
```

### Coverage Report

Not measured (the repository's Node test runner is not run with coverage).

---

## Recommendations

### Immediate Actions (Blocking)

None.

### Short-term Actions (Non-Blocking)

1. CR6-1: scope the "any sub-label" claims; file the paragraph-first sub-label shape as a follow-up.
2. CR6-2, CR6-3: reorder task.183's Change Log rows; say one `collectBlocks` clause changed.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: no `top_issues[]` entry; every NFR PASS (rule 5).
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED
**Conditions**: None.

---

**QA Report**: co-located at `task.183.qa.6.qa-results-setext-and-carry-follow-ups.md`
**Gate File**: co-located at `task.183.gate.6.qa-results-setext-and-carry-follow-ups.yml`
**Next Steps**: Step 5c `/review-pr`.

# QA Report: Task 184 - qa-results carried-block and log residuals

**Task**: [task.184.qa-results-carried-block-and-log-residuals.md](./task.184.qa-results-carried-block-and-log-residuals.md)
**Gate File**: [task.184.gate.2.qa-results-carried-block-and-log-residuals.yml](./task.184.gate.2.qa-results-carried-block-and-log-residuals.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-13
**Testing Completed**: 2026-10-13
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous finding (gate 1) | Status | Evidence |
| --- | --- | --- |
| CR-1 — carried-tail refused the engine's own write (adjacent Bug Reports + Deferred Work) | ⚠️ PARTIAL | The reproduction now writes `replaced` ×3 (R7). The class is not closed: two more write-then-refuse shapes (CR-1, CR-2 below), so R8's stated invariant is false. Bug 1 reopened. |
| CR-2 (cleanup) — duplicated list/row regex | ✅ FIXED | `RE_LIST_OR_ROW` used by `introducesList` and the tail scan |
| CR-3 (cleanup) — repeated under-log predicate | not addressed (advisory) | carried to `recommendations.future` |

---

## Executive Summary

Cycle 2 refute pass over the whole branch (head `e574d353`). Cycle 1 fixed the shape it was shown and not the class: the engine can still write a document that its next write refuses, through the Phase 1 union (CR-1) and through `ambiguousAbove` with the render's own dated rows (CR-2). The tail scan is also cubic on a repeated non-list label (CR-3). All three reproduce on head and not on base. Nothing is deleted.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists, status `ready-for-review`
- [x] All implementation phases completed
- [x] Tests passing (engine 89/89; `ci:fast` 5442 / 0 at cycle 1's fix)
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#644)

### Review Methodology

Re-review scope: whole `origin/develop...HEAD` diff (927 lines, the task's own artifacts excluded) — cycle 2 is always a full refute pass. One Step 3b reviewer (Explore, read-only) with the REFUTE PASS directive, dispatched 08:15:09 UTC, returned after 460 714 ms (`duration_ms`). It fuzzed 25k carried-block shapes in LF and CRLF, compared base and head, and timed growing N. Uncommitted-change check before dispatch: clean outside the work item.

Step 4b: no `SKILL.md` change since cycle 1 — not re-run (cycle 1 recorded 0 findings; zsh unavailable).

---

## New Findings This Cycle

- **[medium]** `shared/resources/qa-results.js:823` — CR-1: the Phase 1 union plus the tail rule refuse the engine's own output (`**Bug Reports**` / `- [b]` / `### Cycle 2 Notes` / `#### Deferred Work` / `**From cycle 2**` / paragraph / `- CR-9 item`: head `replaced`, then `carried-tail:- CR-9 item`; base `replaced` ×3) → skip a tail inside a kept span, and guard the written section.
- **[medium]** `shared/resources/qa-results.js:686` — CR-2: `ambiguousAbove` lets a render with dated rows replace in place, and the next write refuses those rows (head `replaced`, then `structural-line:| 2 | 2026-10-02 | PASS |`; base `replaced` ×3) → guard the written section.
- **[low]** `shared/resources/qa-results.js:235` — CR-3: the tail scan is unbounded and calls `insideProtected` per line — 60 / 501 / 4151 ms at k = 100 / 200 / 400 (base 5 / 8 / 19 ms) → end the scan at the next carried label and keep it linear.
- **[low, cleanup]** `shared/resources/qa-results.js:237` — CR-4: fenced lines after a stopping label are skipped by the tail scan → record as an accepted trade or refuse on a fence (advisory).

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: keep a nested block's tail | CONCERNS | The union is correct alone; with the tail rule it produces CR-1 |
| Phase 2: ambiguous marker-less log | CONCERNS | CR-2 |
| Phase 3: carried-tail refusal | CONCERNS | CR-1, CR-3 |
| Phase 4: wording, hygiene, CHANGELOG | PASS | |

---

## Success Criteria Verification

| Criterion | Status | Notes |
| --- | --- | --- |
| CR-1 / CR-2 / CR3-2 / CR6-1 functional criteria (R3, R5, R6, R7) | PASS | Suite green |
| Suites under 2 s | PASS | The planned suites; CR-3 is a separate adversarial input |
| Corpus survey 0/0/0 | PASS | Corpus suite green |
| R8 invariant (cycle 1) "never refused by its next write" | FAIL | CR-1, CR-2 are counterexamples outside R8's generated family |

---

## Breaking Changes Validation

Unchanged from gate 1, with CR-1/CR-2 adding refusals of the engine's own output that § 5 does not describe. **Overall**: CONCERNS.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (2)

**Issue: write-then-refuse via the Phase 1 union (CR-1)**
- **Severity**: MEDIUM · **Category**: Reliability
- **Bug Report**: [task.184.bug.1.carried-tail-refuses-engines-own-write.md](./task.184.bug.1.carried-tail-refuses-engines-own-write.md) (reopened — same class)
- **Recommendation**: skip a tail inside a kept span; guard the written section. **Priority**: P2

**Issue: a section under an ambiguous log refuses its own render (CR-2)**
- **Severity**: MEDIUM · **Category**: Reliability
- **Bug Report**: [task.184.bug.2.ambiguous-log-section-refuses-its-own-render.md](./task.184.bug.2.ambiguous-log-section-refuses-its-own-render.md)
- **Recommendation**: guard the written section with `underLog`. **Priority**: P2

### LOW Severity Issues (2)

CR-3 (performance, promoted: bug + high confidence) and CR-4 (advisory cleanup).

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 2

---

## NFR Assessment

### Performance — CONCERNS
CR-3: cubic on a repeated non-list label. The planned suites still run in about 1 s.

### Reliability — CONCERNS
CR-1, CR-2.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: internal` — `shared/resources/qa-results.js#upsertQaResults` judges a work-item document and a section this pipeline renders; unchanged from gate 1.

### Maintainability — PASS
CR-4 advisory.

---

## Code Review

**Correctness bugs (3):**
- [medium/high] `shared/resources/qa-results.js:823` — CR-1, as above. Promoted to `top_issues`.
- [medium/high] `shared/resources/qa-results.js:686` — CR-2, as above. Promoted.
- [low/high] `shared/resources/qa-results.js:235` — CR-3, as above. Promoted.

**Cleanups (1):**
- `shared/resources/qa-results.js:237` — CR-4, fenced tail.

Anchors checked with `finding-anchors.js --rev HEAD`: CR-2 `ok`; CR-1, CR-3, CR-4 `unchecked-text` (no line text supplied).

Provenance: all three bugs reproduced on head and not on `origin/develop` (base `replaced` ×3; 5 / 8 / 19 ms).

Boundary: `internal`. `probes_executed: 0`.

mutation-proven: `RE_CARRIED_LABEL` clause dropped → R7, R8 → covered (cycle 1 fix)

---

## Regression Testing

Engine suite 89/89 at `e574d353`; corpus and wiring suites green; `ci:fast` 5442 / 0 at the cycle 1 fix.

---

## Test Artifacts

### Test Commands Executed
```bash
command node --test shared/resources/tests/qa-results.test.mjs
node <scratch>/c2.cjs <engine>   # CR-1, CR-2, CR-3 reproductions, head vs origin/develop
node .agents/skills/qa-task/references/finding-anchors.js --findings-file <f2.json> --root . --rev HEAD --json
```

### Coverage Report
Not measured — no coverage tooling for `node --test` suites.

---

## Recommendations

### Immediate Actions (Blocking)
1. One definition of "a section this engine refuses to rewrite", run on the input section and on the written section (CR-1, CR-2).
2. A tail inside a kept span is carried, not cut (CR-1).
3. Bound the tail scan (CR-3).

### Short-term Actions (Non-Blocking)
1. CR-4; gate 1 CR-3.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Two medium and one low finding promoted under `code_review_blocking`; reliability and performance NFRs CONCERNS. HIGH 0 on both gates.
**Quality Score**: 70/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1, CR-2 fixed; CR-3 bounded

---

**QA Report**: co-located at `task.184.qa.2.qa-results-carried-block-and-log-residuals.md`
**Gate File**: co-located at `task.184.gate.2.qa-results-carried-block-and-log-residuals.yml`
**Next Steps**: `/qa-fix` cycle 2 — consolidate the guard (Step 2.6), then QA cycle 3.

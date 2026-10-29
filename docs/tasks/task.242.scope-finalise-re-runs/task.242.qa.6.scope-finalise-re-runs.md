# QA Report: Task 242 - Scope finalise re-runs to the gaps and the changed evidence

**Task**: [Link to task document](./task.242.scope-finalise-re-runs.md)
**Gate File**: [task.242.gate.6.scope-finalise-re-runs.yml](./task.242.gate.6.scope-finalise-re-runs.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-29
**Testing Completed**: 2026-10-29
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 6 is the one cycle granted after the loop-limit escalation. It re-reviews the cycle-5 fix (CR5-1) at `3717756a`. The fix holds: removing it turns its committed test red. The independent reviewer found one more edge in bare-basename resolution (CR6-1, medium, promoted). It is the mirror of CR4-1: a file **added** under a cited basename, not a gone one, makes the citation resolve to nothing, and the criterion is carried.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-242-CR5-1: merge's new-member evidence used the gone-candidate rule | medium | ✅ FIXED | `merge` builds `atHead` with `goneByBase: null` (`finalise-rerun-scope.js:641`). Mutation: fix removed → `merge: a new member's bare citation resolves at HEAD, whatever shares its basename gone (CR5-1)` went red → covered |

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete (`status: ready-for-review`)
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#781)

### Testing Approach

- [x] Automated Testing (unit, contract)
- [x] Regression Testing
- [x] Security Review (reasoned)
- [x] Code Review (independent reviewer)

### Review Methodology

Re-review, direct tools, with one independent Explore reviewer for the diff (Step 3b). A traceability matrix from the Step 5 mapper was supplied (`.summaries/qa-traceability-matrix.md`).

Re-review scope: files changed since gate 5 (head 1146a0e7960f; 7 files) — default

`SAFETY_REPROBE=false`: clause 1 read `false` from gate 5 (`qa-safety-clause1.sh`). Clauses 2–3 do not hold: gate 5 failed on reliability, not on a safety axis.

Diff reviewer: dispatched 2026-10-29T08:30:41Z, returned in 108.8 s (from `duration_ms`).

CI on 3717756af85e: green

Step 4b: not applicable — no runnable prose in the change set (no `SKILL.md` or `shared/resources/*.md` changed since gate 5).

---

## New Findings This Cycle

- **[medium]** `shared/resources/finalise-rerun-scope.js:160` — a bare prior-record citation whose basename HEAD now carries twice (the cited file modified, a same-basename file added), with nothing gone, resolves to nothing. The criterion's other, unchanged path then carries it as `unchanged`, although its cited file changed. → On the scope side only, resolve a bare basename to every candidate whenever any changed path carries it. Add a scope test with the modify-only control. (TASK-242-CR6-1, promoted)

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phases 1–6 | PASS (CR6-1 open in phase 2's resolver) | `finalise-rerun-scope.test.mjs` 46/46 | Only `merge()` changed since gate 5 |

**Overall Phase Completion**: 18/18 checkboxes. Phase 2 (the scope engine) carries CR6-1.

---

## Success Criteria Verification

From the mapper's matrix, re-checked for the files changed this cycle:

| Criterion | Status | Evidence |
| --- | --- | --- |
| SC-1–SC-5 (engine behaviour) | PASS with CR6-1 open | `shared/resources/tests/finalise-rerun-scope.test.mjs`, 46 pass. CR6-1 is a case §3 promises (re-judge when a cited path changes) that the resolver does not reach |
| SC-6–SC-9 (finalise wiring, prompt, bug mode) | PASS | Unchanged since gate 5; contract tests green in `ci:fast` |
| SC-10 | N/A | No numeric bound claimed |
| SC-11 (mutation proofs) | PASS | Cycle 5's proof re-run here: covered |
| SC-12 (`ci:fast`, `bundle:check`) | PASS | `ci:fast` 6796 tests, 6782 pass, 0 fail; `bundle:check` 128 skills, 0 problems |
| SC-13 (CHANGELOG) | PASS | Unchanged since gate 5 |

---

## Breaking Changes Validation

None documented, none introduced. **Overall**: PASS.

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (1)

**Issue: A same-basename addition carries a criterion whose cited file changed (CR6-1)**
- **Severity**: MEDIUM
- **Category**: Functional
- **Observation**: `resolveCitation` widens a bare basename only when a gone path shares it. With `src/b.js` modified and `lib/z/b.js` added, `b.js` is ambiguous at HEAD, nothing is gone, and the token resolves to nothing. Reproduced by execution: `carry=[SC-2 unchanged]`, `changed=[lib/z/b.js, src/b.js]`. The control without the addition gives `evidence-changed`.
- **Impact**: `/finalise` carries a prior PASS without re-judging it, although the file it cited changed. That is the false carry §3 forbids.
- **Recommendation**: see the gate's `suggested_action`.
- **Priority**: P1

No separate bug file: the finding is tracked as the gate's `top_issues[]` entry for `/qa-fix`, as in cycles 1–5.

### LOW Severity Issues (0)

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — CONCERNS
CR6-1: the re-judge rule does not hold when a same-basename file is added.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`, as in cycles 1–5. A carry or count classifier over git state; it writes no disk path.

### Maintainability — PASS
CR5-1 has a committed, mutation-proven test. The scope side lacks the addition case (CR6-1).

---

## Code Review

**Correctness bugs (1):**
- [medium/high] `shared/resources/finalise-rerun-scope.js:160` — a same-basename addition makes a bare prior-record citation resolve to nothing, and the criterion is carried `unchanged` although its cited file changed → resolve to every candidate whenever a changed path carries the basename (scope side only); add the addition test and its control. Promoted as TASK-242-CR6-1.

**Cleanups (0):** none.

Anchor check: `finding-anchors.js` reason `ok`; CR6-1 `anchor_check: ok`.

mutation-proven: `merge` atHead `goneByBase: null` reverted to `evidenceIndex(io.tracked(), changed)` → `merge: a new member's bare citation resolves at HEAD, whatever shares its basename gone (CR5-1)` → covered

Pattern note: this is the fourth cycle in a row with a new edge in bare-basename resolution (CR3-1 move, CR4-1 gone, CR5-1 provenance, CR6-1 addition). Each fix was correct for its case. The structural option, where a bare basename never resolves and the criterion is always re-judged, is recorded in `recommendations.future`.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Whole repository (`npm run ci:fast`) | PASS — 6796 tests, 6782 pass, 0 fail |
| Bundled copies (`npm run bundle:check`) | PASS — 128 skills, 0 problems |
| `skills/finalise` (`npm run validate -- skills/finalise/`) | PASS |

---

## Test Artifacts

### Files Reviewed
- `shared/resources/finalise-rerun-scope.js` (and its bundled copy, identical apart from the generated header)
- `shared/resources/tests/finalise-rerun-scope.test.mjs`
- `docs/tasks/task.242.scope-finalise-re-runs/task.242.scope-finalise-re-runs.md` (§3 Citation paths)

### Test Commands Executed
```bash
npm run ci:fast
npm run bundle:check
npm run validate -- skills/finalise/
command node --test shared/resources/tests/finalise-rerun-scope.test.mjs
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 781
```

### Coverage Report
Not measured. The repository runs `node --test` without coverage.

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix CR6-1 on the scope side and add the addition test with its control.

### Short-term Actions (Non-Blocking)
1. Consider replacing bare-basename resolution with "always re-judge" to end this class of finding.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No HIGH finding. One promoted medium correctness bug (CR6-1) with an execution reproduction.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR6-1 fixed and re-reviewed.

---

**QA Report**: co-located at `task.242.qa.6.scope-finalise-re-runs.md`
**Gate File**: co-located at `task.242.gate.6.scope-finalise-re-runs.yml`
**Next Steps**: the develop-task loop decides: the granted budget (6 cycles) is now spent.

# QA Report: Task 242 - Scope finalise re-runs to the gaps and the changed evidence

**Task**: [Link to task document](./task.242.scope-finalise-re-runs.md)
**Gate File**: [task.242.gate.7.scope-finalise-re-runs.yml](./task.242.gate.7.scope-finalise-re-runs.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-29
**Testing Completed**: 2026-10-29
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 7 is the second granted cycle. It re-reviews the cycle-6 fix (CR6-1) at `9d690e98`. The fix holds on the scope side: reverting it turns its test red, and widening it too far turns two other tests red. The reviewer found one more edge, this time on the merge side (QA7-1, medium). A new member whose citation has several tokens, including an ambiguous bare basename with a changed candidate, reads as unchanged, so the agent's FAIL on it is overturned. QA reproduced this by execution.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-242-CR6-1: a same-basename addition made a bare prior citation resolve to nothing | medium | ✅ FIXED | `resolveCitation` widens an ambiguous basename when any candidate is in `changed` (`finalise-rerun-scope.js:162-164`). Mutation 1, the fix reverted to gone-only widening: `scope: a bare citation made ambiguous by an added same-basename file re-judges when a candidate changed (CR6-1)` and `evidenceIndex: … (CR3-1, CR4-1)` went red → covered. Mutation 2, always widen an ambiguous basename: `scope: citations that resolve to no tracked path → evidence-unresolved; a unique basename resolves` and the `evidenceIndex` test went red → covered |

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

Re-review, direct tools, with one independent Explore reviewer for the diff (Step 3b). The Step 5 mapper supplied a traceability matrix (`.summaries/qa-traceability-matrix.md`). Mutations ran in a scratch worktree, so the reviewer's tree was never mutated. The worktree was removed afterwards.

Re-review scope: files changed since gate 6 (head 3717756af85e; 7 files) — default

`SAFETY_REPROBE=false`: clause 1 read `false` from gate 6 (`qa-safety-clause1.sh`). Clauses 2–3 do not hold: gate 6 failed on reliability, not on a safety axis.

Diff reviewer: dispatched 2026-10-29T09:10:43Z, returned in 76.5 s (from `duration_ms`).

CI on 9d690e98415b: green

Step 4b: not applicable — no runnable prose in the change set (no `SKILL.md` or `shared/resources/*.md` changed since gate 6).

---

## New Findings This Cycle

- **[medium]** `shared/resources/finalise-rerun-scope.js:651` — `merge` builds its index with `changed: null`. A bare basename that is ambiguous at HEAD therefore never widens, even when a HEAD candidate changed. In a citation with several tokens, the unique token alone then decides, and the member reads `unchanged`. → Null only `goneByBase` in merge, keep `changed`, and add a multi-token merge test with its control. (TASK-242-QA7-1. Source: code-review CR-1, medium confidence, not promoted. Raised by QA from its own execution reproduction)

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phases 1–6 | PASS (QA7-1 open in phase 2's engine, merge side) | `finalise-rerun-scope.test.mjs` 47/47 | Only `resolveCitation`, `evidenceIndex` and `merge`'s index changed since gate 6 |

**Overall Phase Completion**: 18/18 checkboxes. Phase 2 (the scope engine) carries QA7-1.

---

## Success Criteria Verification

From the mapper's matrix, re-checked for the files changed this cycle:

| Criterion | Status | Evidence |
| --- | --- | --- |
| SC-1–SC-3 (scope behaviour, task.239 replay) | PASS | `shared/resources/tests/finalise-rerun-scope.test.mjs`, 47 pass. CR6-1 is now covered |
| SC-4 (merge keeps a carried verdict; a differing verdict goes to advisories) | PASS with QA7-1 open | QA7-1 is a merge case where a FAIL resting on changed evidence is overturned as if the evidence were unchanged |
| SC-5–SC-9 (overall, finalise wiring, prompt, bug mode) | PASS | Unchanged since gate 6; contract tests green in `ci:fast` |
| SC-10 | N/A | No numeric bound claimed |
| SC-11 (mutation proofs) | PASS | Cycle 6's proofs re-run here: 2 of 2 covered. The matrix asked about the "absorbed" `changed: null` mutation: it is absorbed, and QA7-1 shows the case it hides |
| SC-12 (`ci:fast`, `bundle:check`) | PASS | Re-tested on head `9d690e98`: `ci:fast` 6797 tests, 6783 pass, 0 fail, 14 skipped; `bundle:check` 128 skills, 0 problems |
| SC-13 (CHANGELOG) | PASS | Unchanged since gate 6 |

---

## Breaking Changes Validation

None documented, none introduced. **Overall**: PASS.

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (1)

**Issue: A multi-token new-member citation with an ambiguous changed basename overturns a FAIL (QA7-1)**
- **Severity**: MEDIUM
- **Category**: Functional
- **Observation**: Fixture: `tests/a.test.mjs` modified since the prior head, and `lib/z/a.test.mjs` also tracked. New member G9 cites `tests/b.test.mjs:1, a.test.mjs:3` and is judged FAIL. Result: `SC-3=PASS`, with the advisories "new member G9 judged FAIL on unchanged evidence" and "agent's FAIL overturned by the merged members". Control, with no `lib/z/a.test.mjs`: `SC-3=FAIL`, no advisories. Run in a scratch worktree with a temporary test that was never committed.
- **Impact**: `/finalise` can drop a FAIL whose cited test changed. That is the false overturn the merge's "unchanged evidence" rule is meant to rule out.
- **Provenance**: the engine is new on this branch, so there is no base to compare. The defect was not introduced by `4c501df4`: before it, merge's index also left an ambiguous HEAD basename unresolved.
- **Recommendation**: see the gate's `suggested_action`.
- **Priority**: P1

No separate bug file: the finding is tracked as the gate's `top_issues[]` entry for `/qa-fix`, as in cycles 1–6.

### LOW Severity Issues (0)

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — CONCERNS
QA7-1: on the merge side, a FAIL on changed evidence can be overturned.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`, as in cycles 1–6. A carry or count classifier over git state; it writes no disk path.

### Maintainability — PASS
CR6-1 has committed tests that are mutation-proven. The `changed: null` mutation in merge is still absorbed (QA7-1).

---

## Code Review

**Correctness bugs (1):**
- [medium/medium] `shared/resources/finalise-rerun-scope.js:651` — `changed: null` in merge's index blocks the CR6-1 widening for a candidate modified at HEAD, so a multi-token new-member citation reads `unchanged` and the FAIL is dropped → keep `changed`, null only `goneByBase`, add a multi-token merge test. Not promoted (confidence medium). QA reproduced it by execution and raised it as TASK-242-QA7-1.

**Cleanups (0):** none.

Anchor check: `finding-anchors.js` reason `ok`; CR-1 `anchor_check: ok`.

mutation-proven: `resolveCitation` CR6-1 widening reverted to gone-only (`else if (gone.length > 0)`) → `scope: a bare citation made ambiguous by an added same-basename file re-judges when a candidate changed (CR6-1)` → covered
mutation-proven: `resolveCitation` ambiguous basename always widened (`else if (tracked.changed)`) → `scope: citations that resolve to no tracked path → evidence-unresolved; a unique basename resolves` → covered

Pattern note: this is the fifth cycle in a row with a new edge in bare-basename resolution (CR3-1 move, CR4-1 gone, CR5-1 provenance, CR6-1 addition, QA7-1 merge side). The structural option is still in `recommendations.future`: a bare basename never resolves, and the criterion or member is always re-judged.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Whole repository (`npm run ci:fast`) | PASS — 6797 tests, 6783 pass, 0 fail, 14 skipped |
| Bundled copies (`npm run bundle:check`) | PASS — 128 skills, 0 problems |
| `skills/finalise` (`npm run validate -- skills/finalise/`) | PASS |

---

## Test Artifacts

### Files Reviewed
- `shared/resources/finalise-rerun-scope.js` (and its bundled copy)
- `shared/resources/tests/finalise-rerun-scope.test.mjs`

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
1. Fix QA7-1 in merge's index and add the multi-token test with its control.

### Short-term Actions (Non-Blocking)
1. Consider replacing bare-basename resolution with "always re-judge" to end this class of finding.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No HIGH finding. One medium correctness bug (QA7-1), reproduced by execution.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: QA7-1 fixed and re-reviewed.

---

**QA Report**: co-located at `task.242.qa.7.scope-finalise-re-runs.md`
**Gate File**: co-located at `task.242.gate.7.scope-finalise-re-runs.yml`
**Next Steps**: the develop-task loop decides. The granted budget (7 cycles) is spent with this gate.

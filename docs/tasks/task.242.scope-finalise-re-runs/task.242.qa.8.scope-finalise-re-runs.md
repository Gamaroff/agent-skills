# QA Report: Task 242 - Scope finalise re-runs to the gaps and the changed evidence

**Task**: [Link to task document](./task.242.scope-finalise-re-runs.md)
**Gate File**: [task.242.gate.8.scope-finalise-re-runs.yml](./task.242.gate.8.scope-finalise-re-runs.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-29
**Testing Completed**: 2026-10-29
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 8 is the third granted cycle. It re-reviews the cycle-7 fix (QA7-1) at `e3a2ac0d`. The fix holds: restoring `changed: null` in merge turns its test red, and ignoring `goneCandidates` turns two other tests red. The reviewer found one more edge in the same rule (QA8-1, medium, high confidence, promoted). In merge, a new member citing only an ambiguous bare basename with no changed candidate is counted as `unresolved`, so its FAIL stands. The same token beside an unchanged full path reads `unchanged`, and the FAIL is overturned. QA reproduced this by execution.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-242-QA7-1: in merge, a multi-token new-member citation with an ambiguous changed basename overturned a FAIL | medium | ✅ FIXED | merge builds its index with `evidenceIndex(io.tracked(), changed, { goneCandidates: false })` and keeps `changed` (`finalise-rerun-scope.js:657-659`). Mutation 1, `changed: null` restored in merge: `merge: a new member's bare citation ambiguous at HEAD counts when a candidate changed, beside an unchanged co-citation (QA7-1)` went red → covered. Mutation 2, `goneCandidates` ignored: `merge: a new member's bare citation resolves at HEAD, whatever shares its basename gone (CR5-1)` and `evidenceIndex: a bare basename a gone path shares resolves to every candidate (CR3-1, CR4-1)` went red → covered |

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

Re-review, direct tools, with one independent Explore reviewer for the diff (Step 3b). The Step 5 mapper supplied a traceability matrix (`.summaries/qa-traceability-matrix.md`). Mutations and the reproduction ran in a scratch worktree, so the reviewer's tree was never mutated.

Re-review scope: files changed since gate 7 (head 9d690e98415b; 7 files) — default

`SAFETY_REPROBE=false`: clause 1 read `false` from gate 7 (`qa-safety-clause1.sh`). Clauses 2–3 do not hold: gate 7 failed on reliability, not on a safety axis.

Uncommitted-change guard: `docs/tasks/task-registry.md` was modified in the working tree. It is task 243's registry row, written by a separate session, and is not part of this change set or a fix. The scope reads committed history, so the review was not affected. This is recorded as a deviation from the block's HALT.

Diff reviewer: dispatched 2026-10-29T10:11:35Z, returned in 117.1 s (from `duration_ms`).

CI on e3a2ac0dbe89: green

Step 4b: not applicable — no runnable prose in the change set (no `SKILL.md` or `shared/resources/*.md` changed since gate 7).

---

## New Findings This Cycle

- **[medium]** `shared/resources/finalise-rerun-scope.js:218` — `memberEvidence` returns `unresolved` both for a citation that names nothing tracked and for an ambiguous bare basename whose candidates are all unchanged. merge counts `unresolved`, so a lone ambiguous citation keeps its FAIL, while the same token beside an unchanged path overturns it. → Read an ambiguous basename with no changed candidate as unchanged evidence, and add the lone-token merge test. (TASK-242-QA8-1. Source: code-review CR-1, high confidence, promoted under `code_review_blocking`)

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phases 1–6 | PASS (QA8-1 open in phase 2's engine, merge side) | `finalise-rerun-scope.test.mjs` 48/48 | Only `evidenceIndex` and merge's index changed since gate 7 |

**Overall Phase Completion**: 18/18 checkboxes. Phase 2 (the scope engine) carries QA8-1.

---

## Success Criteria Verification

From the mapper's matrix, re-checked for the files changed this cycle:

| Criterion | Status | Evidence |
| --- | --- | --- |
| SC-1–SC-2 (scope behaviour) | PASS | `shared/resources/tests/finalise-rerun-scope.test.mjs`, 48 pass |
| SC-3 (task.239 replay) | PASS with QA8-1 open | The replay passes. QA8-1 shows the task.239 shape (a finer member on unchanged evidence goes to advisories) does not hold when the member cites only an ambiguous bare basename. 335 basenames are tracked more than once here |
| SC-4 (merge keeps a carried verdict; a differing verdict goes to advisories) | PASS with QA8-1 open | QA8-1 is a merge case where a FAIL resting on unchanged evidence is kept |
| SC-5–SC-9 (overall, finalise wiring, prompt, bug mode) | PASS | Unchanged since gate 7; contract tests green in `ci:fast` |
| SC-10 | N/A | No numeric bound claimed |
| SC-11 (mutation proofs) | PASS | Cycle 7's proofs re-run here: 2 of 2 covered |
| SC-12 (`ci:fast`, `bundle:check`) | PASS | Re-tested on head `e3a2ac0d`: `ci:fast` 6798 tests, 6784 pass, 0 fail; `bundle:check` 128 skills, 0 problems |
| SC-13 (CHANGELOG) | PASS | Unchanged since gate 7 |

---

## Breaking Changes Validation

None documented, none introduced. **Overall**: PASS.

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (1)

**Issue: A lone ambiguous bare citation with no changed candidate keeps a FAIL in merge (QA8-1)**
- **Severity**: MEDIUM
- **Category**: Functional
- **Observation**: Fixture: `tests/a.test.mjs` and `lib/z/a.test.mjs` both tracked at both heads, neither changed (only `CHANGELOG.md` changed). New member G9 cites `a.test.mjs:3` and is judged FAIL. Result: `SC-3=FAIL` (expected `PASS` with the advisory "new member G9 judged FAIL on unchanged evidence"). The committed QA7-1 test, same fixture with G9 citing `tests/b.test.mjs:1, a.test.mjs:3`, gives `SC-3=PASS` with the advisory. Run in a scratch worktree with a temporary copy of the QA7-1 test, never committed.
- **Impact**: `/finalise` keeps a FAIL on unchanged evidence whenever the member's only citation is a duplicated basename. In this repository that covers every bundled script, so the task.239 non-convergence can recur.
- **Provenance**: the engine is new on this branch, so there is no base to compare. Not introduced by `cc0da45e`: at `9d690e98`, merge's `changed: null` index also left this citation unresolved. In scope: the task's merge rule is this mechanism.
- **Recommendation**: see the gate's `suggested_action`.
- **Priority**: P1

No separate bug file: the finding is tracked as the gate's `top_issues[]` entry, as in cycles 1–7.

### LOW Severity Issues (1)

- Code-review CR-2 (low, medium confidence): the scope-side twin. A lone ambiguous bare citation with no changed candidate is `evidence-unresolved` and re-judged on every re-run. That is the conservative direction, and it is pinned by an existing test. Recorded in `recommendations.future`.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — CONCERNS
QA8-1: in merge, a FAIL on unchanged evidence is kept when the only citation is an ambiguous bare basename.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`, as in cycles 1–7. A carry or count classifier over git state; it writes no disk path.

### Maintainability — PASS
QA7-1 has committed tests that are mutation-proven. merge and scope now build their index through one constructor.

---

## Code Review

**Correctness bugs (2):**
- [medium/high] `shared/resources/finalise-rerun-scope.js:218` — `unresolved` is reached by two states: nothing tracked, and an ambiguous basename with all candidates unchanged. merge counts it, so a lone ambiguous citation keeps the FAIL that the same token beside an unchanged path overturns → read an ambiguous basename with no changed candidate as unchanged. **Promoted as TASK-242-QA8-1.**
- [low/medium] `shared/resources/finalise-rerun-scope.js:394` — the scope-side twin: a lone ambiguous citation with no changed candidate is re-judged on every re-run, while the same token beside an unchanged path carries → apply the same rule on the scope side and pin the pair. Advisory.

**Cleanups (1):**
- `shared/resources/finalise-rerun-scope.js:186` — `goneCandidates: false` drops only the gone basename map. A full-path citation of a deleted file still resolves in merge and counts, which the comments at lines 179-182 and 651-656 do not say → reword the comments, or keep gone paths out of `paths` too. Advisory.

Anchor check: `finding-anchors.js` reason `ok`; CR-1, CR-2, CR-3 `anchor_check: ok`.

mutation-proven: merge's index with `changed: null` restored → `merge: a new member's bare citation ambiguous at HEAD counts when a candidate changed, beside an unchanged co-citation (QA7-1)` → covered
mutation-proven: `evidenceIndex` ignores `goneCandidates` (gone basename map always built) → `merge: a new member's bare citation resolves at HEAD, whatever shares its basename gone (CR5-1)` and `evidenceIndex: a bare basename a gone path shares resolves to every candidate (CR3-1, CR4-1)` → covered

Pattern note: this is the sixth cycle in a row with a new edge in bare-basename resolution (CR3-1 move, CR4-1 gone, CR5-1 provenance, CR6-1 addition, QA7-1 merge with a changed candidate, QA8-1 merge with no changed candidate). The structural option is still in `recommendations.future`: a bare basename never resolves, and the criterion or member is always re-judged.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Whole repository (`npm run ci:fast`) | PASS — 6798 tests, 6784 pass, 0 fail |
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
command node --test --test-reporter=tap shared/resources/tests/finalise-rerun-scope.test.mjs
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 781
git ls-files | awk -F/ '{print $NF}' | sort | uniq -d | wc -l
```

### Coverage Report
Not measured. The repository runs `node --test` without coverage.

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix QA8-1 in merge and add the lone-token merge test.

### Short-term Actions (Non-Blocking)
1. Consider replacing bare-basename resolution with "always re-judge" to end this class of finding.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No HIGH finding. One medium correctness bug (QA8-1), promoted at high confidence and reproduced by execution.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: QA8-1 fixed and re-reviewed.

---

**QA Report**: co-located at `task.242.qa.8.scope-finalise-re-runs.md`
**Gate File**: co-located at `task.242.gate.8.scope-finalise-re-runs.yml`
**Next Steps**: the develop-task loop decides. The granted budget (8 cycles) is spent with this gate.

# QA Report: Task 242 - Scope finalise re-runs to the gaps and the changed evidence

**Task**: [Link to task document](./task.242.scope-finalise-re-runs.md)
**Gate File**: [task.242.gate.9.scope-finalise-re-runs.yml](./task.242.gate.9.scope-finalise-re-runs.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-29
**Testing Completed**: 2026-10-29
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 9 is the first of the two cycles granted after gate 8. It re-reviews the cycle-8 fix at `76e1a94c`, where QA8-1 was fixed by replacing the ambiguity rule: a bare basename resolves to every file that carries it. The fix holds. Restoring the old rule turns 6 tests red. Dropping gone candidates turns 3 red. Ignoring `goneCandidates` turns 2 red.

The reviewer found one more gap in the same rule (QA9-1, medium, high confidence, promoted). A slash-less token that also names a file at the repository root stops at the exact-path check, so it resolves to the root file alone. That holds for a HEAD file (CR-1) and, in merge, for a deleted root file (CR-2). QA reproduced both by execution.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-242-QA8-1: in merge, a lone ambiguous bare citation with no changed candidate kept a FAIL that the same token beside an unchanged path overturned | medium | ✅ FIXED | `resolveCitation` adds every `byBase` and `goneByBase` candidate (`finalise-rerun-scope.js:158-160`). Mutation 1, the old rule restored (an ambiguous HEAD-only basename resolves to nothing): 6 tests red, including `merge: … alone or beside an unchanged co-citation (QA7-1, QA8-1)` and `scope: a lone ambiguous bare citation and the same token beside an unchanged path come out the same (QA8-1, CR-2)` → covered. Mutation 2, gone candidates dropped: 3 red (CR3-1, CR4-1) → covered. Mutation 3, `goneCandidates` ignored: 2 red (CR5-1) → covered |

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

Re-review, direct tools, with one independent Explore reviewer for the diff (Step 3b). The Step 5 mapper supplied a traceability matrix (`.summaries/qa-traceability-matrix.md`). Mutations ran in a scratch worktree, so the reviewer's tree was never mutated.

Re-review scope: files changed since gate 8 (head e3a2ac0dbe89; 7 files). Default.

`SAFETY_REPROBE=false`: gate 8 failed on reliability, not on a safety axis.

Uncommitted-change guard: `docs/tasks/task-registry.md` is still modified in the working tree. It is task 243's registry row, written by a separate session, as in cycle 8 (observation #126). The scope reads committed history, so the review was not affected. Recorded as a deviation from the block's HALT.

Diff reviewer: dispatched 2026-10-29T10:28:06Z, returned in 79.6 s (from `duration_ms`).

CI on 76e1a94c: Docs link check and ShellCheck green; Test still in progress at gate time.

Step 4b: not applicable. No runnable prose is in the change set (no `SKILL.md` or `shared/resources/*.md` changed since gate 8).

---

## New Findings This Cycle

- **[medium]** `shared/resources/finalise-rerun-scope.js:146`: a slash-less token equal to a repository-root path returns at the exact-path check before the basename rule. It resolves to the root file alone, so a changed same-basename file elsewhere is not seen (CR-1). In merge, gone paths sit in `paths` even under `goneCandidates: false`, so a deleted root file still matches a bare token (CR-2). → Resolve a slash-less token through the basename maps only. Add identity pairs with a root candidate on both sides. (TASK-242-QA9-1. Source: code-review CR-1 and CR-2, high confidence, promoted under `code_review_blocking`.)

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phases 1–6 | PASS (QA9-1 open in phase 2's engine) | `finalise-rerun-scope.test.mjs` 49/49 | Only `resolveCitation`, `evidenceIndex` and their comments changed since gate 8 |

**Overall Phase Completion**: 18/18 checkboxes. Phase 2 (the scope engine) carries QA9-1.

---

## Success Criteria Verification

From the mapper's matrix, re-checked for the files changed this cycle:

| Criterion | Status | Evidence |
| --- | --- | --- |
| SC-1–SC-2 (scope behaviour) | PASS with QA9-1 open | 49 pass. QA9-1: a bare citation that also names a root file carries when a nested same-basename file changed |
| SC-3 (task.239 replay) | PASS | The replay passes |
| SC-4 (merge keeps a carried verdict; a differing verdict goes to advisories) | PASS with QA9-1 open | QA9-1 (CR-2): a member citing a bare token that a deleted root file had is counted |
| SC-5–SC-9 (overall, finalise wiring, prompt, bug mode) | PASS | Unchanged since gate 8; contract tests green in `ci:fast` |
| SC-10 | N/A | No numeric bound claimed |
| SC-11 (mutation proofs) | PASS | Cycle 8's proofs re-run here: 3 of 3 covered |
| SC-12 (`ci:fast`, `bundle:check`) | PASS | Head `76e1a94c`: `ci:fast` 6799 tests, 6784 pass, 1 fail. The one failure was this gate's own draft: its `updated:` still held a placeholder while the run read the working tree. Stamped, `gate-head-freshness.test.mjs` passes 10/10. `bundle:check` 128 skills, 0 problems |
| SC-13 (CHANGELOG) | PASS | Unchanged since gate 8 |

---

## Breaking Changes Validation

None documented, none introduced. **Overall**: PASS.

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (1)

**Issue: a bare citation that also names a repository-root file resolves to that file alone (QA9-1)**
- **Severity**: MEDIUM
- **Category**: Functional
- **Observation**: `evidenceIndex(["README.md","skills/f/README.md"], {skills/f/README.md})` then `resolveCitation("README.md:12")` → `["README.md"]`. The control, `dup.js` over `a/dup.js` and `b/dup.js` with `b` changed, → both. In merge's index (`goneCandidates: false`), `evidenceIndex(["lib/b.js"], {b.js})` resolves `b.js:3` to `["b.js"]`, the deleted root file. With `old/b.js` deleted instead, it resolves to `["lib/b.js"]`. Run with `node -e` against the engine.
- **Impact**: a criterion citing `README.md`, `package.json` or `skills-config.yaml` carries when a nested file of that name changed. All three are tracked at the root here, and `README.md` 40 times. In merge, one citation shape is counted or advisory depending only on where the deleted file was.
- **Provenance**: the exact-path check dates from the engine's first commit (`5bcbc5d9`), so cycle 8 did not introduce it. Cycle 8's rule ("a bare basename resolves to every file that carries it") makes it a contradiction. In scope: the task's citation rule is this mechanism.
- **Recommendation**: see the gate's `suggested_action`.
- **Priority**: P1

No separate bug file. The finding is tracked as the gate's `top_issues[]` entry, as in cycles 1–8.

### LOW Severity Issues (0)

None.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — CONCERNS
QA9-1: a bare citation that also names a root file misses a changed same-basename candidate.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`, as in cycles 1–8.

### Maintainability — PASS
QA8-1 has committed tests that are mutation-proven. One rule resolves every ambiguous basename, and `resolveCitation` no longer reads `changed`.

---

## Code Review

**Correctness bugs (2):**
- [medium/high] `shared/resources/finalise-rerun-scope.js:146`: a slash-less token that names a root file stops at the exact-path check and skips the basename rule → union the exact match with the basename candidates, and add a root-candidate identity pair. **Promoted as TASK-242-QA9-1.**
- [medium/high] `shared/resources/finalise-rerun-scope.js:180`: gone paths are added to `paths` under `goneCandidates: false`, so in merge a deleted root file matches a bare token → accept an exact gone match only for a token with `/`. **Folded into TASK-242-QA9-1** (same root cause).

**Cleanups (0).**

mutation-proven: the old rule restored (ambiguous HEAD-only basename resolves to nothing) → 6 tests red → covered
mutation-proven: gone basename candidates dropped → 3 tests red → covered
mutation-proven: `goneCandidates` ignored → 2 tests red → covered

---

## Regression Testing

| Area | Result |
| --- | --- |
| Whole repository (`npm run ci:fast`) | 6799 tests, 6784 pass, 1 fail. The failure is this gate's unstamped draft. It passes once stamped |
| Bundled copies (`npm run bundle:check`) | PASS: 128 skills, 0 problems |
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
command node --test shared/resources/tests/gate-head-freshness.test.mjs
git ls-files | awk -F/ '$NF=="README.md"' | wc -l
```

### Coverage Report
Not measured. The repository runs `node --test` without coverage.

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix QA9-1: a slash-less token resolves through the basename maps only. Add root-candidate identity pairs.

### Short-term Actions (Non-Blocking)
None.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No HIGH finding. One medium correctness bug (QA9-1), promoted at high confidence and reproduced by execution.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: QA9-1 fixed and re-reviewed.

---

**QA Report**: co-located at `task.242.qa.9.scope-finalise-re-runs.md`
**Gate File**: co-located at `task.242.gate.9.scope-finalise-re-runs.yml`
**Next Steps**: one cycle remains (budget 10). A fix at cycle 9 is gated at cycle 10.

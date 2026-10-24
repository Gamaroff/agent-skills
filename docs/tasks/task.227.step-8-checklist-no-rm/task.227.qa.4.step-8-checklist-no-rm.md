# QA Report: Task 227 - Step 8 checklist block mixes rm with must-pass checks; host refuses the whole block

**Task**: [Link to task document](./task.227.step-8-checklist-no-rm.md)
**Gate File**: [task.227.gate.4.step-8-checklist-no-rm.yml](./task.227.gate.4.step-8-checklist-no-rm.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-24
**Testing Completed**: 2026-10-24
**Gate Status**: PASS

---

## Executive Summary

QA cycle 4 re-reviewed the 26 files changed since gate 3's head (`b479f628..2510287e`). Both cycle-3 findings are fixed. The hold-record rule is now one function, and `--complete` and the Step 8 check both read it. All four mutations are covered in a clean worktree. The review raised two LOW items, both reproduced. Neither is a defect the branch introduces in behaviour: one is an overclaiming comment over a pre-existing Step 4 behaviour, and the other needs an unsearchable `/tmp`.

**Overall Assessment**: PASS
**Deployment Recommendation**: READY

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-227-QA3-1: Step 8 and `--complete` disagree about an unlistable hold dir | medium | ✅ FIXED | `hold_state` / `--hold-state` is the one rule. Step 8's own `ls -A` copy is gone. Mutations g1 (Step 8 back on its own copy) and g4 (Step 8 ignores the answer) turn the new Step 8 cases red. Bug 3 closed |
| TASK-227-QA3-2: an unreadable record is deleted silently | low | ✅ FIXED | It reads `pending`. Mutation g2 turns the unreadable cases red in both suites |

---

## New Findings This Cycle

- **[low]** `shared/resources/advance-pipeline-lock.sh:183` — QA4-1: the `hold_state` header says the rule is "stated once", but Step 4's Restore Held Files makes its own `ls -A` decision and deletes the record when it cannot list the dir (CR-1). → Scope the comment; route Restore's behaviour to a follow-up.
- **[low]** `shared/resources/advance-pipeline-lock.sh:196` — QA4-2: a dir whose parent cannot be searched reads `clear` (CR-2). → Read `pending` in that case.

Both are carried to `recommendations.future` by the Cosmetic-residue exit (route 2b).

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#746, OPEN, head `2510287e`)

### Testing Approach

- [x] Automated Testing (lock suite, checklist suite, `npm run ci:fast`)
- [x] Regression Testing
- [x] Security Review (probe executed)
- [x] Code Review (narrowed)

### Review Methodology

Direct tools, as for a re-review. The one subagent was the Step 3b diff reviewer.

Re-review scope: narrowed to the 26 files changed since gate 3's head `b479f628` (an ancestor of HEAD), showing their full diff against the base. The bundled `skills/*/references` copies were excluded (1182 patch lines). SAFETY_REPROBE=false.

Diff reviewer: one read-only Explore subagent, prompt from `code-review-prompt.md`; completion notice `duration_ms` 79257. Both anchors were checked by reading the cited lines at `2510287e`.

Mutation proofs ran in a detached worktree at `2510287e`, after confirming both suites were green there. The worktree was clean afterwards and was removed.

**Provenance check on CR-1.** `git diff origin/develop -- shared/resources/develop-pipeline-step-4-create-pr.md` is empty: the Restore Held Files block is unchanged on this branch. On base, Restore skipped an unlistable dir and deleted the record, and base Step 8's `ls -A` check passed it. So the end state of that path is the same on base and on this branch. The branch's own contribution is the "stated once" comment, which is why CR-1 is rated LOW, not medium. The pre-existing behaviour, and Restore's `cp -r` followed by an unconditional `rm -rf`, are recorded under `recommendations.future`.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Tests first | PASS | Verified | Scenario 15: six hold cases per arm, each asserting both modes |
| Phase 2: Move the removals | PASS | Verified | `--complete` and Step 8 read one rule |
| Phase 3: Docs and bundle | PASS | Verified | CHANGELOG, task doc and bug 3 updated; bundle clean |

**Overall Phase Completion**: 3/3

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| `--complete` with a lock removes the five records and the lock | PASS | Lock-arm case; exception stated |
| No-lock `--complete` removes the same records, exits 0 | PASS | No-lock-arm case |
| An unrelated file survives | PASS | Both arms |
| The checklist block has no `rm`, and the guard fails if one is added | PASS | Guard test green on the new Step 8 block |
| `npm run ci` passes | PASS (local) | `ci:fast` 6290/1: the one failure was the link corpus on the then-untracked gate 3 and QA report 3, and doc-links passes 24/24 once they are staged. The full `npm run ci` runs at the develop-next merge gate |
| `bundle:check` clean, no `UNREACHED` | PASS | `npm run bundle` clean |
| Report records both Phase 2 mutations | PASS | Implementation report |
| CHANGELOG names the change | PASS | Includes `--hold-state` |
| Usage text lists the five records | PASS | `usage()` plus the `--hold-state` line |

---

## Breaking Changes Validation

### Breaking Change: `--complete` removes five records beside the lock

Documented: Yes (§5)
Migration Path Provided: Yes (none needed)
Migration Tested: Yes (scenario 15)
Consumer Code Updated: N/A. `--hold-state` is additive.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (2)

- **QA4-1**: the comment overclaims "stated once"; Step 4's Restore is a separate reader with pre-existing behaviour. Reproduction: by reading Step 4 at `:244–253`.
- **QA4-2**: a parent that cannot be searched reads `clear`. Reproduced with `chmod 000` on the parent.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 2

---

## NFR Assessment

### Performance — PASS
`hold_state` runs one `cat` and one `ls`.

### Reliability — PASS
The check and the removal read one rule. QA4-1's underlying behaviour predates the branch; QA4-2 needs an unsearchable `/tmp`.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 20 (`totals.executed` from `task.227.qa.4.security.run.json`; escaped 0)
- `boundary: true`: `lineRunsNoRm`, verdict `engages`. `hold_state` is not a trust boundary: it reads state the pipeline wrote.

### Maintainability — PASS
One definition of the hold-record rule.

---

## Code Review

Narrowed review, `code_review_blocking=true` (pipeline override). Neither finding is `bug` + `high` confidence.

**Correctness bugs (2):**
- [medium/medium → LOW after provenance] `shared/resources/advance-pipeline-lock.sh:183`: CR-1. Raised as QA4-1.
- [low/low] `shared/resources/advance-pipeline-lock.sh:196`: CR-2. Raised as QA4-2.

**Mutation proofs** (worktree at `2510287e`, baseline green):

mutation-proven: Step 8 back on its own `ls -A` copy → `[bash] an unlistable hold dir fails Step 8…`, `[bash] an unreadable hold-dir record fails Step 8…` → covered
mutation-proven: an unreadable record reads `clear` → lock suite unreadable cases and the Step 8 unreadable case → covered
mutation-proven: an unlistable dir reads `clear` → lock suite unlistable cases and the Step 8 unlistable case → covered
mutation-proven: Step 8 ignores `--hold-state`'s answer → three Step 8 cases, including `held files that were never restored` → covered

All four are `covered`.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `advance-pipeline-lock.test.sh` (all scenarios) | PASS 102/102 |
| `step-8-completion-checklist.test.mjs` incl. executed-against-fixtures | PASS 64/64 |
| Full `npm test` via `ci:fast` | 6290/1, the one failure resolved by tracking the cycle-3 records (doc-links 24/24) |

---

## Test Artifacts

### Files Reviewed
`shared/resources/advance-pipeline-lock.sh`, `shared/resources/advance-pipeline-lock.test.sh`, `shared/resources/develop-pipeline-step-8-commit.md`, `shared/resources/develop-pipeline-step-4-create-pr.md` (provenance), `shared/resources/tests/step-8-completion-checklist.test.mjs`, `CHANGELOG.md`, the task document.

### Test Commands Executed
```bash
npm run ci:fast                                                          # via quality-gate.sh
node --test shared/resources/tests/doc-links.test.mjs                    # 24/24 with cycle-3 records staged
bash shared/resources/advance-pipeline-lock.test.sh                      # 102/102
node --test shared/resources/tests/step-8-completion-checklist.test.mjs  # 64/64
git diff origin/develop -- shared/resources/develop-pipeline-step-4-create-pr.md   # empty (provenance)
```

### Coverage Report
Not measured.

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. QA4-1 / Step 4 Restore Held Files: decide from `--hold-state`, and remove the hold dir only after `cp` succeeds (follow-up; pre-existing).
2. QA4-2: read `pending` when the parent cannot be searched.
3. Gate 2 CR-1, carried over: a halt-snapshot check in the no-lock arm.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: No HIGH or MEDIUM. Two reproduced LOW items, neither of which changes a pipeline run's outcome.
**Quality Score**: 95/100

**Deployment Recommendation**: READY

---

**QA Report**: co-located at `task.227.qa.4.step-8-checklist-no-rm.md`
**Gate File**: co-located at `task.227.gate.4.step-8-checklist-no-rm.yml`
**Next Steps**: The Cosmetic-residue exit hands to 5c (`/review-pr`).

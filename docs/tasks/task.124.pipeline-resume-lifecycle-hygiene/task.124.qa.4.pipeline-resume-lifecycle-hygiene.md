# QA Report: Task 124 - Resume trusts what it finds on disk (cycle 4)

**Task**: [Link to task document](./task.124.pipeline-resume-lifecycle-hygiene.md)
**Gate File**: [task.124.gate.4.pipeline-resume-lifecycle-hygiene.yml](./task.124.gate.4.pipeline-resume-lifecycle-hygiene.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-19
**Testing Completed**: 2026-09-19
**Gate Status**: CONCERNS
**PR**: #436 — https://github.com/Gamaroff/agent-skills/pull/436 (head `51cb227d`)

---

## Executive Summary

Cycle 3's six findings are verified fixed — the `cat-file -e` precondition by reproduction, the `halt_reason` branch by reading all four files that carry it. The narrowed cycle-4 review (7 files since gate 3) found **no HIGH and no new mechanism defect**. What it found is the residue of the cycle-3 prose fix: the resume contract now states *who restores* twice, and the second statement (Phase 0b, "Restore first, then continue") is the old unconditional rule; and the grant exception was copied into `develop-bug`, which has no grant. Two low label cleanups. Gate **CONCERNS**; one more fix cycle.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document complete; status `ready-for-review` after `/qa-fix` cycle 3
- [x] All implementation phases completed
- [x] Tests passing (`npm run ci:fast` on `51cb227d` — 3511 pass, 0 fail)
- [x] Breaking changes documented; migration path on both resume paths
- [x] Open PR (#436)

### Testing Approach

- [x] Automated Testing (fast gate)
- [x] Regression Testing
- [x] Security Review (unchanged)
- [x] Code Review (Step 3b — cycle 4, narrowed to files changed since gate 3)
- [x] Reproduction of the cycle-3 mechanism fix (CR-2)

### Review Methodology

Re-review, cycle 4 → narrowed (`--since=2026-09-19T14:39:09Z` → 7 files, 1 213 diff lines), one read-only Explore subagent told which items were deferred. `code_review_blocking=true`; CR-1 (medium/high) promoted by rule; CR-2 (medium/medium) entered by QA judgement after verifying develop-bug offers no grant. Wait marked/cleared on the lock.

```
Re-review scope: since 2026-09-19T14:39:09Z (default; security axis OK reasoned → SAFETY_REPROBE=false)
```

---

## Re-Review Context

| Cycle-3 issue | Status | Evidence this cycle |
| --- | --- | --- |
| CR-1 restore before the grant | **FIXED** (with residue → cycle-4 CR-1/CR-2) | the `halt_reason` branch is present under Phase 0a, in step-0 §0b and the three orchestrators |
| CR-2 deleted branch-added file | **FIXED** | reproduction: ` D n` (branch-added) → `cat-file -e` fails → class (c) |
| CR-3, CR-4, CR-6 stale sentences | **FIXED** | task doc §3/§6/§9 and row (a) rewritten |
| CR-5 gh-only MERGED check | **FIXED** | the gh-only paragraph is present (its failure label is cycle-4 CR-3) |

---

## New Findings This Cycle

- **[medium]** `shared/resources/develop-pipeline-resume-contract.md:184` — the Phase 0b paragraph still says "Restore first, then continue" for every snapshot; the Phase 0a section says the opposite for a loop-escalation snapshot. Two statements of one moment. **CR-1 (bug 11)**, promoted by rule.
- **[medium]** `skills/develop-bug/SKILL.md:69` — the grant exception was copied into develop-bug, which has no grant prompt (resume contract Re-entry step 3; develop-bug Phase 0b; its verify-loop escalation). **CR-2 (bug 12)**, by QA judgement.
- **[low]** `pipeline-resume-detector-prompt.md:90` — any `gh pr view` failure on a github.com URL is labelled "not a GitHub PR". CR-3.
- **[low]** `develop-pipeline-resume-contract.md:166` — the Cost sentence omits the `cat-file -e`. CR-4.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1 | CONCERNS | fixtures 13–16 green | two duplicated statements (CR-1, CR-2), two labels |
| Phase 2 | PASS | 19/19, 32/32 | — |
| Phase 3 | PASS | 12/12 | — |
| Phase 4 | PASS | 67/67 | — |

**Overall Phase Completion**: 4/4; 1 CONCERNS, 3 PASS

---

## Success Criteria Verification

All seven functional criteria hold on the mechanisms; the two mediums are documentation ordering. Continuation criterion: CONCERNS until CR-1/CR-2 (one statement of who restores; develop-bug restores on every snapshot). Performance PASS · Code Quality PASS · Migration deferred to finalise.

---

## Breaking Changes Validation

PASS — the migration path is stated on both resume paths; CR-1/CR-2 are consistency defects in that statement, not gaps.

---

## Issues Found

### HIGH Severity Issues (0)
None.

### MEDIUM Severity Issues (2)
- **Two statements of who restores** — [task.124.bug.11.two-restore-statements-in-resume-contract.md](./task.124.bug.11.two-restore-statements-in-resume-contract.md). P2.
- **develop-bug carries the grant exception without a grant** — [task.124.bug.12.develop-bug-carries-grant-exception-without-a-grant.md](./task.124.bug.12.develop-bug-carries-grant-exception-without-a-grant.md). P2.

### LOW Severity Issues (2 cleanups)
- CR-3 failure label on the gh-only check; CR-4 Cost sentence.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 2

---

## NFR Assessment

### Performance — PASS
Unchanged.
### Reliability — CONCERNS
No mechanism defect; two ordering statements in executed prose, each one paragraph to fix.
### Security — PASS
- **Status**: PASS · **Evidence**: reasoned · **Probes executed**: 0 — unchanged decision.
### Maintainability — PASS
Single-definition mechanisms; the residue is two duplicated statements and two labels.

---

## Code Review

Cycle 4, narrowed — `code_review_blocking=true`.

**Correctness bugs (2):**
- [medium/high] `develop-pipeline-resume-contract.md:184` — second, unconditional restore statement → defer to the Phase 0a branch. **CR-1, promoted.**
- [medium/medium] `skills/develop-bug/SKILL.md:69` — grant exception without a grant → drop it in develop-bug. CR-2.

**Cleanups (2):**
- `pipeline-resume-detector-prompt.md:90` — label the gh failure by cause (CR-3).
- `develop-pipeline-resume-contract.md:166` — Cost sentence (CR-4).

**Provenance:** this branch. **Boundary rule:** unchanged (`boundary: true`, `probes_executed: 0`, `reasoned`).

**Cycle-3 fix verification (executed):** reproduction of the deleted branch-added file → class (c); `grep -c 'loop-limit|not-converging'` = 2/1/2 in the contract, step-0, develop-task.

---

## Regression Testing

| Area | Result | Evidence |
| --- | --- | --- |
| Fast gate on `51cb227d` | PASS | 3511 pass, 0 fail |
| Bundle freshness / prettier | PASS | 0 problems / clean |

---

## Test Artifacts

```bash
npm run ci:fast                                                            # rc 0
git diff --quiet origin/develop -- n; git cat-file -e origin/develop:n     # 0 / 128 → (c)
grep -n 'Restore first, then continue' shared/resources/develop-pipeline-resume-contract.md   # :184
```

---

## Recommendations

### Immediate Actions (Blocking for a PASS)
1. CR-1 one statement of who restores. 2. CR-2 drop develop-bug's exception. 3. CR-3/CR-4 labels.

### Short-term Actions (Non-Blocking)
Carried: cycle-1 CR-5, CR-7.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No high-severity finding; medium entries (rule 2) and reliability CONCERNS (rule 4). Both mediums are the cycle-3 fix's own residue — a second statement the edit did not remove, and an edit applied at a site whose precondition does not hold.
**Quality Score**: 85/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 and CR-2 fixed.

---

**QA Report**: co-located at `task.124.qa.4.pipeline-resume-lifecycle-hygiene.md`
**Gate File**: co-located at `task.124.gate.4.pipeline-resume-lifecycle-hygiene.yml`
**Next Steps**: `/qa-fix` on gate 4, then cycle 5 (the last budgeted cycle).

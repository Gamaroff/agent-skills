# QA Report: Task 130 - Resume residue from task.124 — cycle 7 (granted; scoped re-review of the Step 5c fix)

**Task**: [task.130.resume-residue-bug-variant-base-and-who-restores.md](./task.130.resume-residue-bug-variant-base-and-who-restores.md)
**Gate File**: [task.130.gate.7.resume-residue-bug-variant-base-and-who-restores.yml](./task.130.gate.7.resume-residue-bug-variant-base-and-who-restores.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-20
**Testing Completed**: 2026-09-20
**Gate Status**: PASS

---

## Executive Summary

The last granted cycle (budget 7). Step 5c's `/review-pr` returned CONCERNS with one confirmed code finding — `--restore --accept-legacy` never stamped `task_or_story_directory`, so the recovery did not survive the next pause — and the operator chose to spend this cycle on it rather than carry it. Re-review of PR #441 after fix commit `8b4c0e60`, scoped to the three files it touched (71 lines). Bug 13 is fixed and was verified end to end under both shells: the rebuilt lock carries the directory, a precompact-shaped snapshot of it restores again *without* the flag, and another document's `--restore` refuses it and keeps it. The reviewer found no defect in the change and one LOW — the new "keeps its own directory" scenario is vacuous, which QA confirmed by mutation — plus a cleanup on the header contract. The gate is PASS; the LOW is carried to `recommendations.future` by the Cosmetic-residue exit. HIGH sequence `0, 1, 0, 1, 0, 0, 0`.

**Overall Assessment**: PASS
**Deployment Recommendation**: READY — hand to 5c (route 2b)

---

## Testing Scope

### Prerequisites Verified

- [x] Task complete; bug 13 Ready for QA; tests passing; breaking changes documented; PR #441 OPEN (CI 5/5 on the previous push)

### Testing Approach

- [x] Automated · [x] Regression · [x] Security (reasoned; behaviour executed) · [x] Code Review (scoped, light) · [x] Mutation spot checks

### Review Methodology

Direct tools plus one read-only Explore reviewer over the **scoped** diff (222 s; it traced every reader of `task_or_story_directory` and ran the suite under both shells). `SAFETY_REPROBE=false` (clause 1: gate 6 `PASS reasoned` → OK; clause 2: no HIGH; clause 3: gate 6 not FAIL). Scope from the gate-6 commit (`git diff bd3fac0b..HEAD`, source/test only: 3 files, 71 lines). Traceability mapper skipped. `Adaptive strategy override: lite mode — direct tools only`.

```
Re-review scope: files changed since gate 6 (commit bd3fac0b; 3 files, 71 diff lines) — default scoping
```

---

## Re-Review Context

| Prior issue | Bug | Status | Evidence |
| --- | --- | --- | --- |
| 5c CR-1 — `--accept-legacy` restore does not stamp the directory | 13 | **FIXED** | both shells: stamped lock (`docs/tasks/task.X`, as passed; absolute stays absolute, `canon` makes `--which` from the relative spelling find it); precompact-shaped snapshot of the rebuilt lock restores again without the flag; `task.OTHER` `--restore` → "no halt snapshot or orphaned claim is for …", snapshot kept, no lock written; jq fill covers `null`, `""`, `false`, keeps a present string; mutation stamp removed → 4 red |
| 5c PC-2 — six Change Log rows dropped | trail | **FIXED** | 16 rows; markers sound |
| 5c PC-3 — task.131/132 docs in the PR | scope | accepted | stated in `task.130.pr-review.1` |
| 5c PC-1 — closure list in the report | low | pending finalise | Completion section |

---

## New Findings This Cycle

- **[low]** `advance-pipeline-lock.test.sh:425` — the "a matched candidate keeps its own directory" scenario seeds the candidate with the exact string it passes as `<doc-dir>`, so an unconditional `.task_or_story_directory = $dir` satisfies it too (QA: 91/91 green under that mutation) → seed a canon-equal but textually different spelling. **TASK-130-QA-14**, carried by route 2b.
- **[cleanup]** CR-2 — the `--restore` header bullets (`advance-pipeline-lock.sh:71-85`), `develop-pipeline-pause.md:80` and `grant-qa-cycles.sh:52-54` still describe the rebuild as "halt fields and `waiting_on` stripped" only → add the stamp clause. Follow-up.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1 · 2 · 3 · 4 | PASS | Verified | Unchanged since gate 6 |
| Phase 5: Gate-6 futures (`--restore --which` / `--accept-legacy`) | PASS | Verified (executed) | The `--accept-legacy` recovery now persists across the next pause or HALT |

**Overall Phase Completion**: 5/5.

---

## Success Criteria Verification

All functional criteria PASS. Code Quality: `ci:fast` 3574/3574 + shell suites (91, 42); `eval:develop-task` 13/13; `bundle:check` 0; shellcheck clean; Prettier clean — on the tree at `8b4c0e60` — PASS. Migration: PASS.

---

## Breaking Changes Validation

Unchanged — PASS. (`--accept-legacy` is additive; a present directory is never overwritten.)

---

## Issues Found

### HIGH Severity Issues (0) · MEDIUM Severity Issues (0)

### LOW Severity Issues (1) + 1 cleanup

- **QA-14** — vacuous no-overwrite scenario (carried to `recommendations.future`, route 2b). CR-2 cleanup — header contract mirrors.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 1 (+1 cleanup)

---

## NFR Assessment

### Performance — PASS
### Reliability — PASS — the recovery sticks (executed end to end under both shells).
### Security — PASS — **Evidence**: reasoned · **Probes executed**: 0 — a stamped snapshot is refused by another document exactly as a native one is (executed); the fill never overwrites.
### Maintainability — PASS — QA-14 and CR-2 recorded for the follow-up task with the gate-5/6 advisories.

---

## Code Review

Scoped review, 2 findings: promoted CR-1 → QA-14 (low, confidence high, QA mutation-confirmed); advisory CR-2. **Provenance:** both in this branch's cycle-7 change.

**Mutation proofs (QA-run, cp snapshot/restore, tree verified equal to committed):**

```
mutation-proven: advance-pipeline-lock.sh — stamp line removed → "directory stamp" + "recovery sticks" [bash, zsh] → covered
mutation-observed: advance-pipeline-lock.sh — fill → unconditional overwrite → 91/91 GREEN → QA-14 (the no-overwrite scenario pins nothing)
```

**Step 4b:** not applicable — the change is a shell script executed by its own 91-scenario suite. **5c:** tree unchanged after checks.

---

## Regression Testing

`npm test` glob 3574/3574; shell suites green; `eval:develop-task` 13/13; `bundle:check` 0; `lint:shell` clean; Prettier clean.

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
One follow-up task: QA-14; CR-2; gate-6 CR-1; gate-5 CR-2, CR-3, CR-5, CR-6, CR-7; detector `:80` zsh glob; the change-log.js repair path that dropped six rows (5c PC-2).

---

## Final Assessment

**Gate Status**: PASS · **Rationale**: no HIGH, no MEDIUM; one LOW carried by the Cosmetic-residue exit (route 2b: PASS gate, HIGH 0 for gates 6 and 7) · **Quality Score**: 92/100
**Deployment Recommendation**: READY — proceed to 5c.

---

**QA Report**: `task.130.qa.7.…md` · **Gate File**: `task.130.gate.7.…yml` · **Next Steps**: Step 5c `/review-pr` re-check, then `/finalise`.

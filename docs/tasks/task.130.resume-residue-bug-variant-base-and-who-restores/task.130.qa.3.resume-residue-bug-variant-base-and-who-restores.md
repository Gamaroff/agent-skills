# QA Report: Task 130 - Resume residue from task.124 — cycle 3 (safety re-probe)

**Task**: [task.130.resume-residue-bug-variant-base-and-who-restores.md](./task.130.resume-residue-bug-variant-base-and-who-restores.md)
**Gate File**: [task.130.gate.3.resume-residue-bug-variant-base-and-who-restores.yml](./task.130.gate.3.resume-residue-bug-variant-base-and-who-restores.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-20
**Testing Completed**: 2026-09-20
**Gate Status**: CONCERNS

---

## Executive Summary

Re-review of PR #441 after fix commit `fdba78d9`. Gate 2's HIGH (bug 3) and both mediums (bugs 4, 5) are fixed, covered and re-verified — QA enumerated twelve inputs to the delete boundary and every one behaved as the rule states. Because gate 2's HIGH concerned a selector and the task's Success Criteria say "refused", the scope rule's safety carve-out fired and this cycle was an **unscoped safety re-probe**. It found no HIGH and three mediums, all on the same block and all of the shape a fix cycle leaves behind: a bare-string note in `deltas_since_pause` — the shape the detector prompt's own prose invites — HALTs a healthy resume; the output file the block reads has no writer (the detector is read-only and *returns* JSON); and the `rm` still rests on the detector's label with no on-disk re-read of the two facts it stands on. The HIGH count is now `0, 1, 0`; the loop is converging.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — bugs 6, 7, 8

---

## Testing Scope

### Prerequisites Verified

- [x] Task complete; bugs 3–5 Ready for QA; tests passing (re-run: `ci:fast` 3561/3561); breaking changes documented; PR #441 OPEN

### Testing Approach

- [x] Automated · [x] Regression · [x] Security (reasoned; boundary re-probed by execution) · [x] Code Review (safety re-probe) · [x] Executed prose · [x] Mutation spot checks

### Review Methodology

Direct tools plus one read-only Explore reviewer with the **SAFETY RE-PROBE** directive. `SAFETY_REPROBE=true` by clauses 2 and 3 of `qa-re-review-scope.md` (clause 1: gate 2's security axis read `CONCERNS reasoned` → OK; clause 2: gate 2's HIGH concerned the delete *selector*, an allow-list on the concern label — a boundary; clause 3: `gate: FAIL` and the Success Criteria contain "refused"). Traceability mapper skipped (no table).

```
Re-review scope: unscoped (safety re-probe — prior gate FAIL with a HIGH on a boundary); full origin/develop...HEAD diff, 4283 lines
```

---

## Re-Review Context

| Prior issue | Bug | Status | Evidence |
| --- | --- | --- | --- |
| TASK-130-QA-3 prefix selector matches skip notes | 3 | **FIXED** | both skip notes → snapshot kept, exit 0 (bash+zsh); mutation prefix-back → H red ×4 → `covered` |
| TASK-130-QA-4 no path containment / `rm -f null` | 4 | **FIXED** | `../` traversal, symlink, empty, numeric, foreign path → HALT with nothing deleted; canonical path in relative / `./` / absolute spellings → deleted; mutation containment-dropped → I red → `covered` |
| TASK-130-QA-5 `DETECTOR_JSON` unbound; fallback vs HALT | 5 | **FIXED** (see bug 7 for what the fix left behind) | schema block binds from the file and rejects a non-array; delete gated on validation; mutation array-check-dropped → K red → `covered` |
| CR-5 hooks row · CR-6 Step 0-lock second exit-1 cause · CR-7 grant header · CR-8 `$DIRTY` printed | advisory | FIXED | read; call-sites/who-restores/glob-safe suites green |

---

## New Findings This Cycle

Searched unscoped: full branch diff; the reviewer executed the delete block and `--restore --which` under bash and zsh against 20 enumerated inputs; QA independently ran 12 (table above and below).

- **[medium]** `develop-pipeline-resume-contract.md` § Consume Output — a bare-string note in `deltas_since_pause` passes the schema check and aborts jq at `.concern`; the detector prompt gives its notes no object shape → object-shape notes, `all(type=="object")` in the schema check, `select(type=="object")` in the selector. **Bug 6.** Reproduced.
- **[medium]** same section — `DETECTOR_JSON=$(cat <detector-output-file>)` reads a file nothing writes; the detector is read-only and returns JSON → persist the returned JSON to `{doc-directory}/.summaries/step-0a-resume-detector.json` (existing convention) and bind from it. **Bug 7.** Confirmed by reading (prompt § Invocation Context "Read-only — no writes"; § Step 5 "Return JSON").
- **[medium]** same block — the `rm` trusts the label; no on-disk re-read of `task_or_story_directory` or of the PR's MERGED state → re-read both before `rm`; keep on a failed read. **Bug 8** (reviewer confidence medium; QA promotes it — it is the class this task exists to remove).
- **[low]** `pipeline-resume-detector-prompt.md:228` — the prompt's tail "orchestrator validates with" block is a second, stale copy of the schema check (no array field) — CR-4 → pointer to § Consume Output.
- **[low]** contract — the containment HALT says "nothing deleted" but the loop deletes as it goes; with `[canonical, other]` the first is gone when the message prints — CR-5. Reproduced. → validate all paths, then delete.
- **[low]** `advance-pipeline-lock.sh` — under `--accept-legacy` a newer legacy snapshot outranks a directory-matched `.pausing.*` claim on mtime and the claim is consumed as a loser — CR-6 → rank matched candidates first.
- Cleanup: step-8's kept-legacy case (claim present) prints nothing — CR-7 → name it.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Probe base | PASS | Verified | Unchanged; `$DIRTY` now printed before the HALT (CR-8 of cycle 2) |
| Phase 2: Dispatch mark + population | PASS | Verified | Unchanged |
| Phase 3: Stale-snapshot delete in the orchestrator | CONCERNS | Partial | Bugs 3–5 fixed; bugs 6–8 open on the same block — no data loss on the committed code (all three are HALT-a-healthy-resume, unreachable-block, or missing-defence findings) |
| Phase 4: One statement of who restores | PASS | Verified | Unchanged |
| Phase 5: Gate-6 futures | PASS | Verified | CR-6 (legacy ranking) is a low on `choose_candidate()` |

**Overall Phase Completion**: 4/5 pass; Phase 3 CONCERNS.

---

## Success Criteria Verification

| Criterion (Functional) | Status | Notes |
| --- | --- | --- |
| MERGED snapshot deleted by the orchestrator from one stated loop, asserted absent | CONCERNS | Deletes correctly on valid input (12-input re-probe); bug 7 makes the block unreachable on a literal run; bug 6 HALTs on a string note |
| All other functional criteria | PASS | as cycles 1–2 |

Code Quality: `ci:fast` 3561/3561 + shell suites; `eval:develop-task` 17/17; `bundle:check` 0; shellcheck clean; cycle-2 fixes mutation-covered (3/3 re-run by QA) — PASS. Migration: PASS.

---

## Breaking Changes Validation

Unchanged — PASS. (CR-6 touches `--accept-legacy` ranking, not the refusal itself.)

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (3)

- **Bare-string note HALTs a healthy resume** — [bug 6](./task.130.bug.6.bare-string-delta-halts-healthy-resume.md). Reliability. P2.
- **`<detector-output-file>` has no writer** — [bug 7](./task.130.bug.7.detector-output-file-has-no-writer.md). Reliability. P2.
- **Delete trusts the detector label without re-reading evidence** — [bug 8](./task.130.bug.8.delete-trusts-detector-label-without-rereading-evidence.md). Security. P2.

### LOW Severity Issues (3) + 1 cleanup — documented here only

CR-4, CR-5, CR-6 as above; CR-7 cleanup.

**Total Issues**: HIGH: 0, MEDIUM: 3, LOW: 3 (+1 cleanup)

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS — bugs 6 and 7 (feature does not run as stated; no data loss).
### Security — CONCERNS — **Evidence**: reasoned · **Probes executed**: 0 — bug 8; containment (bug 4) bounds *what* may be deleted, not *whether* it should be. `boundary: shell`.
### Maintainability — CONCERNS — CR-4 second schema-check copy; CR-5 untrue HALT message; CR-6; CR-7.

---

## Code Review

Safety re-probe, 7 findings: promoted CR-1 → QA-6, CR-2 → QA-7, CR-3 → QA-8 (QA-promoted); advisory CR-4..CR-7.

**Provenance:** all in the Consume Output block or `choose_candidate()` — new to this branch.

**QA boundary re-probe (12 inputs, bash):** canonical relative / `./` / absolute → deleted; `../` traversal, symlink to another file, empty, numeric → HALT, nothing deleted; verdict label with trailing space, both skip notes, `concern: null`, empty array → kept, exit 0; missing `deltas_since_pause` key → HALT (would be caught by the schema check first).

**Mutation proofs (QA-run, cp snapshot/restore, tree verified equal to committed):**

```
mutation-proven: contract — equality selector → prefix → stale-snapshot-delete H [bash] ×2, H [zsh] ×2 → covered
mutation-proven: contract — canon containment dropped → stale-snapshot-delete I [bash], I [zsh] → covered
mutation-proven: contract — schema array check dropped → stale-snapshot-delete K [bash], K [zsh] → covered
```

**Step 4b:** contract (2/8/20, 0 findings), detector prompt (2/3/0; :69 unchanged `cat`), hooks (`no-executable-blocks`) under bash+zsh. **5c:** tree unchanged after checks.

---

## Regression Testing

`npm test` glob 3561/3561 (1 skipped pre-existing); shell suites green; `eval:develop-task` 17/17; `bundle:check` 0; `lint:shell` clean; Prettier clean.

---

## Recommendations

### Immediate Actions (Blocking)
1. Bug 6 — object notes + `all(type=="object")` + `select(type=="object")`; test. P2
2. Bug 7 — persist the returned JSON to `.summaries/step-0a-resume-detector.json`; bind from it. P2
3. Bug 8 — on-disk re-read of directory match and MERGED before `rm`; keep on failed read; tests with a stub `gh`. P2

### Short-term Actions (Non-Blocking)
CR-4 pointer; CR-5 two-pass; CR-6 provenance-first ranking; CR-7 else arm.

---

## Final Assessment

**Gate Status**: CONCERNS · **Rationale**: no HIGH (rule 2: three mediums, reproduced or confirmed); reliability/security/maintainability CONCERNS on the same block · **Quality Score**: 80/100
**Deployment Recommendation**: CONDITIONAL — bugs 6–8 fixed and re-verified.

---

**QA Report**: `task.130.qa.3.…md` · **Gate File**: `task.130.gate.3.…yml` · **Next Steps**: `/qa-fix`; cycle 4 scoped to files changed since gate 3.

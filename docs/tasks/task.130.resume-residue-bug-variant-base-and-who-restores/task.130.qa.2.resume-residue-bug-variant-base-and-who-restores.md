# QA Report: Task 130 - Resume residue from task.124 — cycle 2 (refute pass)

**Task**: [task.130.resume-residue-bug-variant-base-and-who-restores.md](./task.130.resume-residue-bug-variant-base-and-who-restores.md)
**Gate File**: [task.130.gate.2.resume-residue-bug-variant-base-and-who-restores.yml](./task.130.gate.2.resume-residue-bug-variant-base-and-who-restores.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-20
**Testing Completed**: 2026-09-20
**Gate Status**: FAIL

---

## Executive Summary

Re-review of PR #441 after fix commit `3479b14a`. Both cycle-1 findings are fixed, covered and re-verified under bash and zsh. The cycle-2 **refute pass** over the whole branch diff — the one review in the loop by an agent asked to find the false claim rather than confirm the change — found a HIGH in the one-statement delete loop that cycle 1 missed and cycle 1's fix did not touch: the selector is a *prefix* match on `stale-snapshot`, and the detector prompt places two `stale-snapshot check skipped — …` notes in the same array for a snapshot it explicitly has **not** proven merged. On the failure path (offline `gh`, a Bitbucket PR) the orchestrator deletes a live halt snapshot. Two mediums sit on the same block: no containment on the reported path (`rm -f null`, `rm -f unrelated.txt` both ran), and no fence binds `DETECTOR_JSON` while two neighbouring sentences prescribe different outcomes for invalid detector output. All three reproduced.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED — bugs 3, 4, 5

---

## Testing Scope

### Prerequisites Verified

- [x] Task document complete; 22/22 phases ticked; bugs 1–2 Ready for QA
- [x] Tests passing (re-run by QA: `ci:fast` 3551/3551 + shell suites)
- [x] Breaking changes documented (two)
- [x] Code on feature branch with open PR (#441, OPEN)

### Testing Approach

- [x] Automated Testing · [x] Regression Testing · [x] Security Review (reasoned) · [x] Code Review (refute pass) · [x] Executed prose (Step 4b) · [x] Mutation-proof spot checks

### Review Methodology

Direct tools plus one read-only Explore reviewer, **REFUTE PASS** (cycle 2 — exactly one prior gate — whole branch diff, refute directive appended; `SAFETY_REPROBE=false`: gate 1's security axis read `OK reasoned`, its entries were functional/reliability). Traceability mapper skipped (no Success Criteria table).

```
Re-review scope: unscoped — cycle-2 refute pass over origin/develop...HEAD (3560 lines, bundled copies excluded)
```

---

## Re-Review Context

| Prior issue | Bug | Status | Evidence |
| --- | --- | --- | --- |
| TASK-130-QA-1 trailing `--which` performs a consuming restore | 1 | **FIXED** | `--restore <dir> --which` → exit 1, usage on stderr, no lock, snapshot kept; flag-first `--which` prints the path, consumes nothing. Mutation `-eq 1`→`-ge 1` → "[bash]/[zsh] --restore trailing flag" red → `covered` |
| TASK-130-QA-2 delete loop exits 0 on unset/malformed input | 2 | **FIXED** | unset → exit 127/1 (bash/zsh) with `DETECTOR_JSON is unbound`; missing `concern` → exit 0, kept; non-array → `HALT: could not read stale-snapshot deltas`. Mutations: `:?` dropped → E red; `|| HALT` dropped → G red → `covered` |
| CR-3 step-8 legacy arm on failed jq read | advisory | FIXED | F4 covered (guard dropped → red) |
| CR-4 `--which` prose on stdout | advisory | FIXED | scenario green; stdout empty with a lock present |
| CR-5 site (3) not named exempt | advisory | FIXED | C0 present |
| CR-6 env-seeded `ACCEPT_LEGACY` | advisory | FIXED | scenario green (exported `ACCEPT_LEGACY=1` ignored) |
| CR-7 duplicate usage lines | advisory | FIXED | usage single line |

---

## New Findings This Cycle

- **[high]** `shared/resources/develop-pipeline-resume-contract.md` § Consume Output — `startswith("stale-snapshot")` matches the detector's skip notes; a live snapshot is deleted when the `gh` read failed or the PR is not on GitHub → exact-label selector. **Bug 3 / TASK-130-QA-3.** Reproduced.
- **[medium]** same block — any reported `.path` is `rm -f`'d; a missing path becomes `rm -f null` → containment to the canonical snapshot path; HALT on non-string. **Bug 4 / TASK-130-QA-4.** Reproduced (`set -x` showed both `rm -f` lines; `unrelated.txt` deleted).
- **[medium]** same section — no fence binds `DETECTOR_JSON`; the "invalid → fall back to full Phase 0b" sentence and the unconditional fail-closed block contradict → bind once in the schema check, gate the delete block on validation. **Bug 5 / TASK-130-QA-5.**
- **[low]** `develop-pipeline-step-8-commit.md` — Step 8 of *any* completed run deletes a sole legacy snapshot while `--accept-legacy` promises a recovery window (CR-5). This is the task's stated design (Breaking Change 2: "deleted by the next completed run's Step 8"); recorded as a documented tension, not a defect to change here → note in the hooks troubleshooting row.
- **[low]** the three Step 0-lock paragraphs read `--restore` exit 1 as "fresh start" only; `legacy-snapshot` is a second exit-1 cause (CR-6) → one sentence each, or cite the hooks row.
- Cleanups: `grant-qa-cycles.sh` header still says a directory-less snapshot is accepted (CR-7); the (c) row promises entries the unbindable-base HALT never prints (CR-8 — echo `$DIRTY` before the HALT).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Probe base | PASS | Verified | Unchanged since cycle 1; CR-8 (print `$DIRTY` before the HALT) is cosmetic |
| Phase 2: Dispatch mark + population | PASS | Verified | Unchanged |
| Phase 3: Stale-snapshot delete in the orchestrator | **FAIL** | Failed | Bugs 3, 4, 5 — all in the one statement this phase introduced. The cycle-1 fix made the block fail closed on *broken* input; the refute pass shows it acts wrongly on *valid* input it never should have matched. |
| Phase 4: One statement of who restores | PASS | Verified | Unchanged |
| Phase 5: Gate-6 futures | PASS | Verified | Bug 1 fixed; CR-4/6/7 advisories applied; CR-5/CR-6 (new) are documentation |

**Overall Phase Completion**: 4/5 phases pass; Phase 3 fails.

---

## Success Criteria Verification

| Criterion (Functional) | Status | Notes |
| --- | --- | --- |
| MERGED snapshot deleted by the orchestrator from one stated loop, asserted absent | **FAIL** | The loop also deletes a snapshot that is *not* MERGED (bug 3) and any other reported path (bug 4) |
| All other functional criteria | PASS | as cycle 1 |

| Criterion (Code Quality) | Status |
| --- | --- |
| `ci:fast` green (3551/3551 + shell suites), `eval:develop-task` 17/17, `bundle:check` 0, shellcheck clean | PASS |
| Every new branch mutation-proven | PASS — cycle-1 fixes re-proved by QA (4 of 4 `covered`) |

Migration criteria: PASS (unchanged).

---

## Breaking Changes Validation

Unchanged from cycle 1 — both documented, migration paths tested. **Overall: PASS.** CR-5 is a documentation tension on Breaking Change 2, recorded above.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: the delete selector matches the detector's skip notes and deletes a live snapshot**
- **Severity**: HIGH · **Category**: Reliability
- **Bug Report**: [task.130.bug.3.delete-selector-matches-skip-notes.md](./task.130.bug.3.delete-selector-matches-skip-notes.md)
- **Observation**: `concern: "stale-snapshot check skipped — gh pr view failed: offline"` → exit 0, snapshot deleted.
- **Impact**: the failure path destroys the artefact resume depends on; every offline resume and every Bitbucket consumer.
- **Recommendation**: `.concern == "stale-snapshot: PR merged"`; detector prompt names the label; tests per skip wording. **P1**

### MEDIUM Severity Issues (2)

**Issue: no path containment; `rm -f null`** — [bug 4](./task.130.bug.4.delete-loop-no-path-containment.md). Category: Security/Reliability. P2.

**Issue: `DETECTOR_JSON` never bound in a fence; validation and delete prescribe different outcomes** — [bug 5](./task.130.bug.5.detector-json-never-bound-and-validation-order.md). Category: Maintainability. P2.

### LOW Severity Issues (2) — documented here only

- CR-5 Step 8 legacy delete vs `--accept-legacy` recovery window (design tension, documented).
- CR-6 Step 0-lock paragraphs: second exit-1 cause unnamed.

**Total Issues**: HIGH: 1, MEDIUM: 2, LOW: 2 (+2 cleanups)

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — FAIL
Bug 3: the failure path deletes a live halt snapshot — the exact rule the detector prompt states ("a failed read is never evidence of MERGED") and the one statement violates.

### Security — CONCERNS
- **Status**: CONCERNS · **Evidence**: reasoned · **Probes executed**: 0
- Bug 4: an `rm -f` driven by a subagent-reported string with no containment. `boundary: shell` — the probe engine has no JS entry to import; `choose_candidate()`'s refusal arms remain executed by `advance-pipeline-lock.test.sh`.

### Maintainability — CONCERNS
Bug 5's contradiction between neighbouring sentences; CR-7/CR-8 cleanups.

---

## Code Review

Refute pass, 8 findings. Promoted: CR-1 → QA-3 (high), CR-2 → QA-4, CR-3+CR-4 → QA-5. Advisory: CR-5, CR-6 (low/medium), CR-7, CR-8 (cleanups). Full text in the gate's `code_review` and `recommendations`.

**Provenance (5b):** all three promoted findings are in the Consume Output block, which does not exist on `origin/develop` — new to this branch. Bug 3's prefix selector was present in the cycle-1 code and survived the cycle-1 fix (the fix hardened the block against *broken* input; it did not re-examine what the selector matches on *valid* input).

**Mutation proofs (3c, QA-run, cp snapshot/restore, tree verified equal to committed):**

```
mutation-proven: advance-pipeline-lock.sh — `[ $# -eq 1 ]` → `-ge 1` → "[bash]/[zsh] --restore trailing flag" → covered
mutation-proven: contract — `|| { HALT … }` on jq failure dropped → stale-snapshot-delete G [bash], G [zsh] → covered
mutation-proven: contract — `:?` guard dropped → stale-snapshot-delete E [bash], E [zsh] → covered
mutation-proven: step-8 — `jq -e 'type == "object"'` guard dropped → halt-snippet-glob-safe F4 [bash], F4 [zsh] → covered
```

**Step 4b:** contract (2 runnable / 9 placeholder / 19 mutating; 0 findings) and step-8 (`no-executable-blocks`, correct) re-run after the fix under bash and zsh. Other prose files unchanged since cycle 1.

**5c:** no fix left in the working tree; porcelain unchanged (the one entry is the implementation report the orchestrator edits).

---

## Regression Testing

| Area | Result |
| --- | --- |
| `npm test` glob | PASS — 3551/3551 (1 skipped, pre-existing) |
| Shell suites (advance-pipeline-lock 81, grant-qa-cycles 42, others) | PASS |
| `eval:develop-task` 17 fixtures | PASS |
| `bundle:check` / `lint:shell` / Prettier | PASS |

---

## Test Artifacts

Files reviewed: as cycle 1 plus the fix commit `3479b14a` (contract § Consume Output, `advance-pipeline-lock.sh` dispatch arm, step-8 legacy arm, the four extended test files). Commands: `ci:fast`, `eval:develop-task`, `bundle -- --check`, `lint:shell`, `qa-execute-snippets.mjs` over the two touched prose files, the four mutation runs, the three reproductions above.

---

## Recommendations

### Immediate Actions (Blocking)
1. Bug 3 — exact-label selector + detector prompt statement + kept-snapshot tests. **P1**
2. Bug 4 — canonical-path containment; HALT on non-string path; tests. P2
3. Bug 5 — bind `DETECTOR_JSON` once in the schema block; array check there; delete block gated on validation. P2

### Short-term Actions (Non-Blocking)
1. CR-5 hooks-row note; CR-6 sentence in the three Step 0-lock paragraphs; CR-7/CR-8 cleanups.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one HIGH (rule 1) in code this branch introduced, reproduced; reliability NFR FAIL on the same defect.
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED
**Conditions**: bugs 3, 4, 5 fixed and re-verified.

---

**QA Report**: `task.130.qa.2.resume-residue-bug-variant-base-and-who-restores.md`
**Gate File**: `task.130.gate.2.resume-residue-bug-variant-base-and-who-restores.yml`
**Next Steps**: `/qa-fix` on the three gate entries; cycle 3 re-review scoped to files changed since this gate.

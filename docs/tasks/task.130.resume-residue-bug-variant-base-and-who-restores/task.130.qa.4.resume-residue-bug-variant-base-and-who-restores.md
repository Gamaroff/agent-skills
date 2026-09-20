# QA Report: Task 130 - Resume residue from task.124 — cycle 4 (scoped re-review)

**Task**: [task.130.resume-residue-bug-variant-base-and-who-restores.md](./task.130.resume-residue-bug-variant-base-and-who-restores.md)
**Gate File**: [task.130.gate.4.resume-residue-bug-variant-base-and-who-restores.yml](./task.130.gate.4.resume-residue-bug-variant-base-and-who-restores.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-20
**Testing Completed**: 2026-09-20
**Gate Status**: FAIL

---

## Executive Summary

Re-review of PR #441 after fix commit `fa3e3fdc`, scoped to the files that commit touched (the scope rule's safety carve-out did not fire: gate 3 had no HIGH and no FAIL, its security axis read `CONCERNS reasoned`, and no clause-2/3 trigger applied). Bugs 6–8 are fixed and re-verified under bash and `zsh -f`. The reviewer found one HIGH that the test harness structurally could not see: the delete block reads `$DETECTOR_JSON` that only the previous fence assigns, and this repository's own rule — every orchestrator Bash call is a fresh shell — means the guard HALTs every literal resume. It is the cycle-2 bug-5 shape moved one fence up, and the cycle-3 fix that made the persisted file the carrier stopped one line short of reading it. Two mediums: four bare-string note sites remain in the detector prompt outside the sentence cycle 3 added, and an empty `pr_url` makes `gh pr view ""` read the current branch's PR. All three reproduced. HIGH sequence `0, 1, 0, 1`.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED — bugs 9, 10, 11

---

## Testing Scope

### Prerequisites Verified

- [x] Task complete; bugs 6–8 Ready for QA; tests passing (re-run); breaking changes documented; PR #441 OPEN

### Testing Approach

- [x] Automated · [x] Regression · [x] Security (reasoned) · [x] Code Review (scoped, light) · [x] Executed prose · [x] Mutation spot checks

### Review Methodology

Direct tools plus one read-only Explore reviewer over a **scoped** diff. `SAFETY_REPROBE=false` (clause 1: `OK reasoned`; clause 2: no HIGH in gate 3; clause 3: gate 3 not FAIL). Scope note: `git log --since=<gate 3 updated>` returned nothing — the fix commit's author time precedes the hand-written gate timestamp — and an empty pathspec silently widened `git diff` to the whole branch; the non-vacuity guard caught it and the scope was rebuilt from `git diff --name-only <gate-3 commit>..HEAD` (16 files, 7 source/test). Traceability mapper skipped.

```
Re-review scope: files changed since gate 3 (commit fa3e3fdc; 7 source/test files, 2360 diff lines) — default scoping
```

---

## Re-Review Context

| Prior issue | Bug | Status | Evidence |
| --- | --- | --- | --- |
| TASK-130-QA-6 bare-string note HALTs a healthy resume | 6 | **FIXED** (in the sites cycle 3 named — see bug 10 for the rest) | string note → schema check exit 1, file persisted; selector skips non-objects; mutation `all(object)` dropped → K red |
| TASK-130-QA-7 `<detector-output-file>` has no writer | 7 | **FIXED** | bind block persists `.summaries/step-0a-resume-detector.json` and binds a non-empty `DETECTOR_JSON` (bash, zsh) |
| TASK-130-QA-8 delete trusts the label | 8 | **FIXED** | other-document snapshot → HALT, kept; OPEN / gh failure → KEPT with reason; MERGED → removed with the evidence line; mutations directory-read dropped → M red, gh-read dropped → N red |
| CR-4 pointer · CR-5 two-pass · CR-6 provenance ranking · CR-7 named kept case | advisory | FIXED | read; suites green (83/83, 16/16) |

---

## New Findings This Cycle

- **[high]** `develop-pipeline-resume-contract.md` § Consume Output delete block — `$DETECTOR_JSON` is assigned only by the previous fence; a fresh shell HALTs at the `:?` guard on every literal run (reproduced: file persisted, delete block alone → `DETECTOR_JSON: HALT: … unbound`) → re-bind from the persisted file inside the block; two-shell test. **Bug 9 / TASK-130-QA-9.**
- **[medium]** `pipeline-resume-detector-prompt.md:108/112/113/167` — four sites still instruct bare-string notes; any one fails the schema check's `all(type=="object")` → rule into the field table, rewrite the sites, enumerating test. **Bug 10.**
- **[medium]** contract pass 2 — empty `pr_url` → `gh pr view ""` resolves the current branch's PR (reproduced: #441) → keep-with-reason before the `gh` call. **Bug 11.**
- Cleanups: CR-4 provenance scenario comment/assertion; CR-5 field-table mtime fields.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1 · 2 · 4 · 5 | PASS | Verified | Unchanged since gate 3 (CR-6/CR-7 in Phase 5 verified) |
| Phase 3: Stale-snapshot delete in the orchestrator | **FAIL** | Failed | Bug 9 — the block does not execute on a literal resume; bugs 10–11 on the same surface |

---

## Success Criteria Verification

| Criterion (Functional) | Status | Notes |
| --- | --- | --- |
| MERGED snapshot deleted by the orchestrator from one stated loop, asserted absent | **FAIL** | Correct when the variable is bound in the same shell (31-case suite); never reached on a literal two-fence run (bug 9) |
| All other functional criteria | PASS | |

Code Quality: `ci:fast` 3569/3569 + shell suites; `eval:develop-task` 17/17; `bundle:check` 0; shellcheck clean; cycle-3 fixes mutation-covered (3/3) — PASS. Migration: PASS.

---

## Breaking Changes Validation

Unchanged — PASS.

---

## Issues Found

### HIGH Severity Issues (1)

**The delete block reads `$DETECTOR_JSON` from the previous fence** — [bug 9](./task.130.bug.9.delete-block-reads-variable-from-previous-fence.md). Reliability. P1. Impact: the one statement of the delete never executes on a real resume, loudly.

### MEDIUM Severity Issues (2)

- **Four bare-string note sites remain** — [bug 10](./task.130.bug.10.remaining-bare-string-note-sites.md). Reliability. P2.
- **Empty `pr_url` → current branch's PR** — [bug 11](./task.130.bug.11.empty-pr-url-reads-current-branch.md). Security. P2.

### LOW Severity Issues (0) + 2 cleanups

CR-4, CR-5.

**Total Issues**: HIGH: 1, MEDIUM: 2, LOW: 0 (+2 cleanups)

---

## NFR Assessment

### Performance — PASS
### Reliability — FAIL — bug 9 (block unreachable on a literal run); bug 10.
### Security — CONCERNS — **Evidence**: reasoned · **Probes executed**: 0 — bug 11.
### Maintainability — CONCERNS — CR-4, CR-5.

---

## Code Review

Scoped review, 5 findings: promoted CR-1 → QA-9 (high), CR-2 → QA-10, CR-3 → QA-11 (QA-reproduced); advisory CR-4, CR-5. **Provenance:** all in code introduced by this branch.

**Mutation proofs (QA-run, cp snapshot/restore, tree verified equal to committed):**

```
mutation-proven: contract — `all(.deltas_since_pause[]; type == "object")` dropped → stale-snapshot-delete K [bash], K [zsh] → covered
mutation-proven: contract — directory re-read dropped → stale-snapshot-delete M [bash], M [zsh] → covered
mutation-proven: contract — gh re-read dropped → stale-snapshot-delete N [bash], N [zsh] → covered
```

**On the harness:** the suite injects `DETECTOR_JSON=…` into the same script as the block — the exact condition bug 9 hides behind. The fix must add a two-process case, or the suite stays blind to this class.

**Step 4b:** contract (2/8/20), detector prompt (2/2/0; :69 unchanged `cat`), step-8 (`no-executable-blocks`) — 0 attributable findings. **5c:** tree unchanged after checks.

---

## Regression Testing

`npm test` glob 3569/3569; shell suites green; `eval:develop-task` 17/17; `bundle:check` 0; `lint:shell` clean; Prettier clean.

---

## Recommendations

### Immediate Actions (Blocking)
1. Bug 9 — re-bind from the file in the delete block; two-shell test; E on an absent file. **P1**
2. Bug 10 — field-table rule; rewrite the four sites; enumerating test. P2
3. Bug 11 — empty `pr_url` → KEPT before `gh`; test. P2

### Short-term Actions (Non-Blocking)
CR-4, CR-5.

---

## Final Assessment

**Gate Status**: FAIL · **Rationale**: one HIGH (rule 1), reproduced; reliability FAIL on the same defect · **Quality Score**: 70/100
**Deployment Recommendation**: BLOCKED — bugs 9–11 fixed and re-verified.

---

**QA Report**: `task.130.qa.4.…md` · **Gate File**: `task.130.gate.4.…yml` · **Next Steps**: `/qa-fix`; cycle 5 (the last budgeted cycle) scoped to files changed since gate 4.

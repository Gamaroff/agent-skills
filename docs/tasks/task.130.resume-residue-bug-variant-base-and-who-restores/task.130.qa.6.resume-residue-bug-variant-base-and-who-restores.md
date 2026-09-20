# QA Report: Task 130 - Resume residue from task.124 — cycle 6 (granted; scoped re-review)

**Task**: [task.130.resume-residue-bug-variant-base-and-who-restores.md](./task.130.resume-residue-bug-variant-base-and-who-restores.md)
**Gate File**: [task.130.gate.6.resume-residue-bug-variant-base-and-who-restores.yml](./task.130.gate.6.resume-residue-bug-variant-base-and-who-restores.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-20
**Testing Completed**: 2026-09-20
**Gate Status**: CONCERNS (no open entry)

---

## Executive Summary

Granted cycle after the loop limit (operator: "Resume at 5a with 2 more cycles"; budget now 7). Re-review of PR #441 after fix commit `a9bccb13`, scoped to the four files it touched (72 lines). Gate 5's one medium (bug 12) is fixed: the three orchestrator citations name the exact label the contract's selector acts on, and test D now reads what the citation *says* — it goes red under three independent mutations, including a *different* exact label. The reviewer found no bug and one low cleanup on the new assertion itself. Nothing is open; the `CONCERNS` token is the maintainability axis carrying the advisory residue gate 5 documented for a follow-up task. HIGH sequence `0, 1, 0, 1, 0, 0`.

**Overall Assessment**: CONCERNS — no open entry (§5c route 3)
**Deployment Recommendation**: READY — hand to 5c

---

## Testing Scope

### Prerequisites Verified

- [x] Task complete; bug 12 Ready for QA; tests passing; breaking changes documented; PR #441 OPEN

### Testing Approach

- [x] Automated · [x] Regression · [x] Security (reasoned; boundary unchanged since the executed re-probe) · [x] Code Review (scoped, light) · [x] Mutation spot checks

### Review Methodology

Direct tools plus one read-only Explore reviewer over the **scoped** diff (120 s). `SAFETY_REPROBE=false` (clause 1: gate 5 `CONCERNS reasoned` → OK; clause 2: no HIGH in gate 5; clause 3: gate 5 not FAIL). Scope from the gate-5 commit (`git diff b07373df..HEAD`, source/test only: 4 files, 72 lines) — not `--since`, per the cycle-4 lesson. Traceability mapper skipped. `Adaptive strategy override: lite mode — direct tools only`.

```
Re-review scope: files changed since gate 5 (commit b07373df; 4 files, 72 diff lines) — default scoping
```

---

## Re-Review Context

| Prior issue | Bug | Status | Evidence |
| --- | --- | --- | --- |
| TASK-130-QA-12 three orchestrator citations describe a prefix delete | 12 | **FIXED** | `grep -F 'starts \`stale-snapshot\`'` → 0 across the three SKILL.md; exact label at each; test D red under prefix-restored, wrong-exact-label and "carries the prefix" mutations; population confirmed as exactly test D's three files |
| Gate-5 advisories CR-2, CR-3, CR-5, CR-6, CR-7 | advisory | NOT ADDRESSED (by design) | the last budgeted fix was kept one finding wide; carried on the maintainability axis for a follow-up task |

---

## New Findings This Cycle

- **[low, cleanup]** `stale-snapshot-delete.test.mjs:578` — test D's negative guard is an ordered word-list heuristic: it misses prefix phrasings without a listed word ("begins with", "prefixed by") and rejects an accurate clause such as "share the prefix `stale-snapshot`" (QA confirmed both). The positive `exactly \`stale-snapshot: PR merged\`` assertion is the real floor → narrow the negative match to a bare backticked `stale-snapshot` not followed by `: PR merged` inside the `whose \`concern\`` clause, or drop it. **CR-1**, advisory.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1 · 2 · 4 · 5 | PASS | Verified | Unchanged since gate 5 |
| Phase 3: Stale-snapshot delete in the orchestrator | PASS | Verified | Block unchanged since the 42-input re-probe; its description at the three citing sites now matches it |

**Overall Phase Completion**: 5/5.

---

## Success Criteria Verification

All functional criteria PASS (as gate 5, with Phase 3's description now consistent). Code Quality: `ci:fast` 3574/3574 + shell suites (85, 42); `eval:develop-task` 13/13; `bundle:check` 0; shellcheck clean; Prettier clean — on the tree at `a9bccb13` (HEAD adds only the report commit) — PASS. Migration: PASS.

---

## Breaking Changes Validation

Unchanged — PASS.

---

## Issues Found

### HIGH Severity Issues (0) · MEDIUM Severity Issues (0) · LOW Severity Issues (0) + 1 cleanup

CR-1 (advisory).

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0 (+1 cleanup; gate-5 advisories carried)

---

## NFR Assessment

### Performance — PASS
### Reliability — PASS
### Security — PASS — **Evidence**: reasoned · **Probes executed**: 0 (boundary unchanged since it was executed at 42 inputs; no JS entry for the engine)
### Maintainability — CONCERNS — advisory residue for a follow-up task: CR-1 (this cycle), CR-2, CR-3, CR-5, CR-6, CR-7, detector `:80` zsh glob (pre-existing). None gates.

---

## Code Review

Scoped review, 1 finding (cleanup); none promoted. **Provenance:** the new assertion in this branch.

**Mutation proofs (QA-run, cp snapshot/restore, tree verified equal to committed):**

```
mutation-proven: develop-task citation — prefix wording restored → stale-snapshot-delete D → covered
mutation-proven: develop-task citation — exact label changed to `stale-snapshot: merged` → D → covered
mutation-proven: develop-task citation — "carries the prefix `stale-snapshot`" → D → covered
```

**Step 4b:** not applicable — no runnable prose in the cycle-6 diff. **5c:** tree unchanged after checks.

---

## Regression Testing

`npm test` glob 3574/3574; shell suites green; `eval:develop-task` 13/13; `bundle:check` 0; `lint:shell` clean; Prettier clean.

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
One follow-up task for CR-1, CR-2, CR-3, CR-5, CR-6, CR-7 and the detector `:80` glob.

---

## Final Assessment

**Gate Status**: CONCERNS with no open entry · **Rationale**: no HIGH, no MEDIUM, `top_issues` empty; maintainability CONCERNS carries documented advisories (gate rule 4), which §5c route 3 hands to the PR conformance review rather than to a fix cycle · **Quality Score**: 90/100
**Deployment Recommendation**: READY — proceed to 5c.

---

**QA Report**: `task.130.qa.6.…md` · **Gate File**: `task.130.gate.6.…yml` · **Next Steps**: Step 5c `/review-pr`.

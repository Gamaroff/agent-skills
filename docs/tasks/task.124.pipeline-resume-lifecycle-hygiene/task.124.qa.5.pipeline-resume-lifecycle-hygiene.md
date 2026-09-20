# QA Report: Task 124 - Resume trusts what it finds on disk (cycle 5)

**Task**: [Link to task document](./task.124.pipeline-resume-lifecycle-hygiene.md)
**Gate File**: [task.124.gate.5.pipeline-resume-lifecycle-hygiene.yml](./task.124.gate.5.pipeline-resume-lifecycle-hygiene.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-19
**Testing Completed**: 2026-09-19
**Gate Status**: CONCERNS
**PR**: #436 — https://github.com/Gamaroff/agent-skills/pull/436 (head `e14f1b2c`)

---

## Executive Summary

Cycle 4's four findings are verified fixed in isolation — each grep that defined them now returns the fixed shape, and Step 4b executes every runnable block in the three changed files green under bash and zsh. The narrowed cycle-5 review found **no HIGH and no mechanism regression**, but two MEDIUM defects in the executed prose: the develop-bug fix **moved** the who-restores contradiction rather than removing it (the two shared sources develop-bug bundles still state the loop-limit exception for all three pipelines), and the working-tree probe classifies against `origin/${BASE_BRANCH:-develop}` although nothing in any pipeline binds `BASE_BRANCH` — the first finding in five cycles against the probe's *behaviour* rather than its text, and one where the wrong outcome discards a file. Gate **CONCERNS**. This was the last budgeted cycle; the loop's exit is the orchestrator's decision (route classifier), recorded in the implementation report.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document complete; status `ready-for-review` after `/qa-fix` cycle 4
- [x] All implementation phases completed
- [x] Tests passing (`npm run ci:fast` on `e14f1b2c` — 3512 tests, 3511 pass, 1 skipped, 0 fail; `eval:develop-task` 16/16)
- [x] Breaking changes documented; migration path on both resume paths
- [x] Open PR (#436)

### Testing Approach

- [x] Automated Testing (fast gate, eval replay)
- [x] Regression Testing
- [x] Security Review (unchanged)
- [x] Code Review (Step 3b — cycle 5, narrowed to files changed since gate 4)
- [x] Step 4b — runnable prose executed (5 runnable blocks × bash + zsh, seeded working directory)

### Review Methodology

Re-review, cycle 5 → narrowed (`--since=2026-09-19T14:52:51Z` → 28 files, of which 3 canonical sources + 18 bundled copies + 7 task artifacts; the 3 sources diffed — 361 lines full-branch, the 79-line cycle-4 delta read first), one read-only Explore subagent told the four cycle-4 findings and asked to check the fixes' consistency with the rest of each file. `code_review_blocking=true`; CR-1 (medium/high) promoted by rule; CR-2 returned medium/medium and was raised to high on QA verification (no binding of `BASE_BRANCH` exists anywhere; lock has no base field) — promoted. Wait marked/cleared on the lock via `set-waiting-on.sh`.

```
Re-review scope: since 2026-09-19T14:52:51Z (default; security axis OK reasoned → SAFETY_REPROBE=false)
```

**Step 4b**: `qa-execute-snippets.mjs` over the three changed files — bare run: 2 blocks exit 1 in every shell (`cat` of a lock / SKILL.md absent from the empty sandbox — identical in bash and zsh, the known under-seeded shape); re-run with `--copy <seed>` carrying the lock and develop-bug's SKILL.md: 5/5 runnable blocks exit 0 under both shells, 0 findings. Counts: contract 2 runnable / 9 placeholder / 18 mutating; detector 2/3/0; develop-bug 1/1/6 (mutating refusals are `gh`/`rm`/`jq >` by design).

---

## Re-Review Context

| Cycle-4 issue | Status | Evidence this cycle |
| --- | --- | --- |
| CR-1 two restore statements | **FIXED** (residue → cycle-5 CR-1) | `grep -c 'Restore first, then continue'` → 0; Phase 0b defers to Phase 0a |
| CR-2 develop-bug grant exception | **FIXED** in develop-bug (residue → cycle-5 CR-1) | `grep -c 'loop-limit\|not-converging' skills/develop-bug/SKILL.md` → 0; the no-grant sentence at :69 |
| CR-3 gh failure label | **FIXED** | two labels at detector :89/:91, branched on the URL host |
| CR-4 Cost sentence | **FIXED** | contract :166 names `cat-file -e` and the per-arm compare |

---

## New Findings This Cycle

- **[medium]** `shared/resources/develop-pipeline-resume-contract.md:61` (+ `develop-pipeline-step-0-resolve-and-prepare.md:253`) — the loop-limit exception is stated for all three pipelines in the two shared sources develop-bug bundles, while develop-bug's SKILL.md:69 now says it has no grant; develop-bug's own loop HALTs "not converging" at MAX_ITER=5 with a free-form `halt_reason`. **CR-1 (bug 13)**, promoted by rule.
- **[medium]** `shared/resources/develop-pipeline-resume-contract.md:104` — `BASE_REF="origin/${BASE_BRANCH:-develop}"`; `grep -rn 'BASE_BRANCH=' shared/resources skills/*/SKILL.md skills/*/references` → nothing; `jq keys` on the lock → no base field. Hotfix/epic-integration branches probe against develop; the (a) outcome is a `git checkout HEAD` discard. **CR-2 (bug 14)**, promoted after verification.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1 | CONCERNS | fixtures 13–16 green; Step 4b green | cross-file exception statement (CR-1); probe base unbound (CR-2) |
| Phase 2 | PASS | 19/19, 32/32 | — |
| Phase 3 | PASS | 12/12 | — |
| Phase 4 | PASS | 67/67; exercised live this session (in-session `--restore` after a real PreCompact pause) | — |

**Overall Phase Completion**: 4/4; 1 CONCERNS, 3 PASS

---

## Success Criteria Verification

Functional criteria hold on the mechanisms. Continuation criterion: CONCERNS until CR-1 (one rule per pipeline, stated where the rule is) and CR-2 (probe base from recorded state). Performance PASS · Code Quality PASS · Migration deferred to finalise.

---

## Breaking Changes Validation

PASS — the migration path is stated on both resume paths; CR-1 is a consistency defect in that statement across the bundled sources, not a gap.

---

## Issues Found

### HIGH Severity Issues (0)
None.

### MEDIUM Severity Issues (2)
- **Shared sources state the grant exception for develop-bug** — [task.124.bug.13.shared-sources-state-grant-exception-for-develop-bug.md](./task.124.bug.13.shared-sources-state-grant-exception-for-develop-bug.md). P2.
- **Probe base branch never bound** — [task.124.bug.14.probe-base-branch-never-bound.md](./task.124.bug.14.probe-base-branch-never-bound.md). P2.

### LOW Severity Issues (0)
None.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 0

---

## NFR Assessment

### Performance — PASS
Unchanged; the Cost sentence now matches the shipped probe.
### Reliability — CONCERNS
Two medium defects in executed prose: a develop-bug loop-limit resume is told two different things by its SKILL.md and the shared docs it bundles; the probe's base defaults to develop for every pipeline, and the wrong outcome is a discard.
### Security — PASS
- **Status**: PASS · **Evidence**: reasoned · **Probes executed**: 0 — no boundary in the cycle-4 delta; no corpus sink fits a Markdown contract (`boundary: true` on the probe; unchanged decision from cycle 1).
### Maintainability — PASS
Single-definition mechanisms and tests unchanged; the residue is prose consistency across bundled copies — the enumeration class, again.

---

## Code Review

Cycle 5, narrowed — `code_review_blocking=true`.

**Correctness bugs (2):**
- [medium/high] `shared/resources/develop-pipeline-resume-contract.md:61` — exception stated for all three pipelines while develop-bug says it has none → scope it in the sentence that states it, in both shared sources. **CR-1, promoted.**
- [medium/high after verification] `shared/resources/develop-pipeline-resume-contract.md:104` — `${BASE_BRANCH:-develop}` never bound → derive from `pr_url` (`gh pr view --json baseRefName`) or a recorded lock field. **CR-2, promoted.**

**Cleanups (0).**

**Provenance:** both this branch — the probe is Phase 1 of this task; the exception sentence is cycle 3's. **Boundary rule:** unchanged (`boundary: true`, `probes_executed: 0`, `reasoned`). **Mutation proofs:** `not-run` — no test guards either prose fix; the cycle-4 fixes were verified by the greps that defined them.

---

## Regression Testing

| Area | Result | Evidence |
| --- | --- | --- |
| Fast gate on `e14f1b2c` | PASS | 3512 tests, 3511 pass, 1 skipped, 0 fail |
| `eval:develop-task` replay | PASS | 16/16 fixtures |
| Bundle freshness / prettier | PASS | 0 problems / clean |
| Step 4b (3 files, bash + zsh) | PASS | 5/5 runnable blocks exit 0 with a seeded tree |
| Phase 4 live | PASS | `--restore` rebuilt the lock at step 5 from a real PreCompact snapshot mid-cycle-4 |

---

## Test Artifacts

```bash
npm run ci:fast; npm run eval:develop-task                                  # rc 0 / rc 0
node shared/resources/qa-execute-snippets.mjs --file <f> --copy <seed> --json   # ×3, 0 findings
grep -rn 'BASE_BRANCH' shared/resources/ skills/*/SKILL.md                  # one reader, no writer
grep -n 'loop-limit|not-converging' shared/resources/develop-pipeline-resume-contract.md shared/resources/develop-pipeline-step-0-resolve-and-prepare.md
```

---

## Recommendations

### Immediate Actions (Blocking for a PASS)
1. CR-1 scope the exception to develop-task/develop-story in both shared sources. 2. CR-2 bind the probe base from recorded state.

### Short-term Actions (Non-Blocking)
Carried: cycle-1 CR-5, CR-7.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No high-severity finding; medium entries (rule 2) and reliability CONCERNS (rule 4). CR-1 is the cycle-4 fix's own residue in the sources it did not touch; CR-2 is an unbound variable the probe has carried since Phase 1 that four cycles of text review did not execute.
**Quality Score**: 85/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 and CR-2 fixed.

---

**QA Report**: co-located at `task.124.qa.5.pipeline-resume-lifecycle-hygiene.md`
**Gate File**: co-located at `task.124.gate.5.pipeline-resume-lifecycle-hygiene.yml`
**Next Steps**: budget exhausted at cycle 5 — the orchestrator's route classifier decides between a grant, 5c, or escalation; both fixes are one-paragraph/one-line.

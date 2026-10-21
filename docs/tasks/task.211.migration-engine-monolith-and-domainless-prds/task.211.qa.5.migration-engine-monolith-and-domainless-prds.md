# QA Report: Task 211 - Migration engine: monolith and domain-less PRDs

**Task**: [Link to task document](./task.211.migration-engine-monolith-and-domainless-prds.md)
**Gate File**: [task.211.gate.5.migration-engine-monolith-and-domainless-prds.yml](./task.211.gate.5.migration-engine-monolith-and-domainless-prds.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-21
**Testing Completed**: 2026-10-21
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 4 fixed its four findings, and each fix is held by a test that goes red when the fix is reverted. The `--name` check still engages under the path probe, with 20 cases and no escapes. The scoped review of the cycle-4 fix found two new defects, and both come from that fix:

- **CR-1, medium.** This is a regression: common template spellings before a path are skipped as absolute again.
- **CR-2, low.** A key regex backtracks on contrived input.

Cycles 3 to 5 have each narrowed the same occurrence classifier, and each fix produced the next finding.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| CR-1: extension case split between the loops | medium | ✅ FIXED | `isLiteralType`; row `QA-4 CR-1` (covered) |
| CR-2: spaced/quoted YAML keys missed | low | ✅ FIXED | `YAML_KEY`; row `QA-3 CR-4` (covered). New CR-2 is its cost |
| CR-3: quoted variable skipped as absolute | low | ✅ FIXED | `VARIABLE_BEFORE`; resolver row (covered). New CR-1 is what it no longer recognises |
| CR-4: `$HOME` refused as stale | low | ✅ FIXED | `NON_REPO_VARIABLE`; resolver row (covered) |

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (12/12 checkboxes)
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#712, OPEN)

### Testing Approach

- [x] Automated Testing (unit, eval)
- [x] Regression Testing
- [x] Security Review (measured)
- [x] Code Review (one Explore reviewer, scoped)

### Review Methodology

This was a re-review, using direct tools and one read-only diff reviewer.

- **Scope.** This is cycle 5, so the review covered only the files changed since gate 4's head: 9 files, `3e6f00cb..HEAD`. The fix commit alone is 746 patch lines.
- **Reviewer timing.** The reviewer was dispatched at 01:57Z (`date -u`) and took 195150 ms, read from the `duration_ms` in its completion notice.
- **Reproduction.** QA reproduced both findings at HEAD: `outsideReferences` returns nothing for all four spellings, and `frontmatterState` takes 2148 ms on 40k spaces.
- **Mutation proofs.** These ran in a scratch worktree.

Re-review scope: scoped — files changed since 3e6f00cba44198f7092dbd75555c6a6dbf4a65ad (safety re-probe not triggered: gate 4 security PASS)

**Step 4b.** `qa-execute-snippets.mjs` ran over `skills/review-prd/SKILL.md`.

- Both changed blocks are `mutating`, so none was executed (`changed-blocks-not-executed`). The eval rows gate-8 and gate-9/10 run both blocks.
- The one `execution-failure` is an unchanged `git log` block, now at line 745. It fails because the harness runs in a temporary copy that is not a git repository, as it did in cycles 1–4.

---

## New Findings This Cycle

- **[medium]** `shared/resources/migrate-doc-numbering.mjs:1091`: `VARIABLE_BEFORE` now decides every path that follows `}` or `)`. Paths after `f"{ROOT}/…"`, `"#{ROOT}/…"`, a nested `$(…)` or `${ROOT:-${PWD}}` are skipped as absolute. At `3e6f00cb` all of these were blocked, so this is a regression. (CR-1)
- **[low]** `shared/resources/migrate-doc-numbering.mjs:888`: `YAML_KEY` backtracks quadratically on a long run of blanks. (CR-2)

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Frontmatter | CONCERNS | Verified | Real blocks in every YAML key spelling refused; key regex cost (CR-2) |
| Phase 2: Outside links | CONCERNS | Verified | Template-rooted paths missed again (CR-1) |
| Phase 3: Domain | PASS | Verified | Unchanged since cycle 3 |

**Overall Phase Completion**: all 3 phases delivered; phases 1 and 2 each have an open finding.

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| A PRD with no frontmatter migrates and the check comes back clean. A fence that never closes blocks the run, and nothing moves | engine rows `phase 1`, `QA-1 CR-1`, `QA-2 CR-5`, `QA-3 CR-4`; eval gate-8 | PASS |
| README `[PRD](docs/prd.md)` and `docs/` `[PRD](prd.md)` re-pointed | engine `phase 2` row; eval gate-8 and gate-9/10 | PASS |
| A domain-less PRD blocks with `needs-domain`. A `<domain>/<slug>` name places it under that domain | engine `phase 3` and `QA-2 CR-2` rows | PASS |
| `migration-guard.mjs` refuses nothing, or no longer exists | deleted | PASS |
| Performance: the prefilter reads extra files only when they name a move source | `phase 2 (performance)` row | CONCERNS (CR-2) |
| `ci:fast` and `eval:all` pass with `.agents/skills` moved aside, and `bundle:check` is clean | qa-fix run: 6102 tests, 0 fail; eval:all 0; bundle:check 0 problems | PASS |
| `validate -- skills/review-prd/` | ok | PASS |
| Every new row is mutation-proven | 7 qa-fix mutations, all re-run here | PASS |

---

## Breaking Changes Validation

Unchanged from cycle 4.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

CR-1, above. It reproduces on HEAD and is a regression from `3e6f00cb`.

### LOW Severity Issues (1)

CR-2, above.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1

No bug report files were created. Under the develop pipeline, each finding goes to `/qa-fix` through the gate's `top_issues[]`.

---

## NFR Assessment

### Performance — CONCERNS
`YAML_KEY` is quadratic on a long run of blanks (CR-2).

### Reliability — CONCERNS
CR-1 answers `ok` even though a reference written in a common template spelling is left stale.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 20 (`totals.executed` in `task.211.qa.5.security.run.json`), escaped 0
- `boundary: true`. The probe ran `parseNameValue` with `--sink path`, and the verdict was `engages`.

### Maintainability — CONCERNS
Both scan loops now use one extension helper and one predicate. The occurrence classifier has been narrowed in three cycles running, and each fix opened the next gap.

---

## Code Review

Blocking resolved `true` (pipeline run-level override; no frontmatter opt-out).

**Correctness bugs (2):**
- [medium/high] `shared/resources/migrate-doc-numbering.mjs:1091`: a path after an unknown template is read as absolute → promoted as CR-1
- [low/high] `shared/resources/migrate-doc-numbering.mjs:888`: `YAML_KEY` backtracking → promoted as CR-2

**Cleanups (0).**

boundary: true · probes_executed: 20 · escaped: 0

mutation-proven: loop 2 lower-cases the extension → `task.211 QA-4 CR-1: a file whose extension differs only in case…` → covered
mutation-proven: `YAML_KEY` bare word keys only → `task.211 QA-3 CR-4: a late fence is displaced only when it closes over YAML…` → covered
mutation-proven: quote before `/` not allowed → `task.211 QA-2 CR-3 CR-4: outsideReferences flags each token…` → covered
mutation-proven: `NON_REPO_VARIABLE` check removed → `task.211 QA-2 CR-3 CR-4` → covered
mutation-proven: lookback unbounded → `task.211 QA-2 CR-3: outsideReferences stays linear…` → covered

---

## Regression Testing

| Area | Result |
| --- | --- |
| Earlier engine rows (task.203/204, task.211 cycles 1–4) | PASS |
| Eval PRD-skill rows | PASS |
| Full `ci:fast` | PASS (qa-fix run, 6102 tests) |
| PR CI | 4 SUCCESS, 1 pending @ ca1c5bf5 |
| Cases at `3e6f00cb` | The CR-1 spellings were blocked there and now pass, so this is a regression, fixed in cycle 5 |

---

## Test Artifacts

### Files Reviewed
`shared/resources/migrate-doc-numbering.mjs`, `shared/resources/tests/migrate-doc-numbering.test.mjs`, `skills/review-prd/SKILL.md`.

### Test Commands Executed
```bash
command node --test shared/resources/tests/migrate-doc-numbering.test.mjs   # 67/67
command node .agents/skills/qa-task/references/security-probe.mjs --sink path --entry 'shared/resources/migrate-doc-numbering.mjs#parseNameValue' --cases-file <task-dir>/task.211.qa-fix.1.security.cases.json --record <task-dir>/task.211.qa.5.security.run.json --json   # engages, 20
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/review-prd/SKILL.md --diff-base "$(git merge-base origin/develop HEAD)" --copy-as skills:.agents/skills --json
```

### Coverage Report
Not measured. The repository runs `node --test` without coverage.

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix CR-1 in qa-fix cycle 5, with a mutation-proven row. Fix CR-2 with it.
2. Choose the model for the occurrence classifier: a closed list of reference shapes, or a refusal for any path whose basename matches a moved source unless the path is provably elsewhere.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No finding is high. One medium regression reproduces and is still open, and it reports success while leaving a stale reference.
**Quality Score**: 85/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 fixed and re-reviewed.

---

**QA Report**: co-located at `task.211.qa.5.migration-engine-monolith-and-domainless-prds.md`
**Gate File**: co-located at `task.211.gate.5.migration-engine-monolith-and-domainless-prds.yml`
**Next Steps**: `/qa-fix` cycle 5. The budget is then spent, so Loop Escalation's gate-the-last-fix check decides what happens next.

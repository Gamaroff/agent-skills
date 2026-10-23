# QA Report: Task 211 - Migration engine: monolith and domain-less PRDs

**Task**: [Link to task document](./task.211.migration-engine-monolith-and-domainless-prds.md)
**Gate File**: [task.211.gate.6.migration-engine-monolith-and-domainless-prds.yml](./task.211.gate.6.migration-engine-monolith-and-domainless-prds.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-21
**Testing Completed**: 2026-10-21
**Gate Status**: PASS

---

## Executive Summary

This is the cycle the operator granted after the loop limit, to gate the cycle-5 fix (`bce90253`). Cycle 5 fixed both gate-5 findings. For each fix, reverting it turns a committed test red. The `--name` check still engages under the path probe, with 20 cases and no escapes.

The scoped review found two low findings and nothing at medium or high:

- **CR-1, low, promoted.** A root-relative path into a dot-directory is resolved only against the file's directory. It needs a PRD root inside a dot-directory, and the repository has none.
- **CR-2, low, medium confidence, advisory.** `editFrontmatter` writes above a displaced block when called directly. The CLI cannot reach this, because `planEdits` refuses such a file first.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| CR-1: a path after an unknown template is read as absolute | medium | ✅ FIXED | f-string, `#{}`, nested `$(…)` and `${ROOT:-${PWD}}` each flagged at HEAD; row `QA-2 CR-3 CR-4` (covered) |
| CR-2: `YAML_KEY` backtracks on a long blank run | low | ✅ FIXED | 0–1 ms on 10k–160k blanks; row `QA-5 CR-2` (covered) |

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

- **Scope.** This is cycle 6, so the review covered only the files changed since gate 5's head: 9 files, `ca1c5bf5..HEAD`. The patch is 2597 lines, because it holds the whole-branch diff of each of those files.
- **Reviewer timing.** The reviewer was dispatched at 02:50:56Z (`date -u`) and took 134169 ms, read from the `duration_ms` in its completion notice.
- **Anchors.** `finding-anchors.js` returned `ok` for both findings.
- **Reproduction.** QA reproduced both findings at HEAD. CR-1: `outsideReferences` returns `[]` for `.docs/prd.md` and for `${ROOT}/.docs/prd.md`. CR-2: `editFrontmatter("\n---\na: 1\n---\n", [{key, value, insert: true}])` writes the key above the block.
- **Mutation proofs.** These ran in a scratch worktree.

Re-review scope: files changed since gate 5 (head ca1c5bf5b955; 9 files) — default (safety re-probe not triggered: gate 5 security PASS)

**Step 4b.** `qa-execute-snippets.mjs` ran over `skills/review-prd/SKILL.md`, as in cycles 1–5. The file has not changed since gate 5.

- Both changed blocks are `mutating`, so none was executed (`changed-blocks-not-executed`). The eval rows gate-8 and gate-9/10 run both blocks.
- The one `execution-failure` is the unchanged `git log` block at line 745. It fails because the harness runs in a temporary copy that is not a git repository.

---

## New Findings This Cycle

- **[low]** `shared/resources/migrate-doc-numbering.mjs:1140`: `rest.startsWith(".")` sends a root-relative path into a dot-directory down the relative-only branch, so it is never compared at the repository root. This came in with `3e6f00cb` (cycle 3). (CR-1, promoted)
- **[low, medium confidence]** `shared/resources/migrate-doc-numbering.mjs:906`: `editFrontmatter` treats line 0 of a displaced document as the opening fence. Its docstring says it leaves such a block alone. Only a direct caller can reach this. (CR-2, advisory)

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Frontmatter | PASS | Verified | `YAML_KEY` linear; advisory CR-2 is a direct-call path the CLI does not take |
| Phase 2: Outside links | PASS | Verified | Template-rooted paths flagged again; CR-1 (low) for dot-directory roots |
| Phase 3: Domain | PASS | Verified | Unchanged since cycle 3 |

**Overall Phase Completion**: 3/3 phases passed.

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| A PRD with no frontmatter migrates and the check comes back clean. A fence that never closes blocks the run, and nothing moves | engine rows `phase 1`, `QA-1 CR-1`, `QA-2 CR-5`, `QA-3 CR-4`; eval gate-8 | PASS |
| README `[PRD](docs/prd.md)` and `docs/` `[PRD](prd.md)` re-pointed | engine `phase 2` row; eval gate-8 and gate-9/10 | PASS |
| A domain-less PRD blocks with `needs-domain`. A `<domain>/<slug>` name places it under that domain | engine `phase 3` and `QA-2 CR-2` rows | PASS |
| `migration-guard.mjs` refuses nothing, or no longer exists | deleted | PASS |
| Performance: the prefilter reads extra files only when they name a move source | `phase 2 (performance)` row; both linearity rows | PASS |
| `ci:fast` and `eval:all` pass with `.agents/skills` moved aside, and `bundle:check` is clean | qa-fix cycle 5 run at `bce90253`: 6103 tests, 0 fail; eval:all 0. This cycle: engine file 68/68, bundle:check 0 problems, PR CI 5/5 SUCCESS | PASS |
| `validate -- skills/review-prd/` | ok (this cycle) | PASS |
| Every new row is mutation-proven | both cycle-5 fixes re-proven here | PASS |

---

## Breaking Changes Validation

Unchanged from cycle 5.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (2)

CR-1 and CR-2, above. CR-1 is in `top_issues[]`. CR-2 is advisory, because its confidence is medium.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 2

No bug report files were created.

---

## NFR Assessment

### Performance — PASS
`frontmatterState` takes 0–1 ms on 10k–160k blanks before a fence (measured). Both linearity rows hold.

### Reliability — PASS
Every gate-5 template spelling is flagged again. CR-1 misses a reference only when the PRD root sits inside a dot-directory. The default root is `docs/prd`. A search of the repository's configs, templates, scripts and tests for a dot-prefixed PRD root found 0 hits.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 20 (`totals.executed` in `task.211.qa.6.security.run.json`), escaped 0
- `boundary: true`. The probe ran `parseNameValue` with `--sink path`, and the verdict was `engages`.

### Maintainability — PASS
The cycle-5 fix restores the cycle-3 rule rather than adding another shape. CR-1 is a disagreement between the docstring and the code on one condition.

---

## Code Review

Blocking resolved `true` (pipeline run-level override; no frontmatter opt-out).

**Correctness bugs (2):**
- [low/high] `shared/resources/migrate-doc-numbering.mjs:1140`: a dot-directory root-relative path is resolved relative-only → promoted as CR-1
- [low/medium] `shared/resources/migrate-doc-numbering.mjs:906`: `editFrontmatter` edits above a displaced block on a direct call → advisory

**Cleanups (0).**

boundary: true · probes_executed: 20 · escaped: 0

mutation-proven: `}`/`)` handled by the lookback again (cycle-4 rule) → `task.211 QA-2 CR-3 CR-4: outsideReferences flags each token that resolves to a source…` → covered
mutation-proven: `YAML_KEY` restored to the cycle-4 lazy form → `task.211 QA-5 CR-2: frontmatterState stays linear on a long blank line` → covered

---

## Regression Testing

| Area | Result |
| --- | --- |
| Earlier engine rows (task.203/204, task.211 cycles 1–5) | PASS (68/68) |
| Eval PRD-skill rows | PASS (qa-fix cycle 5 run) |
| Full `ci:fast` | PASS (qa-fix cycle 5 run, 6103 tests) |
| PR CI | 5 SUCCESS |

---

## Test Artifacts

### Files Reviewed
`shared/resources/migrate-doc-numbering.mjs`, `shared/resources/tests/migrate-doc-numbering.test.mjs`, `skills/review-prd/references/migrate-doc-numbering.mjs`.

### Test Commands Executed
```bash
command node --test shared/resources/tests/migrate-doc-numbering.test.mjs   # 68/68
command node .agents/skills/qa-task/references/security-probe.mjs --sink path --entry 'shared/resources/migrate-doc-numbering.mjs#parseNameValue' --cases-file <task-dir>/task.211.qa-fix.1.security.cases.json --record <task-dir>/task.211.qa.6.security.run.json --json   # engages, 20
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/review-prd/SKILL.md --diff-base "$(git merge-base origin/develop HEAD)" --copy-as skills:.agents/skills --json
npm run validate -- skills/review-prd/   # ok
npm run bundle:check                     # 0 problems
```

### Coverage Report
Not measured. The repository runs `node --test` without coverage.

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. CR-1: limit the relative-only branch to `./` and `../` tokens, and add a dot-directory row.
2. CR-2: have `editFrontmatter` return the text unchanged unless the block is `closed`.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: No finding is high or medium. Both gate-5 findings are fixed and mutation-proven. The one open entry is low, and it needs a PRD root layout the repository does not use.
**Quality Score**: 95/100. The NFR formula gives 100; 5 points are taken off for the open LOW entry.

**Deployment Recommendation**: APPROVED
**Conditions**: None.

---

**QA Report**: co-located at `task.211.qa.6.migration-engine-monolith-and-domainless-prds.md`
**Gate File**: co-located at `task.211.gate.6.migration-engine-monolith-and-domainless-prds.yml`
**Next Steps**: The loop's route classifier took the cosmetic-residue exit (route 2b). CR-1 is carried to the gate's `recommendations.future`, and the run hands to Step 5c (PR conformance review).

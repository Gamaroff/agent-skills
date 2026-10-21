# QA Report: Task 211 - Migration engine: monolith and domain-less PRDs

**Task**: [Link to task document](./task.211.migration-engine-monolith-and-domainless-prds.md)
**Gate File**: [task.211.gate.4.migration-engine-monolith-and-domainless-prds.yml](./task.211.gate.4.migration-engine-monolith-and-domainless-prds.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-21
**Testing Completed**: 2026-10-21
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 3's five findings are fixed. Each fix is held by a test that goes red when the fix is
reverted. The `--name` check still engages under the path probe: 20 cases, no escapes. The scoped
review of the cycle-3 fix found four new defects. One is medium. Two of the four are regressions
that the cycle-3 fix introduced (CR-1, CR-2), and QA confirmed both against `02d65ff4`.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| CR-1: variable-rooted path skipped as absolute | medium | ⚠️ PARTIAL | `$VAR/`, `${VAR}/` and `$(…)/` flagged; resolver row (covered). New CR-3 is the quoted form, and new CR-4 is a false positive |
| CR-2: in-tree non-literal file read by neither loop | medium | ⚠️ PARTIAL | row `QA-3 CR-2 CR-3 CR-5` (covered). New CR-1 is an extension-case split between the loops |
| CR-3: example copies not exempt | low | ✅ FIXED | `scansForStale`; same row (covered) |
| CR-4: two thematic breaks read as displaced | low | ⚠️ PARTIAL | row `QA-3 CR-4` (covered). New CR-2 is the real blocks the YAML rule now misses |
| CR-5: binaries read in full | low | ✅ FIXED | `BINARY_EXTS`; same row (covered) |

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

This is a re-review, so the work used direct tools plus one read-only diff reviewer. This is cycle 4,
so the review was **scoped to the files changed since gate 3's head** (`02d65ff4..HEAD`: 10 files;
the branch diff over them is 2372 patch lines, and the fix commit alone is 888). The reviewer was
dispatched at 01:47Z (`date -u`) and took 180005 ms, read from its completion notice's
`duration_ms`. QA reproduced all four findings in memory at HEAD and ran the same cases against
`02d65ff4` to separate regressions from older gaps. The mutation proofs ran in a scratch worktree.

Re-review scope: scoped — files changed since 02d65ff4b9172ee1120e2edf6785032ed45b3bf8 (safety re-probe not triggered: gate 3 security PASS)

Step 4b: `qa-execute-snippets.mjs` over `skills/review-prd/SKILL.md`. Of the 2 changed blocks, both
are `mutating` and 0 executed (`changed-blocks-not-executed`). The eval rows gate-8 and gate-9/10
run both blocks. The one `execution-failure`, an unchanged `git log` block (now at line 744), fails in
the harness's non-git temp copy, as it did in cycles 1–3.

---

## New Findings This Cycle

- **[medium]** `shared/resources/migrate-doc-numbering.mjs:1417`: the non-literal loop lower-cases the
  extension and the literal loop does not, so `README.MD` and `ci.YML` are read by neither. Both were
  flagged at `02d65ff4`, so this is a regression. (CR-1)
- **[low]** `shared/resources/migrate-doc-numbering.mjs:876`: `YAML_KEY` rejects spaced and quoted
  keys, so a real displaced block gets a second block stacked over it. This is a regression. (CR-2)
- **[low]** `shared/resources/migrate-doc-numbering.mjs:1110`: `"$ROOT"/docs/prd.md` is skipped as
  absolute. (CR-3)
- **[low]** `shared/resources/migrate-doc-numbering.mjs:1108`: `$HOME/docs/prd.md` is refused as
  stale, which is a false positive. (CR-4)

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Frontmatter | CONCERNS | Verified | Two-break bodies migrate; spaced/quoted-key blocks now missed (CR-2) |
| Phase 2: Outside links | CONCERNS | Verified | One predicate for both loops; extension case split (CR-1), quoted and `$HOME` variables (CR-3, CR-4) |
| Phase 3: Domain | PASS | Verified | Unchanged since cycle 3 |

**Overall Phase Completion**: 3/3 delivered; two carry an open finding.

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| A frontmatter-less PRD migrates and the check is clean; an unclosed fence blocks and nothing moves | engine rows `phase 1`, `QA-1 CR-1`, `QA-2 CR-5`, `QA-3 CR-4`; eval gate-8 | CONCERNS (CR-2) |
| README `[PRD](docs/prd.md)` and `docs/` `[PRD](prd.md)` re-pointed | engine `phase 2` row; eval gate-8 and gate-9/10 | PASS |
| A domain-less PRD blocks `needs-domain`; `<domain>/<slug>` lands under the domain | engine `phase 3` and `QA-2 CR-2` rows | PASS |
| `migration-guard.mjs` refuses nothing, or no longer exists | deleted | PASS |
| Performance: the prefilter adds reads only for files naming a move source | `phase 2 (performance)` row; binary types never read | PASS |
| `ci:fast` and `eval:all` with `.agents/skills` aside; `bundle:check` clean | qa-fix run: 6101 tests, 0 fail; eval:all 0; bundle:check 0 problems | PASS |
| `validate -- skills/review-prd/` | ok | PASS |
| Every new row is mutation-proven | 9 qa-fix mutations, plus 4 re-run here | PASS |

---

## Breaking Changes Validation

Unchanged from cycle 3. The new scan coverage and the YAML rule for `displaced-frontmatter` are
described in `CHANGELOG.md`, in the engine header and in the review-prd plan prose.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

CR-1, listed above. Reproduced on HEAD, and it is a regression from `02d65ff4`.

### LOW Severity Issues (3)

CR-2, CR-3 and CR-4, listed above.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 3

No bug report files. Under the develop pipeline each finding goes to `/qa-fix` through the gate's
`top_issues[]`.

---

## NFR Assessment

### Performance — PASS
Known binary types are never read, and the linearity row still holds.

### Reliability — CONCERNS
CR-1 and CR-3 answer `ok` over a stale reference. CR-2 stacks a second block, and CR-4 refuses a
correct path.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 20 (`totals.executed` in `task.211.qa.4.security.run.json`), escaped 0
- `boundary: true`. `parseNameValue` was probed with `--sink path` and verdict `engages`.

### Maintainability — PASS
One predicate decides which files the stale scan judges. The extension test is still split between
the two loops (CR-1).

---

## Code Review

Blocking resolved `true` (pipeline run-level override; no frontmatter opt-out).

**Correctness bugs (4):**
- [medium/high] `shared/resources/migrate-doc-numbering.mjs:1417`: extension case split between
  the loops → promoted as CR-1
- [low/high] `shared/resources/migrate-doc-numbering.mjs:876`: spaced/quoted YAML keys not accepted
  → promoted as CR-2
- [low/high] `shared/resources/migrate-doc-numbering.mjs:1110`: quoted variable skipped as absolute
  → promoted as CR-3
- [low/medium] `shared/resources/migrate-doc-numbering.mjs:1108`: `$HOME` read as the repository
  → promoted as CR-4

**Cleanups (0).**

All four anchors are on the reviewed lines at HEAD.

boundary: true · probes_executed: 20 · escaped: 0

mutation-proven: variable-rooted `/` skipped as absolute → `task.211 QA-2 CR-3 CR-4: outsideReferences flags each token…` → covered
mutation-proven: `candidates` guard restored → `task.211 QA-3 CR-2 CR-3 CR-5: the scan reads every in-scope non-literal file once…` → covered
mutation-proven: example copies not exempt → `task.211 QA-3 CR-2 CR-3 CR-5` → covered
mutation-proven: `displaced` on any closing fence → `task.211 QA-3 CR-4: a late fence is displaced only when it closes over YAML…` → covered

---

## Regression Testing

| Area | Result |
| --- | --- |
| Earlier engine rows (task.203/204, task.211 cycles 1–3) | PASS |
| Eval PRD-skill rows | PASS |
| Full `ci:fast` | PASS (qa-fix run, 6101 tests) |
| PR CI | 4 SUCCESS, 1 pending @ 3e6f00cb |
| Cases at `02d65ff4` | CR-1 and CR-2 were caught there and pass now: regressions, fixed in cycle 4 |

---

## Test Artifacts

### Files Reviewed
`shared/resources/migrate-doc-numbering.mjs`, `shared/resources/tests/migrate-doc-numbering.test.mjs`,
`skills/review-prd/SKILL.md`, `CHANGELOG.md`.

### Test Commands Executed
```bash
command node --test shared/resources/tests/migrate-doc-numbering.test.mjs   # 66/66
command node .agents/skills/qa-task/references/security-probe.mjs --sink path --entry 'shared/resources/migrate-doc-numbering.mjs#parseNameValue' --cases-file <task-dir>/task.211.qa-fix.1.security.cases.json --record <task-dir>/task.211.qa.4.security.run.json --json   # engages, 20
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/review-prd/SKILL.md --diff-base "$(git merge-base origin/develop HEAD)" --copy-as skills:.agents/skills --json
```

### Coverage Report
Not measured (the repository runs `node --test` without coverage).

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix CR-1 in qa-fix cycle 4 with a mutation-proven row. CR-2, CR-3 and CR-4 go with it.
2. CR-1 is the loop split again. Derive both loops' extension test from one helper.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: There are no high findings. One reproduced medium regression remains, and it reports
success over a stale reference.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 fixed and re-reviewed.

---

**QA Report**: co-located at `task.211.qa.4.migration-engine-monolith-and-domainless-prds.md`
**Gate File**: co-located at `task.211.gate.4.migration-engine-monolith-and-domainless-prds.yml`
**Next Steps**: `/qa-fix` cycle 4, then QA cycle 5.

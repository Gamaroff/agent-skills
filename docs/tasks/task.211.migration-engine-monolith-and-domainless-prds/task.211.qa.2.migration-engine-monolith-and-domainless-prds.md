# QA Report: Task 211 - Migration engine: monolith and domain-less PRDs

**Task**: [Link to task document](./task.211.migration-engine-monolith-and-domainless-prds.md)
**Gate File**: [task.211.gate.2.migration-engine-monolith-and-domainless-prds.yml](./task.211.gate.2.migration-engine-monolith-and-domainless-prds.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-21
**Testing Completed**: 2026-10-21
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 1's four findings are fixed, and each fix is held by a test that goes red when the fix is
reverted. The `--name` containment check now engages under the path probe: 20 cases, no escapes.
The cycle-2 refute pass then found five new defects, all inside cycle 1's fixes. Three are medium.
Three of the five sit in the new stale-reference matcher.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| CR-1: a BOM or a leading blank line gets a second frontmatter block | medium | ✅ FIXED | `displaced-frontmatter` blocker; row `task.211 QA-1 CR-1` (covered). New finding CR-5 is a neighbouring shape |
| QA-1: a relative non-link mention stays stale | medium | ⚠️ PARTIAL | `stale-reference` covers `.md`/`.js`-class files. CR-1, CR-3 and CR-4 below are gaps and false positives in the same scan |
| QA-2: the `--name` boundary has no probeable entry | medium | ✅ FIXED | exported `parseNameValue`; probe `engages`, 20 executed, 0 escaped |
| CR-3: a named domain moves a numbered PRD | low | ✅ FIXED | `bad-slug` blocker; row `task.211 CR-3` (covered). New finding CR-2 is the case it left behind |

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
- [x] Code Review (one Explore reviewer, refute pass)

### Review Methodology

This is a re-review, so the work used direct tools plus one read-only diff reviewer. This is cycle 2,
so the review was a **refute pass over the whole branch diff** (`origin/develop...HEAD`: 13 files,
2589 patch lines). The reviewer was dispatched at 01:00Z (`date -u`) and took 266090 ms, read from
its completion notice's `duration_ms`. QA reproduced all five reviewer findings in memory against
the engine at HEAD before grading them. The four mutation proofs ran in a scratch worktree so the
reviewer's tree was never touched.

Re-review scope: unscoped — cycle 2 refute pass (whole branch diff)

Step 4b: `qa-execute-snippets.mjs` over `skills/review-prd/SKILL.md`. Of the 2 changed blocks, both
are `mutating` and 0 executed (`changed-blocks-not-executed`). The eval rows gate-8 and gate-9/10
run both blocks. The one `execution-failure`, an unchanged `git log` block at line 738, fails in the
harness's non-git temp copy, and it fails the same way on base, as it did in cycle 1.

---

## New Findings This Cycle

- **[medium]** `shared/resources/migrate-doc-numbering.mjs:1300`: the stale-reference scan covers
  only the literal-pass extensions. A `package.json` or `.sh` that names `docs/prd.md` is left
  stale, and `--apply` answers `ok`. Fix: scan every in-scope text file, or narrow the claim. (CR-1)
- **[medium]** `shared/resources/migrate-doc-numbering.mjs:561`: a numbered L2 PRD at
  `docs/prd/prd.1.x.md` moves to a root-level `prd.1.x/` that create-prd refuses, and `--apply`
  answers `ok`. Passing a domain is refused by the cycle-1 CR-3 blocker. Fix: decide by whether the
  PRD moves, not by `legacy`. (CR-2)
- **[medium]** `shared/resources/migrate-doc-numbering.mjs:1303`: the substring match blocks correct
  references, such as `apps/web/docs/prd.md`, or `../../../prd.md` (which contains `../../prd.md`).
  Fix: add a path boundary and resolve relative occurrences. (CR-3)
- **[low]** `shared/resources/migrate-doc-numbering.mjs:1302`: a `./prd.md` reference is never
  flagged and goes stale. Fix: test the `./` form too. (CR-4)
- **[low]** `shared/resources/migrate-doc-numbering.mjs:835`: a blank line followed by a thematic
  break reads as `displaced`, and following the advice turns it into `unclosed-frontmatter`. Fix:
  report `displaced` only when the late fence closes. (CR-5)

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Frontmatter | CONCERNS | Verified | BOM and blank-line blocks are now refused; a thematic break is misread (CR-5) |
| Phase 2: Outside links | CONCERNS | Verified | Links re-pointed; residual scan has gaps and false positives (CR-1, CR-3, CR-4) |
| Phase 3: Domain | CONCERNS | Verified | `parseNameValue` probed clean; numbered root PRD still misplaced (CR-2) |

**Overall Phase Completion**: 3/3 delivered, each with an open finding.

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| A frontmatter-less PRD migrates and the check is clean; an unclosed fence blocks and nothing moves | engine rows `task.211 phase 1` ×3 and `QA-1 CR-1` ×2; eval gate-8 | PASS |
| README `[PRD](docs/prd.md)` and `docs/` `[PRD](prd.md)` re-pointed | engine `task.211 phase 2` row; eval gate-8 and gate-9/10 | PASS |
| A domain-less PRD blocks `needs-domain`; `<domain>/<slug>` lands under the domain | engine `task.211 phase 3` rows; eval gate-8 | CONCERNS (CR-2: a numbered root PRD is not covered) |
| `migration-guard.mjs` refuses nothing, or no longer exists | deleted; `git grep migration-guard` finds only history | PASS |
| Performance: the prefilter adds reads only for files naming a move source | engine row `task.211 phase 2 (performance)` | PASS |
| `ci:fast` and `eval:all` with `.agents/skills` aside; `bundle:check` clean | qa-fix run: 6094 tests, 0 fail; eval:all 0; bundle:check 0 problems; PR CI 5/5 SUCCESS @ 0379eb73 | PASS |
| `validate -- skills/review-prd/` | exit 0 | PASS |
| Every new row is mutation-proven | 9 qa-fix mutations, plus 4 re-run here (see Code Review) | PASS |

---

## Breaking Changes Validation

Unchanged from cycle 1: the bare `--name <root PRD>=<slug>` and the removed guard are documented,
each has a migration path, and consumer code is updated. The two new blockers are named in
`CHANGELOG.md` and the review-prd plan prose.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (3)

CR-1, CR-2 and CR-3 above, under **New Findings This Cycle**. Each was reproduced on HEAD. Each is
in code this branch added, so none is pre-existing.

### LOW Severity Issues (2)

CR-4 and CR-5 above.

**Total Issues**: HIGH: 0, MEDIUM: 3, LOW: 2

No bug report files: under the develop pipeline each finding goes to `/qa-fix` through the gate's
`top_issues[]`.

---

## NFR Assessment

### Performance — PASS
The residual scan loops only over outside move sources, and only in files already read.

### Reliability — CONCERNS
CR-1, CR-2 and CR-4 answer `ok` over a stale or wrongly placed result. CR-3 and CR-5 refuse valid
inputs and leave no way through.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 20 (`totals.executed` in `task.211.qa.2.security.run.json`), escaped 0
- `boundary: true`. The `--name` value becomes path segments. The probe ran `parseNameValue` with
  `--sink path` and `task.211.qa-fix.1.security.cases.json`, and the verdict was `engages`: 16 of 16
  hostile cases rejected, 4 of 4 legitimate cases accepted. qa-fix calibrated it on a mutant without
  the segment check, which came back `present-but-inert` with 10 cases escaped.

### Maintainability — PASS
There is one `--name` validator and one frontmatter-state function, and every place that lists the
blockers was updated together.

---

## Code Review

Blocking resolved `true` (pipeline run-level override; no frontmatter opt-out).

**Correctness bugs (5):**
- [medium/high] `shared/resources/migrate-doc-numbering.mjs:1300`: stale-reference scan skips
  non-literal file types → promoted as CR-1
- [medium/high] `shared/resources/migrate-doc-numbering.mjs:561`: a numbered root PRD moves outside
  a domain and cannot be named one → promoted as CR-2
- [medium/high] `shared/resources/migrate-doc-numbering.mjs:1303`: unbounded substring match blocks
  correct references → promoted as CR-3
- [low/high] `shared/resources/migrate-doc-numbering.mjs:1302`: `./prd.md` never flagged → promoted
  as CR-4
- [low/high] `shared/resources/migrate-doc-numbering.mjs:835`: a thematic break after a blank line
  reads as displaced → promoted as CR-5

**Cleanups (0).**

All five anchors checked `ok` with `finding-anchors.js`.

boundary: true · probes_executed: 20 · escaped: 0

mutation-proven: `displaced-frontmatter` blocker disabled → `task.211 QA-1 CR-1: a fence after a BOM…` → covered
mutation-proven: stale-reference scan disabled → `task.211 QA-1: a relative or embedded mention…` → covered
mutation-proven: numbered-PRD domain blocker disabled → `task.211 CR-3: a named domain for an already-numbered PRD…` → covered
mutation-proven: `parseArgs` bypasses `parseNameValue` → `task.211 QA-2: parseNameValue is the one --name check…` → covered

These four proofs were re-run in a scratch worktree, with the baseline green after each restore. The
qa-fix pass's other mutations are recorded in the implementation report.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Earlier engine rows (task.203/204) | PASS |
| Eval PRD-skill rows | PASS |
| Full `ci:fast` | PASS (qa-fix run, 6094 tests) |
| PR CI | 5/5 SUCCESS @ 0379eb73 |

---

## Test Artifacts

### Files Reviewed
`shared/resources/migrate-doc-numbering.mjs`, `shared/resources/tests/migrate-doc-numbering.test.mjs`,
`skills/review-prd/SKILL.md`, `CHANGELOG.md`.

### Test Commands Executed
```bash
command node --test shared/resources/tests/migrate-doc-numbering.test.mjs evals/shared/tests/prd-skill-numbering.test.mjs   # 100/100
command node .agents/skills/qa-task/references/security-probe.mjs --sink path --entry 'shared/resources/migrate-doc-numbering.mjs#parseNameValue' --cases-file <task-dir>/task.211.qa-fix.1.security.cases.json --record <task-dir>/task.211.qa.2.security.run.json --json   # engages, 20
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/review-prd/SKILL.md --diff-base "$(git merge-base origin/develop HEAD)" --copy-as skills:.agents/skills --json
command node .agents/skills/qa-task/references/finding-anchors.js --findings-file <findings.json> --root . --rev HEAD --json   # ok
```

### Coverage Report
Not measured (the repository runs `node --test` without coverage).

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix CR-1, CR-2 and CR-3 in qa-fix cycle 2, each with a mutation-proven row. CR-4 and CR-5 go
   with them.
2. Three findings sit in the stale-reference matcher that cycle 1 added. Consider the structural
   move before patching it again: make the scan an allow-list of path-reference shapes, with a path
   boundary.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: There are no high findings. Three reproduced medium defects remain in the cycle-1
fixes, and two of them report success over a wrong result.
**Quality Score**: 70/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1, CR-2 and CR-3 fixed and re-reviewed.

---

**QA Report**: co-located at `task.211.qa.2.migration-engine-monolith-and-domainless-prds.md`
**Gate File**: co-located at `task.211.gate.2.migration-engine-monolith-and-domainless-prds.yml`
**Next Steps**: `/qa-fix` cycle 2, then QA cycle 3.

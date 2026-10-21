# QA Report: Task 211 - Migration engine: monolith and domain-less PRDs

**Task**: [Link to task document](./task.211.migration-engine-monolith-and-domainless-prds.md)
**Gate File**: [task.211.gate.3.migration-engine-monolith-and-domainless-prds.yml](./task.211.gate.3.migration-engine-monolith-and-domainless-prds.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-21
**Testing Completed**: 2026-10-21
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2's five findings are fixed. Each fix is held by a test that goes red when the fix is
reverted. The `--name` check still engages under the path probe: 20 cases, no escapes. The scoped
review of the cycle-2 fix found five new defects. Two are medium, and both answer `ok` over a stale
reference. Four of the five sit in the stale-reference scan for the third cycle running.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| CR-1: the scan skips non-literal file types | medium | ⚠️ PARTIAL | non-literal loop; row `task.211 QA-2 CR-1` (covered). New CR-2 is the in-tree files it still misses |
| CR-2: a numbered root PRD lands outside a domain | medium | ✅ FIXED | `needs-domain` on any move to the root; row `task.211 QA-2 CR-2` (covered) |
| CR-3: substring match blocks correct references | medium | ✅ FIXED | `outsideReferences` resolves tokens; row `QA-2 CR-3 CR-4` (covered). New CR-1 is a form it drops |
| CR-4: `./prd.md` never flagged | low | ✅ FIXED | same row (covered) |
| CR-5: a thematic break reads as displaced | low | ⚠️ PARTIAL | closing-fence condition; row `QA-2 CR-5` (covered). New CR-4 is the two-break case |

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

This is a re-review, so the work used direct tools plus one read-only diff reviewer. This is cycle 3,
so the review was **scoped to the files changed since gate 2's head** (`0379eb73..HEAD`: 11 files;
the branch diff over them is 2207 patch lines, and the fix commit alone is 1011). The reviewer was
dispatched at 01:34Z (`date -u`) and took 232718 ms, read from its completion notice's
`duration_ms`. QA reproduced all four correctness findings in memory against the engine at HEAD, and
ran the same cases against `0379eb73` to tell regressions from older gaps. The mutation proofs ran in
a scratch worktree, so the reviewer's tree was never touched.

Re-review scope: scoped — files changed since 0379eb7399a46b804246829b5f832be0ab26ed20 (safety re-probe not triggered: gate 2 security PASS)

Step 4b: `qa-execute-snippets.mjs` over `skills/review-prd/SKILL.md`. Of the 2 changed blocks, both
are `mutating` and 0 executed (`changed-blocks-not-executed`). The eval rows gate-8 and gate-9/10
run both blocks. The one `execution-failure`, an unchanged `git log` block (now at line 742), fails in
the harness's non-git temp copy and fails the same way on base, as in cycles 1 and 2.

---

## New Findings This Cycle

- **[medium]** `shared/resources/migrate-doc-numbering.mjs:1068`: a token starting with `/` is
  skipped as absolute, so `${ROOT}/docs/prd.md` (`.mjs`) and `$ROOT/docs/prd.md` (`.sh`) are neither
  rewritten nor flagged. The `.mjs` case is a regression: at `0379eb73` it was blocked. (CR-1)
- **[medium]** `shared/resources/migrate-doc-numbering.mjs:1371`: the non-literal loop skips
  `candidates`, which also holds non-literal files under the PRD root that the main loop skips by
  extension. `docs/prd/tools/cfg.json` naming `docs/prd.md` is read by neither. (CR-2)
- **[low]** `shared/resources/migrate-doc-numbering.mjs:1369`: the non-literal loop does not exempt
  frozen example copies, so `examples/demo/package.json` blocks while `examples/demo/README.md`
  passes. (CR-3)
- **[low]** `shared/resources/migrate-doc-numbering.mjs:845`: a body with two thematic breaks after a
  leading blank line is still `displaced`. (CR-4)
- **[low]** `shared/resources/migrate-doc-numbering.mjs:1372`: binaries are read in full before the
  NUL check discards them. (CR-5)

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Frontmatter | CONCERNS | Verified | One-break case fixed; two-break case still displaced (CR-4) |
| Phase 2: Outside links | CONCERNS | Verified | Resolver correct for relative paths; variable-rooted paths and in-tree non-literal files missed (CR-1, CR-2) |
| Phase 3: Domain | PASS | Verified | Numbered root PRD now `needs-domain` with a hand-move remedy |

**Overall Phase Completion**: 3/3 delivered; two carry an open finding.

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| A frontmatter-less PRD migrates and the check is clean; an unclosed fence blocks and nothing moves | engine rows `task.211 phase 1`, `QA-1 CR-1`, `QA-2 CR-5`; eval gate-8 | CONCERNS (CR-4) |
| README `[PRD](docs/prd.md)` and `docs/` `[PRD](prd.md)` re-pointed | engine `task.211 phase 2` row; eval gate-8 and gate-9/10 | PASS |
| A domain-less PRD blocks `needs-domain`; `<domain>/<slug>` lands under the domain | engine `task.211 phase 3` and `QA-2 CR-2` rows; eval gate-8 | PASS |
| `migration-guard.mjs` refuses nothing, or no longer exists | deleted | PASS |
| Performance: the prefilter adds reads only for files naming a move source | engine row `task.211 phase 2 (performance)`; linearity row | CONCERNS (CR-5) |
| `ci:fast` and `eval:all` with `.agents/skills` aside; `bundle:check` clean | qa-fix run: 6099 tests, 0 fail; eval:all 0; bundle:check 0 problems; PR CI 5/5 SUCCESS @ 02d65ff4 | PASS |
| `validate -- skills/review-prd/` | ok | PASS |
| Every new row is mutation-proven | 11 qa-fix mutations, plus 4 re-run here | PASS |

---

## Breaking Changes Validation

The numbered-root `needs-domain` case and the wider `stale-reference` coverage are named in
`CHANGELOG.md`, the engine header and the review-prd plan prose, each with its hand remedy.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (2)

CR-1 and CR-2 above. Both were reproduced on HEAD and both are in code this branch added.

### LOW Severity Issues (3)

CR-3, CR-4 and CR-5 above.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 3

No bug report files: under the develop pipeline each finding goes to `/qa-fix` through the gate's
`top_issues[]`.

---

## NFR Assessment

### Performance — CONCERNS
`outsideReferences` is linear, and the linearity row is mutation-proven against both quadratic
shapes. The non-literal loop reads binaries in full before discarding them (CR-5).

### Reliability — CONCERNS
CR-1 and CR-2 answer `ok` over a stale reference. CR-3 and CR-4 refuse inputs that should pass.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 20 (`totals.executed` in `task.211.qa.3.security.run.json`), escaped 0
- `boundary: true`. The probe ran `parseNameValue` with `--sink path` and
  `task.211.qa-fix.1.security.cases.json`. The verdict was `engages`.

### Maintainability — PASS
One exported resolver replaces the substring test, and every place that restates the blockers was
updated together.

---

## Code Review

Blocking resolved `true` (pipeline run-level override; no frontmatter opt-out).

**Correctness bugs (4):**
- [medium/high] `shared/resources/migrate-doc-numbering.mjs:1068`: variable-rooted path skipped as
  absolute → promoted as CR-1
- [medium/high] `shared/resources/migrate-doc-numbering.mjs:1371`: in-tree non-literal file read by
  neither loop → promoted as CR-2
- [low/high] `shared/resources/migrate-doc-numbering.mjs:1369`: example copy not exempt in the
  non-literal loop → promoted as CR-3
- [low/medium] `shared/resources/migrate-doc-numbering.mjs:845`: two thematic breaks still displaced
  → promoted as CR-4

**Cleanups (1):**
- [low/medium] `shared/resources/migrate-doc-numbering.mjs:1372`: binaries read in full → promoted
  as CR-5

All five anchors checked `ok` with `finding-anchors.js`.

boundary: true · probes_executed: 20 · escaped: 0

mutation-proven: resolver matches by suffix → `task.211 QA-2 CR-3 CR-4: outsideReferences flags each token…` → covered
mutation-proven: non-literal loop disabled → `task.211 QA-2 CR-1: a non-literal file naming a moved outside source…` → covered
mutation-proven: `needs-domain` for legacy only → `task.211 QA-2 CR-2: a numbered PRD that would move directly under the root…` → covered
mutation-proven: `displaced` without a closing fence → `task.211 QA-2 CR-5: a blank line and a thematic break…` → covered

These four proofs were re-run in a scratch worktree, with the baseline green after each restore. The
qa-fix pass's other mutations are recorded in the implementation report.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Earlier engine rows (task.203/204, task.211 cycles 1-2) | PASS |
| Eval PRD-skill rows | PASS |
| Full `ci:fast` | PASS (qa-fix run, 6099 tests) |
| PR CI | 5/5 SUCCESS @ 02d65ff4 |
| Cases at `0379eb73` | CR-1 `.mjs` blocked there and passes now: regression, fixed in cycle 3 |

---

## Test Artifacts

### Files Reviewed
`shared/resources/migrate-doc-numbering.mjs`, `shared/resources/tests/migrate-doc-numbering.test.mjs`,
`skills/review-prd/SKILL.md`, `CHANGELOG.md`, `docs/contributing/traps.md`.

### Test Commands Executed
```bash
command node --test shared/resources/tests/migrate-doc-numbering.test.mjs   # 69/69
command node .agents/skills/qa-task/references/security-probe.mjs --sink path --entry 'shared/resources/migrate-doc-numbering.mjs#parseNameValue' --cases-file <task-dir>/task.211.qa-fix.1.security.cases.json --record <task-dir>/task.211.qa.3.security.run.json --json   # engages, 20
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/review-prd/SKILL.md --diff-base "$(git merge-base origin/develop HEAD)" --copy-as skills:.agents/skills --json
command node .agents/skills/qa-task/references/finding-anchors.js --findings-file <findings.json> --root . --rev HEAD --json   # ok
```

### Coverage Report
Not measured (the repository runs `node --test` without coverage).

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix CR-1 and CR-2 in qa-fix cycle 3, each with a mutation-proven row. CR-3, CR-4 and CR-5 go
   with them.
2. Four of the five findings are in the stale-reference scan for the third cycle running, and three
   come from the second loop restating the first loop's filters. Consider one file walk that decides
   scope, exemption and binary-ness once.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: There are no high findings. Two reproduced medium defects remain, and both report
success over a stale reference.
**Quality Score**: 75/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 and CR-2 fixed and re-reviewed.

---

**QA Report**: co-located at `task.211.qa.3.migration-engine-monolith-and-domainless-prds.md`
**Gate File**: co-located at `task.211.gate.3.migration-engine-monolith-and-domainless-prds.yml`
**Next Steps**: `/qa-fix` cycle 3, then QA cycle 4.

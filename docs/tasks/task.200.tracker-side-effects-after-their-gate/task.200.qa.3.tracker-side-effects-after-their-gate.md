# QA Report: Task 200 - Tracker side effects after their gate (cycle 3)

**Task**: [Link to task document](./task.200.tracker-side-effects-after-their-gate.md)
**Gate File**: [task.200.gate.3.tracker-side-effects-after-their-gate.yml](./task.200.gate.3.tracker-side-effects-after-their-gate.yml)
**Previous Report**: [task.200.qa.2.tracker-side-effects-after-their-gate.md](./task.200.qa.2.tracker-side-effects-after-their-gate.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-20
**Testing Completed**: 2026-10-20
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2's fixes for TASK-200-004 to 008 hold. Each was proved by qa-fix's mutants, and again by QA with different mutants in a scratch worktree. The fast gate passes 6067/0. The review found no high-confidence defect. It raised two medium-confidence gaps in the guards, both reproduced, neither with a live instance. Those make maintainability CONCERNS, with nothing open.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (5c review and finalise DoD)

---

## Re-Review Context

| Previous finding | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-200-004: create-epic links the checked-out branch | medium | ✅ FIXED | Closed with 005 and 008 below |
| TASK-200-005: create-epic PRD-link block reads an unbound path | high | ✅ FIXED | QA mutant moved the binding after the call: the execute test goes red. `bash -n` passes on the block |
| TASK-200-006: sync-github-story drops the pin | medium | ✅ FIXED | QA mutant `--explicit ""`: the pin test goes red |
| TASK-200-007: a sibling bug's branch names the wrong work item | medium | ✅ FIXED | Six new rows red under qa-fix's revert. QA's `return !bug` mutant stays green (no-red-dead, see Code Review) |
| TASK-200-008: link scan misses a reassignment | medium | ✅ FIXED | QA mutant `every`→`some`: the control test goes red |

Bug reports: BUG-4 to BUG-8 → Closed (all eight bugs are now Closed).

---

## New Findings This Cycle

None that gate. Two medium-confidence review findings (advisory under the gate mapping), both reproduced with no live instance:

- **[medium/medium]** `tests/doc-link-branch-population.test.js:129`: `LINK_RE` misses `blob/${V:-…}/`. Reproduced: `blob/${DOC_BRANCH:-$DEFAULT_BRANCH}/` matches nothing, and `blob/${B}/` matches `B`. Corpus: 0 such links in the scanned population.
- **[medium/medium]** `tests/doc-link-branch-sites-execute.test.js:72`: any `V=` line counts as a binding, so `DOC_BRANCH_PIN="${DOC_BRANCH:-}"` would pass. Corpus: no site binds that way.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed
- [x] Tests passing (fast gate 6067/0 at `aca41591`)
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#711, OPEN, MERGEABLE)

### Review Methodology

Re-review, direct tools plus one Explore code reviewer.

```
Re-review scope: files changed since gate 2 (head fe0121c0e224; 8 files) — default
```

The 17 bundled `references/doc-link-branch.js` copies were left out of the 8: `bundle:check` holds them byte-equal to `shared/resources/doc-link-branch.js`, which is in scope. `SAFETY_REPROBE=false` (clause 1 printed false; gate 2 security PASS). Reviewer: dispatched 19:17:12Z, returned 19:20:00Z (`duration_ms` 110313). It returned 4 findings, all `anchor_check: ok`.

QA's mutation proofs ran in a scratch worktree at `aca41591` while the reviewer read the main tree (obs #266). The worktree was removed afterwards, and the main tree was unchanged.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: doc-link-branch.js resolver | PASS | Verified | Sibling-bug rows hold both directions |
| Phase 2: GitHub sites + jira-sync delegation | PASS | Verified | Every call's reads bound in-block; pin reaches the resolver |
| Phase 3: create-epic + population test | PASS | Verified | Binding in-block; reassignment caught |
| Phase 4: develop-bug Step 2b | PASS | Verified | Unchanged since gate 2 |
| Phase 5: docs, CHANGELOG, config | PASS | Verified | review-story fallback wording corrected |

**Overall Phase Completion**: 5/5

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| Step 1 has no ensure-bug-*, no work-started signal, no push; Step 2b is the only ensure-bug-* | PASS | `develop-bug.test.js` |
| NEEDS DETAIL / DUPLICATE / STALE halts name branch + report, delete nothing | PASS | same suite |
| Step 2b writes `tracker_issue` + `tracker_step` in one write; resume contract states six states | PASS | same suite |
| Unrelated branch → default; own / parent / hotfix branch → that branch | PASS | `doc-link-branch.test.mjs`, now with sibling must-differ rows |
| `task.20` does not match `feature/task.200.x` | PASS | same test |
| At most one `gh repo view`, none with `--default` | PASS | CLI test with stubbed `gh` |
| `npm test` green with `.agents/skills` aside; bundle:check, format:check clean | PASS | `ci:fast` at `aca41591`: 6067 tests, 0 fail, 14 skipped |
| Each new test mutation-proved | PASS | qa-fix 5/5; QA 4/5 covered, 1 no-red-dead (an unreachable clause, not a gap) |
| `npm run validate` for every changed skill | PASS | create-epic, sync-github-story, review-story exit 0 (this cycle's changes) |
| CHANGELOG entry; configuration.md § Document link branch | PASS | read |

---

## Breaking Changes Validation

### Breaking Change: develop-bug opens no tracker issue on a Step 2 halt
Documented: Yes · Migration Path Provided: Yes · Migration Tested: N/A · Consumer Code Updated: N/A

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0 gating)

The two medium/medium review findings are advisory under the gate mapping: they are routed to `recommendations.future` and counted under Maintainability.

### LOW Severity Issues (3)

- CR-3: review-story's sync confirmation still prints "current branch" for an empty pin.
- CR-4: `runCli` does the upstream and integration lookups even when `--explicit` decides.
- The own-bug comparison in `segmentNamesItem` is unreachable.

**Total Issues**: HIGH: 0, MEDIUM: 0 gating (2 advisory), LOW: 3

---

## NFR Assessment

### Performance — PASS
No new calls. CR-4 is an avoidable lookup on the pinned path.

### Reliability — PASS
Both cycle-2 HIGH/MEDIUM reliability defects are fixed, and committed tests execute them under bash.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 11 (`totals.executed` of [task.200.qa.3.security.run.json](./task.200.qa.3.security.run.json)); escaped: 0
- Re-run because `doc-link-branch.js` changed this cycle. The change narrows an identity match and builds no path.

### Maintainability — CONCERNS
The two guard-breadth gaps (CR-1, CR-2), plus the unreachable clause.

---

## Code Review

Advisory except where promoted (`code_review_blocking=true`; nothing qualified, because no finding is `bug` + `confidence: high`).

**Correctness bugs (2):**
- [medium/medium] `tests/doc-link-branch-population.test.js:129`: the link scan misses a defaulted expansion `blob/${V:-…}/` → accept an optional operator inside the braces and add a control case. Reproduced; corpus 0.
- [medium/medium] `tests/doc-link-branch-sites-execute.test.js:72`: a binding line is accepted whatever it reads, and bare `$NAME` reads are skipped → accept only a `{placeholder}` or an earlier-bound variable. Reproduced by construction; corpus 0.

**Cleanups (2):**
- `skills/review-story/SKILL.md:2338`: the confirmation says "current branch" for an empty pin → say "resolved branch".
- `shared/resources/doc-link-branch.js:233`: `runCli` looks up the upstream before checking `--explicit` → return early.

**Provenance (Step 5b):** both bugs are test-scope gaps in tests this branch added. They stay QA findings, not `pre-existing`. Neither enters `top_issues[]`, because confidence is medium. Severity and confidence are as returned.

**Boundary (Step 3b.3):** `boundary: true`. The resolver's identity predicate was probed by hand (the sibling-bug rows, both directions). `integrationBranchOf` was probed with the engine: `probes_executed: 11`, `escaped: 0`.

**Changed blocks executed:** both changed fenced blocks pass `bash -n`. The check was calibrated first: it fails on cycle 1's apostrophe guard (`unexpected EOF`, rc 2).

**Mutation proofs (Step 3c)**, QA's own mutants, in a scratch worktree, baseline 3 suites green before and after:
- mutation-proven: `--explicit "${UNBOUND_PIN:-}"` added to ensure-task-github-issue's call → `every GitHub site's link-branch lines run…` → covered
- mutation-proven: `segmentNamesItem` returns `!bug` (own-bug clause dropped) → nothing red → no-red-dead (the `item.id` match returns first for a bug's own branch, so the clause is unreachable)
- mutation-proven: link scan `every` → `some` → `the link scan catches a branch taken from HEAD…` → covered
- mutation-proven: create-epic's `PRD_SOURCE_PATH` binding moved after the call → `create-epic's PRD link-branch lines…` → covered
- mutation-proven: sync-github-story `--explicit ""` → `a site's caller-passed pin reaches the resolver` → covered

4 of 5 covered; the fifth is dead code, not an untested branch.

---

## Step 4b: Documented Commands

| File | Changed blocks | Executed | Refusal |
| --- | --- | --- | --- |
| `skills/create-epic/SKILL.md` | 1 | 0 | mutating (`changed-blocks-not-executed`) |
| `skills/sync-github-story/SKILL.md` | 1 | 0 | mutating (`changed-blocks-not-executed`) |
| `skills/review-story/SKILL.md` | 0 | 0 | prose change only |

Both changed blocks are refused as mutating. Their link lines are executed by `doc-link-branch-sites-execute.test.js`, and both blocks pass `bash -n`. bash only (`zsh-unavailable`).

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full `ci:fast` suite (6067 tests) | PASS |
| Resolver, execute, population suites | PASS |

---

## Test Artifacts

### Test Commands Executed

```bash
npm run ci:fast                       # .agents/skills moved aside: GATE_EXIT=0, 6067 tests, 0 fail
npm run -s validate -- skills/<s>/    # create-epic, sync-github-story, review-story: exit 0
bash -n <changed block>               # both pass; calibrated on the cycle-1 apostrophe guard (rc 2)
command node scratchpad/qa3-mut.js    # in a scratch worktree at aca41591
command node .agents/skills/qa-task/references/security-probe.mjs --sink path --entry 'shared/resources/doc-link-branch.js#integrationBranchOf' --record task.200.qa.3.security.run.json --json
```

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. CR-1 and CR-2: widen the two guards.
2. Drop or comment the unreachable own-bug clause.
3. CR-3, CR-4, and gate 2's carried items.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No open issue. Maintainability CONCERNS for two advisory guard-breadth gaps.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: 5c PR conformance review and finalise DoD.

---

**QA Report**: co-located at `task.200.qa.3.tracker-side-effects-after-their-gate.md`
**Gate File**: co-located at `task.200.gate.3.tracker-side-effects-after-their-gate.yml`
**Next Steps**: 5c `/review-pr`.

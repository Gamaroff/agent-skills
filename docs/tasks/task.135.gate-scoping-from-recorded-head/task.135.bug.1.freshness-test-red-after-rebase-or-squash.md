# Bug Report: Task 135 - Freshness test goes red once a gate's branch is rebased or squash-merged

**Task**: [task.135](./task.135.gate-scoping-from-recorded-head.md)
**Bug ID**: TASK-135-BUG-1
**Severity**: HIGH
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer (cycle 1, code review CR-1)
**Date Found**: 2026-09-30

## Description
`gate-head-freshness.test.mjs` requires every schema-2 gate's `head:` to exist and be an ancestor of HEAD, across the whole `docs/` corpus. `develop-batch` rebases each item onto the new tip before merging (SKILL.md Step "Rebase on the current tip"), and `developNext.mergeStrategy` accepts `squash` and `rebase`. After either, the gate names a pre-rewrite SHA that is not an ancestor of `develop` (and absent from a fresh clone once the branch is deleted).

## Steps to Reproduce
1. Develop a task through QA (gate records head H).
2. Rebase the branch (develop-batch) or squash-merge it.
3. Run `node --test shared/resources/tests/gate-head-freshness.test.mjs` on develop → red, and stays red for every later PR.

## Expected Behavior
Ancestry and existence are judged for gates this branch adds or changes, where the head must still be reachable; a gate already merged is not re-judged against history it no longer shares.

## Actual Behavior
Every rewritten item's gates fail the corpus test forever. `qa-re-review-scope.md` also says "The pipeline never rebases", which develop-batch contradicts.

## Impact
One batch run or one squash merge turns `npm test` red on `develop` for everyone.

## Recommendation
Scope the existence/ancestry/author-time rules to gates changed relative to the merge-base with the base branch (plus uncommitted ones); keep format checks for all schema-2 gates. Correct the "never rebases" sentence to name develop-batch's pre-merge rebase.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-30

**Fix Description**: History rules (exists, ancestor, author time) now apply only to gates this branch adds or changes — `branchChangedPaths()` against the merge-base with `$GATE_HEAD_BASE`/`origin/develop`, plus untracked. Format rules apply to every schema-2 gate. An unresolvable base (release.yml's depth-1 tag checkout) skips history with a diagnostic. Loop extracted to `judgeCorpus()`; independent count from `git ls-files` (CR-8). `qa-re-review-scope.md`'s "never rebases" sentence corrected to name develop-batch's pre-merge rebase and squash/rebase merges.

**Files Modified**: `shared/resources/tests/gate-head-freshness.test.mjs`, `shared/resources/qa-re-review-scope.md`

**Testing**: 5 new tests (branchChangedPaths ×2, judgeCorpus, history:false ×2). Mutation M5 (history always on) → judgeCorpus red.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-09-30 | New | QA Engineer | QA cycle 1 |
| 2026-09-30 | Ready for QA | qa-fix | Fixed in QA cycle 1 |
| 2026-09-30 | Closed | QA Engineer | Verified in QA cycle 2 — partial; the in-flight rebase case continues as bug 6 |

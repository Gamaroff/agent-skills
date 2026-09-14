# Bug Report: Task 116 - Release housekeeping merged mid-PR references a skill the branch does not have and misfiles the task's changelog entries

**Task**: [Link](./task.116.qa-loop-routes-and-preconditions.md)
**Bug ID**: TASK-116-BUG-7
**Severity**: HIGH
**Priority**: P0
**Status**: ✅ Closed
**Found By**: QA Engineer (cycle 5 reviewer, CR-1 / CR-2; fast gate)
**Date Found**: 2026-09-14

## Description

Between sessions the branch received `23cc8e33` (chore(release): v0.47.0), `b36bca4a` (wip: implementation report + `docs/reference/skill-catalog.md` + `package.json`) and the merge `a7c425d3`. Two consequences: (1) the `## [v0.47.0]` header was inserted **above** the task's five `### Changed` bullets, so unreleased work is now recorded as shipped in v0.47.0 (`git show v0.47.0:shared/resources/develop-pipeline-step-5-6-qa-loop.md` has no route 3); (2) the catalog line and the `eval:test-it` / `eval:all` scripts reference `skills/test-it/` and `evals/test-it/scenarios/`, which exist on `origin/develop` (`d63b2096`) but not on this branch — the catalog test in `npm test` fails (`126` vs `127` skills) and `eval:all` would abort on an unexpanded glob.

## Actual Behavior

`npm run ci:fast` → `TEST_EXIT=1` ("generated catalog is in sync with SKILL.md frontmatter"). The PR is red.

## Recommendation

Merge `origin/develop` into the branch so `test-it` and its evals travel with the catalog/`package.json` hunks (the reviewer's suggested action; also brings v0.48.0), then re-run `npm run generate-catalog` and confirm 0 drift. Move the five task-116 bullets back under `## [Unreleased]` → `### Changed`.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-14 (operator, after the QA-loop escalation — the merge is an operator decision, not one the loop takes)

**Fix Description**: (1) `git merge origin/develop` (`d63b2096..e4bf2f2d`, v0.48.0) into the branch — clean, no conflicts — so `skills/test-it/` and `evals/test-it/` travel with the catalog and `package.json` hunks that referenced them; `npm run generate-catalog` reports 127 skills and leaves the tree unchanged (merge commit `d0a53d62`). (2) The five task-116 `### Changed` bullets moved from `## [v0.47.0]` to directly under `## [Unreleased]`; the v0.47.0 section now matches the tagged text byte-for-byte — `git diff origin/develop -- CHANGELOG.md` is 36 insertions, 0 deletions (commit `6b86eb4b`). Before the merge, the working tree carried a develop snapshot of `skills/` and `scripts/generate-prd-epic-index.mjs` (a consumer-install overlay dated 08:12 that reverted every bundled task-116 copy); it was byte-identical to `origin/develop` and was discarded before merging.

**Testing**: `npm run ci:fast` → exit 0, 3270 tests, 0 fail (the catalog test that was red now passes); `npm run bundle -- --check` → 127 skills, 0 problems.

#### QA Verification (Ready for QA → Closed)

**Date**: 2026-09-14 (QA cycle 6)

**Verification**: `skills/test-it/SKILL.md` and `evals/test-it/` present after merge `d0a53d62`; `npm run generate-catalog` → 127 skills, tree unchanged; `npm run ci:fast` on `f5b8d94b` → 3270 / 3269 / 0 / 1 skipped, EXIT=0 (the catalog test passes); `git diff origin/develop -- CHANGELOG.md` → 36 insertions, 0 deletions — v0.47.0 identical to the tagged text, the five task-116 bullets under `[Unreleased]` → `### Changed`. **Closed.**

## Status History

| Date       | Status       | Changed By | Notes |
| ---------- | ------------ | ---------- | ----- |
| 2026-09-14 | New          | QA         | Cycle 5 reviewer (CR-1 / CR-2); fast gate red |
| 2026-09-14 | Ready for QA | operator   | develop merged, catalog regenerated, changelog bullets moved to Unreleased |
| 2026-09-14 | Closed       | QA         | Cycle 6: verified — suite green, catalog in sync, changelog refiled |

# Bug Report: Task 116 - Release housekeeping merged mid-PR references a skill the branch does not have and misfiles the task's changelog entries

**Task**: [Link](./task.116.qa-loop-routes-and-preconditions.md)
**Bug ID**: TASK-116-BUG-7
**Severity**: HIGH
**Priority**: P0
**Status**: New
**Found By**: QA Engineer (cycle 5 reviewer, CR-1 / CR-2; fast gate)
**Date Found**: 2026-09-14

## Description

Between sessions the branch received `23cc8e33` (chore(release): v0.47.0), `b36bca4a` (wip: implementation report + `docs/reference/skill-catalog.md` + `package.json`) and the merge `a7c425d3`. Two consequences: (1) the `## [v0.47.0]` header was inserted **above** the task's five `### Changed` bullets, so unreleased work is now recorded as shipped in v0.47.0 (`git show v0.47.0:shared/resources/develop-pipeline-step-5-6-qa-loop.md` has no route 3); (2) the catalog line and the `eval:test-it` / `eval:all` scripts reference `skills/test-it/` and `evals/test-it/scenarios/`, which exist on `origin/develop` (`d63b2096`) but not on this branch — the catalog test in `npm test` fails (`126` vs `127` skills) and `eval:all` would abort on an unexpanded glob.

## Actual Behavior

`npm run ci:fast` → `TEST_EXIT=1` ("generated catalog is in sync with SKILL.md frontmatter"). The PR is red.

## Recommendation

Merge `origin/develop` into the branch so `test-it` and its evals travel with the catalog/`package.json` hunks (the reviewer's suggested action; also brings v0.48.0), then re-run `npm run generate-catalog` and confirm 0 drift. Move the five task-116 bullets back under `## [Unreleased]` → `### Changed`.

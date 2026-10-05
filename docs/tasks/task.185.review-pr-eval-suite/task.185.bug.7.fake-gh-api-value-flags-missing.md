# Bug Report: Task 185 - the fake gh does not know three gh api value flags

**Task**: [task.185.review-pr-eval-suite.md](./task.185.review-pr-eval-suite.md)
**Bug ID**: TASK-185-BUG-7
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (QA cycle 6, code review CR-2)
**Date Found**: 2026-10-05

## Description

`VALUE_FLAGS` in `evals/shared/lib/fake-gh.mjs` omits `gh api` flags that take a value:
`-p`/`--preview`, `--hostname` and `--cache`. Their value is read as the first positional, so the
fake looks up the wrong fixture key.

## Steps to Reproduce

With a fixture serving `repos/eval/widgets/issues/12/comments`:

| argv | Result | Expected |
|---|---|---|
| `api --hostname github.com <path>` | exit 1, `notFound` | served |
| `api -p corsair <path>` | exit 1, `notFound` | served |

## Expected Behavior

A real read with any of these flags is served from the fixture.

## Actual Behavior

The read fails as not found. A skill that adds `--hostname` would fail the scenario for a reason
that is the harness's, not the skill's.

## Recommendation

Add the three flags to `VALUE_FLAGS` and check the list against `gh api --help`. Under the
allow-list rework recommended in bug 6, this list matters only for locating the path positional.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-10-05

**Fix Description**: `-p`, `--preview`, `--hostname` and `--cache` are added to `VALUE_FLAGS`, so
their value is no longer read as the path. They are also in `API_READ_FLAGS`, so a read carrying them
is served.

**Testing**: the allow-list test in `fake-gh.test.mjs` serves `--hostname github.com`, `-p corsair`
and `--cache 1h` reads. These were `notFound` before; reproduced in QA cycle 6.

## Status History

| Date | Status | Changed By | Notes |
|---|---|---|---|
| 2026-10-05 | New | qa-task | QA cycle 6 |
| 2026-10-05 | Ready for QA | qa-fix | Fixed after escalation (user-approved allow-list) |

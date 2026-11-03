---
type: bug
title: "task.253 bug 1: the behind-upstream guard fails open when the upstream ref is gone"
description: "repoGuard reads a failed git rev-list as 'not behind', so --apply is not blocked and no warning is raised."
status: ready-for-qa
severity: medium
priority: P2
updated: 2026-11-03
---

# Bug Report: Task 253 - the behind-upstream guard fails open when the upstream ref is gone

**Task**: [task.253.migrate-doc-numbering-safety-nets.md](./task.253.migrate-doc-numbering-safety-nets.md)
**Bug ID**: TASK-253-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: Ready for QA
**Found By**: QA Engineer (diff code review CR-1, reproduced)
**Date Found**: 2026-11-03

## Description

`repoGuard` in `shared/resources/migrate-doc-numbering.mjs` measures how far behind the upstream a branch is with `git rev-list --count HEAD..<upstream>`. When that command fails, the next line sets the count to 0:

```js
const n = behind.status === 0 ? Number(behind.stdout.trim()) : 0;
```

"Level with the upstream" and "could not measure" now both report 0 and raise nothing.

## Steps to Reproduce

1. Create a bare remote and a clone with a branch `feat` that tracks `origin/feat`.
2. Delete `feat` on the remote (`git push origin --delete feat`). The local branch keeps its upstream setting, but `origin/feat` no longer exists.
3. Run `migrate-doc-numbering.mjs --root docs/prd` (or with `--apply`) from that clone.

Measured on 2026-11-03: `git rev-list --count HEAD..origin/feat` exits 128 (`unknown revision`) and the tool prints no `⚠` line.

## Expected Behavior

The failed measurement is reported as a warning (`upstream-unverified`, the code the task already uses for a failed fetch), so the author knows the behind check did not run. `--apply` stays unblocked, as the task says an unverifiable upstream only warns.

## Actual Behavior

No warning and no blocker. The guard looks like it ran and found the branch level.

## Impact

The one guard written to catch a checkout that has not pulled gives no signal in a state where it cannot tell. Low blast radius (a deleted upstream branch), but it is exactly the "found nothing" versus "could not look" confusion the tool's own docs warn about.

## Recommendation

When `rev-list` exits non-zero, push an `upstream-unverified` warning whose detail names the failure, and add a test in `253 gap 5 controls` with an upstream branch deleted on the remote. Mutation-prove it.

## Status History

| Date | Status | Changed by | Notes |
| --- | --- | --- | --- |
| 2026-11-03 | new | qa-task | Found in QA cycle 1 |
| 2026-11-03 | ready-for-qa | qa-fix | Fixed: a failed `rev-list` now raises `upstream-unverified` (one warning, replacing the fetch warning). Control test: upstream branch deleted on the remote. Mutation-proven. |

## Developer Fix Cycle

### Iteration 1

**Root cause**: `repoGuard` turned a non-zero `git rev-list` exit into a count of 0, so "could not measure" and "level" were one value.

**Fix**: when `rev-list` fails, `repoGuard` returns a single `upstream-unverified` warning naming git's first error line. It replaces any earlier fetch warning, whose "compares with the last-fetched ref" would be untrue. `--apply` is not blocked, as the task says an unverifiable upstream only warns.

**Files modified**: `shared/resources/migrate-doc-numbering.mjs`, `shared/resources/tests/migrate-doc-numbering.test.mjs` (`253 gap 5 controls`), `task.253.review.2.mutation-proof.md`.

**Verification for QA**: run the repro in the Steps above; expect one `⚠ upstream-unverified` line.

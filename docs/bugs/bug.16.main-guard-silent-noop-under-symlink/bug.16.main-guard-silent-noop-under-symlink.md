---
type: bug
status: closed # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'Medium'
created: '2026-09-23'
updated: '2026-09-29'
related: 'none — cross-cutting (six CLI entry-point guards across five skills and shared/resources)'
description: "Six scripts guard their CLI entry point with resolve(process.argv[1]) === fileURLToPath(import.meta.url). resolve() does not follow symlinks and import.meta.url is fully resolved, so invoking any of them through a symlinked path — which includes every macOS mktemp -d copy, since /var is a symlink to /private/var — makes the whole CLI a silent no-op: exit 0, no output, no writes, indistinguishable from a clean run."
github_issue: 522
---

**Bug ID**: bug.16
**Related**: none — cross-cutting
**GitHub**: [#522](https://github.com/Gamaroff/agent-skills/issues/522)
**Status**: ✅ Closed
**Priority**: Medium
**Severity**: Major
**Created**: 2026-09-23
**Assigned To**: —
**QA Engineer**: —

---

## Bug Description

**Summary**: the standard "am I being run directly?" guard in this repository is

```js
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main(process.argv);
```

`resolve()` normalises a path but **does not follow symlinks**; `import.meta.url` is always the
fully-resolved real path. So whenever the script is invoked through a symlinked path the two differ,
the guard is false, `main` never runs — and the process **exits 0 having printed nothing and written
nothing**.

**Expected Behavior**: the CLI runs whenever it is invoked directly, whatever path was used to reach
it.

**Actual Behavior**: a silent no-op. Crucially, **a silent no-op and a clean run are byte-identical
from the caller's side** — same exit code, same (empty) stdout — so nothing distinguishes "the tool
ran and had nothing to say" from "the tool never ran".

## Steps to Reproduce

On macOS, where `/tmp` → `/private/tmp` and every `mktemp -d` lives under `/var` → `/private/var`:

```bash
cp skills/qa-next/scripts/uat-status.mjs /tmp/uat.mjs
node /tmp/uat.mjs --root "$(mktemp -d)" --init   # exit 0, no output, no files written
echo $?                                          # 0
```

The same command run from the script's real path behaves normally.

## Impact

Any harness that copies a script to a temp directory and runs it there gets a clean-looking pass for
a tool that never executed. This is not hypothetical: during task.141's QA loop it produced two
confusing probes — a cycle-4 provenance check against the `origin/develop` copy of `uat-status.mjs`
appeared to "do nothing", and the conclusion drawn from it had to be re-derived from source instead.
A reviewer in a later cycle hit the same trap and diagnosed it.

The failure is worst exactly where it is most likely: throwaway-fixture testing, which is how this
repository's own QA steps verify CLI behaviour.

## The population — this is the finding, not the one file

Six files carry the identical guard. Fixing one leaves five:

```
shared/resources/finalise-fix-and-recheck.mjs
shared/resources/qa-execute-snippets.mjs
skills/loop-supervisor/scripts/run-loop.mjs
skills/develop-next/scripts/select-next.mjs
skills/develop-batch/scripts/schedule.mjs
skills/qa-next/scripts/uat-status.mjs
```

Enumerate with:

```bash
grep -rln 'resolve(process.argv\[1\]) === fileURLToPath' --include='*.mjs' --include='*.js' . \
  | grep -v '/references/'
```

## Recommendation

Compare real paths on both sides:

```js
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url))
  main(process.argv);
```

Wrap in a `try` if a missing `argv[1]` is possible. Apply to all six, and add a test that asserts
the guard fires through a symlink — a test over the *population*, since the defect's nature is that
each site is correct-looking in isolation and the set was never listed.

## Notes

Found during task.141's QA cycle 6, by a dispatched reviewer that had itself been caught by it.
Filed separately from that task's PR because it is **pre-existing** — it reproduces identically on
`origin/develop` and is untouched by that branch — and because its scope is six files across five
skills, not the one the task happened to be editing.

## Resolution Summary

**Final Status**: Closed — Already fixed (no code change in this bug's branch)
**Total Iterations**: 0
**Time to Resolution**: 6 days (filed 2026-09-23, fixed on `develop` 2026-09-24, closed 2026-09-29)
**Review**: `bug.16.main-guard-silent-noop-under-symlink.review.1.main-guard-silent-noop-under-symlink.md` — 🚨 STALE (already fixed)

**Final Fix Details**: Commit `39e595f9` (2026-09-24, obs #126) changed `skills/qa-next/scripts/uat-status.mjs` and `shared/resources/security-probe.mjs` to the `isInvokedDirectly()` helper, which compares `realpathSync` on both sides. The same commit added `shared/resources/tests/entrypoint-guard-realpath.test.mjs`, which runs two kinds of check. A structural check covers every ESM engine in `shared/resources/`, `skills/*/scripts/` and `skills/*/references/`, with a floor of 9. A behavioural check runs `uat-status.mjs` and `security-probe.mjs` through a symlinked directory. That test is the population test this report asked for. It passes 3/3 on `develop` `93a67bca`. This report's own reproduction exits 0 with no output on `39e595f9^`; on HEAD, `main` runs.

**Lessons Learned**:

1. **Five of the six listed files were never defective.** `finalise-fix-and-recheck.mjs`, `qa-execute-snippets.mjs`, `run-loop.mjs`, `select-next.mjs` and `schedule.mjs` already compared real paths when this bug was filed. The enumeration grep matched the `resolve(...)` line that survives as their `catch` fallback. A population grep must match the defective primary branch, not a line that correct files also carry.
2. **The fix landed through an observation, not through this bug.** Nothing linked obs #126's commit back to bug.16, so the bug stayed `new` and `/develop-next` later dispatched it. That created issue #522 and a branch before `review-bug` could find it stale (obs #220).

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-29 | New | ensure-bug-github-issue | GitHub issue created (#522) |
| 2026-09-29 | Closed | develop-next (operator-approved) | Closed as already fixed — 39e595f9 (obs #126); review-bug STALE |

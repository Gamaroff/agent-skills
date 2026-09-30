# Bug Report: Task 140 - --fake-gh containment is still lexical, so a symlinked fake-gh directory pointing outside the root is accepted

**Task**: [task.140](./task.140.shell-fn-sentinel-hardening.md)
**Bug ID**: TASK-140-BUG-2
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✔️ Closed
**Found By**: QA Engineer (QA cycle 1, code review CR-2)
**Date Found**: 2026-09-30

## Description

task.140 moved `resolveEntry` onto real paths (both sides). The `--fake-gh` validation in `runProbeSpec` still compares `resolve(repoRoot)` with the lexical `fakeGhDir`, and its comment says "Same containment as an entry" — which this change made false. A `--fake-gh` directory that is a symlink inside the root pointing outside it is accepted, prepended to `PATH`, and recorded as `fake_gh`.

**Provenance.** The behaviour is identical at `origin/develop` (both checks were lexical there). It is attributed to this change anyway, as a judgement: the diff broke the invariant the code states ("same containment as an entry") and the task's goal is closing exactly this symlink class. Recorded so the next reader can disagree with the attribution rather than rediscover it.

## Steps to Reproduce

Temp root with `fake → <outside dir holding an executable gh>`; `runProbeSpec({ …, fakeGh: "fake" })` → runs (the reviewer measured `no-hostile-case-was-rejected`, executed 28) instead of `bad-fake-gh`.

## Expected Behavior

`bad-fake-gh`, nothing spawns.

## Recommendation

Realpath both sides at the fake-gh check (`realpathSafe`), and have `namesGh` realpath the root it is given (review CR-6) so every containment site in the engine decides on real paths. Row: a symlinked fake-gh dir → `bad-fake-gh`, executed 0.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-30

**Root cause**: the fake-gh validation kept `resolve(repoRoot)` / `resolve(root, fakeGh)` when `resolveEntry` moved to `realpathSafe` on both sides.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-30

Both sides of the fake-gh check now go through `realpathSafe`. `namesGh` also realpaths the root it is given (review CR-6), so every containment decision in the engine is on real paths.

**Files Modified**:

- `shared/resources/security-probe.mjs`
- `shared/resources/tests/security-probe.test.mjs`
- `shared/resources/probe-boundary-rule.md` §5 (and bundled copies)

**Testing**: New row "--fake-gh containment is decided on real paths, like an entry's": a symlink to an outside dir holding a copy of the fixture → `bad-fake-gh`, nothing spawns; an in-tree symlink to the fixture still engages. Mutant F2 → that row red → covered; F5 (drop the `namesGh` root realpath) → the namesGh row's "root via symlink" assertion red → covered.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-09-30 | New | QA (cycle 1) | Filed from code review CR-2 |
| 2026-09-30 | Ready for QA | qa-fix (cycle 1) | Fix + row; mutation-proved |
| 2026-09-30 | Closed | QA (cycle 2) | Verified: the fix row is green on bash + zsh and its mutant reds it; see qa.2 Re-Review Context |

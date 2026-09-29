# Bug Report: Task 150 - the seed's id is not the id set-status parks

**Task**: [task.150.create-task-authoring-evidence.md](./task.150.create-task-authoring-evidence.md)
**Bug ID**: TASK-150-BUG-3
**Severity**: HIGH
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer (QA cycle 2: refute pass CR-1 and CR-2, plus the safety re-probe)
**Date Found**: 2026-09-28

## Description

Cycle 1 hardened `observationId()` against raw strings. But on the path SKILL.md § 1.1 prescribes,
the seed receives **scan output**, and `cmdScan` has already run `parseInt` on the frontmatter id.
A hand-edited `id: 1e2` therefore reaches the seed as the number `1`, and `012` or `12abc` reach it
as `12`. The guard accepts all of them.

`set-status` does not use the frontmatter id at all. `findById` matches the **filename's numeric
prefix**. The seed builds its park vector from one identity, and the engine resolves it with another.

## Steps to Reproduce

A scratch workspace with file `0005-x.md` whose frontmatter reads `id: 1e2`:

```
scan id: 1   file: 0005-x.md
park vector: ["set-status","--id","1",…]   → parks 0001-*, a different entry
```

Safety re-probe (`task.150.qa.2.security.run.json`, `seedAcceptsId`): 18 cases. Three hostile cases
are still accepted: `"9007199254740993"` (rounded to …992), and `1e21` and `9007199254740993` as
numbers (`String(1e21)` is `1e+21`).

## Expected Behavior

The park vector names the entry the seed selected, by the identity the engine resolves:

- the numeric prefix of the scan entry's `file`, a safe integer;
- which must agree with the frontmatter id. If it does not, the run is refused and both are named.

## Impact

`--from-observation` can park an unrelated observation, and leave the selected one open.

## Recommendation

Derive the id from `file` (`/^(\d+)-/`, `Number.isSafeInteger`). Refuse when the frontmatter id
disagrees, when the file is absent or the prefix is malformed, or when two entries resolve to the
same id. Test with real scan output built from a malformed-id file.

## Developer Fix Cycle

### Iteration 1

#### Fix Implementation (New → Ready for QA)

**Date**: 2026-09-28

**Root Cause**: the seed chose its own identity (the frontmatter id), and the engine resolves a
different one (the filename prefix, in `findById`). The cycle-1 fix hardened the wrong identity, and
`scan` had already coerced it before the seed saw it.

**Move (a replace, not another patch)**: `lib.js` carried a HIGH in gates 1 and 2. The mechanism
"validate the frontmatter id" is removed, not corrected again. Identity is now `fileId(file)`: the
numeric prefix of the scan entry's `file`, which must be a safe positive integer. The frontmatter id
is only checked against it (`frontmatterId`, strict and safe-integer). The seed refuses when the
file is missing or malformed, when the two ids disagree, and when two entries name the same id.

**Files Modified**:

- `skills/create-task/scripts/lib.js`: `fileId`, `frontmatterId` and the duplicate refusal (replacing `observationId`)
- `skills/create-task/tests/from-observation.test.js`: 17 disagreeing frontmatter ids (including
  `9007199254740993` and `1e21`), 6 unusable files, a missing file, a duplicate, and a test driven by
  **real scan output** (`0005-malformed.md` with `id: 1e2` scans as `1` and is refused)
- `skills/create-task/SKILL.md`: § 1.1 step 3 names the identity. § 5 step 2b re-scans before
  parking (refute CR-3)

**Testing**: 11/11. Mutation-proved: the pre-fix `lib.js`, no agreement check, no duplicate check and
no safe-integer check each turn a named test red.

| Date | Status | Changed By | Notes |
| ---------- | ------------ | ---------- | ---------------------------------------- |
| 2026-09-28 | New | QA | Refute CR-1/CR-2 plus the re-probe, cycle 2 |
| 2026-09-28 | Ready for QA | qa-fix | Identity keyed on the file prefix |
| 2026-09-28 | Closed | QA | Cycle 3 real-scan re-probe engages 12/12 |

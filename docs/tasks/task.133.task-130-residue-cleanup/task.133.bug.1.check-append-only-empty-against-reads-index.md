# Bug Report: Task 133 - `--check-append-only --against ""` reads the index and reports a clean log

**Task**: [task.133.task-130-residue-cleanup.md](./task.133.task-130-residue-cleanup.md)
**Bug ID**: TASK-133-BUG-1
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (cycle 1, Step 3b code review CR-1)
**Date Found**: 2026-09-30

## Description

`change-log.js --check-append-only` accepts an empty `--against` operand. `contentAt(file, "")` then runs `git show ":./<file>"`. With an empty revision, git reads the file from the **index**, not from any commit. The index copy is normally identical to the working tree, so the check reports `ok` with exit 0.

The 5c conformance lens (`pr-conformance-prompt.md` § C. TRAIL) calls it as `--against "$(git merge-base HEAD origin/<base>)"`. When the merge-base cannot be resolved (wrong base name, shallow clone, missing fetch), the command substitution expands to `""`. The check then says "clean log", which is the opposite of the usage exit 2 that the prompt promises for an unreadable base. The check fails open on exactly the input it was written to refuse.

## Steps to Reproduce

```bash
command node shared/resources/change-log.js --check-append-only \
  --file docs/tasks/task.130.resume-residue-bug-variant-base-and-who-restores/task.130.resume-residue-bug-variant-base-and-who-restores.md \
  --against "$(git merge-base HEAD origin/nonexistent 2>/dev/null)" --json; echo "rc=$?"
```

## Expected Behavior

`{"reason":"usage", …}` and exit 2, because an empty or whitespace revision names no commit.

## Actual Behavior

`{"ok":true,"reason":"ok",…,"against":""}` and exit 0.

## Impact

Any unresolvable base turns the 5c TRAIL check into a false "no row lost". This is the "could not look" versus "found nothing" confusion, and the task's own ambiguous-signal rule exists to prevent it.

## Recommendation

Reject an empty or whitespace-only `--against` operand as usage (exit 2) before `contentAt` is called. Add a J4 case asserting that `--against ""` and `--against "  "` both exit 2. Mutation-prove it by removing the guard: J4 must go red.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-30

**Root Cause**: `main()` validated `--against` only for presence (`v === undefined || v.startsWith("--")`), so `""` was bound as a revision. `contentAt` then ran `git show ":./doc.md"`, and git reads an empty revision as the index.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-30

**Fix Description**: `--check-append-only` refuses an empty or whitespace-only `--against` as usage (exit 2) before any git call: `change-log: --against is empty — the base revision did not resolve; nothing was compared`.

**Files Modified**:
- `shared/resources/change-log.js`: the guard, with a comment naming the merge-base expansion
- `shared/resources/tests/change-log.test.mjs`: J4 asserts `--against ""` and `--against "  "` exit 2 with `reason: usage`

**Testing**: J4 went red before the fix and is green after it. Mutation-proven: with the guard's condition set to `false`, J4 goes red. The reproduction `--against "$(git merge-base HEAD origin/nonexistent)"` now gives rc 2.

**Verification Steps for QA**: re-run the Steps to Reproduce above. Expect exit 2 and the usage line.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-09-30 | New | QA Engineer | Found in QA cycle 1 (CR-1) |
| 2026-09-30 | In Progress | qa-fix | Root cause: presence-only operand check |
| 2026-09-30 | Ready for QA | qa-fix | Guard + J4 cases; mutation-proven |

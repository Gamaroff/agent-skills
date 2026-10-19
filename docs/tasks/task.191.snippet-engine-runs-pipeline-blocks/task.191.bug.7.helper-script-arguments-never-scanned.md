# Bug Report: Task 191 - Arguments to a helper script reach its positional parameters unscanned

**Task**: [Link](./task.191.snippet-engine-runs-pipeline-blocks.md)
**Bug ID**: TASK-191-BUG-7
**Severity**: HIGH
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer (cycle 2, CR2-2)
**Date Found**: 2026-10-19

## Description

The helper rule checks a `bash`/`sh`/`source`/`.` call's path, and nothing else in its argv. A helper that forwards `"$@"` or `$1` to an argument-sensitive command (`find`, `sed`, `git`) receives the block's arguments unchecked. A `set -- …` before a `source` reaches the same parameters. Cycle 1's `reach()` check closed this for helper **functions** only.

## Steps to Reproduce

Fixture `h/fwd.sh` = `find docs "$@"`. `classifyBlock("bash h/fwd.sh -delete", {}, {helperRoot})` → `runnable`; `set -- -delete; source h/fwd.sh` → `runnable`. Develop refuses both: it refuses every helper call.

## Expected Behavior

Refused: a helper call's arguments, and any `set --` arguments before a `source`, are refused exactly as they would be if written to each command the helper runs.

## Actual Behavior

Classified runnable. Run in the temp copy, `find docs -delete` deletes the copy's `docs/`.

## Impact

The helper rule's claim that a helper is only as permissive as its text fails for any helper that reads positional parameters.

## Recommendation

Apply the forwarded-argument check to helper-runner calls (and `set --`), or refuse a helper call that has arguments when the helper reads positional parameters.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-19
**Developer**: qa-fix

**Root Cause**: The forwarding check covered calls to sourced functions only. A helper script's arguments become its positional parameters, and `set --` sets them for a sourced helper; neither was checked.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-19

**Fix Description**: The helper-call loop applies the same forwarded-argument check to the helper's own arguments (everything after the path) and, for `source`/`.`, to the positional parameters every `set` in the block assigns (options first; `--`, `-` or the first non-option ends them).

**Files Modified**:

- `shared/resources/qa-execute-snippets.mjs`
- `shared/resources/tests/qa-execute-snippets.test.mjs`
- `shared/resources/qa-runnable-prose-detection.md`

**Testing**: `T191 CR2-2: a helper script's own arguments, and set --, are checked` — `bash h/fwd.sh -delete`, the quoted form, `set -- -delete; source …` and `set -e -- -delete; source …`; plain calls stay runnable. Mutations: dropping the check, and reading `set` from its first word only, each turn it red.

**Verification Steps for QA**: `bash h/fwd.sh -delete` and `set -- -delete; source h/fwd.sh` are `mutating`, `helper h/fwd.sh forwards its arguments to find`.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-19 | New | qa-task | Found in QA cycle 2 |
| 2026-10-19 | In Progress | qa-fix | Investigation started (QA cycle 2) |
| 2026-10-19 | Ready for QA | qa-fix | Fix implemented, mutation-proven (QA cycle 2) |
| 2026-10-19 | Closed | qa-task | Verified by task.191.qa.3.snippet-engine-runs-pipeline-blocks.md |

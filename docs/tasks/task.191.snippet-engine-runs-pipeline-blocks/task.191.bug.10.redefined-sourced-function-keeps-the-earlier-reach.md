# Bug Report: Task 191 - A function redefined by a later sourced helper keeps the earlier helper's reach

**Task**: [Link](./task.191.snippet-engine-runs-pipeline-blocks.md)
**Bug ID**: TASK-191-BUG-10
**Severity**: HIGH
**Priority**: P1
**Status**: Closed
**Found By**: QA Engineer (cycle 3, CR3-1)
**Date Found**: 2026-10-19

## Description

When a sourced helper redefines a function that an earlier sourced helper already defined, the classifier judges the function's arguments by the earlier definition's commands. The shell runs the later definition. The cycle-2 `inherited` seeding (CR2-5) overwrites the helper's own definition with the inherited one.

## Steps to Reproduce

`h1.sh` = `f() { echo "$@"; }`, `h2.sh` = `f() { sed "$@"; }`. `classifyBlock("source ./h1.sh; source ./h2.sh; f 'w victim' h1.sh", {}, {helperRoot})` → `runnable`. The shell runs `sed 'w victim' h1.sh`, a file write. `f -i s/a/b/ h1.sh` behaves the same way.

## Expected Behavior

`mutating`, `function f forwards its arguments to sed: …`. That is the verdict without the `h1.sh` source.

## Actual Behavior

`runnable`. Develop refuses every helper call, so the defect is new to this change.

## Impact

Any later helper that redefines a function name an earlier helper used can launder argument forwarding through it.

## Recommendation

Let a helper's own definition win, or use the union of the two reaches. Never let the inherited reach replace the helper's own reach. Add the h1-then-h2 regression test.

## Status History

| Date | Status | Changed By | Notes |
|------|--------|------------|-------|
| 2026-10-19 | New | qa-task | Found in QA cycle 3 (CR3-1) |
| 2026-10-19 | In Progress | qa-fix | Third strike: mechanism replaced |
| 2026-10-19 | Ready for QA | qa-fix | Union of every definition (addBody); T191 CR3-1 |
| 2026-10-19 | Closed | qa-task | Verified by task.191.qa.4.snippet-engine-runs-pipeline-blocks.md |

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-19
**Developer**: qa-fix (cycle 3)

`classifyInternal` kept one forwarding entry per function name, and every write replaced the last. The inherited seeding wrote after the helper's own names. The caller's merge then read that inherited entry back as the helper's, so the helper's own commands were never used. This was the third consecutive HIGH on this mechanism, so qa-fix ran under the third-strike rule: replace, do not patch.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-19

**Struck mechanism**: one reach per function name, last write decides. **Move**: replace. Each name now holds a list of every body the block may see: the text's own (`null`, its commands), each inherited one, and each sourced helper's. A call reaches the union. `addBody` only appends. Order no longer matters, and the result over-approximates, so it refuses more, never less.

**Files Modified**:
- `shared/resources/qa-execute-snippets.mjs`: `addBody`; the own-name, inherited and caller-merge writes; `reach` over every body; `inherited` carries `commands`
- `shared/resources/tests/qa-execute-snippets.test.mjs`: `T191 CR3-1`
- `shared/resources/qa-runnable-prose-detection.md` §2aa and `CHANGELOG.md`

**Testing**: `T191 CR3-1` covers both orders, the redefining helper's own call, and two should-not-merge pairs. It is mutation-proven: replace instead of append, inherited off (held by CR2-5), no own body. The real skill docs classify the same as before.

# Bug Report: Task 52 - Distinct records collapse to one id and are silently dropped

**Task**: [Link](./task.52.deferred-mutation-record-and-renderers.md)
**Bug ID**: TASK-52-BUG-4
**Severity**: HIGH
**Priority**: P0
**Status**: ✅ Ready for QA
**Found By**: QA Engineer (diff code review, reproduced)
**Date Found**: 2026-08-18

## Description

`computeId`'s fingerprint uses `desired`, then `manual.fields`, then `command.argv` — and **never**
`command.stdin` or `intent`. Two different comments posted to the same issue share their argv
(`gh issue comment 230 --body-file -`) and differ only in the body, so they hash to the same `id`.
`dedupe` then keeps one and discards the other.

## Steps to Reproduce

```bash
node -e '
const dm=require("./shared/resources/defer-mutation.js"), hr=require("./shared/resources/handover-render.js");
const mk=(intent,stdin)=>dm.buildRecord({kind:"github.issue.comment",intent,target:{issue:"230"},
  command:{argv:["gh","issue","comment","230","--body-file","-"],stdin}},{env:{}});
const a=mk("Post the DoD summary","DoD body"), b=mk("Post the QA gate result","QA body");
console.log(a.id, b.id, "same:", a.id===b.id, "| dedupe keeps:", hr.dedupe([a,b]).length, "of 2");'
```

## Expected Behavior

Two distinct mutations → two distinct ids → both rendered.

## Actual Behavior

**Verified**: both yield `b3afd88c`; `dedupe` returns 1 of 2.

## Impact

A tracker action the run wanted is **silently omitted from all four renderings**. The operator never
learns it was needed. This is precisely the invisible-drift failure the entire task exists to remove,
and it is worse than the status quo — today such a mutation at least becomes a warning line in the
Issues Log.

The `⚠️ UNRECORDED` mechanism does not help: a record *was* written, so the kind is present in
`seenKinds` and no missing-moment warning fires.

## Recommendation

Include a hash of `command.stdin` and `intent` in the fingerprint whenever argv is the discriminator.
Add a regression test asserting that two comments to the same issue with different bodies produce
two ids and two rendered actions.


---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-08-18

Root cause confirmed by reproducing the failure exactly as described in the report above, before any
change was made.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-08-18

**Fix**: `computeId` now folds `intent`, `desired`, `manual.fields`, `command.argv` **and** `command.stdin` into the fingerprint, rather than falling back to argv alone.

**Files Modified**: `shared/resources/defer-mutation.js`, `shared/resources/tests/handover-render.test.mjs`

**Testing**: §16 BUG-4 asserts two comments to the same issue with different bodies produce two ids, two deduped records and two checkboxes — while an identical re-emit still produces the same id. Mutation-proven: dropping stdin from the fingerprint turns it red.

**Verification for QA**: run the reproduction command in this report — it now produces the expected
behaviour — then `npm test` (1351 node + 394 shell, all green).

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-08-18 | New | QA Engineer | Found in QA cycle 1 |
| 2026-08-18 | In Progress | qa-fix | Reproduced and root-caused |
| 2026-08-18 | Ready for QA | qa-fix | Fixed with a mutation-proven regression test |

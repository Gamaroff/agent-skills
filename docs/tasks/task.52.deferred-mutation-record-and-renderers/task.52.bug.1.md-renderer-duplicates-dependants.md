# Bug Report: Task 52 - Markdown checklist lists dependants twice

**Task**: [Link](./task.52.deferred-mutation-record-and-renderers.md)
**Bug ID**: TASK-52-BUG-1
**Severity**: HIGH
**Priority**: P1
**Status**: ✅ Ready for QA
**Found By**: QA Engineer
**Date Found**: 2026-08-18

## Description

`renderMarkdown` emits every record that is the target of a `dependsOn` edge **twice**: once nested
beneath its dependency, and again standalone in its own consequence group.

`markdownItem` maintains a `_rendered` marker and honours it when recursing into children
(`if (child._rendered) continue`), but the top-level loop in `renderMarkdown` calls
`markdownItem(rec, model, 0)` for **every** record in each consequence group without consulting that
marker.

## Steps to Reproduce

```bash
node -e '
const dm=require("./shared/resources/defer-mutation.js");
const hr=require("./shared/resources/handover-render.js");
const {records}=dm.readJournal("shared/resources/tests/fixtures/handover-depends-chain.jsonl");
const md=hr.render(records,"md",{});
console.log("checkboxes:", md.split("- [ ]").length-1, "records:", records.length);
'
```

## Expected Behavior

3 records → 3 unticked checkboxes; each action listed exactly once.

## Actual Behavior

3 records → **5** unticked checkboxes.

```
### Irreversible — cannot be undone, and is not safe to run twice
- [ ] **Create GitHub issue (new)**
  - [ ] **Comment on GitHub issue $github.issueNumber**
    - [ ] **Add to the board board item $github.issueNumber**
### State drift — the board and reality disagree until this is done
- [ ] **Add to the board board item $github.issueNumber**      ← duplicate
### Communication — a record nobody reads is lost; nothing breaks
- [ ] **Comment on GitHub issue $github.issueNumber**          ← duplicate
```

## Impact

The markdown checklist is the primary artifact of `manual` mode — the one a human works through by
hand. An operator following it performs each dependent action **twice**: posting a duplicate comment,
adding a board item twice. Where a duplicated action is an `irreversible` kind (issue or PR creation)
the result is a duplicate issue that must be manually reconciled.

This is precisely the failure the `dependsOn` design exists to prevent ("the renderer nests them so
the human reads a sequence, not a pile").

**Bounded**: `sh`, `json` and `summary` are all correct (verified: 3 records → 3 step invocations,
3 ids, 3 bullets). Only the human-facing checklist is affected, so the generated script does **not**
double-execute.

## Why the existing tests missed it

- §2 (dedup) uses `handover-resume-duplicates.jsonl`, which has **no** `dependsOn` edges.
- §3 (nesting) asserts relative **indentation and ordering** only, never occurrence count.

## Recommendation

Track rendered ids in the model and skip already-rendered records in the top-level loop, or
pre-compute the set of records that are dependants of another record in the same group and exclude
them from top-level iteration. Add an assertion that the checklist contains exactly one checkbox per
outstanding record, driven by the `dependsOn` fixture.


---

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-08-18

Root cause confirmed by reproducing the failure exactly as described in the report above, before any
change was made.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-08-18

**Fix**: `renderMarkdown` now tracks emitted ids in a Set local to the render and skips them in the top-level consequence-group loop. The Set replaces the `_rendered` property that was being written onto the record objects, which also fixes the non-idempotency (BUG-13).

**Files Modified**: `shared/resources/handover-render.js`, `shared/resources/tests/handover-render.test.mjs`

**Testing**: §16 BUG-1 asserts one unticked checkbox per outstanding record and exactly one occurrence of each id, driven by the `dependsOn` fixture. Mutation-proven: removing the skip turns it red.

**Verification for QA**: run the reproduction command in this report — it now produces the expected
behaviour — then `npm test` (1351 node + 394 shell, all green).

## Status History

| Date | Status | Changed By | Notes |
| ---- | ------ | ---------- | ----- |
| 2026-08-18 | New | QA Engineer | Found in QA cycle 1 |
| 2026-08-18 | In Progress | qa-fix | Reproduced and root-caused |
| 2026-08-18 | Ready for QA | qa-fix | Fixed with a mutation-proven regression test |

# Bug Report: Task 45 - `upsertChangeLog` silently deleted rows it could not parse

**Task**: [Link](./task.45.change-log-pipeline-and-sync.md)
**Bug ID**: TASK-45-BUG-3
**Severity**: HIGH
**Priority**: P1
**Status**: Ready for QA
**Found By**: QA Engineer (Step 3b diff code review)
**Date Found**: 2026-08-13

## Description

`upsertChangeLog` regenerated a Change Log block from only those lines passing `isEntryRow` — which requires the **first cell to be a date**. Every other data row in the block was silently discarded.

Any log written with a different column order — notably `| Version | Date | Change | Author |` — has a non-date first cell in every row, so **every historical row was deleted** on the first write, with no warning and no error.

**Origin.** This is a pre-existing defect in task.42's engine; `upsertChangeLog`'s row parsing is not code task.45 changed. It is fixed here because task.45 is what makes it dangerous: before this task the engine had three callers, all sync scripts. Task.45 routes `develop`, `qa-story`, `qa-task`, `qa-fix` and `finalise` into the same function, multiplying the number of documents that pass through the destructive path.

It is also precisely the risk the task registers for itself. §10 Risk 1 mitigates with *"Row extraction is append-only by construction — `upsertChangeLog` never drops a row it parsed."* That claim is true and hollow: the rows it drops are the ones it **fails** to parse. Shipping the mitigation while the hole existed is the actual defect.

## Steps to Reproduce

```js
const CL = require("./shared/resources/change-log.js");
const doc = [
  "# Roadmap", "", "## Change Log", "",
  "| Version | Date | Change | Author |",
  "|---|---|---|---|",
  "| 1.0 | 2026-01-01 | Initial roadmap | me |",
  "| 1.1 | 2026-02-01 | Added phase 3 | me |",
  "", "## Next", "",
].join("\n");
CL.upsertChangeLog(doc, { date: "2026-08-13", description: "New row", author: "x" });
```

## Expected Behavior

No row is ever lost. The log is append-only; an unreadable row is still history.

## Actual Behavior (before fix)

```
Initial roadmap preserved: false
Added phase 3 preserved: false
```

The regenerated block contained only the new row. Both historical rows were gone.

## Impact

**Live exposure in this repo.** `skills/develop-next/assets/project-completion-roadmap.template.md` shipped with exactly the `| Version | Date | ... |` ordering. Every consumer project scaffolding a roadmap from that template carries a Change Log whose entire history would be erased the first time any writer touched it.

Losing history is the one outcome this module exists to prevent, and the failure is silent — no throw, no warning, no non-zero exit. It is the same silent-failure class as the four Jira cards published with empty bodies (`CHANGELOG.md:527`).

## Fix Implementation

**Date**: 2026-08-13

**Root Cause**: the block was regenerated from `blockLines.filter(isEntryRow)`, so anything the predicate rejected was structurally unable to survive the rewrite.

**Fix**: rows that are table data but fail `isEntryRow` are now collected as `unparsed` and re-emitted **ahead** of the parsed history, so nothing is dropped. Header and separator lines are excluded (the regenerated block supplies its own). A slightly irregular table is strictly better than deleted history.

**Files Modified**:
- `shared/resources/change-log.js` — collect and preserve unparsed rows
- `shared/resources/tests/change-log.test.mjs` — 2 regression tests
- `skills/develop-next/assets/project-completion-roadmap.template.md` — column order corrected to canonical `Date`-first, removing the live trap

**Testing**:
- `H: rows the parser cannot read are preserved, never dropped` — pins the reproduction above
- `H: preserved rows keep their original relative order, ahead of the new row` — the log is append-only, so recovered rows must not be reordered or float below a newer entry
- Full suite green

**Verification Steps for QA**:
1. Run the reproduction; both historical rows must survive.
2. Confirm the roadmap template no longer ships `| Version | Date`.
3. Confirm the full suite is green.

## Remaining Follow-up (NOT fixed here — out of scope)

The same code review raised two further engine issues, both **pre-existing task.42 defects** and neither introduced or amplified by this task. They are recorded here rather than fixed, to keep this PR's scope honest:

- **Content loss on the hand-written-heading path** (MEDIUM) — when a `## Change Log` has no markers, the whole span to the next heading is replaced, destroying prose and nested `###` subsections that sit under the heading.
- **`collapseOtherLegacyBlocks` skips the chosen block's own pair** (LOW) — a document holding *two* blocks of the same legacy pair keeps both for one write, self-healing on the next.

Both deserve their own change against the engine, with tests.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-08-13 | New | QA Engineer | Found by Step 3b diff code review; reproduced |
| 2026-08-13 | In Progress | qa-fix | Root cause confirmed in `upsertChangeLog` |
| 2026-08-13 | Ready for QA | qa-fix | Preservation implemented, 2 regression tests, template corrected |

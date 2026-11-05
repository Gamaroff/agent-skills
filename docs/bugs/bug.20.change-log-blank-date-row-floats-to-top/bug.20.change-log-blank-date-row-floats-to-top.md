---
type: bug
status: closed # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Minor'
priority: 'Low'
created: '2026-11-05'
related: 'none — cross-cutting (no single owner)'
description: 'upsertChangeLog treats a blank-date continuation row as unparsed and moves it above every dated row on the next write, reordering the history'
github_issue: 845
---

**Bug ID**: bug.20.change-log-blank-date-row-floats-to-top
**Related**: None — cross-cutting bug (no single owner)
**GitHub**: [#845](https://github.com/Gamaroff/agent-skills/issues/845)
**Status**: ✅ Closed
**Priority**: Low
**Severity**: Minor
**Created**: 2026-11-05
**Assigned To**: Unassigned
**QA Engineer**: Unassigned

---

## Bug Description

**Summary**: A Change Log row whose Date cell is blank is read as an "unparsed" row by `shared/resources/change-log.js`, and unparsed rows are emitted at the top of the table. The next machine append (`upsertChangeLog`) therefore moves that row above all dated rows, so it no longer sits under the row it continues.

**Expected Behavior**: The log is append-only and its order is its history (the module's own comment says so). A blank-date row stays where it is, directly under the row it continues. `upsertChangeLog` appends the new row at the bottom and changes nothing above it.

**Actual Behavior**: The blank-date row moves to the top of the table, above the first dated row. Every other row keeps its order.

**Impact**: Low and cosmetic, but it silently rewrites history. The continuation row `| | | Status → ready-for-development | review-task |` is a convention the pipeline itself writes (`review-task` records the status move under its review row), so it is not an authoring mistake. It read as belonging to whatever row came first once it floated up. It was found on task 263 at `/finalise` and fixed by hand. The same shape is in task 235's document, so the next machine write to either document triggers it again.

---

## Reproduction Steps

**Environment**: Linux, Node via mise, repository at `develop` (`40e2816f`).

**Steps to Reproduce**:

1. From the repository root, run this (it only prints; it writes nothing):

   ```bash
   command node -e '
   const CL=require("./shared/resources/change-log.js");
   const doc=`# T\n\n<!-- change-log-start -->\n## Change Log\n\n| Date | Version | Description | Author |\n| ---------- | ------- | ----------- | ------ |\n| 2026-11-05 | 1.0     | Initial draft | create-task |\n| 2026-11-05 | 1.1     | Review passed | review-task |\n|            |         | Status → ready-for-development | review-task |\n| 2026-11-05 |         | Implemented | develop-task |\n<!-- change-log-end -->\n`;
   const out=CL.upsertChangeLog(doc,{date:"2026-11-05",version:"1.2",description:"DoD passed",author:"finalise"});
   console.log(out.split("\n").filter(l=>l.startsWith("|")).join("\n"));'
   ```

2. Read the printed rows.

**Frequency**: Always
**Reproducible**: Yes

---

## Evidence

**Screenshots/Videos/Test Output**: Output of the command above. The Status row was third in the input and is first in the output:

```
| Date | Version | Description | Author |
|------|---------|-------------|--------|
|            |         | Status → ready-for-development | review-task |
| 2026-11-05 | 1.0     | Initial draft | create-task |
| 2026-11-05 | 1.1     | Review passed | review-task |
| 2026-11-05 |         | Implemented | develop-task |
| 2026-11-05 | 1.2 | DoD passed | finalise |
```

**Logs and Stack Traces**: none (no error is raised).

**Related Files**:

- `shared/resources/change-log.js` — `RE_ENTRY_ROW` (line 80) requires a leading `YYYY-MM-DD`; `isUnparsedRow` (line 98) is "not an entry row, not a separator, not a header", so a blank-date row qualifies; `upsertChangeLog` emits `unparsed` rows first (the comment near line 857: "Unparsed rows lead").
- Documents carrying a blank-date row today: `docs/tasks/task.235.select-next-external-precondition/task.235.select-next-external-precondition.md`, and `docs/tasks/task.263.untrusted-content-bound-parent-and-test-headroom/task.263.untrusted-content-bound-parent-and-test-headroom.md` (restored by hand on 2026-11-05).
- Command that found the documents: `git grep -ln '^|  *|  *| ' -- 'docs/tasks/*.md'`. It also matches any row with blank date and version cells, which is the shape wanted here. Re-run it before relying on the list.

---

## Scope & Impact

**Reference**: every skill that appends a Change Log row through `change-log.js`: `finalise`, `develop`, `develop-task`, the `qa-*` skills and the tracker syncs. None of them owns the engine, which is why this has no single story or task.

**How It Failed**: "Unparsed" was written for rows the parser cannot read (such as a `| Version | Date | … |` log), and it keeps those rows ahead of the rest so nothing is dropped. A blank-date continuation row is a row the pipeline writes on purpose, but the same predicate catches it. The rule that protects unreadable history reorders readable history.

**Likely fix direction (not applied)**: classify a table row with a blank Date cell and a non-blank Description as a continuation of the row above it, and carry it in place, instead of letting `isUnparsedRow` claim it. The first risk to check is the `| Version | Date | … |` layout, whose Date is not the first cell. A regression test should assert row order for the input in the reproduction, and the test must go red with the fix reverted.

---

## Developer Fix Cycle

[This section will be filled by developer during fix process]

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-11-05
**Developer**: Claude (develop-bug)

**Reproduction**: the command in Reproduction Steps, run on `develop` (`8e22fd50`), printed the blank-date row first.

**Root Cause Analysis**: `rebuildChangeLog` in `shared/resources/change-log.js` built `unparsed` from `isUnparsedRow`, which a blank-date continuation row satisfies, and emitted `[...unparsed, ...history, newRow]`, so every such row led the table.

**Proposed Fix**: attach a continuation row to the entry row above it and emit the two together.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-11-05

**Root Cause**: `isUnparsedRow` claims blank-date continuation rows, and unparsed rows are emitted ahead of all history.

**Fix Description**:

- Added `isContinuationRow`: a canonical-layout row with a blank Date cell and a non-blank Description. A `| Version | Date | … |` row has a non-blank first cell and is not matched.
- `rebuildChangeLog` now walks the table once. A continuation row is attached to the entry row above it and travels with it through the second-block sort. With no entry row above it, it stays unparsed and leads as before.

**Files Modified**:

- `shared/resources/change-log.js` — `isContinuationRow`, single-pass partition, tail-carrying sort
- `shared/resources/tests/change-log.test.mjs` — regression tests L1–L3
- `skills/*/references/change-log.js` — regenerated by `npm run bundle`

**Testing**:

- L1 (the reproduction) and L2 (sort with a second legacy block) fail with the `isContinuationRow` branch disabled and pass with it. L3 pins the orphan and Version-first cases.
- `change-log.test.mjs`: 116 of 116 pass.

#### QA Verification (Ready for QA → Closed/Reopened)

**Date**: 2026-11-05
**Verified by**: develop-bug

**Verification Result**: ✅ Fixed

**Notes**: Regression tests L1 and L2 pass (both failed with the fix disabled); `change-log.test.mjs` 116 of 116; `CI=true npm run ci:fast` 7894 pass, 0 fail; prettier clean. Lite mode: signals 1 and 2 only, no diff code review. The reported failure no longer reproduces.

**Decision**: Closed (finalised in Step 7)

---

## Status History

| Date       | Status | Changed By | Notes       |
| ---------- | ------ | ---------- | ----------- |
| 2026-11-05 | New    | Claude     | Bug created |
| 2026-11-05 | New | ensure-bug-github-issue | GitHub issue created (#845) |
| 2026-11-05 | In Progress | develop-bug | Reproduced; investigation started |
| 2026-11-05 | Ready for QA | develop-bug | Fix implemented + regression tests L1–L3 |
| 2026-11-05 | Ready for QA | develop-bug | Fix verified — bug scenario gone |
| 2026-11-05 | Ready for QA | finalise | DoD verified — bug.20.dod.1.change-log-blank-date-row.md |
| 2026-11-05 | Closed | develop-bug | Fix verified and accepted |

---

## Resolution Summary

**Final Status**: Closed — Fixed
**Total Iterations**: 1
**Time to Resolution**: same day (2026-11-05)
**Final Fix Details**: `rebuildChangeLog` classed a blank-date continuation row with the unparsed rows, which are emitted ahead of all history. It now attaches such a row to the entry row above it, and the two travel together, including through the second-block date sort. Orphan blank-date rows and `| Version | Date | … |` rows behave as before.
**Lessons Learned**: a predicate written to protect unreadable history (`isUnparsedRow`) also caught rows the pipeline writes on purpose. Tests for an order-preserving writer should assert row order, not just row presence. A task document that already carries a blank-date row (task 235) will no longer be reordered on its next write.

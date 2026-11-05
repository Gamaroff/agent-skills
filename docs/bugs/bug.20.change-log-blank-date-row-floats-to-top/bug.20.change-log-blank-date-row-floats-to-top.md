---
type: bug
status: new # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Minor'
priority: 'Low'
created: '2026-11-05'
related: 'none — cross-cutting (no single owner)'
description: 'upsertChangeLog treats a blank-date continuation row as unparsed and moves it above every dated row on the next write, reordering the history'
---

**Bug ID**: bug.20.change-log-blank-date-row-floats-to-top
**Related**: None — cross-cutting bug (no single owner)
**Status**: 🆕 New
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

**Date**: [Date]
**Developer**: [Name]

[Investigation notes, root cause analysis]

#### Fix Implementation (In Progress → Ready for QA)

**Date**: [Date]

**Root Cause**: [Explanation]

**Fix Description**: [What was changed]

**Files Modified**:

- [file1.ts]
- [file2.ts]

**Testing**: [How the fix was tested]

#### QA Verification (Ready for QA → Closed/Reopened)

**Date**: [Date]
**QA Engineer**: [Name]

**Verification Result**: ✅ Fixed | ⚠️ Still Failing

**Notes**: [Testing notes]

**Decision**: Closed | Reopened

---

## Status History

| Date       | Status | Changed By | Notes       |
| ---------- | ------ | ---------- | ----------- |
| 2026-11-05 | New    | Claude     | Bug created |

---

## Resolution Summary

[Will be completed when bug is closed]

**Final Status**: [Closed status]
**Total Iterations**: [Number]
**Time to Resolution**: [Duration]
**Final Fix Details**: [Summary]
**Lessons Learned**: [Key takeaways]

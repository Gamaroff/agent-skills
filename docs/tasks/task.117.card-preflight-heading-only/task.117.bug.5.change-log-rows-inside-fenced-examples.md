# Bug Report: Task 117 - Change Log rows for task.42/43 were appended inside fenced example tables; task.44's row is outside its table

**Task**: [Link](./task.117.card-preflight-heading-only.md)
**Bug ID**: TASK-117-BUG-5
**Severity**: MEDIUM
**Priority**: P1
**Status**: ✅ Closed
**Found By**: QA Engineer (cycle-3 review CR3-2, CR3-3, reproduced)
**Date Found**: 2026-09-17

## Description

Cycle 2 gave task.42, 43 and 44 a Breaking Changes lead sentence and appended a Change Log row to
each. task.42 and task.43 have **no real `## Change Log` section** — they predate it — and the only
`## Change Log` text in each is inside a ```` ```markdown ```` fenced *example* in §3, so the row
went into the spec's own sample table (task.42:185, task.43:150) and the edit itself is unlogged.
task.44 has a real section, but the row was written after a blank line and directly before `---`,
so Markdown renders it as a paragraph turned setext heading, not a table row (task.44:524).

## Expected Behavior

Each document logs the edit in a real, correctly-formed Change Log table; fenced examples are
untouched.

## Actual Behavior

As above.

## Impact

Two spec documents' examples now contain a task.117 row; three edits are effectively unlogged.
The document-change-log spec says adoption is going-forward with no backfill — a document without
the section gets one created "with the four canonical columns" when a writer needs it.

## Recommendation

Remove the rows from the two fenced examples; create a canonical `## Change Log` block in task.42
and task.43 (after `## 11. Rollback Plan`) carrying the 2026-09-17 row; move task.44's row up into
its table. Append rows with a fence-aware writer, not a last-table-row regex.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-09-17 · **Developer**: Claude (qa-fix, pipeline cycle 3)

**Root Cause Analysis**: cycle 2 appended each row after the last `| 20…` table row following the
first `## Change Log` text in the file — a fence-blind search. task.42/43's only such text is inside
a ```` ```markdown ```` example; task.44's real table is followed by a blank line the regex placed
the row after.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-09-17

**Fix Description**: removed the two rows from the fenced examples; created a canonical
`<!-- change-log-start -->` … `## Change Log` … `<!-- change-log-end -->` block after `## 11.
Rollback Plan` in task.42 and task.43 carrying the 2026-09-17 row; moved task.44's row up into its
table directly after the `finalise` row. `change-log.js`'s `findChangeLog` / `extractEntries` now
locate all three.

**Files Modified**: `docs/tasks/task.42.…md`, `docs/tasks/task.43.…md`, `docs/tasks/task.44.…md`

**Testing**: the engine reads each document's section (1 entry in 42/43; the row in 44's table);
prettier clean.

**Verification Steps for QA**: `grep -n 'task.117 corpus check'` in each file lands inside an
unfenced table under `## Change Log`; the fenced examples in task.42 §3 / task.43 §3 carry no
2026-09-17 row.

| Date       | Status       | Changed By | Notes                                 |
| ---------- | ------------ | ---------- | ------------------------------------- |
| 2026-09-17 | New          | QA         | Filed from QA cycle 3                 |
| 2026-09-17 | In Progress  | qa-fix     | Investigation started                 |
| 2026-09-17 | Ready for QA | qa-fix     | Fix implemented, mutation-proven      |
| 2026-09-17 | Closed       | QA         | Verified in QA cycle 4: change-log.js finds a real section in each of task.42/43/44; no row inside a fence |

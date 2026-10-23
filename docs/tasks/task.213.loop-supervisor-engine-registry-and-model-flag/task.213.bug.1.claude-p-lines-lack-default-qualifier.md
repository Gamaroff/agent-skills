# Bug Report: Task 213 - Three `claude -p` lines fail the migration criterion's own search

**Task**: [Link](./task.213.loop-supervisor-engine-registry-and-model-flag.md)
**Bug ID**: TASK-213-BUG-1
**Severity**: MEDIUM
**Priority**: P2
**Status**: ✅ Closed
**Found By**: QA Engineer
**Date Found**: 2026-10-21

## Description

The Migration success criterion is checked with a line-level search:

```text
git grep -n 'claude -p' -- skills/loop-supervisor skills/develop-next docs/reference docs/runbooks
```

It must return "only lines that name `claude -p` as the default engine, not the only one". At head `a31d73ce`, three of the matched lines still say each iteration is `claude -p` with no qualifier on that line. In each file the qualifier appears only in the next sentence:

| File:line | Text on the matched line |
| --- | --- |
| `docs/runbooks/unattended-overnight-runs.md:28` | "spawns **one `claude -p` process per iteration**, each with a fresh" |
| `skills/develop-next/SKILL.md:677` | "`loop-supervisor` spawns one `claude -p` per iteration with a fresh context and a pinned session id," |
| `skills/loop-supervisor/SKILL.md:63` | "2. **Spawn** one `claude -p` with a pinned `--session-id`, `--permission-mode acceptEdits`, and a" |

## Steps to Reproduce

1. Run the search above at head `a31d73ce`.
2. Read lines 28, 677 and 63 of the three files.

## Expected Behavior

Every matched line names `claude -p` as the default engine, for example "by default", or names the alternative on the same line. A reader skimming one line, or a later sweep that uses the same search, should not read it as the only engine.

## Actual Behavior

These three lines read as the only engine. The criterion's own command does not pass as written.

## Impact

The impact is documentation only, with no runtime effect. But a stated success criterion fails as measured, and the next doc sweep that uses the same search cannot tell these lines from stale ones.

## Recommendation

Add "by default" (or the `--engine agy` alternative) to each of the three matched lines, so the qualifier sits on the line itself. Then re-run the search and record its output in the implementation report.

## Developer Fix Cycle

### Iteration 1

#### Investigation (New → In Progress)

**Date**: 2026-10-21

**Root Cause**: During the Step 3 doc sweep, these three sentences got their qualifier as a new sentence, a parenthetical after the claim. A line-level search sees only the line, so the claim itself still read as the only engine.

#### Fix Implementation (In Progress → Ready for QA)

**Date**: 2026-10-21

**Fix Description**: Each matched line now says `claude -p` is the default, on the line itself:

- `docs/runbooks/unattended-overnight-runs.md:28` — "one `claude -p` process per iteration** by default"
- `skills/develop-next/SKILL.md:677` — "one `claude -p` per iteration by default, with a fresh context"
- `skills/loop-supervisor/SKILL.md:63` — "one `claude -p` by default, with a pinned `--session-id`"

**Testing**: The criterion search, filtered to lines carrying neither `by default` nor `agy`, returns 3 lines at `a31d73ce` and 0 after the fix. The 3 at the old head calibrate the filter: it catches the defect it was written for.

**Verification Steps for QA**: Run `git grep -n 'claude -p' -- skills/loop-supervisor skills/develop-next docs/reference docs/runbooks` and read each line.

## Status History

| Date | Status | Changed By | Notes |
| --- | --- | --- | --- |
| 2026-10-21 | New | qa-task | Filed in QA cycle 1 |
| 2026-10-21 | In Progress | qa-fix | Investigation started |
| 2026-10-21 | Ready for QA | qa-fix | Qualifier on all three lines |
| 2026-10-21 | Closed | qa-task | Verified by task.213.qa.2.loop-supervisor-engine-registry-and-model-flag.md |

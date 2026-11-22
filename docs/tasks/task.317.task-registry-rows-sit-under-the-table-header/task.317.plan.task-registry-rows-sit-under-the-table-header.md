---
id: task.317.plan
title: "Implementation Plan: Task registry rows sit under the table header"
type: plan
task-ref: task.317.task-registry-rows-sit-under-the-table-header.md
---

# Implementation Plan: Task registry rows sit under the table header

> Requirements and success criteria: [task.317.task-registry-rows-sit-under-the-table-header.md](task.317.task-registry-rows-sit-under-the-table-header.md)

## Overview

Move the stranded rows under the header in one commit, add a placement test that would have failed on the commit that stranded the first one, and tell the writers where a new row goes.

## Phase-by-Phase Implementation Guide

### Phase 1: Measure and decide

Run the awk measurement from the task's Technical Background. Run `command node shared/resources/registry-tick.js --annotate --file docs/tasks/task.286.qa-fix-step4-guard-looks-beneath-gitlinks/task.286.qa-fix-step4-guard-looks-beneath-gitlinks.md --pr 927 --json` on a **scratch copy** of the registry and confirm `no-cell`. Grep for a reader that indexes the file by line number (`git grep -n 'task-registry' -- scripts shared skills evals | grep -i line`); expect none. Decide the rule: a new row goes directly after the last row of the table.

### Phase 2: Move the rows

**Files to modify:**
- `docs/tasks/task-registry.md` — cut every row line after the first run (the second awk run) and insert it, unchanged and in number order, directly after the last in-table row (row 285 today). Do it with the Edit tool in two steps (insert, then delete the old lines), never a `sed -i` or interpreter script. Count rows before and after with `grep -cE '^\| [0-9]+\s*\|' docs/tasks/task-registry.md` (317 at review time; it must not change, and a row added since raises both counts equally).

**Check:** re-run the awk measurement (one run), the `--annotate` call on a scratch copy (now `annotated`), `task-registry-drift.test.mjs`, and `select-next.mjs --dry-run` (same item as before the move).

### Phase 3: Hold it

**Files to modify:**
- `evals/shared/tests/task-registry-drift.test.mjs` — add one test, or a sibling file if the drift test's single-purpose header says so.
- `skills/create-task/SKILL.md` and `docs/standards/task-registry.md` — one sentence each.

**Exact changes:** the test reads the registry, finds the header line (`| #` … ) and its separator, and asserts that every line matching a registry row (`/^\| \d+\s*\|/`) falls in the unbroken run of table lines that starts at the separator. Include a floor on the row count: assert at least 317 rows (the count at review time; the registry only grows, so the floor is a ratchet and a parser that quietly matched nothing fails it) and a message that names the first stranded row's line. The sentence for the writers: "Insert the new row directly after the last row of the table, never at the end of the file: `registry-tick.js --annotate` finds the notes cell through the row's table header, and a row below the Notes section has none."

Mutation-prove in a scratch copy: move one row below `## Notes` and confirm the new test fails and names it.

## Key Patterns and References

- `findHeader` and the `no-cell` branch: `shared/resources/registry-tick.js:1016` and `:1080`; the headerless-table test at `shared/resources/tests/registry-tick.test.mjs:830`.
- A bundled copy of the create-task prose may exist under a skill's `references/`; run `npm run bundle` and commit what it touches.
- Edit with the Edit tool, never a script.

## Testing Approach

`CI=true node --test evals/shared/tests/task-registry-drift.test.mjs`, the scratch-copy `--annotate` call, the selector dry run before and after, then `npm run test:remote` for `ci:fast`.

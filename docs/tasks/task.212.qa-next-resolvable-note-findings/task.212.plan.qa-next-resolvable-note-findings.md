---
id: task.212.plan
title: "Implementation Plan: qa-next: a note finding can be resolved, with evidence"
type: plan
task-ref: task.212.qa-next-resolvable-note-findings.md
---

# Implementation Plan: qa-next: a note finding can be resolved, with evidence

> Requirements and success criteria: [task.212.qa-next-resolvable-note-findings.md](task.212.qa-next-resolvable-note-findings.md)

## Overview

All code is in `skills/qa-next/scripts/uat-status.mjs`. Line numbers are as of `daf07988`
(obs #57's fix). Re-grep before editing.

## Phase-by-Phase Implementation Guide

### Phase 1: Parse, verify, count

- **`parseFindings` (`:670`).** After computing `link`, match the `filed` cell against
  `/\bresolved (\d{4}-\d{2}-\d{2}) by `([^`]+)`\s*$/`. When it
  matches, add `resolution: { date: m[1], evidence: m[2] }` to the row; when it does not, add **no**
  `resolution` key, so unmarked rows (and `--findings --json`) are byte-identical to today. Validate the date with a round trip
  through `Date` (`bad-date` otherwise). Keep `bug` exactly as today: the evidence is backticked, so
  the link regex never sees it.
- **`loadFindings` (`:723`).** For each finding with a `resolution`:
  - When `f.bug` is set, the reason is `on-a-bug-link`.
  - Evidence matching `/^[0-9a-f]{7,40}$/` is a commit. Run
    `execFileSync("git", ["-C", opts.root, "cat-file", "-e", `${ev}^{commit}`])`. A throw means
    `commit-not-found`; when `git rev-parse --is-inside-work-tree` fails first, the reason is
    `not-a-git-repo`. Use `execFileSync` with an argument array, never a shell.
  - Evidence ending `.md` is a run file. Compare it to `run` (the same registry-relative form):
    - equal → `run-is-self`;
    - not in `listRunFiles(runsDir)` → `run-not-found`;
    - index ≤ the finding's run index → `run-not-later`.
  - Anything else is `bad-evidence`. Set `valid = !reason`.
- **`isOpenFinding` (`:743`).**
  `return f.bug === null ? !(f.resolution && f.resolution.valid) : !BUG_CLOSED.test(f.bugStatus ?? "");`
  Pure, with no I/O.
- **`checkFindings` (`:749`).** Append
  `${f.run} finding ${f.n}: resolution does not hold (${f.resolution.reason}): ${f.resolution.evidence}`
  for every `resolution && !resolution.valid`.
- **`--findings` rendering.** Where the label is built (`cmdFindings`, near `:786`), a note with a valid resolution
  renders `note — resolved <date> by <evidence>`. The summary line's `closed` count already derives
  from `isOpenFinding`.

### Phase 2: The writer

`cmdResolveFinding(opts, runRel, n, by, date)`:

1. Resolve `runRel` against the registry directory. It must be in `listRunFiles`; otherwise exit 4.
2. Read the file and split it into lines. Find the `## Findings` block exactly as `parseFindings`
   does, and in it the line whose `FINDING_ROW` group 1 equals `n`. Exit 4 if there is none.
3. Build the would-be finding object (`parseFindings` on that single row, plus a `resolution` from
   the arguments) and run the **same verification** as `loadFindings`. Factor that verification into
   one function both call. Refuse on any reason (exit 2, printing it).
4. If the cell already carries a resolution:
   - same evidence → print "already resolved" and exit 0, whatever the date (the first date stands);
   - different evidence → exit 2 ("a resolved finding is not re-resolved").
5. Replace the line with the same text, the last cell's trimmed content extended by
   `` — resolved ${date} by `${by}` ``. Keep the cell's original spacing before the closing `|`.
6. Write the file and print the new cell.

Add `--resolve-finding`, `--by` and `--date` to the `OPTIONS` allow-list (`:95`; an unlisted flag is
refused by the unknown-option guard in `dispatch`), the command to `dispatch`, and its usage line to the
header block at `:24`. Preserve a `\r` line ending on the edited row if the file has one.

### Phase 3: Docs

- **`assets/run.template.md` (`:49`).** Extend the **Filed as** sentence with the resolved form,
  "evidence is a commit or a later run, backticked", and "written by `--resolve-finding`".
- **`SKILL.md`**:
  - Step 4.3 gets one sentence: when this run shows an earlier note's subject is gone, resolve it
    with `--resolve-finding <earlier run> <n> --by <this run>`.
  - Step 5 stages every earlier run file this run resolved a finding in, beside the run file itself.
  - § "Never" gets the exception, stated narrowly.
  - § "Running as a loop" says notes now close.
- **`README.md` (`:86`).** Say what counts as closed for a note.
- **`CHANGELOG.md`.** Add an `[Unreleased]` entry under Added.

## Key Patterns and References

- Exit-code conventions follow the existing commands: 2 for refused input, 4 for no such row
  (`--state-init --item`).
- The verification must be the **one** function both `loadFindings` and the writer call. Two copies
  of it would drift, the same way the inline copies in finalise did (task.138).

## Testing Approach

- Use a temporary directory fixture holding a git repository with one commit, a `docs/qa/` registry
  and a `runs/X.1/` tree with two dated run files.
- Copy the fixture per test so writer tests never share state.
- For every criterion in § 9 of the task, add one assertion row. While developing, revert each
  criterion's code and confirm its row goes red.

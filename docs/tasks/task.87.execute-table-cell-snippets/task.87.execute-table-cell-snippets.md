---
id: task.87
title: "[Task 87] Shell commands in table cells escape the snippet-execution gate"
type: task
description: "qa-execute-snippets.mjs runs fenced bash blocks under bash and zsh, which is how this repo catches shell-portability defects in prose. Commands written inside markdown table cells are invisible to it. A verification command in a table cell shipped with a zsh false-pass that three QA cycles did not catch."
tags: [qa, tooling, shell-portability, silent-failure]
category: infrastructure
status: ready-for-review
priority: Medium
risk_level: low
created: 2026-09-03
updated: 2026-09-09
assignee:
estimated_effort_hours: 4
github_issue: 364
---

# Technical Task: Shell commands in table cells escape the snippet-execution gate

**Status:** Ready for Review
**GitHub Issue**: [#364](https://github.com/Gamaroff/agent-skills/issues/364)
**Review**: ✅ All review recommendations from `task.87.review.1.execute-table-cell-snippets.md` implemented 2026-09-09

---

## 1. Overview

`shared/resources/qa-execute-snippets.mjs` is this repo's answer to a defect class it has shipped
before: prose that *says* what a command does, never executed, wrong under a shell nobody ran it in.
It extracts fenced ` ```bash ` blocks and runs them under **both bash and zsh**.

It does not see commands written **inside markdown table cells** — and the resume contract, the
step-file verification tables, and several runbooks put real, runnable commands there.

Task 77 shipped one. `develop-pipeline-resume-contract.md`'s Steps 5–6 verification cell held a
predicate that returned a **false PASS under zsh** whenever its glob matched nothing (a failed zsh
glob aborts the command substitution; zsh's `[` then reads the empty operand in `-ge` as `0`). It
would have verified a run with no QA artifacts at all as complete. Three QA cycles and a full CI run
did not catch it; a reviewer executing it by hand did.

## 2. Motivation

The instrument exists and works. The gap is purely one of extraction — and the places table-cell
commands appear are disproportionately *verification* commands, where a false pass is the worst
possible failure mode.

Same session, same defect class, three separate occurrences: a link-check script producing six false
failures, this predicate, and a `rm -f` whose unmatched glob aborted the whole command.

## 3. Technical Background

### Current architecture

`executeFile()` (line ~1262) reads the markdown, calls `extractBlocks(markdown)`, and iterates the
result through `classifyBlock()` → `runBlock()`, accumulating `results`, `findings`, `notes` and a
`counts` object. Everything downstream of extraction is source-agnostic: it consumes
`{ line, code }` and nothing else.

`extractBlocks()` is a line-oriented fence state machine. Its scope is stated in its own contract:
*"Only the `bash` info string is in scope"*. A table row is ordinary content to it — when no fence is
open, the line is dropped.

So the gap is exactly one function wide. There is no classification, execution, sandboxing or
reporting change required: a table-cell command that reaches `classifyBlock()` is already handled
correctly by the allow-list, the placeholder detector and the dual-shell comparison.

### Target architecture

A second extractor, `extractTableCellCommands(markdown)`, emits blocks in the same shape plus an
`origin` discriminator. `executeFile()` merges the two streams in line order. Every block carries
`origin: "fence" | "table-cell"` so a finding names where it came from.

### Two properties of table cells that fenced blocks do not have

1. **`|` is escaped as `\|` inside a cell.** `gh pr view {PR} --comments --json comments \| grep -i "QA"`
   is a pipeline whose pipe is escaped for the markdown table. Executed verbatim, `\|` is a literal
   argument and the command means something else entirely. Unescaping is mandatory, not cosmetic.
2. **A cell holds several independent commands.** The real cells join two or three backticked spans
   with prose (`… AND … AND …`). Each span is its own unit of execution; concatenating a cell into one
   script would run prose as shell.

### Why the extraction is restricted to command columns

Backticked spans in table cells are overwhelmingly *not* commands — they are field names, statuses,
file globs, frontmatter keys, verdict tokens (`PASS`, `APPROVE`, `accepted`). Feeding all of them to
the classifier would produce a flood of `unrecognised-command (fail-closed)` refusals and push most
documents into the `no-executable-blocks` state, which is precisely the "noise trains reviewers to
ignore it" failure the rule doc argues against. The column header is the available signal that a cell
is meant to be run.

## 4. Scope

### In Scope

- Extend the extractor to recognise commands in table cells — backtick-delimited spans in a cell of a
  table whose header names a command column, or a documented explicit marker.
- Classify and execute them under the existing safety rules (the allow-list, the temp working copy —
  unchanged).
- Report them in the same finding shape; a table-cell command that disagrees between shells is a
  `category: bug` finding exactly as a fenced one is.
- Carry an `origin` field through `results[]` and the human-readable report so a finding is traceable
  to its source construct.

### Out of Scope

- Changing the safety allow-list or the mutating/placeholder classification.
- Rewriting existing table-cell commands into fenced blocks — that is a follow-on cleanup once the
  gate can see them.
- Extracting from any other non-fenced construct (block quotes, definition lists, HTML tables).
- Triaging the findings the new extractor surfaces across the existing corpus. Phase 4 *measures* that
  surface and records it; acting on it belongs to a follow-on task.

## 5. Breaking Changes

None to the CLI contract: `--file`, `--bind`, `--copy`, `--timeout`, `--no-zsh`, `--json` and the
three exit codes are unchanged.

**One behavioural change is intended and is the whole point of the task**: a document that contains a
table-cell command column now has a higher `blocks` count and may report findings where it previously
reported none. That is a true positive being surfaced for the first time, not a regression. See §10 for
how the corpus-wide surface is measured before merge.

## 6. Implementation Plan

### Phase 1 — Table-cell extraction (Risk: Low)

**Files**

- `shared/resources/qa-execute-snippets.mjs`

**Changes**

- [x] Add `export function extractTableCellCommands(markdown)`. Walk lines; recognise a table as a
      header row followed by a delimiter row (`| --- | :--- |` etc.). Anything else is not a table.
- [x] Identify **command columns** from the header row: a header cell matching `/\bcommands?\b/i`.
      Record the column index (or indices — a table may have more than one).
- [x] Split each row on **unescaped** `|` only — a `|` not preceded by a backslash. Splitting on bare
      `|` is the first thing that breaks on the real cells.
- [x] In each command-column cell, unescape `\|` → `|` (and `\\` → `\`) **before** extracting spans.
- [x] Extract every backtick-delimited span in the cell, honouring multi-backtick delimiters
      (``` `` `code` `` ```) so a span containing a backtick is not truncated.
- [x] Emit one block per span: `{ line, code, origin: "table-cell", column }`, where `line` is the
      1-based line number of the table row.
- [x] Skip a span that cannot be a command at all — empty after trimming, or with no character that
      could start a command name. This is noise reduction, not a safety boundary: the allow-list
      remains the boundary and anything that *could* be a command still classifies normally.

**Dependencies**: none.

### Phase 2 — Wire into `executeFile` (Risk: Low)

**Files**

- `shared/resources/qa-execute-snippets.mjs`

**Changes**

- [x] Add `origin: "fence"` to every block `extractBlocks()` pushes.
- [x] In `executeFile()`, replace `const blocks = extractBlocks(markdown)` with the merge of both
      extractors, sorted by `line` so report order still follows document order.
- [x] Carry `origin` into `results.push({...})` in **both** the skipped branch and the executed
      branch — a finding that does not name its origin is not traceable back to a table cell.
- [x] Update `render()` to annotate a table-cell result (e.g. `line 82 (table cell)`), so the
      human-readable report distinguishes the two.
- [x] Leave `counts`, the `zero-blocks-executed` finding and the `no-executable-blocks` note logic
      untouched — they consume `blocks.length` and `counts` and need no change.

**Dependencies**: Phase 1.

### Phase 3 — Tests and mutation proof (Risk: Low)

**Files**

- `shared/resources/tests/qa-execute-snippets.test.mjs`

**Changes**

- [x] Extraction tests for `extractTableCellCommands()`: command column recognised by header;
      non-command columns ignored; a table with no command column yields zero blocks; a
      header-without-delimiter-row is not a table; `\|` unescaped; multiple spans in one cell yield
      multiple blocks; multi-backtick span not truncated; correct 1-based `line`.
- [x] Negative test: a document with **no** tables produces byte-identical output to the pre-change
      engine (same `blocks`, `counts`, `findings`, `notes`).
- [x] **Mutation proof** — a fixture table whose command column holds the task-77 predicate verbatim:

      ```
      G=$(ls *.gate.*.yml | sed -E 's/.*\.gate\.([0-9]+)\..*/\1/' | sort -n | tail -1); R=$(ls *.pr-review.*.md 2>/dev/null | sed -E 's/.*\.pr-review\.([0-9]+)\..*/\1/' | sort -n | tail -1); [ "${R:-0}" -ge "$G" ]
      ```

      Asserted to produce a shell-disagreement finding. The disagreement is already verified
      independently of this engine: in an empty directory `bash` exits 2 and `zsh` exits 0.
- [x] Revert Phase 1's extractor and confirm the mutation-proof test goes **red**; restore and confirm
      green. Record both results in the implementation report.

**Dependencies**: Phases 1–2.

### Phase 4 — Rule doc, bundle, corpus measurement (Risk: Low)

**Files**

- `shared/resources/qa-runnable-prose-detection.md`
- generated: `skills/*/references/qa-execute-snippets.mjs`, `skills/*/references/qa-runnable-prose-detection.md`

**Changes**

- [x] Extend §1 of the rule doc: table-cell command columns are in scope, with the two cell-specific
      properties (pipe escaping, one span per command) and the column-restriction rationale.
- [x] Run `npm run bundle` to propagate both files into every skill's `references/`. Commit the result
      — never hand-edit a bundled copy.
- [x] Run the gate over the corpus and record the new surface (files newly reporting findings, and
      their kinds) in the implementation report. This is a **measurement**, not a triage: acting on the
      findings is out of scope per §4.
- [x] `npm run ci` green.

**Dependencies**: Phases 1–3.

## 7. Files Summary

### Modify

- `shared/resources/qa-execute-snippets.mjs` — new extractor, `origin` field, merged block stream,
  `render()` annotation
- `shared/resources/tests/qa-execute-snippets.test.mjs` — extraction, regression and mutation-proof tests
- `shared/resources/qa-runnable-prose-detection.md` — §1 scope extended

### Add

- none

### Delete

- none

### Generated (via `npm run bundle`, committed)

- `skills/*/references/qa-execute-snippets.mjs`
- `skills/*/references/qa-runnable-prose-detection.md`

## 8. Testing Strategy

### Unit — `extractTableCellCommands()`

Pure function, no filesystem, no shell. Table recognition (delimiter row required), command-column
detection, unescaped-pipe splitting, `\|` unescaping, multi-span cells, multi-backtick spans, `line`
correctness, and the not-a-command skip.

### Regression — fenced blocks unchanged

The existing suite is the regression suite and must pass unmodified. Plus one explicit assertion: on a
document with no tables, the full report object is byte-identical to the pre-change engine's.

### Integration — end-to-end through `executeFile()`

A fixture document with one command-column table: assert the table-cell command is extracted,
classified, executed under both shells, and that `origin` reaches `results[]` and the rendered report.

### Mutation proof

The task-77 predicate, verbatim, in a command cell → a shell-disagreement finding. Reverting the
extractor must turn that test red. This is the criterion that distinguishes "the code is present" from
"the check fires", and it is required, not optional.

### Full gate

`npm run ci` — including `eval:all` and `prettier --check`, which the fast tier does not run.

## 9. Success Criteria

- [x] A table-cell command is extracted, classified, and executed under both shells
- [x] The task-77 predicate, restored verbatim, is reported as a shell-disagreement finding (mutation
      proof: reverting the extractor turns that test red)
- [x] No change in behaviour for fenced blocks — on a document with **no table-cell command column**,
      `blocks`, `counts`, `findings` and `notes` are identical to the pre-change engine
- [x] `\|` in a command cell is unescaped before execution, and each backticked span in a cell is one
      unit of execution
- [x] `origin` (`fence` / `table-cell`) is present on every `results[]` entry and visible in the
      rendered report
- [x] `zero-blocks-executed` still fires when nothing runs
- [x] The corpus-wide finding surface introduced by the change is measured and recorded in the
      implementation report
- [x] Full `npm run ci` green

## 10. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
| ---- | ---------- | ------ | ---------- |
| The extractor surfaces genuine findings across the existing corpus, and a QA gate that previously passed now fails on unrelated documents | **High** — this is the intended effect | Medium — could block unrelated PRs | Restrict to command columns (smallest useful surface); Phase 4 measures the surface before merge and records it; triage is an explicit follow-on, so a large surface becomes a scheduling decision rather than a surprise |
| Over-extraction: non-command backticked spans reach the classifier and flood the report with `unrecognised-command` refusals | Low | Medium — noise, which is how a check becomes ignored | Column restriction plus the not-a-command skip; the "no tables → identical output" test bounds the blast radius for every document without a command column |
| `\|` unescaping is wrong, producing a *false* shell disagreement | Low | High — a false positive in the instrument that exists to catch false negatives | Dedicated unit tests on the real cell text from `develop-pipeline-resume-contract.md`, not a synthetic sample |
| A table-cell command is destructive and the allow-list lets it through | Very low | High | No change to the allow-list, the sandbox or the temp working copy — the safety boundary is untouched and is already fail-closed |
| Bundled copies drift from `shared/resources/` | Low | Medium — a fix that appears to work and silently reverts | `npm run bundle` is a Phase 4 checklist item; only the `shared/resources/` sources are edited |

## 11. Rollback Plan

**Trigger**: the corpus measurement in Phase 4 shows an unmanageable finding surface, or a false
shell-disagreement is traced to the new extractor.

**Procedure**: revert the commit and re-run `npm run bundle`. The change is purely additive — a second
extractor whose output is merged, plus one new field — so reverting restores fenced-only extraction
exactly. No data migration, no config change, no consumer coordination.

**Verification**: `npm run ci` green, and the gate's report on any file with a command-column table
returns to its pre-change `blocks` count.

**Estimated rollback time**: under 10 minutes.

## Change Log

| Date       | Version | Description                               | Author       |
| ---------- | ------- | ----------------------------------------- | ------------ |
| 2026-09-03 | 1.0     | Filed from task 77 QA cycle 3 (TASK77-019) | develop-task |
| 2026-09-09 | 1.1     | Review passed (8/10) — added Technical Background, Implementation Plan (4 phases), Files Summary, Testing Strategy, Risk Assessment, Rollback Plan and Progress Tracking; linked GitHub issue #364; clarified success criterion 3 and scoped corpus triage out | review-task |
| 2026-09-09 |         | Status → ready-for-development             | review-task |
| 2026-09-09 |         | Implemented — 3 files (+6 bundled copies), 19 tests added (117 total), 3-way mutation proof, corpus measured: 4 files / 42 new blocks / 0 new findings | develop |
| 2026-09-09 |         | Status → ready-for-review                  | develop |

## Progress Tracking

- [x] Phase 1 — Table-cell extraction
- [x] Phase 2 — Wire into `executeFile`
- [x] Phase 3 — Tests and mutation proof
- [x] Phase 4 — Rule doc, bundle, corpus measurement

## References

- Origin: `docs/tasks/task.77.review-pr-in-pipeline/task.77.gate.3.review-pr-in-pipeline.yml` — TASK77-019
- The engine: `shared/resources/qa-execute-snippets.mjs`
- The rule it implements: `shared/resources/qa-runnable-prose-detection.md`
- Prior art: task 66's zsh glob defect, and task 67 which built the execution gate
- The predicate's history: `git log -S'-ge' -- shared/resources/develop-pipeline-resume-contract.md`

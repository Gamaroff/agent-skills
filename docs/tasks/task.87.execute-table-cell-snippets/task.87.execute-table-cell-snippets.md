---
id: task.87
title: "[Task 87] Shell commands in table cells escape the snippet-execution gate"
type: task
description: "qa-execute-snippets.mjs runs fenced bash blocks under bash and zsh, which is how this repo catches shell-portability defects in prose. Commands written inside markdown table cells are invisible to it. A verification command in a table cell shipped with a zsh false-pass that three QA cycles did not catch."
tags: [qa, tooling, shell-portability, silent-failure]
category: infrastructure
status: draft
priority: Medium
risk_level: low
created: 2026-09-03
updated: 2026-09-03
assignee:
estimated_effort_hours: 4
---

# Technical Task: Shell commands in table cells escape the snippet-execution gate

**Status:** Draft

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

## 3. Scope

### In Scope

- Extend the extractor to recognise commands in table cells — backtick-delimited spans in a cell of a
  table whose header names a command column, or a documented explicit marker.
- Classify and execute them under the existing safety rules (the allow-list, the temp working copy —
  unchanged).
- Report them in the same finding shape; a table-cell command that disagrees between shells is a
  `category: bug` finding exactly as a fenced one is.

### Out of Scope

- Changing the safety allow-list or the mutating/placeholder classification.
- Rewriting existing table-cell commands into fenced blocks — that is a follow-on cleanup once the
  gate can see them.

## 4. Success Criteria

- [ ] A table-cell command is extracted, classified, and executed under both shells
- [ ] The task-77 predicate, restored verbatim, is reported as a shell-disagreement finding (mutation proof)
- [ ] No change in behaviour for fenced blocks — existing findings and counts unchanged
- [ ] `zero-blocks-executed` still fires when nothing runs
- [ ] Full `npm run ci` green

## 5. References

- Origin: `docs/tasks/task.77.review-pr-in-pipeline/task.77.gate.3.review-pr-in-pipeline.yml` — TASK77-019
- The engine: `shared/resources/qa-execute-snippets.mjs`
- The rule it implements: `shared/resources/qa-runnable-prose-detection.md`
- Prior art: task 66's zsh glob defect, and task 67 which built the execution gate

## Change Log

| Date       | Version | Description                               | Author       |
| ---------- | ------- | ----------------------------------------- | ------------ |
| 2026-09-03 | 1.0     | Filed from task 77 QA cycle 3 (TASK77-019) | develop-task |

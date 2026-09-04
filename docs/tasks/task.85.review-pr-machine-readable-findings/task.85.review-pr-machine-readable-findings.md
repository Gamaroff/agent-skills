---
id: task.85
title: "[Task 85] Give /review-pr a machine-readable findings block"
type: task
description: "The qa-fix ingester parses /review-pr's rendered three-line finding format by prose description. That contract is the sole carrier of findings on the Step 5c REQUEST CHANGES path, and it currently rests on an LLM matching a format described in another file. Emit a structured findings block so the path is deterministic."
tags: [review-pr, qa-fix, pipeline, contracts]
category: infrastructure
status: draft
priority: Medium
risk_level: low
created: 2026-09-03
updated: 2026-09-03
assignee:
estimated_effort_hours: 4
---

# Technical Task: Give `/review-pr` a machine-readable findings block

**Status:** Draft

---

## 1. Overview

Task 77 wired `/review-pr` into the develop pipelines as Step 5c. On a `REQUEST CHANGES` verdict the
run returns to `/qa-fix`, and because 5c only runs on a gate that already reads `PASS`, the **PR
review report is the only artifact carrying that cycle's findings** — there are no gate `top_issues`
to travel in.

Task 77 made the ingester parse that report. It does so by **prose description of a rendered
format**: `[PC-1] coverage · high · confidence: high — AC-3`, finding on the next line, action after
a `→`. That works, but it is two files agreeing about a text shape, and task 77's own QA found them
already disagreeing once — the ingester originally described the *subagent YAML* field names
(`severity:`, `file:line`), which are consumed in memory and never written to disk.

A test now pins the two together, so they cannot drift silently. This task removes the need for that
pin by making the data structured.

## 2. Motivation

- The rendered format is for humans; the ingester is a machine consumer of the same file.
- `ref` is polymorphic — a `file:line` for code findings, an `AC-3` or a filename for conformance
  findings — so no single positional parse is reliable.
- The failure is **silent**: a parse miss means qa-fix ingests nothing, changes nothing, and 5b
  step 0 HALTs reporting the findings as *unfixable* when they were never delivered.

## 3. Scope

### In Scope

- `/review-pr` Step 7 emits a fenced `findings:` YAML block alongside the rendered text
  (`id`, `category`, `severity`, `confidence`, `ref`, `finding`, `suggested_action`).
- The ingester reads the block when present and falls back to the rendered parse when absent
  (reports written before this lands must still work).
- Update the pin in `evals/shared/tests/pr-review-loop-parity.test.mjs`.

### Out of Scope

- Changing the rendered human-facing format — it stays exactly as it is.
- Any change to verdict semantics or Step 5c routing.

## 4. Success Criteria

- [ ] A `/review-pr` report carries both the rendered findings and a structured block
- [ ] The ingester prefers the structured block and still parses legacy reports
- [ ] `docs/tasks/task.66.review-pr/task.66.pr-review.1.review-pr.md` (a real legacy report) still parses
- [ ] `/review-pr`'s advisory contract is unchanged — no gate, no formal review, no code edits
- [ ] Full `npm run ci` green

## 5. References

- Origin: `docs/tasks/task.77.review-pr-in-pipeline/task.77.gate.3.review-pr-in-pipeline.yml` — TASK77-022
- The contract: `shared/resources/qa-findings-ingester-prompt.md`, "From the PR review report"
- The renderer: `skills/review-pr/SKILL.md` Step 6/7

## Change Log

| Date       | Version | Description                                        | Author      |
| ---------- | ------- | -------------------------------------------------- | ----------- |
| 2026-09-03 | 1.0     | Filed from task 77 QA cycle 3 (TASK77-022)          | develop-task |

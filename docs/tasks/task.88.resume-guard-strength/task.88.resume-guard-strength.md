---
id: task.88
title: "[Task 88] The resume sub-state guard is pinned by mutations that do not discriminate it"
type: task
description: "The parity test guarding the resume sub-state table parses rows and keys on the first cell, but every mutation published as proving it fires the row-count canary rather than the keying — a row-counting guard would produce a byte-identical matrix. Three gaps behind that: the action cell is a mention-match rather than a re-entry check, per-value routing survives a merged key with decoy padding, and the published matrix cannot tell the two mechanisms apart."
tags: [evals, test-strength, pipeline, resume-contract]
category: infrastructure
status: draft
priority: Medium
risk_level: low
created: 2026-09-03
updated: 2026-09-03
assignee:
estimated_effort_hours: 3
---

# Technical Task: The resume sub-state guard is pinned by mutations that do not discriminate it

**Status:** Draft

---

## 1. Overview

`evals/shared/tests/pr-review-loop-parity.test.mjs` guards the `**PR Review**` resume sub-state
table in `shared/resources/develop-pipeline-resume-contract.md`. Its third implementation parses
the table into rows and keys on the **first cell**, so a value mentioned in another row's prose no
longer satisfies it. That mechanism is correct.

What is not established is that the published proof *demonstrates* it. Raised as CY8-3, CY8-4 and
CY8-5 by the independent gate 8 on task 77 (`task.77.gate.8.review-pr-in-pipeline.yml`), which
executed 27 mutations to find them. None of the three makes any statement in the task-77 trail
untrue — they are gaps in guard strength, deliberately deferred rather than fixed inside a run that
had already reached Loop Escalation.

## 2. The three gaps

**CY8-3 — the matrix does not discriminate the mechanism.** All four published row-deletion
mutations fire the `subStateRows.length >= 5` canary, not the keying assertion. A guard that merely
counted rows would produce a byte-identical mutation matrix, so the matrix does not evidence the
property it is cited for. Gate 8's own mutations 18 and 19 — delete a row *and* add a decoy so the
count holds — do fire the keying, and are the shape the published proof should have.

**CY8-4 — the action cell is a mention-match, not a re-entry check.** The assertion is
`/\b5[abc]\b|Step 7|escalat/i` against the action cell. Gate 8's mutation 20 replaced an action with
`n/a — nothing to do here; see the 5c notes above` and the suite stayed green: the string contains
`5c`. Three artifacts describe this assertion as requiring the row to *name where the run resumes*,
which is stronger than what it tests.

**CY8-5 — per-value routing is destroyable with the suite green.** Gate 8's mutation 21 merged all
four values into a single key and padded the table with decoy rows; the suite passed. Each value
having a row is asserted; each value having *its own* row, with *its own* action, is not.

## 3. Scope

In scope:

- Replace the published mutation matrix with one that discriminates keying from counting
  (delete-plus-decoy, per the gate's mutations 18/19), in the test's own comment and wherever the
  matrix is restated.
- Make the action assertion test what it claims: an action must name a re-entry **destination**,
  not merely contain a substring that looks like one.
- Assert one row per value — reject a merged key carrying several values.
- Re-derive the claim wording in any artifact that describes the guard, so the description matches
  the assertion.

Out of scope:

- The resume contract's content. The table itself is correct; this is about what pins it.
- Re-opening any task-77 finding. Gate 8 recorded CY5-4 and CY7-1 as closed.

## 4. Success Criteria

- [ ] Deleting any single row while holding the row count constant turns the suite red, naming the value.
- [ ] An action cell that mentions a step name without stating a re-entry turns the suite red.
- [ ] Merging two values into one key turns the suite red.
- [ ] Every mutation asserted in prose is executed and its result recorded, including any that do not hold.
- [ ] `npm run ci` exits 0.

## 5. References

- `evals/shared/tests/pr-review-loop-parity.test.mjs`
- `shared/resources/develop-pipeline-resume-contract.md`
- `docs/tasks/task.77.review-pr-in-pipeline/task.77.gate.8.review-pr-in-pipeline.yml` — CY8-3/4/5, and the 27-mutation table
- `docs/tasks/task.77.review-pr-in-pipeline/task.77.qa.8.review-pr-in-pipeline.md`

## Change Log

| Date       | Version | Description                                                      | Author      |
| ---------- | ------- | ---------------------------------------------------------------- | ----------- |
| 2026-09-03 | 1.0     | Filed from task 77's gate 8 (CY8-3/4/5), deferred by operator decision rather than fixed in an escalated run | create-task |

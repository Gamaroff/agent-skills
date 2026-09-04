---
id: task.89
title: "[Task 89] Lint for prose-matching assertions that claim a relationship but test only co-occurrence"
type: task
description: "Six times in one task, an assertion claimed a relationship — X routes to Y, X fires at Y, X owns Y — while testing only that both names appear somewhere in the haystack. Each passed on the exact regression it named, on six different surfaces, twice inside the fix for the previous instance. Add a lint that flags the shape so the seventh is caught by CI rather than by a reviewer."
tags: [evals, test-strength, lint, static-analysis]
category: infrastructure
status: draft
priority: High
risk_level: low
created: 2026-09-04
updated: 2026-09-04
assignee: TBD
estimated_effort_hours: 6
---

# Technical Task: Lint for prose-matching assertions that claim a relationship but test only co-occurrence

**Status:** Draft

---

## 1. Overview

Task 77 produced **six instances of one bug class** across eleven independent gates. In each, a test
asserted a *relationship* — `REQUEST CHANGES` routes to `5b`, `ready-for-merge` fires at `5c`, this
row owns that action — while the assertion only established that both names occur in the same slice
of prose. Every one passed against the mutation it was written to catch.

They were found one at a time, by adversarial reviewers, over roughly a dozen review cycles. **Two of
the six were introduced by the fix for the previous instance.** The pattern is not carelessness; it
is what a regex over documentation looks like when the property under test is a mapping.

## 2. The six instances, as the corpus to test a lint against

| # | Surface | The assertion | Why it passed the regression |
| --- | --- | --- | --- |
| 1 | Resume sub-state table | `resume.includes(v)` over the whole file | The artifact-table sentences at `:82`/`:92` name every value in passing |
| 2 | Same, narrowed to the table | `subState.includes(v)` | `` `not reached` `` appears inside the `pending` row's own prose |
| 3 | 5c verdict table | `/\|[^\|\n]*REQUEST CHANGES[^\|\n]*\|[^\|\n]*5b[^\|\n]*\|/` | The action cell contains "5b's step 7 increments it", so `5b` is present wherever the row routes |
| 4 | Resume table, per-value | destination asserted for 4 of 5 values | The terminal `APPROVE`/`CONCERNS` exit arm was omitted while the comment claimed "each is asserted specifically" |
| 5 | `ready-for-merge` placement | `indexOf(stage) > indexOf("### 5c.")` | Ordering, not containment — satisfied by any position after 5c begins, including Loop Escalation |
| 6 | The fix for #5 | `/--stage ready-for-merge/` | A **prefix** of `--stage ready-for-merge-RELOCATED`, so a renamed call satisfied it |

Instance 6 is the sharpest: it appeared *inside the fix for instance 5*, in the same edit, and needed
a negative lookahead.

## 3. Scope

In scope:

- A lint over `evals/**/*.test.mjs`, `tests/**/*.test.js` and `skills/*/tests/*.test.js` that flags
  assertions matching the **shape**: a `match`/`includes`/`doesNotMatch` whose pattern contains two
  or more domain identifiers, or whose assertion *message* claims a relationship verb (routes,
  fires, owns, sits inside, points at, maps to, resumes at) while the pattern is a substring or
  co-occurrence test.
- A suggested-replacement note: parse the structure (table → rows → cells) and key on the cell that
  carries the relationship, which is the mechanism that survived attack in task 77.
- **Substring-prefix detection**: flag a bare `includes`/`match` on a token that is a prefix of
  another token appearing in the same corpus (instance 6).
- Validation against all six instances above, reconstructed from git history as fixtures.

Out of scope:

- Rewriting existing assertions beyond what validation requires.
- Any change to pipeline behaviour.

## 4. Success Criteria

- [ ] The lint flags all six historical instances, reconstructed as fixtures from the commits named in §2.
- [ ] It does **not** flag the mechanisms that survived attack — the parsed-row keying in `pr-review-loop-parity.test.mjs`, and `advance-pipeline-lock.test.sh`, which gate 11 verified is a real mapping check because it *runs* the script and asserts the resulting step.
- [ ] False-positive rate measured against the current suite and reported, not assumed.
- [ ] Runs in `npm run ci`.
- [ ] `npm run ci` exits 0.

## 5. References

- `evals/shared/tests/pr-review-loop-parity.test.mjs` — all six instances and their fixes
- `docs/tasks/task.77.review-pr-in-pipeline/task.77.gate.{10,11}.review-pr-in-pipeline.yml` — CY10-1 and CY11-1, the two found by adversarial mutation
- `docs/tasks/task.77.review-pr-in-pipeline/task.77.qa.11.review-pr-in-pipeline.md` — the 71-mutation table
- `shared/resources/mutation-proving.md`

## Change Log

| Date       | Version | Description                                                      | Author      |
| ---------- | ------- | ---------------------------------------------------------------- | ----------- |
| 2026-09-04 | 1.0     | Filed from task 77's retrospective — six instances of one bug class across eleven gates | create-task |

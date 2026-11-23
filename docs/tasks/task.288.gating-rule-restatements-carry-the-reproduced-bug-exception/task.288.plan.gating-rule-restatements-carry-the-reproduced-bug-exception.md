---
id: task.288.plan
title: "Implementation Plan: Gating-rule restatements carry the reproduced-bug exception"
type: plan
task-ref: task.288.gating-rule-restatements-carry-the-reproduced-bug-exception.md
---

# Implementation Plan: Gating-rule restatements carry the reproduced-bug exception

> Requirements and success criteria: [task.288.gating-rule-restatements-carry-the-reproduced-bug-exception.md](task.288.gating-rule-restatements-carry-the-reproduced-bug-exception.md)

## Overview

Reword five lines, decide four more, and add one source-reading test whose population comes from `git ls-files`.

## Phase-by-Phase Implementation Guide

### Phase 1: Reword the carried residues

**Files to modify:**

- `shared/resources/code-review-prompt.md` (`:96` at review) — the `## Discipline` bullet ("set confidence: low (it will not gate) rather than inflating severity"). New text: "set confidence: low (it will not gate on the reviewer claim alone) rather than inflating severity".
- `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md` — the four report-template lines. Replace "advisory unless the doc opted in via `code_review_blocking: true` or QA reproduced the finding (5d)" and the "advisory unless the doc/story opted in via code_review_blocking or QA reproduced the finding (5d)" variants with "advisory unless blocking resolves to true (run-level arg or frontmatter) or QA reproduced the finding (5d)". Find them with `git grep -n -i "advisory unless" -- skills/qa-task/SKILL.md skills/qa-story/SKILL.md`: the `-i` is required, because two of the four lines open with a capital "Advisory unless" (a case-sensitive grep finds two). That search also returns `qa-task:51` and `qa-story:90`, which already carry the run-level argument and the 5d exception and are not rewritten: the four to reword are the lines that sit inside a report template (`{From Step 3b — …}`, `[From Phase 1.6 — …]`, `{Top correctness bugs …}`, `[Top correctness bugs …]`). Re-measured at review: `qa-task:1633`, `:1953`; `qa-story:1867`, `:2495`.

### Phase 2: Other restatements

Read each in context, then reword or exempt:

- `skills/review-code/SKILL.md` ("so high-confidence bugs gate the build"): append "(a bug QA reproduces gates at any confidence; see § Opt-in to blocking in `code-review-prompt.md`)". `review-code` runs standalone, so confirm the sentence is about the pipeline loop before editing.
- `qa-runnable-prose-detection.md:683` and `qa-task/SKILL.md:1050-1051` (the phrase wraps across two lines in both, so a per-line grep misses it) say an execution failure is eligible under `code_review_blocking` like any `category: bug` finding. That is true of the claim path and of the reproduced path, so the sentence is not wrong; decide whether a pointer is cheaper than an exemption.
- `pr-conformance-prompt.md:193` describes another file's mapping; a pointer to the section is enough.
- `qa-docs-only-review-prompt.md:59` reads `confidence: low (it will not gate)`. It is a lens prompt that reports claims about a diff and writes no gate, so the exception does not apply to it; key (C) matches it, so exempt it in the test with that reason. (`pr-conformance-prompt.md:113` reads "it will not drive the verdict" and no key matches it.)

Record each decision in the implementation report's Decisions Log.

### Phase 3: The test

`evals/shared/tests/gating-rule-restatements.test.mjs`, in the shape of `qa-loop-ends-on-a-gate.test.mjs` (a header comment stating the defect, the keys and the mutation proof; `SOURCE_ROOT` env override for the proof).

```js
// population: git ls-files 'skills/*/SKILL.md' 'shared/resources/*.md', minus shared/resources/tests/
// unit: a sentence of prose or of a template fence (info string markdown/md/text/none); code fences and tables are skipped.
//       Skipping every fence would blind the test to the lines it holds: CR-5 and the four CR-6 lines are inside fences.
// keys: (A) flag name + gating word; (B) high-confidence + gating word; (C) "will not gate"
// carries: /\b5d\b|reproduc|item 4|Opt-in to blocking|resolution matrix/i
// CR-6 shape: a sentence matching /advisory unless/ and the flag name must also match /run-level|CODE_REVIEW_BLOCKING_ARG|blocking resolves/
```

- Floor: assert the keyed-sentence count is at least the measured count at implementation time minus a stated slack.
- Exemptions: `{ file, startsWith, reason }`; one assertion that each still matches exactly one sentence.
- Control stated in a comment: a restatement avoiding all three keys is invisible, and the test does not claim otherwise.

## Key Patterns and References

- `evals/shared/tests/qa-loop-ends-on-a-gate.test.mjs` for the shape; `evals/shared/tests/finding-anchors-callers.test.mjs` for a population test with a floor and a reason on every exemption.
- Run the prototype probe first (the command is the task's § 3 definition) and compare its count with the test's.

## Testing Approach

Run the test alone, then each mutation in a scratch worktree (red), then `CI=true npm test` and `npm run bundle -- --check` on the tree.

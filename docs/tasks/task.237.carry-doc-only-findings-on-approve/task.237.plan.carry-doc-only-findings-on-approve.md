---
id: task.237.plan
title: "Implementation Plan: Apply 5c doc-only findings on APPROVE"
type: plan
task-ref: task.237.carry-doc-only-findings-on-approve.md
---

# Implementation Plan: Apply 5c doc-only findings on APPROVE

> Requirements and success criteria: [task.237.carry-doc-only-findings-on-approve.md](task.237.carry-doc-only-findings-on-approve.md)

## Overview

This is a prose change in one shared step doc, plus four restatements and one parity test. The classify and stage blocks are verdict-agnostic and stay byte-identical. Only the instruction that names the verdicts which invoke them changes.

## Phase-by-Phase Implementation Guide

### Phase 1: The rule — `shared/resources/develop-pipeline-step-5-6-qa-loop.md`

**Verdict table, `APPROVE` row** (today `:1464`). Before:

```markdown
| ✅ **APPROVE** | Signal `ready-for-merge`, carry the review into the acceptance commit (below), exit the loop, proceed to Step 7. |
```

After. It carries the same parenthetical as the `CONCERNS` row (`:1463`), word for word, so the parity test can match one clause:

```markdown
| ✅ **APPROVE** | Signal `ready-for-merge`, carry the review into the acceptance commit (below; doc-only findings may be fixed there), exit the loop, proceed to Step 7. |
```

**Carry prose** (`:1496`). Change "Classify on `CONCERNS` before touching anything." to "Classify on `APPROVE` or `CONCERNS` before touching anything." Add one sentence directly after it. It says that an `APPROVE` carries only low findings or none (`/review-pr`'s verdict table), that a doc-only low finding is the cheapest fix the loop can make, and that leaving it means `/finalise`'s docs agent can only halt on it (observation #109, task.179).

**`CARRY_FIXED` sentence** (`:1602`–`:1603`). Before: "On `APPROVE`, or a `CONCERNS` with nothing doc-only, leave `CARRY_FIXED` empty". After: "When the classify block cleared no path, leave `CARRY_FIXED` empty". It is keyed on the classify block's output, which is the only thing the stage block can check.

Do **not** touch the two ```bash fences (`:1511`–`:1595`, `:1605`–`:1650`) or the `#### Carry the review into the acceptance commit` heading prefix. `acceptance-commit-carries-5c.test.mjs` extracts the blocks by that heading.

### Phase 2: The restatements

Re-run the population first and edit every hit:

```bash
grep -rn 'doc-only' shared/resources/*.md skills/*/SKILL.md docs/reference/*.md | grep -i 'concerns\|approve'
grep -n 'CONCERNS. records\|records findings without blocking' skills/develop-*/SKILL.md
```

| Site | Edit |
| --- | --- |
| `shared/resources/develop-pipeline-step-7-finalise.md:147` | "any doc-only `CONCERNS` fixes" → "any doc-only fixes" |
| `skills/finalise/SKILL.md:1491` (6a block comment) | "any doc-only CONCERNS fixes" → "any doc-only fixes" |
| `skills/develop-task/SKILL.md:239`, `skills/develop-story/SKILL.md:252` | "`CONCERNS` records findings without blocking; `APPROVE` exits to Step 7" → "`APPROVE` and `CONCERNS` exit to Step 7, with `CONCERNS` findings recorded rather than blocking; on either, doc-only findings are fixed and ride the acceptance commit" |

`skills/review-pr/SKILL.md:1072` carries the same summary sentence. Edit it too if it is a statement of the pipeline rule, or leave it if it describes only `/review-pr`'s own advisory role. Record the call in the implementation report.

Then run `npm run bundle` followed by `npm run bundle:check`. Never edit a `references/` copy by hand.

### Phase 3: Guard and record

**`evals/shared/tests/pr-review-loop-parity.test.mjs`.** Add one test beside the existing *"APPROVE and CONCERNS exit the loop"* test (`:749`), using the file's `verdictRow(v)` helper (`:655`):

```js
test("APPROVE and CONCERNS both carry doc-only findings into the acceptance commit (task.237)", () => {
  const clause = /doc-only findings may be fixed there/;
  for (const v of ["APPROVE", "CONCERNS"]) {
    assert.match(verdictRow(v), clause,
      `the ${v} row must carry the doc-only clause — an APPROVE carries low findings, and a doc-only one left unfixed halts /finalise (observation #109)`);
  }
});
```

Mutation-prove the test. Delete the parenthetical's `; doc-only findings may be fixed there` from the `APPROVE` row and run the file: it must go red, naming `APPROVE`. Restore the clause, and it must go green. Record both runs in the implementation report.

**`CHANGELOG.md`.** Add a `[Unreleased] › Changed` entry citing `(task 237)`: 5c now applies doc-only findings on `APPROVE` as well as `CONCERNS`.

## Key Patterns and References

- Route assertions read a row's own action cell through `verdictRow`, never "keyword somewhere in the file" (task 89, comments at `pr-review-loop-parity.test.mjs:754`).
- Doc-only is defined once, by `ci.docsOnly.patterns` through `ci-tree-equivalence.js`'s `readConfig` + `isDocsPath`. Do not restate it.
- Shared sources are edited in `shared/resources/`, then bundled. Never edit the bundled copies directly.

## Testing Approach

```bash
command node --test evals/shared/tests/pr-review-loop-parity.test.mjs
command node --test shared/resources/tests/acceptance-commit-carries-5c.test.mjs   # must pass unchanged
npm run bundle:check
npm run ci:fast
```

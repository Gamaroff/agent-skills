---
id: task.166.plan
title: "Implementation Plan: Give measured non-functional criteria a defined path through review and finalise"
type: plan
task-ref: task.166.measured-non-functional-criteria.md
---

# Implementation Plan: Give measured non-functional criteria a defined path through review and finalise

> Requirements and success criteria: [task.166.measured-non-functional-criteria.md](task.166.measured-non-functional-criteria.md)

## Overview

This task adds one bullet and edits two sentences in the finalise AC prompt, adds one rule in review-task's Step 6, and adds two structural pin tests. The pins also cover the obs #204 documentation kind, which shipped untested. Anchors are string identities, not line numbers.

## Phase-by-Phase Implementation Guide

### Phase 1: finalise's AC prompt defines the measured criterion

**`shared/resources/finalise-dod-ac-prompt.md`** § Step 3.

1. Heading sentence: `**Two kinds of criterion may carry \`test_citation: "NOT_APPLICABLE: …"\`, and only these two:**` becomes `**Three kinds of criterion may carry \`test_citation: "NOT_APPLICABLE: …"\`, and only these three:**`.

2. After the documentation-criterion bullet and its sub-bullets, add:

   > - **A measured criterion.** A non-functional bound (a runtime, size, count or rate the
   >   criterion states as a number) whose natural evidence is a measurement, not a per-PR test.
   >   Classify it by what it bounds **and** by whether a per-PR test could assert that bound: if one
   >   could, it is a behaviour criterion and takes the normal path. For a measured criterion:
   >   - `code_citation` is the line of a **committed** artifact that records the measurement and
   >     the command that produced it (typically the implementation report or a QA report).
   >     **Read that line.** `note` states the bound, the measured value and the command.
   >   - `test_citation` is `"NOT_APPLICABLE: measured criterion"`.
   >   - `PASS` when the criterion states a bound, the cited measurement meets it, and the command
   >     is named. `FAIL` when the criterion states no bound ("no measurable change", "fast enough"),
   >     when the measurement is uncited or uncommitted, or when it misses the bound.

3. Closing sentence: "`test_runs_per_pr` is `null` on both kinds: the execution rule reads a test lane, and neither has a test in one. **A behaviour criterion never takes either path.**" becomes "`test_runs_per_pr` is `null` on all three kinds: the execution rule reads a test lane, and none has a test in one. **A behaviour criterion never takes any of these paths**, and a bound a per-PR test could assert is a behaviour criterion." Keep the rest of the paragraph.

4. `npm run bundle` refreshes `skills/finalise/references/finalise-dod-ac-prompt.md`.

### Phase 2: review-task flags an unbounded non-functional criterion

**`skills/review-task/SKILL.md`** § Step 6, check **4. Success Criteria Measurability**. Append:

> - **A non-functional criterion states its bound and how it is measured** (obs #206). A criterion
>   in the Performance subsection, or any criterion that bounds a time, size, count or rate, must
>   name a **numeric bound** and **the command that measures it**. Missing either → **Important**:
>   "state the bound and the command, or replace the criterion with a test that pins it". Finalise's
>   AC agent passes a measured criterion only against a stated bound, so an unbounded one fails at
>   acceptance, two steps after the one edit that would have fixed it. Worked example: task.164's
>   AC7, "No measurable change beyond the new 4b test's three runs", which states no bound.

In the Step 6 **Issues to Flag** list, add under **Important**: "a non-functional criterion with no numeric bound or no stated measurement".

### Phase 3: Pin both rules

**`shared/resources/tests/finalise-dod-ac-kinds.test.mjs`** (new). Use `readDoc` / `ROOT` from `./lib/executed-prose.mjs`.

```js
const SRC = "shared/resources/finalise-dod-ac-prompt.md";
const COPY = "skills/finalise/references/finalise-dod-ac-prompt.md";
const WORDS = { two: 2, three: 3, four: 4, five: 5 };

test("the AC prompt's test-free kinds are counted, defined and each carries its test_citation", () => {
  const doc = readDoc(SRC);
  const head = doc.match(/\*\*(\w+) kinds of criterion may carry `test_citation: "NOT_APPLICABLE: …"`, and only these (\w+):\*\*/);
  assert.ok(head, `${SRC}: no test-free kinds heading sentence`);
  const n = WORDS[head[1].toLowerCase()];
  assert.ok(n >= 3 && n === WORDS[head[2]], `${SRC}: heading states ${head[1]} / ${head[2]}`);
  // The top-level bullets between the heading and the closing `test_runs_per_pr` paragraph.
  const section = doc.slice(head.index, doc.indexOf("`test_runs_per_pr` is `null`", head.index));
  const kinds = [...section.matchAll(/^- \*\*([^*]+)\*\*/gm)].map((m) => m[1]);
  assert.equal(kinds.length, n, `${SRC}: heading says ${n} kinds, ${kinds.length} bulleted: ${kinds}`);
  for (const s of ['"NOT_APPLICABLE: documentation criterion"', '"NOT_APPLICABLE: measured criterion"'])
    assert.ok(section.includes(s), `${SRC}: missing ${s}`);
  const measured = section.slice(section.indexOf("**A measured criterion.**"));
  for (const w of ["bound", "command", "committed", "`FAIL` when the criterion states no bound"])
    assert.ok(measured.includes(w), `${SRC}: the measured kind's bar lacks "${w}"`);
  assert.match(doc, /on all three kinds/);
  assert.match(doc, /never takes any of these paths/);
});

test("the bundled AC prompt matches its source", () => {
  const strip = (s) => s.replace(/^<!-- AUTO-GENERATED[^\n]*\n/m, "");
  assert.equal(strip(readDoc(COPY)), strip(readDoc(SRC)));
});
```

Adjust the bundled-copy comparison to the bundler's exact header handling. If `bundle:check` already asserts equality, keep the test and say in a comment that it duplicates `bundle:check` on purpose, so a local `node --test` run shows the drift.

**`tests/review-task-measured-criterion.test.js`** (new): read `skills/review-task/SKILL.md`, slice check 4 (from `4. **Success Criteria Measurability**` to the next `5. **`), and assert it contains "numeric bound", "the command that measures it" and "**Important**". Assert the Step 6 Issues to Flag list names the finding.

### Phase 4: Proof and gates

| Mutation | Expected |
| --- | --- |
| "Three kinds … only these three" reverted to "Two … two" | AC pin red |
| The measured-criterion bullet deleted | AC pin red (count mismatch) |
| "bound" removed from the measured `PASS` bar | AC pin red |
| The closing sentence reverted to "both kinds" / "either path" | AC pin red |
| The documentation kind's `"NOT_APPLICABLE: documentation criterion"` removed | AC pin red |
| review-task's rule deleted, or `**Important**` changed to `**Optional**` | review-task pin red |

Then run `npm run bundle`, `npm run ci:fast` (with `.agents/skills` moved aside), `npm run bundle:check` and `npm run validate -- skills/finalise/ skills/review-task/`. Add a CHANGELOG `[Unreleased]` › Changed entry citing (task 166). On merge:

```bash
source .agents/skills/observe-work/references/resolve-observation-workspace.sh || exit 1
command node .agents/skills/observe-work/references/observation-log.js set-status --id 206 \
  --status actioned --resolution "task.166: measured-criterion kind in finalise-dod-ac-prompt.md; review-task Step 6 bound rule" --json
```

## Key Patterns and References

- Obs #204's documentation kind (`aece92db`) is the template for how a test-free kind is written: what qualifies, `code_citation`, `test_citation`, and the `PASS`/`FAIL` bar.
- Task.164's `step-8-completion-checklist.test.mjs` shows structural pins that derive their expectations from the text, not typed literals, where possible.

## Testing Approach

- `node --test shared/resources/tests/finalise-dod-ac-kinds.test.mjs tests/review-task-measured-criterion.test.js`
- Mutations per the table, with a `cp` snapshot and a `cmp` restore
- The next finalise run that meets a measured criterion is the behaviour evidence. Record it in the implementation report if the DoD run of this task provides one.

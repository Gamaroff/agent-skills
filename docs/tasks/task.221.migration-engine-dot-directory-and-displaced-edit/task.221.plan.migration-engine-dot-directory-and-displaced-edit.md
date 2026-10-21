---
id: task.221.plan
title: "Implementation Plan: Migration engine: dot-directory references and displaced-block edits"
type: plan
task-ref: task.221.migration-engine-dot-directory-and-displaced-edit.md
---

# Implementation Plan: Migration engine: dot-directory references and displaced-block edits

> Requirements and success criteria: [task.221.migration-engine-dot-directory-and-displaced-edit.md](task.221.migration-engine-dot-directory-and-displaced-edit.md)

## Overview

Two one-condition fixes in `shared/resources/migrate-doc-numbering.mjs`, each test-first. Line
numbers are as of `develop` `47ddcc92`; re-grep the identifier before editing.

## Phase-by-Phase Implementation Guide

### Phase 1: CR-1, dot-directory references

**Files to modify:**

- `shared/resources/tests/migrate-doc-numbering.test.mjs`: new test beside the `:1488` block.
- `shared/resources/migrate-doc-numbering.mjs`: `outsideReferences`, the `forms` line.

**Test first** (red on today's code for the first two rows):

```js
test("task.221 CR-1: outsideReferences compares a dot-directory path at the root", () => {
  const S = [".docs/prd.md"];
  const tokens = (file, text) =>
    m.outsideReferences(file, text, S).map((h) => h.token);
  assert.deepEqual(tokens("scripts/run.sh", "cat .docs/prd.md"), [".docs/prd.md"]);
  assert.deepEqual(tokens("scripts/run.sh", "cat ${ROOT}/.docs/prd.md"), ["/.docs/prd.md"]);
  // Still relative-only: a ./ or ../ token, and a different file.
  assert.deepEqual(tokens("scripts/run.sh", "cat ../.docs/prd.md"), ["../.docs/prd.md"]);
  assert.deepEqual(tokens("scripts/run.sh", "cat ./.docs/prd.md"), []);
  assert.deepEqual(tokens("scripts/run.sh", "cat docs/prd.md"), []);
});
```

`./.docs/prd.md` from `scripts/` names `scripts/.docs/prd.md`, so it must not match. That row is
the control that the `./` branch stays relative-only.

**Exact change** (`:1140`):

```js
// before
const forms = rest.startsWith(".")
// after: only ./ and ../ are relative-only; .docs/… is a name
const forms = /^\.\.?\//.test(rest)
```

### Phase 2: CR-2, displaced-block edit

**Files to modify:**

- `shared/resources/tests/migrate-doc-numbering.test.mjs`: new test beside `:1157`.
- `shared/resources/migrate-doc-numbering.mjs`: `editFrontmatter` (`:897`).

**Test first** (the displaced case is red on today's code):

```js
test("task.221 CR-2: editFrontmatter leaves a displaced or unclosed block alone", () => {
  const edits = [{ key: "prd_number", value: 1, quote: false, insert: true }];
  for (const text of ["\n---\na: 1\n---\nbody\n", "﻿---\na: 1\n---\n", "---\na: 1\nbody\n"])
    assert.equal(m.editFrontmatter(text, edits), text, JSON.stringify(text));
});
```

All three inputs were run before this plan was written. `frontmatterState` reads the BOM row as
`displaced`, and today `editFrontmatter` changes both displaced inputs.

**Exact change:**

```js
export function editFrontmatter(text, edits) {
  const lines = text.split("\n");
  const state = frontmatterState(text);
  if (state === "unclosed" || state === "displaced") return text;
  if (state === "none")
    return [ /* unchanged */ ].join("\n");
  const close = lines.findIndex((l, i) => i > 0 && isFence(l));
  // … unchanged; the `if (close < 0) return text;` line is now unreachable — remove it
```

`close` is `let` today because the insert loop increments it. Keep it `let`.

### Phase 3: Bundle, mutation-prove, record

1. `npm run bundle`, then `npm run bundle:check`.
2. Mutation proof, one fix at a time: revert the predicate → the CR-1 test fails; restore. Revert
   the guard → the CR-2 test fails; restore. Paste each red line into the implementation report.
3. `CHANGELOG.md` `[Unreleased]` → `### Fixed`: one bullet naming `outsideReferences`
   dot-directory paths and `editFrontmatter` on a displaced block (task 221).
4. `npm run ci`.

## Key Patterns and References

- Test rows follow the task.211 style: `test("task.221 …", …)`, and table loops with the input in the
  assertion message.
- Never edit `skills/review-prd/references/migrate-doc-numbering.mjs` by hand; `npm run bundle`
  regenerates it.
- Use `command node`, never bare `node` (nvm shell function).

## Testing Approach

- `command node --test shared/resources/tests/migrate-doc-numbering.test.mjs`. Today it runs 68
  tests; expect 70.
- `command node --test evals/shared/tests/prd-skill-numbering.test.mjs` for the bundled copy.

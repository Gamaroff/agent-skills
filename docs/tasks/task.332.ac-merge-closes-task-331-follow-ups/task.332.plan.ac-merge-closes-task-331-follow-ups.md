---
id: task.332.plan
title: "Implementation Plan: The AC merge closes task 331's follow-ups"
type: plan
task-ref: task.332.ac-merge-closes-task-331-follow-ups.md
---

# Implementation Plan: The AC merge closes task 331's follow-ups

> Requirements and success criteria: [task.332.ac-merge-closes-task-331-follow-ups.md](task.332.ac-merge-closes-task-331-follow-ups.md)

## Overview

Rename two state paths first, then tighten `merge`'s CLI checks in `main()`, then give each refusal
its own Step 3c arm. Line numbers are as of `2da6e3247`. Find each by the quoted text if it has moved.

## Phase-by-Phase Implementation Guide

### Phase 1: Stem-keyed scope and extract files

**Files to modify:**

- `skills/finalise/SKILL.md`
  - Step 3a, `:637`: `RERUN_SCOPE_FILE=".claude/state/finalise-rerun-scope-${STEM}-${DOD_N}.json"`.
    `STEM` is already bound and checked in that block (`:626`, `:629`).
  - Extract block, `:1025`: `tee ".claude/state/finalise-ac-extract-${STEM}-${DOD_N}.json"`. Confirm
    the extract block binds `STEM`. If it does not, bind and check it the way Step 3a does.
  - Step 3c, `:1060` and `:1062`: the same two paths.
  - Grep the rest of the file and `shared/resources/*.md` for any prose that names the old paths:
    `git grep -n 'finalise-rerun-scope-\|finalise-ac-extract-' -- skills shared evals`.
- `evals/shared/tests/finalise-rerun-scope-blocks.test.mjs:305`: the staged scope path takes the
  fixture's stem.

### Phase 2: The engine's refusals

**File:** `shared/resources/finalise-rerun-scope.js`, `main()`, `merge` branch (`:1195-1262`).

Order of checks after the change (each writes nothing):

1. usage: `--doc` missing or `''` → `usage(opts.json, "merge needs --doc: the document this merge is for")`
2. `!s.document` → `scope-document-missing`, message
   `--scope has no document: it predates task 331 — re-run Step 3a`
3. `!sameDocument(cwd, opts.doc, s.document)` → `scope-document-mismatch` (message unchanged)
4. `--sha256` mismatch → `result-hash-mismatch` (unchanged, still before the result checks)
5. `storyFileOf(agentYaml) === null` → `result-document-unnamed`, message
   `--result names no document (ac_traceability.story_file is missing): it is not a complete AC answer`
6. named file does not exist (`!fs.existsSync(path.resolve(cwd, named))`) →
   `result-document-mismatch`, message `--result names ${named}, which does not exist: the answer's
   story_file is wrong — it must be the exact document path`
7. `!sameDocument(cwd, named, s.document)` → `result-document-mismatch` (message unchanged)

A result that does not parse keeps reaching `merge()`, which answers `result-unparseable`. So
`storyFileOf` must tell "unparseable" from "no story_file": have it return `{ parsed: false }` /
`{ named: null }` / `{ named }`, or parse once in `main()`. Step 5 must not fire for an unparseable
result, or `result-unparseable` becomes unreachable and the existing test for it goes red.

`storyFileOf`: read `ac.story_file`, then `parsed.story_file` when `ac !== parsed`.

JSDoc: move the block at `:720-727` ("Enforce a scope on the AC agent's YAML") to sit directly above
`function merge(`.

Update `USAGE` (`:1037`): `--doc <document>` loses its brackets.

**Reversed-decision tests** in `shared/resources/tests/finalise-rerun-scope.test.mjs`:

- `:1873`, `:1895`, `:1982`, `:2000`, `:2095`: add `"--doc", <fixture doc>` to argv, and
  `story_file:` to each result fixture.
- `mergeDocCase` (`:2281`): default `doc` to the fixture document; let a test pass `doc: null` to omit it.
- `:2347` ("a result with no story_file merges as before"): rewrite to assert
  `result-document-unnamed` and no record.
- `:2364`, `:2387`, `:2400` pass `null` for `story_file` but test earlier refusals. Confirm each still
  answers its own reason.

### Phase 3: Step 3c arms and the exact-path rule

**`skills/finalise/SKILL.md`** Step 3c `case` (`:1069-1077`):

```bash
  scope-document-missing)     # nothing merged, nothing recorded (task 332)
                      echo "HALT: $(jq -r '.message' "$AC_MERGED_FILE") — re-run Step 3a, the AC agent and the extract above, then this block"; exit 1 ;;
  scope-document-mismatch)    # nothing merged, nothing recorded (task 331, 332)
                      echo "HALT: $(jq -r '.message' "$AC_MERGED_FILE") — --scope is not this item's: check STEM and DOD_N, re-run Step 3a for this item, then this block"; exit 1 ;;
  result-document-unnamed)    # nothing merged, nothing recorded (task 332)
                      echo "HALT: $(jq -r '.message' "$AC_MERGED_FILE") — re-run the extract above, or hand-copy THIS item's full AC agent answer to the result path, then re-run this block"; exit 1 ;;
```

**`shared/resources/finalise-dod-ac-prompt.md:122`**: after the YAML block, one sentence:
`story_file` is the exact `<STORY_FILE>` path you were given, unchanged — not a basename, not
re-cased; `/finalise` refuses any other spelling.

### Phase 4: Tests, CHANGELOG, bundle

- Symlink test: create `link.md -> <DOC>` in the temp repo, name `link.md` as `story_file`, expect
  `merged`. Mutation 5 removes the `realpathSync` branch and must turn only this test red.
- Nonexistent test: `story_file: docs/tasks/task.9.x/nope.md`, expect `result-document-mismatch` and
  the "does not exist" message.
- `CHANGELOG.md` `[Unreleased]`: one entry for task 332. Its resume sentence covers:
  - before Step 3c: re-run Step 3a and the extract, then Step 3c;
  - between Step 3c and Step 3d: Step 3c's merged file is already stem-keyed (task 331), so re-run
    Step 3c only if the merged file is missing;
  - after Step 3d: nothing reads the renamed files;
  - a pre-upgrade `result-unparseable` answer: no record was written, so re-run the extract and Step 3c.
  Confirm the Step 3d case by reading what Step 3d reads before writing the sentence.
- `npm run bundle`, then `npm run bundle:check`.

## Key Patterns and References

- Task 331's refusals (`finalise-rerun-scope.js:1213-1249`) are the pattern: an `emit` with `reason`,
  `exitCode: 0`, `mode` and a `message`, before `merge()` runs.
- `mergeDocCase` (`finalise-rerun-scope.test.mjs:2281`) builds the temp repo, scope and result for
  the CLI cases. Extend it rather than writing a second helper.
- The eval test for the Step 3c `result-document-mismatch` arm (`finalise-rerun-scope-blocks.test.mjs:362`)
  is the pattern for testing a new arm under bash and zsh, if QA asks for one per arm.

## Testing Approach

Write each § 8 row as a failing test before its code. Run the two files with `command node --test`.
Record each mutation and the test it turned red in the QA report. Run `npm run test:remote` for the
full suite.

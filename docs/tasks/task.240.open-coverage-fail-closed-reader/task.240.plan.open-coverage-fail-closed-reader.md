---
id: task.240.plan
title: "Implementation Plan: Fail-closed reader for the 5c open-coverage check"
type: plan
task-ref: task.240.open-coverage-fail-closed-reader.md
---

# Implementation Plan: Fail-closed reader for the 5c open-coverage check

> Requirements and success criteria: [task.240.open-coverage-fail-closed-reader.md](task.240.open-coverage-fail-closed-reader.md)

## Overview

Move the open-coverage reading out of a shell `awk` program and into a small CommonJS module. The
module parses review-pr's findings block strictly and returns a count or a refusal. §5c then calls
it as a CLI and keeps its shell guard.

## Phase-by-Phase Implementation Guide

### Phase 1: The reader

**Files to modify:**

- `shared/resources/pr-review-current.js`: lift the regex at `:59`
  (`/^## Machine-Readable Findings\s*\n+```yaml\n([\s\S]*?)^```/m`) into an exported
  `extractFindingsBlock(text)`. It returns the block text, or `null` when there is no section or no
  `yaml` fence. Keep the existing `reviewed_gate` reader on top of it.
- `shared/resources/open-coverage.js` (new). CommonJS, because `package.json` is `"type":
  "commonjs"` and `bundle_skill.py` follows only the `require` form (see the header comment of
  `yaml-subset.js`).

**Shape of the module:**

```js
const { extractFindingsBlock } = require("./pr-review-current.js");

// Returns { count } or { unreadable: reason }. Never throws on input.
function countOpenCoverage(text) { /* extract → parse → count */ }

// CLI: --file <report>. Prints exactly one OPEN_COVERAGE= line, exits 0; usage error exits 2.
```

**Parser rules** (the accepted set; everything else is a refusal):

- Top-level keys: `reviewed_gate`, `findings`, `truncated_count`, each once. An unknown top-level
  key is a refusal, and so is a missing `findings`. This is deliberately stricter than the awk,
  which ignored keys before `findings:` and took a later one as the list's terminator; no tracked
  report carries another top-level key (review.1 O-2).
- `findings: []` reads as an empty list (count 0, which task.238 tests already pin). Any other
  inline value of `findings:` is a refusal.
- A list entry is either `- key: value` followed by keys at the entry's indent + 2, or
  `- {k: v, k: v}` complete on one line. The list may sit indented or at column 0.
- Blank lines and indented full-line comments (`    # …`) are skipped. A column-0 `#` line is a
  refusal: the old `sed` range stopped at a column-0 `## ` line, and "a findings list cut short by a
  column-0 heading line" pins `unreadable`.
- Values:
  - Plain, `'single'` or `"double"` quoted. In plain values, a ` #` starts a comment. A
    block-style double-quoted value accepts the `\"` and `\\` escapes (four tracked reports use
    them); inside a flow entry an escaped quote is a refusal (`bad-value`), which keeps "a flow
    entry the reader cannot tokenise" at `unreadable`.
  - `>-`, `>`, `|-` or `|`, followed by strictly deeper lines.
  - An empty value followed by strictly deeper lines (a nested list or map): text, never read for a
    key — except under `category:` or `provenance:`, where any deeper line is a refusal.
  - Tags (`!`), anchors (`&`) and aliases (`*`) are refusals.
- `category` and `provenance` values compare case-blind (`category: Coverage` pins `1`).
- A duplicate key in one entry is a refusal. An entry with no `category` key is a refusal
  (`no-category`, task.238 bug.8).
- `category` must be one of review-pr's six tokens: `coverage`, `scope`, `trail`, `consistency`,
  `bug`, `cleanup`. Anything else is a refusal, matching task.238 bug.17.
- The block must end at the closing fence. A column-0 line that is not a top-level key, a `- `
  entry of a column-0 list, or the closing fence is a refusal (CR9-3).

**Reason list** (fixed, and exported for the tests): `no-section`, `no-fence`, `no-findings-key`,
`bad-line`, `bad-value`, `duplicate-key`, `bad-category`, `no-category`, `unterminated`,
`not-a-map`.

Every rule above is pinned by a `RAW_CASES` or `UNREADABLE_CASES` row in
`pr-review-loop-parity.test.mjs`; reuse that table as the unit test's input so the two cannot
disagree.

### Phase 2: The call site

**Files to modify:**

- `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, §5c. Keep the `REVIEW=` line. Replace
  everything from the awk pipeline to the end of the `if`/`else` with:

  ```bash
  OPEN_COVERAGE=$(command node .agents/skills/{develop-story|develop-task}/references/open-coverage.js \
    --file "$REVIEW" 2>/dev/null | sed -n 's/^OPEN_COVERAGE=//p')
  case "$OPEN_COVERAGE" in ''|*[!0-9]*) OPEN_COVERAGE=unreadable ;; esac
  echo "OPEN_COVERAGE=$OPEN_COVERAGE"
  ```

  The literal `OPEN_COVERAGE=$(` stays, because the parity harness keys on it (`:839`, `:1157`).
  A missing file reaches the reader, which reports `no-section`. The guard stays as the backstop
  for any reader failure.

- `evals/shared/tests/pr-review-loop-parity.test.mjs`:
  - `openCoverageOf` needs the bundled path to resolve from its `cwd`. Run the block with
    `{develop-story|develop-task}` substituted, and a `cwd` where
    `.agents/skills/develop-task/references/open-coverage.js` exists. Memory note: a gitignored
    `.agents/skills` symlink can mask this locally, so check the CI shape.
  - The failing-awk test becomes a failing-node test: a `node` stub on `PATH` that exits 2.
  - A new assertion: the §5c block holds exactly one `command node` call and no `awk` (SC-5).

### Phase 3: Corpus, probe and docs

- Corpus diff command (old block extracted from `ded46852`):

  ```bash
  git ls-files '*pr-review.*.md' | while read -r f; do
    a=$(REVIEW="$f" bash old.sh); b=$(REVIEW="$f" bash new.sh)
    [ "$a" = "$b" ] || echo "CHANGED $f: $a -> $b"
  done
  ```

  Extract each block with the same awk range task.238's QA used (from the `REVIEW="{the PR review
  report` line to the `echo "OPEN_COVERAGE=` line).

## Key Patterns and References

- Pure core plus thin CLI, with `reason` vocabularies: `tracker-comment.js` and
  `observation-log.js` follow the same shape.
- "An empty result is a claim about the instrument": the corpus test must assert at least one `1`
  and one `unreadable` read, or it can pass on a reader that always says `0`.

## Testing Approach

- `shared/resources/tests/open-coverage.test.mjs`: table-driven over the parser rules above. Each
  refusal reason has at least one case.
- Re-use task.238's `RAW_CASES` strings as unit inputs too: the same table, two harnesses.
- Mutation proofs:
  - turn `bad-line` into a skip, and check the refusal cases go red;
  - drop the `pre-existing` filter, and check the provenance case goes red.

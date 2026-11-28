---
id: task.333.plan
title: "Implementation Plan: Close task 332's follow-ups and guard the zsh flag trap"
type: plan
task-ref: task.333.close-task-332-follow-ups-and-zsh-flag-guard.md
---

# Implementation Plan: Close task 332's follow-ups and guard the zsh flag trap

> Requirements and success criteria: [task.333.close-task-332-follow-ups-and-zsh-flag-guard.md](task.333.close-task-332-follow-ups-and-zsh-flag-guard.md)

## Overview

Write the guard first and prove it red on the two live review-story sites, then fix them. Then make
the four finalise changes, each with a test that its named mutation turns red.

## Phase-by-Phase Implementation Guide

### Phase 1: The zsh guard and the review-story fix

**`shared/resources/tests/zsh-flag-expansion-guard.test.mjs`** (new). It follows
`halt-snippet-glob-safe.test.mjs`'s imports and ROOT derivation:

```js
import { extractBlocks } from "../qa-execute-snippets.mjs";
// population: git ls-files 'skills/*/SKILL.md' 'shared/resources/*.md', minus any /references/ path
const FLAG_KEY = /\$\{[A-Za-z_][A-Za-z0-9_]*:\+["']?-/;
const COMMENT = /^\s*#/;
// for each file, for each block, for each line i: a hit is FLAG_KEY && !COMMENT,
// reported as `${file}:${block.line + i + 1}` (block.line is the fence's 1-based line)
```

- Test A: `hits` deep-equals `[]`, and the message lists each hit.
- Test B (non-vacuity): `blocksRead >= 700` (804 on 2026-11-28).
- Test C (premise, skipped only when `spawnSync("zsh",["-c","true"]).status !== 0`): run
  `X=v; set -- ${X:+--flag "$X"}; echo $#` under zsh. It must print `1`. Then run
  `A=(); [ -n "$X" ] && A=(--flag "$X"); set -- "${A[@]}"; echo $#` under bash and zsh. It must print `2`
  in both.
- Test D (key calibration): the flag key matches `${X:+--f "$X"}` and `${X:+"-f" "$X"}`. It does not
  match `"${X:+ (eq ${X})}"` or `${X:+, ${X}}`, the shapes of the five correct sites in §3.

Calibrate before fixing: run test A on the unfixed tree and paste its failure (the two review-story
lines) into the QA report.

**`skills/review-story/SKILL.md:2398`** (Step 9.6, Jira path):

```bash
PIN_ARGS=(); [ -n "$PIN_BRANCH" ] && PIN_ARGS=(--doc-branch "$PIN_BRANCH")
node .agents/skills/sync-jira-story/scripts/sync-jira-story.js \
  --file "$STORY_FILE_PATH" "${PIN_ARGS[@]}" \
  --no-transition
```

**`:2483`** (status push): the same change, without `--no-transition`. Leave the block's note on
`--no-transition` as it is.

**`docs/contributing/traps.md`**: add an entry after "zsh `nomatch` aborts a command …", headed
"zsh does not word-split `${X:+--flag "$X"}`". It covers the defect, the array form, the five
historical sites, and that `zsh-flag-expansion-guard.test.mjs` holds the rule for fenced `bash` blocks.

### Phase 2: Disclose every unverified hand copy

**`skills/finalise/SKILL.md` Step 3c**, the `merged)` arm:

```bash
  merged)             AC_OVERALL=$(jq -r '.ac_result.ac_traceability.overall' "$AC_MERGED_FILE")
                      AC_YAML_VERIFIED=$(jq -r '.result.verified' "$AC_RECORD")
                      RERUN_SCOPE_LINE=$(jq -r '.scope_line' "$AC_MERGED_FILE") ;;
```

After `echo "AC_OVERALL=$AC_OVERALL"`, add `[ -n "${AC_YAML_VERIFIED:-}" ] && echo "AC_YAML_VERIFIED=$AC_YAML_VERIFIED"`.
`result-unparseable` writes no record, so the variable stays unset there.

The rule at `:1035`: move "say 'AC YAML hand-copied (unverified): {reason}' in the DoD" out of the
failed-extract sentence into one of its own. Whenever the block prints `AC_YAML_VERIFIED=false`,
the DoD's Step 2 `**AC YAML:**` line says "hand-copied (unverified): {reason}". The reason is the
extract's failure reason, or `extract record removed for a hand copy`.

**`evals/shared/tests/finalise-rerun-scope-blocks.test.mjs:462`**: after the existing existence check
at `:518`, parse the record and assert `record.result.verified === false`, and
`assert.match(c3.stdout, /^AC_YAML_VERIFIED=false$/m)`. In the test that merges an extracted result,
assert `/^AC_YAML_VERIFIED=true$/m`.

### Phase 3: Wording, stem key, one parse

**`shared/resources/finalise-dod-ac-prompt.md:153`**: "`story_file` is the exact `<STORY_FILE>`
path you were given, unchanged: not a basename, not re-cased. `/finalise` refuses an answer that leaves
it out, or that names a path that does not resolve to the same file." This drops "spells it any other
way", because `sameDocument` accepts an absolute or symlinked spelling of the same file.

**`skills/finalise/SKILL.md:590-606`**: add the input and guard lines Step 3c uses:

```bash
STEM="{story.{P}.{E}.{S} | task.{id}}"
case "$DOC_PATH$DOD_N$STEM" in *'{'*) echo "HALT: …"; exit 1 ;; esac
[ -n "$STEM" ] || { echo "HALT: STEM is empty — substitute the work item's filename stem"; exit 1; }
```

Then use `finalise-rerun-at-head-${STEM}-${DOD_N}` for the `--out-dir` and
`finalise-rerun-at-head-${STEM}-${DOD_N}.json` in all three places in this block and in `:641`. Check
the substitution in the blocks test's `substitute()` helper: it must fill `STEM` for this block too.

**`shared/resources/finalise-rerun-scope.js`**:

```js
function merge(s, agentYaml, opts, io) {
  const answer = opts && opts.answer ? opts.answer : readAnswer(agentYaml);
  ...
}
// CLI, :1265 — keep `const answer = readAnswer(agentYaml);` and pass `{ ...mergeOpts, answer }` to merge().
```

The parse-count test: in `shared/resources/tests/finalise-rerun-scope.test.mjs`, spawn the CLI with
`--require` preloading a small module that wraps `yaml-subset.js`'s `parseYamlSubset` with a counter.
The module prints the count to stderr on exit. Assert the count is 1 on a `merged` run. If preloading
cannot reach the module instance, export a `__parseCount` hook behind an env var instead, and say
which approach was taken in the QA report.

### Phase 4: CHANGELOG, bundle, full suite

The CHANGELOG `[Unreleased]` entry, `npm run bundle`, `npm run bundle:check`, then
`npm run test:remote` on the LAN server.

## Key Patterns and References

- Array form: `skills/finalise/SKILL.md:1068-1075` (`AC_SHA_ARGS`) and
  `shared/resources/develop-pipeline-step-8-commit.md:256`.
- Fence reader: `extractBlocks`, `shared/resources/qa-execute-snippets.mjs:70`. It returns only `bash`
  fences, as `{ line, code, origin }`.
- Precedent guard: `shared/resources/tests/halt-snippet-glob-safe.test.mjs`.
- Same-file rule: `sameDocument`, `shared/resources/finalise-rerun-scope.js:767`.

## Testing Approach

The scenarios are in the task's §8. Temp directories in the new tests are removed in a `finally`, as
`finalise-rerun-scope-blocks.test.mjs` does (`scripts/test-tmpdir.mjs` rejects a new leaking prefix).

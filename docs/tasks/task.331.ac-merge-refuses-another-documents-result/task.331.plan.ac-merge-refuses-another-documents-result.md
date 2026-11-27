---
id: task.331.plan
title: "Implementation Plan: The AC merge refuses another document's result"
type: plan
task-ref: task.331.ac-merge-refuses-another-documents-result.md
---

# Implementation Plan: The AC merge refuses another document's result

> Requirements and success criteria: [task.331.ac-merge-refuses-another-documents-result.md](task.331.ac-merge-refuses-another-documents-result.md)

## Overview

One refusal in the `merge` CLI arm, placed after the hash check, plus a rename of the four AC state
paths in `/finalise`. Tests first.

## Phase-by-Phase Implementation Guide

### Phase 1: The refusal

**Failing cases first**, in `shared/resources/tests/finalise-rerun-scope.test.mjs`, beside the
`result-hash-mismatch` tests. Build each result from `agentDoc(...)` (`:2259` at `92ed119de`), replacing its
`story_file` line:

- `story_file: "docs/tasks/task.8.other/task.8.other.md"` against a scope for `DOC` →
  `reason: "result-document-mismatch"`, `exitCode: 0`, and no `--record-out` file written;
- `story_file: "${path.resolve(root, DOC)}"` (absolute) → `merged`;
- the `story_file` line removed → `merged`;
- a mismatched `story_file` plus a wrong `--sha256` → `result-hash-mismatch`.

**The code** (`finalise-rerun-scope.js`, after the `result-hash-mismatch` return near `:1178`). Read
`story_file` with the same `parseYamlSubset` that `merge()` uses. Parse once and pass the parsed value
on, or parse here and let `merge()` parse again: the cost is negligible. Never use a regex.

```js
const named = storyFileOf(agentYaml); // ac_traceability.story_file, or null
if (named && s.document && path.resolve(cwd, named) !== path.resolve(cwd, s.document))
  return emit(opts.json, {
    reason: "result-document-mismatch",
    exitCode: 0,
    mode: s.mode,
    message: `--result is for ${named}, not ${s.document}: it is another document's answer`,
  });
```

`cwd` is the repository root the CLI already resolves `--scope` against. Add the reason to the
module's list of reasons, if one is enumerated, and to `USAGE` where the reasons are described.

### Phase 2: The state paths

In `skills/finalise/SKILL.md` (`:1021`, `:1045`, `:1050`, `:1659` at `92ed119de`), the paths become
`.claude/state/finalise-ac-result-${STEM}-${DOD_N}.yaml` and
`.claude/state/finalise-ac-merged-${STEM}-${DOD_N}.json`. Each block that uses them re-binds `STEM`
as a substituted input with the same placeholder guard the merge block uses; the extract block
(`:1016`) binds none today and gains one. No block inherits another's variables. In Step 3c's `case`,
add a `result-document-mismatch` arm that **HALTs** (as `result-hash-mismatch` does through `*)`),
naming the remedy: re-run the extract, or hand-copy this item's agent answer; never merge. Rewrite the
Step 6 action 2a comment at `:1661` ("keyed by DOD_N alone") and keep its `OWN_DOC` guard.
Update the seven paths in `shared/resources/tests/finalise-deferred-ci.test.mjs` and the two in
`evals/shared/tests/finalise-rerun-scope-blocks.test.mjs` (`:240`, `:273`), which write the result
file before running the Step 3c block (`finalise-ac-result-task.9-1.yaml`).

> **Review 1 decision**: the plan first said `NEEDS_MANUAL_REVIEW` here while task § 5 said "as it
> routes `result-hash-mismatch`", which is a HALT. The task's wording wins: both refusals mean the
> file `merge` read is not this run's answer, and both stop the same way.

### Phase 3: Records and bundle

A CHANGELOG `[Unreleased]` entry citing `(task 331)`, then `npm run bundle` and `npm run bundle:check`.

## Key Patterns and References

- `result-hash-mismatch` (`finalise-rerun-scope.js:1178`) is the shape to copy: exit 0, a named
  reason, nothing written.
- Task 327 edits the same file's `extract` arm and the Step 3c fallback prose. Rebase on it before
  starting, which is why `deps: T327`.

## Testing Approach

The two suites of § 8, then `evals/shared/tests/finalise-rerun-scope-blocks.test.mjs`, then
`npm run test:remote`. Record the two mutations of § 8 in the QA report.

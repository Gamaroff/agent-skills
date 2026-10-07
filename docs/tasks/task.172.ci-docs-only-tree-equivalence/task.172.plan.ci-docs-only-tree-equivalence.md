---
id: task.172.plan
title: "Implementation Plan: One docs-only CI rule at every pipeline CI wait"
type: plan
task-ref: task.172.ci-docs-only-tree-equivalence.md
---

# Implementation Plan: One docs-only CI rule at every pipeline CI wait

> Requirements and success criteria: [task.172.ci-docs-only-tree-equivalence.md](task.172.ci-docs-only-tree-equivalence.md)

## Overview

Build the engine first, with no call site touched, then move the four waits onto it. The engine's
one job is to answer "is this pending head tree-equivalent to a green ancestor?". It fails closed:
exit 0 means yes, and anything it cannot establish is a "no" that leaves today's wait in place.

## Phase-by-Phase Implementation Guide

### Phase 1: `glob-match.js`

Move these three functions verbatim, comments included, from `shared/resources/qa-diminishing-returns.js`
(`globToRegExp` `:121`, `normalisePath` `:180`, `matchesAnyGlob` `:194`):

```js
// shared/resources/glob-match.js
"use strict";
function globToRegExp(glob) { /* moved verbatim */ }
function normalisePath(file) { /* moved verbatim */ }
function matchesAnyGlob(file, globs) { /* moved verbatim */ }
module.exports = { globToRegExp, normalisePath, matchesAnyGlob };
```

In `qa-diminishing-returns.js`, replace the three definitions with
`const { matchesAnyGlob } = require("./glob-match.js");` and leave `module.exports` as it is
(`:1060`). Run `node --test shared/resources/tests/qa-diminishing-returns.test.mjs
shared/resources/tests/qa-loop-route.test.mjs` before and after. Both runs must be green with no
test edit.

### Phase 2: `ci-tree-equivalence.js`

Shape it like `gh-stage.js`: CommonJS, a pure core exported for tests, and a CLI guarded by the
realpath entrypoint check (see `entrypoint-guard-realpath.test.mjs`).

```js
const REASONS = Object.freeze({
  TREE_EQUIVALENT: "tree-equivalent", NOT_APPLICABLE: "not-applicable", DISABLED: "disabled",
  CODE_CHANGED: "code-changed", NO_GREEN_ANCESTOR: "no-green-ancestor",
  UNVERIFIABLE: "unverifiable", CHECK_FAILED: "check-failed",
});
const DEFAULT_PATTERNS = Object.freeze(["**/*.md", "docs/**"]);
const MAX_ANCESTORS = 20;

/**
 * Pure. `ancestors` is first-parent order, nearest first:
 *   [{ sha, changed: string[] | null, rollup: "SUCCESS"|"FAILURE"|"PENDING"|"NONE"|"UNKNOWN" }]
 * `changed` is the diff ancestor..head (null = could not compute).
 */
function classifyTreeEquivalence({ headRollup, ancestors, patterns, enabled }) { … }
```

The decision order is fixed, and the test table follows it row by row:

1. `enabled === false` returns `disabled`.
2. `headRollup` is not `PENDING` and not `NONE`: return `not-applicable`.
3. For each ancestor, in order:
   - `changed === null`: return `unverifiable`.
   - Any path that does not match `patterns`: return `code-changed`, with that path in the detail.
   - `rollup === "SUCCESS"`: return `tree-equivalent` with `greenSha`.
   - `rollup === "UNKNOWN"`: return `unverifiable`.
   - Anything else (`PENDING`, `NONE`, `FAILURE`): continue to the next ancestor. An older green
     ancestor is still valid evidence for the same code tree.
4. Ancestors exhausted: return `no-green-ancestor`.

The CLI does this I/O:

- `git rev-list --first-parent --max-count=20 <head>^`, and `git diff --name-only <sha> <head>` per
  ancestor. Compute the diff lazily, so the walk stops at the first code path without reading that
  ancestor's checks.
- **GitHub ancestor rollup:** `gh api repos/{owner}/{repo}/commits/{sha}/check-runs --paginate` plus
  `gh api repos/{owner}/{repo}/commits/{sha}/status`. Normalise these the way the Step 6 jq does
  (`skills/finalise/SKILL.md:780`): a CheckRun is decided only at `status: completed`, and
  `conclusion` in {`success`, `skipped`, `neutral`} passes. A StatusContext `state: success` passes.
  Zero entries is `NONE`. Any failing call is `UNKNOWN`.
- **Bitbucket ancestor rollup:** `GET /repositories/{ws}/{repo}/commit/{sha}/statuses` using
  the credential order `bitbucket-auth.sh` defines. Node cannot source that script; the node
  precedent is `pr-inline-comment.js:926` `bbAuthHeader`. Reuse it: export it, or move it to a
  shared module if requiring `pr-inline-comment.js` would bloat the closure. Do not write a third
  copy. A `403` or any non-200 is `UNKNOWN`. Every `SUCCESSFUL` passes,
  and an empty list is `NONE`.
- **Config:** `parseYamlSubset(readFileSync("skills-config.yaml"))`, then `ci.docsOnly`. A missing
  file or block gives the defaults. A non-list `patterns` is a usage error (exit 2) that names the
  key. Never fall back silently to the defaults on a malformed value.
- **`checkCommand`:** run it only after `tree-equivalent`, with `spawnSync("sh", ["-c", cmd], {
  stdio: "inherit" })` from the repo root. A non-zero exit gives `check-failed`, with `checkExit`
  in the payload.
- **Output:** `--json` prints `{ reason, greenSha, changed, checkExit, detail }`, and the exit code
  follows `reason`.

### Phase 3: call sites

**`/finalise` Step 6.** After the re-sample loop (`:872`), insert:

```bash
CI_TREE_EQ=""
case "$CI_ROLLUP" in
  PENDING|NONE)
    if TE=$(command node .agents/skills/finalise/references/ci-tree-equivalence.js \
              --head-rollup "$CI_ROLLUP" --head "$(git rev-parse HEAD)" --pr "$PR_NUMBER" --json); then
      CI_TREE_EQ=$(printf '%s' "$TE" | jq -r '.greenSha[0:12]')
      CI_ROLLUP=SUCCESS
    fi ;;
esac
```

Add a decision-table row: `SUCCESS` with `CI_TREE_EQ` set means proceed, recorded as
`CI reading 1: SUCCESS (tree-equivalent to {CI_TREE_EQ}) @ {CI_HEAD_1}`. Revise the `:897` note
so that it states the rule and the record form. The current note warns about a green on an
ancestor without saying when that green is enough.

**`/finalise` 6c.** In the heredoc, give `decided()` a third case, still behind condition (1)
(`WAITED > 0`) and condition (2) (head equality):

```bash
PENDING|NONE) TREE_EQ=$(command node "$ENGINE" --head-rollup "$STATE" --head "$EXPECTED_HEAD" \
                 --pr "$PR_NUMBER" --json 2>/dev/null | jq -r '.greenSha // empty | .[0:12]')
              [ -n "$TREE_EQ" ] && STATE=SUCCESS ;;
```

Pass `ENGINE` as a sixth argument, because the heredoc is quoted and cannot interpolate it. Write
`TREE_EQ=${TREE_EQ:-}` as a fifth result field. Change the reader at `:1476` to
`read -r CI_ROLLUP_2 CI_HEAD_READ CI_CHECKS_2 WAITED CI_TREE_EQ_2`. Without the fifth name,
`WAITED` would absorb the field (measured). Print `(tree-equivalent to …)` when it is set. Revise
the `:1507` note to say that the Step 8 report commit is now covered by the same rule at the merge
step.

**`/develop-next` Step 3 (`:182`) and `/develop-batch` Step 3 (`:403`).** Give "CI checks" the same
`PENDING|NONE` arm and the same record. In `/develop-batch`, add one sentence explaining why a
rebased head (`:373`) never qualifies.

### Phase 4: config and this repository

Add this to the `configuration.md` schema block, after `qa:`:

```yaml
ci: # optional — the docs-only rule at the pipeline's CI waits (task.172)
  docsOnly:
    enabled: true                       # false restores a full CI wait everywhere
    patterns:                           # BLOCK list: the YAML subset reads an inline [..] as a string
      - "**/*.md"                       # `**/*.md`, not `*.md`: `*` does not cross `/`
      - "docs/**"
    checkCommand: ""                    # optional local check run on a tree-equivalent head
```

Add three key-reference rows. In this repository's `skills-config.yaml`:

```yaml
ci:
  docsOnly:
    # SKILL.md and shared/resources/*.md are executable prose here, and tests read docs/
    # (card-preflight-corpus scans docs/tasks/), so the consumer default is too wide.
    patterns:
      - "docs/**"
    checkCommand: "npm run ci:fast && npm run eval:all"
```

## Key Patterns and References

- Exit and `reason` contract: `tracker-comment.js` and `gh-stage.js`. Read `reason`, not just the
  exit code.
- `null` vs `[]` for "could not compute" vs "nothing changed": tinker-city `merge-gate.mjs`
  `changedSince`.
- Fake `gh` on `PATH` for CLI tests: follow the existing fixture pattern in `shared/resources/tests/`
  (task.136's `shell-fn:` probe fixture).
- Bundling: a bare `shared/resources/ci-tree-equivalence.js` mention in each SKILL.md makes the file
  a dependency. Check the bundler's `closure M (±K vs committed)` line for each of the three skills.

## Testing Approach

- `shared/resources/tests/ci-tree-equivalence.test.mjs`:
  - a pure table with one row per decision-order step above
  - pattern rows from task § 8
  - CLI runs in `fs.mkdtempSync` git repos (commit code, mark it green in the fake `gh`, add two
    `.md` commits, then run)
  - a heredoc-extraction test for 6c, writer and reader together
  - the four-site wiring population with a floor of 3 `statusCheckRollup` files
- Three mutation proofs (task § 8). Record each revert and its red run in the implementation report.

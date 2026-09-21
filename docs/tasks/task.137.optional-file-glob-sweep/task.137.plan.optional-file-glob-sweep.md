---
id: task.137.plan
title: "Implementation Plan: sweep the pinned ls-over-glob optional-file sites"
type: plan
task-ref: task.137.optional-file-glob-sweep.md
---

# Implementation Plan: sweep the pinned `ls <glob>` optional-file sites

> Requirements and success criteria: [task.137.optional-file-glob-sweep.md](task.137.optional-file-glob-sweep.md)

## Overview

Mechanical per site, with the ratchet as the ledger: every commit rewrites the sites in one source file, deletes exactly those pins from `KNOWN`, adds their executed absent-file rows, and (for a shared doc) runs `npm run bundle`. The ratchet's second test — a pin without a site is red — is what makes a forgotten deletion visible, and the first test is what stops a rewrite from introducing a new `ls` glob.

## Phase-by-Phase Implementation Guide

### Phase 0: the ratchet exists

```bash
source .claude/skills/observe-work/references/resolve-observation-workspace.sh || exit 1
[ -f tests/fenced-bash-optional-file-globs.test.js ] && echo present || \
  cp "$OBS_STAGING_DIR/shared-resources/tests/fenced-bash-optional-file-globs.test.js" tests/
command node --test tests/fenced-bash-optional-file-globs.test.js
```

Expect 2/2. If the first test names a site not in `KNOWN`, the live tree moved after staging: add the pin in this commit (it will be swept in its phase) and note it.

### The test file (all phases)

`evals/shared/tests/optional-file-lookups.test.mjs`, copying `finalise-bug-mode.test.mjs`'s mechanics:

```js
import { spawnSync } from "node:child_process";
const SHELLS = ["bash", ...(spawnSync("zsh", ["-c", "true"], { stdio: "ignore" }).status === 0 ? ["zsh"] : [])];
const flags = (sh) => (sh === "zsh" ? ["-f", "-s", "--"] : ["--noprofile", "--norc", "-s", "--"]);

function sliceBlock(file, startNeedle, endNeedle) { /* as finalise-bug-mode.test.mjs */ }

// one row per rewritten site:
{ file: "skills/qa-task/SKILL.md", start: 'PRIOR_GATES=$(', end: '\n', subst: { TASK_DIR: "<scratch>" },
  absent: { var: "PRIOR_GATES", expect: "0" },
  numbered: null }
```

Per row, per shell: make a scratch dir, substitute placeholders (`{task-directory}` → the scratch path, `${STEM}` → `task.7.fixture`), append `printf '%s' "$VAR"` to the sliced block, run with `input`, assert stdout equals `expect` and stderr does not match `/no matches found/`. For `numbered` rows, also create `<stem>.<kind>.9.x.<ext>` and `<stem>.<kind>.19.x.<ext>` and assert the `.19` path wins.

### Phase 1: qa-task / qa-story Step 3b

The four pinned lines per skill (`LATEST_GATE`, `LATEST_QA_NUM`, `PRIOR_GATES`, `THIS_GATE`) become:

```bash
LATEST_GATE=$(find "$TASK_DIR" -maxdepth 1 -name "task.*.gate.*.yml" 2>/dev/null \
  | sed -E 's/^(.*\.gate\.)([0-9]+)(\..*)$/\2 \1\2\3/' | sort -n | tail -1 | cut -d' ' -f2-)
LATEST_QA_NUM=$(find "$TASK_DIR" -maxdepth 1 -name "task.*.qa.*.md" 2>/dev/null \
  | sed -E 's/^.*\.qa\.([0-9]+)\..*$/\1/' | sort -n | tail -1)          # "" when none
PRIOR_GATES=$(find "$TASK_DIR" -maxdepth 1 -name "task.*.gate.*.yml" 2>/dev/null | wc -l | tr -d ' ')
THIS_GATE=$(find "$TASK_DIR" -maxdepth 1 -name "task.*.gate.${QA_CYCLE:-none}.*.yml" 2>/dev/null | head -1)
```

qa-story: `$STORY_DIR` / `story.*`. Read the lines that follow each assignment before rewriting — `LATEST_QA_NUM` in particular feeds an arithmetic `+ 1`; confirm the empty case is handled after the rewrite as it was meant to be before.

### Phase 2: finalise 7.6b + step-7-finalise

Finalise 7.6b's `DOD_PATH` and `FINAL_GATE` take the 6b form verbatim (same file, ~line 1553 `newest_numbered` and ~1561 `DOD_PATH=`); the five step-7 sites (`DOD_FILE`, `DOD_PATH`, `FINAL_GATE`, two story/task `dod` lookups) take the same form with `{story-or-task-directory}` / `{story-or-task-prefix}` placeholders kept.

### Phase 3: step docs and the develop SKILLs

- step-0 (implementation report, 2) and develop-story/task Step 0 (1 each): numbered-newest, kind `implementation`.
- step-2 (review, 4): numbered-newest, kind `review`.
- step-3 (plan, 2) and resume-contract (plan, 2): `find … -name "<stem>.plan.*.md" | head -1` — a plan is one file.
- step-5-6 (gate, 2): the pinned lines end in `\` — read the continuation; they list gates for display, so `find … | sort` with the continuation preserved.

### Phase 4: resume detector prompt; empty `KNOWN`

```bash
find "{DOC_DIR}/.summaries" -maxdepth 1 -name "step-*.json" 2>/dev/null | sort
find .claude/state -maxdepth 1 \( -name "develop-pipeline.last-halt.json" -o -name "develop-pipeline.lock.pausing.*" \) 2>/dev/null || true
```

Then in the ratchet:

```js
const KNOWN = new Set([]);   // swept by task.137 — a new site is red with nothing to compare against
assert.equal(hits.size, 0, `optional-file glob site(s) — swept in task.137; use quoted find -name:\n  ${[...hits].join("\n  ")}`);
```

Keep the second test: with an empty `KNOWN` it is vacuously green and costs nothing, and it is what a future pin would need.

## Key Patterns and References

- Numeric-newest pipeline: `skills/finalise/SKILL.md` 6b (task.125 cycle 8) — copy the `sed -E` verbatim, changing only the kind.
- Two-shell block execution: `evals/shared/tests/finalise-bug-mode.test.mjs` (`sliceBlock`, `spawnSync(shell, ["-s", "--"])`, the "zsh's own nomatch error never appears" assertion).
- Bundle after each shared-doc commit: `npm run bundle:skill skills/<name>` is not enough — the step docs bundle into several skills; run `npm run bundle`.
- Write `${1}`, never `$1`, in any new fenced line (the positional-token guard).

## Testing Approach

- `command node --test evals/shared/tests/optional-file-lookups.test.mjs tests/fenced-bash-optional-file-globs.test.js` after every commit.
- One mutation per phase: put one `ls` glob back → the site's zsh row red AND the ratchet's first test red; record the two messages.
- `npm run ci:fast` before each commit; `git log -1` after (the hook is chatty).

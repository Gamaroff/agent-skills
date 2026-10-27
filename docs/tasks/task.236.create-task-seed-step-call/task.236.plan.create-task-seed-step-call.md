---
id: task.236.plan
title: "Implementation Plan: create-task 1.1 omits the required taskId argument to seedFromObservations"
type: plan
task-ref: task.236.create-task-seed-step-call.md
---

# Implementation Plan: create-task 1.1 omits the required taskId argument to seedFromObservations

> Requirements and success criteria: [task.236.create-task-seed-step-call.md](task.236.create-task-seed-step-call.md)

## Overview

Write the test first. It finds the step 3 block in `SKILL.md`, runs it against a scratch log, and
asserts the seed. Then replace the step 3 prose with that block.

## Phase-by-Phase Implementation Guide

### Phase 1: Test first

**New file**: `skills/create-task/tests/seed-step-block.test.js`, CommonJS like its sibling.

```js
"use strict";
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { pathToFileURL } = require("url");
const test = require("node:test");
const assert = require("node:assert/strict");

const REPO = path.join(__dirname, "..", "..", "..");
// path.join, not the literal: a shared-resources path literal in a skill .js is a bundling instruction.
const SNIPPETS = path.join(REPO, "shared", "resources", "qa-execute-snippets.mjs");

async function seedBlock() {
  const { extractBlocks } = await import(pathToFileURL(SNIPPETS));
  const md = fs.readFileSync(path.join(REPO, "skills", "create-task", "SKILL.md"), "utf8");
  const hits = extractBlocks(md).filter((b) => /seedFromObservations/.test(b.code));
  assert.equal(hits.length, 1, "exactly one bash block in SKILL.md calls seedFromObservations");
  return hits[0].code;
}
```

Check `extractBlocks`' return shape (`shared/resources/qa-execute-snippets.mjs:70`) before
relying on `.code`.

**Scratch tree** (repo-local, as `from-observation.test.js:42` does with `SCRATCH_ROOT`):

- `<ws>/.agents/skills/create-task` → a symlink to `REPO/skills/create-task`, so the block's
  `.agents/skills/create-task/references/…` and `scripts/lib.js` paths resolve without the
  gitignored local symlink.
- Initialise the log with the engine (`observation-log.js init --workspace <ws>`), then write the
  two fixture files directly, as `from-observation.test.js:322-330` does. Not through `write`: two
  entries on one skill with overlapping titles answer `possible-duplicate` and write nothing, and
  the control pair needs a file prefix that disagrees with its id, which `write` never produces.
- Run the block with `bash -c`, `cwd: <ws>`, env `OBS_WORKSPACE=<ws>`. There is no
  `skills-config.yaml` in `<ws>`, so the env var is what the resolver uses. Substitute the two
  placeholders (`{the registry's Next Available Task Number}`, `{the selected ids, comma-separated}`)
  before running, using `applySlots` from the same module when its slot syntax matches, or a
  `split`/`join` per placeholder (never `String.replace` with a replacement string: `$'`
  splices, `feedback_patch_files_split_join_not_replace`).

**Assertions**:

1. The happy pair: exit 0. The stdout JSON has `ids` equal to the two ids, `titleReason` equal to
   `"multiple-entries"`, `park.length === 2`, and every park vector contains
   `task.<TASK_ID> merged to develop`.
2. The control pair: rename one fixture's file so its prefix disagrees with its frontmatter id.
   The block exits non-zero, and stderr names the identity refusal.

Run the file and see assertion 0 (the "exactly one block" check) fail, because today there is no
block.

### Phase 2: Rewrite step 3

In `skills/create-task/SKILL.md` § 1.1, keep step 3's heading `**Seed.**`. Replace "For each
entry, read … and pass `{ frontmatter: …, body: … }` to `seedFromObservations` in
`scripts/lib.js`" with:

```bash
source .agents/skills/create-task/references/resolve-observation-workspace.sh || exit 1
TASK_ID="{the registry's Next Available Task Number}"
OBS_IDS="{the selected ids, comma-separated}"
command node .agents/skills/create-task/references/observation-log.js scan --json \
  | command node -e '
const fs = require("fs"), path = require("path");
const lib = require(path.resolve(".agents/skills/create-task/scripts/lib.js"));
const scan = JSON.parse(fs.readFileSync(0, "utf8"));
if (scan.reason !== "ok") { console.error("scan: " + scan.reason); process.exit(1); }
const ids = process.argv[2].split(",").map((s) => s.trim());
const entries = ids.map((id) => {
  const hit = scan.entries.filter((e) => new RegExp("^0*" + id + "-").test(e.file));
  if (hit.length !== 1) { console.error("id " + id + ": " + hit.length + " files"); process.exit(1); }
  return { frontmatter: hit[0], body: fs.readFileSync(path.join(process.env.OBS_LOG_DIR, hit[0].file), "utf8") };
});
console.log(JSON.stringify(lib.seedFromObservations(entries, { taskId: process.argv[1] }), null, 2));
' "$TASK_ID" "$OBS_IDS"
```

Under `node -e`, `process.argv[1]` is the first extra argument. Confirm that with a one-line run
before relying on it (obs #161: run a property before you claim it). There are no apostrophes
inside the single-quoted program, and none in any guard message (obs #47).

After the block, keep the prose list of returned fields, the throw conditions, and the "every
current-state name is grepped" rule. Add one sentence before the block: "`TASK_ID` is the
**Next Available Task Number** from § 1. Read it first, because the park condition names it."

### Phase 3: Prove and ship

- Mutation 1: delete `, { taskId: process.argv[1] }` → assertion 1 goes red (the function throws).
- Mutation 2: replace the single call with `entries.map((e) => lib.seedFromObservations([e], …))`
  → assertion 1 goes red (`titleReason` is not `multiple-entries`).
- Record both in the implementation report, then restore.
- `npm run validate -- skills/create-task/`, `npm run bundle:check`, CHANGELOG, then `npm run ci` with
  `.agents/skills` and `.claude/skills` moved aside.

## Key Patterns and References

- `skills/create-task/tests/from-observation.test.js`: `SCRATCH_ROOT`, `engine.ephemeralReason`, and
  requiring the engine by repository path.
- `shared/resources/tests/halt-snippet-glob-safe.test.mjs:27`: an existing `extractBlocks` user.

## Testing Approach

`command node --test skills/create-task/tests/seed-step-block.test.js`, then the whole create-task
suite and `npm run ci` with the symlinks aside.

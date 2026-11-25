---
id: task.323.plan
title: "Implementation Plan: The QA loop's globs have a command, and a skill load leaves a record"
type: plan
task-ref: task.323.pipeline-inputs-and-loads-have-a-check.md
---

# Implementation Plan: The QA loop's globs have a command, and a skill load leaves a record

> Requirements and success criteria: [task.323.pipeline-inputs-and-loads-have-a-check.md](task.323.pipeline-inputs-and-loads-have-a-check.md)

## Overview

A new reader, a write added to an existing check, and three small changes in the lock helper. Write each
test first and see it red. Edit `shared/resources/` only.

## Phase-by-Phase Implementation Guide

### Phase 1: The globs

**`shared/resources/qa-test-globs.js`**, the decision as it was run in the trial:

```js
function readGlobs(text) {
  if (text === null) return absent();
  const cfg = parseYamlSubset(text) || {};
  if (!isMapping(cfg)) return malformed("the file is not a mapping");
  if (!Object.hasOwn(cfg, "qa") || cfg.qa === null) return absent();
  if (!isMapping(cfg.qa)) return malformed("`qa` is not a block mapping");
  const v = cfg.qa.testArtifactGlobs;
  if (v === undefined || v === null) return absent();
  if (!Array.isArray(v))
    return malformed("`qa.testArtifactGlobs` is not a block list (an inline [..] is read as text)");
  const bad = v.find((g) => typeof g !== "string" || g.trim() === "");
  if (bad !== undefined) return malformed(`an entry is not a string: ${JSON.stringify(bad)}`);
  return ok(v);
}
```

- `Object.hasOwn` on the parsed object: check that a key named `__proto__` in the file does no harm.
- File read: `ENOENT` is `absent`. Every other error is `malformed`, with its message, as `readConfig` in
  `ci-tree-equivalence.js` does.
- stdout carries the JSON array and nothing else. With `--json`, it is `{reason, globs, exitCode}`.

**The blocks**:

```bash
TEST_ARTIFACT_GLOBS_JSON=$(command node .agents/skills/{develop-story|develop-task}/references/qa-test-globs.js) \
  || { echo "⚠️ qa.testArtifactGlobs could not be read — the route check does not run this cycle" >&2; ROUTE=continue; }
```

Route block: guard the classifier call on the command's success, and keep `ROUTE=continue` for the
failure. Narrowing block: on failure keep the value empty, which folds nothing, and print the reason. In
its `catch`, write one line to stderr and keep `[]`.

`tests/unbound-default-reads.test.js` scans these documents, and `qa-narrowing-offer-wiring.test.mjs`
binds the variable from outside. Keep the block runnable with the variable already set:
`${TEST_ARTIFACT_GLOBS_JSON-$(…)}` is **wrong** here, because it would keep a hand-typed value. Put the
binding in its own fenced block above, and let the wiring test run the second block as it does now.

### Phase 2: The load record

**`skill-resolution.js`**. `main` stays the only writer; `classify` stays pure.

- Lock path: `process.env.PIPELINE_LOCK`, else `<root>/.claude/state/develop-pipeline.lock`. For
  `loaded`, `<root>` is `--root`, else the current directory.
- Write: read, parse, refuse anything that is not an object, set `skill_loads[name]`, write to a
  temporary file in the same directory with `wx`, rename. Mode 0600, as the shell helper leaves it.
- A failed write prints one line to stderr. It never changes `check`'s exit code.
- `at` is UTC ISO-8601 in whole seconds, the form of `paused.at`. Compare as strings. Equal is **not**
  later.
- `NAME_PATTERN` already refuses `__proto__`. `constructor` passes it: use `Object.hasOwn` to read.

**`advance-pipeline-lock.sh`**, as tried (235 of 235):

```bash
if ! jq '.last_pause_at = .paused.at | del(.paused)' "$LOCK" > "$tmp"; then          # clear_pause
| del(.halted_at, …, .paused, .waiting_on, .skill_loads)' "$chosen" > "$tmp"; then    # restore_lock
```

The hold: only in the arm where the DoD file was read and does not say ACCEPTED. The three other arms
(no `--dod`, an empty path, not a file) say nothing about a run, and keep the record. Write through
`mktemp` beside the lock. A failed write warns and still exits 0, as the hold does.

Update the header comment's "paused mark" paragraph and the lock's field table in
`develop-pipeline-pause.md`.

### Phase 3: The rule and the checklists

- `skill-resolution.md`: one section "The record", after the table. The fenced command of § "After every
  load" does not change, so the reach test stays as it is.
- Step 7 checklist, first item:

  ```markdown
  - [ ] `/finalise` was loaded for this run: `command node .agents/skills/{develop-story|develop-task}/references/skill-resolution.js loaded --name finalise` exits 0 (not inlined with `Write`)
  ```

- Step 8: the same for `commit-changes`, as an item and not inside the checklist's bash block. That block
  is run by tests with no lock record.
- `develop-bug/SKILL.md` Step 7: the same item.
- `develop-pipeline-hooks.md`, beside "Why no `PostToolUse:Skill` auto-advance hook?": one sentence. A
  load is recorded by the check that reads it, so no hook is needed for that either.

### Phase 4: Records and bundle

`docs/reference/configuration.md`: the `qa.testArtifactGlobs` row and the paragraph under it. A block
list, as `ci.docsOnly.patterns` already says. Then `CHANGELOG.md`, `npm run bundle` and
`npm run bundle:check`.

## Key Patterns and References

- `ci-tree-equivalence.js` `readConfig`: which read errors mean "not configured".
- `set-waiting-on.sh`: one writer for one lock field.
- `qa-narrowing-offer-wiring.test.mjs`: how a block is extracted and run in two shells.
- Cite a sibling by bare filename inside `shared/resources/`.

## Testing Approach

Drive the CLIs and the extracted blocks. Mutations: `.last_pause_at` not kept; `.skill_loads` not deleted
on restore; the hold deletes nothing; the hold deletes on every arm; `>=` in place of `>` in `loaded`; an
inline list accepted. Name the test each turns red.

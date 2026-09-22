---
id: task.139.plan
title: "Implementation Plan: Change Log engine reachability"
type: plan
task-ref: task.139.change-log-engine-reachability.md
---

# Implementation Plan: Change Log engine reachability

> Requirements and success criteria: [task.139.change-log-engine-reachability.md](task.139.change-log-engine-reachability.md)

## Overview

One token in the contract, one generated file, one test. The bundler already follows the `{a|b|c}` alternation out of shared text for exactly the named skills; this task uses it for the one shared one-liner that is executed rather than read, and pins the population it names to the population that runs it.

## Phase-by-Phase Implementation Guide

### Phase 1: The red test

**File to create:** `tests/change-log-engine-reachability.test.js` (CommonJS, like its siblings in `tests/`; already in the `npm test` glob `'tests/*.test.js'` — verify in `package.json` before relying on it).

```js
const test = require("node:test");
const assert = require("node:assert/strict");
const { readdirSync, readFileSync, existsSync } = require("node:fs");
const { join } = require("node:path");
const ROOT = join(__dirname, "..");

// The instruction that RUNS the engine. Both current writers use this exact phrase
// (develop step 12/14, finalise 7.3); a mention such as "do not reach for `change-log.js`"
// (the bug skills) must not match, so the phrase is the anchor, not the filename.
const RUNS_ENGINE = /through `change-log\.js`/;
const CONTRACT = "shared/resources/document-change-log.md";
const ENGINE = "shared/resources/change-log.js";

function population() {
  return readdirSync(join(ROOT, "skills"))
    .filter((s) => existsSync(join(ROOT, "skills", s, "SKILL.md")))
    .filter((s) => RUNS_ENGINE.test(readFileSync(join(ROOT, "skills", s, "SKILL.md"), "utf8")))
    .sort();
}
function alternation() {
  const text = readFileSync(join(ROOT, CONTRACT), "utf8");
  const m = text.match(/require\("\.\/\.agents\/skills\/\{([^}]+)\}\/references\/change-log\.js"\)/);
  assert.ok(m, "the contract's require line no longer carries a {…} alternation — the bundler cannot reach the engine from it");
  return m[1].split("|").map((s) => s.trim()).sort();
}
const stripHeader = (s) => s.replace(/^\/\/ AUTO-GENERATED[^\n]*\n/, "");

test("population floor: at least two skills instruct the append through the engine", () => {
  const p = population();
  assert.ok(p.length >= 2, `only ${p.length} SKILL.md matched ${RUNS_ENGINE} — the phrase moved, not the writers`);
});

test("every skill whose prose runs the engine ships it, byte-identical to the shared source", () => {
  const src = readFileSync(join(ROOT, ENGINE), "utf8");
  for (const s of population()) {
    const copy = join(ROOT, "skills", s, "references", "change-log.js");
    assert.ok(existsSync(copy), `${s}: SKILL.md runs change-log.js but references/change-log.js is missing — add ${s} to the alternation in ${CONTRACT} and run npm run bundle`);
    assert.equal(stripHeader(readFileSync(copy, "utf8")), src, `${s}: references/change-log.js differs from the shared source — regenerate, never hand-copy`);
  }
});

test("the contract's alternation and the running population are the same set", () => {
  assert.deepEqual(alternation(), population());
});
```

Run before any other change: `command node --test tests/change-log-engine-reachability.test.js` → the second and third tests red naming `develop` (missing copy; `{skill}` is not an alternation, so the third test's `assert.ok(m)` fails first — that is the pre-fix shape and it is correct).

### Phase 2: Spell the alternation and bundle

**File to modify:** `shared/resources/document-change-log.md` § *How a writer appends a row* — one line inside the fenced `bash` block:

```diff
-  const CL = require("./.agents/skills/{skill}/references/change-log.js");
+  const CL = require("./.agents/skills/{develop|finalise}/references/change-log.js");
```

Add one sentence after the block: *"The braces are not a placeholder: `{develop|finalise}` is the alternation the bundler follows out of shared text (`create-skill` § UNREACHED), so every skill named there ships the engine and no other does — `tests/change-log-engine-reachability.test.js` keeps that list equal to the skills whose prose runs it. Name your skill here when you add a writer."*

Then:

```bash
npm run bundle
git status --porcelain | grep 'change-log.js'          # exactly skills/develop/references/change-log.js (new)
npm run bundle:check                                    # 0 problems; no UNREACHED
command node --test tests/change-log-engine-reachability.test.js   # green
```

**Mutation proofs** (snapshot with `cp`, restore from the snapshot, never `git checkout --`):
1. Alternation → `{finalise}` → third test red naming `develop`.
2. Append a comment line to `skills/develop/references/change-log.js` → second test red on identity.
3. Reword develop's phrase to `via change-log.js` → first test red (floor) — proving the floor catches a population that silently shrank.

### Phase 3: Prove the documented call runs from the bundle

```bash
cp docs/tasks/task.136.shell-fn-probe-entry-form/task.136.shell-fn-probe-entry-form.md /tmp/t.md   # any task doc
command node -e '
  const fs = require("fs");
  const CL = require("./.agents/skills/develop/references/change-log.js");
  const [file, date, version, description, author] = process.argv.slice(1);
  let c = fs.readFileSync(file, "utf8");
  c = CL.upsertChangeLog(c, { date, version, description, author });
  c = CL.bumpUpdated(c, date);
  fs.writeFileSync(file, c);
' /tmp/t.md "$(date +%F)" "" "probe — task.139 Phase 3" develop && tail -3 /tmp/t.md
```

Before the fix this is `Error: Cannot find module './.agents/skills/develop/references/change-log.js'` (task.136 implementation report, Step 3). Record both outputs.

### Phase 4: Docs, CHANGELOG, observation

- CHANGELOG `[Unreleased]` → `### Fixed`: one entry naming the alternation, the test and `develop` gaining the engine.
- `command node .claude/skills/observe-work/references/observation-log.js set-status --id 152 --status actioned --resolution "…PR #N…"`.

## Key Patterns and References

- `skills/create-skill/SKILL.md` § UNREACHED — the rule this task applies; do not restate it in the contract, cite it.
- `tests/bundle-transitive.test.js` — how the alternation discovery is already tested; the new test is a consumer of that behaviour, not a re-test of it.
- `docs/reference/anti-patterns.md` § enumeration — why the population is derived, not listed.

## Testing Approach

- `command node --test tests/change-log-engine-reachability.test.js`, then `npm run ci:fast`, `npm run bundle:check`.
- Phase 3's verbatim one-liner is the integration evidence; paste its output into the implementation report.

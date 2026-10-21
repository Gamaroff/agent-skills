---
id: task.214.plan
title: "Implementation Plan: loop-supervisor probe script resolution"
type: plan
task-ref: task.214.loop-supervisor-probe-script-resolution.md
---

# Implementation Plan: loop-supervisor probe script resolution

> Requirements and success criteria: [task.214.loop-supervisor-probe-script-resolution.md](task.214.loop-supervisor-probe-script-resolution.md)

## Overview

Keep the existing literal as the fallback, add a candidate search that runs inside `resolveAdapter` (the one place that already merges defaults with overrides), and pass it the working directory. An override is applied after the search, so it always wins.

## Phase-by-Phase Implementation Guide

### Phase 1: The resolver

**Files to modify:** `skills/loop-supervisor/references/adapters.js`.

`adapters.js` is CommonJS (`module.exports`) and already does I/O (`git()`), so `fs` is not a new kind of dependency.

```js
const SELECT_NEXT = "develop-next/scripts/select-next.mjs";
const PROBE_SCRIPT_CANDIDATES = [
  ".agents/skills/" + SELECT_NEXT,
  ".claude/skills/" + SELECT_NEXT,
  "skills/" + SELECT_NEXT, // also the fallback when nothing exists
];

function firstExisting(cwd, candidates, exists = fs.existsSync) {
  for (const c of candidates) {
    if (exists(path.join(cwd, c))) return c;
  }
  return candidates[candidates.length - 1];
}
```

In `resolveAdapter(name, config, { cwd = process.cwd() } = {})`, after the shallow copy and **before** the override loop, for adapters with `defaultProbe: true` (set on `develop-next` and `develop-batch`; `generic` has `probeScript: null` and is untouched):

```js
if (merged.defaultProbe) merged.probeScript = firstExisting(cwd, PROBE_SCRIPT_CANDIDATES);
```

The override loop that follows is unchanged, so `over.probeScript != null` replaces it verbatim.

One check to run, not assume: a symlinked `.claude/skills` makes two candidates the same file, which the first-wins rule handles without a realpath; and candidate order matters, so test "two present" explicitly.

### Phase 2: Wire-up, tests, docs

**Files to modify:** `skills/loop-supervisor/scripts/run-loop.mjs` (`adapter = resolveAdapter(opts.adapter, config);` becomes `resolveAdapter(opts.adapter, config, { cwd })`), `evals/loop-supervisor/unit/adapters.test.mjs`, the two documents.

Each test builds a temp project with `fs.mkdtempSync(path.join(os.tmpdir(), "ls-probe-"))`, writes empty `select-next.mjs` files at the chosen candidate paths and calls `resolveAdapter("develop-next", undefined, { cwd })`.

## Key Patterns and References

- Overrides are declarative and verbatim (`resolveAdapter` docstring); do not search or normalise them.
- `probeArgs` reads `this.probeScript`, so no change is needed there once the merged adapter carries the resolved path.
- The existing test "resolveAdapter applies declarative config overrides without mutating the table" keeps its assertions but **needs a temp `cwd`**. Its `probeArgs({}).includes("skills/…")` check resolves against the repository root. There, the gitignored `.agents/skills` symlink makes the result `.agents/skills/…` locally, while CI has no symlink and gets `skills/…`. Give it a temp directory that holds only the `skills/…` candidate. Resolve onto the copy, never the table entry.

## Testing Approach

Cases:

- only `.agents`
- only `.claude`
- only `skills`
- none
- both `.agents` and `skills`
- an override set
- `develop-batch` with the same layouts
- `generic` unaffected
- a call count: a counting `exists` stub must be called at most 3 times, and once when the first candidate exists

Mutation-prove each guard three ways:

- reorder the candidate list
- move the search after the override loop
- let `firstExisting` keep looping after a hit Run `command node --test evals/loop-supervisor/unit/adapters.test.mjs`.

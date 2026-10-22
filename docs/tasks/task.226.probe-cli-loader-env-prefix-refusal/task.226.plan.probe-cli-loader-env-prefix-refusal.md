---
id: task.226.plan
title: "Implementation Plan: security-probe — refuse every LD_* and DYLD_* variable on cli: case fixtures"
type: plan
task-ref: task.226.probe-cli-loader-env-prefix-refusal.md
---

# Implementation Plan: security-probe — refuse every `LD_*` and `DYLD_*` variable on `cli:` case fixtures

> Requirements and success criteria: [task.226.probe-cli-loader-env-prefix-refusal.md](task.226.probe-cli-loader-env-prefix-refusal.md)

## Overview

Replace the exact-name loader entries in `CLI_INTERPRETER_ENV` with a prefix rule, behind one predicate that the `runCliCase` check calls. Test first, and mutation-prove the result.

## Phase-by-Phase Implementation Guide

### Phase 1: Test first

**File:** `shared/resources/tests/security-probe.test.mjs`, the test titled `cli entry (${lang}): fixture.env reaches the child; HOME, PATH, NODE_OPTIONS and LD_PRELOAD in it are declined by name`.

Add to its `[key, detail]` table:

```js
[
  "LD_AUDIT",
  /may not set LD_AUDIT on the cli: form — it steers the interpreter/,
],
[
  "DYLD_FRAMEWORK_PATH",
  /may not set DYLD_FRAMEWORK_PATH on the cli: form — it steers the interpreter/,
],
```

Retitle to `…; HOME, PATH, NODE_OPTIONS and any LD_*/DYLD_* variable in it are declined by name`.

Add the control after the loop: a case with `env: { MY_LD_FLAG: "x" }` plus the `items.json` the fixture CLI needs (copy the `dataCase({ fixture: { files: … } })` shape from the accepted case above it). Assert `executed == 1` and outcome `accepted`.

Run `command node --test --test-name-pattern="cli entry" shared/resources/tests/security-probe.test.mjs` and record that the two new decline rows fail (Node and Python, 4 failures) before Phase 2. The control passes already.

### Phase 2: The prefix refusal

**File:** `shared/resources/security-probe.mjs`

Before (around line 3161):

```js
const CLI_INTERPRETER_ENV = Object.freeze([
  "PATH",
  "NODE_OPTIONS",
  "LD_PRELOAD",
  "LD_LIBRARY_PATH",
  "DYLD_INSERT_LIBRARIES",
  "DYLD_LIBRARY_PATH",
]);
```

After:

```js
const CLI_INTERPRETER_ENV = Object.freeze(["PATH", "NODE_OPTIONS"]);
/** The dynamic loaders' namespaces (glibc `LD_*`, macOS dyld `DYLD_*`): every
 * name in them can load or redirect code before the interpreter starts. */
const CLI_LOADER_ENV_PREFIXES = Object.freeze(["LD_", "DYLD_"]);
const steersInterpreter = (k) =>
  CLI_INTERPRETER_ENV.includes(k) ||
  CLI_LOADER_ENV_PREFIXES.some((p) => k.startsWith(p));
```

The constants are declared after `runCliCase` in the file. That is fine because the call happens at run time, but keep the predicate beside the constants.

The check in `runCliCase` (around line 2590):

```js
const steers = Object.keys(c.fixture?.env ?? {}).find(steersInterpreter);
```

Update the constant's doc comment: "the dynamic-loader variables (any `LD_*` or `DYLD_*` name)". Update the `cli:` header paragraph near line 201 the same way.

### Phase 3: Docs, bundle, changelog

- `shared/resources/probe-boundary-rule.md` §5, the sentence that lists `(`LD_PRELOAD`, `LD_LIBRARY_PATH`, `DYLD_INSERT_LIBRARIES`, `DYLD_LIBRARY_PATH`)`: replace the list with "any `LD_*` or `DYLD_*` variable".
- `CHANGELOG.md` `[Unreleased]`: a `### Fixed` bullet. A `cli:` case's `fixture.env` now refuses every `LD_*`/`DYLD_*` variable (`LD_AUDIT`, `DYLD_FRAMEWORK_PATH`, …), not four exact names, matching what the task 216 entry and the DoD prompt said (task 226).
- `npm run bundle`, then `npm run bundle:check`.
- Mutation: change `k.startsWith(p)` to `k === p` and confirm the four new rows go red, then restore it.

## Key Patterns and References

- The decline path and message are task.216's and stay unchanged.
- Edit `shared/resources/` only. The `references/` copies are regenerated, never hand-edited.

## Testing Approach

- The focused run above, then the whole file, then `npm run ci:fast`.
- `npm run validate` on the four skills whose bundled copies change.

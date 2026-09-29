---
id: task.167.plan
title: "Implementation Plan: Fast-gate precondition — no false HALT under npm loglevel=silent"
type: plan
task-ref: task.167.fast-gate-precondition-npm-loglevel.md
---

# Implementation Plan: Fast-gate precondition — no false HALT under npm loglevel=silent

> Requirements and success criteria: [task.167.fast-gate-precondition-npm-loglevel.md](task.167.fast-gate-precondition-npm-loglevel.md)

## Overview

Write the three silent-environment cases first and watch the two "does not HALT" cases fail. Then add
one flag to the shipped block, regenerate the bundle, and mutation-prove it.

## Phase-by-Phase Implementation Guide

### Phase 1: Tests first

**File:** `evals/shared/tests/fast-gate-precondition.test.mjs`

Extend `runCheck` with two optional fields. Keep the existing callers unchanged:

```js
function runCheck({ shell, gateCommand, scripts, env, npmrc }) {
  const dir = mkdtempSync(join(tmpdir(), "fast-gate-"));
  try {
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "fixture", version: "1.0.0", scripts }));
    if (npmrc !== undefined) writeFileSync(join(dir, ".npmrc"), npmrc);
    // ...
      r = spawnSync(shell, ["-c", script], {
        cwd: dir,
        encoding: "utf-8",
        timeout: SPAWN_TIMEOUT_MS,
        ...(env ? { env: { ...process.env, ...env } } : {}),
      });
```

Add the cases inside `for (const shell of SHELLS)`:

```js
const SILENT = { npm_config_loglevel: "silent" };

test(`[${shell}] under npm_config_loglevel=silent a defined script does not HALT`, () => {
  const { code, out } = runCheck({ shell, gateCommand: "npm run ci:fast", scripts: WITH_FAST, env: SILENT });
  assert.equal(code, 0, `a silent log level hid the script listing (obs #213):\n${out}`);
});

test(`[${shell}] under npm_config_loglevel=silent a missing script still HALTs`, () => {
  const { code, out } = runCheck({ shell, gateCommand: "npm run ci:fast", scripts: WITHOUT_FAST, env: SILENT });
  assert.equal(code, 1);
  assert.match(out, /develop\.fastGateCommand/);
});

test(`[${shell}] a project .npmrc with loglevel=silent does not HALT a defined script`, () => {
  const { code, out } = runCheck({ shell, gateCommand: "npm run ci:fast", scripts: WITH_FAST, npmrc: "loglevel=silent\n" });
  assert.equal(code, 0, out);
});
```

Update the header comment's spawn count to match.

### Phase 2: The flag

**File:** `shared/resources/develop-pipeline-step-3-develop-loop.md`, the precondition block.

Before:

```bash
# `npm run` with no arguments lists the scripts the project actually defines,
# one per line, indented by two spaces.
GATE_SCRIPT=$(printf '%s' "$FAST_GATE_COMMAND" | sed -nE 's/^npm run ([A-Za-z0-9:_-]+).*/\1/p')
if [ -n "$GATE_SCRIPT" ] && ! npm run 2>/dev/null | grep -qE "^[[:space:]]+${GATE_SCRIPT}$"; then
```

After:

```bash
# `npm run` with no arguments lists the scripts the project actually defines,
# one per line, indented by two spaces. npm prints that listing as log output, so
# `loglevel=silent` (an .npmrc, or `npm run -s` upstream) hides it; the flag pins
# the level so a defined script is never reported missing (task 167, obs #213).
GATE_SCRIPT=$(printf '%s' "$FAST_GATE_COMMAND" | sed -nE 's/^npm run ([A-Za-z0-9:_-]+).*/\1/p')
if [ -n "$GATE_SCRIPT" ] && ! npm run --loglevel=notice 2>/dev/null | grep -qE "^[[:space:]]+${GATE_SCRIPT}$"; then
```

Then `npm run bundle` (the three `references/` copies) and `npm run bundle:check`.

## Key Patterns and References

- The spawn timeout comes from `spawnBudget("FAST_GATE_PRECONDITION")`. Never a literal: `tests/test-harness-concurrency.test.js` fails on `timeout: <number>`.
- The snippet is substituted with a replacer function (`replaceAll(PLACEHOLDER, () => gateCommand)`). Keep that.
- Edit the `shared/resources/` source only. The bundle overwrites a `references/` edit.

## Testing Approach

- `command node --test evals/shared/tests/fast-gate-precondition.test.mjs`: red after Phase 1, green after Phase 2
- Mutation: drop the flag and observe the two silent "does not HALT" cases red in every shell; restore
- `npm_config_loglevel=silent command node --test evals/shared/tests/fast-gate-precondition.test.mjs`: green (the obs #213 reproduction)

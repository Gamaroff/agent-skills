---
id: task.225.plan
title: "Implementation Plan: loop-supervisor: find a replacement probe script after a stale hit"
type: plan
task-ref: task.225.loop-supervisor-probe-stale-hit-replacement.md
---

# Implementation Plan: loop-supervisor: find a replacement probe script after a stale hit

> Requirements and success criteria: [task.225.loop-supervisor-probe-stale-hit-replacement.md](task.225.loop-supervisor-probe-stale-hit-replacement.md)

## Overview

On a stale `require.resolve` hit, `resolvesAsMain` asks a fresh `node` process to resolve the script. A live hit and a miss behave as today, with no spawn.

## Phase-by-Phase Implementation Guide

### Phase 1: The fallback

**Files to modify:**

- `skills/loop-supervisor/references/adapters.js`. `execFileSync` and `fs` are already required at the top of the file.

**Exact changes** (around `resolvesAsMain`, `adapters.js:378`):

```js
/**
 * The path `node <file>` would run, resolved in a fresh process, or null.
 * A fresh process has an empty resolution cache. In this process a stale hit
 * survives clearing Module._pathCache (Node v26.8.2), so it cannot be dropped
 * here (task 225).
 *
 * @param {string} file an absolute path
 * @returns {string | null}
 */
function resolveInFreshNode(file) {
  try {
    return execFileSync(
      process.execPath,
      ["-e", "process.stdout.write(require.resolve(process.argv[1]))", file],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 10000 },
    ) || null;
  } catch {
    return null;
  }
}

function resolvesAsMain(file, freshResolve = resolveInFreshNode) {
  let resolved;
  try {
    resolved = require.resolve(file);
  } catch {
    return false; // a miss is not cached: a file that appears later resolves
  }
  if (fs.existsSync(resolved)) return true;
  // A stale cached hit: the file it named is gone, but another may now resolve.
  return freshResolve(file) !== null;
}
```

Check that `-e` code receives `file` as `process.argv[1]`. With `node -e <code> <arg>`, `process.argv` is `[execPath, <arg>]`. The repro script `cr3-probe.cjs` used exactly this call and printed `tools/select/index.js`.

Extend the existing doc comment's QA-3 sentence: a stale hit goes to `resolveInFreshNode`, so a replacement in another shape is found (task 225 / CR-1).

Add `resolvesAsMain` to `module.exports`.

### Phase 2: Tests and changelog

**Files to modify:**

- `evals/loop-supervisor/unit/adapters.test.mjs`: add `rmSync` to the `node:fs` import (line 15), and `resolvesAsMain` to the adapters import. Place the tests after the QA-3 pair (`adapters.test.mjs:571`).

```js
// task 225 (CR-1): a stale hit whose file is replaced by another shape.
const SWAPS = [
  { name: "file → directory", before: "tools/select.js", after: "tools/select/index.js" },
  { name: "directory → file", before: "tools/select/index.js", after: "tools/select.js" },
];
for (const s of SWAPS) {
  test(`probeMissing finds a replacement after a stale hit: ${s.name}`, () => {
    const cwd = mkdtempSync(path.join(os.tmpdir(), "ls-replace-"));
    const put = (rel) => {
      mkdirSync(path.dirname(path.join(cwd, rel)), { recursive: true });
      writeFileSync(path.join(cwd, rel), "");
    };
    put(s.before);
    const a = resolveAdapter("develop-next",
      { loopSupervisor: { adapters: { "develop-next": { probeScript: "tools/select" } } } },
      { cwd });
    assert.equal(probeMissing(a, cwd), null, "before");
    rmSync(path.join(cwd, "tools"), { recursive: true });
    put(s.after);
    assert.equal(probeMissing(a, cwd), null, "replacement found");
    rmSync(path.join(cwd, "tools"), { recursive: true });
    const r = probeMissing(a, cwd);
    assert.ok(r && r.reason.startsWith("probe script not found: tools/select"), r && r.reason);
  });
}
```

Spawn-count test: in a fresh temp directory, call `resolvesAsMain` with a counting `freshResolve`. A miss on an absent path makes 0 calls. A live hit makes 0. After deleting the file, the stale hit makes 1. Use a counter that returns `null`, so the result is also `false`.

Mutation proof: back up `adapters.js`, change the last line of `resolvesAsMain` to `return false;`, and run the file. Both SWAPS tests must fail. Restore the file and check `git diff --stat`.

- `CHANGELOG.md`: add under `[Unreleased]` → `### Fixed`: "**loop-supervisor: a replacement probe script is found after a stale hit (task 225).**" One sentence on the swap case.

## Key Patterns and References

- The QA-3 tests at `adapters.test.mjs:571` show the one-process, real-filesystem pattern to copy.
- Use `command node`, never bare `node`.
- `.agents/skills` is a gitignored symlink. Move it aside before trusting a local green.

## Testing Approach

The tests use the real filesystem and the real `require.resolve`, in the `node --test` process, with a unique temp directory per test. Only the spawn-count test injects. It calls `resolvesAsMain` directly, because `probeMissing`'s `exists` parameter would bypass the fallback.

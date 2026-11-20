---
id: task.314.plan
title: "Implementation Plan: The security probe engine loads a TypeScript entry"
type: plan
task-ref: task.314.probe-engine-loads-a-typescript-entry.md
---

# Implementation Plan: The security probe engine loads a TypeScript entry

> Requirements and success criteria: [task.314.probe-engine-loads-a-typescript-entry.md](task.314.probe-engine-loads-a-typescript-entry.md)

## Overview

When the module entry path ends in `.ts`, `.mts`, `.cts` or `.tsx`, start the `RUNNER` child with a fixed
`--import <bundled hook>` argument. The hook borrows the target repository's own `typescript` package to
resolve and transpile. The `RUNNER` string does not change.

## Phase-by-Phase Implementation Guide

### Phase 0: Settle the facts

**Commands (record each result in the QA report, not here):**

- Hook API on the lowest supported Node: `docker run --rm node:22-trixie node -e "console.log(process.version, typeof require('node:module').registerHooks, typeof require('node:module').register)"`.
  The local Node is v26.13.0 (`registerHooks` is a function there). If Node 22 lacks `registerHooks`,
  use async `module.register()` with a `data:` or file URL hook module, or raise `"engines"`.
- Per-child cost: five runs each of `node -e 0`, `node --import <hook> -e 0` (with the repo's compiler),
  `uptime` beside every run. Report the median; report, do not drop, outliers.
- Transpile-once alternative: in the parent, run `ts.transpileModule` over the entry and its relative
  imports into the out-of-tree scratch dir (task.250), import the output. Rewriting specifiers is the
  cost of that route; pick it only if the per-child number is a problem.

### Phase 1: The hook and the fixture family

**Files to add:** the hook beside `security-probe.mjs` in `shared/resources/` (a bare-filename sibling),
and a fixture directory for the tests.

**Starting point (the handoff's prototype, unverified here; the repo root arrives through the
environment, never through a string built from a case):**

```js
import { registerHooks, createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const ts = createRequire(process.env.PROBE_REPO_ROOT + "/")("typescript");
const optsFor = new Map();
function compilerOptions(file) {
  const cfg = ts.findConfigFile(dirname(file), ts.sys.fileExists, "tsconfig.json");
  if (!cfg) return {};
  if (!optsFor.has(cfg)) {
    const { config } = ts.readConfigFile(cfg, ts.sys.readFile);
    optsFor.set(cfg, ts.parseJsonConfigFileContent(config, ts.sys, dirname(cfg)).options);
  }
  return optsFor.get(cfg);
}
registerHooks({
  resolve(spec, ctx, next) {
    if (ctx.parentURL?.startsWith("file:") && /\.[cm]?tsx?$/.test(ctx.parentURL) && !spec.startsWith("node:")) {
      const parent = fileURLToPath(ctx.parentURL);
      const r = ts.resolveModuleName(spec, parent, compilerOptions(parent), ts.sys).resolvedModule;
      if (r && !r.isExternalLibraryImport) return { url: pathToFileURL(r.resolvedFileName).href, shortCircuit: true };
    }
    return next(spec, ctx);
  },
  load(url, ctx, next) {
    if (!/\.[cm]?tsx?$/.test(url) || /\.d\.[cm]?ts$/.test(url)) return next(url, ctx);
    const file = fileURLToPath(url);
    const out = ts.transpileModule(readFileSync(file, "utf8"), { fileName: file,
      compilerOptions: { ...compilerOptions(file), module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022,
                         verbatimModuleSyntax: false, sourceMap: false, declaration: false } });
    return { format: "module", source: out.outputText, shortCircuit: true };
  },
});
```

**Review the prototype before building on it:**

- The `require` of `typescript` throws a raw error when absent, and a throw inside an `--import` hook kills
  `node` before `RUNNER` runs. So the engine resolves `typescript` from the root **in the parent**, before
  it spawns, and declines by name (Phase 2); the hook may assume the compiler resolves. The same
  parent-side check covers a Node without `registerHooks` (review 1, I1).
- The entry itself (the first module) has no `parentURL`, so `resolve` falls through to Node, which can
  load a `.ts` file only if `load` handles it. Check the entry path loads, not only its imports.
- Check each fixture shape from the task: parameter property, `enum`, `namespace`, value import under
  `"type": "commonjs"`, extensionless import, `paths` alias, NodeNext `./x.js` resolving to `x.ts`,
  decorator, `"type": "module"` package, `.tsx`.

**Fixture compiler.** Decide here: a pinned `typescript` devDependency (recommended: a test that skips
without the compiler is vacuous, and CI-tool-skip guards fail it under `CI=true`). `typescript` is not
installed in this repository today (`ls node_modules/typescript/package.json` fails on 2026-11-20), so
adding it changes `package.json` and the lockfile; say so in the PR.

### Phase 2: Wire the module entry form

**File:** `shared/resources/security-probe.mjs`.

- At the spawn (around `:2234`, `["--input-type=module", "-e", RUNNER]`), insert
  `"--import", <absolute hook path>` before `--input-type` only when the resolved entry path matches
  `/\.(ts|mts|cts|tsx)$/`. The hook path is a constant derived from `import.meta.url`, never from input.
- Pass the repo root as a `bindings` value to `sandboxEnv({ cwd: workDir, bindings: {...} })`
  (`qa-execute-snippets.mjs:4518`). Use the root `resolveEntry` already validated, not a re-read of the
  flag. Check `sandboxEnv` does not strip an unknown binding name.
- Named decline: add a `reason` for "no compiler" next to the existing `entry-not-probeable` handling;
  the detail carries the root searched. Update the declines table in `probe-boundary-rule.md`.
- Header: add `.ts`/`.mts`/`.cts`/`.tsx` to the entry-form list at the top of the file.

### Phase 3: Tests

Place a new suite beside `security-probe.test.mjs` (`shared/resources/tests/`).

- **Fixture test:** one case per shape above; assert each export scores `rejected` or `accepted`.
- **Calibration:** refusing control scores held; accept-everything control scores reproduced.
- **Mutation proof:** (a) remove the `--import` argument: the fixture test goes red with
  `entry-not-probeable`. (b) remove the `paths` branch: only the alias case goes red. Record the red
  test names.
- **Decline:** run with a repo root that has no `typescript`: assert the named reason and the root.
- **Second layer:** a repo root outside containment with an entry inside it, to defeat the first check.
- **Escape:** run under the engine's escape detection; assert nothing is written in the repo.
- **Interpolation:** assert the child's argv equals the fixed list plus the hook path, and the hook source
  contains no case value.
- Name the removal of every temp directory (`t.after` or a shared helper); `scripts/test-tmpdir.mjs`
  rejects new leaking prefixes.

### Phase 4: Bundle and document

- `npm run bundle`, then `npm run bundle:check`. Confirm the hook appears under every skill that
  ships `security-probe.mjs` (the engine must reference it by bare filename or the bundler will not copy it;
  verify with `git ls-files 'skills/*/references/<hook>'`).
- After the doc edits run the tests that pin them: `evals/shared/tests/finalise-dod-prompt-contract.test.mjs`,
  `evals/shared/tests/probes-executed-population.test.mjs`, `evals/shared/tests/qa-gate-preconditions-parity.test.mjs`,
  `tests/shared-script-literals.test.js`, and `tests/bundled-links.test.js` (review 1, I2 and I3).
- Docs: engine header; `probe-boundary-rule.md` (the "six entry forms" paragraph, declines table);
  `skills/finalise/SKILL.md` step 3b.1 item 6 (zero-guard) so a TypeScript entry is reachable and the
  override stays the exception.
- `CHANGELOG.md` `[Unreleased]`: cite (task 314).
- `npm run generate-catalog` only if a skill description changed.

## Key Patterns and References

- Prior entry forms: tasks 128, 136, 144, 180, 181, 215, 190 (handoff list; confirm in the registry).
- `shared/resources/` files cite siblings by bare filename.
- Edit `shared/resources/` sources only; bundled copies are generated.

## Testing Approach

Run `CI=true npm run test:remote` (LAN server). Locally, run only the one suite
(`command node --test shared/resources/tests/<suite>`).

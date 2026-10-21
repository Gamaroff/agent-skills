---
id: task.224.plan
title: "Implementation Plan: loop-supervisor: say when the probe script is not found"
type: plan
task-ref: task.224.loop-supervisor-probe-not-found.md
---

# Implementation Plan: loop-supervisor: say when the probe script is not found

> Requirements and success criteria: [task.224.loop-supervisor-probe-not-found.md](task.224.loop-supervisor-probe-not-found.md)

## Overview

Split `firstExisting` into a `null`-returning `findExisting` and the existing fallback wrapper, record the searched candidates on the resolved adapter, and check for the probe file in `runProbe` before spawning. The default path literal becomes one constant.

## Phase-by-Phase Implementation Guide

### Phase 1: The not-found check and the single default

**File:** `skills/loop-supervisor/references/adapters.js`

**Constants** (near `const SELECT_NEXT`, `adapters.js:216`):

```js
const SELECT_NEXT = "develop-next/scripts/select-next.mjs";
const DEFAULT_PROBE_SCRIPT = "skills/" + SELECT_NEXT;
const PROBE_SCRIPT_CANDIDATES = Object.freeze([
  ".agents/skills/" + SELECT_NEXT,
  ".claude/skills/" + SELECT_NEXT,
  DEFAULT_PROBE_SCRIPT,
]);
```

Update the comment above it: the last entry is still the fallback path, but a missing selector is now reported by `probeMissing` and is no longer "the probe error it always did".

**`findExisting` and `firstExisting`** (`adapters.js:234`):

```js
function findExisting(cwd, candidates, exists = fs.existsSync) {
  for (const c of candidates) {
    if (exists(path.join(cwd, c))) return c;
  }
  return null;
}

function firstExisting(cwd, candidates, exists = fs.existsSync) {
  return findExisting(cwd, candidates, exists) ?? candidates[candidates.length - 1];
}
```

`firstExisting` keeps its exported signature and results, so the existing `firstExisting` tests stay green unchanged.

**Table entries** (`adapters.js:256`, `:275`): `probeScript: DEFAULT_PROBE_SCRIPT,` in both.

**`resolveAdapter`** (`adapters.js:336-341`):

```js
if (merged.defaultProbe) {
  const hit = findExisting(cwd, PROBE_SCRIPT_CANDIDATES);
  merged.probeScript = hit ?? DEFAULT_PROBE_SCRIPT;
  merged.probeSearched = hit ? null : PROBE_SCRIPT_CANDIDATES.slice();
}
for (const key of ["stateFile", "lockFile", "haltFile", "probeScript", "command"]) {
  if (over[key] != null) merged[key] = over[key];
}
if (over.probeScript != null) merged.probeSearched = null;
```

Each call returns a fresh array, so a caller cannot mutate the frozen constant through it. Update the JSDoc to describe `probeSearched`.

**`probeMissing`** (new, after `resolveAdapter`):

```js
/**
 * The probe-not-found error for `adapter` under `cwd`, or null when there is
 * no probe or its script exists. Runs before the spawn: a missing script would
 * otherwise reach interpretProbe as empty stdout, whose message is about a
 * symlink problem this is not.
 */
function probeMissing(adapter, cwd, exists = fs.existsSync) {
  const script = adapter && adapter.probeScript;
  if (!script) return null;
  if (exists(path.resolve(cwd, script))) return null;
  const searched = adapter.probeSearched;
  const reason = searched
    ? "probe script not found: " + script + " (searched " + searched.join(", ") +
      "). Install the skills under .agents/skills/, or set loopSupervisor.adapters." +
      adapter.name + ".probeScript."
    : "probe script not found: " + script + " (configured by loopSupervisor.adapters." +
      adapter.name + ".probeScript).";
  return { status: "error", reason };
}
```

**Exports:** add `DEFAULT_PROBE_SCRIPT`, `findExisting` and `probeMissing` to `module.exports`.

### Phase 2: Wire-up, tests, docs

**`skills/loop-supervisor/scripts/run-loop.mjs`**: `runProbe` (`:1037`):

```js
function runProbe(adapter, opts, cwd, nodeBin) {
  const args = adapter.probeArgs(
    opts.roadmap ? { roadmapPath: opts.roadmap } : {},
  );
  if (!args) return { status: "selected", reason: "no probe for this adapter" };
  const missing = probeMissing(adapter, cwd);
  if (missing) return missing;
  const res = spawnSyncCapture(nodeBin, args, cwd, 30000);
  return interpretProbe(res);
}
```

Add `probeMissing` to the existing import from `../references/adapters.js`. Check how `run-loop.mjs` imports it today (`grep -n "adapters.js" skills/loop-supervisor/scripts/run-loop.mjs`) and follow that form.

**`evals/loop-supervisor/unit/adapters.test.mjs`**:

- `findExisting`: empty temp dir → `null`; one present → that candidate.
- `resolveAdapter` in an empty temp dir: `probeSearched` deep-equals `PROBE_SCRIPT_CANDIDATES`, and is not the same array (`!==`). With one candidate present → `null`. With `{ loopSupervisor: { adapters: { "develop-next": { probeScript: "tools/missing.mjs" } } } }` → `null`.
- `probeMissing`: `generic` adapter → `null`; existing file → `null`; searched miss → reason starts `probe script not found: skills/develop-next/scripts/select-next.mjs` and includes all three candidates; override miss → names `loopSupervisor.adapters.develop-next.probeScript` and does not include `.agents/skills/`; an absolute override pointing at an existing temp file → `null`.
- CR-2: for both adapters, `ADAPTERS[name].probeScript === PROBE_SCRIPT_CANDIDATES.at(-1)`.
- Rename the `:301` test title to say the default path is kept and the miss is recorded in `probeSearched`, then add a `probeSearched` assertion to it.

**`evals/loop-supervisor/unit/run-loop.test.mjs`**: `dryRun` (`:739`) hardcodes `--adapter generic --command x`. Give it an options argument (for example `dryRun(extra, { adapter: "develop-next" })`) that replaces those three argv entries, without changing the existing callers. Then add: `dry-run --adapter develop-next` in the helper's empty `work` dir → `json.probe.status === "error"` and `json.probe.reason` starts `probe script not found:`. Before you assert, confirm the dry-run JSON field name for the probe (`run-loop.mjs:1125` onwards).

**Docs**:

- `skills/loop-supervisor/README.md:172`: add that when no candidate exists the probe stops with `probe script not found`, listing the paths searched.
- `docs/reference/configuration.md:301`: the same clause, and say that a missing override is reported by its configured path.
- `CHANGELOG.md` `[Unreleased]`: a Fixed entry citing task 224.

## Key Patterns and References

- Every test uses a temp `cwd` (`fs.mkdtempSync`). The `.agents/skills` symlink is gitignored, so a repository-root resolve differs between a laptop and CI (task.214 § 3).
- The `{ status: "error", reason }` shape is the existing probe contract (`PROBE_STATUSES`, `interpretProbe`); dry-run sets `ok: probe.status !== "error"`.
- `interpretProbe`'s empty-stdout message is untouched: `classify.test.mjs:330` uses it as a fixture.

## Testing Approach

```bash
command node --test evals/loop-supervisor/unit/adapters.test.mjs evals/loop-supervisor/unit/run-loop.test.mjs
command node --test 'evals/loop-supervisor/unit/*.test.mjs'
npm run validate -- skills/loop-supervisor/
```

Run the full suite once with `.agents/skills` moved aside, and restore it afterwards.

Mutation-prove:

1. `probeMissing` returns `null` unconditionally: the not-found unit tests and the dry-run test go red.
2. Drop `if (over.probeScript != null) merged.probeSearched = null;`: the override test goes red.
3. Remove the `probeMissing` call from `runProbe`: the dry-run test goes red, because its reason becomes "probe produced no output".

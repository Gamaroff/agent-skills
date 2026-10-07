---
id: task.190.plan
title: "Implementation Plan: Probe engine refuses what it cannot score"
type: plan
task-ref: task.190.probe-engine-refuses-what-it-cannot-score.md
---

# Implementation Plan: Probe engine refuses what it cannot score

> Requirements and success criteria: [task.190.probe-engine-refuses-what-it-cannot-score.md](task.190.probe-engine-refuses-what-it-cannot-score.md)

## Overview

Three small, independent changes to `shared/resources/security-probe.mjs`, each with its own tests:
validate supplied cases before anything runs, fix the default root for bundled copies and refuse a
missing entry before the record, and add declined reasons to the record.

## Phase 1: `validateCases`

```js
import { MATERIALISED_SINKS, corpusFor, DIRECTIONS, SINKS } from "./security-input-corpus.mjs";

/** First bad case, or null. Fields checked: direction (required), sink (optional). */
export function validateCases(cases) {
  if (!Array.isArray(cases)) return { id: "(file)", field: "cases", value: typeof cases, accepted: ["array"] };
  for (const [i, c] of cases.entries()) {
    const id = c && typeof c === "object" && c.id != null ? String(c.id) : `#${i}`;
    if (!c || typeof c !== "object") return { id, field: "case", value: typeof c, accepted: ["object"] };
    if (!DIRECTIONS.includes(c.direction)) return { id, field: "direction", value: c.direction, accepted: [...DIRECTIONS] };
    if (c.sink !== undefined && !SINKS.includes(c.sink)) return { id, field: "sink", value: c.sink, accepted: [...SINKS] };
  }
  return null;
}
```

- `main`, immediately after the `--cases-file` `JSON.parse` block and **before**
  `preflightRecord`: on a non-null result write
  `bad-cases: case "${id}" has ${field} ${JSON.stringify(value)}; accepted: ${accepted.join(", ")}`
  to stderr (and the JSON shape under `--json`), `return 2`.
- `runProbeSpec`, at `if (Array.isArray(cases))`: same check, `return decline("bad-cases", msg)`.
- Confirm the corpus module actually exports `SINKS` and `DIRECTIONS` under those names
  (`security-input-corpus.mjs:29`, `:40`) and that the corpus's own cases all pass (run
  `validateCases(corpusFor(s))` for every sink in a test — a corpus case failing it is a corpus bug,
  not a reason to loosen the check).
  Measured on `b1807611` with a one-off `command node --input-type=module` loop over
  `SINKS` × `corpusFor`: 102 corpus cases across 7 sinks, none failing the check. The test re-measures
  it; the figure is not a contract. The same day, no committed `*.json` file carried a `direction`
  outside `hostile`/`legitimate`.
- Committed cases files: `git ls-files '*.json' | xargs grep -l '"direction"'` and check each.

## Phase 2: default root and missing entry

```js
export function defaultRepoRoot() {
  const twoUp = resolve(__dirname, "..", "..");
  // In the source tree the engine lives in shared/resources: two up is the repo.
  if (basename(__dirname) === "resources" && basename(dirname(__dirname)) === "shared") return twoUp;
  // A bundled copy lives in <skills>/<skill>/references, and two up is the skills dir
  // (obs #211). The consumer's repo is the git checkout the caller runs in.
  const r = spawnSync("git", ["rev-parse", "--show-toplevel"], { cwd: process.cwd(), encoding: "utf8" });
  return r.status === 0 && r.stdout.trim() ? r.stdout.trim() : twoUp;
}
```

Check `spawnSync`/`basename` imports already present before adding them. `defaultRepoRoot()` is
used as a default parameter (`:371`, `:881`), so it runs per call. Keep it cheap: one `git` call.

`main`: before `preflightRecord`, when `opts.entry` names a file path (the JS `path#export` form and
`cli:` / `shell-fn:` forms), resolve it with `resolveEntry(entry, root)` and `existsSync` the path;
missing → stderr `entry-not-found: <path> (repo root <root>)`, `return 2`. Read `resolveEntry`'s
return shape first; it already separates path and export.

**Test for the bundled-copy default**: in a temp git repo, copy `security-probe.mjs` and
`security-input-corpus.mjs` to `skills/x/references/`, run it with `cwd` at the repo root via
`command node -e "import('./skills/x/references/security-probe.mjs').then(m => console.log(m.defaultRepoRoot()))"`,
assert the repo root. Use a durable scratch base: `/tmp` is treated as ephemeral by several
helpers in this repo.

## Phase 3: record

`toRecordEntry` (`:2030`): add

```js
declined_cases: (result.declined ?? []).map(({ id, reason, detail }) => ({ id, reason: reason ?? null, detail: detail ?? null })),
```

Then `git grep -n 'declined' -- 'shared/resources/*.mjs' 'shared/resources/*.js' 'shared/resources/*.md'`
and confirm each reader uses the count. The printed YAML block (around `:1917`) stays count-based.

## Key Patterns and References

- Usage errors exit 2 with a `reason`: the existing `cannot read --cases-file` / `cannot use
  --record` arms in `main`.
- Declines carry `{id, reason, detail}`: `decline()` inside `runProbeSpec`.

## Testing Approach

`command node --test shared/resources/tests/security-probe.test.mjs`, then `npm test` and
`npm run bundle:check`. Record the three mutation proofs' red output in the implementation report.

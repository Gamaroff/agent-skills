---
id: task.111.plan
title: "Implementation Plan: local parity with CI"
type: plan
task-ref: task.111.local-ci-parity.md
---

# Implementation Plan: local parity with CI

> Requirements and success criteria: [task.111.local-ci-parity.md](task.111.local-ci-parity.md)

## Overview

Five small changes with one theme: what CI checks, a contributor can check first. The one that is
not small in consequence: `evals/shared/tests/ci-gate-parity.test.mjs` currently asserts `expand(ci)`
equals the scripts of `test.yml`'s `test` job **and nothing else** — so recomposing `ci` turns it
red. Widen the test first (Phase 1b); the composition is then the thing the test proves.

## Phase-by-Phase Implementation Guide

### Phase 1: `scripts/lint-shell.sh`, `check:generated` and `ci`

`scripts/lint-shell.sh` (bash, `set -euo pipefail`): reproduce the workflow's `mapfile` file list,
the ≥200 guard, the empty guard and `--severity=warning`; when `command -v shellcheck` fails print
`shellcheck not installed — lane skipped (CI runs it; container form in CONTRIBUTING.md)` and exit 0.
Not an inline `xargs` one-liner: an empty list behaves differently per xargs implementation, and a
package.json string cannot carry the guards or be linted.

```json
"lint:shell": "bash scripts/lint-shell.sh",
"check:generated": "npm run generate-catalog && npm run generate-skill-deps && git diff --exit-code -- docs/reference/skill-catalog.md README.md shared/resources/skill-dependencies.json",
"ci": "npm run ci:fast && npm run eval:all && npm run validate:all && npm run check:generated && npm run bundle:check && npm run lint:shell"
```

Every `ci` term is an `npm run <script>` — `isComposite()` in the parity test requires it. Add a
one-line comment in `shellcheck.yml` naming the script as its twin; nothing else in the workflow
changes.

### Phase 1b: widen `ci-gate-parity.test.mjs`

Replace the single `TEST_JOB` with a table:

```js
const GREEN_JOBS = [
  { workflow: ".github/workflows/test.yml",       job: "test" },
  { workflow: ".github/workflows/validate.yml",   job: "validate" },
  { workflow: ".github/workflows/shellcheck.yml", job: "shellcheck" },
];
// step name → local script that reproduces it (many-to-one allowed)
const LANE_TWINS = {
  "Validate all skills": "validate:all",
  "Catalog up-to-date check": "check:generated",
  "Skill dependency graph up-to-date check": "check:generated",
  "Bundle freshness — per-file check": "bundle:check",
  "Lint source shell scripts": "lint:shell",
};
const SETUP_STEPS = ["Install PyYAML", "Install awk variants", "Install dependencies", "Install ShellCheck (pinned)"];
const EXCLUDED_STEPS = { "Bundle freshness check": "regenerate-and-diff; the pre-commit hook re-bundles on every commit that can stale a copy, and bundle:check covers the read-only half" };
```

`jobBlock` takes the workflow text as an argument. For each `- name:` + `run:` pair in a green job:
`scriptInvokedBy(run)` non-null → that script; else name in `LANE_TWINS` → the twin; else in
`SETUP_STEPS` or `EXCLUDED_STEPS` → skip; else **fail**, naming the workflow, job and step. Then the
existing `deepEqual(sorted(expand("ci")), sorted(mapped))`. Also assert every `LANE_TWINS` /
`SETUP_STEPS` / `EXCLUDED_STEPS` key is actually present in some green job — a stale key is the
map drifting from the workflow in the other direction. Keep the existing tests (`npm ci` guard,
tiering, named tiers, doc rows) unchanged.

### Phase 2: wrapper test

New file `evals/shared/tests/develop-pipeline-hook-wrappers.test.mjs` (already matched by the
`npm test` glob `evals/shared/tests/*.test.mjs` — no suite-list edit). Borrow the sandbox and
`t.after` cleanup style from `install-hooks-behavior.test.mjs`, but do **not** extend that file: it
tests the shared installer with stubbed hooks and never executes a wrapper.

Population: `fs.readdirSync("skills").filter(s => s.startsWith("develop-"))`, keep those with a
`scripts/` dir containing any of `install-hooks.sh`, `on-precompact.sh`, `on-stop.sh`; assert
≥ 3 pipelines and 3 wrappers each (a table of nine). Per wrapper:

1. Read it; assert it `exec`s `"$(dirname "$0")/../references/develop-pipeline-<name>.sh" "$@"` and
   that `skills/<pipeline>/references/develop-pipeline-<name>.sh` exists in the tree.
2. Sandbox: `mkdtemp`, create `<sb>/skills/<pipeline>/scripts/` and `<sb>/skills/<pipeline>/references/`,
   copy the wrapper in, plant a stub reference that prints `ARGS=$*`, echoes stdin, exits 7.
3. `spawnSync("bash", [wrapper, "--a", "b c"], { input: '{"e":1}' })` → stdout contains `ARGS=--a b c`
   and `{"e":1}`, status 7. That proves argv, stdin and exit status all pass through the `exec`.

Mutation to record: edit `skills/develop-task/scripts/on-stop.sh` to drop `"$@"` → the test fails
naming `develop-task/on-stop.sh`; revert.

### Phase 3: description cap

In `quick_validate.py`, after the existing normalisation (`description = ' '.join(...)`), before the
word-count warning: `if len(description) > 1024: return False, f"description is {len(description)} chars (max 1024 — Agent Skills spec)"`.
Measured 2026-09-16 on the normalised string: develop-story 1,025, sync-jira-bug 1,023, everything
else well under. Trim `develop-story`'s to ≤ ~1,000 without losing a trigger phrase (the
"Invoke with …" tail and the parenthetical feature list are the fat). Leave sync-jira-bug.

### Phase 4: docs

`releases.md` checklist: one line above the workflow boxes — "`npm run ci` mirrors `test.yml`,
`validate.yml` (all but the regenerate-and-diff bundle step) and `shellcheck.yml` locally;
`docs-link-check` and `branch-policy` have no local form." `docs/contributing/evals/README.md`: the
"If `npm test` is green, every push will stay green" line becomes "If `npm run ci` is green …" with
`npm test` named as the fast subset. Mention `check:generated` beside the existing
`generate-catalog` note. CHANGELOG under Unreleased.

## Key Patterns and References

- `.github/workflows/shellcheck.yml` (file list, severity, the ≥200/empty guard)
- `docs/contributing/traps.md` — "npm test's suite list is hand-maintained": the wrapper test lands
  in `evals/shared/tests/`, whose glob is already listed; verify with `npm test 2>&1 | grep hook-wrappers`.
- `evals/shared/tests/ci-gate-parity.test.mjs` — `isComposite`, `expand`, `jobBlock`; keep them.

## Testing Approach

Run each mutation in §8 and record the failing test name in the implementation report.

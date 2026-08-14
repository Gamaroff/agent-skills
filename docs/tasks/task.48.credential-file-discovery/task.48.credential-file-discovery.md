---
id: task.48
title: '[Task 48] Credentials may live at `.secrets/tooling.env`, and a missing one no longer fails silently'
type: task
description: 'Both credential loaders — shared/resources/jira-sync.js (bundled into 14 skills) and shared/resources/gh-stage.js (8) — read a hardcoded repo-root .env and returned silently when it was missing. An Nx consumer cannot keep tooling tokens in a root .env, because Nx loads workspace .env files into process.env of every task it runs; a different path is the fix and no flag substitutes for it. Both loaders now search .secrets/tooling.env then .env in each root they know about, merging every candidate. jira-sync.js additionally warns on stderr when the required keys are still unset, ending a failure mode where every tracker sync ran, reported success, and updated nothing.'
tags: [credentials, jira-sync, gh-stage, nx, testing]
category: infrastructure
status: accepted
priority: High
risk_level: medium
created: 2026-08-14
updated: 2026-08-14
estimated_effort_hours: 4
---

# [Task 48] Credentials may live at `.secrets/tooling.env`, and a missing one no longer fails silently

**Task File**: [task.48.credential-file-discovery.md](./task.48.credential-file-discovery.md)

## Overview

Two changes to the credential loader, driven by the same consumer problem and neither useful
without the other: **where** the file is looked for, and **what happens when it is not found**.

This document was written retroactively, after the implementation, to give the branch
(`feature/task.48.credential-file-discovery`) the registry entry its name implies. Everything under
Progress Tracking below was already done when it was written.

## Motivation

### The path

Nx loads workspace `.env` files into the environment of **every task it runs**. Tooling tokens kept
in a repo-root `.env` are therefore in `process.env` of every application process started or tested
through Nx, before any application code executes. Measured in one consumer on 2026-08-09.

It is not fixable from the application side:

- `NX_LOAD_DOT_ENV_FILES=false` loads the file into the CLI's own process before the flag is
  consulted, and children inherit it.
- `@nestjs/config` has no `skipProcessEnv` — `ConfigService.get()` consults `process.env`
  unconditionally.

A different **path** is the fix; a flag is not. `.secrets/` sits outside the `.env.*` / `.*.env`
names Nx generates from target and configuration names, so it is never auto-loaded.

### The silence

`loadDotEnv()` `return`ed on a missing file and wrapped the whole body in `catch (_) {}`. A
relocated, unseeded or absent credential file therefore made every `/sync-jira-*` and every
`/develop-*` tracker stage run, report success, and update nothing.

A 401 is diagnosable. A silent no-op is not — it is indistinguishable from "there was nothing to
do", which is how it survived this long, and why a consumer could not safely move its credential
file at all until the warning existed. The two halves ship together for that reason: the path change
without the warning would have moved consumers onto a failure mode they could not observe.

## Scope

**In scope:** the candidate-path search and merge in both loaders; the stderr warning in
`jira-sync.js`; the test file; propagation to all bundled copies.

**Out of scope:**

- **`scripts/setup-consumer.sh`.** Its `write_env_files()` still writes credentials to `.env` and
  its `.env.example` header still says "Copy to `.env`". Not a breakage — `.env` is still read — but
  it teaches new consumers the old location. Moving it requires the `.secrets/` gitignore rule to be
  written in the same change, which is its own review surface. Deferred to
  [task.49](../task.49.setup-consumer-secrets-path/task.49.setup-consumer-secrets-path.md).
- **Removing `.env`.** See the decision below; it is load-bearing, not leftover.

## Decisions

| Decision | Why |
| -------- | --- |
| **`.env` is second, not replaced** | Every consumer that has not migrated has only `.env`. Given how quietly this loader used to fail, dropping it would have taken their tracker syncs from working to silently doing nothing. |
| **Every candidate is merged, not first-file-wins** | A consumer mid-migration has keys split across both files. The pre-existing `!(key in process.env)` guard already makes the earlier file authoritative per key, so merging can only **add** a key relative to the old one-file behaviour, never lose one. The shell still beats every file. |
| **Warning, not throw** | `loadDotEnv()` runs before any caller has said what it needs, and some commands need no credentials; throwing would break them for no reason. stderr keeps `--json` stdout clean. Fires once per process (`_resetCredentialWarning()` is the test seam). |
| **The condition is "credentials missing", not "file missing"** | A file that exists but omits the keys is the identical silent no-op, and the message says the file *was* read — otherwise the reader hunts for a file they already have. A shell that exports the keys is never nagged; a warning that is usually noise is one nobody reads when it is not. |
| **`gh-stage.js` gets the path but no warning** | Its only key is `GH_PROJECT_STATUS_FIELD` — optional, with a `skills-config.yaml` fallback and then a default — so absence is the *normal* case, not a fault. A warning there would fire on essentially every GitHub consumer and mean nothing. The asymmetry is deliberate and documented at both sites. |
| **The worktree fallback applies to both candidates** | `--show-toplevel` is the *worktree* root; credential files are gitignored and `git worktree add` copies no ignored file, so a linked worktree has none of its own. Without extending the existing `--git-common-dir` fallback to the new candidate, every `/develop-batch` agent would silently degrade to "no credentials". |

## Implementation Plan

1. **`shared/resources/jira-sync.js`** — `CREDENTIAL_FILES` (`.secrets/tooling.env`, then `.env`),
   `credentialSearchRoots()` (toplevel, then `--git-common-dir` parent), `parseEnvFileInto()`,
   a `loadDotEnv()` that merges every readable candidate and returns `{ searched, loaded }`.
2. **`warnIfCredentialsMissing()`** — stderr, once per process, gated on
   `REQUIRED_CREDENTIAL_KEYS` (`JIRA_URL`, `JIRA_API_TOKEN`) being unset; names what was searched,
   what was loaded, and the fix.
3. **`shared/resources/gh-stage.js`** — same candidate search, no warning, with the asymmetry
   commented at both sites.
4. **`shared/resources/tests/credential-file-discovery.test.mjs`** — new.
5. **`npm run bundle`** — propagate to every bundled copy.

## Files Summary

| File | Change |
| ---- | ------ |
| `shared/resources/jira-sync.js` | candidate search, merge, worktree fallback for both candidates, stderr warning |
| `shared/resources/gh-stage.js` | candidate search only — no warning, by design |
| `shared/resources/tests/credential-file-discovery.test.mjs` | **new** — 15 tests |
| `skills/*/references/{jira-sync,gh-stage}.js` | 22 bundled copies across 14 skills (14 × `jira-sync.js`, 8 × `gh-stage.js`) |
| `CHANGELOG.md` | `[Unreleased]` → `### Changed` and `### Fixed` |
| `docs/tasks/task-registry.md` | rows 48 and 49; next number → 50 |

A separate `style(gh-stage)` commit precedes the functional one: `gh-stage.js` was one of the ~50
files v0.39.0 left unformatted, so editing it triggers a whole-file Prettier reformat. Keeping the
reformat in its own commit is what v0.39.0's own CHANGELOG entry says to do — the functional diff is
42/17 rather than ~200 lines of noise.

## Testing Strategy

15 tests across precedence, merge-not-first-file, shell-wins, the silent no-op,
file-present-keys-absent, no-false-alarm, and the `gh-stage` asymmetry.

**Mutation-proven rather than merely green** — each invariant was watched failing:

| Mutation | Tests turned red |
| -------- | ---------------- |
| Swap the precedence order | 2 |
| Stop at the first existing file | 1 |
| Restore the silent `return` | 4 |
| Overwrite already-set keys | 2 |
| Restored | 0 — 15/15 green |

Full suite `npm test` **1275/1275**; `npm run validate:all` **115 passed**; prettier clean.
Smoke-tested against a real consumer: both paths searched, both loaded, all four credentials
resolved with `.secrets/` first, no values printed.

## Success Criteria

- [x] Both loaders search `.secrets/tooling.env` before `.env`, in every root they know about
- [x] Every readable candidate is merged; an earlier file wins per key; the shell wins over all
- [x] A repo with only `.env` behaves exactly as before — no consumer action required
- [x] `jira-sync.js` warns on stderr, once per process, when the required keys are still unset
- [x] The warning fires on a present-but-incomplete file and stays quiet for a shell-exported one
- [x] `gh-stage.js` does **not** warn, and both sites say why
- [x] Every invariant watched failing under mutation, not merely watched passing
- [x] `npm test`, `npm run validate:all`, prettier all green; `npm run bundle` propagated

## Risk Assessment

**Medium** — the code path runs at the start of every tracker-touching command in 14 skills.

| Risk | Why | Mitigation |
| ---- | --- | ---------- |
| **A consumer loses a credential it used to get** | The loader was rewritten, not extended | Merge semantics can only add keys; `.env` retained as a candidate; shell precedence unchanged; the merge and shell-wins invariants are both mutation-proven |
| **The warning becomes noise and gets ignored** | A warning that fires on healthy setups is one nobody reads | Gated on required keys being *unset*, not on a file being absent; silent for shell-exported credentials; `gh-stage.js` excluded entirely |
| **stderr output breaks a machine consumer** | `--json` callers parse stdout | Warning goes to stderr only; stdout is untouched |
| **Bundled copies drift from source** | 22 copies of two files | `npm run bundle` is the only writer; re-run and committed in the same change |

## Rollback Plan

`git revert <sha>`. No state, no migration, no consumer-side change to undo — a reverted loader
reads `.env` exactly as it did in v0.39.1.

## Progress Tracking

- [x] Step 1 — `jira-sync.js` candidate search and merge
- [x] Step 2 — `warnIfCredentialsMissing()`
- [x] Step 3 — `gh-stage.js` path change, no warning
- [x] Step 4 — tests, mutation-proven
- [x] Step 5 — `npm run bundle` across 22 copies
- [x] Release and consumer pull-through — v0.40.0

## References

- [task.49](../task.49.setup-consumer-secrets-path/task.49.setup-consumer-secrets-path.md) — the
  deferred `setup-consumer.sh` half
- `RAPP-605` (consumer repo `rebirth-wallet`) — Stage 1 landed there; this is Stage 2, and that card
  cannot close until this is released and pulled in via `setup-consumer.sh --update`

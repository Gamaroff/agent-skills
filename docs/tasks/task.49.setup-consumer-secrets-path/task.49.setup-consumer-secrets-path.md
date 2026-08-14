---
id: task.49
title: '[Task 49] `setup-consumer.sh` still seeds credentials into `.env`, teaching new consumers the old location'
type: task
description: 'task.48 taught both credential loaders to read .secrets/tooling.env in preference to .env, but the onboarding wizard was left alone: write_env_files() still writes live credentials to .env, its .env.example header still says "Copy to .env", and the only gitignore line it appends is .env. Nothing is broken — .env is still read — but every repo onboarded from here starts in the location task.48 exists to move away from. Moving it needs the .secrets/ gitignore rule written in the same change, and needs --update to leave an already-migrated consumer alone, which is why it was split out.'
tags: [credentials, setup-consumer, onboarding, nx]
category: infrastructure
status: planned
priority: Medium
risk_level: medium
created: 2026-08-14
updated: 2026-08-14
estimated_effort_hours: 3
---

# [Task 49] `setup-consumer.sh` still seeds credentials into `.env`, teaching new consumers the old location

**Task File**: [task.49.setup-consumer-secrets-path.md](./task.49.setup-consumer-secrets-path.md)

## Overview

The read side of the credential move landed in
[task.48](../task.48.credential-file-discovery/task.48.credential-file-discovery.md). The write side
did not. `scripts/setup-consumer.sh` is what every new consumer runs first, so it is what decides
where credentials actually end up.

## Motivation

`write_env_files()` (`scripts/setup-consumer.sh` ~L243–290) currently:

| Line | What it does | Why it is now wrong |
| ---- | ------------ | ------------------- |
| ~249 | `.env.example` header reads "Copy to `.env` and fill in real values" | Names the location task.48 exists to move away from |
| ~271–279 | Prompts "Write live credentials to `.env`?" and writes them there | Seeds every new consumer into the Nx-leaky path |
| ~282–288 | Appends `.env` to `.gitignore` | `.secrets/` gets no rule, so a migrated consumer's credential file is untracked-but-not-ignored |

Nothing here is broken — task.48 kept `.env` as a candidate precisely so this would keep working —
but the wizard is the strongest signal the repo sends about where credentials belong, and it is
currently sending the wrong one. An Nx consumer onboarded today has to be told, out of band, to undo
what the wizard just did.

The gitignore line is the part that makes this more than cosmetic. Writing credentials to a path
with no ignore rule is worse than the status quo, which is exactly why task.48 did not do half of
this in passing.

## Scope

**In scope:** the write path, the example header, the gitignore rule, and `--update` behaviour for a
consumer that has already migrated by hand.

**Out of scope:**

- **Reading `.env`.** It stays a candidate. Removing it is a breaking change for every consumer that
  never migrates, and there is no forcing reason to make one.
- **Migrating an existing consumer's file.** The wizard should not move or delete a file holding
  live credentials. Detect and report; let the human move it.

## Open Questions

1. **Does `--update` on a repo with an existing `.env` offer to migrate, or only report?** Reporting
   is the safe default; migrating is what people will actually want. Leaning: report, with the exact
   `mv` command printed.
2. **Does the wizard write `.secrets/tooling.env` unconditionally, or only for Nx consumers?**
   Unconditionally is simpler and costs a non-Nx consumer nothing, since both paths are read.
3. **`.env.example` or `.secrets/tooling.env.example`?** The example is a tracked file; the
   directory it describes is not. Putting the example inside `.secrets/` risks a blanket ignore rule
   swallowing it.

## Implementation Plan

1. Write credentials to `.secrets/tooling.env`; keep the overwrite guard and the interactive prompt.
2. Append **both** `.secrets/` and `.env` to `.gitignore`, and verify the `.env.example` (or its
   successor) is not caught by the new rule.
3. Update the example header to name `.secrets/tooling.env` as the location, with a line noting
   `.env` is still read for compatibility.
4. On `--update` against a consumer that already has credentials in `.env`: detect, report, print
   the migration command, change nothing.
5. Extend the `setup-consumer` test suite — it can source the script with
   `SETUP_CONSUMER_NO_MAIN=1` and exercise `write_env_files()` directly.

## Files Summary

| File | Change |
| ---- | ------ |
| `scripts/setup-consumer.sh` | `write_env_files()` — target path, gitignore rule, example header, `--update` detection |
| `tests/` (setup-consumer suite) | new cases for the path, the gitignore rule, and the no-clobber `--update` path |
| `docs/` | any onboarding doc that names `.env` as the credential location |
| `CHANGELOG.md` | `[Unreleased]` → `### Changed` |

## Testing Strategy

The suite already sources the script with `SETUP_CONSUMER_NO_MAIN=1`, so `write_env_files()` can be
driven directly against a temp repo. Assert on the fresh-install path, the gitignore contents, the
`--update`-with-existing-`.env` path leaving the file untouched, and that the tracked example file
survives the new ignore rule. Mutate each before trusting it — a gitignore assertion that passes
against a missing rule is the failure mode that matters here.

## Success Criteria

- [ ] A fresh consumer's credentials land in `.secrets/tooling.env`
- [ ] `.gitignore` covers `.secrets/` and still covers `.env`
- [ ] The tracked example file is not swallowed by the new ignore rule
- [ ] `--update` against an existing `.env` reports and prints the migration command, and changes
      nothing
- [ ] The example header names the new location and says `.env` is still read
- [ ] Every assertion watched failing under mutation

## Risk Assessment

**Medium** — the wizard writes files into consumer repos, and one of them holds live credentials.

| Risk | Why | Mitigation |
| ---- | --- | ---------- |
| **Credentials written to an un-ignored path** | `.secrets/` has no rule today | The gitignore rule ships in the same change; asserted by a test that was watched failing |
| **An existing `.env` clobbered or deleted** | `--update` runs against live repos | Never move or delete; detect and report only |
| **The tracked example file gets ignored** | A blanket `.secrets/` rule is easy to over-apply | Explicit test; or keep the example outside `.secrets/` (open question 3) |

## Rollback Plan

`git revert <sha>`. The loaders read both paths either way, so a reverted wizard produces a working
consumer — just in the old location.

## References

- [task.48](../task.48.credential-file-discovery/task.48.credential-file-discovery.md) — the read
  side; explicitly deferred this
- `scripts/setup-consumer.sh` — `write_env_files()`, ~L243–290

---
id: task.51
title: '[Task 51] Declare tracker access level in config, and reject an unrecognised one loudly'
type: task
description: 'Adds an `access:` block to skills-config.yaml declaring how much access the agent has to each system — full | read-only | approve | command | manual — resolved into ACCESS_TRACKER / ACCESS_VCS by resolve-platform.sh alongside the existing TRACKER / VCS. Identity stays separate from access: the tracker is still Jira, and the instructions emitted later need to know that. Unlike the existing keys, an unrecognised value fails loudly rather than falling through to a default, because the failure mode here is handing credentials to a run the operator meant to lock down. First unit of the restricted-tracker-access sequence (tasks 51-57); useful on its own because it also closes the silent fall-through on the existing tracker/vcs keys.'
tags: [config, platform-detection, access-control, restricted-access]
category: infrastructure
status: planned
priority: High
risk_level: low
created: 2026-08-17
updated: 2026-08-17
estimated_effort_hours: 4
---

# [Task 51] Declare tracker access level in config, and reject an unrecognised one loudly

**Task File**: [task.51.access-mode-config-and-resolver.md](./task.51.access-mode-config-and-resolver.md)

## Overview

First of seven tasks (51–57) adding a supported path for consumers who cannot give the locally
running agent write credentials for their tracker. This one establishes the vocabulary: how a
project declares its access level, and how skills read it.

It ships no behaviour change on its own — every mode except `full` is inert until
[task.52](../task.52.deferred-mutation-record-and-renderers/task.52.deferred-mutation-record-and-renderers.md)
and its successors land. It is still worth shipping first, and separately, for two reasons: it fixes
the output contract before any caller depends on it, and it closes a live silent-failure bug in the
existing resolver.

## Motivation

### The consumer problem this sequence solves

Security teams increasingly take central control of token issuance, and some will not issue a
tracker write token to a local agent at all. Today such a consumer has exactly one option: leave
`github_issue` / `jira_key` unwritten, after which every tracker moment silently no-ops — see the
guard at `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:265-281` and the ten
`skip if TRACKER_ISSUE is empty` branches downstream.

The pipeline runs, the documents are written, and nothing tells anyone the tracker was never
updated. The work looks done and the board says otherwise.

### Why access is a separate axis from identity

`tracker:` and `vcs:` answer *which system*. They do not answer *how much access the agent has*, and
the two cannot be collapsed. Every instruction this sequence eventually emits — "move RAPP-605 to In
Review", with a Jira URL and a Jira field name — needs the identity. Overloading `tracker: manual`
would throw away exactly the information the feature depends on.

### The live bug this closes

`read_config_key` (`shared/resources/resolve-platform.sh:23-42`) returns any unrecognised value
verbatim, and every downstream branch is `if TRACKER = jira … else … github`. So:

```yaml
tracker: jria # typo
```

resolves to **github**, silently, and the run pushes to the wrong system. `"auto"` is the sentinel
for *not configured*; there is no code path that yields *no tracker* and no path that rejects a
value.

For the existing keys that is a bug worth fixing. For the new key it would be a security defect: a
typo in `access.tracker` falling through to `full` would hand credentials to a run the operator
explicitly meant to lock down. **This is the one failure the sequence must never produce**, which is
why validation ships in the same task as the key rather than after it.

## Scope

**In scope:** the `access:` schema, its resolution into `ACCESS_TRACKER` / `ACCESS_VCS`, strict
validation of both the new key and the existing `tracker:` / `vcs:` values, the env-var override
tier, the setup wizard prompt, and documentation.

**Out of scope:**

- **Any behaviour change from a non-`full` mode.** Nothing intercepts a mutation yet. Setting
  `access: {tracker: manual}` after this task resolves the variable and changes nothing else. That
  is deliberate — see Risk Assessment.
- **`access.vcs` beyond validation.** VCS write remains a hard requirement for the whole sequence
  (`create-pr` returns a PR URL later steps consume; `gh pr merge` gates `develop-next`). The key is
  accepted and validated now so the schema is stable, and any value other than `full` is rejected
  with a message naming the reason rather than silently ignored.

## Decisions

| Decision | Why |
| -------- | --- |
| **A new `access:` block, not `tracker: manual`** | Identity and access are independent. The emitted instructions need to know it is Jira to produce Jira URLs and field names; collapsing the two discards that. It also avoids extending a key whose unrecognised-value behaviour is currently "silently mean github". |
| **Five values, per system** | `full` (default, today's behaviour) · `read-only` (agent may read, not write) · `approve` (agent holds credentials, must ask first) · `command` (agent emits commands, human runs them) · `manual` (agent emits UI instructions). They are points on one axis — how much the agent may do — so one key holds them. |
| **Fail loudly on an unknown value** | The opposite of how `tracker:`/`vcs:` behave today. A permissive default on an access control is a defect, not a convenience. |
| **Validate the existing `tracker:`/`vcs:` values too** | The same fall-through bug, already live. Fixing it here costs one shared validator and removes a whole class of misconfiguration. Fails loudly on an unrecognised value; `auto` and absent remain legal and keep meaning "detect". |
| **Default `full`, and the key is optional** | Every existing consumer must be unaffected without editing anything. |
| **Env override `AGENT_SKILLS_ACCESS_TRACKER`** | Matches the established config → env → detect order (`shared/resources/platform-detection.md`). Lets a single run be locked down without editing committed config, and lets CI differ from a workstation. |

## Implementation Plan

1. **`shared/resources/resolve-platform.sh`** — add a `validate_enum` helper; resolve
   `ACCESS_TRACKER` and `ACCESS_VCS` via config → env → `full`; apply `validate_enum` to the new keys
   and to `TRACKER` / `VCS`. On an invalid value write a message to stderr naming the key, the bad
   value and the legal set, and return non-zero so `source … || exit 1` at the call sites halts.
2. **Nested-key read.** `read_config_key` handles top-level scalars only. `access.tracker` is
   nested, so the pyyaml tier needs a dotted-path read and the awk tier a two-line-state read —
   mirroring how `jira.*` / `github.*` keys are already handled elsewhere. Keep the two-tier
   degrade: pyyaml first, awk fallback, no new dependency.
3. **`docs/reference/configuration.md`** — add `access:` to the canonical schema block (~L29-111)
   and the key table (~L117-162), with the values, the default and the note that only `full` is
   supported for `vcs` today.
4. **`shared/resources/platform-detection.md`** — document the new outputs alongside `TRACKER`/`VCS`
   and the resolver order.
5. **`scripts/setup-consumer.sh`** — offer the access level after the platform choice, defaulting to
   `full`; write the block only when the answer is not `full`, so existing generated configs are
   unchanged.
6. **`shared/resources/tracker-access.test.sh`** — new, modelled on `resolve-platform.test.sh`.
7. **`package.json`** — add the suite to the hand-maintained `test` chain plus a focused
   `test:tracker-access`. A suite absent from that chain runs nowhere.

## Files Summary

| File | Change |
| ---- | ------ |
| `shared/resources/resolve-platform.sh` | `validate_enum`, nested-key read, `ACCESS_TRACKER` / `ACCESS_VCS`, validation of `TRACKER` / `VCS` |
| `shared/resources/tracker-access.test.sh` | **new** |
| `shared/resources/platform-detection.md` | document the new outputs |
| `docs/reference/configuration.md` | schema block + key table |
| `scripts/setup-consumer.sh` | access-level prompt |
| `package.json` | `test` chain + `test:tracker-access` |

`shared/resources/` changes require `npm run bundle` and committing the regenerated
`skills/*/references/` copies.

## Testing Strategy

Assert on the **resolved value and the exit status**, never on config file contents.

| Case | Expected |
| ---- | -------- |
| No `access:` block | `ACCESS_TRACKER=full`, `ACCESS_VCS=full`, status 0 |
| `access: {tracker: manual}` | `ACCESS_TRACKER=manual`, `ACCESS_VCS=full` |
| Each of the five values | Resolves to itself |
| `access: {tracker: mnaual}` (typo) | **Status non-zero**, stderr names key, bad value and legal set |
| `access: {vcs: manual}` | Non-zero — accepted key, unsupported value, message says why |
| `tracker: jria` (existing key, typo) | **Status non-zero** — the live bug, now closed |
| `tracker: auto` / absent | Still detects; unchanged |
| Env override set | Beats config |
| Env override invalid | Non-zero — the env tier is validated too |
| Malformed YAML | Falls back to defaults with a warning, as today — a broken file must not lock a consumer out |

Cases run under `env -i` so a developer's own exported variables cannot make one pass for the wrong
reason — the technique `bitbucket-auth.test.sh` established.

**Mutation-prove each invariant** — watch it fail before trusting it:

| Mutation | Expected red |
| -------- | ------------ |
| Make validation permissive (unknown → `full`) | The typo cases |
| Drop `TRACKER`/`VCS` validation | The `jria` case |
| Default to `manual` instead of `full` | The no-config case |
| Let the env tier bypass validation | The invalid-env case |
| Make malformed YAML fatal | The malformed-YAML case |

## Success Criteria

- [ ] `ACCESS_TRACKER` / `ACCESS_VCS` resolve config → env → `full`
- [ ] An unrecognised value on any of the four keys **fails loudly**, naming key, value and legal set
- [ ] A consumer with no `access:` block is byte-identical to today
- [ ] Malformed YAML still degrades to defaults rather than locking the consumer out
- [ ] `access.vcs` other than `full` is rejected with a message naming the reason
- [ ] Every invariant watched failing under mutation
- [ ] `npm test`, `npm run validate:all` green; `npm run bundle` run and references committed

## Risk Assessment

**Low** — one sourced helper plus documentation. No mutation path changes.

| Risk | Why | Mitigation |
| ---- | --- | ---------- |
| **Validation breaks an existing consumer** | Their `tracker:` value now has to be legal | Only `jira`/`github`/`bitbucket`/`auto`/absent are legal, which is the documented set; anything else was already silently wrong. Called out in the CHANGELOG as the one behaviour change |
| **A consumer sets `manual` and believes they are protected** | Nothing intercepts yet | The resolver prints a one-line notice on any non-`full` value saying interception is not yet implemented, and it is stated in the CHANGELOG. Removed by task.53/54 |
| **Nested-key read breaks the awk fallback tier** | `read_config_key` is top-level only | Dedicated tests for both tiers, run with pyyaml forced unavailable |

## Rollback Plan

`git revert <sha>` then `npm run bundle`. Nothing reads the new variables yet, so a revert is inert
for consumers who never set the key. Consumers who did set it return to `full`.

## References

- [`shared/resources/resolve-platform.sh`](../../../shared/resources/resolve-platform.sh) — the resolver being extended
- [`shared/resources/platform-detection.md`](../../../shared/resources/platform-detection.md) — canonical resolver spec
- [task.52](../task.52.deferred-mutation-record-and-renderers/task.52.deferred-mutation-record-and-renderers.md) — the next unit; consumes these variables

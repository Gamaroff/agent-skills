---
id: task.50
title: '[Task 50] Bitbucket REST auth supports Bearer as well as Basic, chosen by variable name'
type: task
description: 'Every Bitbucket call this repository instructs was Basic (curl -u), so a Bitbucket repository, project or workspace access token — the scoped, non-personal, independently revocable credential a platform team reaches for — authenticated nothing. Adds shared/resources/bitbucket-auth.sh as the single implementation: sourced once it sets BB_CURL_AUTH and BB_AUTH_SCHEME, selecting Bearer when BITBUCKET_ACCESS_TOKEN is set and Basic otherwise. Basic is unchanged and remains the default. Deliberately not extended to Jira, where Bearer means OAuth 2.0 3LO rather than a header swap.'
tags: [bitbucket, credentials, auth, platform-detection, testing]
category: infrastructure
status: accepted
priority: High
risk_level: medium
created: 2026-08-16
updated: 2026-08-16
estimated_effort_hours: 5
---

# [Task 50] Bitbucket REST auth supports Bearer as well as Basic, chosen by variable name

**Task File**: [task.50.bitbucket-bearer-auth.md](./task.50.bitbucket-bearer-auth.md)

## Overview

Support `Authorization: Bearer` alongside `curl -u` for Bitbucket REST, selected explicitly, with
Basic remaining the default and fully working.

## Motivation

A platform team taking central control of Atlassian token issuance reaches for a **Bitbucket
repository, project or workspace access token**: scoped, non-personal, independently revocable.
Those authenticate with `Authorization: Bearer`.

This repository had **no Bearer path for Bitbucket anywhere**. Every call it instructs was
`curl -u`. So a correctly scoped access token authenticated *nothing*, and the only way to keep the
tooling working was to argue for the weaker credential — a bad position to negotiate a security
decision from.

The goal is to make the credential type the operator's decision rather than the tooling's.

## Scope

**In scope:** Bitbucket REST only. Bearer as an alternative to Basic, selected explicitly, with
Basic unchanged and default.

**Explicitly out of scope — and it looks like the symmetrical change:**

- **Jira and Confluence auth.** Atlassian API tokens for Jira are **Basic by design**, scoped tokens
  included, so Bearer gains nothing. Bearer on Jira means **OAuth 2.0 3LO**, which is not a header
  swap: it also moves the base URL to `https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/…` and
  adds refresh-token rotation. No `api.atlassian.com` reference exists in this repo. `authHeader()`
  in `shared/resources/jira-sync.js` is correct as it stands and is untouched.
- **Prompting for the Bearer credential in `setup-consumer.sh`.** See the decision below.

## Decisions

| Decision | Why |
| -------- | --- |
| **Select the scheme by variable _name_, never by inspecting the token** | Sniffing an `ATATT…` prefix is the obvious shortcut and the wrong one. Atlassian's credential formats have already changed once inside this project's lifetime (app passwords removed 2026-07-28), and a prefix heuristic silently mis-authenticates the day they change again. A variable name is a decision the operator made; a prefix is a guess about a vendor. |
| **`BITBUCKET_ACCESS_TOKEN`, not `BITBUCKET_TOKEN`** | Matches Atlassian's own terminology ("repository access token", "workspace access token"). `BITBUCKET_TOKEN` has been documented elsewhere for a different purpose and left unset — and an empty Bearer header produces a 404 that reads as "no results". |
| **Bearer wins when both are set** | Setting `BITBUCKET_ACCESS_TOKEN` is an explicit opt-in; stale Basic variables left in a `.env` must not silently override it. |
| **A shell helper, not prose** | `platform-detection.md` is instructions an agent follows, not code that executes, and a rule expressed only in prose is followed inconsistently. That matters more than usual here because getting it wrong produces a silent empty result rather than an error. Direct precedent: `resolve-platform.sh` + `resolve-platform.test.sh`. |
| **An array (`BB_CURL_AUTH`), not a NUL-delimited string** | The handoff sketched `printf '%s\0%s\0'`. A bash array expands correctly-quoted at zero ceremony (`"${BB_CURL_AUTH[@]}"`) at all 15 call sites; a NUL stream would need `mapfile -d ''` at every one of them — more ceremony, and a fresh chance to get the quoting wrong each time. Sourcing-sets-variables also matches `resolve-platform.sh`. |
| **Non-zero status rather than an empty credential** | `--user user:` and an empty `Authorization: Bearer` are both syntactically valid and authenticate nothing. Bitbucket answers unauthenticated calls to private repos with **404**, so either would fail silently. This is the single failure mode the helper exists to prevent. |
| **No new `setup-consumer.sh` prompt** | Bearer *replaces* the username/token pair rather than adding to it, so a third prompt invites setting both. Worse, an unset answer would write `BITBUCKET_ACCESS_TOKEN=` into every consumer's `.env` — the exact shape that produces a valid-looking empty Bearer header. The wizard prints an informational line instead; the human adds the variable by hand. [task.49](../task.49.setup-consumer-secrets-path/task.49.setup-consumer-secrets-path.md) reworks this function anyway. |

## The surface was larger than reported

The originating handoff stated the change was confined to one file — `platform-detection.md` — on
the basis that a consumer's "28 Bitbucket Basic call sites" were 28 bundled copies of it. That is
wrong, and acting on it would have shipped a helper nothing called.

The bundled copies are real, but so are the originals. The actual surface:

| Location | Sites |
| -------- | ----- |
| `skills/create-pr/SKILL.md` | 3 curl + precondition + prerequisites + error text |
| `skills/develop-next/SKILL.md` | 4 curl + precondition + prerequisites |
| `skills/finalise/SKILL.md` | 4 curl |
| `skills/qa-fix/SKILL.md` | 2 curl + env-var table |
| `skills/create-issue/SKILL.md` | 1 curl + precondition + error text |
| `shared/resources/tracker-state-poller-subagent.md` | 1 curl |
| `shared/resources/platform-detection.md` | canonical guidance |
| `docs/reference/{configuration,troubleshooting}.md`, `docs/concepts/{getting-started,quickstart-story,quickstart-task}.md`, `docs/runbooks/{new-project-setup,story-development}.md` | credential tables and probe commands |

**Three hand-written preconditions were the sharpest part.** `create-pr`, `create-issue` and
`develop-next` each guarded their Bitbucket path with a check on `BITBUCKET_USERNAME` and
`BITBUCKET_API_TOKEN`. Left alone, all three would have rejected a perfectly good access token
before the first call — the feature would have appeared not to work at all.

## Implementation

1. **`shared/resources/bitbucket-auth.sh`** — sourced; sets `BB_AUTH_SCHEME` (`bearer` | `basic` |
   `none`) and `BB_CURL_AUTH`; returns non-zero with an actionable stderr diagnosis when neither
   credential is set. Rationale is carried in the file, not only here.
2. **`shared/resources/bitbucket-auth.test.sh`** — 35 assertions.
3. **`package.json`** — added to the `test` chain, plus a focused `test:bitbucket-auth`. The chain
   is hand-maintained; a new suite that is not added to it runs nowhere.
4. **15 call sites** rewritten to `"${BB_CURL_AUTH[@]}"`, resolved at 9 source points.
5. **Three preconditions** replaced by `source … || <halt>`.
6. **Docs sweep** across the eight documents above, plus `.env.example` and the wizard's
   informational line.
7. **`npm run bundle`** — 29 skills.

## Testing Strategy

Tests assert on the **scheme selected** and the **exact argument vector** — never on a token's
contents, and never merely that a call "worked".

| Case | Asserted |
| ---- | -------- |
| Access token, no username | Bearer; header carries the token; no `--user` |
| Username + API token | Basic; `--user user:token`; no Authorization header |
| Username + legacy `APP_PASSWORD` | Basic via the fallback — proves back-compat |
| Both Basic names set | `API_TOKEN` wins; legacy value unused |
| Both credential types set | Bearer wins |
| Nothing set | status 1, scheme `none`, **empty** argument vector, stderr names the fix and the 404 trap |
| Username alone / token alone | status 1 and no args — no half-formed `--user user:` |
| `BITBUCKET_ACCESS_TOKEN=` (empty) | Falls through to Basic; no empty Bearer header |
| Token containing a space and a colon | Still exactly 2 args; value intact |
| Happy path | Nothing written to stderr |

Cases run under `env -i` so a developer's own exported `BITBUCKET_*` cannot make one pass for the
wrong reason.

**Mutation-proven rather than merely green** — each invariant was watched failing:

| Mutation | Tests turned red |
| -------- | ---------------- |
| Swap the precedence (Basic before Bearer) | 2 |
| Drop the `BITBUCKET_APP_PASSWORD` fallback | 3 |
| Emit a half-formed `--user` when the token is missing | 2 |
| Treat an empty `BITBUCKET_ACCESS_TOKEN` as set | 4 |
| Make the no-credential path return success | 4 |
| Restored | 0 — 35/35 green |

`npm test` 1275/1275 · `npm run validate:all` 115 passed · prettier backlog unchanged at 49 files
(no JS touched) · a bundled copy smoke-tested for both schemes after `npm run bundle`.

## Success Criteria

- [x] `BITBUCKET_ACCESS_TOKEN` selects Bearer; unset selects Basic; Bearer wins when both are set
- [x] Both Basic variable names provably still resolve — the legacy fallback has its own test
- [x] Selection implemented **once** and reachable from every Bitbucket call path
- [x] No precondition rejects a valid access token
- [x] Nothing resolves → non-zero status and an **empty** argument vector, never a half-formed one
- [x] The "never Bearer" assertion rewritten, not deleted — the credential-type distinction kept
- [x] The 404-not-401 warning extended to cover a wrong *scheme*, with "status code, not list length"
      restated
- [x] Jira and Confluence auth untouched
- [x] No credential value in any log, error or fixture
- [x] `npm test` green; `npm run bundle` run and regenerated references committed
- [x] Released in v0.41.0 — consumer pull-through via `setup-consumer.sh --update`

## Risk Assessment

**Medium** — the code path runs before every Bitbucket call in five skills.

| Risk | Why | Mitigation |
| ---- | --- | ---------- |
| **An existing Basic consumer breaks** | The resolution was rewritten, not extended | Basic is the fall-through; both variable names tested; the legacy fallback has a dedicated test that goes red when removed |
| **A missing credential silently no-ops** | Bitbucket returns 404, not 401 | Non-zero status and empty vector, both asserted; every call site checks the status; docs restate "status code, not list length" |
| **A call site is missed** | 15 sites across 6 files | Zero residual `-u "${BITBUCKET_USERNAME}…"` in source; the three preconditions were the real trap and are all replaced |
| **Bundled copies drift** | 29 copies | `npm run bundle` is the only writer; a copy was diffed against source and smoke-tested post-bundle |
| **Someone "completes" this by adding Bearer to Jira** | It looks symmetrical | Out-of-scope rationale recorded here, in the CHANGELOG, and at the top of the helper |

## Rollback Plan

`git revert <sha>` then `npm run bundle`. Basic-only consumers are unaffected either way; a Bearer
consumer reverts to being unable to authenticate, which is the pre-change state.

## References

- [`shared/resources/platform-detection.md`](../../../shared/resources/platform-detection.md) — canonical guidance
- [`shared/resources/resolve-platform.sh`](../../../shared/resources/resolve-platform.sh) — the sourced-helper pattern this follows
- [task.49](../task.49.setup-consumer-secrets-path/task.49.setup-consumer-secrets-path.md) — reworks `write_env_files()`, where the Bearer variable would be prompted for if it ever is

---
id: task.51
title: '[Task 51] Declare tracker access level in config, and reject an unrecognised one loudly'
type: task
description: 'Adds an `access:` block to skills-config.yaml declaring how much access the agent has to each system — full | read-only | approve | command | manual — resolved into ACCESS_TRACKER / ACCESS_VCS by resolve-platform.sh alongside the existing TRACKER / VCS. Identity stays separate from access: the tracker is still Jira, and the instructions emitted later need to know that. Unlike the existing keys, an unrecognised value fails loudly rather than falling through to a default, because the failure mode here is handing credentials to a run the operator meant to lock down. First unit of the restricted-tracker-access sequence (tasks 51-58); useful on its own because it also closes the silent fall-through on the existing tracker/vcs keys, and because making a rejection actually halt a run requires guarding all 16 resolver call sites — today none of them check.'
tags: [config, platform-detection, access-control, restricted-access]
category: infrastructure
status: ready-for-review
priority: High
risk_level: low
created: 2026-08-17
updated: 2026-08-17
estimated_effort_hours: 8
github_issue: 225
---

# [Task 51] Declare tracker access level in config, and reject an unrecognised one loudly

**Task File**: [task.51.access-mode-config-and-resolver.md](./task.51.access-mode-config-and-resolver.md)

**GitHub Issue**: [#225](https://github.com/Gamaroff/agent-skills/issues/225)

**Review**: ✅ All review recommendations from `task.51.review.1.access-mode-config-and-resolver.md` implemented 2026-08-17

## Overview

First of the restricted-tracker-access sequence — seven implementation units (51–57) plus
[task.58](../task.58.restricted-access-documentation/task.58.restricted-access-documentation.md),
the documentation layer that runs last. The sequence adds a supported path for consumers who cannot
give the locally running agent write credentials for their tracker. This one establishes the
vocabulary: how a project declares its access level, and how skills read it.

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
guard at `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:265-281` and the
`skip if TRACKER_ISSUE is empty` branches downstream, spread across all eight pipeline step
documents.

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

### Why validation alone does not close it

A validator that writes to stderr and returns non-zero halts nothing unless a caller checks. **No
caller checks.** All 16 sites that source the resolver do so bare:

```bash
source references/resolve-platform.sh   # no `|| exit 1`
```

So a rejected value would print a message and the run would continue — with `ACCESS_TRACKER` at its
default. That is the same silent-permissive outcome the validator exists to prevent, arrived at by a
different route. Guarding the call sites is therefore not a tidy-up that can follow later; it is what
makes the check a check, and it is in scope here.

## Technical Background

### Current

`shared/resources/resolve-platform.sh` exports two variables and validates neither:

| | Resolution today |
| --- | --- |
| `TRACKER` | `read_config_key tracker` → `auto` → `[ -n "$JIRA_URL" ]` → `jira` \| `github` |
| `VCS` | `read_config_key vcs` → `auto` → git remote matches `bitbucket.org` → `bitbucket` \| `github` |

`read_config_key` (L23-42) is **top-level scalar only** and degrades in two tiers: python+pyyaml
first, awk second, `auto` if both fail. Two properties of it matter here and are not obvious:

- **The pyyaml tier is dead on most machines.** It invokes bare `python`, which macOS has not shipped
  since 12.3. Where only `python3` exists, tier 1 is skipped silently and awk is the *only* tier.
- **The two tiers disagree on a mapping-valued key.** Given `tracker:` holding a mapping, pyyaml
  returns the dict (`{'workflowFile': '…'}`) while awk returns empty → `auto`. Today that
  disagreement is invisible because both paths land on `github`. Strict validation makes it fatal on
  exactly the machines where tier 1 runs.

Separately, `shared/resources/resolve-paths.sh:30-60` already contains `read_nested_config_key` — a
working two-tier **nested** reader (pyyaml dotted read + awk two-line-state read), consumed by
`skills/jira-sprint-retrospective/scripts/render-retro.sh:63`. It carries the same bare-`python` bug.

### Target

| | Resolution after this task |
| --- | --- |
| `TRACKER` | as today, then `validate_enum` against `{jira, github, auto}`; a **mapping**-valued `tracker:` resolves to `auto` |
| `VCS` | as today, then `validate_enum` against `{github, bitbucket, auto}` |
| `ACCESS_TRACKER` | config `access.tracker` and env `AGENT_SKILLS_ACCESS_TRACKER` both resolved, then **most-restrictive wins**; default `full` |
| `ACCESS_VCS` | same resolution; any value other than `full` rejected with a message naming why |

One nested reader, shared by both resolvers, reading `python3` with a `python` fallback. All 16 call
sites guarded with `|| exit 1`.

### Why `tracker:` has two shapes

`tracker:` is a scalar platform override in
[`configuration.md`](../../reference/configuration.md#key-reference) and a **mapping** holding
`workflowFile` in [`tracker-workflow.md`](../../reference/tracker-workflow.md) (L353-363), which
states outright that the two "cannot coexist under one `tracker:` key in YAML". Both are supported
and documented. Validation must not treat the second as a typo — hence the mapping→`auto` rule above.

## Breaking Changes

Three, all deliberate, all named in the CHANGELOG.

| Change | Who it affects | Migration |
| ------ | -------------- | --------- |
| An unrecognised `tracker:` / `vcs:` value now **halts** instead of silently meaning `github` | Any consumer with a typo'd or out-of-domain value (`tracker: jria`, `tracker: bitbucket`, `vcs: jira`) | Correct the value, or set `auto` / remove the key. The run was already going to the wrong system; it just said nothing |
| The resolver can now exit non-zero, and 16 call sites propagate it | Skill authors sourcing `resolve-platform.sh` | Source with `\|\| exit 1`. The bundled `references/` copies are regenerated by `npm run bundle` |
| A malformed `skills-config.yaml` that contains an `access:` line now halts rather than defaulting | Consumers who opted into restricted access **and** broke their config | Fix the YAML. Consumers with no `access:` block are unaffected and still degrade to detection |

Not breaking: a consumer with no `access:` block, and a legal `tracker:`/`vcs:` value, is
byte-identical to today.

## Scope

**In scope:** the `access:` schema, its resolution into `ACCESS_TRACKER` / `ACCESS_VCS`, strict
validation of both the new key and the existing `tracker:` / `vcs:` values, the env-var override
tier, **guarding all 16 resolver call sites so a rejection halts**, extracting the shared nested-key
reader (and fixing its dead `python` tier), the setup wizard prompt, and documentation.

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
| **Guard the 16 call sites in this task, not a later one** | A validator nobody checks is decoration. All 16 sites source the resolver bare today, so shipping validation without the guards would ship a security check that cannot stop anything — reproducing the exact silent-permissive failure it exists to prevent. |
| **Validate the existing `tracker:`/`vcs:` values too, with a legal set _per key_** | The same fall-through bug, already live. `tracker` is `{jira, github, auto}`; `vcs` is `{github, bitbucket, auto}`. One shared set across both keys would accept `tracker: bitbucket` and `vcs: jira` — misconfigurations of exactly the class being closed. `auto` and absent remain legal and keep meaning "detect". |
| **A mapping-valued `tracker:` resolves to `auto`, not to an error** | `tracker.workflowFile` is a documented, supported form ([`tracker-workflow.md`](../../reference/tracker-workflow.md) L353-363). It is not a platform override and must not be graded as one. This also settles the pyyaml/awk tier disagreement described in Technical Background. |
| **Default `full`, and the key is optional** | Every existing consumer must be unaffected without editing anything. |
| **Env override `AGENT_SKILLS_ACCESS_TRACKER`, resolved most-restrictive-wins** | Both tiers are read, and the **more restrictive** of config and env is taken — ordering the modes `manual` < `command` < `approve` < `read-only` < `full` by permissiveness. This is a deliberate departure from the config → env → detect order used for identity, because the two axes fail differently: picking the wrong *tracker* is a mistake, whereas picking the wrong *access* is an escalation. It lets a run or a CI environment be locked down without editing committed config, while making it impossible for a stray env var to loosen a config that deliberately restricts. |
| **Malformed YAML fails closed only when `access:` is present** | The blanket "degrade to defaults" rule is right for identity, where the default is *detect*. For access the default is `full`, so the same rule would silently re-grant credentials on a truncated file. Grepping for an `access:` line separates the two cases: a consumer who never opted in is never locked out, and one who did is never silently unlocked. |
| **Extract the nested reader rather than write a second one** | `read_nested_config_key` already exists in `resolve-paths.sh` and already handles both tiers. A second copy means two places to fix — including the bare-`python` bug both would then carry. |

## Implementation Plan

1. **`shared/resources/read-config.sh`** — new. Move `read_nested_config_key` here verbatim from
   `resolve-paths.sh`, and fix its interpreter probe: try `python3`, fall back to `python`, and skip
   tier 1 only when neither exists. Both resolvers source it; neither keeps a private copy.
2. **`shared/resources/resolve-paths.sh`** — source the shared reader; delete the local copy. Assert
   `PRD_ROOT` / `ARCH_ROOT` still resolve identically (its existing behaviour is the regression
   oracle).
3. **`shared/resources/resolve-platform.sh`** — add `validate_enum "$key" "$value" "$legal_set…"`,
   taking the legal set **per key** (`tracker` → `jira github auto`; `vcs` → `github bitbucket auto`;
   `access.*` → the five modes). Before validating `TRACKER`, detect a mapping-valued `tracker:` and
   resolve it to `auto`. Resolve `ACCESS_TRACKER` / `ACCESS_VCS` by reading config and env
   independently and taking the **more restrictive** of the two against the permissiveness order
   `manual < command < approve < read-only < full`; default `full` when neither is set. On an
   invalid value write to stderr naming the key, the bad value and the legal set, and `return 1`.
4. **Malformed-YAML branch.** When parsing fails at both tiers, `grep -q '^access:'
   skills-config.yaml`. Present → `return 1` with "access is configured but unreadable". Absent →
   `full`, and identity keys degrade to `auto` exactly as today.
5. **Guard the call sites.** Change all 16 `source …/resolve-platform.sh` occurrences to
   `source …/resolve-platform.sh || exit 1`, and update the canonical snippet in
   `platform-detection.md` so future skills copy the guarded form. Sites:
   `create-epic` (×2), `create-pr`, `create-task`, `create-story`, `qa-fix`, `review-bug`,
   `review-epic`, `review-story`, `review-task`, `qa-task`, `qa-story`, `sync-github-epic`,
   `sync-github-story`, `sync-github-task`, `develop-next`. The three prose sites (`review-bug`,
   `qa-task`, `qa-story`) need the sentence reworded, not just the snippet.
6. **`docs/reference/configuration.md`** — add `access:` to the canonical schema block (~L29-111)
   and the key table (~L117-162), with the values, the default and the note that only `full` is
   supported for `vcs` today. Correct the `tracker` row to state both the scalar and mapping forms
   and how each is graded.
7. **`shared/resources/platform-detection.md`** — document the new outputs alongside `TRACKER`/`VCS`,
   the most-restrictive-wins rule for access (and why it differs from the identity order), and the
   guarded `source … || exit 1` form. Update the reference resolver copy in that document.
8. **`scripts/setup-consumer.sh`** — offer the access level after the platform choice, defaulting to
   `full`; write the block only when the answer is not `full`, so existing generated configs are
   unchanged.
9. **`shared/resources/tracker-access.test.sh`** — new, modelled on `resolve-platform.test.sh`.
10. **`package.json`** — add the suite to the hand-maintained `test` chain plus a focused
    `test:tracker-access`. A suite absent from that chain runs nowhere.

## Files Summary

| File | Change |
| ---- | ------ |
| `shared/resources/read-config.sh` | **new** — shared `read_nested_config_key`, with the `python3`/`python` probe fixed |
| `shared/resources/resolve-platform.sh` | `validate_enum` (per-key legal sets), mapping-form `tracker:` → `auto`, `ACCESS_TRACKER` / `ACCESS_VCS` most-restrictive-wins, fail-closed malformed-YAML branch |
| `shared/resources/resolve-paths.sh` | source the shared reader; delete the duplicate copy |
| `shared/resources/tracker-access.test.sh` | **new** |
| `shared/resources/platform-detection.md` | new outputs, access precedence rule, guarded `source` form, updated reference copy |
| `skills/{create-epic,create-pr,create-task,create-story,qa-fix,review-bug,review-epic,review-story,review-task,qa-task,qa-story,sync-github-epic,sync-github-story,sync-github-task,develop-next}/SKILL.md` | 16 call sites → `source … \|\| exit 1` |
| `docs/reference/configuration.md` | schema block + key table; corrected `tracker` row |
| `scripts/setup-consumer.sh` | access-level prompt |
| `package.json` | `test` chain + `test:tracker-access` |
| `shared/resources/README.md` | new `read-config.sh` / `tracker-access.test.sh` rows; corrected the stale sourcing-skills list (named 10, several wrong) |
| `AGENTS.md`, `docs/architecture/concepts/coding-standards.md` | both stated the **unguarded** `source` form as the house standard — corrected, so a new skill copying them inherits the guard |
| `CHANGELOG.md` | Added + Fixed entries; the three breaking changes named |

Added during implementation, beyond the plan above: the three documentation sites that stated the
unguarded form. Leaving them would have made the guard true of the 16 existing call sites and false
of the next one written from the docs — the same drift that let `platform-detection.md` keep saying
"All 8 leaf skills" long after it was 15 (also corrected).

`shared/resources/` changes require `npm run bundle` and committing the regenerated
`skills/*/references/` copies — which for this task includes the bundled `resolve-platform.sh`,
`resolve-paths.sh`, the new `read-config.sh` and `platform-detection.md` in every skill that
references them.

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
| `tracker: bitbucket` | **Status non-zero** — legal for `vcs`, not for `tracker`; proves the sets are per-key |
| `vcs: jira` | **Status non-zero** — the mirror case |
| `tracker: auto` / absent | Still detects; unchanged |
| `tracker: {workflowFile: …}` (mapping form) | `TRACKER` detects as if `auto`, status 0 — **asserted under both tiers**, which today disagree |
| Env more restrictive than config | Env wins (`config: full` + `env: manual` → `manual`) |
| Env **less** restrictive than config | **Config wins** (`config: manual` + `env: full` → `manual`) — an env var may not escalate |
| Env override invalid | Non-zero — the env tier is validated too |
| Malformed YAML, **no** `access:` line | Falls back to defaults with a warning, as today — a broken file must not lock a consumer out |
| Malformed YAML **with** an `access:` line | **Non-zero** — "access is configured but unreadable"; the one case that must not degrade to `full` |
| Guarded call site, invalid value | The sourcing script **exits non-zero** — asserted end-to-end, not just on the resolver's return |

Cases run under `env -i` so a developer's own exported variables cannot make one pass for the wrong
reason — the technique `bitbucket-auth.test.sh` established.

**Run the tier-sensitive cases under both tiers.** The pyyaml tier is dead on any machine without a
bare `python`, so a suite that only exercises the awk path silently skips half the resolver — which
is how the mapping-form disagreement survived. Force each tier explicitly rather than taking
whichever the host happens to provide.

**Mutation-prove each invariant** — watch it fail before trusting it:

| Mutation | Expected red |
| -------- | ------------ |
| Make validation permissive (unknown → `full`) | The typo cases |
| Drop `TRACKER`/`VCS` validation | The `jria` case |
| Share one legal set across `tracker` and `vcs` | The `tracker: bitbucket` and `vcs: jira` cases |
| Grade a mapping-valued `tracker:` as a scalar | The `workflowFile` case, under the pyyaml tier only |
| Default to `manual` instead of `full` | The no-config case |
| Take env unconditionally instead of most-restrictive | The env-less-restrictive case |
| Let the env tier bypass validation | The invalid-env case |
| Make malformed YAML fatal unconditionally | The malformed-YAML-without-`access:` case |
| Make malformed YAML degrade unconditionally | The malformed-YAML-with-`access:` case |
| Remove `\|\| exit 1` from a call site | The guarded-call-site case |

## Success Criteria

- [x] `ACCESS_TRACKER` / `ACCESS_VCS` resolve config and env independently, then take the **more
      restrictive** of the two; `full` when neither is set
- [x] An env var can lock a run down but **cannot escalate** a config that restricts
- [x] An unrecognised value on any of the four keys **fails loudly**, naming key, value and legal set,
      with the legal set taken **per key** — `tracker: bitbucket` and `vcs: jira` are both rejected
- [x] A rejection **actually halts the run** — verified end-to-end through a guarded call site, not
      only by the resolver's return code
- [x] All 16 call sites use `source … || exit 1`, and the canonical snippet in
      `platform-detection.md` shows the guarded form
- [x] A mapping-valued `tracker:` (`workflowFile`) resolves as `auto` under **both** tiers
- [x] A consumer with no `access:` block and a legal `tracker:`/`vcs:` is byte-identical to today
- [x] Malformed YAML **without** an `access:` line still degrades to defaults; **with** one it halts
- [x] `access.vcs` other than `full` is rejected with a message naming the reason
- [x] One nested-key reader exists, shared by both resolvers, and its tier-1 probe finds `python3`
- [x] Every invariant watched failing under mutation
- [x] `npm test`, `npm run validate:all` green; `npm run bundle` run and references committed

## Risk Assessment

**Low–medium** — the resolver logic is small and well-tested, but the call-site guards touch 16 skill
documents and turn a previously non-fatal path fatal. No mutation path changes.

| Risk | Why | Mitigation |
| ---- | --- | ---------- |
| **Validation breaks an existing consumer** | Their `tracker:`/`vcs:` value now has to be legal *for that key* | Legal sets are the documented ones — `tracker` ∈ `{jira, github, auto}`, `vcs` ∈ `{github, bitbucket, auto}`, plus absent. Anything else was already silently resolving to the wrong system. Called out in Breaking Changes and the CHANGELOG |
| **The mapping form of `tracker:` is graded as a typo** | `tracker.workflowFile` is a legal config that the pyyaml tier surfaces as a dict | Detected before validation and resolved to `auto`; asserted under both tiers. This is the highest-likelihood regression in the task — it would hard-fail a working repo on a machine that has `python` |
| **A guarded call site halts a run that used to proceed** | 16 sites gain `\|\| exit 1` | That is the intent, and it only fires on a config that was already wrong. The blast radius is bounded by the legal-set decision above; the guards add no new rejection of their own |
| **A call site is missed during the sweep** | 16 sites across 15 files, three of them prose rather than fenced snippets | The end-to-end guarded-call-site test, plus a grep assertion that no bare `source …resolve-platform.sh` remains in `skills/*/SKILL.md` |
| **A consumer sets `manual` and believes they are protected** | Nothing intercepts yet | The resolver prints a one-line notice on any non-`full` value saying interception is not yet implemented, and it is stated in the CHANGELOG. Removed by task.53/54 |
| **Extracting the shared reader regresses `PRD_ROOT`/`ARCH_ROOT`** | `resolve-paths.sh` loses its local copy | Its existing behaviour is the regression oracle — assert both roots resolve identically before and after, under both tiers |
| **Fixing the `python3` probe changes behaviour by reviving a dead tier** | Tier 1 currently never runs on most machines, so its output is effectively untested in practice | Every tier-sensitive case is asserted under **both** tiers explicitly, rather than under whichever the host provides |

## Rollback Plan

`git revert <sha>` then `npm run bundle`. Nothing reads `ACCESS_TRACKER` / `ACCESS_VCS` yet, so a
revert is inert for consumers who never set the key; consumers who did set it return to `full`.

The one part that is **not** inert is the call-site guards: reverting them restores the bare `source`
form, so a subsequently-introduced invalid `tracker:` value would once again fall through silently
rather than halt. That is the pre-existing behaviour, not a new defect, but it is worth stating so a
revert is not mistaken for a full restoration of safety.

Rollback triggers: any consumer report of a halt on a config that is legal per the tables above, or a
`PRD_ROOT`/`ARCH_ROOT` regression from the shared-reader extraction. Verification after revert:
`npm test` green and `source shared/resources/resolve-platform.sh` returning 0 on the repo's own
`skills-config.yaml`.

## Progress Tracking

- [x] 1. `read-config.sh` extracted, `python3` probe fixed
- [x] 2. `resolve-paths.sh` sources it; roots verified unchanged
- [x] 3. `validate_enum`, per-key legal sets, mapping-form handling, most-restrictive access resolution
- [x] 4. Malformed-YAML fail-closed branch
- [x] 5. 16 call sites guarded + canonical snippet updated
- [x] 6. `configuration.md` schema block, key table, corrected `tracker` row
- [x] 7. `platform-detection.md` outputs, precedence rule, guarded form
- [x] 8. `setup-consumer.sh` access prompt
- [x] 9. `tracker-access.test.sh` written; every mutation watched failing
- [x] 10. `package.json` chain + focused script
- [x] `npm run bundle`; regenerated references committed
- [x] `npm test` and `npm run validate:all` green

## Change Log

| Date | Version | Description | Author |
| ---- | ------- | ----------- | ------ |
| 2026-08-17 | 1.0 | Initial draft | create-task |
| 2026-08-17 | 1.1 | Review (6/10 → revised): halt mechanism did not exist at any of the 16 call sites; env/config precedence stated two contradictory ways; strict validation would reject the documented `tracker.workflowFile` mapping form. Adopted most-restrictive-wins access resolution, per-key legal sets, mapping→`auto`, fail-closed on malformed YAML with `access:`, shared nested reader with `python3` probe. Call-site guards added to scope; estimate 4h → 8h. Added Technical Background, Breaking Changes, Progress Tracking, Change Log | review-task |
| 2026-08-17 |  | Status → ready-for-development | review-task |
| 2026-08-17 |  | Implemented — 57 files (5 shared sources, 15 SKILL.md call sites, 4 docs, setup wizard, package.json, 36 bundled reference trees), 61 tests, 12 mutations watched failing | develop |

## References

- [`shared/resources/resolve-platform.sh`](../../../shared/resources/resolve-platform.sh) — the resolver being extended
- [`shared/resources/resolve-paths.sh`](../../../shared/resources/resolve-paths.sh) — holds `read_nested_config_key`, the reader being extracted
- [`shared/resources/platform-detection.md`](../../../shared/resources/platform-detection.md) — canonical resolver spec
- [`docs/reference/configuration.md`](../../reference/configuration.md) — `skills-config.yaml` schema and key reference
- [`docs/reference/tracker-workflow.md`](../../reference/tracker-workflow.md) — the `tracker.workflowFile` mapping form (L353-363)
- [task.51 review 1](./task.51.review.1.access-mode-config-and-resolver.md) — the review this revision answers
- [task.52](../task.52.deferred-mutation-record-and-renderers/task.52.deferred-mutation-record-and-renderers.md) — the next unit; consumes these variables
- [task.58](../task.58.restricted-access-documentation/task.58.restricted-access-documentation.md) — the documentation layer for the whole sequence

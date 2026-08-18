---
id: task.53
title: '[Task 53] Intercept Jira REST mutations in two layers — a fail-closed net and a legible one'
type: task
description: 'Makes restricted access real for Jira REST. Two layers inside jira-sync.js: the http() factory refuses any non-GET under a non-`full` access mode and records it, so a mutation nobody annotated is loud rather than silently executed; and the semantic mutators record a proper kind, target, intent and desired value, which is what makes manual mode say "set Team to Platform" instead of printing a JSON blob. Adds 5 new Jira mutation kinds to the intercepted set; a 6th (jira.transition) is already owned by task.52''s jira-stage.js gate, taking coverage to 6 of the 9 Jira kinds. Introduces jira.unknown-mutation as a 21st roster kind so layer 1 has something legal to write.'
tags: [restricted-access, jira, interception, jira-sync]
category: refactoring
status: in-progress
priority: High
risk_level: high
created: 2026-08-17
updated: 2026-08-18
estimated_effort_hours: 10
github_issue: 231
---

# [Task 53] Intercept Jira REST mutations in two layers — a fail-closed net and a legible one

**Task File**: [task.53.jira-rest-interception.md](./task.53.jira-rest-interception.md)

**GitHub Issue**: [#231](https://github.com/Gamaroff/agent-skills/issues/231)

**Review**: ✅ All review recommendations from `task.53.review.1.jira-rest-interception.md` implemented 2026-08-18

## Overview

Third of seven (51–57). The first task where a non-`full` access mode changes what actually happens.
Depends on [task.51](../task.51.access-mode-config-and-resolver/task.51.access-mode-config-and-resolver.md)
and [task.52](../task.52.deferred-mutation-record-and-renderers/task.52.deferred-mutation-record-and-renderers.md).

## Motivation

`shared/resources/jira-sync.js` is the shared library behind all three `sync-jira-*` skills and every
pipeline transition, and its HTTP layer is built as a factory with an injectable `fetchImpl`. Nearly
every Jira REST mutation in the repository passes through a small number of its functions — the three
exceptions are named in Technical Background — which makes it the single highest-value interception
point in the sequence.

## Technical Background

### Current architecture

`makeHttp` (`jira-sync.js:1586`) takes transport options only —
`{ fetchImpl = fetch, timeoutMs, retries, retryDelayMs, maxRetryAfterMs }` — and returns
`http(url, opts)` (`:1593`). The retry loop opens at `:1595`; `fetchImpl` is invoked at `:1600`, and
the 429 / 5xx branches sit at `:1602-1618`, **inside** the loop. Anything recorded inside that loop
records once per attempt.

There are exactly four non-GET call sites in the file:

| Site | Call | Kind |
| ---- | ---- | ---- |
| `:1888` (`moveToBacklog`, `:1864`) | `POST /rest/agile/1.0/backlog/issue` | `jira.backlog.add` |
| `:3303` (`transitionToStatus`'s inner `post()`, `:3298`) | `POST …/transitions` | `jira.transition` |
| `:4188` (`putIssueAtomic`, `:4177`) | `PUT /rest/api/3/issue/{key}` | `jira.issue.update` |
| `:4147` (`findExistingByLabel`, `:4136`) | `POST /rest/api/3/search/jql` | **none — a read** |

Three mutation paths live outside this library:

- `skills/jira-epic-creator/scripts/jira-create-epic.js` calls global `fetch` directly (`:291`,
  `:339`) against the legacy `/rest/api/2/issue`. It does not bundle `jira-sync.js` and has no
  `fetchImpl` seam.
- `shared/resources/jira-sprint-lib.sh`'s `jsm_curl` (`:32`) shells out to `curl`.
- The three `sync-jira-*.js` create-POSTs, which do route through `http()` but need semantic
  annotation to render legibly.

### What tasks 51 and 52 already shipped

- `resolve-platform.sh` exports `ACCESS_TRACKER` / `ACCESS_VCS`, modes
  `full | read-only | approve | command | manual`, most-restrictive-wins. It **rejects any
  `ACCESS_VCS != full`** at `:456-462` with `return 1`.
- `defer-mutation.js` exposes `defer(input, opts)` → `buildRecord` (`:627`), appending NDJSON to
  `.claude/state/tracker-actions.jsonl`. The record schema (`:686-716`) is
  `{v,id,order,dependsOn,ts,run,step,skill,system,access,kind,consequence,produces,intent,target,desired,observed,satisfied,manual,command,verify,retry_of}`.
  `intent` is **required** and throws if absent (`:663-669`). The deep link is `target.url` /
  `target.ui_url`.
- **The kind roster is closed.** `buildRecord` throws on any kind absent from §"The 20 kinds" in
  `tracker-access-record.md` (`:639-646`, roster pinned at `:63`), and
  `handover-render.test.mjs` asserts the count at `:75`, `:111`, `:156` plus bidirectional
  renderer totality at `:86-102`.
- **`jira.transition` is already intercepted.** `jira-stage.js:447-449` calls `dm.defer` with that
  kind and returns at `:500` with `reason: "deferred"`. `jira-stage.js:621` is the **only** caller of
  `walkLadder` in the repository.
- `jira-stage.js` and `gh-stage.js` are the reference implementation of the gate shape this task
  copies: capture `ACCESS_TRACKER` from the real env before `loadDotEnv` so a `.env` cannot escalate,
  resolve, record, emit `reason: "deferred"`, exit 0.

### Target architecture

Two gates in `jira-sync.js`. Layer 1 at the top of `http()` — **before** the retry loop at `:1595` —
refuses any non-GET under a non-`full` mode. Layer 2 annotates the two remaining semantic mutators so
their records carry `intent` and `desired` rather than a URL and a body blob.

## Decisions

| Decision | Why |
| -------- | --- |
| **Two layers, not one** | A hook at `http()` alone sees a URL and a JSON body, so `manual` mode would render `PUT /rest/api/3/issue/PROJ-1 {…}` — the exact opposite of "the exact field and its value". A hook only at the semantic mutators would let any un-annotated future mutation through silently. Both, or the feature is either illegible or unsafe. |
| **Layer 1 is fail-closed** | Under a non-`full` mode, any non-GET is journalled as `jira.unknown-mutation` and returns a synthetic `202`. A mutation nobody thought about is **refused and recorded**, never executed. The one exception is the POST-as-search in `findExistingByLabel`, which is a read wearing a POST. |
| **`jira.unknown-mutation` becomes a 21st roster kind** | Task 52's roster is deliberately closed — `buildRecord` throws on an unknown kind and the totality test enumerates from the schema doc. Layer 1 therefore has nothing legal to write until the kind exists. Adding it is a four-part change (roster row, renderer, three count assertions, the doc's own stated count) and is a **deliverable of this task**, not an incidental edit. |
| **Layer 2 covers the mutators layer 1 cannot describe** | `putIssueAtomic` and `moveToBacklog`, plus the four create-POSTs. Everything else falls through to layer 1 and renders generically but correctly — a bounded, stated gap rather than a silent one. |
| **`jira.transition` is *not* re-intercepted** | `jira-stage.js:447` already defers it and returns at `:500`, and `:621` is `walkLadder`'s only caller. Annotating `walkLadder`, `transitionToStatus` and its inner `post()` would add a currently-unreachable path and risk 2–4 records for one logical hop, breaking the single-record invariant. The kind is covered; the owner is `jira-stage.js`. |
| **Deferral reuses the `--dry-run` null path, per operation** | A deferred **create** returns the null shape at `sync-jira-story.js:1005` — `{ issueKey: null, issueUrl: null, updated: null }`. A deferred **update** already has a key, so it returns the update dry-run shape at `:914-921` — real `issueKey`, `updated: null`. Both shapes are already exercised by the `--dry-run` tests, so null-tolerance is proven rather than newly assumed. |
| **`jsm_curl` is included, and must set its globals** | `jira-sprint-lib.sh:32` is one bash function behind both mutating sprint scripts. It is **not** side-effect free: its docblock (`:29`) declares "Sets globals: JSM_HTTP_STATUS, JSM_BODY", and both callers branch on them and abort — `manage-sprint-state.sh:45,49` and `move-sprint-issues.sh:46`, under `set -euo pipefail`. The defer branch must therefore set `JSM_HTTP_STATUS=200` (accepted by both) and a jq-safe `JSM_BODY`, or it converts a deferral into a failed run. |
| **`jira-create-epic.js` gets a hand-rolled gate, and this is stated as an exception** | It calls global `fetch` directly and does not bundle `jira-sync.js`, so **layer 1's fail-closed guarantee does not reach it**. This file has drifted from the shared library before (`task.46.bug.2`). An explicit local check is the bounded fix; routing it through `jira-sync.js` is worth doing but is not this task. |
| **`access.vcs` gating is deferred to its own task** | The original plan had `develop-next` / `develop-batch` HALT below `access.vcs: approve`. That state is unreachable: `resolve-platform.sh:456-462` rejects **any** non-`full` `ACCESS_VCS` and aborts the run before either orchestrator's Step 0 runs. Making `approve` legal reverses a deliberate task 51 decision and touches `resolve-platform.sh` plus `tracker-access.test.sh` — a separate unit, not a footnote in a Jira-REST task. The requirement stands; the placement does not. |

## Scope

**In scope:** layers 1 and 2 in `jira-sync.js`; the `jira.unknown-mutation` roster kind with its
renderer and count updates; the `jsm_curl` guard including its globals; the hand-rolled gate in
`jira-create-epic.js`; the `deferred` reason in the three `sync-jira-*` skills' `--json` payloads;
refreshing the "PARTIALLY ENFORCED" resolver notice.

**Out of scope:**

- **Jira comments** (`jira.comment.add`) — there is no code path to intercept, which is
  [task.55](../task.55.tracker-comment-cli/task.55.tracker-comment-cli.md)'s whole subject.
- **`jira.issue.link` and `jira.worklog.add`** — these have **no call site anywhere in the
  repository**. They exist as roster rows reachable only via MCP tools invoked from skill prose, so
  there is nothing to gate. Same shape as comments; same resolution path.
- **`jira.transition`** — already owned by `jira-stage.js` (see Decisions).
- **`access.vcs: approve` support and the orchestrator HALTs** — deferred to a follow-up task.
- **GitHub** — [task.54](../task.54.github-board-interception/task.54.github-board-interception.md).

### Coverage after this task

| Kind | Status |
| ---- | ------ |
| `jira.issue.create` | ✅ new — 3 sync scripts + `jira-create-epic.js` |
| `jira.issue.update` | ✅ new — `putIssueAtomic` |
| `jira.backlog.add` | ✅ new — `moveToBacklog` |
| `jira.sprint.move-issues` | ✅ new — `jsm_curl` |
| `jira.sprint.set-state` | ✅ new — `jsm_curl` |
| `jira.transition` | ✅ already owned by `jira-stage.js:447` |
| `jira.comment.add` | ❌ task.55 |
| `jira.issue.link` | ❌ no code path exists |
| `jira.worklog.add` | ❌ no code path exists |

**5 new kinds; 6 of 9 covered in total.**

## Breaking Changes

None for existing consumers. `full` is the default and remains byte-identical; both new `makeHttp`
options are additive and default so that all 14 bundled copies and every existing call site are
unaffected.

One **internal** contract change: the mutation-kind roster grows from 20 to 21. Any consumer counting
kinds must move in the same commit — that is why the roster, the renderer and the test counts are all
listed in Files Summary.

## Implementation Plan

1. **The 21st kind** — add `jira.unknown-mutation` to `tracker-access-record.md` (kind, consequence,
   underlying call), add its `KIND_PRESENTATION` entry in `handover-render.js`, update the three
   hard-coded `20`s in `handover-render.test.mjs` (`:75`, `:111`, `:156`) and the doc's own stated
   count. Do this **first** — layer 1 cannot be tested until the kind is writable.
2. **Layer 1** — `makeHttp` gains additive `{ access, system }` options, both defaulting to preserve
   today's behaviour. At the top of `http()`, **before** the retry loop at `:1595`, refuse any non-GET
   under a non-`full` mode: record and return a synthetic `202`. Allowlist the POST-as-search in
   `findExistingByLabel` by URL.
3. **Layer 2** — record a typed action at `putIssueAtomic` and `moveToBacklog`, and at the create-POSTs
   in `sync-jira-story.js:355`, `sync-jira-task.js:812`, `sync-jira-epic.js:1125` **and its retry at
   `:1146`** (record at the first only — the retry is one logical mutation), plus
   `jira-create-epic.js:339`. Each supplies `intent` (required), `target.url` / `target.ui_url`, and
   `desired`.
4. **`jsm_curl`** — method check at the top of the function (`jira-sprint-lib.sh:32`). The defer branch
   **must** set `JSM_HTTP_STATUS=200` and a jq-safe `JSM_BODY` before returning, or
   `move-sprint-issues.sh:46` and `manage-sprint-state.sh:49` will `exit 1`.
5. **`--json`** — add `reason: "deferred"` to the three sync skills, and to the documented samples.
   `tests/json-output-fidelity.test.js` compares samples against emitted payloads in both directions,
   so the samples must be updated in the same change or that guard fails. Copy the shape already
   emitted by `jira-stage.js:489`.
6. **Resolver notice** — refresh the "PARTIALLY ENFORCED" string at `resolve-platform.sh:471-474` and
   its assertion in `tracker-access.test.sh` §17 to reflect what now *is* enforced.
7. Tests, `npm run bundle` (14 `jira-sync.js` copies + 3 `jira-sprint-lib.sh` copies), docs.

## Files Summary

| File | Change |
| ---- | ------ |
| `shared/resources/jira-sync.js` | layers 1 and 2 |
| `shared/resources/tracker-access-record.md` | the 21st kind + the stated count |
| `shared/resources/handover-render.js` | `KIND_PRESENTATION` entry for the new kind |
| `shared/resources/tests/handover-render.test.mjs` | three roster-count assertions |
| `shared/resources/jira-sprint-lib.sh` | `jsm_curl` method check **+ `JSM_HTTP_STATUS`/`JSM_BODY`** |
| `shared/resources/resolve-platform.sh` | refresh the "PARTIALLY ENFORCED" notice |
| `shared/resources/tracker-access.test.sh` | §17 asserts that notice string |
| `skills/sync-jira-{story,task,epic}/scripts/*.js` | create-POST records; `deferred` in `--json` |
| `skills/sync-jira-{story,task,epic}/SKILL.md` | `--json` samples |
| `skills/jira-epic-creator/scripts/jira-create-epic.js` | **hand-rolled gate** — outside layer 1 |
| `tests/json-output-fidelity.test.js` | sample/payload parity in both directions |
| `shared/resources/tests/jira-interception.test.mjs` | **new** |
| `docs/reference/configuration.md` | the `deferred` reason |
| `docs/reference/troubleshooting.md` | "my Jira card did not move" |

### Found during implementation, not in the plan above

| File | Change | Why it was missed |
| ---- | ------ | ----------------- |
| `shared/resources/defer-mutation.js` | `EXPECTED_KIND_COUNT` 20 → 21 | A **fifth** roster site. `parseRoster` throws when the parsed count disagrees, so without this every `buildRecord` call fails — layer 1 included. The plan named four sites; the roster's own blockquote names this one, and the plan did not carry it across |
| `shared/resources/tests/fixtures/handover-all-kinds.jsonl` | one record for the new kind | The totality test asserts the fixture carries every kind |
| `shared/resources/tests/handover-render.test.mjs` | a **fourth** hard-coded `20` at the dry-run plan count, plus the header comment | The plan said three |
| `skills/sync-jira-epic/scripts/sync-jira-epic.js` | layer-2 annotation on the **Team-field PUT** | A fifth semantic mutator, and the literal "set Team to Platform" case the Decisions table uses as its example. Unannotated it renders as a PUT and a UUID |
| `skills/jira-sprint-manager/scripts/{manage-sprint-state,move-sprint-issues}.sh` | set `JSM_DEFER_*` before the call | `jsm_curl` is generic; without the caller naming the kind, both sprint mutations would record as `jira.unknown-mutation` rather than as the two kinds this task claims to cover |
| `CHANGELOG.md` | Added / Changed entries | Observable behaviour changed (`--json` keys, a new roster kind, refused writes) |

Bundled copies regenerated by `npm run bundle`: `skills/*/references/jira-sync.js` (14),
`skills/jira-sprint-{manager,retrospective,review-prep}/references/jira-sprint-lib.sh` (3),
and the `defer-mutation.js` / `tracker-access-record.md` / `handover-render.js` copies.

## Testing Strategy

| Case | Asserted |
| ---- | -------- |
| `full` mode | **Byte-identical to today.** Journal empty; every existing test green except the roster-count assertions, which change by design |
| `manual`, each of the 5 new kinds | Exactly one typed record with non-empty `intent`; **no network call** |
| `manual`, an un-annotated mutation | Recorded as `jira.unknown-mutation`; still no network call |
| The 21st kind | Renders non-empty in all four formats; roster totality test passes at 21 |
| Retry path (429, transient) | **One** record, not one per attempt |
| POST-as-search | `findExistingByLabel` executes normally — a read is not a mutation |
| Deferred create | Returns the create null shape (`sync-jira-story.js:1005`); caller copes |
| Deferred update | Returns the update shape (`:914-921`) — real key, `updated: null` |
| `sync-jira-epic` double create-POST | One record across `:1125` and its `:1146` retry |
| Sprint scripts under `manual` | Recorded, **`JSM_HTTP_STATUS` is set to 200**, and `set -euo pipefail` scripts complete without abort |
| `jira-create-epic.js` under `manual` | Its hand-rolled gate records and makes no network call |

Hermetic throughout: a stubbed `fetchImpl` that **throws on any non-GET**, so "no write reached the
network" is proven rather than asserted by inspection.

**Mutation-prove:** let one POST through layer 1 → the no-network test goes red · record inside the
retry closure → the duplicate test → red · drop the search exclusion → the search test → red · make
deferred create return a fabricated key → the null-shape test → red · return from the `jsm_curl`
defer branch without setting `JSM_HTTP_STATUS` → the sprint no-abort test → red · add the 21st kind
without its renderer → the totality test → red.

## Success Criteria

- [x] `full` mode byte-identical; the existing suite green except the roster-count assertions
- [x] Under a non-`full` mode **no non-GET reaches the network**, proven by a throwing stub
- [x] `jira.unknown-mutation` exists as the 21st roster kind and renders in all four formats
- [x] All 5 new kinds produce legible records — `intent` and `desired`, not a JSON blob
- [x] An un-annotated mutation is refused and recorded, never executed
- [x] Exactly one record per logical mutation, including across retries and the epic double-POST
- [x] Deferred creates return the create null shape; deferred updates return the update shape
- [x] `jsm_curl` sets `JSM_HTTP_STATUS`/`JSM_BODY` on defer; both sprint scripts complete without abort
- [x] `jira-create-epic.js` is gated, and its exclusion from layer 1 is stated in the document
- [x] `--json` samples updated alongside the payloads
- [x] The resolver's "PARTIALLY ENFORCED" notice reflects what is now enforced
- [x] The `deferred` reason is documented where a reader will hit it — a capability that refuses
      without a documented reason reads as a bug
- [x] Every invariant watched failing; `npm test`, `validate:all` green; `npm run bundle` committed

## Risk Assessment

**High** — this edits the library behind every Jira operation in 14 skills.

| Risk | Why | Mitigation |
| ---- | --- | ---------- |
| **A `full`-mode regression** | `jira-sync.js` is the most load-bearing file in the repo | The gate is a single early branch on a variable that defaults to `full`; the byte-identical test is the primary guard, and the existing suite must pass unchanged apart from the roster counts |
| **A deferred create corrupts a document** | Callers expect a key | Reuse the proven `--dry-run` null path; **never** write a placeholder key to frontmatter — it would defeat the idempotent `synced-from-*` label search on the next run |
| **The roster triple falls out of step** | The kind, its renderer and three test counts must move together, and the roster is enumerated from the doc rather than a list | All four are in Files Summary and step 1 lands them in one commit; the totality test fails closed if any is missed |
| **Double-recording a transition** | `walkLadder → transitionToStatus → post()` nests three candidate sites over a path `jira-stage.js` already gates | Layer 2 does not touch the transition chain at all; `jira-stage.js` remains the sole owner, asserted by a single-record test |
| **A deferred sprint call aborts the run** | `jsm_curl`'s callers branch on globals under `set -euo pipefail` | The defer branch sets `JSM_HTTP_STATUS=200`; mutation-proven by removing the assignment |
| **Layer 1 blocks a read that happens to be a POST** | `findExistingByLabel` is one; there may be others | Explicit allowlist by URL, asserted by test; layer 1 logs loudly, so a wrongly-blocked read surfaces immediately rather than silently returning empty |
| **`jira-create-epic.js` drifts again** | It duplicates library logic and has broken this way before (`task.46.bug.2`) | The exception is stated in Decisions and Scope rather than left implicit, so the next reader knows it is outside the net |
| **Duplicate records on retry** | `http()` retries 429s internally at `:1602-1618` | Record before the `while` at `:1595`; mutation-proven |

## Rollback Plan

`git revert <sha>` then `npm run bundle`. `full`-mode consumers are unaffected either way.

The one ordering constraint: the roster kind, its `KIND_PRESENTATION` entry and the three test counts
must revert **together**, or `handover-render.test.mjs`'s totality assertion fails. Since step 1 lands
them in a single commit, a single revert is sufficient.

## Progress Tracking

- [x] Step 1 — `jira.unknown-mutation` roster kind, renderer, count updates
- [x] Step 2 — layer 1 in `makeHttp` / `http()`
- [x] Step 3 — layer 2 at `putIssueAtomic`, `moveToBacklog`, four create-POSTs (plus the epic Team-field PUT)
- [x] Step 4 — `jsm_curl` guard incl. `JSM_HTTP_STATUS` / `JSM_BODY`
- [x] Step 5 — `--json` `reason: "deferred"` + SKILL.md samples
- [x] Step 6 — resolver notice + `tracker-access.test.sh` §17
- [x] Step 7 — tests, `npm run bundle`, docs

## QA Testing Results

**QA Status**: CONCERNS — escalated at the 5-cycle loop limit
**QA Engineer**: QA Engineer
**Testing Date**: 2026-08-18
**Quality Score**: 70/100 (gate 2)
**Gate Decision**: CONCERNS (gate 2; gate 1 was FAIL)

### QA Report

- **Full Report**: [task.53.qa.1.jira-rest-interception.md](./task.53.qa.1.jira-rest-interception.md)
- **Gate File**: [task.53.gate.1.jira-rest-interception.yml](./task.53.gate.1.jira-rest-interception.yml)

### Test Coverage Summary

- **Tests Executed**: 1379 (0 failures)
- **Phases Verified**: 7/7
- **Critical Issues**: 3 high, 2 medium, 4 low
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: FAIL, Maintainability: CONCERNS

### Key Findings

The net holds — no mutation reaches the network on any gated path, proven against a stub that throws
on any write. Three high-severity paths one layer up report a refused mutation as a **success**, and
two of them write that false success into a document: the transition chain reads the synthetic `202`
as a completed transition (**CR-1**); the two hand-rolled gates read an env var their own documented
invocation never sets, so they are inert (**CR-2**); and the write-back guard keys off the record id
rather than the deferral, so a failed journal write reports success (**CR-3**).

## Change Log

| Date | Version | Description | Author |
| ---- | ------- | ----------- | ------ |
| 2026-08-17 | 1.0 | Initial draft | create-task |
| 2026-08-18 | 1.1 | Review (5/10) — 4 critical, 7 important fixed: added the `jira.unknown-mutation` roster kind as a deliverable; removed the unreachable `access.vcs: approve` HALTs; corrected the false `jsm_curl` side-effect-free premise; dropped the transition chain from layer 2 as already owned by `jira-stage.js`; corrected the kind arithmetic to 5 new / 6 of 9; realigned record vocabulary to the shipped schema; added 8 missing files, Technical Background, Breaking Changes, Progress Tracking and this log | review-task |
| 2026-08-18 |  | Status → ready-for-development | review-task |
| 2026-08-18 |  | Implemented — 22 files, 19 new tests (suite 1352 → 1371); 6 invariants watched failing | develop |
| 2026-08-18 |  | QA gate FAIL (20/100) — 3 high, 2 medium, 4 low; the net holds, the callers do not | qa-task |
| 2026-08-18 |  | QA cycle 2 — 5 findings in the cycle-1 fixes; access resolution consolidated into one three-tier resolver | qa-fix |
| 2026-08-18 |  | QA cycles 3–5 — 5 cycles reached without a clean gate; gate 2 CONCERNS (70/100). Escalated: the open findings are all in access-mode resolution, which this document does not scope | qa-task |

## References

- [task.52](../task.52.deferred-mutation-record-and-renderers/task.52.deferred-mutation-record-and-renderers.md) — the record and journal this writes to
- [task.55](../task.55.tracker-comment-cli/task.55.tracker-comment-cli.md) — Jira comments, which have no code path to intercept
- [task.53 review 1](./task.53.review.1.jira-rest-interception.md) — the review that produced the 1.1 revision

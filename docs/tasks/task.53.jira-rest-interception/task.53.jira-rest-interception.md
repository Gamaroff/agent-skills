---
id: task.53
title: '[Task 53] Intercept Jira REST mutations in two layers — a fail-closed net and a legible one'
type: task
description: 'Makes restricted access real for Jira REST. Two layers inside jira-sync.js: the http() factory refuses any non-GET under a deferring mode and records it, so a mutation nobody annotated is loud rather than silently executed; and the six semantic mutators record a proper kind, target, deep link and human-readable field list, which is what makes manual mode say "set Team to Platform" instead of printing a JSON blob. Covers 6 of 9 Jira mutation kinds plus the 2 sprint kinds via jsm_curl. Also makes develop-next and develop-batch refuse below access.vcs approve, because a batched handover cannot merge a PR.'
tags: [restricted-access, jira, interception, jira-sync]
category: refactoring
status: planned
priority: High
risk_level: high
created: 2026-08-17
updated: 2026-08-17
estimated_effort_hours: 10
---

# [Task 53] Intercept Jira REST mutations in two layers — a fail-closed net and a legible one

**Task File**: [task.53.jira-rest-interception.md](./task.53.jira-rest-interception.md)

## Overview

Third of seven (51–57). The first task where a non-`full` access mode changes what actually happens.
Depends on [task.51](../task.51.access-mode-config-and-resolver/task.51.access-mode-config-and-resolver.md)
and [task.52](../task.52.deferred-mutation-record-and-renderers/task.52.deferred-mutation-record-and-renderers.md).

## Motivation

`shared/resources/jira-sync.js` is the shared library behind all three `sync-jira-*` skills and every
pipeline transition. Every Jira REST mutation in the repository passes through a small number of its
functions, and its HTTP layer is built as a factory with an injectable `fetchImpl`. That makes it the
single highest-value interception point in the sequence: **six of the nine Jira mutation kinds, with
no call-site edits.**

## Decisions

| Decision | Why |
| -------- | --- |
| **Two layers, not one** | A hook at `http()` alone sees a URL and a JSON body, so `manual` mode would render `PUT /rest/api/3/issue/PROJ-1 {…}` — the exact opposite of "the exact field and its value". A hook only at the semantic mutators would let any un-annotated future mutation through silently. Both, or the feature is either illegible or unsafe. |
| **Layer 1 is fail-closed** | Under a deferring mode, any non-GET is journalled as `jira.unknown-mutation` and returns a synthetic `202`. A mutation nobody thought about is **refused and recorded**, never executed. The one exception is the POST-as-search at `:4147`, which is a read wearing a POST. |
| **Layer 2 covers the ~12 kinds the pipelines actually fire** | The remaining kinds fall through to layer 1 and render generically but correctly. A bounded, stated gap rather than a silent one — and the checklist says which items are generic so the reader knows. |
| **Deferral reuses the `--dry-run` null path** | `sync-jira-story.js:819` already sets `result = { issueKey: null, issueUrl: null, updated: null }` and the rest of the script copes. The existing `--dry-run` tests already cover that shape, so null-tolerance is proven rather than newly assumed. |
| **`jsm_curl` is included** | `shared/resources/jira-sprint-lib.sh:43` is a single bash function behind both sprint scripts, and no caller consumes a return value. Two more kinds for a method check at the top of one function — free coverage, taken. |
| **`develop-next` / `develop-batch` HALT below `access.vcs: approve`** | A batched handover cannot merge a PR. Leaving `merged: false, ticked: false` in the run-state file for a human to finish later is a resumability trap: the Step 4 roadmap tick would then run against an unverified assumption about what landed. Both orchestrators refuse at their Step 0 state check and point at `/develop-story` and `/develop-task`, which complete fine under restricted access. **A capability restriction, documented as one — not a bug.** |

## Scope

**In scope:** layers 1 and 2 in `jira-sync.js`; the `jsm_curl` guard; the `deferred` reason in the
three `sync-jira-*` skills' `--json` payloads; the two orchestrator HALTs.

**Out of scope:** Jira comments — there is no code path to intercept, which is
[task.55](../task.55.tracker-comment-cli/task.55.tracker-comment-cli.md)'s whole subject. GitHub —
[task.54](../task.54.github-board-interception/task.54.github-board-interception.md).

## Implementation Plan

1. **Layer 1** — `makeHttp({ access, system })`; non-GET under a deferring mode records and returns a
   synthetic response. Exclude `/rest/api/3/search/jql`.
2. **Layer 2** — record a typed action at `putIssueAtomic`, `transitionToStatus`'s inner `post()`,
   `walkLadder`, `moveToBacklog`, and the create-POSTs in the three `sync-jira-*.js` scripts plus
   `jira-create-epic.js`. Each supplies deep link, field name and target value; transitions supply
   the hop route from the existing `planHops()` so a gated board is described accurately.
3. **`jsm_curl`** — method check at the top.
4. **`--json`** — add `reason: "deferred"` to the three sync skills, and to the documented samples.
   `tests/json-output-fidelity.test.js` compares samples against emitted payloads in both directions,
   so the samples must be updated in the same change or that guard fails.
5. **Orchestrator HALTs** in `develop-next` and `develop-batch` Step 0.
6. Tests, `npm run bundle`, docs.

## Files Summary

| File | Change |
| ---- | ------ |
| `shared/resources/jira-sync.js` | layers 1 and 2 |
| `shared/resources/jira-sprint-lib.sh` | `jsm_curl` method check |
| `skills/sync-jira-{story,task,epic}/scripts/*.js` | create-POST records; `deferred` in `--json` |
| `skills/sync-jira-{story,task,epic}/SKILL.md` | `--json` samples |
| `skills/develop-next/SKILL.md`, `skills/develop-batch/SKILL.md` | Step 0 HALT |
| `shared/resources/tests/jira-interception.test.mjs` | **new** |

## Testing Strategy

| Case | Asserted |
| ---- | -------- |
| `full` mode | **Byte-identical to today.** Journal empty; every existing test still green |
| `manual`, each of the 6 kinds | Exactly one typed record; **no network call** |
| `manual`, an un-annotated mutation | Recorded as `jira.unknown-mutation`; still no network call |
| Retry path (429, transient) | **One** record, not one per attempt |
| POST-as-search | Executes normally — a read is not a mutation |
| Deferred create | Returns the null shape the `--dry-run` path already returns; caller copes |
| Sprint scripts under `manual` | Recorded, `set -euo pipefail` scripts do not abort |
| `develop-next` under restricted `vcs` | HALTs with the message naming the alternative |

Hermetic throughout: a stubbed `fetchImpl` that **throws on any non-GET**, so "no write reached the
network" is proven rather than asserted by inspection.

**Mutation-prove:** let one POST through layer 1 → the no-network test goes red · record inside the
retry closure → the duplicate test → red · drop the search exclusion → the search test → red · make
deferred create return a fabricated key → the null-shape test → red · remove the orchestrator HALT →
that test → red.

## Success Criteria

- [ ] `full` mode byte-identical; the whole existing suite green unchanged
- [ ] Under a deferring mode **no non-GET reaches the network**, proven by a throwing stub
- [ ] All 6 semantic kinds produce legible records — field name and value, not a JSON blob
- [ ] An un-annotated mutation is refused and recorded, never executed
- [ ] Exactly one record per logical mutation, including across retries
- [ ] Deferred creates return the existing `--dry-run` null shape
- [ ] `develop-next` / `develop-batch` refuse below `access.vcs: approve`, with a useful message
- [ ] `--json` samples updated alongside the payloads
- [ ] Every invariant watched failing; `npm test`, `validate:all` green; `npm run bundle` committed

## Risk Assessment

**High** — this edits the library behind every Jira operation in 14 skills.

| Risk | Why | Mitigation |
| ---- | --- | ---------- |
| **A `full`-mode regression** | `jira-sync.js` is the most load-bearing file in the repo | The gate is a single early branch on a variable that defaults to `full`; the byte-identical test is the primary guard, and the entire existing suite must pass unchanged |
| **A deferred create corrupts a document** | Callers expect a key | Reuse the proven `--dry-run` null path; **never** write a placeholder key to frontmatter — it would defeat the idempotent `synced-from-*` label search on the next run |
| **Layer 1 blocks a read that happens to be a POST** | `/search/jql` is one; there may be others | Explicit allowlist by URL, asserted by test; layer 1 logs loudly, so a wrongly-blocked read surfaces immediately rather than silently returning empty |
| **Duplicate records on retry** | `http()` retries 429s internally | Record outside the retry closure; mutation-proven |

## Rollback Plan

`git revert <sha>` then `npm run bundle`. `full`-mode consumers are unaffected either way.

## References

- [task.52](../task.52.deferred-mutation-record-and-renderers/task.52.deferred-mutation-record-and-renderers.md) — the record and journal this writes to
- [task.55](../task.55.tracker-comment-cli/task.55.tracker-comment-cli.md) — Jira comments, which have no code path to intercept

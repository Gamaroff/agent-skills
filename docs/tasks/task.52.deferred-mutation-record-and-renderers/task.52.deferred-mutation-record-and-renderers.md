---
id: task.52
title: '[Task 52] One deferred-mutation record, four renderings of it'
type: task
description: 'Defines the record a skill writes when it cannot perform a tracker mutation, the append-only journal it lands in, and the four renderers that turn a journal into a committed markdown checklist, a runnable shell script, a JSON sidecar and an inline summary. Nothing intercepts anything yet — this task is driven entirely by fixture journals, which is the point: the output contract is fixed and mutation-proven before any call site depends on it. The organising idea for the whole sequence is that manual, command, read-only and approve are four renderings of one record, not four features.'
tags: [restricted-access, schema, renderers, handover]
category: infrastructure
status: planned
priority: High
risk_level: low
created: 2026-08-17
updated: 2026-08-17
estimated_effort_hours: 8
---

# [Task 52] One deferred-mutation record, four renderings of it

**Task File**: [task.52.deferred-mutation-record-and-renderers.md](./task.52.deferred-mutation-record-and-renderers.md)

## Overview

Second of seven tasks (51–57). Establishes the data contract for restricted tracker access and every
output built from it, driven by fixture journals so the contract can be finished and proven before a
single call site is changed.

Depends on [task.51](../task.51.access-mode-config-and-resolver/task.51.access-mode-config-and-resolver.md)
for `ACCESS_TRACKER`.

## Motivation

The surface is 20 tracker mutation kinds and five access models. Treated naively that is 100
behaviours. The organising idea that makes it tractable:

> **One planned-mutation record. The access mode decides only who executes it and how it is
> rendered.**

`manual`, `command`, `read-only` and `approve` are four renderings of the same record. If the record
is right, each renderer is a pure function of it, and each can be tested without a network, a
credential or a tracker.

Fixing this first is what stops the sequence fragmenting. If interception landed first, every
subsequent task would negotiate with a schema that was already load-bearing in three places.

## Scope

**In scope:** the record schema, the runtime journal, the four renderers, the committed artifacts'
names and locations, their registration as pipeline artifacts, the `## Tracker Actions Required`
section in the implementation report, and — so the unit is demonstrably useful rather than merely
correct — **gating the two stage CLIs** (`jira-stage.js`, `gh-stage.js`) with a `reason: "deferred"`
outcome.

Gating those two is a small addition and it is what makes this shippable on its own: a consumer who
sets `access.tracker: read-only` gets the CLI declining a transition it is not permitted to make,
exiting 0 with `deferred`, and a run-end checklist naming the card and its target column. Today the
same consumer either 401s mid-pipeline or hands over a token they did not want to give. Much of the
record is already computed — `jira-stage.js --print-plan` emits most of it credential-free.

**Out of scope:**

- **Interception.** Nothing writes real records yet — tasks 53–56.
- **`read-only` verification.** The schema carries `observed` / `satisfied`, and the renderer honours
  them, but nothing populates them until [task.57](../task.57.readonly-verification-and-reconcile/task.57.readonly-verification-and-reconcile.md).
- **Executing an approved record.** `approve` renders a consent manifest here; `--apply` lands with
  the interception that gives it something to apply.

## Decisions

| Decision | Why |
| -------- | --- |
| **Append-only NDJSON at `.claude/state/tracker-actions.jsonl`** | Appends under 4 KiB are atomic on POSIX, so a node script and a shell function writing in the same step cannot corrupt each other. A crash mid-run leaves a readable prefix. `.claude/state/` is already the home of the pipeline lock and the two orchestrator state files, and is gitignored. |
| **Per-worktree by construction** | `develop-batch` gives each item its own worktree and therefore its own `.claude/`. Journals are isolated with no locking, and each renders into its own work-item directory. |
| **A content-hash `id` on every record** | The pipelines are resumable with per-step artifact verification, so a re-run re-emits records. Deduplicating on `sha1(system\|kind\|target\|fingerprint)` makes the renderer idempotent for free. |
| **`dependsOn` edges, not just an ordinal** | Some actions only make sense after another (post a comment on an issue that must first exist). The renderer nests them so the human reads a sequence, not a pile. |
| **One writer: `defer-mutation.js`** | Callable as a CLI (for shell chokepoints) and as a `require` (for node). Exactly one place knows the schema, or the shell and node layers drift. CommonJS, because `bundle_skill.py`'s sibling-follow regex recognises `require`. |
| **All three artifacts committed — checklist, script and JSON** | Initially the script and JSON were to be gitignored as regenerable. That is wrong on both counts. The JSON is [task.57](../task.57.readonly-verification-and-reconcile/task.57.readonly-verification-and-reconcile.md)'s input days later, possibly on a fresh clone or another machine — gitignoring it would make reconcile a local-machine-only tool. And the brief calls the script *reviewable*; a gitignored script cannot be reviewed in the PR. Both are safe to commit because they contain no credential **by construction**, which is a mutation-proven invariant, not a hope. The script ships mode 0644 and dry-run-by-default so nobody runs it by accident. |
| **`retry_of`: a failed mutation in `full` mode is also a record** | Today a transient tracker failure evaporates into an Issues Log warning, because every tracker mutation is non-blocking by policy. Routing failures into the same ledger means a **full-access** consumer gets a handover file exactly when something broke, with a re-runnable script to fix it. This is what makes the sequence worth building for consumers who are not restricted at all. |
| **`consequence`: `state-drift` \| `communication` \| `irreversible`** | Groups the checklist by what skipping actually costs, and drives the script's confirm gate. A missed board move causes drift; a missed comment loses a record nobody reads; a merge cannot be undone. Treating them alike would bury the one that matters. |
| **`target.url` and `target.ui_url` are separate** | The object and the place you perform the action differ for board-field sets (board URL plus an item filter) and sprint operations (backlog URL). `manual` mode is unusable without the distinction. |
| **`handover` as the artifact kind** | Slots into the existing grammar beside `implementation`, `qa`, `gate`, `dod` (`docs/standards/file-naming.md:33-50`). No Step 8 change needed — `/commit-changes --scope {work-item-dir}` already commits everything in the directory. |

## The record

Sketch, to be finalised in implementation:

```jsonc
{
  "v": 1,
  "id": "a3f19c02",              // sha1-8 — idempotency key across resumes
  "order": 17,                   // monotonic within run
  "dependsOn": ["c81be440"],     // ordering edges
  "ts": "2026-08-17T10:04:11Z",
  "run": "feature/task.52.foo", "step": "7", "skill": "finalise",

  "system": "jira",              // jira | github
  "access": "manual",            // mode in force when recorded
  "kind": "jira.comment",        // namespaced; one of the 20
  "produces": null,              // symbol the human's action yields, if any

  "intent": "Post the Definition of Done summary",
  "target": { "issue": "PROJ-123", "url": "https://acme.atlassian.net/browse/PROJ-123" },
  "desired":  { "status": "In Review" },
  "observed": null,              // read-only mode populates; task.57
  "satisfied": false,

  "manual":  { "deepLink": "...", "ui": "Open the issue → Comment → Paste → Save",
               "fields": [{ "name": "Comment", "value": "..." }] },
  "command": { "argv": ["gh","issue","comment","42","--body-file","-"], "stdin": "..." },
  "verify":  { "cmd": "gh issue view 42 --json comments", "expect": "contains 'Accepted'" }
}
```

`manual` and `command` are sibling renderings of one intent, held on the record rather than derived
at render time, because only the emitting call site knows the field's human-facing name.

## Implementation Plan

1. **`shared/resources/defer-mutation.js`** — the single writer. CLI + `require`. Validates against
   the schema and refuses an unknown `kind` rather than writing a record nothing can render.
2. **`shared/resources/handover-render.js`** — `--journal <path> --out <path> [--format md|sh|json]`.
   Dedups by `id`, topologically sorts on `dependsOn` then `order`, groups by system, collapses
   `satisfied: true` into an "already correct" section, flags expected-but-absent moments as
   `⚠️ UNRECORDED`.
3. **`shared/resources/tracker-access-record.md`** — the canonical schema doc, bundled into skills.
4. **The four renderers**, as pure functions of the record list.
5. **`docs/standards/file-naming.md`** — register `handover` as an artifact kind.
6. **`docs/reference/pipeline-artifacts.md`** — add the row.
7. **`shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`** — add
   `## Tracker Actions Required` to both implementation-report templates, beside the Issues Log.
8. **`.gitignore`** — the `.tracker-actions/` sidecar directory. Note the standing trap: blanket
   ignore rules have silently swallowed test fixtures before, so the fixture journals under
   `shared/resources/tests/fixtures/` need an explicit negation.
9. **Tests + `package.json`** — the hand-maintained `test` glob list.

## Files Summary

| File | Change |
| ---- | ------ |
| `shared/resources/defer-mutation.js` | **new** — the single writer |
| `shared/resources/handover-render.js` | **new** — the four renderers |
| `shared/resources/tracker-access-record.md` | **new** — canonical schema |
| `shared/resources/tests/handover-render.test.mjs` | **new** — fixture journal → four outputs |
| `shared/resources/tests/fixtures/` | **new** — fixture journals, one per kind |
| `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` | report template section |
| `docs/standards/file-naming.md`, `docs/reference/pipeline-artifacts.md` | register the artifact |
| `.gitignore`, `package.json` | sidecar dir; test glob |

## Testing Strategy

Fixture-driven and hermetic — no network, no credentials, no tracker.

**The invariant that matters most is totality.** Every one of the 20 kinds must render in all four
outputs. A renderer with a silent `default:` case would emit a checklist that quietly omits an action
the human must perform, which is precisely the invisible-drift failure this whole sequence exists to
remove. The test enumerates kinds from the schema, not from a hand-written list, so adding a kind
without a renderer fails rather than passing vacuously.

| Case | Asserted |
| ---- | -------- |
| Every kind × every renderer | Non-empty output; no placeholder left unsubstituted |
| Duplicate `id` (resume) | Rendered once |
| `dependsOn` chain | Dependant nested under its dependency, never before it |
| `satisfied: true` | Collapsed, not listed as outstanding |
| Expected moment, no record | Rendered `⚠️ UNRECORDED` |
| Any record | **No credential value in any output** — env var names only |
| Empty journal | No artifact written, no empty file committed |
| Malformed journal line | Skipped with a warning; the rest still render |
| A body containing backticks, `$(rm -rf /)`, a heredoc terminator and CRLF | Round-trips unchanged, and reaches the CLI via `--body-file` — **never** `--body "$(cat …)"` |
| A `retry_of` record (full-access failure) | Renders in its own section, distinct from policy deferrals |
| An `irreversible` record | The script emits a confirm gate, not a bare command |

**The credential test is the most important one in the sequence.** Feed argv containing
`--token abc123`, an `Authorization: Bearer …` header, a `-u user:app_password` pair and an expanded
`$JIRA_API_TOKEN`; assert no secret-shaped string from a fixture list survives into any of the four
outputs, while variable *names* do. Committing the script and JSON is only defensible because this
invariant holds and is watched failing.

**Mutation-prove each** — watch it fail:

| Mutation | Expected red |
| -------- | ------------ |
| Add a kind with no renderer | The totality test |
| Drop `id` dedup | The resume case |
| Sort by `order` only, ignoring `dependsOn` | The chain case |
| Inline a token in the script renderer | The credential test |
| Swallow a malformed line silently | The malformed case |
| Render `satisfied` records as outstanding | The collapse case |

## Success Criteria

- [ ] One writer; shell and node produce byte-identical records for the same input
- [ ] All 20 kinds render in all four outputs, enumerated from the schema
- [ ] Dedup on `id` makes rendering idempotent across a resume
- [ ] `dependsOn` respected — no action listed before its prerequisite
- [ ] No credential value in any output
- [ ] Empty journal writes nothing
- [ ] `handover` registered in file-naming and pipeline-artifacts
- [ ] Every invariant watched failing under mutation
- [ ] `npm test`, `npm run validate:all` green; `npm run bundle` run and references committed

## Risk Assessment

**Low** — new files plus one template section. Nothing on an existing execution path.

| Risk | Why | Mitigation |
| ---- | --- | ---------- |
| **The schema proves wrong once interception lands** | It is designed against a catalogue, not against running code | `v: 1` is explicit; tasks 53–56 land per-system and may bump it. Fixture-driven tests make a schema change cheap to re-prove |
| **Fixtures get gitignored** | Blanket rules have swallowed test fixtures in this repo before | Explicit negation in `.gitignore` plus a test that fails if the fixture directory is empty |
| **A renderer silently omits a kind** | A `default:` case is the natural way to write it | The totality test enumerates from the schema; mutation-proven |

## Rollback Plan

`git revert <sha>` then `npm run bundle`. Nothing calls these modules yet.

## References

- [task.51](../task.51.access-mode-config-and-resolver/task.51.access-mode-config-and-resolver.md) — provides `ACCESS_TRACKER`
- [`shared/resources/jira-stage.js`](../../../shared/resources/jira-stage.js) `--print-plan` — the credential-free emitter this imitates
- [`skills/correct-course/SKILL.md`](../../../skills/correct-course/SKILL.md) — the existing paste-ready-proposal idiom

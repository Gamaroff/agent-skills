---
id: task.52
title: '[Task 52] One deferred-mutation record, four renderings of it'
type: task
description: 'Defines the record a skill writes when it cannot perform a tracker mutation, the append-only journal it lands in, and the four renderers that turn a journal into a committed markdown checklist, a runnable shell script, a JSON sidecar and an inline summary. Nothing intercepts anything yet — this task is driven entirely by fixture journals, which is the point: the output contract is fixed and mutation-proven before any call site depends on it. The organising idea for the whole sequence is that manual, command, read-only and approve are four renderings of one record, not four features.'
tags: [restricted-access, schema, renderers, handover]
category: infrastructure
status: ready-for-review
priority: High
risk_level: medium
created: 2026-08-17
updated: 2026-08-18
estimated_effort_hours: 14
github_issue: 230
---

# [Task 52] One deferred-mutation record, four renderings of it

**Task File**: [task.52.deferred-mutation-record-and-renderers.md](./task.52.deferred-mutation-record-and-renderers.md)

**GitHub Issue**: [#230](https://github.com/Gamaroff/agent-skills/issues/230)

**Review**: ✅ All critical + important recommendations from `task.52.review.1.deferred-mutation-record-and-renderers.md` implemented 2026-08-18

## Overview

Second of seven tasks (51–57). Establishes the data contract for restricted tracker access and every
output built from it, driven by fixture journals so the contract can be finished and proven before a
single call site is changed.

Depends on [task.51](../task.51.access-mode-config-and-resolver/task.51.access-mode-config-and-resolver.md) and [task.60](../task.60.config-reader-strict-subset/task.60.config-reader-strict-subset.md)
for `ACCESS_TRACKER`.

## Motivation

The surface is 20 tracker mutation kinds and five access models. Treated naively that is 100
behaviours. The organising idea that makes it tractable:

> **One planned-mutation record. The access mode decides only who executes it and how it is
> rendered.**

**Renderer means output format.** There are four: a committed markdown checklist, a runnable shell
script, a JSON sidecar and an inline run-end summary. Each is a pure function of the record list, so
each can be tested without a network, a credential or a tracker.

**Access mode means which renderers run.** `manual` selects the checklist, `command` the script,
`approve` a consent manifest built from both, `read-only` the JSON plus a verification pass. A mode
is a selection over renderers, never a renderer itself — the two axes are kept distinct throughout
this document, and the test matrix is *20 kinds × 4 output formats*.

Fixing this first is what stops the sequence fragmenting. If interception landed first, every
subsequent task would negotiate with a schema that was already load-bearing in three places.

## Technical Background

**Current.** A tracker mutation is performed inline, wherever the pipeline happens to need it: a REST
call inside `jira-sync.js`, a board write in `gh-stage.js`, a `gh issue comment` in a SKILL.md step.
Each site assumes it holds a credential and may write. There is no shared notion of *a mutation that
was wanted but not performed* — when one fails, it becomes a warning line in the implementation
report's Issues Log and nothing downstream can act on it. Task 51 landed `ACCESS_TRACKER`
(`full | read-only | approve | command | manual`) and task 60 made its resolution trustworthy, but
nothing reads it yet, so every mode still behaves as `full`.

**Target.** A mutation that cannot (or should not) be performed becomes a **record** appended to a
per-run NDJSON journal. The journal is the only new concept; everything a human or a script needs
afterwards is a rendering of it. Because the record carries both a `manual` and a `command` shape,
the emitting call site — the only place that knows a field's human-facing name — fixes the wording
once, and no renderer has to reverse-engineer intent from an argv array.

**What this task changes, and what it does not.** It adds three new modules, one schema document, two
registry rows and one implementation-report section — none of which anything calls yet. It also gates
the two stage CLIs, which *are* on live pipeline paths; that gate is inert while `ACCESS_TRACKER` is
`full`, which is every consumer today. Real interception at the other call sites is tasks 53–56.

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

## Breaking Changes

**None for existing consumers.** The three new modules have no callers. The two stage-CLI gates are
the only change on an existing execution path, and they are guarded on `ACCESS_TRACKER != "full"` —
which no consumer sets today, because task 51 shipped the key and nothing has read it since.

| Change | Who sees it | Migration |
| ------ | ----------- | --------- |
| `jira-stage.js` / `gh-stage.js` may exit 0 with `{"transitioned": false, "reason": "deferred"}` | Only a consumer who has set `access.tracker` to a non-`full` value | None. `reason` is an existing field on both CLIs' JSON output and callers already branch on it; `deferred` joins `no-credentials`, `stage-disabled`, `not-on-board` and the rest |
| New `## Tracker Actions Required` section in both implementation-report templates | Every pipeline run | None. The section renders empty and is omitted when the journal has no records |

## Decisions

| Decision | Why |
| -------- | --- |
| **Append-only NDJSON at `.claude/state/tracker-actions.jsonl`** | Appends under 4 KiB are atomic on POSIX, so a node script and a shell function writing in the same step cannot corrupt each other. A crash mid-run leaves a readable prefix. `.claude/state/` is already the home of the pipeline lock and the two orchestrator state files, and is gitignored. |
| **Per-worktree by construction** | `develop-batch` gives each item its own worktree and therefore its own `.claude/`. Journals are isolated with no locking, and each renders into its own work-item directory. |
| **A content-hash `id` on every record** | The pipelines are resumable with per-step artifact verification, so a re-run re-emits records. Deduplicating on `sha1(system\|kind\|target\|fingerprint)` makes the renderer idempotent for free. |
| **`dependsOn` edges, not just an ordinal** | Some actions only make sense after another (post a comment on an issue that must first exist). The renderer nests them so the human reads a sequence, not a pile. |
| **One writer: `defer-mutation.js`** | Callable as a CLI (for shell chokepoints) and as a `require` (for node). Exactly one place knows the schema, or the shell and node layers drift. CommonJS, because the same file must be `node defer-mutation.js …` from a shell chokepoint and `require`d from node in the same process — an ESM module cannot be both without a wrapper. (`bundle_skill.py` follows either: `JS_SIBLING_RE` matches `require("./x.js")` and `JS_ESM_SIBLING_RE` matches the `import` form, so bundling does not decide this.) |
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
2. **`shared/resources/handover-render.js`** — `--journal <path> --out <path>
   [--format md|sh|json|summary]`. Four formats, not three: `summary` is the inline run-end block the
   orchestrator prints and pastes into the implementation report, and it is a first-class renderer
   subject to the same totality test as the other three. Dedups by `id`, topologically sorts on
   `dependsOn` then `order`, groups by system, collapses `satisfied: true` into an "already correct"
   section, flags expected-but-absent moments as `⚠️ UNRECORDED`.
3. **`shared/resources/tracker-access-record.md`** — the canonical schema doc, bundled into skills.
   **It is the roster, not just the shape**: it enumerates all 20 `kind` values with their
   per-system breakdown (Jira: 6 REST mutators + 2 sprint + 1 transition; GitHub: the board, issue
   and comment kinds), each with its `consequence` class and whether it `produces` a symbol. The
   totality test enumerates from this file, so the list existing here is what makes the test
   non-vacuous. Any count that disagrees with the catalogue is a bug in one of the two.
4. **The four renderers**, as pure functions of the record list — one per output format (§Motivation).
5. **`docs/standards/file-naming.md`** — register `handover` as an artifact kind, in **both** the
   story and task tables, as one kind with three committed extensions:
   `task.{n}.handover.{n}.{name}.{md,sh,json}` and
   `story.{epic}.{story}.handover.{n}.{name}.{md,sh,json}`, co-located in the work-item directory.
   (The `summary` format is inline output, not a file, so it takes no pattern.)
6. **`docs/reference/pipeline-artifacts.md`** — add the row.
7. **`shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`** — add
   `## Tracker Actions Required` to both implementation-report templates, beside the Issues Log.
8. **`shared/resources/jira-stage.js`** — gate the transition behind `ACCESS_TRACKER`. Under any
   non-`full` mode, do not call the tracker: emit a record via `defer-mutation.js` and return the
   existing JSON shape with `{"transitioned": false, "reason": "deferred"}`, exit 0. The plan is
   already computed credential-free by `--print-plan`, so the record's `desired`, `target` and
   `intent` come from code that exists.
9. **`shared/resources/gh-stage.js`** — the same gate, emitting the board-field-set kind. `reason`
   joins the CLI's existing vocabulary (`no-credentials`, `stage-disabled`, `not-on-board`,
   `already`, `would-regress`), so no caller needs a new branch to stay correct.
10. **`.gitignore`** — the fixture journals only. Blanket ignore rules have silently swallowed test
    fixtures in this repo before. Verified: a plain `.jsonl` under `shared/resources/tests/fixtures/`
    is **not** ignored today, so a negation is needed only if a fixture path itself contains an
    ignored segment (e.g. a fixture mirroring `.claude/state/tracker-actions.jsonl`). If one is
    added it **must go at the end of the file**, directory negation before file negation — the
    constraint is documented in `.gitignore` itself, and a negation placed anywhere earlier silently
    does nothing.
11. **Tests** — new fixtures and `shared/resources/tests/handover-render.test.mjs`. No `package.json`
    change is needed: the `test` script's glob already covers `shared/resources/tests/*.test.mjs`.
    Only a `.sh`-style test would need adding to the hand-maintained list.

## Files Summary

| File | Change |
| ---- | ------ |
| `shared/resources/defer-mutation.js` | **new** — the single writer (CLI + `require`), roster-validated, redacting |
| `shared/resources/handover-render.js` | **new** — the four renderers (`md`, `sh`, `json`, `summary`) |
| `shared/resources/tracker-access-record.md` | **new** — canonical schema **and** the 20-kind roster |
| `shared/resources/tests/handover-render.test.mjs` | **new** — 33 tests: totality, dedup, ordering, credentials, empty, malformed, hostile bodies |
| `shared/resources/tests/stage-access-gate.test.mjs` | **new** — 18 tests: the gate, under every mode, both CLIs |
| `shared/resources/tests/fixtures/handover-*.jsonl` | **new** — 8 fixture journals + 1 expected-body file |
| `shared/resources/jira-stage.js` | **gate** — `ACCESS_TRACKER != full` → record + `reason: "deferred"`, exit 0, before `getAuth()` |
| `shared/resources/gh-stage.js` | **gate** — same, before `ghAvailable()`; `--probe-board` and `--dry-run` exempt |
| `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` | `## Tracker Actions Required` added to **both** report templates |
| `docs/standards/file-naming.md` | `handover` registered in the story **and** task tables, three extensions |
| `docs/reference/pipeline-artifacts.md` | artifact row, directory tree, and the documents table (seven → eight) |
| `shared/resources/resolve-platform.sh` | **not planned** — the `NOT YET ENFORCED` notice became false; now says `PARTIALLY ENFORCED` and names what still writes |
| `shared/resources/tracker-access.test.sh` | assertion updated to the qualified wording (§17) |
| `shared/resources/tests/gh-stage.test.mjs` | dependency tripwire updated for the new `defer-mutation.js` sibling, plus a check that it stays dependency-free |
| `.gitignore` | **no change needed** — verified `tests/fixtures/*.jsonl` is not ignored and `.claude/state/*.jsonl` is; locked in by test §15 |
| `skills/*/references/*` | regenerated by `npm run bundle` (66 files; 9 skills receive `defer-mutation.js` + the roster doc) |

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
| `jira-stage.js` / `gh-stage.js` under each non-`full` mode | Exit 0, `{"transitioned": false, "reason": "deferred"}`, exactly one record appended, **no network call attempted** |
| `jira-stage.js` / `gh-stage.js` under `full` | Byte-identical behaviour to today — the gate is inert, no record appended |

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
| Gate on truthiness instead of `!= "full"` | The `full`-mode inertness case |
| Let a gated stage CLI reach the network before deferring | The no-network-call assertion |

## Success Criteria

- [x] One writer; shell and node produce byte-identical records for the same input
- [x] All 20 kinds enumerated in `tracker-access-record.md`, and each renders in all four output
      formats (`md`, `sh`, `json`, `summary`) — the test reads the roster from the schema, not a list
- [x] Dedup on `id` makes rendering idempotent across a resume
- [x] `dependsOn` respected — no action listed before its prerequisite
- [x] No credential value in any output
- [x] Empty journal writes nothing
- [x] `handover` registered in file-naming (**story and task tables**, three extensions) and in
      pipeline-artifacts
- [x] `jira-stage.js` and `gh-stage.js` decline under every non-`full` mode: exit 0, `reason:
      "deferred"`, a record appended, no network call attempted — and are byte-identically unchanged
      under `full`
- [x] Every invariant watched failing under mutation
- [x] `npm test`, `npm run validate:all` green; `npm run bundle` run and references committed

## Risk Assessment

**Medium.** The three new modules, the schema doc and the template section are risk-free — nothing
calls them. The two stage-CLI gates are not: `jira-stage.js` and `gh-stage.js` are invoked from
`develop-pipeline-step-0-resolve-and-prepare`, `-step-4-create-pr`, `-step-5-6-qa-loop`,
`-step-7-finalise`, `develop-pipeline-lite-mode` and `jira-transition-protocol`, and from the
`develop-story`, `develop-task`, `develop-bug`, `develop-next`, `develop-batch`, `finalise` and
`scaffold-tracker-workflow` skills. A gate that misfires stops every pipeline moving cards.

| Risk | Why | Mitigation |
| ---- | --- | ---------- |
| **The gate fires for a `full`-access consumer** | This is the blast radius: a wrong comparison silently stops board moves across seven skills and six pipeline steps | Gate on `ACCESS_TRACKER != "full"` explicitly, never on truthiness or emptiness — an unset variable must read as `full`. A dedicated test asserts byte-identical `full`-mode behaviour, and a mutation flipping the comparison is watched failing. Task 51's resolver, hardened by task 60, is what makes the value trustworthy |
| **A gated CLI reaches the network before deferring** | The defer branch is easy to place after the credential/board resolution that already exists | The gate is the first check after arg parsing, ahead of any credential read. Asserted by a test that fails if any network call is attempted under a non-`full` mode |
| **The schema proves wrong once interception lands** | It is designed against a catalogue, not against running code | `v: 1` is explicit; tasks 53–56 land per-system and may bump it. Fixture-driven tests make a schema change cheap to re-prove |
| **Fixtures get gitignored** | Blanket rules have swallowed test fixtures in this repo before | Verified today: `shared/resources/tests/fixtures/*.jsonl` is not ignored. If a fixture path needs an ignored segment, the negation goes at the **end** of `.gitignore`, directory before file — plus a test that fails if the fixture directory is empty |
| **A renderer silently omits a kind** | A `default:` case is the natural way to write it | The totality test enumerates from the schema roster; mutation-proven |

## Rollback Plan

Two halves, with different revert profiles.

**The new modules, schema doc, registry rows and template section** — `git revert <sha>` then
`npm run bundle`. Nothing calls them, so the revert is inert.

**The two stage-CLI gates** — these are on live pipeline paths, so the revert must restore their
pre-gate behaviour exactly. Verification after reverting: run `jira-stage.js --print-plan` and
`gh-stage.js` against a fixture board and confirm the JSON output carries no `deferred` reason and
the transition path is taken as before. Both files are otherwise untouched by this task, so a
file-level `git checkout <base> -- shared/resources/{jira,gh}-stage.js` is a safe narrower rollback
if only the gate is at fault.

**Rollback trigger**: any pipeline run under `ACCESS_TRACKER=full` (i.e. every consumer today) that
fails to move a card and reports `reason: "deferred"`.

## Progress Tracking

- [x] 1. `shared/resources/defer-mutation.js` — the single writer (CLI + `require`), schema-validated
- [x] 2. `shared/resources/handover-render.js` — four formats (`md`, `sh`, `json`, `summary`)
- [x] 3. `shared/resources/tracker-access-record.md` — schema **and** the 20-kind roster
- [x] 4. The four renderers, as pure functions of the record list
- [x] 5. `docs/standards/file-naming.md` — `handover` registered in the story and task tables
- [x] 6. `docs/reference/pipeline-artifacts.md` — row added
- [x] 7. `develop-pipeline-step-0-resolve-and-prepare.md` — `## Tracker Actions Required` in both templates
- [x] 8. `jira-stage.js` gated — `reason: "deferred"`, exit 0, no network call
- [x] 9. `gh-stage.js` gated — same
- [x] 10. `.gitignore` — fixture negation if needed, at end of file
- [x] 11. Tests + fixtures; every invariant watched failing under mutation
- [x] 12. `npm test`, `npm run validate:all` green; `npm run bundle` run and references committed

## Implementation Notes

**Completed**: 2026-08-18. Status → Ready for Review.

### What was built

The organising idea held: one record, four renderings, and the access mode selecting among them.
Nothing needed a per-mode code path.

- **The roster is the schema doc, not a JS constant.** `defer-mutation.js` parses the 20 kinds out of
  `tracker-access-record.md` at load time and refuses an unknown `kind`. `handover-render.js` keeps a
  `KIND_PRESENTATION` entry per kind and *raises* on a miss rather than falling back to generic
  wording. The totality test enumerates from the doc, so a kind added without a renderer fails —
  watched failing.
- **Bodies travel as base64, not a heredoc.** A heredoc mangles a missing trailing newline and CRLF,
  and any chosen terminator can be collided with. Base64 round-trips bytes exactly and removes every
  quoting hazard; the command stays in plain sight above it, which is what "reviewable" requires.
  Proven byte-exact against a fixture carrying backticks, `$(rm -rf /)`, two would-be terminators,
  a CRLF and no trailing newline.
- **Redaction runs twice** — at write time and again at render time. The second pass is not
  redundant: the `.sh` and `.json` artifacts are committed, and a journal can be hand-edited between
  the two. Both layers are separately mutation-proven.
- **Gate placement is the load-bearing detail.** In `jira-stage.js` the gate sits immediately before
  `lib.getAuth()`; in `gh-stage.js` immediately before `ghAvailable()`. Everything above those lines
  is local file reading. Both CLIs take an injectable transport, so the no-network assertion is made
  with a *throwing* stub rather than counted after the fact.

### Decisions taken during implementation

| Decision | Why |
| -------- | --- |
| `ACCESS_TRACKER` is read from the **environment only**; unset reads as `full` | `resolve-platform.sh` is the single resolver — it merges config and env most-restrictive-wins, validates, and exports. Re-deriving that in node would fork the resolution path, which is the silent-escalation class task.60 closed. An unrecognised value is *refused* (exit 2) rather than defaulted, so a typo cannot escalate into a write. |
| Reads are never gated — `--probe-board`, `--check`, `--init-workflow`, `--print-plan`, `--dry-run` all still work | Every non-`full` mode restricts *writes*. Gating reads would break `scaffold-tracker-workflow` and the Jira MCP fallback for exactly the consumers who most need them. |
| A disabled moment under a restricted mode reports `stage-disabled`, not `deferred` | There was never a mutation to defer; reporting one would invent work for the operator. |
| `create` kinds are classed `irreversible` | Not literally un-undoable, but not idempotent: a second run makes a duplicate, and issue numbers are never reused. That is what should earn a confirm gate. |
| `resolve-platform.sh`'s enforcement notice was corrected (not in the original plan) | It said `NOT YET ENFORCED — this run still writes to the tracker normally`. After this task that is false for board and status moves and true for everything else. A notice that overstates coverage is worse than none, so it now says `PARTIALLY ENFORCED` and names what still writes. Tasks 53–56 should keep it accurate as each lands. |

### Mutation ledger — every invariant watched failing

| Mutation | Expected red | Observed |
| -------- | ------------ | -------- |
| Add a kind to the roster with no renderer | totality | ✅ 3 tests red |
| Drop the `id` dedup | resume | ✅ §2 red |
| Sort by `order` only, ignoring `dependsOn` | chain | ✅ §3 red (2 tests) |
| Skip re-redaction in `render()` | credential | ✅ §6 red |
| Drop the writer's redaction entirely | credential | ✅ §6 red |
| Swallow a malformed line silently | malformed | ✅ §8 red |
| Render `satisfied` records as outstanding | collapse | ✅ §4 red |
| Drop the confirm gate on irreversible actions | confirm gate | ✅ §11 red |
| Inline the body as a `--body-file` argument value | hostile body | ✅ §9 red *(after strengthening — see below)* |
| Gate on truthiness instead of `!= "full"` (both CLIs) | `full`-mode inertness | ✅ 3 tests red |
| Reach the network before deferring (both CLIs) | no-network | ✅ 10 tests red *(after strengthening — see below)* |

**Two mutations initially survived, and both exposed real test weaknesses rather than safe code:**

1. *Inlining the body* passed because §9 asserted only that `--body-file` appeared, never that the
   body was absent from the command line — the same injection hazard wearing the right flag name.
   §9 now asserts the raw body does not appear in any `run_step`/`confirm_step` line.
2. *Reaching the network in `jira-stage`* passed because the test environment had no `JIRA_*`
   credentials, so `getAuth()` short-circuited and no network call was reachable either way. The
   suite now runs the restricted-mode cases **with** a full credential set, and adds a counterpart
   test asserting a `full` run *does* reach the transport — so the four no-network assertions are
   measuring the gate rather than an empty environment.

### Verification

| Check | Result |
| ----- | ------ |
| `npm test` | **1338 passed, 0 failed** (node) + **379 passed, 0 failed** (`tracker-access.test.sh`) |
| `npm run validate:all` | **115 passed, 0 failed** |
| `npm run bundle` | clean; 9 skills receive `defer-mutation.js` **and** `tracker-access-record.md`; no test suite leaked into any skill |
| Bundled-layout runtime check | `loadRoster()` returns 20 from `skills/develop-task/references/` |
| Generated script | `bash -n` clean; dry run plans all 20 actions and changes nothing |
| End-to-end (`access.tracker: read-only`) | both CLIs exit 0 with `reason: "deferred"`, no network reached, run-end checklist names each card and its target column |
| Resume idempotency (real CLI path) | 3 identical invocations → 3 journal lines → **1** rendered action |

### Deferred work

None within scope. Out-of-scope by design and unchanged: interception at the other call sites
(tasks 53–56), populating `observed`/`satisfied` (task.57), and `--apply` execution of an approved
record.


## QA Testing Results

**QA Status**: PASS (cycle 2)
**QA Engineer**: QA Engineer
**Testing Date**: 2026-08-18
**Quality Score**: 92/100 (cycle 1: 25/100)
**Gate Decision**: PASS

### QA Reports
- **Cycle 2 (final)**: [task.52.qa.2.*.md](./task.52.qa.2.deferred-mutation-record-and-renderers.md) · [gate.2 — PASS 92/100](./task.52.gate.2.deferred-mutation-record-and-renderers.yml)
- **Cycle 1**: [task.52.qa.1.*.md](./task.52.qa.1.deferred-mutation-record-and-renderers.md) · [gate.1 — FAIL 25/100](./task.52.gate.1.deferred-mutation-record-and-renderers.yml)

### Test Coverage Summary
- **Tests Executed**: 1746 (1352 node + 394 shell) — all green; 14 new regressions, every one mutation-proven
- **Phases Verified**: 12/12
- **Critical Issues**: 0 open (cycle 1 raised 7 HIGH + 9 MEDIUM; all HIGH and 6 MEDIUM fixed, 2 MEDIUM deferred as out-of-scope interception work)
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings — all fixed in cycle 1

Seven HIGH defects, all independently reproduced, concentrated in the record-identity and rendering
layers. The access gates — the only part touching live pipeline paths — passed every check.

| Bug | Issue |
| --- | ----- |
| [BUG-3](./task.52.bug.3.generated-script-command-execution.md) | Arbitrary command execution from the committed script, during the **dry run** |
| [BUG-4](./task.52.bug.4.record-identity-collision.md) | Two comments to one issue collapse to one id — a record is **silently dropped** |
| [BUG-5](./task.52.bug.5.redaction-not-idempotent.md) | Double redaction turns `$GITHUB_TOKEN` into `«redacted»` — the committed script cannot run |
| [BUG-2](./task.52.bug.2.redaction-corrupts-legitimate-content.md) | The 32+ char rule eats commit SHAs, base64 blobs, URLs and branch names |
| [BUG-6](./task.52.bug.6.flag-masking-too-broad.md) | `git push -u origin` → `git push -u «redacted»` |
| [BUG-1](./task.52.bug.1.md-renderer-duplicates-dependants.md) | The checklist lists every `dependsOn` target twice |

All seven sat in code the test suite covered, and the suite caught none of them — each fixture
happened not to contain the triggering shape.

### Fixes (qa-fix cycle 1)

All 7 HIGH and 6 of the 9 MEDIUM issues are fixed, each with a regression test **watched failing**.
`npm test` 1351 node + 394 shell green; `validate:all` 115 green; bundle clean.

| Fix | Change |
| --- | ------ |
| BUG-3 | Every string interpolated into the generated script goes through `shQuote`; comments go through a new `shComment` that strips newlines and control characters |
| BUG-4 | `computeId` folds `intent` and `command.stdin` into the fingerprint — **`intent` is now part of identity and must be deterministic**, documented in the schema |
| BUG-5 | `maskOrName` treats `$IDENT` and `«redacted»` as terminal, so the write+render double pass is idempotent |
| BUG-2 | The 32+ char heuristic applies only in credential-bearing positions; the env sweep and prefixed shapes still apply everywhere |
| BUG-6 | `-u`/`-p` are credential flags only for clients that use them that way |
| BUG-1 / BUG-13 | The markdown renderer tracks emitted ids in a local `Set` — fixes both the duplication and the record mutation |
| BUG-8 | The confirm gate skips when `/dev/tty` is unavailable instead of aborting under `set -e` |
| BUG-9 | `parseRoster` throws on an unparsable kind row and asserts `EXPECTED_KIND_COUNT` |
| BUG-10 | Both CLIs capture `ACCESS_TRACKER` before `loadDotEnv`, so a dot-env file cannot restrict behind the resolver's back |
| BUG-11 / BUG-12 | Object keys redacted; URL userinfo masked; env floor lowered with a digit heuristic; `GIT_AUTHOR_*` excluded |
| BUG-14 | Both gates pass the repo root as `cwd` so the journal lands where the renderer reads it |

**Deferred, with rationale** — BUG-7 (wire `handover-render` into a run-end pipeline step and ship it
in the bundle) and BUG-15 (read the board before deferring so `satisfied`/`would-regress` are honoured)
are both *interception* work: they change what call sites do, which is explicitly this task's Out of
Scope and the subject of tasks 53–57. Recorded in the gate as future actions.


## Change Log

| Date | Version | Description | Author |
| ---- | ------- | ----------- | ------ |
| 2026-08-17 | 1.0 | Initial draft | create-task |
| 2026-08-18 | 1.1 | Review cycle 1 (6/10, NEEDS REVISION) — 2 critical + 7 important fixed: in-scope stage-CLI gating added to plan/files/tests/criteria; `.tracker-actions/` gitignore contradiction removed; risk raised to Medium with blast radius and rollback split; 20-kind roster made an explicit deliverable; renderer axis defined as output format and a fourth (`summary`) added; `handover` filename pattern specified for story and task tables; Technical Background, Breaking Changes, Progress Tracking and Change Log added; stale CommonJS/bundler rationale corrected; effort 8h → 14h | review-task |
| 2026-08-18 |  | Status → ready-for-development | review-task |
| 2026-08-18 |  | Implemented — 24 files (3 new modules, 1 schema doc, 2 test suites, 9 fixtures, 2 gated CLIs, 5 docs), 51 new tests, all 11 invariants mutation-proven | develop |
| 2026-08-18 |  | QA cycle 1 — gate FAIL (25/100), 7 HIGH + 9 MEDIUM findings | qa-task |
| 2026-08-18 |  | QA findings fixed — 7 HIGH + 6 MEDIUM, 1 iteration, each regression mutation-proven | qa-fix |
| 2026-08-18 |  | QA cycle 2 — gate PASS (92/100), all HIGH closed, 2 MEDIUM deferred as out-of-scope | qa-task |

## References

- [task.51](../task.51.access-mode-config-and-resolver/task.51.access-mode-config-and-resolver.md) — provides `ACCESS_TRACKER`
- [task.60](../task.60.config-reader-strict-subset/task.60.config-reader-strict-subset.md) — **prerequisite.** Closes the silent-escalation class in the config reader's no-dependency tier, where a declared restriction can still resolve to `full` at exit 0. Harmless while nothing reads `ACCESS_TRACKER`; this task is the first that does, so a wrong value here becomes an unintended tracker write
- [`shared/resources/jira-stage.js`](../../../shared/resources/jira-stage.js) `--print-plan` — the credential-free emitter this imitates
- [`skills/correct-course/SKILL.md`](../../../skills/correct-course/SKILL.md) — the existing paste-ready-proposal idiom

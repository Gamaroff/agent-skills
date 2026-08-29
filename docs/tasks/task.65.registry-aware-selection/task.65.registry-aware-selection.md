---
id: task.65
title: '[Task 65] Derive the selection frontier from the registries, so an outstanding bug or task cannot be invisible to /develop-next'
type: task
description: 'select-next.mjs reads one hand-maintained roadmap. Work filed anywhere else — a bug in the bug registry, a task in the task registry — is invisible to it, so the loop reports roadmap-complete while real work is outstanding. This adds the registries as a fallback frontier, consulted only when no phase holds an actionable row, so the operator never has to remember to transcribe a row.'
tags: [develop-next, selection, registries, backlog, automation]
category: infrastructure
status: ready-for-review
priority: High
risk_level: medium
created: 2026-08-29
updated: 2026-08-29
github_issue: 280
estimated_effort_hours: 10
---

# [Task 65] Derive the selection frontier from the registries, so an outstanding bug or task cannot be invisible to `/develop-next`

**Task File**: [task.65.registry-aware-selection.md](./task.65.registry-aware-selection.md)

**Status**: Ready for Review

**Review**: ✅ All review recommendations from `task.65.review.1.registry-aware-selection.md` implemented 2026-08-29

**GitHub Issue**: [#280](https://github.com/Gamaroff/agent-skills/issues/280)

**Depends on**: none

## Overview

`select-next.mjs` reads exactly one file: the completion roadmap. Everything else the repo tracks —
`docs/bugs/bug-registry.md`, `docs/tasks/task-registry.md` — is invisible to it. A bug can be filed,
registered and never picked up, and the loop will cheerfully report `roadmap-complete`.

This adds the registries as a **fallback frontier**: consulted only when no phase holds an actionable
row, so explicit roadmap sequencing still wins whenever it exists.

## Motivation

### The roadmap is a hand-maintained index of things that already have indexes

Filing a bug already appends a row to `bug-registry.md`. Creating a task already appends a row to
`task-registry.md`. Both registries carry status, and both are enforced as the single source of truth
for their numbering. The roadmap then asks a human to transcribe a subset of that into a third place,
and the loop only ever reads the third place.

That is one manual step between "work exists" and "the loop can see it", and it is a step nobody
notices skipping — because the failure mode is silence. The loop says `roadmap-complete` and stops,
which is indistinguishable from there genuinely being nothing to do.

### This has already happened

`bug.2.unbounded-test-concurrency` was filed 2026-08-29, registered `status: new`, Major/High, with a
documented root cause and a measured fix. The selector reported `roadmap-complete` that same day,
because no roadmap row named it. Two prior merges (T62, T63) had already proceeded over the red suite
that bug describes — each recording in the roadmap Change Log that it "needs its own bug", the same
manual step failing twice in the other direction.

**The remedy proves the point rather than retiring it.** The bug only became visible to the loop when a
human added a standing `PHASE 4 — maintenance backlog` to the roadmap and hand-wrote a `B2` row into
it; the bug has since been fixed and closed (PR #279). So the failure did not end because the gap
closed — it ended because someone performed, once, by hand, exactly the transcription step this task
removes. Phase 4's own preamble says as much: it exists only until selection reads the registries
directly. Retiring that phase is therefore in scope here (Phase 6), not a follow-up: while it holds any
actionable row, roadmap precedence means the fallback can never fire.

### Silence is the wrong default for an unattended loop

`/loop /develop-next` and `loop-supervisor` both terminate on `roadmap-complete`. An overnight run that
stops at 23:05 because the frontier was empty — while a Major bug sits registered and unreferenced — has
not finished the work; it has failed to find it, and reported success.

## Technical Background

### Where selection happens today

`skills/develop-next/scripts/select-next.mjs` parses the roadmap into phases, scans rows top-to-bottom,
and returns `selected` / `stop` / `halt`. The row grammar, marker vocabulary and algorithm are specified
in `skills/develop-next/references/roadmap-selection.md`.

Relevant existing behaviour, which this task must not disturb:

- Phases are hard boundaries; earliest phase with an actionable row wins.
- `manual` / `🚧` stop the loop; `⏭️`/`SKIP` are stepped past; `/create-*` rows are a `planning-gap` stop.
- The command must be one of `/develop-story`, `/develop-task`, `/develop-bug`.
- A path resolves when its filename stem starts `story.`, `task.` or `bug.` — **general bugs already
  resolve** (`bug.{N}.{name}.md`), so no path-resolution work is needed for the bug case.

### What the registries already carry

| Registry | Row shape | Status column |
| --- | --- | --- |
| `docs/bugs/bug-registry.md` | `\| N \| [title](bug.N.name/bug.N.name.md) \| status \| severity \| priority \| created \| area \|` | bug lifecycle |
| `docs/tasks/task-registry.md` | `\| N \| [title](task.N.name/task.N.name.md) \| status \| category \| priority \| created \| issue \| deps \|` | document lifecycle |

Both already contain everything selection needs: a path, a status, and a priority.

### The two status vocabularies are different, and that is load-bearing

The eligibility rule cannot be written once for both, because bugs and tasks do not share a lifecycle
— [`bug-documents.md`](../../standards/bug-documents.md) says so explicitly:

| Kind | Lifecycle | Eligible for the fallback |
| --- | --- | --- |
| General bug | `new → in-progress → ready-for-qa → closed \| reopened` | `new`, `reopened` |
| Task | `draft → planned → ready-for-development → in-progress → ready-for-review → accepted \| cancelled` | `ready-for-development` and later, excluding `accepted` / `cancelled` |

Neither vocabulary contains `deferred`, `wont-fix` or any other park value — which is why the opt-out
below reuses the *start* of each ladder rather than inventing a new terminal state.

### The registries already drift from their documents

Rows 62, 63 and 64 of `task-registry.md` read `draft` today while all three documents read `accepted`.
That is not hypothetical drift used to justify a guard — it is the current state of the file, and
without the frontmatter check of Phase 2 those three shipped tasks would be the fallback's first three
candidates. Phase 6 corrects the rows; Phase 2 makes correctness of the rows unnecessary for safety.

## Scope

**In scope**

- A **fallback frontier** in `select-next.mjs`: when no phase yields a selection or a stop, read the
  registries and emit the highest-ranked outstanding item.
- Bug rows whose **document** status is `new` or `reopened` → `/develop-bug <path>`.
- Task rows whose **document** status is `ready-for-development` or `in-progress`
  → `/develop-task <path>`. (`ready-for-review` was in this set as submitted and was **removed** in QA
  cycle 1 — `develop-task` Phase 0c HALTs on it, so the frontier would have nominated work the
  dispatcher refuses. See `task.65.bug.1.*`. The governing rule is that the floor must be a **subset**
  of the statuses the dispatching pipeline accepts.)
- A deterministic ordering rule for the fallback set, and a documented tie-break.
- The **opt-out**, which is the eligibility rule above rather than a new marker: an item is opted in by
  being promoted up its own ladder, and a `draft` / `planned` task is out of the frontier by definition.
- `item.source` on every selection, surfaced in the run report (`--dry-run` prints it because it prints
  the item) and in `--lint`, which additionally names every registry row it deliberately passed over.
- Retiring the roadmap's standing `PHASE 4 — maintenance backlog`, whose stated purpose this replaces,
  and correcting the three drifted task-registry rows it would otherwise nominate.
- Spec update in `references/roadmap-selection.md`; `npm run bundle`.

**Out of scope**

- **Changing roadmap precedence.** An authored phase always wins. The registries are a floor, not a
  re-ranking of deliberate human sequencing.
- Story selection from any registry — stories live under a PRD/epic tree with no registry of their own.
- Writing back to the roadmap **at selection time**. The fallback is read-only; it never transcribes a
  row. (Phase 6's one-off archival of Phase 4 is an authoring edit made by this task, not a runtime
  behaviour the selector acquires.)
- Pre-empting any stop other than `roadmap-complete`. `human-gated`, `planning-gap`,
  `manual-checkpoint` and `phase-blocked` all still stop the loop — the fallback replaces silence, never
  a deliberate halt.
- Extending either status lifecycle. No `deferred` value is added to `document-status-lifecycle.md` or
  `bug-documents.md`.
- `--batch`. Registry items carry no `touches:`, so they cannot be conflict-checked and must never
  enter a parallel batch. Batch behaviour is unchanged.

## Breaking Changes

**One, and it is the point of the task**: a repo whose roadmap is exhausted but whose registries hold
outstanding rows will now select instead of reporting `roadmap-complete`. That is the intended
behaviour change, and it is why the opt-out below is in scope rather than deferred — without it, every
speculative task doc ever filed becomes an unattended work item.

## Decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Precedence | Roadmap phases first; registries only when no phase is actionable | Explicit human sequencing must never be overridden by a registry's incidental order |
| Bug vs task order in the fallback | Bugs before tasks | A registered bug is known-broken behaviour; a draft task is intended work. Broken first |
| Ordering within bugs | `severity` then `priority` then ascending number | Deterministic, and both columns already exist |
| Ordering within tasks | `priority` then ascending number | Same |
| Opt-out mechanism | **The eligibility floor is the opt-out**: a task must be at `ready-for-development` or later; a bug must be `new` or `reopened` | Neither lifecycle has a park value, and adding one would touch two standards docs and every reader of those enums. Promotion up the existing ladder is already the act of saying "this is ready to be worked" — a `draft` task is a speculative filing and is out by construction. Nothing new to remember, nothing new to write |
| Which stops the fallback pre-empts | `roadmap-complete` only | The other four stops are deliberate: a human gate must never be scanned past, and `phase-blocked` is an operator decision by design. The fallback exists to replace *silence*, and `roadmap-complete` is the only silent stop |
| `item.source` scope | Emitted on **every** selection, roadmap included | A field present only sometimes is an implicit contract — a consumer must infer "absent means roadmap". Uniform shape, one code path, and the run report can always state provenance |
| Roadmap Phase 4 | Archived by this task | Its preamble names T65 as the reason it exists. Left standing, its rows suppress the fallback by precedence, so the feature would merge and change nothing observable |
| Batch participation | Excluded | No `touches:` data, so write-disjointness cannot be established |
| Roadmap write-back | None | A read-only fallback cannot corrupt the roadmap, and keeps this reversible |

## Implementation Plan

### Phase 1 — parse the registries

Two small pure parsers over the markdown tables, returning `{n, title, path, status, priority, severity}`.
Tolerate a missing registry (a consumer repo may have neither) by returning an empty list — **never** throw.

### Phase 2 — the fallback frontier

Slot it at exactly one place: the `roadmap-complete` return at the end of `selectNext`. Every earlier
`return {status:"stop"}` — `human-gated`, `planning-gap`, `manual-checkpoint`, `phase-blocked` — is
left untouched and still returns first, so the fallback is reachable only when the roadmap is silent
rather than merely stuck.

Verify the referenced document exists and read its frontmatter `status` — the registry row is an index,
not the source of truth, and the two demonstrably drift (rows 62–64 today). **Frontmatter decides; the
registry row only nominates.** A document that is missing, unparseable, or outside its kind's eligible
set is not a candidate whatever the registry says, and each rejection is recorded with its reason so
`--lint` can print it.

### Phase 3 — the opt-out

There is no new marker to implement: the eligibility floor from Phase 2 *is* the opt-out. What this
phase owes is that it cannot fail silently — the failure this task exists to remove must not be
reintroduced by its own escape hatch. So `--lint` gains a `registryFrontier` section listing **every**
registry row the fallback considered and passed over, each with its reason (`document accepted`,
`status draft — below the eligibility floor`, `document missing`, `malformed row`). An item can be out
of the frontier, but it cannot be invisible.

### Phase 4 — reporting

`item.source` (`roadmap` | `bug-registry` | `task-registry`) on **every** selection, including roadmap
ones, surfaced in the run report so an operator reading a night's log can tell where each item came
from. `--dry-run` inherits this for free — it prints the item. Note that
`evals/develop-next/protocol/skill-shape.test.mjs` asserts the closed set of stop reasons handled in
`SKILL.md`; this task adds no new stop reason, and that assertion must still hold unchanged.

### Phase 5 — spec, tests and gates

Update `references/roadmap-selection.md` (it is the spec; the script is the implementation, and they
must not drift) and the `develop-next` SKILL.md Step 1 note. Unit tests in `evals/develop-next/unit/`.
`npm run bundle`, `npm test`, `npm run format:check`.

### Phase 6 — make the feature reachable

Two authoring edits, without which the code above changes nothing observable in this repo:

1. **Archive roadmap `PHASE 4`.** Move its rows to `roadmap-history.md` once `T65` is ticked and replace
   the phase with a short note in the roadmap's "How to use" section explaining that the frontier now
   falls through to the registries. While Phase 4 holds an actionable row, precedence guarantees the
   fallback never fires.
2. **Correct `task-registry.md` rows 62, 63 and 64** from `draft` to `accepted`, matching their
   documents. Do this *after* the Phase 2 drift test is green, so the test is written against the drift
   rather than around it.

## Files Summary

**Modified**

| File | Change |
| --- | --- |
| `skills/develop-next/scripts/select-next.mjs` | Registry parsers; fallback frontier; `source` field |
| `skills/develop-next/references/roadmap-selection.md` | Spec the fallback, its precedence and the opt-out |
| `skills/develop-next/SKILL.md` | Step 1 — note that a selection may come from a registry |
| `evals/develop-next/unit/select-next.test.mjs` | Parser + precedence + eligibility + drift + lint tests |
| ~~`evals/develop-next/unit/fixtures/`~~ | **Not needed** — the registry pair is built inline by `bugRegistry()`/`taskRegistry()` helpers in the test file. A fixture file would have to be paired with a *second* fixture tree of documents for the frontmatter check, since the drift guard reads the document rather than the row; the inline builders keep the row and its document status side by side in the test that asserts them |
| `docs/development/project-completion-roadmap.md` | Archive `PHASE 4`; note the registry fall-through in "How to use" |
| `docs/development/roadmap-history.md` | Receive the archived Phase 4 rows |
| `docs/tasks/task-registry.md` | Correct rows 62–64 (`draft` → `accepted`) |

## Testing Strategy

- **Unit.** Registry parsing: a malformed row, an absent registry, an empty registry, a header-only
  registry, and a registry whose rows are all terminal.
- **Precedence.** An actionable roadmap row and an outstanding bug present together → the roadmap row
  wins, and the registry files are never read (assert via a read counter or an unreadable fixture path).
- **Stop precedence.** One test per stop reason (`human-gated`, `planning-gap`, `manual-checkpoint`,
  `phase-blocked`): the stop is returned and no registry item is selected. This is SC9 and it is the
  guard against the fallback quietly becoming a way to scan past a human gate.
- **Drift, both directions.** Registry `new` + document `closed` → not selected. Registry `closed` +
  document `new` → selected (frontmatter wins even when the registry is *more* restrictive).
- **Eligibility floor.** A `draft` task and a `planned` task are never selected; a
  `ready-for-development` task is. An `in-progress` bug is never selected; a `reopened` bug is.
- **Ordering.** Two bugs of differing severity → the higher first; equal severity → higher priority;
  equal both → lower number. Deterministic under input reordering.
- **Lint.** Every passed-over row appears in `registryFrontier` with a reason; the count matches the
  number of non-selected rows.
- **Regression.** Every existing selection test passes with only the `source` field added — asserted by
  the SC1 diff test rather than by re-baselining expectations.

## Success Criteria

1. With an actionable roadmap row present, the selected `id`, `command`, `commandArg`, `rationale` and
   `skipped[]` are identical to today's. The added `item.source: "roadmap"` is the **only** difference in
   the JSON, and a test asserts that by diffing the two objects with `source` deleted.
2. With the roadmap exhausted and an outstanding bug registered, the bug is selected with
   `command: /develop-bug`, a resolvable path, and `source: "bug-registry"`.
3. With the roadmap exhausted and an outstanding task registered, the task is selected with
   `command: /develop-task` and `source: "task-registry"`.
4. Bugs outrank tasks; within each, ordering is deterministic and documented.
5. A registry row is never selected when its document's frontmatter puts it outside the eligible set —
   a task at `accepted`, `cancelled`, `draft`, `planned` or `ready-for-review`; a bug at `in-progress`,
   `ready-for-qa` or `closed` — **whatever the registry row says**. Asserted in both directions
   (registry stale-open with a terminal document, and registry stale-closed with an open document).
   The eligible set is additionally constrained to be a **subset of the statuses the dispatching
   pipeline accepts**, asserted by parsing `develop-task`'s and `develop-bug`'s own status tables so
   the constraint re-checks itself if either changes.
6. Every registry row the fallback passed over appears in `--lint` output with its reason. No row is
   both ineligible and unlisted.
7. A missing, empty or malformed registry degrades to today's behaviour rather than halting; a single
   malformed row does not suppress the well-formed rows around it.
8. `roadmap-complete` is returned only when the roadmap **and** both registries are genuinely exhausted.
9. The four other stop reasons are unreachable-past: given a `manual` frontier, a `/create-*` row, an
   unrunnable row, or a same-phase deadlock, the selector returns that stop and the registries are not
   read at all.
10. `--batch` behaviour is unchanged; registry items never enter a batch.
11. Roadmap `PHASE 4` is archived and `task-registry.md` rows 62–64 read `accepted`, so a fresh
    `/develop-next --dry-run` in this repo selects from a registry rather than reporting a stop.
12. Spec and script agree; `npm test`, `npm run bundle` and `npm run format:check` green.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Auto-selecting a speculative task doc nobody meant to schedule | **High** | High | The eligibility floor excludes `draft` and `planned` outright, so a filed-but-unscheduled task is out by construction rather than by remembering to mark it (SC5, eligibility-floor tests) |
| The fallback becomes a way to scan past a human gate | Low | **High** | Only `roadmap-complete` is pre-empted; SC9 asserts one test per remaining stop reason. This is the risk that would be hardest to detect in production — the loop would look like it was working |
| Registry drifts from document status and stale work is re-selected | **High** | Medium | Drift is present today (rows 62–64), not hypothetical. Frontmatter is authoritative; SC5 asserts both directions |
| Precedence inverted, so a registry item pre-empts authored sequencing | Low | High | SC1 asserts the selection is identical modulo the `source` field whenever the roadmap is actionable, and the precedence test makes the registry files unreadable to prove they are not consulted |
| A consumer repo with no registries breaks | Medium | High | Absent registry returns empty, never throws (SC7) |
| Registry items leak into `--batch` without `touches:` data | Medium | Medium | Explicitly out of scope and asserted by SC10 |
| The feature merges but changes nothing, because Phase 4 still holds rows | Medium | Medium | Phase 6 archives it; SC11 requires a live `--dry-run` in this repo to select from a registry |

## Rollback Plan

The fallback is additive and gated on the single `roadmap-complete` return. Reverting the
`select-next.mjs` change restores today's behaviour exactly; no data migration.

The one thing a revert does **not** undo is Phase 6: the roadmap would be left with no Phase 4 and no
fallback, so an empty frontier reverts to reporting `roadmap-complete`. That is a documentation
restore, not a data loss — re-add the phase from `roadmap-history.md` — but it must be done in the same
revert, so record it here rather than discovering it at 2am. The corrected registry rows 62–64 are
correct independently of this task and should **not** be reverted.

## Progress Tracking

- [x] 1. Registry parsers
- [x] 2. Fallback frontier at the `roadmap-complete` return, with document-status verification
- [x] 3. Eligibility floor + `registryFrontier` in `--lint`
- [x] 4. `source` on every selection, in the JSON and the run report
- [x] 5. Spec + SKILL.md update, `npm run bundle`
- [x] 6. Archive roadmap `PHASE 4`; correct `task-registry.md` rows 62–64 (**and 56–58**, see below)
- [x] 7. Tests, format, suite

## Implementation Record

**Started**: 2026-08-29 · **Completed**: 2026-08-29 · **Branch**: `feature/task.65.registry-aware-selection`

### Approach

`selectNext(model, opts)` gained one optional key: `opts.loadRegistries`, a **lazy** loader invoked at
exactly one line — the terminal `roadmap-complete` return. Every earlier `return {status:"stop"}` is
untouched, which is the whole safety argument: the fallback replaces *silence*, never a deliberate
halt. Injection (rather than reading the filesystem inside `selectNext`) is what makes the SC9 guard
assertable in its strong form — the tests assert the loader was not merely ignored but **never
called**, which a filesystem read could not express.

Pure, exported, unit-testable pieces:

| Export | Role |
| --- | --- |
| `parseRegistry(text, kind, registryPath)` | Markdown-table parser; returns `{rows, malformed}`, never throws. Skips fenced blocks, resolves hrefs relative to the registry file |
| `parseFrontmatterStatus(text)` | Reads one `status:` scalar from a leading `---` block; tolerates quotes and trailing comments |
| `registryFrontier(registries, {evaluateAll})` | Ranks, checks eligibility against the **document**, returns `{selected, passedOver, candidates}` |
| `BUG_ELIGIBLE_STATUSES` / `TASK_ELIGIBLE_STATUSES` | The eligibility floor, exported so the sets are readable rather than buried |

`item.source` is set in `pickItem` for roadmap selections and in `registryFrontier` for registry ones,
so it is present on every selection with no caller-side branching.

### Testing

**27 new unit tests** (72 → 99 in `evals/develop-next/unit/select-next.test.mjs`), one per success
criterion plus the parser and ordering edges. `evals/develop-next/protocol/skill-shape.test.mjs`
stayed green **unchanged** at 19 passing, as the task required — no stop reason was added.

**Ten mutations, each reddening exactly the tests that name it** — a passing test is not evidence
until the behaviour it claims to hold has been removed and the test has gone red:

| # | Mutation | Reddened |
| --- | --- | --- |
| 1 | Fallback consulted before the phase loop (scans past every stop) | all 4 SC9 tests + SC1 |
| 2 | Registry status decides instead of frontmatter | 4 (both drift directions) |
| 3 | Tasks ordered before bugs | SC4 precedence |
| 4 | Eligibility floor widened to `draft`/`planned` | SC5 floor, SC6 listing |
| 5 | Fenced-block skip removed | SC7 fenced sample |
| 6 | A malformed row aborts the whole registry | 2 SC7 tolerance tests |
| 7 | `source` dropped from roadmap selections | 5 |
| 8 | Number tie-break dropped | 2 SC4 ordering tests |
| 9 | Href not resolved against the registry dir | 14 |
| 10 | `--lint` short-circuits like selection | SC6 visibility |

### Deviations from the plan, and why

1. **No registry fixture file.** The Files Summary anticipated
   `evals/develop-next/unit/fixtures/` gaining a registry pair. It did not: because the drift guard
   reads the *document*, a registry fixture is only half a fixture — it would need a parallel tree of
   task/bug documents to supply the frontmatter the check actually consults. Inline builders
   (`bugRegistry()`, `taskRegistry()`, `bugRow()`, `taskRow()`) keep a row and its document status in
   the same three lines as the assertion about them, which is what the drift tests are *about*.
2. **Phase 6 corrected six rows, not three.** The plan named rows 62–64. The same check that found
   those found three more: 56 and 57 read `planned` and 58 read `ready-for-review`, while all three
   documents read `accepted`. Correcting them was a strictly-smaller edit than leaving rows known to be
   wrong. It changes nothing about safety — all six were already excluded from the frontier by the
   document check, not by the row being right — which is itself the point of SC5.
3. **`PHASE 4` archived with `T65` unticked.** The plan said "once `T65` is ticked". T65 is this task,
   and it is in flight while the archival happens, so ticking its own row would attest to a merge that
   has not occurred. The row is archived unticked with the reason recorded in `roadmap-history.md`;
   acceptance goes in the roadmap Change Log on merge. Nothing depends on `T65`, so no `deps:`
   resolution is affected.

### SC11 — verified live

With `PHASE 4` archived, `node skills/develop-next/scripts/select-next.mjs` in this repo returns
`status: "selected"`, `source: "task-registry"`, `id: "T65"` — a real selection where the same command
returned `roadmap-complete` before. It selects **this task**, which is the honest state of the repo:
after the 6-row correction, T65 is the only work item whose document sits inside an eligibility floor.
`--lint` lists all 67 registry rows, 66 passed over each with a reason, and zero documents missing.

### Known limitation

`--lint` reads one document per registry row (67 in this repo, ~40 ms). That is linear in registry
size and only ever paid by `--lint` and by a fallback that actually fires; selection short-circuits at
the first eligible row. No caching was added — it would be a second source of truth about a file the
selector already reads once.

## QA Testing Results

**QA Status**: FAIL
**QA Engineer**: QA Engineer
**Testing Date**: 2026-08-29
**QA Cycle**: 1
**Quality Score**: 60/100
**Gate Decision**: FAIL

### QA Report

- **Full Report**: [task.65.qa.1.registry-aware-selection.md](./task.65.qa.1.registry-aware-selection.md)
- **Gate File**: [task.65.gate.1.registry-aware-selection.yml](./task.65.gate.1.registry-aware-selection.yml)
- **Bug Report**: [task.65.bug.1.ready-for-review-selected-but-undispatchable.md](./task.65.bug.1.ready-for-review-selected-but-undispatchable.md)

### Test Coverage Summary

- **Tests Executed**: 1924 (1923 pass, 1 pre-existing skip, 0 fail); 99 unit tests for this change
- **Phases Verified**: 7/7 checked — 5 PASS, 1 CONCERNS, 1 FAIL
- **Success Criteria**: 12 assessed — 10 PASS, 1 CONCERNS (SC4), 1 FAIL (SC6)
- **Independent mutations run by QA**: 6 devised, 6 reddened
- **NFR Status**: Security: PASS, Performance: CONCERNS, Reliability: PASS, Maintainability: CONCERNS

### Key Findings

**HIGH (1) — blocking.** `TASK_ELIGIBLE_STATUSES` includes `ready-for-review`, but `develop-task`
Phase 0c **HALTs** on exactly that status, so the frontier nominates work the dispatcher it names is
contractually guaranteed to refuse. `ready-for-review` is the normal state of any task between
development and merge, so this is common rather than exceptional; an unattended `/develop-next` loop
stops there and, with the run-state file left in place, cannot self-recover. It reproduces live on
this branch — the selector picks `T65`, whose own document is `ready-for-review`.

This is a **specification** defect the implementation faithfully carried out: the floor was reasoned
from `document-status-lifecycle.md` without checking it against the dispatcher's accepted set, and
Step 2's review missed it the same way. The bug half got it right — `{new, reopened}` is a strict
subset of what `develop-bug` accepts — which is what makes the task half read as an oversight rather
than a decision.

**MEDIUM (2).** A registry row with a non-numeric `#` cell is silently invisible — neither parsed nor
listed in `--lint`, contradicting SC6 in the exact place a human typo lands (M2). Column positions are
assumed with no header validation, so a consumer registry with a different column order silently
breaks the ordering SC4 claims is deterministic (M3).

**LOW (1).** `parseRegistry` takes the first `.md` href where the sibling `workItemPath()` takes the
first *work-item* href (L4).

**What held up.** QA did not trust the Implementation Record's mutation table; it devised six of its
own and every one reddened. The decisive probe called the registry loader eagerly and *discarded* the
result — leaving every outcome correct and changing only whether the loader was invoked — and all four
stop-precedence tests went red. Those assertions are genuinely about the call. Roadmap selection and
`--batch` output are byte-identical to `origin/develop` across all 11 fixtures. All three recorded
deviations from the plan were assessed and found justified.

---

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-08-29 | 1.0     | Initial draft | create-task |
| 2026-08-29 | 1.1 | Review passed (9/10) — resolved the undecided opt-out (eligibility floor on document status, no new lifecycle value), fixed the SC1-vs-`item.source` contradiction, pinned the fallback to `roadmap-complete` only so the four other stops still stop, split the bug and task status vocabularies (they are different lifecycles), added Phase 6 to archive roadmap `PHASE 4` and correct the live registry drift in rows 62–64, and linked GitHub issue #280 | review-task |
| 2026-08-29 |  | Status → ready-for-development | review-task |
| 2026-08-29 |  | Implemented — 8 files, 27 new tests (72 → 99 unit); 10 mutations each reddening the tests that name it; roadmap `PHASE 4` retired and 6 drifted registry rows corrected | develop |
| 2026-08-29 |  | QA cycle 1 gate FAIL (60/100) — 1 HIGH, 2 MEDIUM, 1 LOW; eligibility floor admits `ready-for-review`, which `develop-task` HALTs on | qa-task |
| 2026-08-29 |  | QA findings fixed — 4 of 4 (1 HIGH, 2 MEDIUM, 1 LOW), 1 iteration; eligibility floor narrowed and the floor ⊆ dispatcher rule made executable; tests 99 → 113 | qa-fix |

## References

- [`skills/develop-next/references/roadmap-selection.md`](../../../skills/develop-next/references/roadmap-selection.md) — the selection spec this task extends
- [`skills/develop-next/scripts/select-next.mjs`](../../../skills/develop-next/scripts/select-next.mjs) — the authoritative implementation
- [`docs/standards/bug-registry.md`](../../standards/bug-registry.md) — general-bug numbering and the registry contract
- [`docs/standards/task-registry.md`](../../standards/task-registry.md) — task numbering and the registry contract
- [`docs/bugs/bug.2.unbounded-test-concurrency/bug.2.unbounded-test-concurrency.md`](../../bugs/bug.2.unbounded-test-concurrency/bug.2.unbounded-test-concurrency.md) — the bug that was invisible to selection and motivated this task
- [`docs/development/project-completion-roadmap.md`](../../development/project-completion-roadmap.md) — its standing `PHASE 4 — maintenance backlog`, which this task retires (Phase 6)
- [`docs/standards/bug-documents.md`](../../standards/bug-documents.md) — the bug lifecycle, deliberately distinct from the document lifecycle
- [`shared/resources/document-status-lifecycle.md`](../../../shared/resources/document-status-lifecycle.md) — the task/story/epic document lifecycle the eligibility floor reads

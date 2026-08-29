---
id: task.65
title: '[Task 65] Derive the selection frontier from the registries, so an outstanding bug or task cannot be invisible to /develop-next'
type: task
description: 'select-next.mjs reads one hand-maintained roadmap. Work filed anywhere else — a bug in the bug registry, a task in the task registry — is invisible to it, so the loop reports roadmap-complete while real work is outstanding. This adds the registries as a fallback frontier, consulted only when no phase holds an actionable row, so the operator never has to remember to transcribe a row.'
tags: [develop-next, selection, registries, backlog, automation]
category: infrastructure
status: draft
priority: High
risk_level: medium
created: 2026-08-29
updated: 2026-08-29
estimated_effort_hours: 8
---

# [Task 65] Derive the selection frontier from the registries, so an outstanding bug or task cannot be invisible to `/develop-next`

**Task File**: [task.65.registry-aware-selection.md](./task.65.registry-aware-selection.md)

**Status**: Draft

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

`bug.2.unbounded-test-concurrency` was filed 2026-08-29. It is registered, `status: new`, Major/High,
with a documented root cause and a measured fix. The selector reported `roadmap-complete` on the same
day, because no roadmap row named it. Two prior merges (T62, T63) had already proceeded over the red
suite that bug describes — each recording in the roadmap Change Log that it "needs its own bug", which
is the same manual step failing twice in the other direction.

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

| Registry | Row shape | Status column values seen |
| --- | --- | --- |
| `docs/bugs/bug-registry.md` | `\| N \| [title](bug.N.name/bug.N.name.md) \| status \| severity \| priority \| created \| area \|` | `new`, `closed` |
| `docs/tasks/task-registry.md` | `\| N \| [title](task.N.name/task.N.name.md) \| status \| category \| priority \| created \| issue \| deps \|` | `draft`, `accepted` |

Both already contain everything selection needs: a path, a status, and a priority.

## Scope

**In scope**

- A **fallback frontier** in `select-next.mjs`: when no phase yields a selection or a stop, read the
  registries and emit the highest-ranked outstanding item.
- Bug rows whose status is not `closed` → `/develop-bug <path>`.
- Task rows whose **document** status is not `accepted` / `cancelled` → `/develop-task <path>`.
- A deterministic ordering rule for the fallback set, and a documented tie-break.
- An explicit **opt-out** so a filed-but-deliberately-unscheduled item is not auto-selected.
- `--dry-run` / `--lint` reporting that says *which source* an item came from.
- Spec update in `references/roadmap-selection.md`; `npm run bundle`.

**Out of scope**

- **Changing roadmap precedence.** An authored phase always wins. The registries are a floor, not a
  re-ranking of deliberate human sequencing.
- Story selection from any registry — stories live under a PRD/epic tree with no registry of their own.
- Writing back to the roadmap. The fallback is read-only; it does not transcribe rows.
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
| Opt-out mechanism | A status value the registry already supports, plus an explicit `deferred` marker | Reuse the existing status column rather than inventing a parallel annotation |
| Batch participation | Excluded | No `touches:` data, so write-disjointness cannot be established |
| Roadmap write-back | None | A read-only fallback cannot corrupt the roadmap, and keeps this reversible |

## Implementation Plan

### Phase 1 — parse the registries

Two small pure parsers over the markdown tables, returning `{n, title, path, status, priority, severity}`.
Tolerate a missing registry (a consumer repo may have neither) by returning an empty list — **never** throw.

### Phase 2 — the fallback frontier

Slot it after phase exhaustion and before the `roadmap-complete` stop. Verify the referenced document
exists and read its frontmatter `status` — the registry row is an index, not the source of truth, and
the two can drift. A row whose document is already `accepted` is not a candidate whatever the registry says.

### Phase 3 — the opt-out

Decide and implement the marker that keeps a filed item out of the unattended frontier, and make an
opted-out item visible in `--lint` output so it cannot be silently forgotten — the failure this task
exists to remove must not be reintroduced by its own escape hatch.

### Phase 4 — reporting

`item.source` (`roadmap` | `bug-registry` | `task-registry`) in the JSON, surfaced in the run report so
an operator reading a night's log can tell where each item came from.

### Phase 5 — spec, tests and gates

Update `references/roadmap-selection.md` (it is the spec; the script is the implementation, and they
must not drift). Unit tests in `evals/develop-next/unit/`. `npm run bundle`, `npm test`,
`npm run format:check`.

## Files Summary

**Modified**

| File | Change |
| --- | --- |
| `skills/develop-next/scripts/select-next.mjs` | Registry parsers; fallback frontier; `source` field |
| `skills/develop-next/references/roadmap-selection.md` | Spec the fallback, its precedence and the opt-out |
| `skills/develop-next/SKILL.md` | Step 1 — note that a selection may come from a registry |
| `evals/develop-next/unit/*.test.mjs` | Parser + precedence + opt-out + drift tests |

## Testing Strategy

- **Unit.** Registry parsing, including a malformed row, an absent registry, and a registry with only closed rows.
- **Precedence.** An actionable roadmap row and an outstanding bug present together → the roadmap row wins.
- **Drift.** A registry row marked outstanding whose document is `accepted` → not selected.
- **Ordering.** Two bugs of differing severity → the higher one first, deterministically.
- **Opt-out.** An opted-out item is never selected and *is* reported by `--lint`.
- **Regression.** Every existing selection test still passes unchanged — this must be purely additive
  for any repo whose roadmap is non-empty.

## Success Criteria

1. With an actionable roadmap row present, selection is **byte-identical** to today's.
2. With the roadmap exhausted and an outstanding bug registered, the bug is selected with
   `command: /develop-bug` and a resolvable path.
3. With the roadmap exhausted and an outstanding task registered, the task is selected with
   `command: /develop-task`.
4. Bugs outrank tasks; within each, ordering is deterministic and documented.
5. A registry row whose document is already `accepted` is never selected.
6. An opted-out item is never selected, and appears in `--lint` output.
7. A missing or malformed registry degrades to today's behaviour rather than halting.
8. `roadmap-complete` is returned only when the roadmap **and** both registries are genuinely exhausted.
9. `--batch` behaviour is unchanged; registry items never enter a batch.
10. Spec and script agree; `npm test`, `npm run bundle` and `npm run format:check` green.

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| Auto-selecting a speculative task doc nobody meant to schedule | **High** | High | The opt-out is in scope, not deferred; Phase 3 exists for this alone |
| Registry drifts from document status and stale work is re-selected | Medium | Medium | Frontmatter is authoritative; the registry row only nominates (SC5) |
| Precedence inverted, so a registry item pre-empts authored sequencing | Low | High | SC1 asserts byte-identical behaviour whenever the roadmap is actionable |
| A consumer repo with no registries breaks | Medium | High | Absent registry returns empty, never throws (SC7) |
| Registry items leak into `--batch` without `touches:` data | Medium | Medium | Explicitly out of scope and asserted by SC9 |

## Rollback Plan

The fallback is additive and gated on "no phase actionable". Reverting the `select-next.mjs` change
restores today's behaviour exactly; no data migration, no roadmap edits to undo.

## Progress Tracking

- [ ] 1. Registry parsers
- [ ] 2. Fallback frontier with document-status verification
- [ ] 3. Opt-out, surfaced in `--lint`
- [ ] 4. `source` in the JSON and the run report
- [ ] 5. Spec update + `npm run bundle`
- [ ] 6. Tests, format, suite

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-08-29 | 1.0     | Initial draft | create-task |

## References

- [`skills/develop-next/references/roadmap-selection.md`](../../../skills/develop-next/references/roadmap-selection.md) — the selection spec this task extends
- [`skills/develop-next/scripts/select-next.mjs`](../../../skills/develop-next/scripts/select-next.mjs) — the authoritative implementation
- [`docs/standards/bug-registry.md`](../../standards/bug-registry.md) — general-bug numbering and the registry contract
- [`docs/standards/task-registry.md`](../../standards/task-registry.md) — task numbering and the registry contract
- [`docs/bugs/bug.2.unbounded-test-concurrency/bug.2.unbounded-test-concurrency.md`](../../bugs/bug.2.unbounded-test-concurrency/bug.2.unbounded-test-concurrency.md) — the bug that was invisible to selection and motivated this task

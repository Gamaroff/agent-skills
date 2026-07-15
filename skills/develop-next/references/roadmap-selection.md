---
name: roadmap-selection
description: Selection rules and marker vocabulary for picking the next actionable item from the project completion roadmap. Implemented by scripts/select-next.mjs; consumed by develop-next Step 1.
---

# Roadmap Selection Rules

Source document: the roadmap at `developNext.roadmapPath` (default `docs/development/project-completion-roadmap.md`). The roadmap's own "How to use this document" section is authoritative for intent; **the executable implementation of these rules is [`scripts/select-next.mjs`](../scripts/select-next.mjs)** — develop-next always runs the script rather than interpreting this document by eye. If script output and roadmap intent disagree, HALT and report the discrepancy rather than guessing; fix the roadmap (or the script) first.

**The roadmap is a living backlog.** Completed items are archived out (typically to `roadmap-history.md`), so a `deps:` entry that names no current row means *already shipped*, not *error*. Parsing is therefore deliberately **tolerant**: the only HALT is a roadmap that yields no parseable checkbox rows at all. Everything else questionable — an archived-out dep, a recap row restating a done id, an annotation checkbox with no id, dep prose the parser can't tie to an id — is a non-fatal **warning**, surfaced in `lint.warnings` but never blocking the loop. The one exception promoted to an error is *two live, unticked rows sharing an id* (a genuine "which do I build?" ambiguity). Lint the format with `select-next.mjs --lint`; warnings are advisory, a non-zero exit means a real error. This behaviour is validated against a real 370-line roadmap (`evals/develop-next/unit/fixtures/10-real-world.md`).

## Item ids

A row's id is the first token after the checkbox, once bold/emphasis is stripped:

| Form | Examples | Notes |
|---|---|---|
| Story / roadmap item | `20.4`, `5.1a`, `8.4-2`, `17.3-1`, `7.11-NFR2` | Digit-anchored, dot-separated, optional letter and `-suffix` |
| **Standalone task** | `T22`, `T26` | **`T` + digits.** Task and epic numbers can share this namespace (a Task 22 and an Epic 22 may both exist), so a bare `**22**` would be ambiguous — the prefix disambiguates. `T` must be followed by a digit, so prose like "Task 22" still reads as `22`. |

`T`-rows are **cross-cutting standalone tasks**, conventionally written inside their *consumer* epic's section for readability. They are **not stories of that epic**: they are excluded from the epic's completion set, so epic promotion never waits on them. They *are* globally indexed, so `deps: T22` resolves and blocks normally.

> A `T`-row with no `⏭️`/`manual` marker is an ordinary candidate and **will be auto-selected** when reached. If a task must only be picked up on an explicit decision (the "pick up against the first scheduled consumer" pattern), mark the row `⏭️ SKIP` and remove it at scheduling time — state the policy, don't rely on the row being unreachable.

## Marker vocabulary

| Marker | Meaning | Selection effect |
|---|---|---|
| `[ ]` / `[x]` | outstanding / accepted | Only `[ ]` rows are candidates; `[x]` satisfies deps |
| `deps:` | blocking prerequisites | Blocks only when a dep is an outstanding `[ ]` row (or an epic with outstanding rows). Deps that are ticked, marked *(shipped)*, or absent from the backlog (archived) count as satisfied. Accepts comma- and slash-separated lists (`8.3/8.4-1 *(shipped)*`) and bare epic refs (`Epic 8`). |
| *(shipped)* | dep already delivered | Counts as satisfied (with or without an item id) |
| `⏭️` / `SKIP` | deferred, **non-blocking** | Row is skipped like `manual`, **but does not stop or block the loop** — the phase is stepped past and later work proceeds. Overrides `manual`/`🚧` on the same row. **Note:** a SKIP'd id also counts as *done* for `deps:` purposes, so a dependent can build while the SKIP'd row is unbuilt. That is intended (a deferred block must not stall the loop), but it is surfaced as a lint warning — `X dep Y is ⏭️ SKIP — dep treated as satisfied`. |
| `gate:` | **ship/launch** gate | Does **not** block building — the gated feature may be developed and merged, it just must not be publicly exposed before the gate lands. Never blocks selection. |
| `flag:` | feature-flagged soft dep | Never blocks selection |
| `‖` | parallelizable sibling | Take siblings in listed order (v1 is sequential; worktree parallelism is out of scope) |
| `→` | sequential chain (epic header `Flow:` line) | Later chain members are ineligible until earlier ones are accepted, even if their `deps:` line looks satisfied |
| `manual` | operator action | **STOP** at the frontier — never auto-select, never scan past |
| `⛔ BLOCKED until X accepted` | explicit block annotation | Skip until the named items are `[x]` |
| `🚧` | legal/ops-gated | **STOP** at the frontier, same as `manual` |
| `/develop-story` / `/develop-task` | the command to dispatch | Runnable |
| `/create-story` / `/create-epic` | planning gap | **STOP** — authoring is interactive and its output needs human review; it is never run unattended |

Sections that are never candidates: any heading matching **Deferred**/**human-gated**, **Housekeeping**, or **Change Log** (rows there are ignored entirely, including for lint), and any `[x]` row.

## Algorithm

1. **Phase scope.** Phases are headings containing `PHASE`; a document with no phase headings is one implicit phase. Find the earliest phase containing at least one outstanding `[ ]` candidate row. Phases are hard boundaries — never select from a later phase while an earlier one has *actionable* items.
2. **Scan top-to-bottom** within the phase:
   - `manual` or `🚧` row → **STOP** (`human-gated`). A human gate is never scanned past — rows below it wait, even if eligible.
   - `/create-*` row → **STOP** (`planning-gap`).
   - `⏭️`/`SKIP` row → skip silently (non-blocking; never stops the loop).
   - `⛔`-blocked, flow-blocked, or dep-blocked row → skip, recording the reason.
   - Otherwise → **selected**. The command comes from the `/develop-story`/`/develop-task` token; the story/task path is taken from an inline path after the command *or* the row's `[story](…)`/`[task](…)` link. An eligible row that names no runnable command, or no resolvable path, is a **manual-checkpoint** stop (the loop pauses for the operator — e.g. a "run `/review-prd`" checkpoint), not a HALT.
3. **Phase progression.** If the scan exhausts a phase with outstanding rows but no selection or stop, every outstanding row is dep/flow/⛔-blocked. Advance to the next phase **only if every blocking item lives in a later phase** (a forward dep can never resolve before that later phase runs — e.g. a planning row that gates only a later item's *ship*). If any blocker is in the same or an earlier phase → **STOP** (`phase-blocked`); the operator decides.
4. **Epic order.** Within an execution phase, the section order encodes the ratified epic sequence — top-to-bottom scanning honours it automatically; do not re-derive or re-optimize the order.
5. **Record the rationale**: the script emits the selected item, its deps and their states, and every earlier `[ ]` row skipped with a one-line reason. Include all of it in the run report.

## Epic completion

`select-next.mjs --epic-status <n> --assume-ticked <id>` reports whether Epic *n*'s section is fully accepted, treating the just-merged (not yet ticked) item as done. develop-next Step 3 uses this so epic promotion never depends on merge/tick write ordering.

## Worked examples

Each rule above is pinned by an executable fixture in `evals/develop-next/unit/fixtures/` (same numbering as the tests in `evals/develop-next/unit/select-next.test.mjs`):

- **01** — shipped deps satisfy; first eligible row wins; a `manual` row at the frontier stops the run even when a later phase has eligible items.
- **02** — unsatisfied `deps:` skip a row; `gate:`/`flag:` never block.
- **03** — `Flow:` chains block later members; `‖` siblings go in listed order.
- **04** — `⛔ BLOCKED until X accepted` skips until X is ticked.
- **05** — a same-phase deadlock stops the run; the next phase is not raided.
- **06** — rows blocked only by later-phase items don't gate that later phase (forward-dep advance).
- **07** — Deferred/Housekeeping/Change Log rows are invisible to selection.
- **09** — `/create-*` rows stop the loop before any authoring happens.
- **10** — a real-world-shaped roadmap: `⏭️ SKIP` non-blocking defer, archived deps assumed shipped, epic-level deps, strikethrough recaps, `-NFR` suffixed ids, path-from-`[story]`-link, `🚧`-gated rows. Selects `12.1`; lints clean.
- **11** — `T`-prefixed standalone-task ids: a T-row parses as an id and is selectable; `deps: T22` blocks its dependent until ticked; a T-row never counts toward its host epic's completion; a `⏭️ SKIP`'d T-row is stepped past but warns any dependent that its dep is satisfied only by the SKIP; `deps: —` reads as no-deps. Selects `T22` before `28.2`.

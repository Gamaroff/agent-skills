---
id: task.141
title: "[Task 141] qa-next: accept an explicit registry item id, so a function can be re-tested on demand"
type: task
description: "Give /qa-next a positional `id` argument that runs the full UAT protocol against a named registry row regardless of its state, so a ❌ can be re-tested after the fix lands and a ✅ can be regression-tested when the code beneath it changes — with the run-file path, the accepted-row state rule and the bug-reuse rule made mechanical in uat-status.mjs rather than left to prose at the call site."
tags: [qa-next, uat, registry, re-run, regression, cli-arguments]
category: infrastructure
status: ready-for-review
priority: Medium
created: 2026-09-22
updated: 2026-09-23
assignee:
estimated_effort_hours: 8
risk_level: low
github_issue: 466
---

# Technical Task: `/qa-next <id>` — target a specific registry item

**Status:** Ready for Review

**Review**: ✅ All review recommendations from `task.141.review.1.qa-next-targeted-item.md` implemented 2026-09-22

**GitHub Issue**: [#466](https://github.com/Gamaroff/agent-skills/issues/466)

---

## 1. Overview

`/qa-next` has exactly one way to choose what it tests: `uat-status.mjs --next` returns the first
`⬜ untested` row in file order, and the skill runs that function. There is no way to say *which*
function to exercise. This task adds a positional argument — `/qa-next D.2` — that runs the full
protocol against a named row **regardless of that row's current state**, and makes the three
mechanisms a re-run needs (a fresh run-file path, a state rule for an already-accepted row, and
bug/finding reuse) properties of the tool rather than instructions in prose.

**Scope**: the `qa-next` skill — its argument grammar, its `uat-status.mjs` tool, its unit suite,
and the five documents that restate its behaviour. No consumer project is touched.

**Key deliverables**:

1. `uat-status.mjs --item <id>` (payload-identical to `--next`) and `--run-path <id>` (the next free
   run file), plus a `--clear-note` and one state-machine rule in `cmdSet`.
2. `SKILL.md` gains an `## Arguments` section and a *Select **or resolve*** Step 1, with re-run rules
   in Steps 0, 3, 4, 5 and 6.
3. A mutation-proved test group per new behaviour in the existing `evals/qa-next/unit/` suite.

**Expected outcome**: the owner can run `/qa-next D.2` as many times as it takes to get the function
right, and again months later when the code beneath it changes, without editing the registry by hand
and without silently destroying the previous run's evidence.

---

## 2. Motivation

### Current Problems

1. **A fixed `❌` cannot be re-tested.** The registry row carries the failure and the bug link; the
   bug is closed and the branch merged, but the only way to get `/qa-next` to look at that function
   again is `--set <id> untested` — which erases the `Last run` link and the failure history from the
   row — and then to wait for `--next` to walk back to it.
2. **A passing function can never be regression-tested.** Indexing UAT by user function is what makes
   "re-test D.2 after we changed the score pipeline" a one-line request; without targeting, that
   request has no command behind it and the per-function `runs/` directory only ever holds one file.
3. **A same-day re-run would destroy the earlier run's evidence.** Run files are
   `runs/<id>/<date>-<envLabel>.md`. The date and the env label are both fixed within a session, so a
   second run today writes the same path. It would take the first run's `## Findings` rows with it —
   and `--findings` is *derived* from those files, so the loss shows up as a shorter list nobody can
   tell is short.
4. **`--set <id> pass` would silently un-accept a `✅` row.** `cmdSet` maps a verdict straight onto the
   state cell. A regression sweep over fifty accepted functions would replace fifty owner signatures
   with fifty machine `🟡`s, and bury the one row that actually regressed in the noise.
5. **A stale bug link survives a verdict change.** `cmdSet` only writes `Notes / bug` when `--bug` or
   `--note` is given, so a row that goes `❌ → 🟡` keeps pointing at the bug it just disproved.

### Benefits

1. **The re-test loop closes.** Fix → `/qa-next D.2` → fix → `/qa-next D.2`, each run a new file in
   `runs/D.2/`, the function's whole history in one `ls`.
2. **Regression testing becomes a command**, not a registry edit: `/qa-next D.2` on a `✅` row updates
   `Last run` and leaves the acceptance alone unless it *fails*.
3. **The run-file path stops being the agent's to invent.** `--run-path <id>` is a chokepoint: a
   filename the tool computes cannot be a filename that collides.
4. **The accepted-row rule cannot be forgotten**, because it lives in the state machine and not in a
   sentence a future call site has to remember to obey.
5. **Repeat failures accumulate on one bug** rather than spawning bug #2, #3 and #4 against the same
   defect — which is the obvious first-order failure of any re-run feature.
6. **The argument grammar gets documented in the house style** the newest skills use, which has room
   for a positional argument; the current prose bullet does not.

---

## 3. Technical Background

### Current Architecture

Selection is a single pure function and a single command:

- `nextItem({ sections })` (`skills/qa-next/scripts/uat-status.mjs`, near the `--- findings ---`
  divider) returns the first row whose `stateKey` is `untested`, scanning sections in file order.
- `cmdNext(opts)` calls it, and when it returns nothing prints `null` and sets `process.exitCode = 3`.
  Otherwise it builds the payload the skill consumes: `id`, `function`, `what`, `entry`, `surface`,
  `surfaceTitle`, `stories[]`, `items`, `automatedBy`, `uatSpecs`, `checklists`.
- `updateRow(opts, id, mutate)` is the single writer: it locates the row, runs `mutate`, copies
  `state`/`run`/`notes` back into the cells, re-renders the line and writes the file.
- `cmdSet(opts)` validates the verdict, requires `--run` for `pass`/`fail`, `--bug` for `fail` and
  `--note` for `na`/`blocked`, then calls `updateRow`. It writes `Notes / bug` **only** when a `--bug`
  or `--note` was supplied.
- `cmdAccept(opts)` refuses anything that is not `🟡 pass` unless `--force`.
- `listRunFiles(runsDir)` walks `runs/` recursively and sorts by **basename first**, then full path,
  so "oldest run first" holds across function directories.
- `dispatch(opts)` is a first-match `if` ladder guarded by an `OPTIONS` allowlist; unknown flags die.
- `die(msg, code = 2)` **throws** a `UsageError` that `main` catches and turns into `process.exitCode`.
  It never calls `process.exit()`: an exit after a write truncates stdout at ~64KB on a pipe.

Exit codes today: `0` success · `1` `--check` found integrity errors · `2` usage · `3` `--next` found
nothing untested.

The skill side (`skills/qa-next/SKILL.md`) documents its one flag as a prose bullet under *When to Use
This Skill* — there is no `## Arguments` section and no positional argument anywhere in the file.

### Target Architecture

Selection becomes **selection or resolution**, over one shared description:

- A new `describeRow(opts, cfg, row)` builds the payload. `cmdNext` and a new `cmdItem` both call it,
  so the two commands cannot describe a row differently. Two payload builders would be two
  enumerations of "what the skill needs to know about a row", and enumerations drift in the worst
  direction — see `docs/reference/anti-patterns.md`.
- The payload gains `state`, `lastRun`, `priorRuns`, `notes` and `bug`, on **both** commands. Without
  the first three the skill cannot say "3rd run of this function, follows `2026-08-02-lan.md`" in the
  run file, which is the one thing a re-run's evidence has to state. Without the last two, Step 4's
  bug-reuse rule has no source and the skill would re-parse the registry by hand — a second reader of
  the file `--item` exists to remove. `bug` is the parsed link target (or `null`), read with the
  regex `checkRegistry` already owns, so there is one parser.
- `--run-path <id> [--env <label>]` computes and prints the next free run file, creating
  `runs/<id>/`. The sequence is zero-padded (`-02`, `-03`) **and `listRunFiles`' sort key normalises
  a missing sequence to `-01`**. Both halves are load-bearing and only the second is obvious in
  hindsight: padding fixes `-10` against `-2`, but run 1 carries no suffix at all and `.` sorts after
  `-`, so a basename sort puts the day's *first* run last —
  `["…-lan.md","…-lan-02.md"].sort()` yields `["…-lan-02.md","…-lan.md"]`. Normalising in the
  comparator also repairs the ordering of run files already on disk, which renaming would not.
- `cmdSet` gains one rule, stated over every verdict rather than one of them: **only a `fail` moves
  an accepted row.** `pass`, `blocked` and `na` against a row that is already `✅ accepted` leave the
  state cell alone and update only `Last run` and `Notes / bug`; `fail` sets `❌` from any prior
  state, including `✅`. Guarding `pass` alone would leave the same defect reachable through a
  different verdict — Step 2's two early exits write `blocked` and `na`, so a regression sweep in an
  environment that cannot supply a third-party credential would demote fifty owner signatures to
  `⏸`, which is Problem 4 arriving by another door.
- `--clear-note` writes `Notes / bug` empty, so a re-run can always write that cell. It is **refused
  on a kept `✅`** — verdict `pass`, state `accepted` — because that cell is where `--accept` stored
  the `accepted <date>` provenance, `checkRegistry` imposes no note requirement on an accepted row,
  and the loss would therefore be silent. There is no stale bug link to clear on a `✅` anyway.
- `--item` on an id with no row exits **4**, distinct from the usage family's 2.

### Important Clarifications

- **An explicit id ignores state on purpose.** `⬜ 🟡 ❌ ⏸ ✅ ➖` are all re-runnable. "First untested"
  is the *default* selection rule, not an eligibility gate.
- **Keeping `✅` on a pass is not the skill marking a row accepted.** The skill still never writes
  `✅`; it declines to *remove* one the owner wrote, on evidence that agrees with it.
- **`--accept`'s `--force` is unrelated** to any of this and is left alone — though the usage header
  documents `--force` only for `--init`, which this task corrects while it is in that block.

---

## 4. Scope

### In Scope

✅ **Argument grammar**: a positional `id` on `/qa-next`, documented in an `## Arguments` section.
✅ **Tool**: `--item`, `--run-path`, `--clear-note`, exit 4, the shared `describeRow`, the
only-a-`fail`-moves-`✅` rule in `cmdSet`, and `listRunFiles`' sequence-aware sort key.
✅ **Protocol**: Step 0 lock behaviour under an explicit id, Step 1 resolve, Step 3 run-path and
evidence-directory naming, Step 4 bug and finding reuse, Step 5 commit subject, Step 6 report, and the
stop-conditions and *never does* tables.
✅ **Run template**: a `Run` row in the header table naming which run this is and what it follows.
✅ **Tests**: one group per new behaviour in `evals/qa-next/unit/uat-status.test.mjs`, each
mutation-proved.
✅ **Doc sweep**: the skill README, `docs/reference/commands.md` (including its two stale
story-era sentences), `docs/reference/activation-phrases.md`, the generated catalog, and the changelog.

### Out of Scope

❌ **Batch or range targeting** — `--failing`, `D.*`, id lists. One invocation = one function is what
makes the state file a lock and the final report one line; a queue would change both, and the owner
chose the single-id form.
❌ **Re-running from the owner's side of the tool** — `uat-status.mjs` stays a registry reader/writer;
it does not execute UAT.
❌ **`uat-automate`** — unchanged; a targeted run still leaves an Automation candidate when there is no
lane spec.
❌ **The empty `skills/qa-next/references/` directory** — a separate question.

---

## 5. Breaking Changes

### Breaking Change 1: only a `fail` demotes an accepted row

**What Changed**: `uat-status.mjs --set <id> <verdict>` used to write the verdict's glyph into the
state cell from any prior state. A `pass`, `blocked` or `na` against an `✅ accepted` row now leaves
`✅` in place and updates only `Last run` and `Notes / bug`. A `fail` is unchanged and still
overrides. `--clear-note` is additionally refused on the kept-`✅` path, so the `accepted <date>`
provenance in `Notes / bug` cannot be erased by a passing re-run.

**Before**:

```console
$ uat-status.mjs --set D.2 pass --run runs/D.2/2026-09-22-lan.md
D.2: 🟡 pass · runs/D.2/2026-09-22-lan.md        # the owner's ✅ is gone
```

**After**:

```console
$ uat-status.mjs --set D.2 pass --run runs/D.2/2026-09-22-lan.md
D.2: ✅ accepted (kept) · runs/D.2/2026-09-22-lan.md
```

**Impact**: `qa-next`'s own Step 4 and Step 2 are the only callers in this repository. A consumer
that scripts `--set … pass|blocked|na` against accepted rows expecting a demotion would see the row
unchanged.

**Migration Path**: to move an accepted row deliberately, run
`uat-status.mjs --set <id> untested --note "<why>"` first (which clears `Last run` and the note),
then the verdict you want. A `fail` verdict is unaffected and still overrides `✅` directly.

### Breaking Change 2: none of the rest

`--next`, `--check`, `--coverage`, `--findings`, `--items`, `--automated`, `--accept` and `--init` keep
their arguments, their output and their exit codes. `/qa-next` with no argument behaves exactly as it
does today.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.141.plan.qa-next-targeted-item.md](task.141.plan.qa-next-targeted-item.md)

### Phase 1: Resolve a named row

**Risk Level**: Low

**Files**:

- `skills/qa-next/scripts/uat-status.mjs`

**Changes**:

- [x] Extract `describeRow(opts, cfg, row)` from `cmdNext`'s payload literal; `cmdNext` calls it.
- [x] Add `state`, `lastRun`, `priorRuns`, `notes` (raw cell) and `bug` (parsed link target, or
      `null`, via the regex `checkRegistry` already owns) to the payload, for both commands.
- [x] Add `itemById(reg, id)` and `cmdItem(opts)`; register `--item` in `OPTIONS` and in `dispatch`
      ahead of `--set`.
- [x] Exit 4 with a `no registry row` message when the id does not resolve; nothing is written.
- [x] Accept a lowercase id by upper-casing the surface letter before lookup.
- [x] Extend the usage header block, and correct `--accept`'s `--force` omission while in it.

**Dependencies**: none.

---

### Phase 2: A run file path the agent cannot collide

**Risk Level**: Low

**Files**:

- `skills/qa-next/scripts/uat-status.mjs`

**Changes**:

- [x] Add `runPathFor(existing, date, env)` — pure: given the run files already present, return
      `<date>-<env>.md`, else `<date>-<env>-02.md`, `-03`, zero-padded to two digits.
- [x] **Make `listRunFiles`' sort key sequence-aware** — normalise a basename with no sequence to
      `-01` before comparing, so the day's first run does not sort last. Padding alone does not
      give chronological order; this is the half that does, and it also fixes run files already
      written. Write the failing assertion first and watch it go red against today's comparator.
- [x] Add `cmdRunPath(opts)`: `mkdir -p runs/<id>/`, list it, print the path relative to the registry
      directory. `--env` defaults to `local`.
- [x] Register `--run-path` and `--env` in `OPTIONS` and `dispatch`.

**Dependencies**: Phase 1 (shares the id-resolution helper and its exit 4). `describeRow`'s
`priorRuns` reads through the same corrected comparator, so the sort-key fix lands with it.

---

### Phase 3: The registry state rules for a re-run

**Risk Level**: Medium — it changes an existing command's behaviour.

**Files**:

- `skills/qa-next/scripts/uat-status.mjs`

**Changes**:

- [x] In `cmdSet`, when the row's current `stateKey` is `accepted` and the verdict is anything other
      than `fail`, leave the state cell and report `✅ accepted (kept)`. Comment the *why* beside the
      rule, and write it as one predicate over the verdict — not a special case for `pass`.
- [x] `fail` overrides any prior state, `✅` included. It is the only verdict that does.
- [x] Add `--clear-note`: writes `Notes / bug` empty. Refuse `--clear-note` together with `--note` or
      `--bug`, **and refuse it on the kept-`✅` path** — that cell holds the `accepted <date>`
      provenance and `--check` would not notice its loss.
- [x] Confirm `--check` stays green across every new transition (an `✅` row still carries a resolving
      `Last run` link; a `🟡` that follows a `❌` carries no bug link and needs none). Note that
      `checkRegistry` has **no** note requirement for `accepted` — which is exactly why the
      `--clear-note` refusal has to live in `cmdSet` rather than be caught downstream.

**Dependencies**: Phase 1.

---

### Phase 4: The protocol

**Risk Level**: Low

**Files**:

- `skills/qa-next/SKILL.md`
- `skills/qa-next/assets/run.template.md`

**Changes**:

- [x] Add `## Arguments` in the `review-code` / `review-pr` / `double-check` house style: *Invoke as
      `/qa-next [id] [--dry-run]`* plus the Arg/Values/Default/Meaning table.
- [x] State the two rules there: an explicit id ignores the row's state; `/loop /qa-next` stays
      untargeted, because a loop over a fixed id repeats one function forever.
- [x] Step 0: a state file for a *different* item plus an explicit id → HALT `run-in-progress`. Add
      `"targeted": true` to the state object so a resume at `phase: selected` re-resolves that id
      rather than falling back to `--next`.
- [x] **Gate `## Run state`'s staleness rule on `targeted`.** "If the row for `item` is no longer ⬜
      and the phase is `selected`, someone else finished it — delete the state file and start over"
      is false by construction for a targeted run, whose whole purpose is a non-⬜ row. Unamended it
      fires on every targeted resume and throws the run away. It applies to an untargeted run only.
- [x] Step 1 becomes *Select or resolve*: `--next` (exit 3 → `registry-complete`) or `--item <id>`
      (exit 4 → `unknown-item`).
- [x] Step 3: the run file path comes from `--run-path <id>`, never composed by hand; the evidence
      directory mirrors its basename.
- [x] Step 4: the run-file header's new `Run` row; reuse the row's open bug on a repeat fail (read
      from the payload's `bug`, not by re-parsing the registry) rather than filing a second; reuse an
      earlier open finding's bug link on a matching finding.
- [x] Step 4: state the note rule **per verdict**, not as a blanket "always pass `--note` or
      `--clear-note`" — that blanket is unsatisfiable on a `fail`, where `--bug` is mandatory and
      `--clear-note` is refused alongside it. `fail` → `--bug` (plus `--note` when there is more to
      say); `blocked`/`na` → `--note`; `pass` on a non-`✅` row → `--clear-note` to drop the previous
      verdict's bug link; `pass` on an `✅` row → neither, and `--clear-note` is refused.
- [x] Step 5: `qa(uat): <id> re-run <verdict> — <Function>` for a targeted re-run.
- [x] Step 6: report the run number and link the previous run.
- [x] Stop-conditions table: `unknown-item`, `run-in-progress`. *What this skill never does*: overwrite
      a previous run file; re-litigate an `✅` on a pass.
- [x] `assets/run.template.md`: the `Run` row.

**Dependencies**: Phases 1–3 (the protocol quotes the commands).

---

### Phase 5: Tests and the doc sweep

**Risk Level**: Low

**Files**:

- `evals/qa-next/unit/uat-status.test.mjs`
- `skills/qa-next/README.md`
- `docs/reference/commands.md`
- `docs/reference/activation-phrases.md`
- `docs/reference/skill-catalog.md` (generated)
- `CHANGELOG.md`

**Changes**:

- [x] Test groups per § 8, each mutation-proved.
- [x] README: operating modes, owner cheat-sheet, registry-states note, runs-history paragraph.
- [x] `commands.md`: a `/qa-next <id>` row, and fix the two story-era sentences in the existing rows.
- [x] `activation-phrases.md`: "re-test D.2" / "QA that function again"; the existing phrase still says
      "the next accepted **story**".
- [x] `npm run generate-catalog`; confirm `npm run check:generated` is green.
- [x] `CHANGELOG.md` `[Unreleased]`.

**Dependencies**: Phases 1–4.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/qa-next/scripts/uat-status.mjs` — `describeRow`, `cmdItem`, `cmdRunPath`, `runPathFor`,
   `listRunFiles`' sequence-aware sort key, the `cmdSet` accepted-row rule, `--clear-note` (and its
   two refusals), exit 4, usage header.
2. ✅ `skills/qa-next/SKILL.md` — `## Arguments`; Steps 0, 1, 3, 4, 5, 6; the stop-conditions and
   *never does* tables.
3. ✅ `skills/qa-next/assets/run.template.md` — the header table's `Run` row.

### Files to Modify (Tests)

4. ✅ `evals/qa-next/unit/uat-status.test.mjs` — five new groups (§ 8). Already covered by the
   `npm test` glob in `package.json`; re-confirm after adding files, because that list is
   hand-maintained and silently orphans new suites.

### Files to Modify (Documentation)

5. ✅ `skills/qa-next/README.md` — operating modes, owner commands, registry states, run history.
6. ✅ `docs/reference/commands.md` — the `/qa-next <id>` row plus two stale story-era sentences.
7. ✅ `docs/reference/activation-phrases.md` — re-test phrasing.
8. ✅ `docs/reference/skill-catalog.md` — regenerated, not hand-edited.
9. ✅ `CHANGELOG.md` — `[Unreleased]`.

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

**Scope**: every new behaviour in `uat-status.mjs`, against a fixture registry built in the OS temp
directory (the suite's existing pattern).

**Actions**:

- [x] `--item <id>` returns a payload **field-identical** to `--next` for the same row. Comparing the
      two objects is what pins the single `describeRow`; grepping the source for one call would prove
      the string exists, not that both commands use it.
- [x] `--item` on an unknown id exits 4 and leaves the registry byte-identical.
- [x] `--item` accepts a lowercase id.
- [x] `state`, `lastRun`, `priorRuns`, `notes` and `bug` are present and correct on both `--item` and
      `--next`, with `priorRuns` empty and `bug` `null` for a function that has never run, and `bug`
      equal to the link target for a row carrying one.
- [x] `--run-path`: 1st call `<date>-<env>.md`, 2nd `-02`, 10th `-10`.
- [x] `listRunFiles` returns all ten in chronological order — **including the unsuffixed first run**.
      This is the assertion the whole sequencing scheme rests on, and it fails against today's
      comparator (`["…-lan.md","…-lan-02.md"].sort()` puts `…-lan.md` second), so write it first and
      watch it go red. The existing ordering test at `uat-status.test.mjs:581` uses two *different*
      dates and passes either way — it is not cover for this case.
- [x] `--set <id> pass` on `✅` leaves `✅` and updates `Last run`; on `🟡`/`❌`/`⬜` it sets `🟡`.
- [x] `--set <id> blocked` and `--set <id> na` on `✅` also leave `✅` and write only `Last run` /
      `Notes / bug` — the rule is over the verdict set, not over `pass`.
- [x] `--set <id> fail` on `✅` sets `❌`.
- [x] `--clear-note` empties `Notes / bug`; a `🟡` that follows a `❌` carries no stale bug link;
      `--clear-note` with `--note` or `--bug` is a usage error; `--clear-note` on a `pass` against an
      `✅` row is a usage error and the `accepted <date>` note survives byte-identical.
- [x] `--check` exits 0 after each of the transitions above.

**Command**: `npm test` (the `evals/qa-next/unit/*.test.mjs` glob).

**Target**: every new branch in the tool exercised; no reduction in the suite's existing coverage.

---

### Integration Tests

**Scope**: the tool's commands composed the way the protocol composes them.

**Actions**:

- [x] `--item` → `--run-path` → write a file there → `--set … --run <that path>` → `--check` exits 0.
- [x] The same sequence twice in one day produces two run files, both listed by `listRunFiles`, and the
      first one's `## Findings` rows still appear in `--findings`.

**Command**: `npm test`.

---

### Contract Tests

**Scope**: the commands this task does not touch.

**Actions**:

- [x] `--next` payload shape, `--next` exit 3, `--accept` refusal on a non-`🟡`, `--check` exit codes
      and `--findings` output are unchanged — the existing assertions must pass untouched.

---

### Performance Tests

**Scope**: there is no performance dimension to this change and no baseline to beat. The properties
worth holding are cost properties:

**Metrics to Measure**:

- `--run-path` does one `readdirSync` of a single function's directory, not a recursive walk of `runs/`.
- `--item` reads the registry once, like `--next`.
- `priorRuns` **does** walk `runs/` recursively, on both `--item` and `--next`, because it reuses
   `listRunFiles` rather than duplicating its (now sequence-aware) comparator. That is a deliberate
   trade and it is named here rather than left implied by the two bullets above: one sorted walk of
   a directory of Markdown files is cheap, and a second comparator would be the enumeration class.

**Baselines**: the tool is offline and file-local; every command today is a small number of synchronous
reads.

**Expectations**: unchanged — no network, no new recursive walk on the hot path.

---

### Consumer Tests

**Scope**: the skill's own prose, executed.

**Files to Test**:

- `skills/qa-next/SKILL.md` — every command line quoted in the protocol runs as written against the
  fixture registry (the failure mode this catches is a documented flag the tool does not have).

**Command**: `npm test`, then a manual read-through of the `## Arguments` table against `OPTIONS`.

---

## 9. Success Criteria

### Functional

- [x] `/qa-next D.2` runs the full protocol against row `D.2` from any state — `⬜ 🟡 ❌ ⏸ ✅ ➖`.
- [x] `/qa-next` with no argument selects the first `⬜` row exactly as it does today.
- [x] `/qa-next <unknown id>` stops with `unknown-item` and writes nothing.
- [x] A second run of the same function on the same day writes a second run file; the first survives
      intact, its findings still appear in `--findings`, and it appears **first** — before the
      sequenced runs — in `listRunFiles`, `--findings` and `priorRuns`.
- [x] A `pass`, `blocked` or `na` re-run of a `✅` row leaves `✅` and updates `Last run`; only a
      `fail` sets `❌`.
- [x] A passing re-run of a `✅` row leaves its `accepted <date>` note intact — `--clear-note` is
      refused on that path.
- [x] A repeat failure re-links the existing open bug instead of filing a second one.
- [x] A `🟡` that follows a `❌` carries no stale bug link.

### Performance

- [x] `--run-path` touches one function directory, not the whole `runs/` tree.
- [x] No command gains a network call; the tool stays offline.
- [x] `npm test` wall-clock for the qa-next suite stays in the same order of magnitude.

### Code Quality

- [x] One `describeRow`; `--item` and `--next` payloads compared field-by-field in a test, `notes`
      and `bug` included.
- [x] One sequence-aware sort key; `listRunFiles` and `priorRuns` share it rather than each sorting.
- [x] Every new test mutation-proved: revert the behaviour, watch that test go red, restore.
- [x] `npm test` green with the `.claude/skills → ../skills` symlink moved aside.
- [x] `npm run check:generated` and `npm run bundle -- --check` green.
- [x] Prettier clean on every changed file.

### Migration

- [x] `CHANGELOG.md` records the `--set pass` behaviour change with its migration line.
- [x] `skills/qa-next/README.md` documents the targeted form and the accepted-row rule.
- [x] `docs/reference/commands.md` carries a `/qa-next <id>` row and no longer describes the unit of
      work as a story.
- [x] `docs/reference/skill-catalog.md` regenerated, not hand-edited.

---

## 10. Risk Assessment

### High Risk Areas

None. The tool is offline, file-local and covered by an existing unit suite; the skill is prose.

### Medium Risk Areas

**1. The `--set pass` state rule is a silent behaviour change**

- **Risk**: a consumer or a future call site expects `pass` to write `🟡` unconditionally and does not
  notice that an `✅` row stayed put.
- **Probability**: Low — `qa-next` Step 4 is the only caller in this repository.
- **Impact**: Major if unnoticed, because the whole point is that the row reads correctly.
- **Mitigation**: the tool **prints which branch it took** (`✅ accepted (kept)`), the behaviour is a
  documented breaking change with a migration line, and a test pins both directions.
- **Rollback**: revert Phase 3 alone; Phases 1, 2 and 4 do not depend on it.

**2. The run-file sequence changes what a path means**

- **Risk**: something downstream parses a run filename expecting exactly `<date>-<env>.md`.
- **Probability**: Low — `listRunFiles` sorts by basename and `--findings` reads content, not names.
- **Impact**: Minor.
- **Mitigation**: the first run of a day keeps the existing name exactly; only the second onwards gains
  a suffix. That unsuffixed first name is *also* where the ordering breaks — `.` sorts after `-`, so a
  basename sort puts run 1 last — which is why `listRunFiles`' comparator normalises a missing
  sequence to `-01`. A test asserts chronological ordering over the mixed set `[plain, -02, -10]`;
  ten runs alone would not have caught it, because the failing element is the one with no suffix.
- **Rollback**: revert Phase 2; the protocol falls back to composing the path, which is today's
  behaviour. The sort-key change is safe to keep on its own — it is a no-op on a tree with no
  sequenced files.

### Low Risk Areas

**1. Exit code 4**

- **Risk**: a caller treating "non-zero" as "usage error" misreports an unknown id.
- **Probability**: Low. **Impact**: Minor.
- **Mitigation**: 4 is new and unused; the stop-conditions table names it; `--next`'s 3 is untouched.

**2. Doc drift**

- **Risk**: five documents restate this behaviour and drift silently — two of them are *already* stale
  from the earlier story→function rework, which is the evidence that this risk is real here.
- **Probability**: Medium. **Impact**: Minor.
- **Mitigation**: the sweep is a checklist item in Phase 5, the catalog line is generated and
  `check:generated` guards it.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:

- `/qa-next` with no argument stops selecting the first `⬜` row.
- `--check` goes red on a registry it accepted before the change.
- A run file is overwritten rather than sequenced.

**Steps**:

1. `git revert` the merge commit for this task's branch.
2. `npm test` — the qa-next unit suite must be green at the reverted tree.
3. `uat-status.mjs --check` against a consumer registry — expect exit 0.

**Verification**: `--next --json` returns the same payload it did before the branch, and the registry
is byte-identical after a `--check`.

---

### Partial Rollback (1-2 hours)

**When to Use**: only the `cmdSet` state rule is wrong (an owner wants every machine verdict to reset
the row).

**Steps**:

1. Revert Phase 3's `cmdSet` hunk and its test group; keep Phases 1, 2, 4 and 5.
2. Amend the SKILL.md sentence in Step 4 and the README's registry-states note in the same commit.
3. `npm test`, then `--set <id> pass` against an `✅` fixture row and confirm the demotion is back.

---

### Forward Fix (< 4 hours)

**When to Use**: the sequencing format is wrong (a different suffix is wanted), a stop reason is
misnamed, or the bug-reuse rule needs a tighter match. None of these breaks an existing registry.

**Approach**: fix `runPathFor` or the prose in place and add the test that would have caught it. Run
files already written keep their names; the function is `existing → next`, so it tolerates any
historical naming.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:

- Untargeted `/qa-next` selects the wrong row, or no row.
- Any path where a previous run file is overwritten.
- `--check` rejects a registry it previously accepted.

**Non-Critical (Forward Fix)**:

- Sequence suffix format, stop-reason naming, the finding-match rule, any documentation wording.

---

## QA Testing Results

**QA Status**: CONCERNS — 12 cycles; gate 12's entries fixed in `94c28be6` but not gated. Accepted on the evidence by the operator and reviewed at 5c (`/review-pr` 2: CONCERNS, 0 HIGH)
**Testing Date**: 2026-09-23
**Quality Score**: 90/100
**Gate Decision**: CONCERNS — no HIGH for eight consecutive gates

### QA Reports

| Cycle | Gate | Report | Verdict | HIGH |
| :--- | :--- | :--- | :--- | :--- |
| 1 | [gate.1](./task.141.gate.1.qa-next-targeted-item.yml) | [qa.1](./task.141.qa.1.qa-next-targeted-item.md) | FAIL (70) | 1 |
| 2 | [gate.2](./task.141.gate.2.qa-next-targeted-item.yml) | [qa.2](./task.141.qa.2.qa-next-targeted-item.md) | FAIL (70) | 1 |
| 3 | [gate.3](./task.141.gate.3.qa-next-targeted-item.yml) | [qa.3](./task.141.qa.3.qa-next-targeted-item.md) | FAIL (65) | 1 |
| 4 | [gate.4](./task.141.gate.4.qa-next-targeted-item.yml) | [qa.4](./task.141.qa.4.qa-next-targeted-item.md) | CONCERNS (80) | 0 |
| 5 | [gate.5](./task.141.gate.5.qa-next-targeted-item.yml) | [qa.5](./task.141.qa.5.qa-next-targeted-item.md) | FAIL (60) | 1 |
| 6 | [gate.6](./task.141.gate.6.qa-next-targeted-item.yml) | [qa.6](./task.141.qa.6.qa-next-targeted-item.md) | CONCERNS (80) | 0 |
| 7 | [gate.7](./task.141.gate.7.qa-next-targeted-item.yml) | [qa.7](./task.141.qa.7.qa-next-targeted-item.md) | CONCERNS (85) | 0 |
| 8 | [gate.8](./task.141.gate.8.qa-next-targeted-item.yml) | [qa.8](./task.141.qa.8.qa-next-targeted-item.md) | CONCERNS (80) | 0 |
| 9 | [gate.9](./task.141.gate.9.qa-next-targeted-item.yml) | [qa.9](./task.141.qa.9.qa-next-targeted-item.md) | CONCERNS (80) | 0 |
| 10 | [gate.10](./task.141.gate.10.qa-next-targeted-item.yml) | [qa.10](./task.141.qa.10.qa-next-targeted-item.md) | PASS (100) | 0 |
| 11 | [gate.11](./task.141.gate.11.qa-next-targeted-item.yml) | [qa.11](./task.141.qa.11.qa-next-targeted-item.md) | CONCERNS (90) | 0 |
| 12 | [gate.12](./task.141.gate.12.qa-next-targeted-item.yml) | [qa.12](./task.141.qa.12.qa-next-targeted-item.md) | CONCERNS (90) | 0 |

Budget: 12 (5 + 2 + 2 + 1 + 1 + 1 granted). Cycle 12 found the `bug` half of the cycle-10 state-file rule over-broad.

### Test Coverage Summary

- **Tests Executed**: 3947 (0 failures, 1 skipped); qa-next suite 44
- **Phases Verified**: 5/5
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: CONCERNS

### Key Findings

Cycle 10 is the first cycle whose review found no defect in the previous fix. The payload's `bug`
round-trips through `--bug` across seven registry layouts, and the bug-link rule names its real
resolving base and is held clause by clause to `--check`. Every MEDIUM since cycle 6 was in one
small area, how a bug link is represented at each boundary (cell, `--check`, payload, `--bug`,
prose rule), and the loop closed those boundaries one pair at a time.

### Deferred Work

- **Carried from gate 10 by the Cosmetic-residue exit (route 2b, cycle 10)**: TASK-141-CR10-1,
  TASK-141-CR10-2, TASK-141-CR10-3. Three LOW findings (the round-trip test's write-back regex
  cannot fail; the prose-clause `null` column runs only on `⏸` rows; two comments overstate the
  same-file guarantee), moved to the gate's `recommendations.future` by id. None changes behaviour.
- Pre-existing, routed to future across the loop: CR9-3 (a directory passes the bug-link `exists`),
  CR8-2 + CR7-4 (run link and `Filed as` get neither the fragment strip nor the prose skip), bug.16
  (main guard silent under a symlink), CR-3 (`--set` exits 0 whether the row moved or was kept),
  and the accepted kept-✅ note growth.

- **Follow-up task (agreed with the operator, 2026-09-23): give the `/qa-next` state file one
  contract.** Either a schema table of field, writer step and reader steps that every step cites, or
  ownership by `uat-status.mjs` so a test can hold it. Seeded from BUG-21/22/23 (cycles 9–12) and
  obs #167. Carries PR review 2's CR-1 (a two-digit `--env` label passes the sequence guard) and CR-2
  (Step 4.4's pass bullet omits `--clear-note`), and gate 12's CR12-3 (a state file from the
  pre-task.141 skill has no `priorRuns`).
- Routed to future by gates 11–12: CR11-2 (no `--registry` passed, so a non-default `registryPath` is
  invisible to the tool), CR11-3 (`cmdSet`'s `startsWith` guess on `--run`), CR12-5 (gate 11 was closed
  in place by the fixer).

---
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-09-22 | 1.0     | Initial draft | create-task |
| 2026-09-22 | 1.1     | Review 1 (7/10 → 9/10): fixed the run-file ordering defect (`listRunFiles` sort key), widened the kept-`✅` rule to `blocked`/`na`, refused `--clear-note` on a kept `✅`, added `notes`/`bug` to the payload, gated the resume staleness rule on `targeted` | review-task |
| 2026-09-22 |         | Status → ready-for-development | review-task |
| 2026-09-22 |         | Phases 1–5 implemented; status → ready-for-review | develop-task |
| 2026-09-22 |         | QA gate FAIL (70/100) — 4 findings (1 HIGH, 1 MEDIUM, 2 LOW); status → in-progress | qa-task |
| 2026-09-22 |         | QA cycle 2 refute pass — gate FAIL (70/100); 2 cycle-1 bugs verified fixed, 3 new findings | qa-task |
| 2026-09-22 |         | QA cycle 3 — gate FAIL (65/100); sign-off guard replaced by an append rule rather than a fourth enumeration | qa-task |
| 2026-09-22 |         | QA cycle 4 — gate CONCERNS (80/100); append rule verified over the writer set; pipe escaping, newest-bug-link and a STATES population test | qa-task |
| 2026-09-22 |         | QA cycle 5 — gate FAIL (60/100); render/parse idempotence, every-bug-link validation, suppression withdrawn; **loop limit reached** | qa-task |
| 2026-09-23 |         | QA cycle 6 (granted 1/2) — gate CONCERNS (80/100); round trip verified adversarially; bug-link validation corrected on both axes | qa-task |
| 2026-09-23 |         | QA cycle 7 (granted 2/2) — gate CONCERNS (85/100); validated-vs-published closed structurally by one shared predicate; budget spent | qa-task |
| 2026-09-23 |  | QA cycle 8 (second grant, 1/2) — gate CONCERNS (80/100); 3 findings (2 MEDIUM, 1 LOW) — the fragment strip reopened validated-vs-published on a third axis | qa-task |
| 2026-09-23 |  | QA cycle 9 (second grant, 2/2) — gate CONCERNS (80/100); 2 MEDIUM — `bug` does not round-trip through `--bug` (since the original commit); the rule names the wrong resolving base | qa-task |
| 2026-09-23 |  | QA cycle 10 (third grant) — gate PASS (100/100); no defect in the cycle-9 fix; 3 LOW carried to future (Cosmetic-residue exit, route 2b) | qa-task |
| 2026-09-23 |  | QA cycle 11 (fourth grant) — gate CONCERNS (90/100); 1 MEDIUM (Step 6 reads priorRuns after deleting the state file), 2 LOW | qa-task |
| 2026-09-23 |  | QA cycle 12 (fifth grant) — gate CONCERNS (90/100); 1 MEDIUM (Step 6 prints the pre-run bug), 2 LOW | qa-task |
| 2026-09-23 |  | QA loop closed at 12 cycles on the operator's accept-on-evidence decision; PR review 2 CONCERNS (0 HIGH); state-file contract filed as a follow-up | develop-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Resolve a named row

- [x] `describeRow` extracted; `cmdNext` calls it
- [x] `state` / `lastRun` / `priorRuns` / `notes` / `bug` on both payloads
- [x] `--item` + exit 4 + lowercase id
- [x] Usage header updated (including `--accept --force`)

### Phase 2: A run file path the agent cannot collide

- [x] `runPathFor` (pure) + `cmdRunPath`
- [x] `listRunFiles` sort key normalises a missing sequence to `-01` (mutation-proved first)
- [x] `--run-path` / `--env` registered

### Phase 3: The registry state rules for a re-run

- [x] `pass` / `blocked` / `na` on `✅` keep `✅`; only `fail` overrides
- [x] `--clear-note`, refused with `--note`/`--bug` and on a kept `✅`
- [x] `--check` green across every transition

### Phase 4: The protocol

- [x] `## Arguments` section
- [x] Steps 0, 1, 3, 4, 5, 6 (including the `targeted`-gated staleness rule and the per-verdict note rule)
- [x] Stop-conditions + *never does* tables
- [x] Run template `Run` row

### Phase 5: Tests and the doc sweep

- [x] Five test groups, each mutation-proved
- [x] README, commands.md, activation-phrases.md
- [x] Catalog regenerated; `check:generated` green
- [x] CHANGELOG `[Unreleased]`

---

## References

- **Related Skill**: `.agents/skills/qa-next/`
- **Related Tool**: `skills/qa-next/scripts/uat-status.mjs`
- **Related Tests**: `evals/qa-next/unit/uat-status.test.mjs`
- **Argument house style**: `skills/review-code/SKILL.md` § Arguments, `skills/review-pr/SKILL.md`
  § Arguments, `skills/double-check/SKILL.md` § Arguments
- **Related Documentation**: `docs/reference/commands.md`, `docs/reference/activation-phrases.md`,
  `docs/reference/anti-patterns.md` (the enumeration class)

---

## Notes

### Important Reminders

- **`command node`, never bare `node`** — on this machine `node` is an nvm shell function that prints
  help to stdout and corrupts any captured `--json`.
- **`die()` throws; it never exits.** Keep exit 4 inside that discipline — a `process.exit()` after a
  write truncates stdout at ~64KB on a pipe.
- **Move the gitignored `.claude/skills → ../skills` symlink aside** before believing a local green; it
  has masked CI failures in this repo before.
- **Mutation-prove every test.** A test that passes against both the fixed and the broken tool is
  holding nothing.
- The plan file beside this document carries the code-level detail: signatures, the exact hunks, and
  the fixture shape.

### Known Issues

**Closed by review 1** (2026-09-22, `task.141.review.1.qa-next-targeted-item.md`): the run-file
ordering defect (Critical), the kept-`✅` rule's verdict coverage, the `--clear-note` collisions, the
bug-reuse rule's missing payload field, and the `targeted`-gated resume.

**Open** (non-blocking):

- ⚠️ `docs/reference/commands.md` rows 25–26 still describe qa-next's unit of work as a *story*,
  left over from the story→function rework. Phase 5 fixes them.
- ⚠️ `skills/qa-next/references/` exists and is empty. Out of scope here.
- ⚠️ There is no `eval:qa-next` npm script; the suite runs only through the main `test` glob. Out of
  scope, worth a follow-up.
- ⚠️ `--item` is one character from `--items`, which writes a cell rather than reading a row. No
  functional collision (`dispatch` matches exact strings), but a typo hazard worth a line in the
  usage header. Optional finding from review 1.

### Future Improvements

- `uat-automate <id>`, which this task's run files keep feeding.
- Batch targeting (`--failing`, a surface) once the single-id form has been used in anger.
- A `--since <ref>` mode that suggests which functions a diff has put at regression risk.

---

**Status:** Ready for Review

**Next Steps**:

1. Implement according to the implementation plan
2. Mark checkboxes as completed
3. Hand off to QA when complete
4. QA will create:
   - QA Report: `task.141.qa.1.qa-next-targeted-item.md`
   - Bug Reports (if needed): `task.141.bug.[N].[name].md`
   - Quality Gate: `task.141.gate.1.qa-next-targeted-item.yml` (co-located in this directory)

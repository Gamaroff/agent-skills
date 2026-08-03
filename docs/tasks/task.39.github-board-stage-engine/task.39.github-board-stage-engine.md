---
id: task.39
title: "gh-stage.js — a GitHub Projects board engine driven by the workflow ladder"
type: task
description: "Add a deterministic CLI that sets a GitHub Projects v2 Status field from the tracker-workflow ladder, with a mandatory backward-move guard and a read-only board probe. Nothing is wired to it yet."
tags: [github, projects-v2, pipeline, workflow]
category: infrastructure
status: planned
priority: High
created: 2026-08-03
updated: 2026-08-03
assignee:
estimated_effort_hours: 16
---

# Technical Task: `gh-stage.js` — a GitHub Projects board engine

**Status:** Planned

---

## 1. Overview

GitHub board moves are currently five hardcoded `gh api graphql` blocks inlined in step markdown,
with the field name `"Status"` and the option names written as literal `jq` matches. This task adds
`shared/resources/gh-stage.js`: a deterministic CLI that resolves its target from the
`tracker-workflow.yaml` ladder (task.37) and sets the Projects v2 Status field, with the same
exit-code contract as `jira-stage.js`.

**Nothing is wired to it in this task** — the step files are rewritten in task.40. That ordering is
deliberate: the interesting failures (option-id instability, multi-board issues, `projectItems`
propagation delay) surface here with no card moving.

---

## 2. Motivation

### Current Problems

1. **Zero configurability.** `develop-pipeline-step-4-create-pr.md:237` literally instructs the
   reader to hand-edit `select(.name == "In Review")` if their board uses a different label. That
   paragraph is the clearest statement of the problem being solved.
2. **Five copies, three different matching disciplines.** Steps 0/4/5-6/7 use `ascii_downcase`;
   `skills/finalise/SKILL.md:1061` uses case-**sensitive** `name == "Done"`. Step 4 line 182
   computes `BOARD_NUM` and never uses it.
3. **Nothing prevents a backward move.** Jira's workflow graph refuses illegal transitions; a
   Projects v2 single-select has no graph at all, so `updateProjectV2ItemFieldValue` will cheerfully
   move a card from Done back to In Progress. A resumed run does exactly that.
4. **The post-condition check gives false passes.**
   `develop-pipeline-step-0-resolve-and-prepare.md:497` tests `[ "$BOARD_STATUS" = "Todo" ]`, so a
   board whose first column is "Backlog" reports "✅ Post-condition verified" after a failed move.
5. **`DEFAULT_STATUS_RANK` does not even cover GitHub's default first column.** The built-in list
   has `"To Do"` (with a space); GitHub's default column is `"Todo"`. An unconfigured board's
   starting column is unranked, so any guard would silently have no opinion there.

### Benefits

1. **A GitHub consumer can name its own columns**, for the first time.
2. **One matching discipline** — case-insensitive, emoji-stripped, everywhere.
3. **A real backward-move guard** on the tracker that has no other protection.
4. **~240 lines of duplicated GraphQL prose become one-line CLI calls** (realised in task.40).
5. **A read-only probe** that reads the board's real columns and can write the ladder from them —
   ergonomically better than Jira, because a Projects board's option order *is* the workflow order.

---

## 3. Technical Background

### Current Architecture

Two `gh api graphql` calls, inlined in prose, repeated five times:

```graphql
{ repository(owner:…, name:…) { issue(number:N) { projectItems(first:10) { nodes {
  id
  fieldValueByName(name:"Status") { ... on ProjectV2ItemFieldSingleSelectValue { name } }
  project { id title fields(first:20) { nodes { ... on ProjectV2SingleSelectField { id name options { id name } } } } }
} } } } }
```

```graphql
mutation { updateProjectV2ItemFieldValue(input:{
  projectId:… itemId:… fieldId:… value:{ singleSelectOptionId:… } }) { projectV2Item { id } } }
```

Board identity comes from `project.yml` at repo root via inline `grep`/`awk`; repo context from
`gh repo view`. The pipeline steps take `projectItems.nodes[0]`; `set-github-project-priority.sh`
and `set-github-project-estimate.sh` iterate **every** board the issue is on.

### Target Architecture

```
gh-stage.js --issue 123 --stage in-review
  ├─ loadWorkflow()            # tracker-workflow.js (task.37)
  ├─ resolveMoment()           # → target status
  ├─ read board via gh api graphql (single query)
  ├─ backward-move guard       # rankOf(current) vs rankOf(target) — MANDATORY here
  ├─ resolveOption()           # first candidate matching an existing option name
  └─ updateProjectV2ItemFieldValue
```

### Important Clarifications

- **GitHub has no workflow.** Any option is settable from any other, so there is no transition
  graph, no "no-transition from here", and **no ladder walking** — that is Jira-only (task.38). A
  ladder still matters here, for rank.
- **`no-option` means something different from Jira's `no-transition`.** On Jira, "the board cannot
  get there from here" is frequently correct. On GitHub it can only mean the Status field has no
  such option at all — always a configuration error. The message must be correspondingly louder.
  Do not port Jira's "a skip is often correct" wording.
- **Node, not bash.** The two `set-github-project-*.sh` scripts are the right *behavioural* template
  (always `exit 0`, one warning per skip) but the wrong substrate: this needs to load a YAML ladder,
  overlay it and compare ranks. In bash that means a sixth hand-rolled config reader and a second
  copy of the rank logic in a second language.

---

## 4. Scope

### In Scope

✅ `shared/resources/gh-stage.js` — CLI isomorphic to `jira-stage.js`.
✅ `resolveOption(options, candidates, current)` — pure, exact case-insensitive matching only.
✅ Mandatory backward-move guard using ladder rank; `--allow-regress` to override.
✅ `ensureOnBoard` — `gh project item-add` plus the existing propagation retry, behind
`--add-to-board`.
✅ `--probe-board [--write-ladder]` — read-only board enumeration; derives ladder order from the
board's own option order.
✅ Multi-board disambiguation rule.
✅ Config keys: `github.projectStatusField` (default `Status`), `github.projectBoard`.
✅ Captured Projects v2 fixtures and tests.

### Out of Scope

❌ **Wiring into the step files** — task.40.
❌ **Ladder walking** — meaningless without a transition graph.
❌ **The Priority / Estimate board fields** — `set-github-project-*.sh` already own those.
❌ **Migrating `project.yml`** — board identity, different lifetime. `gh-stage.js` reads it as a
fallback exactly as the step files do today.
❌ **A GitHub MCP fallback protocol** — `gh` is either authenticated or it is not; there is no
second transport and no such document should exist.

---

## 5. Breaking Changes

**None.** Nothing calls `gh-stage.js` in this task.

### Contract established here (consumed by task.40)

Exit codes, copied verbatim from `jira-stage.js:19-27` so it is a drop-in replacement for four
`|| echo "⚠️ …"` subshells:

| Code | Meaning |
| --- | --- |
| 0 | `transitioned`, `already`, `stage-disabled`, `no-option`, `not-on-board`, `no-credentials`, `would-regress`, `dry-run`, and any unhandled throw |
| 1 | any skip, **only** under `--strict` |
| 2 | usage error (unknown moment, missing `--issue`) |

Pipeline steps run inside shells; a non-zero exit on "this board has no review column" would kill
the run.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.39.plan.github-board-stage-engine.md](task.39.plan.github-board-stage-engine.md)

### Phase 1: `resolveOption` and the CLI skeleton

**Risk Level**: Low

**Files**: `shared/resources/gh-stage.js` (new)

**Changes**:

- [ ] Arg parsing mirroring `jira-stage.js` (`--issue`, `--stage`, `--json`, `--quiet`, `--dry-run`,
      `--strict`, `--allow-regress`, `--board`, `--field`)
- [ ] `resolveOption(options, candidates, current)` — pure: already-check, then exact
      case-insensitive, emoji-stripped match per candidate in order, then `no-option`. **No** prefix
      matching, no fuzzy matching, no category analogue
- [ ] Exit-code table and the top-level `.catch` that still exits 0
- [ ] `no-credentials` when `gh` is absent or `gh auth status` fails — a dead end, not a handoff

**Dependencies**: task.37

---

### Phase 2: Board read, guard, and mutation

**Risk Level**: Medium

**Files**: `shared/resources/gh-stage.js`

**Changes**:

- [ ] Single GraphQL read fetching item id, project id/title, the Status field id and all options,
      **and the current value** — steps 0/4/7 do not fetch the current value today, so this is a
      real addition
- [ ] Multi-board rule: one board → use it; several → `--board`, else `github.projectBoard`, else
      `project.yml`'s `project_board_number`/`project_board_name`, else skip with
      `reason: "ambiguous-board"` naming the candidates. Never fan a status change out to boards
      nobody asked about
- [ ] Backward-move guard from ladder rank; unranked either side → no opinion, allow
- [ ] `updateProjectV2ItemFieldValue`, then re-read and report the landed option
- [ ] Wrap mutations in `tracker_call_with_retry`-equivalent backoff (the shell helper wraps
      `gh issue` calls but no board mutation today)
- [ ] `ensureOnBoard` behind `--add-to-board`: `gh project item-add`, `sleep 3`, retry-once-after-5s
      when `projectItems` returns empty — real Projects API propagation behaviour, not scaffolding

**Dependencies**: Phase 1

---

### Phase 3: `--dry-run` and `--probe-board`

**Risk Level**: Medium

**Files**: `shared/resources/gh-stage.js`

**Changes**:

- [ ] `--dry-run` performs the read and the guard, prints the intended option, and issues **no**
      mutation and **no** `gh project item-add`. Today's step-0 block runs `item-add` *before* its
      read query, so a naive port would write during a read-only check. Print
      `would add issue #N to board X` instead
- [ ] Skip output names the options the board *did* offer, plus the `describeAlternatives` analogue
      (`jira-stage.js:87-110`) — "Ready for Showcase is present and is the target for moment
      `pr-merged`"
- [ ] `--probe-board`: enumerate boards, Status options in **board order**, and per moment the
      resolved option or `no-option`
- [ ] `--write-ladder`: derive ladder order from board option order — a Projects board's option
      order *is* its workflow order. Preserve an existing ladder; never overwrite silently

**Dependencies**: Phase 2

---

### Phase 4: Fixtures and tests

**Risk Level**: Low

**Files**: `shared/resources/tests/gh-stage.test.mjs` (new),
`shared/resources/tests/fixtures/gh-*.json` (new)

**Changes**:

- [ ] Capture real `projectItems` responses; document the exact query and trimming rule in the test
      header, as `jira-stage-fixtures.test.mjs:1-29` does, so they can be re-captured
- [ ] Fixtures, each pinning one real failure: two boards with a `Done` option carrying **different**
      option ids; an issue on two boards; a board with non-default columns; a board with no `Status`
      field; `nodes: []`; an option named `done` beside one named `Done`; `fieldValueByName: null`;
      and a mutation error envelope
- [ ] Assert `--dry-run` issues no non-GET verb by stubbing the `gh` invocation — a comment is not
      enough

**Dependencies**: Phases 1-3

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/gh-stage.js` — **new**

### Files to Modify (Tests)

2. ✅ `shared/resources/tests/gh-stage.test.mjs` — **new**
3. ✅ `shared/resources/tests/fixtures/gh-*.json` — **new**, 8 captured payloads

### Files to Modify (Documentation)

4. ✅ `docs/reference/tracker-workflow.md` — GitHub execution semantics; the no-graph asymmetry
5. ✅ `docs/reference/configuration.md` — `github.projectStatusField`, `github.projectBoard`, and
   the missing `project.yml` section
6. ✅ `CHANGELOG.md` — `### Added`

### Files to Delete

None in this task. Task.40 deletes the inline GraphQL.

---

## 8. Testing Strategy

### Unit Tests

**Scope**: `resolveOption` and the guard, against captured `fields.nodes` payloads

**Actions**:

- [ ] Exact case-insensitive match; `done` and `Done` both resolve
- [ ] Emoji-stripped (`🚧 In Progress`)
- [ ] Candidates tried in order; first hit wins
- [ ] **No** prefix matching — `In Review` must not match `In Review (blocked)`
- [ ] No option → `no-option` with the offered options listed
- [ ] Guard refuses a lower-ranked target; unranked either side allows; `--allow-regress` overrides

**Command**: `node --test 'shared/resources/tests/gh-stage.test.mjs'`

---

### Integration Tests

**Scope**: board resolution and the read/mutate cycle, with `gh` stubbed

**Actions**:

- [ ] Single board → used directly
- [ ] Two boards, no hint → `ambiguous-board`, naming both
- [ ] Two boards + `--board` / `github.projectBoard` / `project.yml` → correct one chosen
- [ ] `nodes: []` → `not-on-board`
- [ ] No Status field → skip, not a crash
- [ ] Mutation error envelope → retried, then a warning and exit 0

---

### Contract Tests

**Scope**: the drop-in contract task.40 depends on

**Actions**:

- [ ] Every documented reason exits 0; only `--strict` yields 1; usage errors yield 2
- [ ] An unhandled throw exits 0
- [ ] `--dry-run` issues **no** mutation and **no** `item-add` — asserted by stubbing `gh` and
      failing on any non-GET verb
- [ ] Flag surface matches `jira-stage.js` where the concept exists

---

### Performance Tests

**Scope**: API call count

**Metrics**: `gh` invocations per moment.

**Baselines**: today's inline block issues 1 `item-add` + 1-2 reads + 1 mutation + 1 post-condition
read.

**Expectations**: 1 read + 1 mutation + 1 verify read; `item-add` only under `--add-to-board`. A net
reduction.

---

### Consumer Tests

**Scope**: a real board, without moving cards

**Actions**:

- [ ] `--probe-board` against this repo's own board 1 ("Agent Skills")
- [ ] `--dry-run` for every moment against one real issue
- [ ] A scratch Projects v2 board with bespoke column names — free and disposable, and the honest
      pre-adoption ritual

---

## 9. Success Criteria

### Functional

- [ ] `--probe-board` prints the board's real options in board order and each moment's resolution
- [ ] `--write-ladder` produces a ladder that round-trips through `tracker-workflow.js`
- [ ] The guard refuses a backward move and `--allow-regress` overrides it
- [ ] `no-option` names the options the board offered
- [ ] `--dry-run` provably issues no write

### Performance

- [ ] One read + one mutation + one verify read per move
- [ ] `item-add` only under `--add-to-board`

### Code Quality

- [ ] Depends on `tracker-workflow.js` only — **not** on `jira-sync.js`, so GitHub-only consumers
      never bundle ~3,100 lines of Jira code
- [ ] Always exits 0 outside `--strict`/usage; never throws out
- [ ] Single matching discipline; no prefix matching anywhere
- [ ] New tests under an already-globbed directory

### Migration

- [ ] `configuration.md` documents both new keys **and** `project.yml`, which has never been
      documented there
- [ ] `tracker-workflow.md` states the no-graph asymmetry explicitly
- [ ] `CHANGELOG.md` `### Added` entry

---

## 10. Risk Assessment

### High Risk Areas

**1. Wrong board chosen on a multi-board issue**

- **Risk**: setting Status on a board nobody asked about is visible to a whole team and not
  obviously undoable.
- **Probability**: Medium — the existing helpers deliberately fan out to *every* board, so
  multi-board issues are known to exist here.
- **Impact**: Critical
- **Mitigation**: never fan out. Explicit precedence, and `ambiguous-board` skip naming the
  candidates rather than guessing. Fixture with two boards asserts it.
- **Rollback**: nothing is wired in this task, so no board can be touched by it.

### Medium Risk Areas

**1. Option ids are not stable across projects**

- **Risk**: any caching or hardcoding of `singleSelectOptionId` corrupts a real board while passing
  hand-written tests — the GitHub analogue of Jira transition id 21 meaning different things per
  issue type.
- **Probability**: Medium
- **Impact**: Major
- **Mitigation**: resolve ids per call from the read response; never persist one. Fixture with two
  boards whose `Done` ids differ.

**2. `projectItems` propagation delay**

- **Risk**: `item-add` then an immediate query returns empty, and the move is skipped.
- **Probability**: High (the existing step file already carries `sleep 3` + retry-after-5s for this)
- **Impact**: Minor
- **Mitigation**: port the existing dance into `ensureOnBoard` rather than inventing a new one.

### Low Risk Areas

**1. `no-option` phrasing copied from Jira**

- **Risk**: someone reuses "a skip is often correct", which is false here.
- **Mitigation**: the message and the docs both state the asymmetry; a test asserts the string
  differs from the Jira one.

**2. Bundle fan-out**

- **Mitigation**: no `jira-sync.js` dependency keeps it small.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: `--dry-run` observed issuing a write; any existing suite fails.

**Steps**:

1. `git revert` — the whole task is one new file plus tests and docs
2. `npm test`

**Verification**: `npm test` green. No pipeline behaviour can regress, because nothing calls it.

---

### Partial Rollback (1-2 hours)

**When to Use**: `--probe-board`/`--write-ladder` are wrong but the move path is sound. Revert
Phase 3 only; Phases 1-2 are what task.40 depends on.

---

### Forward Fix (< 4 hours)

**When to Use**: message wording, probe output shape, fixture gaps. Since nothing is wired,
essentially everything here is a forward fix.

---

### Rollback Triggers

**Critical**: a write during `--dry-run`; a non-zero exit from a documented skip.

**Non-Critical**: probe formatting, message wording, doc gaps.

---

## Progress Tracking

### Phase 1: `resolveOption` + CLI skeleton

- [ ] Arg parsing and exit-code table
- [ ] Pure `resolveOption`
- [ ] `no-credentials` handling

### Phase 2: Read, guard, mutate

- [ ] Single read including current value
- [ ] Multi-board rule
- [ ] Backward-move guard
- [ ] Mutation + verify + retry
- [ ] `ensureOnBoard`

### Phase 3: `--dry-run` + `--probe-board`

- [ ] Provably write-free dry run
- [ ] Alternatives hint on skip
- [ ] Probe and `--write-ladder`

### Phase 4: Fixtures and tests

- [ ] 8 captured fixtures with a documented capture recipe
- [ ] Unit, integration and contract suites

---

## References

- **Depends on**: task.37 (`tracker-workflow.js`)
- **Consumed by**: task.40 (step-file wiring)
- **Template**: `shared/resources/set-github-project-priority.sh`,
  `set-github-project-estimate.sh` — the behavioural shape (always `exit 0`, env → config → default)
- **Contract source**: `shared/resources/jira-stage.js:19-27` (exit codes), `:87-110`
  (`describeAlternatives`)
- **Current inline blocks**: `develop-pipeline-step-0-resolve-and-prepare.md:364-504`,
  `-step-4-create-pr.md:178-238`, `-step-5-6-qa-loop.md:43-106`, `-step-7-finalise.md:165`,
  `skills/finalise/SKILL.md:1023-1093`

---

## Notes

### Important Reminders

- **Nothing is wired in this task.** That is what makes it safe to get the multi-board and
  option-id questions wrong the first time.
- `--dry-run` must not run `item-add`. Assert it by stubbing `gh`; a comment is not a guarantee.
- Do not reuse the `startswith("P2")` trick from `set-github-project-priority.sh`. Prefix matching is
  what makes `In Review` match `In Review (blocked)`.

### Known Issues

**Open** (non-blocking):

- ⚠️ `project.yml` remains a second, separate config file. Documenting it is in scope; consolidating
  it is not.

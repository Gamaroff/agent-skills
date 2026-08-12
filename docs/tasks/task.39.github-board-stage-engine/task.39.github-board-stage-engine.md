---
id: task.39
title: "gh-stage.js — a GitHub Projects board engine driven by the workflow ladder"
type: task
description: "Add a deterministic CLI that sets a GitHub Projects v2 Status field from the tracker-workflow ladder, with a mandatory backward-move guard and a read-only board probe. Nothing is wired to it yet."
tags: [github, projects-v2, pipeline, workflow]
category: infrastructure
status: ready-for-review
priority: High
created: 2026-08-03
updated: 2026-08-12
assignee:
estimated_effort_hours: 16
github_issue: 187
---

# Technical Task: `gh-stage.js` — a GitHub Projects board engine

**Status:** Ready for Review

**Review**: ✅ All review recommendations from `task.39.review.1.github-board-stage-engine.md` implemented 2026-08-12

**GitHub Issue:** [#187](https://github.com/Gamaroff/agent-skills/issues/187)

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
   `skills/finalise/SKILL.md:1152` uses case-**sensitive** `name == "Done"`. Step 4 line 182
   computes `BOARD_NUM` and never uses it.
3. **Nothing prevents a backward move.** Jira's workflow graph refuses illegal transitions; a
   Projects v2 single-select has no graph at all, so `updateProjectV2ItemFieldValue` will cheerfully
   move a card from Done back to In Progress. A resumed run does exactly that.
4. **The post-condition check gives false passes.**
   `develop-pipeline-step-0-resolve-and-prepare.md:497` tests `[ "$BOARD_STATUS" = "Todo" ]`, so a
   board whose first column is "Backlog" reports "✅ Post-condition verified" after a failed move.
5. **The built-in ladder does not cover GitHub's default first column.** `DEFAULT_LADDER`
   (`shared/resources/tracker-workflow.js:82-84`) has `"To Do"` (with a space) on rung 0; GitHub's
   default column is `"Todo"`. An unconfigured board's starting column is unranked, so the guard
   silently has no opinion there — which on GitHub means no protection at all, since the ladder is
   the only brake.

   > The Jira-side `DEFAULT_STATUS_RANK` (`shared/resources/jira-sync.js:1874`) has the same gap, but
   > it is **not** the constant that governs this CLI: `gh-stage.js` is barred from importing
   > `jira-sync.js` (see §9 Code Quality), so `rankOf` reaches `DEFAULT_LADDER` and nothing else. Any
   > fix belongs in `tracker-workflow.js`. **Adding `"Todo"` to rung 0 is out of scope here** — it
   > changes the default ladder for Jira consumers too, and belongs with the ladder, not with this
   > CLI. It is recorded under Known Issues.

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

- [x] Arg parsing mirroring `jira-stage.js` (`--issue`, `--stage`, `--json`, `--quiet`, `--dry-run`,
      `--strict`, `--allow-regress`, `--board`, `--field`)
- [x] `resolveOption(options, candidates, current)` — pure: already-check, then exact
      case-insensitive, emoji-stripped match per candidate in order, then `no-option`. **No** prefix
      matching, no fuzzy matching, no category analogue
- [x] Exit-code table and the top-level `.catch` that still exits 0
- [x] `no-credentials` when `gh` is absent or `gh auth status` fails — a dead end, not a handoff

**Dependencies**: task.37

---

### Phase 2: Board read, guard, and mutation

**Risk Level**: Medium

**Files**: `shared/resources/gh-stage.js`

**Changes**:

- [x] Single GraphQL read fetching item id, project id/title, the Status field id and all options,
      **and the current value** — steps 0/4/7 do not fetch the current value today, so this is a
      real addition
- [x] Multi-board rule: one board → use it; several → `--board`, else `github.projectBoard`, else
      `project.yml`'s `project_board_number`/`project_board_name`, else skip with
      `reason: "ambiguous-board"` naming the candidates. Never fan a status change out to boards
      nobody asked about
- [x] Backward-move guard from ladder rank; unranked either side → no opinion, allow
- [x] `updateProjectV2ItemFieldValue`, then re-read and report the landed option
- [x] Wrap mutations in `tracker_call_with_retry`-equivalent backoff (the shell helper wraps
      `gh issue` calls but no board mutation today)
- [x] `ensureOnBoard` behind `--add-to-board`: `gh project item-add`, `sleep 3`, retry-once-after-5s
      when `projectItems` returns empty — real Projects API propagation behaviour, not scaffolding

**Dependencies**: Phase 1

---

### Phase 3: `--dry-run` and `--probe-board`

**Risk Level**: Medium

**Files**: `shared/resources/gh-stage.js`

**Changes**:

- [x] `--dry-run` performs the read and the guard, prints the intended option, and issues **no**
      mutation and **no** `gh project item-add`. Today's step-0 block runs `item-add` *before* its
      read query, so a naive port would write during a read-only check. Print
      `would add issue #N to board X` instead
- [x] Skip output names the options the board *did* offer, plus the `describeAlternatives` analogue
      (`jira-stage.js:127`) — "Ready for Showcase is present and is the target for moment
      `pr-merged`"
- [x] `--probe-board`: enumerate boards, Status options in **board order**, and per moment the
      resolved option or `no-option`
- [x] `--write-ladder`: derive ladder order from board option order — a Projects board's option
      order *is* its workflow order. Preserve an existing ladder; never overwrite silently

**Dependencies**: Phase 2

---

### Phase 4: Fixtures and tests

**Risk Level**: Low

**Files**: `shared/resources/tests/gh-stage.test.mjs` (new),
`shared/resources/tests/fixtures/gh-*.json` (new)

**Changes**:

- [x] Capture real `projectItems` responses; document the exact query and trimming rule in the test
      header, as `jira-stage-fixtures.test.mjs:1-29` does, so they can be re-captured
- [x] Fixtures, each pinning one real failure: two boards with a `Done` option carrying **different**
      option ids; an issue on two boards; a board with non-default columns; a board with no `Status`
      field; `nodes: []`; an option named `done` beside one named `Done`; `fieldValueByName: null`;
      and a mutation error envelope
- [x] Assert `--dry-run` issues no non-GET verb by stubbing the `gh` invocation — a comment is not
      enough

**Dependencies**: Phases 1-3

---

## 7. Files Summary

### Files Added (Core Implementation)

1. ✅ `shared/resources/gh-stage.js` — **new**, 1,044 lines

### Files Added (Tests)

2. ✅ `shared/resources/tests/gh-stage.test.mjs` — **new**, 50 tests
3. ✅ `shared/resources/tests/fixtures/gh-bespoke-columns.json` — **new**
4. ✅ `shared/resources/tests/fixtures/gh-done-case-variants.json` — **new**
5. ✅ `shared/resources/tests/fixtures/gh-issue-on-two-boards.json` — **new**
6. ✅ `shared/resources/tests/fixtures/gh-mutation-error.json` — **new**
7. ✅ `shared/resources/tests/fixtures/gh-no-status-field.json` — **new**
8. ✅ `shared/resources/tests/fixtures/gh-not-on-board.json` — **new**
9. ✅ `shared/resources/tests/fixtures/gh-status-unset.json` — **new**
10. ✅ `shared/resources/tests/fixtures/gh-two-boards-done-ids.json` — **new**

### Files Modified (Documentation)

11. ✅ `docs/reference/tracker-workflow.md` — new `## GitHub execution semantics` section; the
    top-of-file status note corrected (it said GitHub execution was still pending)
12. ✅ `docs/reference/configuration.md` — `github.projectStatusField` and `github.projectBoard` in
    the schema block and the key-reference table; new `## GitHub board status field` and
    `## project.yml — board identity` sections; `GH_PROJECT_STATUS_FIELD` in the env-var table
13. ✅ `CHANGELOG.md` — `### Added`

### Files Modified (This task's own documents)

14. ✅ `task.39.github-board-stage-engine.md` — citation fixes from the Step 2 review; checkboxes
15. ✅ `task.39.plan.github-board-stage-engine.md` — citation fixes; the `candidates` source paragraph

### Files Deleted

None in this task. Task.40 deletes the inline GraphQL.

### Not modified (deliberately)

- `package.json` — the `shared/resources/tests/*.test.mjs` glob already covers the new suite.
- The five pipeline step files — task.40 wires them. Nothing calls `gh-stage.js` yet.
- `shared/resources/tracker-workflow.js` — the `"Todo"` ladder gap (Motivation #5) is deferred; see
  Known Issues.
- Bundled `skills/*/references/` — `npm run bundle` was run and reported no drift, because no skill
  references `gh-stage.js` yet.

---

## 8. Testing Strategy

### Unit Tests

**Scope**: `resolveOption` and the guard, against captured `fields.nodes` payloads

**Actions**:

- [x] Exact case-insensitive match; `done` and `Done` both resolve
- [x] Emoji-stripped (`🚧 In Progress`)
- [x] Candidates tried in order; first hit wins
- [x] **No** prefix matching — `In Review` must not match `In Review (blocked)`
- [x] No option → `no-option` with the offered options listed
- [x] Guard refuses a lower-ranked target; unranked either side allows; `--allow-regress` overrides

**Command**: `node --test 'shared/resources/tests/gh-stage.test.mjs'`

---

### Integration Tests

**Scope**: board resolution and the read/mutate cycle, with `gh` stubbed

**Actions**:

- [x] Single board → used directly
- [x] Two boards, no hint → `ambiguous-board`, naming both
- [x] Two boards + `--board` / `github.projectBoard` / `project.yml` → correct one chosen
- [x] `nodes: []` → `not-on-board`
- [x] No Status field → skip, not a crash
- [x] Mutation error envelope → retried, then a warning and exit 0

---

### Contract Tests

**Scope**: the drop-in contract task.40 depends on

**Actions**:

- [x] Every documented reason exits 0; only `--strict` yields 1; usage errors yield 2
- [x] An unhandled throw exits 0
- [x] `--dry-run` issues **no** mutation and **no** `item-add` — asserted by stubbing `gh` and
      failing on any non-GET verb
- [x] Flag surface matches `jira-stage.js` where the concept exists

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

- [x] `--probe-board` against this repo's own board 1 ("Agent Skills")
- [x] `--dry-run` for every moment against one real issue
- [ ] A scratch Projects v2 board with bespoke column names — free and disposable, and the honest
      pre-adoption ritual

  > **Not performed — left for the operator.** This one requires creating a real GitHub Projects v2
  > board on the account, which is an outward-facing change this task has no mandate to make. It is
  > also the least load-bearing of the three: `gh-bespoke-columns.json` pins exactly this shape
  > (`Backlog / In Development / Ready for Showcase / Shipped`) as a fixture, and the suite asserts
  > that a bespoke board resolves through its own ladder, refuses a backward move on it, and reports
  > `no-option` against a ladder it cannot serve. What a live scratch board would add over the fixture
  > is confidence that the *capture* is faithful — worth doing before adopting this on a real board,
  > which is why it stays listed here as the pre-adoption ritual rather than being deleted.

---

## 9. Success Criteria

### Functional

- [x] `--probe-board` prints the board's real options in board order and each moment's resolution —
      verified against this repo's live board 1: `Todo → In Progress → Done`, `work-started →
      "In Progress"`, `done → "Done"`, the six undeclared moments `disabled`
- [x] `--write-ladder` produces a ladder that round-trips through `tracker-workflow.js` — asserted by
      loading the written file back through `loadWorkflow` and comparing rung names
- [x] The guard refuses a backward move and `--allow-regress` overrides it
- [x] `no-option` names the options the board offered (returned as `offered`, and printed)
- [x] `--dry-run` provably issues no write — asserted by a `gh` stub that fails on any argv containing
      `item-add` / `mutation` / `--method` / `-X`, **and** confirmed against the live board: all eight
      moments dry-run, board still reads `In Progress` afterwards

### Performance

- [x] One read + one mutation + one verify read per move — measured on a stubbed run: 3 `gh api`
      calls, of which 2 reads and 1 mutation
- [x] `item-add` only under `--add-to-board` — measured as 0 in the same run

### Code Quality

- [x] Depends on `tracker-workflow.js` only — **not** on `jira-sync.js`, so GitHub-only consumers
      never bundle ~3,100 lines of Jira code. Asserted by a test that greps the module's own
      `require()` calls. **One deviation from the literal wording, deliberate:** it also requires
      `./yaml-subset.js`, a 140-line dependency-free YAML reader that `tracker-workflow.js` already
      pulls in transitively. It adds nothing to the bundle and is what lets config be read without
      shelling out to python-or-awk the way `set-github-project-estimate.sh:29-61` does. The
      criterion's actual purpose — no Jira code — is met exactly.
- [x] Always exits 0 outside `--strict`/usage; never throws out
- [x] Single matching discipline; no prefix matching anywhere
- [x] New tests under an already-globbed directory — `package.json`'s existing
      `shared/resources/tests/*.test.mjs` glob picked the file up with no `package.json` change

### Migration

- [x] `configuration.md` documents both new keys **and** `project.yml`, which has never been
      documented there
- [x] `tracker-workflow.md` states the no-graph asymmetry explicitly (new
      `## GitHub execution semantics` section, plus the corrected status note at the top)
- [x] `CHANGELOG.md` `### Added` entry

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

- [x] Arg parsing and exit-code table
- [x] Pure `resolveOption`
- [x] `no-credentials` handling

### Phase 2: Read, guard, mutate

- [x] Single read including current value
- [x] Multi-board rule
- [x] Backward-move guard
- [x] Mutation + verify + retry
- [x] `ensureOnBoard`

### Phase 3: `--dry-run` + `--probe-board`

- [x] Provably write-free dry run
- [x] Alternatives hint on skip
- [x] Probe and `--write-ladder`

### Phase 4: Fixtures and tests

- [x] 8 captured fixtures with a documented capture recipe
- [x] Unit, integration and contract suites

---

## References

- **Depends on**: task.37 (`tracker-workflow.js`)
- **Consumed by**: task.40 (step-file wiring)
- **Template**: `shared/resources/set-github-project-priority.sh`,
  `set-github-project-estimate.sh` — the behavioural shape (always `exit 0`, env → config → default)
- **Contract source**: `shared/resources/jira-stage.js:21-27` (exit codes), `:127`
  (`describeAlternatives` — defined there, called at `:448` and `:513`)
- **Current inline blocks**: `develop-pipeline-step-0-resolve-and-prepare.md:364-504`,
  `-step-4-create-pr.md:178-238`, `-step-5-6-qa-loop.md:43-106`, `-step-7-finalise.md:165`,
  `skills/finalise/SKILL.md:1114-1195` (case-sensitive `Done` match at `:1152`)

---

## Implementation Record

**Started**: 2026-08-12 · **Completed**: 2026-08-12 · **Branch**: `feature/task.39.github-board-stage-engine`

### Implementation Summary

`shared/resources/gh-stage.js` (1,044 lines) is a CommonJS CLI isomorphic to `jira-stage.js`, resolving
a pipeline moment's target from the `tracker-workflow.yaml` ladder and setting a GitHub Projects v2
single-select Status field. All four phases landed; nothing is wired to it, as scoped.

### Implementation Approach

**Phase 1 — `resolveOption` and the skeleton.** `parseArgs` mirrors `jira-stage.js:49-115` including
the `default:` clause that throws on any unrecognised `-` prefix. `resolveOption(options, candidates,
current)` is pure and ~12 lines: already-check, then exact `eqName` match per candidate in order, then
`no-option`. `eqName`/`stripStatusEmoji` come from `tracker-workflow.js`. `no-credentials` is `gh auth
status` returning non-zero — one warning, exit 0, and the message does not imply a fallback exists,
because none does.

**Phase 2 — read, guard, mutate.** One GraphQL read returns item id, project id/title/number, the
Status field id, every option in board order, **and the current value** — the last of which steps 0/4/7
do not fetch today and is what makes a guard possible at all. `--issue` is validated numeric before it
reaches the query builder. `selectBoard` implements the never-fan-out precedence. The guard compares
`tw.rankOf(current)` against `tw.rankOf(target)`, allowing when either is `null`. The mutation is
wrapped in a local 3×/1s/2s retry (`tracker_call_with_retry` is shell-only and cannot wrap a JS call),
then the item is re-read so the reported status is the option that **landed**, not the one requested.

**Phase 3 — dry-run and probe.** `--dry-run` runs the read and the guard, then stops; under
`--add-to-board` it prints `would add issue #N to board X` rather than performing it. `--probe-board`
mirrors `probeWorkflow`'s three-verdict shape. `--write-ladder` reads the board's option order
straight into `statuses:`.

**Config.** `github.projectStatusField` (env `GH_PROJECT_STATUS_FIELD`) and `github.projectBoard`,
read via `parseYamlSubset` rather than the shell scripts' python-or-awk fallback chain.

### Testing Results

- **`gh-stage.test.mjs`: 50/50 passing** — unit (`resolveOption`, fixtures, `selectBoard`),
  integration (the `run()` flow with `gh` stubbed), contract (exit codes, the write-free dry-run,
  the flag surface, the dependency boundary), plus `--probe-board`/`--write-ladder`,
  `describeAlternatives` and `ensureOnBoard`.
- **Full suite: `npm test` → 1050/1050 passing, 0 failures.** No regressions; this task only adds files.
- **Consumer tests, read-only, against this repo's live board 1 ("Agent Skills"):** `--probe-board`
  reported `Todo → In Progress → Done` with `work-started → "In Progress"` and `done → "Done"`;
  `--dry-run` was run for all eight moments against issue #187 and the board still read `In Progress`
  afterwards — the write-free contract held against a real board, not just a stub.
- **Measured call counts:** 3 `gh api` calls per move (2 reads + 1 mutation), 0 `item-add` without
  `--add-to-board`.

### One bug found and fixed during development

`--write-ladder` wrote a correct file that then read back as the built-in default ladder. The cause
was not the writer: `run()` calls `tw.loadWorkflow()` before the file exists, which memoises the
default under that exact absolute path in `tracker-workflow.js`'s parse cache, and `writeLadder`
created the file without invalidating it — so any process that probes, writes and then reads sees the
pre-write ladder forever. That is the cache's own documented failure mode
(`tracker-workflow.js:392-393`). Fixed by calling the exported `tw.clearWorkflowCache()` on the
success branch of `writeLadder`. Fixing it in the test instead would have left the bug live for every
real caller.

### Deferred Work

- Adding `"Todo"` to `DEFAULT_LADDER` rung 0 — deliberately out of scope; see Known Issues.
- Wiring the five inline GraphQL blocks to this CLI — task.40, as scoped.

---

## Change Log

| Date | Change | Author |
| --- | --- | --- |
| 2026-08-03 | Task authored | Claude |
| 2026-08-12 | `/review-task` — 9/10 READY TO IMPLEMENT. Five wrong `file:line` citations corrected across the task and plan; Motivation #5 rewritten to name `DEFAULT_LADDER` rather than the unreachable `DEFAULT_STATUS_RANK`, with the `"Todo"` fix explicitly scoped out and recorded under Known Issues | Claude |
| 2026-08-12 | Phases 1–4 implemented: `gh-stage.js`, 50 tests, 8 fixtures. `tracker-workflow.md` gains `## GitHub execution semantics`; `configuration.md` gains both new keys plus a `project.yml` section; `CHANGELOG.md` `### Added`. Fixed a stale-parse-cache bug in `--write-ladder`. `npm test` 1050/1050 | Claude |

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
- ⚠️ `DEFAULT_LADDER` rung 0 (`tracker-workflow.js:82-84`) lacks `"Todo"`, GitHub's default first
  column — see Motivation #5. Deliberately **not** fixed here: it is a change to the shared default
  ladder that Jira consumers also read, so it belongs with the ladder rather than with this CLI. The
  practical consequence for `gh-stage.js` is bounded and worth stating plainly: on a board that still
  uses GitHub's stock `Todo` column and declares no `tracker-workflow.yaml`, `rankOf("Todo")` returns
  `null`, so the backward-move guard allows every move out of that column. Any board that declares a
  ladder — the case this task exists to serve — is unaffected. A `--probe-board` run surfaces it,
  because the column shows up in the board's option list but carries no rank.

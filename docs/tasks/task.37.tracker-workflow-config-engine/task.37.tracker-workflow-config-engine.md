---
id: task.37
title: "tracker-workflow.yaml — a consumer-owned status ladder the pipelines read"
type: task
description: "Introduce a hand-authored tracker-workflow.yaml in the consumer repo declaring the project's statuses in order and which status each pipeline moment targets, plus the tracker-agnostic engine that loads, overlays and resolves it."
tags: [configuration, jira, github, pipeline, yaml]
category: infrastructure
status: planned
priority: High
created: 2026-08-03
updated: 2026-08-03
assignee:
estimated_effort_hours: 16
github_issue: 185
---

# Technical Task: `tracker-workflow.yaml` — a consumer-owned status ladder

**Status:** Planned

**GitHub Issue:** [#185](https://github.com/Gamaroff/agent-skills/issues/185)

---

## 1. Overview

Consumer projects run boards with bespoke columns — "Ready for Showcase", "Waiting for merge",
"Ready for Testing" — that the develop pipelines cannot be told about. This task introduces a
single hand-authored file in the consumer repo, `tracker-workflow.yaml`, which declares the
project's statuses **in order** and maps each pipeline moment to one of them; plus the
tracker-agnostic engine that loads, overlays and resolves it.

Ordering is the key idea: it yields status rank (so a resumed run cannot drag a card backwards) and
the path a card walks to reach a rung further up — with no graph to author.

**Scope**: the file format, the parser, the resolution engine, the built-in default ladder, and
tests. **No pipeline behaviour changes in this task** — nothing calls the engine yet.

---

## 2. Motivation

### Current Problems

1. **Statuses are effectively baked into the skills.** The GitHub board moves hardcode option names
   as literal `jq` matches; the Jira side has a JSON "workflow record" that no consumer has, no
   example checked in, and no mention in the develop-* skills.
2. **Three config surfaces describe overlapping things.** `jira.statusMap` (document statuses),
   `jira.workflowRecord` (pipeline stages), and hardcoded GitHub literals. A consumer must learn
   which of three places to edit, and two of them are Jira-only.
3. **Bespoke columns are unranked, so the backward-move guard silently has no opinion.**
   `DEFAULT_STATUS_RANK` is derived from the built-in candidate lists, so a column like
   `READY FOR SHOWCASE` returns `null` from `resolveStatusRank` — and a resumed run re-firing an
   earlier moment will happily pull a card back out of it.
4. **Multi-hop workflows cannot be expressed.** `resolveTransition` does exactly one hop. A board
   where Done is only reachable via a showcase column skips — and because moves resolve from
   wherever the card sits, one missed hop disables every moment after it.
5. **The repo has five independent hand-rolled YAML readers**, none shared, each with its own
   comment handling and nesting depth.

### Benefits

1. **One file, one place to look.** A consumer declares its workflow once and both trackers use it.
2. **Order is rank, for free.** No `statusRank` block to hand-author, and bespoke columns become
   guarded rather than unguarded.
3. **Order is also the path.** Walking a ladder needs no transition graph — the rungs between
   current and target are already declared.
4. **Omission is disablement.** No `enabled: false` blocks and no `defaultEnabled` to reason about;
   a moment absent from `pipeline:` simply does not fire.
5. **Off-ladder side-states are free.** Anything targeted but not listed in `statuses` is a
   side-state — no second list to keep in sync.
6. **One fewer YAML parser.** `parseYamlSubset` is promoted out of `develop-batch` and shared.

---

## 3. Technical Background

### Current Architecture

```
skills-config.yaml   jira.statusMap ──► loadStatusMap ──► DEFAULT_STATUS_MAP   (document statuses)
skills-config.yaml   jira.workflowRecord ──► loadWorkflowRecord ──► DEFAULT_STAGE_MAP  (pipeline)
                                                     └─ statusRank (hand-authored, usually absent)
step markdown        literal "in progress" / "in review" / "done" jq matches   (GitHub, unconfigurable)
```

Five readers parse `skills-config.yaml`: `resolve-platform.sh` `read_config_key` (top-level
scalars), `resolve-paths.sh` `read_nested_config_key` (two levels),
`set-github-project-estimate.sh` `resolve_field_name`, `jira-sync.js`
`parseStatusMapBlock`/`parseJiraScalar`, and `develop-batch/scripts/schedule.mjs`
`parseYamlSubset` — the most capable, handling nested maps, lists of maps, lists of scalars and
quote-aware comment stripping.

### Target Architecture

```
tracker-workflow.yaml  ──► yaml-subset.js ──► tracker-workflow.js
                                                 ├─ ladder: [status, …]         → rank = index
                                                 ├─ pipeline: moment → status   → target
                                                 ├─ byIssueType overlay          (Jira only)
                                                 ├─ documentStatus: local → status
                                                 └─ planMove(from, to)          → ordered hops
```

The file:

```yaml
# The ladder, in board order. Order IS the workflow.
statuses:
  - Backlog
  - Selected for Development
  - In Progress
  - Waiting for Review
  - Ready for Testing
  - Ready for Showcase
  - Done

# Which status each pipeline moment targets. Omit a moment to disable it.
# A status named here but absent from `statuses` is an off-ladder side-state.
pipeline:
  work-started: In Progress
  in-review: Waiting for Review
  in-qa: Ready for Testing
  pr-merged: Ready for Showcase
  blocked: Blocked
  done: Done

# Local document status -> board status, for /sync-jira-*. Optional.
documentStatus:
  ready-for-development: Selected for Development
  in-progress: In Progress
  ready-for-review: Waiting for Review
  accepted: Done
  cancelled: Cancelled

# Optional per-issue-type overlay. Jira only; keyed on the LIVE issue type name.
byIssueType:
  "IT / DevOps Task":
    statuses: [Selected for Development, In Progress, In Review, Done]
    pipeline:
      in-qa: ~
```

### Important Clarifications

- **YAML, not JSON.** The file is hand-authored and its comments carry the intent that makes it
  maintainable ("we stop at Showcase; a human moves to Done"). JSON has no comments. It also
  matches `skills-config.yaml`, so a consumer learns one format. `yq` stays rejected as a
  dependency — `parseYamlSubset` already handles this shape.
- **The engine is pure.** No HTTP, no `gh`, no Jira vocabulary. Tracker-specific execution lands in
  task.38 (Jira) and task.39 (GitHub).
- **Moments are a closed set** because they are lines of code in step files. Config chooses which
  status each moment targets, never invents a new moment.
- **Missing file is not an error.** It resolves to a built-in default ladder reproducing today's
  behaviour exactly, plus one warning line naming the scaffolder.

---

## 4. Scope

### In Scope

✅ **File format**: `tracker-workflow.yaml` at consumer repo root; path overridable via
`tracker.workflowFile` in `skills-config.yaml`.
✅ **Shared parser**: promote `parseYamlSubset` from `skills/develop-batch/scripts/schedule.mjs:68`
into `shared/resources/yaml-subset.js`; `schedule.mjs` requires it thereafter.
✅ **Engine** `shared/resources/tracker-workflow.js`: load, parse, validate, `byIssueType` overlay,
rank-from-order, `resolveMoment`, `planMove`, `resolveDocumentStatus`.
✅ **Built-in defaults**: a default ladder that reproduces current behaviour when no file exists.
✅ **Moment vocabulary**: the existing six (`work-started`, `in-review`, `in-qa`,
`ready-for-merge`, `blocked`, `done`) exported as the closed set. The two new moments
(`changes-requested`, `pr-merged`) are declared here but **wired in task.41**.
✅ **Tests**: parser, engine, ladder ordering, off-ladder side-states, overlay, default snapshot.

### Out of Scope

❌ **Any pipeline behaviour change** — nothing calls the engine in this task. Jira execution is
task.38; GitHub is task.39; step-file wiring is task.40.
❌ **Scaffolding the file into a consumer repo** — task.41.
❌ **Removing `jira.statusMap` or `jira.workflowRecord`** — both keep loading, at lower precedence.
❌ **Consolidating the other four YAML readers** — only `parseYamlSubset` moves.
❌ **`project.yml`** — board identity, different lifetime, deliberately untouched.

---

## 5. Breaking Changes

**None.** Nothing calls the engine yet, and `parseYamlSubset`'s promotion is a file move with an
unchanged signature.

### Non-breaking precedence change (introduced, not activated)

`tracker-workflow.yaml` > `jira.workflowRecord` > `jira.statusMap` > built-in defaults.

**Impact**: no existing consumer has the new file, so every one resolves exactly as today.

**Migration path**: none required. Task.41 adds `--init-workflow`, which converts an existing JSON
workflow record into the YAML file so migration is one command.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.37.plan.tracker-workflow-config-engine.md](task.37.plan.tracker-workflow-config-engine.md)

### Phase 1: Promote the YAML parser

**Risk Level**: Low

**Files**:

- `shared/resources/yaml-subset.js` (new)
- `skills/develop-batch/scripts/schedule.mjs`

**Changes**:

- [ ] Move `parseYamlSubset` verbatim into `shared/resources/yaml-subset.js`, keeping its
      "deliberately NOT a general YAML parser" header comment
- [ ] `schedule.mjs` imports it; delete the local copy
- [ ] Confirm `develop-batch`'s existing suites pass unchanged

**Dependencies**: none

---

### Phase 2: The engine

**Risk Level**: Medium

**Files**:

- `shared/resources/tracker-workflow.js` (new)

**Changes**:

- [ ] `loadWorkflow({ repoRoot })` — resolve path from `tracker.workflowFile`, else
      `tracker-workflow.yaml` at root; parse; return the built-in default on any failure, with a
      `source` field recording which was used
- [ ] `rankOf(status, workflow)` — index in `statuses`, `null` for off-ladder
- [ ] `resolveMoment(moment, workflow, { issueType })` — apply the `byIssueType` overlay, return
      `{ target, rank, offLadder }` or `null` when the moment is absent
- [ ] `planMove(from, to, workflow)` — the ordered rungs strictly between, for ladder walking
- [ ] `resolveDocumentStatus(local, workflow)` — `documentStatus:` lookup
- [ ] `validateWorkflow(workflow)` — unknown moments, duplicate rungs, a `pipeline` target that is
      neither a rung nor plausibly a side-state; returns warnings, never throws
- [ ] Built-in default ladder reproducing today's behaviour
- [ ] Case-insensitive, emoji-stripped matching throughout

**Dependencies**: Phase 1

---

### Phase 3: Tests

**Risk Level**: Low

**Files**:

- `shared/resources/tests/tracker-workflow.test.mjs` (new)

**Changes**:

- [ ] Parser: nested maps, lists, comments, quoted keys with spaces (`"IT / DevOps Task"`), `~`/null
- [ ] Rank from order; off-ladder returns `null`
- [ ] `planMove` returns rungs strictly between, in order, and `[]` when already at target or moving
      backwards
- [ ] Overlay: `byIssueType` replaces `statuses` and can null out a moment
- [ ] Omitted moment → `null` (disabled)
- [ ] **Default-ladder snapshot** — the compatibility contract in executable form
- [ ] Missing / unreadable / malformed file → defaults, never a throw

**Dependencies**: Phase 2

---

### Phase 4: Documentation

**Risk Level**: Low

**Files**:

- `docs/reference/tracker-workflow.md` (new)
- `docs/reference/configuration.md`
- `assets/tracker-workflow.default.yaml` (new)
- `AGENTS.md`

**Changes**:

- [ ] New reference page: the format, the three properties (order is rank, omission is
      disablement, off-ladder is free), the moment table, worked examples for a bespoke column as
      a gate, as a terminal, and as an off-ladder state
- [ ] `configuration.md`: `tracker.workflowFile` key row, precedence order, cross-links
- [ ] Shipped default template, annotated
- [ ] `AGENTS.md`: one TL;DR line under Configuration

**Dependencies**: Phase 2

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/yaml-subset.js` — **new**; promoted parser
2. ✅ `shared/resources/tracker-workflow.js` — **new**; the engine
3. ✅ `skills/develop-batch/scripts/schedule.mjs` — import the promoted parser

### Files to Modify (Tests)

4. ✅ `shared/resources/tests/tracker-workflow.test.mjs` — **new**

### Files to Modify (Dependencies)

None — no new runtime dependency. `package.json` test globs already cover
`shared/resources/tests/*.test.mjs`.

### Files to Modify (Documentation)

5. ✅ `docs/reference/tracker-workflow.md` — **new**
6. ✅ `assets/tracker-workflow.default.yaml` — **new**
7. ✅ `docs/reference/configuration.md` — key row, precedence, cross-links
8. ✅ `AGENTS.md` — TL;DR line
9. ✅ `CHANGELOG.md` — `### Added`

### Files to Delete

None. The local `parseYamlSubset` in `schedule.mjs` is replaced by an import, not deleted outright.

---

## 8. Testing Strategy

### Unit Tests

**Scope**: parser and engine in isolation — both are pure

**Actions**:

- [ ] Parse the shipped default template and every worked example in the reference doc
- [ ] Quoted keys containing `/` and spaces round-trip (`"IT / DevOps Task"`)
- [ ] `~`, `null` and empty values all mean "disabled"
- [ ] Comments and inline comments stripped without eating quoted `#`
- [ ] `rankOf` / `planMove` / `resolveMoment` / `resolveDocumentStatus` across the ladder
- [ ] Emoji-stripped, case-insensitive matching (`🚧 In Progress`, `READY FOR SHOWCASE`)

**Command**: `node --test 'shared/resources/tests/*.test.mjs'`

**Target**: every exported function exercised; every failure mode returns defaults rather than
throwing.

---

### Integration Tests

**Scope**: the engine composes with the existing config readers

**Actions**:

- [ ] `tracker.workflowFile` resolves via the same mechanism other nested keys use
- [ ] A repo with no file, an unreadable file, and a malformed file each yield the default ladder
- [ ] `develop-batch`'s `schedule.mjs` suites pass with the imported parser

**Command**: `npm test`

---

### Contract Tests

**Scope**: the compatibility promise

**Actions**:

- [ ] The default-ladder snapshot test pins the built-in defaults literally — any future change to
      them fails loudly
- [ ] `parseYamlSubset`'s exported signature is unchanged after promotion

---

### Performance Tests

**Scope**: the file is read once per pipeline step

**Metrics**: parse time for a 100-rung ladder.

**Baselines**: none needed — `parseYamlSubset` already parses `skills-config.yaml` on every
`develop-batch` run.

**Expectations**: sub-millisecond; cache the parse per process.

---

### Consumer Tests

**Scope**: this repo dogfoods the format

**Actions**:

- [ ] Author a `tracker-workflow.yaml` for this repo's own GitHub board and confirm it parses and
      resolves — without wiring it to anything

---

## 9. Success Criteria

### Functional

- [ ] A valid `tracker-workflow.yaml` parses and every exported function resolves against it
- [ ] Missing / unreadable / malformed file yields the built-in default ladder, never a throw
- [ ] `byIssueType` overlays `statuses` and can disable a moment
- [ ] An omitted moment resolves to `null`; a target absent from `statuses` is off-ladder
- [ ] `npm test` passes with all existing suites unchanged

### Performance

- [ ] Parse is cached per process; at most one file read per run
- [ ] No measurable change to `develop-batch` scheduling time after the parser move

### Code Quality

- [ ] Engine is pure — no `require` of `jira-sync.js`, no HTTP, no `gh`, no `execSync` except an
      injectable `repoRoot`
- [ ] Swallow-everything discipline matches `loadWorkflowRecord`
- [ ] New tests live under an already-globbed directory
- [ ] `npm run bundle` regenerates cleanly

### Migration

- [ ] `docs/reference/tracker-workflow.md` documents all three bespoke-column shapes
- [ ] `configuration.md` states the precedence order
- [ ] `CHANGELOG.md` `### Added` entry in house style
- [ ] Shipped default template is byte-equal to the one the reference doc shows

---

## 10. Risk Assessment

### High Risk Areas

**1. The default ladder does not actually reproduce current behaviour**

- **Risk**: the built-in default is the compatibility contract for every consumer with no file. If
  it differs from today's candidate lists in any way, every unconfigured consumer changes behaviour
  the moment tasks 38–40 land.
- **Probability**: Medium — the current defaults are *candidate lists* (several names per moment),
  whereas a ladder has one status per rung. Collapsing lists to a ladder is a real modelling
  decision, not a transcription.
- **Impact**: Critical
- **Mitigation**: the default ladder must keep candidate *lists* per rung internally — the ladder
  is ordered, but a rung may carry alternatives. Pin it with a literal snapshot test. Land tasks
  38-40 only after that snapshot exists.
- **Rollback**: the engine is unwired in this task, so a wrong default cannot reach a board.

### Medium Risk Areas

**1. `parseYamlSubset` cannot express something the format needs**

- **Risk**: its header says "no anchors, no multi-line strings, no flow collections" — but the
  worked examples use flow sequences (`statuses: [A, B, C]`).
- **Probability**: Medium
- **Impact**: Major
- **Mitigation**: verify flow-sequence support before designing around it; if absent, either add it
  narrowly or restrict the documented format to block sequences. Decide in Phase 1, not Phase 3.
- **Rollback**: restrict the format; block sequences alone are sufficient.

**2. Quoted keys with special characters**

- **Risk**: `byIssueType` keys are live Jira issue type names like `"IT / DevOps Task"`.
- **Probability**: Medium
- **Impact**: Major (a misparsed key silently drops a whole overlay)
- **Mitigation**: explicit test; fail validation loudly on an unparseable key rather than dropping it.

### Low Risk Areas

**1. Bundle fan-out**

- **Risk**: two new shared files get copied into every skill that bundles them.
- **Probability**: High
- **Impact**: Minor — both are small, and `bundle_skill.py`'s sibling-require following handles them
- **Mitigation**: keep the engine dependency-free so GitHub-only consumers never pull `jira-sync.js`.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:

- `develop-batch` scheduling regressions after the parser move
- Any existing suite fails

**Steps**:

1. Revert the `schedule.mjs` import hunk, restoring the local `parseYamlSubset`
2. `npm test`
3. Leave `tracker-workflow.js` in place — it is unwired and inert

**Verification**: `npm test` green; a `develop-batch --dry-run` selects the same items as before.

---

### Partial Rollback (1-2 hours)

**When to Use**: the engine's modelling is wrong but the parser promotion is sound. Revert only
`tracker-workflow.js` and its tests; keep `yaml-subset.js`, which is independently useful.

---

### Forward Fix (< 4 hours)

**When to Use**: format additions, validation wording, documentation gaps. The engine is unwired, so
almost everything here is a forward fix.

---

### Rollback Triggers

**Critical (Immediate Rollback)**: `develop-batch` selects differently; any existing test fails.

**Non-Critical (Forward Fix)**: format expressiveness gaps, validation messages, docs.

---

## Progress Tracking

### Phase 1: Promote the YAML parser

- [ ] `shared/resources/yaml-subset.js` created
- [ ] `schedule.mjs` imports it; local copy removed
- [ ] Flow-sequence support confirmed or format restricted
- [ ] `develop-batch` suites pass unchanged

### Phase 2: The engine

- [ ] `loadWorkflow`, `rankOf`, `resolveMoment`, `planMove`, `resolveDocumentStatus`
- [ ] `byIssueType` overlay
- [ ] `validateWorkflow`
- [ ] Built-in default ladder

### Phase 3: Tests

- [ ] Parser tests
- [ ] Engine tests
- [ ] Default-ladder snapshot

### Phase 4: Documentation

- [ ] `docs/reference/tracker-workflow.md`
- [ ] `assets/tracker-workflow.default.yaml`
- [ ] `configuration.md` + `AGENTS.md` + `CHANGELOG.md`

---

## References

- **Related Documentation**: [`docs/reference/configuration.md`](../../reference/configuration.md)
- **Source to promote**: `skills/develop-batch/scripts/schedule.mjs:68` (`parseYamlSubset`)
- **Prior art**: `shared/resources/jira-sync.js:1820` (`loadWorkflowRecord`) — the swallow-everything
  contract this engine copies; `:1855` (`resolveStage`) — the overlay shape
- **Downstream tasks**: task.38 (Jira execution), task.39 (GitHub engine), task.40 (step wiring),
  task.41 (scaffolding + new moments)

---

## Notes

### Important Reminders

- **Nothing calls the engine in this task.** Resist wiring it "while you're in there" — the whole
  point of this ordering is that a modelling mistake here cannot reach a real board.
- The default ladder is the compatibility contract. Write its snapshot test first.
- Decide the flow-sequence question in Phase 1. It determines whether the documented examples are
  valid.

### Known Issues

**Open** (non-blocking):

- ⚠️ Four other hand-rolled YAML readers remain after this task. Consolidation is not in scope.

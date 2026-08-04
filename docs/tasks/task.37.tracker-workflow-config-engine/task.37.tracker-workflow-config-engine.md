---
id: task.37
title: "tracker-workflow.yaml — a consumer-owned status ladder the pipelines read"
type: task
description: "Introduce a hand-authored tracker-workflow.yaml in the consumer repo declaring the project's statuses in order and which status each pipeline moment targets, plus the tracker-agnostic engine that loads, overlays and resolves it."
tags: [configuration, jira, github, pipeline, yaml]
category: infrastructure
status: ready-for-review
priority: High
created: 2026-08-03
updated: 2026-08-04
assignee:
estimated_effort_hours: 20
github_issue: 185
---

# Technical Task: `tracker-workflow.yaml` — a consumer-owned status ladder

**Status:** Ready for Review

**Review**: ✅ All review recommendations from `task.37.review.1.tracker-workflow-config-engine.md`
implemented 2026-08-04

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
tracker-workflow.yaml  ──► yaml-subset.js ──► tracker-workflow.js   (both CommonJS)
                                                 ├─ ladder: [rung, …]           → rank = index
                                                 ├─ pipeline: moment → rung     → targets
                                                 ├─ byIssueType overlay          (Jira only)
                                                 ├─ documentStatus: local → status
                                                 └─ planMove(from, to)          → ordered rungs
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
  ready-for-merge: Ready for Showcase
  blocked: Blocked
  done: Done
  # changes-requested and pr-merged are declared by this task but not wired
  # until task.41 — a consumer setting them today gets a no-op, so the shipped
  # template leaves them out.

# Local document status -> board status, for /sync-jira-*. Optional.
documentStatus:
  ready-for-development: Selected for Development
  in-progress: In Progress
  ready-for-review: Waiting for Review
  accepted: Done
  cancelled: Cancelled

# Optional per-issue-type overlay. Jira only; keyed on the LIVE issue type name.
# Block sequences only — parseYamlSubset does not support flow collections
# (`[A, B, C]`), and would silently read one as a plain string.
byIssueType:
  "IT / DevOps Task":
    statuses:
      - Selected for Development
      - In Progress
      - In Review
      - Done
    pipeline:
      in-qa: ~
```

A rung may carry **alternatives**. The plain-string form above is sugar for a one-name rung; the
long form names several acceptable board columns for the same position:

```yaml
statuses:
  - Backlog
  - names: # ← one rung, three acceptable names
      - In Progress
      - Doing
      - Development
  - Done
```

**Block sequence, not flow.** This example originally read `names: [In Progress, Doing, Development]`,
which contradicted the note eight lines above and does not parse: `parseScalar` returns the bracketed
text as a plain string, so the rung would carry one nonsense name and no error would be raised.
Confirmed by running the parser (Phase 1, per §10 Medium Risk 1). Flow collections stay unsupported;
`validateWorkflow` now rejects them with an explicit message rather than letting them through.

This is not decoration — today's defaults are candidate *lists*, and flattening them to one name per
rung would change behaviour for every consumer with no file (see §10, High Risk 1). Internally a rung
is **always** `{ names: [...] }`, `resolveMoment` returns `targets` (plural, in preference order), and
`planMove` returns rungs rather than first-names, so tracker execution in task.38/39 can try
candidates in order the way `resolveTransition` already does.

### Important Clarifications

- **YAML, not JSON.** The file is hand-authored and its comments carry the intent that makes it
  maintainable ("we stop at Showcase; a human moves to Done"). JSON has no comments. It also
  matches `skills-config.yaml`, so a consumer learns one format. `yq` stays rejected as a
  dependency — `parseYamlSubset` already handles this shape.
- **CommonJS, both modules.** `package.json` is `"type": "commonjs"`, every existing
  `shared/resources/*.js` uses `module.exports`, and `bundle_skill.py`'s `JS_SIBLING_RE` follows only
  `require("./x.js")` — an ESM `import` between the engine and the parser would break transitive
  bundling outright. Promotion therefore changes the *export form* (`export function` →
  `module.exports`) even though the body is unchanged.
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
✅ **Shared parser**: promote `parseYamlSubset` and its module-private helpers (`stripComment`,
`parseScalar`, `significantLines`, `parseBlock`) from `skills/develop-batch/scripts/schedule.mjs:172`
into `shared/resources/yaml-subset.js` as CommonJS; `schedule.mjs` imports it thereafter.
✅ **Bundler support for `.mjs`**: `bundle_skill.py` currently walks only `*.md`/`*.js`/`*.sh` and has
no `.mjs` rewrite branch, so `schedule.mjs`'s shared reference would never be bundled or rewritten —
breaking `develop-batch` in every tarball/zip install while `npm test` stays green in-repo. Extend the
walk, the rewrite branch, and the shared-ref regexes to cover `.mjs` + ESM `import`, with a regression
test.
✅ **Engine** `shared/resources/tracker-workflow.js` (CommonJS): load, parse, validate, `byIssueType`
overlay, rank-from-order, `resolveMoment`, `planMove`, `resolveDocumentStatus`.
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

**None.** Nothing calls the engine yet, and `parseYamlSubset`'s promotion preserves its arity and
behaviour. Its export form changes (`export function` → `module.exports`), but the only caller is
`schedule.mjs`, which is updated in the same phase.

### Non-breaking precedence change (introduced, not activated)

`tracker-workflow.yaml` > `jira.workflowRecord` > `jira.statusMap` > built-in defaults.

**Impact**: no existing consumer has the new file, so every one resolves exactly as today.

**Migration path**: none required. Task.41 adds `--init-workflow`, which converts an existing JSON
workflow record into the YAML file so migration is one command.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.37.plan.tracker-workflow-config-engine.md](task.37.plan.tracker-workflow-config-engine.md)

### Phase 1: Teach the bundler `.mjs`, then promote the YAML parser

**Risk Level**: Medium (was Low — the bundler gap makes the swap install-breaking until fixed)

**Files**:

- `skills/create-skill/scripts/bundle_skill.py`
- `tests/bundle-mjs.test.js` (new — bundler regression)
- `shared/resources/yaml-subset.js` (new)
- `skills/develop-batch/scripts/schedule.mjs`

**Changes**:

- [x] **Bundler first, before the swap.** Add `*.mjs` to `bundle_skill.py` Pass 1's `rglob` set; add a
      `.mjs` branch to `rewrite_text`; add an ESM-import regex beside `JS_SHARED_RE` / `JS_SIBLING_RE`
      so `import … from "…/shared/resources/X"` is both collected and rewritten to `../references/X`
- [x] Regression test: a `.mjs` file under `<skill>/scripts/` referencing a shared resource is bundled
      into `<skill>/references/` **and** its import path rewritten
- [x] Move `parseYamlSubset` **and its module-private helpers** (`stripComment`, `parseScalar`,
      `significantLines`, `parseBlock`) into `shared/resources/yaml-subset.js` — body and behaviour
      unchanged, export form adapted to CommonJS (`module.exports`) — keeping the "deliberately NOT a
      general YAML parser" header comment
- [x] `schedule.mjs` imports it; delete the local copy
- [x] Confirm `develop-batch`'s existing suites pass unchanged
- [x] `npm run bundle` and verify `skills/develop-batch/references/yaml-subset.js` appears with a
      rewritten import path — the in-repo suites cannot catch this, only the bundled output can

**Dependencies**: none

---

### Phase 2: The engine

**Risk Level**: Medium

**Files**:

- `shared/resources/tracker-workflow.js` (new)

**Changes**:

- [x] `loadWorkflow({ repoRoot })` — resolve path from `tracker.workflowFile`, else
      `tracker-workflow.yaml` at root; parse; return the built-in default on any failure, with a
      `source` field recording which was used
- [x] `rankOf(status, workflow)` — index in `statuses`, `null` for off-ladder; matches any name on a
      rung, not just the first
- [x] `resolveMoment(moment, workflow, { issueType })` — apply the `byIssueType` overlay, return
      `{ targets, rank, offLadder }` (`targets` is the rung's full name list, in preference order) or
      `null` when the moment is absent
- [x] `planMove(from, to, workflow)` — the ordered **rungs** strictly between, for ladder walking;
      each rung keeps its full name list so the caller can try candidates in order
- [x] `resolveDocumentStatus(local, workflow)` — `documentStatus:` lookup
- [x] `validateWorkflow(workflow)` — unknown moments, duplicate rungs, a `pipeline` target that is
      neither a rung nor plausibly a side-state; returns warnings, never throws
- [x] Built-in default ladder reproducing today's behaviour, as `{ names: [...] }` rungs; the YAML
      plain-string form is sugar for a one-name rung
- [x] Case-insensitive, emoji-stripped matching throughout

**Dependencies**: Phase 1

---

### Phase 3: Tests

**Risk Level**: Low

**Files**:

- `shared/resources/tests/tracker-workflow.test.mjs` (new)

**Changes**:

- [x] Parser: nested maps, lists, comments, quoted keys with spaces (`"IT / DevOps Task"`), `~`/null
- [x] Rank from order, matching **any** name on a rung; off-ladder returns `null`
- [x] Plain-string rung is sugar for `{ names: [one] }`
- [x] `planMove` returns rungs strictly between, in order, and `[]` when already at target or moving
      backwards
- [x] Overlay: `byIssueType` replaces `statuses` and can null out a moment
- [x] Omitted moment → `null` (disabled)
- [x] **Default-ladder snapshot** — the compatibility contract in executable form, with expectations
      derived from `jira-sync.js`'s `*_CANDIDATES` constants rather than hand-transcribed, so a change
      to those constants fails loudly instead of passing a stale copy
- [x] Missing / unreadable / malformed file → defaults, never a throw

**Dependencies**: Phase 2

---

### Phase 4: Documentation

**Risk Level**: Low

**Files**:

- `docs/reference/tracker-workflow.md` (new)
- `docs/reference/configuration.md`
- `docs/examples/tracker-workflow.default.yaml` (new)
- `AGENTS.md`
- `CHANGELOG.md`

**Changes**:

- [x] New reference page: the format, the three properties (order is rank, omission is
      disablement, off-ladder is free), the rung-with-alternatives form, the moment table, worked
      examples for a bespoke column as a gate, as a terminal, and as an off-ladder state
- [x] `configuration.md`: `tracker.workflowFile` key row, precedence order, cross-links
- [x] Shipped default template at `docs/examples/tracker-workflow.default.yaml`, annotated —
      `docs/examples/` is where this repo keeps copy-paste starter material; a root-level `assets/`
      would collide with the per-skill `assets/` meaning in AGENTS.md → Skill Structure
- [x] `AGENTS.md`: one TL;DR line under Configuration
- [x] `CHANGELOG.md`: `### Added` entry in house style

**Dependencies**: Phase 2

---

## 7. Files Summary

### Core Implementation

1. ✅ `shared/resources/yaml-subset.js` — **new**; promoted parser (CommonJS)
2. ✅ `shared/resources/tracker-workflow.js` — **new**; the engine (CommonJS)
3. ✅ `skills/develop-batch/scripts/schedule.mjs` — **modify**; import the promoted parser
4. ✅ `skills/create-skill/scripts/bundle_skill.py` — **modify**; walk and rewrite `.mjs`, follow ESM
   `import` of shared resources

### Tests

5. ✅ `shared/resources/tests/tracker-workflow.test.mjs` — **new**; 56 tests
6. ✅ `tests/bundle-mjs.test.js` — **new**; bundler regression for `.mjs` collection + rewrite; 8 tests
6b. ✅ `shared/resources/tests/yaml-subset.test.mjs` — **new, not in the original plan**; 18 tests. The
   promotion's compatibility contract needed its own home: §8 asks that `parseYamlSubset`'s behaviour
   be pinned before and after the move, and folding those assertions into the engine's suite would
   have coupled the parser's contract to the engine's design.

### Dependencies

None — no new runtime dependency. `package.json` test globs already cover
`shared/resources/tests/*.test.mjs` and `tests/*.test.js`.

### Documentation

7. ✅ `docs/reference/tracker-workflow.md` — **new**
8. ✅ `docs/examples/tracker-workflow.default.yaml` — **new**
9. ✅ `docs/reference/configuration.md` — **modify**; key row, precedence, cross-links
10. ✅ `AGENTS.md` — **modify**; TL;DR line
11. ✅ `CHANGELOG.md` — **modify**; `### Added`

### Dogfood

12. ✅ `tracker-workflow.yaml` — **new**; this repo's own board, authored and asserted-parseable but
    deliberately unwired (see §8, Consumer Tests)

### Files to Delete

None. The local `parseYamlSubset` in `schedule.mjs` is replaced by an import, not deleted outright.

---

## 8. Testing Strategy

### Unit Tests

**Scope**: parser and engine in isolation — both are pure

**Actions**:

- [x] Parse the shipped default template and every worked example in the reference doc
- [x] Quoted keys containing `/` and spaces round-trip (`"IT / DevOps Task"`)
- [x] `~`, `null` and empty values all mean "disabled"
- [x] Comments and inline comments stripped without eating quoted `#`
- [x] `rankOf` / `planMove` / `resolveMoment` / `resolveDocumentStatus` across the ladder
- [x] Emoji-stripped, case-insensitive matching (`🚧 In Progress`, `READY FOR SHOWCASE`)

**Command**: `node --test 'shared/resources/tests/*.test.mjs'`

**Target**: every exported function exercised; every failure mode returns defaults rather than
throwing.

---

### Integration Tests

**Scope**: the engine composes with the existing config readers

**Actions**:

- [x] `tracker.workflowFile` resolves via the same mechanism other nested keys use
- [x] A repo with no file, an unreadable file, and a malformed file each yield the default ladder
- [x] `develop-batch`'s `schedule.mjs` suites pass with the imported parser
- [x] `npm run bundle` produces `skills/develop-batch/references/yaml-subset.js` with a rewritten
      import path — the in-repo suites resolve the un-bundled path and cannot catch this

**Command**: `npm test`

---

### Contract Tests

**Scope**: the compatibility promise

**Actions**:

- [x] The default-ladder snapshot test pins the built-in defaults literally — any future change to
      them fails loudly
- [x] `parseYamlSubset`'s arity and behaviour are unchanged after promotion. Its **export form**
      necessarily changes (`export function` → `module.exports`), so pin behaviour, not the export
      statement: parse the same fixtures before and after and assert identical output

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

- [x] Author a `tracker-workflow.yaml` for this repo's own GitHub board and confirm it parses and
      resolves — without wiring it to anything

---

## 9. Success Criteria

### Functional

- [x] A valid `tracker-workflow.yaml` parses and every exported function resolves against it
- [x] Missing / unreadable / malformed file yields the built-in default ladder, never a throw
- [x] `byIssueType` overlays `statuses` and can disable a moment
- [x] An omitted moment resolves to `null`; a target absent from `statuses` is off-ladder
- [x] A rung carrying alternatives matches on any of its names and offers all of them as `targets`
- [x] `npm test` passes with all existing suites unchanged
- [x] `npm run bundle` carries `yaml-subset.js` into `skills/develop-batch/references/` with a
      rewritten import path

### Performance

- [x] Parse is cached per process; at most one file read per run
- [x] No measurable change to `develop-batch` scheduling time after the parser move

### Code Quality

- [x] Engine is pure — no `require` of `jira-sync.js`, no HTTP, no `gh`. `repoRoot` is an injectable
      parameter; the **only** permitted shell-out is the `git rev-parse --show-toplevel` fallback used
      when the caller does not inject one, exactly as `loadWorkflowRecord` does
- [x] Swallow-everything discipline matches `loadWorkflowRecord`
- [x] New tests live under an already-globbed directory
- [x] `npm run bundle` regenerates cleanly

### Migration

- [x] `docs/reference/tracker-workflow.md` documents all three bespoke-column shapes
- [x] `configuration.md` states the precedence order
- [x] `CHANGELOG.md` `### Added` entry in house style
- [x] Shipped default template (`docs/examples/tracker-workflow.default.yaml`) is byte-equal to the
      one the reference doc shows, and names only moments wired today (no `changes-requested`, no
      `pr-merged` — those land in task.41)

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
  is ordered, but a rung may carry alternatives (see §3). Pin it with a snapshot test whose
  expectations derive from `jira-sync.js`'s `*_CANDIDATES` constants, not a hand-transcribed copy.
  Land tasks 38-40 only after that snapshot exists.
- **Rollback**: the engine is unwired in this task, so a wrong default cannot reach a board.

**2. The bundler cannot carry the promoted parser into a consumer install**

- **Risk**: `bundle_skill.py` Pass 1 walks `*.md`/`*.js`/`*.sh` only, `rewrite_text` has no `.mjs`
  branch, and `JS_SHARED_RE` matches `require(…)` but not ESM `import`. `schedule.mjs` is `.mjs` and
  imports. So the shared reference is never collected, never copied into
  `skills/develop-batch/references/`, and never rewritten.
- **Probability**: Certain, absent the Phase 1 bundler change — this is verified behaviour, not a
  forecast.
- **Impact**: Critical — `develop-batch` is broken in every tarball/zip install while `npm test` stays
  green in-repo, because the un-bundled relative path resolves here and only here.
- **Mitigation**: do the bundler change **first** in Phase 1, with a regression test; verify with
  `npm run bundle` and inspect `skills/develop-batch/references/`. Do not swap `schedule.mjs` until
  the bundler can carry the file.
- **Rollback**: revert the `schedule.mjs` import hunk; `yaml-subset.js` and the bundler change are
  both independently safe to keep.

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
- **Impact**: Minor — both are small, and `bundle_skill.py`'s sibling-`require` following does handle
  the engine → parser edge, **provided both are CommonJS** (`JS_SIBLING_RE` matches only
  `require("./x.js")`). The `.mjs` consumer side is a separate, non-trivial risk — see High Risk 2.
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

**Critical (Immediate Rollback)**: `develop-batch` selects differently; any existing test fails; a
**bundled** `develop-batch` cannot resolve `yaml-subset.js` (checked via `npm run bundle`, not
`npm test` — the in-repo suites resolve the un-bundled path and will pass regardless).

**Non-Critical (Forward Fix)**: format expressiveness gaps, validation messages, docs.

---

## Progress Tracking

### Phase 1: Teach the bundler `.mjs`, then promote the YAML parser

- [x] `bundle_skill.py` walks and rewrites `.mjs`; ESM shared imports collected
- [x] Bundler regression test added and passing
- [x] `shared/resources/yaml-subset.js` created (CommonJS, helpers included)
- [x] `schedule.mjs` imports it; local copy removed
- [x] Flow-sequence support confirmed or format restricted
- [x] `develop-batch` suites pass unchanged
- [x] `npm run bundle` places a rewritten copy in `skills/develop-batch/references/`

### Phase 2: The engine

- [x] `loadWorkflow`, `rankOf`, `resolveMoment`, `planMove`, `resolveDocumentStatus`
- [x] `byIssueType` overlay
- [x] `validateWorkflow`
- [x] Built-in default ladder, `{ names: [...] }` rungs

### Phase 3: Tests

- [x] Parser tests
- [x] Engine tests
- [x] Rung-alternatives / plain-string-sugar tests
- [x] Default-ladder snapshot derived from `*_CANDIDATES`

### Phase 4: Documentation

- [x] `docs/reference/tracker-workflow.md`
- [x] `docs/examples/tracker-workflow.default.yaml`
- [x] `configuration.md` + `AGENTS.md` + `CHANGELOG.md`

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-08-04
**Quality Score**: 80/100
**Gate Decision**: CONCERNS

### QA Report

- **Full Report**: [task.37.qa.1.tracker-workflow-config-engine.md](./task.37.qa.1.tracker-workflow-config-engine.md)
- **Gate File**: [task.37.gate.1.tracker-workflow-config-engine.yml](./task.37.gate.1.tracker-workflow-config-engine.yml)

### Test Coverage Summary

- **Tests Executed**: 816 (816 pass, 0 fail)
- **Phases Verified**: 4/4
- **Critical Issues**: 0 HIGH, 1 MEDIUM, 1 LOW, 2 advisory
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: CONCERNS, Maintainability: CONCERNS

### Key Findings

Every declared success criterion is met, and the test work exceeds what the task asked for. The
diff review found one medium correctness defect the criteria do not describe: a file declaring
`statuses:` without `pipeline:` inherits rung **indices** authored against the built-in ladder, so
on a custom ladder `done` silently never fires while two other moments work by coincidence of
position — and `validateWorkflow` reports nothing. Fixed in cycle 1 (see below).

---

## Implementation Record

**Started**: 2026-08-04 · **Completed**: 2026-08-04 · **Status**: Ready for Review

### Summary

All four phases delivered. The bundler learned `.mjs` and ESM before anything moved, `parseYamlSubset`
was promoted to `shared/resources/yaml-subset.js`, the tracker-agnostic engine landed at
`shared/resources/tracker-workflow.js`, and the format is documented, templated and dogfooded. The
engine is **unwired**, as specified — nothing calls it.

### Approach, phase by phase

**Phase 1 — bundler, then the parser.** The bundler change went in first and was verified before
`schedule.mjs` was touched, because the failure it prevents is invisible to `npm test`. Three edits:
`*.mjs` added to Pass 1's `rglob` set; `rewrite_text`'s `.js` branch widened to `('.js', '.mjs')` and
taught a second regex; and `JS_ESM_SHARED_RE` / `JS_ESM_SIBLING_RE` added alongside the `require`-only
originals so `import … from`, bare `import`, and dynamic `import(…)` are all collected and rewritten.
Transitive following was widened to `.mjs` and to ESM siblings in the same edit.

The parser was promoted in **two deliberate steps**, so the §9 compatibility criterion could be
proven rather than asserted:

1. Body copied **byte-identical**, export form changed to `module.exports`. The 12 contract and limit
   tests were written and passing at this point — that is the evidence the move changed nothing.
2. Quoted-key support added as a separate, additive change (see below), with the same 12 tests still
   green.

`schedule.mjs` re-exports `parseYamlSubset` because `evals/develop-batch/unit/schedule.test.mjs`
imports it from there; the promotion is invisible to every existing caller. All 41 `develop-batch`
unit tests pass unchanged.

**Phase 2 — the engine.** Pure CommonJS. A rung is always `{ names: [...] }`; the plain-string YAML
form is sugar for a one-name rung. `resolveMoment` returns `targets` (plural, preference order) and
`planMove` returns rungs, so no alternative is ever unreachable as a move target. `byIssueType`
replaces rather than merges, matching `resolveStage`. Every failure path returns the default and none
throws. Parse is cached per resolved path, and `loadWorkflow` hands back a copy so a caller cannot
poison the cache.

**Phase 3 — tests.** 56 engine tests plus 18 parser tests. The default-ladder snapshot derives its
expectations from `jira-sync.js`'s exported `DEFAULT_STAGE_MAP` and `DEFAULT_STATUS_RANK` rather than
transcribing them, so editing those constants fails here loudly. Purity is asserted behaviourally — a
clean child process loads the engine and its `require.cache` is checked for `jira-sync.js` — because
a textual scan matches the module's own comment explaining why it does not require it.

**Phase 4 — docs.** Reference page, annotated template, `configuration.md` key row + precedence +
`## Tracker workflow` section, `AGENTS.md` TL;DR, `CHANGELOG.md` `### Added` and `### Fixed`.

### Three problems found during implementation that the task document had wrong

1. **§3's rung-with-alternatives example did not parse.** It used flow form
   (`names: [In Progress, Doing, Development]`) while a note eight lines above correctly said flow
   collections are unsupported. Verified by running the parser: it yields the plain string
   `"[In Progress, Doing, Development]"`. §3 has been rewritten in block form with an explanatory
   note, and `validateWorkflow` now rejects flow collections with a specific message rather than
   letting a nonsense one-name rung through silently.

2. **`parseYamlSubset` dropped every quoted key, so `byIssueType` could not be expressed at all.**
   §10 rated this "Medium probability"; it was certain. The key pattern `[\w.-]+` admits no quote,
   space or slash, so `"IT / DevOps Task":` matched nothing and the whole overlay vanished with no
   error. Since §8 requires those keys to **round-trip**, the parser was extended (additively, and
   after the contract test was pinned) rather than merely warned about.

3. **`tracker` is a scalar today, so `tracker.workflowFile` collides with it.** `configuration.md`
   documents `tracker: jira` as a platform override; YAML cannot hold both a scalar and a map under
   one key. The loader tolerates either shape — a scalar `tracker:` yields no `workflowFile` and the
   default path applies, rather than throwing — and both `configuration.md` and the reference page
   state the constraint and point at `TRACKER_WORKFLOW_FILE` as the way to have both.

### Testing results

| Suite                                          | Result             |
| ---------------------------------------------- | ------------------ |
| `shared/resources/tests/tracker-workflow.test.mjs` | 56/56 pass     |
| `shared/resources/tests/yaml-subset.test.mjs`  | 18/18 pass         |
| `tests/bundle-mjs.test.js`                     | 8/8 pass           |
| `evals/develop-batch/unit/*.test.mjs`          | 41/41 pass (unchanged) |
| **`npm test` (full suite)**                    | **812/812 pass**   |
| `npm run bundle`                               | clean, idempotent  |

Suite grew from 760 to 812 (+52 net new). No pre-existing test was modified.

### QA cycle 1 — fixes applied 2026-08-04

Gate 1 returned **CONCERNS (80/100)** with two gating findings and two advisory. All four were fixed;
none required a design change beyond the first, which did.

**CR-1 (medium, gating) — the default pipeline stored rung *indices*.** `DEFAULT_PIPELINE` mapped
moments to positions (`work-started: 1`, `done: 5`) authored against the built-in six-rung ladder.
`buildWorkflow` replaces the ladder when a file declares `statuses:` but keeps the default pipeline
when it omits `pipeline:` — so those indices were applied to a ladder they were never written for.
Reproduced on a four-rung board: `work-started` and `in-review` resolved correctly *by coincidence of
position* while `done` (index 5) fell off the end, returned `null`, and never fired. `validateWorkflow`
was silent because it skipped numeric targets unconditionally.

Fixed at the root rather than patched: `DEFAULT_PIPELINE` now stores **names**, which resolve against
whichever ladder is in play. The numeric branch is deleted from `resolveMoment` and the numeric skip
from `validateWorkflow`, so there is no second representation left to diverge. A consequence worth
having: any board using conventional column names now needs no `pipeline:` block at all, and a board
using unconventional ones gets a `warn` naming the fix instead of silence.

**CR-2 (low, gating) — `cloneWorkflow` shallow-copied `byIssueType`.** The function's own comment
claimed it was "deep enough that no caller can mutate the cached entry"; overlays were shared by
reference, so one caller mutating `byIssueType[type].pipeline` poisoned every later load. Now
deep-copied. The pre-existing cache test passed regardless because it only mutated copied fields —
the new test mutates an overlay.

**CR-3 (advisory) — a wrong-shaped `pipeline:` disabled everything.** `pipeline` was reset to `{}`
before its shape was checked, so `pipeline: SomeScalar` switched every moment off while the warning
said "ignoring it" and the reference doc promised a fallback. Reset now happens only after the shape
is known good. An *explicitly empty* `pipeline:` still disables everything — that is a choice, not a
mistake, and the two are now distinguished.

**CR-4 (advisory) — nothing asserted the bundled parser matched its source.** Since the swap,
`schedule.mjs` executes `references/yaml-subset.js` in-repo too, so an edit to `shared/resources/`
without `npm run bundle` would leave `develop-batch` on a stale parser with every suite green — the
same invisible-in-a-checkout failure Phase 1 exists to prevent, through a different door. Now
asserted equal modulo the generated header.

Suite: **816 → 825** (9 new tests, all regression guards for the above). `npm run bundle` clean.

### Deferred work

None within scope. Two things are deliberately left for later tasks, both as specified: the engine is
unwired (tasks 38–40), and `changes-requested` / `pr-merged` are declared but not fired (task.41).
The four other hand-rolled YAML readers remain — explicitly out of scope per §4.

---

## References

- **Related Documentation**: [`docs/reference/configuration.md`](../../reference/configuration.md)
- **Source to promote**: `skills/develop-batch/scripts/schedule.mjs:172` (`parseYamlSubset`; the
  `// ── minimal YAML subset ──` block begins at `:68` and the helpers live between the two; the
  function is consumed at `:493`)
- **Prior art**: `shared/resources/jira-sync.js:1952` (`loadWorkflowRecord`) — the swallow-everything
  contract this engine copies; `:1987` (`resolveStage`) — the overlay shape and case-insensitive
  issue-type key lookup; `:1388` (`DEFAULT_STAGE_MAP`) and `:1424` (`DEFAULT_STATUS_RANK`) — the
  behaviour the default ladder must reproduce; `:1278-1362` — the `*_CANDIDATES` constants
- **Bundler**: `skills/create-skill/scripts/bundle_skill.py` — `JS_SHARED_RE`, `JS_SIBLING_RE`,
  `rewrite_text`, and Pass 1's `rglob` set all need `.mjs` / ESM awareness
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
- **The bundler change comes before the `schedule.mjs` swap**, not after. `npm test` cannot detect
  the failure it prevents — only `npm run bundle` plus an inspection of
  `skills/develop-batch/references/` can.

### Known Issues

**Open** (non-blocking):

- ⚠️ Four other hand-rolled YAML readers remain after this task. Consolidation is not in scope.

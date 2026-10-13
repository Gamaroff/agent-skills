---
id: task.207
title: "Doc numbering enforcement and sweep"
type: task
description: "Make the hierarchical PRD → epic → story numbering scheme hold by construction: a corpus test that fails on any unnumbered, mismatched or unregistered document under docs/prd, a chokepoint test that fails on a story/epic/prd identifier parsed anywhere but doc-id.js, and a sweep of every prose restatement of the old flat patterns."
tags: [doc-id, prd-registry, numbering, corpus-test, chokepoint, doc-sweep, create-prd, create-epic, create-story]
category: testing
status: planned
priority: Medium
created: 2026-10-13
updated: 2026-10-13
assignee:
estimated_effort_hours: 16
github_issue: 650
---

# Technical Task: Doc numbering enforcement and sweep

**Status:** Planned

**GitHub Issue**: [#650](https://github.com/Gamaroff/agent-skills/issues/650)

---

## 1. Overview

This is the last of six tasks (task.202–task.207) that move PRDs, epics and stories to hierarchical
numbering: `prd.{P}.{name}`, `epic.{P}.{E}.{name}`, `story.{P}.{E}.{S}.{name}`. The epic number counts
within its PRD and the story number within its epic. Every epic needs a PRD. The design lives in
[`.agents/plans/hierarchical-doc-numbering.md`](../../../.agents/plans/hierarchical-doc-numbering.md).

task.202–task.206 build the engine (`shared/resources/doc-id.js`), migrate the documents, and move
every skill and script onto the engine. This task makes that work **stay done**. A convention held
only by prose drifts. This repository has the record: for months seven GitHub call sites posted a
bare `gh issue comment` while the comment contract said otherwise, until a test made the rule
mechanical (task 105, `tests/mutation-call-site-coverage.test.js`).

**Scope**: two CI tests, plus a sweep of every prose restatement of the old flat patterns
(`story.{epic}.{story}`, `epic.{N}`, `epic/{n}`, the global epic registry), then `npm run bundle` and
`npm run generate-catalog`.

**Key deliverables**:

1. **Corpus test** (`evals/shared/tests/doc-numbering-corpus.test.mjs`). It runs `doc-id`'s corpus
   check over `docs/prd/**` and fails on any unnumbered, mismatched, duplicate or unregistered PRD,
   epic or story. A non-vacuity floor stops it passing on a corpus it never read.
2. **Chokepoint test** (`tests/doc-id-chokepoint.test.js`). It fails on a story/epic/prd identifier
   parsed or built outside `shared/resources/doc-id.js`, in code or in executable Markdown snippets.
   It has a reasoned allowlist and a stale-allowlist check.
3. **Doc sweep.** Every canonical source and published doc that states the old patterns is rewritten
   to the new scheme, and bundled copies and the catalog are regenerated.

**Expected outcome**: a contributor cannot reintroduce a flat-numbered document or a private id
regex without CI going red, and no doc an agent or human reads still teaches the old scheme.

---

## 2. Motivation

### Current Problems

- **No guard holds the scheme once it lands.** After task.206, every parser routes through
  `doc-id.js`. Nothing stops the next contributor from writing `/story\.(\d+)\.(\d+)/` again. That is
  how the current state came about: the blast-radius survey for this initiative found about ten code
  files, each with its own id regex and no shared parser.
- **The corpus can drift silently.** A hand-made `epic.3.foo/` folder, a renamed story, or a PRD
  missing its registry row is invisible until a pipeline step misreads it. The task registry had the
  same shape of failure: 17 accepted rows were never ticked, and nobody saw it until
  `task-registry-drift.test.mjs` made it a failure.
- **The prose still teaches the old scheme.** The measured population is in Section 7: 25 `SKILL.md`
  files, 12 `shared/resources/*.md` files and 22 `docs/**` files state `story.{epic}.{story}`-style
  placeholders. An agent following them writes the old names, and the corpus test then fails one
  push-and-CI round trip later instead of at authoring time.
- **The executable Markdown snippets parse by field position.** For example,
  `review-pipeline-step-0a-branch-setup.md:72` (`awk -F. '{print $2}'`) and
  `develop-pipeline-step-0-resolve-and-prepare.md:44` (`grep -oE '[0-9]+' | head -1`). With three
  numbers these silently return the wrong field. A guard that scans only `.js` files cannot see them.

### Benefits

- The scheme holds by construction. The authoring check (task.204–task.206) catches defects where
  they are made, and CI catches everything else.
- One id grammar, so a future change, such as a fourth level or a new artifact kind, is one edit and
  one test run.
- Prose and code agree, so an agent reading a `SKILL.md` writes what `doc-id.js` accepts.
- Consumers get a clean upgrade: published docs, runbooks and the catalog all describe the scheme
  their installed skills enforce.

---

## 3. Technical Background

### Current Architecture

At the time of writing, task.202–task.206 have not landed. The anchors below are `develop` at
`a0f1f97d`. Re-grep each one before editing.

- **The model corpus guard** is `evals/shared/tests/task-registry-drift.test.mjs`. It imports
  `parseRegistry` from `skills/develop-next/scripts/select-next.mjs` rather than restating it, and
  sets a `MIN_ROWS = 90` non-vacuity floor (`task-registry-drift.test.mjs:60`).
- **The model chokepoint guard** is `tests/mutation-call-site-coverage.test.js`. Its properties:
  - it scans canonical sources only (`skills/*/SKILL.md`, `shared/resources/*.md`, and the tracked
    shell under `shared/resources/`, `skills/*/scripts/` and `scripts/`)
  - it excludes `skills/*/references/`, which is bundle output
  - it counts **invocations only**, meaning a line inside a bash fence, not a prose mention
  - it carries an allowlist in which every entry states a reason
  - it checks for stale allowlist entries (`§2 every allowlisted file exists and still contains a
    mutating mention`, line 380)
- **Hand-rolled id regexes in non-test code.** Command:
  `git grep -nE '(story|epic|prd)\\\\?\.' -- '*.js' '*.mjs' '*.cjs' '*.py' '*.sh' ':!skills/*/references/*'`,
  filtered to regex literals. Each witness:
  - `shared/resources/finalise-fix-and-recheck.mjs:69` (`WORK_ITEM_DOC_RE`) and `:122`
  - `skills/create-story/scripts/lib.js:24` (`STORY_FILENAME_RE`), `:39`, `:57`, and `:85`, which
    builds the regex from a template literal with `new RegExp`
  - `skills/qa-next/scripts/uat-status.mjs:166` (`STORY_FILE`)
  - `skills/session-handoff/scripts/continuation.mjs:71` (`STORY_BRANCH`)
  - `skills/sync-jira-epic/scripts/sync-jira-epic.js:56` (strips `^prd\.`) and `:313`
    (`findChildStories`)
  - `skills/sync-jira-story/scripts/sync-jira-story.js:198` (artifact-kind lookup) and `:807`
  - `shared/resources/bug-doc.js:51` (`RE_STORY_BUG`)
- **Hand-rolled title regexes** (`[Epic N]`, `Epic N:`, `[Story N.N]`):
  - `shared/resources/generate-prd-epic-index.mjs:135`
  - `skills/develop-next/scripts/select-next.mjs:351`
  - `skills/jira-epic-creator/scripts/jira-create-epic.js:381-382`
  - `skills/sync-jira-epic/scripts/sync-jira-epic.js:359-360`
  - `skills/sync-jira-story/scripts/sync-jira-story.js:253`
- **Field-position parsing in executable Markdown**, from
  `git grep -nE "awk -F\.|cut -d\.|grep -oE '\[0-9\]\+' \| head -1" -- 'skills/*/SKILL.md' 'shared/resources/*.md'`:
  - `review-pipeline-step-0a-branch-setup.md:72,73,100` (story/epic)
  - `review-pipeline-step-0a-branch-setup.md:86` (`TASK_ID`, a **task** id, a different rule)
  - `develop-pipeline-step-0-resolve-and-prepare.md:44`
- **CI.** `.github/workflows/test.yml` runs `npm test` and `npm run eval:all` on every pull request
  and on pushes to `main`/`develop`, with **no `paths:` filter**. `validate.yml` and
  `docs-link-check.yml` **are** path-filtered (`skills/**`, `shared/resources/**`, …;
  `docs/**/*.md`, `AGENTS.md`, …).
- **`npm test`** hand-lists its globs (`package.json:26`). It already includes `tests/*.test.js`,
  `shared/resources/tests/*.test.mjs` and `evals/shared/tests/*.test.mjs`.
- **Corpus today**, from `find docs/prd -type d -name 'story.*' | wc -l` and the matching `find`
  for epic and PRD files:
  - 1 PRD (`docs/prd/onboarding/prd.onboarding.md`)
  - 4 epics
  - 17 story directories
- **AGENTS.md** carries `## File Naming` (line 94), `## Task Registry` (158), `## Epic Registry`
  (166) and `## Bug Registry` (170).

### Target Architecture

```
docs/prd/** ──► doc-numbering-corpus.test.mjs ──► doc-id.js check --corpus (imported, never restated)
                    └─ floor: ≥1 PRD, ≥4 epics, ≥17 story dirs read

code (*.js *.mjs *.cjs *.py *.sh, not references/)  ┐
bash fences in skills/*/SKILL.md, shared/resources/*.md ┘──► doc-id-chokepoint.test.js
                    ├─ shapes: id regex literal · string-built id regex · awk/cut field split on a doc stem · title regex
                    ├─ positive control: doc-id.js itself matches ≥1 shape
                    ├─ allowlist {path → reason}, stale-entry check
                    └─ scanned-file floor
```

### Important Clarifications

- **Both tests import from `doc-id.js` and restate nothing.** The corpus test calls the engine's
  corpus check, and the chokepoint test takes its positive control from the engine's exported
  regexes. A second definition of "a valid story id" in a test drifts in the worst direction: it
  passes a corpus the engine would reject.
- **The chokepoint key is a shared token** (obs #135):
  - (a) The literal `story\.` in a regex hits three different rules: the id grammar
    (`uat-status.mjs:166`), the bug-artifact grammar (`bug-doc.js:51`, which deliberately accepts
    any depth with `[\d.]+?`), and the artifact-kind lookup (`sync-jira-story.js:198`). `awk -F.`
    also hits the task-id split at `review-pipeline-step-0a-branch-setup.md:86`. So the test keys on
    a **compound**: a kind word (`story|epic|prd`), an escaped dot, and a numeric capture or
    character class (`\d`, `[0-9]`, `[1-9]`, `[\d.]`). For the shell shape, a field split must
    operate on a variable whose name contains `STORY` or `EPIC` or `PRD`, so the task-id split is
    out of scope by construction.
  - (b) Restatements the key will **not** see:
    - `stem.split(".")[1]`, an untyped split on a stem
    - a `startsWith("story.")` followed by `parseInt`
    - a regex assembled from fragments whose kind word sits in another variable

    These are named as accepted gaps. They are mitigated by the corpus test, which fails on the
    documents the bad parser writes, and by the engine's own unit tests from task.202.
  - (c) The population is derived from globs, not listed by hand. A future file is in scope the
    moment it exists, and the non-vacuity assertions in Section 8 are what keep the derivation honest.
- **Eval replay fixtures are excluded from the corpus test.** Paths under
  `evals/**/replay/docs/prd/**` are examples renamed by task.206, not the project corpus. Including
  them would make a fixture's deliberately bad shape (a negative case) a CI failure.
- **The doc sweep is a rewrite, not a mention-scrub.** Historical documents under `docs/tasks/**`,
  `docs/bugs/**` and accepted reports are records and stay as written. Only canonical sources and
  published guidance change.

---

## 4. Scope

### In Scope

- ✅ `evals/shared/tests/doc-numbering-corpus.test.mjs`. It runs the corpus check over `docs/prd/**`,
  with a non-vacuity floor and a mutation proof.
- ✅ `tests/doc-id-chokepoint.test.js`, covering:
  - code shapes and executable-Markdown shapes
  - an allowlist with reasons and a stale-entry check
  - a positive control and a scanned-file floor
- ✅ Each remaining hand-rolled site the chokepoint test finds after task.206 is either moved onto
  `doc-id.js` or allowlisted with a reason. `bug-doc.js:51` is the expected candidate.
- ✅ The prose sweep over the population defined in Section 7:
  - `skills/*/SKILL.md`, `shared/resources/*.md` and `docs/**`
  - `AGENTS.md` § File Naming and § Epic Registry
  - `docs/standards/*`, `docs/runbooks/*`, `docs/operations/workflows.md` and `docs/reference/*`
- ✅ Then `npm run bundle` and `npm run generate-catalog`, with the regenerated output committed.
- ✅ CHANGELOG `[Unreleased]` entry and consumer upgrade note pointing at the migration script.

### Out of Scope

- ❌ The engine, migration, and skill and code changes. Those are task.202–task.206, and this task
  depends on all of them.
- ❌ Historical records (`docs/tasks/**`, `docs/bugs/**`, accepted QA/DoD/review reports). They
  describe what was true when written.
- ❌ Tracker titles already published (`[Story 1.1]` on GitHub/Jira). The migration leaves them
  alone by design (task.203).
- ❌ A consumer-side CI hook. Consumers get the authoring and review checks from the skills, and
  shipping a CI template is a separate decision.

---

## 5. Breaking Changes

There are none for consumers. Both tests run only in this repository's CI.

Internal: once this lands, a contributor PR that adds an id regex outside `doc-id.js`, or a
flat-numbered document under `docs/prd/`, fails `npm test`. The **migration path** for such a
contributor has two steps:

1. Import the parser from `shared/resources/doc-id.js` (in a skill, through its bundled
   `references/doc-id.js`).
2. If the site is genuinely a different grammar, add an allowlist entry whose reason a reviewer can
   check.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.207.plan.doc-numbering-enforcement-and-sweep.md](task.207.plan.doc-numbering-enforcement-and-sweep.md)

**Depends on:** task.204, task.205, task.206. Through them it also depends on task.202 and task.203.
**Phase 0 HALTs** until all three are `accepted`.

### Phase 0: Dependency gate (Risk: Low)

- [ ] Confirm task.204, task.205 and task.206 read `status: accepted`; HALT otherwise
- [ ] Confirm `shared/resources/doc-id.js` exports the corpus check and its regexes
      (`git grep -n "export" shared/resources/doc-id.js`); HALT if the names differ from the plan
      and update the plan first

### Phase 1: Corpus test (Risk: Low)

- [ ] Write `evals/shared/tests/doc-numbering-corpus.test.mjs`, importing the corpus check from
      `doc-id.js`
- [ ] Non-vacuity floor: ≥1 PRD, ≥4 epics, ≥17 story directories read (the counts come from the
      engine's result, not a separate walk)
- [ ] Mutation-prove: in a temp copy of the corpus, rename one story directory back to the flat shape
      and confirm the test goes red; strip `prd_number` from the PRD and confirm red; add a duplicate
      `(P, E)` and confirm red

### Phase 2: Chokepoint test (Risk: Medium)

- [ ] Write `tests/doc-id-chokepoint.test.js` with the compound shapes from Section 3 (code regex
      literal, string-built regex, executable-Markdown field split on a `STORY`/`EPIC`/`PRD` variable,
      title regex)
- [ ] Scope: tracked `*.js *.mjs *.cjs *.py *.sh` excluding `skills/*/references/**` and
      `node_modules`, plus bash fences in `skills/*/SKILL.md` and `shared/resources/*.md`
- [ ] Test files are in scope. A test that hand-rolls the grammar is a second definition, as
      `shared/resources/tests/doc-links.test.mjs:331` showed. Fixture-building string literals are
      not regexes and the shapes do not match them
- [ ] Positive control: `doc-id.js` matches ≥1 shape, and the scan reads ≥400 code files (455 today
      by `git ls-files -- '*.js' '*.mjs' '*.cjs' '*.py' '*.sh' ':!skills/*/references/*' | wc -l`)
- [ ] Allowlist `{path: reason}` and a stale-entry check, mirroring
      `mutation-call-site-coverage.test.js` §2
- [ ] Run it. Every hit task.206 left is either moved to `doc-id.js` or allowlisted with a reason
- [ ] Mutation-prove: re-add `/story\.(\d+)\.(\d+)/` to a scratch copy of `uat-status.mjs` and
      confirm red; re-add an `awk -F. '{print $2}'` on `$STORY_BASENAME` to a fenced block and confirm
      red; confirm the task-id `awk` at `review-pipeline-step-0a-branch-setup.md:86` stays green

### Phase 3: Prose sweep (Risk: Medium)

- [ ] Re-measure the population with the Section 7 command; record the count in the PR description
- [ ] Rewrite each hit to the new scheme (`prd.{P}`, `epic.{P}.{E}`, `story.{P}.{E}.{S}`,
      `epic/{P}.{E}.{slug}`), or state it as unaffected (a historical quote, a task/bug pattern)
- [ ] `AGENTS.md`: update § File Naming, and replace § Epic Registry with a PRD Registry section
      pointing at `docs/standards/prd-registry.md`
- [ ] `docs/standards/file-naming.md` example ids, `docs/runbooks/*` walkthroughs,
      `docs/operations/workflows.md`, `docs/reference/{faq,glossary,invocation,troubleshooting,anti-patterns}.md`
- [ ] Re-run the population command: zero unexplained hits

### Phase 4: Regenerate and close out (Risk: Low)

- [ ] `npm run bundle`, then `npm run bundle:check` clean (no `UNREACHED`, no untracked copies)
- [ ] `npm run generate-catalog`; commit the regenerated `docs/reference/skill-catalog.md`
- [ ] CHANGELOG `[Unreleased]`: the scheme, the migration script, the two guards
- [ ] Full `npm test` and `npm run eval:all` with the gitignored `.agents/skills` symlink moved aside

---

## 7. Files Summary

### Core Implementation

1. ✅ `evals/shared/tests/doc-numbering-corpus.test.mjs` (new). Reached by `npm test`'s existing
   `evals/shared/tests/*.test.mjs` glob (`package.json:26`), so no glob edit is needed.
2. ✅ `tests/doc-id-chokepoint.test.js` (new). Reached by the existing `tests/*.test.js` glob.
3. ✅ Remaining hand-rolled sites the chokepoint test reports after task.206. These are moved onto
   `doc-id.js` or allowlisted. Expected: `shared/resources/bug-doc.js:51`.

> **Glob wiring.** Both files land under directories `npm test` already lists. If implementation
> moves either test into a new `skills/*/tests/` directory, add that glob to `package.json:26` in the
> same commit, or the suite runs nowhere. A new `skills/*/tests/` directory has been silently
> unrun before.

### Documentation (sweep population)

**Definition.** The population is every canonical or published Markdown file that states the old
placeholder patterns, excluding historical records. Command:

```bash
git grep -lE 'story\.\{(epic|E|e)\}|story\.\{E\}\.\{S\}|epic\.\{(N|n|number|epic)\}|epic/\{n\}|story\.\{epic_num|story\.\{\{epic' \
  -- 'skills/*/SKILL.md' 'shared/resources/*.md' 'docs/**/*.md' \
  ':!docs/tasks/**' ':!docs/bugs/**' ':!docs/prd/**'
```

Measured 2026-10-13 at `a0f1f97d`:

| Glob | Count |
|---|---|
| `skills/*/SKILL.md` | 25 |
| `shared/resources/*.md` | 12 |
| `docs/**` | 22 |

Re-measure; the count will move as task.204–task.206 rewrite their own files. Literal example ids
(`story.2.3.`, `epic.178.`) are a second pattern. Sweep them with
`git grep -nE '\b(story\.[0-9]+\.[0-9]+\.|epic\.[0-9]+\.)[a-z]'` over the same globs.

4. ✅ `AGENTS.md`: § File Naming and § Epic Registry
5. ✅ `docs/standards/file-naming.md`, `epic-registry.md` (retired, replaced by a pointer), and
   `story-documents.md`/`epic-documents.md`/`prd-documents.md` if task.202 left examples
6. ✅ `docs/runbooks/*.md`, `docs/operations/workflows.md` and `docs/reference/*.md`
7. ✅ `docs/reference/skill-catalog.md` (generated)
8. ✅ `skills/*/references/*` (generated by `npm run bundle`, never hand-edited)
9. ✅ `CHANGELOG.md`

---

## 8. Testing Strategy

### Unit Tests

- **Corpus test.** Its three mutation cases (a flat story dir, a missing `prd_number`, a duplicate
  `(P, E)`) run against a temp copy of `docs/prd/` built in `before()`, so the real corpus is never
  touched. Each case must go red, and the clean copy must go green.
- **Chokepoint test.** A fixture table of shape strings proves the compound key:
  - **Must hit:** `/story\.(\d+)\.(\d+)/`, `new RegExp(\`^epic\\.${n}\\.\`)`,
    `awk -F. '{print $2}'` on `$STORY_BASENAME`, and `/\[Epic\s+(\d+)\]/`.
  - **Must not hit** (the obs #135 control set):
    - the task-id `awk` on `$TASK_BASENAME`
    - the string `"story.1.1.example"` used as a fixture name
    - prose that says "`story.{P}.{E}.{S}`" outside a fence

  The control set varies the kind word, the variable name and the context (fence vs prose), not just
  the file.
- **Command:** `command node --test tests/doc-id-chokepoint.test.js evals/shared/tests/doc-numbering-corpus.test.mjs`

### Integration Tests

- Full `npm test` and `npm run eval:all`, with the gitignored `.agents/skills` symlink moved aside so
  a local green means CI green.
- `npm run bundle:check` is clean after the sweep.

### Performance Tests

- The chokepoint scan reads about 455 files. It should finish well under a second, in line with
  `mutation-call-site-coverage.test.js`. No baseline is needed.

### Consumer Tests

- None run in consumer repos. The upgrade note is checked by reading it against task.203's migration
  CLI help (`--help` output quoted, not paraphrased).

---

## 9. Success Criteria

### Functional

- [ ] The corpus test passes on the migrated corpus and fails on each of its three mutation cases
      (Phase 1).
- [ ] The chokepoint test passes on `develop` after task.206 and fails on each "must hit" fixture
      (Phase 2).
- [ ] The chokepoint test stays green on the task-id `awk` at
      `review-pipeline-step-0a-branch-setup.md:86` (Phase 2 control).
- [ ] Every allowlist entry names a reason, and the stale-entry check fails when an allowlisted file
      no longer contains a matching shape.

### Performance

- [ ] Both new tests together add < 2 s to `npm test` on CI.
- [ ] The chokepoint scan reads ≥ 400 code files (scanned-file floor holds).

### Code Quality

- [ ] Neither test restates the id grammar. Both import from `shared/resources/doc-id.js`
      (`git grep -n "doc-id" tests/doc-id-chokepoint.test.js evals/shared/tests/doc-numbering-corpus.test.mjs`).
- [ ] `npm run bundle:check` is clean; `npm run validate -- skills/<skill>/` passes for every skill
      whose `SKILL.md` the sweep touched.
- [ ] `npm run format:check` passes.

### Migration

- [ ] The Section 7 population command returns zero unexplained hits after the sweep.
- [ ] `AGENTS.md` has no `## Epic Registry` section describing a global counter; the PRD registry
      is documented instead.
- [ ] CHANGELOG `[Unreleased]` names the scheme, the migration script and both guards.

---

## 10. Risk Assessment

### High Risk Areas

1. **The chokepoint key cries wolf and gets disabled**
   - Risk: an over-broad key flags fixtures, prose or the bug grammar, and a frustrated contributor
     allowlists wholesale.
   - Probability: Medium
   - Impact: High. An allowlist nobody believes is a guard nobody reads.
   - Mitigation: compound key (Section 3), invocations only for Markdown, a fixture control set that
     must stay green, and every allowlist entry carrying a reason.
   - Rollback: revert the test file alone. Nothing depends on it.

### Medium Risk Areas

1. **A vacuous pass**
   - Risk: the corpus check or the scan silently matches nothing (a renamed export, a moved
     directory) and reports green.
   - Probability: Medium. This failure mode has occurred in this repository more than once.
   - Impact: High
   - Mitigation: non-vacuity floors on both tests and a positive control on `doc-id.js`.
2. **The sweep misses a restatement**
   - Risk: a placeholder spelled differently (`story.{e}.{s}`, `Story E.S`) survives.
   - Probability: Medium
   - Impact: Medium. An agent writes the old shape, and the corpus test catches it one round trip late.
   - Mitigation: two grep patterns (placeholders and literal ids), and re-measure after the sweep.

### Low Risk Areas

1. **Bundle churn**
   - Risk: `npm run bundle` rewrites many `references/` copies.
   - Probability: High
   - Impact: Low. It is a generated diff.
   - Mitigation: commit the bundle output separately from the hand edits.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers:**
  - either new test fails on `develop` for a reason other than a real violation
  - `npm test` exceeds its CI timeout
- **Steps:**
  1. Revert the commit that added the failing test.
  2. Push.
  3. Re-run CI.
- **Validation:** `npm test` green on `develop`.

### Partial Rollback (1–2 hours)

- **When to use:** the sweep broke a link or a bundled copy.
- **Steps:**
  1. Revert the sweep commit only; the tests stay.
  2. Re-run `npm run bundle` and `docs-link-check`.

### Forward Fix

- **When to use:** a false positive with a clear cause.
- **Approach:** tighten the shape, or add a reasoned allowlist entry with a control fixture that
  pins it.

### Rollback Triggers

- **Critical:** CI red on `develop` with no real violation.
- **Non-critical:** a single false positive. Fix it forward.

---

## Change Log

<!-- change-log-start -->

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-10-13 | 1.0     | Initial draft | create-task |

<!-- change-log-end -->

---

## Progress Tracking

### Phase 0: Dependency gate

- [ ] Complete

### Phase 1: Corpus test

- [ ] Complete

### Phase 2: Chokepoint test

- [ ] Complete

### Phase 3: Prose sweep

- [ ] Complete

### Phase 4: Regenerate and close out

- [ ] Complete

---

## References

- [Hierarchical doc numbering plan](../../../.agents/plans/hierarchical-doc-numbering.md)
- `evals/shared/tests/task-registry-drift.test.mjs`: the corpus-guard model
- `tests/mutation-call-site-coverage.test.js`: the chokepoint-guard model
- `docs/reference/anti-patterns.md`: the enumeration class (two definitions drift)

## Notes

- QA report: `task.207.qa.{n}.doc-numbering-enforcement-and-sweep.md`
- Bug reports: `task.207.bug.{n}.{name}.md`
- Quality gate: `task.207.gate.{n}.doc-numbering-enforcement-and-sweep.yml`, co-located in this
  directory

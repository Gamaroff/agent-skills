---
id: task.202
title: "Doc-id engine and PRD registry"
type: task
description: "Ship one shared parser, formatter, allocator and checker for hierarchical document ids (prd.P, epic.P.E, story.P.E.S), plus the PRD registry and the standards that define them, with no existing call site migrated yet."
tags: [doc-numbering, prd, epic, story, registry, shared-resources]
category: infrastructure
status: ready-for-review
priority: Medium
created: 2026-10-13
updated: 2026-10-15
assignee:
estimated_effort_hours: 16
risk_level: medium
github_issue: 645
---

# Technical Task: Doc-id engine and PRD registry

**Status:** Ready for Review

**Review**: ✅ All review recommendations from `task.202.review.1.doc-id-engine-and-prd-registry.md` implemented 2026-10-15

**GitHub Issue**: [#645](https://github.com/Gamaroff/agent-skills/issues/645)

---

## 1. Overview

This task adds `shared/resources/doc-id.js`, the single definition of what a document id is under the
new hierarchical scheme: `prd.{P}.{slug}`, `epic.{P}.{E}.{slug}` and `story.{P}.{E}.{S}.{slug}`. P is
the PRD number, E counts epics **within** that PRD, and S counts stories within that epic. The engine
parses, formats, allocates the next number and checks a document or a whole PRD tree against the
scheme. It also adds the PRD registry, which allocates P, and rewrites the four document standards so
they describe the new scheme.

**Scope:**

- the engine and its CLI
- a `prd` kind in the existing registry parser
- the PRD registry standard
- updates to `file-naming.md`, `prd-documents.md`, `epic-documents.md` and `story-documents.md`

**Key deliverables:**

- `shared/resources/doc-id.js`, with `parse`, `format`, `matchesEpic`, `next` and `check`, as a pure library plus a CLI. The CLI follows the `--json` `reason` and exit-code contract of the peer engines.
- `docs/standards/prd-registry.md`, which defines `${PRD_ROOT}/prd-registry.md`.
- Standards that describe the hierarchical scheme.

**Expected outcome:** every later task in this series (203–207) calls one engine instead of writing a
regex. **No existing call site is migrated here.** This is the primitive half of a primitive →
migration split, so this task can be reverted without regressing anything that uses it.

**Series** (one shippable unit each, in dependency order):

| Task | Delivers |
| --- | --- |
| **202 (this task)** | The engine and the standards |
| 203 | The migration script, and this repo's migration |
| 204 | The PRD skills |
| 205 | The epic skills |
| 206 | Story and pipeline code |
| 207 | The enforcement backstop and the doc sweep |

Source plan: `.agents/plans/hierarchical-doc-numbering.md`.

## 2. Motivation

### Current Problems

- **PRDs carry no number.** The standard pattern is `prd.{feature}` (`docs/standards/prd-documents.md`,
  § File naming: "Directory: `prd.{feature}`"). Nothing allocates a PRD number, and no registry exists:
  `ls docs/prd` shows only `onboarding`.
- **There is no shared identifier parser.** Each site writes its own regex, and each hard-codes the
  current shape:
  - `shared/resources/finalise-fix-and-recheck.mjs` `WORK_ITEM_DOC_RE` accepts exactly `story\.\d+\.\d+` and `epic\.\d+`.
  - `skills/create-story/scripts/lib.js` `STORY_FILENAME_RE` has exactly two named groups, `epic` and `story`.
  - `skills/develop-next/scripts/select-next.mjs` `isWorkItemHref` accepts `story|task|bug` and no `prd` or `epic`.
  - `shared/resources/card-preflight.js` reads only `^(task|story|epic|bug)\.`.

  Changing the scheme without one engine means changing every regex by hand, and they would drift.
- **The registry parser cannot read a PRD row.** It was measured with
  `command node -e 'import("./skills/develop-next/scripts/select-next.mjs").then(m=>console.log(JSON.stringify(m.parseRegistry(t,"prd","docs/prd/prd-registry.md"))))'`,
  where `t` holds a header, a separator and the row
  `| 1 | [Onboarding](onboarding/prd.1.onboarding/prd.1.onboarding.md) | onboarding | accepted | 2026-10-13 |`.
  The result was `rows: []`, with the row in `malformed` and the reason
  `"malformed row — no [title](story|task|bug.….md) link"`. `isWorkItemHref` rejects the `prd.` href.
- **The two allocation rules disagree.**
  - The epic registry has a **Next Available** counter (`docs/development/epic-registry.md` § Next Available Epic Number).
  - `create-story`'s `nextStoryId` (`skills/create-story/scripts/lib.js`) returns the **lowest unused** number. Measured: `command node -e 'console.log(require("./skills/create-story/scripts/lib.js").nextStoryId(["story.1.1.a.md","story.1.3.b.md"],1))'` prints `2`, so it fills the gap left by a deleted story.

  These are two rules for one job.

### Benefits of a single doc-id engine

- **One definition of every id shape.** Tasks 203–206 import it rather than restating it, and task 207 can then fail CI on any regex written outside it.
- **Numbers are allocated by code, not prose.** `next prd | epic | story` replaces the prose "highest + 1" rule and its gap-filling variant.
- **"Enforced in practice" has a chokepoint.** `check` is the one call that `create-*`, `review-*` and the CI corpus test all make.
- **Per-PRD epic numbering is safe.** `matchesEpic(stem, P, E)` requires P, so the `find -name "epic.${N}.*"` over-match (it also finds `epic.N.M.*`) has no way back in.

## 3. Technical Background

### Current Architecture

Each number is allocated by its own mechanism, and nothing parses an id centrally:

| Id | Allocated by | Parsed by |
| --- | --- | --- |
| PRD | nothing (slug only) | `generate-prd-epic-index.mjs` treats the folder name as the PRD stem (`main`, via `listDirs`) |
| Epic `E` | `docs/development/epic-registry.md` "Next Available" counter, used by `epic-registry-manager` prose | `WORK_ITEM_DOC_RE` (`finalise-fix-and-recheck.mjs`), `generate-prd-epic-index.mjs`, sync-jira-epic and others |
| Story `E.S` | `nextStoryId` (`skills/create-story/scripts/lib.js`), lowest unused number; **not called by the skill** | `STORY_FILENAME_RE` (same file), `RE_STORY_BUG` (`shared/resources/bug-doc.js`), `continuation.mjs`, `uat-status.mjs` and others |
| Task / bug `N` | `task-registry.md` / `bug-registry.md` counters | `parseRegistry` (`select-next.mjs`) |

Existing mechanisms this task sits beside. This answers the "second mechanism" check, item by item:

- **`parseRegistry(text, kind, registryPath)`** (`skills/develop-next/scripts/select-next.mjs`).
  `DEFAULT_COLUMNS` has `bug` and `task` entries only, and an unknown kind falls back to the `task`
  defaults (`const defaults = DEFAULT_COLUMNS[kind] || DEFAULT_COLUMNS.task`). It is **extended**, not
  duplicated: the task adds a `prd` entry and a `prd #` alias. A row also needs an href that passes
  `isWorkItemHref`, which this task widens **for `kind === "prd"` only**. The roadmap reader shares
  that predicate (`select-next.mjs`, where it does `if (isWorkItemHref(m[1])) return m[1];`), so a
  global widening would make roadmap PRD links look like work items.
- **`WORK_ITEM_DOC_RE` / `WORK_ITEM_ARTIFACT_RE` / `isWorkItemDocument`**
  (`shared/resources/finalise-fix-and-recheck.mjs`). They **stay in place** in this task.
  - `doc-id.js` defines its own artifact vocabulary, and task 206 makes `finalise-fix-and-recheck.mjs` re-export from `doc-id.js`.
  - Until 206 lands there are two copies of the artifact list. That is deliberate: the primitive → migration seam. A unit test pins the two lists as equal, so they cannot drift in the interim.
- **`nextStoryId` / `scanExistingStoryIds` / `STORY_FILENAME_RE`** (`skills/create-story/scripts/lib.js`).
  They **stay in place**. `doc-id next story` will replace them when task 206 wires create-story. It
  allocates **highest + 1**, which differs from the gap-filling `nextStoryId` on purpose: a deleted
  story's number is not handed out again, which matches the "never reused" rule of the task, bug and
  epic registries.
- **`prdRootFromConfig`** (`shared/resources/generate-prd-epic-index.mjs`) resolves `PRD_ROOT` in
  this order: `--prd-root`, then skills-config `prd.prdShardedLocation`, then `docs/prd`. `doc-id.js`
  uses the **same order**. It is a sibling of that function, not shared with it: the generator is an
  `.mjs` script whose module scope runs `argValue("--prd-root")` on import. Task 205 switches the
  generator to `doc-id.js`'s resolver.
- **`newest-numbered.sh`** (`next_numbered` / `newest_numbered`) numbers artifact series inside one
  directory, such as `stem.review.N`. That is a different job, so it is left unchanged.

### Target Architecture

`shared/resources/doc-id.js` is CommonJS. It follows the `card-preflight.js` precedent, because
`package.json` has `"type": "commonjs"`, and `.mjs` callers load it with `createRequire`, as `shared/resources/tests/card-preflight.test.mjs` does. Its API:

| Export | Contract |
| --- | --- |
| `parse(name)` | Parses a basename or stem. Returns `{ kind, prd, epic, story, sub, n, artifact, seq, slug, id }`, or `null` plus a `reason`. `kind` is one of `prd`, `epic`, `story`, `task`, `bug`. `artifact` is set for co-located files (`story.1.2.3.qa.1.x.md`) |
| `parseLegacy(name)` | Reads the **old** shapes only (`prd.{slug}`, `epic.{E}.{slug}`, `story.{E}.{S}.{slug}`). It exists for task 203's migration and is never called by a pipeline reader |
| `format(parts)` | The inverse of `parse`. Round-trip is a tested property |
| `matchesEpic(name, P, E)` | True for the epic and every story or artifact beneath it. **P is required** |
| `nextNumber(kind, entries, registryText)` | Pure function, highest + 1. `prd` reads the registry's **Next Available PRD Number**. `epic` and `story` scan directory names |
| `check(path, ctx)` / `checkCorpus(prdRoot)` | Return findings keyed by `reason` (below) |
| `resolvePrdRoot(argv, cwd)` | `--prd-root`, then config, then `docs/prd` |

**Grammar:**

- Numbers are positive integers with no leading zeros.
- The slug is lowercase kebab-case **beginning with a letter**, for PRD, epic and story kinds only.
  - That letter rule is what keeps the new 3-number story id unambiguous: in `story.1.2.3.x`, the fourth segment cannot be a number.
  - It is checked against today's tree with `find docs evals skills \( -name 'story.*' -o -name 'epic.*' \) | grep -E '/(story\.[0-9]+\.[0-9]+|epic\.[0-9]+)\.[0-9]'`, which returns nothing.
- A sub-story is a letter suffix on S: `story.1.2.3A.slug` (`create-branch/SKILL.md`: "creating `story.309.2.3A`").
- Task and bug grammar is unchanged.
- **Artifacts are recognised the way `WORK_ITEM_ARTIFACT_RE` recognises them**: an artifact keyword as a
  whole dot-segment anywhere after the id. The canonical form `.{artifact}.{seq}.{slug}` (and
  `.plan.{slug}`) fills `seq` and `slug`. The tree also holds non-canonical artifacts that `parse` must
  still classify as artifacts, never as documents and never as `bad-shape`: a dated review
  (`task.12.review.2026-05-06.md`), a slug before the keyword
  (`task.11.review-task-tracker-dedup.review.2026-05-06.md`) and a seq-less DoD sidecar
  (`task.133.dod.security.by-hand-probe.md`, `task.125.dod.security.run.json`). For these `parse` returns
  the artifact with `seq: null` and `canonical: false`; the round-trip property covers canonical names
  only. Found with `ls docs/tasks/*/ | grep -E '\.(review|qa|dod|gate|handover|handoff|risk|test-design|pr-review)\.' | grep -vE '\.(review|qa|dod|gate|handover|handoff|risk|test-design|pr-review)\.[0-9]+\.'`.
- A single-segment remainder is always the document's slug, even when it equals an artifact word:
  `story.1.2.3.plan.md` is the story whose slug is `plan` (an artifact needs at least one segment after
  its keyword).

**`check` reasons:** `ok`, `bad-shape`, `dir-stem-mismatch`, `frontmatter-mismatch`, `parent-missing`,
`parent-number-mismatch`, `unregistered`, `duplicate-id`, `registry-missing`.

**CLI:**

```bash
command node shared/resources/doc-id.js parse <name> --json
command node shared/resources/doc-id.js next prd   [--prd-root R] --json
command node shared/resources/doc-id.js next epic  --prd-dir  <dir> --json
command node shared/resources/doc-id.js next story --epic-dir <dir> --json
command node shared/resources/doc-id.js check <path> --json
command node shared/resources/doc-id.js check --corpus [--prd-root R] --json
```

Exit codes: `0` for success (`ok`, `empty`), `1` when a guard tripped (findings), `2` for a usage
error. These are the same values as `tracker-comment.js` ("Exit codes: 0 = every normal outcome, 1 =
skip under --strict, 2 = usage error").

**Frontmatter** (defined by the standards; nothing writes it until tasks 203–206):

| Doc | Fields |
| --- | --- |
| PRD | `prd_number: P` |
| Epic | `prd_number: P`, `epic_number: E`, `prd_source:` (required) |
| Story | `prd_number: P`, `epic:` = the epic directory stem |

**PRD registry:** `${PRD_ROOT}/prd-registry.md`. It has the same shape as `docs/tasks/task-registry.md`:
a **Next Available PRD Number** line and a table `| PRD # | Title | Folder | Status | Created |`. The
Title cell links to the PRD document. Its standard is `docs/standards/prd-registry.md`.

### Important Clarifications

- **`check` does not tell legacy from new by shape alone.** A legacy sub-story
  `story.{E}.{S}.{SUB}.slug` and a new `story.{P}.{E}.{S}.slug` are the same shape whenever SUB is
  numeric. `check` treats every name as new. Task 203's migration decides "legacy" from the missing
  `prd_number` frontmatter, never from the filename.
- **Duplicate detection is the guard against parallel allocation.** Two branches can each take
  `next epic` for the same PRD. The second one to merge is caught by `duplicate-id` in the corpus
  check (task 207 runs it in CI), not by a lock.
- **The global epic registry is not touched here.** Task 203 retires it. Until then it still governs
  the existing epics 1–4.

## 4. Scope

### In Scope

- ✅ `shared/resources/doc-id.js` (library + CLI) and `shared/resources/tests/doc-id.test.mjs`
- ✅ A `prd` kind in `parseRegistry`, with a `kind`-scoped href check, in `skills/develop-next/scripts/select-next.mjs`
- ✅ `docs/standards/prd-registry.md` (new)
- ✅ Updates to `docs/standards/file-naming.md`, `prd-documents.md`, `epic-documents.md`, `story-documents.md` and `epic-registry.md` (the last one marked as superseded by 203)
- ✅ `docs/architecture/concepts/coding-standards.md` § Registries — add the PRD registry and the dated interim note beside "Epic numbers are globally unique". It is a `devLoadAlwaysFiles` entry, loaded into every pipeline run, so leaving it would contradict the standards this task rewrites
- ✅ Tests that fix `doc-id.js`'s artifact list as equal to `WORK_ITEM_ARTIFACT_RE`

### Out of Scope

- ❌ Migrating any caller (`create-story/lib.js`, `finalise-fix-and-recheck.mjs`, `generate-prd-epic-index.mjs`, sync scripts, step docs). That is tasks 204–206, and doing it here would make this task unrevertable on its own.
- ❌ Renaming any document. That is task 203.
- ❌ Creating `docs/prd/prd-registry.md` in this repo. Task 203 creates it with the migration.
- ❌ The CI corpus test and the no-hand-rolled-regex test. That is task 207: they would be red against today's unmigrated tree.
- ❌ Bundling `doc-id.js` into any skill. Nothing cites it yet, and task 204 is the first skill to do so.

## 5. Breaking Changes

**Code:** none. The engine is new and nothing calls it. The `parseRegistry` change only adds a kind,
and the `bug` and `task` paths keep their behaviour. The existing `select-next` and `registry-tick`
suites prove that.

**Documentation:** the standards change what a *conforming* document looks like, ahead of the skills
that write one.

### Breaking Change 1: The standards describe the hierarchical scheme

- **Before:** `file-naming.md` Core documents table lists PRD `prd.{name}.md`, Epic `epic.{number}.{name}.md` and Story `story.{epic}.{story}.{name}.md`.
- **After:** PRD `prd.{P}.{name}.md`, Epic `epic.{P}.{E}.{name}.md`, Story `story.{P}.{E}.{S}.{name}.md`, and the artifact patterns follow the same id shape.
- **Impact:** for the time between this task and task 206, the standards and the skills disagree.
- **Migration path:** each changed standard section carries a dated note: "Skills adopt this scheme in tasks 204–206. Until then, `create-*` still writes the legacy shape and `doc-id.js parseLegacy` reads it." Task 207's doc sweep removes the notes.

## 6. Implementation Plan

> Detailed implementation guide: [task.202.plan.doc-id-engine-and-prd-registry.md](task.202.plan.doc-id-engine-and-prd-registry.md)

### Phase 1: Grammar and pure functions

**Risk:** Medium (grammar errors propagate to every later task). **Files:** `shared/resources/doc-id.js`, `shared/resources/tests/doc-id.test.mjs`. **Dependencies:** none.

- [x] Define the id grammar for prd, epic, story (with sub-story suffix), task and bug, plus the co-located artifact forms
- [x] Implement `parse`, `parseLegacy` and `format`, with a round-trip property test over a generated name set
- [x] Classify non-canonical artifacts (dated, slug-before-keyword, seq-less) as artifacts with `seq: null, canonical: false`, with a test over the tracked `docs/tasks/` and `docs/bugs/` filenames asserting `parse`'s document-vs-artifact verdict agrees with `isWorkItemDocument` for every `task.*` / `bug.*` name
- [x] Implement `matchesEpic(name, P, E)`, including a test that `epic.1.*` does not claim `epic.1.2.x`'s sibling `epic.12.1.x`
- [x] Implement `nextNumber` as highest + 1, with a test proving a deleted number is not reused (the contrast with `nextStoryId`)

### Phase 2: Checks and CLI

**Risk:** Medium. **Files:** `shared/resources/doc-id.js` and its test. **Dependencies:** Phase 1.

- [x] `check(path)`: shape, dir = stem, frontmatter numbers = filename numbers, parent exists with the same P/E, registry row present
- [x] `checkCorpus(prdRoot)`: walk `${PRD_ROOT}` (excluding `prd-registry.md` and shard files that carry no kind prefix), report `duplicate-id`, return `empty` for a tree with no documents
- [x] `resolvePrdRoot`, using the same order as `generate-prd-epic-index.mjs` `prdRootFromConfig`
- [x] CLI with `--json`, `reason` and exit codes 0, 1 and 2, all covered by spawned-process tests that read stdout through a pipe

### Phase 3: Registry parser and standards

**Risk:** Low. **Files:** `skills/develop-next/scripts/select-next.mjs`, `docs/standards/*.md`. **Dependencies:** Phase 1.

- [x] Add `prd` to `DEFAULT_COLUMNS` and `"prd #"` to `COLUMN_ALIASES`, and accept a `prd.` href only when `kind === "prd"`
- [x] Write `docs/standards/prd-registry.md`, modelled on `docs/standards/task-registry.md`
- [x] Rewrite the patterns in `file-naming.md`, `prd-documents.md`, `epic-documents.md` and `story-documents.md`, and add the interim note to each
- [x] Mark `docs/standards/epic-registry.md` as superseded by per-PRD numbering, effective with task 203
- [x] Update `docs/architecture/concepts/coding-standards.md` § Registries: add the PRD registry bullet (`${PRD_ROOT}/prd-registry.md`, Next Available PRD Number) and the dated interim note on the epic bullet

## 7. Files Summary

### Files to Create

1. ✅ `shared/resources/doc-id.js` — the engine and CLI
2. ✅ `shared/resources/tests/doc-id.test.mjs` — unit, property and CLI tests. It sits under the `'shared/resources/tests/*.test.mjs'` glob already in the `package.json` `test` script, so no glob edit is needed
3. ✅ `docs/standards/prd-registry.md` — the PRD registry standard

### Files to Modify (Core Implementation)

4. ✅ `skills/develop-next/scripts/select-next.mjs` — `DEFAULT_COLUMNS`, `COLUMN_ALIASES`, and a `kind`-scoped href check in `parseRegistry`

### Files to Modify (Tests)

5. ✅ `evals/develop-next/unit/select-next.test.mjs` — a `prd` registry case, plus a regression showing that a roadmap `prd.` link is still not a work item

### Files to Modify (Documentation)

6. ✅ `docs/standards/file-naming.md`
7. ✅ `docs/standards/prd-documents.md`
8. ✅ `docs/standards/epic-documents.md`
9. ✅ `docs/standards/story-documents.md`
10. ✅ `docs/standards/epic-registry.md`
11. ✅ `docs/standards/README.md` — list `prd-registry.md`
12. ✅ `docs/architecture/concepts/coding-standards.md` — § Registries: PRD registry bullet and the interim note

## 8. Testing Strategy

### Unit Tests

- **Scope:** every `parse` branch (each kind, sub-story, artifact, legacy, rejection reasons), `format` round-trip, `matchesEpic`, `nextNumber`, and every `check` reason.
- **Command:** `command node --test shared/resources/tests/doc-id.test.mjs`
- **Control case:** a story id shape the grammar must reject, `story.1.2.3.4x` (a slug starting with a digit), and one it must accept, `story.1.2.3A.hero`.
- **Mutation proof:** for each `check` reason, delete the branch that raises it and confirm a test goes red. Record each mutation in the implementation report.

### Integration Tests

- **Scope:** `checkCorpus` against a fixture tree under `shared/resources/tests/fixtures/doc-id/`, with one valid PRD → epic → story chain and one defect for each reason.
- **Scope:** the CLI as a spawned process, with exit code and `--json` `reason` asserted for `ok`, `empty`, findings and usage.

### Contract Tests

- **Artifact vocabulary:** `doc-id.js`'s list is equal to `WORK_ITEM_ARTIFACT_RE` from `finalise-fix-and-recheck.mjs`. This holds them in step until task 206 makes one re-export the other.
- **Classification agreement:** for every tracked `task.*` / `bug.*` filename under `docs/tasks/` and `docs/bugs/`, `parse` calls it an artifact exactly when `isWorkItemDocument` rejects it as one. Control cases: `task.12.review.2026-05-06.md` (artifact, non-canonical) and `task.202.doc-id-engine-and-prd-registry.md` (document).

### Performance Tests

- Not applicable. The corpus walk reads directory names and frontmatter only. No baseline is needed.

### Consumer Tests

- **Scope:** the `npm test` suites that exercise `parseRegistry` today stay green unchanged: `evals/develop-next/unit/select-next.test.mjs` and `shared/resources/tests/registry-tick.test.mjs`.

## 9. Success Criteria

### Functional

- [ ] `parse` and `format` round-trip every name in the generated set, which covers each kind, sub-story and artifact form
- [ ] `matchesEpic("epic.1.2.x", 1, 2)` is true, and both `matchesEpic("epic.12.1.y", 1, 2)` and `matchesEpic("epic.1.21.z", 1, 2)` are false
- [ ] `nextNumber("story", ["story.1.1.1.a","story.1.1.3.b"])` returns `4`, not `2`
- [ ] `check --corpus` on the fixture tree reports exactly one finding per seeded defect, each with its named `reason`, and reports `ok` on the valid chain
- [ ] `parseRegistry(t, "prd", …)` returns the PRD row in `rows` for the table measured in §2, and the same href in a roadmap is still not treated as a work item

### Performance

- [ ] `check --corpus` over this repo's `docs/prd` tree finishes in under 1 s (measured with `time` on the PR's head commit, with `uptime` recorded beside it, both in the implementation report)
- [ ] No new runtime dependency is added to `package.json`

### Code Quality

- [ ] `npm test` passes with the gitignored `.agents/skills` symlink moved aside
- [ ] Every `check` reason has a mutation-proven test
- [ ] `npm run bundle:check` is clean: `doc-id.js` is not yet cited, so it is in no skill's closure and creates no `UNREACHED` copy

### Migration

- [ ] The four changed standards, and `coding-standards.md` § Registries, carry the dated interim note
- [ ] `docs/standards/prd-registry.md` defines the registry location, columns, counter and the never-reuse rule
- [ ] `epic-registry.md` names task 203 as the point where it is retired

## 10. Risk Assessment

### High Risk Areas

1. **A grammar defect ships into five downstream tasks.**
   - **Probability:** Medium.
   - **Impact:** High. Tasks 203–206 all build on it.
   - **Mitigation:** the round-trip property test, the explicit control cases, and the rule that a slug starts with a letter, checked against today's tree with the command in §3.
   - **Rollback:** revert this task. Nothing calls the engine.

### Medium Risk Areas

1. **Widening `isWorkItemHref` changes the roadmap reader.**
   - **Probability:** Medium, if it is done globally.
   - **Impact:** Medium. Roadmap PRD links would turn into frontier items.
   - **Mitigation:** accept a `prd.` href only when `kind === "prd"`, with a regression test on the roadmap path.
2. **The two artifact lists diverge before task 206.**
   - **Mitigation:** the equality contract test in §8.

### Low Risk Areas

1. **Standards run ahead of the skills.** The dated interim note documents it, and task 207 removes the note.
2. **CJS import from `.mjs` callers.** This works through `createRequire`, the precedent in `card-preflight.test.mjs`, and the test loads it from `.mjs`.

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers:** `npm test` red on `select-next` or `registry-tick` after merge, or a downstream task finds a grammar defect it cannot work around.
- **Steps:** `git revert` the merge commit. No document, registry or caller depends on the engine yet.
- **Validation:** `npm test` passes, and `git grep -n "doc-id" -- skills shared` returns only the reverted files.

### Partial Rollback (1–2 hours)

- **When to use:** only the `parseRegistry` change misbehaves.
- **Steps:** revert the `select-next.mjs` hunk and its test. The engine and the standards stay.

### Forward Fix

- **When to use:** a grammar gap found by task 203 or later.
- **Approach:** extend the grammar in `doc-id.js` with a new test case. Callers are not edited.

### Rollback Triggers

- **Critical:** a regression in `select-next` or `registry-tick` behaviour.
- **Non-critical:** a wording issue in the standards. Fix forward.

<!--
  Canonical spec: references/document-change-log.md
-->

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-15
**Quality Score**: 60/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.202.qa.1.doc-id-engine-and-prd-registry.md](./task.202.qa.1.doc-id-engine-and-prd-registry.md)
- **Gate File**: [task.202.gate.1.doc-id-engine-and-prd-registry.yml](./task.202.gate.1.doc-id-engine-and-prd-registry.yml)

### Test Coverage Summary
- **Tests Executed**: 32 (28 doc-id + 4 select-next), inside a 5542-test green suite
- **Phases Verified**: 3/3
- **Critical Issues**: 0
- **NFR Status**: Security: CONCERNS, Performance: PASS, Reliability: CONCERNS, Maintainability: PASS

### Key Findings
Four medium defects in `doc-id.js`: a number past `Number.MAX_SAFE_INTEGER` parses as valid (security probe), a tail-deleted number is reused despite the never-reuse claim, `format()` accepts non-canonical parts, and `next epic/story` allocate under a missing parent. Four low and three advisory findings in the QA report.

<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-13 | 1.0 | Initial draft, from `.agents/plans/hierarchical-doc-numbering.md` (T1) | create-task |
| 2026-10-15 | 1.1 | Review passed (8/10): added non-canonical artifact classification + agreement test, `coding-standards.md` § Registries to scope, load-recorded timing criterion | review-task |
| 2026-10-15 |  | Status → ready-for-development | review-task |
| 2026-10-15 |  | Implemented — 33 files (doc-id.js + CLI, 20 fixtures, select-next prd kind, 8 standards), 32 tests | develop |
| 2026-10-15 |  | QA gate CONCERNS (60/100) — 8 findings (4 medium, 4 low) | qa-task |
| 2026-10-15 |  | QA findings fixed — cycle 1, 8 gate findings + 3 advisory, 11 tests | qa-fix |

<!-- change-log-end -->

## Progress Tracking

### Phase 1: Grammar and pure functions
- [x] Complete

### Phase 2: Checks and CLI
- [x] Complete

### Phase 3: Registry parser and standards
- [x] Complete

---

## References

- `.agents/plans/hierarchical-doc-numbering.md` — the approved series plan
- `shared/resources/card-preflight.js` — CJS engine precedent
- `shared/resources/tracker-comment.js` — the exit-code and `reason` contract
- `docs/standards/task-registry.md` — the shape model for the registry standard

## Notes

Owner decisions (2026-10-13), from plan mode:

| Decision | Answer |
| --- | --- |
| Epic number scope | Per PRD: `epic.1.1`, `epic.1.2`, `epic.2.1` |
| Epics with no PRD | Not allowed. `create-epic` halts (task 205) |
| Existing documents | Migrated by script (task 203); parsers then accept only the new shape |

QA artifacts will land in this directory: `task.202.qa.{n}.doc-id-engine-and-prd-registry.md`,
`task.202.gate.{n}.doc-id-engine-and-prd-registry.yml`, and `task.202.bug.{n}.{name}.md` if bugs are
found.

**Status:** Ready for Review

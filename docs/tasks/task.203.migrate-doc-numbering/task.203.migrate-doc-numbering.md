---
id: task.203
title: "Migrate documents to hierarchical numbering"
type: task
description: "Ship a dry-run-by-default migration script that renames PRDs, epics and stories to the hierarchical prd.P / epic.P.E / story.P.E.S scheme, rewrites their frontmatter and links, builds the PRD registry and retires the global epic registry — then run it on this repository's onboarding PRD."
tags: [doc-numbering, prd, epic, story, migration, prd-registry, epic-registry]
category: refactoring
status: planned
priority: Medium
risk_level: high
created: 2026-10-13
updated: 2026-10-13
assignee:
estimated_effort_hours: 16
github_issue: 646
---

# Technical Task: Migrate documents to hierarchical numbering

**Status:** Planned

**GitHub Issue**: [#646](https://github.com/Gamaroff/agent-skills/issues/646)

---

## 1. Overview

Existing PRDs, epics and stories carry the old flat names (`prd.{feature}`, `epic.{E}`, `story.{E}.{S}`).
Once the hierarchical scheme is the only accepted shape, every one of them has to move. This task
ships the one tool that moves them, `shared/resources/migrate-doc-numbering.mjs`, and runs it on this
repository.

**Scope**: The migration engine and CLI. Its run on this repository's onboarding PRD (1 PRD, 4 epics,
17 stories, 146 tracked files). Retiring this repository's global epic registry into a pointer to the
PRD registry. No skill's prose changes here. Tasks 204–207 rewire the skills.

**Key deliverables**:

1. **`migrate-doc-numbering.mjs`.** Dry-run by default, `--apply` to write, `--check` for review
   gates and CI. Same `--json` `reason` and exit-code contract as the peer engines.
2. **This repository migrated.** `docs/prd/onboarding/prd.onboarding.md` →
   `docs/prd/onboarding/prd.1.onboarding/prd.1.onboarding.md`, and its epics and stories
   renumbered under it.
3. **The global epic registry retired.** `docs/development/epic-registry.md` becomes a pointer to
   `docs/prd/prd-registry.md`, and keeps the old global numbers as a historical mapping table.

**Expected outcome**: a second `--apply` run is a byte-for-byte no-op. `doc-id check --corpus`
(task.202) is clean over `docs/prd/**`. No markdown link that resolved before the run is dead after it.

---

## 2. Motivation

### Current Problems

- **Nothing can move an existing tree.** task.202 defines the new shape and the checker that
  enforces it. Without a migration, turning that checker on fails every existing document. This
  repository's corpus alone is 146 tracked files under `docs/prd/`
  (`git ls-files docs/prd | wc -l`).
- **Renaming by hand breaks links silently.** The tree holds 192 relative markdown links, 17 of
  which leave the PRD directory. Ten of those 17 are live today. Moving the PRD down one directory
  level (into its own `prd.1.onboarding/` folder) changes what every one of those 17 resolves to.
  Four files outside the tree carry 19 live links into it. (Measured with the link scan in the plan
  file, Phase 4.)
- **This repository's PRD is already off-standard.** The PRD file sits directly in the domain
  folder (`docs/prd/onboarding/prd.onboarding.md`), so the directory name `onboarding` does not
  match the file stem `prd.onboarding`. The standard at `v0.55.0` wants
  `{domain}/prd.{feature}/prd.{feature}.md`. `generate-prd-epic-index.mjs:203`
  (*"dir is already named prd.<name>"*) therefore skips this PRD.
- **Two parent-field shapes exist.** All 17 story docs in this repository write `epic:` as a bare
  integer (`epic: 1`). The released standard requires the epic directory stem
  (`docs/standards/story-documents.md` at `v0.55.0`, *"Must match the parent epic's directory
  stem"*). A migration that only handles the standard shape misses every real story here.
- **The global epic registry has no meaning under per-PRD numbering.** In the new scheme an epic
  number counts within its PRD, so `docs/development/epic-registry.md` and its "Next Available Epic
  Number: 5" would mislead the next `/create-epic`.

### Benefits of a single migration engine

- **One deterministic rename map**: every path, frontmatter field and link is rewritten from the
  same old → new table, and that table is printed in dry-run before anything moves.
- **Consumer projects get the same tool**: `review-prd` (task.204) calls `--check` and offers
  `--apply`, so no consumer hand-renames a tree.
- **Link integrity is enforced, not hoped for**: the run refuses to finish if a link that resolved
  before the move would be dead after it.
- **Unblocks 204–207**: they can switch their parsers to the new shape only after the corpus has
  moved.

---

## 3. Technical Background

### Current Architecture

Every name below was grepped on `develop` at `a0f1f97d`.

**This repository's tree** (`find docs/prd -type d | sort`):

```
docs/prd/onboarding/
├── prd.onboarding.md                          # name: prd.onboarding — no number, dir ≠ stem
└── epics/
    ├── epic.1.quickstart-and-decision-tree-entry-point/   # epic_number: 1, prd_source: "docs/prd/onboarding/prd.onboarding.md"
    │   └── stories/story.1.{1..5}.<slug>/
    ├── epic.2.worked-prd-epic-story-examples/  └── stories/story.2.{1..4}.<slug>/
    ├── epic.3.runbook-tutorial-wrappers/       └── stories/story.3.{1..3}.<slug>/
    └── epic.4.first-week-guided-learning-path/ └── stories/story.4.{1..5}.<slug>/
```

- 146 tracked files: 129 `.md` and 17 `.yml` gates (`git ls-files docs/prd | grep -v '\.md$' | wc -l`).
- **11 files carry no id prefix.** They are named `sprint-review-summary.md`
  (`find docs/prd -type f ! -name 'story.*' ! -name 'epic.*' ! -name 'prd.*'`).
- **Artifact names use two infix shapes.**
  - The short-id form: `story.1.1.validate.2026-05-12.md`.
  - The full-stem form: `story.3.1.before-you-start-anchor-runbooks.validate.2026-05-13.md`.
- **Story main-doc statuses:** 16 `accepted` and 1 `cancelled` (`story.2.3`). No story is in flight.

**Story frontmatter that names a parent** (`git grep -n -E '^(epic|epic_file|prd_source):' -- docs/prd`):

| Field | Count | Shape today |
|---|---|---|
| `epic:` | 17 | integer, e.g. `epic: 1` |
| `epic_file:` | 17 | relative, e.g. `../../epic.1.quickstart-and-decision-tree-entry-point.md` |
| `prd_source:` | 21 (17 stories + 4 epics) | repo-relative, `docs/prd/onboarding/prd.onboarding.md` |
| `id:` | per story | `story.1.1.first-task-in-10-minutes` |

**Gate files** carry `story: '1.1'`, written from the template at `skills/qa-gate/SKILL.md:490`
*(`story: "{epic}.{story}"`)*. No code reader of a gate's `story:` field turned up
(`git grep -n -E "gate\.story\b|\[.story.\]" -- '*.js' '*.mjs'` returns nothing).

**The epic registry.** `docs/development/epic-registry.md` holds four rows (gh#73–76, all Accepted)
and the line **Next Available Epic Number: 5**.

**References from outside the tree:**

| Class | Where | Measured |
|---|---|---|
| Live markdown links into the tree | `CHANGELOG.md` (1), `examples/README.md` (13), `examples/epic-examples/README.md` (4), `examples/prd-example/README.md` (1) | 19 links in 4 files |
| Path literals in code spans or frontmatter | `docs/runbooks/story-development.md` (5 `_Provenance:` lines), `docs/runbooks/task-development.md` (4), `examples/epic-examples/epic.*.md` (`prd_source:` and `source_path:`, 8) | `git grep -n 'docs/prd/onboarding' -- ':!docs/prd' ':!docs/tasks'` |
| Test allowlist keyed on live paths | `shared/resources/tests/doc-links.test.mjs:405` `KNOWN_ARTIFACT_LINKS`, `:418` `KNOWN_ARTIFACT_FENCES` | 13 `docs/prd` entries |
| History | `docs/tasks/**`, `CHANGELOG.md` prose, `.agents/**` | left untouched (see Clarifications) |

**Existing machinery to reuse:**

- `shared/resources/change-log.js` already performs an in-place, idempotent migration of legacy
  blocks (`migrateLegacyRow`, `change-log.js:416`). Its rule, *"migration must never"* rewrite a row
  that already has the new shape (`:414`), is the pattern this engine copies for its idempotence.
- `shared/resources/resolve-paths.sh:55` resolves `PRD_ROOT` from `prd.prdShardedLocation`
  (default `docs/prd`). The engine reads the same key and never hard-codes `docs/prd`.
- task.202 ships `shared/resources/doc-id.js`, which provides:
  - `parse`, `format` and the canonical regexes
  - the PRD-registry format and `next prd`
  - `check --corpus`

  This engine calls those functions and does not define a second identifier regex. task.207's
  no-hand-rolled-regex test enforces that.

### Legacy shapes the engine must read

These are derived from the last release tag, `v0.55.0`, plus what is on disk:

| # | Legacy PRD shape | Source |
|---|---|---|
| L1 | `${PRD_ROOT}/{domain}/prd.{feature}/prd.{feature}.md` (the standard) | `git show v0.55.0:docs/standards/prd-documents.md` § Directory layout; `create-prd/SKILL.md:45` |
| L2 | `${PRD_ROOT}/{domain}/prd.{feature}.md`, with the PRD directly in the domain dir | this repository (`docs/prd/onboarding/prd.onboarding.md`) |
| L3 | `docs/prd.md` monolith, or a sharded `${PRD_ROOT}/index.md` | `create-prd/SKILL.md:46` (greenfield), `shard-prd/SKILL.md:87` |

| Field | Legacy shapes |
|---|---|
| story `epic:` | an integer (this repository), or the epic dir stem (the standard) |
| epic `prd_source:` | a repo-relative path, a bare shard filename (`create-epics-from-shards`), or `brownfield-enhancement` (`create-epic/SKILL.md:109`) |

### Target Architecture

```
docs/prd/
├── prd-registry.md                                         # task.202 format; row 1 = onboarding
└── onboarding/
    └── prd.1.onboarding/
        ├── prd.1.onboarding.md                             # name: prd.1.onboarding, prd_number: 1
        └── epics/
            └── epic.1.1.quickstart-and-decision-tree-entry-point/
                ├── epic.1.1.quickstart-and-decision-tree-entry-point.md   # prd_number: 1, epic_number: 1
                └── stories/story.1.1.1.first-task-in-10-minutes/
                    ├── story.1.1.1.first-task-in-10-minutes.md            # id, epic: <epic dir stem>, prd_number: 1
                    ├── story.1.1.1.qa.1.quickstart-walkthrough.md
                    ├── story.1.1.1.gate.1.quickstart-walkthrough.yml      # story: '1.1.1'
                    └── sprint-review-summary.md                           # unprefixed: name unchanged
```

**The engine runs in four stages, and none writes until all have passed.**

1. **Discover.** Walk `${PRD_ROOT}` and classify every PRD (L1/L2/L3), epic and story, with their artifacts.
2. **Plan.** Build the rename map:
   - **PRD numbers.** An already-numbered PRD keeps its number. The rest take `next prd` in path
     order.
   - **Epic numbers.** Within each PRD, epics are renumbered 1..n in ascending order of their old
     global number. An already-numbered epic keeps its number.
   - **Story numbers.** Unchanged within the epic. Only the prefix changes.
   - Every file whose basename starts with an old id prefix gets the new prefix.
3. **Verify.** Run the blocker checks below. Simulate every rewrite and re-resolve every live link
   against the post-move tree.
4. **Apply** (only with `--apply`).
   - Move each file: `git mv` for tracked files, a plain rename for untracked ones. Old
     directories are removed once empty.
   - Rewrite frontmatter, live links and exact path literals.
   - Write the PRD registry and the epic-registry pointer.
   - Run `doc-id check --corpus`.

**Exit and `reason` contract** (the same shape as `tracker-comment.js`):

| `reason` | Exit | Meaning |
|---|---|---|
| `dry-run` | 0 | The plan was printed and nothing was written. This is the default mode |
| `ok` | 0 | `--apply` wrote everything and the post-check is clean |
| `already` | 0 | Nothing needs migrating |
| `needs-migration` | 1 | `--check` found documents still to migrate |
| `blocked` | 1 | At least one blocker was found and nothing was written. Each blocker names its path and code |
| `post-check-failed` | 1 | `--apply` wrote, but `doc-id check --corpus` is not clean. The report says how to revert |
| `usage` | 2 | A bad flag or an unreadable config |

**Blocker codes:**

| Code | Raised when |
|---|---|
| `prd-less-epic` | An epic has no resolvable parent PRD (`brownfield-enhancement`, a missing path, or no PRD in an ancestor dir). It is never guessed |
| `unplaced-prd` | An L3 monolith or index PRD has no feature slug. It needs `--name <path>=<slug>` |
| `in-flight` | A story's status is not terminal (`accepted` or `cancelled`), so a live branch and run state still name it. `--allow-in-flight` overrides this |
| `target-exists` | A destination path is already occupied |
| `dirty-path` | A path to be moved has uncommitted changes |
| `link-would-break` | A link that resolves today would be dead after the move |
| `registry-behind` | The PRD registry counter is lower than the highest PRD number on disk (from task.202 `nextNumber`). It is never overridden |

### Important Clarifications

- **Story titles and H1s are not rewritten.** `title: "[Story 1.1] …"` and `# [Epic 1] …` mirror
  the tracker card summaries. Rewriting them would rename the remote cards on the next sync, and
  the plan keeps the tracker side untouched. The title format under the new scheme is task.206's
  decision.
- **What counts as an identifier to rewrite.** The engine rewrites whole old **stems**
  (`story.1.1.first-task-in-10-minutes`) and whole old **basenames**. It never rewrites a bare
  `story.1.1`, `Story 1.1` or `Epic 1` in prose, because those are ambiguous and also appear in
  titles.
- **Dead links stay byte-identical.** Only links that resolve today are re-pointed. A dead link
  keeps its text, so the doc-links ratchet (`doc-links.test.mjs`) still sees exactly the same dead
  links under their new file paths. Its `healed` assertion fails if a move accidentally makes a
  dead link live.
- **History is not rewritten.** Path literals in `docs/tasks/**`, `docs/bugs/**`, `.agents/**` and
  `CHANGELOG.md` prose stay as written, because they record what was true at the time. Live
  markdown links are re-pointed everywhere, history included, because a dead link is a defect
  wherever it sits.
- **In this repository, epic renumbering is the identity.** The four epics are the only ones under
  PRD 1, and their old global order is 1–4. So `epic.1.quickstart…` becomes `epic.1.1.quickstart…`
  and the E stays the same. The mapping report still records every row, so a consumer with
  several PRDs can see their epics change number.
- **`generate-prd-epic-index.mjs` still will not find the migrated PRD.** It assumes a flat
  `<root>/<p>/<p>.md` layout (`generate-prd-epic-index.mjs:25`), and the migrated PRD sits one level
  deeper, under the domain folder. Fixing that is task.205. This task does not touch the generator.

---

## 4. Scope

### In Scope

✅ `shared/resources/migrate-doc-numbering.mjs`, covering the engine and the CLI: discover, plan,
verify and apply, with `--apply`, `--check`, `--json`, `--name`, `--allow-in-flight` and `--root`
✅ Its unit and fixture tests under `shared/resources/tests/`
✅ Reading all three legacy PRD shapes (L1, L2, L3) and both story `epic:` shapes
✅ Rewriting renamed paths, frontmatter (`name`, `id`, `prd_number`, `epic_number`, `epic`, `epic_file`,
`prd_source`, gate `story:`), live relative links repo-wide, and exact path literals outside history
✅ Writing `${PRD_ROOT}/prd-registry.md` and turning `docs/development/epic-registry.md` into a pointer
that keeps a historical old → new mapping table
✅ Running the migration on this repository, including re-keying `doc-links.test.mjs`'s
`KNOWN_ARTIFACT_LINKS` and `KNOWN_ARTIFACT_FENCES` entries to the moved paths

### Out of Scope

❌ **Changing any skill's prose or parser.** That is task.204 (PRD skills), task.205 (epic skills)
and task.206 (story and pipeline code). Between this task and 206, only accepted documents carry
the new names.
❌ **Wiring `--check` into `review-prd`.** That is task.204.
❌ **Fixing `generate-prd-epic-index.mjs` for the domain level.** That is task.205.
❌ **Renaming eval and test fixtures**, such as `evals/develop-story/step-isolation/*/replay/…/epic.5.example`.
They are synthetic trees and move with the parser change in task.206, which runs this engine over them.
❌ **Renaming Jira or GitHub cards, milestones or branches.** The migration renames local files only.
❌ **`scripts/setup-consumer.sh`.** It still creates an empty epic registry (`setup-consumer.sh:709`),
and the doc sweep in task.207 changes that.
❌ **The copies in `examples/prd-example/` and `examples/epic-examples/`.** They are captured copies
outside `PRD_ROOT` and are not renamed. Only their provenance links and literals are re-pointed.

---

## 5. Breaking Changes

### Breaking Change 1: PRD, epic and story paths change

**What changed**: Every document under `${PRD_ROOT}` moves to its hierarchical path.

**Before**:
```
docs/prd/onboarding/prd.onboarding.md
docs/prd/onboarding/epics/epic.2.worked-prd-epic-story-examples/stories/story.2.3.capture-story-messy-path/story.2.3.capture-story-messy-path.md
```

**After**:
```
docs/prd/onboarding/prd.1.onboarding/prd.1.onboarding.md
docs/prd/onboarding/prd.1.onboarding/epics/epic.1.2.worked-prd-epic-story-examples/stories/story.1.2.3.capture-story-messy-path/story.1.2.3.capture-story-messy-path.md
```

**Impact**:
- A bookmark or external URL pointing at an old path breaks.
- An in-flight branch that still names an old path conflicts on merge.
- In this repository, no story is in flight, and the 19 inbound links are re-pointed by the run.

**Migration path**: The run *is* the migration, and the dry-run output is the review artefact.
- **Consumers** run `command node .agents/skills/review-prd/references/migrate-doc-numbering.mjs`
  (that path ships with task.204), read the plan, then re-run with `--apply` and commit the result
  as one commit.
- **In-flight stories** block the run. Finish or cancel them first, or pass `--allow-in-flight` and
  rebase their branches afterwards.

### Breaking Change 2: Parent fields take new values

**What changed**:
- Story `epic:` becomes the epic directory stem.
- `prd_source:` and `epic_file:` point at the new paths.
- A gate's `story:` becomes `P.E.S`.

**Before**: `epic: 1`, `prd_source: docs/prd/onboarding/prd.onboarding.md`, `story: '1.1'`

**After**: `epic: epic.1.1.quickstart-and-decision-tree-entry-point`,
`prd_source: docs/prd/onboarding/prd.1.onboarding/prd.1.onboarding.md`, `story: '1.1.1'`

**Impact**: A reader that parses `epic:` as an integer, or a gate's `story:` as `E.S`, misreads the
new value. In-tree readers are rewired in task.206. Until then only accepted docs carry the new
values, and no pipeline re-runs those.

**Migration path**: Written by the run. There is nothing to do by hand.

### Breaking Change 3: The global epic registry is retired

**What changed**: `docs/development/epic-registry.md` no longer allocates numbers.

**Before**: **Next Available Epic Number: 5**, plus four live rows.

**After**:
- The file says "retired — epic numbers count within their PRD" and links to
  `docs/prd/prd-registry.md`.
- The four rows remain as a historical table: old global number → new `P.E` and new folder.

**Impact**: `epic-registry-manager` and `/create-epic` still read the old counter until task.205
retires them. A `/create-epic` run in that window would read a file with no counter.

**Migration path**: Land task.205 next, or do not run `/create-epic` in this repository between the
two. The pointer file names task.205 so the window is visible.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.203.plan.migrate-doc-numbering.md](task.203.plan.migrate-doc-numbering.md)

### Phase 0: Dependency gate

**Risk**: Low · **Depends on**: task.202 merged to `develop`

- [ ] HALT unless `shared/resources/doc-id.js` exists on `develop` and exports `parse`, `parseLegacy`, `format`, `nextNumber` and `checkCorpus` (the names task.202 plans). Re-read its actual exports and registry format, and adjust the plan file before writing code
- [ ] Add `appendPrdRow` to `doc-id.js` (task.202 plans no row writer), so the registry format keeps one owner

### Phase 1: Discover and plan (pure)

**Risk**: Medium · **Files**: `shared/resources/migrate-doc-numbering.mjs`, `shared/resources/tests/migrate-doc-numbering.test.mjs`

- [ ] `discover(root)` classifies PRDs (L1/L2/L3), epics, stories and artifacts using `doc-id.parse`
- [ ] `plan(discovery, registry)` returns the rename map (old path → new path) and the frontmatter edits. It numbers per the rules in § 3
- [ ] Already-numbered documents are left alone; this is the idempotence rule
- [ ] Unit tests cover L1, L2 and L3, integer and stem `epic:`, both infix forms, unprefixed files, multiple PRDs (the epic renumber order) and a mixed partially-migrated tree

### Phase 2: Blockers and verification

**Risk**: High · **Files**: same module and test

- [ ] Implement the seven blocker codes, aggregated: one run reports every blocker, not just the first
- [ ] A simulated link pass resolves every relative link before and after the move against the rename map. Any `live → dead` transition is `link-would-break`
- [ ] A test for each blocker, each mutation-proven (disable the check, watch its test go red)

### Phase 3: Apply and the CLI

**Risk**: High · **Files**: same module, CLI section

- [ ] `--apply`: moves per file (`git mv` for tracked files, a rename for untracked ones), removes empty old dirs, then rewrites text
- [ ] Rewrite rules: frontmatter fields, whole-stem and whole-basename tokens, live relative links (repo-wide) and exact path literals (outside history)
- [ ] Writes the PRD registry through task.202's writer, and the epic-registry pointer with its historical table
- [ ] Runs `doc-id check --corpus` afterwards and returns `post-check-failed` on any finding
- [ ] `--check`, `--json` and `--name`; the exit and `reason` contract from § 3
- [ ] A fixture test applies to a temp git repo, then re-runs and asserts `already` with zero diff

### Phase 4: Migrate this repository

**Risk**: Medium · **Files**: `docs/prd/**`, `docs/development/epic-registry.md`, `docs/prd/prd-registry.md`, the 4 inbound-link files, 2 runbooks, 4 example epics, `shared/resources/tests/doc-links.test.mjs`

- [ ] Dry run: review the mapping (1 PRD, 4 epics, 17 stories, 146 files). Record it in the implementation report
- [ ] `--apply`, then commit as a single commit
- [ ] Re-run: `already`, with a clean `git status`
- [ ] `npm test` and `npm run eval:all` pass, and the doc-links ratchet reports no new or healed entries

---

## 7. Files Summary

### Files to Create (Core Implementation)

1. ✅ `shared/resources/migrate-doc-numbering.mjs` — engine and CLI
2. ✅ `docs/prd/prd-registry.md` — written by the run (format owned by task.202)

### Files to Modify (Core Implementation)

2a. ✅ `shared/resources/doc-id.js` (from task.202) — add `appendPrdRow`, the registry's one row writer

### Files to Create (Tests)

3. ✅ `shared/resources/tests/migrate-doc-numbering.test.mjs` — unit, blocker and fixture-apply tests (run by the existing `shared/resources/tests/*.test.mjs` glob in `package.json`)

### Files Moved or Rewritten by the Run

4. ✅ `docs/prd/onboarding/**` — 146 tracked files moved under `prd.1.onboarding/`
5. ✅ `docs/development/epic-registry.md` — retired to a pointer, keeping a historical table
6. ✅ `examples/README.md`, `examples/epic-examples/README.md`, `examples/prd-example/README.md`, `CHANGELOG.md` — live links re-pointed (19)
7. ✅ `docs/runbooks/story-development.md`, `docs/runbooks/task-development.md` — `_Provenance:` path literals
8. ✅ `examples/epic-examples/epic.{1..4}.*.md` — `prd_source:` and `source_path:` literals
9. ✅ `shared/resources/tests/doc-links.test.mjs` — `KNOWN_ARTIFACT_LINKS` and `KNOWN_ARTIFACT_FENCES` keys

### Files to Modify (Documentation)

10. ✅ `docs/tasks/task.203.migrate-doc-numbering/` — implementation report with the mapping table

### Files to Delete

None. Old directories become empty and are removed by the move. Nothing is deleted outright.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: `discover`, `plan`, each blocker and the link simulator, all pure, fed in-memory trees.
- **Actions**: one test per legacy shape (L1, L2, L3) and per `epic:` shape; a multi-PRD tree
  asserting per-PRD epic order; a partially-migrated tree asserting already-numbered documents keep
  their numbers; and a token test asserting `Story 1.1` and `[Epic 1]` in prose and titles are left
  untouched.
- **Command**: `command node --test shared/resources/tests/migrate-doc-numbering.test.mjs`
- **Mutation proof**: for each blocker, and for the identity-on-already-numbered rule, revert the
  check and confirm a named test goes red.

### Integration Tests

- **Scope**: `--apply` against a temp git repo built from a fixture tree.
- **Actions**:
  - Assert the moved paths exist, the old ones are gone and `git status` shows renames rather than
    delete-plus-add.
  - Assert every live link still resolves.
  - Assert dead links are byte-identical.
  - Assert a second run returns `already` with no diff.
- **Control case**: a fixture whose dead link would become *live* after the move. The run must not
  "heal" it silently: the text stays unchanged, and the report lists it.

### Corpus Test (this repository)

- After Phase 4: `doc-id check --corpus` is clean, and `doc-links.test.mjs` passes with no new and
  no healed entries.
- Before trusting a local green, move the gitignored `.agents/skills` symlink aside (see
  `docs/contributing/traps.md`).

### Consumer Tests

- Run the dry run against a copy of a consumer-shaped tree (L1 layout with a `brownfield-enhancement`
  epic). Expect `blocked` with `prd-less-epic`, and nothing written.

---

## 9. Success Criteria

### Functional

- [ ] On this repository, a dry run prints a map of 1 PRD, 4 epics, 17 stories and 146 files, and writes nothing (`git status` is unchanged)
- [ ] `--apply` produces `docs/prd/onboarding/prd.1.onboarding/prd.1.onboarding.md` with `prd_number: 1` and `name: prd.1.onboarding`
- [ ] Every story doc has `id: story.1.E.S.<slug>`, `epic: epic.1.E.<slug>`, a resolving `epic_file:` and `prd_source:`, and `prd_number: 1`
- [ ] Every gate's `story:` reads `1.E.S`
- [ ] A second `--apply` returns `reason: already` and exits 0 with an empty diff
- [ ] An epic with `prd_source: brownfield-enhancement` returns `reason: blocked` with code `prd-less-epic`, and nothing is written (Phase 2)
- [ ] A story with `status: in-progress` blocks with `in-flight` unless `--allow-in-flight` is passed (Phase 2)
- [ ] `--check` exits 1 with `needs-migration` before the run and exits 0 with `already` after it

### Performance

- [ ] A dry run over this repository's 146 files finishes in under 5 seconds
- [ ] `--apply` makes one `git mv` per tracked file, with no repeated full-tree walks inside the per-file loop

### Code Quality

- [ ] Every identifier is parsed through `doc-id.js`. No new `story\.(\d+)` or `epic\.(\d+)` regex exists in the engine
- [ ] Each blocker and the idempotence rule are mutation-proven
- [ ] `npm test`, `npm run eval:all` and `npm run bundle:check` pass

### Migration

- [ ] No relative link that resolved before the run is dead after it, repo-wide
- [ ] `docs/development/epic-registry.md` is a pointer whose historical table maps 1–4 to 1.1–1.4 and names task.205
- [ ] `doc-links.test.mjs` passes with its KNOWN sets re-keyed and no `healed` entries
- [ ] The implementation report records the full old → new mapping table

---

## 10. Risk Assessment

### High Risk Areas

1. **Links silently break or heal**
   - **Risk**: Adding a directory level changes what the 17 escaping links resolve to.
   - **Probability**: High without a guard.
   - **Impact**: Broken provenance, and red CI on the docs link check.
   - **Mitigation**: Every link is re-resolved before and after against the rename map. A
     `live → dead` change is the `link-would-break` blocker, and dead links keep their exact text.
     The doc-links `healed` assertion catches `dead → live`.
   - **Rollback**: Revert the single migration commit.

2. **Over-eager token rewriting**
   - **Risk**: Rewriting `Story 1.1` or `[Epic 1]` in titles would rename the tracker cards on the
     next sync.
   - **Probability**: Medium.
   - **Impact**: Remote card churn, and titles that no longer match the tracker.
   - **Mitigation**: Only whole old stems and basenames are rewritten. A unit test asserts that
     prose and titles are left alone.
   - **Rollback**: Revert the commit.

3. **A partial apply**
   - **Risk**: A crash midway through `--apply` leaves a half-moved tree.
   - **Probability**: Low.
   - **Impact**: A mixed tree.
   - **Mitigation**: All verification happens before the first write. Moves come before rewrites,
     and the engine is idempotent over a mixed tree (Phase 1), so re-running finishes the job.
   - **Rollback**: `git checkout -- . && git clean -fd docs/prd` on the uncommitted state.

### Medium Risk Areas

1. **The epic-registry window before task.205.** `/create-epic` reads a counter that no longer
   exists. Mitigation: the pointer names task.205, and the registry note orders 205 next.
2. **The shape of task.202's API differs from this plan.** Mitigation: the Phase 0 gate re-reads
   the actual exports and amends the plan before any code is written.

### Low Risk Areas

1. **Unprefixed `sprint-review-summary.md` files.** They move with their directory and keep their
   name; a test covers this.
2. **The example copies under `examples/`.** Only provenance literals and links change; their bodies
   stay frozen.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- `post-check-failed` after `--apply`.
- CI is red on doc links or the corpus after the merge.
- A consumer reports a broken tree.

**Steps**:
1. Uncommitted: `git checkout -- . && git clean -fd docs/prd`.
2. Committed or merged: `git revert <migration commit>`. The run is one commit by design.
3. Re-run `npm test`.

**Validation**: `git ls-files docs/prd | wc -l` reads 146, at the old paths, and `doc-links.test.mjs`
passes.

### Partial Rollback (1–2 hours)

**When to use**: The engine is sound but this repository's run has a defect.

**Steps**: Revert only the Phase 4 commit and keep the engine (Phases 1–3). Fix the engine, then
re-run.

### Forward Fix (< 4 hours)

**When to use**: The run left a few dead links or a mis-keyed allowlist entry.

**Approach**: Fix the rule in the engine, revert, and re-apply. Never hand-edit the moved files, or
the second-run no-op guarantee no longer describes the tree.

### Rollback Triggers

- **Critical**: any live link that went dead, a lost file (the count is not 146), or a rewritten
  tracker-facing title.
- **Non-critical**: wording in the pointer file, or report formatting. Fix these forward.

---

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-10-13 | 1.0     | Initial draft | create-task |

---

## Progress Tracking

### Phase 0: Dependency gate
- [ ] task.202 merged; the plan file is amended to its real API

### Phase 1: Discover and plan
- [ ] `discover` and `plan`, with unit tests

### Phase 2: Blockers and verification
- [ ] Seven blockers and the link simulator, mutation-proven

### Phase 3: Apply and the CLI
- [ ] `--apply`, `--check`, `--json`; the fixture apply and re-run test

### Phase 4: Migrate this repository
- [ ] Dry run reviewed, applied, re-run is a no-op, suites green

---

## References

- Approved plan: [`.agents/plans/hierarchical-doc-numbering.md`](../../../.agents/plans/hierarchical-doc-numbering.md) (T2)
- Depends on: task.202 (the doc-id engine and the PRD registry)
- Downstream: task.204 (PRD skills call `--check`), task.205 (epic skills; retires `epic-registry-manager`)
- Standards at `v0.55.0`: `docs/standards/prd-documents.md`, `docs/standards/story-documents.md`, `docs/standards/file-naming.md`
- Idempotent-migration precedent: `shared/resources/change-log.js` (`migrateLegacyRow`)

---

## Notes

### Important Reminders

- QA artifacts land beside this document: `task.203.qa.{n}.{name}.md`, `task.203.gate.{n}.{name}.yml` and `task.203.bug.{n}.{name}.md`.
- Commit the Phase 4 run as **one** commit, so revert is a single operation.

### Known Issues

- `generate-prd-epic-index.mjs` will still skip the migrated PRD until task.205, because of the
  domain level.
- The labels in `examples/README.md` that use globs (e.g. `story.2.3.review.1.*.md`) keep their old
  text; only their link targets are re-pointed.

---
id: task.205
title: "PRD-scoped epic numbering"
type: task
description: "Number every epic within its parent PRD as epic.{P}.{E}, make a parent PRD mandatory, and retire the global epic registry and the epic-registry-manager skill, across the epic authoring, review, index and tracker-sync skills."
tags: [create-epic, create-epics-from-shards, review-epic, edit-epic, epic-registry-manager, generate-prd-epic-index, sync-jira-epic, jira-epic-creator, ensure-epic-github-issue, sync-github-epic, doc-numbering]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-10-13
updated: 2026-10-15
assignee:
estimated_effort_hours: 16
github_issue: 648
---

# Technical Task: PRD-scoped epic numbering

**Status:** Ready for Review

**Review**: ✅ All review recommendations from `task.205.review.1.prd-scoped-epic-numbering.md` implemented 2026-10-15

**GitHub Issue**: [#648](https://github.com/Gamaroff/agent-skills/issues/648)

---

## 1. Overview

Epics are numbered from one global counter today (`epic.{N}.{name}`), and an epic may have no PRD at
all (`prd_source: brownfield-enhancement`). This task moves every epic skill to the hierarchical
scheme: an epic is `epic.{P}.{E}.{name}`, where `P` is its parent PRD's number and `E` counts epics
**within that PRD** (`epic.1.1`, `epic.1.2`, `epic.2.1`). A parent PRD becomes mandatory. The global
epic registry and the `epic-registry-manager` skill that maintains it are retired, because a per-PRD
number needs no global counter: the PRD's own generated epic index is the list.

This is plan item **T4** of [`.agents/plans/hierarchical-doc-numbering.md`](../../../.agents/plans/hierarchical-doc-numbering.md).
It consumes the `doc-id.js` engine from task.202 and lands after task.203 has migrated this repository's
documents. It is independent of task.204 (PRD skills).

**Scope**: the epic authoring skills (`create-epic`, `create-epics-from-shards`), the epic review and
edit skills (`review-epic`, `edit-epic`), the PRD epic-index generator, the epic tracker paths (Jira:
`sync-jira-epic`, `jira-epic-creator`; GitHub: `ensure-epic-github-issue`, `sync-github-epic`), the
task-side milestone lookups that read the epic registry, the epic template and its byte-locked
copies, and the retirement of `epic-registry-manager` and the registry's setup and standard.

**Key deliverables**:

1. Every epic-creating path names the file `epic.{P}.{E}.{name}`, takes `E` from
   `doc-id.js next epic --prd-dir <PRD dir>`, writes `prd_number` + `epic_number`, and halts when no parent PRD exists.
2. `review-epic` blocks (Critical) on an epic whose numbers disagree with its directory or its parent PRD,
   and resolves epics by `P.E`, never by a bare number.
3. Tracker identity becomes `[Epic P.E]` / milestone `Epic P.E — {title}` on Jira and GitHub, with
   existing GitHub milestones renamed in place rather than orphaned.
4. `epic-registry-manager` is removed; nothing in a shipped skill reads `docs/development/epic-registry.md`.

---

## 2. Motivation

### Current Problems

1. **Epic numbers are allocated by prose, and the prose contradicts its own registry.**
   `skills/epic-registry-manager/SKILL.md:31` says "highest + 1"; the registry file carries a
   **Next Available Epic Number** counter (`docs/standards/epic-registry.md:5`); `create-epic`
   (`skills/create-epic/SKILL.md:80` *(`Check /docs/development/epic-registry.md for next available number`)*)
   and `create-epics-from-shards` (`SKILL.md:264-266`) reserve by hand. Nothing deterministic allocates.
2. **The PRD's epic numbering and the files' epic numbering already disagree by design.** The PRD
   templates tell authors to call epics "Epic 1", "Epic 2" relative to the PRD
   (`skills/prd-template/resources/prd-tmpl.yaml:141`, `skills/brownfield-prd-template/resources/brownfield-prd-tmpl.yaml:237`,
   `skills/pm-coordinator/SKILL.md:149-150`), and the files then get unrelated global numbers. This
   repository's own PRD needed a note to explain the mismatch (`docs/prd/onboarding/prd.onboarding.md:191`).
   Per-PRD numbering makes the PRD's "Epic 2" and the file `epic.1.2` the same thing.
3. **A PRD-less epic has no place in a PRD-rooted tree.** `brownfield-enhancement` is honoured as a
   special case in eight places (§3) and every one of them skips a link or a check. Under
   `epic.{P}.{E}` there is no `P` to give it.
4. **Five code sites each hard-code "an epic id is one integer".** `generate-prd-epic-index.mjs`
   `parseInt`s it and sorts on it; `normaliseEpicSummary` is duplicated in two scripts with the same
   `\[Epic\s+(\d+)\]` regex; `findChildStories` assumes `story.{E}.{S}`; the GitHub sub-routines parse
   `epic.{N}.` from the filename. A dotted `P.E` breaks each one differently, and silently.
5. **`review-epic` resolves an epic by a bare number with a glob that over-matches.**
   `skills/review-epic/SKILL.md:81` runs `find docs/ -name "epic.${INPUT}.*.md"`; once epic ids have
   two segments, `3` matches every epic of PRD 3.

### Benefits of PRD-scoped numbering

1. **One allocator, in code.** `doc-id.js next epic --prd-dir <PRD dir>` replaces three hand-reservation procedures.
2. **The PRD and its files agree.** "Epic 2 of PRD 1" is `epic.1.2` everywhere: file, frontmatter,
   index, Jira summary, GitHub milestone.
3. **No global counter to conflict on.** Two branches creating epics under different PRDs can no
   longer collide on the registry line; within one PRD a collision is caught by task.202's duplicate check.
4. **One fewer skill and one fewer registry to keep in sync.**
5. **Every epic links to a PRD**, so the epic→PRD navigation that the sentinel exempted is always present.

---

## 3. Technical Background

### Current Architecture

Every name below was grepped on 2026-10-13 (`git grep -n`, canonical sources only; bundled
`skills/*/references/*` copies are regenerated by `npm run bundle` and are never edited).

**Epic number allocation and the registry**

- `skills/create-epic/SKILL.md:4` *(`invokes: [epic-registry-manager, mermaid-architect]`)*; `:47`
  (registry is an allowed write); `:70`, `:80-84` (manual reservation); `:90`
  *(`epic.163.5.settings-enhancement.md (use decimals for intermediate epics)`)* — the only mention of
  decimal epics in canonical sources.
- `skills/create-epics-from-shards/SKILL.md:28`, `:129` *(`epic_number: N # REQUIRED — the globally-unique integer reserved in Step 4`)*,
  `:135` *(`dependencies: ["epic.163", "epic.164"]`)*, `:258-292` (Step 4 reserves N numbers; writes
  flat `epics/epic.163.core-infrastructure.md` files, not the dir-per-epic layout that
  `generate-prd-epic-index.mjs` requires).
- `skills/epic-registry-manager/SKILL.md` — the whole skill; `:44` location, `:111` row insertion.
- `skills/edit-epic/SKILL.md:44`, `:404`, `:568-571`, `:642` (registry reminders on renumber).
- `skills/review-epic/SKILL.md:179` (loads the registry), `:288-305` (**Step 3 — Epic Registry
  Conflict Detection**: duplicates, dependency existence, registry-row presence, number uniqueness), `:844`.
- `skills/pm-coordinator/SKILL.md:151` *(`Check /docs/development/epic-registry.md before creating epic files`)*.
- **Task milestone lookup reads the registry**: `skills/ensure-task-github-issue/SKILL.md:55`
  *(`look up Epic {N} in docs/development/epic-registry.md`)*; restated at
  `skills/sync-github-task/SKILL.md:14`, `:79`, `:250`, `skills/review-task/SKILL.md:698`,
  `skills/create-task/SKILL.md:666`. The task `epic:` field it keys on is documented nowhere in
  `docs/standards/task-documents.md` and set by no task in this repository
  (`grep -rln "^epic:" docs/tasks/*/task.*.md` → no hits).
- `scripts/setup-consumer.sh:810-815` creates an empty `docs/development/epic-registry.md` in every consumer.
- Skill lists naming `epic-registry-manager`: `tests/skill-doc-coverage.test.js:96`,
  `tests/skill-protocol.test.js:331` (change-log instruction loop), `:489` (byte-lock list),
  `skills/create-skill/scripts/generate_catalog.py:64`, generated `shared/resources/skill-dependencies.json:23,126`
  (from `scripts/generate-skill-dependencies.mjs`), generated `docs/reference/skill-catalog.md:114`.

**The `brownfield-enhancement` sentinel — every place it is honoured** (`git grep -n "brownfield-enhancement"`,
canonical sources):

| # | Site | Behaviour |
| --- | --- | --- |
| 1 | `skills/create-epic/SKILL.md:109`, `:111` | Discover Parent PRD falls back to the sentinel |
| 2 | `skills/create-epic/SKILL.md:145`, `:174` | Omits the **Source PRD** body line |
| 3 | `skills/create-epic/SKILL.md:162` | Template comment |
| 4 | `skills/create-epic/SKILL.md:388` | Skips the epic-index regeneration |
| 5 | `skills/review-epic/SKILL.md:226-227` | Exempts the epic from both PRD-link checks |
| 6 | `skills/ensure-epic-github-issue/SKILL.md:31`, `:65` | Skips the Parent PRD line |
| 7 | `skills/sync-github-epic/SKILL.md:80`, `:146` | Skips the Parent PRD line |
| 8 | `docs/templates/epic-template.md:28`, `:51` | Template frontmatter + comment, byte-copied to `skills/documentation-standards-validator/references/epic-template.md` and `skills/epic-registry-manager/references/epic-template.md` (locked by `tests/skill-protocol.test.js:478-497`) |

Also `skills/documentation-standards-validator/references/prd-structure-guide.md:210` (a skill-native
reference, not a bundled copy — no `AUTO-GENERATED` header). No `.js`/`.mjs`/`.sh`/`.py` file honours
the sentinel (`git grep -n brownfield -- '*.js' '*.mjs' '*.sh' '*.py'` → only skill-name strings).
`CHANGELOG.md:5825`, `:5830` are history and stay.

**The epic id in code**

- `shared/resources/generate-prd-epic-index.mjs` — `listDirs(PRDS_DIR)` at `main()` walks **one**
  level (`:201-205`, *(`const prdFile = join(prdDir, \`${p}.md\`)`)*), so a `{domain}/prd.{P}.{feature}/`
  PRD is never visited; `:213` *(`parseInt(frontmatterField(fm, "epic_number"), 10)`)*; `:226`
  *(`epics.sort((a, b) => a.number - b.number)`)*; `cleanTitle` `:135` *(`/^\[Epic\s+\d+\]\s*/i`)*;
  `buildBlock` emits the `| # |` column from `e.number`. The file is also vendored to consumers' `scripts/`
  by `scripts/setup-consumer.sh:1681-1685`. Tests: `shared/resources/tests/generate-prd-epic-index.test.mjs`
  (12 tests; fixtures write `epic_number:` at `:56`).
- `skills/sync-jira-epic/scripts/sync-jira-epic.js` — `normaliseEpicSummary` `:358-369`
  *(`/^\s*\[Epic\s+(\d+)\]\s*(.*)$/i`)*, called at `:834` with `frontmatter.epic_number`;
  `findChildStories` `:305-326` *(`s.dir.match(/^story\.(\d+)\.(\d+)\./i)`)*, label `Story E.S`;
  `labelForChildStory` `:328`; `resolvePrdPath` `:47-82` (hard-codes `docs/prd`, strips `^prd\.`; a
  `prd.1.onboarding` basename still resolves through its `prd.${bare}.md` target); `syncLabelFor`
  `:346` (label derived from the epic **directory** name). Tests: `skills/sync-jira-epic/tests/sync-jira-epic.test.js:763-775`
  (`normaliseEpicSummary`), `:270-272` (`syncLabelFor`).
- `skills/jira-epic-creator/scripts/jira-create-epic.js:380-392` — a **second copy** of
  `normaliseEpicSummary`, same regexes; called at `:726` with `frontmatter.epic_number` (`:683-684`).
  It requires only `../references/defer-mutation.js` (`:26`), not `jira-sync.js`.
- `skills/ensure-epic-github-issue/SKILL.md:32` *(`pattern epic.{N}. → EPIC_N`)*, `:53`
  *(`MILESTONE_TITLE="Epic ${EPIC_N} — ${EPIC_TITLE}"`)*, `:132` *(`--title "[Epic ${EPIC_N}] ${EPIC_TITLE}"`)*.
- `skills/sync-github-epic/SKILL.md:82`, `:84`, `:88` *(`The milestone title is always Epic {EPIC_N} — {EPIC_TITLE}`)*,
  `:182-193` (update path re-resolves the milestone via `tracker-issue.js --kind milestone`, which is
  resolve-or-create: a changed title **creates a new milestone** and moves only the epic issue onto it).
- `shared/resources/tracker-issue.js:175` *(`--kind milestone --title <t> [--state <open|closed>]`)* —
  no rename capability.
- `skills/review-epic/SKILL.md:66-95` (input → file; the `[0-9]*` arm is the over-matching glob),
  `:174` (search pattern `epic.[N].*`), `:224` (title-format check `^\s*Epic\s+\d+\s*:`).
- `skills/ensure-epic-jira-issue/SKILL.md` parses no epic number (`grep -n "EPIC_N\|epic_number"` → none); it delegates to `sync-jira-epic`.

### Existing mechanisms this task reuses or extends (obs #103)

- **`doc-id.js`** (task.202) — `parse`, `format`, `matchesEpic(stem, P, E)`, `next epic --prd-dir <dir>`
  (prints `{ next, id }`; verified 2026-10-15: `next epic --prd-dir docs/prd/onboarding/prd.1.onboarding --json`
  → `"next": 5, "id": "epic.1.5"`), `check <path>`. This task **calls** it everywhere it currently parses an
  epic id; it adds no parser of its own. Three helpers this task needs and adds to `doc-id.js` beside the
  existing API (same file, same tests): `stripIdPrefix(kind, title)` (drops a leading `[Epic …]` /
  `Epic …:` in either the legacy one-number or the `P.E` form), `idLabel(parsed)` (`"1.3"`) and
  `epicSummary(summary, { prd, epic })` (built on the other two). They **replace** the two
  `normaliseEpicSummary` regex copies and `cleanTitle`'s regex — they do not sit beside them.
- **`generate-prd-epic-index.mjs`** is **extended**, not replaced: the PRD-discovery walk and the number
  column change; idempotence, `--check`, `--strict` and the function-replacement guard (`:228-233`) stay.
- **`tracker-issue.js --kind milestone`** is **extended** with `--rename-from <old title>`; the
  resolve-or-create behaviour and the deferred-mutation record are unchanged.

### Target Architecture

```
${PRD_ROOT}/{domain}/prd.{P}.{feature}/
├── prd.{P}.{feature}.md            ← prd_number: P   (task.204)  · epics-index block lists "P.E"
└── epics/
    ├── epic.{P}.1.{name}/epic.{P}.1.{name}.md   ← prd_number: P, epic_number: 1, prd_source: <path to PRD>
    └── epic.{P}.2.{name}/…
```

- **Allocation**: `create-epic` reads `P` from the parent PRD (`doc-id parse` of the PRD stem, checked
  against its `prd_number`), then `E=$(command node references/doc-id.js next epic --prd-dir "$PRD_DIR" --json | jq -r .next)`.
  `create-epics-from-shards` takes the first `E` the same way and numbers its batch `E…E+n-1`.
- **Gate**: after writing, both skills run `doc-id.js check <epic file>`; a non-`ok` reason halts
  (blocking — the skill chose the name, so a mismatch is the skill's defect).
- **No PRD → halt**, with the message naming `/create-prd`. `prd_source` is a required repo-relative path.
- **Tracker identity**: `[Epic P.E] {title}`; GitHub milestone `Epic P.E — {title}`. On update with a
  `github_issue` already set, `sync-github-epic` renames the issue's **current** milestone in place.
- **Registry**: gone. The per-PRD list is the PRD's `<!-- epics-index -->` block; the cross-PRD list is
  `doc-id.js check --corpus` (task.202).

### Important Clarifications

- **`E` counts within the PRD.** `E` alone is not unique; every lookup keys on `(P, E)`.
- **Decimal "intermediate" epics are dropped.** `epic.163.5.x` would read as `P=163, E=5` under the
  new grammar. The only mention is the example at `create-epic/SKILL.md:90`, which is removed.
- **A Jira sync label changes when the directory is renamed.** `syncLabelFor` derives
  `synced-from-<dir>`, so after task.203's rename an epic's label differs. Epics with a `jira_key` are
  updated by key and are unaffected; the label is only a dedup key for an epic with no `jira_key`.
- **Not in this task** (named so a reviewer can check the boundary):
  - `create-prd/SKILL.md:516`, `review-prd/SKILL.md:197`, `:819`, `prd-template/SKILL.md:192-195`,
    `prd-tmpl.yaml:141`, `brownfield-prd-tmpl.yaml:237` → **task.204** (PRD skills).
  - `ensure-story-github-issue/SKILL.md:76` (story milestone key `Epic ${STORY_E} — …`),
    `create-branch/SKILL.md:184` (`epic/{epic_number}.{slug}`), the develop-pipeline step docs → **task.206**.
    task.206 must build the story milestone as `Epic {P}.{E} — {title}` to match this task.
  - `docs/development/epic-registry.md` itself (converted to a pointer) → **task.203**.
  - Prose in `AGENTS.md:168`, `docs/concepts/*`, `docs/runbooks/*`, `docs/reference/*`,
    `docs/architecture/concepts/*`, `shared/resources/open-knowledge-format.md:64` → **task.207**.

---

## 4. Scope

### In Scope

✅ `create-epic`: mandatory PRD, `doc-id` allocation, `epic.{P}.{E}` naming, `prd_number`, blocking `check`, sentinel and registry removal
✅ `create-epics-from-shards`: the same, plus the dir-per-epic layout the index generator requires
✅ `review-epic`: `P.E` input resolution, registry Step 3 replaced by a filesystem enumeration, new Critical numbering checks, sentinel exemption removed
✅ `edit-epic`: renumber within a PRD via `doc-id`; cross-PRD moves refused with a pointer to task.203's migration script
✅ `generate-prd-epic-index.mjs`: domain level, `P.E` column, numeric sort on `E`, both title-prefix forms stripped
✅ `sync-jira-epic.js` and `jira-create-epic.js`: one summary normaliser (`[Epic P.E]`) via `doc-id.js`; `findChildStories` on three-segment story ids
✅ `ensure-epic-github-issue`, `sync-github-epic`: `P.E` title and milestone; in-place milestone rename
✅ `tracker-issue.js --kind milestone --rename-from`
✅ Task milestone lookup (`ensure-task-github-issue` and its four restatements) resolves the epic through `doc-id` instead of the registry
✅ `docs/templates/epic-template.md` and its byte-locked copy; `pm-coordinator` registry line
✅ Retire `epic-registry-manager`, `docs/standards/epic-registry.md` (→ retired notice), the registry creation in `setup-consumer.sh`
✅ Tests for every changed code path, each mutation-proven

### Out of Scope

❌ The `doc-id.js` engine itself (task.202) — this task adds two helpers to it, nothing else
❌ Renaming existing documents (task.203)
❌ PRD numbering and the PRD skills (task.204)
❌ Story ids, branches and pipeline parsing (task.206)
❌ Repository-wide prose sweep and the CI corpus test (task.207)
❌ Rewriting existing tracker summaries in bulk — they converge on the next sync of each epic

---

## 5. Breaking Changes

### Breaking Change 1: Epic filename and frontmatter

**Before**: `epics/epic.163.feature-ui/epic.163.feature-ui.md`, `epic_number: 163`.
**After**: `epics/epic.1.2.feature-ui/epic.1.2.feature-ui.md`, `prd_number: 1`, `epic_number: 2`.
**Impact**: every epic in a consumer project. **Migration**: task.203's `migrate-doc-numbering.mjs`
(dry-run, then apply). This task's skills accept only the new shape.

### Breaking Change 2: A parent PRD is mandatory

**Before**: `create-epic` with no PRD writes `prd_source: "brownfield-enhancement"`.
**After**: `create-epic` halts: `No parent PRD found under ${PRD_ROOT}/{domain}/ — run /create-prd first; every epic is numbered within a PRD.`
**Impact**: small 1–3 story enhancements now need a PRD first; existing sentinel epics.
**Migration**: task.203's script reports sentinel epics as blockers. The owner creates a PRD with
`/create-prd` and re-runs the migration, which moves the epic under it.

### Breaking Change 3: Tracker identity `[Epic N]` → `[Epic P.E]`

**Before**: Jira summary / GitHub title `[Epic 3] Foo`, milestone `Epic 3 — Foo`.
**After**: `[Epic 1.3] Foo`, milestone `Epic 1.3 — Foo`.
**Impact**: already-synced epics change title on their next sync. **Migration**: none needed by hand.
The next `sync-jira-epic` / `sync-github-epic` rewrites the summary; on GitHub the existing milestone
is **renamed in place**, so child stories already on it stay grouped.

### Breaking Change 4: `epic-registry-manager` is removed

**Before**: `/epic-registry-manager` allocates and records a number.
**After**: the skill does not exist; `create-epic` allocates through `doc-id.js`.
**Impact**: anyone invoking it directly. Consumer installs keep a stale `.agents/skills/epic-registry-manager/`
(the installer does not prune — same as the `wireloom` rename, `CHANGELOG.md:700-705`).
**Migration**: CHANGELOG tells consumers to delete the directory.

### Breaking Change 5: `review-epic` no longer accepts a bare epic number

**Before**: `/review-epic 180`. **After**: `/review-epic 1.3` (or a path or a name). A bare integer
is refused with a message giving the `P.E` form. **Migration**: use `P.E`.

### Breaking Change 6: PRD epic-index column

**Before**: `| 3 | [Foo](…) |`. **After**: `| 1.3 | [Foo](…) |`. **Impact**: consumers' vendored
`scripts/generate-prd-epic-index.mjs` and their `docs:epic-index:check`. **Migration**: re-run
`setup-consumer.sh --update`, then `node scripts/generate-prd-epic-index.mjs` once.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.205.plan.prd-scoped-epic-numbering.md](task.205.plan.prd-scoped-epic-numbering.md)

Each phase leaves the tree green. Edit `shared/resources/` sources, never `skills/*/references/` copies;
run `npm run bundle` at the end of every phase that touches a shared source.

### Phase 0: Preconditions (Low)

- [x] HALT unless task.202 (`doc-id.js` with `parse`, `format`, `matchesEpic`, `next epic`, `check`) and task.203 (this repo migrated) are merged to `develop`
- [x] Re-run the §3 greps; every hit is updated or listed as an exclusion

### Phase 1: Shared id helpers and the index generator (Medium)

**Files**: `shared/resources/doc-id.js`, `shared/resources/generate-prd-epic-index.mjs`, their tests.
- [x] Add `stripIdPrefix(kind, title)`, `idLabel(parsed)` and `epicSummary(summary, {prd, epic})` to `doc-id.js`, with unit tests
- [x] Generator: discover PRD directories at depth 1 **or** 2 by `doc-id parse` of the directory name (kind `prd`), not by "every directory"
- [x] Generator: number column `idLabel` (`P.E`); sort by `epic` numerically within the PRD; read `prd_number` + `epic_number`; an epic whose directory stem disagrees with its frontmatter is skipped and reported (`--strict` fails)
- [x] Generator: `cleanTitle` uses `stripIdPrefix("epic", …)`
- [x] Extend `generate-prd-epic-index.test.mjs` (§8)

### Phase 2: Jira epic paths (Medium)

**Files**: `skills/sync-jira-epic/scripts/sync-jira-epic.js`, `skills/jira-epic-creator/scripts/jira-create-epic.js`, their tests.
- [x] Replace both `normaliseEpicSummary` copies with calls to the one `doc-id.epicSummary(summary, { prd, epic })`; the frontmatter pair wins over any id in the title, and a missing pair yields the bare title, never a guessed id
- [x] `findChildStories`: parse with `doc-id`, keep only stories whose `(P, E)` equals the epic's, sort by story number, label `Story P.E.S`
- [x] Bundle `doc-id.js` into both skills (a bare `references/doc-id.js` mention in each `SKILL.md` + `require`)

### Phase 3: Epic authoring skills and the template (Medium)

**Files**: `skills/create-epic/SKILL.md`, `skills/create-epics-from-shards/SKILL.md`, `docs/templates/epic-template.md` + `skills/documentation-standards-validator/references/epic-template.md`, `skills/documentation-standards-validator/references/prd-structure-guide.md`.
- [x] `create-epic` Discover Parent PRD: canonical path → glob → **halt** (no sentinel); read `P`; allocate `E` with `doc-id next epic --prd-dir <PRD dir>` (inside a fenced bash block — see §8 "Executable skill blocks"); name `epic.{P}.{E}`; frontmatter `prd_number`; `[Epic P.E]` H1; remove the decimal example, the registry steps, the registry allowed-write and `epic-registry-manager` from `invokes:`
- [x] `create-epic` post-creation: run `doc-id check` on the new file (blocking) before the epic-index step; the index step no longer has a skip branch
- [x] `create-epics-from-shards`: read `P` from the PRD directory; allocate the batch from one `next epic`; dir-per-epic layout; `dependencies: ["epic.P.E", …]`; Step 4 registry procedure removed
- [x] Epic template: banner says "allocated by `create-epic` via `doc-id.js`"; `prd_source` comment requires a path; `prd_number` field; copy byte-identically to the validator copy; update `prd-structure-guide.md:210`

### Phase 4: Review and edit skills (Medium)

**Files**: `skills/review-epic/SKILL.md`, `skills/edit-epic/SKILL.md`, `skills/pm-coordinator/SKILL.md`.
- [x] `review-epic` input: `P.E` → `doc-id` resolution; bare integer refused with the `P.E` hint; name search unchanged. The resolution is one fenced bash block that `tests/epic-numbering-retirement.test.js` extracts and runs (§8)
- [x] `review-epic` Step 3 becomes **Epic Corpus Conflict Detection**: enumerate epics with `doc-id check --corpus --json` (or the `epics-index` of each PRD); same duplicate / overlap / dependency checks; "missing registry entry" and "stale registry entry" are removed; dependency refs are `epic.P.E`
- [x] `review-epic` new Critical checks: `doc-id check` reason ≠ `ok` (directory/stem/frontmatter disagree, or `prd_number` ≠ parent PRD's); `prd_source` absent or unresolvable — no sentinel exemption; title-format regex accepts `P.E`
- [x] `edit-epic`: renumber inside a PRD through `doc-id next epic --prd-dir <PRD dir>`; refuse a change of `P` and point at task.203's migration script; registry reminders removed
- [x] `pm-coordinator:148-152`: per-PRD numbering stated; registry line removed

### Phase 5: GitHub epic paths and task milestone lookup (Medium)

**Files**: `shared/resources/tracker-issue.js` (+ test), `skills/ensure-epic-github-issue/SKILL.md`, `skills/sync-github-epic/SKILL.md`, `skills/ensure-task-github-issue/SKILL.md`, `skills/sync-github-task/SKILL.md`, `skills/review-task/SKILL.md`, `skills/create-task/SKILL.md`.
- [x] `tracker-issue.js --kind milestone --title <new> --rename-from <old>`: rename when `<old>` exists and `<new>` does not; `already` when `<new>` exists; deferred under a deferring access mode like every other kind
- [x] `ensure-epic-github-issue` / `sync-github-epic`: `EPIC_ID` from `doc-id parse` (`P.E`); title `[Epic P.E]`; milestone `Epic P.E — {title}`; sentinel branches removed
- [x] `sync-github-epic` update path: when the issue's current milestone is the epic's own (`Epic {P.E} — …`, or `Epic {any id} — {title}`) and differs from the target title, rename it with `--rename-from`, never create-and-move; any other milestone is never renamed (QA cycle 1, CR-1)
- [x] Task milestone lookup step 2: resolve the task's `epic:` value (`P.E` or an epic directory stem) through `doc-id` to the epic file and use `Epic P.E — {epic title}`; no registry read. Restatements in `sync-github-task`, `review-task`, `create-task` point at the one step

### Phase 6: Retire the registry and the skill; close-out (Low)

**Files**: `skills/epic-registry-manager/` (deleted), `tests/skill-doc-coverage.test.js`, `tests/skill-protocol.test.js`, `skills/create-skill/scripts/generate_catalog.py`, `scripts/setup-consumer.sh`, `docs/standards/epic-registry.md`, `docs/standards/epic-documents.md`, `CHANGELOG.md`.
- [x] `git rm -r skills/epic-registry-manager/`; drop it from the three test lists and `generate_catalog.py`; regenerate `skill-dependencies.json` and the catalog
- [x] `setup-consumer.sh`: stop creating `docs/development/epic-registry.md`; its header comment (`:12`) updated; the generator vendor block (`:1681-1685`) also copies `doc-id.js` beside `scripts/generate-prd-epic-index.mjs`, **as `scripts/doc-id.cjs`** — a consumer whose `package.json` says `"type": "module"` would parse a vendored `doc-id.js` as ESM and fail on `require`. The generator loads it through `createRequire(import.meta.url)`, trying `./doc-id.cjs` first and `./doc-id.js` second (this repository's `shared/resources/` copy)
- [x] Interim notices this task's landing falsifies, updated in the same PR: `docs/development/epic-registry.md` ("until **task.205** rewires them — do not run `/create-epic`"), the pointer template that writes it (`shared/resources/migrate-doc-numbering.mjs:1232`), and `docs/architecture/concepts/coding-standards.md:64` (*"until task 205, do not run `/create-epic` here"*). The rest of `coding-standards.md` (`:89`) stays with task.207
- [x] `docs/standards/epic-registry.md` → a retired notice pointing at the PRD registry standard and the epics-index; `epic-documents.md` `epic_number` row says "within the PRD" (if task.202 has not already)
- [x] Add the guard test (§8 "No registry reader, no sentinel")
- [x] CHANGELOG entry with the six breaking changes and the consumer steps
- [x] `npm run bundle`, `npm run generate-catalog`, `npm test`, `npm run bundle:check`, `npm run lint:shell` (ShellCheck — this phase edits `setup-consumer.sh`)

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/doc-id.js` — add `stripIdPrefix`, `idLabel`, `epicSummary`
2. ✅ `shared/resources/generate-prd-epic-index.mjs` — PRD discovery, `P.E` column, sort, title strip
3. ✅ `shared/resources/tracker-issue.js` + `shared/resources/tracker-issue-cli.md` — `--rename-from` on `--kind milestone`
4. ✅ `skills/sync-jira-epic/scripts/sync-jira-epic.js` — normaliser, `findChildStories`
5. ✅ `skills/jira-epic-creator/scripts/jira-create-epic.js` — normaliser
6. ✅ `skills/create-epic/SKILL.md`
7. ✅ `skills/create-epics-from-shards/SKILL.md`
8. ✅ `skills/review-epic/SKILL.md`
9. ✅ `skills/edit-epic/SKILL.md`
10. ✅ `skills/ensure-epic-github-issue/SKILL.md`
11. ✅ `skills/sync-github-epic/SKILL.md`
12. ✅ `skills/ensure-task-github-issue/SKILL.md`
13. ✅ `skills/sync-github-task/SKILL.md`, `skills/review-task/SKILL.md`, `skills/create-task/SKILL.md` — milestone restatements
14. ✅ `skills/pm-coordinator/SKILL.md`
15. ✅ `skills/sync-jira-epic/SKILL.md`, `skills/jira-epic-creator/SKILL.md` — cite `references/doc-id.js` so it bundles
16. ✅ `docs/templates/epic-template.md` + `skills/documentation-standards-validator/references/epic-template.md` (byte copy)
17. ✅ `skills/documentation-standards-validator/references/prd-structure-guide.md`
18. ✅ `scripts/setup-consumer.sh` — registry creation removed; `doc-id.js` vendored with the generator
19. ✅ `skills/create-skill/scripts/generate_catalog.py`

### Files to Modify (Tests)

Tests that pin a literal or a behaviour this task removes (found by searching the literal —
`git grep -n "normaliseEpicSummary\|cleanTitle\|findChildStories\|epic-registry-manager" -- '*.test.*' evals`
and `git grep -n "\[Epic " -- '*.test.*'`, 2026-10-15):

- `skills/sync-jira-epic/tests/sync-jira-epic.test.js:763-788` — `normaliseEpicSummary` cases move to `doc-id.epicSummary`. **`:787` inverts**: it pins "falls back to the title's prefix id when `epic_number` is absent", and this task's rule is "a missing pair yields the bare title, never a guessed id".
- `skills/sync-jira-epic/tests/sync-jira-epic.test.js:792-867` — `findChildStories` fixtures use two-segment `story.E.S` dirs and labels `Story 2.1`; they become `story.P.E.S` / `Story P.E.S`.
- `shared/resources/tests/generate-prd-epic-index.test.mjs` — fixtures write flat `prd.x` / `epic.1.one` dirs, `[Epic N]` titles and a single `number`; they move to `prd.P.x` under a domain, `epic.P.E.slug`, `prd_number` + `epic_number`.
- `tests/skill-protocol.test.js:331`, `:489` and `tests/skill-doc-coverage.test.js:96` — the `epic-registry-manager` list entries.
- Not affected: `tests/work-item-artifact-naming.test.js:88` (a task directory name), `shared/resources/tests/change-log.test.mjs:45` (title text only).

20. ✅ `shared/resources/tests/generate-prd-epic-index.test.mjs`
21. ✅ `shared/resources/tests/doc-id.test.mjs` (task.202's file) — the two helpers
22. ✅ `shared/resources/tests/tracker-issue.test.mjs` — `--rename-from`
23. ✅ `skills/sync-jira-epic/tests/sync-jira-epic.test.js`
24. ✅ `skills/jira-epic-creator/tests/` — a normaliser test
25. ✅ `tests/skill-protocol.test.js`, `tests/skill-doc-coverage.test.js`
26. ✅ New guard: `tests/epic-numbering-retirement.test.js` (reached by the `'tests/*.test.js'` glob in `package.json` `test`)

### Files to Modify (Documentation)

27. ✅ `docs/standards/epic-registry.md`, `docs/standards/epic-documents.md`
28. ✅ `CHANGELOG.md`
29. ✅ Generated: `shared/resources/skill-dependencies.json`, `docs/reference/skill-catalog.md`, `skills/*/references/*` (bundle)

### Files to Delete

30. ❌ `skills/epic-registry-manager/` (SKILL.md, `references/epic-template.md`, any zip)

Call-site population for the sentinel and the registry was **measured**, not recalled:
`git grep -n "brownfield-enhancement" -- ':!skills/*/references/*' ':!docs/tasks/*' ':!docs/bugs/*'`
and `git grep -n "epic-registry" -- 'skills/*/SKILL.md' 'shared/resources/*' 'scripts/*' 'tests/*'`.
Every hit is in the list above or in §3's exclusions.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: the generator, the two Jira scripts' normaliser and child-story finder, `doc-id`'s two helpers, `tracker-issue.js --rename-from`.
- **Command**: `npm test` (all four suites are already in the `package.json` globs: `shared/resources/tests/*.test.mjs`, `skills/sync-jira-epic/tests/*.test.js`, `skills/jira-epic-creator/tests/*.test.js`, `tests/*.test.js`).
- **Cases**:
  - Generator: a PRD at `prd/{domain}/prd.1.x/` **and** one at `prd/prd.2.y/` are both indexed; column reads `1.2`; `1.2` sorts before `1.10`; two PRDs each with `E=1` are indexed independently; a `[Epic 3]` and a `[Epic 1.3]` title both strip; an epic dir `epic.1.2.x` with `epic_number: 3` is skipped and named, and `--strict` exits non-zero; existing idempotence / `$&` / `--check` tests stay green.
  - Normaliser (both scripts, one helper): `("[Epic 3] Foo", {prd:1, epic:3})` → `[Epic 1.3] Foo`; `("Epic 1.3: Foo", …)` → `[Epic 1.3] Foo`; `("[Epic 1.3] Foo", {prd:1, epic:3})` unchanged (idempotent); bare `"Foo"` → `[Epic 1.3] Foo`.
  - `findChildStories`: `story.1.3.10.*` sorts after `story.1.3.2.*`; a stray `story.1.4.1.*` directory under epic 1.3 is excluded; label `Story 1.3.2 — Title`.
  - `--rename-from`: old exists/new absent → renamed; new exists → `already`; neither → created; deferring access mode → deferred record, no call.

### Integration Tests

- The `sync-jira-epic` end-to-end suite (`skills/sync-jira-epic/tests/end-to-end.test.js`, fake Jira) creates an epic from an `epic.1.2.*` fixture and asserts the summary `[Epic 1.2] …` and the child-story table.

### Guard test — "No registry reader, no sentinel"

`tests/epic-numbering-retirement.test.js` scans `skills/*/SKILL.md`, `shared/resources/*.{md,js,mjs,sh}`
and `scripts/*.sh` for the literal `brownfield-enhancement` and for `epic-registry.md`. **(a) Keys**:
both literals belong to this rule alone (`git grep` on 2026-10-13 shows no other rule using them). **(b) A
restatement it misses**: prose that says "look up the epic in the global registry" without the filename.
That form is caught by review, not by this test, and the test says so in a comment. **(c) Population**: derived
from the globs, with a non-vacuity floor (the scan must read ≥ 100 files) so an emptied glob fails loudly.
Allowlist: the task.204-owned PRD skill lines (`create-prd/SKILL.md`, `review-prd/SKILL.md`), the task.207-owned `shared/resources/open-knowledge-format.md:64`, and `shared/resources/migrate-doc-numbering.mjs` — task.203's migration **writes** the retired pointer at that path, so it names the file as a writer, not a reader — each with a comment naming its owning task or reason. The test
fails on any allowlisted line that no longer exists, so the allowlist is emptied as task.204 and task.207 land.

### Executable skill blocks (obs #258)

A behaviour criterion whose fix lands in a `SKILL.md` is held only if a test runs it. Three skill
blocks are written as fenced `bash` blocks that `tests/epic-numbering-retirement.test.js` extracts
(by a marker comment on the block's first line) and runs against a temp fixture tree:

- `review-epic` input resolution: `1.3` → exactly one file; `3` → non-zero exit and the `P.E` hint; a name → the name search.
- `create-epic` Discover Parent PRD: a domain with no PRD → non-zero exit with the `/create-prd` message; a domain with `prd.1.x/` → `P=1` and `E` from `next epic --prd-dir`.
- `sync-github-epic` update path: the block passes `--rename-from "<current milestone title>"` to `tracker-issue.js --kind milestone` only for the epic's own milestone — run with a recording `node` stand-in on `PATH` over own, foreign and shared milestones (the rename itself is held by `tracker-issue.test.mjs`).

### Mutation proof

Each new guard is reverted once and seen red: restore the `[Epic\s+(\d+)]` regex → the normaliser test fails;
restore `listDirs(PRDS_DIR)` one-level discovery → the domain-level generator test fails; re-add the
sentinel line to `create-epic` → the guard test fails; drop `--rename-from` handling → the rename test fails.

### Consumer Tests

- Scratch consumer: `/create-prd` → `/create-epic` twice → `epic.1.1.*`, `epic.1.2.*`; the PRD's epics-index shows both; `/review-epic 1.2` resolves; `/create-epic` in a domain with no PRD halts with the `/create-prd` message.

### Performance Tests

Not applicable — no hot path changes; the generator's walk gains one directory level.

---

## 9. Success Criteria

### Functional

- [ ] `create-epic` names a new epic `epic.{P}.{E}.{name}` with `E` from `doc-id next epic --prd-dir <PRD dir>`, and halts when no parent PRD exists — held by the extracted Discover Parent PRD block in `tests/epic-numbering-retirement.test.js` (Phase 3)
- [ ] `create-epics-from-shards` writes dir-per-epic `epic.{P}.{E}` files with consecutive `E`, and the PRD index lists them (Phases 1, 3)
- [ ] `skills/review-epic/SKILL.md` instructs a Critical finding when `doc-id check` on the epic returns any reason other than `ok`, and when `prd_source` is absent or unresolvable, with no sentinel exemption — a documentation criterion, asserted by `tests/epic-numbering-retirement.test.js` (Phase 4)
- [ ] `review-epic 3` is refused with the `P.E` hint; `review-epic 1.3` resolves exactly one file — held by the extracted input-resolution block in `tests/epic-numbering-retirement.test.js` (Phase 4)
- [ ] `generate-prd-epic-index.mjs` indexes a PRD under a domain directory and prints `P.E` — held by `generate-prd-epic-index.test.mjs` (Phase 1)
- [ ] Both Jira scripts produce `[Epic P.E] {title}` from one shared helper — held by the `epicSummary` cases in `doc-id.test.mjs` and a call-through case in each script's test file; no `\[Epic\\s+\(\\d+\)\]` regex remains in either (Phase 2)
- [ ] A GitHub epic already on milestone `Epic 3 — Foo` ends on a milestone **renamed** to `Epic 1.3 — Foo`, with no second milestone created — held by the `--rename-from` cases in `tracker-issue.test.mjs` (old exists → one edit call, zero create calls) and the extracted `sync-github-epic` block assertion (Phase 5)
- [ ] `skills/epic-registry-manager/` no longer exists and no shipped skill reads `epic-registry.md` (guard test, Phase 6)

### Performance

- [ ] `generate-prd-epic-index.mjs --check` on this repository completes in under 1 s (it walks one more level than today) — a measured bound: `uptime; time command node shared/resources/generate-prd-epic-index.mjs --check`, run on the PR head and cited in the implementation report
- [ ] No new network call on any path that had none (`--rename-from` replaces a create call; it does not add one) — held by the `tracker-issue.test.mjs` call-count assertions

### Code Quality

- [ ] `npm test` passes; `npm run bundle:check` is clean; `npm run generate-catalog` produces no diff after commit
- [ ] Each new guard is mutation-proven (§8)
- [ ] `python skills/create-skill/scripts/quick_validate.py` passes for every changed skill; `npm run lint:shell` passes
- [ ] The local green is confirmed with the gitignored `.agents/skills` symlink moved aside

### Migration

- [ ] CHANGELOG lists the six breaking changes with consumer steps, including deleting `.agents/skills/epic-registry-manager/`
- [ ] `docs/standards/epic-registry.md` is a retired notice linking to its replacement
- [ ] `setup-consumer.sh` no longer creates `docs/development/epic-registry.md`

---

## 10. Risk Assessment

### High Risk Areas

1. **GitHub milestones fork on the first sync after the rename**
   - **Risk**: without `--rename-from`, `sync-github-epic` creates `Epic 1.3 — Foo` and moves only the epic; its stories stay on `Epic 3 — Foo`.
   - **Probability**: High (the current update path does exactly this). **Impact**: High — the board grouping silently splits.
   - **Mitigation**: Phase 5 renames in place; the integration test asserts one milestone.
   - **Rollback**: rename the new milestone back by hand; revert Phase 5.

2. **Story-side milestone key lags until task.206**
   - **Risk**: `ensure-story-github-issue:76` still builds `Epic ${STORY_E} — …` and, between this task and task.206, files a new story's issue under a milestone that does not match the epic's.
   - **Probability**: Medium (only if a story is synced in that window). **Impact**: Medium.
   - **Mitigation**: land task.206 next; the Notes record the exact format task.206 must emit.

### Medium Risk Areas

1. **Retiring a skill a consumer invokes by name.** Mitigation: CHANGELOG entry; `create-epic` covers the use case.
2. **`create-epic` loses its "no PRD needed" niche.** A small enhancement now needs a PRD. Mitigation: the halt message names `/create-prd`; the owner chose this (plan decision 2).
3. **Vendored generator drift in consumers** (`setup-consumer.sh:1681`). Mitigation: `--update` re-vendors; CHANGELOG step. The generator's new `doc-id` dependency is vendored as `scripts/doc-id.cjs` so an ESM (`"type": "module"`) consumer does not parse it as ESM.
4. **Jira dedup label changes with the directory name.** Only affects an epic with no `jira_key` whose create crashed before write-back. Mitigation: documented in §3; `tracker-reconcile` finds orphans.

### Low Risk Areas

1. **Decimal-epic example removal** — no canonical source uses one.
2. **Task `epic:` milestone lookup** — no task in this repository sets `epic:`.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: `npm test` red on `develop` after merge; `create-epic` writes a file `doc-id check` rejects; a GitHub sync creates a duplicate milestone.
- **Steps**: 1. `git revert -m 1 <merge sha>`. 2. `npm run bundle && npm test`. 3. Push to `develop`.
- **Validation**: `git grep -n "epic-registry-manager" -- skills` shows the skill restored; suite green.

### Partial Rollback (1–2 hours)

- **When**: one phase misbehaves (most likely Phase 5's milestone rename).
- **Steps**: revert that phase's commit only. Phases are independent apart from Phase 1's helpers, which Phases 2 and 4 call. Revert Phase 1 only together with them.

### Forward Fix (< 4 hours)

- **When**: a wording or single-regex defect in one skill; a missed prose site.
- **Approach**: fix forward on a `fix/task.205-*` branch with a test for the defect.

### Rollback Triggers

- **Critical**: duplicate `(P, E)` allocated by `create-epic`; milestone split on GitHub; generator rewriting a PRD it should not.
- **Non-critical**: stale wording; a review finding that cites the old form.

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-15
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.205.qa.7.prd-scoped-epic-numbering.md](./task.205.qa.7.prd-scoped-epic-numbering.md)
- **Gate File**: [task.205.gate.7.prd-scoped-epic-numbering.yml](./task.205.gate.7.prd-scoped-epic-numbering.yml)

### Test Coverage Summary
- **Tests Executed**: 5690 (5676 pass, 0 fail)
- **Phases Verified**: 7/7
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
- Cycle 6's fix verified and mutation-proven; [BUG-14](./task.205.bug.14.shards-stray-fence-hides-step-7-guard.md) closed — all 14 bugs closed.
- The Step 7 batch guard is probed against the committed doc: engages, 8/8.
- One low cleanup (test hook style); advisories carried in the gate's `recommendations.future`.

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-13 | 1.0 | Initial draft | create-task |
| 2026-10-15 | 1.1 | Review passed (8/10) — allocator flag corrected to `--prd-dir`; ESM-safe `doc-id.cjs` vendoring; interim notices, tests to update, guard allowlist and executable-block tests added | review-task |
| 2026-10-15 |  | Status → ready-for-development | review-task |
| 2026-10-15 |  | Implemented — 44 files changed vs develop (bundled copies excluded), `epic-registry-manager` removed; new or changed tests in 7 suites (doc-id helpers, generator, both Jira scripts, `--rename-from`, migration pointer, retirement guard with 5 executed skill blocks) | develop |
| 2026-10-15 |  | QA gate FAIL (70/100) — 3 gating findings (1 high, 1 medium, 1 low) | qa-task |
| 2026-10-15 |  | QA findings fixed — cycle 1, 7 findings (3 gating + 4 advisory), 4 mutation-proven | qa-fix |
| 2026-10-15 |  | QA gate FAIL (60/100) — refute pass, 7 gating findings (1 high, 4 medium, 2 low); bugs 1–2 closed | qa-task |
| 2026-10-15 |  | QA findings fixed — cycle 2, 9 findings; every new block derives its inputs from its own document via `doc-id.js epic-meta`; 7 mutation-proven | qa-fix |
| 2026-10-15 |  | QA gate CONCERNS (80/100) — 2 medium findings (one re-rated from high on a measurement); bugs 3–7 closed | qa-task |
| 2026-10-15 |  | QA findings fixed — cycle 3, 6 findings (2 gating + 3 advisory + 1 cleanup); population of cross-block reads enumerated; 4 mutation-proven | qa-fix |
| 2026-10-15 |  | QA gate FAIL (50/100) — 3 gating findings (2 high, one root; 1 medium); bugs 8–9 closed | qa-task |
| 2026-10-15 |  | QA findings fixed — cycle 4, 4 findings (one path root per block, enforced by a test; batch guard; one frontmatter parser); 4 mutation-proven | qa-fix |
| 2026-10-15 |  | QA gate CONCERNS (80/100) — 0 high; 1 medium, 1 low gating; bugs 10–11 closed | qa-task |
| 2026-10-15 |  | QA findings fixed — cycle 5, 2 gating findings + 1 advisory (batch presence shape; id-check reason printed; create-epic preflight path root); 2 mutation-proven | qa-fix |
| 2026-10-15 |  | QA gate CONCERNS (80/100) — 0 high; 1 medium gating (stray fence hides the Step 7 guard from every engine); bugs 12–13 closed | qa-task |
| 2026-10-15 |  | QA findings fixed — cycle 6, 1 gating finding (stray fence removed; the retirement test reads blocks through the shared fence reader); 1 mutation-proven | qa-fix |
| 2026-10-15 |  | QA gate PASS (100/100) — 0 gating findings, 1 low cleanup; bug 14 closed | qa-task |

---

## Progress Tracking

### Phase 0: Preconditions
- [x] Complete

### Phase 1: Shared id helpers and the index generator
- [x] Complete

### Phase 2: Jira epic paths
- [x] Complete

### Phase 3: Epic authoring skills and the template
- [x] Complete

### Phase 4: Review and edit skills
- [x] Complete

### Phase 5: GitHub epic paths and task milestone lookup
- [x] Complete

### Phase 6: Retire the registry and the skill; close-out
- [x] Complete

---

## References

- [`.agents/plans/hierarchical-doc-numbering.md`](../../../.agents/plans/hierarchical-doc-numbering.md) — approved plan (T4)
- `shared/resources/generate-prd-epic-index.mjs`, `shared/resources/tracker-issue.js`
- [`docs/standards/epic-documents.md`](../../standards/epic-documents.md), [`docs/standards/epic-registry.md`](../../standards/epic-registry.md)

## Notes

**Depends on**: task.202 (the `doc-id.js` engine), task.203 (this repository migrated). **Independent of** task.204.
**Followed by**: task.206 (story/pipeline), task.207 (enforcement and doc sweep).

Owner decisions (2026-10-13, plan approval):

| Decision | Answer |
| --- | --- |
| What `E` counts | Epics within the parent PRD; the global epic registry is retired |
| Epics without a PRD | Not allowed; `create-epic` halts |
| `epic-registry-manager` | Retired, not reduced to a wrapper |

**Contract for task.206**: a story's GitHub milestone is `Epic {P}.{E} — {epic title}`, the exact
string `ensure-epic-github-issue` creates here.

QA artifacts will be co-located here: `task.205.qa.{n}.prd-scoped-epic-numbering.md`,
`task.205.gate.{n}.prd-scoped-epic-numbering.yml`, bug reports `task.205.bug.{n}.{name}.md`.

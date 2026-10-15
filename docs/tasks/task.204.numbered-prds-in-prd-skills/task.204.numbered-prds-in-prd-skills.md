---
id: task.204
title: "Numbered PRDs in the PRD skills"
type: task
description: "Make create-prd allocate a registry-backed PRD number and write prd.{P}.{feature} in both modes, move the templates, greenfield wrapper and shard-prd onto the numbered path, and make review-prd raise Critical findings for any unnumbered or mismatched PRD, epic or story under it, with an offer to run the migration."
tags: [create-prd, review-prd, new-product-prd, shard-prd, prd-template, brownfield-prd-template, doc-numbering, prd-registry]
category: feature
status: ready-for-review
priority: Medium
created: 2026-10-13
updated: 2026-10-15
assignee:
estimated_effort_hours: 16
github_issue: 647
---

# Technical Task: Numbered PRDs in the PRD skills

**Status:** Ready for Review

**Review**: ✅ All review recommendations from `task.204.review.1.numbered-prds-in-prd-skills.md` implemented 2026-10-15

**GitHub Issue**: [#647](https://github.com/Gamaroff/agent-skills/issues/647)

---

## 1. Overview

PRDs are named by slug only (`prd.{feature}.md`), so the PRD number that epics and stories are meant
to carry (`epic.{P}.{E}`, `story.{P}.{E}.{S}`) has nowhere to come from. This task makes the PRD skills
the source of that number. `create-prd` allocates it from the PRD registry, writes it into the file
name, directory and frontmatter, and refuses to finish on a name the shared checker rejects.
`review-prd` turns every numbering defect under a PRD into a **Critical** finding and offers the
migration.

**Scope**: `create-prd` (both modes), `new-product-prd`, `shard-prd`, `prd-template`,
`brownfield-prd-template`, `review-prd`, and the six checklist/skill files that still read the old
greenfield path `docs/prd.md`. The engine (`doc-id.js`, task.202) and the migration
(`migrate-doc-numbering.mjs`, task.203) are consumed here, not built.

**Key deliverables**:

1. `create-prd` allocates `P` via `doc-id next prd` (bootstrapping a missing registry at `P = 1`).
   It writes the `prd.{P}.{feature}/prd.{P}.{feature}.md` file with `prd_number: P`, writes the
   registry row through `doc-id.js`'s `appendPrdRow`, then runs `doc-id check`, which blocks.
2. The templates, `new-product-prd` and `shard-prd` use the numbered path, and `docs/prd.md` stops
   being a default anywhere.
3. `review-prd` adds Critical checks for: no registry, an unnumbered PRD, a disagreeing
   dir/stem/frontmatter, and epics or stories under the PRD that are unnumbered or carry the wrong
   `P`. Each comes with a migration offer. It also fixes the report-name drift, writing
   `prd.{P}.{feature}.review.{n}.{name}.md`.

**Plan of record**: [`.agents/plans/hierarchical-doc-numbering.md`](../../../.agents/plans/hierarchical-doc-numbering.md), item T3.

---

## 2. Motivation

### Current Problems

- **Nothing numbers a PRD.** `create-prd`'s brownfield path is
  `${PRD_ROOT}/[domain]/prd.[feature]/prd.[feature].md` (`skills/create-prd/SKILL.md:45`, Mode
  Parameter table), and the greenfield path is `docs/prd.md` (`:46`). Neither has a number, and no
  registry exists to allocate one (`git grep -n "prd-registry"` finds nothing outside the plan).
- **The greenfield path sits outside the PRD tree.** `docs/prd.md` is the `output.filename` in both
  templates (`skills/prd-template/resources/prd-tmpl.yaml:7`,
  `skills/brownfield-prd-template/resources/brownfield-prd-tmpl.yaml:7`). It is also restated in each
  template's SKILL.md metadata block (`skills/prd-template/SKILL.md:261`,
  `skills/brownfield-prd-template/SKILL.md:171`). `shard-prd` explodes it flat into `$PRD_ROOT`
  (`skills/shard-prd/SKILL.md:87`). A document outside `${PRD_ROOT}/{domain}/prd.*/` cannot parent a
  numbered epic.
- **The PRD prose promises the old epic scheme.** `create-prd/SKILL.md:516` (*"IMPORTANT — Epic
  Numbering"*) and both templates (`prd-tmpl.yaml:141`, `brownfield-prd-tmpl.yaml:237`) say epics get
  "globally unique numbers from the system registry (`/docs/development/epic-registry.md`)". Under
  the approved scheme, epic numbers count within their PRD (task.205), and task.203 retires that
  registry.
- **review-prd cannot see a numbering defect.** Step 2 only checks that the "PRD filename follows
  `prd.[kebab-name].md` convention" (`skills/review-prd/SKILL.md:225`). Step 1 loads the epic
  registry (`:196-197`) that task.203 retires. Nothing checks the epics and stories under the PRD
  for the PRD's number.
- **review-prd's report name disagrees with the standard.** The skill writes
  `prd.review.{N}.{feature}.md` (`review-prd/SKILL.md:597`, `:599`, `:140`, `:779`), while
  `docs/standards/file-naming.md:84` (task.202's row) says `prd.{P}.{name}.review.{n}.{name}.md`. No such report exists
  in the tree today (`find docs -name "prd*review*"` returns nothing), so the fix has no readers to
  migrate.

### Benefits

- **One allocator, one checker.** The PRD number comes from code (`doc-id next prd`), not prose, and
  the authoring skill fails on its own bad output, where the defect is introduced.
- **The PRD's "Epic 1, Epic 2" become the real file numbers.** Epic numbers now count within the
  PRD, so the relative numbers the PRD already uses (`create-prd/SKILL.md:473-474`) are the ones the
  epic files will carry. There is no translation step to get wrong.
- **Legacy trees are found and fixed.** `review-prd` names each defect as Critical and offers the
  migration, rather than letting `create-epic` (task.205) halt later with less context.
- **No orphaned readers.** The checklists that look for `docs/prd.md` follow the path move in the
  same change.

---

## 3. Technical Background

### Current Architecture

| Concern | Today | Cited at |
|---|---|---|
| Brownfield output | `${PRD_ROOT}/[domain]/prd.[feature]/prd.[feature].md` | `skills/create-prd/SKILL.md:45`, `:316` (*"Output: ${PRD_ROOT}/[domain]/prd.[feature]/prd.[feature].md"*) |
| Greenfield output | `docs/prd.md` | `create-prd/SKILL.md:46`, `:307`; `new-product-prd/SKILL.md:67`, `:98` |
| Allowed writes | PRD file + dir; forbids writes outside `${PRD_ROOT}/` or `docs/prd.md` | `create-prd/SKILL.md:56`, `:65` |
| Commits | `create-prd` forbids "Creating branches, committing, or pushing" | `create-prd/SKILL.md` § *Documentation-Only Scope* |
| Continuation | Brownfield 1a offers Resume / Start fresh (overwrite) / Extend / Revise | `create-prd/SKILL.md` § *1a. Continuation Detection* |
| PRD frontmatter | `type`, `description`, `tags`, plus `name`, `title`, `mode`, `status`, `version`, `created` | `create-prd/SKILL.md:152` (*PRD Frontmatter (OKF conformance)*) |
| Templates | `output.filename: docs/prd.md` in YAML and in SKILL.md metadata copies | see Motivation |
| Sharding | `md-tree explode docs/prd.md "$PRD_ROOT"`; manual: `docs/prd.md` → `docs/prd/` | `shard-prd/SKILL.md:87`, `:123` |
| review-prd input | `${PRD_ROOT}/**/prd.*{name}*.md`, then sharded-dir fallback | `review-prd/SKILL.md:108-109` |
| review-prd context | loads `docs/development/epic-registry.md` | `review-prd/SKILL.md:196-197`, `:819` (*Critical Files Reference*) |
| review-prd naming check | `prd.[kebab-name].md`, dir `prd.[kebab-name]/` | `review-prd/SKILL.md:225-226` |
| review-prd report | `prd.review.{N}.{feature}.md` | `review-prd/SKILL.md:597-599` |
| Path resolution | `PRD_ROOT` from `prd.prdShardedLocation`, default `docs/prd` | `shared/resources/resolve-paths.sh:55-56` |
| Template filename precedent | `story-template.yaml` already puts placeholders in `output.filename` | `skills/create-story/resources/story-template.yaml:7` |

**Readers of `docs/prd.md`** (`git grep -n "docs/prd\.md" -- ':!docs/tasks' ':!**/references/**'`):
`skills/pm-checklist/SKILL.md:37`, `:510-512`; `skills/execute-architect-checklist/SKILL.md:97`;
`skills/execute-architect-checklist/resources/architect-checklist.md:10`;
`skills/architect/resources/architect-checklist.md:10`;
`skills/execute-checklist/resources/po-master-checklist.md:16`;
`skills/po/resources/po-master-checklist.md:16`; `skills/shard-doc/SKILL.md:245`;
`skills/create-architecture-doc/resources/templates/architecture-tmpl.yaml:18` and
`fullstack-architecture-tmpl.yaml:18`. Each one tells an agent where to *find* a PRD.

**No PRD-skill tests exist.** `git grep -ln "create-prd\|review-prd\|shard-prd\|prd-tmpl" -- tests evals shared/resources/tests 'skills/*/tests'`
returns only `tests/skill-protocol.test.js` and two develop-next fixtures, none of which exercises
PRD naming.

### Dependencies consumed (not built here)

- **task.202, `shared/resources/doc-id.js`.** Shipped CLI (recorded at review, 2026-10-15):
  `parse <name>`, `next prd [--prd-root R]`, `next epic --prd-dir`, `next story --epic-dir`,
  `check <path> [--prd-root R]`, `check --corpus [--prd-root R]`, `epic-meta`; exit 0 ok / 1 guard /
  2 usage, `--json` `reason`.
  - `next prd` answers `{ok, reason, next}`; reasons `ok`, `registry-missing` (no registry file — it
    does **not** bootstrap), `registry-invalid`, `registry-behind`, `unreadable`.
  - `check <path>` answers `reason: ok | findings` with `findings[]` of `{reason, path, detail}`;
    finding reasons are `CHECK_REASONS`: `bad-shape`, `dir-stem-mismatch`, `frontmatter-mismatch`,
    `parent-missing`, `parent-number-mismatch`, `unregistered`, `duplicate-id`, `registry-missing`,
    `unreadable`. `check --corpus` adds `documents` and the run reasons `empty`, `root-missing`.
  - **No CLI command writes a registry row.** The library export `appendPrdRow(registryText, {n,
    title, href, folder, status, created})` does, and bootstraps the empty registry when
    `registryText` is `null`. `create-prd` calls it through one `command node -e` snippet that
    requires the bundled `references/doc-id.js`; the engine is not changed by this task.
- **task.203, `shared/resources/migrate-doc-numbering.mjs`.** `--check` (read-only), default dry run,
  `--apply`; `--name <path>=<slug>` names a PRD whose slug cannot be derived. `--check` answers
  `needs-migration` (exit 1) **before** consulting blockers, so its payload's `blockers[]` must be read
  too; other fields `mapping`, `counts`, `corpus`. A root-level `docs/prd.md` is discovered as an L3
  monolith and blocks with `unplaced-prd` until `--name docs/prd.md=<slug>` is passed
  (`migrate-doc-numbering.mjs:310–322`, `:425–431`). `review-prd` calls `--check` and offers the apply.
- **The PRD registry format** (`docs/standards/prd-registry.md`) and the updated `prd-documents.md`
  / `file-naming.md` rows are task.202's. This task does not restate them.

### Target Architecture

```
create-prd (both modes)
  Step 1  pre-flight, unchanged; continuation keeps an existing PRD's number
  Step 1c (new) resolve {domain}, {feature}; P = `doc-id next prd`
          registry-missing + no prd.{N}.* dir under ${PRD_ROOT} → P = 1 (bootstrap)
          registry-missing + a numbered PRD dir exists       → HALT (run /review-prd)
  Step 2  create-doc → ${PRD_ROOT}/{domain}/prd.{P}.{feature}/prd.{P}.{feature}.md
          frontmatter: name: prd.{P}.{feature}, prd_number: P
          registry row via appendPrdRow (P, title, href, folder, draft, created);
          creates ${PRD_ROOT}/prd-registry.md when absent
  Step 3.5 (new) `doc-id check <prd file>` → non-ok = HALT, name the reason
  Step 4  next steps: "commit the PRD and the registry row together" (handed to the user)

review-prd
  Input   accepts prd.{P}, bare P, slug, or path; keeps kind=prd, no artifact infix
  Step 1  loads the PRD registry + the PRD's epics-index; epic registry dropped
  Step 2  one `doc-id check --corpus` over ${PRD_ROOT}, findings filtered to the
          PRD directory by path prefix → each finding is Critical
          `migrate-doc-numbering.mjs --check` → no blockers: offer apply (AskUserQuestion)
  Step 11 report: prd.{P}.{feature}.review.{n}.{name}.md
```

### Important Clarifications

- **The registry row and the PRD land in one commit, and the user makes it.** `create-prd` forbids
  committing (*Documentation-Only Scope*), exactly as `create-task` does. The atomicity rule
  therefore becomes the completion message's instruction: name both paths and say they go in one
  commit. It is not a `git commit` inside the skill.
- **A number is never re-allocated for the same PRD.** *Resume* and *Start fresh (overwrite)* keep
  the existing `P`, and so do *Extend* and *Revise*. Only a genuinely new PRD calls `next prd` — the
  complete-PRD menu's *Start fresh*, which this task relabels "Create a new, separate PRD (new number;
  this one is untouched)" so it no longer shares a label with the incomplete menu's overwrite. A found
  PRD with no number (a legacy name) is not continued: the skill halts and points at `/review-prd`,
  which offers the migration. A
  PRD abandoned after allocation keeps its row, with status `cancelled`. Numbers are never reused,
  as in the task and bug registries.
- **Greenfield gets a `{domain}` too.** It is asked once, and the recommended answer is the product
  slug, so a greenfield PRD lands at `${PRD_ROOT}/{product}/prd.{P}.{product}/`. One layout means one
  checker rule.
- **Sharding happens in place.** `shard-prd` explodes `prd.{P}.{feature}.md` into its own directory
  (`index.md` plus section files beside it). The numbered file stays as the registry-anchored entry
  point and keeps `prd_number`. `create-epics-from-shards` (task.205) reads the shards from that
  directory.
- **Template `output.filename` becomes a placeholder path**, following the story template's
  precedent. `create-doc` driven directly (not via `create-prd`) therefore has no `{{prd_number}}`
  to fill. The template instruction says the number comes from `create-prd` and that an unfilled
  `{{prd_number}}` means stop. That closes the bypass where `create-doc` + `prd-template` writes an
  unnumbered PRD.
- **Report name.** `prd.{P}.{feature}.review.{n}.{name}.md`, the full-stem form task.202 wrote into
  `file-naming.md:84` (resolved at review, 2026-10-15). `{n}` is the highest existing plus 1 over
  `prd.{P}.*.review.*.md` in the PRD directory. `doc-id parse` reads it as kind `prd`, artifact
  `review`, which is how input resolution excludes it.

---

## 4. Scope

### In Scope

- `skills/create-prd/SKILL.md`, both modes:
  - number allocation and registry bootstrap
  - numbered output path and frontmatter
  - continuation keeps `P`
  - the blocking `check` step
  - allowed-writes list
  - the epic-numbering note
  - the completion message
- `skills/new-product-prd/SKILL.md` output lines.
- `skills/prd-template/` and `skills/brownfield-prd-template/`: the YAML `output.filename`, the
  SKILL.md metadata copies, and the epic-numbering notes.
- `skills/shard-prd/SKILL.md`: explode in place, both methods.
- `skills/review-prd/SKILL.md`:
  - input resolution
  - Step 1 context
  - Step 2 numbering checks and the migration offer
  - Step 5 numbered coverage examples
  - the Step 11 report name
  - the *Critical Files Reference*
- The ten `docs/prd.md` reader sites listed in Technical Background.
- A behavioural snippet test, then `npm run bundle`, `npm run generate-catalog` and `npm run validate`.

### Out of Scope

- ❌ `doc-id.js`, the registry format and the standards rows. These are task.202.
- ❌ The migration script and migrating this repo. These are task.203.
- ❌ Epic-side skills (`create-epic`, `create-epics-from-shards`, `review-epic`,
  `generate-prd-epic-index.mjs`). These are task.205. Independent of this task.
- ❌ Story and pipeline id parsing. This is task.206.
- ❌ The corpus CI test and the repository-wide placeholder sweep. These are task.207.
- ❌ Tracker cards for PRDs. There is no `sync-*-prd`.

---

## 5. Breaking Changes

### 5.1 Greenfield output path moves out of `docs/prd.md`

- **Before**: `create-prd mode=greenfield` writes `docs/prd.md`, and `shard-prd` explodes it into
  `$PRD_ROOT`.
- **After**: it writes `${PRD_ROOT}/{product}/prd.{P}.{product}/prd.{P}.{product}.md`, and
  `shard-prd` explodes it into that directory.
- **Affected**: consumers holding a monolithic `docs/prd.md`, and the ten reader sites above.
- **Migration path**: the reader sites move in this task (Phase 3). An existing `docs/prd.md` is
  handled by `migrate-doc-numbering.mjs` (task.203). `review-prd` detects it, reports Critical, and
  offers the migration. **Precondition (met)**: task.203 discovers a root-level `docs/prd.md` as an
  L3 monolith and numbers it once its slug is given with `--name docs/prd.md=<slug>`
  (`migrate-doc-numbering.mjs:310–322`, `:425–431`). `review-prd` asks for that slug when the dry run
  reports `unplaced-prd`; `shard-prd` refuses the file. Neither silently ignores it.

### 5.2 `create-prd` refuses to finish on a name `doc-id check` rejects

- **Before**: any path the session chose was accepted.
- **After**: a non-`ok` `reason` halts the skill with the reason and the fix.
- **Affected**: only a run whose output is already wrong.
- **Migration path**: none needed. The skill picked the name, so a failure is the skill's own
  defect.

### 5.3 review-prd report filename

- **Before**: `prd.review.{N}.{feature}.md`.
- **After**: `prd.{P}.{feature}.review.{n}.{name}.md` (`file-naming.md:84`).
- **Affected**: nobody. No report of the old form exists in the tree, and no code reads it.
- **Migration path**: none.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.204.plan.numbered-prds-in-prd-skills.md](task.204.plan.numbered-prds-in-prd-skills.md)

**Phase 0, gate.** HALT unless task.202 and task.203 are `accepted` in
`docs/tasks/task-registry.md`, and `shared/resources/doc-id.js` and
`shared/resources/migrate-doc-numbering.mjs` exist. The shipped subcommand spellings and `reason`
values are recorded under *Dependencies consumed* (checked at review, 2026-10-15); re-confirm them
before writing prose that calls them.

### Phase 1: `create-prd` allocates and checks the number

**Risk**: Medium. **Files**: `skills/create-prd/SKILL.md`. **Depends on**: Phase 0.

- [x] Mode Parameter table: both rows output `${PRD_ROOT}/{domain}/prd.{P}.{feature}/prd.{P}.{feature}.md`. Greenfield `{domain}` defaults to the product slug.
- [x] New *Step 1c — Allocate the PRD number* (shipped as **Step 1.5**: create-prd's brownfield branch already has a `1c`), one fenced block. Source `references/resolve-paths.sh || exit 1`, then run `doc-id next prd --json`. `ok` → `P = next`. `registry-missing` → `P = 1` when no directory under `${PRD_ROOT}` parses as a numbered PRD (`doc-id parse`), else HALT ("registry missing but numbered PRDs exist — run `/review-prd`"). Any other reason → HALT with it. Never hand-compute "highest + 1".
- [x] Continuation (1a): Resume, Start fresh (overwrite), Extend and Revise reuse the found PRD's `prd_number`, read by one fenced block (`doc-id parse` of the found file's name, cross-checked with frontmatter `prd_number`). A found PRD that does not parse as numbered → HALT, pointing at `/review-prd` (migration). Only the complete-PRD menu's *Start fresh*, relabelled "Create a new, separate PRD (new number; this one is untouched)", allocates.
- [x] *PRD Frontmatter*: add `prd_number` and `name: prd.{P}.{feature}`.
- [x] New registry-row block, run in the step that writes the file: one `command node -e` that requires the bundled `references/doc-id.js`, reads `${PRD_ROOT}/prd-registry.md` (or `null` when absent — `appendPrdRow` bootstraps it), appends `{n: P, title, href: "{domain}/prd.{P}.{feature}/prd.{P}.{feature}.md", folder: "{domain}", status: "draft", created}`, and writes the file. A thrown `.reason` (`duplicate-row`, `registry-invalid`, `no-table`, `bad-row`) HALTs with it.
- [x] New *Step 3.5 — Numbering check (blocking)*: `doc-id check "<prd file>" --json`. A non-`ok` result HALTs with the reason verbatim.
- [x] Allowed writes: add `${PRD_ROOT}/prd-registry.md`; drop `docs/prd.md` from both lists.
- [x] Rewrite *IMPORTANT — Epic Numbering* (`:516`): epic files take `epic.{P}.{E}`, where E counts within this PRD and equals the PRD's own "Epic N".
- [x] Step 4 (*Next Steps*) completion message: the PRD and the registry row are one commit, made by the user.
- [x] Example Activations (`:720`): show the numbered path.

### Phase 2: Templates, greenfield wrapper and sharding

**Risk**: Low. **Files**: the two template YAMLs, their SKILL.md files, `new-product-prd/SKILL.md`, `shard-prd/SKILL.md`. **Depends on**: Phase 1.

- [x] `prd-tmpl.yaml` and `brownfield-prd-tmpl.yaml`: `output.filename` set to the placeholder path. Update the SKILL.md metadata copies to match.
- [x] Template epic-numbering notes (`prd-tmpl.yaml:141`, `brownfield-prd-tmpl.yaml:237`): change to per-PRD numbering.
- [x] Template instruction: `{{prd_number}}` is allocated by `create-prd`. An unfilled one means stop and run `/create-prd`.
- [x] `new-product-prd/SKILL.md:67`, `:98`: numbered output.
- [x] `shard-prd/SKILL.md`, Method 1 (`:87`): explode the numbered PRD into its own directory. Method 2 (`:123`) gets a PRD special case: the target is the PRD's directory, not `docs/{document-name}/`. Update the examples (`:21`, `:276-280`).
- [x] `shard-prd`: a found root-level `docs/prd.md` is reported as legacy and pointed at `/review-prd` (migration). It is never exploded into `$PRD_ROOT`.

### Phase 3: `review-prd` enforces numbering, and the readers follow the path

**Risk**: Medium. **Files**: `skills/review-prd/SKILL.md` plus the ten reader sites. **Depends on**: Phase 1.

- [x] Input Resolution: accept `prd.{P}`, a bare `P` and a slug. Keep only matches that `doc-id` parses as kind `prd` with no artifact infix, which excludes review reports.
- [x] Step 1: load `${PRD_ROOT}/prd-registry.md` and the PRD's epics-index block. Drop the epic registry (`:196-197`, `:819`).
- [x] Step 2: replace the `prd.[kebab-name]` checks (`:225-226`) with one fenced block: `doc-id check --corpus --json` over `${PRD_ROOT}`, findings kept when their `path` lies under the PRD's directory. Each finding is **Critical** and carries its `reason`. Four classes: registry missing (`registry-missing`), PRD unnumbered (the PRD file fails `doc-id parse`, so the corpus walk reports `bad-shape`), dir/stem/frontmatter disagree (`dir-stem-mismatch`, `frontmatter-mismatch`), child unnumbered or wrong `P` (`bad-shape`, `parent-number-mismatch`).
- [x] Step 2: when any of those fire, run `migrate-doc-numbering.mjs --check --json` and read `reason`, `blockers[]` and `mapping`. No blockers → fold `mapping` into QUESTION POINT 1 as an apply/skip choice. `unplaced-prd` on a monolith → ask for its slug and re-run with `--name <path>=<slug>`. Any other blocker → report it as Critical and offer no apply. Apply (`--apply`) only on an explicit yes, then re-run the corpus check.
- [x] Step 5 and Step 6 examples (`:411-413`): `epic.{P}.{E}` and `story.{P}.{E}.{S}`.
- [x] Step 11 and Step 0 (`:140`, `:597-599`, `:779`): report name `prd.{P}.{feature}.review.{n}.{name}.md`, `{n}` the highest existing plus 1 over `prd.{P}.*.review.*.md`.
- [x] Reader sites: replace `docs/prd.md` with "the PRD under `${PRD_ROOT}/**/prd.{P}.*/`; ask which when several exist".
- [x] `tests/epic-numbering-retirement.test.js`: drop the `skills/create-prd/SKILL.md` and `skills/review-prd/SKILL.md` entries from `ALLOW` — this task removes their last `epic-registry.md` literal (`create-prd/SKILL.md:516`, `review-prd/SKILL.md:197`, `:819`), and the guard's second test fails on an allowlisted file that no longer carries one. Found by `git grep -nE "epic-registry|prd\.review\.|docs/prd\.md" -- '*.test.*' 'tests/**'`.

### Phase 4: Behavioural test, bundle, catalog

**Risk**: Low. **Files**: `evals/shared/tests/prd-skill-numbering.test.mjs` (new), `package.json` only if its glob does not already reach the file. **Depends on**: Phases 1–3.

- [x] Snippet test: slice the live allocation, check and migration-offer snippets out of `create-prd/SKILL.md` and `review-prd/SKILL.md`. Run them under bash in a `makeConsumerRoot` scratch tree and assert outcomes (see Testing Strategy).
- [x] Mutation-prove each assertion.
- [x] `npm run bundle`: `doc-id.js` and `migrate-doc-numbering.mjs` now reach `create-prd` and `review-prd`. Then `npm run bundle:check`, `npm run generate-catalog`, and `npm run validate` on each touched skill.

---

## 7. Files Summary

### Core Implementation

1. ✅ `skills/create-prd/SKILL.md`: allocation, check, continuation, frontmatter, writes, epic note.
2. ✅ `skills/review-prd/SKILL.md`: input, context, Critical checks, migration offer, report name.
3. ✅ `skills/shard-prd/SKILL.md`: in-place explode, legacy `docs/prd.md` refusal.
4. ✅ `skills/new-product-prd/SKILL.md`: output lines.
5. ✅ `skills/prd-template/resources/prd-tmpl.yaml` and `skills/prd-template/SKILL.md`.
6. ✅ `skills/brownfield-prd-template/resources/brownfield-prd-tmpl.yaml` and `skills/brownfield-prd-template/SKILL.md`.

### Reader sites (path move)

7. ✅ `skills/pm-checklist/SKILL.md`
8. ✅ `skills/execute-architect-checklist/SKILL.md`
9. ✅ `skills/execute-architect-checklist/resources/architect-checklist.md`
10. ✅ `skills/architect/resources/architect-checklist.md`
11. ✅ `skills/execute-checklist/resources/po-master-checklist.md`
12. ✅ `skills/po/resources/po-master-checklist.md`
13. ✅ `skills/shard-doc/SKILL.md`
14. ✅ `skills/create-architecture-doc/resources/templates/architecture-tmpl.yaml` and `fullstack-architecture-tmpl.yaml`

Population command (re-run before editing; the list above is its 2026-10-13 output):
`git grep -n "docs/prd\.md" -- ':!docs/tasks' ':!docs/bugs' ':!**/references/**'`.

### Tests

15. ✅ `evals/shared/tests/prd-skill-numbering.test.mjs` (new). It reuses `evals/shared/lib/consumer-root.mjs` (`makeConsumerRoot`) and the slice-the-live-line pattern of `evals/shared/tests/optional-file-lookups.test.mjs`. Reached by `npm test`'s `'evals/shared/tests/*.test.mjs'` glob — no runner edit.
16. ✅ `tests/epic-numbering-retirement.test.js`: two `ALLOW` entries removed.

### Generated (bundle output, not hand-edited)

17. `skills/create-prd/references/doc-id.js` and `skills/review-prd/references/{doc-id.js,migrate-doc-numbering.mjs}`, plus their closures.
18. `docs/reference/skill-catalog.md`.

---

## 8. Testing Strategy

### Unit / Snippet Tests (`prd-skill-numbering.test.mjs`)

Each row slices the **live** snippet from the skill and runs it, so the test follows the text as
shipped. It asserts behaviour, never that a string exists.

| # | Fixture | Snippet | Expect |
|---|---|---|---|
| 1 | empty `docs/prd/` (no registry) | create-prd allocation, then registry-row block | `P = 1`; `docs/prd/prd-registry.md` created with row 1 and counter 2 |
| 1b | no registry, but `docs/prd/x/prd.2.x/` exists | create-prd allocation | HALT branch fires, no number, no registry written |
| 2 | registry with next = 3 | allocation | `P = 3` |
| 3 | PRD written at the numbered path with `prd_number` | create-prd check | `reason: ok`, exit 0 |
| 4 | the same PRD with `prd_number` stripped | create-prd check | non-`ok`, non-zero exit (the HALT branch fires) |
| 5 | legacy `prd.onboarding/prd.onboarding.md` with an epic below | review-prd check | a non-`ok` for the PRD and for the epic |
| 6 | the same as #5 | review-prd migration `--check` | lists the planned renames; writes nothing (`git status --porcelain` empty) |
| 6b | the same as #5 | review-prd apply snippet, then the corpus check | renames applied; the corpus check answers `ok` |
| 7 | numbered PRD with review reports `prd.1.x.review.{1,3}.y.md` | review-prd N block | next is `4` (highest + 1, not count + 1); input resolution does not pick a report as the PRD |
| 8 | existing `prd.4.x/prd.4.x.md` (`prd_number: 4`), registry next = 5 | create-prd continuation block | `P = 4`; registry byte-identical |
| 9 | found legacy `prd.x/prd.x.md` | create-prd continuation block | HALT branch fires, pointing at `/review-prd` |
| 10 | numbered PRD, registry deleted; and one with `prd_number` wrong | review-prd check | `registry-missing`; `frontmatter-mismatch` — the two classes row 5 does not show |
| 11 | the create-prd allocation, row and check blocks as sliced | count `command node` invocations | exactly 3 (the Performance bound) |

**Control case** (create-task § 8): row 7's PRD sits beside `prd.12.other/`. Resolving `1` must
not match `12`. Row 5 includes a numbered PRD whose epic carries the *wrong* `P`, a defect class
that this document's own example (an unnumbered PRD) never shows.

**Mutation proof**:
- Delete the HALT line in Step 3.5 → row 4 goes red.
- Swap the input filter for the old `prd.*{name}*` glob → row 7 goes red.
- Make the `registry-missing` branch allocate unconditionally → row 1b goes red.
- Drop the unnumbered-PRD HALT in continuation → row 9 goes red.
- Count reports instead of taking the highest → row 7 goes red (its series has a gap).
- Drop the PRD-directory prefix filter in the numbering check → row 5 goes red.

### Integration Tests

- Scratch-consumer smoke: `/create-prd` (brownfield), then `/create-prd` again → `prd.1.*` and
  `prd.2.*`, with registry rows 1 and 2.
- `/review-prd prd.1` on a clean PRD → no numbering findings.
- Hand-break one epic's `P` → one Critical finding.

### Consumer Tests

- `npm run bundle:check` is clean.
- `setup-consumer.sh` tarball install: `create-prd/references/doc-id.js` is present, and the
  snippets run from `.agents/skills/create-prd/`.
- Move the gitignored `.agents/skills` symlink aside before trusting a local green.

---

## 9. Success Criteria

### Functional

- [ ] A brownfield and a greenfield `create-prd` run each produce `${PRD_ROOT}/{domain}/prd.{P}.{feature}/prd.{P}.{feature}.md` with `prd_number: P` and a registry row; a missing registry is bootstrapped only when no numbered PRD exists (test rows 1, 1b, 2, 3; integration smoke).
- [ ] Re-running `create-prd` on an existing PRD (any continuation option except "Create a new, separate PRD") keeps its `P` and allocates nothing; an unnumbered found PRD halts (test rows 8, 9).
- [ ] `create-prd` HALTs on any non-`ok` `doc-id check` result (row 4).
- [ ] `review-prd` reports each of the four numbering classes as **Critical**, with the engine's `reason` (rows 5 and 10).
- [ ] `review-prd` offers the migration only when `--check` reports no blockers, applies it only on a yes, and re-checks afterwards (rows 6, 6b).
- [ ] `review-prd` writes `prd.{P}.{feature}.review.{n}.{name}.md` and never resolves a review report as the PRD (row 7).
- [ ] `git grep -n "docs/prd\.md" -- ':!docs/tasks' ':!docs/bugs' ':!**/references/**' ':!.agents/plans' ':!shared/resources/tests'` returns only the legacy-detection lines in `shard-prd` and `review-prd`. (The exclusions are the plan of record and task.203's monolith fixtures, which name the legacy path on purpose.)

### Performance

- [ ] Allocation, the registry row and the check add exactly three `command node` calls to a `create-prd` run (test row 11).
- [ ] `review-prd`'s subtree check is a single `doc-id check --corpus` invocation, filtered by path prefix. It does not run a separate check per epic (documentation criterion: the block in `review-prd/SKILL.md` shows one invocation).

### Code Quality

- [ ] `npm run ci:fast` (`format:check` + `npm test`) and `npm run eval:all` pass with `.agents/skills` moved aside.
- [ ] `npm run bundle:check` is clean, with no `UNREACHED` copies.
- [ ] `npm run validate -- skills/<skill>/` passes for every touched skill. `npm run generate-catalog` produces no diff after a commit.
- [ ] Every assertion in the new test is mutation-proven (Testing Strategy).

### Migration

- [ ] `docs/standards/file-naming.md:84`'s PRD review row (task.202) and the review-prd report name agree: `prd.{P}.{name}.review.{n}.{name}.md`.
- [ ] A consumer holding `docs/prd.md` gets a Critical finding plus a migration offer from `review-prd`, and a refusal from `shard-prd`. Neither skill silently reads it.

---

## 10. Risk Assessment

### High Risk Areas

1. **task.202/203 ship a different CLI surface than the plan names.**
   - Probability: Medium. Impact: High, because prose would call commands that do not exist.
   - Mitigation: Phase 0 records the shipped spellings first, and the snippet test runs the live
     snippet against the real engine.
   - Rollback: revert this task's commits. The engines are unaffected.

### Medium Risk Areas

1. **Greenfield `docs/prd.md` handling not covered by task.203.**
   - Probability: Medium. Impact: Medium.
   - Mitigation: Breaking Change 5.1 precondition, plus a `shard-prd` refusal that names the manual
     move.
2. **Shard files collide with the checker.** A shard named from a heading (e.g. `epic-1-foundation.md`)
   lives beside numbered docs.
   - Probability: Low. Impact: Medium.
   - Mitigation: `doc-id` keys on the dotted `kind.` prefix, and shards are hyphenated. Add a
     shard-dir row to the integration smoke.
3. **Registry merge conflict.** Two branches each allocate `P` on the same base.
   - Probability: Low. Impact: Medium.
   - Mitigation: the registry rule "higher number wins; loser bumps" (task.202), and the duplicate
     check in `doc-id check --corpus` (task.207).

### Low Risk Areas

1. **Reader-site prose drift.** The ten sites restate the path independently.
   - Mitigation: the Functional criterion's `git grep` is the re-measure.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: `create-prd` cannot complete in a consumer because `next prd` or `check` errors on a
  valid tree, or `review-prd` reports Critical on a correctly numbered PRD.
- **Steps**: `git revert` this task's merge commit, then `npm run bundle`, then commit. task.202 and
  task.203 stay in place.
- **Validation**: `npm test` is green, and the `create-prd` smoke writes the old path.

### Partial Rollback

- Revert Phase 3 alone when `review-prd`'s checks misfire but allocation is sound. The commits are
  per phase.

### Forward Fix

- A wrong reader-site path or template wording is fixed forward. Neither blocks authoring.

### Rollback Triggers

- **Critical**: an allocation that reuses a number, or a check that blocks a valid PRD.
- **Non-critical**: wording, examples, reader sites.

---

<!-- change-log-start -->
## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-10-13 | 1.0     | Initial draft (from plan T3) | create-task |
| 2026-10-15 | 1.1     | Review passed (8/10) after fixes — `next prd` does not bootstrap and no CLI writes a row (row write via `appendPrdRow`); report name follows file-naming.md:84 full stem; migration payload `blockers[]`/`--name`; retirement-guard ALLOW entries; grep exclusions; test rows 1b, 6b, 8–11 | review-task |
| 2026-10-15 |         | Status → ready-for-development | review-task |
| 2026-10-15 |         | Implemented — 25 files, 16 tests (`prd-skill-numbering.test.mjs`) | develop |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 0: Gate
- [x] task.202 and task.203 accepted; shipped CLI spellings recorded

### Phase 1: `create-prd` allocates and checks
- [x] Complete

### Phase 2: Templates, greenfield wrapper, sharding
- [x] Complete

### Phase 3: `review-prd` enforcement and reader sites
- [x] Complete

### Phase 4: Test, bundle, catalog
- [x] Complete

---

## References

- **Plan**: [`.agents/plans/hierarchical-doc-numbering.md`](../../../.agents/plans/hierarchical-doc-numbering.md), item T3
- **Depends on**: task.202 (doc-id engine + PRD registry), task.203 (migration). Independent of task.205.
- **Related skills**: `.agents/skills/create-prd/`, `.agents/skills/review-prd/`, `.agents/skills/shard-prd/`
- **Standards**: `docs/standards/prd-documents.md`, `docs/standards/file-naming.md`, `docs/standards/prd-registry.md` (task.202)

---

## Notes

### Important Reminders

- Edit the skill sources and `shared/resources/` only, never a bundled `references/` copy, or
  `npm run bundle` reverts the fix.
- Use `command node`, never bare `node`.

### Author decisions (resolved at `/review-task`, 2026-10-15)

1. **PRD review report name**: the full stem, `prd.{P}.{feature}.review.{n}.{name}.md`, as task.202's
   `file-naming.md:84` row says.
2. **Shard location**: in place, inside `prd.{P}.{feature}/`, with the numbered file kept as the
   entry point. Agrees with task.205's `create-epics-from-shards`, which reads `index.md` from the
   `prd.{P}.{feature}/` directory.
3. **Greenfield `{domain}`**: asked, with the product slug recommended.

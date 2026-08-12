---
id: task.42
title: "Canonical Change Log spec and shared engine"
type: task
description: "Establish one canonical Change Log section format for PRD/epic/story/task documents, backed by a shared engine extracted from jira-sync.js, and record it in the standards."
tags: [change-log, documentation, shared-resources]
category: infrastructure
status: in-progress
priority: High
created: 2026-08-12
updated: 2026-08-12
assignee:
estimated_effort_hours: 16
github_issue: 201
---

# [Task 42] Canonical Change Log spec and shared engine

**Status:** In Progress

**Review**: ✅ All review recommendations from `task.42.review.1.change-log-spec-and-engine.md` implemented 2026-08-12

**GitHub Issue:** [#201](https://github.com/Gamaroff/agent-skills/issues/201)

---

## 1. Overview

Stakeholders want to read a history of changes on PRD, epic, story, and task documents. A
Change Log already exists — but in four incompatible table shapes, on only two of the four
document types, written by nine skills that disagree about the format, with a live
placement bug that inserts a duplicate block at the top of the document body.

This task establishes the single canonical definition and the one piece of code that
implements it. It changes no skill behaviour on its own; it is the foundation the three
follow-on tasks build against.

**Scope**: A new canonical spec (`shared/resources/document-change-log.md`), a new shared
engine (`shared/resources/change-log.js`) extracted and generalised from the changelog
helpers currently living inside `jira-sync.js`, unit tests, the `change-log.*` config keys,
and the standards documents that must name the section.

**Key deliverables**:

1. `shared/resources/document-change-log.md` — the canonical spec.
2. `shared/resources/change-log.js` + `shared/resources/tests/change-log.test.mjs`.
3. Standards and configuration reference updated to name the section.

**Expected outcome**: One place to read what a Change Log is, and one function that writes
one. No document or skill changes behaviour yet.

---

## 2. Motivation

### Current Problems

1. **Four competing table shapes.** `Date, Version, Description, Author` (story template
   `skills/create-story/resources/story-template.yaml:171`, greenfield PRD
   `skills/prd-template/resources/prd-tmpl.yaml:31`); `Change, Date, Version, Description,
   Author` (brownfield PRD `skills/brownfield-prd-template/resources/brownfield-prd-tmpl.yaml:118`);
   `Date (UTC), Change` (all six sync skills, via `jira-sync.js:431`); and a bulleted
   `**[Date]**: [Change description]` form with no table at all
   (`docs/templates/epic-template.md:680`). A stakeholder reading two documents sees two
   different things.

2. **The engine cannot find the heading the templates emit.** `findHandWrittenChangelog()`
   (`shared/resources/jira-sync.js:468`) matches `/^## Change Log[ \t]*\n+/m`. The epic and
   story markdown templates emit `### Change Log` nested under `## Notes & Updates`. The
   match fails, so `upsertChangelog()` falls through to its last resort and inserts a
   **second** H2 block before the first `##` heading — at the very top of the document body,
   above the Epic Goal. The document now has two Change Logs and the visible one is in the
   wrong place.

3. **Two incompatible marker pairs.** `<!-- jira-sync-changelog-start -->`
   (`jira-sync.js:411`) and `<!-- github-sync-changelog-start -->` (documented in
   `skills/sync-github-story/SKILL.md:213` and siblings). A document synced to both trackers
   grows two independent, separately-maintained Change Log blocks.

4. **No canonical definition anywhere.** `docs/standards/` has no Change Log spec. The
   section is named only positionally, in the Stakeholder Sign-off row of
   `docs/standards/story-documents.md:91` ("Sits between Dev Notes and Change Log"), and it
   is absent from that file's own Section-ownership table.
   `skills/documentation-standards-validator/SKILL.md:25` lists "(3) Change Log header" as
   one of its seven mechanical checks but never defines what the check is.

5. **Nobody owns `updated:`.** Frontmatter `updated` is this repo's OKF `timestamp`
   (`shared/resources/open-knowledge-format.md`), but no document says it must move when a
   Change Log row is added, so it drifts from the log it should agree with.

### Benefits of a canonical spec plus one engine

1. **One shape.** A stakeholder reads the same four columns on every document type.
2. **The placement bug becomes untestable-to-reintroduce.** A heading regex that accepts H2
   and H3 with optional numbering, plus a doc-type insertion anchor, removes the failure mode
   entirely rather than patching one caller.
3. **One marker pair**, so a dual-synced document has exactly one Change Log.
4. **A reusable engine.** Six sync skills, four review skills, and the QA/finalise steps all
   need to append a row; today only the Jira path has code, and the GitHub path is prose that
   the model re-implements per skill.
5. **A named contract for `updated:`**, closing the OKF drift.
6. **The precedent already works.** `shared/resources/sign-off.md` and, more recently,
   `shared/resources/tracker-card-summary.md` (commit `37bcf3f`) both replaced drifted
   hand-maintained copies with one spec that skills link. That commit's own message records
   the cost of not doing this: "The GitHub path had two hand-maintained copies of its
   contract that had already drifted, plus two more independent builders."

---

## 3. Technical Background

### Current Architecture

The entire changelog implementation is 105 lines inside a 4,000-line Jira module:

```
shared/resources/jira-sync.js
  :411  CL_START / CL_END              — jira-specific HTML markers
  :421  RE_ENTRY_ROW                   — /^\|\s*\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s*\|/
  :423  fmtEntry(summary)              — 2-column row, "YYYY-MM-DD HH:MM"
  :428  buildChangelogBlock(entries)   — hardcodes "## Change Log" + 2 columns
  :441  extractEntries(content)
  :457  bodyStart(content)             — skips YAML frontmatter (keep: real fix)
  :465  findHandWrittenChangelog()     — /^## Change Log[ \t]*\n+/m   ← H2 only
  :479  upsertChangelog(content, row)  — marker → hand-written → before-first-## → EOF
  :4049 exported
```

It is vendored by `bundle_skill.py` into `references/jira-sync.js` under **fourteen** skills
(create-story, create-task, develop-batch, develop-bug, develop-next, develop-story,
develop-task, finalise, qa-story, qa-task, scaffold-tracker-workflow,
sync-jira-{story,epic,task}). Two of those — `develop-batch` and `develop-next` — run
unattended, which is where a silent sync failure is least likely to be noticed.

The GitHub path has **no code at all** — `sync-github-{story,epic,task}` describe the format
in prose and the model reproduces it.

### Target Architecture

```
shared/resources/change-log.js          ← NEW: the engine, tracker-agnostic
shared/resources/document-change-log.md ← NEW: the canonical spec
shared/resources/jira-sync.js           ← delegates + re-exports the old names
```

`jira-sync.js` keeps exporting `upsertChangelog`, `buildChangelogBlock`,
`findHandWrittenChangelog` and `extractEntries` as thin wrappers, so the three
`sync-jira-*` scripts and the publishing-fidelity test keep working untouched. Task.45
rewires the callers; this task must not break them.

### Current vs target section shape

Current (three of them, depending on which file you open):

```markdown
### Change Log                          <!-- epic-template.md, under ## Notes & Updates -->

**[Date]**: [Change description]
- [Detail 1]
```

```markdown
<!-- jira-sync-changelog-start -->
## Change Log

| Date (UTC)       | Change                        |
|------------------|-------------------------------|
| 2026-04-28 09:40 | Initial Jira story created    |
<!-- jira-sync-changelog-end -->
```

Target (one, everywhere):

```markdown
<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                  | Author          |
|------------|---------|----------------------------------------------|-----------------|
| 2026-05-11 | 1.0     | Initial draft                                | create-story    |
| 2026-05-13 | 1.1     | Review passed (9/10) — ready for development | review-story    |
| 2026-08-12 |         | Jira story created (PROJ-42)                 | sync-jira-story |
<!-- change-log-end -->
```

### Important Clarifications

- **`Version` is optional.** Authoring and review skills bump it (`1.0` → `1.1`); machine
  writers (sync, QA, finalise) leave the cell blank. This is what makes one table serve both
  audiences instead of forcing a second machine-only log.
- **PRDs keep their nested heading.** `### Change Log` under §1 stays, because the PRD
  section contract is asserted in `docs/standards/prd-documents.md:65` and the `create-doc`
  engine owns section nesting. The engine matches H2 *or* H3, with optional numbering
  (`### 1.5 Change Log`), rather than forcing PRDs to restructure.
- **Bug documents are out of scope.** `## Status History`
  (`skills/create-bug-report/assets/bug-report-template.md:119`) is already the bug-type
  equivalent and is richer — it carries a Status column. The spec names it as such; it does
  not add a second table to bug reports.
- **Tracker cards still never carry the Change Log.**
  `shared/resources/tracker-card-summary.md:81` is unchanged by this task.
- **A fenced example is not a Change Log.** Every match — marker pair or heading — must be
  ignored when it falls inside a ```` ``` ```` or `~~~` fenced code block. This is the same
  class of guard as `bodyStart()`, which keeps the search out of frontmatter: both answer
  "is this text content, or a picture of content?". It is not optional polish — the
  documents in this very task series contain eleven fenced `Change Log` headings and two
  complete fenced marker blocks, and task.43/44/45 point the engine at them.

---

## 4. Scope

### In Scope

✅ `shared/resources/document-change-log.md` — canonical spec
✅ `shared/resources/change-log.js` — the engine
✅ `shared/resources/tests/change-log.test.mjs` — unit tests
✅ `shared/resources/jira-sync.js` — delegate and re-export, no behaviour change
✅ `docs/reference/configuration.md` — `change-log.*` keys + a `## Document change log` section
✅ `docs/standards/{story,task,epic,prd,bug}-documents.md` — name the section
✅ `AGENTS.md` — TL;DR pointer
✅ `npm run bundle` to redistribute the new shared files

### Out of Scope

❌ Changing any document template — task.43
❌ Changing any `create-*`, `review-*`, `edit-*` skill — task.43 / task.44
❌ Rewiring the six sync skills onto the new engine — task.45
❌ Backfilling Change Logs into existing documents — deliberate; additive and
   going-forward only, matching how sign-off and OKF v0.1 were adopted
❌ Adding a Change Log to bug reports — `## Status History` already serves this

---

## 5. Breaking Changes

### Breaking Change 1: `buildChangelogBlock()` emits four columns, not two

**Before** (`jira-sync.js:428`):

```js
function buildChangelogBlock(entries) {
  return (
    `${CL_START}\n## Change Log\n\n` +
    `| Date (UTC) | Change |\n|------------|--------|\n` +
    entries.join("\n") + `\n${CL_END}`
  );
}
```

**After** (`change-log.js`):

```js
function buildChangeLogBlock(entries, { level = 2, heading = "Change Log" } = {}) {
  return (
    `${CL_START}\n${"#".repeat(level)} ${heading}\n\n` +
    `| Date | Version | Description | Author |\n|------|---------|-------------|--------|\n` +
    entries.join("\n") + `\n${CL_END}`
  );
}
```

**Affected**: `sync-jira-{story,epic,task}/scripts/*.js` (three call sites) and
`shared/resources/tests/jira-sync-publishing-fidelity.test.mjs:172`, whose `ROW` fixture is a
2-column row.

**Migration path**: `migrateLegacyEntries()` widens any 2-column row it reads to four
columns, inferring `Author` from which legacy marker pair wrapped it
(`jira-sync-changelog-*` → `sync-jira-{type}`, `github-sync-changelog-*` →
`sync-github-{type}`) and leaving `Version` blank. The `jira-sync.js` re-export accepts the
old single-string `newEntry` argument and adapts it, so the three sync scripts compile and
pass unchanged in this task. The fidelity test's `ROW` fixture is updated to the 4-column
form in the same commit.

### Breaking Change 2: the insertion fallback no longer targets "before the first `##`"

**Before**: a document with no Change Log got one inserted before its first `##` heading —
i.e. at the top of the body, above the Epic Goal.

**After**: insertion targets a doc-type anchor, falling back to end-of-document:

| Doc type | Anchor (insert before) |
|---|---|
| story | `## Dev Agent Record` |
| task  | `## Progress Tracking` |
| epic  | `## Notes & Updates` |
| prd   | (nested — the engine only ever updates an existing heading) |
| unknown | end of document |

**Affected**: any document currently carrying a top-of-body Change Log written by the old
fallback. There are none in this repo, but consumer repos may have some.

The verification is worth stating precisely, because a naive grep is misleading here.
`grep -rn "^## Change Log" docs/` returns eleven hits and **not one of them is a real
section** — every match is an illustrative example inside a ```` ```markdown ```` fence in
the task.42–45 change-log planning documents (including this one, at the two samples in §3).
Zero documents in `docs/` carry a genuine misplaced block. That same grep output is the
evidence for the fence rule in Breaking Change 3 below.

**Migration path**: the engine finds an existing block by marker or heading before it ever
considers insertion, so a misplaced legacy block is **updated in place**, never duplicated.
Moving it is a manual, one-line edit; the spec documents that and no tooling forces it.

### Breaking Change 3: matches inside fenced code blocks and inline code spans are ignored

**Before**: `findHandWrittenChangelog()` runs `/^## Change Log[ \t]*\n+/m` over the whole
body, and `RE_CL_BLOCK` matches its marker pair anywhere. Neither knows what a code fence is.
The flaw is currently *masked*: only the three `sync-jira-*` scripts call this code, and they
run on documents whose real block is marker-delimited.

**After**: every match — marker pair or heading — is discarded when it falls inside a
```` ``` ```` or `~~~` fenced block.

**Why this task must fix it, rather than inherit it.** This task hands the same engine to six
sync skills, four review skills, and the QA/finalise steps (§2, benefit 4), across every
document type. The documents it will be pointed at include this task series' own, and those
are dense with fenced examples:

| Document | Fenced `Change Log` headings |
|---|---|
| `task.42.change-log-spec-and-engine.md` | 2 (§3, both samples) |
| `task.42.plan.change-log-spec-and-engine.md` | 1 |
| `task.43.change-log-templates-and-creation.md` | 1 |
| `task.43.plan.change-log-templates-and-creation.md` | 5 (one at H3) |
| `task.45.plan.change-log-pipeline-and-sync.md` | 2 (one at H3) |

Headings are the smaller half. **This document contains both marker pairs inside fences**: a
complete legacy `jira-sync-changelog-start/end` block with a 2-column row (the "current"
sample in §3), and a complete `change-log-start/end` block using the markers this task
introduces (the "target" sample). Without the guard:

1. `findChangeLog()` matches the fenced marker block *before* heading matching is reached, so
   `upsertChangeLog()` appends live rows into a code fence in §3.
2. `migrateLegacyEntries()` widens the illustrative legacy row to four columns and invents an
   `Author` for it.
3. Breaking Change 2's own promise — a found block is *updated in place, never duplicated* —
   is what converts this from cosmetic to corrupting: the engine treats the picture as the
   thing.

**And a second exposure, found in implementation** by running the finished engine against this
document. Prose that *names* the markers puts them in backticks — Phase 2's own checklist does:

```markdown
- [x] Create `change-log.js` with `CL_START`/`CL_END` = `<!-- change-log-start -->` /
      `<!-- change-log-end -->` plus a `LEGACY_MARKER_PAIRS` table
```

Unguarded, that pair of inline-code mentions reads as a complete marker block, and
`upsertChangeLog` replaces the whole checklist bullet with a generated table. The guard
therefore covers **inline code spans as well as fences**, scoped per line — a genuine marker
always sits alone on its own line, unbackticked, so prose naming the markers beside a real block
still resolves to the real block.

**Affected**: nothing today (no caller changes in this task). The guard exists so task.43–45
cannot reintroduce the failure.

**Migration path**: none needed — the guard is strictly narrowing. Any document whose real
Change Log is outside a fence and outside inline code behaves identically.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.42.plan.change-log-spec-and-engine.md](task.42.plan.change-log-spec-and-engine.md)

### Phase 1: Write the canonical spec

**Risk**: Low. Documentation only.
**Files**: `shared/resources/document-change-log.md` (new)

- [x] Write the spec modelled on `shared/resources/sign-off.md` — same section order:
      what it is, why it looks like this, the section, rules, who writes what, configuration
- [x] Define the section: `## Change Log`, four columns, `YYYY-MM-DD`, append-only,
      newest at the bottom
- [x] Define heading tolerance: H2 or H3, optional numbering, `Change Log` exactly
- [x] Define the **fence rule**: a marker pair or heading inside a ```` ``` ```` or `~~~`
      block is an example, not a section, and is never matched — the sibling of the
      frontmatter guard, stated in the same breath as it
- [x] Define the marker pair and name the two legacy pairs it supersedes
- [x] State the `updated:` rule — every entry bumps frontmatter `updated` in the same edit
- [x] Write the moment table (which skill writes which row), in the style of the Pipeline
      stages table at `docs/reference/configuration.md:253`
- [x] Document `change-log.enabled` / `change-log.enforcement` and their defaults
- [x] State the two exclusions: bug reports use `## Status History`; tracker cards never
      carry the log (link `tracker-card-summary.md`)

### Phase 2: Extract and generalise the engine

**Risk**: Medium — twelve skills vendor the file this code moves out of.
**Files**: `shared/resources/change-log.js` (new), `shared/resources/jira-sync.js`
**Depends on**: Phase 1 (the spec is the test oracle)

- [x] Create `change-log.js` with `CL_START`/`CL_END` = `<!-- change-log-start -->` /
      `<!-- change-log-end -->` plus a `LEGACY_MARKER_PAIRS` table
- [x] Port `bodyStart()` unchanged — the frontmatter guard is a real fix, pinned by
      `jira-sync-publishing-fidelity.test.mjs:174`
- [x] Add `fencedRanges(content)` — the offsets of every ```` ``` ````/`~~~` fenced block
      (respecting the opening fence's length and info string, so a fence inside a longer
      fence does not close it), and a predicate `insideFence(ranges, index)`. **Every**
      marker and heading match is filtered through it, including inside
      `migrateLegacyEntries()` — filtering only the heading path leaves the marker path,
      which is the one that actually fires on this document, wide open
- [x] `RE_HEADING` = `/^(#{2,3})[ \t]+(?:\d+(?:\.\d+)*[.)]?[ \t]+)?Change Log[ \t]*$/m`,
      capturing the level so it can be preserved on rewrite
- [x] `RE_ENTRY_ROW` accepts `YYYY-MM-DD` and legacy `YYYY-MM-DD HH:MM`
- [x] `fmtEntry({ date, version, description, author })` → 4-column row
- [x] `buildChangeLogBlock(entries, { level })`
- [x] `findChangeLog(content)` → `{ start, end, level }` — marker block first, then heading
- [x] `migrateLegacyEntries(content)` — widen 2-col rows, infer Author from marker pair
- [x] `upsertChangeLog(content, entry, { docType })` with the anchor table from Breaking
      Change 2
- [x] `bumpUpdated(content, date)` — set frontmatter `updated`, used by every caller
- [x] Re-point `jira-sync.js:408-513` at the new module; keep `upsertChangelog`,
      `buildChangelogBlock`, `findHandWrittenChangelog`, `extractEntries` exported with
      their old signatures

### Phase 3: Unit tests

**Risk**: Low.
**Files**: `shared/resources/tests/change-log.test.mjs` (new),
`shared/resources/tests/jira-sync-publishing-fidelity.test.mjs`
**Depends on**: Phase 2

- [x] **The H3 regression**: a document with `### Change Log` under `## Notes & Updates`
      gets its existing block updated, not a second H2 block inserted at the top
- [x] Numbered heading `### 1.5 Change Log` is found and preserved
- [x] Heading level is preserved on rewrite (H3 in → H3 out)
- [x] Legacy `jira-sync-changelog-*` block is migrated in place, rows widened to 4 columns,
      Author inferred, no duplication
- [x] Legacy `github-sync-changelog-*` block, same
- [x] A document with **both** legacy pairs collapses to one block, rows in date order
- [x] Frontmatter containing the literal text `## Change Log` in a block scalar is not
      used as the insertion point (port the existing case at
      `jira-sync-publishing-fidelity.test.mjs:174`)
- [x] **The fence regression**, using this task's own document as the fixture: a doc whose
      only `## Change Log` headings sit inside ```` ```markdown ```` fences gets a new block
      at its anchor — the fenced samples are left byte-identical
- [x] A fenced **legacy marker pair** (`jira-sync-changelog-start/end` wrapping a 2-column
      row, exactly as §3 of this document shows) is not migrated and not appended to
- [x] A fenced **new marker pair** (`change-log-start/end`) is likewise ignored
- [x] A document with a fenced example **and** a real Change Log updates only the real one
- [x] A `~~~`-fenced example is ignored the same as a backtick-fenced one
- [x] Insertion anchors: story → before `## Dev Agent Record`; task → before
      `## Progress Tracking`; epic → before `## Notes & Updates`; unknown → EOF
- [x] Append-only: an existing row is never rewritten or reordered
- [x] `bumpUpdated` sets `updated` and leaves `created` alone
- [x] Update the fidelity test's 2-column `ROW` fixture to the 4-column form

### Phase 4: Standards, configuration, and AGENTS.md

**Risk**: Low. Documentation only.
**Files**: `docs/reference/configuration.md`, `docs/standards/{story,task,epic,prd,bug}-documents.md`,
`AGENTS.md`
**Depends on**: Phase 1

- [x] `docs/reference/configuration.md` — add `change-log.enabled` and
      `change-log.enforcement` rows to the key table, and a `## Document change log`
      section next to the existing `## Stakeholder sign-off` at `:176`. (Note the file
      carries two adjacent sign-off headings — `## Stakeholder sign-off` at `:176` and
      `## Stakeholder Sign-off` at `:181`. Insert after the pair; do not try to tidy the
      duplicate, which is pre-existing and out of scope.)
- [x] `docs/standards/story-documents.md` — add a **Change Log** row to the Section
      ownership table at `:79` (currently absent; the section is named only in passing at `:91`)
- [x] `docs/standards/task-documents.md` — add Change Log to **Unnumbered tail sections**
      (`:94`), stating explicitly that the 11-section contract is unaffected
- [x] `docs/standards/epic-documents.md` — add a **Required body sections** section; this
      file has none today
- [x] `docs/standards/prd-documents.md` — name Change Log in both section lists (`:65`, `:78`)
- [x] `docs/standards/bug-documents.md` — state that `## Status History` is the bug-type
      equivalent and that bug reports carry no Change Log
- [x] `AGENTS.md` — TL;DR pointer in the style of the Status Lifecycle and OKF entries

### Phase 5: Bundle and verify

**Risk**: Low.
**Depends on**: Phases 1–4

- [x] `npm run bundle` — distributes `document-change-log.md` and `change-log.js` into the
      `references/` of every skill that links them
- [x] Re-run `npm run bundle`; `git diff --stat` must be empty (idempotence)
- [x] `npm test` green
- [x] Confirm no edit was made directly to a skill's `references/` copy

---

## 7. Files Summary

### Files to Create

1. ✅ `shared/resources/document-change-log.md` — canonical spec
2. ✅ `shared/resources/change-log.js` — the engine
3. ✅ `shared/resources/tests/change-log.test.mjs` — unit tests

### Files to Modify (Core Implementation)

4. ✅ `shared/resources/jira-sync.js` — lines 408-513 delegate to the new module; old names re-exported

### Files to Modify (Tests)

5. ✅ `shared/resources/tests/jira-sync-publishing-fidelity.test.mjs` — 4-column `ROW` fixture,
   plus two "C" cases rewritten to assert the EOF fallback instead of the removed
   before-first-`##` fallback
6. ✅ `skills/sync-jira-story/tests/sync-jira-story.test.js` — same fallback assertion (1 case)
7. ✅ `skills/sync-jira-task/tests/sync-jira-task.test.js` — same fallback assertion (1 case)

> Items 6–7 were **not** in the original plan. They pin the same removed behaviour as the
> fidelity cases; see the Code Quality criterion in §9 for the full account.

### Files to Modify (Documentation)

8. ✅ `docs/reference/configuration.md` — `change-log.*` keys + `## Document change log` section
9. ✅ `docs/standards/story-documents.md` — Section-ownership row
10. ✅ `docs/standards/task-documents.md` — unnumbered tail section
11. ✅ `docs/standards/epic-documents.md` — new `## Required body sections`
12. ✅ `docs/standards/prd-documents.md` — both section lists + nesting note
13. ✅ `docs/standards/bug-documents.md` — Status History equivalence note
14. ✅ `AGENTS.md` — TL;DR pointer
15. ✅ `CHANGELOG.md` — Unreleased entry

### Files Regenerated by `npm run bundle` (never hand-edited)

16. ✅ `skills/*/references/jira-sync.js` — 14 vendored copies re-bundled
17. ✅ `skills/*/references/change-log.js` — 14 NEW vendored copies, distributed
    transitively via `bundle_skill.py`'s `JS_SIBLING_RE` (the plan calls this constant
    `REQUIRE_RE`; the real names are `JS_SHARED_RE` / `JS_SIBLING_RE`)

### Files to Delete

None.

> **Note on `references/` copies**: `npm run bundle` regenerates them. Never edit a
> `skills/*/references/*` file directly — the next bundle silently reverts it.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: every exported function in `change-log.js`
- **Location**: `shared/resources/tests/change-log.test.mjs`
- **Command**: `node --test shared/resources/tests/change-log.test.mjs`
- **Picked up automatically** by the existing `shared/resources/tests/*.test.mjs` glob in
  `package.json:24` — no glob edit needed. (A new *per-skill* `tests/` directory would need
  one; that omission has silently orphaned whole suites before.)
- **Target**: every branch of `upsertChangeLog` — marker hit, heading hit at H2, heading hit
  at H3, numbered heading, each anchor, EOF fallback, both legacy migrations, and every
  fence case (fenced heading, fenced legacy marker pair, fenced new marker pair, `~~~`
  fence, fenced-plus-real coexistence)

### Integration Tests

- **Scope**: `jira-sync.js` still behaves identically through its re-exports
- **Actions**: run the three existing Jira sync suites unchanged —
  `jira-sync-sections.test.mjs`, `jira-sync-card-summary.test.mjs`,
  `jira-sync-publishing-fidelity.test.mjs`
- A green run with only the `ROW` fixture edited is the evidence that the extraction was
  behaviour-preserving

### Contract Tests

- **Scope**: bundling
- **Actions**: `npm run bundle` twice; second run produces an empty `git diff --stat`.
  `tests/bundle-mjs.test.js` already covers the mechanism; confirm the two new shared files
  are picked up transitively where they are linked
- **Scope**: doc links — `tests/executable-instructions.test.js:189` requires every
  `docs/{standards,reference,...}` reference in skill prose to resolve

### Performance Tests

Not applicable — this is a markdown-manipulation module operating on single documents. No
baseline needed.

### Consumer Tests

- **Scope**: the fourteen skills that vendor `jira-sync.js`
- **Risk area**: a skill whose bundled copy goes stale relative to the shared source.
  `tests/bundle-mjs.test.js` carries a drift guard for exactly this; confirm it still passes

---

## 9. Success Criteria

### Functional

- [x] `shared/resources/document-change-log.md` exists and defines the section, the four
      columns, the heading tolerance, the marker pair, the `updated:` rule, the moment table,
      and the two exclusions
- [x] `shared/resources/change-log.js` exists and exports `upsertChangeLog`,
      `findChangeLog`, `buildChangeLogBlock`, `fmtEntry`, `migrateLegacyEntries`, `bumpUpdated`
- [x] A document with `### Change Log` under `## Notes & Updates` gets that block updated —
      no second block, nothing inserted at the top of the body
- [x] Both legacy marker pairs migrate in place, widened to four columns, with no duplication
- [x] Running `upsertChangeLog` against this task's own document leaves both fenced samples
      in §3 byte-identical and writes the new block at the task anchor
- [x] `jira-sync.js` still exports `upsertChangelog`, `buildChangelogBlock`,
      `findHandWrittenChangelog`, `extractEntries` with their existing signatures

### Performance

- [x] No measurable change to sync runtime — the module does the same string work in a
      different file. No baseline required; assert only that no test slows by more than a
      second

### Code Quality

- [x] `npm test` passes — **1134/1134** (baseline was 1104; +30 new engine cases)
- [x] ~~no pre-existing test modified except the `ROW` fixture~~ — **not met, and could not
      be.** Four pre-existing tests beyond the `ROW` fixture assert behaviour that Breaking
      Changes 1–2 deliberately remove, so they had to change with it. This criterion was
      written without noticing them. What was modified, and why:
      - `jira-sync-publishing-fidelity.test.mjs` ×2 and `sync-jira-{story,task}.test.js` ×1 each
        asserted *"the changelog precedes the first `##` body heading"* — that **is** Breaking
        Change 2's removed fallback, i.e. the defect. Rewritten to assert the EOF fallback.
      - The same suites assert `out.includes(lib.CL_START)`. `CL_START` now names the unified
        marker (Breaking Change 1), which is the honest value: nothing writes the old string
        any more. The legacy pair stays reachable as `LEGACY_MARKER_PAIRS`.

      No test was weakened to pass. Each still asserts the same property, against the
      documented new behaviour. The behaviour-preservation oracle the criterion was reaching
      for is intact: **`jira-sync-sections` and `jira-sync-card-summary` pass completely
      untouched**, and every remaining fidelity assertion (frontmatter capture, ADF rendering,
      quote style) is unchanged.
- [x] `node --test shared/resources/tests/change-log.test.mjs` passes
- [x] `npm run bundle` is idempotent — second run yields an empty diff
- [x] No file under any `skills/*/references/` edited by hand

### Migration

- [x] `docs/reference/configuration.md` documents both `change-log.*` keys with defaults
- [x] All five `docs/standards/*-documents.md` name the section (or, for bugs, name the
      equivalent)
- [x] `AGENTS.md` carries the TL;DR pointer
- [x] `CHANGELOG.md` updated

---

## 10. Risk Assessment

### High Risk Areas

1. **Extracting code out of a file twelve skills vendor**
   - **Risk**: a bundled `references/jira-sync.js` copy goes stale or a require path breaks,
     and the failure is silent — the sync reports ✅ and publishes nothing. This exact class
     of silent failure is on record in `CHANGELOG.md:377`, where a heading-contract mismatch
     made every conforming task card publish an empty body with no warning.
   - **Probability**: Medium
   - **Impact**: Critical
   - **Mitigation**: `jira-sync.js` keeps the old exports as wrappers, so no caller changes
     in this task. `npm run bundle` runs in Phase 5 and the drift guard in
     `tests/bundle-mjs.test.js` must pass. The three existing Jira suites must stay green
     with only the `ROW` fixture edited.
   - **Rollback**: revert the delegation in `jira-sync.js` and keep `change-log.js` unused.

### Medium Risk Areas

2. **The 4-column row breaks the strict entry regex**
   - **Risk**: `RE_ENTRY_ROW` is deliberately strict so unrelated body tables cannot pollute
     the log. Widening the row risks either over-matching (a Files Summary table gets eaten)
     or under-matching (existing rows silently dropped on rewrite).
   - **Probability**: Medium
   - **Impact**: High — under-matching loses history, which is the thing this whole effort
     is meant to preserve
   - **Mitigation**: anchor on a leading `| YYYY-MM-DD` date cell, keep the legacy
     `HH:MM` variant, and test both an unrelated 4-column table and a real legacy row.
   - **Rollback**: n/a — caught by unit tests before merge.

3. **A fenced example is mistaken for a real Change Log**
   - **Risk**: the engine matches a marker pair or heading inside a ```` ``` ```` block and
     writes live rows into a documentation sample — or "migrates" one. The documents most
     exposed are this task series' own (eleven fenced headings, two complete fenced marker
     blocks), which are exactly what task.43–45 operate on.
   - **Probability**: High without the guard — this document would trip it on the first run
   - **Impact**: High — silent corruption of a source document, and the corrupted text is a
     spec that other work is read from
   - **Mitigation**: `fencedRanges()` + `insideFence()` filter every match, marker and
     heading alike (Phase 2); six fence cases in the unit tests including this document as a
     fixture (Phase 3).
   - **Rollback**: n/a — caught by unit tests before merge.

4. **PRD nested heading vs top-level heading**
   - **Risk**: the H2/H3 tolerance makes the engine match a `### Change Log` that is a
     genuine subsection of something else.
   - **Probability**: Low
   - **Impact**: Medium
   - **Mitigation**: `Change Log` must be the entire heading text after optional numbering;
     `bodyStart()` keeps the search out of frontmatter.

### Low Risk Areas

5. **Standards documents drift from the spec**
   - **Risk**: six documents restate the rule and one of them goes stale.
   - **Probability**: Medium
   - **Impact**: Low
   - **Mitigation**: each standards file links `document-change-log.md` rather than
     restating the format; `tests/executable-instructions.test.js` fails on a broken link.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- `npm test` red on any pre-existing Jira sync suite
- A live sync writes a Change Log into the wrong place or duplicates a block
- `npm run bundle` non-idempotent

**Steps**:
1. `git revert` the merge commit.
2. `npm run bundle` to restore the previous `references/` copies.
3. `npm test` to confirm green.

**Validation**: `jira-sync.js` exports match the pre-change set; the three Jira suites pass.

### Partial Rollback (1-2 hours)

**When to use**: the spec and standards are fine but the engine misbehaves.

**Steps**: revert Phases 2, 3 and 5 only. `document-change-log.md` and the standards edits
are inert documentation and can stay — they describe the target state and block nothing.
Task.43 can proceed against the spec alone.

### Forward Fix (< 4 hours)

**When to use**: a single engine branch is wrong (one anchor, one migration case) with the
rest sound.

**Approach**: add the failing document as a fixture in `change-log.test.mjs`, fix the branch,
re-bundle. Do not revert — the extraction itself is not the defect.

### Rollback Triggers

**Critical (revert)**: any pre-existing test red; any silent-publish regression; a sync that
loses existing Change Log rows.
**Non-critical (fix forward)**: a wrong insertion anchor, a missed legacy migration case, a
standards document that reads badly.

---

## Progress Tracking

### Phase 1: Write the canonical spec
- [x] Complete

### Phase 2: Extract and generalise the engine
- [x] Complete

### Phase 3: Unit tests
- [x] Complete

### Phase 4: Standards, configuration, and AGENTS.md
- [x] Complete

### Phase 5: Bundle and verify
- [x] Complete

---

## References

- [`shared/resources/sign-off.md`](../../../shared/resources/sign-off.md) — the structural
  precedent: one canonical spec, config-gated, seeded by `create-*`, graded by `review-*`
- [`shared/resources/tracker-card-summary.md`](../../../shared/resources/tracker-card-summary.md) —
  the more recent precedent (commit `37bcf3f`), and the statement that cards never carry the log
- [`shared/resources/open-knowledge-format.md`](../../../shared/resources/open-knowledge-format.md) —
  `updated` ≡ OKF `timestamp`
- [`shared/resources/jira-sync.js`](../../../shared/resources/jira-sync.js) lines 408-513 —
  the code being extracted
- [`docs/reference/configuration.md`](../../reference/configuration.md) — config schema
- [`docs/standards/`](../../standards/) — the five document standards
- Follow-on tasks: task.43 (templates + creation), task.44 (review + edit), task.45
  (pipeline + sync)

---

## QA Testing Results

**QA Status**: FAIL
**QA Engineer**: QA Engineer
**Testing Date**: 2026-08-12
**Quality Score**: 60/100
**Gate Decision**: FAIL

### QA Report
- **Full Report**: [task.42.qa.1.change-log-spec-and-engine.md](./task.42.qa.1.change-log-spec-and-engine.md)
- **Gate File**: [task.42.gate.1.change-log-spec-and-engine.yml](./task.42.gate.1.change-log-spec-and-engine.yml)

### Test Coverage Summary
- **Tests Executed**: 1137 (all passing)
- **Phases Verified**: 5/5 complete; 2 with concerns
- **Critical Issues**: 2 HIGH
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: FAIL, Maintainability: PASS

### Key Findings

Two high-confidence correctness bugs, both in the fence guard this task introduced:

- **[TASK-42-BUG-1](./task.42.bug.1.heading-block-end-scan-ignores-fences.md)** — the guard is applied where a Change Log block *starts* but not where it *ends*. A fenced `##` inside a Change Log section terminates the block early, consuming the opening fence and stranding a row outside the log.
- **[TASK-42-BUG-2](./task.42.bug.2.dual-legacy-collapse-is-order-dependent.md)** — dual-legacy collapse depends on document order. With the github block before the jira block, both survive — failing the "no duplication" Success Criterion. The existing test covers only the working ordering.

The architecture, extraction, spec and documentation are sound; both fixes are localised.

---

## Implementation Record

**Completed**: 2026-08-12 · **Status**: Ready for Review

### Summary

All five phases complete. The spec, the engine, 33 unit tests, the standards/config/AGENTS.md
updates, and the bundle. No skill behaviour changed — `jira-sync.js` keeps every old export as
a wrapper, and the three `sync-jira-*` scripts were not touched.

### Testing results

| Check | Result |
|---|---|
| `npm test` | **1137 passing, 0 failing** (baseline 1104, +33 new) |
| `node --test shared/resources/tests/change-log.test.mjs` | 33/33 |
| `jira-sync-{sections,card-summary}` suites | pass, **completely untouched** |
| `npm run bundle` twice | second `git diff --stat` empty (idempotent) |
| Card preflight | exit 0, all three blocks resolve |
| Files hand-edited under `skills/*/references/` | **none** |

### Two defects found during implementation, by the tests

1. **Block glued to the following section.** The rewrite emitted
   `<!-- change-log-end -->### Sibling` with no separator. Caught by the H3 test asserting the
   sibling subsection survives.
2. **`parseLegacyRow` mis-read an already-canonical row.** It always took cell 1 as the
   description; on a 4-column row that is the *version* cell, so the shim silently emitted a
   row with an empty description and dropped the caller's text. Caught by the fidelity suite
   the moment its `ROW` fixture went to four columns. It now branches on cell count.

### The inline-code guard — found by pointing the engine at this document

The fence guard (Breaking Change 3) was specified from review. Running the finished engine
against this very file then surfaced a second exposure the review had not: Phase 2's checklist
names both markers in adjacent inline code spans, and `findChangeLog` matched them as a real
marker block — `upsertChangeLog` would have replaced the whole bullet with a generated table.
`protectedRanges()` now covers fenced blocks **and** inline code spans, scoped per line so a
genuine marker (always alone on its own line, unbackticked) still resolves.

The engine is now clean against its own specification: `findChangeLog` on this document returns
`null`, both §3 samples stay byte-identical, and a new block lands at `## Progress Tracking`.

### Deviations from plan

- **Four pre-existing tests changed, not one.** The plan and §9 expected only the `ROW`
  fixture. Four more assert behaviour that Breaking Changes 1–2 deliberately remove. Full
  account in §9 → Code Quality. No test was weakened.
- **`CL_START` / `CL_END` now name the unified markers.** The plan kept them as the legacy
  jira strings. Those names mean "the markers the block is wrapped in", and nothing writes the
  old strings any more, so exporting them under those names would be misleading.
  `LEGACY_MARKER_PAIRS` is exported alongside.
- **`escapeRe` stayed in `jira-sync.js`.** It lived inside the extracted region but is not
  changelog-specific — the section extractor and frontmatter rewriter use it, and it is
  exported.
- **The plan's `REQUIRE_RE` does not exist.** The bundler's real constants are `JS_SHARED_RE`
  and `JS_SIBLING_RE`; the latter follows sibling requires transitively, exactly as the plan
  assumed, so `change-log.js` reached all 14 vendored `references/` directories automatically.

---

## Notes

### Important Reminders

- Edit `shared/resources/` only. A fix applied to a bundled `skills/*/references/` copy is
  silently reverted by the next `npm run bundle`.
- This task must not change any skill's behaviour. If a `review-*` or `sync-*` skill starts
  writing differently, scope has leaked into task.44 or task.45.
- No backfill. Existing documents are left alone.

### Known Issues

- `skills/documentation-standards-validator/references/epic-template.md` has drifted 3 lines
  from `docs/templates/epic-template.md`. Not this task's problem — task.43 touches both and
  byte-locks the pair.
- `shared/resources/README.md` names `package_skill.py` as the bundler; the bundler is
  `bundle_skill.py`. Pre-existing; out of scope.

### Future Improvements

- A `--check-change-log` preflight, mirroring `--check-card`
  (`tracker-card-summary.md:132`), so `review-*` can validate the section without an agent
  reading it. Worth considering once task.44 defines what "stale" means.

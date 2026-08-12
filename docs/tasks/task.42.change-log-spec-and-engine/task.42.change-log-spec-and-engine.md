---
id: task.42
title: "Canonical Change Log spec and shared engine"
type: task
description: "Establish one canonical Change Log section format for PRD/epic/story/task documents, backed by a shared engine extracted from jira-sync.js, and record it in the standards."
tags: [change-log, documentation, shared-resources]
category: infrastructure
status: planned
priority: High
created: 2026-08-12
updated: 2026-08-12
assignee:
estimated_effort_hours: 16
github_issue: 201
---

# [Task 42] Canonical Change Log spec and shared engine

**Status:** Planned

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

It is vendored by `bundle_skill.py` into `references/jira-sync.js` under twelve skills
(create-story, create-task, develop-bug, develop-story, develop-task, finalise, qa-story,
qa-task, scaffold-tracker-workflow, sync-jira-{story,epic,task}).

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
fallback. There are none in this repo (verified: `grep -rn "^## Change Log"` over `docs/`
returns only correctly-placed story sections), but consumer repos may have some.

**Migration path**: the engine finds an existing block by marker or heading before it ever
considers insertion, so a misplaced legacy block is **updated in place**, never duplicated.
Moving it is a manual, one-line edit; the spec documents that and no tooling forces it.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.42.plan.change-log-spec-and-engine.md](task.42.plan.change-log-spec-and-engine.md)

### Phase 1: Write the canonical spec

**Risk**: Low. Documentation only.
**Files**: `shared/resources/document-change-log.md` (new)

- [ ] Write the spec modelled on `shared/resources/sign-off.md` — same section order:
      what it is, why it looks like this, the section, rules, who writes what, configuration
- [ ] Define the section: `## Change Log`, four columns, `YYYY-MM-DD`, append-only,
      newest at the bottom
- [ ] Define heading tolerance: H2 or H3, optional numbering, `Change Log` exactly
- [ ] Define the marker pair and name the two legacy pairs it supersedes
- [ ] State the `updated:` rule — every entry bumps frontmatter `updated` in the same edit
- [ ] Write the moment table (which skill writes which row), in the style of the Pipeline
      stages table at `docs/reference/configuration.md:237`
- [ ] Document `change-log.enabled` / `change-log.enforcement` and their defaults
- [ ] State the two exclusions: bug reports use `## Status History`; tracker cards never
      carry the log (link `tracker-card-summary.md`)

### Phase 2: Extract and generalise the engine

**Risk**: Medium — twelve skills vendor the file this code moves out of.
**Files**: `shared/resources/change-log.js` (new), `shared/resources/jira-sync.js`
**Depends on**: Phase 1 (the spec is the test oracle)

- [ ] Create `change-log.js` with `CL_START`/`CL_END` = `<!-- change-log-start -->` /
      `<!-- change-log-end -->` plus a `LEGACY_MARKER_PAIRS` table
- [ ] Port `bodyStart()` unchanged — the frontmatter guard is a real fix, pinned by
      `jira-sync-publishing-fidelity.test.mjs:174`
- [ ] `RE_HEADING` = `/^(#{2,3})[ \t]+(?:\d+(?:\.\d+)*[.)]?[ \t]+)?Change Log[ \t]*$/m`,
      capturing the level so it can be preserved on rewrite
- [ ] `RE_ENTRY_ROW` accepts `YYYY-MM-DD` and legacy `YYYY-MM-DD HH:MM`
- [ ] `fmtEntry({ date, version, description, author })` → 4-column row
- [ ] `buildChangeLogBlock(entries, { level })`
- [ ] `findChangeLog(content)` → `{ start, end, level }` — marker block first, then heading
- [ ] `migrateLegacyEntries(content)` — widen 2-col rows, infer Author from marker pair
- [ ] `upsertChangeLog(content, entry, { docType })` with the anchor table from Breaking
      Change 2
- [ ] `bumpUpdated(content, date)` — set frontmatter `updated`, used by every caller
- [ ] Re-point `jira-sync.js:408-513` at the new module; keep `upsertChangelog`,
      `buildChangelogBlock`, `findHandWrittenChangelog`, `extractEntries` exported with
      their old signatures

### Phase 3: Unit tests

**Risk**: Low.
**Files**: `shared/resources/tests/change-log.test.mjs` (new),
`shared/resources/tests/jira-sync-publishing-fidelity.test.mjs`
**Depends on**: Phase 2

- [ ] **The H3 regression**: a document with `### Change Log` under `## Notes & Updates`
      gets its existing block updated, not a second H2 block inserted at the top
- [ ] Numbered heading `### 1.5 Change Log` is found and preserved
- [ ] Heading level is preserved on rewrite (H3 in → H3 out)
- [ ] Legacy `jira-sync-changelog-*` block is migrated in place, rows widened to 4 columns,
      Author inferred, no duplication
- [ ] Legacy `github-sync-changelog-*` block, same
- [ ] A document with **both** legacy pairs collapses to one block, rows in date order
- [ ] Frontmatter containing the literal text `## Change Log` in a block scalar is not
      used as the insertion point (port the existing case at
      `jira-sync-publishing-fidelity.test.mjs:174`)
- [ ] Insertion anchors: story → before `## Dev Agent Record`; task → before
      `## Progress Tracking`; epic → before `## Notes & Updates`; unknown → EOF
- [ ] Append-only: an existing row is never rewritten or reordered
- [ ] `bumpUpdated` sets `updated` and leaves `created` alone
- [ ] Update the fidelity test's 2-column `ROW` fixture to the 4-column form

### Phase 4: Standards, configuration, and AGENTS.md

**Risk**: Low. Documentation only.
**Files**: `docs/reference/configuration.md`, `docs/standards/{story,task,epic,prd,bug}-documents.md`,
`AGENTS.md`
**Depends on**: Phase 1

- [ ] `docs/reference/configuration.md` — add `change-log.enabled` and
      `change-log.enforcement` rows to the key table, and a `## Document change log`
      section next to the existing `## Stakeholder sign-off` at `:160`
- [ ] `docs/standards/story-documents.md` — add a **Change Log** row to the Section
      ownership table at `:79` (currently absent; the section is named only in passing at `:91`)
- [ ] `docs/standards/task-documents.md` — add Change Log to **Unnumbered tail sections**
      (`:94`), stating explicitly that the 11-section contract is unaffected
- [ ] `docs/standards/epic-documents.md` — add a **Required body sections** section; this
      file has none today
- [ ] `docs/standards/prd-documents.md` — name Change Log in both section lists (`:65`, `:78`)
- [ ] `docs/standards/bug-documents.md` — state that `## Status History` is the bug-type
      equivalent and that bug reports carry no Change Log
- [ ] `AGENTS.md` — TL;DR pointer in the style of the Status Lifecycle and OKF entries

### Phase 5: Bundle and verify

**Risk**: Low.
**Depends on**: Phases 1–4

- [ ] `npm run bundle` — distributes `document-change-log.md` and `change-log.js` into the
      `references/` of every skill that links them
- [ ] Re-run `npm run bundle`; `git diff --stat` must be empty (idempotence)
- [ ] `npm test` green
- [ ] Confirm no edit was made directly to a skill's `references/` copy

---

## 7. Files Summary

### Files to Create

1. ✅ `shared/resources/document-change-log.md` — canonical spec
2. ✅ `shared/resources/change-log.js` — the engine
3. ✅ `shared/resources/tests/change-log.test.mjs` — unit tests

### Files to Modify (Core Implementation)

4. ✅ `shared/resources/jira-sync.js` — lines 408-513 delegate to the new module; old names re-exported

### Files to Modify (Tests)

5. ✅ `shared/resources/tests/jira-sync-publishing-fidelity.test.mjs` — 4-column `ROW` fixture

### Files to Modify (Documentation)

6. ✅ `docs/reference/configuration.md` — `change-log.*` keys + section
7. ✅ `docs/standards/story-documents.md` — Section-ownership row
8. ✅ `docs/standards/task-documents.md` — unnumbered tail section
9. ✅ `docs/standards/epic-documents.md` — new Required body sections
10. ✅ `docs/standards/prd-documents.md` — both section lists
11. ✅ `docs/standards/bug-documents.md` — Status History equivalence note
12. ✅ `AGENTS.md` — TL;DR pointer

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
  at H3, numbered heading, each anchor, EOF fallback, both legacy migrations

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

- **Scope**: the twelve skills that vendor `jira-sync.js`
- **Risk area**: a skill whose bundled copy goes stale relative to the shared source.
  `tests/bundle-mjs.test.js` carries a drift guard for exactly this; confirm it still passes

---

## 9. Success Criteria

### Functional

- [ ] `shared/resources/document-change-log.md` exists and defines the section, the four
      columns, the heading tolerance, the marker pair, the `updated:` rule, the moment table,
      and the two exclusions
- [ ] `shared/resources/change-log.js` exists and exports `upsertChangeLog`,
      `findChangeLog`, `buildChangeLogBlock`, `fmtEntry`, `migrateLegacyEntries`, `bumpUpdated`
- [ ] A document with `### Change Log` under `## Notes & Updates` gets that block updated —
      no second block, nothing inserted at the top of the body
- [ ] Both legacy marker pairs migrate in place, widened to four columns, with no duplication
- [ ] `jira-sync.js` still exports `upsertChangelog`, `buildChangelogBlock`,
      `findHandWrittenChangelog`, `extractEntries` with their existing signatures

### Performance

- [ ] No measurable change to sync runtime — the module does the same string work in a
      different file. No baseline required; assert only that no test slows by more than a
      second

### Code Quality

- [ ] `npm test` passes with no pre-existing test modified except the `ROW` fixture
- [ ] `node --test shared/resources/tests/change-log.test.mjs` passes
- [ ] `npm run bundle` is idempotent — second run yields an empty diff
- [ ] No file under any `skills/*/references/` edited by hand

### Migration

- [ ] `docs/reference/configuration.md` documents both `change-log.*` keys with defaults
- [ ] All five `docs/standards/*-documents.md` name the section (or, for bugs, name the
      equivalent)
- [ ] `AGENTS.md` carries the TL;DR pointer
- [ ] `CHANGELOG.md` updated

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

3. **PRD nested heading vs top-level heading**
   - **Risk**: the H2/H3 tolerance makes the engine match a `### Change Log` that is a
     genuine subsection of something else.
   - **Probability**: Low
   - **Impact**: Medium
   - **Mitigation**: `Change Log` must be the entire heading text after optional numbering;
     `bodyStart()` keeps the search out of frontmatter.

### Low Risk Areas

4. **Standards documents drift from the spec**
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
- [ ] Not started

### Phase 2: Extract and generalise the engine
- [ ] Not started

### Phase 3: Unit tests
- [ ] Not started

### Phase 4: Standards, configuration, and AGENTS.md
- [ ] Not started

### Phase 5: Bundle and verify
- [ ] Not started

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

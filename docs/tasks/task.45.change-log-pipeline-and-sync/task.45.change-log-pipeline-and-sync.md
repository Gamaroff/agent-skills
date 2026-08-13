---
id: task.45
title: "Pipeline, QA, finalise, and tracker sync write the Change Log"
type: task
description: "Wire the develop/QA/finalise pipeline steps and the six tracker-sync skills onto the canonical Change Log, unifying the marker pairs and narrowing sync rows to milestones."
tags: [change-log, pipeline, tracker-sync]
category: refactoring
status: accepted
priority: High
created: 2026-08-12
updated: 2026-08-13
completed_date: 2026-08-13
pr_number: 213
assignee:
estimated_effort_hours: 16
github_issue: 204
---

# [Task 45] Pipeline, QA, finalise, and tracker sync write the Change Log

**Status:** Accepted

**Review**: ✅ All review recommendations from `task.45.review.1.change-log-pipeline-and-sync.md` implemented 2026-08-13

**GitHub Issue:** [#204](https://github.com/Gamaroff/agent-skills/issues/204)

---

## 1. Overview

The development pipeline is where a document changes most and records least. `develop` is
told to update a Change Log that, for tasks, has no section to write into. `qa-story`,
`qa-task` and `finalise` write whole new sections — QA Results, Definition of Done — and set
`status: accepted` without a single row. Meanwhile the six sync skills write a row on *every*
body-hash refresh, using two incompatible marker pairs, in a format no other writer uses.

This task closes both ends: the pipeline starts logging milestones, and the sync stops
logging noise.

**Scope**: Three shared pipeline step documents, `develop`, three QA skills, `finalise`, six
sync skills, three sync scripts, and three `ensure-*-jira-issue` sub-routines.

**Key deliverables**:

1. Implementation-complete, QA-verdict and accepted rows appear in the document.
2. The six sync skills share one engine and one marker pair.
3. Sync rows narrow to issue-created and status-transition only.

**Expected outcome**: A finished story's Change Log reads as its life story — drafted,
reviewed, tracked, implemented, QA'd, accepted — in eight rows, not eighty.

---

## 2. Motivation

### Current Problems

1. **`develop` writes into a section that does not exist.** `skills/develop/SKILL.md:719`:
   "Update task change log with date and summary of changes". Until task.43 there is no task
   Change Log. The story path (`:582`) is fine — `Change Log` is on the authorised-sections
   list at `:509` — but the task path has nowhere to write, which is why real task documents
   carry three different improvised shapes.

2. **The pipeline step documents say nothing.** `develop-story` and `develop-task` delegate
   their steps to `shared/resources/develop-pipeline-step-*.md`. Grepping all nine for
   "change log" returns nothing. The orchestrator's own record of the run goes to the
   implementation report, not the document.

3. **QA writes sections but no rows.** `qa-story` (`:1273-1330`) writes
   `## QA Testing Results` and `## QA Completion Summary` and sets frontmatter `status`;
   `qa-task` Step 12 (`:720`) does the same for tasks. Neither logs. `qa-fix` (`:559`) does —
   so a fix is recorded but the verdict that demanded it is not.

4. **`finalise` is the largest silent mutation in the repo.** Step 7 (`:756`) sets
   `status: accepted`, `completed_date` and `pr_number`, and appends an entire
   `## Definition of Done - PASSED ✅` section. Step 8 (`:1200`, append instruction at `:1249`)
   appends `## Definition of Done - Gaps Identified`. Neither writes a Change Log row. The single
   most important event in a document's life — acceptance — leaves no trace in its history.

5. **Sync writes a row on every update.** `sync-jira-story/SKILL.md:164` and its five
   siblings append `| 2026-04-28 11:05 | Updated: summary, description |` on each sync. A
   document synced through a full pipeline run accumulates a row per step. This is the churn
   that got the Change Log removed from tracker cards entirely (`37bcf3f`: "a third copy grew
   on every sync and told a reader nothing new") — the same argument applies to the log itself.

6. **Two marker pairs.** `<!-- jira-sync-changelog-* -->` and `<!-- github-sync-changelog-* -->`.
   A document synced to both grows two blocks.

7. **Only the Jira path has code.** `sync-jira-*` call `upsertChangelog()` from the shared
   library; `sync-github-*` describe the format in prose and the model re-implements it three
   times. The GitHub format spec is duplicated at `sync-github-story:213`,
   `sync-github-epic:216` and `sync-github-task:180`.

### Benefits

1. The document's history finally covers the phase in which it changes most.
2. Acceptance is recorded where a stakeholder will look for it.
3. One marker pair, so a dual-synced document has one log.
4. One engine for both platforms, replacing three prose reimplementations.
5. A readable log: milestones, not a sync journal.

---

## 3. Technical Background

### Current Architecture

```
develop-story / develop-task
  └── shared/resources/develop-pipeline-step-*.md   ← no Change Log anywhere
        step-2  → review-*      (task.44 makes these write)
        step-3  → develop       ← story writes, task has nowhere to write
        step-5-6→ qa-* / qa-fix ← qa-fix writes; qa-story / qa-task do not
        step-7  → finalise      ← writes nothing

sync-jira-{story,epic,task}/scripts/*.js
  └── lib.upsertChangelog(content, row)   ← 2-col, jira markers, every update

sync-github-{story,epic,task}/SKILL.md
  └── prose only                          ← 2-col, github markers, every update
```

### Target Architecture

```
shared/resources/change-log.js            (task.42)
  ├── develop-pipeline-step-3-develop-loop.md   → implementation-complete row
  ├── develop-pipeline-step-5-6-qa-loop.md      → QA verdict row
  ├── develop-pipeline-step-7-finalise.md       → accepted / gaps row
  └── all six sync skills                       → issue-created + status-transition only
```

A completed story's log, end to end:

```markdown
| Date       | Version | Description                                  | Author          |
|------------|---------|----------------------------------------------|-----------------|
| 2026-05-11 | 1.0     | Initial draft                                | create-story    |
| 2026-05-13 | 1.1     | Review passed (9/10) — ready for development | review-story    |
| 2026-05-13 |         | Jira story created (PROJ-42)                 | sync-jira-story |
| 2026-05-13 |         | Status → in-progress                         | develop-story   |
| 2026-05-14 |         | Implemented — 12 files, 34 tests             | develop         |
| 2026-05-14 |         | QA gate CONCERNS (6/10) — 2 findings         | qa-story        |
| 2026-05-14 |         | QA findings fixed — gate PASS (9/10)         | qa-fix          |
| 2026-05-15 | 1.2     | DoD passed — accepted (PR #204)              | finalise        |
```

Eight rows. Today the same run produces those events scattered across the implementation
report, the QA report, the DoD file and the tracker — plus roughly a dozen
`Updated: summary, description` rows in the document.

### What the sync still logs, and what it stops logging

| Sync event | Today | After |
|---|---|---|
| Issue created | row | **row** — `Jira story created (PROJ-42)` |
| Status transition driven from frontmatter | row | **row** — `Status → ready-for-review` |
| Body/summary update (hash changed) | row | **dropped** |
| No-op fast path | already skipped | skipped |

Dropping the body-update row is safe because both trackers keep their own issue history, and
the local document now records the *reason* the body changed (the review, the
implementation, the QA verdict) via the rows above.

### Important Clarifications

- **`develop-bug` keeps `## Status History`.** It already writes a rich per-iteration record
  (Status History rows at `:163` and `:179`, under the Step headers at `:161`, `:173`, `:177`)
  into the bug template's own section. No Change Log is added;
  the spec cross-references it.
- **`qa-gate` still writes only the `.yml`.** It must not touch the document — the
  anti-pattern is explicit (`qa-fix/SKILL.md:599`, `docs/reference/anti-patterns.md`).
  The QA verdict row is written by `qa-story` / `qa-task`, which already own document sections.
- **Version bumps only at acceptance.** Pipeline rows leave `Version` blank; `finalise` bumps
  the minor on acceptance. Bumping per step would make Version meaningless.

---

## 4. Scope

### In Scope

✅ `shared/resources/develop-pipeline-step-3-develop-loop.md`, `-step-5-6-qa-loop.md`, `-step-7-finalise.md`
✅ `skills/develop/SKILL.md` — story and task paths
✅ `skills/qa-story/SKILL.md`, `skills/qa-task/SKILL.md`, `skills/qa-fix/SKILL.md`
✅ `skills/finalise/SKILL.md` — Steps 7 and 8
✅ `skills/sync-jira-{story,epic,task}` — SKILL.md + `scripts/*.js`
✅ `skills/sync-github-{story,epic,task}` — SKILL.md
✅ Three `ensure-*-jira-issue` skills — narrow stale side-effect notes
✅ `skills/develop-bug/SKILL.md` — cross-reference only

### Out of Scope

❌ Spec and engine — task.42 (prerequisite)
❌ Templates and `create-*` — task.43 (prerequisite)
❌ `review-*` / `edit-*` — task.44 (prerequisite)
❌ Adding a Change Log to bug reports
❌ Changing what a tracker card carries — `tracker-card-summary.md` is unchanged
❌ Backfilling existing documents

---

## 5. Breaking Changes

### Breaking Change 1: one marker pair replaces two

**Before**: `<!-- jira-sync-changelog-start -->` and `<!-- github-sync-changelog-start -->`. Both
literals now live in the engine's `LEGACY_MARKER_PAIRS` at `change-log.js:57-58`; the sync skills
restate the old pair in prose at `sync-github-story/SKILL.md:213` and siblings.

**After**: `<!-- change-log-start -->` / `<!-- change-log-end -->` only.

**Affected**: every document already carrying either pair.

**Migration path**: task.42's `migrateLegacyEntries()` recognises both pairs, rewrites the
block in place under the new markers, widens the rows to four columns and infers the Author
from which pair it found. A document carrying **both** collapses to one block with rows in
date order. No document is touched until its next sync, and nothing is lost.

### Breaking Change 2: sync stops writing a row on body updates

**Before**: every sync whose body hash changed appended `| … | Updated: summary, description |`.

**After**: only issue creation and status transitions append a row.

**Affected**: anyone using the Change Log to audit sync activity.

**Migration path**: no local substitute is added, deliberately. Jira and GitHub both keep a
full issue history including every description edit, with timestamps and actor — strictly
better than a local row that says only which fields changed. The document now records the
*reason* the body changed, which the tracker history cannot infer. `jira_last_synced_at` in
frontmatter still records the last sync time.

### Breaking Change 3: `sync-jira-*` scripts call the new engine directly

**Before**: `lib.upsertChangelog(content, changeEntry)` with a preformatted 2-column row
string (`sync-jira-story.js:378`, `sync-jira-epic.js:503`, `sync-jira-task.js:258`).

**After**: `CL.upsertChangeLog(content, { date, description, author }, { docType })`.

**Affected**: the three sync scripts and the compatibility wrappers task.42 left in
`jira-sync.js`.

**Migration path**: this task is what those wrappers were for — `jira-sync.js:415-416` says so in
as many words ("Task.45 rewires those callers to use change-log.js directly, at which point this
block can go"). Update the three call sites, then delete the wrappers and the `skipChangelog` flag
plumbing (`sync-jira-epic.js:448`, `:503`, `:887`) that the narrowed rules make redundant.

**The wrapper has four further consumers, and they must move in the same commit.**
`shared/resources/tests/jira-sync-publishing-fidelity.test.mjs:40` imports `upsertChangelog` by
name and calls it at `:198` — that suite must be **rewritten** to the structured-entry signature,
not merely kept green. And each sync script re-exports the wrapper for its own test seam
(`sync-jira-story.js:788`, `sync-jira-epic.js:1296`, `sync-jira-task.js:635`); a developer working
only from the call-site line numbers above will not see them, and will ship a module exporting a
function that no longer exists.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.45.plan.change-log-pipeline-and-sync.md](task.45.plan.change-log-pipeline-and-sync.md)

### Phase 1: Pipeline step documents

**Risk**: Low.
**Files**: `shared/resources/develop-pipeline-step-3-develop-loop.md`,
`-step-5-6-qa-loop.md`, `-step-7-finalise.md`

- [x] Step 3: on exiting the develop loop, append the implementation-complete row
- [x] Step 5-6: the QA verdict row is written by `qa-story` / `qa-task`; the step document
      states the contract and does not duplicate the write
- [x] Step 7: the accepted row is written by `finalise`; same
- [x] Each links `shared/resources/document-change-log.md`

### Phase 2: `develop` and the QA skills

**Risk**: Low.
**Files**: `skills/develop/SKILL.md`, `skills/qa-story/SKILL.md`, `skills/qa-task/SKILL.md`,
`skills/qa-fix/SKILL.md`
**Depends on**: Phase 1

- [x] `develop` story path (`:582`) and task path (`:719`): point at the real section,
      canonical format, one row on completion rather than per task
- [x] Confirm `Change Log` stays on the authorised-sections lists (`:509`, `:850`)
- [x] `qa-story` (`:1273`): append the verdict row alongside `## QA Testing Results`.
      **The same contract is restated three more times** — `:928-937`, `:1440`, `:2384`. Patching
      only `:1273` leaves three copies telling the model the pre-canonical story
- [x] `qa-task` Step 12 (`:720`): same
- [x] `qa-fix` (`:559`): align to the canonical format and Author cell
- [x] `qa-gate` unchanged — it must never touch the document

### Phase 3: `finalise`

**Risk**: Low.
**Files**: `skills/finalise/SKILL.md`
**Depends on**: Phase 1

- [x] Step 7 (`:756`): append `| {today} | {bumped} | DoD passed — accepted (PR #{n}) | finalise |`
      in the same edit that sets `status: accepted`, `completed_date` and `updated`
- [x] Step 8 (header `:1200`, append instruction `:1249`): append a gaps row; status unchanged,
      so no Version bump
- [x] `:158` already scans for the literal `## Definition of Done - PASSED ✅` heading — check the
      new row does not break that idempotence path on a re-run
- [x] This is the only writer that bumps Version during a pipeline run

### Phase 4: Tracker sync

**Risk**: High — six skills, three scripts, live remote side effects.
**Files**: `skills/sync-jira-{story,epic,task}/SKILL.md` + `scripts/*.js`,
`skills/sync-github-{story,epic,task}/SKILL.md`, six `ensure-*-issue` SKILL.md
**Depends on**: Phases 1–3

- [x] Three Jira scripts call `change-log.js` directly with the structured entry
- [x] Narrow to issue-created and status-transition rows; drop the body-update row
- [x] Delete the `skipChangelog` plumbing made redundant (3 sites, all in `sync-jira-epic.js`:
      the param default `:448`, the guard `:503`, the no-op fast path `:887`)
- [x] Remove the wrappers task.42 left in `jira-sync.js` (`:408-467`, exported at `:4056`)
- [x] **Same commit as the wrapper deletion — four surfaces break otherwise.** `upsertChangelog`
      is not only called at the three sites above; it is imported by name and re-exported for
      test seams. Deleting the wrapper without these leaves modules exporting a function that no
      longer exists, and `npm test` goes red:
      - `shared/resources/tests/jira-sync-publishing-fidelity.test.mjs:40` — imports it by name,
        exercises it at `:198`. This suite must be **rewritten** to the new call signature, not
        merely observed to stay green
      - `skills/sync-jira-story/scripts/sync-jira-story.js:788` — re-exports `upsertChangelog`
      - `skills/sync-jira-epic/scripts/sync-jira-epic.js:1296` — same
      - `skills/sync-jira-task/scripts/sync-jira-task.js:635` — same
- [x] Three GitHub SKILL.md files: replace the three duplicated format specs with a link to
      the canonical spec and the same narrowed rules
- [x] **Three** `ensure-*-jira-issue`: **narrow**, do not delete, the side-effect notes
      (`ensure-story-jira-issue:102`, `ensure-task-jira-issue:96`, `ensure-epic-jira-issue:91`).
      Each says the delegate "may also advance the status **and append a Change Log entry**" —
      and under this task's own §3 table *both still happen*: issue creation writes a row and a
      status transition writes a row. The note is more accurate after this task, not less.
      Delete only the hypothetical `--no-status-transition` flag it floats, and reword the
      remainder from an apology into documented, intended behaviour.
      The three `ensure-*-github-issue` siblings carry **no such note** — nothing to edit there.
- [x] `develop-bug`: one cross-reference line — Status History stands

### Phase 5: Tests, bundle, live verification

**Risk**: Medium.
**Depends on**: Phases 1–4

- [x] Extend `shared/resources/tests/change-log.test.mjs` with the narrowed sync rules
- [x] `shared/resources/tests/jira-sync-publishing-fidelity.test.mjs` green (migrated to the structured signature)
- [x] `npm test` (1183/1183), `npm run eval:develop-story`, `npm run eval:develop-task`
- [x] `npm run bundle`; second run a no-op — verified
- [ ] **DEFERRED — Live Jira check.** No Jira credentials available in this environment; this repo is GitHub-tracked (`JIRA_URL` unset). The behaviour is pinned by unit tests H1-H8, including the two that matter (no-op writes nothing; migration fires only on a real write). Run before relying on the narrowing in a Jira-tracked consumer repo.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/develop-pipeline-step-3-develop-loop.md`
2. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md`
3. ✅ `shared/resources/develop-pipeline-step-7-finalise.md`
4. ✅ `skills/develop/SKILL.md` — `:509`, `:582`, `:719`, `:850`
5. ✅ `skills/qa-story/SKILL.md` — `:1273`
6. ✅ `skills/qa-task/SKILL.md` — `:720`
7. ✅ `skills/qa-fix/SKILL.md` — `:559`
8. ✅ `skills/finalise/SKILL.md` — `:756`, `:1249`
9. ✅ `skills/sync-jira-story/scripts/sync-jira-story.js` — `:378`
10. ✅ `skills/sync-jira-epic/scripts/sync-jira-epic.js` — `:503`, `:887`
11. ✅ `skills/sync-jira-task/scripts/sync-jira-task.js` — `:258`
12. ✅ `skills/sync-jira-{story,epic,task}/SKILL.md` — format spec → link; narrowed rules
13. ✅ `skills/sync-github-{story,epic,task}/SKILL.md` — same
14. ✅ `skills/ensure-{story,task,epic}-jira-issue/SKILL.md` — narrow the side-effect notes
    (3 files, not 6 — the `*-github-issue` siblings carry no such note)
15. ✅ `skills/develop-bug/SKILL.md` — cross-reference
16. ✅ `shared/resources/jira-sync.js` — remove the task.42 wrappers

### Files to Modify (Tests)

17. ✅ `shared/resources/tests/change-log.test.mjs`
18. ✅ `shared/resources/tests/jira-sync-publishing-fidelity.test.mjs`

### Files to Modify (Documentation)

19. ✅ `shared/resources/document-change-log.md` — **verify** the moment table (`:139-148`) matches
    shipped behaviour; no edit expected. The table has columns `Moment | Written by | Version |
    Example Description` and carries no implementation-status marker to flip — it is already
    written as a forward contract. Edit only if this task's implementation diverges from it.
20. ✅ `CHANGELOG.md`

### Files to Delete

None.

### Actually Modified (30 files, recorded at implementation)

Beyond the plan's list, these were touched because the work required them:

| File | Why it was not in the plan |
| --- | --- |
| `skills/sync-jira-story/tests/sync-jira-story.test.js` | calls `upsertChangelog` — a wrapper consumer the plan did not enumerate |
| `skills/sync-jira-epic/tests/sync-jira-epic.test.js` | same |
| `skills/sync-jira-task/tests/sync-jira-task.test.js` | same |
| `evals/develop-{task,story}/step-isolation/{03-develop-loop,07-finalise}/` | fixtures + assertions pinning the new rows (8 files) |
| `skills/finalise/SKILL.md` (step renumbering) | inserting sub-steps exposed a **pre-existing** duplicate `6.` in Step 7 and a duplicate `4.` in Step 8 |
| `shared/resources/change-log.js` | its `parseLegacyRow` docblock described the deleted shim as the caller |

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: the narrowed sync rules and the structured-entry call signature
- **Location**: `shared/resources/tests/change-log.test.mjs`
- **Command**: `node --test shared/resources/tests/change-log.test.mjs`
- **Target**: issue-created writes a row; status transition writes a row; a body-only change
  writes none; a no-op writes none; a document with both legacy marker pairs collapses to one

### Integration Tests

- **Scope**: Jira sync behaviour end to end against fixtures
- **Actions**: the three existing suites — `jira-sync-sections.test.mjs`,
  `jira-sync-card-summary.test.mjs`, `jira-sync-publishing-fidelity.test.mjs` — plus the
  Jira state fixtures at `shared/resources/tests/fixtures/rapp-*.json`
- **Scope**: pipeline steps
- **Actions**: `evals/develop-story/step-isolation/{03-develop-loop,05-qa-story,07-finalise}`
  and the `develop-task` equivalents. `07-finalise`'s replay fixture already contains a story
  at `accepted`; extend it to assert the accepted row

### Contract Tests

- **Scope**: no skill re-implements the format
- **Actions**: assert each sync SKILL.md links `document-change-log.md` and no longer embeds
  a column list — the three GitHub duplications are the specific target

### Performance Tests

- **Scope**: sync payload size
- **Metric**: `hashBody` churn. Narrowing the rows means fewer document writes per run;
  confirm a no-op sync leaves the file byte-identical and does not rewrite it to migrate markers
  on every call. **Marker migration must happen once, on the first sync that writes
  for another reason** — not as a standalone write
- **Baseline**: the no-op fast path at `sync-jira-epic.js:887` skips the Jira PUT but still calls
  `updateEpicFile`, which writes. The measurable baseline is therefore an empty `git diff`, not a
  zero write count

### Consumer Tests

- **Scope**: live tracker behaviour
- **Risk area**: a migration that rewrites a document on every sync would defeat the fast
  path and churn git history. Verify against a real Jira task: two consecutive syncs with no
  change leave the file byte-identical

---

## 9. Success Criteria

### Functional

- [x] A full `/develop-story` run produces implementation, QA and accepted rows in the story
- [x] `finalise` writes the accepted row in the same edit that sets `status: accepted`
- [x] All six sync skills use `<!-- change-log-start -->` only
- [x] A document carrying either legacy pair migrates in place on its next sync, once
- [x] A body-only sync writes no Change Log row; a status transition writes one
- [x] `develop-bug` still uses Status History, unchanged

### Performance

- [x] A no-op sync writes no Change Log row and leaves the file byte-identical (empty `git diff`).
      The write itself is unconditional — frontmatter timestamps refresh regardless — so the
      guarantee is unchanged content, not a skipped write. Verified by test H.
- [x] Marker migration happens at most once per document, never on the no-op path

### Code Quality

- [x] `npm test` green, including all three Jira suites (1183/1183)
- [x] `npm run eval:develop-story` and `eval:develop-task` green
- [x] The task.42 wrappers in `jira-sync.js` are deleted, not left orphaned
- [x] No sync SKILL.md embeds a column list

### Migration

- [x] `shared/resources/document-change-log.md`'s moment table verified against shipped behaviour —
      one divergence found and fixed (`sync-*` added to the status-transition row), plus a new
      section documenting what a sync logs and why migration never runs standalone
- [x] `CHANGELOG.md` records both breaking changes
- [ ] **DEFERRED** — live Jira verification; no credentials in this environment (see Phase 5)

---

## 10. Risk Assessment

### High Risk Areas

1. **A sync bug corrupts the log on a live tracker-synced document**
   - **Risk**: the migration path rewrites a block wrongly and loses existing rows. Sync
     failures in this codebase are historically *silent* — `CHANGELOG.md:527` records four
     consecutive Jira cards published with empty bodies and a `✅ Task updated` each time.
     A log that loses rows would fail the same way.
   - **Probability**: Medium
   - **Impact**: Critical — losing history is worse than never having had it
   - **Mitigation**: migration is covered by task.42's unit tests before any script calls it;
     the three existing Jira suites must stay green; live verification runs against one real
     issue before merge. Row extraction is append-only by construction — `upsertChangeLog`
     never drops a row it parsed.
   - **Rollback**: revert; documents already migrated keep a valid canonical block, since the
     new format is a superset of the old.

2. **Marker migration defeats the no-op fast path**
   - **Risk**: if migration runs unconditionally, every sync rewrites the document, churning
     git history and firing a PUT that changes nothing — the exact defect `37bcf3f` fixed by
     making `hashBody` hash only what is published.
   - **Probability**: Medium
   - **Impact**: High
   - **Mitigation**: migrate only on a sync that is already writing for another reason.
     Assert byte-identical content on two consecutive no-op syncs, in both a unit test and the live check.
   - **Rollback**: gate migration behind an explicit flag.

### Medium Risk Areas

3. **Losing sync-activity history that someone relies on**
   - **Risk**: a team using `Updated: summary, description` rows to audit sync activity loses
     them.
   - **Probability**: Low
   - **Impact**: Medium
   - **Mitigation**: both trackers keep richer issue history, with actor and timestamp;
     `jira_last_synced_at` remains in frontmatter. Document the rationale in `CHANGELOG.md`.

4. **The pipeline writes a row per iteration instead of per completion**
   - **Risk**: `develop`'s loop and the QA fix loop (up to 5 cycles) could each append a row,
     reproducing the churn this task removes.
   - **Probability**: Medium
   - **Impact**: Medium
   - **Mitigation**: the instructions say one row on *exiting* the loop, with the iteration
     count in the Description (`QA findings fixed — gate PASS (9/10), 2 iterations`). The
     per-iteration record already lives in the implementation report, which is its proper home.

### Low Risk Areas

5. **The three `ensure-*-jira-issue` side-effect notes go stale in the other direction**
   - **Probability**: Low
   - **Impact**: Low
   - **Mitigation**: they are **narrowed, not deleted**. Deleting would discard information that
     stays true: under the narrowed rules the delegate still appends a row on issue creation and
     on a status transition, which is exactly what `ensure-*` triggers. Only the hypothetical
     `--no-status-transition` flag goes.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- A synced document loses Change Log rows
- A no-op sync writes to the filesystem
- Any Jira suite red, or a live sync failing

**Steps**:
1. `git revert` the merge commit.
2. `npm run bundle`.
3. `npm test`.
4. Inspect any document synced since the merge; the canonical block remains valid under the
   reverted code because task.42's reader accepts it.

**Validation**: two consecutive syncs of one real task leave the file byte-identical (empty `git diff`) with no new row.

### Partial Rollback (1-2 hours)

**When to use**: the pipeline rows are right and only the sync rewiring misbehaves.

**Steps**: revert Phase 4 alone and restore the task.42 wrappers in `jira-sync.js`. Phases
1–3 are independent of the sync path and deliver most of the stakeholder value — the
implementation, QA and accepted rows are the ones a stakeholder actually reads.

### Forward Fix (< 4 hours)

**When to use**: one sync path is wrong, or a single pipeline step writes the wrong row.

**Approach**: add the offending document as a fixture in `change-log.test.mjs`, fix the
branch, re-bundle. Reverting six skills to correct one is disproportionate.

### Rollback Triggers

**Critical (revert)**: any row loss; a no-op sync that writes; a silent publish failure.
**Non-critical (fix forward)**: a wrong Author cell; a row written per iteration instead of
per completion; a stale cross-reference.

---

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Summary

**Final Gate**: `task.45.gate.2.change-log-pipeline-and-sync.yml` — ✅ **PASS**, 95/100
**QA Cycles**: 2 (1 fix cycle) · **Bugs**: 3 filed, 3 closed, 0 open
**CI**: ✅ SUCCESS on head `3dbb34f` — the exact PR head, not an ancestor

All Definition of Done criteria have been verified:

✅ **Success Criteria** — 20 of 21 met; 1 deferred with disclosure (below)
✅ **Tests** — `npm test` 1185/1185; `eval:develop-story` and `eval:develop-task` 8/8 each; `npm run bundle` idempotent
✅ **PR** — #213 → `develop`, all three checks green
✅ **Documentation** — CHANGELOG (3 breaking changes), canonical spec updated, six sync skills now link it rather than restating it
✅ **Security** — no new attack surface; one added authenticated call using the existing helper
⚠️ **Compliance** — N/A (internal developer tooling; no regulated surface)

### Known Accepted Condition

⚠️ **Live Jira verification not run** — no Jira credentials in this environment and the repo is GitHub-tracked. Carried openly through review, both QA cycles and gate 2 rather than silently ticked; unticked in §9 and Phase 5. The behaviour is pinned by tests H1–H10, including the two that assert byte-identity on a no-op and that migration still fires on the first real write. Gate 2: staging APPROVED, production CONDITIONAL on this check.

### Carried-Forward Follow-ups (non-blocking)

Two pre-existing task.42 engine defects, documented in `task.45.bug.3` and deliberately not fixed here: content loss on the hand-written-heading path (MEDIUM), and the same-pair collapse skip (LOW).

**Detailed Verification Log:** See `task.45.dod.1.change-log-pipeline-and-sync.md` for complete verification evidence and timestamps.

**Task marked as ACCEPTED on:** 2026-08-13

---

## QA Testing Results

**QA Status**: ✅ PASS (cycle 2)
**QA Engineer**: QA Engineer
**Testing Date**: 2026-08-13
**Quality Score**: 95/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.45.qa.2.change-log-pipeline-and-sync.md](./task.45.qa.2.change-log-pipeline-and-sync.md) (cycle 2; cycle 1 at `task.45.qa.1.*`)
- **Gate File**: [task.45.gate.2.change-log-pipeline-and-sync.yml](./task.45.gate.2.change-log-pipeline-and-sync.yml)

### Test Coverage Summary
- **Tests Executed**: 1185 (all passing) + 16 eval scenarios
- **Phases Verified**: 5/5
- **Critical Issues**: 0 open (3 bugs fixed in 1 cycle)
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
All three bugs closed in one cycle. The most consequential — TASK-45-BUG-3, surfaced by the diff code review after gate 1 — was a reproducible **row-loss** defect in the engine: `upsertChangeLog` deleted every Change Log row it could not parse, and this repo's roadmap template shipped with the triggering column order. Pre-existing in task.42, fixed here because this task routes five more writers into that path and because "never drops a row" is the mitigation it claims for its own Critical risk.

### Bug Reports
- [TASK-45-BUG-1](./task.45.bug.1.orphaned-legacy-block-in-six-sync-skills.md) — HIGH — ✅ Closed
- [TASK-45-BUG-2](./task.45.bug.2.zero-file-writes-claim-overstated.md) — MEDIUM — ✅ Closed
- [TASK-45-BUG-3](./task.45.bug.3.row-loss-on-unparsed-rows.md) — HIGH — ✅ Closed (engine row loss)

---

<!--
  Append-only. Newest row LAST. Four columns, exactly as below.
  Deliberately UNNUMBERED — the 11 numbered sections above are the mandatory contract.
  Canonical spec: shared/resources/document-change-log.md
  Authoring/review/edit skills bump Version; machine writers leave it blank.
  EVERY new row bumps frontmatter `updated:` in the same edit.
-->

## Change Log

| Date       | Version | Description                                                                                                                                                     | Author      |
| ---------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 2026-08-12 | 1.0     | Initial draft                                                                                                                                                   | create-task |
| 2026-08-13 | 1.1     | Review passed (8/10) — ready for development; 7 Important fixes applied: 4 wrapper-deletion surfaces that break `npm test` named in §5/§6, deliverable #19 restated as verification (no marker exists to flip), `ensure-*` notes narrowed not deleted and scope corrected 6→3, `qa-story`'s 3 further edit sites named, citations fixed (`CHANGELOG.md` 377→527 ×2, `finalise` 1222→1249, legacy marker → `change-log.js:57-58`), Change Log section added | review-task |
| 2026-08-13 |         | Status → ready-for-development                                                                                                                                  | review-task |
| 2026-08-13 |         | Implemented — all 5 phases; 30 files, 8 new tests (1183/1183 passing). Closed two plumbing gaps the plan missed (story write-gate suppressed the status row; epic fast path never transitioned — pre-existing) and migrated 5 wrapper-consumer surfaces, not 1 | develop     |
| 2026-08-13 |         | QA gate FAIL (70/100) — 1 high, 1 medium: orphaned legacy block in six sync skills, overstated zero-writes claim | qa-task     |
| 2026-08-13 |         | QA findings fixed — 3 bugs closed in 1 iteration: orphaned legacy block removed from six sync skills, zero-writes wording corrected, and row loss on unparsed Change Log rows fixed in the engine (+2 regression tests) | qa-fix      |
| 2026-08-13 |         | QA gate PASS (95/100) after 1 fix cycle — 3 bugs closed, both Critical risks verified clean | qa-task     |
| 2026-08-13 | 1.2     | DoD verified — accepted (PR #213), CI green on head 3dbb34f; live-Jira check deferred as a disclosed condition | finalise    |

---

## Progress Tracking

### Phase 1: Pipeline step documents
- [x] Complete — step-3 (implementation row on loop exit), step-5-6 (writer contract table + qa-gate carve-out), step-7 (acceptance/gaps rows, sole Version bumper, two-rows-at-acceptance note, idempotence-guard warning) + checklist item

### Phase 2: `develop` and the QA skills
- [x] Complete — `develop` story+task paths rewritten (row moved OUT of the per-task/per-phase loop), `qa-story` all 4 contract sites + authorisation list, `qa-task` Step 12, `qa-fix` normalised to one row per loop exit with 4 loose references realigned

### Phase 3: `finalise`
- [x] Complete — acceptance row added as Step 7 sub-step 3 (same edit as the frontmatter change, minor Version bump, idempotence-guard warning, two-rows-at-acceptance note); gaps row added as Step 8 sub-step 3 (blank Version). Step numbering repaired in both — Step 7 had a pre-existing duplicate `6.`

### Phase 4: Tracker sync
- [x] Complete — three Jira scripts call the engine with structured entries; rows narrowed to created + status-transition; `skipChangelog` deleted; wrappers removed from `jira-sync.js` and replaced by `buildChangeLogEntries` (policy, not a shim); all six SKILL.md format specs replaced with a link + narrowed rules; three `ensure-*-jira-issue` notes narrowed; `develop-bug` cross-reference added
- [x] **Two plumbing gaps closed that the plan did not anticipate** — story's `shouldWriteFile` suppressed the write on exactly the path a status row is earned; epic's fast path returned before the transition block, so epic never transitioned on a body-unchanged sync (pre-existing)
- [x] **Five wrapper-consumer surfaces migrated**, not the one the plan named — the fidelity test plus three script re-exports plus all three per-skill test suites

### Phase 5: Tests, bundle, live verification
- [x] Complete — 8 new narrowed-sync tests (group H) in `change-log.test.mjs`; fidelity suite migrated; 4 eval fixtures extended with implementation/acceptance row assertions; `npm test` 1183/1183; both eval suites green; bundle idempotent. **Live Jira verification deferred — no Jira credentials in this environment (`JIRA_URL` unset; this repo is GitHub-tracked).**

---

## References

- [`shared/resources/document-change-log.md`](../../../shared/resources/document-change-log.md) —
  canonical spec and the moment table this task implements (task.42)
- [`shared/resources/tracker-card-summary.md`](../../../shared/resources/tracker-card-summary.md) —
  why sync churn was removed from cards; the same argument narrows the log
- [`shared/resources/develop-pipeline-step-*.md`](../../../shared/resources/) — the step
  documents both develop pipelines delegate to
- [`CHANGELOG.md`](../../../CHANGELOG.md) line 527 — the silent-publish failure class this
  task must not reproduce (related: line 150, the 28 task cards that shipped with empty bodies)
- Prior tasks: task.42, task.43, task.44. This completes the series.

---

## Notes

### Important Reminders

- Migration must never run on the no-op path. A sync that changes nothing must write nothing.
- One row per loop exit, not per iteration. Per-iteration detail belongs in the
  implementation report.
- `qa-gate` must not touch the document. `develop-bug` keeps Status History.
- Delete the task.42 wrappers once the three call sites move; an orphaned compatibility
  shim is how the next reader concludes there are two supported call styles.

### Known Issues

- `sync-jira-epic.js:887` sets `skipChangelog` on the no-op fast path. Narrowing the rules
  makes it redundant, but check it is not load-bearing elsewhere before deleting.
- The three GitHub sync skills have no scripts; their narrowed rules are prose the model
  follows. That asymmetry with the Jira path is pre-existing and out of scope — a
  `gh-sync.js` mirroring `jira-sync.js` is a separate piece of work.

### Future Improvements

- A `gh-sync.js` giving the GitHub path the same deterministic engine the Jira path has.
  Would remove the last three prose reimplementations in this area.
- Emit the Change Log as a `--format json` view for release-notes tooling, once the format
  is stable across a few real projects.

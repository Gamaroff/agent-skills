---
id: task.45
title: "Pipeline, QA, finalise, and tracker sync write the Change Log"
type: task
description: "Wire the develop/QA/finalise pipeline steps and the six tracker-sync skills onto the canonical Change Log, unifying the marker pairs and narrowing sync rows to milestones."
tags: [change-log, pipeline, tracker-sync]
category: refactoring
status: planned
priority: High
created: 2026-08-12
updated: 2026-08-12
assignee:
estimated_effort_hours: 16
github_issue: 204
---

# [Task 45] Pipeline, QA, finalise, and tracker sync write the Change Log

**Status:** Planned

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

**Scope**: Two shared pipeline step documents, `develop`, three QA skills, `finalise`, six
sync skills, three sync scripts, and six `ensure-*-issue` sub-routines.

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
   `## Definition of Done - PASSED ✅` section. Step 8 (`:1222`) appends
   `## Definition of Done - Gaps Identified`. Neither writes a Change Log row. The single
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
  (`:161`, `:173`, `:177`) into the bug template's own section. No Change Log is added;
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
✅ Six `ensure-*-issue` skills — remove stale side-effect notes
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

**Before**: `<!-- jira-sync-changelog-start -->` (`jira-sync.js:411`) and
`<!-- github-sync-changelog-start -->` (`sync-github-story/SKILL.md:213` and siblings).

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

**Migration path**: this task is what those wrappers were for. Update the three call sites,
then delete the wrappers and the `skipChangelog` flag plumbing
(`sync-jira-epic.js:887`) that the narrowed rules make redundant. `shared/resources/tests/jira-sync-publishing-fidelity.test.mjs`
must stay green.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.45.plan.change-log-pipeline-and-sync.md](task.45.plan.change-log-pipeline-and-sync.md)

### Phase 1: Pipeline step documents

**Risk**: Low.
**Files**: `shared/resources/develop-pipeline-step-3-develop-loop.md`,
`-step-5-6-qa-loop.md`, `-step-7-finalise.md`

- [ ] Step 3: on exiting the develop loop, append the implementation-complete row
- [ ] Step 5-6: the QA verdict row is written by `qa-story` / `qa-task`; the step document
      states the contract and does not duplicate the write
- [ ] Step 7: the accepted row is written by `finalise`; same
- [ ] Each links `shared/resources/document-change-log.md`

### Phase 2: `develop` and the QA skills

**Risk**: Low.
**Files**: `skills/develop/SKILL.md`, `skills/qa-story/SKILL.md`, `skills/qa-task/SKILL.md`,
`skills/qa-fix/SKILL.md`
**Depends on**: Phase 1

- [ ] `develop` story path (`:582`) and task path (`:719`): point at the real section,
      canonical format, one row on completion rather than per task
- [ ] Confirm `Change Log` stays on the authorised-sections lists (`:509`, `:850`)
- [ ] `qa-story` (`:1273`): append the verdict row alongside `## QA Testing Results`
- [ ] `qa-task` Step 12 (`:720`): same
- [ ] `qa-fix` (`:559`): align to the canonical format and Author cell
- [ ] `qa-gate` unchanged — it must never touch the document

### Phase 3: `finalise`

**Risk**: Low.
**Files**: `skills/finalise/SKILL.md`
**Depends on**: Phase 1

- [ ] Step 7 (`:756`): append `| {today} | {bumped} | DoD passed — accepted (PR #{n}) | finalise |`
      in the same edit that sets `status: accepted`, `completed_date` and `updated`
- [ ] Step 8 (`:1222`): append a gaps row; status unchanged, so no Version bump
- [ ] This is the only writer that bumps Version during a pipeline run

### Phase 4: Tracker sync

**Risk**: High — six skills, three scripts, live remote side effects.
**Files**: `skills/sync-jira-{story,epic,task}/SKILL.md` + `scripts/*.js`,
`skills/sync-github-{story,epic,task}/SKILL.md`, six `ensure-*-issue` SKILL.md
**Depends on**: Phases 1–3

- [ ] Three Jira scripts call `change-log.js` directly with the structured entry
- [ ] Narrow to issue-created and status-transition rows; drop the body-update row
- [ ] Delete the `skipChangelog` plumbing made redundant
- [ ] Remove the wrappers task.42 left in `jira-sync.js`
- [ ] Three GitHub SKILL.md files: replace the three duplicated format specs with a link to
      the canonical spec and the same narrowed rules
- [ ] Six `ensure-*-issue`: drop the now-inaccurate side-effect notes
      (`ensure-story-jira-issue:102`, `ensure-task-jira-issue:96`, `ensure-epic-jira-issue:91`)
- [ ] `develop-bug`: one cross-reference line — Status History stands

### Phase 5: Tests, bundle, live verification

**Risk**: Medium.
**Depends on**: Phases 1–4

- [ ] Extend `shared/resources/tests/change-log.test.mjs` with the narrowed sync rules
- [ ] `shared/resources/tests/jira-sync-publishing-fidelity.test.mjs` green
- [ ] `npm test`, `npm run eval:develop-story`, `npm run eval:develop-task`
- [ ] `npm run bundle`; second run a no-op
- [ ] Live: sync one real task to Jira twice with no body change and confirm no new row;
      change the body and confirm still no row; transition the status and confirm one row

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
8. ✅ `skills/finalise/SKILL.md` — `:756`, `:1222`
9. ✅ `skills/sync-jira-story/scripts/sync-jira-story.js` — `:378`
10. ✅ `skills/sync-jira-epic/scripts/sync-jira-epic.js` — `:503`, `:887`
11. ✅ `skills/sync-jira-task/scripts/sync-jira-task.js` — `:258`
12. ✅ `skills/sync-jira-{story,epic,task}/SKILL.md` — format spec → link; narrowed rules
13. ✅ `skills/sync-github-{story,epic,task}/SKILL.md` — same
14. ✅ `skills/ensure-{story,task,epic}-{jira,github}-issue/SKILL.md` — stale notes
15. ✅ `skills/develop-bug/SKILL.md` — cross-reference
16. ✅ `shared/resources/jira-sync.js` — remove the task.42 wrappers

### Files to Modify (Tests)

17. ✅ `shared/resources/tests/change-log.test.mjs`
18. ✅ `shared/resources/tests/jira-sync-publishing-fidelity.test.mjs`

### Files to Modify (Documentation)

19. ✅ `shared/resources/document-change-log.md` — mark the moment table implemented
20. ✅ `CHANGELOG.md`

### Files to Delete

None.

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
  confirm a no-op sync remains a genuine no-op and does not now rewrite the file to migrate
  markers on every call. **Marker migration must happen once, on the first sync that writes
  for another reason** — not as a standalone write
- **Baseline**: the no-op fast path at `sync-jira-epic.js:887` today performs zero writes

### Consumer Tests

- **Scope**: live tracker behaviour
- **Risk area**: a migration that rewrites a document on every sync would defeat the fast
  path and churn git history. Verify against a real Jira task: two consecutive syncs with no
  change produce zero file writes

---

## 9. Success Criteria

### Functional

- [ ] A full `/develop-story` run produces implementation, QA and accepted rows in the story
- [ ] `finalise` writes the accepted row in the same edit that sets `status: accepted`
- [ ] All six sync skills use `<!-- change-log-start -->` only
- [ ] A document carrying either legacy pair migrates in place on its next sync, once
- [ ] A body-only sync writes no Change Log row; a status transition writes one
- [ ] `develop-bug` still uses Status History, unchanged

### Performance

- [ ] A no-op sync still performs zero file writes
- [ ] Marker migration happens at most once per document, never on the no-op path

### Code Quality

- [ ] `npm test` green, including all three Jira suites
- [ ] `npm run eval:develop-story` and `eval:develop-task` green
- [ ] The task.42 wrappers in `jira-sync.js` are deleted, not left orphaned
- [ ] No sync SKILL.md embeds a column list

### Migration

- [ ] `shared/resources/document-change-log.md`'s moment table matches shipped behaviour
- [ ] `CHANGELOG.md` records both breaking changes
- [ ] Live verification against a real Jira issue completed and recorded in the DoD

---

## 10. Risk Assessment

### High Risk Areas

1. **A sync bug corrupts the log on a live tracker-synced document**
   - **Risk**: the migration path rewrites a block wrongly and loses existing rows. Sync
     failures in this codebase are historically *silent* — `CHANGELOG.md:377` records four
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
     Assert zero writes on two consecutive no-op syncs, in both a unit test and the live check.
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

5. **Six `ensure-*-issue` side-effect notes go stale in the other direction**
   - **Probability**: Low
   - **Impact**: Low
   - **Mitigation**: they are deleted, not rewritten.

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

**Validation**: two consecutive syncs of one real task produce zero file writes and no new row.

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

## Progress Tracking

### Phase 1: Pipeline step documents
- [ ] Not started

### Phase 2: `develop` and the QA skills
- [ ] Not started

### Phase 3: `finalise`
- [ ] Not started

### Phase 4: Tracker sync
- [ ] Not started

### Phase 5: Tests, bundle, live verification
- [ ] Not started

---

## References

- [`shared/resources/document-change-log.md`](../../../shared/resources/document-change-log.md) —
  canonical spec and the moment table this task implements (task.42)
- [`shared/resources/tracker-card-summary.md`](../../../shared/resources/tracker-card-summary.md) —
  why sync churn was removed from cards; the same argument narrows the log
- [`shared/resources/develop-pipeline-step-*.md`](../../../shared/resources/) — the step
  documents both develop pipelines delegate to
- [`CHANGELOG.md`](../../../CHANGELOG.md) line 377 — the silent-publish failure class this
  task must not reproduce
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

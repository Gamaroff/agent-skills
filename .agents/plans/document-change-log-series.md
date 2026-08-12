# Document Change Log — series plan (task.42 → task.45)

> Series-level rationale for the four Change Log tasks. Per-task detail lives in each task's
> own co-located plan: `docs/tasks/task.4{2,3,4,5}.*/task.4N.plan.*.md`.

## Why

Stakeholders want to read a history of changes on PRD, epic, story, and task documents. A
Change Log already exists in this repo — but in four incompatible table shapes, on only two
of the four document types, written by nine skills that disagree about the format, with a
live placement bug. This is a consolidation, not a new feature.

### What was found

| Where | Heading | Columns |
|---|---|---|
| `create-story/resources/story-template.yaml:171` (+ `review-story` copy) | `Change Log` | `Date, Version, Description, Author` |
| `prd-template/resources/prd-tmpl.yaml:31` | `### Change Log` under §1 | `Date, Version, Description, Author` |
| `brownfield-prd-template/resources/brownfield-prd-tmpl.yaml:118` | `### Change Log` under §1 | `Change, Date, Version, Description, Author` |
| `docs/templates/epic-template.md:680` (+ 2 copies, 1 drifted) | `### Change Log` under `## Notes & Updates` | **bulleted**, no table |
| `documentation-standards-validator/references/story-template.md:701` | `### Change Log` | **bulleted**, no table |
| Six `sync-jira-*` / `sync-github-*` skills | `## Change Log` | `Date (UTC), Change` |
| `create-task/resources/task-template.md` | — | **absent** |
| `create-epic/SKILL.md:146` inline structure | — | **absent** |

Three concrete defects:

1. **`create-task` and `create-epic` emit no Change Log**, yet `develop/SKILL.md:719` tells
   the agent to write one and `sync-jira-task` appends one anyway. Real task documents show
   three improvised shapes as a result.
2. **`upsertChangelog()` (`jira-sync.js:479`) cannot find the heading the templates emit.**
   It matches `/^## Change Log/m`; the epic/story markdown templates emit `### Change Log`.
   The match fails and the fallback inserts a *second* H2 block before the first `##` — at
   the top of the document body, above the Epic Goal.
3. **Two incompatible marker pairs** (`jira-sync-changelog-*`, `github-sync-changelog-*`), so
   a document synced to both trackers grows two independent blocks.

## Decisions

- **Canonical shape**: `| Date | Version | Description | Author |`. Version optional —
  authoring and review skills bump it, machine writers leave it blank. This is what lets one
  table serve both a stakeholder and a sync script.
- **Granularity**: milestones only. Tracker syncs log issue *creation* and *status
  transitions*, not every body-hash refresh. Sync churn is exactly why the Change Log was
  removed from tracker cards in commit `37bcf3f` — "a third copy grew on every sync and told
  a reader nothing new" — and the same argument applies to the log itself.
- **Enforcement**: on by default, `advisory`. `review-*` raise an Important issue plus a
  score deduction, never a NO-GO. Opt out with `change-log.enabled: false`.
- **No backfill.** Additive and going-forward only, matching how sign-off and OKF v0.1 landed.
- **Bugs are out of scope.** `## Status History`
  (`create-bug-report/assets/bug-report-template.md:119`) is already the bug-type equivalent
  and is richer — it carries a Status column.

## The precedent being followed

`shared/resources/sign-off.md` and `shared/resources/tracker-card-summary.md` are the two
existing instances of this pattern in the repo: one canonical spec, config-gated, seeded by
`create-*`, graded by `review-*`, mirrored by protocol tests. Both replaced drifted
hand-maintained copies. The card-summary commit records the cost of the alternative: "The
GitHub path had two hand-maintained copies of its contract that had already drifted, plus two
more independent builders."

## Sequencing

Strictly ordered — each task depends on all its predecessors.

| Task | Delivers | Why it must come when it does |
|---|---|---|
| **42** | `shared/resources/document-change-log.md` + `change-log.js` + tests + standards | Everything else writes through it. Ships with back-compat wrappers so no caller changes. |
| **43** | Templates emit the section; `create-*` seed row one | Writing rows into a section no template produces would exercise 42's insertion fallback on every document. |
| **44** | `review-*` / `edit-*` write rows; `review-*` grade the section | Grading a section templates do not yet emit would flag every document. |
| **45** | Pipeline, QA, `finalise`, and the six sync skills | Rewires the sync scripts onto the engine and removes 42's wrappers. Last because it carries live remote side effects. |

### The two highest-risk moments

- **task.44 Phase 4 (grading).** If the check lands as Critical, or a repo sets `blocking`
  before its corpus is current, `develop-*` HALTs at Step 2 on every existing document — the
  review gate withholds the status promotion and the pipelines gate on `Status:`. Mitigation:
  `advisory` default asserted in a protocol test, and a manual `--validate` run against a
  pre-task.43 document that must return GO.
- **task.45 Phase 4 (sync rewiring).** Marker migration must run only on a sync that is
  already writing for another reason. Unconditional migration would rewrite every document on
  every sync, defeating the no-op fast path and churning git history — the defect `37bcf3f`
  fixed by making `hashBody` hash only what is published.

Sync failures in this codebase are historically silent: `CHANGELOG.md:377` records four
consecutive Jira cards published with empty bodies, each reporting `✅`. Any Change Log defect
would fail the same way, which is why task.45 requires live verification against a real
tracker issue before merge.

## Target end state

A completed story's Change Log, read top to bottom:

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

Eight rows. Today those events are scattered across the implementation report, the QA report,
the DoD file and the tracker — plus roughly a dozen `Updated: summary, description` rows in
the document itself.

## Incidental findings (not in scope)

- `create-story/SKILL.md:1025` references `resources/story-draft-checklist.md`, which does
  not exist on disk.
- `shared/resources/README.md` names `package_skill.py` as the bundler; it is
  `bundle_skill.py`. Its file index covers ~20 of 79 files.
- The three `epic-template.md` copies exist because two skills need the file at bundle time.
  Moving it into `shared/resources/` would let `bundle_skill.py` maintain them and remove the
  drift class entirely. task.43 byte-locks them as a stopgap.

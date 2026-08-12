# Bug Documents

> **Audience:** anyone authoring or generating bug reports in a project that uses these skills.

Schema and conventions for bug report files produced by `create-bug-report`. This document covers the
**general bug** (a cross-cutting bug with no single story/task owner). Story bugs and task bugs are
*co-located artifacts* of their parent — see [story documents](./story-documents.md) and
[task documents](./task-documents.md).

## Purpose

A **general bug** is a cross-cutting bug with no single story or task owner — the kind surfaced by a
sweep (lint, security, dependency audit, drift check) that touches several areas at once. General
bugs are first-class, globally-numbered documents tracked in the [bug registry](#bug-registry).

When a bug *does* have an owner, file it against that owner instead:

- Found during **story testing** → story bug (`story.{epic}.{story}.bug.{n}.{name}.md`, co-located with the story).
- Found during **technical-task QA** → task bug (`task.{id}.bug.{n}.{name}.md`, co-located in the task subdirectory).

## Directory layout

```
docs/bugs/
├── bug-registry.md                     # global numbering + index (see below)
└── bug.{N}.{name}/                      # one self-named subdirectory per general bug
    ├── bug.{N}.{name}.md                # main bug report (from the shared template)
    └── …                               # optional co-located evidence (screenshots, logs, repro scripts)
```

The base path `docs/bugs/` is fixed — no configuration key overrides it. The directory stem matches
the filename stem exactly.

## File naming

See [file naming](./file-naming.md). Pattern: `bug.{N}.{name}.md` in `docs/bugs/bug.{N}.{name}/`.
`{name}` is 2–4 lowercase, hyphenated words from the bug description. The leading `bug.` + number
keeps it unambiguous versus the `story.`/`task.`-prefixed bug artifacts.

## Frontmatter schema

```yaml
---
type: bug
status: new # bug lifecycle: new → in-progress → ready-for-qa → closed | reopened
severity: 'Major'
priority: 'High'
created: 2026-07-21
related: 'none — cross-cutting (no single owner)'
description: 'One-line summary of the bug'
---
```

| Field         | Type    | Required    | Values / Notes                                                                                  |
| ------------- | ------- | ----------- | ----------------------------------------------------------------------------------------------- |
| `type`        | literal | Yes         | Must be exactly `bug` (OKF `type` — the one hard requirement)                                    |
| `status`      | enum    | Yes         | Bug lifecycle: `new`, `in-progress`, `ready-for-qa`, `closed`, `reopened`                        |
| `severity`    | enum    | Yes         | `Blocker`, `Major`, `Minor`, `Trivial`                                                           |
| `priority`    | enum    | Yes         | `Critical`, `High`, `Medium`, `Low`                                                              |
| `created`     | ISO date| Yes         | `YYYY-MM-DD`                                                                                     |
| `related`     | string  | Yes         | For general bugs: `none — cross-cutting (no single owner)`. Story/task bugs name their parent    |
| `description` | string  | Recommended | One-sentence summary (OKF `description`) — what consumers and agents index on                    |
| `tags`        | list    | Optional    | Short strings for cross-cutting categorization (OKF `tags`)                                       |

> **Bug status ≠ document status.** The bug lifecycle (`new → … → closed | reopened`) is deliberately
> distinct from the document status lifecycle (`draft → … → accepted`) used by stories/tasks/epics.
> Do not map one onto the other. OKF only mandates a non-empty `type`; full mapping:
> [`open-knowledge-format.md`](../../shared/resources/open-knowledge-format.md).

## Body sections

`create-bug-report` produces the body from the shared template
(`skills/create-bug-report/assets/bug-report-template.md`):

1. Header block (Bug ID, Related, Status, Priority, Severity, Created, Assigned To, QA Engineer)
2. Bug Description (Summary, Expected, Actual, Impact)
3. Reproduction Steps (Environment, Steps, Frequency, Reproducible)
4. Evidence (screenshots/output, logs, related files)
5. **Scope & Impact** (general bug) / Acceptance Criteria Violation (story) / Success Criteria Violation (task)
6. Developer Fix Cycle (iterative)
7. Status History
8. Resolution Summary

Before a bug is worked, [`review-bug`](../../skills/review-bug/SKILL.md) checks its **fix-readiness**
(sections 1–5): completeness, reproducibility *from the report*, severity/priority correctness, and
mode/linkage — plus read-only duplicate and already-fixed scans. It never mutates the bug lifecycle
`status`; it may edit the report to add missing detail. It is also `develop-bug`'s Step 2 gate.

> **Bug reports carry no Change Log.** `## Status History` (section 7) is the bug-type equivalent and
> is richer — it has a `Status` column, which is what a bug's history is actually about. Do not add the
> four-column `## Change Log` that PRD, epic, story, and task documents carry; the exclusion is stated in
> the spec itself. See [`document-change-log.md`](../../shared/resources/document-change-log.md).

`create-bug-report` writes sections 1–5 and leaves 6–8 as stubs. The **fix-executing** skills fill them:
[`develop-bug`](../../skills/develop-bug/SKILL.md) is the end-to-end orchestrator — it takes an open bug
report and runs it to a **closed, verified, documented** fix, writing sections 6–8 (Developer Fix Cycle,
Status History, and the `## Resolution Summary` that closes the bug). [`qa-fix`](../../skills/qa-fix/SKILL.md)
writes the interim fix record (sections 6–7, stopping at `ready-for-qa`) and is also the fix engine inside
develop-bug's verify loop.

## Bug registry

`docs/bugs/bug-registry.md` is the single source of truth for general-bug numbering and status. Rules:

- Read **Next Available Bug Number** before filing a general bug — that's your `bug.{N}`.
- The new registry row is committed atomically with the new bug files.
- Bug numbers are **globally unique and never reused**, even after a bug is closed or cancelled.

Full rules: [bug registry](./bug-registry.md).

## See also

- [Bug registry](./bug-registry.md)
- [File naming](./file-naming.md)
- [Story documents](./story-documents.md) — story bug artifacts
- [Task documents](./task-documents.md) — task bug artifacts
- [`create-bug-report` SKILL.md](../../skills/create-bug-report/SKILL.md) — files bug reports
- [`review-bug` SKILL.md](../../skills/review-bug/SKILL.md) — fix-readiness review (completeness, reproducibility, duplicate/stale scans)
- [`develop-bug` SKILL.md](../../skills/develop-bug/SKILL.md) — end-to-end bug-fix orchestrator (review → fix → verify → close)

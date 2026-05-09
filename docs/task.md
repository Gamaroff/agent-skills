# Task Documents

Reference for projects using `develop-task`. Covers the required directory layout, frontmatter schema, status rules, and auto-generated artifacts.

Use `create-task` to produce a task document. Use `develop-task` (or `develop`) to run the full implementation pipeline.

---

## Directory Layout

Each task lives in its own directory under `docs/development/tasks/`:

```
docs/development/tasks/
└── task.{N}.{name}/
    ├── task.{N}.{name}.md                       # main document (human-authored)
    ├── task.{N}.plan.{name}.md                  # implementation plan
    ├── task.{N}.review.{YYYY-MM-DD}.md          # review report (auto)
    ├── task.{N}.implementation.{N}.{name}.md    # pipeline report (auto)
    ├── task.{N}.qa.{N}.{name}.md                # QA assessment (auto)
    ├── task.{N}.dod.{N}.{name}.md               # definition of done (auto)
    └── task.{N}.gate.{N}.{name}.yml             # QA gate decision (auto)
```

The base path `docs/development/tasks/` is fixed — there is no configuration key to override it.

---

## File Naming

- Structural segments separated by dots: `task.17.cache-lib-simplification.md`
- Descriptive name uses hyphens, all lowercase: `cache-lib-simplification`
- Never use underscores or camelCase in the descriptive segment
- Directory name matches the filename stem exactly (no extension)

See [conventions.md](./conventions.md) for the full naming pattern reference.

---

## Frontmatter Schema

```yaml
---
id: task.17
title: "Descriptive task title"
type: task
category: refactoring
status: draft
priority: High
assignee: TBD
created: 2026-01-15
updated: 2026-01-15
---
```

| Field | Type | Required | Values / Notes |
|---|---|---|---|
| `id` | string | Yes | `task.N` — integer ID unique across the project |
| `title` | string | Yes | Human-readable title |
| `type` | literal | Yes | Must be exactly `task` |
| `category` | enum | Yes | `refactoring`, `infrastructure`, `documentation`, `testing`, `other` |
| `status` | enum | Yes | See [Status Lifecycle](#status-lifecycle) |
| `priority` | enum | Yes | `Critical`, `High`, `Medium`, `Low` |
| `assignee` | string | Yes | `TBD` or a name |
| `created` | ISO date | Yes | `YYYY-MM-DD` |
| `updated` | ISO date | Yes | `YYYY-MM-DD` — update on every change |
| `risk_level` | enum | Optional | `high`, `medium`, `low` — triggers the high-risk gate in the pipeline |
| `effort` | string | Optional | Free text estimate, e.g. `~0.5 day` |
| `depends_on` | string | Optional | `task.N` — blocks pipeline if the dependency is not `accepted` |
| `github_issue` | integer | Optional | Linked GitHub issue number |
| `jira_key` | string\|null | Optional | `PROJ-123` or `null` — pipeline skips Jira ops when absent |
| `jira_url` | string\|null | Optional | Full Jira URL or `null` |
| `pr_number` | integer | Optional | Set by pipeline after PR creation — do not set manually |
| `completed_date` | ISO date | Optional | Set by `finalise` when status reaches `accepted` |
| `source_plan` | string | Optional | Path to an upstream plan file, for traceability |

---

## Status Lifecycle

```
draft → planned → ready-for-development → in-progress → ready-for-review → accepted
```

`cancelled` is reachable from any non-terminal state.

| Frontmatter value | Body label | Set by | Precondition |
|---|---|---|---|
| `draft` | `Draft` | `create-task` | Initial state |
| `planned` | `Planned` | Author or `create-task` | Author confirms draft is complete |
| `ready-for-development` | `Ready for Development` | `review-task` | Review passes |
| `in-progress` | `In Progress` | `develop` | Was `ready-for-development` |
| `ready-for-review` | `Ready for Review` | `develop` | All Implementation Plan phases checked off |
| `accepted` | `Accepted` | `finalise` | DoD passed, QA gate PASS or WAIVED |
| `cancelled` | `Cancelled` | Human or any skill | Manual decision — terminal state |

**Sync rule**: frontmatter `status:` uses `lowercase-kebab-case`; the `**Status:**` line in the document body uses `Title Case`. Both must be updated in the same edit. The `finalise` skill enforces this and will fail the DoD check if they diverge.

---

## Required Document Sections

`create-task` produces a document with these 11 sections. `review-task` validates all are present and substantive:

1. Overview
2. Motivation
3. Technical Background
4. Scope
5. Breaking Changes
6. Implementation Plan
7. Files Summary
8. Testing Strategy
9. Success Criteria
10. Risk Assessment
11. Rollback Plan

The **Implementation Plan** section must contain a checkbox list. `develop-task` tracks progress by counting checked vs unchecked items across pipeline iterations.

---

## Co-located Artifacts

These files are generated automatically by skills during the pipeline. Do not create or modify them manually (gate files are owned exclusively by QA skills):

| Artifact | Pattern | Written by | Purpose |
|---|---|---|---|
| Plan file | `task.{N}.plan.{name}.md` | `create-task` | Detailed implementation guide |
| Review report | `task.{N}.review.{YYYY-MM-DD}.md` | `review-task` (Step 2) | Review findings |
| Implementation report | `task.{N}.implementation.{N}.{name}.md` | `develop-task` pipeline | Pipeline run record |
| QA report | `task.{N}.qa.{N}.{name}.md` | `qa-review` (Step 5) | QA assessment narrative |
| Definition of Done | `task.{N}.dod.{N}.{name}.md` | `finalise` (Step 7) | DoD checklist outcome |
| QA gate | `task.{N}.gate.{N}.{name}.yml` | `qa-review` / `qa-gate` | Machine-readable gate decision — **never modified by dev skills** |

---

## skills-config.yaml

Task path resolution is fixed (`docs/development/tasks/`). These keys affect pipeline behaviour:

```yaml
devLoadAlwaysFiles:
  - docs/architecture/concepts/coding-standards.md   # loaded at pipeline start

devDebugLog: .ai/debug-log.md   # optional pipeline debug log
```

Full configuration reference: [conventions.md](./conventions.md).

---

## Prerequisites Checklist

Before running `develop-task`, verify:

- [ ] Task file exists at `docs/development/tasks/task.{N}.{name}/task.{N}.{name}.md`
- [ ] `status:` is `draft`, `planned`, or `ready-for-development` (any other value halts the pipeline)
- [ ] Implementation Plan has at least one unchecked item
- [ ] Frontmatter `status:` and body `**Status:**` are in sync
- [ ] If `depends_on` is set, the dependency task is `accepted`

---

## Invocation

```
/develop docs/development/tasks/task.17.cache-lib-simplification/
/develop task.17.cache-lib-simplification.md
/develop #297    # GitHub issue number
```

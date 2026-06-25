# Task Documents

> **Audience:** anyone authoring or generating standalone technical task documents in a project that uses these skills.

Schema and conventions for task markdown files consumed by `create-task`, `review-task`, and `develop-task`.

## Purpose

A task is a standalone unit of technical work — refactor, infrastructure change, tooling, cleanup, migration — that does not need a PRD or epic. Tasks are tracked individually in the [task registry](#task-registry).

## Directory layout

```
docs/tasks/
└── task.{N}.{name}/
    ├── task.{N}.{name}.md                       # main document (human-authored)
    ├── task.{N}.plan.{name}.md                  # implementation plan
    ├── task.{N}.review.{N}.{name}.md            # review report (auto)
    ├── task.{N}.implementation.{N}.{name}.md    # pipeline report (auto)
    ├── task.{N}.qa.{N}.{name}.md                # QA assessment (auto)
    ├── task.{N}.dod.{N}.{name}.md               # definition of done (auto)
    └── task.{N}.gate.{N}.{name}.yml             # QA gate decision (auto)
```

The base path `docs/tasks/` is fixed — no configuration key overrides it.

## File naming

See [file naming](./file-naming.md). Pattern: `task.{N}.{name}.md`. Directory stem matches.

## Frontmatter schema

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
| `status` | enum | Yes | See [status lifecycle](./status-lifecycle.md) |
| `priority` | enum | Yes | `Critical`, `High`, `Medium`, `Low` |
| `assignee` | string | Yes | `TBD` or a name |
| `created` | ISO date | Yes | `YYYY-MM-DD` |
| `updated` | ISO date | Yes | `YYYY-MM-DD` — update on every change |
| `risk_level` | enum | Optional | `high`, `medium`, `low` — triggers the high-risk gate |
| `code_review_blocking` | boolean | Optional | `true` makes high-confidence correctness bugs from the QA diff code review gate-blocking (appended to the QA gate's `top_issues[]`). Absent / `false`: code-review findings stay advisory. See [`qa-task`](../../skills/qa-task/SKILL.md) Step 3b |
| `estimated_effort_hours` | number | Optional | Estimated dev hours. Synced to Jira `timetracking.originalEstimate` and the GitHub Projects v2 `Estimate` number field. Captured at create time, surfaced as a LOW review gap if missing |
| `effort` | string | Optional | Deprecated free-text estimate, e.g. `~0.5 day`. New tasks should use `estimated_effort_hours` instead |
| `depends_on` | string | Optional | `task.N` — blocks pipeline if the dependency is not `accepted` |
| `github_issue` | integer | Optional | Linked GitHub issue number |
| `jira_key` | string\|null | Optional | `PROJ-123` or `null` |
| `jira_url` | string\|null | Optional | Full Jira URL or `null` |
| `pr_number` | integer | Optional | Set by pipeline after PR creation — do not set manually |
| `completed_date` | ISO date | Optional | Set by `finalise` when status reaches `accepted` |
| `source_plan` | string | Optional | Path to an upstream plan file, for traceability |

## Required body sections

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

## Co-located artifacts

| Artifact | Pattern | Written by | Purpose |
|---|---|---|---|
| Plan file | `task.{N}.plan.{name}.md` | `create-task` | Detailed implementation guide |
| Review report | `task.{N}.review.{N}.{name}.md` | `review-task` (Step 2) | Review findings |
| Implementation report | `task.{N}.implementation.{N}.{name}.md` | `develop-task` pipeline | Pipeline run record |
| QA report | `task.{N}.qa.{N}.{name}.md` | `qa-task` (Step 5) | QA assessment narrative |
| Definition of Done | `task.{N}.dod.{N}.{name}.md` | `finalise` (Step 7) | DoD checklist outcome |
| QA gate | `task.{N}.gate.{N}.{name}.yml` | `qa-task` / `qa-gate` | Machine-readable gate decision — **never modified by dev skills** |

## Status lifecycle

> The canonical lifecycle lives at [`status-lifecycle.md`](./status-lifecycle.md). The table below is the **task-specific subset** showing which skill sets which status — same enum, scoped to this document type.

| Frontmatter value | Set by | Precondition |
|---|---|---|
| `draft` | `create-task` | Initial state |
| `ready-for-development` | `review-task` | Review passes |
| `in-progress` | `develop` | Was `ready-for-development` |
| `ready-for-review` | `develop` | All Implementation Plan phases checked off |
| `accepted` | `finalise` | DoD passed, QA gate PASS or WAIVED |

## Task registry

`docs/tasks/task-registry.md` is the single source of truth for task numbering and status. Rules:

- Read **Next Available Task Number** before running `create-task` — that's your `task.{N}`.
- The new registry row is committed atomically with the new task files.
- Task numbers are **globally unique and never reused**, even after cancellation.

## Prerequisites checklist

Before running `develop-task`, verify:

- [ ] Task file exists at `docs/tasks/task.{N}.{name}/task.{N}.{name}.md`
- [ ] `status:` is `draft`, `planned`, or `ready-for-development`
- [ ] Implementation Plan has at least one unchecked item
- [ ] Frontmatter `status:` and body `**Status:**` are in sync
- [ ] If `depends_on` is set, the dependency task is `accepted`

## Invocation

```
/develop docs/tasks/task.17.cache-lib-simplification/
/develop task.17.cache-lib-simplification.md
/develop #297    # GitHub issue number
```

## See also

- [Status lifecycle](./status-lifecycle.md)
- [File naming](./file-naming.md)
- [Configuration](../reference/configuration.md)
- [Task Development Runbook](../runbooks/task-development.md)
- [`create-task` SKILL.md](../../skills/create-task/SKILL.md)
- [`develop-task` SKILL.md](../../skills/develop-task/SKILL.md)

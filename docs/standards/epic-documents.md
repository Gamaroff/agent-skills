# Epic Documents

> **Audience:** anyone authoring or generating epic documents in a project that uses these skills.

Schema and conventions for epic markdown files consumed by `create-epic`, `review-epic`, and the develop-story pipeline.

## Purpose

An epic is a mid-scope work unit nested inside a PRD. It owns 1–N stories and lives on its own long-lived branch (`feature/epic.{N}.{name}`). Epic numbers are globally unique.

## Directory layout

```
docs/prd/
└── {domain}/
    └── {feature}/
        └── epics/
            └── epic.{N}.{name}/
                ├── epic.{N}.{name}.md      # main document
                └── stories/                # child stories
```

`{N}` is assigned by the [epic registry](./epic-registry.md).

## File naming

See [file naming](./file-naming.md). Pattern: `epic.{N}.{name}.md`. Directory stem matches.

## Frontmatter schema

```yaml
---
epic_number: 178
title: "Feature UI"
type: epic
domain: auth
status: in-progress
priority: High
created: 2026-01-10
updated: 2026-01-15
---
```

| Field | Type | Required | Values / Notes |
|---|---|---|---|
| `epic_number` | integer | Yes | Globally unique — register in [epic registry](./epic-registry.md) |
| `title` | string | Yes | Human-readable title |
| `type` | literal | Yes | Must be exactly `epic` |
| `domain` | string | Yes | Path segment matching the directory (e.g. `auth`, `billing`) |
| `status` | enum | Yes | See [status lifecycle](./status-lifecycle.md) |
| `priority` | enum | Yes | `Critical`, `High`, `Medium`, `Low` |
| `created` | ISO date | Yes | `YYYY-MM-DD` |
| `updated` | ISO date | Yes | `YYYY-MM-DD` — update on every change |
| `estimated_stories` | integer | Optional | Planned story count |
| `prd_source` | string | Optional | Source PRD filename |
| `github_issue` | integer | Optional | Linked GitHub issue number |
| `jira_key` | string\|null | Optional | `PROJ-123` or `null` |
| `jira_url` | string\|null | Optional | Full Jira URL or `null` |

## Status lifecycle

See [`status-lifecycle.md`](./status-lifecycle.md). Epic status reflects the rolled-up state of its stories — `finalise` does not auto-advance epic status; it's set by the human or by a higher-level skill when all stories are accepted.

## Invocation

- Author: `/create-epic`
- Review: `/review-epic <epic-path>`

## See also

- [Epic registry](./epic-registry.md)
- [Story documents](./story-documents.md)
- [Story Development Runbook](../runbooks/story-development.md) — Phase B
- [`create-epic` SKILL.md](../../skills/create-epic/SKILL.md)
- [`review-epic` SKILL.md](../../skills/review-epic/SKILL.md)

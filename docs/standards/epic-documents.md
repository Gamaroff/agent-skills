# Epic Documents

> **Audience:** anyone authoring or generating epic documents in a project that uses these skills.

Schema and conventions for epic markdown files consumed by `create-epic`, `review-epic`, and the develop-story pipeline.

## Purpose

An epic is a mid-scope work unit nested inside a PRD. It owns 1–N stories. Epic numbers are globally unique.

An epic is an **organisational construct, not a git branch** — by default its stories are cut from `develop` and merge back into `develop` independently. An epic whose stories are meaningless apart may opt into a long-lived integration branch by declaring `branch_model: epic-integration` in its frontmatter; see [Story documents § Branch strategy](./story-documents.md#branch-strategy).

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
description: "One-sentence summary of what this epic delivers."
tags: [auth, ui]
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
| `type` | literal | Yes | Must be exactly `epic` (OKF `type` — the one hard requirement) |
| `description` | string | Recommended | One-sentence summary (OKF `description`) — what consumers and agents index on |
| `tags` | list | Optional | Short strings for cross-cutting categorization (OKF `tags`) |
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
| `resource` | string | Optional | Canonical URI (OKF `resource`). For epics, `github_url`/`jira_url` already serve this; set explicitly only to override |

> **OKF mapping:** `updated` (ISO 8601) is this repo's OKF `timestamp`; the tracker URL (`github_url`/`jira_url`) is OKF `resource`. Full conformance + field mapping: [`open-knowledge-format.md`](../../shared/resources/open-knowledge-format.md).

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

# Epic Documents

> **Audience:** anyone authoring or generating epic documents in a project that uses these skills.

Schema and conventions for epic markdown files consumed by `create-epic`, `review-epic`, and the develop-story pipeline.

## Purpose

An epic is a mid-scope work unit nested inside a PRD, and every epic has one — an epic with no PRD is not allowed. It owns 1–N stories. Its id is `epic.{P}.{E}`: `P` is its PRD's number and `E` counts epics **within that PRD**, so `epic.1.2` and `epic.2.2` are different epics.

An epic is an **organisational construct, not a git branch** — by default its stories are cut from `develop` and merge back into `develop` independently. An epic whose stories are meaningless apart may opt into a long-lived integration branch by declaring `branch_model: epic-integration` in its frontmatter; see [Story documents § Branch strategy](./story-documents.md#branch-strategy).

## Directory layout

```
docs/prd/
└── {domain}/
    └── prd.{P}.{feature}/
        └── epics/
            └── epic.{P}.{E}.{name}/
                ├── epic.{P}.{E}.{name}.md  # main document
                └── stories/                # child stories
```

`E` is the highest epic number under PRD `P` plus 1 (`doc-id.js next epic --prd-dir …`). A gap left
by a deleted epic is never refilled, but no registry or counter allocates `E`, so deleting the
highest-numbered epic frees its number again.

> **Adopted (2026-10-16, tasks 202–207).** Every skill writes and reads this scheme through `doc-id.js` (tasks 204–206), and two CI tests hold it (task 207): `doc-numbering-corpus.test.mjs` fails on any unnumbered, mismatched, unregistered or duplicate document under the PRD root, and `doc-id-chokepoint.test.js` fails on an id parsed anywhere but `doc-id.js`. A legacy flat-numbered tree is migrated with `migrate-doc-numbering.mjs` — whole, or incrementally one PRD at a time with `--prd <path-to-prd-doc>` (repeatable), so a project can upgrade before it migrates; `doc-id.js parseLegacy` reads the old shapes only for that migration.


## File naming

See [file naming](./file-naming.md). Pattern: `epic.{P}.{E}.{name}.md`; `{name}` begins with a letter. Directory stem matches.

## Frontmatter schema

```yaml
---
prd_number: 1
epic_number: 2
prd_source: web/prd.1.feature-ui/prd.1.feature-ui.md
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
| `prd_number` | integer | Yes | `P` — the parent PRD's number; equals the filename's first number |
| `epic_number` | integer | Yes | `E` — unique **within its PRD**; equals the filename's second number |
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
| `prd_source` | string | **Yes** | The parent PRD document — an epic with no PRD is not allowed |
| `github_issue` | integer | Optional | Linked GitHub issue number |
| `jira_key` | string\|null | Optional | `PROJ-123` or `null` |
| `jira_url` | string\|null | Optional | Full Jira URL or `null` |
| `resource` | string | Optional | Canonical URI (OKF `resource`). For epics, `github_url`/`jira_url` already serve this; set explicitly only to override |

> **OKF mapping:** `updated` (ISO 8601) is this repo's OKF `timestamp`; the tracker URL (`github_url`/`jira_url`) is OKF `resource`. Full conformance + field mapping: [`open-knowledge-format.md`](../../shared/resources/open-knowledge-format.md).

## Required body sections

`docs/templates/epic-template.md` produces a document with these level-2 sections, in this order:

1. **Epic Goal** — the outcome the epic delivers
2. **Background & Context** — why now, and what exists already
3. **Epic Description** — scope, in/out, affected systems
4. **Stories Breakdown** — the story overview table and per-story detail
5. **Technical Architecture** — components, data, integration points
6. **Dependencies** — upstream and downstream
7. **Risks & Mitigation**
8. **Testing Strategy**
9. **Definition of Done** — epic-level completion criteria
10. **Estimated Timeline**
11. **Success Metrics**
12. **Resources & References**
13. **Notes & Updates** — free-form notes, containing `### Change Log`

**Change Log** is an append-only table of what changed about the document — four columns (`Date`, `Version`, `Description`, `Author`), newest at the bottom, every entry bumping frontmatter `updated:` in the same edit. In the epic template it is nested as `### Change Log` under `## Notes & Updates`; readers accept H2 or H3 and preserve whichever level they find. When absent it is inserted before `## Notes & Updates`. Spec: [`document-change-log.md`](../../shared/resources/document-change-log.md).

## Status lifecycle

See [`status-lifecycle.md`](./status-lifecycle.md). Epic status reflects the rolled-up state of its stories — `finalise` does not auto-advance epic status; it's set by the human or by a higher-level skill when all stories are accepted.

## Invocation

- Author: `/create-epic`
- Review: `/review-epic <epic-path>`

## See also

- [PRD registry](./prd-registry.md)
- [Epic registry](./epic-registry.md) — the legacy global numbering, retired by task 203
- [Story documents](./story-documents.md)
- [Story Development Runbook](../runbooks/story-development.md) — Phase B
- [`create-epic` SKILL.md](../../skills/create-epic/SKILL.md)
- [`review-epic` SKILL.md](../../skills/review-epic/SKILL.md)

# Story Documents

> **Audience:** anyone authoring or generating story documents in a project that uses these skills.

Schema and conventions for story markdown files consumed by `create-story`, `review-story`, and `develop-story`.

## Purpose

A story is the unit of implementation. One story → one branch → one PR → one QA gate. Stories live nested inside their parent epic's directory.

## Directory layout

```
docs/prd/
└── {domain}/
    └── {feature}/
        └── epics/
            └── epic.{N}.{name}/
                └── stories/
                    └── story.{E}.{S}.{name}/
                        ├── story.{E}.{S}.{name}.md                      # main document (human-authored)
                        ├── story.{E}.{S}.plan.{name}.md                 # story plan
                        ├── story.{E}.{S}.review.{N}.{name}.md           # review report (auto)
                        ├── story.{E}.{S}.implementation.{N}.{name}.md   # pipeline report (auto)
                        ├── story.{E}.{S}.qa.{N}.{name}.md               # QA assessment (auto)
                        ├── story.{E}.{S}.dod.{N}.{name}.md              # definition of done (auto)
                        └── story.{E}.{S}.gate.{N}.{name}.yml            # QA gate decision (auto)
```

**Example**:
```
docs/prd/auth/login-flow/epics/epic.178.feature-ui/stories/story.178.1.login-form/story.178.1.login-form.md
```

Nested story layout is a [fixed convention](../reference/configuration.md#fixed-conventions-not-configurable) — flat layouts are not supported.

## File naming

See [file naming](./file-naming.md). Pattern: `story.{E}.{S}.{name}.md`. Directory stem matches.

## Frontmatter schema

```yaml
---
epic: epic.178.feature-ui
title: "Login form validation"
type: story
status: ready-for-development
priority: High
assignee: TBD
created: 2026-01-12
updated: 2026-01-15
---
```

| Field | Type | Required | Values / Notes |
|---|---|---|---|
| `epic` | string | **YES — HARD GATE** | Must match the parent epic's directory stem, e.g. `epic.178.feature-ui`. Pipeline **HALTS** immediately if absent |
| `title` | string | Yes | Human-readable title |
| `type` | literal | Yes | Must be exactly `story` |
| `status` | enum | Yes | See [status lifecycle](./status-lifecycle.md) |
| `priority` | enum | Yes | `High`, `Medium`, `Low` |
| `assignee` | string | Yes | `TBD` or a name |
| `created` | ISO date | Yes | `YYYY-MM-DD` |
| `updated` | ISO date | Yes | `YYYY-MM-DD` — update on every change |
| `risk_level` | enum | Optional | `high`, `medium`, `low` — triggers the high-risk gate |
| `github_issue` | integer | Optional | Linked GitHub issue number |
| `jira_key` | string\|null | Optional | `PROJ-123` or `null` — pipeline creates one if tracker is Jira and this is absent |
| `jira_url` | string\|null | Optional | Full Jira URL or `null` |

## Co-located artifacts

These files are generated automatically by skills during the pipeline. Do not create or modify them manually (gate files are owned exclusively by QA skills):

| Artifact | Pattern | Written by | Purpose |
|---|---|---|---|
| Plan file | `story.{E}.{S}.plan.{name}.md` | `create-story` | Story implementation guide |
| Review report | `story.{E}.{S}.review.{N}.{name}.md` | `review-story` (Step 2) | Review findings |
| Implementation report | `story.{E}.{S}.implementation.{N}.{name}.md` | `develop-story` pipeline | Pipeline run record |
| QA report | `story.{E}.{S}.qa.{N}.{name}.md` | `qa-story` (Step 5) | QA assessment narrative |
| Definition of Done | `story.{E}.{S}.dod.{N}.{name}.md` | `finalise` (Step 7) | DoD checklist outcome |
| QA gate | `story.{E}.{S}.gate.{N}.{name}.yml` | `qa-story` / `qa-gate` | Machine-readable gate decision — **never modified by dev skills** |

## Status lifecycle

> The canonical lifecycle lives at [`status-lifecycle.md`](./status-lifecycle.md). The table below is the **story-specific subset** showing which skill sets which status — same enum, scoped to this document type.

| Frontmatter value | Set by | Precondition |
|---|---|---|
| `draft` | `create-story` | Initial state |
| `ready-for-development` | `review-story` | Review passes |
| `in-progress` | `develop` | Was `ready-for-development` |
| `ready-for-review` | `develop` | All acceptance criteria / tasks checked off |
| `accepted` | `finalise` | DoD passed, QA gate PASS or WAIVED |

## Branch strategy

`develop-story` manages branches automatically:

| Branch | Pattern | Created from | PR targets |
|---|---|---|---|
| Epic branch | `feature/epic.{N}.{name}` | `develop` (on first story) | `develop` (merged manually when all stories done) |
| Story branch | `feature/story.{E}.{S}.{name}` | Epic branch | Epic branch |

Story PRs target the parent **epic branch**, not `develop`.

## Prerequisites checklist

Before running `develop-story`, verify:

- [ ] Story file exists at the correct nested path under `docs/prd/`
- [ ] `epic:` frontmatter is set and matches an actual epic directory stem
- [ ] Parent epic file exists
- [ ] Story lives at the nested path under `docs/prd/` (fixed convention)
- [ ] `status:` is `draft`, `planned`, or `ready-for-development`
- [ ] Frontmatter `status:` and body `**Status:**` are in sync

## Invocation

```
/develop docs/prd/auth/login-flow/epics/epic.178.feature-ui/stories/story.178.1.login-form/
/develop story.178.1.login-form.md
/develop #297    # GitHub issue number
```

## See also

- [Epic documents](./epic-documents.md)
- [Status lifecycle](./status-lifecycle.md)
- [File naming](./file-naming.md)
- [Configuration](../reference/configuration.md)
- [Story Development Runbook](../runbooks/story-development.md)
- [`create-story` SKILL.md](../../skills/create-story/SKILL.md)
- [`develop-story` SKILL.md](../../skills/develop-story/SKILL.md)

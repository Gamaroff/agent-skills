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

Nested story layout under `${PRD_ROOT}` is a [fixed convention](../reference/configuration.md#configurable-roots-and-fixed-conventions) — flat layouts are not supported. The PRD root itself is configurable (default `docs/prd`).

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
| `type` | literal | Yes | Must be exactly `story` (OKF `type` — the one hard requirement) |
| `description` | string | Recommended | One-sentence summary (OKF `description`) — what consumers and agents index on |
| `tags` | list | Optional | Short strings for cross-cutting categorization (OKF `tags`) |
| `status` | enum | Yes | See [status lifecycle](./status-lifecycle.md) |
| `priority` | enum | Yes | `High`, `Medium`, `Low` |
| `assignee` | string | Yes | `TBD` or a name |
| `created` | ISO date | Yes | `YYYY-MM-DD` |
| `updated` | ISO date | Yes | `YYYY-MM-DD` — update on every change |
| `risk_level` | enum | Optional | `high`, `medium`, `low` — triggers the high-risk gate |
| `code_review_blocking` | boolean | Optional | Controls whether high-confidence correctness bugs from the QA diff code review gate the build (appended to the QA gate's `top_issues[]` → fixed in the qa-fix loop). **Under `/develop-story` this is ON by default** (the pipeline passes a run-level override); set `false` to opt this story **out** (escape hatch). Standalone `/qa-story`: absent → advisory, `true` → blocking. See [`qa-story`](../../skills/qa-story/SKILL.md) Phase 1.6 |
| `estimated_effort_hours` | number | Optional | Estimated dev hours. Synced to Jira `timetracking.originalEstimate` (and, when configured via [`jira.devEstimateField`](../reference/configuration.md#jira-estimate-field), a Jira custom field) and the GitHub Projects v2 `Estimate` number field. Captured at create time, surfaced as a LOW review gap if missing |
| `sign_off_roles` | list | Optional | Per-story override of the `skills-config.yaml` sign-off roster, e.g. `[CTO, Tech Lead, Design (optional)]`. Replaces the config roster for this story only; `[]` means no signatures required. Read once, at creation — after that the table in the document is authoritative. See [`sign-off.md`](../../shared/resources/sign-off.md) |
| `github_issue` | integer | Optional | Linked GitHub issue number |
| `jira_key` | string\|null | Optional | `PROJ-123` or `null` — pipeline creates one if tracker is Jira and this is absent |
| `jira_url` | string\|null | Optional | Full Jira URL or `null` |
| `resource` | string | Optional | Canonical URI (OKF `resource`). For stories, `github_url`/`jira_url` already serve this; set explicitly only to override |

> **OKF mapping:** `updated` (ISO 8601) is this repo's OKF `timestamp`; the tracker URL (`github_url`/`jira_url`) is OKF `resource`. Full conformance + field mapping: [`open-knowledge-format.md`](../../shared/resources/open-knowledge-format.md).

## Section ownership

Stories have distinct sections owned by distinct roles. `create-story` writes the planning sections; the developer fills in the implementation record during `develop-story`; QA owns its own section.

| Section | Owner | Notes |
|---|---|---|
| Status | `create-story` until `develop-story` takes over | Drives the status lifecycle |
| Story statement (As a… I want… So that…) | `create-story` | Locked after review |
| Acceptance Criteria | `create-story` | Locked after review |
| Tasks / Subtasks | `create-story` | Dev may add subtasks during implementation |
| Dev Notes (extracted context) | `create-story` | Anti-hallucination: every claim sourced |
| Testing guidance | `create-story` | |
| Stakeholder Sign-off | `create-story` scaffolds the roles; **humans sign** | Only when `sign-off.enabled: true`. Agents never write a Signature or Date cell. Sits between Dev Notes and Change Log. Never synced to a tracker. See [`sign-off.md`](../../shared/resources/sign-off.md) |
| Dev Agent Record (model, completion notes, file list) | `develop-story` (developer) | Append-only during implementation |
| QA Results | `qa-story` / `qa-gate` | Never modified by dev skills |

The role identifier `scrum-master` appears in legacy template metadata (`owner: scrum-master`) and historical Change Logs — it refers to the story-authoring role now performed by `create-story`. New tooling should reference `create-story` directly.

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

`develop-story` and `create-branch` **ask** which base to use — they never decide silently. Two models are always on the menu:

| Model | Story branch | Created from | PR targets | Reaches `develop` |
|---|---|---|---|---|
| **Develop-direct** (default) | `feature/story.{E}.{S}.{name}` | `develop` | `develop` | per story, continuously |
| **Epic integration** (opt-in) | `feature/story.{E}.{S}.{name}` | `epic/{N}.{slug}` | `epic/{N}.{slug}` | once, when the epic branch is merged by hand |

Which one is *recommended* in the prompt comes from the parent epic's frontmatter — but the other option is always selectable:

```yaml
branch_model: epic-integration      # ⇒ epic/{N}.{slug} leads, "develop" still offered
integration_branch: "epic/178.feature-ui"   # optional — used verbatim when present
```

Absent, or `branch_model: develop-direct` ⇒ `develop` leads and the integration branch is offered last, unrecommended. Set `branching.epicIntegration.offerWhenUndeclared: false` in `skills-config.yaml` to drop that trailing option entirely.

Choose epic integration only when the epic's stories are meaningless apart — a workspace foundation, a migration, a compliance boundary — where a partial landing on `develop` is worse than no landing. Long-lived integration branches drift, defer integration, and end in a big-bang merge; `develop` is the default for a reason. Nothing automates the final `epic/{N}.{slug}` → `develop` promotion: raise that PR by hand.

> `epic/{N}.{name}` (integration branch) is **not** `feature/epic.{N}.{name}` (an ordinary short-lived branch for editing the epic *document*, which `/review-epic` creates). Do not substitute one for the other.

**Q1 and Q2 must agree.** Basing a story on `epic/178.feature-ui` and then targeting `develop` produces a PR whose diff includes every earlier story in the epic.

Full option-by-option behaviour: [`create-branch/SKILL.md`](../../skills/create-branch/SKILL.md) Step 2b–3. Config keys: [Configuration](../reference/configuration.md).

## Prerequisites checklist

Before running `develop-story`, verify:

- [ ] Story file exists at the correct nested path under `docs/prd/`
- [ ] `epic:` frontmatter is set and matches an actual epic directory stem
- [ ] Parent epic file exists
- [ ] Story lives at the nested path under `${PRD_ROOT}` (default `docs/prd/`; configurable)
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
- [Pipeline artifacts](../reference/pipeline-artifacts.md) — which step writes each co-located file
- [Configuration](../reference/configuration.md)
- [Story Development Runbook](../runbooks/story-development.md)
- [`create-story` SKILL.md](../../skills/create-story/SKILL.md)
- [`develop-story` SKILL.md](../../skills/develop-story/SKILL.md)

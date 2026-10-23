# PRD Documents

> **Audience:** anyone authoring or generating PRDs in a project that uses these skills.

Schema and conventions for PRD (Product Requirements Document) files consumed by `create-prd`, `new-product-prd`, `review-prd`, and `shard-prd`.

## Purpose

A PRD frames a feature area. It is the parent of one or more [epics](./epic-documents.md), which in turn parent one or more [stories](./story-documents.md). PRDs are authored interactively (section-by-section elicitation), reviewed against the actual codebase, and optionally sharded when large.

## Directory layout

```
docs/prd/
├── prd-registry.md                  # allocates P — see prd-registry.md
└── {domain}/
    └── prd.{P}.{feature}/
        ├── prd.{P}.{feature}.md     # main document
        └── epics/
            └── epic.{P}.{E}.{name}/ # see epic-documents.md
```

> **Adopted (2026-10-16, tasks 202–207).** `create-prd`, `review-prd` and `shard-prd` write and check this scheme (task 204), and epics and stories follow it (tasks 205, 206). A legacy PRD (`prd.{feature}`, no `prd_number`) is reported by `review-prd` as Critical and migrated with `migrate-doc-numbering.mjs` — the whole tree, or incrementally one PRD at a time with `--prd <path-to-prd-doc>` (repeatable).

When sharded, the body splits across files in `prd.{P}.{feature}/` per level-2 section. The pipeline locates epics at `${PRD_ROOT}/{domain}/prd.{P}.{feature}/epics/epic.{P}.{E}.{name}/epic.{P}.{E}.{name}.md`, where `${PRD_ROOT}` is configurable (default `docs/prd`) — see [Configurable roots and fixed conventions](../reference/configuration.md#configurable-roots-and-fixed-conventions).

## File naming

- Directory: `prd.{P}.{feature}` — `P` is the PRD number from the [PRD registry](./prd-registry.md), globally unique and never reused; `{feature}` is kebab-case, all lowercase, and begins with a letter.
- Main PRD file: `prd.{P}.{feature}.md` (same name as the parent directory, with `.md` extension).
- Directory segments (`{domain}`) are kebab-case, all lowercase.

## Frontmatter schema

```yaml
---
name: prd.1.onboarding
title: "agent-skills Onboarding & Tutorials"
type: prd
prd_number: 1
description: "One-sentence summary of the feature area this PRD frames."
mode: brownfield
status: draft
version: 0.1.0
created: 2026-05-11
tags: [onboarding, docs]
---
```

| Field | Type | Required | Values / Notes |
|---|---|---|---|
| `name` | string | Yes | `prd.{P}.{feature}` — matches the directory and file stem |
| `prd_number` | integer | Yes | `P` — equals the number in the filename; `doc-id.js check` reports a difference as `frontmatter-mismatch` |
| `title` | string | Yes | Human-readable title |
| `type` | literal | Yes | Must be exactly `prd` (OKF `type` — the one hard requirement) |
| `description` | string | Recommended | One-sentence summary (OKF `description`) — what consumers and agents index on |
| `mode` | literal | Yes | `greenfield` or `brownfield` |
| `status` | enum | Yes | See [status lifecycle](./status-lifecycle.md) |
| `version` | string | Recommended | SemVer of the PRD (e.g. `0.1.0`) |
| `created` | ISO date | Yes | `YYYY-MM-DD` |
| `updated` | ISO date | Optional | `YYYY-MM-DD` — update on every change (this repo's OKF `timestamp`) |
| `tags` | list | Optional | Short strings for cross-cutting categorization (OKF `tags`) |
| `resource` | string | Optional | Canonical URI (OKF `resource`); set explicitly when the PRD maps to an external asset |
| `author` | string | Optional | Authoring role or person |
| `source_plan` | string | Optional | Path to an upstream plan file, for traceability |
| `stepsCompleted` | list | Optional | Elicitation steps completed (set by `create-prd`/`new-product-prd`) |

> **OKF mapping:** `updated` (or `created` when `updated` is absent) is this repo's OKF `timestamp`; an explicit `resource` is OKF `resource`. Full conformance + field mapping: [`open-knowledge-format.md`](../../shared/resources/open-knowledge-format.md).

## Body sections (greenfield template)

`create-prd` / `new-product-prd` produces a document with these eight level-2 sections:

1. **Goals and Background Context** — problem statement, target users, business goals, and the nested `### Change Log`
2. **Requirements** — functional + non-functional (numbered FR/NFR), mandatory elicitation
3. **UI Design Goals** — UX vision (when applicable)
4. **Technical Assumptions** — repo structure, languages, deployment, key constraints
5. **Epic List** — high-level epic breakdown
6. **Epic Details** — repeatable section: one expansion per epic
7. **Checklist Results Report** — output of `pm-checklist` validation
8. **Next Steps** — handoffs to UX Expert, Architect

## Body sections (brownfield template)

`create-prd` (brownfield) replaces sections 1–4 with brownfield-specific structure:

1. **Intro Project Analysis and Context** — analyses the existing codebase, and carries the nested `### Change Log`
2. **Requirements** — mandatory elicitation
3. **UI Enhancement Goals** — conditional
4. **Technical Constraints and Integration Requirements** — compatibility, integration points, risk
5. **Epic and Story Structure** — mandatory elicitation
6. **Epic Details** — mandatory per epic

> **Change Log placement.** Unlike epics, stories, and tasks — which carry a top-level `## Change Log` — a PRD keeps its log **nested under §1 as `### Change Log`**, because the `create-doc` engine owns section nesting and the numbered section contract above is asserted against it. The engine reads H2 or H3 with optional numbering (`### 1.5 Change Log`) and preserves whichever level it finds, so no PRD needs restructuring. Spec: [`document-change-log.md`](../../shared/resources/document-change-log.md).

## Templates

- `prd-template` — greenfield (used by `new-product-prd`)
- `brownfield-prd-template` — adding a feature to an existing codebase (used by `create-prd`)

Each template defines its required structure in `resources/*.yaml` and the `create-doc` engine enforces mandatory elicitation per section.

## Status lifecycle

See [`status-lifecycle.md`](./status-lifecycle.md). PRDs typically move `draft → ready-for-development` once `review-prd` and `pm-checklist` pass. They rarely move to `accepted` directly — acceptance happens at the epic/story level downstream.

## Sharding

When a PRD exceeds ~5 epics or ~30 stories, shard it for navigability:

```
/shard-prd <prd-path>
```

`shard-prd` splits the document by level-2 section into separate files in the same `prd.{P}.{feature}/` directory. Shard files carry no `prd.` prefix, so the id checker never mistakes one for a document. Epic creation then proceeds against the sharded files.

## Prerequisites checklist

Before running `create-prd` / `new-product-prd`:

- [ ] PRD number allocated from the [PRD registry](./prd-registry.md) (`doc-id.js next prd`)
- [ ] PRD lives under `${PRD_ROOT}` (default `docs/prd/`; configurable via `prd.prdShardedLocation` — see [Configuration](../reference/configuration.md#configurable-roots-and-fixed-conventions))
- [ ] (Brownfield only) project architecture is documented — see `document-existing-project` SKILL
- [ ] Stakeholder input gathered for goals, requirements, success criteria

Before downstream epic creation:

- [ ] PRD `status:` is `ready-for-development`
- [ ] `pm-checklist` validation has passed
- [ ] `review-prd` review report is resolved

## Invocation

```
/create-prd                          # brownfield (existing codebase)
/new-product-prd                      # new product
/review-prd <prd-path>               # interactive review against codebase
/shard-prd <prd-path>                # split large PRD
```

## See also

- [Story Development Runbook — Phase A](../runbooks/story-development.md#phase-a--product-planning)
- [PRD registry](./prd-registry.md)
- [Epic documents](./epic-documents.md)
- [Story documents](./story-documents.md)
- [Status lifecycle](./status-lifecycle.md)
- [Configuration](../reference/configuration.md)
- [`create-prd` SKILL.md](../../skills/create-prd/SKILL.md)
- [`new-product-prd` SKILL.md](../../skills/new-product-prd/SKILL.md)
- [`review-prd` SKILL.md](../../skills/review-prd/SKILL.md)
- [`shard-prd` SKILL.md](../../skills/shard-prd/SKILL.md)
- [`pm-checklist` SKILL.md](../../skills/pm-checklist/SKILL.md)
- [`prd-template` SKILL.md](../../skills/prd-template/SKILL.md)
- [`brownfield-prd-template` SKILL.md](../../skills/brownfield-prd-template/SKILL.md)

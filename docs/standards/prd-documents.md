# PRD Documents

> **Audience:** anyone authoring or generating PRDs in a project that uses these skills.

Schema and conventions for PRD (Product Requirements Document) files consumed by `create-prd`, `new-product-prd`, `review-prd`, and `shard-prd`.

## Purpose

A PRD frames a feature area. It is the parent of one or more [epics](./epic-documents.md), which in turn parent one or more [stories](./story-documents.md). PRDs are authored interactively (section-by-section elicitation), reviewed against the actual codebase, and optionally sharded when large.

## Directory layout

```
docs/prd/
└── {domain}/
    └── {feature}/
        ├── prd.md                  # main document
        └── epics/
            └── epic.{N}.{name}/    # see epic-documents.md
```

When sharded, the body splits across files in `{feature}/` per level-2 section. The pipeline locates epics at the fixed path `docs/prd/{domain}/{feature}/epics/epic.{N}.{name}/epic.{N}.{name}.md` — see [Fixed conventions](../reference/configuration.md#fixed-conventions-not-configurable).

## File naming

- Top-level PRD: `prd.md` (or sharded section files in the same directory).
- Directory segments (`{domain}`, `{feature}`) are kebab-case, all lowercase.

## Body sections (greenfield template)

`create-prd` / `new-product-prd` produces a document with these eight level-2 sections:

1. **Goals and Background Context** — problem statement, target users, business goals
2. **Requirements** — functional + non-functional (numbered FR/NFR), mandatory elicitation
3. **UI Design Goals** — UX vision (when applicable)
4. **Technical Assumptions** — repo structure, languages, deployment, key constraints
5. **Epic List** — high-level epic breakdown
6. **Epic Details** — repeatable section: one expansion per epic
7. **Checklist Results Report** — output of `pm-checklist` validation
8. **Next Steps** — handoffs to UX Expert, Architect

## Body sections (brownfield template)

`create-prd` (brownfield) replaces sections 1–4 with brownfield-specific structure:

1. **Intro Project Analysis and Context** — analyses the existing codebase
2. **Requirements** — mandatory elicitation
3. **UI Enhancement Goals** — conditional
4. **Technical Constraints and Integration Requirements** — compatibility, integration points, risk
5. **Epic and Story Structure** — mandatory elicitation
6. **Epic Details** — mandatory per epic

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

`shard-prd` splits the document by level-2 section into separate files in the same `{feature}/` directory. Epic creation then proceeds against the sharded files.

## Prerequisites checklist

Before running `create-prd` / `new-product-prd`:

- [ ] PRD lives under `docs/prd/` (fixed convention — see [Configuration](../reference/configuration.md#fixed-conventions-not-configurable))
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

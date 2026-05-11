# PRD Documents

> **Audience:** anyone authoring or generating PRDs in a project that uses these skills.
> **Status of this doc:** stub — full schema to be authored. See [`create-prd` SKILL.md](../../skills/create-prd/SKILL.md) and templates referenced there for the authoritative source until this page is filled in.

## Purpose

A PRD (Product Requirements Document) frames a feature area. It is the parent of one or more [epics](./epic-documents.md), which in turn are the parent of one or more [stories](./story-documents.md).

## Directory layout

```
docs/prd/
└── {domain}/
    └── {feature}/
        ├── prd.md                  # main document
        └── epics/
            └── epic.{N}.{name}/    # see epic-documents.md
```

Sharded PRDs split the body across files in the same `{feature}/` directory — see `shard-prd` SKILL.

## Templates

- `brownfield-prd-template` — adding a feature to an existing codebase
- `prd-template` — greenfield (used by `greenfield-prd`)

## Invocation

- Author: `/create-prd` (brownfield) or `/greenfield-prd`
- Review: `/review-prd <path>`
- Shard: `/shard-prd <path>` (when 5+ epics or 30+ stories)

## See also

- [Story Development Runbook](../runbooks/story-development.md) — Phase A
- [Epic documents](./epic-documents.md)
- [Story documents](./story-documents.md)
- [`create-prd` SKILL.md](../../skills/create-prd/SKILL.md)
- [`review-prd` SKILL.md](../../skills/review-prd/SKILL.md)
- [`pm-checklist` SKILL.md](../../skills/pm-checklist/SKILL.md)

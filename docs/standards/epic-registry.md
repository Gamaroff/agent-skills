# Epic Registry

> **Audience:** anyone creating an epic in a project that uses these skills.

**Location:** `/docs/development/epic-registry.md` (inside the consuming project).

> **Superseded by per-PRD numbering (2026-10-15, task 202).** Under the hierarchical scheme an epic is
> `epic.{P}.{E}`: `P` comes from the [PRD registry](./prd-registry.md) and `E` counts epics within that
> PRD, so no global epic registry allocates it. This registry still governs the existing
> `epic.{number}` epics until **task 203** migrates them and retires it. Do not add rows for an epic
> created under the new scheme.

The epic registry tracks every epic in a project. Epic numbers are **globally unique** across the project and never reused.

## Purpose

- Assign the next epic number deterministically
- Prevent number conflicts when multiple authors create epics in parallel
- Maintain a single catalogue of every epic and its status

## Rules

- Always check the registry **before** creating an epic.
- The `create-epic` skill delegates number assignment to `epic-registry-manager`, which appends the new row to the registry.
- Commit the registry update **in the same commit** as the new epic file — atomic.
- Cancelled epics keep their number forever. Never recycle.

## See also

- [`create-epic` SKILL.md](../../skills/create-epic/SKILL.md)
- [`epic-registry-manager` SKILL.md](../../skills/epic-registry-manager/SKILL.md)
- [Epic documents](./epic-documents.md) — frontmatter schema for epic files
- [File naming](./file-naming.md)
- [PRD registry](./prd-registry.md) — the registry that replaces this one

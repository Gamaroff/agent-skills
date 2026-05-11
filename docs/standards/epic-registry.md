# Epic Registry

> **Audience:** anyone creating an epic in a project that uses these skills.

**Location:** `/docs/epic-registry.md` (inside the consuming project).

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

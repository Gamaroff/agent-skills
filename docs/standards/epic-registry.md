# Epic Registry (retired)

> **Audience:** anyone looking for where epic numbers come from.

**Retired 2026-10 (tasks 202, 203, 205).** There is no global epic registry and no
`epic-registry-manager` skill. An epic is `epic.{P}.{E}`: `P` is its parent PRD's number, allocated
from the [PRD registry](./prd-registry.md), and `E` counts epics **within that PRD**. A per-PRD
number needs no global counter, so nothing allocates one.

## Why it was retired

- **Two numbers for one epic.** A PRD called its epics "Epic 1", "Epic 2"; the files then got
  unrelated global numbers (`epic.163`). Per-PRD numbering makes the PRD's "Epic 2" and the file
  `epic.{P}.2` the same thing.
- **Allocation by prose.** The registry's "Next Available" counter was reserved by hand in three
  skills, and the procedures disagreed. `doc-id.js next epic --prd-dir <PRD dir>` allocates in code.
- **A shared line to conflict on.** Two branches creating epics under different PRDs no longer touch
  the same file.

## Where to look instead

| Need | Look here |
| --- | --- |
| The next epic number in a PRD | `create-epic` — it runs `doc-id.js next epic --prd-dir <PRD dir>` |
| The epics of one PRD | that PRD's generated `<!-- epics-index -->` block |
| Every epic, and any id defect across the tree | `doc-id.js check --corpus` |
| A PRD number | the [PRD registry](./prd-registry.md) |
| An old epic number's new id | the historical mapping that `migrate-doc-numbering.mjs` (task 203) leaves in a project's `docs/development/epic-registry.md` |

## See also

- [`create-epic` SKILL.md](../../skills/create-epic/SKILL.md) — allocates and names a new epic
- [Epic documents](./epic-documents.md) — frontmatter schema for epic files (`prd_number`, `epic_number`)
- [File naming](./file-naming.md)
- [PRD registry](./prd-registry.md) — the registry that replaces this one

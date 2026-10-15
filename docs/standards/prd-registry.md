# PRD Registry

> **Audience:** anyone creating a PRD in a project that uses these skills.

**Location:** `${PRD_ROOT}/prd-registry.md` (inside the consuming project). `${PRD_ROOT}` defaults to
`docs/prd` and is configurable through `prd.prdShardedLocation` — see
[Configuration](../reference/configuration.md#configurable-roots-and-fixed-conventions).

The PRD registry is the single source of truth for PRD numbering. A PRD number `P` is **globally
unique and never reused**, even after cancellation. It is the first number of every id beneath that
PRD: `prd.{P}.{slug}`, `epic.{P}.{E}.{slug}` and `story.{P}.{E}.{S}.{slug}` (see
[File naming](./file-naming.md)).

> **Interim (2026-10-15, task 202).** The registry's shape and the engine that reads it ship now;
> skills adopt the scheme in tasks 204–206. Until then `create-prd` does not allocate a number, and
> task 203 creates this repository's own registry as part of its migration.

## Format

```markdown
---
type: registry
---

# PRD Registry

**Next Available PRD Number:** **2**

| PRD # | Title | Folder | Status | Created |
|---|---|---|---|---|
| 1 | [Onboarding](onboarding/prd.1.onboarding/prd.1.onboarding.md) | onboarding | accepted | 2026-10-13 |
```

| Column | Holds |
|---|---|
| `PRD #` | `P` — a positive integer, no leading zeros |
| `Title` | A link to the PRD document, relative to the registry: `{domain}/prd.{P}.{slug}/prd.{P}.{slug}.md` |
| `Folder` | The `{domain}` directory the PRD lives in |
| `Status` | The PRD's frontmatter `status:` — see [Status lifecycle](./status-lifecycle.md) |
| `Created` | `YYYY-MM-DD` |

The counter line uses the same bold-in-bold form as the task registry. The selector reads the table
with `parseRegistry(text, "prd", …)` in `skills/develop-next/scripts/select-next.mjs`, which accepts a
`prd.…` link only for this registry kind.

## Rules

Before creating a new PRD:

1. Read **Next Available PRD Number** — that is your `P`. Allocate it with
   `node shared/resources/doc-id.js next prd --json`, which reads the counter and refuses
   (`registry-behind`) when a PRD already on disk or in the table holds a number at or above it.
2. Create `${PRD_ROOT}/{domain}/prd.{P}.{slug}/prd.{P}.{slug}.md` with frontmatter `prd_number: P`.
3. Append a row and increment **Next Available PRD Number**.
4. Commit the registry update **in the same commit** as the new PRD — atomic.

Numbers inside a PRD need no registry: `E` is the highest epic number under that PRD plus 1, and `S`
is the highest story number under that epic plus 1 (`doc-id.js next epic --prd-dir …` /
`next story --epic-dir …`). A deleted number is never handed out again.

**Merge conflicts.** Two branches that each allocate a PRD conflict on the counter line and on
adjacent rows. Keep both rows and set the counter above both. Two branches that each take `next epic`
for the same PRD do not conflict textually; `doc-id.js check --corpus` reports the second as
`duplicate-id`, and the later branch renumbers.

## Checking

`node shared/resources/doc-id.js check --corpus --json` walks `${PRD_ROOT}` and reports, per
document, `bad-shape`, `dir-stem-mismatch`, `frontmatter-mismatch`, `parent-missing`,
`parent-number-mismatch`, `unregistered`, `duplicate-id` and `registry-missing`. Exit 0 is `ok` or
`empty`, 1 is findings, 2 is a usage error.

## See also

- [PRD documents](./prd-documents.md) — PRD layout and frontmatter
- [File naming](./file-naming.md) — the hierarchical id patterns
- [Task registry](./task-registry.md) — the registry this one is modelled on
- [Epic registry](./epic-registry.md) — the global epic registry this scheme supersedes
- [`doc-id.js`](../../shared/resources/doc-id.js) — the parser, allocator and checker

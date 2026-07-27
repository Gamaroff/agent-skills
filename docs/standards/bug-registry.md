# Bug Registry

> **Audience:** anyone filing a general (cross-cutting) bug in a project that uses these skills.

**Location:** `docs/bugs/bug-registry.md` (inside the consuming project).

The bug registry is the single source of truth for **general-bug** numbering and status. General bug
numbers are **globally unique and never reused**, even after a bug is closed or cancelled. It applies
only to general bugs — story and task bugs are numbered per-parent by scanning their own directory
(see [`create-bug-report` SKILL.md](../../skills/create-bug-report/SKILL.md)).

## Rules

Before filing a general bug:

1. Read **Next Available Bug Number** from the registry — that's your `bug.{N}`. If the registry does
   not exist yet, `create-bug-report` bootstraps it (starting at `1`).
2. Run `/create-bug-report` (General Bug mode), which appends a row to the registry table.
3. Increment **Next Available Bug Number**.
4. Commit the registry update **in the same commit** as the new bug files — atomic.

If a merge conflict on the next number occurs, the higher number wins; the loser bumps to the next
free slot.

## Why globally unique

General bugs aren't scoped to a story, task, epic, or feature area — they cut across the project. A
global counter prevents collisions between concurrent authors and keeps `git log`, branch names, and
references unambiguous when a cross-cutting bug is cited across years of history. (Story and task bugs
*are* scoped to their parent, so they use per-parent numbering instead.)

## See also

- [`create-bug-report` SKILL.md](../../skills/create-bug-report/SKILL.md)
- [Bug documents](./bug-documents.md)
- [File naming](./file-naming.md)
- [Task registry](./task-registry.md) — parallel rules for tasks
- [Epic registry](./epic-registry.md) — parallel rules for epics

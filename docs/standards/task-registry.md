# Task Registry

> **Audience:** anyone creating a task in a project that uses these skills.

**Location:** `docs/tasks/task-registry.md` (inside the consuming project).

The task registry is the single source of truth for task numbering and status. Task numbers are **globally unique and never reused**, even after cancellation.

## Rules

Before creating a new task:

1. Read **Next Available Task Number** from the registry — that's your `task.{N}`.
2. Run `/create-task`, which appends a row to the registry table.
3. Increment **Next Available Task Number**.
4. Commit the registry update **in the same commit** as the new task files — atomic.

After completion, `finalise` updates the registry row's status; you don't edit it by hand.

## Why globally unique

Tasks aren't scoped to an epic, PRD, or feature area — they cut across the project. A global counter prevents collisions between concurrent authors and keeps `git log`, branch names, and PR titles unambiguous when work is referenced across years of history.

## See also

- [`create-task` SKILL.md](../../skills/create-task/SKILL.md)
- [`finalise` SKILL.md](../../skills/finalise/SKILL.md)
- [Task documents](./task-documents.md)
- [File naming](./file-naming.md)
- [Epic registry](./epic-registry.md) — parallel rules for epics

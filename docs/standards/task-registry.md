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

After completion:

5. **Tick the row by hand** — set its status to `accepted` and note the merge PR.

`finalise` does **not** do this. It sets the *document's* `status: accepted` and `completed_date`,
and touches no registry. Nothing else writes the row either: `create-task` appends it at creation,
`develop-next` only *reads* it for selection fallback, and no skill updates it afterwards. Until
[task.103](../tasks/task.103.pipeline-owns-the-registry-tick/task.103.pipeline-owns-the-registry-tick.md)
gives the pipeline ownership of that write, ticking the row is a manual step in acceptance.

> **This paragraph previously claimed `finalise` owned the write and told readers not to edit the row
> by hand.** Both halves were wrong, and together they suppressed the only mechanism that worked.
> Seventeen rows (T67–T96) were stale until a sweep on 2026-09-09 — the registry reported 22 open
> tasks when 5 were.
>
> The drift does not stall the pipeline: the selector judges eligibility on the **document's**
> frontmatter, not the registry row, so a stale row cannot cause a finished task to be re-selected.
> That is exactly why it went unnoticed for so long. The cost is borne entirely by human readers, and
> it lands hardest on the one question the registry exists to answer — *how much is left?*

## Why globally unique

Tasks aren't scoped to an epic, PRD, or feature area — they cut across the project. A global counter prevents collisions between concurrent authors and keeps `git log`, branch names, and PR titles unambiguous when work is referenced across years of history.

## See also

- [`create-task` SKILL.md](../../skills/create-task/SKILL.md)
- [`finalise` SKILL.md](../../skills/finalise/SKILL.md)
- [Task documents](./task-documents.md)
- [File naming](./file-naming.md)
- [Epic registry](./epic-registry.md) — parallel rules for epics

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

5. **`/finalise` ticks the row** — it sets the task document's `status: accepted` and, in the same
   step, rewrites the registry row's Status cell to `accepted`. One moment, one writer, so the row
   and the document cannot disagree by construction.

Two things follow from that, and both matter more than they look:

- **The tick happens before the merge, and that is correct.** The Status column mirrors the
  *document's* status, which `/finalise` also sets pre-merge. The row's `Issue`/notes column may
  cite a merge PR that does not exist yet — that column is prose, nothing reads it, and it is not
  what "how much is left?" is answered from.
- **The tick never blocks acceptance.** `registry-tick.js` exits 0 on every outcome, including
  "no row found". A registry row is a human-readable index; refusing to finalise finished work over
  one would trade a cosmetic defect for a stuck pipeline.

**The backstop is a check, not trust.** `evals/shared/tests/task-registry-drift.test.mjs` fails CI
whenever a task document reads `accepted` and its row does not — or the reverse, a row claiming work
is finished that the document says is not. So a write that does not happen, or happens wrong, is
loud rather than silent. If it fires, tick the row by hand; do not disable the check.

Engine: [`shared/resources/registry-tick.js`](../../shared/resources/registry-tick.js), called from
[`finalise`](../../skills/finalise/SKILL.md). A **story** run calls the same CLI and it returns
`not-a-task` without touching any registry — the guard lives in the writer, not in a condition the
caller has to remember.

> **This paragraph previously claimed `finalise` owned the write when it did not, and in the same
> breath told readers not to edit the row by hand.** Both halves were wrong, and together they
> suppressed the only mechanism that was actually working. Seventeen rows (T67–T96) were stale until
> a sweep on 2026-09-09 — the registry reported 22 open tasks when 5 were.
>
> It went unnoticed because it stalls nothing: the selector judges eligibility on the **document's**
> frontmatter, not the row, so a stale row cannot cause a finished task to be re-selected. Nothing
> failed. The cost fell entirely on human readers, on the one question the registry exists to
> answer. That is why the fix is a writer **and** a check — the writer removes the manual step, and
> the check makes its absence loud, since a defect nothing fails on is a defect nobody is told
> about. Delivered by
> [task.103](../tasks/task.103.pipeline-owns-the-registry-tick/task.103.pipeline-owns-the-registry-tick.md).

## Why globally unique

Tasks aren't scoped to an epic, PRD, or feature area — they cut across the project. A global counter prevents collisions between concurrent authors and keeps `git log`, branch names, and PR titles unambiguous when work is referenced across years of history.

## See also

- [`create-task` SKILL.md](../../skills/create-task/SKILL.md)
- [`finalise` SKILL.md](../../skills/finalise/SKILL.md)
- [Task documents](./task-documents.md)
- [File naming](./file-naming.md)
- [Epic registry](./epic-registry.md) — parallel rules for epics

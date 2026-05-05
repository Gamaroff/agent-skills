---
name: review-next-wu-task
description: Finds the next actionable task in the WU task-sequence and dispatches the appropriate skill. Scans task-sequence.md top-to-bottom and picks the first row that is either unreviewed (❌ Review → /review-task) or reviewed but incomplete (✅ Review + non-Done status → /develop-task). First match in document order wins.
copyright: "Copyright (c) 2025 Lorien Gamaroff"
license: MIT
---

# Review Next WU Task

Automates the "find next actionable WU task → dispatch to the right skill" loop.

## When to Use This Skill

- You want to work through the WU migration task backlog systematically
- You don't want to manually open task-sequence.md to find what's next
- You want to keep doing `/review-next-wu-task` until all tasks are reviewed and developed

Natural language triggers:

- "review the next wu task"
- "what's the next task to review?"
- "review next wu"

## Steps

### Step 1 — Find the next actionable task

Read the file:

```
docs/development/tasks/migration/website-unification/task-sequence.md
```

Scan the table rows top-to-bottom. Stop at the **first** row that matches either condition:

- Review = `❌` → Action: run `/review-task`
- Review = `✅` AND Status is **not** `✅` (i.e. Status is ⬜, 🔄, or ⛔) → Action: run `/develop-task`

First match in document order wins — no priority override between the two conditions.

Extract from the matched row:
- **No.** (column 1)
- **WU ID** (column 2)
- **Task title** (column 3)
- **Status** (column 4) — record the symbol and its meaning
- **Review** (column 5) — ✅ or ❌
- **Action** — `review-task` or `develop-task` (derived from the rule above)
- **File path** — use the text inside `[...]` in column 6 (this is the repo-root-relative path)

If **no row matches either priority** (all tasks have ✅ Review and ✅ Status), report: "All WU tasks have been reviewed and developed. Nothing left to do." and stop.

### Step 2 — Report the found task

Output a brief summary before proceeding:

```
Next actionable task:
  No.    : <No.>
  WU ID  : <WU ID>
  Title  : <title>
  Status : <status symbol + meaning>
  Review : <✅ Reviewed | ❌ Not reviewed>
  Action : <review-task | develop-task>
  File   : <file path>
```

### Step 3 — Dispatch to the appropriate skill

**If Action = `review-task`** (Review = ❌):

Call the `review-task` skill with the file path extracted in Step 1.

Pass through any depth flag the user provided (`--quick`, `--thorough`). Default depth is `standard`.

The review-task skill will take over from here and run its full interactive review workflow.

**If Action = `develop-task`** (Review = ✅, Status ≠ ✅):

Call the `develop-task` skill with the file path extracted in Step 1.

The develop-task skill will orchestrate the full end-to-end development pipeline (create-branch → develop → create-pr → qa → finalise → commit-changes) for the task.

## Optional Flags

- `--quick` — passes `review_depth: quick` to review-task (no effect when dispatching to develop-task)
- `--thorough` — passes `review_depth: thorough` to review-task (no effect when dispatching to develop-task)
- `--skip` — skips the found task and finds the *next* one after it (useful if you want to defer a task)

## Notes

- This skill does **not** update the Review or Status columns in task-sequence.md — that is handled by review-task (Step 9) and develop-task respectively
- Run `/review-next-wu-task` again after each skill completes to advance to the next actionable task

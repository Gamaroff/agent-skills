---
name: wu-index
description: Regenerate docs/development/tasks/migration/website-unification/task-index.md by deriving status from each stub's task-doc target (not from stub frontmatter, which may be stale or vestigial since the 2026-04-26 stub-slimming pass). Use this when a task's status field flips, a gate yml lands, a review file is added, or a new follow-up is created. No arguments.
copyright: "Copyright (c) 2025 Lorien Gamaroff"
license: MIT
---

# wu-index

## When to use

Run `/wu-index` to sync `task-index.md` to the current state. Common triggers:

- A `task.{N}.*` doc's `status:` field was changed (e.g. `📋 Planned` → `Ready for Development` → `✅ Completed`)
- A new `task.{N}.gate.*.yml` was written by `/qa-review` (doc-status flips `fleshed` → `reviewed`)
- A new `task.{N}.review.*.md` was added by `/review-task`
- A new follow-up task was created with `wu-ref:` frontmatter (e.g. `WU-P0-01-FOLLOWUP`, `WU-P3-23-FU1`)
- You want to confirm the index is current

## Source of truth (CRITICAL — changed 2026-04-26)

**Per-task status is read from the `task.{N}.*` target, not the stub frontmatter.** As of the stub-slimming pass on 2026-04-26, all stubs whose tasks are reviewed or done have been collapsed to forwarding pointers in `archive/`. Their `doc-status:` / `impl-status:` frontmatter values are vestigial — left in place for backward compatibility, but stale.

The `task-doc:` field in each stub is the only frontmatter field this skill should use to determine status. Read the target file + scan its directory for gate/review artefacts.

## Steps

### 1. Enumerate canonical WU stubs

```bash
ls docs/development/tasks/migration/website-unification/archive/WU-P*.md
```

For each stub, parse its frontmatter to extract: `id`, `phase`, `phase-name`, `title`, `size`, `risk`, `depends-on`, `github-issue`, `task-doc`. **Ignore `doc-status:` and `impl-status:` from the stub** — they're vestigial.

### 2. Enumerate follow-ups (no archive stub)

Follow-up tasks (e.g. `WU-P0-01-FOLLOWUP`, `WU-P3-23-FU1`) live directly under `task.{N}.*/` without an archive stub. Find them:

```bash
grep -lE "^wu-ref: WU-P[0-9]+-[0-9]+(-FOLLOWUP|-FU[0-9]+)" \
  docs/development/tasks/migration/website-unification/task.*/task.*.md \
  | grep -vE "(plan|qa|gate|bug|implementation|review|dod)\." \
  | grep -v archive
```

For each follow-up, parse the task doc's frontmatter to extract: `wu-ref` (use as `id`), derive `phase` from wu-ref prefix (`WU-P3-23-FU1` → phase 3), `title`, `size`, `risk` (default `Medium`/`S` if unspecified), `depends-on` (often the parent WU-ID), `github_issue`. The "task-doc" path is the file itself.

### 3. Derive status from the `task-doc:` target

For each stub or follow-up, locate the task directory:

```bash
task_doc="docs/development/tasks/migration/website-unification/task.99.upgrade-prisma/task.99.upgrade-prisma.md"
task_dir=$(dirname "$task_doc")
gate_present=$(ls "$task_dir"/task.*.gate.*.yml 2>/dev/null | head -1)
review_present=$(ls "$task_dir"/task.*.review.*.md 2>/dev/null | head -1)
task_status=$(grep -E '^status:' "$task_doc" | head -1 | sed 's/^status:[[:space:]]*//' | tr -d '"')
```

Apply mapping:

**doc-status** (in priority order):
- `$gate_present` OR `$review_present` non-empty → `reviewed`
- `$task_doc` exists, neither gate nor review present → `fleshed`
- `$task_doc` missing → `stub` (shouldn't occur post-flesh; flag as anomaly)

**impl-status** (case-insensitive match on `$task_status`):
- matches `/done|completed|accepted/` → `done`
- matches `/in progress|ready for development|in development/` → `in-progress`
- otherwise (e.g. `📋 Planned`) → `not-started`

Strip leading status emojis (✅, 📋, ⏳, etc.) before matching.

### 4. Compute phase progress

For each phase (0–6), count:
- `doc-status` values: stub / fleshed / reviewed
- `impl-status` values: not-started / in-progress / done

Sum across all phases for the **Total** row.

Current phase task counts (as of 2026-04-26):
- Phase 0: 12 + 1 follow-up (WU-P0-01-FOLLOWUP) = 13
- Phase 1: 8
- Phase 2: 12
- Phase 3: 34 + any follow-ups (e.g. WU-P3-23-FU1)
- Phase 4: 9
- Phase 5: 12
- Phase 6: 10 (P6-01..P6-10 — note: an earlier version of this index claimed 9; the actual count is 10 with the REDIS_URL migration P6-10 added)

### 5. Collapse `depends-on` values

For the Blocked By column, collapse runs of consecutive WU-IDs in the same phase:

- `[WU-P4-01, WU-P4-02, WU-P4-03]` → `WU-P4-01..03`
- `[WU-P0-01, WU-P0-03]` (non-consecutive) → `WU-P0-01, WU-P0-03`
- Cross-phase entries → comma-separated list (no collapsing across phases)
- Empty → `—`

### 6. Write `task-index.md`

Output path: `docs/development/tasks/migration/website-unification/task-index.md`

Link targets:
- Canonical stubs: `archive/{filename}` (e.g. `archive/WU-P0-01.md`)
- Follow-ups: `./task.{N}.{slug}/task.{N}.{slug}.md` (direct task-doc path)

Structure:

```markdown
# Task Index — Website Unification

All {N} atomic tasks across 7 phases, plus post-merge follow-ups. Each row links to the local stub file in `archive/` (the original WU-P{phase}-{n} spec, slimmed to a forwarding pointer on 2026-04-26) — implementation work lives in the matching `task.{N}.*/` directory.

Each task has **two independent lifecycle axes** — see the [README status legend](./README.md#status-legend) for definitions and gating rules. The `Blocked By` column lists each task's `depends-on`; a task is unblockable while any blocker is not yet `done`.

**Project board:** [Goji System Migration](https://github.com/orgs/goji-wallet/projects/2)
**Migration docs:** [README](./README.md)

> **Stub paths note:** All `WU-P*.md` stubs were moved into `archive/` on 2026-04-17 (commit `e36ce81fd`) and slimmed to forwarding pointers on 2026-04-26. The stubs retain their frontmatter for tooling but no longer contain spec content — see the linked `task.{N}.*/` doc for the live spec, plan, DoD, gate, and review.

## Phase progress

| Phase | Tasks | Doc (stub / fleshed / reviewed) | Impl (not-started / in-progress / done) |
|---|---|---|---|
| {phase-row} |
| **Total** | **{N}** | **{stub} / {fleshed} / {reviewed}** | **{not-started} / {in-progress} / {done}** |

## All tasks

Sort: by Task ID (which is also rough execution order within each phase). The `Blocked By` column shows true dependency edges — start with tasks whose blockers are all `done`.

| Task ID | Phase | Title | Doc | Impl | Blocked By | Size | Risk | GitHub Issue |
|---|---|---|---|---|---|---|---|---|
| {row} |

---

Generated by `/wu-index`. Status derived from each stub's `task-doc:` target (not stub frontmatter — see "Source of truth" in the skill). Run `/wu-index` after any task-doc status flip, gate, or review.
```

**GitHub Issue cell**: use `—` if missing/null/empty; otherwise the raw URL.

**Title**: strip surrounding quotes from the YAML value. Escape `|` in titles as `\|` to avoid breaking the Markdown table.

**Anomalies**: if any stub's `task-doc:` target is missing, emit a warning row with `doc-status: stub` and `impl-status: not-started`, and print a warning at the end.

### 7. Report

Print a single line:

```
Index updated: {N} tasks | doc {stub}/{fleshed}/{reviewed} | impl {not-started}/{in-progress}/{done}
```

If any anomalies were detected, append:

```
WARNING: {count} stub(s) had missing task-doc targets — see warnings above.
```

---
id: task.197.plan
title: "Implementation Plan: Pipeline entry docs: Phase 0, lite mode and invocation"
type: plan
task-ref: task.197.pipeline-entry-docs-phase-0-and-lite-mode.md
---

# Implementation Plan: Pipeline entry docs: Phase 0, lite mode and invocation

> Requirements and success criteria: [task.197.pipeline-entry-docs-phase-0-and-lite-mode.md](task.197.pipeline-entry-docs-phase-0-and-lite-mode.md)

## Overview

16 findings, each with what the doc says, what the source says, the evidence and the fix, copied from the verified audit (`develop` @ `a0e135a6`). Phase 0 re-checks each one before it is edited.

## Findings by doc

### `docs/concepts/architecture.md`

- [ ] **OVERVIEW-14** (medium, stale) — line 132
  - **Doc says:** Step 1 returns 'epic + story branches ready'; Step 4 'create PR (--base epic branch)'
  - **Source:** Story branches are cut from `develop` and PR back to `develop` by default. An epic branch exists only when the epic opts in to `branch_model: epic-integration`.
  - **Evidence:** skills/develop-story/SKILL.md:3 (description: 'Story branches are cut from `develop` and PR back to `develop` … an epic has no branch of its own unless it opts in'); shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:666
  - **Fix:** Change line 132 to 'story branch ready (from develop, or the epic integration branch when opted in)' and line 136 to 'Step 4 — create PR (--base develop, or the epic integration branch)'.

### `docs/concepts/quickstart-story.md`

- [ ] **OVERVIEW-24** (low, stale) — line 127
  - **Doc says:** 'Both prompts also offer an epic integration branch … as a trailing, unrecommended option'; line 129 also says 'Pick `No`' for lite mode, which line 127 says is not a prompt
  - **Source:** Only Q1 appends the epic-integration option, and only when `branching.epicIntegration.offerWhenUndeclared` is not false. Q2 offers develop / main / Other. Lite mode is auto-detected, so there is nothing to answer 'No' to.
  - **Evidence:** shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:639-642 (Q1 append), :666 (Q2 'Otherwise: develop / main / Other')
  - **Fix:** Change to 'Q1 also offers an epic integration branch … (unless `offerWhenUndeclared: false`)'. Remove 'Pick `No` for anything…' from the lite-mode note.

### `docs/reference/anti-patterns.md`

- [ ] **REFERENCE-8** (medium, stale) — line 63
  - **Doc says:** "finalise always runs its full side-effects … even in `--lite` mode." / "Lite mode is about skipping context-gathering before development" / "The lite flag is not the right tool."
  - **Source:** No `--lite` flag exists on the develop orchestrators; lite mode is auto-detected in Phase 0. It reduces QA depth rather than pre-develop context-gathering.
  - **Evidence:** git grep -- '--lite' over skills/develop-*/SKILL.md and shared/resources/develop-pipeline-*.md returns nothing; shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:373 (PIPELINE_MODE computed from Agent 3); shared/resources/develop-pipeline-lite-mode.md:19-25
  - **Fix:** Drop `--lite`/'lite flag'. Say that lite mode, which is auto-detected and trades QA depth, never skips Step 7.

### `docs/reference/glossary.md`

- [ ] **REFERENCE-15** (low, stale) — line 25
  - **Doc says:** "Phase 0 … Prompts for story/task path, base branch, lite mode."
  - **Source:** Phase 0d's Upfront Setup asks exactly two questions: Q1, the feature branch base, and Q2, the PR target. Lite mode is computed from the document and never prompted for.
  - **Evidence:** shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:684-690 (required-question count = 2: Q1 + Q2); :373 lite mode detection
  - **Fix:** Replace with 'Prompts for branch base and PR target; detects lite mode automatically'.
- [ ] **REFERENCE-7** (medium, stale) — line 29
  - **Doc says:** "Lite mode: Optional flag that skips pre-develop context-gathering for low-risk stories/tasks."
  - **Source:** Lite mode is not a flag. Phase 0 sets it automatically when risk_level is low or absent, there are fewer than 3 tasks or phases, and the work touches a single module. It changes only QA: Step 5 uses direct tools only and Step 5c runs `/review-pr --effort low`. It does not skip pre-develop context-gathering.
  - **Evidence:** shared/resources/develop-pipeline-lite-mode.md:10-23 (Trigger Conditions; 'Lite mode trades QA depth for speed'); skills/develop-story/SKILL.md 'Lite mode applies to Step 5 only'
  - **Fix:** Redefine it as an auto-detected mode, triggered when risk_level is low or absent, there are fewer than 3 tasks or phases, and the work touches a single module. In this mode Step 5 QA uses direct tools only and Step 5c runs `/review-pr --effort low` (degraded, never skipped). Every other step, including Step 7's finalise side-effects, runs unchanged. Do not single out 'Steps 4, 7 and 8', because lite-mode.md says all other steps run unchanged.

### `docs/reference/troubleshooting.md`

- [ ] **REFERENCE-9** (medium, stale) — line 168
  - **Doc says:** "You expected `--lite` to skip the PR comment / tracker update." / "Lite mode skips context-gathering before development"
  - **Source:** No --lite flag exists. Lite mode is auto-detected and shortens QA: Step 5 uses direct tools and Step 5c runs at --effort low.
  - **Evidence:** shared/resources/develop-pipeline-lite-mode.md:10-23
  - **Fix:** Reword the symptom ('the run was in lite mode') and the cause (lite mode shortens QA only; Step 7 always runs in full).

### `docs/runbooks/create-parallel-stories.md`

- [ ] **RUNBOOKS-6** (medium, broken) — line 50
  - **Doc says:** `git worktree add ../{repo}-story-{E}.{S} feature/story.{E}.{S}.{name}` then run `/develop-story` inside it
  - **Source:** Without `-b`, `git worktree add` requires the branch to already exist; the story branch does not exist until develop-story Step 1 creates it, so the command fails with 'invalid reference'. The create-parallel-stories skill's own setup commands use `-b`.
  - **Evidence:** skills/create-parallel-stories/SKILL.md:249 (`git worktree add ../worktrees/story-1-1 -b feature/story-1-1-1`)
  - **Fix:** Use `git worktree add -b feature/story.{E}.{S}.{name} ../{repo}-story-{E}.{S} develop` (or defer to the commands `/create-parallel-stories` prints). Same fix in docs/runbooks/first-week/day-4-parallel.md:57-58.

### `docs/runbooks/first-week.md`

- [ ] **RUNBOOKS-8** (medium, stale) — line 36
  - **Doc says:** Day 2 done when: '1 story PR merged to the epic branch; story status `accepted`'
  - **Source:** Story PRs target `develop` by default (no epic branch unless opted in), and Day 2 itself only asks for a PR open on GitHub (day-2-stories.md:62, 72).
  - **Evidence:** skills/develop-story/SKILL.md:3; docs/runbooks/first-week/day-2-stories.md:72 ('≥ 1 story PR exists on GitHub')
  - **Fix:** Change to '1 story PR open (or merged) against `develop`; story status `accepted`'.

### `docs/runbooks/first-week/day-4-parallel.md`

- [ ] **RUNBOOKS-7** (medium, inconsistent) — line 91
  - **Doc says:** End of day: 'Two PRs open against the epic branch'; What you learned (line 101): 'PRs target the epic branch regardless of how many stories run in parallel.'
  - **Source:** The same page's steps (lines 62-64) say PRs open against the Phase 0 Q2 base, `develop` by default, which matches develop-story's develop-direct default. The verify checklist and lesson contradict both.
  - **Evidence:** docs/runbooks/first-week/day-4-parallel.md:62-64; skills/develop-story/SKILL.md:3
  - **Fix:** Line 91: 'Two PRs open against `develop` (or the epic integration branch if the epic opted in)'. Line 101: 'PRs target the base chosen at Phase 0 Q2, whatever the parallelism.'

### `docs/runbooks/story-development.md`

- [ ] **RUNBOOKS-10** (medium, stale) — line 249
  - **Doc says:** 'Add `--lite` to skip pre-develop codebase mapping and other context-gathering for low-risk stories.'
  - **Source:** There is no `--lite` flag. Lite mode is set only by Phase 0 detection (risk_level low/absent AND <3 tasks AND single module), and it changes only QA depth: Step 5 uses direct tools, Step 5c runs `--effort low`, all other steps run unchanged (codebase mapping is not skipped).
  - **Evidence:** shared/resources/develop-pipeline-lite-mode.md:10-24 (trigger conditions; 'All other steps run unchanged'); shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:373 ('there is no lite-mode CLI'); skills/develop-story/SKILL.md:242 ('Lite mode applies to Step 5 only')
  - **Fix:** Replace with: 'Lite mode is auto-detected in Phase 0 (low risk, <3 tasks, one module) — there is no flag. It shortens QA only (direct-tools Step 5, `--effort low` Step 5c); Step 7 still runs in full.'

### `docs/runbooks/task-development.md`

- [ ] **RUNBOOKS-16** (medium, broken) — line 87
  - **Doc says:** `/develop-task docs/tasks/task.{N}.{name}.md`; Verification line 189: `grep -E '^status:|^Status:' docs/tasks/task.{N}.{name}.md`
  - **Source:** A task document lives inside its self-named directory: `docs/tasks/task.{N}.{name}/task.{N}.{name}.md`. The path given does not exist, so the verification grep fails.
  - **Evidence:** docs/runbooks/task-development.md:64 (same runbook: outputs `docs/tasks/task.{N}.{name}/task.{N}.{name}.md`); AGENTS.md Task Registry / task path `docs/tasks/task.{N}.{name}/`
  - **Fix:** Use `docs/tasks/task.{N}.{name}/task.{N}.{name}.md` at lines 87 and 189.
- [ ] **RUNBOOKS-11** (medium, stale) — line 92
  - **Doc says:** Phase 0 prompts for task path, base branch, PR target branch, and 'Lite mode for low-risk tasks (skips pre-develop codebase mapping…)'; line 128: '`--lite` skips context-gathering steps'
  - **Source:** Phase 0d asks exactly Q1 base + Q2 PR target; lite mode is auto-detected, never prompted, has no flag, and affects only Step 5 QA depth and Step 5c effort.
  - **Evidence:** skills/develop-task/SKILL.md:35 ('0d — Q1 base + Q2 PR target … no Q3'); shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:693 ('Do NOT invent additional questions … lite-mode detection runs in 0a-parallel Agent 3'); shared/resources/develop-pipeline-lite-mode.md:10-24
  - **Fix:** Drop the 'Lite mode' prompt bullet; describe lite mode as auto-detected and QA-only, and remove `--lite` from line 128.

### `docs/standards/story-documents.md`

- [ ] **SKILL-READMES-STANDARDS-27** (medium, stale) — line 163
  - **Doc says:** Invocation: `/develop <story-dir>`, `/develop story....md`, `/develop #297`
  - **Source:** Prerequisites target develop-story; /develop takes no issue number. The pipeline entry point is /develop-story, which resolves #297
  - **Evidence:** skills/develop/SKILL.md:25-31; skills/develop-story/SKILL.md:3 ('Invoke with /develop-story [story-file-path]')
  - **Fix:** Use `/develop-story` in all three invocation lines.

### `docs/standards/task-documents.md`

- [ ] **SKILL-READMES-STANDARDS-25** (medium, stale) — line 64
  - **Doc says:** `depends_on` — 'blocks pipeline if the dependency is not `accepted`'; Prerequisites (L142): 'If depends_on is set, the dependency task is accepted'
  - **Source:** No pipeline step reads the depends_on frontmatter key; develop-task's status gate checks only status, and select-next.mjs reads dependencies from the registry's 'Depends on' column, not frontmatter
  - **Evidence:** shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:355-365 (task status table, no depends_on); grep for depends_on finds only skills/sync-github-task/SKILL.md:66, skills/ensure-task-github-issue/SKILL.md:156 (display) and skills/develop-next/scripts/select-next.mjs:914 (registry column header alias)
  - **Fix:** Mark depends_on as informational (synced to the tracker card); say that ordering is enforced by develop-next via the registry 'Depends on' column / roadmap deps:, or drop the 'blocks pipeline' claim and the checklist line.
- [ ] **SKILL-READMES-STANDARDS-26** (medium, stale) — line 146
  - **Doc says:** Invocation: `/develop docs/tasks/...`, `/develop task.17....md`, `/develop #297    # GitHub issue number`
  - **Source:** The doc's own prerequisites are for develop-task, the end-to-end pipeline; /develop is the single implementation step and accepts no issue-number input (only file/dir/epic inputs). Issue forms (#297) are resolved by develop-task's Phase 0a
  - **Evidence:** skills/develop/SKILL.md:25-31 (input forms: story/task file or dir, epic file); shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:24,67 ('Issue hash notation: #297'); skills/develop-task/SKILL.md:3 ('Invoke with /develop-task [task-file-path]')
  - **Fix:** Change the block to `/develop-task docs/tasks/task.17.cache-lib-simplification/`, `/develop-task task.17....md`, `/develop-task #297`.

### `skills/develop-task/README.md`

- [ ] **SKILL-READMES-STANDARDS-2** (medium, inconsistent) — line 51
  - **Doc says:** No epic-branch concept. Both develop-task and develop-story Q1 prompt ... neither creates or targets an epic branch.
  - **Source:** develop-story can create and target an epic integration branch (opt-in); only develop-task has no epic-branch concept
  - **Evidence:** shared/resources/develop-pipeline-step-1-create-branch.md:67-90; docs/standards/story-documents.md:124-148 (Branch strategy)
  - **Fix:** Reword: 'develop-task has no epic-branch concept; develop-story offers an opt-in epic integration branch when the parent epic declares branch_model: epic-integration.'

## Key Patterns and References

- Edit `shared/resources/` sources, never `skills/*/references/` copies (none is in scope).
- Line numbers are from 2026-10-07; find each passage by its quoted text if the line moved.
- When a fix restates a rule, cite the source file rather than paraphrasing it in a second place.

## Testing Approach

- Per finding: re-read the cited source line after editing; grep the doc for the old wording.
- Per file: `prettier --check` and the CI link checker.

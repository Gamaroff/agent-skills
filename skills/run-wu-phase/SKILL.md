---
name: run-wu-phase
description: Runs an entire WU migration phase end-to-end with minimal intervention. Creates one Git branch per phase (feature/wu-phase-N), loops through every task sequentially (review → develop → nx-affected → qa-task/qa-story → qa-fix → commit), and manages a single draft PR that is finalised at phase completion. Skips tasks already marked Done. Pauses only for user-flagged high-risk tasks, QA failures that cannot self-heal, ambiguous task requirements, or genuine blockers. Use /run-wu-phase [N] to target a specific phase or omit N to auto-detect the next incomplete phase.
copyright: "Copyright (c) 2025 Lorien Gamaroff"
license: MIT
---

# Run WU Phase — Automated Phase Executor

Automates one full Website Unification migration phase: one branch, one PR, all tasks committed sequentially, minimal questions.

## When to Use This Skill

- You want to run an entire WU phase without babysitting each task
- You want a single GitHub PR that captures all work for the phase
- You want to resume a partially-completed phase run

Natural language triggers:

- `/run-wu-phase` — auto-detect next incomplete phase
- `/run-wu-phase 1` — run Phase 1 specifically
- `/run-wu-phase 2 --base main` — run Phase 2, PR targets main

---

## Invocation Syntax

```
/run-wu-phase [phase-number] [--base <branch>] [--pause-on <task-no>[,<task-no>...]]
```

| Argument | Default | Description |
|---|---|---|
| `phase-number` | Next incomplete phase | Phase to run (0–6) |
| `--base <branch>` | `develop` | Branch the phase PR merges into |
| `--pause-on <N,...>` | (none) | Task numbers to pause before (risk gates) |

Examples:
```
/run-wu-phase               # auto-detect phase, target develop
/run-wu-phase 1             # run Phase 1, target develop
/run-wu-phase 2 --base main # run Phase 2, PR targets main
/run-wu-phase 1 --pause-on 116,117   # pause before tasks 116 and 117
```

---

## Question Policy

**Auto-answer (never ask the user):**
- Which branch to create (always `feature/wu-phase-N`)
- Commit message format
- Review depth (always quick)
- Whether to create a draft PR (always yes, at Step 2b — before the task loop)
- Report format (no per-task report files)
- QA depth (always standard — qa-task/qa-story default, no prompt needed)

**Always surface to the user:**
- Ambiguous task requirements where the correct action cannot be determined
- Conflicting instructions in task files
- QA failures after 5 self-heal cycles
- Review blockers with no obvious auto-resolution
- Risk-gated tasks (reached `--pause-on` task number)
- Any git operation failure (commit hooks, push rejection)

---

## Step 0 — Parse Arguments & Detect Phase

### 0a. Parse arguments

Extract from the invocation string:
- `PHASE_NUM` — integer 0–6, or absent
- `BASE_BRANCH` — `--base` value, default `develop`
- `PAUSE_ON` — comma-separated task numbers from `--pause-on`, split into array; or empty

### 0b. Detect next incomplete phase (when PHASE_NUM absent)

Read `docs/development/tasks/migration/website-unification/task-sequence.md`.

Scan phase headers (`### Phase N —`) in order 0–6. For each phase, count rows:
- ALL rows have Status = `✅` → phase complete, continue scanning
- ANY row has Status ≠ `✅` → this is the next incomplete phase; set `PHASE_NUM`

If all phases complete: report "All WU phases are complete. Nothing to do." and HALT.

### 0c. Collect tasks for the phase

Parse the phase's table in `task-sequence.md`. For each row collect:

```
TASK_NO       — column 1 (e.g. 111)
WU_ID         — column 2 (e.g. WU-P1-01)
TASK_TITLE    — column 3
TASK_STATUS   — column 4 symbol (⬜ 🔄 ✅ ⛔)
REVIEW_STATUS — column 5 symbol (✅ ❌)
TASK_FILE     — column 6 path (extract from markdown link)
```

Store as ordered list `PHASE_TASKS[]`.

**Detect item type per task (used to dispatch type-aware skills):**
```
ITEM_TYPE = "task"   if TASK_FILE path contains /tasks/
ITEM_TYPE = "story"  if TASK_FILE path contains /stories/
```

All WU phase items are currently tasks, but this rule keeps the skill generic.

Compute:
```
TOTAL_TASKS  = len(PHASE_TASKS)
DONE_TASKS   = count where TASK_STATUS == ✅
REMAINING    = TOTAL_TASKS - DONE_TASKS
```

---

## Step 1 — Upfront Questions (ask once, not per task)

Display pre-flight summary:

```
WU Phase {PHASE_NUM} — {phase title}
  Tasks total   : {TOTAL_TASKS}
  Already done  : {DONE_TASKS}
  To execute    : {REMAINING}
  Phase branch  : feature/wu-phase-{PHASE_NUM}
  PR base       : {BASE_BRANCH}
```

Ask ONLY questions not already answered via CLI args:

**Q1 — Target branch** (skip if `--base` was supplied):
```yaml
question: "Target branch for the final PR?"
header: "PR Base"
options:
  - label: "develop (recommended)"
    description: "Standard Gitflow target for feature work"
  - label: "main"
    description: "Only for hotfixes or special releases"
  - label: "Other — I will type it"
    description: "Specify a custom branch name"
```

**Q2 — Risk gates** (skip if `--pause-on` was supplied):
```yaml
question: "Any tasks to pause before (risk gates)? Enter task numbers or choose an option."
header: "Risk Gates"
options:
  - label: "No pauses — run all tasks automatically"
    description: "Full automation. Recommended for low-risk phases."
  - label: "Pause before specific tasks"
    description: "I will list task numbers to gate (e.g. 116,132)"
  - label: "Pause before every task"
    description: "Fully supervised — confirm each task before running"
```

Store resolved answers as `BASE_BRANCH` and `PAUSE_ON[]`.

---

## Step 2 — Phase Branch Setup

### 2a. Check for existing branch

```bash
git branch --list "feature/wu-phase-{PHASE_NUM}"
```

**Branch does not exist — create it:**
```bash
git checkout {BASE_BRANCH}
git pull origin {BASE_BRANCH}
git checkout -b feature/wu-phase-{PHASE_NUM}
```
Report: `Created branch feature/wu-phase-{PHASE_NUM} off {BASE_BRANCH}`

**Branch already exists — resume it:**
```bash
git checkout feature/wu-phase-{PHASE_NUM}
```

Check for an open PR:
```bash
gh pr list --head "feature/wu-phase-{PHASE_NUM}" --json number,url,state 2>/dev/null
```

If an open PR is found, store as `EXISTING_PR_NUMBER` and `EXISTING_PR_URL`.

Report:
```
Resuming existing branch feature/wu-phase-{PHASE_NUM}
  HEAD    : {git log -1 --oneline}
  Open PR : {EXISTING_PR_URL or "none"}
  Skipping: {DONE_TASKS} already-done task(s)
```

### 2b. Create draft PR (before task loop)

This is required before the task loop so `qa-task`/`qa-story` can post PR comments.

**If EXISTING_PR_NUMBER is already set** (from Step 2a resume check): skip this step — PR already exists.

**If no existing PR:**
```bash
gh pr create \
  --draft \
  --title "feat(wu-phase-{N}): Phase {N} — {phase title} (in progress)" \
  --base {BASE_BRANCH} \
  --body "Phase {N} in progress. PR body will be updated on completion."
```

Store result as `PHASE_PR_NUMBER` and `PHASE_PR_URL`.

If PR creation fails, warn but do NOT halt — the task loop can still run; qa-task/qa-story will attempt to use the PR number and will skip their PR comment if none is available.

Report: `Draft PR created: {PHASE_PR_URL}`

---

## Step 3 — Task Loop

For each task in `PHASE_TASKS[]` (document order):

### 3a. Skip check

If `TASK_STATUS == ✅`:
```
[SKIP] Task {TASK_NO} ({WU_ID}) — already Done
```
Continue to next task.

### 3b. Pause check (risk gate)

If `TASK_NO` is in `PAUSE_ON[]` OR `PAUSE_ON == "all"`:

Use `AskUserQuestion`:
```yaml
question: "Task {TASK_NO} ({WU_ID}): {TASK_TITLE} — this is a risk gate. Ready to proceed?"
header: "Risk Gate — Task {TASK_NO}"
options:
  - label: "Proceed with this task"
    description: "Run review + implement for this task now"
  - label: "Skip this task for now"
    description: "Mark as deferred; continue with the next task"
  - label: "Stop the phase run"
    description: "Halt here; resume later with /run-wu-phase {PHASE_NUM}"
```

Skip → record as DEFERRED, continue loop.
Stop → go to Step 5, HALT.

### 3c. Progress header

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[{current}/{REMAINING}] Task {TASK_NO} — {WU_ID}: {TASK_TITLE}
  File: {TASK_FILE}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 3d. Review the task (quick mode, type-aware)

Dispatch based on `ITEM_TYPE`:
- If `ITEM_TYPE == "task"`: invoke `review-task` against `{TASK_FILE}`
- If `ITEM_TYPE == "story"`: invoke `review-story` against `{TASK_FILE}`

Constraints for both:
- **depth**: quick — template compliance and critical gaps only; skip exhaustive analysis
- **output format**: "action plan only" — set automatically, do not ask
- **apply critical fixes**: yes — apply automatically, do not ask
- **GitHub issue creation**: skip — do not ask
- **status update commit**: skip — task-sequence.md update is handled in Step 3h
- **Do NOT commit during review** — changes are committed in Step 3g

If the review finds a critical gap that cannot be auto-resolved, surface it:

```
[REVIEW BLOCKER] Task {TASK_NO}: {issue description}
```

Use `AskUserQuestion`:
```yaml
question: "Review blocker for Task {TASK_NO} that requires your input. How to proceed?"
header: "Review Blocker"
options:
  - label: "I will fix the task file manually — tell me when done"
    description: "Pause here; I'll edit the task document and continue"
  - label: "Skip this task"
    description: "Leave as Not started; move to next task"
  - label: "Proceed anyway (accept risk)"
    description: "Implement despite the gap — the issue will be noted"
```

After review passes, note internally that Review column needs updating to `✅` (applied in Step 3h with the commit).

### 3e. Implement the task (no branch creation)

**CRITICAL: Do NOT invoke `develop-task` — it creates its own branch and PR.**

Instead, invoke the `develop` skill's implementation logic directly with these overrides:

- **Branch**: already on `feature/wu-phase-{PHASE_NUM}` — do NOT create a new branch
- **PR**: skip all PR creation steps
- **QA pipeline**: handled inline in Step 3f — do not kick off a separate QA orchestration
- **Task file**: `{TASK_FILE}`

Follow the develop skill's Core Development Principles and implementation steps. All changes write directly to the working tree on the phase branch.

If during implementation an ambiguous requirement is encountered where the correct action cannot be determined, surface it immediately via `AskUserQuestion` rather than guessing.

### 3f. QA gate (inline, max 5 cycles)

Run verification for files changed in this task only (use `npx nx affected` where applicable — do not run a full monorepo build):

```bash
npx nx affected --target=build,lint,test --base=HEAD~1
```

**Cycle log format:**
```
[QA cycle 1/5] Task {TASK_NO} — PASS
  — OR —
[QA cycle 1/5] Task {TASK_NO} — FAIL: {error summary} — attempting fix...
[QA cycle 2/5] Task {TASK_NO} — PASS
```

On PASS: continue to Step 3g.

On FAIL: apply a targeted fix based on the error output, then re-run. Repeat up to 5 total cycles.

**If still FAIL after 5 cycles — surface to user:**
```
[QA HALT] Task {TASK_NO} failed QA after 5 cycles.
  Last error: {error summary}
  Changed files: {git diff --stat HEAD}
```

Use `AskUserQuestion`:
```yaml
question: "Task {TASK_NO} QA failed after 5 self-heal cycles. Your input is needed."
header: "QA Failure — Task {TASK_NO}"
options:
  - label: "I will fix manually — tell me when done"
    description: "Pause here; I will resolve the issue and continue the phase run"
  - label: "Revert this task's changes and skip it"
    description: "git checkout HEAD -- . to undo; mark task Not started; continue"
  - label: "Stop the phase run here"
    description: "Halt; keep changes on branch; resume with /run-wu-phase {PHASE_NUM}"
```

Revert path:
```bash
git checkout HEAD -- .
```
Mark task status as ⬜ (unchanged from Not started). Continue loop.

Stop path: go to Step 5, HALT.

### 3f'. Formal QA review (type-aware)

After the `nx affected` gate passes, run a formal QA review before committing.

Dispatch based on `ITEM_TYPE`:
- If `ITEM_TYPE == "task"`: invoke `qa-task` against `{TASK_FILE}`
- If `ITEM_TYPE == "story"`: invoke `qa-story` against `{TASK_FILE}`

Pass to the skill:
- PR number: `PHASE_PR_NUMBER` (created in Step 2b)
- No new branch creation — already on `feature/wu-phase-{PHASE_NUM}`

The QA skill produces co-located artifacts:
- `task.NNN.qa.N.name.md` — QA report
- `task.NNN.gate.N.name.yml` — gate file
- `task.NNN.bug.N.name.md` — bug reports (if issues found)

Read the gate status from the produced `.gate.N.name.yml` file:

```
GATE_STATUS = PASS | WAIVED | CONCERNS | FAIL
```

**Gate routing:**

| Gate status | Action |
|---|---|
| `PASS` | Proceed to Step 3g (skip Step 3f'') |
| `WAIVED` | Treat as PASS — proceed to Step 3g |
| `CONCERNS` | Run Step 3f'' (qa-fix, advisory) → then Step 3g |
| `FAIL` | Run Step 3f'' (qa-fix, required) → re-run qa-task/qa-story → re-check gate |

Log format:
```
[QA-FORMAL] Task {TASK_NO} — gate: {GATE_STATUS}
```

### 3f''. qa-fix loop (max 3 cycles)

```
QA_FIX_CYCLES = 0
MAX_QA_FIX    = 3

while GATE_STATUS ∉ {PASS, WAIVED} and QA_FIX_CYCLES < MAX_QA_FIX:
  invoke qa-fix (see qa-fix task adaptation rules below)
  re-invoke qa-task / qa-story
  re-read GATE_STATUS from updated gate file
  QA_FIX_CYCLES++
```

**Cycle log format:**
```
[QA-FIX cycle 1/3] Task {TASK_NO} — gate was FAIL → applying fixes...
[QA-FIX cycle 1/3] Task {TASK_NO} — re-review: gate now PASS ✅
```

**If gate still ∉ {PASS, WAIVED} after MAX_QA_FIX cycles:**

```
[QA FIX HALT] Task {TASK_NO} — gate {GATE_STATUS} after 3 qa-fix cycles.
```

Use `AskUserQuestion`:
```yaml
question: "Task {TASK_NO} QA gate is {GATE_STATUS} after 3 fix cycles. Your input is needed."
header: "QA Fix Halt — Task {TASK_NO}"
options:
  - label: "I will fix manually — tell me when done"
    description: "Pause here; re-run qa-task/qa-story after manual fix"
  - label: "Accept CONCERNS and continue"
    description: "Only available if gate == CONCERNS; treat as WAIVED"
  - label: "Skip this task"
    description: "Revert changes, mark ⬜, continue loop"
  - label: "Stop the phase run"
    description: "Halt here; resume with /run-wu-phase {PHASE_NUM}"
```

Revert path:
```bash
git checkout HEAD -- .
```
Mark task status ⬜. Continue loop.

Stop path: go to Step 5, HALT.

### qa-fix task adaptation rules

`qa-fix` was designed for story files. When `ITEM_TYPE == "task"`, apply these overrides:

| Story concept | Task equivalent |
|---|---|
| Story file | Task file (`task.NNN.name.md`) |
| Dev Agent Record section | Implementation Notes / Dev Notes section in task file |
| Acceptance Criteria (read-only) | Success Criteria / Acceptance Criteria (read-only — do not modify) |
| Story status field | Task status field (if present) |
| Bug reports | `task.NNN.bug.N.name.md` (same filename pattern) |
| Gate file (read-only, QA owns) | `task.NNN.gate.N.name.yml` (do not modify) |

**Sections qa-fix may update in a task file:**
- Dev notes / implementation notes
- Changelog or completion notes
- Bug Reports list (if present in task file)

**Sections that are read-only (qa-fix must never modify):**
- Overview, Motivation, Technical Background
- Success Criteria / Acceptance Criteria
- Risk Assessment

### 3g. Commit the task's work

Stage all changes:
```bash
git add -A
```

Commit message format (Conventional Commits):
```
{type}(wu-p{N}): {WU_ID} — {concise task title}

- Phase {PHASE_NUM} ({phase name}), task {current}/{TOTAL_TASKS}
- {One-line summary of the primary change made}
- QA gate: {PASS|CONCERNS|WAIVED}

WU-Phase: {PHASE_NUM}
Task: {TASK_NO} ({WU_ID})
```

QA artifacts produced by qa-task/qa-story (`.qa.N.md`, `.gate.N.yml`, `.bug.N.md`) are staged alongside implementation changes via `git add -A` — they are committed with the task's work, not separately.

Commit type selection:
| Task nature | Type |
|---|---|
| Structural or config changes | `feat` |
| Audit or documentation tasks | `docs` |
| CI or script changes | `ci` |
| Cleanup or deletion tasks | `chore` |
| Bug fixes surfaced during implementation | `fix` |

If the git commit fails (e.g. pre-commit hook), surface the error to the user and ask:
```yaml
question: "git commit failed for Task {TASK_NO}: {error}. How to proceed?"
options:
  - label: "I will fix the issue — then continue"
  - label: "Skip committing this task"
  - label: "Stop the phase run"
```

### 3h. Update task-sequence.md

Immediately after the commit succeeds, edit `task-sequence.md`:
- Status column for this task: `⬜ → ✅` (or `🔄 → ✅`)
- Review column: `❌ → ✅` (if not already `✅`)

Include this edit in the same commit as the implementation by amending if no other commits have occurred since, or as a follow-up micro-commit:

```
chore(wu-p{N}): mark task {TASK_NO} ({WU_ID}) Done in task-sequence

WU-Phase: {PHASE_NUM}
Task: {TASK_NO} ({WU_ID})
```

Preference: include in the implementation commit for a simpler history. Only split if the implementation commit is already sealed.

### 3i. Progress line

After each completed task:
```
[DONE] Task {TASK_NO} ({WU_ID}) — {N_done}/{TOTAL_TASKS} complete. {remaining} remaining.
```

Continue to next task in loop.

---

## Step 4 — Phase Completion

When the task loop finishes (all tasks processed):

### 4a. Compute totals

```
DONE_NOW  = count of tasks now with Status ✅
DEFERRED  = count of tasks skipped/paused during this run
TOTAL     = TOTAL_TASKS
```

### 4b. Push branch

```bash
git push -u origin feature/wu-phase-{PHASE_NUM}
```

If push fails, retry once. If still failing, surface to user:
```yaml
question: "git push failed. How to proceed?"
options:
  - label: "I will resolve the push issue — then continue"
  - label: "Stop here — I will push manually later"
```

### 4c. Finalise the PR

**If PHASE_PR_NUMBER is set** (draft PR was created in Step 2b or already existed):

Convert draft → ready and update title/body:
```bash
gh pr ready {PHASE_PR_NUMBER}
gh pr edit {PHASE_PR_NUMBER} \
  --title "feat(wu-phase-{N}): Phase {N} — {phase title} ({DONE_NOW}/{TOTAL} tasks)" \
  --body "$(cat <<'PRBODY'
## Phase {N} — {Phase Title}

This PR completes Phase {N} of the Website Unification migration.

### Summary

| Metric | Value |
|---|---|
| Phase | {N} — {Phase Title} |
| Tasks completed | {DONE_NOW}/{TOTAL} |
| Tasks deferred | {DEFERRED} |
| Branch | `feature/wu-phase-{N}` |
| Base | `{BASE_BRANCH}` |

### Tasks Included

| No. | WU ID | Title | Status |
|---|---|---|---|
{for each task: | {TASK_NO} | {WU_ID} | {TASK_TITLE} | ✅ Done / ⏭ Deferred |}

{if DEFERRED > 0:}
### Deferred Tasks

The following tasks were skipped during this run and remain Not started:

{list of deferred task rows}

These should be addressed before Phase {N+1} begins.
{end if}

### Next Steps

- Review and merge into `{BASE_BRANCH}`
- Run `/run-wu-phase {N+1}` to begin Phase {N+1}
PRBODY
)"
```

**If PHASE_PR_NUMBER is not set** (draft PR creation failed in Step 2b — edge case):

Fall back to creating a new ready PR:
```bash
gh pr create \
  --title "feat(wu-phase-{N}): Phase {N} — {phase title} ({DONE_NOW}/{TOTAL} tasks)" \
  --base {BASE_BRANCH} \
  --body "..."
```

If PR creation/update fails, report the error but do NOT halt — the branch is pushed and the user can create the PR manually.

### 4d. Final report

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase {N} — {Phase Title}: COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tasks done    : {DONE_NOW}/{TOTAL}
  Tasks deferred: {DEFERRED}
  Branch        : feature/wu-phase-{N}
  PR            : {PR URL}
  Base branch   : {BASE_BRANCH}

Next: merge the PR into {BASE_BRANCH}, then run:
  /run-wu-phase {N+1}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Step 5 — Partial Completion (halted mid-phase)

When the loop is interrupted at a risk gate, QA failure, or user request:

### 5a. Handle uncommitted changes

Check for uncommitted changes from the partially-done task:

```bash
git status --short
```

If uncommitted changes exist, surface to user:
```yaml
question: "There are uncommitted changes from Task {TASK_NO}. What to do with them?"
header: "Uncommitted Work"
options:
  - label: "Commit partial work with WIP prefix"
    description: "Commit what exists; resume will continue from here"
  - label: "Stash changes"
    description: "git stash — restored on resume"
  - label: "Discard changes"
    description: "git checkout HEAD -- . — task stays Not started"
```

WIP commit format:
```
wip(wu-p{N}): Task {TASK_NO} ({WU_ID}) — partial implementation

[INCOMPLETE — phase run halted]
WU-Phase: {N}
Task: {TASK_NO} ({WU_ID})
```

### 5b. Push branch

```bash
git push -u origin feature/wu-phase-{PHASE_NUM}
```

### 5c. Resume instructions

```
Phase {N} paused at Task {TASK_NO} ({WU_ID}).

To resume:
  /run-wu-phase {N}

Resume will skip all ✅ tasks and restart from Task {TASK_NO}.
Branch pushed: feature/wu-phase-{N}
```

---

## Resume Logic

When `/run-wu-phase N` is invoked and `feature/wu-phase-N` already exists:

1. Read `task-sequence.md` — this is the **single source of truth** for which tasks are done
2. Tasks with Status `✅` → skip unconditionally
3. Tasks with Status `⬜` or `🔄` → execute (even if commits exist on the branch for them)
4. WIP commits (containing `[INCOMPLETE]`) → re-run QA first; if passing, proceed to commit; if not, re-implement from the WIP state

Branch commit history is informational only. Task statuses in `task-sequence.md` drive all skip/resume decisions.

---

## Error Handling Reference

| Situation | Behaviour |
|---|---|
| Base branch does not exist | HALT — "Branch `{BASE_BRANCH}` not found. Verify before running." |
| task-sequence.md cannot be parsed | HALT — report parse error with line numbers |
| Phase has 0 remaining tasks | Report "Phase N is already complete." HALT |
| Task file not found at listed path | Warn, skip the task, continue; report missing files at end |
| Ambiguous task requirement | Surface to user via AskUserQuestion immediately |
| Review critical blocker | Pause and ask (Step 3d) |
| QA FAIL after 5 nx-affected cycles | Pause and ask (Step 3f) |
| QA gate FAIL after 3 qa-fix cycles | Pause and ask (Step 3f'') |
| git commit fails (hooks etc.) | Pause, show exact error, ask: fix+retry / skip / stop |
| git push fails | Retry once; if still fails, pause and ask |
| Draft PR creation fails (Step 2b) | Warn, continue — qa-task/qa-story will skip PR comment |
| PR finalise fails (Step 4c) | Report error, do NOT halt — branch is pushed; user can create PR manually |
| DEFERRED tasks at phase end | List in PR body; do not block PR creation |

---

## Files Created / Updated

| File | When | What |
|---|---|---|
| `docs/development/tasks/migration/website-unification/task-sequence.md` | After each task | Status `⬜→✅`, Review `❌→✅` |
| `feature/wu-phase-{N}` (git branch) | Step 2 | Created once; all task commits land here |
| GitHub PR (draft → ready) | Step 2b → Step 4c | Draft created before loop; finalised at completion |
| `task.NNN.qa.N.name.md` | Step 3f' (per task) | QA report, co-located with task file |
| `task.NNN.gate.N.name.yml` | Step 3f' (per task) | Gate file (PASS/CONCERNS/FAIL/WAIVED) |
| `task.NNN.bug.N.name.md` | Step 3f' if issues | Bug reports, co-located with task file |

**Not created by this skill**: per-task implementation reports, per-task branches. Those are `develop-task` artifacts and do not apply here.

---

## Key Constraints

- **Never invoke `develop-task`** — it creates per-task branches and PRs, defeating the phase model
- Review dispatch is type-aware: `review-task` for tasks, `review-story` for stories (both quick mode)
- QA dispatch is type-aware: `qa-task` for tasks, `qa-story` for stories (standard depth, no prompt)
- Draft PR is created at Step 2b before the task loop — required for qa-task/qa-story PR comment
- `qa-fix` when used for tasks treats the task file as the story-file equivalent; authorized sections are dev notes and completion records only — never touch acceptance criteria or technical background
- QA gate artifacts are committed with the task's implementation changes (not separately)
- Branch `feature/wu-phase-N` is created once and never switched during the task loop
- `task-sequence.md` is written after every task commit — the only interrupt-safe state store
- QA runs `nx affected` targets only (not full monorepo) — keeps per-task build QA fast
- No GitHub issues are created per task — the phase PR is the sole tracking artifact
- Questions are surfaced when the correct action cannot be automatically determined; trivial procedural decisions are auto-answered

---

## Example Session (Phase 1, 8 tasks)

```
/run-wu-phase 1

WU Phase 1 — Scope Rename
  Tasks total   : 8
  Already done  : 0
  To execute    : 8
  Phase branch  : feature/wu-phase-1
  PR base       : develop

[Q] Target branch for PR? → develop (recommended)
[Q] Risk gates?           → No pauses — run all tasks automatically

Created branch feature/wu-phase-1 off develop
Draft PR created: https://github.com/your-org/your-repo/pull/XXX (draft)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[1/8] Task 111 — WU-P1-01: Find-replace @my-system/* → @my-app/* in tsconfig
  File: docs/.../task.111.wu-p1-01.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[REVIEW]     Task 111 — review-task quick: 0 critical issues
[IMPL]       Task 111 — implementing...
[QA cycle 1/5] Task 111 — PASS
[QA-FORMAL]  Task 111 — qa-task: gate PASS
[COMMIT]     feat(wu-p1): WU-P1-01 — find-replace @my-system/* scope in tsconfig paths
               - QA gate: PASS
[STATUS]     task-sequence.md — Task 111 ✅
[DONE]       Task 111 (WU-P1-01) — 1/8 complete. 7 remaining.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[2/8] Task 112 — WU-P1-02: ...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[REVIEW]     Task 112 — review-task quick: 1 critical issue → auto-fixed
[IMPL]       Task 112 — implementing...
[QA cycle 1/5] Task 112 — PASS
[QA-FORMAL]  Task 112 — qa-task: gate CONCERNS
[QA-FIX cycle 1/3] Task 112 — gate was CONCERNS → applying fixes...
[QA-FIX cycle 1/3] Task 112 — re-review: gate now PASS ✅
[COMMIT]     feat(wu-p1): WU-P1-02 — ... - QA gate: CONCERNS→PASS
[STATUS]     task-sequence.md — Task 112 ✅
[DONE]       Task 112 (WU-P1-02) — 2/8 complete. 6 remaining.

...

[DONE] Task 118 (WU-P1-08) — 8/8 complete. 0 remaining.

Pushing branch feature/wu-phase-1...
Converting PR #XXX draft → ready; updating title and body...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Phase 1 — Scope Rename: COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tasks done    : 8/8
  Tasks deferred: 0
  Branch        : feature/wu-phase-1
  PR            : https://github.com/your-org/your-repo/pull/XXX
  Base branch   : develop

Next: merge PR, then /run-wu-phase 2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

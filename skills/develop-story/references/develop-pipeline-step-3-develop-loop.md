---
name: develop-pipeline-step-3-develop-loop
description: Step 3 (develop loop) shared by develop-story and develop-task. Covers pre-develop codebase mapping (Explore subagent), plan file discovery, internal gate handling (draft/planned, high-risk, alignment), bounded develop loop (LOOP → MAX_ITER semantics from resume-contract), Remaining Work Status banner format, and halt protocol. Story vs task variants called out where they differ. Bounded-loop semantics from Task 1 cleanup items 11/13 are preserved exactly.
---
<!-- AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/develop-pipeline-step-3-develop-loop.md. Regenerate via `npm run bundle`. -->

# Develop Pipeline — Step 3: Develop

## When This Document Applies

Loaded by `/develop-story` and `/develop-task` during Step 3. Story/task variants are called out in labeled sub-sections where they differ. The bounded develop loop semantics are identical for both orchestrators — see `references/develop-pipeline-resume-contract.md` for the full MAX_ITER and stall-detection contract.

---

## Pre-develop Codebase Mapping (CRITICAL for context efficiency)

> This step invokes `/develop`, but the Explore subagent and plan file discovery below must run first. Do not invoke `/develop` until those are complete.

**Resume optimization:** If the Decisions Log already contains a "Pre-develop surface map:" entry (from a prior session), skip both the Explore subagent invocation AND the plan file discovery below — reuse the recorded surface map and plan-file decision. Log: "Resume — pre-develop surface map and plan-file decision reused from Decisions Log." Then proceed to the develop loop.

Before invoking `/develop`, use the Agent tool with subagent_type="Explore" to map the codebase surface:

#### develop-story
Ask it to find: all files likely affected by the acceptance criteria, existing patterns in the same module/layer, test file conventions for the affected areas, any files explicitly named in the story's Dev Notes or Tasks.

#### develop-task
Ask it to find: all files likely affected by the success criteria and implementation phases, existing patterns in the same module/layer, test file conventions for the affected areas, any files explicitly named in the task's implementation plan.

### Shared (both orchestrators)

- Return a compact summary: file path + 1-line description per file (max 20 files)
- Do NOT read these files again in the main context — the summary is sufficient for `/develop` to make informed decisions
- Log the Explore summary in the Decisions Log: "Pre-develop surface map: {N} files identified in {affected modules}"
- When invoking `/develop`, present the Explore summary as initial context so `/develop` does NOT need to run its own independent file discovery. State explicitly: "Codebase surface map already completed — {summary}. Proceed directly to alignment analysis using this map."
- **Always-load files**: read each file in `ALWAYS_LOAD_FILES` (resolved in Phase 0c-load) and prepend their full contents to the `/develop` invocation context, labelled:
  ```
  Always-loaded project files (devLoadAlwaysFiles from skills-config.yaml, or defaults):
  === <path> ===
  <file contents>
  ...
  ```
  If `ALWAYS_LOAD_FILES` is empty (all files were missing), log a warning and proceed without them.
- See `/develop` SKILL.md **Caller-Supplied Context** section for the full contract on how orchestrators may prepend context (surface map, plan file path, always-load files, iteration hint) and how `/develop` must honour it.

---

## Plan File Discovery (CRITICAL — check before invoking /develop)

After the Explore subagent returns, look for a co-located plan file:

#### develop-story
```bash
ls {story-directory}/story.{epic}.{story}.plan.*.md 2>/dev/null
```
If found, read the plan file and include its content as additional context when invoking `/develop`. The plan file contains implementation-level detail (code snippets, exact file changes, function signatures) that supplements the story's Tasks section. Log in Decisions Log: "Plan file found: {path} — included as implementation context for /develop".

If no plan file exists, proceed without it — plan files are optional (only present for stories created after the co-located plan feature was added).

#### develop-task
```bash
ls {task-directory}/task.{id}.plan.*.md 2>/dev/null
```
If found, read the plan file and include its content as additional context when invoking `/develop`. The plan file contains implementation-level detail (code snippets, exact file changes, function signatures) that supplements the task's Implementation Plan section. Log in Decisions Log: "Plan file found: {path} — included as implementation context for /develop".

If no plan file exists, proceed without it — plan files are optional (only present for tasks created after the co-located plan feature was added).

### Plan Freshness on Resume (both orchestrators)

If a prior plan file is being reused from a previous session, verify its freshness per `references/develop-pipeline-resume-contract.md` (Plan Freshness Check section). Log outcome: "Plan file freshness: verified" or "Plan file stale — re-running Explore subagent".

---

## Handling the Develop Skill's Internal Gates

#### develop-story internal gates

- **Draft status gate**: If develop asks "is this draft ready?", answer **Yes** and automatically select "Yes, ready to implement". Rationale: `/review-story` already validated and promoted the story in Step 2 — the draft gate in `/develop` is redundant when called from this pipeline. Log in Decisions Log: "Draft gate auto-answered: Yes — review-story validation in Step 2 is sufficient."
- **High-risk gate** (`risk_level: high`): qa-planning skip is silent — the pipeline always auto-skips it (see `references/develop-pipeline-step-0-resolve-and-prepare.md`; there is **no** Q3 in Upfront Setup). The `/develop` skill presents up to three options: "Run `/qa-planning` now", "Skip, I've already planned", "Skip, low actual risk". Always automatically select **"Skip, I've already planned"** (treat "Skip, low actual risk" as equivalent if that is what develop offers) and log `"high-risk gate: auto-skipped qa-planning"` in the Decisions Log. Never pause for the user at this gate.
- **Alignment mismatch gate**: If develop finds existing code that differs from the story, automatically select "Align code to document" — the document is the source of truth. Log this in Decisions Log.

#### develop-task internal gates

- **Draft/Planned status gate**: If develop asks "is this ready?", answer **Yes** and automatically select "Yes, ready to implement". Rationale: `/review-task` already validated the task in Step 2. Log in Decisions Log: "Planned/Draft gate auto-answered: Yes — review-task validation in Step 2 is sufficient."
- **High-risk gate** (`risk_level: high`): qa-planning skip is silent — the pipeline always auto-skips it (see `references/develop-pipeline-step-0-resolve-and-prepare.md`; there is **no** Q3 in Upfront Setup). The `/develop` skill presents up to three options: "Run `/qa-planning` now", "Skip, I've already planned", "Skip, low actual risk". Always automatically select **"Skip, I've already planned"** (treat "Skip, low actual risk" as equivalent) and log `"high-risk gate: auto-skipped qa-planning"` in the Decisions Log. Never pause for the user at this gate.
- **Alignment mismatch gate**: If develop finds existing code that differs from the task, automatically select "Align code to document" — the document is the source of truth. Log this in Decisions Log.

---

## Develop Loop — Run Until Complete (Bounded)

For the full develop loop setup (initial checkpoint variables, stall detection, progress conditions, and MAX_ITER halt rules), see `references/develop-pipeline-resume-contract.md`.

### LOOP (both orchestrators — execute identically)

#### develop-story loop body

1. Invoke `/develop` with the story file path. On iteration 1, pass the always-load file contents (from `ALWAYS_LOAD_FILES`), the Explore surface map, and the plan file (or note that all were reused per Decisions Log on resume). On iteration ≥2, pass only: "Resuming from partial completion — see story checkboxes for completed tasks."
2. After `/develop` returns, dispatch an Explore subagent (read-only) to audit iteration progress using the **shared loop-audit prompt** (`references/loop-audit-prompt.md`).

   Substitute: `<DOC_TYPE>=story`, `<DOC_PATH>={story_path}`, `<TASKS_SECTION>=## Tasks`. Pass the resulting prompt verbatim to the Explore subagent.

   Failure semantics + persistence: per the shared prompt's "Caller Failure Semantics" and "Persistence" tables (this is the per-iteration row — JSON parse failure on retry HALTs).

   Set: `CURRENT_COMPLETED = audit.completed`, `CURRENT_COMMIT_HASH = audit.last_commit_hash`.

3. Branch on `audit.status`:
   - `Ready for Review` → EXIT loop — all tasks done, proceed to Step 4
   - `accepted` → EXIT loop — treat as success; log unexpected status in Issues Log. Pipeline Step 7 re-runs `/finalise` after QA regardless.
   - `In Progress` → apply stall semantics from `references/develop-pipeline-resume-contract.md`: check progress (EITHER `CURRENT_COMPLETED > LAST_COMPLETED` OR new commit), apply MAX_ITER cap, log and increment `ITER`, output Remaining Work Status banner before re-invoking.
   - Any other status → HALT; log the actual status in Issues Log.

#### develop-task loop body

1. Invoke `/develop` with the task file path. On iteration 1, pass the always-load file contents (from `ALWAYS_LOAD_FILES`), the Explore surface map, and the plan file (or note that all were reused per Decisions Log on resume). On iteration ≥2, pass only: "Resuming from partial completion — see task checkboxes for completed phases."
2. After `/develop` returns, dispatch an Explore subagent (read-only) to audit iteration progress using the **shared loop-audit prompt** (`references/loop-audit-prompt.md`).

   Substitute: `<DOC_TYPE>=task`, `<DOC_PATH>={task_path}`, `<TASKS_SECTION>=## Implementation Plan`. Pass the resulting prompt verbatim to the Explore subagent.

   Failure semantics + persistence: per the shared prompt's "Caller Failure Semantics" and "Persistence" tables (this is the per-iteration row — JSON parse failure on retry HALTs).

   Set: `CURRENT_COMPLETED = audit.completed`, `CURRENT_COMMIT_HASH = audit.last_commit_hash`.

3. Branch on `audit.status`:
   - `Ready for Review` → EXIT loop — all phases done, proceed to Step 4
   - `accepted` → EXIT loop — treat as success; log unexpected status in Issues Log. Pipeline Step 7 re-runs `/finalise` after QA regardless.
   - `In Progress` → apply stall semantics from `references/develop-pipeline-resume-contract.md`: check progress (EITHER `CURRENT_COMPLETED > LAST_COMPLETED` OR new commit), apply MAX_ITER cap, log and increment `ITER`, output Remaining Work Status banner before re-invoking.
   - Any other status → HALT; log the actual status in Issues Log.

## Test Failure Triage (both orchestrators — applies inside /develop)

When `/develop` runs tests during the develop loop, test output must be captured to a temp file. The raw log is never read into main context; only the triage summary is used.

### Output Capture Pattern

```bash
ITER=<current develop loop iteration>
TEST_LOG=".claude/state/test-output-${ITER}-$(date +%s).log"
<test-command> > "$TEST_LOG" 2>&1
TEST_EXIT=$?
```

### On Test Failure (TEST_EXIT != 0)

Dispatch the Agent tool with `subagent_type="Explore"` using the prompt from `references/test-failure-triage-prompt.md`. Substitute `<log_path>` with `$TEST_LOG`. Persist the returned triage YAML as a JSON artifact at `.summaries/step-3-test-triage-<ITER>.json` (schema per `references/subagent-summary-artifact.md`). Update the implementation report `Subagent summary ref` column with the artifact path.

Main reads only the triage summary (counts + ≤10 failure bullets + `next_file` hint). Never read `$TEST_LOG` directly.

### Log Cleanup

- `TEST_EXIT == 0` → `rm -f "$TEST_LOG"` — log no longer needed
- `TEST_EXIT != 0` → retain for post-mortem; do not delete on failure

---

### After loop exits (both orchestrators)

Update Pipeline Progress: ✅ develop.

#### Change Log

On **exiting** the develop loop — not per iteration — `/develop` appends **one** row to the work
item recording what was implemented:

| 2026-05-14 |  | Implemented — 12 files, 34 tests | develop |

Leave `Version` blank; only `/finalise` bumps it. Put the scale of the change in the Description
(files touched, tests added) rather than a narrative — the narrative already lives in the
implementation report, which records every loop pass. One row per develop run is the rule that
keeps a five-iteration loop from producing five rows.

The write belongs to `/develop`, not to this step document. This step states the contract; the
skill performs it. Duplicating the write in both places is how a document ends up with two rows
for one event. Canonical format: [document-change-log.md](document-change-log.md).

**Post development completion to tracker issue** (non-blocking — skip if `TRACKER_ISSUE` is empty). Execute this before the lock-advance Bash call — it is a tool call, not prose, and does not violate the no-prose-before-lock-advance rule:

#### develop-story

```bash
mkdir -p .claude/state
cat > .claude/state/comment-body.md <<'EOF'
## 🛠️ Development Complete — Step 3/8

**Status**: Ready for Review
**Tasks completed**: {audit.completed}/{audit.total}
**Tests**: {all passing / {N} failures — see implementation report}
**Branch**: {branch}
EOF

node .agents/skills/{develop-story|develop-task|develop-bug}/references/tracker-comment.js \
  --issue {TRACKER_ISSUE} --body-file .claude/state/comment-body.md \
  --stage develop-complete --json
```

> Engine source: `references/tracker-comment.js` (bundled into each skill as `references/tracker-comment.js`). Contract: `references/tracker-comment-contract.md`.


Read `reason` and act per the table in [`references/tracker-comment-contract.md`](tracker-comment-contract.md) — `posted`/`already`/`deferred` need nothing, `unverifiable` is logged and never posted over, and `no-credentials` is the one case that may fall back to MCP.

#### develop-task

```bash
mkdir -p .claude/state
cat > .claude/state/comment-body.md <<'EOF'
## 🛠️ Development Complete — Step 3/8

**Status**: Ready for Review
**Phases completed**: {audit.completed}/{audit.total}
**Tests**: {all passing / {N} failures — see implementation report}
**Branch**: {branch}
EOF

node .agents/skills/{develop-story|develop-task|develop-bug}/references/tracker-comment.js \
  --issue {TRACKER_ISSUE} --body-file .claude/state/comment-body.md \
  --stage develop-complete --json
```

Read `reason` and act per the table in [`references/tracker-comment-contract.md`](tracker-comment-contract.md) — `posted`/`already`/`deferred` need nothing, `unverifiable` is logged and never posted over, and `no-credentials` is the one case that may fall back to MCP.

Use `audit.completed` / `audit.total` from the final loop-audit result. Use the last `TEST_EXIT` value: `0` → "all passing"; non-zero → "{N} failures — see implementation report". On failure: log warning in Issues Log and continue.

Log in Decisions Log: "Development completion comment posted to {TRACKER} issue {TRACKER_ISSUE}."

**Apply the Step Transition Protocol from the orchestrator SKILL.md immediately.** Concretely, your next assistant turn after `/develop` returns MUST contain — in this order, with no prose between — (1) the Pipeline Progress ✅ update, (2) the Bash lock-update advancing `current_step` to 4, (3) the Step 4 banner, (4) the `/create-pr` invocation. Do NOT print "Returning to pipeline orchestrator", "Development complete", or any summary message before issuing the lock-update Bash tool call. The lock advancement is what proves Step 4 has started; if the model emits a summary instead, the pipeline will stall under context pressure (observed regression in live-github-test runs).

---

## Remaining Work Status Banner

Required: output after each develop-loop iteration that continues, and after Steps 1, 2, 4, 5–6, and 7 complete.

#### develop-story banner

Read the story file to get unchecked `[ ]` task names from the Tasks section. Output:

```
═══ REMAINING WORK STATUS ═══
Pipeline position:  Step {N}/8 — {STEP-NAME} {✅ just completed / ⏳ in progress, iter {ITER}/{MAX_ITER}}

Remaining story tasks ({X} of {M} tasks complete):
  ✅ Task {n}: {name}      ← already ticked
  ⬜ Task {n+1}: {name}   ← still to do
  ...

Pipeline steps still ahead:
  - Step {next-step}: {name}
  - ...
  - Step 8: commit-changes + push
```

Omit the "Remaining story tasks" block once Step 3 is ✅ complete. Keep the banner brief — one block per event, not one per sub-step.

#### develop-task banner

Read the task file to get unchecked `[ ]` phase names from the Implementation Plan. Output:

```
═══ REMAINING WORK STATUS ═══
Pipeline position:  Step {N}/8 — {STEP-NAME} {✅ just completed / ⏳ in progress, iter {ITER}/{MAX_ITER}}

Remaining task phases ({X} of {M} phases complete):
  ✅ Phase {n}: {name}      ← already ticked
  ⬜ Phase {n+1}: {name}   ← still to do
  ...

Pipeline steps still ahead:
  - Step {next-step}: {name}
  - ...
  - Step 8: commit-changes + push
```

Omit the "Remaining task phases" block once Step 3 is ✅ complete. Keep the banner brief — one block per event, not one per sub-step.

---

## On Halt

#### develop-story
Log the reason in Issues Log, invoke the `/commit-changes` skill to save the report (suggested message: `docs(story.{epic}.{story}): implementation report — develop halt`), then HALT with the report path.

#### develop-task
Log the reason in Issues Log, invoke the `/commit-changes` skill to save the report (suggested message: `docs(task.{id}): implementation report — develop halt`), then HALT with the report path.

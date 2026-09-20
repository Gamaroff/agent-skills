---
name: develop-story
description: 'Automates the full end-to-end story development lifecycle: create-story-branch → review-story → develop → create-pr → qa-story → qa-fix (iterative, up to 5 cycles) → review-pr (Step 5c, the QA loop''s exit gate) → finalise → commit-changes. Story branches are cut from `develop` and PR back to `develop` (standard Gitflow); an epic has no branch of its own unless it opts in to `branch_model: epic-integration`, in which case its stories are cut from and PR into that epic''s integration branch (`epic/{n}.{name}`), created on demand. Features: Explore subagent for story resolution and pre-develop codebase mapping; context hygiene between steps; lite mode for low-risk stories; resume with per-step artifact verification; bounded develop loop (MAX_ITER=5). Records all decisions in a co-located implementation report. Invoke with `/develop-story [story-file-path]` or "develop and QA this story end to end".'
invokes: [create-branch, review-story, develop, create-pr, qa-story, qa-fix, review-pr, finalise, commit-changes]
---

> **Status lifecycle**: see [`references/document-status-lifecycle.md`](references/document-status-lifecycle.md)

# Develop Story — Automated Lifecycle Orchestrator

This skill orchestrates the complete story development lifecycle, calling each skill in sequence and maintaining an implementation report that records every significant decision and issue encountered along the way.

## Setup — Pipeline Hooks (one-time, per project)

The pipeline runs hands-free when two Claude Code hooks (`PreCompact` for graceful pause; `Stop` for forced continuation) are registered in `.claude/settings.json`. **Strongly recommended** — without the `Stop` hook, the orchestrator relies on prose-level "never stop between steps" rules that have been observed to fail under context pressure.

**Install both with one command** (idempotent, preserves existing settings, `--dry-run` available):

```bash
bash .agents/skills/develop-story/scripts/install-hooks.sh
```

**Full reference** — every hook in this pipeline, what each does, escape valves, interaction diagram, troubleshooting, and authoring contract for new hooks: [`references/develop-pipeline-hooks.md`](references/develop-pipeline-hooks.md). For the deep PreCompact pause/resume semantics specifically: [`references/develop-pipeline-pause.md`](references/develop-pipeline-pause.md). For the lock-advance helper used by both hooks and by the orchestrator's manual fallback path: [`references/advance-pipeline-lock.sh`](references/advance-pipeline-lock.sh) (sourced from `references/advance-pipeline-lock.sh`).

Hooks noop outside pipeline runs — zero overhead when no `.claude/state/develop-pipeline.lock` is present.

## When to Use This Skill

- User says `/develop-story <path>` or passes a story file path
- User wants to run a story through the full automated pipeline without hand-holding each step
- User wants an audit trail of decisions made during story implementation

---

## Phase 0: Resolve & Prepare

See `references/develop-pipeline-step-0-resolve-and-prepare.md` for the full resolve-and-prepare protocol: file/issue resolution (0a), pipeline state check (0b), upfront context reading including status handling and lite-mode detection (0c), tracker signal/board update procedure (0c-reg — **defined in step-0 but invoked from Step 1** after the lock is written; see step-1 §"Signal Work Started"), upfront prompts via AskUserQuestion (0d — Q1 base + Q2 PR target with auto-derived recommended option; qa-planning silent skip, no Q3), implementation report creation with templates (0e), and pre-flight summary (0f).

> Phase 0 parallel dispatch (resolver + tracker poller + lite-mode detector) is defined in the shared resource above — do not duplicate the dispatch logic here. Modifications belong in `references/develop-pipeline-step-0-resolve-and-prepare.md`.

---

## Phase 1: Pipeline Execution

### Context Compression Recovery (CRITICAL — read this first)

If context was compressed while this pipeline was running (i.e., the conversation was summarized and you are now resuming), follow this sequence exactly — do not improvise:

**Step 0 — Re-read the full skill file before anything else:**

```bash
# The skill instructions in the system reminder are TRUNCATED after compression.
# Improvising steps from memory produces wrong artifacts and misses required invocations.
# Always read the full skill first:
cat .agents/skills/develop-story/SKILL.md
```

Output: "⚠️ Context recovery — re-reading full skill file before resuming."

**Step 0-lock — Restore the lock if the pause removed it (task.124, obs #123):**

The PreCompact hook and every terminal HALT **remove the lock**. A session that continues in place — this one, if you are reading this after a `🛑 PIPELINE-PAUSE-SIGNAL` or a HALT rather than after a fresh `/develop-story` invocation — has no step that puts it back: Step 1 is the lock's only ordinary writer and a resume skips it. Without the lock every `advance-pipeline-lock.sh <n>` below is an error (no longer a silent no-op) and the `Stop` hook is inert. Run this **before** any step advances:

```bash
bash .agents/skills/develop-story/references/advance-pipeline-lock.sh --restore {story-directory}
```

It rebuilds the lock from the halt snapshot (`.claude/state/develop-pipeline.last-halt.json`) or an orphaned `.lock.pausing.<pid>` claim — newest candidate **for this document** wins; one for another document is refused — keeps `current_step` at the halted step, strips the halt/pause fields and any `waiting_on`, and consumes the candidates. **The same call belongs on the re-invocation path**: Phase 0b's "Resume from last completed step" also skips Step 1, so when the detector's `source` is `halt_snapshot` or `orphaned_claim` run `--restore {story-directory}` before Phase 0b verification (step-0 §0b Shared Resume Logic; task.124 QA cycle 2, CR-2). Which snapshots restore here and which wait — who restores, and when: resume contract § Restore the lock (both resume paths); this paragraph carries no copy of that rule (task.130). "lock present — nothing to restore" (exit 0) means the lock survived and nothing was needed. Exit 1 with "no halt snapshot … and no orphaned claim" means there is nothing to restore from: treat the run as Phase 0b's fresh-start case. Exit 1 with `legacy-snapshot: …` is a **different** state — a pre-task.123 snapshot with no directory that the helper refuses to guess about; restore it deliberately with `--restore --accept-legacy` or delete it (hooks reference, troubleshooting), never a fresh start.

**Step 0a — Dispatch stale-context detector (Phase 0a):**

Dispatch a read-only Explore subagent using `references/pipeline-resume-detector-prompt.md`. The subagent reads `.claude/state/develop-pipeline.lock`, lists `.summaries/step-*.json` in the story directory, and diffs artifact mtimes. It returns `recommended_step`, `deltas_since_pause`, and `blocking_issues`.

Surface the detector output to the user and wait for confirmation. If `blocking_issues` is non-empty: **HALT** — require manual resolution before resuming. Use `recommended_step` to narrow Step 1 verification scope.

See `references/develop-pipeline-resume-contract.md` — Phase 0a for the full dispatch, output validation, and blocking-issues protocol. Stale snapshots the detector reports (a `deltas_since_pause` object whose `concern` starts `stale-snapshot`) are deleted **here**, by the orchestrator, and verified absent before Phase 0b — the loop is the resume contract § Consume Output; do not copy it (task.130).

**Step 1 — Recover pipeline state from the implementation report:**

```bash
ls {story-directory}/story.{epic}.{story}.implementation.*.md 2>/dev/null | sort | tail -1
```

1. Read the implementation report. Find the last ✅ step in the Pipeline Progress table.
2. **Verify each ✅ step's artifact exists up to `recommended_step - 1`** (see `references/develop-pipeline-resume-contract.md` — Phase 0b for the full contract). Steps at or after `recommended_step` are treated as ⏳ Pending. If Phase 0a failed validation, fall back to verifying all steps using `current_step` from the lock as the upper bound.
3. Output: "⚠️ Context recovery — last verified step: Step {recommended_step - 1}. Resuming from recommended step {recommended_step}."
4. Continue from `recommended_step` — do NOT re-run steps already verified, do NOT skip any pending steps.

**This recovery is mandatory even if the user did not explicitly re-invoke `/develop-story`.** If you are in a conversation where `develop-story` was previously running and context was then compressed, you are still the develop-story orchestrator and must complete all remaining steps. A context summary saying "next step: create-pr" does NOT mean the pipeline ends after create-pr — it means Step 4 is next, and Steps 5–8 still follow.

### Graceful Pause on Imminent Compaction (CRITICAL — read this second)

This complements the post-compaction recovery above. **Pre**-compaction graceful pause requires the `PreCompact` hook to be installed (see Setup section at the top of this file). When the hook fires:

1. The hook itself appends a "Pipeline Paused" entry to the implementation report, commits, pushes, and posts a PR/issue comment — all best-effort, all done before compaction proceeds.
2. The hook emits `🛑 PIPELINE-PAUSE-SIGNAL` as `additionalContext` to you, which appears as a `<system-reminder>` in your next turn.
3. The hook removes the lock file.

**When you observe `🛑 PIPELINE-PAUSE-SIGNAL` in a system reminder:**

1. **Stop everything.** Do not invoke any sub-skill. Do not edit the implementation report (the hook already did). Do not run any tools beyond what's needed for the user-facing summary.
2. **Output the pause banner**:
   ```
   ═══ DEVELOP-STORY PIPELINE: PAUSED — CONTEXT COMPACTION IMMINENT ═══
   ```
3. **Output the user-facing summary** using the template provided in the signal's `additionalContext`. Repeat the two comment outcomes the signal reports (`PR comment:` / `Tracker issue comment:`) verbatim — `deferred` means the consumer's `access.tracker` held, `no-credentials` on a Jira issue means the Jira side was not commented on.
4. **HALT.** Do not proceed to any further step. The lock file has been removed by the hook; on next user invocation of `/develop-story <path>`, Phase 0b will detect the existing run, read the report, and resume cleanly. If instead the session **continues in place** after the compaction, the Context Compression Recovery's Step 0-lock (`advance-pipeline-lock.sh --restore {story-directory}`) is the first action — the signal's own summary names it.

**No additional report edits, no additional commits, no additional comments** — the hook already did all of that, and you have very little budget left before compaction proceeds. Spending it on duplicate work risks losing the user-facing summary entirely.

For the full lock-file format, hook contract, and half-done step recovery semantics, see `references/develop-pipeline-pause.md`.

### Context Management Rule (CRITICAL)

After EVERY step completes, before moving to the next step:

1. Retain only: step outcome (pass/fail), key decisions made, file paths of artifacts produced
2. Release all intermediate file contents from active consideration — do not re-read files that were already processed unless specifically needed
3. Summarize the step result in ≤5 bullet points in the implementation report, then treat step as closed

When a step dispatches subagents, persist their summaries per the convention in `references/subagent-summary-artifact.md` and update the implementation report's `Subagent summary ref` column in the same write. The on-disk JSON lets you safely release the subagent's verbose output from active context — resume reads the summary from disk if needed.

This prevents context accumulation across the 8-step pipeline.

**Never stop between steps.** This pipeline runs hands-free from Step 1 to Step 8. Never output a "done" or "complete" message and stop unless a step explicitly results in HALT or the pipeline has reached Step 8. Completing Step 4 (create-pr) is NOT a terminal state — Step 5 must follow immediately.

**Step Transition Protocol (mandatory — prevents orchestrator stalls).**

> Visual mnemonic:
>
> ```
> SUB-SKILL RETURNS → [Bash advance] → [Edit ✅] → [Status + Banner] → [Skill]
>                          ↑
>                FIRST. ALWAYS. NO PROSE BEFORE.
> ```

Every step ends with the same four actions, executed _in order, with no text output between them_:

1. **Bash tool call** advancing the lock to the next step (use the helper: `bash .agents/skills/develop-story/references/advance-pipeline-lock.sh {N+1}`). **This must be the first call** — it is the binding side-effect that anchors the orchestrator into "still working" mode and signals to the `Stop` hook that the pipeline has advanced. If the just-completed step was Step 8, use `--complete` instead, which removes the lock. (This call is idempotent: a sub-skill normally self-advances the lock as its own last action, so this re-advance noops — but issuing it unconditionally is the deterministic, single-instruction behaviour.)
2. **Edit the implementation report** Pipeline Progress row for the just-completed step (`✅ Done`), then **read it back** — this is lint call site (1) of the four the report-lint contract names, and it is a tool call, not prose:

   ```bash
   command node .agents/skills/develop-story/references/report-lint.js --file "{implementation-report-path}" --json; rc=$?
   case $rc in
     0) ;;
     1) echo "HALT: report failed lint — the Edit above corrupted it; repair by hand (see the problems listed), nothing has been committed"; exit 1 ;;
     2) echo "HALT: report-lint usage error — the call site is wrong, not the report"; exit 1 ;;
     *) echo "HALT: report-lint.js not runnable (rc $rc) — check the bundled path"; exit 1 ;;
   esac
   ```

   A `problems` result is a HALT with nothing committed — the protocol edits, it does not commit, so the corruption is caught where the Edit introduced it rather than at the next commit boundary. task.117's report was doubled and spliced mid-line by exactly such an Edit and shipped in the HALT commit because nothing read it back (obs #115). The linter never repairs.
3. **Emit the Remaining Work Status block, then the Step {N+1} banner** (or the Phase 2 Completion banner if N=8) — one contiguous output, nothing between them:

   ```
   ═══ REMAINING WORK STATUS ═══
   Pipeline position:  Step {N}/8 — {STEP-NAME} ✅ complete

   Pipeline steps still ahead:
     - Step {N+1}: {name}
     - ...
     - Step 8: commit-changes + push

   ═══ DEVELOP-STORY PIPELINE: STEP {N+1}/8 — {STEP-NAME} ═══
   ```

   The status block is **required at every transition**, not optional garnish — it is what makes pipeline position legible after compaction and to a user reading the log later. Canonical format, the other firing points (each continuing develop-loop iteration, each QA/verify cycle, every HALT) and the "Remaining story tasks" middle block that shows while Step 3 is open: [`references/develop-pipeline-remaining-work-banner.md`](references/develop-pipeline-remaining-work-banner.md).
4. **Invoke the next sub-skill** via the Skill tool in the same assistant turn. Do NOT pause for user acknowledgement, do NOT summarise progress to the user, do NOT print "Returning to pipeline orchestrator" or any equivalent.

Failure mode this defends against: a sub-skill returns control with a "complete" message and the orchestrator emits a natural-language summary before issuing the lock-update Bash call. Under context pressure the model may then yield to the user. **The lock-update Bash call must come FIRST** — emit it the moment the sub-skill returns, before any prose. The lock-update Bash call is the binding signal that the next step has started; without it the pipeline is considered stalled.

Two structural defences back this up (in order of which fires first):

1. **Sub-skill self-advance** — each pipeline sub-skill calls `advance-pipeline-lock.sh --skill <own-name>` as the last inline action of its body, so the lock advances the moment the sub-skill's work completes — before control returns to the orchestrator.
2. **`Stop` hook (`on-stop.sh`)** — reactive backstop: if the orchestrator nonetheless tries to stop mid-pipeline, the hook reads the lock and returns a `decision: "block"` reason that re-prompts the orchestrator to run actions 1–4 above.

**Step banners (required).** Before starting each step, output a visible banner:

```
═══ DEVELOP-STORY PIPELINE: STEP {N}/8 — {STEP-NAME} ═══
```

This creates persistent checkpoints that survive context compression and make the pipeline position unambiguous.

**Lock file `current_step` update (required, Steps 2–8).** Per the Step Transition Protocol above, this is **action #1** — the first tool call after a sub-skill returns, before the row update or banner. Both the `PreCompact` and `Stop` hooks read this field to know where the pipeline is. Use the helper script (idempotent, atomic, single source of truth):

```bash
bash .agents/skills/develop-story/references/advance-pipeline-lock.sh {N+1}
```

For Step 8 → completion: `... advance-pipeline-lock.sh --complete` (removes the lock).

**Steps 5–6 are one step to the lock.** `current_step` goes `4 → 5` when the QA loop is entered and
`5 → 7` when 5c returns APPROVE or CONCERNS; `advance-pipeline-lock.sh 6` is **never** issued. Inside
the loop the sub-position is the lock's `qa_phase` field (`5a|5b|5c`), which
`references/set-qa-phase.sh` writes as each sub-step's first action and the `Stop` hook reads to name `/qa-story`,
`/qa-fix` or `/review-pr`. The helper is monotonic and must stay so; `qa_phase` is how the loop's
`5b → 5a` re-entry is expressed without moving `current_step` backwards (task.123, option B). The
loop's budget is `QA_MAX_CYCLES` — the lock's `qa_max_cycles` when present, else 5; a granted re-entry
writes it as the reconstructed cycle count plus `extra_cycles_granted` (Phase 0b below).

Skip this for Step 1 (the lock is created at the _end_ of Step 1, after the feature branch exists — see Step 1 below).

After each step: update the Pipeline Progress table (✅ Done / ❌ Failed / ⚠️ Needs Attention / ⏸️ Paused — see Graceful Pause section) and log any decisions or issues before moving on.

### Step 1: Create Branch

See `references/develop-pipeline-step-1-create-branch.md` for the full Step 1 protocol: lock collision check, pre-flight board/Jira verification, implementation report stash/restore, `/create-branch` invocation, post-branch steps, and pipeline lock file creation.

### Step 2: Review Story

See `references/develop-pipeline-step-2-review.md` for the full Step 2 protocol: gate check (skip conditions), `/review-story` invocation, output format autonomous decision, outcome detection, and blocking/non-blocking findings handling.

### Step 3: Develop

See `references/develop-pipeline-step-3-develop-loop.md` for the full Step 3 protocol: pre-develop codebase mapping (Explore subagent), plan file discovery, internal gate handling (draft/planned, high-risk, alignment), bounded develop loop with stall detection, Remaining Work Status banner, halt protocol, and **test-failure triage** (capture test output to `.claude/state/test-output-${ITER}-*.log`, dispatch Explore with `references/test-failure-triage-prompt.md`, main consumes summary only).

> **Pre-develop staleness re-validation (Review 4 R-15a).** Before invoking `/develop`, if **sibling stories in the same epic merged code to `develop` after this story was authored** (compare the story's `created`/`updated` frontmatter against recent `develop` history), re-run `review-story --validate` on the story first. A story authored against an earlier codebase can cite symbols/paths that moved once sibling work landed — the `--validate` pass re-checks the story against current `develop` and flags drift before implementation begins. Skip only when the story was authored/updated after the epic's most recent code merge to `develop`.

### Step 4: Create PR

See `references/develop-pipeline-step-4-create-pr.md` for the full Step 4 protocol: `/create-pr` invocation with `--base` and tracker-conditional `--issue`, implementation report exclusion, post-PR steps, Jira tracker update (PR-opened comment + In Review transition), failure handling, and the mandatory pipeline continuation banner.

### Step 5–6: QA Review / Fix Loop

See `references/develop-pipeline-step-5-6-qa-loop.md` for the full Steps 5–6 protocol: QA cycle counter setup, gate file location, QA skill invocation (with lite mode directive), PASS/CONCERNS/FAIL branching, no-code-change HALT, qa-fix invocation, commit/push per cycle, escalation entry, and loop limit HALT message.

**The loop's exit gate is Step 5c — `/review-pr`, not the QA gate.** A gate that reads `PASS` or
`WAIVED` hands to 5c, which runs `/review-pr --effort {medium|low} --comment` over the open PR.
`REQUEST CHANGES` routes back to 5b `/qa-fix` and consumes a cycle from the **shared** 5-cycle
budget; `CONCERNS` records findings without blocking; `APPROVE` exits to Step 7. The
`ready-for-merge` stage fires there, after the review clears — not on the QA gate. `/review-pr`
stays advisory throughout: it writes no gate file and never edits code, and this orchestrator is
what acts on its verdict. Lite mode degrades it to `--effort low` and never skips it. It leaves
`story.{epic}.{story}.pr-review.{n}.{name}.md` beside the work item.

### Step 7: Finalise

See `references/develop-pipeline-step-7-finalise.md` for the full Step 7 protocol: `/finalise` invocation, completion detection, DoD gaps halt (with commit + push), DoD-body-to-PR comment, tracker issue update (GitHub close + board Done, Jira Done transition), DoD summary file location, Step 7 Completion Checklist, and Pipeline Progress update.

**Lite mode applies to Step 5 only** (and degrades Step 5c to `--effort low` without skipping it). Step 7 (finalise + PR DoD comment + issue close + board Done) runs in full in every mode. Do NOT inline `/finalise` by writing the DoD file directly — invoke the skill. See the Step 7 Completion Checklist before marking the row ✅.

### Step 8: Commit Changes

See `references/develop-pipeline-step-8-commit.md` for the full Step 8 protocol: final implementation report update (Finished timestamp, Final Status, QA Iterations, Completion Summary), `/commit-changes` invocation, final push, Pipeline Progress update, and pipeline lock file removal.

---

## Phase 2: Completion

Output the final status:

```
✅ Story Development Complete

Story:                 {story filename}
Branch:                {branch name}
PR:                    {PR URL}
QA Cycles:             {N}
Implementation Report: {report file path}

All pipeline steps completed successfully. The story is accepted and all changes committed.
```

For any other halt:

```
⚠️ Story Development Paused — Human Input Required

Story:                 {story filename}
Paused at:             Step {N} — {step name}
Reason:                {concise reason}
Implementation Report: {report file path}

The implementation report has a full account of what was completed and what needs attention.
```

---

## Autonomous Decision Defaults

Every default applied must be recorded in the Decisions Log.

See `references/develop-pipeline-autonomous-defaults.md` for the full shared autonomous-mode default-behavior table (covers all rows common to both `develop-story` and `develop-task`).

### Skill-specific defaults (develop-story only)

| Situation                                                           | Default                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| review-story invocation mode                                        | Always **validate-and-apply** (`MODE=validate` + `APPLY=true`) — non-interactive, no questions asked. This variant runs the constrained forms of Steps 9.5 and 10 below and writes a `story.{epic}.{story}.review.{n}.{story-name}.md` report |
| review-story Step 9.5 (implement fixes)                             | Apply all critical + important fixes automatically — the pipeline needs the story fully corrected before Step 3 runs `/develop`                                                                                                               |
| review-story Step 10 (update status) when GO / READY TO IMPLEMENT   | Promote `Draft → Ready for Development` automatically — the pipeline needs that status before Step 3                                                                                                                                          |
| review-story Step 10 when NO-GO (NEEDS REVISION or REQUIRES REWORK) | HALT — story is not ready; surface review findings to user before proceeding                                                                                                                                                                  |

If a situation arises that is not in the shared defaults table and the stakes are non-trivial, **HALT and ask the user**. Log the question and the user's answer in the Decisions Log.

---

## Error Recovery Principles

- **Never silently continue past a failed step.** Every failure is logged and surfaced to the user.
- **Always use `/commit-changes` to commit** — never raw `git commit`. This ensures consistent commit quality, conventional messages, and proper staging.
- **Commit the report before any halt.** Invoke `/commit-changes` for the report before surfacing any HALT so the audit trail is in git even when the pipeline doesn't complete — and **lint it first** (call site (2) of four): `command node .agents/skills/develop-story/references/report-lint.js --file "{implementation-report-path}" --json; rc=$?; case $rc in 0) ;; 1) echo "⚠️ report failed lint — HALT commit skipped; repair {implementation-report-path} by hand" ;; 2) echo "⚠️ report-lint usage error — the call site is wrong, not the report; HALT commit skipped" ;; *) echo "⚠️ report-lint.js not runnable (rc $rc) — HALT commit skipped" ;; esac`. A report that fails the linter is **not committed** by this rule, and the HALT **still proceeds** to the snapshot and lock removal below — the same decision the PreCompact hook makes, because the snapshot and the lock removal are what resume depends on and a lint failure must not strand the lock (task.124 QA cycle 2, CR-5). The corruption stays in the working tree, named, for a human to repair before the next commit. The HALT commit is the one most likely to carry a half-written report, because it is written under the pressure that caused the halt (task.117, obs #115).
- **Push after every commit during the QA loop.** The PR must stay current with the local branch (`git push origin HEAD`).
- **The implementation report is the primary recovery tool.** Always include its path in halt messages.
- **Snapshot then remove the lock file before every terminal HALT.** After committing the report (per the rule above), copy the active lock to a halt snapshot and then remove the active lock + transient logs:

  ```bash
  if [ -f .claude/state/develop-pipeline.lock ]; then
    jq --arg reason "{halt_reason}" --arg step "{halt_step}" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
       '. + {halted_at: $ts, halt_reason: $reason, halt_step: $step}' \
       .claude/state/develop-pipeline.lock > .claude/state/develop-pipeline.last-halt.json
  fi
  rm -f .claude/state/develop-pipeline.lock
  find .claude/state -maxdepth 1 -name 'test-output-*.log' -delete 2>/dev/null || true
  ```

  **Two commands, not one `rm` argv.** The lock is a path that must be removed; the logs are a glob that may match nothing. Under zsh — the default shell on every macOS host — an unmatched glob is `nomatch`, which aborts the whole command **before `rm` runs**, so the one-argv form left the lock in place on every HALT that had no test logs to sweep (obs #111). `find -delete` is the glob-free spelling and is a noop on an empty match in every shell. The rule: [`docs/reference/anti-patterns.md`](../../docs/reference/anti-patterns.md) § "Never put a must-succeed path and a glob in one `rm` argv".

  Removing the active lock prevents a future PreCompact firing in this same session from re-running the pause flow, and stops accumulation of transient Step 3 test logs. The **halt snapshot** (`develop-pipeline.last-halt.json`) preserves resume context so the next `/develop-story` invocation can re-enter Phase 0b artifact verification: the resume detector subagent reads the snapshot when no active lock is present, surfaces it to the user, and offers "Resume from {halt_step}" or "Start fresh" (latter deletes the snapshot). The graceful-pause hook also removes the active lock itself if it runs — this rule covers the non-hook halt paths.

  **Re-entry after a QA loop escalation** (`halt_reason` matches `loop-limit|not-converging`): the Phase 0b prompt is the halt message's own three options plus a fourth — **"Resume at 5a with {k} more cycles"** (AskUserQuestion; recommended `k` = 2; "Other" takes a number). Before asking, reconstruct the cycle count **from the gates on disk** and back-fill any `### QA Cycle` entry a cycle the operator ran by hand did not write — the procedure, and why the report count cannot be the source, is the resume contract's **Re-entry after a QA loop escalation**. On accept, record the grant with **one call** — the bundled script reconstructs the base as max(highest gate on disk, report entries), restores the lock from the halt snapshot when the HALT removed it (refusing a snapshot for another document), never lowers an existing budget, and writes `extra_cycles_granted`, `qa_max_cycles` and `qa_phase: 5a` atomically:

  ```bash
  bash .agents/skills/develop-story/references/grant-qa-cycles.sh {story-directory} {k} {implementation-report-path}
  ```

  Then run the loop with `QA_MAX_CYCLES` = the lock's `qa_max_cycles` — the reconstructed count plus the grant, **never `5 + k`**: gates written since the original budget (a half-cycle's `gate.6`, an operator's cycle) would otherwise be counted against the grant, and a second grant could never extend past the first. Do not inline the `jq`: a `$QA_CYCLE` bound in another fenced block does not exist in this one, and the lock the write targets does not exist after a HALT until the script restores it (task.123 QA cycle 2). The field names are `extra_cycles_granted` and `qa_max_cycles` everywhere they appear — lock, snapshot, writer script, step-5-6 doc, resume contract, this file — and `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs` fails on another spelling. Log the grant in the Decisions Log: "QA loop re-entry: {k} extra cycles granted; {m} cycle(s) run outside the loop back-filled from disk." A declined grant — or one the script refuses with exit 1 (surface its stderr line) — restores no lock and runs no cycle: the run returns to the halt message's own three options, per the resume contract's re-entry step 4.

- **Signal `blocked` on a terminal HALT** (when `TRACKER=jira` and `TRACKER_ISSUE` is set). After the snapshot above, before surfacing the HALT:

  ```bash
  node .agents/skills/develop-story/references/jira-stage.js \
    --issue {TRACKER_ISSUE} --stage blocked --json
  ```

  **Only for a real blockage** — a review gate that failed, five QA cycles without a clean gate, a merge conflict, a DoD the work does not meet. Do **not** fire it when the halt is an *interruption*: plan mode, a denied permission, a compaction pause, or the user stopping the run. Those are pauses in the operator's attention, not states of the work, and a card parked in Blocked misreports the second as the first to everyone reading the board.

  `blocked` is **off by default** and opted into per issue type in the workflow record. Expect `reason: "stage-disabled"` until a project turns it on, and `skip (no-transition)` on boards that have the status but do not offer it from where the card currently sits — many workflows only allow Blocked from a testing column. Both are correct outcomes; the CLI exits 0 and the HALT proceeds either way.

- If a sub-skill cannot be found, log the error and tell the user to verify the skill is installed in `.agents/skills/`.

---

## File References

- Stories: co-located within epic directories — `${PRD_ROOT}/<domain>/<feature>/epics/epic.{N}.<name>/stories/`
- Story directory: `${PRD_ROOT}/<domain>/<feature>/epics/epic.{N}.<name>/stories/story.{epic}.{story}.{name}/`
- Story file: `story.{epic}.{story}.{name}.md`
- Implementation report: `story.{epic}.{story}.implementation.{N}.{descriptive-name}.md`
- Review report: `story.{epic}.{story}.review.{N}.{name}.md` (generated by Step 2 `/review-story`)
- QA gate: `story.{epic}.{story}.gate.{N}.{name}.yml`
- QA report: `story.{epic}.{story}.qa.{N}.{name}.md`

## Related Skills

- `/create-branch` — Step 1
- `/review-story` — Step 2
- `/develop` — Step 3
- `/create-pr` — Step 4
- `/qa-story` — Step 5
- `/qa-fix` — Step 6 (5b — the lock stays at `current_step: 5`, `qa_phase: 5b`)
- `/review-pr` — Step 5c (the QA loop's exit gate; advisory — the orchestrator acts on its verdict)
- `/finalise` — Step 7
- `/commit-changes` — Step 8

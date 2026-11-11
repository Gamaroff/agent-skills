---
name: develop-pipeline-hooks
description: Canonical reference for the Claude Code hooks the develop-story and develop-task pipelines use to stay hands-free. Catalogues every hook (PreCompact, Stop), the install script, the lock-file contract that drives them, the escape valves that keep them safe, and how they interact. Cross-links the pause/resume deep dive in develop-pipeline-pause.md.
---
<!-- AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/develop-pipeline-hooks.md. Regenerate via `npm run bundle`. -->

# Develop Pipeline — Hooks Reference

The `/develop-story` and `/develop-task` orchestrators rely on **two** Claude Code hooks to run the full 8-step pipeline hands-free. Both hooks are opt-in (registered in `.claude/settings.json`), both read the same lock file (`.claude/state/develop-pipeline.lock`), and both noop outside pipeline runs.

This document is the single source of truth for what hooks exist, what they do, and how to install them. For the deeper pause/resume semantics (lock-file format, half-done step recovery), see [`develop-pipeline-pause.md`](develop-pipeline-pause.md).

---

## TL;DR — install both hooks

```bash
# After installing skills (e.g. via `bash setup-consumer.sh` or `--update`):
bash .agents/skills/develop-story/scripts/install-hooks.sh
```

Idempotent. Preserves existing settings. `--dry-run` to preview.

---

## Hook catalog

| Hook event | Script | Purpose | Mandatory? |
|------------|--------|---------|------------|
| `PreCompact` | `on-precompact.sh` | Graceful pause when Claude Code is about to compact the conversation mid-pipeline | Optional (pipeline still resumes correctly without it; just no PR comment / pause-state report entry) |
| `Stop` | `on-stop.sh` | Force the orchestrator to continue when it tries to yield mid-pipeline (structural backstop for context-pressure stalls) | **Strongly recommended** — without it the pipeline relies entirely on prose-level "never stop between steps" rules, which fail under context pressure |

Both scripts are byte-identical across `develop-story` and `develop-task` installs — the lock file's `skill` field selects the orchestrator at runtime.

> **Why no `PostToolUse:Skill` auto-advance hook?** An earlier design shipped a third hook (`on-skill-return.sh`) that advanced the lock and injected a "next step" reminder when a sub-skill "returned." This was removed: the Skill tool executes **inline** in the orchestrator's context, so a `PostToolUse` hook matching the Skill tool fires the instant the skill's instructions are *loaded* — before any of its work runs. Claude Code has **no** hook event for skill *completion*. The hook therefore mis-fired on every sub-skill call, advancing the pipeline before the step did any work. Lock advancement is handled correctly by **sub-skill self-advance** (an instruction inside each sub-skill body, which runs inline *after* the work) plus the **Stop** hook backstop — see [`pipeline-lock-cooperation.md`](https://github.com/Gamaroff/agent-skills/blob/develop/shared/resources/pipeline-lock-cooperation.md).

---

## 1. PreCompact hook — `on-precompact.sh`

**Event**: [`PreCompact`](https://docs.claude.com/en/docs/claude-code/hooks) — fires immediately before Claude Code summarises the conversation context to free up tokens.

**Purpose**: durably checkpoint the running pipeline so it can be cleanly resumed after compaction.

**Trigger condition** (inside the hook): `.claude/state/develop-pipeline.lock` exists **and this invocation claims the pause** — the hook's first act is an exclusive `ln` of its pid file to `.claude/state/develop-pipeline.precompact-claim.d/pid` (`mkdir` is not exclusive on every kernel, bug.21), released on exit. With no lock = no active pipeline = noop; with a claim another live invocation holds = the same noop. So a hook registered twice (task.110: one `settings.json`, two path spellings of the same command) still produces one pause, not two. A claim whose holder is dead (a SIGKILLed hook skips its EXIT trap) — or one with no pid, older than a minute — is taken over, so a killed pause never silences the next one. The claim directory is deliberately outside the `develop-pipeline.lock.pausing.*` family: until 2026-11 the claim was an `mv` of the lock to `.lock.pausing.<pid>`, which is what removed the lock, and readers still treat a `.pausing.*` file as an orphaned lock copy. The winner sweeps any such legacy file.

**The lock is kept, marked paused (2026-11).** Claude Code continues the same session after a compaction, and a removed lock left that session with `set-qa-phase.sh`, `set-waiting-on.sh` and this file's Stop hook inert until someone ran `--restore` by hand (three times in one consumer run on 2026-11-10). The hook now adds `paused: {at, step, reason: "precompact"}` to the lock instead. The mark:

- **lets the Stop hook allow the halt** the pause signal asks for (an escape valve, below) — the pass-through a removed lock used to give;
- **is cleared by the session's next lock write** — `advance-pipeline-lock.sh` (a numeric or `--skill` advance, including the idempotent no-op re-assert and the finalise hold), `set-qa-phase.sh`, `set-waiting-on.sh`, `--clear-pause`, or `--restore <doc-dir>` — with no recovery step, which also consumes this pause's snapshot;
- **makes a repeat pause a no-op**: a lock still marked means no writer ran since the last pause, so a second compaction (or a duplicate hook run that started after the winner finished) refreshes the snapshot, repeats the signal, and records nothing — no report block, no commit, no comment.

**Side effects** (best-effort, all wrapped in `... || true`):

0. **Write a resume snapshot first, then mark the lock** — `develop-pipeline.last-halt.json` (co-located with the lock) as a **superset of the lock** plus `paused_at`, `pause_reason: "precompact"`, and `halt_step` (aliasing the lock's `current_step`), without the lock's own `paused` field; then the `paused` mark on the lock (mktemp + `mv`). A hook killed between the two leaves the snapshot and an unmarked lock, which the next pause redoes. Degrades to a verbatim `cp` of the lock when `jq` is unavailable (`current_step` is still preserved), and the lock is then kept unmarked. The snapshot is the record a lost lock resumes from; while the lock survives, the lock is the record.
1. Append a `## Pipeline Paused — {timestamp}` block to the implementation report named in the lock
2. `git add <report> && git commit -m "docs(<skill>): pipeline paused at step <N> — context compaction imminent" -- <report> && git push origin HEAD` — path-limited to the report, so a 5c set staged for `/finalise` 6a to carry stays staged (task.173). The push is **held** (commit kept local, named in the signal) when the report links to a path that is staged but not in the commit, such as that staged PR review report: pushing it alone put a dangling link on the remote head and turned a consumer's docs link check red (tinker-city PR #1223)
3. PR comment, if `pr_url` is set and both `gh` and `node` are on PATH — `tracker_write gh pr comment <pr_url> --body-file .claude/state/precompact-pr-comment.step-<N>.md`, the body opening with the `pipeline-paused` plain-language lead from `stakeholder-summary-cli.js`. Sourcing `resolve-platform.sh` beside the hook is what supplies `tracker_write`; under any `access.tracker` other than `full` the comment is **recorded, not posted**, and if the resolver or the lead cannot be loaded the arm **fails closed** (nothing posted, outcome named in the signal).
4. Tracker-issue comment, if `tracker_issue` is set — one `tracker-comment.js --issue <tracker_issue> --stage pipeline-paused-<step> --body-file …` call. The engine resolves the tracker itself (GitHub, or Jira when `JIRA_*` credentials are in the hook's environment), renders the same lead, adds the idempotency marker (scoped by the step, so a second pause at a later step is a second comment) and applies the access gate. `node` or the engine missing → skipped, never posted bare.
5. Nothing is removed. The lock stays, marked paused (step 0), and the claim directory is released.

> **Comments are one per step, not one per pause.** A second pause at the same step — a later QA cycle, or the same cycle after an in-session clear — posts nothing new: the PR arm finds its `pipeline-paused-<N>` marker and edits that comment in place, and the issue arm's engine reports `already`. That is what a consumer observed on 2026-11-10 (pauses at Steps 2, 5 and 5: one PR comment, two issue comments). Keying the marker by cycle as well would *add* comments inside the QA loop, and needs a stage-grammar change in `tracker-comment.js` and `stakeholder-summary.js`; it was not made.

> Both comment arms were bare `gh … comment --body "…"` calls until bug.14 — no lead, no marker, and no access gate, so a consumer with `access.tracker: read-only` still got a write from the one caller that runs with no prose step behind it. `tests/mutation-call-site-coverage.test.js` now scans tracked shell sources as well as Markdown, so the bare form cannot come back unnoticed.

> **Operator note — `pause_reason` vs `halt_reason`.** A PreCompact snapshot is tagged `pause_reason: "precompact"` (with `paused_at`); the orchestrator's terminal-HALT path in SKILL.md instead writes `halt_reason` + `halted_at`. Inspect **`pause_reason`** to identify a snapshot left by an interrupted compaction. Both carry `halt_step`, so Phase 0b resumes from the same field either way.

**Output**: a single JSON object on stdout carrying `additionalContext`:
```json
{"hookSpecificOutput": {"hookEventName": "PreCompact", "additionalContext": "🛑 PIPELINE-PAUSE-SIGNAL\n..."}}
```
The orchestrator sees the signal in its next turn, emits the user-facing pause banner, and halts cleanly. Compaction then proceeds on a known-good state.

**Resume**: re-invoke `/develop-{story,task} <path>`. The detector finds the lock (`source: lock`) and reports its `paused` mark; Phase 0b runs `advance-pipeline-lock.sh --restore <doc-dir>`, which clears the mark in place, then artifact verification skips completed steps and re-runs the paused step from scratch — sub-skills are required to be re-run-safe (see the pause doc's "Re-run-safety contract"). **Continuing in the same session** needs no recovery step: the step's first lock call (the signal names `advance-pipeline-lock.sh <N>`) clears the mark.

**Escape valves**:
- No lock file → exit 0 with empty `additionalContext` (and a pre-existing snapshot is left untouched — the snapshot write is skipped before the lock-existence check)
- `jq` missing → exit 0 with empty `additionalContext` (degrades to no-pause); the cp-fallback resume snapshot is still written and the lock is kept, unmarked
- Hook timeout / SIGTERM → the EXIT trap releases the claim; the lock is never touched by it. A SIGKILL skips the trap and leaves the claim, which the next pause takes over (its holder is dead). The lock keeps its full state either way, so a kill can never leave the pipeline unlocked.

**Jira**: the issue comment goes through `tracker-comment.js`, which posts to Jira over REST when `JIRA_URL` / `JIRA_API_TOKEN` / `JIRA_USER_EMAIL` are in the hook's environment (or a `.env` the engine reads). Without them the engine reports `no-credentials` and the Jira side stays silent; the signal carries that outcome and the orchestrator repeats it in the user-facing summary. There is no MCP path from a shell hook.

For the full lock-file format, half-done step recovery semantics, and verification checklist, see [`develop-pipeline-pause.md`](develop-pipeline-pause.md).

---

## 2. Stop hook — `on-stop.sh`

**Event**: [`Stop`](https://docs.claude.com/en/docs/claude-code/hooks) — fires when the assistant attempts to end its turn.

**Purpose**: structural defence against the failure mode where a sub-skill returns control with a "complete" message and the orchestrator, under context pressure, treats the natural turn boundary as end-of-task and yields to the user mid-pipeline. (Regression observed 2026-05-12 during story 2.2 dogfood — orchestrator stopped after `/develop` returned with "Ready for Review" instead of continuing to `/create-pr`.)

**Trigger condition**: `.claude/state/develop-pipeline.lock` exists **and** `current_step` is in `[1, 8]`. Step 8 is guarded too: the script tests `-gt 8`, not `-ge 8`, because a lock at 8 is a Step 8 that has not passed its Completion Checklist. The lock outlives the Step 8 commit and is removed only by the checklist's own `advance-pipeline-lock.sh --complete` (task 161), so at step 8 the hook's reason names the Completion Checklist, not `/commit-changes` returning, as the step's end. It routes the stall by the resume contract's step-8 rule rather than a rule of its own: an unfinished row at or below Step 7 is finished first (the lock reaches 8 before Step 7's tail runs), and otherwise Step 8 re-runs from its start. The reason never tells the orchestrator to run `--complete` itself (task.161 QA cycle 2).

**Inside the QA loop (task.123)**: for `develop-story` / `develop-task` the lock reads `current_step: 5` for the whole of Steps 5–6 — 5a, 5b and 5c — and a `qa_phase: 5a|5b|5c` field names the sub-step. The hook reads `qa_phase` on a step-5 lock to name `/qa-story` or `/qa-task` (5a, and the default when the field is absent), `/qa-fix` (5b) or `/review-pr` (5c), and asks for the end-of-loop advance as `5 → 7`. The lock helper stays monotonic; the loop's `5b → 5a` re-entry is expressed by rewriting `qa_phase`, never by moving `current_step` backwards. The other loop fields the lock can carry, each with its writers (task.182): `qa_max_cycles` (integer, the absolute budget) — `grant-qa-cycles.sh` at a resume after a loop-limit halt, and `reenter-qa-after-finalise.sh` at a QA re-entry after a finalise DoD-gaps halt; `extra_cycles_granted` (integer, the grant) — `grant-qa-cycles.sh` only; `convergence_from_cycle` (integer, the first cycle the Convergence check reads after a grant) — `grant-qa-cycles.sh` only (task.239); `qa_reentry` (`{from_step, reason, at, gate_head, report_entries}`, why a lock sits at step 5 after a Step 7 halt) — `reenter-qa-after-finalise.sh` only. `qa_phase` itself is written by `set-qa-phase.sh` inside the loop and by the three re-entry scripts (`grant-qa-cycles.sh`, `reenter-qa-after-finalise.sh`, and `accept-qa-residual.sh`, which records an owner's acceptance of a loop-limit residual — task.251); the value the grant writes depends on the halt and is stated once, in the `qa_phase` row of the lock schema in `develop-pipeline-pause.md`. The hook reads none of the four; all travel into `develop-pipeline.last-halt.json` because the snapshot is a superset of the lock. `develop-bug` keeps its own step map and reads none of them.

**Behaviour when triggered**: returns JSON with `decision: "block"` and a `reason` that lists the exact next four actions for the orchestrator:

1. Bash — advance `current_step` in the lock
2. Edit — mark the current step `✅ Done` in the implementation report
3. Output the Remaining Work Status block, then the banner — `═══ DEVELOP-{STORY,TASK} PIPELINE: STEP {N+1}/8 — {NAME} ═══` (see [`develop-pipeline-remaining-work-banner.md`](develop-pipeline-remaining-work-banner.md))
4. Invoke — the next sub-skill via the Skill tool

The reason is injected as a system reminder in the next assistant turn, forcing forward motion before any prose can be emitted.

**Escape valves** (the hook ALLOWS stop when any of these are true):
| Condition | Why it's an escape valve |
|-----------|--------------------------|
| `stop_hook_active: true` in the hook input | Claude Code's anti-loop signal — the hook has already blocked once for this stop attempt; blocking again would loop forever |
| No lock file present | No active pipeline — normal end of conversation |
| `current_step > 8` | Out of range — nothing past Step 8 to prompt for. (`current_step` 8 is **not** an escape valve: see the trigger condition) |
| `current_step < 1` or `null` | Lock is malformed; bail gracefully |
| `jq` missing | Degraded mode — refuse to parse, allow stop |
| `waiting_on` set and `since + budget_minutes` is still in the future | The step is **waiting**, not stalled — it dispatched a background agent or task and yielded the turn to let it run (task.124, obs #89). See "waiting_on" below |
| `paused` set (the PreCompact hook's mark) | The pause signal asked the agent to halt; blocking would fight it. Lasts only until the session's next lock write (any `advance-pipeline-lock.sh` advance, `set-qa-phase.sh`, `set-waiting-on.sh`), which clears the mark and re-arms the block. Until 2026-11 the hook removed the lock, and the no-lock row gave this pass-through |
| Orchestrator removes the lock | Legitimate terminal HALT path in SKILL.md (commit report → snapshot to `develop-pipeline.last-halt.json` → `rm lock`) — next stop attempt sails through |

**Loop protection in practice**: Claude Code passes `stop_hook_active: true` to the hook on the second consecutive block within a single stop attempt. The hook honours this and exits 0. If the orchestrator genuinely cannot continue, the documented terminal-HALT protocol removes the lock, satisfying the hook permanently.

> **`stop_hook_active` suppresses only a *second* block within the same stop attempt** — it does not persist across separate stops. Every time the orchestrator yields the turn mid-step while `current_step` is in `[1, 8]`, that is a fresh stop attempt and the hook fires again. Before task.124 the hook had no signal for "background work is in flight", so it re-prompted on every legitimate wait as well as on every stall, and the guidance was to ignore the repeated prompt. That guidance is retired: **a step that waits on something it dispatched marks the wait on the lock** (`waiting_on`, below), and the hook allows the stop for as long as the budget lasts. A re-prompt during a wait now means one of two things — the wait was never marked, or it outlived its budget (a crashed step) — and both are worth acting on rather than ignoring. Where a re-prompt does arrive mid-step, the response is unchanged: hold the step until its own work and gates have genuinely completed, then perform the Bash → Edit → banner → invoke transition. The prompt never *forces* the wrong action — it cannot advance the lock itself (see [`pipeline-lock-cooperation.md`](https://github.com/Gamaroff/agent-skills/blob/develop/shared/resources/pipeline-lock-cooperation.md)).

### `waiting_on` — waiting is not stalling (task.124)

A step that dispatches a background agent (`Agent` tool, `subagent_type="Explore"`) or a background task (`run_in_background`, `gh pr checks --watch`) and then yields the turn looks, from the hook's side, exactly like a step that stalled: the lock is present and unchanged. The lock now carries the distinction:

```json
"waiting_on": { "kind": "agent", "label": "step-3 codebase map", "since": "2026-09-19T12:45:20Z", "budget_minutes": 10 }
```

**One writer**, `set-waiting-on.sh`, a sibling of `set-qa-phase.sh` — a script, not a function, so it exists in every fenced block; atomic `mktemp` + `mv`; never touches `current_step` or `qa_phase`; exit 0 no-op without a lock. Two forms, and the dispatch site issues both:

```bash
bash .agents/skills/{develop-story|develop-task|develop-bug}/references/set-waiting-on.sh "<label>" [--kind agent|task] [--budget-minutes N]   # as the dispatch's own next action
bash .agents/skills/{develop-story|develop-task|develop-bug}/references/set-waiting-on.sh --clear                        # as the first action after the result is read
```

`budget_minutes` is `subagents.wallClockMinutes` from `skills-config.yaml` (default 10), read **once by the writer** and stored on the lock, so the hook needs no config read — or, for a wait whose own bound the caller knows and which outlives the subagent default, `--budget-minutes N` on the set form (the finalise CI poll passes its `FINALISE_CI_MAX_WAIT`; a mark shorter than the wait it covers re-prompts the tail of every legitimate wait as a stall) — and a `waiting_on` older than its budget does **not** protect the step: the hook re-prompts as it always did, because a step that crashed while waiting is a stall wearing a wait's label. The hook's check is one `jq` predicate over `since + budget_minutes > now` (no shell-date portability surface); on an unparseable `since` or a non-numeric budget it falls through to the re-prompt, the loud side.

**Which sites mark a wait.** The dispatch sites are enumerated by grep, never by hand — `subagent_type=`, `dispatch an Explore subagent`, `run_in_background`, `gh pr checks --watch` over `develop-pipeline-step-*.md` (the step docs beside this file), `skills/develop-*/SKILL.md`, `skills/develop-bug/references/*.md` and the sub-skills the loop invokes (`qa-task`, `qa-story`, `review-pr`, `finalise`). Each such site calls `set-waiting-on.sh` beside its dispatch and `--clear` where it reads the result. **Phase 0a's resume detector is exempt** — no lock exists while it runs. Foreground `sleep` loops as a way of "holding the turn open" while a background task runs are retired by this field: yield the turn with the wait marked, and let the notification wake the orchestrator.

**The rule is a property, not that list.** The grep finds the waits a step doc names; it cannot find one no doc names. **Any yield while a background job owns the step's next action is a wait** — a subagent, a `run_in_background` command no step doc mentions, and a foreground command the tool timeout moved to the background. Mark it with `set-waiting-on.sh "<label>"` before yielding (with `--budget-minutes N` when it can outlast the default), and `--clear` it on the notification. An unmarked yield reads as a stall, and the re-prompt names the step's sub-skill — obeyed literally, it restarts a step that is half done.

**Output**: either empty stdout (allow stop) or JSON:
```json
{"decision": "block", "reason": "🔁 PIPELINE-CONTINUE-REQUIRED — DO NOT STOP\n..."}
```

---

## Install script — `install-hooks.sh`

**Purpose**: one-command, idempotent patcher for `.claude/settings.json`. Replaces the manual "paste this JSON block" instructions.

**What it does**:
1. Locates the install path — tries `.agents/skills/develop-story/scripts/`, then `.agents/skills/develop-task/scripts/`, then `.claude/skills/develop-story/scripts/`, then `.claude/skills/develop-task/scripts/`. First match wins.
2. Creates `.claude/settings.json` if missing (with `{}`)
3. For each hook (`PreCompact`, `Stop`): compares by hook **identity** — `scripts/<hook>.sh` with `bash`, the optional quoted `${CLAUDE_PROJECT_DIR}/`, the `.claude/skills/` or `.agents/skills/` root and the `develop-(story|task|bug)/` skill segment stripped (the three ship byte-identical hook scripts) — not by command string. First it **heals**: every existing `hooks[]` element with the same identity but a different spelling (the legacy bare-relative form, the quoted form under the other root, the same script under another of the three skills) is removed — element by element, so a matcher group shared with a consumer's own hook keeps that hook. Then, if an entry with that identity remains → skip; otherwise → append the canonical one.
4. Uses `jq` for safe JSON manipulation; refuses to patch if existing settings.json is invalid JSON.

**Idempotency**: re-running the script makes no changes if both hooks are already registered under any single spelling; a file carrying several spellings of the same hook — either root, quoted or bare-relative, any of the three `develop-*` skills — converges on one entry per event (task.120 — two spellings fire in parallel and paused twice). Safe to wire into project setup scripts.

**Other config preserved**: the script only touches `.hooks.PreCompact` and `.hooks.Stop` arrays. Permissions, env vars, other hook events, and unrelated keys are untouched.

**Flags**:
| Flag | Effect |
|------|--------|
| `--dry-run` | Show what would change; write nothing |
| `--settings <path>` | Target a non-default settings file (default `.claude/settings.json`) |
| `--help` | Print embedded usage block |

**Failure modes**:
- `jq` not on PATH → exit 1 with install hint
- No hook scripts found in any candidate path → exit 1 with `setup-consumer.sh --update` hint
- Invalid JSON in settings file → exit 1 (refuses to overwrite)

---

## Interaction model

```
┌──────────────────────────────────────────────────────────────────┐
│ Pipeline running, lock present, current_step = N (1 ≤ N ≤ 7)     │
└──────────────────────────────────────────────────────────────────┘
                │                                  │
                │ context near limit               │ orchestrator emits
                ▼                                  ▼ "complete" message
┌─────────────────────────────┐     ┌─────────────────────────────┐
│ Claude Code: PreCompact     │     │ Claude Code: Stop           │
│   → on-precompact.sh        │     │   → on-stop.sh              │
│   → commits report, posts   │     │   → returns decision:"block"│
│     comments, MARKS lock    │     │     with continuation steps │
│     paused (keeps it)       │     │     (allows the stop while  │
│   → emits PAUSE-SIGNAL      │     │     the lock is paused)     │
└─────────────────────────────┘     └─────────────────────────────┘
                │                                  │
                ▼                                  ▼
   Orchestrator halts cleanly;        Orchestrator resumes in
   user re-invokes /develop-* to      same turn — Bash lock-update,
   resume from Phase 0b artifact      Edit report row, banner,
   verification — or the session      next /skill.
   carries on, and its first lock
   write clears the mark.
```

**Mutual exclusivity in practice**: PreCompact only fires when Claude Code initiates compaction (token-pressure path). Stop fires when the assistant tries to end its turn (yield-to-user path). They never fire in the same turn.

**Both hooks read the same lock**, so they can't disagree about pipeline state.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Stop hook seems to loop forever | `stop_hook_active` not honoured | Update to latest `on-stop.sh` (must read stdin and check the flag) |
| Stop hook re-prompts to advance while a background agent or task is running | The wait was not marked on the lock, or it outlived `budget_minutes` | Mark it: `set-waiting-on.sh "<label>"` at the dispatch, `--clear` when the result is read (see "`waiting_on`" under the Stop hook section). A re-prompt on a marked wait means the budget elapsed — check whether the dispatch actually died |
| Stop hook re-prompts several times during one long step (no background work) | Each mid-step yield is a fresh stop attempt; `stop_hook_active` does not persist across stops | Hold the step until its work and gates have completed, then do the Bash → Edit → banner → invoke transition once |
| `advance-pipeline-lock.sh <n>` exits 1 with "no lock … --restore" | The lock was removed by a HALT (or by a PreCompact pause of a hook older than 2026-11) and this session is continuing in place | `bash .agents/skills/<skill>/references/advance-pipeline-lock.sh --restore <doc-dir>` first — it rebuilds the lock from the halt snapshot or orphaned claim and consumes it (task.124) |
| Stop hook lets the orchestrator stop mid-pipeline, stderr says `paused at step N (PreCompact)` | The lock still carries the PreCompact hook's `paused` mark: no lock write has run since the compaction | Intended right after a pause. If the session carried on, its next lock write clears it; to clear it at once, `advance-pipeline-lock.sh <N>` (an idempotent re-assert) or `--clear-pause` |
| Step 1 halts with a lock collision whose lock carries `paused` | A run paused by compaction is still recorded on the lock | Resume it (`/<skill> <its path>`), or abandon it as the collision message says; its state is also in `last-halt.json` |
| Signal says the report was committed `but NOT pushed — it links to …` | The report links to files that are staged but not in the path-limited pause commit — the 5c carry staged for `/finalise` 6a | Intended. The next commit that carries them (6a's) pushes both. To push sooner, commit the named files and push |
| PreCompact stderr says `took over a stale claim` | An earlier pause was SIGKILLed and left `.claude/state/develop-pipeline.precompact-claim.d` | Nothing to do — the hook took it over. If no hook is running, the directory can be removed by hand |
| `--restore` exits 1 with `legacy-snapshot: … carries no task_or_story_directory` | The snapshot predates task.123 and could belong to any document (task.130) | `--restore --accept-legacy <doc-dir>` once if it is this run's, or delete it. The rebuilt lock is stamped with `<doc-dir>`, so every snapshot derived from it is a matched candidate from then on — the flag is needed once, not on every resume (task.130 5c CR-1). **Do it now**: Step 8 of the next completed run of *any* document removes a sole legacy snapshot (it carries no directory, so no run can claim it), and the recovery window closes with it |
| The grant refused a `k` the snapshot's `qa_max_cycles` would allow | A newer `.lock.pausing.<pid>` claim carries a higher budget; the guard reads the candidate `--restore --which` names, not the snapshot (task.130) | Run `advance-pipeline-lock.sh --restore --which <doc-dir>` to see which file is live, and grant against its budget |
| Hook never fires | Not registered in settings.json | Run `bash .agents/skills/develop-story/scripts/install-hooks.sh` |
| Hook fires but nothing happens | No lock file (correct noop) | Confirm a `/develop-*` pipeline is active — lock is created at end of Step 1 |
| Stop hook blocks but orchestrator stops anyway | Hook returned invalid JSON, or Claude Code rejected the block | Check stderr of the hook; verify `jq` produces valid output |
| PR comment / git commit missing after pause | PR not set in lock, or `gh`/`git` not on PATH | All side effects are best-effort — implementation report is the durable record |
| Signal says `PR comment: skipped — node not on PATH` | The hook's shell has no `node` (the lead and the deferral record are both rendered by node) | Put `node` on the PATH Claude Code launches with; the issue arm reports the same cause as `node or tracker-comment.js not found beside the hook` |
| Pause comment absent but signal says `deferred` | `access.tracker` is not `full` — the gate held | Intended. The comment is in `.claude/state/tracker-actions.jsonl` for the handover checklist |
| Signal says a comment was `skipped — … not found beside the hook` | Hook copied without its sibling engines (`resolve-platform.sh`, `tracker-comment.js`, `stakeholder-summary-cli.js`) | Re-run `npm run bundle` / the installer; the hook fails closed rather than posting bare |
| Signal says the PR comment was `skipped — resolve-platform.sh failed to load: it rejected the config` | The resolver loaded but returned non-zero — a malformed `access:` block or an unsupported `access.vcs` in `skills-config.yaml` | Fix the config (run `source references/resolve-platform.sh` by hand to see the message); not a bundling problem |
| Signal says `deferred — …, but the deferred record was NOT written` | `access.tracker` held, but `defer-mutation.js` could not append to the journal (`.claude/state/tracker-actions.jsonl` unwritable, or the writer missing beside the hook) | Nothing was posted (correct); the pause comment must be posted by hand from the body file the outcome names |
| Hook crashes future pipeline runs | Stale lock file left over | `rm -f .claude/state/develop-pipeline.lock` |
| Installer refuses to write | Existing `settings.json` is invalid JSON | Fix or back up, re-run installer |
| Hook fails with `No such file or directory` though the script exists | Legacy bare-relative `command` from a pre-`${CLAUDE_PROJECT_DIR}` install — resolved against the shell's cwd at hook-fire time, which breaks after any `cd` into a subdirectory | Re-run `bash .agents/skills/develop-story/scripts/install-hooks.sh` — it migrates the old entry to the cwd-independent `${CLAUDE_PROJECT_DIR}` form automatically |
| Pause block appended twice, PR/issue commented twice | `settings.json` carries the same hook under two spellings (`.claude/skills/…` and `.agents/skills/…`), so the host fires it twice in parallel | Re-run the installer — it heals duplicate spellings to one entry per event. The hook itself now claims the pause atomically (and a lock already marked paused records nothing new), so even a doubled registration pauses once |

---

## Verifying your install

After running the installer, smoke-test both hooks:

```bash
# 1. Confirm settings.json has both entries
jq '.hooks.PreCompact, .hooks.Stop' .claude/settings.json

# 2. Confirm scripts are executable
ls -l .agents/skills/develop-story/scripts/on-*.sh

# 3. Confirm hooks noop without a lock
echo '{}' | bash .agents/skills/develop-story/scripts/on-stop.sh
# expect: empty output

# 4. Confirm Stop hook blocks with a synthetic mid-pipeline lock
mkdir -p .claude/state
echo '{"skill":"develop-story","current_step":3,"report_path":"x.md"}' > .claude/state/develop-pipeline.lock
echo '{"stop_hook_active":false}' | bash .agents/skills/develop-story/scripts/on-stop.sh | jq .decision
# expect: "block"
rm -f .claude/state/develop-pipeline.lock
```

---

## Authoring contract for new hooks

If you add a third hook to this pipeline (e.g., a `SessionStart` resumer), follow the same pattern:

1. **Script lives at** `skills/develop-{story,task}/scripts/on-{event}.sh`, byte-identical across both skills
2. **Always exits 0** — hooks must not block compaction or stop on infrastructure failure
3. **Reads `.claude/state/develop-pipeline.lock`** for state — never invents new lock files
4. **Honours Claude Code's anti-loop flags** (`stop_hook_active`, equivalents for other events)
5. **Documented here** — add a new section to this file plus a row in the catalog table
6. **Installable via `install-hooks.sh`** — extend the script's hook list rather than creating a parallel installer. Exception: `setup-consumer.sh` patches inline to avoid a chicken-and-egg dependency on skills being installed first; it is not a general precedent.
7. **Registered `command` uses `${CLAUDE_PROJECT_DIR}`** — write the hook command as `bash "${CLAUDE_PROJECT_DIR}/<base>/on-{event}.sh"`, never a bare relative path. Claude Code expands `${CLAUDE_PROJECT_DIR}` to the project root at hook-fire time; a bare relative path (e.g. `bash .agents/skills/.../on-{event}.sh`) is resolved against the shell's cwd instead, so it breaks the moment any command in the session has `cd`'d into a subdirectory. When you change the emitted form, also add an exact-match de-registration step (see `unpatch_hook_exact`) so re-running the installer migrates old entries instead of stacking a second, still-broken one alongside the fix.
8. **Test coverage** — add protocol assertions to `evals/develop-story/protocol/stall-and-cleanup-protocol.test.mjs`
9. **Update both SKILL.md Setup sections** — but keep them short; this doc is the canonical reference

---

## Related references

- [`develop-pipeline-pause.md`](develop-pipeline-pause.md) — deep PreCompact dive: lock format, half-done step recovery, re-run-safety contract for sub-skills
- [`develop-pipeline-resume-contract.md`](develop-pipeline-resume-contract.md) — what artifact verification does on resume
- Claude Code hooks docs: https://docs.claude.com/en/docs/claude-code/hooks

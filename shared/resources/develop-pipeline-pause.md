---
name: develop-pipeline-pause
description: Graceful pause contract shared by develop-story and develop-task orchestrators. Covers the pipeline lock-file format, the PreCompact hook contract, the pause-signal handshake, and half-done step recovery guarantees on resume.
---

# Develop Pipeline — Graceful Pause on Imminent Context Compaction

Reference doc for the `/develop-task` and `/develop-story` orchestrator skills. Describes the lock-file format, the `PreCompact` hook contract, and the half-done step recovery guarantees.

Audience: maintainers of the `develop-task`/`develop-story` skills, authors of sub-skills they invoke, and operators wiring the hook into a project.

> **Looking for the full hook catalogue?** This document is the deep dive on the `PreCompact` hook only. For the complete list of pipeline hooks (PreCompact + Stop), the install script, the interaction diagram, troubleshooting, and the contract for adding new hooks, see [`develop-pipeline-hooks.md`](develop-pipeline-hooks.md).

---

## Problem

`/develop-task` and `/develop-story` are 8-step pipelines (create-branch → review → develop → create-pr → qa-loop → finalise → commit). They run hands-free for many minutes and frequently consume enough context to trigger Claude Code's auto-compaction.

When compaction fires mid-pipeline:

- In-memory orchestrator state is summarised. The agent forgets where it was, why it made decisions, and what the QA cycle counter is.
- The implementation report on disk is the only durable state, and it is only fully committed at terminal halt boundaries — not between steps.
- The user gets no signal that the run paused. They notice it later when nothing has happened.

The agent has no token-count introspection, so the orchestrator cannot detect "compaction is about to fire" from inside its own turn. The only reliable signal is the Claude Code **`PreCompact` hook**, which executes a shell script before the harness summarises the conversation.

The pause flow is therefore: a shell hook (independent execution budget, runs even when the agent is out of room) does the durable work — appends a pause entry to the report, commits and pushes, posts the PR and tracker-issue comments through the comment contract — and then injects a system-reminder back to the agent telling it to halt cleanly.

## Architecture overview

```
┌──────────────────────────────────────────────────────────────────┐
│ Pipeline running (Step 2–8)                                      │
│   └─ writes/updates `.claude/state/develop-pipeline.lock`        │
│      at end of Step 1 + every step banner + after PR creation    │
└──────────────────────────────────────────────────────────────────┘
                  │
                  ▼  context approaches limit
┌──────────────────────────────────────────────────────────────────┐
│ Claude Code triggers PreCompact hook                             │
│   └─ runs `.agents/skills/<skill>/scripts/on-precompact.sh`      │
└──────────────────────────────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────────────────────────┐
│ Hook CLAIMS the pause (atomic mkdir of a claim dir; losers noop):│
│   0. Snapshot → last-halt.json, then MARK the lock paused        │
│      (lock already marked → nothing new to record; stop here)    │
│   1. Append "Paused — Context Compaction" to implementation report│
│   2. git commit + git push (best-effort)                         │
│   3. PR comment via tracker_write (marker, lead, --body-file;    │
│      find-by-marker → edit in place → else create)               │
│   4. Issue comment via tracker-comment.js (lead, marker, gate)   │
│   5. Keep the lock (marked); release the claim                   │
│   6. Emit additionalContext: 🛑 PIPELINE-PAUSE-SIGNAL            │
└──────────────────────────────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────────────────────────┐
│ Agent sees signal in next turn → outputs pause banner + summary  │
│ → HALTs (the Stop hook allows it: the lock is paused).           │
└──────────────────────────────────────────────────────────────────┘
          │                                       │
          ▼ the same session carries on           ▼ user re-invokes /develop-task <path>
┌──────────────────────────────┐   ┌──────────────────────────────────┐
│ First lock write of the step │   │ Detector reads the lock (paused) │
│ (advance-pipeline-lock.sh N, │   │ → --restore clears the mark →    │
│ set-qa-phase, set-waiting-on)│   │ artifact verification skips ✅   │
│ clears the mark; the Stop    │   │ steps → re-runs the ⏸️ Paused    │
│ hook guards the run again    │   │ step from scratch (re-run-safe)  │
└──────────────────────────────┘   └──────────────────────────────────┘
```

## Lock file

**Path**: `.claude/state/develop-pipeline.lock` (relative to repo root).

**Lifecycle**:
- **Created**: at the *end of Step 1*, after the feature branch exists. Not earlier — between Phase 0 and end-of-Step-1, the implementation report is either uncommitted on the base branch (`develop`/`main`) or sitting in a `git stash`. A hook firing during that window has no safe place to commit, so the lock-absent path (hook = noop) is intentional.
- **Updated**: at every step banner from Step 2 onward (`current_step` field) and after PR creation (`pr_url` field).
- **Removed**: at the end of Step 8 (clean completion); at every terminal HALT (Error Recovery rule). **Not by this hook** (2026-11): it keeps the lock and marks it `paused` (below). Until then the hook removed it, and a session that carried on after the compaction — which Claude Code does, with a summary — had no lock until someone ran `--restore` by hand.
- **Paused / un-paused**: the hook adds `paused: {at, step, reason: "precompact"}`. The session's next lock write removes it — any `advance-pipeline-lock.sh` advance (the idempotent no-op re-assert and the finalise hold included), `set-qa-phase.sh`, `set-waiting-on.sh`, `--clear-pause`, or `--restore <doc-dir>` on the paused lock — and consumes this pause's snapshot (a `pause_reason: "precompact"` `last-halt.json` for the lock's own document). While the mark is set the `Stop` hook allows a stop.
- **Restored**: by **`advance-pipeline-lock.sh --restore <doc-dir>`** — the one restore path (task.124, Phase 4; obs #123). It rebuilds the lock from the newest candidate **for this document** — the halt snapshot `last-halt.json` (written by a terminal HALT or by this hook) or an orphaned `.lock.pausing.<pid>` claim (left only by a hook older than 2026-11) — strips `halted_at` / `halt_reason` / `halt_step` / `paused_at` / `pause_reason` / `paused`, sets `current_step` to the halted step, refuses a candidate for another document, and **consumes** the source. It also drops any `waiting_on` the snapshot carried — a rebuilt lock waits on nothing this session dispatched. `grant-qa-cycles.sh` (task.123) calls it rather than carrying its own, and reads its never-lower guard from **`--restore --which <doc-dir>`** — the same selection, printed and not consumed — so the guard and the restore cannot disagree about which candidate is live (task.130). A candidate with **no `task_or_story_directory`** (pre-task.123) is refused as `legacy-snapshot` unless `--accept-legacy` is passed; under the flag the rebuilt lock is **stamped** with `<doc-dir>` as passed, so every snapshot derived from it is a matched candidate and the flag is needed once — a present `task_or_story_directory` is never overwritten. Step 8 deletes such a snapshot when it is the sole candidate on disk. A snapshot the resume detector proves stale (its PR `MERGED`) is **reported, not deleted, by the detector** — the orchestrator deletes it from the one loop in the resume contract § Consume Output and re-reads the path (task.130). **After a HALT, both resume paths must run `--restore` before any step advances** — a session that continues in place, *and* a re-invocation that chooses Resume in Phase 0b (the step-0 doc's Shared Resume Logic names it). After a PreCompact pause the lock survives, so the in-place path needs nothing (its first lock write clears the mark) and the re-invocation's `--restore` clears the mark in place. Step 1 is the lock's only ordinary writer and every resume skips it; `advance-pipeline-lock.sh <n>` with no lock is now an error naming `--restore`, not the silent exit 0 that once left every advance and the Stop hook inert for a whole session.

**Format**:

```json
{
  "skill": "develop-task",
  "report_path": "docs/tasks/task.42.foo/task.42.implementation.1.foo-initial-run.md",
  "task_or_story_id": "42",
  "task_or_story_directory": "docs/tasks/task.42.foo",
  "branch": "feature/task.42.foo",
  "pr_url": "https://github.com/org/repo/pull/108",
  "tracker": "github",
  "tracker_issue": "297",
  "current_step": 5,
  "started_at": "2026-04-30T14:22:00Z",
  "qa_phase": "5b",
  "waiting_on": { "kind": "agent", "label": "5c review-pr lenses", "since": "2026-04-30T15:01:00Z", "budget_minutes": 10 }
}
```

| Field | Meaning |
|-------|---------|
| `skill` | `develop-task` or `develop-story` — selects the resume command and report style |
| `report_path` | Path to the implementation report. Hook appends pause entry here. |
| `task_or_story_id` | `42` for tasks; `{prd}.{epic}.{story}` for stories. Used in commit messages. |
| `task_or_story_directory` | Directory holding the task/story file + co-located artifacts |
| `branch` | Feature branch name (used in pause summary) |
| `pr_url` | Empty until Step 4 succeeds, then the PR URL |
| `tracker` | `github` or `jira` — controls whether the hook posts a tracker-issue comment |
| `tracker_issue` | GitHub issue number or Jira key — passed to `tracker-comment.js` with `--tracker <tracker>`, so it is used for both trackers |
| `current_step` | 1–8. Set to 1 at end of Step 1, updated at every banner thereafter. |
| `started_at` | UTC ISO-8601 timestamp |
| `qa_phase` | Optional. `5a\|5b\|5c` — the QA loop's sub-position while `current_step` is 5 (task.123). Four writers. This row is the one statement of the value the grant writes, which depends on the halt (task.182); the other describers cite it: `set-qa-phase.sh` inside the loop, as each sub-step's first action; `grant-qa-cycles.sh` (task.123) writes `5b` when no code moved since the latest gate (`code-moved-since-gate.sh` prints 0 — the loop ends on a gate, so the gate's queue was never handed to `/qa-fix`) and `5a` when code moved or the helper cannot answer (task.244); it does not read the halt reason; `reenter-qa-after-finalise.sh` (task.170) always writes `5a`; `accept-qa-residual.sh` (task.251) always writes `5c` — the owner accepted a loop-limit residual, and the run leaves the loop through Step 5c on the existing `WAIVED` route — and writes no other lock field. Each re-entry writer sets it in one atomic write with its other fields. |
| `qa_max_cycles`, `extra_cycles_granted` | Optional. The QA loop's absolute budget and the grant that set it (task.123). `extra_cycles_granted` has one writer, `grant-qa-cycles.sh`; `qa_max_cycles` has two, that script and `reenter-qa-after-finalise.sh` (task.170), and neither lowers it. |
| `convergence_from_cycle` | Optional. The first QA cycle whose `**HIGH findings**` reading the Convergence check counts (task.239). One writer: `grant-qa-cycles.sh`, which sets it to the grant's base + 1 in the same atomic write as `qa_max_cycles`, so a grant of k cycles restarts the three-reading rule instead of tripping on the readings it was granted past. Absent means `1`: every reading counts, as before task.239. `--restore` keeps it (it strips only the halt and pause fields); `reenter-qa-after-finalise.sh` neither writes nor clears it. |
| `qa_reentry` | Optional. `{from_step: 7, reason: "dod-gaps-code-fix", at, gate_head, report_entries}` — why a lock sits at step 5 after a Step 7 halt: the run re-entered QA because a DoD gap was fixed by a code change (task.170). One writer: `reenter-qa-after-finalise.sh`, the only writer that may lower `current_step`. Read by the resume contract's **Second precedence** (and the two 5–6 artifact rows that cite it), which ignores the last entry's terminal verdict while the report, back-filled, holds no more `### QA Cycle` headings than `report_entries` (recorded as `max(highest gate, headings)`) — it predates the re-entry. The Stop hook reads `current_step` and `qa_phase` as on any step-5 lock. |
| `paused` | Optional. `{at, step, reason: "precompact"}` — the PreCompact hook paused the run and kept the lock (2026-11). One writer, the hook; cleared by every lock writer (`advance-pipeline-lock.sh` advances, `--clear-pause` and `--restore`, `set-qa-phase.sh`, `set-waiting-on.sh`), which also consumes the pause's snapshot. The `Stop` hook allows a stop while it is set; a pause that finds it already set records nothing new. Never carried into a snapshot by the hook; `--restore` strips it from one that carries it. |
| `waiting_on` | Optional. `{kind: "agent"\|"task", label, since, budget_minutes}` — the step is legitimately waiting on something it dispatched (a background Explore agent, a `gh pr checks --watch` job), and the Stop hook allows the stop until `since + budget_minutes` has elapsed (task.124, obs #89). One writer: `set-waiting-on.sh "<label>"` at dispatch, `--clear` once the result is read. Absent = not waiting. The hook never reads the config for the budget; the writer stored it. |

**Concurrency note**: only one pipeline can run per repo at a time (the lock file is a single shared path). This matches the existing assumption that `develop-task`/`develop-story` operate against the current working tree.

## Hook contract

**Path**: `.agents/skills/develop-task/scripts/on-precompact.sh` (and the duplicate at `.agents/skills/develop-story/scripts/on-precompact.sh`). Both copies are byte-identical — the lock file's `skill` field tells the hook which orchestrator is paused.

**Shell**: `bash`, `set -uo pipefail` (deliberately *not* `-e` — the hook is best-effort throughout).

**Inputs**: none. Reads `.claude/state/develop-pipeline.lock` from CWD.

**Outputs**: a single JSON object on stdout:

```json
{"hookSpecificOutput": {"hookEventName": "PreCompact", "additionalContext": "..."}}
```

If no lock file exists, `additionalContext` is `""` (empty). If a lock exists, `additionalContext` carries the `🛑 PIPELINE-PAUSE-SIGNAL` block plus the user-facing summary template.

**Side effects** (all best-effort, all wrapped in `... || true`):

0. **The claim (one pause per lock).** The first thing the hook does is `mkdir .claude/state/develop-pipeline.precompact-claim.d` and write its pid inside. `mkdir` is atomic, so of N concurrent invocations exactly one holds the claim; every other invocation's `mkdir` fails and takes the empty-signal noop path, producing **nothing** — no snapshot, no report block, no comment. This is what makes the hook safe to register twice (task.120: a `settings.json` carried it under two path spellings and the host fired both, so every side-effect below was produced twice). The EXIT trap releases the claim. A claim whose pid is dead — a SIGKILLed hook skips its trap — or that has no pid and is older than a minute is **taken over** (an atomic rename to a unique name, then one retried `mkdir`), so a killed pause never silences the next. Until 2026-11 the claim was `mv` of the lock to `develop-pipeline.lock.pausing.<pid>`, which is what removed the lock; the claim directory is named outside that family because the resume detector and `--restore` still read a `.pausing.*` file as an orphaned lock copy. The winner sweeps any such legacy file: a live lock exists, so a newer pipeline has started and its state is the one that matters.
1. **Snapshot, then the mark (resume guarantee).** Write `develop-pipeline.last-halt.json` (co-located with the lock): a **superset of the lock** with `paused_at`, `pause_reason: "precompact"`, and `halt_step` (= the lock's `current_step`), without the lock's `paused` field. Then mark the lock `paused: {at, step, reason: "precompact"}` through a mktemp file and `mv`. When `jq` is unavailable the snapshot degrades to a verbatim `cp` of the lock and the lock is kept **unmarked** (marking needs jq, and so does the Stop hook). The lock is never moved or removed, so a hook killed at any point leaves the pipeline locked with its full state — the "unlocked and un-resumable" window the old `mv` claim opened (task.120 CR-1 / bug.2) no longer exists. A kill between the snapshot and the mark leaves an unmarked lock and a snapshot, which the next pause simply redoes. **A lock already marked records nothing new**: every lock writer clears the mark, so a marked lock means no writer ran since the last pause; the hook refreshes the snapshot, repeats the signal (`PIPELINE-PAUSE-SIGNAL (repeat)`) and stops — no report block, commit or comment. The implementation report remains the primary recovery record throughout, as it always was.
2. Append a "Pipeline Paused — {timestamp}" block to `report_path` with skill, branch, last step boundary, PR URL, tracker info, and resume instructions.
3. `git add <report> && git commit -m "docs(<skill>): pipeline paused at step <N> — context compaction imminent" -- <report> && git push origin HEAD`. The commit is path-limited to the report: between 5c and `/finalise` 6a the index may hold the PR review report and doc-only fixes staged for 6a to carry, and a bare `git commit` would sweep them into the pause commit (task.173). **The push is held when the report links to a path that is staged but not in the commit** — a relative link whose target `HEAD` lacks and the index holds, resolved from the report's own directory (anchors and URLs skipped). A target in neither — a link quoted inside inline code, or one to a file never written — does not hold the push: no later commit would carry it, so the hold would never end. Path-limiting is what makes that possible: a QA-cycle entry links to the PR review report 5c staged for 6a, and pushing the report alone left a dangling link on the remote head that turned a consumer's docs link check red (tinker-city PR #1223, a pause at step 7). The commit stays local, the signal names the links, and the next commit that carries them — 6a's — pushes both.
4. The PR comment, if `pr_url` is non-empty and both `gh` and `node` are on PATH. The body file (`.claude/state/precompact-pr-comment.step-<N>.md`) opens with the marker `<!-- agent-skills-comment:pipeline-paused-<N> -->` — the same family `tracker-comment.js` writes on the issue arm — then the `pipeline-paused` lead (rendered by `stakeholder-summary-cli.js`), then `---`, then the paused notice. The post is **find-by-marker → edit in place → else create**, the `finalise` Step 6c recipe: `gh pr view --json comments` is searched for a body starting with the marker, and a hit is `gh api -X PATCH …/issues/comments/<id> -F body=@<file>`, a miss is `gh pr comment <pr_url> --body-file <file>`. Both arms run through `tracker_write` (sourced from `resolve-platform.sh` beside the hook) so a declared `access.tracker` restriction is honoured — the mutation is recorded in the deferred-mutation journal instead of performed. The search is a read and is deliberately outside the gate. It is also a *partial* read — `gh pr view --json comments` does not page — accepted here as `finalise` accepts it; a PR busy enough to page the marker out of view is not a case the pause hook has met. If the resolver or the lead cannot be loaded the arm fails closed: nothing is posted and the signal says so.
5. `tracker-comment.js --issue <tracker_issue> --stage pipeline-paused-<step> --body-file .claude/state/precompact-issue-comment.step-<N>.md` if `tracker_issue` is set and `node` is on PATH. One call: the engine resolves the tracker, renders the lead, adds the idempotency marker (scoped by step) and applies the access gate. Its `reason` is surfaced in the signal.
6. Nothing is removed: the lock stays, marked; the claim is released.

> **A second pause at the same step.** A pause at a *later* step posts fresh comments on both arms (the marker is step-scoped). A repeat at the *same* step — a later QA cycle, or the same cycle after the session carried on and cleared the mark — behaves differently per arm, and a reader should know which: the PR arm **edits** the earlier comment in place, so the PR shows the *latest* pause at that step, not the first; the issue arm reports `already` and posts nothing. Nothing is lost — the implementation report keeps every pause block, and that is the record. A repeat with **no lock write in between** does not reach the comment arms at all (item 1). The marker is one per step, not one per (step, QA cycle): a cycle key would post more comments inside the loop, not fewer, and needs a stage-grammar change in `tracker-comment.js`.

> The snapshot is a **superset** of the lock — it differs from the orchestrator's terminal-HALT snapshot (SKILL.md) only in the reason fields: PreCompact writes `pause_reason: "precompact"` + `paused_at`, the terminal path writes `halt_reason` + `halted_at`. Both write `halt_step`, so the resume detector locates the resume point identically. The `LOCK` path is `PIPELINE_LOCK`-overridable (default `.claude/state/develop-pipeline.lock`) so the hook can be sandboxed in regression tests; the snapshot path is derived from it.

**Exit code**: always `0`. Failures log to stderr but never block compaction.

**Dependencies**: `jq` (required for safe JSON parsing — degrades to noop if missing); `git` and `gh` (used best-effort).

**Jira**: the issue comment reaches Jira over REST when `JIRA_URL` / `JIRA_API_TOKEN` / `JIRA_USER_EMAIL` are in the hook's environment (or a `.env` the engine reads); otherwise `tracker-comment.js` reports `no-credentials` and the Jira side stays silent. The signal names the outcome and the agent repeats it in the user-facing summary. There is no MCP path from a shell hook.

## Setup (per project)

Each project that uses `/develop-task` or `/develop-story` registers the hook in its `.claude/settings.json`. Use the path for whichever skill(s) you have installed:

**If using `/develop-story`:**
```json
{
  "hooks": {
    "PreCompact": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bash \"${CLAUDE_PROJECT_DIR}/.agents/skills/develop-story/scripts/on-precompact.sh\""
          }
        ]
      }
    ]
  }
}
```

**If using `/develop-task` (or both skills):**
```json
{
  "hooks": {
    "PreCompact": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bash \"${CLAUDE_PROJECT_DIR}/.agents/skills/develop-task/scripts/on-precompact.sh\""
          }
        ]
      }
    ]
  }
}
```

Notes:
- Both scripts are byte-identical and both consult the lock file's `skill` field to determine which orchestrator is paused. Either path covers both pipelines — use the one for the skill you have installed.
- If both skills are installed, a single entry is sufficient; use either path.
- The hook is project-scoped on purpose. Different projects may register different report locations or tracker integrations; per-project settings keep them isolated.
- The hook is keyed off the lock file. With no active pipeline, it's a noop — safe to leave registered permanently.

## Half-done step recovery

The hook fires regardless of pipeline position. The lock's `current_step` records the orchestrator's last *step boundary*; actual sub-skill work inside that step may be 0–99% done. Resume relies on the existing Phase 0b artifact verification table to determine which steps to re-run.

### Window A — Phase 0a through end of Step 1 (no lock yet)

- **State**: Report may exist (Phase 0e ran), but no feature branch yet, or branch creation in progress / report stashed.
- **Hook**: lock absent → noop. No pause comment posted.
- **Resume**: user re-invokes the skill. Phase 0b detects existing report or partial branch, asks "Resume or restart?". `/create-branch` is idempotent (it checks if the branch already exists). Worst case: report is on `develop` uncommitted → small dirty-tree warning, user proceeds.
- **Fallback**: if context compacts before resume happens, the existing post-compaction recovery section in SKILL.md kicks in (re-read skill, find report on disk, resume from Phase 0b).

### Window B — Step 2–7, between sub-skill invocations

- **State**: sub-skill returned, orchestrator updating Pipeline Progress / writing decisions / about to invoke next sub-skill.
- **Hook**: lock present, `current_step` = step that just finished or about to start. Hook commits report, posts the PR and issue comments through the contract, signals agent.
- **Resume**: agent halts cleanly. Phase 0b reads report → artifact verification → ✅ steps skipped, in-progress step re-run from start. Idempotent.
- **Common case**: most compactions fire on the orchestrator's turn, not deep inside a sub-skill.

### Window C — Step 3 (`/develop`) mid-run, partial code

- **State**: `/develop` is mid-execution. Some commits may already exist on the branch; some changes may sit uncommitted in the working tree. Task/story `[x]` checkboxes reflect already-completed phases/tasks.
- **Hook**: commits *the report only* — does not touch code changes (those belong to `/develop`).
- **Resume**: the orchestrator's bounded Step 3 loop re-runs. It re-reads task/story `Status:` from disk, sees `In Progress`, and re-invokes `/develop`. The Decisions Log preserves the "Pre-develop surface map:" entry, so Explore + plan-file discovery are skipped on resume. `/develop` itself reads task/story checkboxes and continues from the next unchecked phase/task. The loop is bounded by `MAX_ITER=5` and a no-progress stall check (halts only when the `[x]` count is unchanged at any indent **and** the branch HEAD has not advanced between iterations — either signal counts as progress), so a stuck `/develop` halts cleanly rather than spinning.
- **Worst case**: `/develop` re-does the in-flight phase whose work was uncommitted at compaction time. No worse than the user manually re-running it after a crash. Acceptable.

### Window D — Step 5–6 (QA loop), partial `qa.N.md` / `gate.N.yml` / fix commits

- **State**: `/qa-task` may have written `qa.N.md` but not `gate.N.yml` (or vice versa); or `/qa-fix` may have made edits without committing.
- **Hook**: same as Window B/C — commits report, comments PR, signals.
- **Resume**: artifact verification *requires both* `qa.N.md` AND `gate.N.yml` for cycle N to count as completed. A partial gate file is rejected → cycle N re-runs. The QA cycle counter is reconstructed from the report's `### QA Cycle` entries.
- **Edge**: if `/qa-task` increments `N` on each invocation, a partial `qa.N.md` becomes an orphan. Harmless — delete manually if desired. (If `/qa-task` reuses `N`, even cleaner — partial gets overwritten.)

### Window E — Step 7 (`/finalise`), partial DoD

- **State**: `/finalise` may have written part of `dod.N.md` or partially updated task/story `Status:`.
- **Hook**: same as above — report committed, signal sent.
- **Resume**: artifact verification requires `dod.N.md` to exist *and* status to read `accepted` (canonical lowercase per finalise schema) *and* PR acceptance comment posted — all three. Anything less → Step 7 re-runs. `/finalise` overwrites cleanly.

### Summary

| Pipeline state at compaction | Hook action | Resume cleanliness |
|------------------------------|-------------|--------------------|
| Phase 0–Step 1 | Noop (no lock) | Manual via post-compaction recovery |
| Between sub-skills | Full pause sequence | ✅ In-progress step re-runs |
| Mid-`/develop` | Commits report; code untouched | ✅ Resumes from current task/story state |
| Mid-`/qa-task` or `/qa-fix` | Commits report | ✅ Partial gate fails verification, cycle re-runs |
| Mid-`/finalise` | Commits report | ✅ Partial DoD fails verification, Step 7 re-runs |

## Re-run-safety contract for sub-skills

Pipeline guarantees rest on the implementation report + lock file `current_step` together describing pipeline state precisely enough that resume always succeeds. Sub-skill *internal* partial state is ignored — sub-skills must be re-run-safe.

Authors of sub-skills invoked by `/develop-task` or `/develop-story` should ensure their skill:

1. **Detects prior partial work** before doing anything destructive. Read the current task/story `Status:` and existing artifacts in the task/story directory.
2. **Skips or overwrites cleanly** when invoked twice with the same inputs. No "double-applied" side effects.
3. **Writes artifacts atomically when possible** — partial writes are tolerable only if the artifact-verification table in `develop-{task,story}` SKILL.md rejects the partial state and forces a re-run.
4. **Does not depend on transient orchestrator memory.** Anything it needs to know on the second run must be persisted to disk (the report, the task/story file, or its own artifact files).

If a new sub-skill is added to the pipeline, verify it against this contract before merging — otherwise resume after a pause may corrupt or duplicate work.

## Verification checklist (when changing the hook or lock format)

End-to-end test on a real task or story:

1. Start `/develop-task <path>` on a small task. Confirm `.claude/state/develop-pipeline.lock` appears at end of Step 1.
2. Mid-pipeline, manually invoke `/compact`. Confirm:
   - Report has a new "Paused — Context Compaction" entry.
   - `git log -1` shows the pause commit; remote reflects it.
   - PR has a "⏸️ Pipeline paused" comment.
   - GitHub issue (or Jira via MCP after agent processes signal) has matching comment.
   - Agent outputs the pause banner + summary and halts.
   - The lock is still there and carries `paused` (`jq .paused .claude/state/develop-pipeline.lock`).
   - `/compact` again with no step run in between: no new report entry, commit or comment.
3. Continue in the same session (`advance-pipeline-lock.sh <N>` or the step's next helper). Confirm `paused` is gone and `last-halt.json` with it.
4. Pause again, end the session, re-invoke `/develop-task <same-path>`. Choose "Resume from last completed step". Confirm:
   - The detector reports the paused lock, and `--restore <doc-dir>` prints `pause cleared in place`.
   - Resume artifact verification skips completed steps.
   - The `⏸️ Paused` step re-runs.
   - Pipeline completes through Step 8 normally.

Hook unit-test (no agent involved):
- Create a fake lock file in a scratch repo, run the hook directly. Confirm: report appended, commit made, JSON emitted to stdout, lock kept and marked `paused`. (`develop-pipeline-on-precompact.test.sh` does all of this.)
- Delete lock file, run the hook. Confirm: empty `additionalContext`, no side effects, exit 0.

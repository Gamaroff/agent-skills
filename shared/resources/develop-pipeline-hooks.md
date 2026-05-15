---
name: develop-pipeline-hooks
description: Canonical reference for the Claude Code hooks the develop-story and develop-task pipelines use to stay hands-free. Catalogues every hook (PreCompact, Stop), the install script, the lock-file contract that drives them, the escape valves that keep them safe, and how they interact. Cross-links the pause/resume deep dive in develop-pipeline-pause.md.
---

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

---

## 1. PreCompact hook — `on-precompact.sh`

**Event**: [`PreCompact`](https://docs.claude.com/en/docs/claude-code/hooks) — fires immediately before Claude Code summarises the conversation context to free up tokens.

**Purpose**: durably checkpoint the running pipeline so it can be cleanly resumed after compaction.

**Trigger condition** (inside the hook): `.claude/state/develop-pipeline.lock` exists. With no lock = no active pipeline = noop.

**Side effects** (best-effort, all wrapped in `... || true`):

1. Append a `## Pipeline Paused — {timestamp}` block to the implementation report named in the lock
2. `git add <report> && git commit -m "docs(<skill>): pipeline paused at step <N> — context compaction imminent" && git push origin HEAD`
3. `gh pr comment <pr_url>` if `pr_url` is set and `gh` is on PATH
4. `gh issue comment <tracker_issue>` if `tracker=github` and `tracker_issue` is set
5. `rm -f .claude/state/develop-pipeline.lock`

**Output**: a single JSON object on stdout carrying `additionalContext`:
```json
{"hookSpecificOutput": {"hookEventName": "PreCompact", "additionalContext": "🛑 PIPELINE-PAUSE-SIGNAL\n..."}}
```
The orchestrator sees the signal in its next turn, emits the user-facing pause banner, and halts cleanly. Compaction then proceeds on a known-good state.

**Resume**: re-invoke `/develop-{story,task} <path>`. Phase 0b artifact verification skips completed steps and re-runs the paused step from scratch — sub-skills are required to be re-run-safe (see the pause doc's "Re-run-safety contract").

**Escape valves**:
- No lock file → exit 0 with empty `additionalContext`
- `jq` missing → exit 0 with empty `additionalContext` (degrades to no-pause; resume still works via post-compaction recovery in SKILL.md)
- Hook timeout / SIGTERM → `trap 'rm -f "$LOCK"' EXIT` ensures the lock is removed regardless

**Jira limitation**: the hook does NOT post to Jira issues — Jira requires authenticated MCP calls unavailable from a shell context. Pause is visible via PR comment + implementation report; the orchestrator surfaces a "Jira not commented" note in the user-facing summary.

For the full lock-file format, half-done step recovery semantics, and verification checklist, see [`develop-pipeline-pause.md`](develop-pipeline-pause.md).

---

## 2. Stop hook — `on-stop.sh`

**Event**: [`Stop`](https://docs.claude.com/en/docs/claude-code/hooks) — fires when the assistant attempts to end its turn.

**Purpose**: structural defence against the failure mode where a sub-skill returns control with a "complete" message and the orchestrator, under context pressure, treats the natural turn boundary as end-of-task and yields to the user mid-pipeline. (Regression observed 2026-05-12 during story 2.2 dogfood — orchestrator stopped after `/develop` returned with "Ready for Review" instead of continuing to `/create-pr`.)

**Trigger condition**: `.claude/state/develop-pipeline.lock` exists **and** `current_step` is in `[1, 7]` (i.e., the pipeline is mid-flight, not finishing on step 8).

**Behaviour when triggered**: returns JSON with `decision: "block"` and a `reason` that lists the exact next four actions for the orchestrator:

1. Bash — advance `current_step` in the lock
2. Edit — mark the current step `✅ Done` in the implementation report
3. Output banner — `═══ DEVELOP-{STORY,TASK} PIPELINE: STEP {N+1}/8 — {NAME} ═══`
4. Invoke — the next sub-skill via the Skill tool

The reason is injected as a system reminder in the next assistant turn, forcing forward motion before any prose can be emitted.

**Escape valves** (the hook ALLOWS stop when any of these are true):
| Condition | Why it's an escape valve |
|-----------|--------------------------|
| `stop_hook_active: true` in the hook input | Claude Code's anti-loop signal — the hook has already blocked once for this stop attempt; blocking again would loop forever |
| No lock file present | No active pipeline — normal end of conversation |
| `current_step >= 8` | Pipeline is finishing on step 8 (commit-changes); end of run |
| `current_step < 1` or `null` | Lock is malformed; bail gracefully |
| `jq` missing | Degraded mode — refuse to parse, allow stop |
| Orchestrator removes the lock | Legitimate terminal HALT path in SKILL.md (commit report → snapshot to `develop-pipeline.last-halt.json` → `rm lock`) — next stop attempt sails through |

**Loop protection in practice**: Claude Code passes `stop_hook_active: true` to the hook on the second consecutive block within a single stop attempt. The hook honours this and exits 0. If the orchestrator genuinely cannot continue, the documented terminal-HALT protocol removes the lock, satisfying the hook permanently.

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
3. For each hook (`PreCompact`, `Stop`): checks if any existing `hooks[event][].hooks[].command` already matches the target command. If yes → skip. If no → append a new entry.
4. Uses `jq` for safe JSON manipulation; refuses to patch if existing settings.json is invalid JSON.

**Idempotency**: re-running the script makes no changes if both hooks are already registered. Safe to wire into project setup scripts.

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
│     comments, REMOVES lock  │     │     with continuation steps │
│   → emits PAUSE-SIGNAL      │     │   → lock unchanged          │
└─────────────────────────────┘     └─────────────────────────────┘
                │                                  │
                ▼                                  ▼
   Orchestrator halts cleanly;        Orchestrator resumes in
   user re-invokes /develop-* to      same turn — Bash lock-update,
   resume from Phase 0b artifact      Edit report row, banner,
   verification.                      next /skill.
```

**Mutual exclusivity in practice**: PreCompact only fires when Claude Code initiates compaction (token-pressure path). Stop fires when the assistant tries to end its turn (yield-to-user path). They never fire in the same turn.

**Both hooks read the same lock**, so they can't disagree about pipeline state.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Stop hook seems to loop forever | `stop_hook_active` not honoured | Update to latest `on-stop.sh` (must read stdin and check the flag) |
| Hook never fires | Not registered in settings.json | Run `bash .agents/skills/develop-story/scripts/install-hooks.sh` |
| Hook fires but nothing happens | No lock file (correct noop) | Confirm a `/develop-*` pipeline is active — lock is created at end of Step 1 |
| Stop hook blocks but orchestrator stops anyway | Hook returned invalid JSON, or Claude Code rejected the block | Check stderr of the hook; verify `jq` produces valid output |
| PR comment / git commit missing after pause | PR not set in lock, or `gh`/`git` not on PATH | All side effects are best-effort — implementation report is the durable record |
| Hook crashes future pipeline runs | Stale lock file left over | `rm -f .claude/state/develop-pipeline.lock` |
| Installer refuses to write | Existing `settings.json` is invalid JSON | Fix or back up, re-run installer |

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

If you add a third hook to this pipeline (e.g., a `SessionStart` resumer or a `PostToolUse` enforcer), follow the same pattern:

1. **Script lives at** `skills/develop-{story,task}/scripts/on-{event}.sh`, byte-identical across both skills
2. **Always exits 0** — hooks must not block compaction or stop on infrastructure failure
3. **Reads `.claude/state/develop-pipeline.lock`** for state — never invents new lock files
4. **Honours Claude Code's anti-loop flags** (`stop_hook_active`, equivalents for other events)
5. **Documented here** — add a new section to this file plus a row in the catalog table
6. **Installable via `install-hooks.sh`** — extend the script's hook list rather than creating a parallel installer. Exception: `setup-consumer.sh` patches inline to avoid a chicken-and-egg dependency on skills being installed first; it is not a general precedent.
7. **Test coverage** — add protocol assertions to `evals/develop-story/protocol/stall-and-cleanup-protocol.test.mjs`
8. **Update both SKILL.md Setup sections** — but keep them short; this doc is the canonical reference

---

## Related references

- [`develop-pipeline-pause.md`](develop-pipeline-pause.md) — deep PreCompact dive: lock format, half-done step recovery, re-run-safety contract for sub-skills
- [`develop-pipeline-resume-contract.md`](develop-pipeline-resume-contract.md) — what artifact verification does on resume
- Claude Code hooks docs: https://docs.claude.com/en/docs/claude-code/hooks

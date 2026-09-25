---
id: task.157
title: "[Task 157] Context-pressure trigger: recommend a continuation handoff before the context fills"
type: task
description: "Record the status line's measured context usage per session and add a UserPromptSubmit hook that, above a soft and a firm threshold, tells the agent to recommend a session-handoff continuation at the next natural boundary. Ship it with an idempotent user-level installer so it works in every repo. The trigger is a measurement, never the model's self-assessment."
tags: [session-handoff, context, hooks, statusline, claude-code]
category: infrastructure
status: planned
priority: Medium
created: 2026-09-25
updated: 2026-09-25
assignee:
estimated_effort_hours: 16
github_issue: 491
---

# Technical Task: Context-pressure trigger — recommend a continuation handoff before the context fills

**Status:** Planned

**GitHub Issue**: [#491](https://github.com/Gamaroff/agent-skills/issues/491)

---

## 1. Overview

Make the recommendation to hand off **mechanical**. The Claude Code status line already receives
`context_window.used_percentage` for the session. A small recorder saves that figure per session. A
`UserPromptSubmit` hook reads it on each prompt and, once usage crosses a soft or firm threshold,
injects a note telling the agent to recommend `session-handoff` continue mode (task.156) at the next
natural boundary. An idempotent installer registers both in the user-level `~/.claude/settings.json`,
so it works in every repo.

**Scope**: one engine (`record` and `check` sub-commands), a status-line wrapper that preserves the
user's own status line, the user-level installer with uninstall, tests, and docs in
`session-handoff`. **Depends on task.156**, because the hook recommends that mode.

**Key deliverables**:

1. `shared/resources/context-pressure.mjs`: `record` (status line) and `check` (hook). It owns the state format.
2. `shared/resources/context-pressure-statusline.sh`: a wrapper that records, then runs the user's original status line command unchanged.
3. `shared/resources/context-pressure-install.sh`: user-level install, uninstall and dry-run, deduplicated by identity.

**Expected outcome**: in any repo, once the context passes about 60%, the agent's closing
next-steps recommend a continuation handoff. Past about 75% it recommends one firmly, with the resume
prompt ready to use. Nobody has to notice the problem first.

---

## 2. Motivation

### Current Problems

1. **The model cannot see how full its context is.** Claude Code exposes the figure only to the
   status line command. It does not appear in the conversation or in any hook's input. Checked
   against the official docs on 2026-09-25: `UserPromptSubmit`, `PreCompact` and every other hook
   carry `session_id`, `cwd` and `transcript_path` but no context-window field. An instruction such
   as "hand off when your context is getting full" therefore asks for a self-assessment, and a
   self-assessment is least reliable exactly when the context is under load.
2. **The one existing hook fires too late and too narrowly.** `develop-pipeline-on-precompact.sh`
   runs *at* compaction, after quality has already dropped. It acts only when a `/develop-task` or
   `/develop-story` lock is held.
3. **Auto-compaction's threshold is undocumented and not configurable**, so the user cannot tune
   when the lossy summary happens. They can only act earlier.
4. **A prose rule drifts.** This repository's own record (AGENTS.md § Stakeholder Summaries: seven
   call sites ignored a documented rule for months) shows that a convention with no chokepoint is
   not followed. The hook is the chokepoint.

### Benefits of a measured trigger

1. **Fires on evidence**: a percentage Claude Code measured, with an age attached.
2. **Early enough to matter**: the soft threshold arrives well before compaction, while the agent
   can still write a good continuation file.
3. **Every repo, one install**: user-level settings apply across projects.
4. **Non-invasive**: the user's status line output is byte-for-byte unchanged, and the hook adds
   one short note only when a band is crossed.
5. **Fails silent, never blocking**: every error path exits 0 with no output, so a broken install
   costs a missed reminder and never a blocked prompt.

---

## 3. Technical Background

### Current Architecture

- **Status line**: `settings.json` `statusLine: { type: "command", command: "…" }`. The command gets
  JSON on stdin that includes `session_id`, `transcript_path` and `context_window.{used_percentage,
  remaining_percentage, context_window_size, total_input_tokens, …}` (code.claude.com/docs/en/statusline).
  Refresh cadence is **not documented** (it is event-driven, with an optional `refreshInterval`), so a
  recorded figure can be old.
- **`UserPromptSubmit` hook**: input `session_id`, `cwd`, `transcript_path`, `prompt`. It can add context
  through `hookSpecificOutput.additionalContext`. **Exit code 2 blocks the prompt**, so this hook must
  never exit 2.
- **User-level hooks** in `~/.claude/settings.json` fire in every project.
- **Precedents in this repo**:
  - `shared/resources/develop-pipeline-install-hooks.sh`: an idempotent installer that deduplicates by
    hook *identity* (the script path across every spelling) and preserves other settings. It targets
    project settings and takes `--settings` / `--dry-run`.
  - `shared/resources/observe-work-session-start.sh`: **shipped, not installed**. It emits
    `additionalContext` and stays **silent** when its engine cannot be reached ("a wrong number is
    worse than none").
- This machine's `~/.claude/statusline.sh` already parses `context_window.used_percentage` with `jq`
  for display. It is the kind of existing status line the wrapper must preserve.

### Target Architecture

```mermaid
sequenceDiagram
  participant CC as Claude Code
  participant SL as context-pressure-statusline.sh
  participant E as context-pressure.mjs
  participant U as user's status line
  participant H as UserPromptSubmit hook
  CC->>SL: status JSON (stdin)
  SL->>E: record (same bytes)
  E-->>E: write state/{session_id}.json {pct, at}
  SL->>U: same bytes on stdin
  U-->>CC: status text (unchanged)
  CC->>H: {session_id, prompt}
  H->>E: check
  E-->>E: read state; fresh? band crossed?
  E-->>CC: additionalContext (or nothing), exit 0
```

- **`context-pressure.mjs`** is the only code that reads or writes the state, so the format is
  defined once.
  - `record`: parse stdin, validate `session_id` (`^[A-Za-z0-9_-]{1,128}$`, anything else →
    silent no-op, so no path traversal), and write `{ pct, at }` atomically (tmp + rename) to
    `${CONTEXT_PRESSURE_STATE_DIR:-${XDG_STATE_HOME:-~/.local/state}/agent-skills/context-pressure}/{session_id}.json`.
    Preserve the `check`-owned fields already in the file.
  - `check`: parse stdin, load state, and stay silent unless `pct` is **fresh**
    (`now - at ≤ CONTEXT_PRESSURE_MAX_AGE_MIN`, default 15). Band: `< SOFT` (60) none,
    `≥ SOFT` soft, `≥ FIRM` (75) firm. Emit **on entering a higher band**, and in firm re-emit
    every `CONTEXT_PRESSURE_REPEAT` prompts (default 5). Record `band`, `emitted_at_prompt` and
    `prompts` back into the state.
  - Opportunistic pruning: `record` deletes state files older than 7 days, at most once per hour.
  - Every path exits 0. `check` prints either nothing or exactly one JSON object.
- **Injected text** (single template in the engine):
  - soft: *"Context is {pct}% full (measured by the status line {age} ago). At the next natural
    boundary (a task or phase finished, never mid-edit), include in your closing next steps a
    recommendation to hand off with session-handoff continue mode, and offer to write it."*
  - firm: the same measurement, then *"Recommend the continuation handoff now in your closing next
    steps, as the recommended option, and offer to write it before starting any new phase."*
- **`context-pressure-statusline.sh -- <original command…>`**: read stdin once, pipe it to
  `record` in the background and never wait on or fail because of it, then `exec` the original
  command with the same bytes on stdin. With no original command it prints nothing.
- **`context-pressure-install.sh [--settings f] [--dry-run] [--uninstall]`**, defaulting to
  `~/.claude/settings.json`. It adds the `UserPromptSubmit` hook (`command node <engine> check`) and
  wraps the existing `statusLine.command` as `…/context-pressure-statusline.sh -- <original>`. It
  deduplicates by identity (the engine or wrapper path under any spelling), writes atomically with a
  `.bak`, and never wraps twice. `--uninstall` removes the hook and unwraps back to the exact original
  command.

### Important Clarifications

- **Claude-Code-specific.** Other agents have no status line feed. For them, task.156's mode still
  works by hand. The SKILL says so.
- **The threshold is advisory.** The hook never forces a handoff and never blocks. It changes what
  the agent recommends. Acting on it stays the user's call, which fits the user-level "end every
  response with next steps" rule in `~/.claude/CLAUDE.md`.
- **Why the status line and not the transcript.** A hook could estimate tokens from
  `transcript_path`, but that would be a second, inaccurate measure of something Claude Code already
  measures. It is rejected for the same reason `observe-work-session-start.sh` refuses a shell recount.
- **Shipped, not auto-installed.** Installation stays the user's explicit action, following the
  observe-work precedent.

---

## 4. Scope

### In Scope

✅ **Engine**: `shared/resources/context-pressure.mjs` (`record`, `check`, pruning, env thresholds).
✅ **Wrapper**: `shared/resources/context-pressure-statusline.sh`.
✅ **Installer**: `shared/resources/context-pressure-install.sh` (install, `--uninstall`, `--dry-run`, `--settings`).
✅ **Bundling**: cited from `skills/session-handoff/SKILL.md` so `npm run bundle` copies all three into `skills/session-handoff/references/` and nothing is `UNREACHED`.
✅ **Docs**: a `## Context-pressure trigger (Claude Code)` section in `session-handoff/SKILL.md`: what it does, install/uninstall, env knobs, silence semantics.
✅ **Tests** under `shared/resources/tests/`.
✅ **CHANGELOG**.

### Out of Scope

❌ **The continuation mode itself**: task.156.
❌ **Changing the user's status line script**: the wrapper leaves it untouched.
❌ **Auto-running the handoff or starting a new session**: not possible from a hook, and it is the user's decision.
❌ **Non-Claude-Code harnesses**: no equivalent feed. Revisit if one appears.
❌ **Changing `develop-pipeline-on-precompact.sh`**: it keeps its compaction-time job.
❌ **Wiring into `scripts/setup-consumer.sh`**: that script installs per-project and this is per-user. Documented as a manual step.

---

## 5. Breaking Changes

None. Everything is opt-in through the installer, and uninstall restores the exact previous
`statusLine.command`.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.157.plan.context-pressure-handoff-trigger.md](task.157.plan.context-pressure-handoff-trigger.md)

### Phase 1: Engine — `record` and `check`

**Risk Level**: Medium. It runs on every prompt.

**Files**:
- `shared/resources/context-pressure.mjs` (new)
- `shared/resources/tests/context-pressure.test.mjs` (new)

**Changes**:
- [ ] Pure `decide(state, now, env)` → `{ emit: null | text, nextState }` covering bands, freshness, hysteresis and repeat
- [ ] `record` with session-id validation, atomic write, preservation of `check`-owned fields, pruning
- [ ] `check` that emits `{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":…}}` or nothing
- [ ] Every error path → exit 0, no stdout (stderr allowed but kept terse); emit via `process.exitCode`, never `process.exit()`

**Dependencies**: task.156 merged (the injected text names its mode)

---

### Phase 2: Status line wrapper

**Risk Level**: Medium. A broken status line is visible on every refresh.

**Files**:
- `shared/resources/context-pressure-statusline.sh` (new)
- `shared/resources/tests/context-pressure-statusline.test.mjs` (new)

**Changes**:
- [ ] Read stdin once and pass the same bytes to `record` (background, output discarded) and to the original command
- [ ] `exec` the original after `--`, so its exit code and stdout are the wrapper's own
- [ ] A missing `node` or engine still runs the original

**Dependencies**: Phase 1

---

### Phase 3: User-level installer

**Risk Level**: Medium. It edits the user's global settings.

**Files**:
- `shared/resources/context-pressure-install.sh` (new)
- `shared/resources/tests/context-pressure-install.test.mjs` (new)

**Changes**:
- [ ] Install: add the hook and wrap `statusLine`, deduplicating by identity (pattern from `develop-pipeline-install-hooks.sh`)
- [ ] Idempotent: a second run is byte-identical; never double-wraps
- [ ] `--uninstall`: remove the hook and unwrap to the exact original; a no-op when not installed
- [ ] `--dry-run` prints the diff and writes nothing; `--settings` targets another file
- [ ] Atomic write plus `.bak`; malformed JSON → refuse with exit 1, file untouched

**Dependencies**: Phases 1–2

---

### Phase 4: Docs, bundle, changelog

**Risk Level**: Low

**Files**:
- `skills/session-handoff/SKILL.md`
- `skills/session-handoff/references/*` (generated by bundle)
- `CHANGELOG.md`

**Changes**:
- [ ] `## Context-pressure trigger (Claude Code)` section citing all three `shared/resources/` files
- [ ] `npm run bundle`, then `bundle -- --check` reports 0 problems
- [ ] CHANGELOG `[Unreleased]` entry

**Dependencies**: Phases 1–3

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/context-pressure.mjs` - new: state owner, `record` / `check`
2. ✅ `shared/resources/context-pressure-statusline.sh` - new: recording status line wrapper
3. ✅ `shared/resources/context-pressure-install.sh` - new: user-level installer and uninstaller

### Files to Modify (Tests)

4. ✅ `shared/resources/tests/context-pressure.test.mjs` - new
5. ✅ `shared/resources/tests/context-pressure-statusline.test.mjs` - new
6. ✅ `shared/resources/tests/context-pressure-install.test.mjs` - new

All three sit inside `package.json`'s existing `shared/resources/tests/*.test.mjs` glob, so no glob
edit is needed and nothing is orphaned.

### Files to Modify (Dependencies)

None.

### Files to Modify (Documentation)

7. ✅ `skills/session-handoff/SKILL.md` - trigger section
8. ✅ `skills/session-handoff/references/context-pressure*.{mjs,sh}` - bundled copies (generated)
9. ✅ `CHANGELOG.md` - `[Unreleased]` entry

---

## 8. Testing Strategy

### Unit Tests

**Scope**: `decide()` and the session-id guard.

**Actions**:
- [ ] 59% → nothing. 60% → soft once. 61% on the next prompt → nothing (hysteresis). 75% → firm. Then firm again only after `REPEAT` prompts
- [ ] Stale reading (`at` older than max age) → nothing, even at 95%
- [ ] Missing, empty or corrupt state → nothing, exit 0
- [ ] Session ids `../x`, `a/b`, empty, 200 chars → `record` writes nothing outside the state dir (assert that the dir listing is unchanged)
- [ ] Env overrides (`SOFT`, `FIRM`, `MAX_AGE_MIN`, `REPEAT`); invalid values fall back to defaults

**Command**: `command node --test shared/resources/tests/context-pressure.test.mjs`

---

### Integration Tests

**Scope**: real processes, a temp state dir, and temp settings.

**Actions**:
- [ ] Pipe a status line JSON through the wrapper around a stub command that echoes stdin and exits 3: stub output is byte-identical, the wrapper exits 3, and the state file holds the percentage
- [ ] Wrapper with the engine path broken: the original still runs and its output is unchanged
- [ ] Hook end to end: `record` 80%, then `check` with the same session id prints parseable JSON whose `additionalContext` names `session-handoff` and contains `80%`
- [ ] Installer against a temp settings file holding an existing `statusLine` and unrelated hooks: install, install again (byte-identical), uninstall (byte-identical to the original apart from formatting, compared as parsed JSON)
- [ ] Installer against malformed JSON: exit 1, file unchanged

**Command**: `command node --test shared/resources/tests/context-pressure*.test.mjs`

---

### Contract Tests

**Scope**: the hook I/O contract.

**Actions**:
- [ ] `check` stdout is empty or exactly one JSON object with `hookSpecificOutput.hookEventName === "UserPromptSubmit"`
- [ ] `check` exits 0 on every input the tests throw at it, and never exits 2

---

### Performance Tests

**Metrics to Measure**: wall time of `check` and of the wrapper's overhead.

**Baselines**: none yet. Measure before/after with `time` over 20 runs.

**Expectations**: `check` under 150 ms p95 on this machine (Node startup dominates). The wrapper adds
under 50 ms to the status line, because `record` runs in the background. Recorded in the
implementation report, not asserted in CI (the load-sensitive-test rule).

---

### Consumer Tests

**Scope**: a real user-level install on this machine.

**Actions**:
- [ ] Run the installer with `--dry-run` against `~/.claude/settings.json`, review, install, then confirm the status line still renders and a prompt past 60% (or with `CONTEXT_PRESSURE_SOFT=1`) produces the note
- [ ] Uninstall restores the original `statusLine.command`

---

## 9. Success Criteria

### Functional

- [ ] `check` emits a soft note once when a fresh reading first reaches `SOFT`, and a firm note on reaching `FIRM`, repeated every `REPEAT` prompts (Phase 1 `decide`)
- [ ] `check` emits nothing for a stale, missing or corrupt reading, and exits 0 on every tested input (Phase 1)
- [ ] The wrapper's stdout and exit code equal the original command's for the same stdin (Phase 2)
- [ ] Install then uninstall leaves `settings.json` equal to the original as parsed JSON; a second install changes nothing (Phase 3)
- [ ] An invalid `session_id` never writes outside the state dir (Phase 1)

### Performance

- [ ] `check` p95 < 150 ms, measured and recorded
- [ ] Status line overhead < 50 ms, measured and recorded

### Code Quality

- [ ] `command npm test` passes, with the new suites counted in the run
- [ ] `npm run bundle -- --check`: 0 problems, no `UNREACHED`
- [ ] `bash scripts/lint-shell.sh` clean on both `.sh` files
- [ ] Every new test mutation-proven: remove hysteresis, remove the freshness check, and drop the identity dedupe, and a named test goes red for each

### Migration

- [ ] CHANGELOG `[Unreleased]` entry
- [ ] `session-handoff/SKILL.md` documents install, uninstall, env knobs and silence semantics
- [ ] Manual install verified on this machine (Consumer Tests)

---

## 10. Risk Assessment

### High Risk Areas

**1. The hook blocks or slows every prompt**
- **Risk**: a non-zero exit (2 blocks the prompt) or a hang on a slow disk.
- **Probability**: Low
- **Impact**: Critical. Every prompt in every repo is affected.
- **Mitigation**: all paths exit 0, and the contract test asserts it. No network. A single small file read. A registered hook `timeout` in the installer entry.
- **Rollback**: `context-pressure-install.sh --uninstall`, or delete the hook entry by hand.

**2. The wrapper breaks the user's status line**
- **Risk**: stdin consumed and not forwarded, output altered, or the wrapper failing when the engine is missing.
- **Probability**: Medium
- **Impact**: Major. It is visible on every refresh.
- **Mitigation**: read stdin once, forward the same bytes, `exec` the original, keep recording in the background with errors discarded. An integration test covers byte identity and a broken engine.
- **Rollback**: uninstall, which unwraps to the exact original.

### Medium Risk Areas

**1. Global settings corruption**
- **Risk**: the installer writes invalid JSON or drops unrelated keys.
- **Probability**: Low
- **Impact**: Major
- **Mitigation**: parse, modify and serialise; atomic tmp + rename; `.bak`; refuse malformed input; tests compare parsed JSON.
- **Rollback**: restore `settings.json.bak`.

**2. Nagging**
- **Risk**: the note repeats until it is ignored, and it spends context itself.
- **Probability**: Medium
- **Impact**: Minor
- **Mitigation**: emit only on band entry, with firm repeats every `REPEAT` prompts; the note stays under about 60 words.
- **Rollback**: raise `REPEAT` or the thresholds through env.

**3. Thresholds wrong for the model's window**
- **Risk**: 60/75 is too early on a 1M window or too late on 200k, and auto-compaction's own threshold is undocumented.
- **Probability**: Medium
- **Impact**: Minor
- **Mitigation**: env-tunable; `context_window_size` is recorded too so a later change can scale by window.
- **Rollback**: env override.

### Low Risk Areas

**1. Stale state files accumulate**
- **Risk**: one file per session forever.
- **Probability**: High
- **Impact**: Minor
- **Mitigation**: seven-day pruning in `record`.
- **Rollback**: n/a

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- Any prompt blocked or noticeably delayed after install
- Status line blank or altered

**Steps**:
1. `bash ~/.agents/skills/session-handoff/references/context-pressure-install.sh --uninstall` (or restore `~/.claude/settings.json.bak`)
2. Restart the Claude Code session
3. In the repo, `git revert <merge-sha>` if the defect is in shipped code

**Verification**: the status line renders as before, and prompts carry no injected note.

---

### Partial Rollback (1-2 hours)

**When to Use**: the hook misbehaves but recording is fine, or the reverse.

**Steps**:
1. Remove just the `UserPromptSubmit` entry by hand, or unwrap just `statusLine`
2. Confirm the other half still behaves

---

### Forward Fix (< 4 hours)

**When to Use**: wrong thresholds, note wording, pruning cadence.

**Approach**: env override immediately, then a code fix with a regression test.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:
- A blocked prompt, a broken status line, or corrupted settings

**Non-Critical (Forward Fix)**:
- Nagging frequency, thresholds, wording

---

<!-- change-log-start -->
## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-09-25 | 1.0     | Initial draft | create-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Engine
- [ ] `decide()` + tests
- [ ] `record` / `check` CLI + contract tests

### Phase 2: Status line wrapper
- [ ] Wrapper + byte-identity tests

### Phase 3: Installer
- [ ] Install / uninstall / dry-run + tests

### Phase 4: Docs, bundle, changelog
- [ ] SKILL section, bundle, CHANGELOG

---

## References

- **Depends on**: task.156 (`session-handoff` continue mode)
- **Related Skill**: `skills/session-handoff/`
- **Precedents**: `shared/resources/develop-pipeline-install-hooks.sh` (identity dedupe), `shared/resources/observe-work-session-start.sh` (shipped-not-installed, silent on failure)
- **Claude Code docs**: code.claude.com/docs/en/statusline (status line input), code.claude.com/docs/en/hooks-guide (`UserPromptSubmit`, `additionalContext`)

---

## Notes

### Important Reminders

- `command node`, never bare `node`, in the hook and wrapper commands the installer writes. A shell
  function `node` would print nvm help into the hook's stdout, which Claude Code would inject as
  context.
- The hook is **silent on failure** by design. Do not add a fallback that guesses a percentage.

### Known Issues

**Open** (Non-blocking):
- ⚠️ Status line refresh cadence is undocumented, so the reading can lag by one or more turns. The
  freshness window bounds how stale an acted-on figure can be.

### Future Improvements

- Scale thresholds by `context_window_size`.
- A `SessionStart` (matcher `compact`) companion that, after an auto-compaction, points at the
  newest continuation file if one exists.

---

**Status:** Planned

**Next Steps**:
1. Land task.156 first
2. Implement according to the implementation plan (`/develop-task`)
3. Hand off to QA when complete
4. QA will create:
   - QA Report: `task.157.qa.[n].[name].md`
   - Bug Reports (if needed): `task.157.bug.[N].[name].md`
   - Quality Gate: `task.157.gate.[n].[name].yml` (co-located in task directory)

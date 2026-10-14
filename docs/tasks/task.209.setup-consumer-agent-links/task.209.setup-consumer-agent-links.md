---
id: task.209
title: "setup-consumer.sh links each user's agents to AGENTS.md and .agents/skills"
type: task
description: "A checkbox list in the setup wizard makes the local, gitignored links each picked agent needs to the one committed instruction file and skills directory, with a --link-agents flag and a --links-only mode for new clones and worktrees."
tags: [setup-consumer, onboarding, agents-md, symlinks, gitignore]
category: infrastructure
status: ready-for-review
priority: Medium
created: 2026-10-14
updated: 2026-10-14
assignee:
estimated_effort_hours: 4
---

# Technical Task: setup-consumer.sh links each user's agents to AGENTS.md and .agents/skills

**Status:** Ready for Review

---

## 1. Overview

A consumer repo commits one instruction file, `AGENTS.md`, and one skills directory, `.agents/skills/`.
Agents that look elsewhere need local links, made per user, per clone and per worktree
(getting-started §1a, PR #655). Today every user types them by hand.

This task adds a wizard step: a checkbox list of ten agents. Each ticked agent gets the links it
needs, gitignored. `--link-agents a,b` picks without the list, and `--links-only` runs just this step,
for a new clone or worktree.

**Scope**: `scripts/setup-consumer.sh`, its tests, getting-started §1a and the wizard step table.

---

## 2. Motivation

- **Setup is four steps instead of one.** Install, then two `ln -s` commands and two `.gitignore`
  lines, per agent.
- **The gitignore step is the one people skip,** and a committed link breaks installers that refuse
  symlinks and CI that does not have the target.
- **Multi-agent teams.** Each user runs a different set of agents, so the links cannot be committed;
  a list lets each user pick theirs.
- **Comma-separated numbers are poor UX** (user decision, 2026-10-14). A checkbox list is the
  expected shape for "pick several".

---

## 3. Technical Background

### Which agents need links

Checked against each agent's own docs on 2026-10-14. Eight of ten read `AGENTS.md` natively; seven
read `.agents/skills/`.

| Id | Agent | Needs | Source |
| --- | --- | --- | --- |
| `claude` | Claude Code | `CLAUDE.md → AGENTS.md` (only before v2.1.277, or when the built-in AGENTS.md plugin is off); `.claude/skills → ../.agents/skills` | code.claude.com/docs/en/memory, /skills |
| `codex` | OpenAI Codex | nothing | learn.chatgpt.com agents-md, build-skills |
| `copilot` | GitHub Copilot | nothing | docs.github.com custom instructions, agent skills |
| `cursor` | Cursor | nothing | cursor.com/docs/context/rules, /skills |
| `gemini` | Gemini CLI | `GEMINI.md → AGENTS.md` (or `context.fileName` in settings) | geminicli.com/docs/cli/gemini-md, /skills |
| `windsurf` | Windsurf (Devin Desktop) | nothing | docs.devin.ai cascade agents-md, skills |
| `cline` | Cline | `.cline/skills → ../.agents/skills` | docs.cline.bot rules, skills |
| `kiro` | Kiro | `.kiro/skills → ../.agents/skills` | kiro.dev/docs/steering, /skills |
| `opencode` | OpenCode | nothing | opencode.ai/docs/rules, /skills |
| `amp` | Amp | nothing | ampcode.com/docs agents-md, skills |

**Verified in this repo:** Claude Code v2.1.299 loads skills through a whole-folder
`.claude/skills → ../.agents/skills` link (this repo's own setup). Its docs only promise per-skill links.

**Not verified:** whether Gemini CLI, Cline and Kiro follow a symlinked instruction file or skills
folder. Their docs do not say.

### Why a hand-drawn list

The wizard is run as `bash <(curl …)`. Bash has no multi-select built-in (`select` picks one item);
`whiptail`, `dialog`, `fzf` and `gum` are not prerequisites. The list reads keys from `/dev/tty`, not
stdin, so it also works under `curl … | bash`. Bash 3.2 (macOS) has no fractional `read -t`, so an
arrow is read as ESC plus exactly two bytes.

---

## 4. Scope

**In scope**
- `checklist` widget: ↑/↓ and k/j move with wrap-around, space toggles, `a` toggles all, enter
  confirms; Ctrl-C restores the terminal; returns 1 with no terminal
- `link_agents` step after skills install; `--link-agents ids|none`; `--links-only`
- Never replace or delete: a real file, or a link aimed elsewhere, is reported and kept
- No dangling links: a missing target is reported and skipped
- Gitignore lines anchored (`/CLAUDE.md`), no trailing slash; an existing rule that already ignores the
  path is respected
- Re-run pre-ticks agents already linked
- getting-started §1a rewritten around the table; step 8b in the wizard table

**Out of scope**
- Removing links when an agent is unticked
- Gemini's `context.fileName` settings route (the link is simpler and needs no JSON edit)
- Persisting the chosen agents in `skills-config.yaml`
- Recreating links automatically in `develop-batch` worktrees

---

## 5. Breaking Changes

None. The step adds files only when the user ticks an agent, and never changes an existing file other
than appending to `.gitignore`.

---

## 6. Implementation Plan

See [`task.209.plan.setup-consumer-agent-links.md`](task.209.plan.setup-consumer-agent-links.md).

---

## 7. Files Summary

| File | Change |
| --- | --- |
| `scripts/setup-consumer.sh` | `checklist`, `AGENT_TABLE`, `link_agents`, flags, main wiring, links-only summary |
| `shared/resources/tests/setup-consumer-agent-links.test.mjs` | New: 14 tests, two through a real pseudo-terminal |
| `docs/concepts/getting-started.md` | §1a rewritten; step 8b; `--links-only` usage |
| `CHANGELOG.md` | `[Unreleased]` Added entry |

---

## 8. Testing Strategy

- **Behaviour, in a throwaway git repo:** links made and resolving; anchored ignore lines; a committed
  `sub/CLAUDE.md` stays tracked; re-run adds no duplicate lines; a real `CLAUDE.md` stays
  byte-identical; a foreign link is kept; no dangling link; a no-link agent writes nothing; a typo
  writes nothing; an existing unanchored rule is respected; `--dry-run` writes nothing.
- **No terminal:** spawned detached (`setsid`), the list is skipped and nothing written.
- **The list itself:** driven through Python's `pty` with real key bytes: wrap-around both ways,
  toggling, confirming, and pre-ticking.
- **Drift:** the table is read from the script; the getting-started table must list the same ids.
- **Mutation-proved:** overwriting existing files, unanchoring, allowing dangling links, removing wrap,
  removing pre-tick, and half-applying a typo each turn at least one test red.

---

## 9. Success Criteria

- [x] Ticking agents in the list makes exactly their links, gitignored
- [x] Nothing existing is replaced or deleted
- [x] Works without a terminal via `--link-agents`; skips cleanly without either
- [x] `--links-only` covers a new clone or worktree in one command
- [x] Tests pass and each guard is mutation-proved
- [ ] Tried by the user in a real terminal (Linux and macOS)

---

## 10. Risk Assessment

| Risk | Mitigation |
| --- | --- |
| An agent changes its paths | Table is one array in the script plus one docs table, tied by a test; §1a says to check the agent's docs |
| Gemini, Cline or Kiro do not follow symlinks | Not documented either way; reported in the PR; a user can untick |
| Terminal left broken after Ctrl-C | `trap` restores `stty` and the cursor |
| macOS bash 3.2 | No bash 4 features used; arrow keys read without `read -t` fractions. Not yet run on macOS |

---

## 11. Rollback Plan

Revert the commit. Links already made are plain local symlinks, ignored by git; deleting them restores
the previous state.

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-14
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.209.qa.2.setup-consumer-agent-links.md](./task.209.qa.2.setup-consumer-agent-links.md)
- **Gate File**: [task.209.gate.2.setup-consumer-agent-links.yml](./task.209.gate.2.setup-consumer-agent-links.yml)

### Test Coverage Summary
- **Tests Executed**: 5487 (5469 pass; 4 worktree-only failures, obs #39)
- **Phases Verified**: 4/4
- **Critical Issues**: 0 (2 medium)
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: CONCERNS, Maintainability: PASS

### Key Findings
Exit status fixed; the refute pass found a typo stops the full wizard midway ([TASK-209-BUG-2](./task.209.bug.2.typo-stops-the-full-wizard-midway.md)) and a failed link is reported as made ([TASK-209-BUG-3](./task.209.bug.3.failed-link-reported-as-linked.md)).
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-14 | 1.0 | Task created and implemented | Claude |
| 2026-10-14 |  | QA gate CONCERNS (90/100) — 1 medium, 1 low finding (retroactive QA of PR #659) | qa-task |
| 2026-10-14 |  | QA findings fixed — QA-209-1 (unknown id exits 0), CR-2 (comment placement), 1 iteration | qa-fix |
| 2026-10-14 |  | QA gate CONCERNS (90/100) — cycle 2 refute pass: 2 medium; cycle-1 fix verified | qa-task |
| 2026-10-14 |  | QA findings fixed — QA-209-2 (ids checked before any step), QA-209-3 (failed link reported), 1 iteration | qa-fix |
<!-- change-log-end -->


# Claude Code Tips

Tips for getting the most out of Claude Code commands, features, and workflows.

---

## CC-01 — Plan Mode Before Complex Tasks

Invoke `/plan` (or prefix a request with "plan:") before any task that touches multiple files or has unclear scope. Plan mode forces exploration before execution — Claude reads the codebase, identifies the right files, and surfaces trade-offs before writing a single line.

**Example:** `plan: add email verification to the signup flow`
**Why it matters:** Skipping planning on multi-file changes is the most common source of half-finished implementations.

---

## CC-02 — ExitPlanMode vs AskUserQuestion

These two tools serve distinct roles. `AskUserQuestion` is for clarifying requirements during planning. `ExitPlanMode` is for requesting approval to proceed. Never use `AskUserQuestion` to ask "does this plan look good?" — that's what `ExitPlanMode` is for.

**Example:** Stuck between two approaches → `AskUserQuestion`. Plan is ready → `ExitPlanMode`.
**Why it matters:** Mixing them breaks the plan review flow and creates awkward back-and-forth.

---

## CC-03 — Memory: Save the Non-Obvious, Not the Code

The memory system (`MEMORY.md` + per-topic files) is for things that can't be derived from the code: preferences, workflow patterns, feedback on Claude's approach, and cross-session context. Don't save architecture decisions, code patterns, or file paths — those are in the codebase.

**Example:** Save "user prefers single bundled PRs over many small ones" — not "auth is in apps/goji-web-api/src/auth/".
**Why it matters:** Saving derivable facts bloats memory and makes it harder to find genuinely useful context.

---

## CC-04 — Hooks for Automated Behaviors

Use the `update-config` skill to configure automated behaviors via hooks in `settings.json`. Hooks execute shell commands in response to tool events — they run in the harness, not in Claude's head. Anything you find yourself saying "always do X before Y" is a hook candidate.

**Example:** `after every commit, run lint` → PostToolUse hook on Bash targeting git commit.
**Why it matters:** Without hooks, Claude relies on reminders in each session; hooks make the behavior persistent.

---

## CC-05 — The `!` Prefix for Shell Commands

Prefix a command with `!` in the Claude Code prompt to run it directly in the session. The output lands in the conversation context. Useful for interactive auth flows (`! gcloud auth login`) or ad-hoc inspections without switching terminals.

**Example:** `! curl -s http://localhost:3002/health | jq`
**Why it matters:** Keeps output visible in the conversation, which Claude can then reason about without a separate tool call.

---

## CC-06 — autoskill: Let Sessions Train Skills

After a session with notable corrections or confirmations, invoke `/autoskill`. It analyzes the session for durable preferences and proposes targeted additions to the skills that were used. This is how skills improve over time without manual curation.

**Example:** After a session where you corrected Claude's commit style → `/autoskill`
**Why it matters:** One-off corrections disappear; autoskill codifies them into the skill so they apply next time.

---

## CC-07 — find-skills When You Don't Know the Right Command

Use `/find-skills [description]` to search available skills by intent rather than name. Skills are discovered by description match, so natural language queries work better than guessing skill names.

**Example:** `/find-skills send an email` → surfaces `resend`, `react-email`, `email-best-practices`
**Why it matters:** 100+ skills in the registry — browsing the list is slower than querying it.

---

## CC-08 — Dedicated Tools Beat Bash for File Operations

Use `Read`, `Write`, `Edit`, `Grep`, `Glob` instead of `cat`, `grep`, `find` via Bash. Dedicated tools show the user exactly what's being read or changed, give better permission controls, and are faster to approve. Reserve Bash for operations that have no dedicated tool equivalent.

**Example:** Find all usages of `WaitlistService` → `Grep` with pattern, not `bash grep -r`.
**Why it matters:** Bash is a black box; dedicated tools surface intent and enable proper review.

---

## CC-09 — CLAUDE.md is the Source of Truth for Project Rules

Project-specific rules in `CLAUDE.md` override all default Claude behaviors. Before configuring anything (port numbers, package managers, migration discipline), check `CLAUDE.md` first — the rule is likely already there.

**Example:** Wondering whether to use `yarn` or `npm`? Check `CLAUDE.md` — it says npm only, always.
**Why it matters:** Re-discovering the same rules wastes time and risks violating them.

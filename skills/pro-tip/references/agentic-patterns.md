# Agentic Coding Patterns

Tips for structuring effective multi-agent workflows, managing context, and getting the most out of Claude's agent capabilities.

---

## AP-01 — Parallel Tool Calls in a Single Message

Independent tool calls placed in the same response message execute in parallel. Sequential calls (where call B needs the result of call A) must be chained. This is the single biggest performance lever in agentic sessions.

**Example:** Launching two Explore agents at once → single message with two `Agent` tool blocks. Grep then Edit → two separate messages.
**Why it matters:** Naive sequential calls can be 3–5x slower than parallel equivalents.

---

## AP-02 — Agent Tool vs Direct Tools

Use the `Agent` tool for tasks with uncertain scope, open-ended codebase exploration, or work that generates large results you don't want polluting the main context. Use `Grep`/`Glob`/`Read` directly for targeted, known-path lookups — they're faster and cheaper.

**Example:** "Find all usages of WaitlistService" → `Grep` directly. "Understand how email events flow through the system" → `Explore` agent.
**Why it matters:** Launching an agent for a simple search wastes overhead; grep for a system-wide analysis misses the forest for the trees.

---

## AP-03 — Foreground vs Background Agents

Foreground agents block until complete — use when you need their result before proceeding. Background agents (`run_in_background: true`) let you continue other work and get notified on completion. Never sleep-poll a background agent; the harness notifies you automatically.

**Example:** Research agent whose findings inform the next step → foreground. Linter running while you write tests → background.
**Why it matters:** Misusing foreground for non-blocking work creates unnecessary waiting.

---

## AP-04 — Don't Duplicate Subagent Work

If you delegate research to a subagent, don't also run the same searches yourself. Trust the agent's result. Re-running the same Grep/Glob after an Explore agent just burns tokens and time.

**Example:** Explore agent searched for auth patterns → don't re-grep auth in the next message.
**Why it matters:** Duplicate work is the most common source of context bloat in agentic sessions.

---

## AP-05 — Context Window Discipline

Context fills up fast in long sessions. Mitigate by: using subagents to isolate heavy research, summarising results instead of pasting raw output, and avoiding reading files you won't actually use. The `Explore` subagent is specifically designed to isolate large result sets from the main context.

**Example:** Instead of reading 20 files to find one pattern, launch an Explore agent with a specific question.
**Why it matters:** A full context window degrades reasoning quality and forces expensive restarts.

---

## AP-06 — Plan, Implement, Verify Loop

Every non-trivial task benefits from three explicit phases: explore/plan (understand the codebase, design the approach), implement (write the code), verify (run tests or inspect the result). Skipping plan for "quick" changes is where most bugs enter.

**Example:** "Add a field to the Prisma schema" → check existing schema + migration pattern first, then add, then run `prisma migrate dev`.
**Why it matters:** Implementation without exploration assumes things about the codebase that are often wrong.

---

## AP-07 — Explore Agent Thoroughness Levels

The `Explore` subagent accepts a thoroughness level: `quick` for known file patterns, `medium` for moderate exploration, `very thorough` for comprehensive cross-cutting analysis. Matching thoroughness to actual need avoids over-spending context.

**Example:** Finding a specific component → `quick`. Understanding how the entire auth flow works → `very thorough`.
**Why it matters:** `very thorough` on a simple lookup is wasteful; `quick` on a system-wide analysis will miss things.

---

## AP-08 — Resuming Agents with SendMessage

A previously launched agent can be resumed via `SendMessage` using its ID or name. The agent picks up with its full context intact. This avoids spawning a new agent and re-establishing context from scratch.

**Example:** Research agent from earlier needs a follow-up question → `SendMessage` to the agent ID rather than spawning a new one.
**Why it matters:** New agent = new context; resumed agent = continuation of prior exploration.

---

## AP-09 — Worktree Isolation for Risky Changes

Use `isolation: "worktree"` on the `Agent` tool to give the agent its own git worktree — an isolated copy of the repo. The worktree is cleaned up automatically if no changes are made. Use for experimental refactors or large-scale changes that shouldn't touch the main working tree.

**Example:** `Agent` with `isolation: "worktree"` to attempt a database migration refactor without risking the working branch.
**Why it matters:** Isolates destructive or experimental agent work from the live codebase.

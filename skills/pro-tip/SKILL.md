---
name: pro-tip
description: Surfaces 1–3 contextually-relevant tips for Claude Code usage, agentic coding patterns, architectural decisions, and 3rd party integrations. Use when the user wants a tip, hint, or guidance on how to work more effectively with Claude or their stack. Reads session context to deliver pointed, immediately applicable advice.
---

# Pro Tip

## Purpose

Deliver 1–3 sharp, immediately usable tips based on what is happening in the current session. No generic advice — every tip maps to the work at hand.

## Tip ID Prefixes

Every tip has a unique ID for reference and feedback:

| Prefix | Category | File |
|--------|----------|------|
| `CC-` | Claude Code | `references/claude-code.md` |
| `AP-` | Agentic Patterns | `references/agentic-patterns.md` |
| `AR-` | Architecture | `references/architecture.md` |
| `IN-` | Integrations | `references/integrations.md` |
| `WF-` | Workflow & Pipelines | `references/workflow.md` |
| `TS-` | Testing | `references/testing.md` |
| `DB-` | Debugging | `references/debugging.md` |

## How to Use This Skill

### Step 1: Read the Session Context

Scan the current conversation for signals:
- What files, frameworks, or tools are being discussed?
- What commands or skills have been invoked?
- Is there friction — errors, confusion, repeated steps?
- What stage of work: planning, implementing, testing, deploying?

### Step 2: Select Reference Files

Load **up to 2** reference files that best match the session context:

| Signal | Primary Reference |
|--------|------------------|
| Using `/commands`, invoking skills, hooks, memory, plan mode | `references/claude-code.md` |
| Running agents, managing context, parallelising work | `references/agentic-patterns.md` |
| Making tech choices, API design, service boundaries, caching | `references/architecture.md` |
| Working with Resend, Railway, Prisma, NestJS, React/Vite, Nx | `references/integrations.md` |
| Running pipelines (develop-story, create-branch, create-pr), git workflow | `references/workflow.md` |
| Writing tests, debugging test failures, mocking, coverage | `references/testing.md` |
| Investigating errors, debugging framework issues, diagnosing failures | `references/debugging.md` |

**Multi-category sessions:** When the session clearly spans two areas (e.g., implementing a NestJS service + writing tests for it), load both relevant files and pick the best tip from each.

**Cold-start fallback (no conversation signals):**
1. Check `MEMORY.md` for recent work context — deliver tips relevant to what the user has been working on across sessions
2. If no memory context either, load `references/claude-code.md` and pick a broadly useful tip
3. Rotate categories across cold-start invocations — don't always default to Claude Code

**Direct access:** If the user specifies a tip ID (e.g., `/pro-tip CC-03`), load the matching reference file and deliver that specific tip.

### Step 3: Select 1–3 Tips

From the loaded reference file(s), choose tips that:
- Directly apply to what the user is doing right now
- Would not be obvious from reading the code or docs
- Save time, prevent mistakes, or unlock a better pattern

Default to 1 tip. Only surface more when multiple are directly relevant. Never pad.

### Step 4: Format and Deliver

Use this exact template for each tip:

```
`★ Tip ─ [ID] — [Short Title]`
[2–3 sentences: what it is and when to use it, plain language]
**Example:** `command, snippet, or pattern`
**Why it matters:** One sentence payoff.
`────────────────────────────────────────`
```

If delivering multiple tips, stack them with no extra prose between them.

End with a single line offering other categories if relevant:
> *More tips available for: Claude Code, Agentic Patterns, Architecture, Integrations, Workflow, Testing, Debugging*

Only list categories not already covered in the current response.

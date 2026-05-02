# Overview

Skills are modular, self-contained packages that extend Claude Code with specialized knowledge, workflows, and tools. Each skill provides domain-specific guidance that activates automatically based on context, or explicitly via direct invocation.

## What's in a Skill?

| File / Dir | Role | Required |
|------------|------|----------|
| `SKILL.md` | YAML frontmatter + instructions | Yes |
| `scripts/` | Executable code for deterministic tasks | Optional |
| `references/` | Documentation loaded into context as needed | Optional |
| `assets/` | Templates, boilerplate used in output | Optional |

## Progressive Disclosure

Skills use a three-level loading system to keep context lean:

1. **Metadata** (name + description) — always in context (~100 words)
2. **SKILL.md body** — loaded when skill triggers (<5k words)
3. **Bundled resources** — loaded as needed (unlimited)

The `description` field is the matcher used for auto-activation, so it must be specific.

## How Skills Work

### Automatic Activation

Claude Code loads relevant skills based on:

- Current task context
- Files being worked on
- User's request
- Conversation context

### Explicit Invocation

Skills can be explicitly invoked with the Skill tool or `@skill-name` references.

### Cross-References

Skills reference each other for integrated workflows. Example chains:

- `qa-planning` → `qa-review` → `qa-gate`
- `scrum-master` → `create-story` → `execute-checklist`
- `architect` → `create-architecture-doc` → `execute-architect-checklist`

## Key Principles

1. **Self-Contained** — All guidance lives in `SKILL.md` files
2. **Context-Aware** — Skills adapt to the current situation
3. **Flexible** — Recommendations, not rigid requirements
4. **Integrated** — Skills compose into workflows
5. **Interactive** — Use `AskUserQuestion` when context is unclear
6. **Actionable** — Concrete outputs (files, YAML blocks, reports)
7. **Traceable** — Link assessments, reviews, gate decisions
8. **Advisory** — Guide teams without blocking progress

## Summary

Skills:

- Provide structured, repeatable processes
- Ensure consistency and quality
- Reduce cognitive load
- Enable specialized expertise
- Support progressive disclosure
- Integrate with project workflows

Activate by describing what you want to accomplish — the matching skill engages.

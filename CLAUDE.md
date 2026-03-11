# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Purpose

This is a library of Claude Code skills — modular, self-contained packages that extend AI agent capabilities with specialized workflows, domain knowledge, and tooling. Skills are loaded into Claude Code via `.claude/skills/` in target projects.

## Skill Structure

Each skill lives in `skills/{skill-name}/` with this layout:

```
skills/skill-name/
├── SKILL.md          # Required: YAML frontmatter + instructions
├── skill-name.zip    # Packaged distributable (auto-generated)
├── scripts/          # Executable scripts for deterministic tasks
├── references/       # Documentation loaded into context on demand
└── assets/           # Templates and boilerplate used in output
```

**SKILL.md frontmatter** (required fields):
```yaml
---
name: skill-name
description: Concise description of when/why to use this skill
---
```

The `description` field is critical — it's what Claude uses for auto-activation matching (~100 words always in context).

## Progressive Disclosure Loading

Skills load in three tiers:
1. **Metadata** (name + description) — always in context
2. **SKILL.md body** — loaded when skill triggers
3. **Bundled resources** — loaded as needed during execution

## Creating and Packaging Skills

**Initialize a new skill:**
```bash
python skills/create-skill/scripts/init_skill.py <skill-name> --path skills/
```

**Package a skill into a distributable zip:**
```bash
python skills/create-skill/scripts/package_skill.py skills/<skill-name>
```

**Validate a skill:**
```bash
python skills/create-skill/scripts/quick_validate.py skills/<skill-name>
```

Packaged `.zip` files sit alongside the skill directory and are the distributable format.

## Configuration

Projects using these skills place a `skills-config.yaml` at their project root. The `skills-config.sample.yaml` in this repo documents all available settings:

```yaml
qa:
  qaLocation: docs/qa
prd:
  prdSharded: true
  prdShardedLocation: docs/prd
  epicFilePattern: "*/epics/epic.{n}.*.md"
architecture:
  architectureSharded: true
  architectureShardedLocation: docs/architecture
devLoadAlwaysFiles:
  - docs/architecture/concepts/coding-standards.md
devStoryLocation: nested   # stories nested inside epic directories
devDebugLog: .ai/debug-log.md
```

## File Naming Conventions (used in target projects)

| Artifact | Pattern | Example |
|----------|---------|---------|
| Epic | `epic.{n}.{name}.md` | `epic.178.user-discovery-ui.md` |
| Story | `story.{epic}.{story}.{name}.md` | `story.178.8.swipe-actions.md` |
| QA Report | `story.{epic}.{story}.qa.{n}.{name}.md` | `story.178.8.qa.1.review.md` |
| Gate File | `story.{epic}.{story}.gate.{n}.{name}.yml` | `story.178.8.gate.1.review.yml` |
| Bug Report | `bug.{epic}.{story}.{n}.{name}.md` | `bug.178.8.1.crash.md` |
| Task | `task.{n}.{name}.md` | `task.44.db-migration.md` |

## Key Skill Categories

**Development workflow (BMAD):** `develop`, `develop-story`, `qa-review`, `qa-fix`, `qa-gate`, `finalise`

**Git/version control:** `commit-changes`, `create-branch`, `create-pr`

**Story/epic lifecycle:** `create-story`, `review-story`, `review-epic`, `edit-story`, `edit-epic`, `validate-story`

**Product management:** `greenfield-prd`, `create-prd`, `create-epic`, `brownfield-story`, `scrum-master`

**Architecture:** `architect`, `create-architecture-doc`, `execute-architect-checklist`

**Enforcement/validation:** Many `*-enforcer` and `*-validator` skills for domain-specific checks

## Shared Resources

`shared/resources/` contains cross-skill shared documentation (e.g., `code-vs-test-validation.md`).

## BMAD Development Pipeline

The core story implementation workflow used by these skills:

```
validate-story → develop → qa-review → qa-fix (if needed) → finalise
```

Stories are the unit of work. QA gate files (PASS/CONCERNS/FAIL/WAIVED) are owned by QA skills — dev skills must never modify gate files.

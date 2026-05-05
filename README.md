# Claude Skills

A library of Claude Code skills — modular, self-contained packages that extend agent capabilities with specialized workflows, domain knowledge, and tooling. 76+ skills covering development, story management, QA, PM, architecture, validation, and more.

Skills are loaded into Claude Code via `.agents/skills/` in target projects and activate automatically based on context, or can be invoked explicitly.

## Quick Start

Validate a skill:

```bash
python3 skills/create-skill/scripts/quick_validate.py skills/<skill-name>
```

Package a skill (validates first, then zips):

```bash
python3 skills/create-skill/scripts/package_skill.py skills/<skill-name>
```

Scaffold a new skill:

```bash
python3 skills/create-skill/scripts/init_skill.py <skill-name> --path skills/
```

## Repository Layout

```
skills/         # Each skill in its own directory (SKILL.md + optional scripts/, references/, assets/)
shared/         # Cross-skill reference docs (auto-bundled into zips by the packager)
docs/           # This documentation tree
```

## Documentation

Full documentation lives under [`docs/`](./docs/README.md):

- **[Overview](./docs/overview.md)** — what skills are, progressive disclosure, key principles
- **[Usage](./docs/usage.md)** — natural language, explicit invocation, slash commands
- **[Skill Catalog](./docs/skill-catalog.md)** — categorized index of all skills
- **[Workflows](./docs/workflows.md)** — BMAD pipeline, sprint cycle, hotfix, parallel dev, change management

Per-area skill guides:

- **[Development](./docs/skills/development.md)** — `develop`, `fix-qa`, `validate-story`
- **[Story Management](./docs/skills/story-management.md)** — `scrum-master`, `create-story`, `parallel-stories`, `execute-checklist`, `correct-course`, `edit-epic`, `edit-story`
- **[Quality Assurance](./docs/skills/quality-assurance.md)** — `qa-planning`, `qa-review`, `qa-gate`
- **[Product Management](./docs/skills/product-management.md)** — `pm-coordinator`, `greenfield-prd`, `create-prd`, `change-management`, and supporting skills

Operations:

- **[Conventions](./docs/conventions.md)** — file naming, configuration
- **[Packaging](./docs/packaging.md)** — distribution, validation, shared resources
- **[Creating Skills](./docs/creating-skills.md)** — authoring guide, file structure, best practices

## Project Guidelines

See [`CLAUDE.md`](./CLAUDE.md) for repository-specific rules used by Claude Code.

## External Resources

- Claude Code Documentation: https://docs.claude.com/en/docs/claude-code
- Skills Overview: https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview

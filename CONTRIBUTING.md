# Contributing to agent-skills

## Ways to Contribute

- **New skills** — add a skill for a workflow, domain, or toolchain not yet covered
- **Improve existing skills** — sharpen descriptions, add patterns, fix errors
- **Reference docs** — add or update reference material used by skills
- **Bug reports** — open an issue if a skill produces incorrect or unhelpful output

## Adding a New Skill

Scaffold the skill directory:

```bash
python3 skills/create-skill/scripts/init_skill.py <skill-name> --path skills/
```

Validate it:

```bash
python3 skills/create-skill/scripts/quick_validate.py skills/<skill-name>
```

Package it:

```bash
python3 skills/create-skill/scripts/package_skill.py skills/<skill-name>
```

### Skill Quality Bar

- `description` field (frontmatter) must clearly state **when** to use the skill — this is what the agent sees to decide whether to activate it
- Skills should be self-contained; reference docs go in `references/`
- If the skill shares resources with others, put them in `shared/resources/` — the packager auto-bundles them
- No hardcoded project names, server addresses, or credentials

## Pull Requests

- One skill or change per PR
- Keep SKILL.md descriptions generic — no project-specific names or private infra
- Run `npm run generate-catalog` after adding or editing skills (regenerates `docs/skill-catalog.md`)
- Run `quick_validate.py` before submitting

## Reporting Issues

Open a GitHub issue. Include the skill name, what you asked it to do, and what went wrong.

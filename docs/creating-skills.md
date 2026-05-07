# Creating Skills

Use the `create-skill` skill to author new skills:

```
"Create a new skill for [purpose]"
"Help me build a skill for [workflow]"
```

## How Skills Load (Progressive Disclosure)

Skills load in three tiers:

1. **Metadata** (`name` + `description`) — always in context across every conversation
2. **SKILL.md body** — loaded when the skill triggers
3. **Bundled resources** — loaded as needed during execution

This means the `description` field is the most critical part of a skill. It's what Claude matches against to auto-activate the skill — keep it under ~100 words, specific, and trigger-focused.

## Skill Structure

Each skill lives in `skills/{skill-name}/`:

```
skills/skill-name/
├── SKILL.md          # Required: YAML frontmatter + instructions
├── skill-name.zip    # Packaged distributable (gitignored — built on demand)
├── scripts/          # Executable scripts for deterministic tasks
├── references/       # Documentation loaded into context on demand
└── assets/           # Templates and boilerplate used in output
```

## SKILL.md

Minimum required frontmatter:

```yaml
---
name: skill-name
description: Concise description of when/why to use this skill (~100 words max)
---
```

Recommended body structure:

```markdown
---
name: skill-name
description: When and how to use this skill
---

# Skill Title

## When to Use This Skill

[Clear guidance on when to invoke this skill]

## Process/Workflow

[Step-by-step guidance]

## Outputs

[What the skill produces]

## Integration with Other Skills

[Cross-references to related skills]
```

**`name`** must be hyphen-case (lowercase letters, digits, hyphens; no leading/trailing/consecutive hyphens).

## Adding a New Skill (Step-by-Step)

```bash
# 1. Scaffold
python3 skills/create-skill/scripts/init_skill.py <skill-name> --path skills/

# 2. Edit SKILL.md — frontmatter `name` and `description` are required
# 3. Add supporting files under references/, scripts/, or assets/

# 4. For docs shared with other skills, add to shared/resources/ and reference
#    using the explicit path `shared/resources/<file>` in your .md files.
#    The packager auto-bundles and rewrites these paths — never use symlinks
#    or relative paths or the packager won't detect them.

# 5. Validate
python3 skills/create-skill/scripts/quick_validate.py skills/<skill-name>

# 6. Package (canonical: packages all skills)
npm run package

# Or package a single skill
python3 skills/create-skill/scripts/package_skill.py skills/<skill-name>
```

## Packaging

Zips are **build artifacts** — gitignored (`skills/*/*.zip`). Regenerate whenever you need to install or distribute. Do not commit them.

| Method | Zip location |
|---|---|
| `npm run package` | Inside each skill dir: `skills/my-skill/my-skill.zip` |
| Direct script, no output-dir | Current working directory: `./my-skill.zip` |
| Direct script with output-dir | Specified directory |

`npm run package` is the canonical workflow — it packages every skill in `skills/`.

See [Packaging](./packaging.md) for full details on what the packager does.

## Validation

`quick_validate.py` checks:

- `SKILL.md` exists with valid YAML frontmatter
- Required fields `name` and `description` are present
- `name` is hyphen-case
- `description` contains no angle brackets
- All `shared/resources/<file>` references in `.md` files resolve to actual files

Validation runs automatically during packaging but can be run standalone during development.

## Shared Resources

`shared/resources/` is the single source of truth for documentation shared across multiple skills. Reference shared files using the explicit path:

```markdown
See `shared/resources/code-vs-test-validation.md` for the full framework.
```

The packager detects this pattern, bundles the file into `references/` inside the zip, and rewrites the path — installed skills are fully self-contained.

## Resource Directory Guide

| Directory | Use for |
|---|---|
| `scripts/` | Executable scripts for deterministic, repeatable tasks |
| `references/` | Documentation loaded into context on demand |
| `assets/` | Templates and boilerplate used in output |

## Best Practices

### Description field
- Most important part of any skill — drives auto-activation
- Be specific about triggers: "Use when X", "Invoke when Y"
- Keep under ~100 words

### SKILL.md body
- Use imperative/infinitive form (verb-first)
- Include "When to Use This Skill" section
- Provide clear workflow steps with examples
- Avoid duplication between `SKILL.md` and references

### Writing style
- Objective, instructional language
- "To accomplish X, do Y" (not "You should do X")
- Clear, actionable steps

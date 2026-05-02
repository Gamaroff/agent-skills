# Creating Skills

Use the `create-skill` skill to author new skills:

```
"Create a new skill for [purpose]"
"Help me build a skill for [workflow]"
```

## Authoring Process

1. **Understanding** — gather concrete examples
2. **Planning** — identify reusable resources needed
3. **Initialize** — `python3 skills/create-skill/scripts/init_skill.py <skill-name> --path skills/`
4. **Edit** — customize `SKILL.md` and resources
5. **Package** — `python3 skills/create-skill/scripts/package_skill.py skills/<skill-name>`
6. **Iterate** — test and improve

## Adding a New Skill (Step-by-Step)

```bash
# 1. Scaffold
python3 skills/create-skill/scripts/init_skill.py <skill-name> --path skills/

# 2. Fill in SKILL.md (frontmatter `name` + `description` are required)
# 3. Add supporting files under references/, scripts/, or assets/
# 4. For docs shared with other skills, add to shared/resources/ and reference as
#    `shared/resources/<file>` in your .md files

# 5. Validate
python3 skills/create-skill/scripts/quick_validate.py skills/<skill-name>

# 6. Package
python3 skills/create-skill/scripts/package_skill.py skills/<skill-name>
```

See [Packaging](./packaging.md) for what the packager does and shared-resource handling.

## Skill Structure

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter
│   │   ├── name: (required)
│   │   └── description: (required)
│   └── Markdown instructions
└── Bundled Resources (optional)
    ├── scripts/          - Executable code
    ├── references/       - Documentation
    └── assets/           - Templates, files
```

## SKILL.md Template

```markdown
---
name: skill-name
description: When and how to use this skill
---

# Skill Title

## When to Use This Skill

[Clear guidance on when to invoke this skill]

## Key Features

[What the skill provides]

## Process/Workflow

[Step-by-step guidance]

## Outputs

[What the skill produces]

## Integration with Other Skills

[Cross-references to related skills]

## Key Principles

[Core guidelines]
```

## Best Practices

### SKILL.md

- Use imperative/infinitive form (verb-first)
- Be specific in name and description
- Include "When to Use This Skill" section
- Provide clear workflow steps
- Include examples

### Resources

- **`scripts/`** — for repeatedly rewritten code
- **`references/`** — for documentation to load as needed
- **`assets/`** — for files used in output

### Writing Style

- Objective, instructional language
- "To accomplish X, do Y" (not "You should do X")
- Clear, actionable steps
- Avoid duplication between SKILL.md and references

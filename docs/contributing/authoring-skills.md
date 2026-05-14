# Authoring Skills

> **Audience:** contributors authoring new skills in this repo.

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

This means the `description` field is the most critical part of a skill. It's what the agent matches against to auto-activate the skill — keep it under ~100 words, specific, and trigger-focused.

## Skill Structure

Each skill lives in `skills/{skill-name}/`:

```
skills/skill-name/
├── SKILL.md          # Required: YAML frontmatter + instructions
├── references/       # Shared resources bundled in-place (committed to git)
├── scripts/          # Executable scripts for deterministic tasks
└── assets/           # Templates and boilerplate used in output
```

`skill-name.zip` is a build artifact (gitignored). See [Packaging](./packaging.md) for zip distribution details.

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

## Workflows

### Adding a new skill

```bash
# 1. Scaffold
python3 skills/create-skill/scripts/init_skill.py <skill-name> --path skills/

# 2. Edit SKILL.md — frontmatter `name` and `description` are required

# 3. Add supporting files under references/, scripts/, or assets/
#    For docs shared with other skills, add to shared/resources/ and reference
#    using the explicit path `shared/resources/<file>` in SKILL.md.
#    Never use symlinks or relative paths — the bundler won't detect them.

# 4. Validate
python3 skills/create-skill/scripts/quick_validate.py skills/<skill-name>

# 5. Regenerate the skill catalog
npm run generate-catalog

# 6. Commit — the pre-commit hook handles bundling automatically (see below)
git add skills/<skill-name>/ docs/reference/skill-catalog.md
git commit -m "feat(skills): add <skill-name>"
```

### Editing an existing skill

```bash
# Edit SKILL.md, scripts/, assets/, or shared/resources/ as needed

# Validate (if you changed SKILL.md frontmatter or shared refs)
python3 skills/create-skill/scripts/quick_validate.py skills/<skill-name>

# Regenerate catalog (if description changed)
npm run generate-catalog

# Commit — bundling is automatic if shared/resources or SKILL.md was staged
git add ...
git commit
```

### Editing a shared resource

```bash
# Edit shared/resources/<file>

# Commit — the pre-commit hook detects the staged shared/resources change,
# runs npm run bundle, and re-stages all affected references/ dirs automatically
git add shared/resources/<file>
git commit
```

## Bundling

`npx skills add` installs skills by copying their directories verbatim from the repo. Skills that reference `shared/resources/` files must have those files resolved into their `references/` directory before the commit lands — otherwise installed skills will have broken paths.

The pre-commit hook handles this automatically. It is wired up via the `prepare` npm script, so a fresh clone just needs:

```bash
npm install   # runs git config core.hooksPath .githooks
```

To bundle manually (e.g. after a failed hook or without committing):

```bash
npm run bundle                          # all skills
npm run bundle:skill skills/<name>      # one skill
```

Bundled `references/` files are committed to git — this is intentional.

See [Packaging](./packaging.md) for the full distribution story (in-tree bundle vs zip).

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

The bundler detects this pattern, copies the file into `references/` inside the skill directory, and rewrites the path — installed skills are fully self-contained.

## Resource Directory Guide

| Directory | Use for |
|---|---|
| `references/` | Shared resources bundled in-place (auto-managed — do not edit manually) |
| `scripts/` | Executable scripts for deterministic, repeatable tasks |
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

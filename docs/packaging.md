# Packaging Skills for Distribution

Skills are distributed as `.zip` files. Each zip is self-contained — shared documentation is bundled in automatically.

## Quick Start

```bash
# Validate a skill
python3 skills/create-skill/scripts/quick_validate.py skills/<skill-name>

# Package a skill (validates first, then zips)
python3 skills/create-skill/scripts/package_skill.py skills/<skill-name>

# Package to a specific output directory
python3 skills/create-skill/scripts/package_skill.py skills/<skill-name> ./dist
```

The zip is written alongside the skill directory by default:

```
skills/
└── my-skill/
    ├── SKILL.md
    └── ...
my-skill.zip          ← output here (or in --output-dir if specified)
```

## What the Packager Does

1. **Validates** the skill (frontmatter, naming, shared resource refs) — aborts on failure
2. **Detects** any `shared/resources/<file>` references across all `.md` files in the skill
3. **Bundles** those files into `references/` inside the zip
4. **Rewrites** all `shared/resources/<file>` paths to `references/<file>` in the zipped `.md` content

The source files in your working tree are never modified.

## Shared Resources

`shared/resources/` is the single source of truth for documentation shared across multiple skills (e.g. `code-vs-test-validation.md`, `develop-pipeline-pause.md`). Reference shared files using the explicit path:

```markdown
See `shared/resources/code-vs-test-validation.md` for the full framework.
```

The packager detects this pattern and bundles the file automatically. **Do not use symlinks or relative paths** to reference shared resources — the packager won't detect them.

## Validation

`quick_validate.py` checks:

- `SKILL.md` exists with valid YAML frontmatter
- Required fields `name` and `description` are present
- `name` is hyphen-case
- `description` contains no angle brackets
- All `shared/resources/<file>` references resolve to actual files in `shared/resources/`

Validation runs automatically as part of packaging, but you can run it standalone during development.

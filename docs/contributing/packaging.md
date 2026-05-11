# Packaging Skills for Distribution

> **Audience:** contributors authoring or releasing skills in this repo.

Skills are distributed as `.zip` files. Each zip is self-contained — shared documentation is bundled in automatically.

## Quick Start

```bash
# Validate a skill
python3 skills/create-skill/scripts/quick_validate.py skills/<skill-name>

# Package all skills (zip lands inside each skill directory)
npm run package

# Package one skill (zip lands inside the skill directory)
npm run package:skill -- ../../<skill-name> ../../<skill-name>

# Package a skill via script directly (zip lands in cwd)
python3 skills/create-skill/scripts/package_skill.py skills/<skill-name>

# Package to a specific output directory
python3 skills/create-skill/scripts/package_skill.py skills/<skill-name> ./dist
```

Output location depends on how you invoke the packager:

| Method | Zip location |
|---|---|
| `npm run package` | Inside each skill dir: `skills/my-skill/my-skill.zip` |
| Direct script, no output-dir | Current working directory: `./my-skill.zip` |
| Direct script with output-dir | Specified directory |

`npm run package` is the canonical workflow — it packages every skill in `skills/` and places each zip inside its own skill directory. This is what the `.gitignore` pattern `skills/*/*.zip` covers.

## What the Packager Does

1. **Validates** the skill (frontmatter, naming, shared resource refs) — aborts on failure
2. **Detects** any `shared/resources/<file>` references across all `.md` and `.js` files in the skill
3. **Bundles** those files into `references/` inside the zip
4. **Rewrites** paths in zipped content:
   - `.md` files: `shared/resources/<file>` → `references/<file>`
   - `.js` files: `require("...path.../shared/resources/<file>")` → `require("../references/<file>")`
5. **Excludes** `__pycache__`, `.git`, `node_modules`, `.DS_Store` directories and `.pyc`, `.pyo`, `.map` files

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
- `name` is hyphen-case (lowercase letters, digits, hyphens; no leading/trailing/consecutive hyphens)
- `description` contains no angle brackets
- All `shared/resources/<file>` references in any `.md` file (including subdirectories) resolve to actual files in `shared/resources/`

Note: validation scans `.md` files only for broken shared refs. `.js` shared refs are bundled by the packager but not checked by the validator.

Validation runs automatically as part of packaging, but you can run it standalone during development.

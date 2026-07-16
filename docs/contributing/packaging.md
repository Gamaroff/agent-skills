# Packaging Skills for Distribution

> **Audience:** contributors authoring or releasing skills in this repo.

Skills ship via two distribution paths:

| Path | How it works | When to use |
|---|---|---|
| **In-tree bundle** (`npm run bundle`) | Copies `shared/resources/*` into each skill's `references/` dir in place and rewrites paths. Committed to git. | Tarball install — `setup-consumer.sh` downloads the tagged GitHub release and copies skill dirs verbatim |
| **Zip package** (`npm run package`) | Same bundling + path rewrite, but inside a `.zip` artefact. Never committed. | Manual installs, release artefacts |

## In-Tree Bundling (required before push)

Tarball installs (via `setup-consumer.sh`) copy skill directories verbatim from the repo. For skills that reference `shared/resources/`, those references must already be resolved into `skills/<name>/references/` — otherwise the installed skill will have broken paths.

Run after any change to `shared/resources/` or a skill's `SKILL.md`:

```bash
npm run bundle          # all skills
npm run bundle:skill skills/<skill-name>   # one skill
```

Then commit the `references/` changes alongside your other edits. The bundled files are committed to git — this is intentional.

**Pre-commit hook (automatic):** the hook lives at `.githooks/pre-commit` (committed to git) and runs `npm run bundle` whenever `shared/resources/` or a `SKILL.md` is staged, then stages the `references/` files **that run changed**. It is wired up automatically via the `prepare` npm script — no manual step needed after a fresh clone:

```bash
npm install   # runs `git config core.hooksPath .githooks` via prepare script
```

Two behaviours are worth knowing, both there to keep a commit's bundled copies matching the source it carries:

- **Pre-existing bundle changes are left alone**, and reported. If `references/` was already dirty before you committed — say you ran `npm run bundle` yourself, or you are splitting one batch of work into several commits — those files are not swept into a commit that happens to touch an unrelated `SKILL.md`. Stage them yourself if they belong in it.
- **The hook refuses to commit bundles built from unstaged source.** `npm run bundle` reads `shared/resources/` from the working tree, but your commit carries the index. If bundling changes `references/` while a shared source has unstaged edits, the bundled copies would embed source the commit does not include — so the hook fails and asks you to stage or stash that source first.

## Zip Distribution

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

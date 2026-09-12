# Packaging Skills for Distribution

> **Audience:** contributors authoring or releasing skills in this repo.

Skills ship via two distribution paths:

| Path | How it works | When to use |
|---|---|---|
| **In-tree bundle** (`npm run bundle`) | Copies `shared/resources/*` into each skill's `references/` dir in place, rewrites paths and re-relativises every other link. Committed to git. | Tarball install — `setup-consumer.sh` downloads the tagged GitHub release and copies skill dirs verbatim |
| **Zip package** (`npm run package`) | Same bundling + path rewrite, but inside a `.zip` artefact. Never committed. | Manual installs, release artefacts |

## In-Tree Bundling (required before push)

Tarball installs (via `setup-consumer.sh`) copy skill directories verbatim from the repo. For skills that reference `shared/resources/`, those references must already be resolved into `skills/<name>/references/` — otherwise the installed skill will have broken paths.

Run after any change to `shared/resources/` or a skill's `SKILL.md`:

```bash
npm run bundle          # all skills
npm run bundle:skill skills/<skill-name>   # one skill
npm run bundle -- --check # verify freshness, write nothing
```

Then commit the `references/` changes alongside your other edits. The bundled files are committed to git — this is intentional.

**`--check` is what CI runs** (`validate.yml`), and it is a **per-file** comparison rather than a regenerate-and-diff. That distinction is load-bearing: regenerating and diffing can only see files the bundler chose to write, so a copy the bundler declines to touch is invisible to it. `--check` classifies each file and reports three outcomes:

| Verdict | Meaning |
| :--- | :--- |
| `in sync` | The copy matches its rewritten source |
| `STALE` | Bundler output, behind its source — `npm run bundle` fixes it |
| `AMBIGUOUS` | Differs from the source, and nothing proves whether it is bundler output or an authored file |

**`AMBIGUOUS` mostly means a `.json`.** Bundled `.md` and `.js` copies carry a provenance banner; `.json` cannot, so a stale bundled JSON and a hand-authored one are indistinguishable and **the bundler leaves it alone** — `npm run bundle` reports `in sync` while `--check` reports a problem. Today the only such file is `skills/create-skill/references/skill-dependencies.json`. If you change `shared/resources/skill-dependencies.json` (i.e. you ran `npm run generate-skill-deps`), copy it across by hand:

```bash
cp shared/resources/skill-dependencies.json skills/create-skill/references/skill-dependencies.json
```

Miss this and `npm test` fails on *the real repository is clean under `--check`*, several thousand assertions after the change that caused it.

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
4. **Rewrites** paths in zipped content — the same pass `bundle_skill.py` applies in-tree, imported
   from it rather than re-declared, so the zip and the tree cannot drift:
   - `.md` files: `shared/resources/<file>` → `references/<file>`, then every other relative link is
     re-relativised (see [Link re-relativisation](#link-re-relativisation) below)
   - `.js` / `.mjs` / `.sh` files: `require("...path.../shared/resources/<file>")` → `require("../references/<file>")`
     (and the ESM / `source` equivalents)
   - the skill's **own** `.md` files also get the outside-the-skill rule: a `../../docs/…` link in a
     README is valid in this repo and a 404 in a zip that ships nothing outside the skill directory
5. **Excludes** `__pycache__`, `.git`, `node_modules`, `.DS_Store` directories and `.pyc`, `.pyo`, `.map` files

The source files in your working tree are never modified.

## Shared Resources

`shared/resources/` is the single source of truth for documentation shared across multiple skills (e.g. `code-vs-test-validation.md`, `develop-pipeline-pause.md`). Reference shared files using the explicit path:

```markdown
See `shared/resources/code-vs-test-validation.md` for the full framework.
```

The packager detects this pattern and bundles the file automatically. **Do not use symlinks or relative paths** to reference shared resources — the packager won't detect them.

## Link re-relativisation

A shared resource is authored at `shared/resources/` depth; its bundled copy lives at
`skills/<skill>/references/`. The `shared/resources/X` spelling was always rewritten, but every
*other* relative link — a bare sibling `open-knowledge-format.md`, a `../../docs/…` path,
`../../AGENTS.md` — was copied verbatim and resolved one level wrong from the copy. Measured on
2026-09-12: **845 broken links in 215 bundled files**, certified clean by `--check` because it
compares copy to source.

The bundler now resolves each prose link against the source's directory and applies **one rule**:

| Resolved target | Emitted as |
| :--- | :--- |
| inside `skills/<skill>/` — a file the bundle ships (a bundled sibling, a skill-native reference) | relative to the copy |
| anything else — `docs/…`, `AGENTS.md`, a `shared/resources/` sibling this skill does **not** bundle | `https://github.com/Gamaroff/agent-skills/blob/develop/<repo-relative path>` |

"Bundled sibling" is decided from the same population the write and check passes use (`needed` ∪
`reconcilable`), never from what happens to be on disk mid-run — otherwise the first bundle would
emit URLs for siblings written a moment later and the second run would flip them back.

Three things the pass leaves alone, and the checker skips for the same reason: **fenced blocks and
inline code spans** (tracked line by line — a whole-text regex flips parity on an inline
```` ``` ```` mention), **absolute URLs and `#anchors`**, and **placeholders** — `url`, `path`, `…`,
or any target carrying `{…}`, `[…]` or `<…>`. That last rule is a pattern, not a list of files: a
template's `./task.{id}.{name}.md` is not a link. An illustrative link with a realistic-looking
target (`./bug.8.5.3.1.cache-cleanup-memory-leak.md`) is indistinguishable by pattern — put it in a
code span, or give it a `{…}` segment, at the source.

The guard is `tests/bundled-links.test.js` (under `npm test`, hence `npm run ci` and `test.yml`):
every relative link under `skills/**/*.md` and `shared/resources/**/*.md` must resolve to a tracked
file, and the walk must have visited ≥ 200 files and ≥ 1,000 links — an empty walk is a broken
reader, not a clean corpus. Its extractor (`tests/lib/markdown-links.js`) is the deliberate twin of
`rewrite_md_links()` in `bundle_skill.py`; the two must agree on fences, code spans and placeholders,
because a link one side sees and the other does not is either rewritten and never verified, or
verified and never rewritten.

The upstream URL pins `blob/develop` in one constant (`UPSTREAM_BASE`). Tarball installs come from
`develop`, so that is the branch a consumer's link should land on; a tagged-release variant is a
one-line change.

## Validation

`quick_validate.py` checks:

- `SKILL.md` exists with valid YAML frontmatter
- Required fields `name` and `description` are present
- `name` is hyphen-case (lowercase letters, digits, hyphens; no leading/trailing/consecutive hyphens)
- `description` contains no angle brackets
- All `shared/resources/<file>` references in any `.md` file (including subdirectories) resolve to actual files in `shared/resources/`

Note: validation scans `.md` files only for broken shared refs. `.js` shared refs are bundled by the packager but not checked by the validator.

Validation runs automatically as part of packaging, but you can run it standalone during development.

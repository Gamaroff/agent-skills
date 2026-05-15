# Releases

> **Audience:** maintainers cutting releases of this library.

How skills are versioned, packaged, and published.

## Versioning model

This repository is a **library of skills**, not a single versioned application. Two layers of versioning matter:

1. **Repo-level releases** (semver-tagged in git). Capture the state of the library — which skills exist, what shared resources they reference, what the catalog looks like. Cut when a meaningful batch of changes lands.

2. **Per-skill stability**. Some skills are stable (`develop-story`, `create-pr`); some are experimental (newly authored, low usage). Stability isn't currently encoded in frontmatter — it's signalled by where the skill is referenced from the docs. Featured-starting-points skills in [`docs/reference/skill-catalog.md`](../reference/skill-catalog.md) are by definition stable.

## Release checklist

Before cutting a repo release:

- [ ] `npm test` is green
- [ ] Hermetic evals pass (`npm run eval:*` non-smoke variants)
- [ ] Skill catalog is current: `npm run generate-catalog` then commit any diff
- [ ] CHANGELOG `[Unreleased]` has entries for everything user-facing since last release
- [ ] No skills have outdated `shared/resources/*` references — `package_skill.py` validation passes for all skills
- [ ] `validate.yml` CI workflow is green on the release commit

## Branch flow

This repo uses **`develop`** as the integration branch. Feature work and PRs land on `develop`; **`main`** only receives release-ready code. `scripts/release.sh` enforces this: it refuses to run on any branch except `main`.

The promotion path before each release:

```bash
# 1. Make sure develop is clean and pushed
git checkout develop
git status            # clean
git pull --rebase
git push
```

Then advance `main`. Two options depending on your branch-protection policy:

**Direct fast-forward** (solo maintainer, no branch protection on `main`):

```bash
git checkout main
git pull --rebase
git merge --ff-only develop
git push

bash scripts/release.sh --minor
```

**PR-based** (recommended for teams with branch protection on `main`):

```bash
# From develop, open a release-prep PR. Edit the title to include the
# planned version once you've decided which bump applies — e.g.:
# --title "Release vX.Y.Z prep"
gh pr create --base main --head develop \
  --title "Release prep" \
  --body "Promoting develop to main for next release."

# Merge the PR via the GitHub UI (or `gh pr merge --merge`), then locally:
git checkout main
git pull --rebase
bash scripts/release.sh --minor
```

### After a PR-based merge: sync `develop` with `main`

`gh pr merge --merge` (or "Create a merge commit" in the GitHub UI) creates a merge commit on `main` that `develop` doesn't have. After every PR-based release prep, `develop` is behind `main` by that merge commit. If you skip syncing, the next `develop → main` PR shows surprising diffs or fails the next `--ff-only` merge.

Pick one of:

**Sync after every release** (simplest):

```bash
git checkout develop
git pull --rebase                    # in case anything new landed
git merge --ff-only main             # bring the merge commit back
git push
```

**Use squash or rebase merges instead** (avoids the merge commit):

```bash
# When merging the release-prep PR:
gh pr merge --rebase                 # OR --squash
```

Both leave `main` with the same content as `develop` (no extra commit), so no follow-up sync is needed. Choose `--rebase` to preserve develop's commit history on main, or `--squash` for a single commit per release prep.

If `main` has diverged from `develop` for other reasons (e.g. a hotfix landed directly on `main`), use a regular merge or rebase `develop` first.

## Cutting a release

Pushing a `v*.*.*` tag triggers `.github/workflows/release.yml`, which:
1. Validates all skills via `quick_validate.py`
2. Creates a GitHub release with auto-generated notes
3. Attaches the source tarball automatically (GitHub adds `Source code (tar.gz)` to every release)

Consumers install from the tagged tarball. `setup-consumer.sh` resolves the latest release tag via the GitHub API at install time.

Use `scripts/release.sh` — it runs all checks, bumps the version, updates CHANGELOG, commits, tags, and pushes in one command:

```bash
# From main, with a clean working tree:
bash scripts/release.sh --patch   # bug fixes, docs, catalog regen
bash scripts/release.sh --minor   # new skills, new shared resources
bash scripts/release.sh --major   # breaking changes

# Preview without writing anything:
bash scripts/release.sh --dry-run --minor
```

The script:
1. Confirms you're on `main` with a clean, up-to-date working tree
2. Runs `npm test`, `npm run validate:all`, and `npm run generate-catalog` — fails fast on any red
3. Calculates `vX.Y.Z` from the latest git tag + bump type (no tags yet → starts at `v0.0.0`)
4. Moves `## [Unreleased]` → `## [vX.Y.Z] - YYYY-MM-DD` in `CHANGELOG.md` and leaves a fresh `[Unreleased]` above it
5. Commits `chore(release): vX.Y.Z`, creates an annotated tag, and pushes both to origin

The GitHub Actions workflow then handles release creation. No manual `gh release create` needed.

## What changes are breaking?

A change is **breaking** (MAJOR bump) if it would silently break a consuming project:

- A skill's required frontmatter changes
- The slash command name changes
- A pipeline step is removed or its outputs change shape
- A `skills-config.yaml` key is renamed or removed
- A status-lifecycle value is renamed or removed
- File-naming conventions change

A change is **additive** (MINOR bump) if consuming projects work unchanged but new functionality is available:

- A new skill is added
- A new optional frontmatter field is added
- A new runbook is added
- A new shared resource is added
- A new `skills-config.yaml` key is added (with a default)

A change is a **patch** if neither of the above and the user-facing behaviour is unchanged:

- Internal refactor of a skill that preserves its contract
- Bug fix that brings actual behaviour in line with documented behaviour
- Doc edits
- Catalog regeneration

## Publishing skills

Skills are distributed two ways:

1. **Tagged release tarball** (primary) — `setup-consumer.sh` and manual installs download the source tarball for the latest GitHub release tag. Skills are self-contained because `npm run bundle` has been run and committed — shared resources are pre-bundled into each skill's `references/` directory.

2. **Packaged zips** (offline / CI) — `skills/<name>/<name>.zip`. Build with `python3 skills/create-skill/scripts/package_skill.py skills/<name>`. Zips are gitignored — generate on demand and distribute out-of-band.

> `npx skills add` (the `skills` npm package from Vercel Labs) is **not used** — it has no knowledge of this repository.

## Catalog regeneration

The catalog (`docs/reference/skill-catalog.md`) is generated from skill frontmatter. Run after any change to a skill's `description` field:

```bash
npm run generate-catalog
```

Commit the diff if any. CI flags out-of-date catalogs.

## See also

- [Authoring skills](./authoring-skills.md)
- [Packaging](./packaging.md)
- [Evals](./evals/README.md)
- [`CHANGELOG.md`](../../CHANGELOG.md)

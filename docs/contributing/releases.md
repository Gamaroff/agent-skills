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

## Cutting a release

Pushing a `v*.*.*` tag triggers `.github/workflows/release.yml`, which:
1. Validates all skills via `quick_validate.py`
2. Creates a GitHub release with auto-generated notes
3. Attaches the source tarball automatically (GitHub adds `Source code (tar.gz)` to every release)

Consumers install from the tagged tarball. `setup-consumer.sh` resolves the latest release tag via the GitHub API at install time.

```bash
# Ensure clean state
git status         # clean
git pull --rebase

# Decide the version bump (semver)
#   MAJOR: breaking changes to skill invocation, frontmatter schemas, or pipeline contracts
#   MINOR: new skills, new shared resources, new runbooks
#   PATCH: bug fixes, doc-only changes, regeneration

# Update CHANGELOG: move [Unreleased] entries under [vX.Y.Z] - YYYY-MM-DD
# Commit the changelog rename
git commit -am "chore(release): vX.Y.Z"

# Tag — this triggers the release workflow
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin main vX.Y.Z
```

The GitHub Actions workflow handles release creation. No manual `gh release create` needed.

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

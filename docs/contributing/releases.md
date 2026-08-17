# Releases

> **Audience:** maintainers cutting releases of this library.

How skills are versioned, packaged, and published.

## Versioning model

This repository is a **library of skills**, not a single versioned application. Two layers of versioning matter:

1. **Repo-level releases** (semver-tagged in git). Capture the state of the library — which skills exist, what shared resources they reference, what the catalog looks like. Cut when a meaningful batch of changes lands.

2. **Per-skill stability**. Some skills are stable (`develop-story`, `create-pr`); some are experimental (newly authored, low usage). Stability isn't currently encoded in frontmatter — it's signalled by where the skill is referenced from the docs. Featured-starting-points skills in [`docs/reference/skill-catalog.md`](../reference/skill-catalog.md) are by definition stable.

## Release checklist

Before cutting a repo release:

- [ ] `test.yml` CI workflow is green on the release commit — covers `npm test` (L1–L4 hermetic) and `npm run eval:all` (L4 replay)
- [ ] CHANGELOG `[Unreleased]` has entries for everything user-facing since last release
- [ ] `validate.yml` CI workflow is green on the release commit

> Skill catalog (`npm run generate-catalog`) and bundled references (`npm run bundle`) are checked and auto-committed by `release.sh` — no manual pre-check needed.

## Branch flow

This repo uses **`develop`** as the integration branch. Feature work and PRs land on `develop`; **`main`** only receives release-ready code. `scripts/release.sh` enforces this: it refuses to run on any branch except `main`.

That guard covers the release end. The entry end is covered by the **Branch Policy** workflow ([`.github/workflows/branch-policy.yml`](../../.github/workflows/branch-policy.yml)), which fails any PR into `main` whose head is not `develop`, `hotfix/*`, or `release/*`.

> **Why both.** `release.sh` assumes the promotion direction is one-way — it advances `main` from `develop`. A feature PR merged straight into `main` inverts that: `main` gains commits `develop` lacks, and the fast-forward the script relies on is no longer available. This happened six times between 2026-08-14 and 2026-08-17 before the workflow existed. At the time the repo's **default branch was `main`**, and `gh pr create` with no `--base` targets the default — so the misroute was the path of least resistance rather than a slip.
>
> Both halves of that have since been closed: the default branch is now **`develop`**, so the accidental case is the correct one, and `main` carries branch protection requiring the Branch Policy check, so a misroute cannot be merged even when it is opened deliberately.

The promotion path before each release starts by making sure develop is clean and pushed:

```bash
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
```

**PR-based** (recommended for teams with branch protection on `main`):

```bash
# From develop, open a release-prep PR. Replace vX.Y.Z with the version
# you plan to cut — run `bash scripts/release.sh --dry-run --<bump>` from
# a local main checkout and look for the line:
#   ✓ Next version: vX.Y.Z  (minor bump)
gh pr create --base main --head develop \
  --title "Release prep — vX.Y.Z" \
  --body "Promoting develop to main for next release."

# Merge the PR via the GitHub UI (or `gh pr merge` — see Merge-type
# aesthetics below for which flag to use). Then locally:
git checkout main
git pull --rebase
```

In either case (Direct FF or PR-based), `main` is now at the tip you'll release from. Run `release.sh` (see [Cutting a release](#cutting-a-release)), then sync develop forward (see [Sync develop with main after release](#sync-develop-with-main-after-release)).

### Merge-type aesthetics

Only relevant to the PR-based path. The `gh pr merge` flag affects what `main`'s history *looks* like; it does not affect whether the develop sync step is needed (it always is — see below).

| Flag | Result on `main` | When to use |
|------|------------------|-------------|
| `--merge` (default) | A merge commit with develop as a parent — preserves both branches' commit history | Default for most teams |
| `--rebase` | Develop's commits replayed onto main, linear history | Teams that prefer linear main history |
| `--squash` | A single commit containing all develop changes | Teams that treat each release PR as one logical change |

## Cutting a release

Pushing a `v*.*.*` tag triggers `.github/workflows/release.yml`, which:
1. Installs npm dependencies
2. Runs `npm test` (hermetic test suite)
3. Verifies the skill catalog is up to date — fails if `generate-catalog` would produce a diff against the committed `docs/reference/skill-catalog.md`
4. Validates every skill via `quick_validate.py`
5. Creates a GitHub release with auto-generated notes — GitHub attaches the source tarball (`Source code (tar.gz)`) automatically

Consumers install from the tagged tarball. `setup-consumer.sh` resolves the latest release tag via the GitHub API at install time.

Use `scripts/release.sh` — it runs all checks, bumps the version, updates CHANGELOG, commits, tags, and pushes in one command:

```bash
# From main, with a clean working tree:
bash scripts/release.sh --patch   # bug fixes, docs, catalog regen
bash scripts/release.sh --minor   # new skills, new shared resources
bash scripts/release.sh --major   # breaking changes

# Preview without writing anything:
bash scripts/release.sh --dry-run --minor

# Skip the automatic develop sync:
bash scripts/release.sh --patch --no-sync-develop
```

The script:
1. Confirms you're on `main` with a clean, up-to-date working tree
2. Runs `npm test`, `npm run validate:all`, `npm run generate-catalog`, and `npm run bundle` — auto-commits any stale catalog or bundled-reference files
3. Calculates `vX.Y.Z` from the latest git tag + bump type (no tags yet → starts at `v0.0.0`)
4. Moves `## [Unreleased]` → `## [vX.Y.Z] - YYYY-MM-DD` in `CHANGELOG.md` and leaves a fresh `[Unreleased]` above it
5. Commits `chore(release): vX.Y.Z`, creates an annotated tag, and pushes both to origin
6. Syncs `develop` with `main` (`git checkout develop && git pull --rebase && git merge main && git push && git checkout main`) — skip with `--no-sync-develop`

The GitHub Actions workflow then handles release creation. No manual `gh release create` needed.

## Sync `develop` with `main` after release

`release.sh` adds a `chore(release): vX.Y.Z` commit and an annotated tag on `main`, then pushes both. **Develop is now behind `main`** by the chore(release) commit (and, for the PR-based path, also by the PR merge commit — whichever artefact `--merge`, `--rebase`, or `--squash` produced). This is true regardless of which branch-flow variant you used to advance `main`.

`release.sh` handles this automatically at the end of every fresh release — it checks out `develop`, rebases, merges `main`, pushes, and returns to `main`. Pass `--no-sync-develop` to skip and run it manually:

```bash
git checkout develop
git pull --rebase        # in case anything new landed on develop while you were running the release
git merge main           # brings main's commits, including the chore(release) commit, into develop
git push
```

`git merge main` (regular merge, **not** `--ff-only`) handles both cases:
- Develop didn't move during the release → merge fast-forwards (no extra commit on develop)
- Develop got new commits → merge creates a normal merge commit on develop

If `main` has diverged from `develop` for unrelated reasons (e.g. a hotfix landed directly on `main`), the same `git merge main` brings the hotfix into develop.

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

## Recovering from a failed release

The release runs in two halves: `scripts/release.sh` locally (push tag), then `.github/workflows/release.yml` in CI (publish GitHub Release object). If CI fails between tag push and `gh release create`, the tag exists on origin but no Release is published — `setup-consumer.sh` then warns "No GitHub releases found" and falls back to `main`.

Two recovery paths, depending on whether you need to ship a fix on `main` first:

**A. CI was the only thing wrong** (flaky test, transient outage). Re-run the workflow against the existing tag — no tag surgery:

```bash
gh workflow run release.yml -f tag=v0.1.0 -R Gamaroff/agent-skills
```

Or use the GitHub UI: Actions → Release → "Run workflow" → enter the tag.

**B. You had to land a fix on `main`** (e.g. a workflow tweak). Delete the tag and re-push it at the new HEAD:

```bash
bash scripts/release.sh --retry           # retry latest tag
bash scripts/release.sh --retry v0.1.0    # retry a specific tag
```

`--retry` skips CHANGELOG and version-bump, refuses to run if a Release is already published for that tag, then deletes + re-pushes the tag — triggering the workflow afresh.

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

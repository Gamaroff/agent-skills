# Release & Install

> **Maintainers:** cut a release from `main`.  
> **Consumers:** install skills into your project via the setup wizard.

---

## Cutting a release (maintainers)

### 1. Pre-flight checks

```bash
npm test
npm run validate:all
npm run generate-catalog   # commit any diff
```

Ensure `CHANGELOG.md` has entries under `## [Unreleased]`.

### 2. Advance `main`

**Direct fast-forward** (solo / no branch protection):

```bash
git checkout main && git pull --rebase
git merge --ff-only develop && git push
```

**PR-based** (teams with branch protection):

```bash
# Preview the next version first
bash scripts/release.sh --dry-run --minor

gh pr create --base main --head develop \
  --title "Release prep — vX.Y.Z" \
  --body "Promoting develop to main for next release."
# Merge via GitHub UI, then:
git checkout main && git pull --rebase
```

### 3. Run the release script

```bash
bash scripts/release.sh --patch   # bug fixes, docs, catalog regen
bash scripts/release.sh --minor   # new skills, new shared resources
bash scripts/release.sh --major   # breaking changes
```

The script: bumps version, updates CHANGELOG, commits `chore(release): vX.Y.Z`, creates an annotated tag, pushes. GitHub Actions then creates the release and attaches the source tarball automatically.

**Bump type guide:**

| Bump | When |
|---|---|
| `--patch` | Internal refactor, bug fix, doc edits — no user-facing behaviour change |
| `--minor` | New skill, new optional config key, new shared resource |
| `--major` | Skill renamed, frontmatter required fields changed, config key removed |

### 4. Sync `develop` forward

```bash
git checkout develop && git pull --rebase
git merge main && git push
```

### If the release workflow fails

If CI fails between the tag push and `gh release create`, the tag exists on origin but no GitHub Release is published — consumers running `setup-consumer.sh` will see "No GitHub releases found — falling back to main".

Two recovery paths:

- **CI was the only thing wrong** (transient flake, expired token): re-run the workflow against the existing tag — `gh workflow run release.yml -f tag=v0.1.0 -R Gamaroff/agent-skills`.
- **You had to land a fix on `main` first**: `bash scripts/release.sh --retry v0.1.0` deletes and re-pushes the tag at the new `main` HEAD.

Full decision guide: [`../contributing/releases.md#recovering-from-a-failed-release`](../contributing/releases.md#recovering-from-a-failed-release).

---

## Installing skills (consumers)

### Full wizard (first-time setup)

Run in your project root:

```bash
bash <(curl -fsSL https://github.com/Gamaroff/agent-skills/raw/main/scripts/setup-consumer.sh)
```

The wizard sets up:

| Step | What it does |
|---|---|
| Platform | Choose GitHub Issues, GitHub+Jira, or Bitbucket+Jira |
| Credentials | Writes `.env` + `.env.example`; adds `.env` to `.gitignore` |
| Config | Creates `skills-config.yaml` (PRD path, architecture path, coding-standards path) |
| Registries | Creates `docs/epic-registry.md` and `docs/tasks/task-registry.md` |
| Docs scaffold | Creates `docs/prd/` and `docs/architecture/concepts/` stub files |
| Skills | Downloads latest tagged release → `.agents/skills/` |
| Hooks | Patches `PreCompact`, `Stop`, `PostToolUse` into `.claude/settings.json` |

### Update skills only (skip wizard)

```bash
bash <(curl -fsSL https://github.com/Gamaroff/agent-skills/raw/main/scripts/setup-consumer.sh) --update
```

### Pin a specific version

```bash
SKILLS_VERSION=v1.2.0 bash <(curl -fsSL https://github.com/Gamaroff/agent-skills/raw/main/scripts/setup-consumer.sh)
```

### After install

1. Fill in `docs/architecture/concepts/*.md` — or run `/document-existing-project` to auto-generate
2. Restart Claude Code in the project directory
3. Run `/create-task` to verify skill loading

### Verify

```bash
ls .agents/skills/ | head               # should list installed skills
cat .claude/settings.json | jq '.hooks' # should show PreCompact / Stop / PostToolUse
cat skills-config.yaml                  # should reflect your wizard answers
```

---

## See also

- [`docs/contributing/releases.md`](../contributing/releases.md) — full release reference
- [`docs/contributing/packaging.md`](../contributing/packaging.md) — zip distribution and bundling
- [`docs/concepts/getting-started.md`](../concepts/getting-started.md) — consumer onboarding walkthrough
- [`docs/reference/troubleshooting.md`](../reference/troubleshooting.md) — something not working?

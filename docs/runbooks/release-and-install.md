# Release & Install

> **Maintainers:** prepare a release on `develop`, tag it on `main`.  
> **Consumers:** install skills into your project via the setup wizard.

---

## Cutting a release (maintainers)

### 1. Pre-flight checks

```bash
npm run test:clean-checkout   # the suite in a clean clone of HEAD — what release.sh gates on
npm run validate:all
npm run generate-catalog   # --prepare also regenerates and commits this
```

Ensure `CHANGELOG.md` has entries under `## [Unreleased]`.

### 2. Prepare on `develop` and promote

`main` only moves by pull request: its required check runs on `pull_request` only, so a direct push
is refused — and that includes the release commit, which is why it is made on `develop`
([why](../contributing/releases.md#branch-flow)).

```bash
git checkout develop && git pull --rebase
bash scripts/release.sh --dry-run --prepare --minor   # preview the next version
bash scripts/release.sh --prepare --minor
#   → commits chore(release): vX.Y.Z on develop (CHANGELOG, catalog, bundle), pushes,
#     and opens "Release prep — vX.Y.Z" into main
# Merge the PR via GitHub UI, then:
git checkout main && git pull --rebase
```

### 3. Tag `main`

```bash
bash scripts/release.sh --tag
```

The script reads the version from the `[vX.Y.Z]` section the PR brought in, checks CI's verdict and
runs the local gate, then creates an annotated tag on `main`'s tip and pushes the tag alone. GitHub
Actions then creates the release and attaches the source tarball automatically.

**CI's verdict comes first, and it refuses anything but green.** Run right after merging the
release-prep PR, `--tag` usually finds CI still running on the merge commit and stops with "CI is
still running … re-run when it finishes" — wait for CI on `main`, then run it again. A red or
unreadable verdict refuses the same way. `--skip-ci-check` tags anyway, with a warning; use it only
when CI has been confirmed another way. (`scripts/release.sh` header, "What --tag does", step 2.)

**Bump type guide** (passed to `--prepare`):

| Bump      | When                                                                    |
| --------- | ----------------------------------------------------------------------- |
| `--patch` | Internal refactor, bug fix, doc edits — no user-facing behaviour change |
| `--minor` | New skill, new optional config key, new shared resource                 |
| `--major` | Skill renamed, frontmatter required fields changed, config key removed  |

### 4. Sync `develop` forward

Only if you passed `--no-sync-develop` — otherwise `--tag` has already merged `main` into `develop` and pushed it:

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
bash <(curl -fsSL https://raw.githubusercontent.com/Gamaroff/agent-skills/main/scripts/setup-consumer.sh)
```

The wizard sets up:

| Step          | What it does                                                                      |
| ------------- | --------------------------------------------------------------------------------- |
| Platform      | Choose GitHub Issues, GitHub+Jira, or Bitbucket+Jira                              |
| Tracker access | Choose `access.tracker`: `full`, `read-only`, `approve`, `command` or `manual` — see [Which access model?](../concepts/which-access.md) |
| Credentials   | Writes `.env.example`; optionally writes `.secrets/tooling.env` and adds `.secrets/` and `.env` to `.gitignore` |
| Config        | Creates `skills-config.yaml` (PRD path, architecture path, coding-standards path) |
| Registries    | Creates `docs/tasks/task-registry.md` (epics are numbered within their PRD)        |
| Docs scaffold | Creates `docs/prd/` and `docs/architecture/concepts/` stub files                  |
| Skill profile | Asks which install profile you want — `full`, `pipeline` or `minimal` (see below)  |
| Skills        | Downloads latest tagged release → `.agents/skills/`                               |
| tracker-workflow | Writes `tracker-workflow.yaml` if absent — from your live board when it can read it, otherwise a template to edit before the first run |
| Hooks         | Patches `PreCompact`, `Stop` into `.claude/settings.json`          |

### Choosing an install profile

The wizard asks which skills to install. **The motivation is context, not disk**: every installed
skill's `description` sits in the agent's context on every request, before it reads a single
instruction.

| Profile    | Roughly | What it is                                                              |
| ---------- | ------- | ----------------------------------------------------------------------- |
| `full`     | ~113    | Every skill the tracker filter permits. The default when no `skills:` block is present |
| `pipeline` | ~37     | The full story/task/bug lifecycle: create → review → develop → QA → finalise |
| `minimal`  | ~5      | Branching, commits, PRs and ad-hoc code review. No document pipeline     |

Counts vary with your tracker — see the filter note below.

**A profile names *seed* skills only.** The installer resolves each seed's transitive callees from
`shared/resources/skill-dependencies.json` and installs those too, so a profile can never produce a
half-installed pipeline that fails mid-run at the step whose skill is missing.

**The tracker filter runs *after* that closure.** A Jira-only skill reached via a dependency is still
dropped on a GitHub repo, so the same profile yields a different count on different platforms. A
skill excluded by the filter is **not** rescued by listing it in `include` — the filter is about
applicability, not preference. Use `--all-skills` if you genuinely want everything.

The answer is written to `skills-config.yaml`, which is what makes `--update` reproducible:

```yaml
skills:
  profile: pipeline # full | pipeline | minimal
  include: [] # extra skills on top of the profile, each with its own closure
  exclude: [] # skills to leave out
```

An **absent `skills:` block means `full`** — exactly the pre-profile behaviour, so no existing config
changes meaning.

**Reaching the long tail.** Sprint ceremonies, deployment, Railway, UI design and the meta-skills
(`observe-work`, `double-check`, `review-security`) are in no profile by design. That is a legitimate
state, not an oversight — add what you want with `include`:

```yaml
skills:
  profile: pipeline
  include: [observe-work, review-security]
```

Full key reference: [`../reference/configuration.md`](../reference/configuration.md).

### Update skills only (skip wizard)

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Gamaroff/agent-skills/main/scripts/setup-consumer.sh) --update
```

`--update` short-circuits before the wizard runs, so the profile is read from `skills-config.yaml`
or not at all. If you installed before profiles existed and have no `skills:` block, `--update`
keeps every skill you have — it does not silently prune to a default.

### Pin a specific version

```bash
SKILLS_VERSION=v1.2.0 bash <(curl -fsSL https://raw.githubusercontent.com/Gamaroff/agent-skills/main/scripts/setup-consumer.sh)
```

### After install

1. Fill in `docs/architecture/concepts/*.md` — or run `/document-existing-project` to auto-generate
2. Restart Claude Code in the project directory
3. Run `/create-task` to verify skill loading

### Verify

```bash
ls .agents/skills/ | head               # should list installed skills
cat .claude/settings.json | jq '.hooks' # should show PreCompact / Stop
cat skills-config.yaml                  # should reflect your wizard answers
```

---

## See also

- [`docs/contributing/releases.md`](../contributing/releases.md) — full release reference
- [`docs/contributing/packaging.md`](../contributing/packaging.md) — zip distribution and bundling
- [`docs/concepts/getting-started.md`](../concepts/getting-started.md) — consumer onboarding walkthrough
- [`docs/reference/troubleshooting.md`](../reference/troubleshooting.md) — something not working?

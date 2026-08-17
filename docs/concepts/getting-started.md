# Getting Started

> **Audience:** developers using these skills for the first time in a project.

From "I cloned the repo" to "I ran my first command" in under ten minutes.

## Prerequisites

Before starting, confirm you have:

- **Node ≥ 20** — `node --version`
- **git** — `git --version`
- **jq** — `jq --version` (required by hook installer and Bitbucket scripts — `brew install jq` / `apt install jq`)
- **curl** — `curl --version` (required by Bitbucket scripts — pre-installed on most systems)

### Platform auth

Skills auto-detect your platform via `skills-config.yaml` + env vars + git remote (see [`shared/resources/platform-detection.md`](../../shared/resources/platform-detection.md)). Pick the row that matches your project:

| VCS       | Tracker       | Auth / env required                                                                                      |
| --------- | ------------- | -------------------------------------------------------------------------------------------------------- |
| GitHub    | GitHub Issues | `gh` CLI authenticated (`gh auth status`); `project.yml` at repo root for board integration              |
| GitHub    | Jira          | `gh` CLI authenticated; `JIRA_URL`, `JIRA_USER_EMAIL`, `JIRA_API_TOKEN` exported                         |
| Bitbucket | Jira          | `BITBUCKET_ACCESS_TOKEN` (or `BITBUCKET_USERNAME` + `BITBUCKET_API_TOKEN`), `JIRA_URL`, `JIRA_USER_EMAIL`, `JIRA_API_TOKEN` exported |

### How to pick a row

- **Your VCS is fixed.** Use GitHub or Bitbucket depending on where your repo lives — there's no flexibility here.
- **Your tracker is a choice — pick the one your team already uses.** If your team coordinates on Jira (standups, sprint board, backlog), pick Jira. If issues live alongside the code on GitHub, pick GitHub Issues. The skills push the same artifacts either way; the tracker is just where notifications and board states surface.
- **No tracker at all?** Tracker sync is opt-in — the creation and review skills ask before pushing anything. Choose **Skip — docs only** at the tracker prompt: nothing is sent to a tracker, but your local files and registries are still written. Useful for offline work, dry runs, or solo projects where the tracker would just be noise.
- **GitHub VCS + Jira tracker is a common combo** in orgs that migrated code to GitHub but kept Jira for product management. It's fully supported.

`project.yml` is GitHub-only — it carries GitHub project-board metadata. Bitbucket/Jira users skip it.

Task quickstart still needs VCS auth (PR creation); tracker auth is only needed if you opt to sync — choose **Skip — docs only** at the tracker prompt to stay local. Story quickstart needs all of the above for the platform combo you picked.

### Persisting env vars

Place credentials in `.secrets/tooling.env` at your project root (add `.secrets/` to `.gitignore`) and load with `source .secrets/tooling.env`, or export them from your shell profile (`~/.zshrc` / `~/.bashrc`). A repo-root `.env` is still read as a fallback, so an existing one keeps working — `.secrets/` is preferred because an Nx workspace auto-loads a root `.env` into every task it runs, putting tooling tokens into every application process. Skills read from the shell environment — there is no separate secrets store.

**GitHub** — no env vars needed; auth is handled by the `gh` CLI:

```bash
gh auth login
```

**Jira** (GitHub+Jira or Bitbucket+Jira):

| Variable           | Required      | Description                                                                                                                                |
| ------------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `JIRA_URL`         | ✅            | Jira instance URL, e.g. `https://yourorg.atlassian.net`                                                                                    |
| `JIRA_USER_EMAIL`  | ✅            | Email associated with your Jira account                                                                                                    |
| `JIRA_API_TOKEN`   | ✅            | API token — generate at [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens) |
| `JIRA_PROJECT_KEY` | ✅            | Project key, e.g. `MYPROJ` — shown in Jira next to the project name                                                                        |
| `JIRA_BOARD_ID`    | ⚠️ Scrum only | Board ID for backlog placement; skipped silently on Kanban boards                                                                          |

```bash
export JIRA_URL=https://yourorg.atlassian.net
export JIRA_USER_EMAIL=you@example.com
export JIRA_API_TOKEN=your-api-token
export JIRA_PROJECT_KEY=MYPROJ
export JIRA_BOARD_ID=1          # Scrum boards only
```

**Bitbucket** (Bitbucket+Jira):

| Variable                 | Required | Description                                                                                                                                            |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `BITBUCKET_ACCESS_TOKEN` | Bearer path | A repository, project or workspace access token, sent as `Authorization: Bearer`. **Replaces** the two rows below rather than supplementing them — an access token has no username |
| `BITBUCKET_USERNAME`     | Basic path | Basic Auth username — your Atlassian account email                                                                                                     |
| `BITBUCKET_API_TOKEN`    | Basic path | Atlassian API token **with Bitbucket scopes ticked** — create at [id.atlassian.com](https://id.atlassian.com/manage-profile/security/api-tokens)        |
| `BITBUCKET_APP_PASSWORD` | optional | Legacy **name** for the same value, still read as a fallback. Atlassian removed app passwords themselves on 2026-07-28 — set this to the API token too. |
| `BITBUCKET_REPO_URL`     | optional | Override auto-detected repo base URL (rarely needed)                                                                                                   |

```bash
# Basic — an Atlassian API token plus your account email
export BITBUCKET_USERNAME=you@example.com
export BITBUCKET_API_TOKEN=ATATT...

# …or Bearer — a repository/project/workspace access token, on its own
export BITBUCKET_ACCESS_TOKEN=ATCTT...
```

Set one or the other. `BITBUCKET_ACCESS_TOKEN` wins if both are present.

> **Tick the Bitbucket scopes when you create the token.** A scopeless Atlassian token
> authenticates fine against Jira and fails against Bitbucket — and because Bitbucket hides
> private repos from anonymous callers, that failure arrives as a **404 with an empty result**,
> not a 401. It reads as "no pull requests found" rather than "your credential is wrong".
> Full detail: [Bitbucket credentials](../reference/configuration.md#bitbucket).

**Staying local:**

Tracker sync is **opt-in** — the creation and review skills (`create-story`, `create-task`, `create-epic`, `review-story`, `review-task`, `review-epic`) ask before creating any remote issue. Choose **Skip — docs only** at the prompt to keep everything local; your files and registries are still written. There's nothing to configure ahead of time.

## Quick setup (wizard)

**Recommended for new projects.** An interactive script that walks through the full setup — prerequisites, platform, credentials, config, registries, skills, and hooks — in one session.

**Safe to re-run.** Existing files are detected and you'll be prompted before any overwrite. Existing credential values appear as defaults (secrets show as `[currently set — Enter to keep]`), so you can re-run to update one credential without retyping the rest.

```bash
# From your project root — curl and run directly:
bash <(curl -fsSL https://raw.githubusercontent.com/Gamaroff/agent-skills/main/scripts/setup-consumer.sh)

# Or if you cloned agent-skills locally:
bash /path/to/agent-skills/scripts/setup-consumer.sh

# Preview every action without writing anything:
bash /path/to/agent-skills/scripts/setup-consumer.sh --dry-run

# Update skills to the latest release (skips the full wizard):
bash <(curl -fsSL https://raw.githubusercontent.com/Gamaroff/agent-skills/main/scripts/setup-consumer.sh) --update
```

### What the wizard does

The full wizard runs all 9 steps. The `--update` flag runs only steps 1 and 8 — all others are skipped, so the consumer's config, registries, docs scaffold, and hooks are left untouched.

| Step | Action                                                                                                                             | Skippable?                                           |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| 1    | Checks `node`, `git`, `jq`, `curl` are on PATH — exits if any missing                                                              | No                                                   |
| 2    | Prompts for platform: GitHub+Issues / GitHub+Jira / Bitbucket+Jira                                                                 | No                                                   |
| 3    | Checks `gh` auth (GitHub), collects Bitbucket/Jira credentials with hidden input                                                   | —                                                    |
| 4    | Writes `.env.example` (keys only); optionally writes `.env` + adds to `.gitignore`                                                 | Yes                                                  |
| 5    | Scaffolds `skills-config.yaml` — prompts PRD path, story layout, coding-standards path                                             | Yes (skips if file exists and you decline overwrite) |
| 6    | Creates `docs/development/epic-registry.md` and `docs/tasks/task-registry.md` if absent                                            | Idempotent                                           |
| 7    | Scaffolds `docs/prd/`, `docs/architecture/concepts/` (3 required stubs), `docs/tasks/`                                             | Idempotent                                           |
| 8    | Downloads the latest release from GitHub and extracts skills into `.agents/skills/`                                                | Yes                                                  |
| 9    | Patches `.claude/settings.json` directly with the three pipeline hooks (inline jq — no dependency on skills being installed first) | Yes                                                  |

### Files produced

```
.env.example                          # credential keys, no values
.secrets/tooling.env                  # live credentials (if confirmed)
skills-config.yaml                    # project configuration
docs/development/epic-registry.md                 # empty — populated by /create-epic
docs/tasks/task-registry.md           # empty — populated by /create-task
.agents/skills/                       # installed skills
.claude/settings.json                 # updated with pipeline hooks
```

> The manual steps below cover the same ground — use them if you need finer control or are running in a CI/locked-down environment.

---

## 1. Install the skills

Skills install into your project under `.agents/skills/`. Two contexts:

**You are consuming skills in your own project** (most users):

```bash
# In your target project root — download and install the latest release
curl -fsSL https://github.com/Gamaroff/agent-skills/archive/refs/tags/$(
  curl -fsSL https://api.github.com/repos/Gamaroff/agent-skills/releases/latest \
    | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/'
).tar.gz | tar -xz --strip-components=1 -C /tmp/agent-skills-install \
  --wildcards 'agent-skills-*/skills/*'
mkdir -p .agents/skills
for d in /tmp/agent-skills-install/skills/*/; do
  [ -f "${d}SKILL.md" ] && cp -r "$d" ".agents/skills/$(basename $d)"
done
```

The wizard (`setup-consumer.sh`) handles this automatically — the manual commands above are for scripted or CI installs.

To pin a specific version, replace the `releases/latest` API call with a tag directly:

```bash
SKILLS_VERSION=v1.0.0
curl -fsSL "https://github.com/Gamaroff/agent-skills/archive/refs/tags/${SKILLS_VERSION}.tar.gz" | ...
```

Each skill is self-contained — shared resources are pre-bundled into `references/`, so no separate clone is needed.

**Re-running the install is idempotent** — overwrite the existing `.agents/skills/` directory to update to a newer release.

Restart your agent (e.g. Claude Code) in the project dir after install so it picks up `.agents/skills/`.

### 1b. Install pipeline hooks (one-time per project)

The `develop-task` and `develop-story` pipelines run hands-free when three Claude Code hooks are registered in `.claude/settings.json`. Without the `Stop` hook the orchestrator relies on prose-level rules that fail under context pressure — **strongly recommended**.

```bash
bash .agents/skills/develop-task/scripts/install-hooks.sh
```

This single script covers both pipelines. It is idempotent (safe to re-run), preserves any existing `settings.json` content, and requires `jq`.

| Hook          | Purpose                                                     |
| ------------- | ----------------------------------------------------------- |
| `PreCompact`  | Graceful pause before context compaction                    |
| `Stop`        | Force continuation if pipeline stops mid-run                |

Preview what it would change without writing:

```bash
bash .agents/skills/develop-task/scripts/install-hooks.sh --dry-run
```

### Option B — clone and work in the source repo (skill authors)

If you're authoring or modifying skills, work directly in `skills/<name>/`. You don't need to "install" — the repo's own `skills/` directory is the source of truth. Set up the clone for editing:

```bash
git clone git@github.com:Gamaroff/agent-skills.git && cd agent-skills
npm install                # catalog generator, evals, pre-commit hook
npm run bundle             # propagate shared/resources/ into per-skill references/
npm test                   # hermetic test suite
```

To test your skill changes against a real consumer project without publishing a release, symlink `skills/` into the consumer's `.agents/`:

```bash
# In your consumer project root:
# If .agents/skills/ already exists (e.g. from a previous wizard run), remove it first.
# WARNING: rm -rf below deletes any local edits inside .agents/skills/. If you have
# customised any installed skill files, back them up first.
rm -rf .agents/skills
ln -s /path/to/agent-skills/skills .agents/skills
```

The symlink picks up edits live — no re-install needed during development. To switch back to a normal install, remove the symlink and re-run `setup-consumer.sh --update`.

### Option C — manual zip install (offline / locked-down CI)

If you can't download from GitHub at install time, package skills manually and copy the zip:

```bash
# In this repo:
python3 skills/create-skill/scripts/package_skill.py skills/develop-story

# In your target project:
mkdir -p .agents/skills
cp /path/to/agent-skills/skills/develop-story/develop-story.zip .agents/skills/
unzip .agents/skills/develop-story.zip -d .agents/skills/
```

Repeat for each skill you want. The packager auto-bundles shared resources, so each zip is self-contained.

## 2. Create `skills-config.yaml`

At your project root, place a minimal config. For a typical story-driven project:

```yaml
prd:
  prdShardedLocation: docs/prd

architecture:
  architectureShardedLocation: docs/architecture

devLoadAlwaysFiles:
  - docs/architecture/concepts/coding-standards.md
```

PRD and architecture roots are configurable (defaults shown). The _nested_ layout under each root (epics, stories, QA artifacts) is fixed — see [Configurable roots and fixed conventions](../reference/configuration.md#configurable-roots-and-fixed-conventions). Full schema: [`../reference/configuration.md`](../reference/configuration.md).

## 3. Create the registries

Stories and tasks need globally unique numbers. If you are working in a **new project** (not a clone of `agent-skills`), create empty registries:

```bash
mkdir -p docs/tasks
touch docs/development/epic-registry.md
touch docs/tasks/task-registry.md
```

The first `/create-epic` and `/create-task` invocations will populate them. See [epic registry](../standards/epic-registry.md) and [task registry](../standards/task-registry.md).

> If you cloned `agent-skills` to run a quickstart, these registries already exist — skip this step.

## 4. Decide your workflow

Not sure what to run? See [which-path.md](./which-path.md) — a three-question decision tree.

| Goal                                    | Read this                                                             |
| --------------------------------------- | --------------------------------------------------------------------- |
| Greenfield project — no codebase yet    | [New Project Setup](../runbooks/new-project-setup.md)                 |
| Existing codebase, no architecture docs | [Document Existing Project](../runbooks/document-existing-project.md) |
| First user-facing feature               | [Story Development](../runbooks/story-development.md)                 |
| First refactor / infra task             | [Task Development](../runbooks/task-development.md)                   |
| Just learning what skills are           | [Overview](./overview.md)                                             |

**Story work introduces one extra concept:** `/develop-story` asks in Phase 0 which branch the story is cut from and which branch its PR targets. The default for both is `develop` — short-lived feature branches, integrated continuously. An epic whose stories are meaningless apart can instead opt into an _integration branch_ (`epic/{N}.{slug}`) that all its stories merge into and that reaches `develop` once, at the end. Both options appear in the prompt every time; see [Story documents § Branch strategy](../standards/story-documents.md#branch-strategy).

## 5. Run your first command

In your project, ask an agent (Claude Code, Claude Agent SDK, Copilot, etc.) to invoke a skill. Three styles:

```
"Create the next story for epic 2"            # natural language
"Use the create-story skill"                  # explicit reference
/create-story                                  # slash command
```

Full invocation styles: [`../reference/invocation.md`](../reference/invocation.md).

## 6. Verify your setup

A real end-to-end smoke test — runs the full task pipeline (spec → branch → implement → PR → QA → gate → DoD):

```bash
/develop-task docs/tasks/task.{N}.your-task-name/task.{N}.your-task-name.md
```

If all seven artifacts appear under `docs/tasks/task.{N}.your-task-name/` and the gate file shows `PASS`, the install is working.

For a minimal spec-only check (confirms skill loads but not the full chain):

```bash
/create-task        # produces task.{N}.{name}/ under docs/tasks/ with status: draft
```

If the file appears at the right path with `status: draft`, skill loading is working. If not, check [`../reference/troubleshooting.md`](../reference/troubleshooting.md).

Artifacts produced by each pipeline and their expected `status` values follow the lifecycle: `draft → planned → ready-for-development → in-progress → ready-for-review → accepted`. See [`../standards/status-lifecycle.md`](../standards/status-lifecycle.md).

### Working on the agent-skills repo itself?

If you cloned `agent-skills` to author or modify skills (not just consume them), validate the dev environment by running the hermetic eval suite:

```bash
npm install
npm test            # L1 unit + L2 fixture + L3 protocol + L4 replay — no creds required
```

Green means your environment, packager, and bundler are all working. This is also the gate CI enforces on every push. See [`../contributing/evals/README.md`](../contributing/evals/README.md) for the full eval workflow (layers, drivers, when to run each).

## Next steps

You've installed agent-skills. Pick your first action:

- **Internal work (refactor, infra, cleanup)** → follow [`quickstart-task.md`](./quickstart-task.md) — ships a real task in 10 minutes.
- **User-facing work (feature, bug, UX)** → follow [`quickstart-story.md`](./quickstart-story.md) — ships a real story in 60 minutes.
- **Not sure which** → see [`which-path.md`](./which-path.md) — the decision tree.

### More depth

For reference material once you've shipped your first artifact: [runbooks](../runbooks/README.md), [standards](../standards/), [reference](../reference/).

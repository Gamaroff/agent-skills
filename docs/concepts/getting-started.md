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

| VCS | Tracker | Auth / env required |
|---|---|---|
| GitHub | GitHub Issues | `gh` CLI authenticated (`gh auth status`); `project.yml` at repo root for board integration |
| GitHub | Jira | `gh` CLI authenticated; `JIRA_URL`, `JIRA_USER_EMAIL`, `JIRA_API_TOKEN` exported |
| Bitbucket | Jira | `BITBUCKET_USERNAME`, `BITBUCKET_APP_PASSWORD`, `JIRA_URL`, `JIRA_USER_EMAIL`, `JIRA_API_TOKEN` exported |

`project.yml` is GitHub-only — it carries GitHub project-board metadata. Bitbucket/Jira users skip it.

Task quickstart still needs VCS auth (PR creation) but can skip tracker auth via `SKIP_TRACKER=1`. Story quickstart needs all of the above for the platform combo you picked.

### Persisting env vars

Place credentials in a `.env` file at your project root (add `.env` to `.gitignore`) and load with `source .env`, or export them from your shell profile (`~/.zshrc` / `~/.bashrc`). Skills read from the shell environment — there is no separate secrets store.

**GitHub** — no env vars needed; auth is handled by the `gh` CLI:

```bash
gh auth login
```

**Jira** (GitHub+Jira or Bitbucket+Jira):

| Variable | Required | Description |
|---|---|---|
| `JIRA_URL` | ✅ | Jira instance URL, e.g. `https://yourorg.atlassian.net` |
| `JIRA_USER_EMAIL` | ✅ | Email associated with your Jira account |
| `JIRA_API_TOKEN` | ✅ | API token — generate at [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens) |
| `JIRA_PROJECT_KEY` | ✅ | Project key, e.g. `MYPROJ` — shown in Jira next to the project name |
| `JIRA_BOARD_ID` | ⚠️ Scrum only | Board ID for backlog placement; skipped silently on Kanban boards |

```bash
export JIRA_URL=https://yourorg.atlassian.net
export JIRA_USER_EMAIL=you@example.com
export JIRA_API_TOKEN=your-api-token
export JIRA_PROJECT_KEY=MYPROJ
export JIRA_BOARD_ID=1          # Scrum boards only
```

**Bitbucket** (Bitbucket+Jira):

| Variable | Required | Description |
|---|---|---|
| `BITBUCKET_USERNAME` | ✅ | Your Bitbucket username |
| `BITBUCKET_APP_PASSWORD` | ✅ | App password — generate at Bitbucket → Settings → App passwords |
| `BITBUCKET_REPO_URL` | optional | Override auto-detected repo base URL (rarely needed) |

```bash
export BITBUCKET_USERNAME=your-username
export BITBUCKET_APP_PASSWORD=your-app-password
```

**Escape hatch:**

| Variable | Effect |
|---|---|
| `SKIP_TRACKER=1` | Skip all remote tracker calls (GitHub Issues / Jira). Local files and registries still written. Useful offline or for planning-only runs. |

## 1. Install the skills

Skills install into your project under `.agents/skills/`. Two contexts:

**You are consuming skills in your own project** (most users):

```bash
# In your target project root — installs all skills
npx skills add --all

# Install one specific skill
npx skills add --skill develop-story

# Preview available skills without installing
npx skills add --list
```

`--all` installs every skill into every detected agent directory and skips prompts. Each skill is self-contained — shared resources are pre-bundled into `references/`, so no separate clone is needed.

**Re-running the same command updates skills** — installs are idempotent and overwrite the existing skill directory with the latest version.

Restart your agent (e.g. Claude Code) in the project dir after install so it picks up `.agents/skills/`.

### 1b. Install pipeline hooks (one-time per project)

The `develop-task` and `develop-story` pipelines run hands-free when three Claude Code hooks are registered in `.claude/settings.json`. Without the `Stop` hook the orchestrator relies on prose-level rules that fail under context pressure — **strongly recommended**.

```bash
bash .agents/skills/develop-task/scripts/install-hooks.sh
```

This single script covers both pipelines. It is idempotent (safe to re-run), preserves any existing `settings.json` content, and requires `jq`.

| Hook | Purpose |
|------|---------|
| `PreCompact` | Graceful pause before context compaction |
| `Stop` | Force continuation if pipeline stops mid-run |
| `PostToolUse` | Auto-advance lock + inject next-step banner on Skill return |

Preview what it would change without writing:

```bash
bash .agents/skills/develop-task/scripts/install-hooks.sh --dry-run
```

### Option B — clone and work in the source repo (skill authors)

If you're authoring or modifying skills in this repo, work directly in `skills/`. The quickstarts also run against this clone:

```bash
git clone git@github.com:Gamaroff/agent-skills.git && cd agent-skills
npm install            # node deps for catalog generator
npx skills add --all   # installs skills into .agents/skills/ inside this clone
```

### Option C — manual zip install (offline / locked-down CI)

If you can't use `npx skills add`, package skills manually and copy the zip:

```bash
# In this repo:
python3 skills/create-skill/scripts/package_skill.py skills/develop-story

# In your target project:
mkdir -p .agents/skills
cp /path/to/agent-skills/skills/develop-story/develop-story.zip .agents/skills/
unzip .agents/skills/develop-story.zip -d .agents/skills/develop-story/
```

Repeat for each skill you want. The packager auto-bundles shared resources, so each zip is self-contained.

## 2. Create `skills-config.yaml`

At your project root, place a minimal config. For a typical story-driven project:

```yaml
prd:
  prdSharded: true
  prdShardedLocation: docs/prd
  epicFilePattern: "*/epics/epic.{n}.*.md"

devStoryLocation: nested   # stories live inside their epic directory

devLoadAlwaysFiles:
  - docs/architecture/concepts/coding-standards.md
```

QA artifacts (review reports, gate files, DoD) are co-located with the story/task — no configuration needed. Full schema and key reference: [`../reference/configuration.md`](../reference/configuration.md).

## 3. Create the registries

Stories and tasks need globally unique numbers. If you are working in a **new project** (not a clone of `agent-skills`), create empty registries:

```bash
mkdir -p docs/tasks
touch docs/epic-registry.md
touch docs/tasks/task-registry.md
```

The first `/create-epic` and `/create-task` invocations will populate them. See [epic registry](../standards/epic-registry.md) and [task registry](../standards/task-registry.md).

> If you cloned `agent-skills` to run a quickstart, these registries already exist — skip this step.

## 4. Decide your workflow

Not sure what to run? See [which-path.md](./which-path.md) — a three-question decision tree.

| Goal | Read this |
|---|---|
| Greenfield project — no codebase yet | [New Project Setup](../runbooks/new-project-setup.md) |
| Existing codebase, no architecture docs | [Document Existing Project](../runbooks/document-existing-project.md) |
| First user-facing feature | [Story Development](../runbooks/story-development.md) |
| First refactor / infra task | [Task Development](../runbooks/task-development.md) |
| Just learning what skills are | [Overview](./overview.md) |

**Story work introduces one extra concept:** story branches always target a parent *epic branch* (e.g. `feature/epic.{N}.name`), not `develop` directly. The epic branch is created from `develop` once per epic; story PRs merge into it. `/develop-story` will prompt you for this in Phase 0.

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

# Getting Started

> **Audience:** developers using these skills for the first time in a project.

From "I cloned the repo" to "I ran my first command" in under ten minutes.

## 1. Install the skills

The skills in this library are designed to be installed into target projects under `.agents/skills/`. Three paths:

### Option A — `npx skills add` (recommended for consumers)

In your target project root:

```bash
# Install one skill
npx skills add https://github.com/Gamaroff/agent-skills --skill develop-story

# Install every skill in the repo
npx skills add https://github.com/Gamaroff/agent-skills --all

# Preview available skills without installing
npx skills add https://github.com/Gamaroff/agent-skills --list
```

`--all` is shorthand for `--skill '*' --agent '*' -y` (install all skills into every detected agent directory, skip prompts). Each skill is self-contained — shared resources are pre-bundled into `references/`, so no clone is needed.

**Re-running the same command updates skills** — installs are idempotent and overwrite the existing skill directory with the latest version from the source.

Restart your agent (e.g. Claude Code) in the project dir after install so it picks up `.agents/skills/`.

### Option B — copy the source skills (developing skills)

If you're authoring or modifying skills in this repo, work directly in `skills/`:

```bash
git clone https://github.com/Gamaroff/agent-skills.git
cd agent-skills
npm install            # node deps for catalog generator
```

### Option C — install packaged skills into your project (manual)

If you can't use `npx skills add` (offline, locked-down CI, etc.), package skills manually and copy the zip:

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

Stories and tasks need globally unique numbers. Create the empty registries in your project:

```bash
mkdir -p docs/tasks
touch docs/epic-registry.md
touch docs/tasks/task-registry.md
```

The first `/create-epic` and `/create-task` invocations will populate them. See [epic registry](../standards/epic-registry.md) and [task registry](../standards/task-registry.md).

## 4. Decide your workflow

Pick a path based on what you're shipping:

| Goal | Read this |
|---|---|
| Greenfield project — no codebase yet | [New Project Setup](../runbooks/new-project-setup.md) |
| Existing codebase, no architecture docs | [Document Existing Project](../runbooks/document-existing-project.md) |
| First user-facing feature | [Story Development](../runbooks/story-development.md) |
| First refactor / infra task | [Task Development](../runbooks/task-development.md) |
| Just learning what skills are | [Overview](./overview.md) |

## 5. Run your first command

In your project, ask an agent (Claude Code, Claude Agent SDK, Copilot, etc.) to invoke a skill. Three styles:

```
"Create the next story for epic 2"            # natural language
"Use the create-story skill"                  # explicit reference
/create-story                                  # slash command
```

Full invocation styles: [`../reference/invocation.md`](../reference/invocation.md).

## 6. Verify your setup

The simplest end-to-end smoke test:

```bash
# In your project:
/create-task        # produces task.{N}.{name}/ under docs/tasks/
```

If the file appears at the right path with a status of `draft`, the install is working. If not, check [`../reference/troubleshooting.md`](../reference/troubleshooting.md).

### Working on the agent-skills repo itself?

If you cloned `agent-skills` to author or modify skills (not just consume them), validate the dev environment by running the hermetic eval suite:

```bash
npm install
npm test            # L1 unit + L2 fixture + L3 protocol + L4 replay — no creds required
```

Green means your environment, packager, and bundler are all working. This is also the gate CI enforces on every push. See [`../contributing/evals/README.md`](../contributing/evals/README.md) for the full eval workflow (layers, drivers, when to run each).

## What's next

- New to the library? Read [overview](./overview.md) and [architecture](./architecture.md).
- Want to see real worked examples? See [`examples/README.md`](../../examples/README.md) — actual task artifacts produced by this repo running its own pipeline on itself.
- New to a specific skill? Look it up in [`../reference/skill-catalog.md`](../reference/skill-catalog.md).
- Building your own skill? Start at [`../contributing/authoring-skills.md`](../contributing/authoring-skills.md).
- Want to run multiple stories in parallel? See [parallel stories](../runbooks/parallel-stories.md).

## See also

- [Overview](./overview.md)
- [Architecture](./architecture.md)
- [Glossary](../reference/glossary.md) — terms used across the docs
- [Configuration](../reference/configuration.md) — full `skills-config.yaml` reference
- [Runbooks](../runbooks/README.md) — walkthroughs by goal

# Agent Skills

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Validate Skills](https://github.com/Gamaroff/agent-skills/actions/workflows/validate.yml/badge.svg)](https://github.com/Gamaroff/agent-skills/actions/workflows/validate.yml)
[![Skills](https://img.shields.io/badge/skills-124-brightgreen)](#skill-categories)

A library of **AI coding agent skills** — modular, self-contained packages that extend agent capabilities with specialized workflows, domain knowledge, and tooling. 124+ skills covering development, story management, QA, PM, architecture, validation, and more.

Skills live in `.agents/skills/` inside any project. Compatible agents (Claude Code and others) pick them up automatically at startup — no config needed. Skills activate by context match or explicit invocation.

**Example.** Type `/create-story` in an agent session → the `create-story` skill activates → the agent walks you through 10 questions → a fully-formed `story.{N}.{name}.md` lands in your repo with frontmatter, acceptance criteria, technical context, and links to its parent epic. Type `/develop-story <path>` next and the agent runs the full review → branch → implement → PR → QA loop.

See [docs/concepts/overview.md](./docs/concepts/overview.md) for the model, or jump straight into the Learning Path below.

---

## New here? Start with the Learning Path

If this is your first time with agent-skills, work through these in order. Each builds on the last.

1. **[Overview](./docs/concepts/overview.md)** (5 min) — what a skill *is* and how progressive disclosure works.
2. **[Decision tree](./docs/concepts/which-path.md)** (2 min) — pick the path that fits the work in front of you.
3. **[Task quickstart](./docs/concepts/quickstart-task.md)** (10 min hands-on) — ship your first standalone task.
4. **[First-Week Onboarding](./docs/runbooks/first-week.md)** (4 days, paced) — structured walkthrough of the task pipeline, story pipeline, QA recovery, and parallel development.
5. **[Story quickstart](./docs/concepts/quickstart-story.md)** (60 min) — full PRD → epic → story → PR chain.
6. **[Runbooks](./docs/runbooks/README.md)** & **[Reference](./docs/reference/README.md)** — go deep on specific workflows or look up specific behaviour.

---

## Contents

- [Installing Skills](#installing-skills)
- [Skill Catalog](#skill-catalog)
- [Scripts](#scripts)
- [Creating Skills](#creating-skills)
- [Documentation](#documentation)
- [Contributing](#contributing)

---

## Installing Skills

**With `npx skills` (recommended):**

Install a single skill:
```bash
npx skills add https://github.com/Gamaroff/agent-skills --skill <skill-name>
```

Install every skill in the repo:
```bash
npx skills add https://github.com/Gamaroff/agent-skills --all
```
`--all` is shorthand for `--skill '*' --agent '*' -y` — installs all skills into every detected agent directory and skips confirmation prompts. Preview without installing with `--list`.

**Re-running the same command updates skills** — installs are idempotent and overwrite the existing skill directory with the latest version.

Each skill is self-contained in-tree (shared resources pre-bundled into `references/`), so installs work without cloning the rest of the repo.

**Single skill, manual:**
```bash
mkdir -p .agents/skills
cp -r path/to/agent-skills/skills/<skill-name> .agents/skills/
```

**All skills (clone + symlink):**
```bash
git clone https://github.com/Gamaroff/agent-skills.git
ln -s "$(pwd)/agent-skills/skills" .agents/skills
```

**From a packaged zip:**
```bash
unzip <skill-name>.zip -d .agents/skills/
```

Skills activate automatically when compatible agents start — no further configuration needed.

---

## Skill Catalog

Full categorised index with descriptions (auto-generated): [`docs/reference/skill-catalog.md`](./docs/reference/skill-catalog.md).

Featured starting points:

- **Development orchestrators:** [`develop-story`](./skills/develop-story/SKILL.md), [`develop-task`](./skills/develop-task/SKILL.md)
- **Authoring:** [`create-story`](./skills/create-story/SKILL.md), [`create-task`](./skills/create-task/SKILL.md), [`create-epic`](./skills/create-epic/SKILL.md), [`create-prd`](./skills/create-prd/SKILL.md)
- **Review:** [`review-story`](./skills/review-story/SKILL.md), [`review-task`](./skills/review-task/SKILL.md), [`review-epic`](./skills/review-epic/SKILL.md), [`review-prd`](./skills/review-prd/SKILL.md)
- **QA:** [`qa-story`](./skills/qa-story/SKILL.md), [`qa-task`](./skills/qa-task/SKILL.md), [`qa-fix`](./skills/qa-fix/SKILL.md)
- **Git/PR:** [`create-branch`](./skills/create-branch/SKILL.md), [`commit-changes`](./skills/commit-changes/SKILL.md), [`create-pr`](./skills/create-pr/SKILL.md)
- **Meta:** [`create-skill`](./skills/create-skill/SKILL.md), [`find-skills`](./skills/find-skills/SKILL.md), [`document-existing-project`](./skills/document-existing-project/SKILL.md)

---

## Scripts

```bash
# Validate a skill
python3 skills/create-skill/scripts/quick_validate.py skills/<skill-name>

# Regenerate docs/reference/skill-catalog.md (run after adding or editing skills)
npm run generate-catalog

# Package a single skill into a distributable zip
npm run package:skill -- skills/<skill-name>
# or directly:
python3 skills/create-skill/scripts/package_skill.py skills/<skill-name>

# Package all skills
npm run package

# Bundle shared resources into each skill's references/ (in-tree, committed)
npm run bundle
# or a single skill
npm run bundle:skill -- skills/<skill-name>
```

Packaged `.zip` files are build artifacts (gitignored). Regenerate them any time with `package_skill.py`. The packager auto-bundles shared resources and rewrites paths so installed skills are fully self-contained.

`npm run bundle` does the same rewrite **in-tree**: it copies referenced `shared/resources/*` into each skill's `references/` directory and rewrites `shared/resources/X` → `references/X` in source files. Commit the result. This is what makes `npx skills add` installs work without the rest of the repo. The script is idempotent; run it before committing whenever you add or change a `shared/resources/` reference.

---

## Creating Skills

```bash
python3 skills/create-skill/scripts/init_skill.py <skill-name> --path skills/
```

See [`docs/contributing/authoring-skills.md`](./docs/contributing/authoring-skills.md) for the full authoring guide.

---

## Documentation

Full documentation under [`docs/`](./docs/README.md):

| Doc | What's in it |
|-----|-------------|
| [Overview](./docs/concepts/overview.md) | What skills are, progressive disclosure, key principles |
| [Runbooks](./docs/runbooks/README.md) | Step-by-step walkthroughs — [story development](./docs/runbooks/story-development.md), [task development](./docs/runbooks/task-development.md) |
| [Invocation](./docs/reference/invocation.md) | Natural language, explicit invocation, slash commands |
| [Configuration](./docs/reference/configuration.md) | `skills-config.yaml` keys, placeholders |
| [Skill Catalog](./docs/reference/skill-catalog.md) | Categorized index of all skills |
| [Standards](./docs/standards/) | File naming, status lifecycle, document schemas (PRD / epic / story / task) |
| [Workflows](./docs/operations/workflows.md) | Pipeline, sprint cycle, hotfix, parallel dev, change management |
| [Authoring skills](./docs/contributing/authoring-skills.md) | Authoring guide, file structure, best practices |
| [Packaging](./docs/contributing/packaging.md) | Distribution, validation, shared resources |
| [Evals](./docs/contributing/evals/README.md) | Four-layer test suite, drivers, live tracker scenarios |

---

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md). Short version:

1. Scaffold: `python3 skills/create-skill/scripts/init_skill.py <name> --path skills/`
2. Write a sharp `description` in frontmatter (this is what activates the skill)
3. Validate: `python3 skills/create-skill/scripts/quick_validate.py skills/<name>`
4. Update [`docs/reference/skill-catalog.md`](./docs/reference/skill-catalog.md)
5. Open a PR — one skill per PR

No hardcoded project names, server addresses, or credentials.

---

## License

[MIT](./LICENSE)

---

## External Resources

- [Claude Code Documentation](https://docs.claude.com/en/docs/claude-code) — reference implementation
- [Skills Overview](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview)

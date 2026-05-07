# Agent Skills

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Validate Skills](https://github.com/Gamaroff/agent-skills/actions/workflows/validate.yml/badge.svg)](https://github.com/Gamaroff/agent-skills/actions/workflows/validate.yml)
[![Skills](https://img.shields.io/badge/skills-124-brightgreen)](#skill-categories)

A library of **AI coding agent skills** — modular, self-contained packages that extend agent capabilities with specialized workflows, domain knowledge, and tooling. 124+ skills covering development, story management, QA, PM, architecture, validation, and more.

Skills live in `.agents/skills/` inside any project. Compatible agents (Claude Code and others) pick them up automatically at startup — no config needed. Skills activate by context match or explicit invocation.

---

## Contents

- [How It Works](#how-it-works)
- [Installing Skills](#installing-skills)
- [Skill Categories](#skill-categories)
- [Scripts](#scripts)
- [Creating Skills](#creating-skills)
- [Documentation](#documentation)
- [Contributing](#contributing)

---

## How It Works

Skills load in three tiers — only what's needed enters the context window:

| Tier | What loads | When |
|------|-----------|------|
| **Metadata** | Skill name + description (~100 words) | Always — used for auto-activation matching |
| **SKILL.md body** | Full instructions + patterns | When the skill triggers |
| **References** | Domain guides, templates, examples | On demand during execution |

Each skill is a directory:

```
skills/my-skill/
├── SKILL.md          # YAML frontmatter + instructions
├── scripts/          # Deterministic helper scripts
├── references/       # Docs loaded into context as needed
└── assets/           # Templates and boilerplate
```

The `description` field in `SKILL.md` frontmatter is what the agent reads to decide whether to activate the skill. Keep it precise.

---

## Installing Skills

**Single skill:**
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

## Skill Categories

### Development workflow
`develop` · `develop-story` · `develop-task` · `qa-planning` · `qa-story` · `qa-task` · `qa-fix` · `qa-gate` · `finalise` · `correct-course` · `validate-story`

### Git & version control
`commit-changes` · `create-branch` · `create-pr` · `git-time-travel` · `create-issue`

### Story & epic lifecycle
`create-story` · `review-story` · `edit-story` · `create-epic` · `review-epic` · `edit-epic` · `parallel-stories` · `scrum-master` · `po`

### Product management
`greenfield-prd` · `create-prd` · `shard-prd` · `review-prd` · `pm-coordinator` · `pm-checklist` · `change-management` · `audit` · `epic-registry-manager`

### Architecture
`architect` · `create-architecture-doc` · `execute-architect-checklist` · `mermaid-architect` · `shard-doc`

### Enforcement & validation
`api-endpoint-validator` · `code-smell-validator` · `documentation-standards-validator` · `navigation-pattern-validator` · `offline-first-enforcer` · `platform-separation-validator` · `response-envelope-enforcer` · `test-co-location-enforcer` · `error-handling-enforcer` · `enforce-standards`

### Frontend & UI
`create-frontend-spec` · `frontend-design` · `generate-ui-prompt` · `ux-expert` · `building-components` · `delight` · `performance-optimizer`

### Infrastructure & services
`docker` · `deploy-remote` · `use-railway` · `railway-postgres-crud` · `server-admin`

### Framework-specific
`nestjs-patterns` · `nestjs-debug` · `react-native-debug` · `testing-setup-nestjs` · `testing-setup-react-native` · `testing-setup-shared` · `upgrading-expo` · `react-email` · `resend`

### Research & analysis
`analyst` · `research-prompt` · `create-research-prompt` · `deep-research-prompt` · `brainstorming` · `shannon`

### Writing & content
`distill` · `normalize` · `polish` · `critique` · `extract` · `bolder` · `quieter` · `typeset` · `arrange` · `simplify`

### Meta / skill authoring
`create-skill` · `find-skills` · `autoskill` · `onboard` · `document-project` · `remember-insight` · `pro-tip`

Full catalog with descriptions: [`docs/skill-catalog.md`](./docs/skill-catalog.md)

---

## Scripts

```bash
# Validate a skill
python3 skills/create-skill/scripts/quick_validate.py skills/<skill-name>

# Regenerate docs/skill-catalog.md (run after adding or editing skills)
npm run generate-catalog

# Package a single skill into a distributable zip
npm run package:skill -- skills/<skill-name>
# or directly:
python3 skills/create-skill/scripts/package_skill.py skills/<skill-name>

# Package all skills
npm run package
```

Packaged `.zip` files are build artifacts (gitignored). Regenerate them any time with `package_skill.py`. The packager auto-bundles shared resources and rewrites paths so installed skills are fully self-contained.

---

## Creating Skills

Scaffold a new skill:

```bash
python3 skills/create-skill/scripts/init_skill.py <skill-name> --path skills/
```

This generates the directory structure with a starter `SKILL.md`. Fill in the `description` frontmatter field — that's the activation trigger the agent reads.

See [`docs/creating-skills.md`](./docs/creating-skills.md) for the full authoring guide, file structure, and best practices.

---

## Documentation

Full documentation under [`docs/`](./docs/README.md):

| Doc | What's in it |
|-----|-------------|
| [Overview](./docs/overview.md) | What skills are, progressive disclosure, key principles |
| [Usage](./docs/usage.md) | Natural language, explicit invocation, slash commands |
| [Skill Catalog](./docs/skill-catalog.md) | Categorized index of all skills |
| [Workflows](./docs/workflows.md) | Pipeline, sprint cycle, hotfix, parallel dev, change management |
| [Conventions](./docs/conventions.md) | File naming, configuration, status lifecycle |
| [Packaging](./docs/packaging.md) | Distribution, validation, shared resources |
| [Creating Skills](./docs/creating-skills.md) | Authoring guide, file structure, best practices |

---

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md). Short version:

1. Scaffold: `python3 skills/create-skill/scripts/init_skill.py <name> --path skills/`
2. Write a sharp `description` in frontmatter (this is what activates the skill)
3. Validate: `python3 skills/create-skill/scripts/quick_validate.py skills/<name>`
4. Update [`docs/skill-catalog.md`](./docs/skill-catalog.md)
5. Open a PR — one skill per PR

No hardcoded project names, server addresses, or credentials.

---

## License

[MIT](./LICENSE)

---

## External Resources

- [Claude Code Documentation](https://docs.claude.com/en/docs/claude-code) — reference implementation
- [Skills Overview](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview)

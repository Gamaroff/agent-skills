# Agent Skills

[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Validate Skills](https://github.com/Gamaroff/agent-skills/actions/workflows/validate.yml/badge.svg)](https://github.com/Gamaroff/agent-skills/actions/workflows/validate.yml)
[![Skills](https://img.shields.io/badge/skills-124-brightgreen)](#skill-categories)

A library of **AI coding agent skills** — modular, self-contained packages that extend agent capabilities with specialized workflows, domain knowledge, and tooling. 124+ skills covering development, story management, QA, PM, architecture, validation, and more.

Skills live in `.agents/skills/` inside any project. Compatible agents (Claude Code and others) pick them up automatically at startup — no config needed. Skills activate by context match or explicit invocation.

See [docs/overview.md](./docs/overview.md) for how skills work.

---

## Contents

- [Installing Skills](#installing-skills)
- [Skill Categories](#skill-categories)
- [Scripts](#scripts)
- [Creating Skills](#creating-skills)
- [Documentation](#documentation)
- [Contributing](#contributing)

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
[`develop`](./skills/develop/SKILL.md) · [`develop-story`](./skills/develop-story/SKILL.md) · [`develop-task`](./skills/develop-task/SKILL.md) · [`qa-planning`](./skills/qa-planning/SKILL.md) · [`qa-story`](./skills/qa-story/SKILL.md) · [`qa-task`](./skills/qa-task/SKILL.md) · [`qa-fix`](./skills/qa-fix/SKILL.md) · [`qa-gate`](./skills/qa-gate/SKILL.md) · [`finalise`](./skills/finalise/SKILL.md) · [`correct-course`](./skills/correct-course/SKILL.md) · [`validate-story`](./skills/validate-story/SKILL.md)

### Git & version control
[`commit-changes`](./skills/commit-changes/SKILL.md) · [`create-branch`](./skills/create-branch/SKILL.md) · [`create-pr`](./skills/create-pr/SKILL.md) · [`git-time-travel`](./skills/git-time-travel/SKILL.md) · [`create-issue`](./skills/create-issue/SKILL.md)

### Story & epic lifecycle
[`create-story`](./skills/create-story/SKILL.md) · [`review-story`](./skills/review-story/SKILL.md) · [`edit-story`](./skills/edit-story/SKILL.md) · [`create-epic`](./skills/create-epic/SKILL.md) · [`review-epic`](./skills/review-epic/SKILL.md) · [`edit-epic`](./skills/edit-epic/SKILL.md) · [`parallel-stories`](./skills/parallel-stories/SKILL.md) · [`scrum-master`](./skills/scrum-master/SKILL.md) · [`po`](./skills/po/SKILL.md)

### Product management
[`greenfield-prd`](./skills/greenfield-prd/SKILL.md) · [`create-prd`](./skills/create-prd/SKILL.md) · [`shard-prd`](./skills/shard-prd/SKILL.md) · [`review-prd`](./skills/review-prd/SKILL.md) · [`pm-coordinator`](./skills/pm-coordinator/SKILL.md) · [`pm-checklist`](./skills/pm-checklist/SKILL.md) · [`change-management`](./skills/change-management/SKILL.md) · [`audit`](./skills/audit/SKILL.md) · [`epic-registry-manager`](./skills/epic-registry-manager/SKILL.md)

### Architecture
[`architect`](./skills/architect/SKILL.md) · [`create-architecture-doc`](./skills/create-architecture-doc/SKILL.md) · [`execute-architect-checklist`](./skills/execute-architect-checklist/SKILL.md) · [`mermaid-architect`](./skills/mermaid-architect/SKILL.md) · [`shard-doc`](./skills/shard-doc/SKILL.md)

### Enforcement & validation
[`api-endpoint-validator`](./skills/api-endpoint-validator/SKILL.md) · [`code-smell-validator`](./skills/code-smell-validator/SKILL.md) · [`documentation-standards-validator`](./skills/documentation-standards-validator/SKILL.md) · [`navigation-pattern-validator`](./skills/navigation-pattern-validator/SKILL.md) · [`offline-first-enforcer`](./skills/offline-first-enforcer/SKILL.md) · [`platform-separation-validator`](./skills/platform-separation-validator/SKILL.md) · [`response-envelope-enforcer`](./skills/response-envelope-enforcer/SKILL.md) · [`test-co-location-enforcer`](./skills/test-co-location-enforcer/SKILL.md) · [`error-handling-enforcer`](./skills/error-handling-enforcer/SKILL.md) · [`enforce-standards`](./skills/enforce-standards/SKILL.md)

### Frontend & UI
[`create-frontend-spec`](./skills/create-frontend-spec/SKILL.md) · [`frontend-design`](./skills/frontend-design/SKILL.md) · [`generate-ui-prompt`](./skills/generate-ui-prompt/SKILL.md) · [`ux-expert`](./skills/ux-expert/SKILL.md) · [`building-components`](./skills/building-components/SKILL.md) · [`delight`](./skills/delight/SKILL.md) · [`performance-optimizer`](./skills/performance-optimizer/SKILL.md)

### Infrastructure & services
[`docker`](./skills/docker/SKILL.md) · [`deploy-remote`](./skills/deploy-remote/SKILL.md) · [`use-railway`](./skills/use-railway/SKILL.md) · [`railway-postgres-crud`](./skills/railway-postgres-crud/SKILL.md) · [`server-admin`](./skills/server-admin/SKILL.md)

### Framework-specific
[`nestjs-patterns`](./skills/nestjs-patterns/SKILL.md) · [`nestjs-debug`](./skills/nestjs-debug/SKILL.md) · [`react-native-debug`](./skills/react-native-debug/SKILL.md) · [`testing-setup-nestjs`](./skills/testing-setup-nestjs/SKILL.md) · [`testing-setup-react-native`](./skills/testing-setup-react-native/SKILL.md) · [`testing-setup-shared`](./skills/testing-setup-shared/SKILL.md) · [`upgrading-expo`](./skills/upgrading-expo/SKILL.md) · [`react-email`](./skills/react-email/SKILL.md) · [`resend`](./skills/resend/SKILL.md)

### Research & analysis
[`analyst`](./skills/analyst/SKILL.md) · [`research-prompt`](./skills/research-prompt/SKILL.md) · [`create-research-prompt`](./skills/create-research-prompt/SKILL.md) · [`deep-research-prompt`](./skills/deep-research-prompt/SKILL.md) · [`brainstorming`](./skills/brainstorming/SKILL.md) · [`shannon`](./skills/shannon/SKILL.md)

### Writing & content
[`distill`](./skills/distill/SKILL.md) · [`normalize`](./skills/normalize/SKILL.md) · [`polish`](./skills/polish/SKILL.md) · [`critique`](./skills/critique/SKILL.md) · [`extract`](./skills/extract/SKILL.md) · [`bolder`](./skills/bolder/SKILL.md) · [`quieter`](./skills/quieter/SKILL.md) · [`typeset`](./skills/typeset/SKILL.md) · [`arrange`](./skills/arrange/SKILL.md)

### Meta / skill authoring
[`create-skill`](./skills/create-skill/SKILL.md) · [`find-skills`](./skills/find-skills/SKILL.md) · [`autoskill`](./skills/autoskill/SKILL.md) · [`onboard`](./skills/onboard/SKILL.md) · [`document-project`](./skills/document-project/SKILL.md) · [`remember-insight`](./skills/remember-insight/SKILL.md) · [`pro-tip`](./skills/pro-tip/SKILL.md)

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

```bash
python3 skills/create-skill/scripts/init_skill.py <skill-name> --path skills/
```

See [`docs/creating-skills.md`](./docs/creating-skills.md) for the full authoring guide.

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

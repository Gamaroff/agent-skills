# AGENTS.md

This file provides guidance to AI agents working with code in this repository.

## Repository Purpose

This is a library of agent skills — modular, self-contained packages that extend AI agent capabilities with specialized workflows, domain knowledge, and tooling. Skills are loaded into agents via `.agents/skills/` in target projects.

## Skill Structure

Each skill lives in `skills/{skill-name}/` with this layout:

```
skills/skill-name/
├── SKILL.md          # Required: YAML frontmatter + instructions
├── skill-name.zip    # Packaged distributable (gitignored — built on demand)
├── scripts/          # Executable scripts for deterministic tasks
├── references/       # Documentation loaded into context on demand
└── assets/           # Templates and boilerplate used in output
```

**SKILL.md frontmatter** (required fields):

```yaml
---
name: skill-name
description: Concise description of when/why to use this skill
---
```

The `description` field is critical — it's what agents use for auto-activation matching (~100 words always in context).

## Progressive Disclosure Loading

Skills load in three tiers:

1. **Metadata** (name + description) — always in context
2. **SKILL.md body** — loaded when skill triggers
3. **Bundled resources** — loaded as needed during execution

## Creating and Packaging Skills

**Initialize a new skill:**

```bash
python skills/create-skill/scripts/init_skill.py <skill-name> --path skills/
```

**Package a skill into a distributable zip:**

```bash
python skills/create-skill/scripts/package_skill.py skills/<skill-name>
```

**Bundle shared resources in-tree** (required before commit if you added/changed `shared/resources/` refs):

```bash
npm run bundle              # all skills
npm run bundle:skill skills/<skill-name>
```

Bundling copies referenced `shared/resources/*` into each skill's `references/` directory and rewrites `shared/resources/X` → `references/X` in `.md` and `.js` files. This makes each skill directory self-contained, so installers that copy a skill verbatim (e.g. the tarball extracted by `setup-consumer.sh`) produce a working install without needing the rest of the repo. Idempotent — safe to re-run.

**Validate a skill:**

```bash
python skills/create-skill/scripts/quick_validate.py skills/<skill-name>
```

**Regenerate the skill catalog** (run after adding or editing skills):

```bash
npm run generate-catalog
```

Packaged `.zip` files are build artifacts (gitignored: `skills/*/*.zip`). Regenerate with `package_skill.py`; never commit.

## Configuration

Projects place a `skills-config.yaml` at their root. Full schema and key reference: [`docs/reference/configuration.md`](./docs/reference/configuration.md).

### Platform Detection

Skills that interact with remote trackers or PRs use a resolver order to pick the platform — explicit config → env vars → git remote → default GitHub. Canonical spec: [`shared/resources/platform-detection.md`](./shared/resources/platform-detection.md).

All leaf skills that branch on platform source `shared/resources/resolve-platform.sh` before the branch. `package_skill.py` auto-bundles and rewrites this path into each skill's zip.

## File Naming

Canonical patterns: [`docs/standards/file-naming.md`](./docs/standards/file-naming.md). Document-specific schemas under [`docs/standards/`](./docs/standards/) (epic, story, task, PRD).

## Status Lifecycle

Canonical spec: [`shared/resources/document-status-lifecycle.md`](./shared/resources/document-status-lifecycle.md). TL;DR: `draft → planned → ready-for-development → in-progress → ready-for-review → accepted`, with `cancelled` reachable from any non-terminal state. Frontmatter `status:` uses `lowercase-kebab-case`; body `**Status:**` uses `Title Case`. Update both in the same edit.

## Architecture Documents

Canonical spec: [`docs/standards/architecture-docs.md`](./docs/standards/architecture-docs.md). TL;DR: a consumer project must put architecture docs under `docs/architecture/` (sharded, default) with required files `concepts/coding-standards.md`, `concepts/tech-stack.md`, and `concepts/source-tree.md` — these are loaded into every pipeline run via `devLoadAlwaysFiles`. Copy-paste skeleton: [`docs/examples/architecture/`](./docs/examples/architecture/). Generate from an existing codebase with `/document-existing-project`.

## Skill Catalog

Generated index of all skills: [`docs/reference/skill-catalog.md`](./docs/reference/skill-catalog.md). Run `npm run generate-catalog` after adding or editing skills.

## Plan File Locations

Canonical rules: [`docs/standards/plan-file-locations.md`](./docs/standards/plan-file-locations.md). TL;DR: plans must be co-located with the work they describe — task plans inside the task dir, story plans inside the story dir, general plans in `.agents/plans/` in the repo. Never leave plans in agent scratch dirs (`~/.agents/plans/`, `/tmp/`).

## Task Registry

Canonical rules: [`docs/standards/task-registry.md`](./docs/standards/task-registry.md). TL;DR: `docs/tasks/task-registry.md` owns task numbering. Read **Next Available Task Number** before `/create-task`, append a row, increment the counter, commit atomically with the new task files. Task numbers are globally unique and never reused.

## Epic Registry

Canonical rules: [`docs/standards/epic-registry.md`](./docs/standards/epic-registry.md). Epic numbers are globally unique; the registry at `docs/epic-registry.md` is the single source of truth.

## Shared Resources

`shared/resources/` is the single source of truth for cross-skill documentation. Skills reference these files using the explicit path `shared/resources/<filename>` in their `.md` files. Two distribution paths consume these:

- **`package_skill.py`** (zip distribution) — bundles referenced files under `references/` inside each skill's `.zip` and rewrites paths.
- **`bundle_skill.py`** (in-tree, for `setup-consumer.sh` tarball installs and similar) — does the same rewrite but writes `references/` into each skill directory and updates source `.md`/`.js` files in place. Commit the result. Run via `npm run bundle`.

Never use symlinks or relative paths.

## Development Pipeline

Stories are the unit of work; tasks are standalone. Pipeline reference: [`docs/operations/workflows.md`](./docs/operations/workflows.md). Walkthroughs: [`docs/runbooks/`](./docs/runbooks/README.md). Anti-patterns: [`docs/reference/anti-patterns.md`](./docs/reference/anti-patterns.md). Design rationale: [`docs/reference/faq.md`](./docs/reference/faq.md).

## Evals

Four-layer eval suite (unit → fixture → protocol → end-to-end). Hermetic layers run in CI on every push; live driver modes are opt-in. See [`docs/contributing/evals/README.md`](./docs/contributing/evals/README.md) and `evals/shared/README.md`.

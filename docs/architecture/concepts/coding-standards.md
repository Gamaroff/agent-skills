---
title: Coding standards (agent-skills)
status: draft
---

# Coding standards

> Conventions the agent must follow when contributing to **this** repository (the skills library itself). Loaded into every pipeline run.

## What this repo produces

The primary artefacts are **skills**, not application code. A skill is a directory under `skills/{skill-name}/` with `SKILL.md` (YAML frontmatter + prose) plus optional `scripts/`, `references/`, `assets/`, and `resources/`. See [source-tree.md](./source-tree.md) for the full layout.

Secondary artefacts: Python packaging scripts under `skills/create-skill/scripts/`, JavaScript test fixtures and eval harness under `evals/` and per-skill `tests/`, shared cross-skill docs under `shared/resources/`.

## SKILL.md authoring

- **Required frontmatter:** `name` (kebab-case, must match directory name) and `description` (concise — this is the auto-activation signal that lives in every agent's context window).
- Keep `description` under ~100 words. It is the most-read line of any skill — write it for the matching agent, not for humans skimming a catalog.
- Body uses progressive disclosure: lead with **When to use**, then workflow, then reference material. Push long examples and lookup tables into `references/` so they load only on demand.
- Do not duplicate content that lives in `shared/resources/`. Reference the canonical path (`shared/resources/<file>.md`); the bundler rewrites it.

## File naming

Canonical patterns: [`docs/standards/file-naming.md`](../../standards/file-naming.md). Document schemas (epic, story, task, PRD) live under [`docs/standards/`](../../standards/).

- Skill directories: `kebab-case` matching `name:` frontmatter exactly.
- Markdown files inside skills: `kebab-case.md`, including references and assets unless the asset is a template that must keep a specific filename for its consumer.
- Python scripts: `snake_case.py`. JavaScript: `kebab-case.js` for libs, `*.test.js` co-located for tests.

## Status lifecycle

All documents with a `status:` frontmatter field follow the canonical lifecycle: [`shared/resources/document-status-lifecycle.md`](../../../shared/resources/document-status-lifecycle.md). Frontmatter `status:` uses `lowercase-kebab-case`; body `**Status:**` (where present) uses `Title Case`. Update both in the same edit.

## Cross-skill resources

`shared/resources/` is the **single source of truth** for cross-skill documentation. Two distribution paths consume it:

- `package_skill.py` — bundles referenced files under `references/` inside each skill's `.zip` and rewrites paths.
- `bundle_skill.py` — does the same rewrite but writes `references/` into each skill directory in-tree and commits the result.

Skills reference shared files using the explicit path `shared/resources/<filename>` in their `.md` files. **Never use symlinks or relative paths.** Run `npm run bundle` after adding or changing `shared/resources/` references.

## Platform branching

Skills that branch on tracker or VCS platform source `shared/resources/resolve-platform.sh` and follow the resolver order: explicit config → env vars → git remote → default GitHub. Canonical spec: [`shared/resources/platform-detection.md`](../../../shared/resources/platform-detection.md). `package_skill.py` auto-bundles and rewrites this path into each skill's zip.

## Plan files

Implementation plans **must** live in-repo, co-located with the work or under `.agents/plans/`. Never leave plans in agent scratch dirs (`~/.claude/plans/`, `/tmp/`). Canonical rule: [`docs/standards/plan-file-locations.md`](../../standards/plan-file-locations.md).

## Registries

- **Task numbers** are globally unique. Read `docs/tasks/task-registry.md` → "Next Available Task Number" before creating a task. Append a row, increment counter, commit atomically.
- **Epic numbers** are globally unique. Source of truth: `docs/development/epic-registry.md`.

## Validation before commit

Run these locally when you touch a skill or shared resource:

- `npm run validate -- skills/<changed-skill>/` — checks `SKILL.md` frontmatter.
- `npm run bundle` — required after `shared/resources/` edits.
- `npm run generate-catalog` — required after adding/editing skills.
- `npm test` — Node 22+ test runner suite (skill unit tests + eval protocol tests; relies on `node --test` glob expansion).

## Do not

- Do not write `.agents/skills/` as `.claude/skills/`. Paths are agent-agnostic.
- Do not commit packaged `.zip` files (`skills/*/*.zip` — gitignored, regenerate with `package_skill.py`).
- Do not bypass the registry numbering scheme when creating epics or tasks.
- Do not skip `shared/resources/` and inline duplicated content into individual skills.
- Do not write architecture aspiration here — this doc captures what **is**, not what should be.

## See also

- [`AGENTS.md`](../../../AGENTS.md) — top-level repo guidance for AI agents
- [`docs/contributing/`](../../contributing/) — contributor docs including the evals strategy

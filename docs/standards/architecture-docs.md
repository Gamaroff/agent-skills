---
title: Architecture documents
audience: developers using these skills in a downstream project
status: stable
---

# Architecture documents

> **Audience:** anyone setting up a project that uses these skills, or hand-authoring architecture context for the skills to consume.

Skills in this repo read a consumer project's architecture documentation to ground story creation, code generation, reviews, and QA against real project constraints (tech stack, coding standards, source tree). This document specifies **what the consumer project must put on disk** for those skills to work.

## Purpose

The pipeline (story → develop → review → QA → PR review → finalise) treats certain architecture files as **always-loaded context**. If they are missing, downstream skills either fail loudly or silently produce generic output that ignores project conventions. This spec defines the minimum required layout, the optional sharded structure, and how the layout connects to `skills-config.yaml`.

## Directory layout

Two valid layouts. Pick one per project; do not mix.

### Sharded (recommended, default)

```
docs/architecture/
├── index.md                          # Entry point — lists and links every shard
├── concepts/
│   ├── coding-standards.md           # Required — always loaded
│   ├── tech-stack.md                 # Required — always loaded
│   └── source-tree.md                # Required — always loaded
└── <other-section>.md                # Optional — one file per level-2 section
```

**When to use:** any project with more than a few architecture topics. Matches `skills-config.yaml` defaults (`architectureSharded: true`).

### Monolithic (legacy)

```
docs/
└── architecture.md                   # Single file containing all sections
```

**When to use:** very small projects, or before running `/shard-doc` to split into the sharded layout. Skills that consume always-loaded files still expect the `concepts/` paths — monolithic mode is for full-document reads, not the `devLoadAlwaysFiles` contract.

To convert monolithic → sharded, run `/shard-doc docs/architecture.md docs/architecture/`.

## Required files

Three files are loaded into the context of every pipeline run via `devLoadAlwaysFiles`:

| File | Purpose | What goes in it |
|---|---|---|
| `concepts/coding-standards.md` | Conventions the agent must obey when writing code | Naming, formatting, lint rules, file-organisation conventions, language idioms, do-not-do lists |
| `concepts/tech-stack.md` | The languages, frameworks, runtimes, and major libraries in use | Runtime versions, package managers, build tooling, framework versions, infra targets |
| `concepts/source-tree.md` | The repository layout — where things live | Top-level directories, monorepo workspace map, where domain code vs infra vs docs vs tests live |

Skills that depend on these:

- `develop`, `develop-story`, `develop-task` — load at start of every implementation run
- `create-story`, `create-task` — used for source citations (`[Source: docs/architecture/...]`)
- `review-story`, `review-task`, `review-prd` — load when validating against architecture
- `qa-story`, `qa-task`, `qa-fix` — load for NFR and convention checks
- `finalise` — checks whether architecture docs need updating when a story changes public API/CLI/config

## Optional shards

Beyond the required three, projects commonly add the following — none are required, all are read when present:

- `routing-and-file-structure.md` — for frontend/Expo Router projects
- `unified-project-structure.md` — monorepo layout summary
- `core-workflows.md` — domain user-flow diagrams
- `api-architecture.md` — REST/GraphQL surface
- `data-model.md` — schemas, migrations strategy
- `security.md`, `observability.md`, `deployment.md`

Whatever shards exist, `index.md` must list and link them so agents can discover them.

## `architectureVersion`

The optional `architecture.architectureVersion` field in `skills-config.yaml` selects which template the producer skills (`create-architecture-doc`, `document-existing-project`) target. Current value: **`v4`**.

| Version | Meaning |
|---|---|
| unset | No version check. Skills assume sharded layout if `architectureSharded: true`, monolithic otherwise. |
| `v4` | Sharded layout with `index.md` entry point. `concepts/` subdirectory. Used by `create-story` for source citations. |

Older versions (v1–v3) are not defined here — set `v4` for new projects.

## `skills-config.yaml` wiring

A project consuming these skills must declare its architecture layout in `skills-config.yaml`:

```yaml
architecture:
  architectureSharded: true
  architectureShardedLocation: docs/architecture
  architectureVersion: v4

devLoadAlwaysFiles:
  - docs/architecture/concepts/coding-standards.md
  - docs/architecture/concepts/tech-stack.md
  - docs/architecture/concepts/source-tree.md
```

See [`docs/reference/configuration.md`](../reference/configuration.md) for the full schema.

## Producing the docs

Two producer skills generate this layout:

- **`/document-existing-project`** — brownfield. Reads the actual codebase and produces architecture docs that reflect what exists today (including technical debt and constraints). Use this for any existing project.
- **`/create-architecture-doc`** — greenfield or aspirational. Interactive YAML-driven workflow producing backend, brownfield, frontend, or full-stack architecture documents from templates.

After running either, if the output is monolithic and you want sharded, run `/shard-doc`.

## Status lifecycle

Architecture documents follow the canonical status lifecycle defined in [`shared/resources/document-status-lifecycle.md`](../../shared/resources/document-status-lifecycle.md). Typical progression for an architecture doc: `draft → ready-for-review → accepted`. Frontmatter uses `lowercase-kebab-case`; body `**Status:**` uses `Title Case`.

## Example

A minimal, copy-paste-ready sharded tree lives at [`docs/examples/architecture/`](../examples/architecture/). Use it as a starting point for new projects.

## See also

- [`docs/reference/configuration.md`](../reference/configuration.md) — full `skills-config.yaml` schema
- [`docs/runbooks/new-project-setup.md`](../runbooks/new-project-setup.md) — setting up a new project for the pipeline
- [`docs/runbooks/document-existing-project.md`](../runbooks/document-existing-project.md) — generating architecture docs for an existing codebase
- [`docs/standards/file-naming.md`](./file-naming.md) — canonical filename patterns
- [`shared/resources/document-status-lifecycle.md`](../../shared/resources/document-status-lifecycle.md) — status values and transitions

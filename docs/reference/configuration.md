# `skills-config.yaml` Reference

> **Audience:** developers using these skills in a downstream project.

Projects place a `skills-config.yaml` at the repository root. This file is the single source of truth for paths, layout modes, and shared options the skills read at runtime.

## Full schema

```yaml
qa:
  qaLocation: docs/qa

prd:
  prdSharded: true
  prdShardedLocation: docs/prd
  epicFilePattern: "*/epics/epic.{n}.*.md"

architecture:
  architectureSharded: true
  architectureShardedLocation: docs/architecture
  architectureVersion: v4   # optional, default unset

devLoadAlwaysFiles:
  - docs/architecture/concepts/coding-standards.md

devStoryLocation: nested   # "nested" or an absolute repo path like "docs/stories"
devDebugLog: .ai/debug-log.md
```

## Key reference

| Key | Type | Default | What it controls |
|---|---|---|---|
| `qa.qaLocation` | path | `docs/qa` | Base directory for QA assessments and gate files when not co-located |
| `prd.prdSharded` | bool | `true` | Whether the PRD is split into one file per level-2 section |
| `prd.prdShardedLocation` | path | `docs/prd` | Base directory for sharded PRD + epics + stories |
| `prd.epicFilePattern` | glob | `"*/epics/epic.{n}.*.md"` | How the pipeline locates the parent epic of a story |
| `architecture.architectureSharded` | bool | — | Whether architecture docs are split per level-2 section |
| `architecture.architectureShardedLocation` | path | `docs/architecture` | Base directory for sharded architecture docs |
| `architecture.architectureVersion` | string | (unset) | Architecture template version selector |
| `devLoadAlwaysFiles` | list[path] | `[]` | Files loaded at the start of every pipeline run (coding standards, tech stack, etc.) |
| `devStoryLocation` | `nested` \| path | `nested` | Story layout mode — see below |
| `devDebugLog` | path | `.ai/debug-log.md` | Optional pipeline debug log location |

## Story layout modes

| Mode | Story path | Use when |
|---|---|---|
| `nested` | `{epic-dir}/stories/story.{E}.{S}.{name}/` | Stories are logically scoped to their epic (recommended) |
| flat path (e.g. `docs/stories`) | `{flat-path}/story.{E}.{S}.{name}/` | Stories are managed independently of epic directory layout |

When using a flat path, the story's `epic:` frontmatter field is still **required** — it's used for branch targeting and epic-level tracking even though the directory structure is flat.

## QA-specific shape

```yaml
qa:
  qaLocation: "docs/qa"   # Base directory for QA files
devStoryLocation: "docs/prd"   # Story files location
```

## Placeholders used in skill examples

Several skills use curly-brace placeholders in commands, file paths, and import examples. Replace these with values from your project before running anything verbatim.

| Placeholder | Meaning | Example replacement |
|---|---|---|
| `{project}` | Top-level project / monorepo / docker-compose project name | `acme-platform` |
| `{api-service}` | Name of an HTTP API service (NestJS app, container, NX project) | `api`, `web-api` |
| `{db-service}` | Name of the database service (container, NX project) | `postgres`, `db` |
| `{cache-service}` | Name of the cache service (container) | `redis`, `cache` |
| `@your-org/<lib>` | Scoped package from your monorepo or registry | `@acme/auth`, `@acme/logging` |
| `<your-server>` | SSH host or remote target | `prod-1.example.com` |
| `<registry-host>` | Container registry hostname | `registry.example.com` |

Notes:

- Placeholders are illustrative — skills do not auto-substitute. Treat code blocks as templates.
- For NX-style commands like `nx test {project}`, substitute the actual NX project name.
- Where a skill assumes a specific stack (NX, Docker Compose, NestJS, Expo Router), the assumption is called out in the skill's "When to Use" section. Skip the skill if your stack differs materially.
- Placeholder names follow this doc; if a skill uses different ones, that skill links here and lists its own legend.

## See also

- [File naming](../standards/file-naming.md)
- [Story documents](../standards/story-documents.md) — uses `prd.*` and `devStoryLocation`
- [Task documents](../standards/task-documents.md) — uses `devLoadAlwaysFiles`, `devDebugLog`
- [Story Development Runbook](../runbooks/story-development.md)
- [Task Development Runbook](../runbooks/task-development.md)

# `skills-config.yaml` Reference

> **Audience:** developers using these skills in a downstream project.

> **Setting up a fresh project?** The [setup wizard](../concepts/getting-started.md#quick-setup-wizard) generates a working `skills-config.yaml` interactively. Use this doc to tweak the result, look up a specific key, or hand-author a config in a non-standard layout.

Projects place a `skills-config.yaml` at the repository root. This file is the single source of truth for paths, layout modes, and shared options the skills read at runtime.

## Full schema

```yaml
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
| `prd.prdSharded` | bool | `true` | Whether the PRD is split into one file per level-2 section |
| `prd.prdShardedLocation` | path | `docs/prd` | Base directory for sharded PRD + epics + stories |
| `prd.epicFilePattern` | glob | `"*/epics/epic.{n}.*.md"` | How the pipeline locates the parent epic of a story |
| `architecture.architectureSharded` | bool | — | Whether architecture docs are split per level-2 section. Full spec: [Architecture documents](../standards/architecture-docs.md) |
| `architecture.architectureShardedLocation` | path | `docs/architecture` | Base directory for sharded architecture docs. Full spec: [Architecture documents](../standards/architecture-docs.md) |
| `architecture.architectureVersion` | string | (unset) | Architecture template version selector. Use `v4` for new projects. See [Architecture documents](../standards/architecture-docs.md#architectureversion) |
| `devLoadAlwaysFiles` | list[path] | `[]` | Files loaded at the start of every pipeline run (coding standards, tech stack, etc.) |
| `devStoryLocation` | `nested` \| path | `nested` | Story layout mode — see below |
| `devDebugLog` | path | `.ai/debug-log.md` | Optional pipeline debug log location |

## QA artifacts are co-located

There is **no `qa.qaLocation` configuration**. QA artifacts (review reports, NFR assessments, traceability matrices, DoD checklists, gate files) are always co-located with the story or task document they belong to:

```
story directory:
  story.{E}.{S}.{name}.md
  story.{E}.{S}.qa.{N}.{name}.md       # QA review report
  story.{E}.{S}.dod.{N}.{name}.md      # Definition of Done
  story.{E}.{S}.gate.{N}.{name}.yml    # Gate decision (owned by QA skills)
```

Older skill text may still reference `{qa.qaLocation}/gates/...` or `{qa.qaLocation}/assessments/...`. Those paths are **deprecated** — the canonical location is alongside the work item. See [Story documents](../standards/story-documents.md#co-located-artifacts) and [Task documents](../standards/task-documents.md#co-located-artifacts).

## Story layout modes

| Mode | Story path | Use when |
|---|---|---|
| `nested` | `{epic-dir}/stories/story.{E}.{S}.{name}/` | Stories are logically scoped to their epic (recommended) |
| flat path (e.g. `docs/stories`) | `{flat-path}/story.{E}.{S}.{name}/` | Stories are managed independently of epic directory layout |

When using a flat path, the story's `epic:` frontmatter field is still **required** — it's used for branch targeting and epic-level tracking even though the directory structure is flat.

## Worked example — typical project

Complete `skills-config.yaml` for an NX-style monorepo with NestJS + Expo:

```yaml
# Tracker and VCS — explicit overrides bypass the auto-resolver
tracker: jira
vcs: bitbucket

# Product docs
prd:
  prdSharded: true
  prdShardedLocation: docs/prd
  epicFilePattern: "*/epics/epic.{n}.*.md"

# Architecture docs
architecture:
  architectureSharded: true
  architectureShardedLocation: docs/architecture
  architectureVersion: v4

# Story layout — stories live inside their parent epic directory
devStoryLocation: nested

# Loaded into every pipeline run
devLoadAlwaysFiles:
  - docs/architecture/concepts/coding-standards.md
  - docs/architecture/concepts/tech-stack.md
  - docs/architecture/concepts/source-tree.md

# Pipeline debug log
devDebugLog: .ai/debug-log.md
```

(QA artifacts are co-located with the story/task and need no configuration — see ["QA artifacts are co-located"](#qa-artifacts-are-co-located) above.)

Greenfield variant (flat story layout, GitHub, no Jira):

```yaml
prd:
  prdSharded: true
  prdShardedLocation: docs/prd
  epicFilePattern: "*/epics/epic.{n}.*.md"

devStoryLocation: docs/stories   # flat, not nested

devLoadAlwaysFiles:
  - docs/architecture/coding-standards.md
```

Minimal task-only project (no PRD/epic flow):

```yaml
devLoadAlwaysFiles:
  - docs/architecture/coding-standards.md
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

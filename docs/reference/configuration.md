# `skills-config.yaml` Reference

> **Audience:** developers using these skills in a downstream project.

> **Setting up a fresh project?** The [setup wizard](../concepts/getting-started.md#quick-setup-wizard) generates a working `skills-config.yaml` interactively. Use this doc to tweak the result, look up a specific key, or hand-author a config in a non-standard layout.

Projects place a `skills-config.yaml` at the repository root. This file is the single source of truth for paths, layout modes, and shared options the skills read at runtime.

## Fixed conventions (not configurable)

These conventions are hardcoded into the skills — `skills-config.yaml` does not have knobs for them:

- **PRD location.** PRDs live under `docs/prd/`. The pipeline discovers them at this path; configuring anything else has no effect.
- **Epic location.** Epics live at `docs/prd/{domain}/epics/epic.{N}.{name}/epic.{N}.{name}.md`.
- **Story layout.** Stories nest inside their parent epic directory at `docs/prd/{domain}/epics/epic.{N}.{name}/stories/story.{E}.{S}.{name}/`. Flat layouts (e.g. a global `docs/stories/`) are **not supported** — `create-story` will refuse to write outside the epic directory.
- **QA artifacts.** Co-located with the story/task — see [QA artifacts are co-located](#qa-artifacts-are-co-located) below.

If you need a different layout, you are off the supported path; expect skills to misbehave.

## Full schema

```yaml
tracker: jira       # optional override — see Platform Detection
vcs: bitbucket      # optional override — see Platform Detection

architecture:
  architectureSharded: true
  architectureShardedLocation: docs/architecture
  architectureVersion: v4   # optional, default unset

devLoadAlwaysFiles:
  - docs/architecture/concepts/coding-standards.md

devDebugLog: .ai/debug-log.md
```

## Key reference

| Key | Type | Default | What it controls |
|---|---|---|---|
| `tracker` | `jira` \| `github` | (auto-detected) | Issue tracker override. See [Platform Detection](../../shared/resources/platform-detection.md) |
| `vcs` | `github` \| `bitbucket` | (auto-detected from git remote) | VCS override. See [Platform Detection](../../shared/resources/platform-detection.md) |
| `architecture.architectureSharded` | bool | — | Whether architecture docs are split per level-2 section. Full spec: [Architecture documents](../standards/architecture-docs.md) |
| `architecture.architectureShardedLocation` | path | `docs/architecture` | Base directory for sharded architecture docs. Full spec: [Architecture documents](../standards/architecture-docs.md) |
| `architecture.architectureVersion` | string | (unset) | Architecture template version selector. Use `v4` for new projects. See [Architecture documents](../standards/architecture-docs.md#architectureversion) |
| `devLoadAlwaysFiles` | list[path] | `[]` | Files loaded at the start of every pipeline run (coding standards, tech stack, etc.) |
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

## Worked example — typical project

Complete `skills-config.yaml` for an NX-style monorepo with NestJS + Expo:

```yaml
# Tracker and VCS — explicit overrides bypass the auto-resolver
tracker: jira
vcs: bitbucket

# Architecture docs
architecture:
  architectureSharded: true
  architectureShardedLocation: docs/architecture
  architectureVersion: v4

# Loaded into every pipeline run
devLoadAlwaysFiles:
  - docs/architecture/concepts/coding-standards.md
  - docs/architecture/concepts/tech-stack.md
  - docs/architecture/concepts/source-tree.md

# Pipeline debug log
devDebugLog: .ai/debug-log.md
```

(PRD/epic/story locations follow [fixed conventions](#fixed-conventions-not-configurable). QA artifacts are co-located with the story/task and need no configuration — see ["QA artifacts are co-located"](#qa-artifacts-are-co-located) above.)

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
- [Story documents](../standards/story-documents.md) — story directory conventions
- [Task documents](../standards/task-documents.md) — uses `devLoadAlwaysFiles`, `devDebugLog`
- [Story Development Runbook](../runbooks/story-development.md)
- [Task Development Runbook](../runbooks/task-development.md)

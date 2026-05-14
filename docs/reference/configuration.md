# `skills-config.yaml` Reference

> **Audience:** developers using these skills in a downstream project.

> **Setting up a fresh project?** The [setup wizard](../concepts/getting-started.md#quick-setup-wizard) generates a working `skills-config.yaml` interactively. Use this doc to tweak the result, look up a specific key, or hand-author a config in a non-standard layout.

Projects place a `skills-config.yaml` at the repository root. This file is the single source of truth for paths, layout modes, and shared options the skills read at runtime.

## Configurable roots and fixed conventions

**Two root paths are configurable** (with defaults):

- `prd.prdShardedLocation` — default `docs/prd`
- `architecture.architectureShardedLocation` — default `docs/architecture`

Skills resolve these via [`shared/resources/resolve-paths.sh`](../../shared/resources/resolve-paths.sh), which exports `${PRD_ROOT}` and `${ARCH_ROOT}`.

**The nested structure under each root is fixed**:

- **PRD discovery.** PRDs live directly under `${PRD_ROOT}` (e.g. `${PRD_ROOT}/onboarding/prd.onboarding.md`).
- **Epic location.** Epics live at `${PRD_ROOT}/{domain}/{feature}/epics/epic.{N}.{name}/epic.{N}.{name}.md`.
- **Story layout.** Stories nest inside their parent epic at `${PRD_ROOT}/{domain}/{feature}/epics/epic.{N}.{name}/stories/story.{E}.{S}.{name}/`. Flat layouts are **not supported** — `create-story` will refuse to write outside the epic directory.
- **Architecture docs.** Coding standards / tech stack / source tree live at `${ARCH_ROOT}/concepts/{coding-standards,tech-stack,source-tree}.md`.
- **QA artifacts.** Co-located with the story/task — see [QA artifacts are co-located](#qa-artifacts-are-co-located) below.

## Full schema

```yaml
tracker: jira       # optional override — see Platform Detection
vcs: bitbucket      # optional override — see Platform Detection

prd:
  prdShardedLocation: docs/prd        # root for PRD shard tree

architecture:
  architectureShardedLocation: docs/architecture   # root for architecture docs

devLoadAlwaysFiles:
  - docs/architecture/concepts/coding-standards.md
```

## Key reference

| Key | Type | Default | What it controls |
|---|---|---|---|
| `tracker` | `jira` \| `github` | (auto-detected) | Issue tracker override. See [Platform Detection](../../shared/resources/platform-detection.md) |
| `vcs` | `github` \| `bitbucket` | (auto-detected from git remote) | VCS override. See [Platform Detection](../../shared/resources/platform-detection.md) |
| `prd.prdShardedLocation` | path | `docs/prd` | Base directory for the PRD shard tree. Resolved to `${PRD_ROOT}` by skills. |
| `architecture.architectureShardedLocation` | path | `docs/architecture` | Base directory for architecture docs. Resolved to `${ARCH_ROOT}` by skills. Full spec: [Architecture documents](../standards/architecture-docs.md) |
| `devLoadAlwaysFiles` | list[path] | `[]` | Files loaded at the start of every pipeline run (coding standards, tech stack, etc.) |

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

# PRD root — nested structure underneath is fixed (see above)
prd:
  prdShardedLocation: docs/prd

# Architecture docs root
architecture:
  architectureShardedLocation: docs/architecture

# Loaded into every pipeline run
devLoadAlwaysFiles:
  - docs/architecture/concepts/coding-standards.md
  - docs/architecture/concepts/tech-stack.md
  - docs/architecture/concepts/source-tree.md
```

(Nested PRD/epic/story layout under `${PRD_ROOT}` is fixed — see [Configurable roots and fixed conventions](#configurable-roots-and-fixed-conventions). QA artifacts are co-located with the story/task and need no configuration — see ["QA artifacts are co-located"](#qa-artifacts-are-co-located) above.)

Minimal task-only project (no PRD/epic flow) — relies entirely on defaults:

```yaml
devLoadAlwaysFiles:
  - docs/architecture/coding-standards.md
```

`PRD_ROOT` and `ARCH_ROOT` resolve to their defaults (`docs/prd`, `docs/architecture`) when the keys are absent.

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

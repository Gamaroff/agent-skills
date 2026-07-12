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

jira:
  devEstimateField: customfield_10594  # optional — Jira custom field id for estimated dev hours
  statusMap:                          # optional — local status → Jira workflow status name
    ready-for-development: Selected for Development
    ready-for-review: In Review

github:
  projectEstimateField: Estimate      # optional — GitHub Projects v2 number field name for estimated dev hours

devLoadAlwaysFiles:
  - docs/architecture/concepts/coding-standards.md

developNext:                          # optional — develop-next roadmap orchestrator
  roadmapPath: docs/development/project-completion-roadmap.md
  baseBranch: develop
  qualityGateCommand: npm test        # merge gate run on every branch before gh pr merge
  mergeStrategy: merge                # merge | squash | rebase
```

## Key reference

| Key | Type | Default | What it controls |
|---|---|---|---|
| `tracker` | `jira` \| `github` | (auto-detected) | Issue tracker override. See [Platform Detection](../../shared/resources/platform-detection.md) |
| `vcs` | `github` \| `bitbucket` | (auto-detected from git remote) | VCS override. See [Platform Detection](../../shared/resources/platform-detection.md) |
| `prd.prdShardedLocation` | path | `docs/prd` | Base directory for the PRD shard tree. Resolved to `${PRD_ROOT}` by skills. |
| `architecture.architectureShardedLocation` | path | `docs/architecture` | Base directory for architecture docs. Resolved to `${ARCH_ROOT}` by skills. Full spec: [Architecture documents](../standards/architecture-docs.md) |
| `devLoadAlwaysFiles` | list[path] | `[]` | Files loaded at the start of every pipeline run (coding standards, tech stack, etc.) |
| `jira.statusMap` | map[string→string] | (built-in defaults) | Maps local document status → the literal Jira workflow status name to transition to. See [Jira status mapping](#jira-status-mapping). |
| `jira.devEstimateField` | string (custom field id) | (unset → skipped) | Jira custom field id that `estimated_effort_hours` is written to on story/task sync (e.g. `customfield_10594`, "Dev Estimate (hour)"). See [Jira estimate field](#jira-estimate-field). |
| `github.projectEstimateField` | string (project field name) | `Estimate` | GitHub Projects v2 Number field name that `estimated_effort_hours` is mirrored to on story/task sync. See [GitHub estimate field](#github-estimate-field). |
| `developNext.roadmapPath` | path | `docs/development/project-completion-roadmap.md` | Completion roadmap parsed by `develop-next`'s deterministic selector (`select-next.mjs`). |
| `developNext.baseBranch` | branch name | `develop` | Branch `develop-next` syncs before selection, merges completed epics into, and commits roadmap ticks to. |
| `developNext.qualityGateCommand` | shell command | `npm test` | Local merge gate `develop-next` runs on every branch before `gh pr merge` (the whole gate for projects without PR CI). |
| `developNext.mergeStrategy` | `merge` \| `squash` \| `rebase` | `merge` | Strategy passed to `gh pr merge`. |

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

## Jira status mapping

The `sync-jira-{story,task,epic}` skills transition the Jira issue to match the local document's
`status` field. Because Jira workflows use project-specific status names, the skills translate the
canonical local status (`shared/resources/document-status-lifecycle.md`) to a Jira status name before
looking for a matching transition.

**Built-in defaults** (used when `jira.statusMap` is absent — suitable for a vanilla Jira workflow):

| Local status (frontmatter) | Default Jira target |
|---|---|
| `draft`, `planned`, `ready-for-development` | `To Do` |
| `in-progress` | `In Progress` |
| `ready-for-review` | `In Review` |
| `accepted` | `Done` |
| `cancelled` | `Cancelled` |

If your Jira workflow uses different vocabulary (e.g. "Selected for Development" instead of "To Do"),
override the entries you need under `jira.statusMap`. Keys are the lowercase-kebab local statuses; values
are the **literal Jira workflow status names** (matched case-insensitively against the issue's available
transitions). Your overrides are merged over the defaults — list only what differs:

```yaml
jira:
  statusMap:
    ready-for-development: Selected for Development
    ready-for-review: Code Review
    accepted: Shipped
```

Notes:

- A local status with no mapping (and no default) passes through verbatim to Jira's transition matcher,
  so custom statuses still work without configuration.
- If no available transition matches the resolved target, the sync logs a non-fatal warning listing the
  available transition names and skips the status change — the rest of the issue still syncs.
- Matching is **by name only** (per [`jira-transition-protocol.md`](../../shared/resources/jira-transition-protocol.md)); the skills never guess a transition by status category.

## Jira estimate field

The `sync-jira-{story,task}` skills always write the story/task `estimated_effort_hours` frontmatter
value to Jira's built-in time-tracking field (`timetracking.originalEstimate`). If your project also
tracks estimates in a **custom field** — e.g. "Dev Estimate (hour)" — set its field id under
`jira.devEstimateField` and the same hours value is mirrored there too:

```yaml
jira:
  devEstimateField: customfield_10594
```

Notes:

- The custom-field id is **project-specific** — find it in your Jira admin (Settings → Issues → Custom
  fields) or via `GET /rest/api/3/field`. It is *not* guaranteed to be `customfield_10594` on every tenant.
- The field is treated as **numeric**: the integer hours are sent as a raw number (no `"4h"` suffix).
  Non-numeric `estimated_effort_hours` values are skipped for the custom field.
- Override per-run with the `JIRA_DEV_ESTIMATE_FIELD` environment variable, which takes precedence over
  the config key.
- Unset (the default) → the custom field is not written; only the built-in time-tracking field is set.
- Resilient by design: if Jira rejects the configured id (wrong id, or not on the issue's screen), the
  sync logs a warning, drops just that field, and retries — the rest of the issue still syncs.

## GitHub estimate field

The `sync-github-{story,task}` skills (and their internal `ensure-{story,task}-github-issue`
sub-routines) always mirror the story/task `estimated_effort_hours` frontmatter value onto a GitHub
Projects v2 **Number** field, on every board the issue belongs to. By default the field is looked up by
the name `"Estimate"`. If your project board uses a different field name — e.g. "Dev Hours" — set it
under `github.projectEstimateField`:

```yaml
github:
  projectEstimateField: Dev Hours
```

Notes:

- The field must **already exist** on the project board as a `Number`-type field — this is a lookup by
  name + type, not a field-creation step.
- Override per-run with the `GH_PROJECT_ESTIMATE_FIELD` environment variable, which takes precedence over
  the config key.
- Unset (the default) → the field is looked up by the built-in name `"Estimate"`.
- Resilient by design: if the named field isn't found on a board (wrong name, wrong type, or issue not on
  that board), the sync logs a warning and skips that board — the rest of the issue still syncs.

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

# Local document status -> this project's Jira workflow status names.
# Values shown are the built-in defaults; edit the right-hand names to match your workflow.
jira:
  devEstimateField: customfield_10594   # optional — mirror estimated_effort_hours to this custom field
  statusMap:
    draft: To Do
    planned: To Do
    ready-for-development: To Do
    in-progress: In Progress
    ready-for-review: In Review
    accepted: Done
    cancelled: Cancelled

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

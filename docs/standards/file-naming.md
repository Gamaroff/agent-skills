# File Naming Standards

> **Audience:** anyone authoring or generating documents in a project that uses these skills.

Canonical filename patterns used across the library. Skills enforce these patterns when generating documents; humans should follow them when hand-authoring.

## Conventions

- Structural segments separated by **dots**: `story.178.8.example-feature.md`.
- Descriptive segment uses **hyphens**, all **lowercase**: `example-feature`.
- Directory name (when the document lives in its own dir) matches the filename stem exactly, no extension.
- Never use underscores or camelCase in the descriptive segment.

## Patterns

### Core documents

| Artifact | Pattern | Example |
|---|---|---|
| PRD | `prd.{name}.md` | `prd.onboarding.md` |
| Epic | `epic.{number}.{name}.md` | `epic.163.feature-notifications.md` |
| Story | `story.{epic}.{story}.{name}.md` | `story.2.3.user-authentication.md` |
| Technical task | `task.{number}.{name}.md` | `task.44.database-migration.md` |
| General bug | `bug.{number}.{name}.md` | `bug.7.login-timeout.md` |

> A **general bug** is a cross-cutting bug with no single story/task owner. It lives in its own self-named subdirectory `docs/bugs/bug.{number}.{name}/`, matching the filename stem. Distinct from the *story/task bug artifacts* below (which are co-located with a parent and prefixed `story.`/`task.`); the leading `bug.` + number keeps the general pattern unambiguous.

### Story artifacts

| Artifact | Pattern | Example |
|---|---|---|
| Co-located plan | `story.{epic}.{story}.plan.{name}.md` | `story.2.3.plan.add-footer-link.md` |
| QA report | `story.{epic}.{story}.qa.{n}.{name}.md` | `story.2.3.qa.1.authentication-review.md` |
| Quality gate | `story.{epic}.{story}.gate.{n}.{name}.yml` | `story.2.3.gate.1.authentication-review.yml` |
| Bug report | `story.{epic}.{story}.bug.{n}.{name}.md` | `story.2.3.bug.1.login-timeout.md` |
| Review report | `story.{epic}.{story}.review.{n}.{name}.md` | `story.2.3.review.1.example.md` |
| Implementation report | `story.{epic}.{story}.implementation.{n}.{name}.md` | `story.2.3.implementation.1.add-footer-link.md` |
| Definition of Done | `story.{epic}.{story}.dod.{n}.{name}.md` | `story.2.3.dod.1.add-footer-link.md` |

### Task artifacts

| Artifact | Pattern | Example |
|---|---|---|
| Co-located plan | `task.{n}.plan.{name}.md` | `task.44.plan.database-migration.md` |
| QA report | `task.{n}.qa.{n}.{name}.md` | `task.44.qa.1.migration-check.md` |
| Quality gate | `task.{n}.gate.{n}.{name}.yml` | `task.44.gate.1.migration-check.yml` |
| Bug report | `task.{n}.bug.{n}.{name}.md` | `task.44.bug.1.migration-failure.md` |
| Review report | `task.{n}.review.{n}.{name}.md` | `task.29.review.1.subagent-triage.md` |
| Implementation report | `task.{n}.implementation.{n}.{name}.md` | `task.44.implementation.1.database-migration.md` |
| Definition of Done | `task.{n}.dod.{n}.{name}.md` | `task.44.dod.1.database-migration.md` |

### Epic and PRD artifacts

| Artifact | Pattern | Example |
|---|---|---|
| Epic review report | `epic.{n}.review.{n}.{name}.md` | `epic.163.review.1.notifications.md` |
| PRD review report | `prd.{name}.review.{n}.{name}.md` | `prd.onboarding.review.1.pm-check.md` |

### Change management

| Artifact | Pattern | Example |
|---|---|---|
| Sprint Change Proposal | `change.{n}.{name}.md` | `change.1.auth-pivot.md` |

Epic numbers are **globally unique** — see [`epic-registry.md`](./epic-registry.md). Task numbers are **globally unique and never reused** — see `AGENTS.md` § "Task Registry". General bug numbers are **globally unique and never reused** — see [`bug-registry.md`](./bug-registry.md) and `AGENTS.md` § "Bug Registry".

## See also

- [Story documents](./story-documents.md) — full schema and directory layout
- [Task documents](./task-documents.md) — full schema and directory layout
- [Bug documents](./bug-documents.md) — general-bug schema and directory layout
- [Epic documents](./epic-documents.md) — full schema
- [Configuration](../reference/configuration.md) — `skills-config.yaml` keys
- [Status lifecycle](./status-lifecycle.md) — frontmatter `status:` values

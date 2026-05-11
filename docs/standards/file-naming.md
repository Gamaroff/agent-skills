# File Naming Standards

> **Audience:** anyone authoring or generating documents in a project that uses these skills.

Canonical filename patterns used across the library. Skills enforce these patterns when generating documents; humans should follow them when hand-authoring.

## Conventions

- Structural segments separated by **dots**: `story.178.8.example-feature.md`.
- Descriptive segment uses **hyphens**, all **lowercase**: `example-feature`.
- Directory name (when the document lives in its own dir) matches the filename stem exactly, no extension.
- Never use underscores or camelCase in the descriptive segment.

## Patterns

| Artifact | Pattern | Example |
|---|---|---|
| Story | `story.{epic}.{story}.{name}.md` | `story.2.3.user-authentication.md` |
| Epic | `epic.{number}.{name}.md` | `epic.163.feature-notifications.md` |
| Technical task | `task.{number}.{name}.md` | `task.44.database-migration.md` |
| QA report (story) | `story.{epic}.{story}.qa.{n}.{name}.md` | `story.2.3.qa.1.authentication-review.md` |
| Quality gate (story) | `story.{epic}.{story}.gate.{n}.{name}.yml` | `story.2.3.gate.1.authentication-review.yml` |
| Bug report (story) | `story.{epic}.{story}.bug.{n}.{name}.md` | `story.2.3.bug.1.login-timeout.md` |
| Bug report (task) | `task.{n}.bug.{n}.{name}.md` | `task.44.bug.1.migration-failure.md` |
| Review report (story) | `story.{epic}.{story}.review.{n}.{name}.md` | `story.2.3.review.1.example.md` |
| Review report (task) | `task.{n}.review.{name}.md` | `task.29.review.subagent-triage.md` |

Epic numbers are **globally unique** — see [`epic-registry.md`](./epic-registry.md). Task numbers are **globally unique and never reused** — see `AGENTS.md` § "Task Registry".

## See also

- [Story documents](./story-documents.md) — full schema and directory layout
- [Task documents](./task-documents.md) — full schema and directory layout
- [Epic documents](./epic-documents.md) — full schema
- [Configuration](../reference/configuration.md) — `skills-config.yaml` keys
- [Status lifecycle](./status-lifecycle.md) — frontmatter `status:` values

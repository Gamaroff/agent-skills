# Documentation

Documentation for the Agent Skills library, organised by reader intent.

## I want to use these skills in my project

- **[Runbooks](./runbooks/README.md)** — step-by-step walkthroughs
  - [Story Development](./runbooks/story-development.md)
  - [Task Development](./runbooks/task-development.md)
  - [QA Flow](./runbooks/qa-flow.md)
  - [Bug Fix](./runbooks/bug-fix.md)
  - [Hotfix](./runbooks/hotfix.md)
  - [Sprint Cycle](./runbooks/sprint-cycle.md)
  - [PM Workflows](./runbooks/pm-workflows.md)
  - [Jira Publish](./runbooks/jira-publish.md)
  - [New Project Setup](./runbooks/new-project-setup.md)
  - [Parallel Stories](./runbooks/create-parallel-stories.md)
  - [Change Management](./runbooks/change-management.md)
  - [Document Existing Project](./runbooks/document-existing-project.md)
- **Reference** — look up specific behaviour
  - [Invocation](./reference/invocation.md) — natural language, explicit, slash commands
  - [Activation phrases](./reference/activation-phrases.md) — natural-language phrases that trigger each skill
  - [Commands](./reference/commands.md) — every `/foo` invocation, consolidated
  - [Configuration](./reference/configuration.md) — `skills-config.yaml` keys + worked examples + placeholders
  - [Skill Catalog](./reference/skill-catalog.md) — categorised index of all skills
  - [Glossary](./reference/glossary.md) — terms used across the docs
  - [FAQ](./reference/faq.md) — design rationale
  - [Anti-patterns](./reference/anti-patterns.md) — collected "never do X" rules
  - [Troubleshooting](./reference/troubleshooting.md) — common pipeline failures and recovery
- **Standards** — rules for documents you author
  - [File naming](./standards/file-naming.md)
  - [Status lifecycle](./standards/status-lifecycle.md)
  - [PRD documents](./standards/prd-documents.md)
  - [Epic documents](./standards/epic-documents.md)
  - [Story documents](./standards/story-documents.md)
  - [Task documents](./standards/task-documents.md)
  - [Epic registry](./standards/epic-registry.md)
  - [Task registry](./standards/task-registry.md)
  - [Plan file locations](./standards/plan-file-locations.md)

## I want to understand what skills are

- [Getting started](./concepts/getting-started.md) — install → first command
- [Overview](./concepts/overview.md) — what skills are, progressive disclosure, key principles
- [Architecture](./concepts/architecture.md) — system view, dependency map, design principles

## I'm authoring a skill in this repo

- [Authoring skills](./contributing/authoring-skills.md) — file structure, frontmatter, best practices
- [Doc style guide](./contributing/doc-style.md) — voice, structure, callouts, link conventions
- [Packaging](./contributing/packaging.md) — validation, shared resources, distribution
- [Evals](./contributing/evals/README.md) — four-layer test suite, drivers, live tracker scenarios
- [Releases](./contributing/releases.md) — versioning, release checklist, publishing

## I'm running the library day-to-day

- [Workflows](./operations/workflows.md) — pipeline diagrams, sprint cycle, hotfix, Jira sync, change management

## Worked examples

Real task artifacts produced by this repo running its own pipeline on itself: [`../examples/README.md`](../examples/README.md). Useful for seeing what the generated documents (review reports, QA gates, DoD checklists, implementation reports) actually look like.

## A note on `docs/tasks/`

`docs/tasks/` is **data**, not docs — it holds task instances (`task.{N}.{name}/`) and the [task registry](./tasks/task-registry.md). Treat it as a work-items archive, not a sibling of `concepts/`, `reference/`, `standards/`, `contributing/`, `runbooks/`, or `operations/`. (Previously lived at `docs/development/tasks/`.)

## External

- Claude Code: https://docs.claude.com/en/docs/claude-code
- Skills Overview: https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview
- Project guidelines: [`CLAUDE.md`](../CLAUDE.md)

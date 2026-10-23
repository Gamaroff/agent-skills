# File Naming Standards

> **Audience:** anyone authoring or generating documents in a project that uses these skills.

Canonical filename patterns used across the library. Skills enforce these patterns when generating documents; humans should follow them when hand-authoring.

## Conventions

- Structural segments separated by **dots**: `story.1.2.8.example-feature.md`.
- Descriptive segment uses **hyphens**, all **lowercase**: `example-feature`.
- Directory name (when the document lives in its own dir) matches the filename stem exactly, no extension.
- Never use underscores or camelCase in the descriptive segment.
- Numbers are positive integers with no leading zeros. A PRD, epic or story name segment **begins with a letter**, so the segment after the last number is never itself a number.
- One engine parses, formats, allocates and checks these ids: [`doc-id.js`](../../shared/resources/doc-id.js). Do not restate its patterns as a regex elsewhere.

## Patterns

### Core documents

`P` is the PRD number, `E` counts epics within that PRD and `S` counts stories within that epic. A
sub-story carries a capital-letter suffix on `S`: `story.1.2.3A.core-ui.md`.

> **Adopted (2026-10-16, tasks 202–207).** Every skill writes and reads this scheme through `doc-id.js` (tasks 204–206), and two CI tests hold it (task 207): `doc-numbering-corpus.test.mjs` fails on any unnumbered, mismatched, unregistered or duplicate document under the PRD root, and `doc-id-chokepoint.test.js` fails on an id parsed anywhere but `doc-id.js`. A legacy flat-numbered tree is migrated with `migrate-doc-numbering.mjs` — whole, or incrementally one PRD at a time with `--prd <path-to-prd-doc>` (repeatable), so a project can upgrade before it migrates; `doc-id.js parseLegacy` reads the old shapes only for that migration.

| Artifact | Pattern | Example |
|---|---|---|
| PRD | `prd.{P}.{name}.md` | `prd.1.onboarding.md` |
| Epic | `epic.{P}.{E}.{name}.md` | `epic.1.3.feature-notifications.md` |
| Story | `story.{P}.{E}.{S}.{name}.md` | `story.1.2.3.user-authentication.md` |
| Technical task | `task.{number}.{name}.md` | `task.44.database-migration.md` |
| General bug | `bug.{number}.{name}.md` | `bug.7.login-timeout.md` |

> A **general bug** is a cross-cutting bug with no single story/task owner. It lives in its own self-named subdirectory `docs/bugs/bug.{number}.{name}/`, matching the filename stem. Distinct from the *story/task bug artifacts* below (which are co-located with a parent and prefixed `story.`/`task.`); the leading `bug.` + number keeps the general pattern unambiguous.

### Story artifacts

| Artifact | Pattern | Example |
|---|---|---|
| Co-located plan | `story.{P}.{E}.{S}.plan.{name}.md` | `story.1.2.3.plan.add-footer-link.md` |
| QA report | `story.{P}.{E}.{S}.qa.{n}.{name}.md` | `story.1.2.3.qa.1.authentication-review.md` |
| Quality gate | `story.{P}.{E}.{S}.gate.{n}.{name}.yml` | `story.1.2.3.gate.1.authentication-review.yml` |
| Bug report | `story.{P}.{E}.{S}.bug.{n}.{name}.md` | `story.1.2.3.bug.1.login-timeout.md` |
| Review report | `story.{P}.{E}.{S}.review.{n}.{name}.md` | `story.1.2.3.review.1.example.md` |
| PR review report | `story.{P}.{E}.{S}.pr-review.{n}.{name}.md` | `story.1.2.3.pr-review.1.example.md` |
| Implementation report | `story.{P}.{E}.{S}.implementation.{n}.{name}.md` | `story.1.2.3.implementation.1.add-footer-link.md` |
| Continuation handoff | `story.{P}.{E}.{S}.handoff.{n}.{name}.md` | `story.1.2.3.handoff.1.add-footer-link.md` |
| Definition of Done | `story.{P}.{E}.{S}.dod.{n}.{name}.md` | `story.1.2.3.dod.1.add-footer-link.md` |
| Tracker handover | `story.{P}.{E}.{S}.handover.{n}.{name}.{md,sh,json}` | `story.1.2.3.handover.1.add-footer-link.md` |

### Task artifacts

| Artifact | Pattern | Example |
|---|---|---|
| Co-located plan | `task.{n}.plan.{name}.md` | `task.44.plan.database-migration.md` |
| QA report | `task.{n}.qa.{n}.{name}.md` | `task.44.qa.1.migration-check.md` |
| Quality gate | `task.{n}.gate.{n}.{name}.yml` | `task.44.gate.1.migration-check.yml` |
| Bug report | `task.{n}.bug.{n}.{name}.md` | `task.44.bug.1.migration-failure.md` |
| Review report | `task.{n}.review.{n}.{name}.md` | `task.29.review.1.subagent-triage.md` |
| PR review report | `task.{n}.pr-review.{n}.{name}.md` | `task.29.pr-review.1.subagent-triage.md` |
| Implementation report | `task.{n}.implementation.{n}.{name}.md` | `task.44.implementation.1.database-migration.md` |
| Continuation handoff | `task.{n}.handoff.{n}.{name}.md` | `task.44.handoff.1.database-migration.md` |
| Definition of Done | `task.{n}.dod.{n}.{name}.md` | `task.44.dod.1.database-migration.md` |
| Tracker handover | `task.{n}.handover.{n}.{name}.{md,sh,json}` | `task.44.handover.1.database-migration.md` |

### General bug artifacts

Co-located in `docs/bugs/bug.{number}.{name}/`.

| Artifact | Pattern | Example |
|---|---|---|
| Review report (`/review-bug`) | `bug.{n}.{name}.review.{n}.{name}.md` | `bug.7.login-timeout.review.1.fix-readiness.md` |
| Implementation report (`/develop-bug`) | `bug.{n}.implementation.{n}.{name}.md` | `bug.7.implementation.1.login-timeout.md` |
| Definition of Done (`/finalise --bug`) | `bug.{n}.dod.{n}.{name}.md` | `bug.7.dod.1.login-timeout.md` |

The review report carries the bug file's full stem; the other two carry the short id. Readers of the
implementation report also accept the full-stem form older runs wrote. No PR review row yet:
`/review-pr` does not state the prefix it uses beside a general bug.

### Epic and PRD artifacts

| Artifact | Pattern | Example |
|---|---|---|
| Epic review report | `epic.{P}.{E}.review.{n}.{name}.md` | `epic.1.3.review.1.notifications.md` |
| PRD review report | `prd.{P}.{name}.review.{n}.{name}.md` | `prd.1.onboarding.review.1.pm-check.md` |

### Change management

| Artifact | Pattern | Example |
|---|---|---|
| Sprint Change Proposal | `change.{n}.{name}.md` | `change.1.auth-pivot.md` |

PRD numbers (`P`) are **globally unique and never reused** — see [`prd-registry.md`](./prd-registry.md). An epic number `E` is unique **within its PRD**, and a story number `S` within its epic; each is the highest in use plus 1, never a reused gap. The global epic registry ([`epic-registry.md`](./epic-registry.md)) is retired (task 203): it allocates nothing, and survives only as a historical old → new mapping. Task numbers are **globally unique and never reused** — see `AGENTS.md` § "Task Registry". General bug numbers are **globally unique and never reused** — see [`bug-registry.md`](./bug-registry.md) and `AGENTS.md` § "Bug Registry".

## See also

- [Pipeline artifacts](../reference/pipeline-artifacts.md) — which pipeline step writes each of the files above
- [Story documents](./story-documents.md) — full schema and directory layout
- [Task documents](./task-documents.md) — full schema and directory layout
- [Bug documents](./bug-documents.md) — general-bug schema and directory layout
- [Epic documents](./epic-documents.md) — full schema
- [Configuration](../reference/configuration.md) — `skills-config.yaml` keys
- [Status lifecycle](./status-lifecycle.md) — frontmatter `status:` values

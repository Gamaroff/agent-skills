# Glossary

> **Audience:** anyone — definitions for terms used across the docs.

Quick reference. Where a term has a full standards doc or runbook, the entry links to it.

## Work items

| Term           | Definition                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **PRD**        | Product Requirements Document. Frames a feature area; parent of epics. See [PRD documents](../standards/prd-documents.md).                  |
| **Epic**       | Mid-scope work unit nested in a PRD. Parent of stories. Globally unique number. See [Epic documents](../standards/epic-documents.md).       |
| **Story**      | Unit of implementation. One story → one branch → one PR → one QA gate. See [Story documents](../standards/story-documents.md).              |
| **Task**       | Standalone technical work (refactor, infra, cleanup) that doesn't need a PRD or epic. See [Task documents](../standards/task-documents.md). |
| **Bug report** | Structured record of an issue found by QA or a user, scoped to an existing story.                                                           |
| **Plan file**  | Implementation plan for a task or story. Must be co-located with the work. See [Plan file locations](../standards/plan-file-locations.md).  |

## Pipelines

| Term                  | Definition                                                                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Pipeline**          | Chained sequence of skills that takes a story or task from `draft` to `accepted`.                                                      |
| **Orchestrator**      | A skill that drives a multi-step pipeline by calling other skills. Examples: `develop-story`, `develop-task`.                          |
| **Leaf skill**        | A skill the orchestrator invokes but that doesn't itself orchestrate others. Examples: `create-branch`, `commit-changes`.              |
| **Phase 0**           | Pre-pipeline resolve & prepare step. Prompts for story/task path, base branch, lite mode. Always idempotent and re-runnable.           |
| **Step N**            | One of the 8 numbered steps inside an orchestrator's Phase 1 pipeline.                                                                 |
| **Anchor runbook**    | Full-lifecycle runbook (~200–300 lines). Examples: story-development, task-development.                                                |
| **Satellite runbook** | Focused single-scenario runbook (~80–150 lines). Examples: hotfix, bug-fix, sprint-cycle.                                              |
| **Lite mode**         | Optional flag that skips pre-develop context-gathering for low-risk stories/tasks. Step 7 (`finalise`) side-effects still run in full. |
| **Resume**            | Re-invoking an orchestrator on an interrupted run. Detects per-step artifacts and continues from the first incomplete step.            |
| **MAX_ITER**          | Bounded-loop cap (5) on develop and qa-fix iterations, to prevent runaway agent costs.                                                 |

## QA

| Term             | Definition                                                                                                                                                                                                                        |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Gate file**    | Machine-readable QA decision: `PASS` / `CONCERNS` / `FAIL` / `WAIVED`. Named `*.gate.{N}.{name}.yml`. **Co-located with the story/task** (no central `docs/qa/` location). **Owned by QA skills — dev skills must never modify.** |
| **DoD**          | Definition of Done. Checklist enforced by `finalise` before status advances to `accepted`. Produces `*.dod.{N}.{name}.md`.                                                                                                        |
| **NFR**          | Non-Functional Requirement. Performance, security, reliability, maintainability checks. Produced by `qa-story` / `qa-task`.                                                                                                       |
| **Traceability** | Requirements-to-implementation mapping. Produced by `qa-story`.                                                                                                                                                                   |
| **Risk profile** | Pre-implementation risk score (probability × impact) produced by `qa-planning`. Score ≥9 → gate FAIL, ≥6 → CONCERNS.                                                                                                              |
| **Test design**  | Pre-implementation test plan produced by `qa-planning`.                                                                                                                                                                           |

## Registries & numbering

| Term                       | Definition                                                                                                                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Epic registry**          | `docs/development/epic-registry.md` in the consuming project. Single source of truth for epic numbers. Globally unique, never reused. See [Epic registry](../standards/epic-registry.md). |
| **Task registry**          | `docs/tasks/task-registry.md` in the consuming project. Single source of truth for task numbers. Globally unique, never reused. See [Task registry](../standards/task-registry.md).       |
| **Atomic registry update** | Rule that a new epic/task and its registry row must commit in the same git commit.                                                                                                        |

## Library mechanics

| Term                       | Definition                                                                                                                                                                                    |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SKILL.md**               | Required entry-point file for a skill. YAML frontmatter (name + description) + body instructions.                                                                                             |
| **Frontmatter**            | YAML metadata block at the top of a document, between `---` delimiters.                                                                                                                       |
| **Progressive disclosure** | Three-tier loading: metadata always in context → SKILL.md body on trigger → bundled resources on demand.                                                                                      |
| **Shared resources**       | Cross-skill docs under `shared/resources/` in this repo. Auto-bundled into each skill's zip by the packager.                                                                                  |
| **Platform resolver**      | Logic that picks GitHub/Bitbucket/Jira based on `skills-config.yaml`, env vars, and git remote. See [`shared/resources/platform-detection.md`](../../shared/resources/platform-detection.md). |
| **Packaged skill**         | `.zip` distributable produced by `package_skill.py`. Self-contained: shared resources bundled in.                                                                                             |
| **Skill catalog**          | Auto-generated index of all skills at [`docs/reference/skill-catalog.md`](./skill-catalog.md). Regenerate with `npm run generate-catalog`.                                                    |

## Status

| Term                 | Definition                                                                                                                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status lifecycle** | `draft → planned → ready-for-development → in-progress → ready-for-review → accepted`. `cancelled` from any non-terminal state. See [Status lifecycle](../standards/status-lifecycle.md). |
| **Sync rule**        | Frontmatter `status:` (`lowercase-kebab-case`) and body `**Status:**` (`Title Case`) must update together.                                                                                |

## Requirement & document codes

Codes used inside PRDs, epics, stories, and tasks. (PRD is in [Work items](#work-items); DoD and NFR are in [QA](#qa).)

| Code      | Definition                                                                                                                                                |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AC**    | Acceptance Criteria. Specific, testable conditions that must be met to complete a story.                                                                  |
| **FR**    | Functional Requirement. Defines what the system should do.                                                                                                |
| **NFR**   | Non-Functional Requirement. System qualities or constraints (performance, security, reliability, accessibility). See [QA](#qa).                           |
| **CR**    | Compatibility Requirement. Ensures compatibility, visual consistency, backward compatibility, or localization alignment.                                  |
| **IV**    | Integration Verification. A check or test scenario verifying that multiple components, screens, or features integrate correctly.                          |
| **US**    | User Story. A user-focused requirement following the "As a… I want… So that…" format.                                                                     |
| **REQ**   | Requirement. A system-level requirement key referencing a parent specification or product requirement.                                                    |
| **OQ-D**  | Open Question — Design / Decision / Dependency. Tracks open design questions, architectural decisions, or external dependencies.                          |
| **TBD**   | To Be Determined. Placeholder for a detail or technical decision to be finalized later (e.g. during implementation).                                      |

## Workflow abbreviations

| Code       | Definition                                                                                                       |
| ---------- | --------------------------------------------------------------------------------------------------------------- |
| **QA**     | Quality Assurance. The process and activities (such as testing) that verify the implementation meets standards. |
| **SM**     | Scrum Master. Role responsible for story creation, workflow coordination, and sprint status management.         |
| **UX**     | User Experience. Guidelines and specs for visual design, routing, and user interaction flow.                    |
| **E2E**    | End-to-End (testing). Integration testing that validates the entire software flow from start to finish.         |
| **IaC**    | Infrastructure as Code. Provisioning infrastructure through code instead of manual processes.                   |
| **PR**     | Pull Request. A submission of code changes for review and merging.                                              |
| **CI/CD**  | Continuous Integration / Continuous Deployment. Automated pipelines for building, testing, and deploying code.  |

## See also

- [Standards](../standards/README.md)
- [Concepts / overview](../concepts/overview.md)
- [Troubleshooting](./troubleshooting.md)
- [FAQ](./faq.md)

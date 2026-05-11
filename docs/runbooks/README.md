# Runbooks

> **Audience:** developers using these skills in a downstream project.

Step-by-step walkthroughs for using the agent-skills library to ship real work. Each runbook is a self-contained guide a developer can follow end-to-end without having to stitch the pipeline together from reference docs.

If you want **API-style reference** instead of a walkthrough, see:

- [`../operations/workflows.md`](../operations/workflows.md) — pipeline chains, diagrams
- [`../reference/invocation.md`](../reference/invocation.md) — invocation patterns
- [`../standards/story-documents.md`](../standards/story-documents.md) / [`../standards/task-documents.md`](../standards/task-documents.md) — document schemas
- [`../standards/file-naming.md`](../standards/file-naming.md) — file naming
- [`../reference/skill-catalog.md`](../reference/skill-catalog.md) — every skill, categorised

## Available Runbooks

| Runbook | Use it when… |
|---|---|
| [Story Development](./story-development.md) | Shipping a user-facing feature that fits inside a PRD → epic → story hierarchy. Covers `create-prd` → `review-prd` → `create-epic` → `review-epic` → `create-story` → `review-story` → `develop-story`. |
| [Task Development](./task-development.md) | Standalone technical work (refactor, infra, cleanup, tooling) that doesn't need a PRD or epic. Covers `create-task` → `review-task` → `develop-task`. |
| [QA Flow](./qa-flow.md) | Running QA without the full develop-story / develop-task orchestrator — pre-implementation planning, manual review, or rework on findings. |
| [Bug Fix](./bug-fix.md) | Responding to a QA finding or reported bug inside the normal pipeline. |
| [Hotfix](./hotfix.md) | Emergency production fix branched from `main` and propagated back to `develop`. |
| [Sprint Cycle](./sprint-cycle.md) | Coordinating sprint planning → development → review → completion using these skills. |
| [PM Workflows](./pm-workflows.md) | Framing work before development — greenfield PRD, brownfield enhancement, change management. |
| [Jira Publish](./jira-publish.md) | Syncing local epics/stories/tasks to Jira and driving status transitions from frontmatter. |
| [New Project Setup](./new-project-setup.md) | Spinning up a brand-new project — architecture → PRD → first story. |

## Planned Runbooks (stubs)

- Parallel story development (worktrees)
- Change management deep-dive — `correct-course` / `change-management`
- Documenting an existing project — `document-project`

PRs welcome.

## Runbook conventions

Every runbook in this directory follows the same skeleton so readers can move between them quickly:

1. **When to use this runbook**
2. **Prerequisites** — `skills-config.yaml`, registry, branch hygiene
3. **Pipeline diagram** (Mermaid)
4. **Phase-by-phase walkthrough** — trigger, inputs, outputs, pitfalls, link to `SKILL.md`
5. **Called-skills map** — what each orchestrator invokes internally
6. **Resume / failure recovery**
7. **Verification** — concrete commands to confirm success

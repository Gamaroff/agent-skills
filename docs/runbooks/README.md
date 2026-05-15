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

**New to agent-skills? Start here:**

- 🚀 **Brand-new project** (no codebase yet) → [New Project Setup](./new-project-setup.md)
- 🏗️ **Existing codebase** (adopting agent-skills onto something you already have) → [Document Existing Project](./document-existing-project.md)
- 📚 **Want a structured walkthrough first** → [First-Week Onboarding](./first-week.md)

After those, pick a runbook from the table below as the work in front of you demands.

| Runbook | Use it when… |
|---|---|
| [First-Week Onboarding](./first-week.md) | Starting fresh with agent-skills. Four structured days covering the task pipeline, story pipeline, QA recovery, and parallel development. |
| [Story Development](./story-development.md) | Shipping a user-facing feature that fits inside a PRD → epic → story hierarchy. Covers `create-prd` → `review-prd` → `create-epic` → `review-epic` → `create-story` → `review-story` → `develop-story`. |
| [Task Development](./task-development.md) | Standalone technical work (refactor, infra, cleanup, tooling) that doesn't need a PRD or epic. Covers `create-task` → `review-task` → `develop-task`. |
| [QA Flow](./qa-flow.md) | Running QA without the full develop-story / develop-task orchestrator — pre-implementation planning, manual review, or rework on findings. |
| [Bug Fix](./bug-fix.md) | Responding to a QA finding or reported bug inside the normal pipeline. |
| [Hotfix](./hotfix.md) | Emergency production fix branched from `main` and propagated back to `develop`. |
| [Sprint Cycle](./sprint-cycle.md) | Coordinating sprint planning → development → review → completion using these skills. |
| [PM Workflows](./pm-workflows.md) | Framing work before development — greenfield PRD, brownfield enhancement, change management. |
| [Jira Publish](./jira-publish.md) | Syncing local epics/stories/tasks to Jira and driving status transitions from frontmatter. |
| [New Project Setup](./new-project-setup.md) | Spinning up a brand-new project — architecture → PRD → first story. |
| [Parallel Stories](./create-parallel-stories.md) | Developing multiple stories under one epic in parallel via Git worktrees. |
| [Change Management](./change-management.md) | Responding to pivots, blockers, or scope changes mid-project. |
| [Document Existing Project](./document-existing-project.md) | Generating brownfield architecture docs before adopting the library on an existing codebase. |
| [Release & Install](./release-and-install.md) | Cutting a versioned release (maintainers) and running the consumer setup wizard to install skills into a project. |

## Runbook conventions

Every runbook in this directory follows the same skeleton so readers can move between them quickly:

1. **When to use this runbook**
2. **Prerequisites** — `skills-config.yaml`, registry, branch hygiene
3. **Pipeline diagram** (Mermaid)
4. **Phase-by-phase walkthrough** — trigger, inputs, outputs, pitfalls, link to `SKILL.md`
5. **Called-skills map** — what each orchestrator invokes internally
6. **Resume / failure recovery**
7. **Verification** — concrete commands to confirm success

### Depth targets

- **Anchor runbooks** (story-development, task-development, qa-flow): ~200–300 lines. They cover a full lifecycle and are read end-to-end.
- **Satellite runbooks** (hotfix, bug-fix, sprint-cycle, create-parallel-stories, change-management, document-existing-project, new-project-setup, jira-publish, pm-workflows): ~80–150 lines. They cover one focused scenario and lean on anchor runbooks for shared context.

If a satellite outgrows ~200 lines, consider promoting it or splitting out a satellite of its own.

### Mermaid diagrams

Runbooks use Mermaid. GitHub renders Mermaid natively; Bitbucket needs a plugin or a Mermaid-aware viewer; Jira/Confluence renders via the official Mermaid macro. Older IDE extensions and plain text viewers will show raw fenced blocks. If you're authoring a new diagram, validate it with [`mermaid-architect`](../../skills/mermaid-architect/SKILL.md) before committing.

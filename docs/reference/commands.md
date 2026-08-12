# Commands Reference

> **Audience:** developers looking up slash-command invocations.

Every `/foo` command exposed by the skills in this library, what it does, and where to read more. Commands are agent-side invocations of skills — see [invocation](./invocation.md) for the natural-language and explicit-reference styles.

## Orchestrators

| Command | What it does | Reference |
|---|---|---|
| `/develop-story <path>` | Full story lifecycle: branch → review → develop → PR → QA → fix → finalise → commit | [Story Development](../runbooks/story-development.md) |
| `/develop-task <path>` | Full task lifecycle (no epic) | [Task Development](../runbooks/task-development.md) |
| `/develop-bug <path>` | Full bug-fix lifecycle: branch → review-bug → investigate & fix → PR → verify loop → close | [Bug Fix Runbook](../runbooks/bug-fix.md), [`develop-bug` README](../../skills/develop-bug/README.md) |
| `/develop <path>` | Just the implementation loop — used inside the orchestrators | [`develop` SKILL.md](../../skills/develop/SKILL.md) |

### Roadmap-driven (pick the work for you)

| Command | What it does | Reference |
|---|---|---|
| `/develop-next` | Select the next unblocked roadmap item, run its pipeline end to end, merge, tick the roadmap | [`develop-next` README](../../skills/develop-next/README.md) |
| `/develop-next --dry-run` | Read-only preview of what would be selected, and why | [Roadmap selection](../../skills/develop-next/references/roadmap-selection.md) |
| `/develop-batch` | Same, but fans the whole conflict-free frontier into parallel worktrees — develop in parallel, merge serially | [`develop-batch` README](../../skills/develop-batch/README.md) |
| `/develop-batch --dry-run` | Read-only preview of the batch the selector would pick | [Roadmap selection](../../skills/develop-next/references/roadmap-selection.md) |
| `/loop /develop-next` | Run an orchestrator continuously until the frontier empties or a pipeline HALTs | [`develop-next` README](../../skills/develop-next/README.md) |

## Authoring

| Command | What it does | Reference |
|---|---|---|
| `/create-prd` | Author a brownfield PRD interactively | [PRD documents](../standards/prd-documents.md), [`create-prd`](../../skills/create-prd/SKILL.md) |
| `/new-product-prd` | Author a greenfield PRD interactively | [`new-product-prd`](../../skills/new-product-prd/SKILL.md) |
| `/shard-prd <path>` | Split a large PRD by level-2 section | [`shard-prd`](../../skills/shard-prd/SKILL.md) |
| `/create-epic` | Author an epic (assigns next registry number) | [Epic documents](../standards/epic-documents.md), [`create-epic`](../../skills/create-epic/SKILL.md) |
| `/create-story` | Author the next story for an epic | [Story documents](../standards/story-documents.md), [`create-story`](../../skills/create-story/SKILL.md) |
| `/create-task` | Author a standalone task (assigns next registry number) | [Task documents](../standards/task-documents.md), [`create-task`](../../skills/create-task/SKILL.md) |
| `/create-bug-report` | Record a structured bug — story, task, or general (cross-cutting, numbered from the global bug registry) | [Bug Fix Runbook](../runbooks/bug-fix.md), [Bug documents](../standards/bug-documents.md) |
| `/create-issue` | Create a tracker issue + matching local work-item doc (GitHub / Bitbucket / Jira, auto-detected) | [`create-issue`](../../skills/create-issue/SKILL.md) |
| `/create-architecture-doc` | Author a project architecture doc | [`create-architecture-doc`](../../skills/create-architecture-doc/SKILL.md) |

## Review

| Command | What it does | Reference |
|---|---|---|
| `/review-prd <path>` | Interactive PRD review against codebase | [`review-prd`](../../skills/review-prd/SKILL.md) |
| `/review-epic <path>` | Epic review, scope-overlap detection | [`review-epic`](../../skills/review-epic/SKILL.md) |
| `/review-story <path>` | Interactive story review | [`review-story`](../../skills/review-story/SKILL.md) |
| `/review-task <path>` | Interactive task review | [`review-task`](../../skills/review-task/SKILL.md) |
| `/review-bug <path>` | Interactive bug-report review — reproduction detail, severity, duplicate + already-fixed scans | [`review-bug`](../../skills/review-bug/SKILL.md) |
| `/review-story --validate <path>` | Non-interactive GO/NO-GO readiness score | [`review-story`](../../skills/review-story/SKILL.md) |
| `/review-bug --validate <path>` | Non-interactive GO/NO-GO fix-readiness score (the gate `develop-bug` Step 2 runs) | [`review-bug`](../../skills/review-bug/SKILL.md) |
| `/review-code` | Adversarial diff review of the working tree or a PR — advisory by default | [`review-code`](../../skills/review-code/SKILL.md) |
| `/review-code --comment` / `--fix` | Post findings as inline PR comments, or apply them to the working tree | [`review-code`](../../skills/review-code/SKILL.md) |

## QA

| Command | What it does | Reference |
|---|---|---|
| `/qa-planning <path>` | Pre-implementation risk + test design | [QA Flow](../runbooks/qa-flow.md) |
| `/qa-story <path>` | Story QA review + gate file | [`qa-story`](../../skills/qa-story/SKILL.md) |
| `/qa-task <path>` | Task QA review + gate file | [`qa-task`](../../skills/qa-task/SKILL.md) |
| `/qa-fix <path>` | Apply fixes from QA findings | [`qa-fix`](../../skills/qa-fix/SKILL.md) |
| `/qa-gate <path>` | Manual gate decision (WAIVED, overrides) | [`qa-gate`](../../skills/qa-gate/SKILL.md) |

## Git / PR

| Command | What it does | Reference |
|---|---|---|
| `/create-branch <name>` | Create a branch following gitflow conventions | [`create-branch`](../../skills/create-branch/SKILL.md) |
| `/commit-changes` | Stage, split, and commit with Conventional Commits | [`commit-changes`](../../skills/commit-changes/SKILL.md) |
| `/create-pr` | Push and open a PR with auto-generated description | [`create-pr`](../../skills/create-pr/SKILL.md) |

## Lifecycle / change management

| Command | What it does | Reference |
|---|---|---|
| `/finalise <path>` | DoD validation + PR/tracker side-effects → status: accepted | [`finalise`](../../skills/finalise/SKILL.md) |
| `/change-management` | Sprint Change Proposal for pivots/blockers | [Change Management](../runbooks/change-management.md) |
| `/correct-course` | Mid-stream course correction | [`correct-course`](../../skills/correct-course/SKILL.md) |
| `/edit-epic <path>` | Edit an epic with validation + cascade analysis | [`edit-epic`](../../skills/edit-epic/SKILL.md) |
| `/edit-story <path>` | Edit a story with validation + diff preview | [`edit-story`](../../skills/edit-story/SKILL.md) |

## Tracker sync

| Command | What it does | Reference |
|---|---|---|
| `/sync-jira-epic <path>` | Create/update Jira epic from local file | [Jira Publish](../runbooks/jira-publish.md) |
| `/sync-jira-story <path>` | Create/update Jira story, link to epic | [Jira Publish](../runbooks/jira-publish.md) |
| `/sync-jira-task <path>` | Create/update standalone Jira task | [Jira Publish](../runbooks/jira-publish.md) |
| `/sync-github-epic <path>` | Create/update GitHub epic issue, add to board, mirror priority | [`sync-github-epic`](../../skills/sync-github-epic/SKILL.md) |
| `/sync-github-story <path>` | Create/update GitHub story issue, link as sub-issue of the epic | [`sync-github-story`](../../skills/sync-github-story/SKILL.md) |
| `/sync-github-task <path>` | Create/update standalone GitHub task issue | [`sync-github-task`](../../skills/sync-github-task/SKILL.md) |
| `/jira-epic-creator` | Bulk Jira epic creation from PRD | [`jira-epic-creator`](../../skills/jira-epic-creator/SKILL.md) |

Which family fires is resolved per-run, not chosen by hand — see [platform detection](../../shared/resources/platform-detection.md) and [tracker workflow](./tracker-workflow.md).

## Sprint & ceremony

| Command | What it does | Reference |
|---|---|---|
| `/jira-sprint-manager` | Start, close and audit sprints; move leftover scope | [`jira-sprint-manager`](../../skills/jira-sprint-manager/SKILL.md) |
| `/jira-sprint-review-prep` | Compile a sprint review agenda or release notes (stdout) | [`jira-sprint-review-prep`](../../skills/jira-sprint-review-prep/SKILL.md) |
| `/jira-sprint-retrospective` | Write a sprint retrospective document into the repo, optionally scoped to named people | [`jira-sprint-retrospective`](../../skills/jira-sprint-retrospective/SKILL.md) |
| `/jira-standup-auditor` | Compile an async daily standup from Jira + git activity | [`jira-standup-auditor`](../../skills/jira-standup-auditor/SKILL.md) |

Review prep and the retrospective differ in what survives: review prep prints an agenda for a
ceremony, the retrospective writes a dated document into the repository and is the only one of the
family that reads `assignee`.

## Discovery & meta

| Command | What it does | Reference |
|---|---|---|
| `/find-skills` | Locate the right skill for a task | [`find-skills`](../../skills/find-skills/SKILL.md) |
| `/create-skill` | Scaffold a new skill | [Authoring skills](../contributing/authoring-skills.md) |
| `/document-existing-project` | Generate brownfield architecture doc | [Document Existing Project](../runbooks/document-existing-project.md) |
| `/remember-insight` | Save an insight to project memory | [`remember-insight`](../../skills/remember-insight/SKILL.md) |

## Checklists

| Command | What it does | Reference |
|---|---|---|
| `/execute-checklist <name>` | Run a named checklist (DoD, story-draft, etc.) | [`execute-checklist`](../../skills/execute-checklist/SKILL.md) |
| `/execute-architect-checklist` | Run the architecture validation checklist | [`execute-architect-checklist`](../../skills/execute-architect-checklist/SKILL.md) |
| `/pm-checklist <path>` | Validate a PRD against PM checklist | [`pm-checklist`](../../skills/pm-checklist/SKILL.md) |

## Parallel / coordination

| Command | What it does | Reference |
|---|---|---|
| `/create-parallel-stories <epic-path>` | Coordination matrix + worktree setup for parallel dev | [Parallel Stories](../runbooks/create-parallel-stories.md) |

## Coverage note

This page focuses on the commands a developer routinely invokes. Some skills (validators, enforcers, framework-specific helpers, design skills) are invoked by name rather than slash — see the full catalog at [`./skill-catalog.md`](./skill-catalog.md) for everything available.

## See also

- [Invocation](./invocation.md) — natural language, explicit, slash styles
- [Activation phrases](./activation-phrases.md) — natural-language phrases that trigger each skill
- [Skill catalog](./skill-catalog.md) — full categorised index
- [Runbooks](../runbooks/README.md) — walkthroughs that chain these commands

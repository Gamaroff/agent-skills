# Workflows

> **Audience:** reference — high-level pipeline diagrams and an index into the [Runbooks](../runbooks/README.md).

The unit of work in most chains is a **story** or **task**. For step-by-step walkthroughs, follow a runbook. For implementation details, see the develop-story / develop-task READMEs.

## Pipelines at a glance

### Story pipeline

```
validate-story → develop → qa-story → qa-fix (if needed) → finalise
```

Automated orchestrator (preferred):

```
develop-story [story-file-path]
  └── create-branch → review-story → develop → create-pr → qa-story
        → qa-fix (up to 5 cycles) → finalise → commit-changes
```

Reference: [`skills/develop-story/README.md`](../../skills/develop-story/README.md).
Walkthrough: [Story Development Runbook](../runbooks/story-development.md).

### Task pipeline

```
create-task → review-task → develop → qa-task → qa-fix (if needed) → finalise
```

Automated orchestrator (preferred):

```
develop-task [task-file-path]
  └── create-branch → review-task → develop → create-pr → qa-task
        → qa-fix (up to 5 cycles) → finalise → commit-changes
```

Reference: [`skills/develop-task/README.md`](../../skills/develop-task/README.md).
Walkthrough: [Task Development Runbook](../runbooks/task-development.md).

QA gate files (`PASS` / `CONCERNS` / `FAIL` / `WAIVED`) are owned by QA skills — **dev skills never modify gate files**.

## Lifecycle phases (reference)

```
Pre-Implementation:
validate-story → GO/NO-GO + readiness score
    ↓
Implementation:
develop → execution + tests + DoD checklist
    ↓
Post-Implementation QA:
qa-story / qa-task → gate file
    ↓
Fix Cycle (if needed):
qa-fix → code/test changes → ready for review
    ↓
Done or repeat fix cycle
```

## Epic workflow

```
1. epic-registry-manager → assign unique epic number, validate filename, update registry
2. create-epic           → epic document with stories breakdown
3. review-epic           → validate quality, detect scope overlap
4. create-story          → derive stories from the epic
```

See [Story Development Runbook — Phase B](../runbooks/story-development.md#phase-b--epic-authoring).

## Workflow-specific runbooks

| Scenario | Runbook |
|---|---|
| Story end-to-end | [Story Development](../runbooks/story-development.md) |
| Task end-to-end | [Task Development](../runbooks/task-development.md) |
| QA without the orchestrator | [QA Flow](../runbooks/qa-flow.md) |
| Bug response inside the pipeline | [Bug Fix](../runbooks/bug-fix.md) |
| Emergency production fix | [Hotfix](../runbooks/hotfix.md) |
| Sprint coordination | [Sprint Cycle](../runbooks/sprint-cycle.md) |
| PRD / epic framing decisions | [PM Workflows](../runbooks/pm-workflows.md) |
| Syncing to Jira | [Jira Publish](../runbooks/jira-publish.md) |
| Greenfield project setup | [New Project Setup](../runbooks/new-project-setup.md) |

## Parallel development

```
scrum-master → parallel-stories → epic coordination matrix + worktree setup
    ↓
Multiple developers work simultaneously in isolated worktrees
    ↓
Merge in any order (with proper file boundaries)
    ↓
Sequential stories follow
```

See [`parallel-stories` SKILL.md](../../skills/parallel-stories/SKILL.md).

## Cross-cutting references

- [Configuration](../reference/configuration.md) — `skills-config.yaml` keys
- [Standards](../standards/) — document schemas, file naming, status lifecycle
- [Platform detection](../../shared/resources/platform-detection.md) — GitHub vs Bitbucket vs Jira resolver

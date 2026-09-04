# Workflows

> **Audience:** reference — high-level pipeline diagrams and an index into the [Runbooks](../runbooks/README.md).

The unit of work in most chains is a **story** or **task**. For step-by-step walkthroughs, follow a runbook. For implementation details, see the develop-story / develop-task READMEs.

## Pipelines at a glance

### Story pipeline

```
review-story --validate → develop → qa-story → qa-fix (if needed) → review-pr → finalise
```

Automated orchestrator (preferred):

```
develop-story [story-file-path]
  └── create-branch → review-story → develop → create-pr → qa-story
        → qa-fix (up to 5 cycles) → review-pr (Step 5c, loop exit gate)
        → finalise → commit-changes
```

Reference: [`skills/develop-story/README.md`](../../skills/develop-story/README.md).
Walkthrough: [Story Development Runbook](../runbooks/story-development.md).

### Task pipeline

```
create-task → review-task → develop → qa-task → qa-fix (if needed) → review-pr → finalise
```

Automated orchestrator (preferred):

```
develop-task [task-file-path]
  └── create-branch → review-task → develop → create-pr → qa-task
        → qa-fix (up to 5 cycles) → review-pr (Step 5c, loop exit gate)
        → finalise → commit-changes
```

Reference: [`skills/develop-task/README.md`](../../skills/develop-task/README.md).
Walkthrough: [Task Development Runbook](../runbooks/task-development.md).

### Bug pipeline

```
create-bug-report → review-bug → develop-bug → closed, verified, documented fix
```

`review-bug` reviews a bug report for fix-readiness (completeness, reproducibility-from-report, severity/priority, duplicate + already-fixed scans) — dual-mode like `review-story`/`review-task` (interactive default + `--validate` GO/NO-GO). Automated orchestrator (preferred), taking an existing bug report from open to closed:

```
develop-bug [bug-file-path]
  └── create-branch → review-bug → investigate & fix (reproduce + fix) → create-pr
        → verify & fix loop (up to 5 cycles) → finalise & close → commit-changes
```

Step 2 is `/review-bug` (validate-and-apply) — a fix-readiness gate that HALTs on a duplicate, already-fixed, or under-specified bug, mirroring how `develop-task` Step 2 gates on `review-task`. Verification (Step 5) is anchored on a regression test rather than an AC gate, and Step 7 writes the bug's `## Resolution Summary` and sets `status: closed`. Handles story / task / general bugs and both bugfix (off `develop`) and hotfix (off `main`) branch models. `qa-fix` is the fix engine inside the verify loop.

References: [`skills/review-bug/SKILL.md`](../../skills/review-bug/SKILL.md), [`skills/develop-bug/README.md`](../../skills/develop-bug/README.md).

QA gate files (`PASS` / `CONCERNS` / `FAIL` / `WAIVED`) are owned by QA skills — **dev skills never modify gate files**.

### Roadmap-driven orchestration

The three pipelines above each take a path you supply. Two orchestrators sit one level up and
**choose the path for you**, reading `docs/development/project-completion-roadmap.md`:

```
develop-next
  └── select-next.mjs (deterministic) → /develop-story | /develop-task
        → merge the green PR → tick the roadmap + Change Log
```

```
develop-batch
  └── select-next.mjs --batch → N write-disjoint items
        → one git worktree each, pipelines run concurrently
        → merge serially, rebasing each on the new base tip
```

Selection is executed by the script, never by eye — only `[ ]` rows are candidates, and `deps:`
are satisfied by `[x]` rows. **This makes the roadmap load-bearing**: a merged item left unticked
gets selected and redone. Conflict safety in `--batch` comes from `touches:` tags — two rows
conflict when they share a tag either side marks `!`.

Both are crash-safe via a run-state file (re-running resumes), stop at manual/blocked rows,
planning gaps, or any pipeline HALT, and support `--dry-run` for a read-only preview. Wrap either
in `/loop` for continuous runs.

References: [`skills/develop-next/README.md`](../../skills/develop-next/README.md),
[`skills/develop-batch/README.md`](../../skills/develop-batch/README.md),
[roadmap selection](../../skills/develop-next/references/roadmap-selection.md).

## Lifecycle phases (reference)

```
Pre-Implementation:
review-story --validate → GO/NO-GO + readiness score
    ↓
Implementation:
develop → execution + tests + DoD checklist
    ↓
Post-Implementation QA:
qa-story / qa-task → gate file
    ↓
Fix Cycle (if needed):
qa-fix → code/test changes → ready for review

# On a PASS/WAIVED gate the loop does not end — it hands to Step 5c:
qa-story / qa-task (PASS/WAIVED) → review-pr → verdict
  → qa-fix (REQUEST CHANGES, same 5-cycle budget)
  → finalise (APPROVE / CONCERNS)
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
create-parallel-stories → epic coordination matrix + worktree setup
    ↓
Multiple developers work simultaneously in isolated worktrees
    ↓
Merge in any order (with proper file boundaries)
    ↓
Sequential stories follow
```

See [`create-parallel-stories` SKILL.md](../../skills/create-parallel-stories/SKILL.md).

## Cross-cutting references

- [Configuration](../reference/configuration.md) — `skills-config.yaml` keys
- [Standards](../standards/) — document schemas, file naming, status lifecycle
- [Platform detection](../../shared/resources/platform-detection.md) — GitHub vs Bitbucket vs Jira resolver

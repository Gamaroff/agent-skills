---
name: develop-pipeline-step-4-create-pr
description: Step 4 (create-PR) shared by develop-story and develop-task. Covers /create-pr invocation with --base and tracker-conditional --issue flag, implementation report exclusion from auto-commit, post-PR steps (Decisions Log, lock pr_url update), Jira tracker update (PR-opened comment + In Review transition), pipeline continuation banner, and failure handling. Story vs task variants called out where they differ.
---

# Develop Pipeline — Step 4: Create PR

## When This Document Applies

Loaded by `/develop-story` and `/develop-task` during Step 4. Story/task variants are called out in labeled sub-sections where they differ.

---

## Invoke /create-pr

Invoke the `/create-pr` skill passing `--base {Q2_answer}` (e.g., `/create-pr --base develop`). Branch on tracker platform for the `--issue` flag:

- **GitHub** (`TRACKER=github`): also pass `--issue {TRACKER_ISSUE}` (e.g., `/create-pr --base develop --issue 42`) — `create-pr` will add `Closes #N` to the PR body and comment on the GitHub issue.
- **Jira** (`TRACKER=jira`): omit `--issue` — `create-pr` handles Bitbucket PR creation natively; Bitbucket Issues are not enabled for this project, so passing `--issue` would cause a failed comment attempt.

#### develop-story (Jira note)
The PR body will reference the story file which contains `jira_key`.

#### develop-task (Jira note)
The PR body will reference the task file which contains `jira_key`.

This pre-supplies the target branch via create-pr's Step 0, skipping the interactive prompt entirely. Do not wait for create-pr to ask — Q2 is already resolved.

---

## Implementation Report Exclusion

`create-pr` will automatically commit any uncommitted code changes before opening the PR. At this point the implementation report is partially complete (Steps 1–3 documented). **CRITICAL**: The implementation report file must NOT be included in create-pr's auto-commit. Before invoking create-pr, proactively unstage the report if it was staged:

```bash
git restore --staged {implementation-report-path} 2>/dev/null || true
```

After create-pr completes, verify the report was not committed by checking `git log -1 --name-only`. If it was included, note this in the Issues Log (it does not warrant a halt — the report will simply be updated again in Step 8 with a superseding commit).

The report will continue to be updated through Steps 5–8, and its final state will be captured in the dedicated Step 8 commit.

---

## Post-PR Steps (shared)

After the PR is created:
- Record the PR URL in the Decisions Log and in the **PR** field of the Completion section
- Update Pipeline Progress Notes: `PR #{N}: {url}` — e.g. `PR #42: https://github.com/org/repo/pull/42`
- Update Pipeline Progress: ✅ create-pr
- **Update the lock file with the PR URL** so the PreCompact hook can post pause comments:
  ```bash
  jq --arg url "{PR_URL}" '.pr_url = $url' .claude/state/develop-pipeline.lock \
    > .claude/state/develop-pipeline.lock.tmp && mv .claude/state/develop-pipeline.lock.tmp .claude/state/develop-pipeline.lock
  ```

---

## Jira Tracker Update (when `TRACKER=jira` and `TRACKER_ISSUE` is set)

After extracting the PR URL from `create-pr`'s output, use the Atlassian MCP tools:

1. **Post PR-opened comment** — call `addCommentToJiraIssue`:
   - `cloudId`: {hostname from `JIRA_URL`}
   - `issueIdOrKey`: `{TRACKER_ISSUE}`
   - `commentBody`: `"PR opened — {PR_URL}"`
   - `contentFormat`: `"markdown"`
   - On failure: log warning and continue (non-blocking)

2. **Transition to "In Review"** — call `getTransitionsForJiraIssue` then `transitionJiraIssue`:
   - Call `getTransitionsForJiraIssue` with `cloudId` and `issueIdOrKey: {TRACKER_ISSUE}`
   - Find a transition matching "In Review", "Code Review", or "Ready for Review" (case-insensitive, try in that order)
   - If found: call `transitionJiraIssue`; log "✅ Jira issue {TRACKER_ISSUE} moved to {transition name}"
   - If not found: log "⚠️ No review-phase transition available — issue remains In Progress" (non-blocking)

Log in Decisions Log: "Jira {TRACKER_ISSUE} — PR comment posted; status: {transition name or 'In Progress (no review transition)'}."

---

## On Failure

#### develop-story
Log in Issues Log. Invoke the `/commit-changes` skill to commit the report (suggested message: `docs(story.{epic}.{story}): implementation report — create-pr failure`), push, then HALT.

#### develop-task
Log in Issues Log. Invoke the `/commit-changes` skill to commit the report (suggested message: `docs(task.{id}): implementation report — create-pr failure`), push, then HALT.

---

## Pipeline Continuation Banner (CRITICAL — PIPELINE DOES NOT END HERE)

Steps 5–8 are mandatory. Output immediately after PR creation:

#### develop-story
```
═══ DEVELOP-STORY PIPELINE: STEP 4/8 COMPLETE ═══
PR created: {PR URL}
Proceeding to Step 5: QA Review — do not stop
```

#### develop-task
```
═══ DEVELOP-TASK PIPELINE: STEP 4/8 COMPLETE ═══
PR created: {PR URL}
Proceeding to Step 5: QA Task Review — do not stop
```

Then continue directly to Step 5–6 without waiting for user input.

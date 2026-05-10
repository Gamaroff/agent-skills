---
name: develop-pipeline-step-1-create-branch
description: Step 1 (create-branch) shared by develop-story and develop-task. Covers pipeline lock collision check, pre-flight board/Jira verification, implementation report stash/restore, /create-branch invocation, post-branch steps, pipeline lock file creation, and failure handling. Story vs task variants are called out where they differ.
---

# Develop Pipeline — Step 1: Create Branch

## When This Document Applies

Loaded by `/develop-story` and `/develop-task` during Step 1. Story/task variants are called out in labeled sub-sections where they differ.

---

## Pipeline Lock Collision Check (mandatory — refuse to start if another pipeline active)

Only one `/develop-story` or `/develop-task` pipeline may run per repo at a time (single-path lock). Run this *before* any branch-creation work — collision after `/create-branch` would orphan a branch.

```bash
if [ -f .claude/state/develop-pipeline.lock ]; then
  echo "❌ Pipeline lock collision: another /develop-story or /develop-task pipeline is already active in this repo:"
  cat .claude/state/develop-pipeline.lock
  echo "Resolve by completing or aborting the other run (and removing the lock) before continuing."
fi
```

If the lock file exists: **HALT immediately** — show the lock contents to the user and instruct them to resolve by completing or aborting the other pipeline run, then removing `.claude/state/develop-pipeline.lock`. Do NOT proceed to branch creation.

If the lock exists but its `branch` field does not match any existing local branch (`git branch --list`), it is stale — log a warning and remove it: `rm -f .claude/state/develop-pipeline.lock`. Then proceed.

---

## Pre-flight Board Check (mandatory gate before create-branch)

**GitHub only**: If `TRACKER=github` and `TRACKER_ISSUE` is set, verify the board status before proceeding. This catches cases where Phase 0c-reg was skipped or silently failed:

```bash
BOARD_NUM=$(grep 'project_board_number:' project.yml | awk '{print $2}')
BOARD_STATUS=$(gh project item-list "$BOARD_NUM" --owner "$(gh repo view --json owner -q '.owner.login')" --format json 2>/dev/null \
  | jq -r '.items[] | select(.content.number == {TRACKER_ISSUE}) | .status // "unknown"')
echo "Board status for #{TRACKER_ISSUE}: $BOARD_STATUS"
```

- If `$BOARD_STATUS` is `In Progress`: proceed — 0c-reg succeeded.
- If `$BOARD_STATUS` is `Todo` or `unknown`: re-run the full 0c-reg GitHub board update (GraphQL mutation from `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` — 0c-reg GitHub path), then re-check. Log the outcome in the implementation report Pipeline Configuration table (`Board status` row).
- If the retry also fails: log `⚠️ Board status update failed — proceeding without board update` in the Issues Log and continue.

**Jira**: If `TRACKER=jira` and `TRACKER_ISSUE` is set, call `getJiraIssue` MCP tool to verify the issue is "In Progress" before proceeding:
- `cloudId`: {hostname from `JIRA_URL`}, `issueIdOrKey`: `{TRACKER_ISSUE}`, `fields: ["status"]`
- If `fields.status.name` is "In Progress": proceed — 0c-reg succeeded
- If not "In Progress": re-apply transition using `getTransitionsForJiraIssue` + `transitionJiraIssue` (same pattern as 0c-reg step 2 in the step-0 shared doc); log outcome in Pipeline Configuration table (`Tracker status` row)
- If retry fails: log `⚠️ Jira status update failed — proceeding` in Issues Log and continue

---

## Step 1a: Ensure Epic Branch Exists (develop-story only)

Before creating the story branch, ensure the epic branch exists. Use `EPIC_BRANCH`, `EPIC_BRANCH_EXISTS`, `EPIC_BRANCH_LOCAL`, and `EPIC_BRANCH_REMOTE` set in Phase 0.

### Case A — Epic branch not found locally or remotely (`EPIC_BRANCH_EXISTS=false`)

> **Idempotence guarantee.** Phase 0b's `EPIC_BRANCH_EXISTS=false` is a snapshot — the branch may have been created locally or pushed to the remote between Phase 0b and Step 1a (e.g. another concurrent pipeline run for a sibling story in the same epic). Re-check immediately before each mutation so Case A never HALTs on `git checkout -b` or `git push -u` "branch already exists" errors.

```bash
git fetch origin
git checkout develop
git pull origin develop

# Guarded local create — if the branch was created locally between Phase 0b and now, just check it out.
if git rev-parse --verify --quiet "refs/heads/{EPIC_BRANCH}" >/dev/null; then
  git checkout {EPIC_BRANCH}
else
  git checkout -b {EPIC_BRANCH}
fi

# Guarded remote push — if the remote branch already exists, set upstream tracking instead of failing.
if git ls-remote --exit-code --heads origin "{EPIC_BRANCH}" >/dev/null 2>&1; then
  git branch --set-upstream-to=origin/{EPIC_BRANCH} {EPIC_BRANCH}
else
  git push -u origin {EPIC_BRANCH}
fi
```

Log: "✅ Created epic branch: {EPIC_BRANCH} from develop"
Update Pipeline Progress: ✅ 1a. create-epic-branch

### Case B — Epic branch exists on remote only (`EPIC_BRANCH_REMOTE` set, `EPIC_BRANCH_LOCAL` empty)

```bash
git fetch origin
git checkout -b {EPIC_BRANCH} --track origin/{EPIC_BRANCH}
```

Log: "✅ Checked out epic branch from remote: {EPIC_BRANCH}"
Update Pipeline Progress: ✅ 1a. create-epic-branch (pre-existing)

### Case C — Epic branch exists locally (`EPIC_BRANCH_LOCAL` set)

```bash
git fetch origin {EPIC_BRANCH}
git checkout {EPIC_BRANCH}
git pull origin {EPIC_BRANCH}
```

Log: "✅ Epic branch {EPIC_BRANCH} already exists locally — pulled latest"
Update Pipeline Progress: ✅ 1a. create-epic-branch (pre-existing)

**On any failure**: log in Issues Log, do NOT write the lock file, HALT with error details.

After step 1a completes, the working branch is `{EPIC_BRANCH}`. The story branch (step 1b below) is created from it.

---

## Step 1b: Stash, Create Story Branch, and Restore

Before invoking `/create-branch`, stash the implementation report to ensure a clean working directory:

#### develop-story
```bash
git stash push --include-untracked -m "develop-story: implementation report pre-branch" -- {implementation-report-path}
```

#### develop-task
```bash
git stash push --include-untracked -m "develop-task: implementation report pre-branch" -- {implementation-report-path}
```

### Invoke /create-branch

#### develop-story
Invoke the `/create-branch` skill with the story file path.

#### develop-task
Invoke the `/create-branch` skill with the task file path.

When `create-branch` asks which base branch to use, select the Q1 answer from Upfront Setup — do not prompt the user again.
- **develop-story**: Q1 answer is always `{EPIC_BRANCH}`
- **develop-task**: Q1 answer is the branch chosen in Phase 0d

### Restore the Stash (shared)

After `/create-branch` completes and the feature branch is checked out:

```bash
git stash pop
```

If stash pop fails, recover the report with:

```bash
git stash show -p stash@{0} | grep -A 9999 "^+++ b/{report-filename}" | tail -n +2 > {implementation-report-path}
git stash drop stash@{0}
```

If that also fails, run `git stash list` to find the stash index and `git stash show -p stash@{N}` to inspect it, then manually recreate the report file from the output. Log this in Decisions Log: "Implementation report stashed before branch creation, restored after (or manually recovered)."

---

## Post-Branch Steps (shared)

After the story branch is created:
- Record the branch name in the Decisions Log and in the **Branch** field of the Completion section
- Run `git log --oneline -1` to capture the initial commit hash; record it in the Pipeline Progress Notes: e.g. `Branch created at \`{hash}\``
- Update Pipeline Progress: ✅ 1b. create-story-branch

---

## Write the Pipeline Lock File

Enables the PreCompact graceful-pause hook from this point onward. Collision was already checked above; the lock should not exist here.

#### develop-story

```bash
mkdir -p .claude/state
cat > .claude/state/develop-pipeline.lock <<EOF
{
  "skill": "develop-story",
  "epic_branch": "{EPIC_BRANCH}",
  "report_path": "{implementation-report-path}",
  "task_or_story_id": "{epic}.{story}",
  "task_or_story_directory": "{story-directory}",
  "branch": "{branch-name}",
  "pr_url": "",
  "tracker": "{TRACKER}",
  "tracker_issue": "{TRACKER_ISSUE}",
  "current_step": 1,
  "started_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
```

The lock file is read by `.agents/skills/develop-story/scripts/on-precompact.sh` if compaction fires.

#### develop-task

```bash
mkdir -p .claude/state
cat > .claude/state/develop-pipeline.lock <<EOF
{
  "skill": "develop-task",
  "report_path": "{implementation-report-path}",
  "task_or_story_id": "{task_id}",
  "task_or_story_directory": "{task-directory}",
  "branch": "{branch-name}",
  "pr_url": "",
  "tracker": "{TRACKER}",
  "tracker_issue": "{TRACKER_ISSUE}",
  "current_step": 1,
  "started_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
```

The lock file is read by `.agents/skills/develop-task/scripts/on-precompact.sh` if compaction fires.

### Shared note

From Step 2 onward, the per-step banner directive updates `current_step`. Step 4 also writes `pr_url` after the PR is created.

---

## On Failure

Update Pipeline Progress ❌, log in Issues Log. **Do not commit the report** — no feature branch exists yet and committing on the base branch would pollute it. Save the report file to disk and tell the user its path so they can recover manually. Do **not** write the lock file (no branch = hook can't safely commit). Then HALT with the error details.

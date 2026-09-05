---
name: ensure-task-jira-issue
description: 'Internal sub-routine called from create-task and review-task. Given a task markdown file path, ensures the task has a corresponding Jira issue. Creates it if missing by delegating to sync-jira-task (which handles backlog add, ADF rendering, and the Change Log rows for creation and status transition), and writes jira_key + jira_url to the task frontmatter. Tasks are standalone — NOT linked to a Jira epic. Sets TASK_JIRA_KEY (e.g. "PROJ-456") in caller scope, or empty string on failure. Jira-only: exits 0 with informational message when TRACKER!=jira. Jira sibling of ensure-task-github-issue. Callers branch on TRACKER (set by references/resolve-platform.sh) to pick the right sub-routine.'
type: internal
invokes: [sync-jira-task]
---

# Ensure Task Jira Issue — Sub-Routine

## Purpose

This is an **internal sub-routine** called by `create-task` and `review-task`. Do not invoke directly via slash command.

## Inputs (set by the calling skill before invoking)

- `TASK_FILE_PATH` — repo-relative path to the task markdown file (e.g. `docs/tasks/task.5.cache-lib-refactor/task.5.cache-lib-refactor.md`)
- `TRACKER` — set by `references/resolve-platform.sh` in the calling skill (must be `jira` for this sub-routine to act)
- Env: `JIRA_URL`, plus Atlassian MCP credentials (cloudId derived from `JIRA_URL` hostname)

## Output (set by this sub-routine, available to the calling skill)

- `TASK_JIRA_KEY` — Jira issue key (e.g. `PROJ-456`), or empty string on failure or skip

---

## Workflow

### Step TJ0: Guard — Jira-only check

If `TRACKER` is not set to `jira`:
```
ℹ️  Skipped: tracker is not jira (TRACKER=${TRACKER:-unset}) — ensure-task-jira-issue is a no-op for non-Jira projects.
```
Set `TASK_JIRA_KEY=""` and return. Do not proceed to TJ1.

### Step TJ1: Read Task Frontmatter

Read the file at `TASK_FILE_PATH`. Parse the YAML frontmatter block (between `---` delimiters). Extract:

- `jira_key` — current value (may be absent, null, or a string like `PROJ-456`)
- `jira_url` — current value (may be absent or null)
- `title` — task title

If the file cannot be read: log warning `⚠️ Task file not found at TASK_FILE_PATH — setting TASK_JIRA_KEY=""`, set `TASK_JIRA_KEY=""`, and return.

### Step TJ2: Branch on jira_key Presence

**If `jira_key` is set and non-null** → go to Step TJ3 (verify existing key).

**If `jira_key` is absent, null, or empty string** → go to Step TJ4 (create via sync-jira-task).

---

### Step TJ3: Verify Existing Jira Issue

Call the Atlassian MCP tool `getJiraIssue`:
- `cloudId`: derived from `JIRA_URL` hostname (e.g. `yourorg.atlassian.net`). If cloud resolution fails, call `getAccessibleAtlassianResources` and use the matching entry's `id`.
- `issueIdOrKey`: `{jira_key}`
- `fields`: `["status", "summary"]`

**On success** (issue returned):
- Set `TASK_JIRA_KEY={jira_key}`.
- Verify `jira_url` shape (Step TJ5), then return.

**On 404 / issue not found**:
- Log critical: `Task Jira issue {jira_key} not found — it may have been deleted. Manual investigation required.`
- Set `TASK_JIRA_KEY=""`.
- Return. Do NOT silently re-create — orphan Jira issues would result.

**On other (transient/network) error**:
- Log warning: `Could not verify Jira issue {jira_key} — transient error. Returning current key without re-creating.`
- Set `TASK_JIRA_KEY={jira_key}` (do not lose the link on a flaky network call).
- Return.

---

### Step TJ4: Create via sync-jira-task Delegation

Invoke the `sync-jira-task` sub-routine by executing the bundled script directly. Pass `TASK_FILE_PATH` via `--file`:

```bash
node .agents/skills/sync-jira-task/scripts/sync-jira-task.js \
  --file "$TASK_FILE_PATH"
```

> **Path note**: the script is bundled with the skill at `.agents/skills/sync-jira-task/scripts/sync-jira-task.js` (installed by `setup-consumer.sh`). Do **NOT** look for `.scripts/jira-sync*.js` in the consumer repo root — that path does not exist.

`sync-jira-task` will:
- Create the Jira task if it does not exist (idempotent — searches by `synced-from-*` label first)
- Add the task to the project backlog (Scrum boards only)
- Embed Bitbucket links rendered via ADF (default-branch refs)
- Write `jira_key` (and `jira_url` of shape `{JIRA_URL}/browse/{KEY}`) back to the task frontmatter
- Insert the body cross-reference link

> **Standalone**: tasks are NOT linked to a Jira epic. No parent-epic resolution step.
>
> **What the delegate also does**: `sync-jira-task` advances the task's Jira status from
> frontmatter and appends a Change Log row for that transition, plus one for the issue creation
> itself. Both are intended, documented behaviour — a creation row and a status row are exactly the
> two events the narrowed sync rules record. See
> [document-change-log.md](references/document-change-log.md).

**If `sync-jira-task` exits with a non-zero status or reports an auth error**:
- Log warning: `sync-jira-task delegation failed — setting TASK_JIRA_KEY=""`
- Set `TASK_JIRA_KEY=""`.
- Return.

After delegation completes: re-read the task frontmatter to capture the freshly-written `jira_key`. Continue to Step TJ5.

---

### Step TJ5: Verify jira_url Shape

Expected shape: `{JIRA_URL}/browse/{jira_key}` (e.g. `https://yourorg.atlassian.net/browse/PROJ-456`).

- If `jira_url` in frontmatter equals the expected shape → no action.
- If `jira_url` is absent, null, or mismatched → write the correct value to frontmatter:
  ```
  jira_url: {JIRA_URL}/browse/{jira_key}
  ```

---

### Step TJ6: Set Output

Set `TASK_JIRA_KEY={jira_key}` in the calling skill's scope.

---

## Failure Handling Summary

All failures are **non-blocking**. The caller (`create-task`, `review-task`) handles empty output.

| Scenario | Log level | TASK_JIRA_KEY returned |
|---|---|---|
| TRACKER != jira | Info | `""` |
| Task file not found | Warning | `""` |
| Jira issue verified (existing key) | — | `{jira_key}` |
| Jira 404 (issue deleted) | Critical | `""` |
| Jira transient/network error | Warning | `{jira_key}` (preserve link) |
| sync-jira-task non-zero exit | Warning | `""` |
| sync-jira-task auth missing | Warning | `""` |

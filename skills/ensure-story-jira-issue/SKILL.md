---
name: ensure-story-jira-issue
description: 'Internal sub-routine called from create-story and review-story. Given a story markdown file path and (optionally) a parent epic Jira key, ensures the story has a corresponding Jira issue. Creates it if missing by delegating to sync-jira-story (which handles parent-epic linkage, board add, ADF rendering, and the Change Log rows for creation and status transition), and writes jira_key + jira_url to the story frontmatter. Sets STORY_JIRA_KEY (e.g. "PROJ-123") in caller scope, or empty string on failure. Jira-only: exits 0 with informational message when TRACKER!=jira. Jira sibling of ensure-story-github-issue. Callers branch on TRACKER (set by references/resolve-platform.sh) to pick the right sub-routine.'
type: internal
---

# Ensure Story Jira Issue — Sub-Routine

## Purpose

This is an **internal sub-routine** called by `create-story` and `review-story`. Do not invoke directly via slash command.

## Inputs (set by the calling skill before invoking)

- `STORY_FILE_PATH` — repo-relative path to the story markdown file (e.g. `${PRD_ROOT}/onboarding/epics/epic.1.first-task-in-10-minutes/stories/story.1.1.first-task-in-10-minutes/story.1.1.first-task-in-10-minutes.md`; `${PRD_ROOT}` defaults to `docs/prd`)
- `EPIC_JIRA_KEY` — parent epic Jira key (e.g. `PROJ-42`), or empty string if no parent epic Jira issue exists yet. The caller should run `ensure-epic-jira-issue` first to populate this.
- `TRACKER` — set by `references/resolve-platform.sh` in the calling skill (must be `jira` for this sub-routine to act)
- Env: `JIRA_URL`, plus Atlassian MCP credentials (cloudId derived from `JIRA_URL` hostname)

## Output (set by this sub-routine, available to the calling skill)

- `STORY_JIRA_KEY` — Jira issue key (e.g. `PROJ-123`), or empty string on failure or skip

---

## Workflow

### Step SJ0: Guard — Jira-only check

If `TRACKER` is not set to `jira`:
```
ℹ️  Skipped: tracker is not jira (TRACKER=${TRACKER:-unset}) — ensure-story-jira-issue is a no-op for non-Jira projects.
```
Set `STORY_JIRA_KEY=""` and return. Do not proceed to SJ1.

### Step SJ1: Read Story Frontmatter

Read the file at `STORY_FILE_PATH`. Parse the YAML frontmatter block (between `---` delimiters). Extract:

- `jira_key` — current value (may be absent, null, or a string like `PROJ-123`)
- `jira_url` — current value (may be absent or null)
- `jira_epic_key` — current value (parent epic key already linked, may be absent)
- `title` — story title

If the file cannot be read: log warning `⚠️ Story file not found at STORY_FILE_PATH — setting STORY_JIRA_KEY=""`, set `STORY_JIRA_KEY=""`, and return.

### Step SJ2: Branch on jira_key Presence

**If `jira_key` is set and non-null** → go to Step SJ3 (verify existing key).

**If `jira_key` is absent, null, or empty string** → go to Step SJ4 (create via sync-jira-story).

---

### Step SJ3: Verify Existing Jira Issue

Call the Atlassian MCP tool `getJiraIssue`:
- `cloudId`: derived from `JIRA_URL` hostname (e.g. `yourorg.atlassian.net`). If cloud resolution fails, call `getAccessibleAtlassianResources` and use the matching entry's `id`.
- `issueIdOrKey`: `{jira_key}`
- `fields`: `["status", "summary"]`

**On success** (issue returned):
- Set `STORY_JIRA_KEY={jira_key}`.
- Verify `jira_url` shape (Step SJ5), then return.

**On 404 / issue not found**:
- Log critical: `Story Jira issue {jira_key} not found — it may have been deleted. Manual investigation required.`
- Set `STORY_JIRA_KEY=""`.
- Return. Do NOT silently re-create — orphan Jira issues would result.

**On other (transient/network) error**:
- Log warning: `Could not verify Jira issue {jira_key} — transient error. Returning current key without re-creating.`
- Set `STORY_JIRA_KEY={jira_key}` (do not lose the link on a flaky network call).
- Return.

---

### Step SJ4: Create via sync-jira-story Delegation

Before delegating, ensure the parent-epic link is available so `sync-jira-story` can perform the epic-link step:

- If `EPIC_JIRA_KEY` (the input parameter) is non-empty AND the story frontmatter `jira_epic_key` is absent or empty, write `jira_epic_key: {EPIC_JIRA_KEY}` into the frontmatter (insert before the closing `---`). This is idempotent — skip if already present and matching.
- If `EPIC_JIRA_KEY` is empty and `jira_epic_key` is also empty, log `⚠️ No parent-epic Jira key available — story will be created without epic linkage` and continue. `sync-jira-story` will handle this gracefully.

Invoke the `sync-jira-story` sub-routine by executing the bundled script directly. Pass `STORY_FILE_PATH` via `--file`:

```bash
node .agents/skills/sync-jira-story/scripts/sync-jira-story.js \
  --file "$STORY_FILE_PATH"
```

> **Path note**: the script is bundled with the skill at `.agents/skills/sync-jira-story/scripts/sync-jira-story.js` (installed by `setup-consumer.sh`). Do **NOT** look for `.scripts/jira-sync*.js` in the consumer repo root — that path does not exist.

`sync-jira-story` will:
- Create the Jira story if it does not exist (idempotent — searches by title/labels first)
- Link the new issue to the parent epic via `parent` field (team-managed) or the Epic Link customfield (classic)
- Add the story to the project backlog (Scrum boards only)
- Embed Bitbucket links rendered via ADF
- Write `jira_key` (and `jira_url` of shape `{JIRA_URL}/browse/{KEY}`) back to the story frontmatter
- Insert the body cross-reference link

> **What the delegate also does**: `sync-jira-story` advances the story's Jira status from
> frontmatter and appends a Change Log row for that transition, plus one for the issue creation
> itself. Both are intended, documented behaviour — a creation row and a status row are exactly the
> two events the narrowed sync rules record. See
> [document-change-log.md](references/document-change-log.md).

**If `sync-jira-story` exits with a non-zero status or reports an auth error**:
- Log warning: `sync-jira-story delegation failed — setting STORY_JIRA_KEY=""`
- Set `STORY_JIRA_KEY=""`.
- Return.

After delegation completes: re-read the story frontmatter to capture the freshly-written `jira_key`. Continue to Step SJ5.

---

### Step SJ5: Verify jira_url Shape

Expected shape: `{JIRA_URL}/browse/{jira_key}` (e.g. `https://yourorg.atlassian.net/browse/PROJ-123`).

- If `jira_url` in frontmatter equals the expected shape → no action.
- If `jira_url` is absent, null, or mismatched → write the correct value to frontmatter:
  ```
  jira_url: {JIRA_URL}/browse/{jira_key}
  ```

---

### Step SJ6: Set Output

Set `STORY_JIRA_KEY={jira_key}` in the calling skill's scope.

---

## Failure Handling Summary

All failures are **non-blocking**. The caller (`create-story`, `review-story`) handles empty output.

| Scenario | Log level | STORY_JIRA_KEY returned |
|---|---|---|
| TRACKER != jira | Info | `""` |
| Story file not found | Warning | `""` |
| Jira issue verified (existing key) | — | `{jira_key}` |
| Jira 404 (issue deleted) | Critical | `""` |
| Jira transient/network error | Warning | `{jira_key}` (preserve link) |
| sync-jira-story non-zero exit | Warning | `""` |
| sync-jira-story auth missing | Warning | `""` |

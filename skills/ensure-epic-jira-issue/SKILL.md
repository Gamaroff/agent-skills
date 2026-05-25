---
name: ensure-epic-jira-issue
description: 'Internal sub-routine called from review-story. Given an epic markdown file path, ensures the epic has a corresponding Jira issue. Creates it if missing by delegating to sync-jira-epic, and writes jira_key + jira_url to the epic frontmatter. Sets EPIC_JIRA_KEY (e.g. "PROJ-42") in caller scope, or empty string on failure. Jira-only: exits 0 with informational message when TRACKER!=jira. Callers branch on TRACKER (set by references/resolve-platform.sh) to pick the right sub-routine.'
type: internal
---

# Ensure Epic Jira Issue — Sub-Routine

## Purpose

This is an **internal sub-routine** called by `review-story`. Do not invoke directly via slash command.

## Inputs (set by the calling skill before invoking)

- `EPIC_FILE_PATH` — repo-relative path to the epic markdown file (e.g. `${PRD_ROOT}/infra/epics/epic.12.payments/epic.12.payments.md`; `${PRD_ROOT}` defaults to `docs/prd`)
- `TRACKER` — set by `references/resolve-platform.sh` in the calling skill (must be `jira` for this sub-routine to act)
- Env: `JIRA_URL`, plus Atlassian MCP credentials (cloudId derived from `JIRA_URL` hostname)

## Output (set by this sub-routine, available to the calling skill)

- `EPIC_JIRA_KEY` — Jira issue key (e.g. `PROJ-42`), or empty string on failure or skip

---

## Workflow

### Step EJ0: Guard — Jira-only check

If `TRACKER` is not set to `jira`:
```
ℹ️  Skipped: tracker is not jira (TRACKER=${TRACKER:-unset}) — ensure-epic-jira-issue is a no-op for non-Jira projects.
```
Set `EPIC_JIRA_KEY=""` and return. Do not proceed to EJ1.

### Step EJ1: Read Epic Frontmatter

Read the file at `EPIC_FILE_PATH`. Parse the YAML frontmatter block (between `---` delimiters). Extract:

- `jira_key` — current value (may be absent, null, or a string like `PROJ-42`)
- `jira_url` — current value (may be absent or null)
- `title` — epic title

If the file cannot be read: log warning `⚠️ Epic file not found at EPIC_FILE_PATH — setting EPIC_JIRA_KEY=""`, set `EPIC_JIRA_KEY=""`, and return.

### Step EJ2: Branch on jira_key Presence

**If `jira_key` is set and non-null** → go to Step EJ3 (verify existing key).

**If `jira_key` is absent, null, or empty string** → go to Step EJ4 (create via sync-jira-epic).

---

### Step EJ3: Verify Existing Jira Issue

Call the Atlassian MCP tool `getJiraIssue`:
- `cloudId`: derived from `JIRA_URL` hostname (e.g. `yourorg.atlassian.net`). If cloud resolution fails, call `getAccessibleAtlassianResources` and use the matching entry's `id`.
- `issueIdOrKey`: `{jira_key}`
- `fields`: `["status", "summary"]`

**On success** (issue returned):
- Set `EPIC_JIRA_KEY={jira_key}`.
- Verify `jira_url` shape (Step EJ5), then return.

**On 404 / issue not found**:
- Log critical: `Epic Jira issue {jira_key} not found — it may have been deleted. Manual investigation required.`
- Set `EPIC_JIRA_KEY=""`.
- Return. Do NOT silently re-create — orphan Jira issues would result.

**On other (transient/network) error**:
- Log warning: `Could not verify Jira issue {jira_key} — transient error. Returning current key without re-creating.`
- Set `EPIC_JIRA_KEY={jira_key}` (do not lose the link on a flaky network call).
- Return.

---

### Step EJ4: Create via sync-jira-epic Delegation

Invoke the `sync-jira-epic` sub-routine by executing the bundled script directly. Pass `EPIC_FILE_PATH` via `--file`:

```bash
node .agents/skills/sync-jira-epic/scripts/sync-jira-epic.js \
  --file "$EPIC_FILE_PATH"
```

> **Path note**: the script is bundled with the skill at `.agents/skills/sync-jira-epic/scripts/sync-jira-epic.js` (installed by `setup-consumer.sh`). Do **NOT** look for `.scripts/jira-sync*.js` in the consumer repo root — that path does not exist.

`sync-jira-epic` will:
- Create the Jira epic if it does not exist
- Write `jira_key` (and `jira_url` of shape `{JIRA_URL}/browse/{KEY}`) back to the epic frontmatter

> **Side-effect note**: `sync-jira-epic` may also advance the epic's Jira status from frontmatter and append a Change Log entry. These are accepted side effects for this task — a future `--no-status-transition` flag on `sync-jira-epic` would decouple them (out of scope here).

**If `sync-jira-epic` exits with a non-zero status or reports an auth error**:
- Log warning: `sync-jira-epic delegation failed — setting EPIC_JIRA_KEY=""`
- Set `EPIC_JIRA_KEY=""`.
- Return.

After delegation completes: re-read the epic frontmatter to capture the freshly-written `jira_key`. Continue to Step EJ5.

---

### Step EJ5: Verify jira_url Shape

Expected shape: `{JIRA_URL}/browse/{jira_key}` (e.g. `https://yourorg.atlassian.net/browse/PROJ-42`).

- If `jira_url` in frontmatter equals the expected shape → no action.
- If `jira_url` is absent, null, or mismatched → write the correct value to frontmatter:
  ```
  jira_url: {JIRA_URL}/browse/{jira_key}
  ```

---

### Step EJ6: Set Output

Set `EPIC_JIRA_KEY={jira_key}` in the calling skill's scope.

---

## Failure Handling Summary

All failures are **non-blocking**. The caller (`review-story`) handles empty output.

| Scenario | Log level | EPIC_JIRA_KEY returned |
|---|---|---|
| TRACKER != jira | Info | `""` |
| Epic file not found | Warning | `""` |
| Jira issue verified (existing key) | — | `{jira_key}` |
| Jira 404 (issue deleted) | Critical | `""` |
| Jira transient/network error | Warning | `{jira_key}` (preserve link) |
| sync-jira-epic non-zero exit | Warning | `""` |
| sync-jira-epic auth missing | Warning | `""` |

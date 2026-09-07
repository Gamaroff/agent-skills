---
name: ensure-bug-jira-issue
description: 'Internal sub-routine called from develop-bug and review-bug. Given a bug report markdown file path, ensures the bug has a corresponding Jira issue. Creates it if missing by delegating to sync-jira-bug (which infers the bug mode from the path, links the card to its parent story/task card, renders the Source Documents section, adds the bug to the backlog, and writes the Status History rows for creation and status transition), and writes jira_key + jira_url back — prepending a minimal frontmatter block first when the file has none. Sets BUG_JIRA_KEY (e.g. "PROJ-901") in caller scope, or empty string on failure. Jira-only: exits 0 with informational message when TRACKER!=jira. Jira sibling of ensure-bug-github-issue. Callers branch on TRACKER (set by references/resolve-platform.sh) to pick the right sub-routine.'
type: internal
invokes: [sync-jira-bug]
---

# Ensure Bug Jira Issue — Sub-Routine

## Purpose

This is an **internal sub-routine** called by `develop-bug` and `review-bug`. Do not invoke directly via slash command.

## Inputs (set by the calling skill before invoking)

- `BUG_FILE_PATH` — repo-relative path to the bug report (e.g. `docs/bugs/bug.12.a-thing/bug.12.a-thing.md`, `docs/tasks/task.67.qa-gate/task.67.bug.3.names.md`, or a story bug beside its story)
- `TRACKER` — set by `references/resolve-platform.sh` in the calling skill (must be `jira` for this sub-routine to act)
- Env: `JIRA_URL`, plus Atlassian MCP credentials (cloudId derived from `JIRA_URL` hostname)

## Output (set by this sub-routine, available to the calling skill)

- `BUG_JIRA_KEY` — Jira issue key (e.g. `PROJ-901`), or empty string on failure or skip

---

## Workflow

### Step BJ0: Guard — Jira-only check

If `TRACKER` is not set to `jira`:

```
ℹ️  Skipped: tracker is not jira (TRACKER=${TRACKER:-unset}) — ensure-bug-jira-issue is a no-op for non-Jira projects.
```

Set `BUG_JIRA_KEY=""` and return. Do not proceed to BJ1.

### Step BJ1: Read the Bug's Existing Key

Read the file at `BUG_FILE_PATH`. **It may have no YAML frontmatter at all** — roughly half the bug documents in a mature repo open with a `**Bug ID**:` header block instead. Do not treat a missing frontmatter block as an error.

Read both shapes at once rather than re-implementing the rules:

```bash
node .agents/skills/sync-jira-bug/references/bug-doc.js --file "$BUG_FILE_PATH"
```

It emits JSON carrying `mode`, `bug_id`, `parent_doc`, `parent_jira_key`, `has_frontmatter`, `jira_key`, `jira_url` and any `warnings`. Take `jira_key` from there.

If the file cannot be read: log warning `⚠️ Bug file not found at BUG_FILE_PATH — setting BUG_JIRA_KEY=""`, set `BUG_JIRA_KEY=""`, and return.

Surface any `warnings` to the user — a `related:` value disagreeing with the path means one of the two is wrong and someone should fix it — but do not halt on them.

### Step BJ2: Branch on jira_key Presence

**If `jira_key` is set and non-null** → go to Step BJ3 (verify existing key).

**If `jira_key` is absent, null, or empty string** → go to Step BJ4 (create via sync-jira-bug).

---

### Step BJ3: Verify Existing Jira Issue

Call the Atlassian MCP tool `getJiraIssue`:

- `cloudId`: derived from `JIRA_URL` hostname (e.g. `yourorg.atlassian.net`). If cloud resolution fails, call `getAccessibleAtlassianResources` and use the matching entry's `id`.
- `issueIdOrKey`: `{jira_key}`
- `fields`: `["status", "summary"]`

**On success** (issue returned):

- Set `BUG_JIRA_KEY={jira_key}`.
- Verify `jira_url` shape (Step BJ5), then return.

**On 404 / issue not found**:

- Log critical: `Bug Jira issue {jira_key} not found — it may have been deleted. Manual investigation required.`
- Set `BUG_JIRA_KEY=""`.
- Return. Do NOT silently re-create — orphan Jira issues would result.

**On other (transient/network) error**:

- Log warning: `Could not verify Jira issue {jira_key} — transient error. Returning current key without re-creating.`
- Set `BUG_JIRA_KEY={jira_key}` (do not lose the link on a flaky network call).
- Return.

---

### Step BJ4: Create via sync-jira-bug Delegation

```bash
node .agents/skills/sync-jira-bug/scripts/sync-jira-bug.js \
  --file "$BUG_FILE_PATH"
```

> **Path note**: the script is bundled with the skill at `.agents/skills/sync-jira-bug/scripts/sync-jira-bug.js` (installed by `setup-consumer.sh`).

`sync-jira-bug` will:

- Infer the bug **mode** — story / task / general — from the file's own path.
- Create the Jira bug if it does not exist (idempotent — searches by the `synced-from-{bug stem}` label first).
- Render a `Source Documents` section carrying link-marked entries to the bug report, its parent document, its parent's card and (story mode) the epic.
- **Link the card to its parent's card** as a Jira issue link, with the link type resolved by runtime introspection.
- Add the bug to the project backlog (Scrum boards only).
- Write `jira_key` and `jira_url` back — **prepending a minimal frontmatter block first if the file has none**, leaving the body verbatim.
- Insert the `**Jira**` and `**Bug File**` cross-reference lines.

> **The card is a sibling, not a child.** Jira cannot make a Bug a child of a Story without switching it to a sub-task type, which differs per board and would cost the bug its own backlog placement and transitions. The reasoning is in `sync-jira-bug/SKILL.md` §Parent linkage.
>
> **What the delegate also does**: `sync-jira-bug` advances the card's status from the bug's lifecycle status and appends a **Status History** row for that transition, plus one for the issue creation. Bug reports carry no Change Log — `## Status History` is the bug-type equivalent. See [document-change-log.md](references/document-change-log.md) §Exclusions.
>
> **The parent's card is never created as a side effect.** If the parent story or task has no `jira_key`, the bug card links the parent *document* and reports it. Sync the parent, then re-run this sub-routine — `linkIssues` is idempotent, so the card link lands on the second pass.

**If `sync-jira-bug` exits with a non-zero status or reports an auth error**:

- Log warning: `sync-jira-bug delegation failed — setting BUG_JIRA_KEY=""`
- Set `BUG_JIRA_KEY=""`.
- Return.

**If the run was deferred** (`reason: "deferred"` in `--json` output, because `access.tracker` restricts this run): no key exists yet and none was invented. Set `BUG_JIRA_KEY=""` and report the deferral. A placeholder key would defeat the `synced-from-*` dedup search that stops the *next* run creating a duplicate — turning a recoverable state into a permanent one.

After delegation completes: re-read the bug file to capture the freshly-written `jira_key`. Continue to Step BJ5.

---

### Step BJ5: Verify jira_url Shape

Expected shape: `{JIRA_URL}/browse/{jira_key}`.

- If `jira_url` in frontmatter equals the expected shape → no action.
- If `jira_url` is absent, null, or mismatched → write the correct value to frontmatter.

---

### Step BJ6: Set Output

Set `BUG_JIRA_KEY={jira_key}` in the calling skill's scope.

---

## Failure Handling Summary

All failures are **non-blocking**. The caller (`develop-bug`, `review-bug`) handles empty output.

| Scenario | Log level | BUG_JIRA_KEY returned |
| --- | --- | --- |
| TRACKER != jira | Info | `""` |
| Bug file not found | Warning | `""` |
| Filename matches no bug pattern | Warning | `""` (fix the filename first) |
| Jira issue verified (existing key) | — | `{jira_key}` |
| Jira 404 (issue deleted) | Critical | `""` |
| Jira transient/network error | Warning | `{jira_key}` (preserve link) |
| Parent has no card yet | Info | `{jira_key}` — document linked, card link lands on re-sync |
| No usable issue link type on the board | Warning | `{jira_key}` — description links only |
| `sync-jira-bug` non-zero exit | Warning | `""` |
| Create deferred by `access.tracker` | Info | `""` — never a placeholder |

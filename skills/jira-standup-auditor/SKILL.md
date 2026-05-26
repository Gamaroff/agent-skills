---
name: jira-standup-auditor
description: Audit recent Jira activity and local Git telemetry to compile a precise async daily standup update. Use when the user asks for "standup prep", "daily update", "async update", "EOD summary", "what did I do yesterday", or "what should I work on today".
---

# Jira Standup Auditor Skill

Generate comprehensive, hyper-factual async daily standup summaries by running the lookup scripts in this directory and correlating their JSON output.

## Prerequisites

Required env vars: `JIRA_URL`, `JIRA_USER_EMAIL`, `JIRA_API_TOKEN`. See [`references/setup.md`](references/setup.md) for token creation, scopes, and troubleshooting.

## Core Workflow

1. Run `bash ./scripts/get-recent-jira-activity.sh` to fetch matching issues plus changelog history filtered to the current user's `accountId`. Pagination is handled automatically (`nextPageToken`).
2. Run `bash ./scripts/get-local-git-activity.sh` to extract active branch, last-48h commits authored by the current Git user, and uncommitted file status.
3. Correlate: match ticket keys (e.g. `PROJ-123`) found in Git branch names, commit messages, or uncommitted file paths back to the issues returned by Jira.
4. Format an async standup update using this structure:

   ## 🗓️ Daily Standup Update

   ### 🛠️ Yesterday / Recent Work
   - **[KEY-123] Summary Title** (*Status: In Review*)
     - *Jira Activity*: e.g. "Moved status from In Progress to In Review".
     - *Workspace Telemetry*: relevant commits or staged files detected.

   ### 🚀 Today's Focus
   - Issues where `assignee` is the current user and `statusCategory != Done`. Highlight the active priority based on `currentLocalBranch` and recent commits.

   ### 🛑 Blockers / Flagged Items
   - Issues with non-empty `blockedByLinks` (list blocker key + status).
   - Issues currently `In Progress` whose `recentChanges` is empty for the lookback window — likely stalled.

## Guardrails

- Never dump raw JSON to the user. Parse it and present clean Markdown.
- Lookback window is set by the Jira script: `-1d` by default, auto-extended to `-3d` on Mondays. Don't restate this to the user unless asked.
- If the Git script returns `"status": "Not inside a valid git repository workspace"` or includes a `warning` field, mention it inline under *Workspace Telemetry* so the user knows local data is partial.
- If either script exits non-zero, surface the stderr message verbatim and stop — don't fabricate a report from half the data.

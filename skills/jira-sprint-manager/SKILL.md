---
name: jira-sprint-manager
description: Manage Jira sprints via the Agile REST API — start, close, audit velocity, check for unestimated issues, list future/active sprints, and migrate leftover scope to backlog or the next sprint. Use when the user mentions sprints, sprint planning, sprint closure, backlog grooming, or velocity.
---

# Jira Sprint Manager Skill

Safely drive Jira sprint state via the encapsulated bash scripts in `scripts/`. All scripts paginate, retry on 429/5xx, and emit JSON arrays — pipe straight into `jq`.

## Scripts

| Script | Purpose | Output |
|---|---|---|
| `check-auth.sh` | Verify credentials via `GET /myself`. Run first if anything errors. | JSON `{accountId, displayName, emailAddress, active}` |
| `references/jira-list-sprints.sh <board_id> [state]` | List sprints by state (`future,active` default). | JSON array `[{id, name, state, startDate, endDate, goal}]` |
| `references/jira-get-active-sprint.sh <board_id>` | Active sprint(s) for board. Empty array = none. | JSON array |
| `get-sprint-issues.sh <sprint_id>` | All issues in a sprint (paginated). | JSON array `[{key, summary, status, statusCategoryKey, resolution, points}]` |
| `manage-sprint-state.sh <sprint_id> active <iso_start> <iso_end>` | Activate sprint. Dates: ISO-8601 with TZ. | Status line |
| `manage-sprint-state.sh <sprint_id> closed` | Close sprint. | Status line |
| `move-sprint-issues.sh <target> <keys> [--dry-run]` | Move issues to sprint ID or `backlog`. Auto-chunks at 50. | Status line |
| `references/discover-sp-field.sh` | Print the Story Points custom field ID. | `customfield_NNNNN` |

## Key conventions

- **Date format:** `2026-05-26T09:00:00.000Z` (ISO-8601 with timezone). Plain dates are rejected — validated before request.
- **Done filter:** filter on `statusCategoryKey == "done"`, NOT `.status.name` (localization-safe).
- **Story Points field:** defaults to `customfield_10026` (team-managed). For company-managed projects run `bash references/discover-sp-field.sh` and export `JIRA_SP_FIELD`.

See [`references/jira-agile-api.md`](references/jira-agile-api.md) for API quirks (pagination, 50-key bulk limit, POST/PUT fallback, rate limits).

## Workflow 1: Starting a Sprint

1. **Find the sprint.** If user only gave board ID, run `bash references/jira-list-sprints.sh <board_id> future` and ask which to start.
2. **Check for conflicts.** Run `bash references/jira-get-active-sprint.sh <board_id>`. If non-empty, warn user unless parallel sprints are explicitly allowed.
3. **Audit scope.** Run `get-sprint-issues.sh <sprint_id>`.
4. **Estimation Rule.** Pipe through `jq '[.[] | select(.points == null or .points == 0)]'`. If non-empty, halt — list those keys and ask whether to estimate first.
5. **Confirm dates.** If start/end dates not provided, ask. Require ISO-8601 with timezone.
6. **Activate.** `manage-sprint-state.sh <sprint_id> active "<iso_start>" "<iso_end>"`.

## Workflow 2: Closing a Sprint

1. **Pull scope.** `get-sprint-issues.sh <sprint_id>`.
2. **Find incomplete.** `jq '[.[] | select(.statusCategoryKey != "done")]'`.
3. **Decide destination.** If incomplete list is non-empty, present keys and ask: move to **backlog** or to **next future sprint**? If next sprint, run `bash references/jira-list-sprints.sh <board_id> future` to surface candidates.
4. **(Optional) Preview.** Use `move-sprint-issues.sh <target> <keys> --dry-run` to confirm.
5. **Move.** `move-sprint-issues.sh <target_sprint_id|backlog> <comma_separated_keys>`.
6. **Close.** `manage-sprint-state.sh <sprint_id> closed`.

## Environment

Required:
- `JIRA_INSTANCE` — e.g. `yourcompany.atlassian.net`
- `JIRA_USER_EMAIL` — Atlassian account email
- `JIRA_API_TOKEN` — from https://id.atlassian.com/manage-profile/security/api-tokens

Optional:
- `JIRA_SP_FIELD` — Story Points field ID (default `customfield_10026`). Discover with `bash references/discover-sp-field.sh`.

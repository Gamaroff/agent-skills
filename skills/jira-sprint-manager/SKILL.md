---
name: jira-sprint-manager
description: Manage Jira sprints via the Agile REST API — start, close, audit velocity, check for unestimated issues, list future/active sprints, migrate leftover scope to backlog or the next sprint, and add or remove individual issues from sprints. Use when the user mentions sprints, sprint planning, sprint closure, backlog grooming, velocity, "add this ticket to the sprint", "move keys to the backlog", or "put PROJ-123 in the sprint".
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
| `references/jira-get-active-sprint.sh <board_id>` | Active sprint(s) for board (used by Workflow 3 to check for closed sprint). | JSON array |

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

1. **Pull sprint metadata.** Run `bash references/jira-list-sprints.sh <board_id> active` and surface the sprint's `name`, `goal`, `startDate`, and `endDate` to the user before proceeding. If today's date is before `endDate`, warn: *"Sprint end date is <endDate> — you are closing early. Continue?"* and require confirmation.

2. **Pull scope.** `get-sprint-issues.sh <sprint_id>`.

3. **Velocity snapshot.** Calculate before moving anything:
   - `planned_points` = sum of `.points` for all issues
   - `completed_points` = sum of `.points` for issues where `statusCategoryKey == "done"`
   - `velocity_pct` = `completed_points / planned_points * 100` (or `n/a` if planned = 0)
   - Flag issues marked done but with `resolution == null` — these may be falsely closed.
   - Display summary: `Completed: X / Y pts (Z%) | Done issues: N | Incomplete: M`

4. **Flag scope creep.** Issues added after sprint start cannot be detected via the API, but if the user knows of any mid-sprint additions, ask them to flag those keys now so they can be tracked separately in the destination decision.

5. **Find incomplete.** `jq '[.[] | select(.statusCategoryKey != "done")]'`. Present the list with key, summary, and points.

6. **Decide destination.** If incomplete list is non-empty, ask: move to **backlog** or to **next future sprint**?
   - If next sprint: run `bash references/jira-list-sprints.sh <board_id> future` to surface candidates. If no future sprint exists, warn: *"No future sprint found — issues will go to backlog unless you create one first."* and default to backlog.

7. **(Optional) Preview.** Use `move-sprint-issues.sh <target> <keys> --dry-run` to confirm.

8. **Move.** `move-sprint-issues.sh <target_sprint_id|backlog> <comma_separated_keys>`.

9. **Confirm close.** Before closing, display: *"About to close sprint '<name>'. This cannot be undone. Proceed?"* — require explicit confirmation.

10. **Close.** `manage-sprint-state.sh <sprint_id> closed`.

11. **Closure summary.** Emit a structured summary:
    ```
    Sprint closed: <name>
    Goal: <goal or "none set">
    Velocity: <completed_points> / <planned_points> pts (<pct>%)
    Done: <N> issues | Moved: <M> issues → <destination>
    Falsely-closed (done but unresolved): <keys or "none">
    ```
    Offer to kick off `/jira-sprint-review-prep` for sprint review ceremony prep.

## Workflow 3: Ad-hoc Issue Assignment (Add to Sprint / Eject to Backlog)

Use when the user wants to move individual or batch issues into a sprint or back to the backlog mid-cycle — outside of the full sprint open/close lifecycle.

### Add issues to a sprint

1. **Resolve sprint id.** If user supplies a sprint id, use it. Otherwise run `bash references/jira-list-sprints.sh <board_id>` and let user pick. If board id also unknown, refer to [`references/jira-agile-api.md`](references/jira-agile-api.md) for how to list boards.
2. **Check sprint state.** Run `bash references/jira-list-sprints.sh <board_id> future,active,closed` filtered to the target sprint id, or call `GET /rest/agile/1.0/sprint/<id>` directly and read the `state` field:
   - `active` → **Scope creep guard**: warn *"Adding issues to an active sprint constitutes mid-sprint scope creep. Proceed?"* — require explicit confirmation before continuing. Never skip this, even if user sounds confident.
   - `future` → no warning needed.
   - `closed` → abort: *"Sprint is closed. Pick a future or active sprint."*
3. **Estimation guard** (active sprints only). Run `bash scripts/get-sprint-issues.sh <sprint_id>` scoped to the target keys, or fetch issue fields individually, and pipe through:
   ```bash
   jq '[.[] | select(.points == null or .points == 0)] | map(.key)'
   ```
   If any keys are unestimated, list them and ask: *"These issues have no Story Points — estimate first or proceed anyway?"* Requires `JIRA_SP_FIELD` env var (default `customfield_10026`; discover with `bash references/discover-sp-field.sh`).
4. **Preview (optional).** `bash scripts/move-sprint-issues.sh <sprint_id> "<KEY-1,KEY-2>" --dry-run`
5. **Execute.** `bash scripts/move-sprint-issues.sh <sprint_id> "<KEY-1,KEY-2>"`

### Eject issues to backlog

1. For batches > 5 keys, confirm: *"About to move N issues to backlog. Confirm?"*
2. **Preview (optional).** `bash scripts/move-sprint-issues.sh backlog "<KEY-1,KEY-2>" --dry-run`
3. **Execute.** `bash scripts/move-sprint-issues.sh backlog "<KEY-1,KEY-2>"`

## Environment

Required:
- `JIRA_INSTANCE` — e.g. `yourcompany.atlassian.net`
- `JIRA_USER_EMAIL` — Atlassian account email
- `JIRA_API_TOKEN` — from https://id.atlassian.com/manage-profile/security/api-tokens

Optional:
- `JIRA_SP_FIELD` — Story Points field ID (default `customfield_10026`). Discover with `bash references/discover-sp-field.sh`.

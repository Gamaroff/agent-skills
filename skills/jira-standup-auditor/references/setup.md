# Setup — jira-standup-auditor

## Required environment variables

| Var | Example | Notes |
|-----|---------|-------|
| `JIRA_URL` | `your-tenant.atlassian.net` | Host only. Scheme + trailing slash are stripped automatically. |
| `JIRA_USER_EMAIL` | `you@example.com` | Atlassian account email used for Basic auth. |
| `JIRA_API_TOKEN` | `ATATT3x...` | Create at <https://id.atlassian.com/manage-profile/security/api-tokens>. |

The skill uses `currentUser()` in JQL (email is banned in JQL since 2019) and resolves your `accountId` via `/rest/api/3/myself` on every run, so no extra config is needed.

## Required tooling

- `curl`
- `jq` (>= 1.6)
- `git`

## API endpoints used

- `GET  /rest/api/3/myself` — resolve accountId.
- `POST /rest/api/3/search/jql` — paginated search. The legacy `GET /rest/api/3/search` was retired by Atlassian in May 2025.

## Lookback behaviour

- Default lookback is `-1d`.
- On Mondays the script auto-extends to `-3d` so Friday's work is captured.
- Override by passing an explicit JQL relative expression as `$1`, e.g. `bash get-recent-jira-activity.sh -2d`.

## Token scopes

A standard user API token is sufficient. The skill performs read-only requests:

- Read `myself`.
- Search issues you can see (`assignee = currentUser() OR reporter = currentUser()`).

## Troubleshooting

- **HTTP 401** — token expired or wrong email/host combination.
- **HTTP 410 / 404 on search** — your tenant is still on the legacy endpoint; the new `search/jql` is enabled on all Cloud tenants since May 2025. Verify `JIRA_URL` is a Cloud host (`*.atlassian.net`), not a Server/DC URL.
- **Empty `recentChanges`** — Jira privacy mode hides email but not accountId; the script already filters on accountId, so this usually means the user genuinely made no transitions in the lookback window.
- **`recentCommits: []` with a warning field** — `git config user.email` is not set in the local repo. Run `git config user.email you@example.com` (or `--global`).

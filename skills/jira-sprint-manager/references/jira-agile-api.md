# Jira Agile API quirks (reference)

Base: `https://$JIRA_INSTANCE/rest/agile/1.0/`

## Pagination

`/board/{id}/sprint` and `/sprint/{id}/issue` return `{values|issues, startAt, maxResults, total, isLast}`. Default `maxResults=50`. All list-returning scripts in this skill paginate via `_lib.sh` helpers (`jsm_paginate_values`, `jsm_paginate_issues`). Do not hand-roll pagination — call the helpers.

## Story Points custom field

No universal ID. Common defaults:
- Company-managed projects: `customfield_10016` ("Story Points")
- Team-managed projects: `customfield_10026` ("Story Points estimate")

Discover for your tenant: `bash shared/resources/discover-sp-field.sh` → emits the field ID. Export as `JIRA_SP_FIELD`.

## Status localization

`.fields.status.name` and `.fields.status.statusCategory.name` are localized strings. Filter on `.statusCategory.key` instead — stable values: `"new"`, `"indeterminate"`, `"done"`.

The closing workflow filters issues where `statusCategoryKey != "done"`.

## Sprint dates

`startDate` / `endDate` must be ISO-8601 with timezone:
- `2026-05-26T09:00:00.000Z` (UTC)
- `2026-05-26T09:00:00.000+0200` (offset)

Plain `2026-05-26` is rejected with HTTP 400. `_lib.sh` `jsm_validate_iso8601` enforces this before the request.

## State transition verb

Documented endpoint: `POST /rest/agile/1.0/sprint/{id}` for partial update. Some tenants/proxies reject POST → `manage-sprint-state.sh` falls back to PUT automatically.

## Bulk move limit

`POST /sprint/{id}/issue` and `POST /backlog/issue` accept at most 50 issue keys per call. `move-sprint-issues.sh` chunks input into 50-key batches.

## Rate limits

Jira Cloud rate-limits with HTTP 429. `jsm_curl` retries on 429 and 5xx with exponential backoff (1s → 2s → 4s, max 4 attempts).

## Auth

Email + API token, sent via `Authorization: Basic` header (not `-u`, which would leak creds via `ps`). Helper `jsm_auth_header` builds the header.

Generate token: https://id.atlassian.com/manage-profile/security/api-tokens

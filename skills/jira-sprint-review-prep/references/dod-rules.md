# Definition of Done — Audit Rules

Used by `compile-sprint-review-agenda.sh` to evaluate every issue in `statusCategoryKey == "done"`.

## Default Rules (configurable)

An issue marked Done passes DoD iff **all** of:

1. **Resolution set** — `fields.resolution.name` is non-null. A status of "Done" with `resolution: null` typically indicates the issue was force-closed without proper transition.
2. **QA approval recorded** — the QA custom field (`$JIRA_QA_FIELD`, default `customfield_10090`) is not in `{"Not Tracked", ""}`. Object-valued fields are unwrapped via `.value` or `.name`. Null is normalized to `"Not Tracked"` upstream in `compile-sprint-review-data.sh`, so the agenda formatter only handles strings.

Failures are surfaced inline as `⚠️ DoD Audit Warned (missing: …)` rather than blocking the agenda — sprint review is informational.

## Customizing

- Override the QA field per project via env: `JIRA_QA_FIELD` (default `customfield_10090`). (`JIRA_SP_FIELD` controls story-point reporting, not DoD.)
- For richer rules (e.g. linked PR merged, test coverage delta, security review label), extend the `dod_status` jq function in `scripts/compile-sprint-review-agenda.sh`.

## Why these defaults

- `resolution` is the single most reliable Jira signal that closure was deliberate.
- A QA field check catches the common pattern where devs transition to Done before QA signs off.
- Both are cheap (one extra field fetch) and project-agnostic.

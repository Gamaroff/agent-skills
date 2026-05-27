---
name: jira-sprint-review-prep
description: Automate data collection for the Sprint Review ceremony. Collects completed increments, evaluates compliance with the Definition of Done (DoD), highlights scope creep or uncompleted items, and formats a polished meeting agenda or release notes. Use this when the user asks to "prepare for sprint review," "compile demo agenda," or "generate release notes."
---

# Jira Sprint Review Prep Skill

Automate the administrative overhead of compiling sprint review artifacts. Scripts are deterministic and self-contained — orchestrator just chains them.

## Prerequisites

**Binaries:** `bash`, `curl`, `jq`.

**Required env vars:**
- `JIRA_INSTANCE`, `JIRA_USER_EMAIL`, `JIRA_API_TOKEN` — auth.
- `JIRA_SP_FIELD` — Story Points custom field ID. Default `customfield_10026` is the team-managed Atlassian default but tenant-specific in practice. Discover with `bash ./references/discover-sp-field.sh`.
- `JIRA_QA_FIELD` — QA approval custom field ID. Default `customfield_10090` is **not** an Atlassian standard and almost certainly will not match. List candidates with `bash ./references/discover-qa-field.sh` and export the right one.

> ⚠️ The defaults exist so the scripts run, not because they are correct. Run the discovery scripts above before relying on the velocity numbers or DoD audit.

## Core Workflow: Compile the Sprint Review Agenda

1. **Resolve sprint id.** If user gives a `<sprint_id>` directly, use it. Else run `bash ./references/jira-get-active-sprint.sh <board_id>`; expect a JSON array. Length 0 → abort ("no active sprint on board"). Length 1 → extract via `jq -r '.[0].id'`. Length > 1 → prompt the user to pick.
2. **Fetch + normalize data:**
   ```bash
   bash ./scripts/compile-sprint-review-data.sh <sprint_id> > "$(mktemp -t sprint-data.XXXXXX.json)"
   ```
   Output JSON schema (`null`-able fields annotated):
   ```
   { sprint: { id, name, goal (""-able), startDate (nullable),
               endDate (nullable), state },
     issues: [{ key, summary, status, statusCategoryKey,
                resolution (nullable), points (number, 0 if unset),
                qaApproval (string, "Not Tracked" if unset),
                addedMidSprint (bool),
                addedDate (nullable ISO-8601) }] }
   ```
   Classification rules baked in:
   - **Done** = `statusCategoryKey == "done"` (localization-safe; do NOT match on `.status.name`).
   - **Mid-sprint creep** = changelog event added this `sprint_id` to the Sprint field **after** `sprint.startDate`. Initial pre-start assignments are excluded.
3. **Render agenda:**
   ```bash
   bash ./scripts/compile-sprint-review-agenda.sh <data.json>
   ```
   Or pipe: `compile-sprint-review-data.sh <sid> | compile-sprint-review-agenda.sh`.

The agenda script emits markdown matching the three-section framework (Shipped Increment / Uncompleted Work / Scope Creep Audit) with three velocity lines: **committed** (`done_pts_of_committed / committed_pts`), **mid-sprint creep** (`done_pts_of_creep / creep_pts`), and **total**. Headline ratio uses committed only — creep is reported separately so the review can honestly distinguish "delivered against commitment" from "absorbed mid-sprint scope".

## Alternate Workflow: Release Notes

Same data, different formatter:
```bash
bash ./scripts/compile-sprint-review-data.sh <sprint_id> | bash ./scripts/compile-release-notes.sh
```
Emits a stakeholder-facing changelog: shipped items only, mid-sprint additions flagged, DoD failures marked ⚠️ so a release manager can hold publication.

## Definition of Done Rules

Codified in `compile-sprint-review-agenda.sh` and `compile-release-notes.sh`; full spec in [references/dod-rules.md](./references/dod-rules.md). Default: a Done issue passes iff `resolution != null` AND QA approval field is populated (not `""` or `"Not Tracked"`). Failures render inline as `⚠️ DoD Audit Warned (missing: …)` — informational only, never blocks the agenda. This is a **lightweight audit**, not a full DoD (which would also include PR merged, tests, security review). Extend by editing the `dod_status` jq function.

## Customizing the Output

- Re-tune DoD: edit the `dod_status` jq function in `scripts/compile-sprint-review-agenda.sh` (and `compile-release-notes.sh` if needed).
- Release notes vs. agenda: pick the formatter that fits — both consume the same JSON.

## Guardrails

- Scripts use `set -euo pipefail` and source the shared lib at `references/jira-sprint-lib.sh` (bundled into each skill's `references/` via `npm run bundle`) — pagination + 429/5xx retry + auth-via-header to avoid leaking creds in `ps`.
- Pagination handles sprints with >50 issues.
- If `sprint.startDate` is null (sprint never started), mid-sprint detection disables with a warning rather than producing false positives; `addedDate` is also suppressed.
- Mid-sprint detection compares `changelog.created > sprint.startDate` as ISO-8601 strings. Works because Jira emits both in the same form (`+0000`); custom-TZ tenants may need code adjustment.
- An issue removed then re-added mid-sprint is flagged as creep on the re-add. We do not correlate against "removed" events.
- **Active vs closed sprint membership.** The Agile API `/sprint/{id}/issue` returns *current* membership for active sprints and a snapshot at closure time for closed sprints. Issues removed mid-sprint won't appear in either case. Run the agenda against a closed sprint for a stable retrospective view.
- Tone: professional, objective, metric-focused — optimized for cross-functional stakeholders and product owners.

## Tests

Fixture-replay test (no live Jira) at `tests/fixture.test.sh`. Run:
```bash
bash skills/jira-sprint-review-prep/tests/fixture.test.sh
```
Locks the JSON → markdown contract for both formatters.

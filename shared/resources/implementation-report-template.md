---
name: implementation-report-template
description: The one definition of what sections a pipeline implementation report has — story, task and bug variants, with the optional section marked. Read by develop-pipeline-step-0-resolve-and-prepare.md §0e (the writer) and by report-lint.js (the reader), so the authoring template and the lint cannot drift apart.
---

# Implementation Report Template

This file is the **single definition** of an implementation report's sections. Two readers consume
it, and that is the point: `develop-pipeline-step-0-resolve-and-prepare.md` §0e tells the
orchestrator to create the report from the variant below, and `report-lint.js` derives its expected
section list from the same fences. Before task.124 the templates were inlined in §0e and no reader
ever checked a report against them — which is how task.117's HALT commit shipped a report doubled
and spliced mid-line (obs #115). Two definitions of "what sections a report has" would drift
silently; one definition, read by both, cannot.

**How the linter reads this file.** Each `## … variant` heading below is followed by one fenced
`markdown` block. Every line in that block beginning `## ` is a section the report of that variant
must carry **exactly once, in this order**. A section whose heading line carries the marker
`<!-- optional -->` may be **omitted** (and, when present, appears at most once). Everything else
in the fence — the header block, table shapes, placeholder text — is authoring guidance for §0e and
is not linted. A report may carry sections this file does not name (the PreCompact hook appends a
`## Pipeline Paused — …` section, for one); those are ignored by the order and count checks.

**`## Tracker Actions Required` is optional by contract**, not by accident: the template's own text
says to omit the section entirely when the tracker-actions journal is empty, because an empty
heading reads as "nothing was deferred" in the same shape it would read as "the renderer broke".
The marker makes that documented omission a non-finding rather than a `section-missing`.

---

## Story variant

Created as `story.{epic}.{story}.implementation.{N}.{descriptive-name}.md` in the story directory.

```markdown
# Implementation Report: {story title}

**Story**: `{story filename}`
**Run Number**: {N}
**Started**: {YYYY-MM-DD HH:MM}
**Status**: In Progress

---

## Summary

{One-line description derived from the story name and what this run is attempting}

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | {feature branch base — default `develop`}                                  |
| PR target           | {PR target — default `develop`}                                            |
| qa-planning gate    | skipped (auto)                                                             |
| Story risk level    | {risk_level value or not set}                                              |
| Pipeline mode       | {lite / standard}                                                          |
| Always-load files   | {N} files — {comma-separated paths, or "defaults (no skills-config.yaml)"} |
| Board status        | {In Progress ✅ / ⚠️ update failed / N/A (no issue linked)}                |

---

## Pipeline Progress

| Step                        | Status     | Required Artifacts                                                                           | Notes | Subagent summary ref |
| --------------------------- | ---------- | -------------------------------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-story-branch      | ⏳ Pending | Branch `feature/story.{epic}.{story}.*` exists in git                                        |       | —                    |
| 2. review-story             | ⏳ Pending | `story.{epic}.{story}.review.{N}.{name}.md` exists (or skip logged)                          |       | —                    |
| 3. develop                  | ⏳ Pending | Story status == `Ready for Review`                                                           |       | —                    |
| 4. create-pr                | ⏳ Pending | PR URL targets `develop` (or chosen base); issue/tracker comment posted                      |       | —                    |
| 5–6. qa-story / qa-fix loop | ⏳ Pending | `story.{epic}.{story}.qa.{N}.*.md`; `story.{epic}.{story}.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                 | ⏳ Pending | `story.{epic}.{story}.dod.{N}.*.md`; story `status: accepted`                                |       | —                    |
| 8. commit-changes           | ⏳ Pending | All artifacts committed and pushed                                                           |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `shared/resources/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — {YYYY-MM-DD}

- Feature branch base: {answer} — default `develop`
- PR target branch: {answer} — default `develop`
- qa-planning gate: skipped (auto — no prompt)

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## Tracker Actions Required <!-- optional -->

_Tracker mutations this run wanted but did not perform — because `access.tracker` restricts this
run, or because the call failed. Rendered from `.claude/state/tracker-actions.jsonl` by
`handover-render.js --format summary`; the committed checklist, script and JSON sidecar are the
`*.handover.{n}.{name}.{md,sh,json}` artifacts beside this report. **Omit this section entirely when
the journal is empty** — an empty heading reads as "nothing was deferred" in the same shape it would
read as "the renderer broke"._

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: {populated after Step 1}
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}
```

---

## Task variant

Created as `task.{id}.implementation.{N}.{descriptive-name}.md` in the task directory.

```markdown
# Implementation Report: {task title}

**Task**: `{task filename}`
**Run Number**: {N}
**Started**: {YYYY-MM-DD HH:MM}
**Status**: In Progress

---

## Summary

{One-line description derived from the task name and what this run is attempting}

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | {Q1 answer}                                                                |
| PR target           | {Q2 answer}                                                                |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | {risk_level value or not set}                                              |
| Pipeline mode       | {lite / standard}                                                          |
| Always-load files   | {N} files — {comma-separated paths, or "defaults (no skills-config.yaml)"} |
| Board status        | {In Progress ✅ / ⚠️ update failed / N/A (no issue linked)}                |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ⏳ Pending | Branch `feature/task.{id}.*` exists in git                             |       | —                    |
| 2. review-task             | ⏳ Pending | `task.{id}.review.{N}.{name}.md` exists (or skip logged)               |       | —                    |
| 3. develop                 | ⏳ Pending | Task status == `Ready for Review`                                      |       | —                    |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.{id}.qa.{N}.*.md`; `task.{id}.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.{id}.dod.{N}.*.md`; task `status: accepted`                      |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `shared/resources/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — {YYYY-MM-DD}

- Feature branch base: {Q1 answer} — {rationale}
- PR target branch: {Q2 answer} — {rationale}
- qa-planning gate: skipped (auto — no prompt)

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## Tracker Actions Required <!-- optional -->

_Tracker mutations this run wanted but did not perform — because `access.tracker` restricts this
run, or because the call failed. Rendered from `.claude/state/tracker-actions.jsonl` by
`handover-render.js --format summary`; the committed checklist, script and JSON sidecar are the
`*.handover.{n}.{name}.{md,sh,json}` artifacts beside this report. **Omit this section entirely when
the journal is empty** — an empty heading reads as "nothing was deferred" in the same shape it would
read as "the renderer broke"._

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: {populated after Step 1}
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}
```

---

## Bug variant

Created as `{bug-prefix}.implementation.{N}.{descriptive-name}.md` in the bug directory by
`/develop-bug` (its §0e lives in `skills/develop-bug/references/develop-bug-step-0-resolve-bug.md`,
which is the authoring source for the header block and table shapes; the section list here is what
the linter holds it to).

```markdown
---
type: implementation-report
status: in-progress
bug: '{bug-prefix}'
mode: '{story|task|general}'
started: '{YYYY-MM-DDTHH:MM:SSZ}'
---

# Implementation Report — {bug-prefix}

**Started:** {timestamp}
**Finished:** —
**Final Status:** In Progress
**Branch model:** {BRANCH_MODEL} (base: {BASE_BRANCH}, PR target: {PR_TARGET})
**Severity / Priority:** {severity} / {priority}
**Lite mode:** {on|off}
**Fix Iterations:** 0

## Pipeline Progress

| Step | Skill | Status | Notes | Subagent summary ref |
|------|-------|--------|-------|----------------------|
| 1 | create-branch | ⏳ Pending | | |
| 2 | review-bug | ⏳ Pending | | |
| 3 | investigate-fix | ⏳ Pending | | |
| 4 | create-pr | ⏳ Pending | | |
| 5–6 | verify-fix loop | ⏳ Pending | | |
| 7 | finalise-close | ⏳ Pending | | |
| 8 | commit-changes | ⏳ Pending | | |

## Decisions Log

- {timestamp} — Bug resolved: {path} (mode={mode})

## Issues Log

## Completion

**Branch:** —
**PR:** —
**DoD Summary:** —
```

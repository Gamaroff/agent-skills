# Implementation Report: Probe sandbox HOME shared across cases

**Task**: `task.306.probe-sandbox-home-shared-across-cases.md`
**Run Number**: 1
**Started**: 2026-11-13 12:40
**Status**: In Progress

---

## Summary

Give each (case, shell) run of the /finalise security probe its own HOME and TMPDIR so a legitimate case on a state-changing control is no longer read as a defect.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set                                                                    |
| Pipeline mode       | standard                                                                   |
| Always-load files   | defaults (resolved in Step 3)                                              |
| Board status        | N/A (no issue linked)                                                      |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.{id}.*` exists in git                             | Branch created at `3817a631` | —                    | 2026-11-13T14:23Z |
| 2. review-task             | ✅ Done | `task.{id}.review.{N}.{name}.md` exists (or skip logged)               | 8/10, 0 Critical, 6 Important + 2 Optional fixed in the document; status → ready-for-development; pre-pass done inline (no independent review) | —                    | 2026-11-13T14:24Z |
| 3. develop                 | ✅ Done | Task status == `Ready for Review`                                      | Per-run HOME/TMPDIR in 4 arms; 7 tests (mutation-proved both ways); suite 319 pass; remote ci:fast 8468 pass 0 fail; wall-time ratio NOT measured (laptop load 5–22 swamped it) | —                    | 2026-11-13T15:27Z |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.{id}.qa.{N}.*.md`; `task.{id}.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.{id}.dod.{N}.*.md`; task `status: accepted`                      |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-13

- Feature branch base: develop — source: recommended (develop-next --defaults)
- PR target branch: develop — source: recommended (develop-next --defaults)
- Mode: standard — source: detector (risk_level absent, phase_count 4 ≥ 3 → standard; Phase 0 run inline, no Agent 3)
- qa-planning gate: skipped (auto — no prompt)
- Tracker: none linked (no github_issue / jira_key) — tracker signals skipped
- Questions asked: 0

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

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

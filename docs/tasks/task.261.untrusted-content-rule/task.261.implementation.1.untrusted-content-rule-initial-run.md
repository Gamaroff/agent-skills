# Implementation Report: Untrusted-content rule

**Task**: `task.261.untrusted-content-rule.md`
**Run Number**: 1
**Started**: 2026-11-05 00:00
**Status**: In Progress

---

## Summary

Add the shared untrusted-content rule, cite it from every skill that reads third-party prose, and hold it with a lint test (launched by develop-next).

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set                                                                    |
| Pipeline mode       | standard                                                                   |
| Always-load files   | defaults (resolved at Step 3)                                              |
| Board status        | N/A (no issue linked)                                                      |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.261.*` exists in git                              | Branch created at `d78e4e01` |  —                   | 2026-11-05T06:46Z |
| 2. review-task             | ✅ Done    | `task.261.review.{N}.{name}.md` exists (or skip logged)               | READY 8/10; 2 Important fixed | — | 2026-11-05T06:47Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | rule doc, 6 citations, path bound x3, lint test (20 tests); mutation-proved | — | 2026-11-05T06:59Z |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.261.qa.{N}.*.md`; `task.261.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.261.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

---

## Decisions Log

### Pipeline Startup — 2026-11-05

- Feature branch base: develop — source: recommended (--defaults)
- PR target branch: develop — source: recommended (--defaults)
- Mode: standard — source: detector (risk_level absent, 4 phases, so not lite)
- qa-planning gate: skipped (auto — no prompt)
- Phase 0 ran inline (no Explore fan-out): document read directly; no github_issue or jira_key linked.

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
**Branch**: feature/task.261.untrusted-content-rule
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}

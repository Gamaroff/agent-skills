# Implementation Report: Task registry rows sit under the table header

**Task**: `task.317.task-registry-rows-sit-under-the-table-header.md`
**Run Number**: 1
**Started**: 2026-11-21 19:40
**Status**: In Progress
**Report format**: 2

---

## Summary

Move the 31 stranded registry rows (286–316) under the table header, add a placement test, and state the placement rule in the writers' prose.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set                                                                    |
| Pipeline mode       | standard                                                                   |
| Always-load files   | defaults (no skills-config.yaml devLoadAlwaysFiles resolved inline)        |
| Board status        | N/A (no issue linked)                                                      |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.317.*` exists in git                              | Branch created at `7d1e7134d` |  —                    | 2026-11-21T19:41Z |
| 2. review-task             | ✅ Done | `task.317.review.1.task-registry-rows-sit-under-the-table-header.md` exists | READY TO IMPLEMENT 9/10; 2 Important fixed; promoted to ready-for-development | —                    | 2026-11-21T19:42Z |
| 3. develop                 | ✅ Done | Task status == `Ready for Review`                                      | Inline; 32 rows moved, placement test red→green, mutation caught; ci:fast 8709 pass | —                    | 2026-11-21T19:52Z |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.317.qa.{N}.*.md`; `task.317.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.317.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-21

- Feature branch base: develop — source: asked (Recommended option chosen)
- PR target branch: develop — source: asked (Recommended option chosen)
- qa-planning gate: skipped (auto — no prompt)
- Phase 0 run inline (no Explore fan-out): lite-mode inputs derived from the document — risk_level absent, phase_count 3, so PIPELINE_MODE=standard (phase_count is not < 3).
- Tracker: github, no `github_issue` in frontmatter — issue references skipped.
- Task status `planned` — proceeds; Step 2 review-task validates.
- No wireframe block, `ui.wireframeMap` unset — 0c-wire skipped.
- review-task output: Comprehensive report — required for pipeline audit trail. Step 8.5 auto-answered: apply all critical + important fixes. Step 9 auto-answered: fixes complete → ready-for-development. Review report: task.317.review.1.task-registry-rows-sit-under-the-table-header.md.
- Review pre-pass run inline (no Explore dispatch); independent review did not run.
- Step 2 finding: the registry gained task 317's own row, so 32 rows are stranded, not 31; the task, plan and test floor (317) were corrected.
- Tracker comment at Step 2 skipped: no issue linked.
- Plan file found: task.317.plan.task-registry-rows-sit-under-the-table-header.md — included as implementation context.
- Pre-develop surface map: 7 files identified in docs/tasks (registry), evals/shared/tests (drift test), docs/standards, skills/create-task, CHANGELOG — performed inline (no Explore dispatch; independent review did not run — the plan's Files Summary already enumerates every target, and Explore subagents have hung in this repo).
- Step 3 inline — /develop not invoked: the plan names every hunk. Draft/Planned gate not applicable. Loop audit inline: all 3 phases ticked, status set to ready-for-review (single pass, no re-entry).
- Develop evidence: placement test red on the original layout (32 rows outside the table, first task 286 at line 407), green after the move (8 of 8 in the drift file); sorted-line diff of the registry vs HEAD is empty (rows moved byte for byte); `--annotate` on a scratch copy: `no-cell` before, `annotated` after; selector dry run picks T290 before and after; mutation (a row inserted below ## Notes) turned only the placement test red and named the row; CHANGELOG placement block: no added bullets below the first release heading.
- Fast gate: `npm run test:remote` could not reach ci@192.168.1.249 (SSH timed out); ran `TEST_LOCAL=1 npm run test:remote` as the project rule allows. First run failed only on `prettier --check` for the new test file; ran Prettier on that file; second run exit 0 (8709 pass, 0 fail, 3 skipped).
- No `npm run bundle` change: the create-task prose lives in SKILL.md, which no `references/` copy mirrors (bundle run touched nothing).
- Session Start (observe-work): doctor healthy; 3 open observations (#170, #172, #173); last review 2026-11-17.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- LAN test server unreachable at Step 3 (SSH timeout); gate run locally instead. The laptop runs hot under the local suite; no action needed.
- First local gate failed on Prettier for `evals/shared/tests/task-registry-drift.test.mjs`; fixed by formatting that file, second gate green.

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: feature/task.317.task-registry-rows-sit-under-the-table-header
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}

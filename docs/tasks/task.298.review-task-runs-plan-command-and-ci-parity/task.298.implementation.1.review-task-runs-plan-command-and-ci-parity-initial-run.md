# Implementation Report: review-task runs a plan's command and checks CI parity

**Task**: `task.298.review-task-runs-plan-command-and-ci-parity.md`
**Run Number**: 1
**Started**: 2026-11-13 07:40
**Status**: In Progress

---

## Summary

Add a review-task check that runs a plan's own command once (dry-run or scratch target) and a create-task "Should Add" parity item, with tests and bundle.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set                                                                    |
| Pipeline mode       | standard                                                                   |
| Always-load files   | defaults (no skills-config.yaml devLoadAlwaysFiles)                        |
| Board status        | N/A (no issue linked)                                                      |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.298.*` exists in git                              | Branch created at `1634c521` |  —                    | 2026-11-13T07:33Z |
| 2. review-task             | ✅ Done    | `task.298.review.{N}.{name}.md` exists (or skip logged)                | READY TO IMPLEMENT 8/10; 0 critical, 5 important fixed | —                    | 2026-11-13T07:53Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 1 iteration, inline; fast gate green (TEST_EXIT=0, fail 0) | —                    | 2026-11-13T08:01Z |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.298.qa.{N}.*.md`; `task.298.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.298.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-13

- Feature branch base: develop — source: recommended (develop-next `--defaults`)
- PR target branch: develop — source: recommended (develop-next `--defaults`)
- Pipeline mode: standard — source: detector (3 phases, two skills touched → not lite)
- qa-planning gate: skipped (auto — no prompt)
- Phase 0 run inline (no parallel agents dispatched); no tracker issue linked (no `github_issue:` in frontmatter) — tracker signals skipped.

### Step 2 — Review

- Review report: `task.298.review.1.review-task-runs-plan-command-and-ci-parity.md`
- review-task output: Comprehensive report — required for pipeline audit trail
- review-task Step 8.5 auto-answered: Yes, apply all critical + important fixes — pipeline proceeds autonomously.
- review-task Step 9 auto-answered: Yes, fixes complete — status Planned → Ready for Development.
- Pre-pass subagents (architecture, codebase) not dispatched; done inline. Independent review did not run.
- Tracker: no issue linked, no tracker comment posted.

### Step 3 — Develop

- Plan file found: `task.298.plan.review-task-runs-plan-command-and-ci-parity.md` — included as implementation context.
- Pre-develop surface map (inline, no Explore subagent): 4 files — `skills/review-task/SKILL.md`, `skills/create-task/SKILL.md`, `tests/review-plan-shape-checks.test.js` (style model), `tests/lib/markdown-section.js` (reader).
- Step 3 inline — /develop not invoked: plan names every hunk and the surface map is recorded.
- Loop audit done inline (no Explore subagent): all plan checkboxes ticked, status → ready-for-review. Independent audit did not run.
- Fast gate (`npm run test:remote`, LAN server): TEST_EXIT=0, `fail 0`, tmp-leak ratchet ok.
- Mutation proof (scratch copy, `REVIEW_RUN_PARITY_ROOT`): dropping the no-safe-form clause → 1 red; dropping the create-task bullet → 3 red; renaming check 31 → 6 red.
- `npm run bundle`: no bundled copy changed (SKILL.md files are not bundled).

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
**Branch**: feature/task.298.review-task-runs-plan-command-and-ci-parity
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}

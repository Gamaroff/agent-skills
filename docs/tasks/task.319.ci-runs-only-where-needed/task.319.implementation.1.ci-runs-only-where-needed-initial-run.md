# Implementation Report: Pipelines spend a CI run only where a run can answer something

**Task**: `task.319.ci-runs-only-where-needed.md`
**Run Number**: 1
**Started**: 2026-11-24 09:43
**Status**: In Progress
**Report format**: 2

---

## Summary

Push record-only commits with the next push that needs CI, add an opt-in skip marker, stop two finalise halts that are not defects, and close two Bitbucket gaps.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | docs/task-319-ci-runs-only-where-needed                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | medium                                                                     |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | N/A (not yet signalled)                                                    |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.319.*` exists in git                              | Branch created at `cc8b7afca` | —                    | 2026-11-24T09:44Z |
| 2. review-task             | ⏭️ Skipped | `task.319.review.{N}.{name}.md` exists (or skip logged)                | Ready for Development + `review.2` exists | —                    | 2026-11-24T09:44Z |
| 3. develop                 | ⏳ Pending | Task status == `Ready for Review`                                      |       | —                    |                 |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.319.qa.{N}.*.md`; `task.319.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.319.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-24

- Feature branch base: docs/task-319-ci-runs-only-where-needed — source: asked (the task document exists only there; develop + 3 docs commits)
- PR target branch: develop — source: asked
- Mode: standard — source: detector (risk medium, 7 phases, several modules: lite not eligible). Detector inputs read in-line by the orchestrator (Agent 3 not dispatched).
- qa-planning gate: skipped (auto — no prompt)
- Upfront questions asked: 2 (Q1, Q2)
- Input `319` resolved as task.319 (a bare number is a task id first).
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Reviews 1 and 2 committed on the docs branch (`cc8b7afca`) before the feature branch was cut.
- Branch `feature/task.319.ci-runs-only-where-needed` cut in-line at `cc8b7afca` (no push: Step 4 pushes it).
- Tracker: pipeline-start comment on #936 `posted`; board work-started: Todo → In Progress (verified).
- Step 2 skipped: status `Ready for Development` and review report 2 exists (gate table row 3, develop-task).
- Plan file found: docs/tasks/task.319.ci-runs-only-where-needed/task.319.plan.ci-runs-only-where-needed.md — included as implementation context for /develop.
- Pre-develop surface map: 14 files identified in shared/resources (ci-tree-equivalence.js, develop-pipeline-on-precompact.sh, develop-pipeline-{pause,hooks,step-5-6-qa-loop,step-7-finalise,step-8-commit}.md, finalise-ci-poll.sh, security-probe.mjs, probe-boundary-rule.md, finalise-dod-ac-prompt.md), skills/{develop-task,develop-story,develop-bug,develop-next,develop-batch,finalise}, package.json, docs/reference/configuration.md. Done in-line by the orchestrator (no Explore subagent): independent review did not run.
- Fast gate precondition: `develop.fastGateCommand` = `npm run ci:fast`, defined.
- Step 3 inline — /develop not invoked: the plan names every part and the surface map is recorded.
- Simulated-run definition (criterion 2): cycles 1–2 are code fixes (`qa-cycle`, push), cycles 3–4 are record-only fixes (`qa-cycle`, defer), cycle 5 is the record-only gate that reaches 5c (`qa-pre-5c`, a remote reader, push). Three pushes: two code, one at the loop's end. 5c reads the remote, so the loop's end push is the pre-5c push; the acceptance and Step 8 pushes follow it and are counted separately.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- The pipeline's Stop and PreCompact hooks are not registered in `.claude/settings.json` in this checkout; step transitions rely on the orchestrator.

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: feature/task.319.ci-runs-only-where-needed
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}

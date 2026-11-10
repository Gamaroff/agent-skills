# Implementation Report: One bash tokenizer for the QA snippet classifier

**Task**: `task.292.qa-snippet-classifier-one-bash-tokenizer.md`
**Run Number**: 1
**Started**: 2026-11-10 00:00
**Status**: In Progress

---

## Summary

Replace the snippet classifier's separate regex re-implementations of bash's blank, quote, escape and line-join rules with one tokenizer every scan reads, and close the open T290-QA-3 write gap.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set                                                                    |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | N/A (not yet signalled)                                                    |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.292.*` exists in git                              | Branch created at `89366af8` | —                    | 2026-11-10T04:10Z |
| 2. review-task             | ✅ Done | `task.292.review.{N}.{name}.md` exists (or skip logged)                | READY TO IMPLEMENT 9/10, 0 critical, 0 important | —                    | 2026-11-10T04:25Z |
| 3. develop                 | ⏳ Pending | Task status == `Ready for Review`                                      |       | —                    |                 |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.292.qa.{N}.*.md`; `task.292.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.292.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-10

- Feature branch base: develop — source: recommended (--defaults)
- PR target branch: develop — source: recommended (--defaults)
- qa-planning gate: skipped (auto — no prompt)
- Mode: standard — source: detector (risk_level absent, 4 phases, so not lite)
- Phase 0 run inline (no subagents); lite-mode inputs derived from the document directly.
- Invoked by /develop-next (item T292) with --defaults.
- work-started: comment posted, board Todo → In Progress.
- review-task invoked; output: Comprehensive report (pipeline default); Step 8.5 auto-answered "apply all critical + important fixes" (none needed); Step 9 auto-answered "Yes, fixes complete". Status Planned → Ready for Development.
- Step 3 inline — /develop not invoked: the plan file names every phase and hunk, and the surface map is recorded. Plan file found: docs/tasks/task.292.qa-snippet-classifier-one-bash-tokenizer/task.292.plan.qa-snippet-classifier-one-bash-tokenizer.md — included as implementation context.
- Pre-develop surface map: 4 paths — shared/resources/qa-execute-snippets.mjs (engine), shared/resources/tests/qa-execute-snippets.test.mjs (suite), scripts/qa-snippets-differential.mjs and scripts/qa-snippets-docscan.mjs (new), package.json (two scripts). Built inline from the plan; no Explore subagent.
- Phase 1 calibration (instruments tried on a known failure before their green counts):
  - Differential on the unchanged engine: `node scripts/qa-snippets-differential.mjs --atoms blanks --count 20000 --seed 1` → total 20000, runnable 2416, writes 10; every writer holds a CR/FF/VT/NBSP/U+2028 before `#` (T290-QA-3 reproduced).
  - Docs scan against a copy of the engine widened by one rule (`if (c === "\\" && double)` → `if (c === "\\")` in `stripCommentQuoteAware`): newly runnable 1, `docs/tasks/task.83.platform-aware-skill-exclusion/task.83.bug.1.tracker-resolution-divergence.md:102`. Unwidened engine against `develop`: 3444 blocks, 0 newly runnable, 0 newly refused.
  - Suite rows red before the fix: `node --test --test-name-pattern=task.292 shared/resources/tests/qa-execute-snippets.test.mjs` → 5 gap rows and the fixed-seed slice fail, 2 controls and the blind-classifier calibration pass.
- Review report: docs/tasks/task.292.qa-snippet-classifier-one-bash-tokenizer/task.292.review.1.qa-snippet-classifier-one-bash-tokenizer.md. The two pre-pass Explore subagents did not run; they were done inline, so independent review of the pre-pass did not run.

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

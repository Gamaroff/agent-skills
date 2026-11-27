# Implementation Report: isDocsPath refuses the NTFS .git stream and C1 controls

**Task**: `task.330.docs-path-stream-and-c1-refusals.md`
**Run Number**: 1
**Started**: 2026-11-27 11:22
**Status**: In Progress
**Report format**: 2

---

## Summary

Make `isDocsPath` read a `.git:` alternate-stream segment and a C1 control as code, prove both in the `git-name` corpus, and fix four deferred wording findings.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | low                                                                        |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Tracker Issue       | #957 (GitHub)                                                              |
| Board status        | In Progress ✅ (gh-stage `transitioned`; Priority already P2 Medium)        |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.330.*` exists in git                             | Branch created at `eb9b74d4b`; pushed with upstream | —                    | 2026-11-27T11:24Z |
| 2. review-task             | ✅ Done    | `task.330.review.{N}.{name}.md` exists (or skip logged)               | `task.330.review.1.docs-path-stream-and-c1-refusals.md` — READY TO IMPLEMENT 9/10; Planned → Ready for Development | —                    | 2026-11-27T11:26Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline, 1 iteration; 3/3 phases; ci:fast 8955 tests 0 fail (2nd run, after a Prettier fix) | —                    | 2026-11-27T11:55Z |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.330.qa.{N}.*.md`; `task.330.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.330.dod.{N}.*.md`; task `status: accepted`                      |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-27

- Dispatched by `/develop-next` (roadmap item T330, source `roadmap`) with `--defaults`.
- Phase 0 run inline (no 0a-parallel agents): document read directly; lite-mode inputs risk_level=low, phase_count=3, single_module=false → PIPELINE_MODE=standard.
- Feature branch base: develop — source: recommended (`--defaults`, auto-answer)
- PR target branch: develop — source: recommended (`--defaults`, auto-answer)
- Mode: standard — source: detector
- Skips: none; refused: none; questions asked: 0 (`--defaults`, no conflict)
- qa-planning gate: skipped (auto — no prompt)
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Task status at start: Planned — Step 2 `/review-task` validates and promotes it.
- Branch: `feature/task.330.docs-path-stream-and-c1-refusals` from `develop` at `eb9b74d4b`. Implementation report stashed before branch creation, restored after.
- Tracker: work-started comment `posted`; GitHub board: work-started → transitioned (In Progress).

### Step 2 — review-task

- review-task run (status Planned, no prior report). Output: Comprehensive report (pipeline default). Step 8.5 auto-answered "Yes, apply all critical + important fixes"; Step 9 auto-answered "Yes, fixes complete".
- Review report: `docs/tasks/task.330.docs-path-stream-and-c1-refusals/task.330.review.1.docs-path-stream-and-c1-refusals.md` — READY TO IMPLEMENT, 9/10, 0 critical / 1 important / 1 optional, both fixed.
- Pre-pass agents B and C run inline, not as subagents (cost); independence loss recorded in the review report.
- Planned promoted to Ready for Development by review-task.
- Review outcome comment skipped by the orchestrator — review-task reported `posted` (stage `review-task-1`).
- Tracker key unchanged (#957 at Step 1).

### Step 3 — develop

- Plan file found: `docs/tasks/task.330.docs-path-stream-and-c1-refusals/task.330.plan.docs-path-stream-and-c1-refusals.md` — included as implementation context.
- Pre-develop surface map: 10 files identified in `shared/resources/` (engine, corpus module + doc, three test files), `CHANGELOG.md`, `docs/runbooks/ci-docs-only-skip.md`. Built inline from the Step 2 review's reads, not by an Explore subagent (cost); independence loss accepted — the plan names every hunk.
- Step 3 inline — /develop not invoked: the plan names every hunk and the surface map was already read.
- Fast-gate precondition: `npm run ci:fast` is defined.
- Tests first: 8 tests red before the code change (3 new task.330 unit tests, 2 corpus-doc tests, 3 task.329 probe tests) — `.claude/state/t330-red.log`.
- After the change: 4 named suites 521/521 pass.
- Hand-run mutations (recorded for QA): class narrowed back to C0+DEL → 2 task.330 tests red; `:` fold applied to every segment → the task.330 table test red (`docs/a:b.md` refused). The fold-removal mutation is the new mechanical `dotGitStream` row in `GIT_NAME_MUTATIONS`.
- Beyond the plan: the corpus renderer had no glyph for U+0085, so the generated table would have carried a raw C1 byte; added `␤` to `CONTROL` and the legend. The bracket message also replaced "extglob" with the three openers. The task-329 CHANGELOG entry's case counts (14/8) were updated to 17/9.
- `npm run bundle` regenerated 16 copies; `npm run bundle:check` 0 problems.
- Fast gate (`npm run test:remote` → `ci:fast` on .249): run 1 failed on `prettier --check` (`ci-tree-equivalence.test.mjs`) before any test ran; formatted with `prettier --write`; run 2 passed — 8955 tests, 8952 pass, 0 fail.
- Loop audit run inline (not an Explore subagent): status `ready-for-review`, 8/8 Implementation Plan boxes ticked → exit loop after iteration 1.
- CHANGELOG placement: bullets below the first release heading 987 at the merge base, 987 now — new entries are in `[Unreleased]`.
- Development completion comment posted to github issue 957 (`posted`).

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- Step 3: reverting the fold-every-segment mutant with an empty-`new_string` Edit joined two lines of `ci-tree-equivalence.js` (`:197`), and `npm run bundle` copied it. Found by a `git grep`; fixed, re-bundled, `bundle:check` clean. The snapshot-and-`cmp` revert rule (`file-write-rules.md#mutation-revert`) was skipped. Observation #196.

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: feature/task.330.docs-path-stream-and-c1-refusals
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}

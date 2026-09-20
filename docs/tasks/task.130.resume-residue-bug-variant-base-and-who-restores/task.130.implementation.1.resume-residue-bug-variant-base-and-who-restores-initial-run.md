# Implementation Report: Resume residue from task.124 — bug-variant base, dispatch population, self-reported delete, who-restores enumeration

**Task**: `task.130.resume-residue-bug-variant-base-and-who-restores.md`
**Run Number**: 1
**Started**: 2026-09-20 07:30
**Status**: In Progress

---

## Summary

Close PR #436's three medium Step 5c findings and the four gate-6 futures, and collapse the who-restores enumeration into one stated rule with citations and a test — first pipeline run for task.130.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | medium                                                                     |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | In Progress ✅ (`already` — card was moved before the CLI ran; priority P1 High left as-is) |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.130.*` exists in git                              | Existing branch reused (at `d2395807`, one commit ahead of `origin/develop` = 62945d68); pushed with tracking; lock written; work-started comment posted; board In Progress | —                    |
| 2. review-task             | ✅ Done    | `task.130.review.{N}.{name}.md` exists (or skip logged)                | Skipped — `Ready for Development` + `task.130.review.1` present (presence rule). Review artefacts committed `8b6e11f6`, pushed | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 1 iteration; 22/22 phases; fast gate green (3542 node + shell suites); eval:develop-task 17/17; all 5 phases mutation-proven | `.summaries/step-3-surface-map.json`, `.summaries/step-3-loop-audit-1.json` |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.130.qa.{N}.*.md`; `task.130.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.130.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-09-20

- Phase 0a: task resolved inline from `task.130` → `docs/tasks/task.130.resume-residue-bug-variant-base-and-who-restores/task.130.resume-residue-bug-variant-base-and-who-restores.md` (no Explore subagents dispatched; resolver, tracker poll and lite-mode inputs derived inline).
- Tracker: `TRACKER=github`, `TRACKER_ISSUE=437` (issue OPEN, board status Todo at start).
- Lite-mode inputs (derived from the document, not by impression): `risk_level=medium` (risk_ok=false), `phase_count=5`, `single_module=false` → `PIPELINE_MODE=standard`.
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md (from skills-config.yaml `devLoadAlwaysFiles`; all present on disk).
- Phase 0b: previous-run artefacts detected — local branch `feature/task.130.resume-residue-bug-variant-base-and-who-restores` at develop tip (no upstream, no PR), uncommitted `task.130.review.1` report, task at `Ready for Development`; no implementation report, no lock, no halt snapshot. User chose **Resume — reuse branch & review**: Step 1 reuses the branch and commits the review artefacts; Step 2 skips on `Ready for Development` + report present.
- Upfront questions asked (3): prior-state handling = Resume; Q1 feature branch base = develop; Q2 PR target = develop.
- Feature branch base: develop — the branch already sits at develop's tip (d2395807)
- PR target branch: develop — standard Gitflow for task PRs
- qa-planning gate: skipped (auto — no prompt)
- Task status at start: `Ready for Development` — proceed normally.

### Step 1 — create-branch — 2026-09-20

- `/create-branch` invoked; target branch already existed locally (user's Phase 0b answer = reuse). Verified it contains `origin/develop` (62945d68) and is one commit ahead (`d2395807`, the task.130–132 docs commit). Pushed with `-u` to `origin`.
- Implementation report stashed before `/create-branch`, restored after.
- Lock written at `current_step: 2`.
- GitHub board: work-started → `already` (In Progress). Priority already `P1 High` — P2 default not applied.
- Pipeline-start comment on #437: `posted`.
- Uncommitted task doc/plan/review.1 changes (from the hand-run `/review-task`) are still in the working tree; they will be committed at the Step 2 skip via `/commit-changes`.

### Step 2 — review-task — 2026-09-20

- Gate check: status `Ready for Development`, review report `task.130.review.1.resume-residue-bug-variant-base-and-who-restores.md` present → **Skip** per the develop-task decision table (presence rule; freshness applies only to the `Planned` row).
- The hand-run review's uncommitted artefacts (task doc, plan, review.1) committed via `/commit-changes` as `8b6e11f6` and pushed; implementation report excluded from that commit.

### Step 3 — develop — 2026-09-20

- Fast-gate precondition: `develop.fastGateCommand` unset → default `npm run ci:fast`; script `ci:fast` is defined → OK.
- Pre-develop surface map: 16 files identified across `shared/resources/` (resume contract, detector prompt, step-0/step-8 docs, `advance-pipeline-lock.sh`, `grant-qa-cycles.sh`), the three `develop-*` SKILL.md, `develop-bug-step-3-investigate-fix.md`, three test suites and fixtures 13/16 — Explore subagent, 102 s, summary at `.summaries/step-3-surface-map.json`. Bundled-copy map recorded there (edit sources, `npm run bundle`).
- Plan file found: `task.130.plan.resume-residue-bug-variant-base-and-who-restores.md` — included as implementation context for /develop.
- Always-load files (3) read and passed to /develop.
- Develop loop: MAX_ITER=5, ITER=1.
- Iteration 1 outcome: `/develop` completed all five phases. Loop audit (Explore, 18 s, `.summaries/step-3-loop-audit-1.json`): status `ready-for-review`, 22/22 checkboxes, last commit `8b6e11f6` → EXIT loop.
- Fast gate iteration 1: first run failed on Prettier formatting only (6 new/edited test files) → `prettier --write` → second run exit 0: 3542/3542 node tests, every shell suite green; log removed on success.
- Also run: `npm run eval:develop-task` (17/17 fixtures incl. new 17 and re-recorded 16), `npm run bundle` + `bundle:check` (0 problems, 56 bundled copies refreshed), `check:generated`, `lint:shell` (clean), Step 4b classifier over the four edited docs (one pre-existing finding, detector prompt :69, identical on develop — out of scope).
- **Mutation proofs (all cp-snapshot/restore, baseline green between):**
  - Phase 1 `probe-base-binding.test.mjs`: delete the `**Branch model:**` sed arm → B red (bash+zsh); restore the `develop` default → C, D, F red. ✔
  - Phase 2 `qa-loop-lock-fields-parity.test.mjs`: remove the mark → "develop-bug-step-3 … dispatches without marking the wait"; narrow the regex → "root-cause dispatch line does not match DISPATCH". ✔ (first non-vacuity draft was itself vacuous — the file's triage dispatch already matched — so the check is anchored to the root-cause line.)
  - Phase 3 `stale-snapshot-delete.test.mjs`: drop `rm -f` → A red; widen the select → B red; drop the re-read → C red. ✔ (first extractor keyed on the mutated tokens and went red for the wrong reason — re-keyed on the block's comment line.)
  - Phase 4 `who-restores-single-statement.test.mjs`: remove marker → (i); paste old Phase 0b sentence → (ii) contract; paste develop-bug's token-free sentence → (ii) develop-bug; marker at a second site → (i). ✔
  - Phase 5: grant guard reverted to `$SNAPSHOT` → "guard reads --which candidate" red; step-8 glob loop back → F1 zsh red; sole-candidate guard dropped → F2 red; lint site (1) reverted to `|| {` → A red; `exit` added to site (2) → B red. ✔
- **Plan snippets found wrong by execution and corrected** (recorded in the task's Notes): Phase 3's piped `while` swallowed the HALT's `exit 1` under bash (subshell) → process substitution; Phase 5's "nullglob-guarded" `for f in <path> <glob>` aborts under zsh `nomatch` → `find` count; Phase 1's exit-status-only stderr split would have labelled every PR-less branch a gh failure → reads gh's stderr text.
- Breaking Change 2 required updating three legacy-shaped fixtures in `grant-qa-cycles.test.sh` (they now carry `task_or_story_directory`); the "pre-task.123 accepted" scenarios in both shell suites became refusal scenarios.
- Change Log row appended via `change-log.js` (from `shared/resources/` — the `develop` skill does not bundle it; recurrence appended to observation #125). Task status `ready-for-review`.
- Development completion comment posted to github issue 437 (`posted`).

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {populated at end}
**Branch**: feature/task.130.resume-residue-bug-variant-base-and-who-restores
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}

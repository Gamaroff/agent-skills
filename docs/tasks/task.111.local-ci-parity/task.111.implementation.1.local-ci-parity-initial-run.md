# Implementation Report: One local command that runs every CI lane, and two coverage gaps the sweep found

**Task**: `task.111.local-ci-parity.md`
**Run Number**: 1
**Started**: 2026-09-16 09:26
**Status**: In Progress

---

## Summary

Make `npm run ci` run every CI lane (add `validate:all`, `bundle:check`, a `lint:shell` lane), cover all three `develop-*` hook wrapper sets with one parametrised test, and make `quick_validate.py` enforce the 1,024-char description cap. Dispatched by `/develop-next` (registry fallback, task-registry).

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
| Board status        | In Progress ✅ (#411, `gh-stage.js work-started` → transitioned; Priority P2)      |
| Tracker Issue       | #411 (GitHub) — created at Step 2 by `ensure-task-github-issue`; OPEN, labels `task`, `priority:medium`, milestone "Technical Tasks (standalone)" |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.111.*` exists in git                              | Branch created at `0a5f31a6`, tracking origin | —                    |
| 2. review-task             | ✅ Done    | `task.111.review.{N}.{name}.md` exists (or skip logged)                | `task.111.review.1.local-ci-parity.md` — READY TO IMPLEMENT 8/10; 1 critical + 3 important fixed in doc + plan; Planned → Ready for Development; issue #411 created; work-started re-fired | — (pre-pass B/C YAML folded into review.1) |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 1 iteration, 3/3 phases; 12 files, 25 new tests, all mutation-proven; `npm run ci` full run: `npm test` tripped a pre-existing flake (see Issues Log), every other lane green individually; wall ≈ 22 min | — (surface map inline; no triage dispatched — the one failure was diagnosed by counts + a develop-worktree re-run) |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.111.qa.{N}.*.md`; `task.111.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.111.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-09-16

- **Autonomous run (develop-next)**: every Phase 0d question auto-answered with the recommended option; no prompts issued.
- Feature branch base: develop — Q1 auto-answer (on `develop`; recommended default)
- PR target branch: develop — Q2 auto-answer (recommended default)
- qa-planning gate: skipped (auto — no prompt)
- Phase 0a-parallel: no subagents dispatched — file path was supplied verbatim by the develop-next selector, the document has no `github_issue:`/`jira_key:` (nothing to poll), and the lite-mode inputs were read directly from the document. Inputs: `risk_level: low` (risk_ok=true), phase_count=3 (Progress Tracking phases 1–3; not < 3), single_module=false (package.json, evals/, skills/create-skill, skills/develop-story, docs/) → **PIPELINE_MODE=standard**. has_success_criteria_table=true, ac_count=5.
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md (from `skills-config.yaml` `devLoadAlwaysFiles`; all exist on disk)
- Task status at start: `Planned` — proceeding; Step 2 (`/review-task`) will validate and promote autonomously.
- Tracker: `TRACKER=github`, `TRACKER_ISSUE=""` (no `github_issue:` in frontmatter) — tracker signals skipped until Step 2 links an issue.
- Branch: `feature/task.111.local-ci-parity` cut from `develop` at `0a5f31a6`, pushed with tracking. Implementation report stashed before branch creation and restored after (transient `.git/index.lock` contention during `git stash push` — retried; no data lost).
- Tracker signal (0c-reg): skipped — no tracker issue linked.
- Step 2: task status `Planned`, no review report → ran `/review-task`. review-task output: Comprehensive report — required for pipeline audit trail. Pre-pass Agents B and C dispatched (Explore, parallel, 26 s / 24 s) — B: `drift` (4 low), C: `not-implemented`. Tracker sync auto-answered **Sync to GitHub** (recommended; precedent tasks 110/113/114/115): dedup zero matches → issue #411 created, board add, Priority P2. Step 8.5 auto-answered: Yes, apply all critical + important fixes — pipeline proceeds autonomously. Step 9 auto-answered: Yes, fixes complete — pipeline proceeds autonomously. Review report: `docs/tasks/task.111.local-ci-parity/task.111.review.1.local-ci-parity.md`. Planned promoted to Ready for Development by review-task. Review outcome comment posted to github issue 411 (`posted`).
- **Design decision taken without a human (Step 2):** the task's `ci` recomposition breaks `evals/shared/tests/ci-gate-parity.test.mjs` (reads `test.yml:test` only, asserts set equality with `expand(ci)`). Chose to widen the test to all green-defining jobs with a step-name twin map rather than change what CI runs (§4 forbids it). Alternative recorded in the review report; one-commit swap if the operator prefers it.
- work-started re-fired at Step 2 — issue 411 created by the review; lock updated. Comment `posted`; `gh-stage.js --stage work-started --add-to-board` → `transitioned`; Priority already P2.
- Step 3 — fast-gate precondition: `develop.fastGateCommand` unset → fallback `npm run ci:fast`; `ci:fast` resolves in `npm run` → OK.
- Pre-develop surface map: 12 files identified in package.json / .github/workflows / evals/shared/tests / evals/develop-story/protocol / skills/develop-{story,task,bug}/scripts / skills/create-skill/scripts / docs/contributing — **subagent: not dispatched; pass performed inline** (the Step 2 review had just verified every one of these files in this context; a second Explore would re-find what is already established — memory rule "no redundant Explore after directional decisions"). Independence lost is nil for a discovery pass, but recorded per the §Subagents table.
- Plan file found: `docs/tasks/task.111.local-ci-parity/task.111.plan.local-ci-parity.md` — included as implementation context for /develop (updated by the review at Step 2).
- Always-load files: all 3 read and in context for /develop.
- Step 3 loop iteration 1: `/develop` ran all three phases (Progress Tracking 5/5 boxes). Audit performed inline (status `Ready for Review`, 5/5 checked, no commit yet — Step 4 commits) rather than by a loop-audit subagent: single iteration, the exit condition is read directly from the document. **Mutation results recorded per §8:** parity M1 (unclassified step) → `every green job is found, and every step in it is classified` red; M2 (drop `lint:shell` from `ci`) → `green jobs and the ci composite run exactly the same commands` red; M3 (rename shellcheck step) → three tests red; wrappers M1 (drop `"$@"` from develop-task/on-stop.sh) → `develop-task/on-stop.sh — argv, stdin and exit status pass through the exec` red; M2 (rename exec target) → `develop-task/on-stop.sh — execs an existing ../references/ target` red; cap: 1,025-char fixture → exit 1 with the count, 1,024 → exit 0 (first fixture had a trailing space that normalisation folded to 1,024 — fixed, and the test helper documents it). Absent-binary: `PATH=/usr/bin:/bin bash scripts/lint-shell.sh` → skip message, exit 0.
- Step 3 — `npm run ci` end-to-end: 1207 s to the `npm test` failure (one test, pre-existing — Issues Log); the four new lanes then run individually: `validate:all` 58 s (128/128), `check:generated` 5 s, `bundle:check` 24 s (0 problems), `lint:shell` 29 s (60 sources, clean), `eval:all` 14 s. Full composite wall time ≈ 22 min on this machine, dominated by `npm test`.
- Development completion comment posted to github issue 411.
- Removed stale `.claude/state/develop-pipeline.last-halt.json` — it belonged to task.120 (PR #410, already merged and accepted), not to this run.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Pre-existing flake, not this task's:** `skills/session-handoff/tests/handoff-verify.test.js` — "cli: a `command ` prefix is stripped … (CR-6)" fails with `ENOENT … child.pid` in 3 of 3 isolated runs on this branch **and on a clean `develop` worktree** (`git worktree add /tmp/t111-develop-check develop`, same failure, worktree removed). Cause as read from the test: the fixture's `npm test` must start npm → sh → node slow.js and fork a grandchild within the 3 s cap; `npm --version` alone takes ~1.7 s on this host (nvm-wrapped npm), so the group is killed before `slow.js` writes the pid. CI's runner starts npm faster; the test is environment-timing-sensitive. Not fixed here (out of scope; the test belongs to task 110's suite). Consequence for this run: the one end-to-end `npm run ci` stopped at `npm test`; every other lane was proven green individually and the merge gate at develop-next Step 3 will run the composite again on CI's runner class.
- Transient `.git/index.lock` contention during Step 1's `git stash push` (twice) — the stash was saved each time and the working-tree reset was the part that failed; resolved by dropping the half-applied stash, re-stashing, and unstaging/removing the report by hand. No data lost.

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: `feature/task.111.local-ci-parity`
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}

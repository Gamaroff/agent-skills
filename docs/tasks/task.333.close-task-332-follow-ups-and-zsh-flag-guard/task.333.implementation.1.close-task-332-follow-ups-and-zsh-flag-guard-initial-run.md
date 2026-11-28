# Implementation Report: Close task 332's follow-ups and guard the zsh flag trap

**Task**: `task.333.close-task-332-follow-ups-and-zsh-flag-guard.md`
**Run Number**: 1
**Started**: 2026-11-28 06:39
**Status**: In Progress
**Report format**: 2

---

## Summary

Run T333 through the full pipeline: the zsh `${X:+--flag}` guard and review-story fix, plus task 332's five gate 3 finalise advisories.

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
| Tracker Issue       | #965 (GitHub)                                                              |
| Board status        | In Progress ✅                                                             |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.333.*` exists in git                             | Branch created at `73a985278`; pushed | —                    | 2026-11-28T06:41Z |
| 2. review-task             | ✅ Done | `task.333.review.{N}.{name}.md` exists (or skip logged)               | `task.333.review.1.…md`; READY 9/10; Planned → Ready for Development | —                    | 2026-11-28T06:45Z |
| 3. develop                 | ✅ Done | Task status == `Ready for Review`                                      | Inline; 4/4 phases; M1–M6 red; ci:fast on .249 green (8985 pass, 0 fail); commits `2487608b4`, `0e473be3b` | —                    | 2026-11-28T07:23Z |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.333.qa.{N}.*.md`; `task.333.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.333.dod.{N}.*.md`; task `status: accepted`                      |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-28

- Invoked by `/develop-next` (roadmap item T333) with `--defaults`; zero upfront questions asked.
- Feature branch base: develop — source: recommended
- PR target branch: develop — source: recommended
- Mode: standard — source: detector (risk_level low, phase_count 4, single_module false → standard). Phase 0 run inline (no subagents dispatched); the three inputs were read from the document directly.
- Skips: none; refused flags: none.
- qa-planning gate: skipped (auto — no prompt)
- Task status at start: Planned — Step 2 (`/review-task`) validates and promotes.
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Branch: `feature/task.333.close-task-332-follow-ups-and-zsh-flag-guard` (from develop `73a985278`). Implementation report stashed before branch creation, restored after.
- Tracker: work-started comment `posted`; GitHub board: work-started → transitioned (In Progress). Priority already P2 Medium.

### Step 2 — review-task

- review-task invoked (status Planned, no review report). Output: Comprehensive report — required for pipeline audit trail. Step 8.5 auto-answered "Yes, apply all critical + important fixes"; Step 9 auto-answered "Yes, fixes complete" — pipeline proceeds autonomously.
- Review report: `docs/tasks/task.333.close-task-332-follow-ups-and-zsh-flag-guard/task.333.review.1.close-task-332-follow-ups-and-zsh-flag-guard.md` — READY TO IMPLEMENT, 9/10, 0 critical / 2 important / 2 optional. `reviewed_blob` stamped.
- Pre-pass Agents B and C not dispatched; both passes done inline (independence loss recorded in the review report).
- Planned promoted to Ready for Development by review-task.
- Fixes applied: two success criteria now name their evidence (stem-key test + M5; CI plus `test:remote` in the QA report); M4 names `finalise-rerun-scope.js:1300`.
- Tracker key unchanged at Step 2 (#965) — no work-started re-fire.
- Review outcome comment skipped — review-task reported `posted` (stage `review-task-1`, report 1).

### Step 3 — develop

- Step 3 inline — /develop not invoked: plan names every hunk.
- Plan file found: `task.333.plan.close-task-332-follow-ups-and-zsh-flag-guard.md` — included.
- Pre-develop surface map: inline (no Explore subagent). Surfaces: `skills/review-story/SKILL.md` (two Jira sync blocks), `skills/finalise/SKILL.md` Steps 3a and 3c, `shared/resources/finalise-rerun-scope.js` (`merge` and its CLI), `shared/resources/finalise-dod-ac-prompt.md`, the two finalise test files, a new guard test, `docs/contributing/traps.md`, `CHANGELOG.md`.
- Guard calibrated red before the fix: pass 4 / fail 1, hits exactly `skills/review-story/SKILL.md:2398` and `:2483` (log kept at `.claude/state/t333-guard-red.log` for the QA report). Green after the fix (5/5).
- Step 3c's echo is an `if`, not the plan's `[ … ] && echo`: on `result-unparseable` the test is false and a trailing `&&` leaves the block's exit status at 1.
- The Step 3a HALT message now names STEM (`DOC_PATH, STEM and DOD_N must be substituted`); one blocks-test pin on the old message was updated.
- Mutations (each reverted after its red run):
  - M1 guard: review-story site reverted to `${PIN_BRANCH:+--doc-branch …}` → guard A red, names `skills/review-story/SKILL.md:2488`.
  - M2 guard: scan reads no blocks → guard B (floor) red.
  - M3 Step 3c: `AC_YAML_VERIFIED` echo removed → blocks test 4 fail.
  - M4 engine `verified: true` with no `--sha256`: red only once applied to the **bundled** copy the block runs (`skills/finalise/references/finalise-rerun-scope.js`) → 2 fail ("a hand copy is recorded verified: false"). Against the unbundled source it stayed green, because the block calls the bundle.
  - M5 Step 3a path: JSON record reverted to `${DOD_N}` → 16 fail. The out-dir reverted alone stayed **green** at first: no case wrote an out-dir (it exists only when a listed command runs). Added the out-dir assertion to the T319-CR-5 case, which runs `sh check.sh`; re-mutated → 2 fail ("the re-run-at-head out-dir is stem-keyed").
  - M6 engine: `merge` re-parses, ignoring `opts.answer` → parse-count test red, `PARSE_COUNT=2`.
- `npm run bundle` then `bundle:check`: 129 skills, 0 problems.
- `npm run test:remote` (ci:fast on .249), second run: rc 0 — 8988 tests, 8985 pass, 0 fail, 3 skipped; tmp-leak ratchet ok. The guard's A, C (zsh premise, not skipped) and D cases ran in it.
- CHANGELOG placement check (base develop): 987 bullets below the first release heading, same as the merge base — ok.
- Loop audit: inline (no Explore subagent) — 4/4 phases ticked, 1 develop iteration.
- Task status → Ready for Review.
- Development completion comment posted to github issue 965 (`posted`).

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- M5's out-dir half was unheld by the planned assertion (no-command case writes no out-dir). Fixed in-step by asserting it in the case that runs a command; mutation-proven.
- First `test:remote` run failed `format:check` (Prettier, three new/edited test files). The background task reported exit 0 because the command ended in a trailing `echo`. Read from the log, formatted with Prettier, re-run with the real exit status propagated.

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: feature/task.333.close-task-332-follow-ups-and-zsh-flag-guard
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}

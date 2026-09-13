# Implementation Report: The QA loop routes on the verdict token, gates before its own review returns, reads boundary deliverables it could execute, and has no vocabulary for a subagent that never ran

**Task**: `task.116.qa-loop-routes-and-preconditions.md`
**Run Number**: 1
**Started**: 2026-09-13 07:36
**Status**: In Progress

---

## Summary

Run task.116 through the full develop-task pipeline: fix the §5b/§5c router's verdict-vs-queue substitution, block Step 10 on the Step 3b review's return, execute predicate deliverables at QA, treat a green macOS suite as platform evidence, and add `unavailable` / small-output vocabulary for subagents.

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
| Tracker Issue       | #403 (GitHub) — created by Step 2 `/review-task`                           |
| Board status        | In Progress ✅ (work-started re-fired at Step 2)                            |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.116.*` exists in git                              | Branch created at `0c350eb0`, pushed with tracking | —                    |
| 2. review-task             | ✅ Done    | `task.116.review.{N}.{name}.md` exists (or skip logged)                | `task.116.review.1.qa-loop-routes-and-preconditions.md` — READY TO IMPLEMENT 8/10; 3 Important fixes applied; Planned → Ready for Development; issue #403 created | — (pre-pass B/C inline in review report) |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 1 iteration; 5/5 phases; ci:fast 3266/0; mutation-proved (10 reverts red + router revert red) | — (loop audit inline) |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.116.qa.{N}.*.md`; `task.116.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.116.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-09-13

- Dispatched by `/develop-next` (AUTONOMOUS RUN directive) — item T116 selected via task-registry fallback (no actionable roadmap phase row).
- Phase 0a: file path supplied directly; resolver subagent not dispatched. Tracker poller not dispatched — frontmatter carries no `github_issue:`/`jira_key:`, so `TRACKER_ISSUE=""` (TRACKER=github, VCS=github, access full/full).
- Lite-mode inputs read inline (the "production lite-mode CLI" §0c names does not ship — observation #82): `risk_level=medium` (risk_ok=false), `phase_count=4`, `single_module=false` (qa-task, qa-story, shared step-5/6 router, develop pipelines). **PIPELINE_MODE=standard.**
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md (all present on disk).
- Task status at startup: `Planned` — proceeding; Step 2 `/review-task` validates and promotes.
- Phase 0d (2 questions, auto-answered per develop-next directive — no prompt issued):
  - Q1 Feature branch base: **develop** — current branch is `develop`; auto-derived recommended option.
  - Q2 PR target branch: **develop** — auto-derived recommended option.
- qa-planning gate: skipped (auto — no prompt)
- Step 1: implementation report stashed before branch creation, restored after. Branch `feature/task.116.qa-loop-routes-and-preconditions` created from `develop` at `0c350eb0`; lock written (`current_step: 2`).
- Signal Work Started (0c-reg): skipped — no tracker issue linked at Step 1; `/review-task` (Step 2) creates the GitHub issue via ensure-task-github-issue.

### Step 2 — review-task — 2026-09-13

- review-task output: Comprehensive report — required for pipeline audit trail.
- review-task Step 0a: auto-skipped (already on `feature/task.116.*`).
- Pre-pass dispatched (Agent B architecture, Agent C already-implemented): B `drift` (2 low), C `not-implemented` (8 findings). Both B findings verified by hand and promoted to Important.
- Tracker sync auto-answered **Sync to GitHub** (Recommended): issue #403 created (`Technical Tasks (standalone)`), added to board, Priority P1; Estimate field absent on board (non-blocking).
- review-task Step 8.5 auto-answered: Yes, apply all critical + important fixes — pipeline proceeds autonomously. Fixes applied 3/3 (eval pointer → `evals/shared/tests/pr-review-loop-parity.test.mjs`; Files Summary eval row; `.agents/skills/` → `skills/` refs).
- review-task Step 9 auto-answered: Yes, fixes complete — Planned promoted to Ready for Development by review-task. Change Log rows 1.1 + status transition written; `updated` → 2026-09-13.
- Review report: `docs/tasks/task.116.qa-loop-routes-and-preconditions/task.116.review.1.qa-loop-routes-and-preconditions.md`. Review outcome comment posted to GitHub issue 403 (`review-task` stage, `posted`).
- work-started re-fired at Step 2 — issue 403 created by the review; lock updated. Comment `posted`; board `transitioned` → In Progress.
- Proceeding despite optional review suggestions: SC6 (observations close) is a post-merge operator action; verify replay fixture is git-tracked.

### Step 3 — develop — 2026-09-13

- Fast-gate precondition: `develop.fastGateCommand` unset → fallback `npm run ci:fast`; script defined in package.json — OK.
- Pre-develop surface map: 9 files identified (reused from Step 2 pre-pass Agent C rather than a second Explore — it already returned file:line for every site the task names): `shared/resources/develop-pipeline-step-5-6-qa-loop.md` (§5b :252-256, §5c :850-858); `skills/qa-task/SKILL.md` (3b :366, 3c :470, 4b :535, 10 :709, 13 :1070); `skills/qa-story/SKILL.md` (3b end :871); `shared/resources/code-review-prompt.md` (categories :36,:43); `shared/resources/develop-pipeline-autonomous-defaults.md` (Explore row :30); `shared/resources/probe-boundary-rule.md`; `evals/shared/tests/pr-review-loop-parity.test.mjs` (:116-133); `evals/shared/tests/qa-execution-step-parity.test.mjs` (parity sibling); `skills/qa-fix/SKILL.md` (dispatch :328,:545); `shared/resources/develop-pipeline-step-3-develop-loop.md` (dispatch :16).
- Plan file found: `docs/tasks/task.116.qa-loop-routes-and-preconditions/task.116.plan.qa-loop-routes-and-preconditions.md` — included as implementation context for /develop.
- Always-load files resolved: 3 files — coding-standards.md, tech-stack.md, source-tree.md — prepended to the /develop context.
- Iteration 1 starting; LAST_COMPLETED=0, ITER=1, MAX_ITER=5.
- Iteration 1 result: all 4 phases (5 checkboxes) complete in one pass. Loop audit performed inline (checkbox count + status read; no subagent needed for a 5-box document): `completed=5/5`, `status=Ready for Review` → EXIT loop.
- Phase 1: §5b/§5c router rewritten — route 3 (CONCERNS, no open `top_issues[]` entry) hands to 5c; 5b entered only on an open finding; `FAIL` always routes to 5b. `evals/shared/tests/pr-review-loop-parity.test.mjs` gained two tests; **mutation-proved**: reverting the router text → 2 fail; restored → 27 pass.
- Phase 2: post-condition appended to qa-task 3b / qa-story 1.6 (identical sentence); gate-write precondition opens Step 10 / Output 2; publish precondition under Step 13 / "Post QA Summary to PR".
- Phase 3: boundary-rule item (pointer to `probe-boundary-rule.md` + `security-input-corpus.mjs`, `probes_executed`) and platform-variance item (`TMPDIR=/tmp node --test …`) inserted as 3b items 3–4 (Record/Gate mapping/rm renumbered 5–7); platform pointer added to 3c / Mutation-Proof; `code-review-prompt.md` gains PLATFORM VARIANCE as a `category: bug` check (schema unchanged — no third category, per Out of Scope).
- Phase 4: `develop-pipeline-autonomous-defaults.md` §Subagents — unavailable / failed / slow table, 10-minute wall-clock budget (`subagents.wallClockMinutes`), "output-file size is not a liveness signal"; pointers at 5 dispatch sites (develop Step 3, review-task 1.5, review-story pre-pass, qa-fix 1a, and the qa-task/qa-story post-condition).
- New `evals/shared/tests/qa-gate-preconditions-parity.test.mjs` (8 tests) — **mutation-proved against 10 single-behaviour reverts, each → fail 1; restored → fail 0**.
- New replay fixture `evals/develop-task/step-isolation/09-qa-concerns-empty-gate-routes-to-5c/` (5/5 assertions; git-tracked — `.gitignore` negation rule matched).
- Fast gate: first run failed on prettier (2 new test files) → formatted; second run failed on (a) `qa-execution-step-parity` "allow-list ≤2 mentions" guard — reworded the new text to drop the term, and (b) the tracked-tree link test — the freshly bundled `references/` files were untracked; staged them. Third run: `TEST_EXIT=0`, 3267 tests / 3266 pass / 0 fail / 1 skipped.
- CHANGELOG.md: five `### Changed` entries under Unreleased.
- Development completion comment posted to github issue 403 (`develop-complete`, count=5).

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Step 3 — transitive bundle growth.** Pointing qa-fix, review-task and review-story at `references/develop-pipeline-autonomous-defaults.md` made `npm run bundle` copy that file's full closure (15–16 files each: lite-mode, resume-contract, step-7-finalise, gh-stage.js, jira-stage.js, handover-*.js …) into those skills. qa-task already ships the same 46-file closure, so this is the repo's established cost of a single-source pointer, not a new pattern; accepted rather than forking the table into a leaf file (which would create a second definition). Flagged for the reviewer.
- **Step 3 — review report correction.** The Step 2 review said `evals/develop-task/protocol/` was empty; it holds `pipeline-shape` and `step-contract` tests (no route assertion). Report wording corrected before commit; the fix it prescribed (point at `pr-review-loop-parity.test.mjs`) stands.

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: feature/task.116.qa-loop-routes-and-preconditions
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}

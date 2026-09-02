# Implementation Report: A security re-review must re-probe, not re-read

**Task**: `task.74.security-re-review-reprobes.md`
**Run Number**: 1
**Started**: 2026-09-02 07:30
**Status**: In Progress

---

## Summary

Add a narrow carve-out to `qa-task` / `qa-story` so a re-review whose prior gate failed on a safety axis runs **unscoped** — full branch diff plus a re-run of the adversarial search — rather than only re-reading the fixes. Rule stated once in a shared resource, held by a parity contract test.

---

## Pipeline Configuration

| Setting             | Value                                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Feature branch base | `develop` (auto — develop-next autonomous run)                                                                                           |
| PR target           | `develop` (auto — develop-next autonomous run)                                                                                           |
| qa-planning gate    | skipped (auto)                                                                                                                           |
| Task risk level     | medium                                                                                                                                   |
| Pipeline mode       | standard (`risk_ok=false` — risk_level `medium` ∉ {low, absent})                                                                          |
| Always-load files   | 3 files — `docs/architecture/concepts/coding-standards.md`, `docs/architecture/concepts/tech-stack.md`, `docs/architecture/concepts/source-tree.md` |
| Board status        | N/A (no `github_issue` linked in frontmatter at Phase 0)                                                                                  |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.74.*` exists in git                               | `feature/task.74.security-re-review-reprobes` created from `develop` at `ded36ba`, pushed with upstream tracking | —                    |
| 2. review-task             | ✅ Done    | `task.74.review.{N}.{name}.md` exists (or skip logged)                 | READY TO IMPLEMENT, 8/10. 1 Critical + 3 Important applied. Report: `task.74.review.1.security-re-review-reprobes.md` | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 4 phases, all checkboxes ticked. 31 parity tests, 15 mutation proofs, 4 executable replay cases | —                    |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.74.qa.{N}.*.md`; `task.74.gate.{N}.*.yml`; PR comment posted     |       | —                    |
| 7. finalise                | ⏳ Pending | `task.74.dod.{N}.*.md`; task `status: accepted`                        |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

---

## Decisions Log

### Pipeline Startup — 2026-09-02

- **Invoked by `/develop-next`** — T74 selected deterministically from `docs/development/project-completion-roadmap.md` (PHASE 5 — Current frontier, line 89; no deps; source `roadmap`).
- Feature branch base: `develop` — auto-answered per the develop-next AUTONOMOUS RUN directive (Q1 recommended option; current branch was `develop`).
- PR target branch: `develop` — auto-answered per the develop-next AUTONOMOUS RUN directive (Q2 recommended option).
- qa-planning gate: skipped (auto — no prompt).
- **Phase 0a fan-out run inline rather than via subagents** — this session carries a standing operator instruction not to call the Agent tool unless explicitly requested. The three inputs the fan-out exists to produce were gathered directly: resolver (path already supplied by the selector), tracker poller (no `github_issue`/`jira_key` in frontmatter → `TRACKER=github`, `TRACKER_ISSUE` empty), lite-mode detector (`risk_level: medium`, `skills_config_exists: true`, `devLoadAlwaysFiles` = 3 paths, all present on disk).
- Pipeline mode: **standard**. Computed from the booleans, not by impression: `risk_ok = medium ∈ {low, absent}` is **false**, which alone forces standard.
- Tracker: `TRACKER=github`, `TRACKER_ISSUE` unset — `JIRA_URL` empty and the task frontmatter carries no `github_issue`. All tracker signalling is skipped until Step 2 (`/review-task`) links an issue, if it does.
- Step 1: branch created from `develop` at `ded36ba` and pushed. `Signal Work Started` (0c-reg) **skipped** — `TRACKER_ISSUE` is empty, so there is no issue to comment on or board item to move.
- **Step 2 — review-task**: run (status was `Ready for Development` but no review report existed). Output format auto-answered **Comprehensive report**; Step 8.5 auto-answered **Yes, apply all critical + important fixes**; Step 9 skipped — status was already `Ready for Development`, so no promotion was needed. Step 8.6 (Jira body push) skipped: `TRACKER=github`. Step 10 (tracker comment) skipped silently: no `github_issue`.
- **Step 2 — tracker sync deliberately declined.** review-task check 5 flags a missing `github_issue` as Important and recommends creating one. Downgraded to Optional and skipped: of the five most recent sibling tasks (67, 72, 73, 75, 76) only task.72 carries a `github_issue`, so linking here would be an unprompted outward-facing side effect against the prevailing repo convention. Rationale recorded in the review report under Optional-1.
- **Step 3 — Pre-develop surface map: 8 files across `shared/resources/`, `skills/qa-{task,story}/`, `evals/shared/tests/`.** Built inline rather than by an Explore subagent (standing no-Agent-tool instruction); the map is recorded here in full so it is reusable on resume:
  1. `shared/resources/qa-re-review-scope.md` — **NEW** (Phase 1); the rule stated once
  2. `skills/qa-task/SKILL.md` — Phase 0 step 5 (:221–229), Step 3b scoping block (:299–318), Review Methodology template (:708)
  3. `skills/qa-story/SKILL.md` — Re-Review Report Structure (:285–300), Phase 0 step 5 (:426–432), Phase 1.6 scoping block (:770–790)
  4. `evals/shared/tests/qa-re-review-scope-parity.test.mjs` — **NEW** (Phase 4)
  5. `evals/shared/tests/transition-protocol-parity.test.mjs` — prior art for the parity shape
  6. `skills/qa-task/references/`, `skills/qa-story/references/` — `npm run bundle` output; never edit directly
  7. `package.json` — verified: `evals/shared/tests/*.test.mjs` is already in the `npm test` glob, so the new Phase 4 test runs under `npm run ci` with no `package.json` edit
  8. `docs/tasks/task.67.execute-the-skill-qa-gate/task.67.gate.{1,2}.*.yml` — replay fixtures; gate.1 `security: FAIL`, gate.2 `security: PASS`, both present
- **Step 3 — no plan file** (`task.74.plan.*.md` absent). Proceeding on the task's own Implementation Plan.
- Phase 0b: no prior run — no `feature/task.74.*` branch (local or remote), no PR, no implementation report, no pipeline lock, no halt snapshot. Starting fresh.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **[Step 3 — Critical, caught by running rather than reading]** The first draft of the clause-1 trigger probe used `\s` in its `awk` pattern. `\s` is a GNU extension: BSD awk and mawk neither match it nor error, so the probe returned empty, `SAFETY_REPROBE` stayed `false`, and the carve-out would never have fired on any platform the pipeline happens to run on — **failing closed and silently, which is the same failure mode this task exists to prevent, one layer down.** Reading the snippet did not catch it; replaying it against `task.67.gate.1` (whose answer is known) caught it on the first attempt. Fixed to POSIX character classes, the corrected probe is now stated once in the shared rule, and the parity test **extracts and executes** it rather than testing a copy — so the regression is held, not just noted. Mutation M6' confirms: reintroducing `\s` turns the replay red.
- **[Step 3 — resolved]** `npm run bundle` rewrites `shared/resources/qa-re-review-scope.md` → `references/qa-re-review-scope.md` inside both `SKILL.md` files. The parity test's link assertion originally matched only the pre-bundle spelling, so it went red the moment the bundler ran — i.e. on every commit that touches the rule. The assertion now accepts either spelling.
- **[Step 3 — Critical, and the most instructive failure of this run]** A mutation-proof harness derived its backup filenames with `basename`. Both QA skills are named `SKILL.md`, so `skills/qa-task/SKILL.md` and `skills/qa-story/SKILL.md` mapped to one backup; qa-story was saved last, and the restore wrote **qa-story's entire content over `skills/qa-task/SKILL.md`**.

  **The parity suite stayed green over the corrupted tree — 28/28.** Every assertion in it is a substring search over two files that are supposed to say nearly the same things, so a file replaced by its sibling satisfies them *more* easily, not less. The suite was measuring one file twice and reporting it as agreement between two.

  It was caught by `git diff --stat` showing 3150 changed lines in a file that should have changed ~80 — i.e. by looking at the artefact, not by any test. Repaired with `git checkout HEAD --` and a full re-application of all four qa-task edits (diff now 84 lines, matching qa-story's 82).

  **Held, not just noted.** The suite gained an identity guard: each `SKILL.md` must declare the `name:` matching its own directory, and the two files must not be byte-identical. Mutation M11 reproduces the exact corruption (`cp qa-story/SKILL.md qa-task/SKILL.md`) and turns it red. This is the same lesson the task itself is about, one level up — a check that cannot distinguish its two subjects is not a parity check.

- **[Step 3 — a real gap in my own test, found by mutation M4]** `qa-task requires New Findings even when empty` searched the whole file for the phrase. The phrase legitimately appears twice — once in Phase 0's prose, once in the report template — so deleting it from the **template** left the assertion green. The assertion now extracts the `## New Findings This Cycle` section and tests against that section alone. M4 goes red on retry, and M14/M15 confirm the neighbouring assertions.

  Worth stating plainly: the first mutation run *reported* M4 as passing when it had not been proven. Only re-running the proofs with per-file targets surfaced it. A mutation proof is evidence only when the harness that runs it is itself correct — twice in this run it was not.
- **[Step 3 — pre-existing drift, carried in as collateral]** `npm run bundle` also rewrote `skills/qa-task/references/resolve-paths.sh`, which was **already stale on `develop`** before this task started (verified against `git show develop:…`). It is correct bundler output bringing a stale copy in sync with `shared/resources/resolve-paths.sh`, not a task.74 design change — it is in the diff because the task requires running the bundler and the bundler is idempotent-by-correction. Flagged here so a PR reviewer does not spend time asking why a paths helper changed in a QA-scoping task.
- **[Step 3 — expected, caught by the fast gate]** `prettier --check` flagged the new test file. This is precisely the failure `develop.fastGateCommand` (`npm run ci:fast`) was introduced by task.75 to catch in the loop rather than in CI. Fixed with `prettier --write`.

- **[Step 2 — Critical, resolved]** Task §3 "Current architecture" was factually stale. Commit `61197c3` (*feat(qa-loop): give the QA loop a stall guard…*, 2026-09-01, on `develop`) already gives cycle 2 a full-branch diff plus a `REFUTE_PASS` directive in both QA skills; the task was filed the same day and never mentions it. Its load-bearing premise — "nothing asks the first question again" — was false for cycle 2. Resolved by rewriting §3 to state the real three-way `PRIOR_GATES` branch and re-aiming the task at the residual gap (cycle 3+ after a safety failure, and the refute directive being anchored on the fixes rather than the surface). The task is narrower now, not void: Phases 1, 3 and 4 remain wholly unimplemented.

- **Pre-existing open PR #298 noted at selection time** (`docs/bug.7-zero-blocks-executed-noise`, a bug filing from the prior session). Out of scope for this run — flagged to the operator by `/develop-next`, not acted on here.

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: `feature/task.74.security-re-review-reprobes`
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}

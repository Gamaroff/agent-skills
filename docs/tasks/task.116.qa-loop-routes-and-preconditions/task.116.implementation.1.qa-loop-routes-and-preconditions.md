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
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #404: https://github.com/Gamaroff/agent-skills/pull/404 — 3 commits (feat / chore(bundle) / docs); issue #403 commented | — (PR-body summariser inline result) |
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

### Step 4 — create-pr — 2026-09-13

- SCOPE_PATHS: `docs/tasks/task.116.qa-loop-routes-and-preconditions`, `CHANGELOG.md`, `evals`, `shared`, `skills`. Pre-flight guard: no out-of-scope untracked files — nothing held.
- `/create-pr --base develop --issue 403` → `/commit-changes --scope …` (scope mode; three logical commits: `8bc27dd8` feat(qa-loop), `b4cea4e3` chore(bundle) — the pre-commit hook re-bundled in-sync and left the 85 bundled files unstaged for an explicit commit, `508d3b32` docs(task.116)). Implementation report committed here, per Step 4 rule. Leak check: all committed paths in scope.
- Branch pushed; PR body from the summariser subagent (returned in 35 s). **PR created: https://github.com/Gamaroff/agent-skills/pull/404** (`Closes #403`).
- Issue #403 comment (`in-review` stage): `posted`. Post-PR state check (inline `gh pr view`): PR #404 state = OPEN, head `508d3b32`, base develop, errors = 0.
- GitHub board: in-review → `stage-disabled` (no `pipeline.in-review` mapping in tracker-workflow.yaml; card stays In Progress — correct).

### Steps 5–6 — QA loop — 2026-09-13

- Loop setup: CYCLE=1, MAX=5, PIPELINE_MODE=standard. Traceability mapper skipped: Success Criteria is a numbered list, not a table (`HAS_SUCCESS_CRITERIA_TABLE=false`). GitHub board QA-start re-assert → `stage-disabled`.
- `/qa-task` invoked with `code_review_blocking=true` (no lite directive). Step 3b reviewer dispatched 08:03:30 UTC, returned 08:06:44 (3 m 14 s; 10-min budget) — findings block in hand before Step 10 wrote the gate at 08:08:50 (the task's own precondition, dogfooded). Step 4b executed 2+2 runnable blocks in qa-task/qa-story under bash+zsh (exit 0); the new `TMPDIR=/tmp node --test` fence refused as `node` fail-closed. QA re-ran 3 mutation proofs (all `covered`). `npm run ci:fast` 3267/3266/0, exit 0.
- **QA Cycle 1 gate: CONCERNS 80/100** — `top_issues[]` has 4 open entries (2 MEDIUM, 2 LOW). Outcome branching: open entries present → Convergence check (n/a before cycle 3) → Diminishing-returns exit (n/a before cycle 3) → **5b**. Route 3 does not apply (queue is not empty) — which is the correct reading of the arm the task added.
- QA cycle result comment posted to PR #404 (with `qa-gate` lead) and to issue #403 (`posted`). Orchestrator's `qa-cycle-1` issue comment: `posted`. `changes-requested` board stage: `stage-disabled`.
- QA Cycle 2 — 5a `/qa-task` re-review, **refute pass** (whole branch diff, 27 files; `SAFETY_REPROBE=false`, gate-1 security axis `OK reasoned`). Reviewer dispatched 08:20:32, returned 08:26:23 (5 m 51 s; waited without polling the transcript — the orchestrator blocked on the wall-clock boundary and the harness notification). Gate 2 written 08:32:33. Cycle-1 fixes verified in source + bundled copies; QA mutation proof on arm 5 → `covered`. Suite 3268/3267/0. **Gate 2: FAIL 40** — the accepting-route set turned out to be restated in the resume contract and the PR conformance prompt, both still on the token pair. Tracker comment from qa-task 13b returned `already` (cycle-less `qa-gate` stage marker — observation #84); PR comment posted.
- QA Cycle 3 — 5a `/qa-task` re-review, scope since gate 2 (`SAFETY_REPROBE=false`; 8 files / 585 lines). Reviewer 08:42:53 → 08:47:16 (4 m 23 s); gate 3 08:54:10. Cycle-2 fixes verified; QA mutation proof on the conformance bullet → `covered`; suite 3269/3268/0. **Gate 3: CONCERNS 60** — every consumer's restatement of the accepting-route set omits route 2. Convergence check: HIGH `[0, 2, 0]` — did not trip (HIGH gone, not stalled). Diminishing-returns exit (engine, `qa.testArtifactGlobs` unset → `[]`): did not fire. → 5b.
- QA Cycle 4 — 5a `/qa-task` re-review, scope since gate 3 (9 files / 704 lines; `SAFETY_REPROBE=false`). Reviewer 09:03:25 → 09:07:01 (3 m 36 s); gate 4 09:14:25. Cycle-3 fixes verified; QA mutation proof (resume `not reached` row) → `covered` on the second attempt (first mutant used a different spelling — `mutation-void`, recorded). Suite 3269/3268/0. **Gate 4: FAIL 70** — the Action-row signal has no writer on route 2. Convergence check on HIGH `[0, 2, 0, 1]`: `1 ≥ 0` but `0 ≥ 2` false → no trip. Diminishing-returns (engine): not taken. Third strike: none. → 5b.
- QA Cycle 4 — 5b `/qa-fix` (gate 4): post-guard write rule + closed value set in the preamble; On-exit step 1 writes `Action`/`PR Review`; dead template value removed; runbook snippets check what they say; ingester :172, review-pr SKILL :194/:546, qa-flow row → pointers. New writer test + review-pr in the paraphrase guard; mutation-proved ×4. Fast gate 3270/3269/0. Committed `009f4587` (report excluded), pushed once; PR head = HEAD.
- QA Cycle 3 — 5b `/qa-fix` (gate 3): the durable fix — "reached 5c" is now the cycle entry's `**Action**` row (a mechanical signal 5a already writes on every route) and every consumer points at §5c with no paraphrase; loop doc made consistent with its own arms; six more lines swept; stated-once test forbids six paraphrase shapes and requires the pointer + signal. Step 3.5 caught two residuals (`pending` row wording; §5c route 1 unpinned) — fixed and pinned. Mutation-proved ×6. Fast gate 3269/3268/0. Committed `db4be48a` (report excluded), pushed once; PR head = HEAD.
- QA Cycle 2 — 5b `/qa-fix` (gate 2): ingester read inline (findings authored this session). Fixes: CR-1 resume contract → "reached 5c" (5 sites); CR-2 conformance TRAIL bullets; CR-4 one definition of *open* + inactive WAIVED read by its queue; CR-3/CR-5 runbooks, ingester prompt, Convergence preamble; CR-6 matrix-driven exhaustiveness test + "stated once" test; CR-7 `read_nested_config_key subagents wallClockMinutes`. Step 3.5 adversarial pass: consumer sentences omitted the inactive-WAIVED-no-open cell → the set is now stated everywhere as *non-`FAIL` with no open entry, or active `WAIVED`*. Mutation-proved against 6 reverts (each red). Fast gate 3269/3268/0. Committed `5d77e7e0` (report excluded), pushed once; PR head = HEAD. qa-fix PR comment posted; tracker `already` (obs #84).
- QA Cycle 1 — 5b `/qa-fix` (gate 1): ingester not dispatched — the four entries were authored this session and read inline (reader, not reviewer; no independence at stake). Fixes: CR-1 arm 5 + malformed clause + exhaustiveness test (mutation-proved ×2); DOC-1 five runbook lines + mermaid; CR-2 step refs; CR-3 `subagents.wallClockMinutes` in configuration.md. Step 3.5 adversarial pass found the malformed clause's own example was caught by arm 5 — corrected. Fast gate (5b step 0a) `GATE_EXIT=0` 3268/3267/0. Committed `6df79fd7` (report excluded), pushed once. PR #404 OPEN, head = local HEAD. qa-fix PR comment + `qa-fix` issue comment `posted`; bugs 1–2 → Ready for QA.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Step 3 — transitive bundle growth.** Pointing qa-fix, review-task and review-story at `references/develop-pipeline-autonomous-defaults.md` made `npm run bundle` copy that file's full closure (15–16 files each: lite-mode, resume-contract, step-7-finalise, gh-stage.js, jira-stage.js, handover-*.js …) into those skills. qa-task already ships the same 46-file closure, so this is the repo's established cost of a single-source pointer, not a new pattern; accepted rather than forking the table into a leaf file (which would create a second definition). Flagged for the reviewer.
- **Step 3 — review report correction.** The Step 2 review said `evals/develop-task/protocol/` was empty; it holds `pipeline-shape` and `step-contract` tests (no route assertion). Report wording corrected before commit; the fix it prescribed (point at `pr-review-loop-parity.test.mjs`) stands.

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-09-13
**Gate Result**: CONCERNS
**Issues Found**: 4 — CR-1 MEDIUM (Outcome branching leaves PASS+open-LOW and WAIVED+inactive-waiver unrouted), DOC-1 MEDIUM (five runbook lines restate CONCERNS→qa-fix), CR-2 LOW (stale "step 4" cross-refs), CR-3 LOW (`subagents.wallClockMinutes` undocumented)
**HIGH findings**: 0
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5) → fixed 4/4 in `6df79fd7`; pushed; re-review (cycle 2, refute pass) next

### QA Cycle 2 — 2026-09-13
**Gate Result**: FAIL
**Issues Found**: 7 — CR-1 HIGH (resume contract keys 5c on PASS/WAIVED), CR-2 HIGH (conformance prompt flags route-3 gates as TRAIL defects), CR-4 MEDIUM (arm definitions inconsistent; two cells unrouted), CR-3 MEDIUM (runbook wording wrong for active WAIVED), CR-5 LOW (3 more stale sentences), CR-6/CR-7 cleanups (matrix-driven test; wallClockMinutes reader). Cycle-1 bugs 1–2 reopened (partial); bugs 3–4 new.
**HIGH findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5) → fixed 7/7 in `5d77e7e0`; pushed; re-review (cycle 3, convergence check active) next

### QA Cycle 3 — 2026-09-13
**Gate Result**: CONCERNS
**Issues Found**: 6 — CR-1 MEDIUM (resume contract's restated set omits route 2), CR-2 MEDIUM (conformance prompt flags route-2 gates), CR-3 MEDIUM (loop doc: §5c route 1, shapes table, commit-point path 1, arm-5 heading disagree with the arms), CR-6 MEDIUM (six more two-route lines), CR-7/CR-8 cleanups. Bug 1 closed; bugs 2, 3, 4 reopened; bug 5 new.
**HIGH findings**: 0
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 3 of 5) → fixed 8/8 in `db4be48a`; pushed; re-review (cycle 4) next

### QA Cycle 4 — 2026-09-13
**Gate Result**: FAIL
**Issues Found**: 5 — CR-1 HIGH (Diminishing-returns On-exit never writes the Action row the consumers read; template offers unreachable `Proceeding to finalise`), CR-2 MEDIUM (runbook snippet commands vs comment), CR-3 LOW (ingester :172), CR-4 LOW (review-pr SKILL :194/:546), CR-5 cleanup. Bugs 3–5 closed; bug 2 reopened; bug 6 new.
**HIGH findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 4 of 5) → fixed 5/5 in `009f4587`; pushed; re-review (cycle 5 — last in budget) next

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: feature/task.116.qa-loop-routes-and-preconditions
**PR**: https://github.com/Gamaroff/agent-skills/pull/404
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}

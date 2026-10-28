# Implementation Report: QA loop acts on the signals it already has

**Task**: `task.238.qa-loop-acts-on-signals-it-has.md`
**Run Number**: 1
**Started**: 2026-10-28 (UTC)
**Status**: Escalated

---

## Summary

Make the QA loop act on four signals it already holds (red CI on the PR, a pre-existing or unmeasured fast-gate red, a red gate log, and a 5c coverage finding) — first full pipeline run.

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
| Tracker Issue       | #768 (GitHub)                                                              |
| Board status        | In Progress ✅ (already — work-started transitioned on first call)          |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.238.*` exists in git                              | Branch existed at `53e2e152` (task + review 1); pushed with upstream | —                    | 2026-10-28T03:25Z |
| 2. review-task             | ✅ Done    | `task.238.review.{N}.{name}.md` exists (or skip logged)                | Skipped: Ready for Development + `task.238.review.1.…md` exists | —                    | 2026-10-28T03:25Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline; 4/4 phases; ci:fast 6491/0 | —                    | 2026-10-28T03:50Z |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #770: https://github.com/Gamaroff/agent-skills/pull/770 | —                    | 2026-10-28T03:58Z |
| 5–6. qa-task / qa-fix loop | ❌ Halted | `task.238.qa.{N}.*.md`; `task.238.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | 3 cycles: FAIL 70 → CONCERNS 80 → PASS 90, 5c APPROVE; re-entered after DoD gaps: FAIL 20 → FAIL 50; loop limit (5 of 5); +2 granted: FAIL 60 → CONCERNS 80; loop limit (7 of 7); +1 granted: CONCERNS 80; loop limit (8 of 8); +1 granted: CONCERNS 80; loop limit (9 of 9), cycle 9 fix `0df2880e` ungated | —                    | 2026-10-28T04:42Z |
| 7. finalise                | ❌ Halted  | `task.238.dod.{N}.*.md`; task `status: accepted`                       | DoD gaps (5): security probe 2 medium + 1 low; SC-10 2 unheld guards — `task.238.dod.1` | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-10-28

- Phase 0 run inline (no 0a-parallel agents dispatched): the input was a direct file path, so no resolver was needed; lite-mode inputs derived from the document directly — risk_level absent (risk_ok), phase_count 4 (not < 3), single_module false (qa-task, qa-story, qa-fix, develop, develop-bug, shared resources) → PIPELINE_MODE=standard.
- Previous-run check: branch `feature/task.238.qa-loop-acts-on-signals-it-has` already exists (created when the task and review 1 were committed, `53e2e152`); no PR and no implementation report — treated as a fresh start on the existing branch.
- Feature branch base: develop — source: asked
- PR target branch: develop — source: asked
- Mode: standard — source: detector
- Skips: none — source: none
- Questions asked (2): Q1 base → develop; Q2 PR target → develop
- qa-planning gate: skipped (auto — no prompt)
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Task status at start: `ready-for-development` — proceed normally.

### Step 1 — create-branch

- `/create-branch` not invoked: the branch `feature/task.238.qa-loop-acts-on-signals-it-has` already existed, checked out, with `origin/develop` as an ancestor. It had no upstream; pushed with `git push -u origin HEAD`. Implementation report stash/restore therefore not needed.
- Lock written at `current_step: 2` with the resolved answers.
- Tracker comment (work-started): `posted`. GitHub board: work-started → transitioned (re-read: `already`, In Progress). Priority already `P2 Medium` — nothing to set.

### Step 2 — review-task

- Skipped per the Step 2 table: status `Ready for Development` and `task.238.review.1.qa-loop-acts-on-signals-it-has.md` exists (7/10, all recommendations applied 2026-10-28).

### Step 3 — develop

- Pre-develop surface map: ~30 locations identified in shared/resources (step-5-6 QA loop, step-3 develop loop, resume contract, autonomous defaults, test-failure-triage prompt), skills/qa-task, qa-story, qa-fix, develop, develop-bug, develop-task, develop-story, review-pr, finalise (read-only source of the CI jq), and tests (pr-review-loop-parity, executed-prose lib, qa-task/qa-story tests). Corrections to the task text found by the map: develop-bug's gate is step **3a** (not 0a); qa-task's Bitbucket preamble is in **Step 13** (not 14); qa-story's is in Review Completion item 6; qa-story's report template has no `### Review Methodology` heading.
- Plan file found: docs/tasks/task.238.qa-loop-acts-on-signals-it-has/task.238.plan.qa-loop-acts-on-signals-it-has.md — included as implementation context for /develop
- Fast-gate precondition: `develop.fastGateCommand` → `ci:fast`, defined.
- Step 3 inline — /develop not invoked: the plan names every hunk and the surface map is recorded; the orchestrator implements and owes /develop's Task Completion Checklist.
- Real gate logs here use the `spec` reporter (Node 22+ default even when redirected): failures are read from the `✖ failing tests:` summary (`test at {file}:{line}:{col}` + `✖ {name} ({ms})`), not TAP `not ok` lines as the plan assumed. The base-check block reads both.
- The base check became a script, `shared/resources/fast-gate-outcome.sh`, not an inline block: an inline block failed under zsh (no word-split of `$FILES`) and on a relative path after `cd`, and develop-bug does not bundle the step-5-6 doc, so one script is the one definition both sites call. `qa-ci-read.sh` likewise holds the Step 10 CI read for qa-task and qa-story.
- Step 13 / qa-story item 6 **re-derive** the Bitbucket coordinates rather than reuse the PR Existence Check's values: every fenced block runs in its own shell, so a variable cannot carry between them. Deviates from the plan's "reuse"; recorded on the task doc's checkbox.
- Plan gap found in Phase 3: the findings ingester **dropped** `category`, so qa-fix's new coverage row could never fire. The ingester now carries `category` and skips `provenance: pre-existing` entries; its "CONCERNS never returns to qa-fix" line was rewritten. Pinned by the SC-4a test.
- develop-bug's skill-owned verify-loop doc is not scanned by the bundler (it lives under `references/`), so `fast-gate-outcome.sh` was not vendored into develop-bug until `skills/develop-bug/SKILL.md` named `references/fast-gate-outcome.sh`.
- Mutation proofs (each reverted; test red, then green on restore): fast-gate-outcome — drop `.agents/skills` from the environment grep, neuter the head-vs-base `comm`, drop exit 137; QA-loop doc — unconditional `rm`; qa-ci-read — drop `ACTION_REQUIRED`, `.conclusion // .state`, base red never pre-existing, drop the head-mismatch check; qa-task PR check — Bitbucket arm disabled; Phase 3 — awk ignores provenance, CONCERNS row reverted, resume row re-merged, ladder row removed (6 tests red).
- Checks: `npm run bundle` + `bundle:check` rc 0; `quick_validate.py` rc 0 for qa-task, qa-story, qa-fix, develop, develop-bug, develop-task, develop-story, review-pr; `shellcheck --severity=warning` (CI's level) clean; related suites 186/186. First `ci:fast` failed on prettier in 5 test files — formatted. Second failed 2 tests, both from this change: a reflow broke a phrase `ci-once-at-finalise.test.mjs` pins, and develop-bug's new `run_in_background` sentence did not mark the wait (`qa-loop-lock-fields-parity.test.mjs`) — now calls `set-waiting-on.sh`. Third run (with `.agents/skills` moved aside): 6491 tests, 0 fail, rc 0.
- Development completion comment posted to github issue 768 (`reason: posted`).

### Step 4 — create-pr

- SCOPE_PATHS: the work-item dir, CHANGELOG.md, evals/shared/tests, shared/resources, and the changed dirs under skills/{develop,develop-bug,develop-story,develop-task,qa-fix,qa-story,qa-task,review-pr} plus skills/{review-story,review-task}/references (bundled copies). Pre-flight: 0 files held. Report link check: 0 relative links, ok.
- The orchestrator's create-pr args first asked to exclude the implementation report; the Step 4 doc says its first commit belongs here, so it was committed (the doc wins).
- Commit `12dfb4b6` (60 files) with the SC-10 mutation proofs in its body; pushed. PR body written inline rather than by the summariser subagent: the full change was already in context.
- PR created: https://github.com/Gamaroff/agent-skills/pull/770 (base develop). Leak check OK. Lock `pr_url` set.
- Post-PR state check: PR #770 state = OPEN (read with `gh pr view`, not the poller subagent). errors = 0.
- Issue #768 in-review comment `reason: posted`. GitHub board: in-review → stage-disabled (the workflow file omits that moment).

### Steps 5–6 — QA loop

- QA_MAX_CYCLES = 5 (lock has no `qa_max_cycles`). GitHub board: QA-start re-assert → stage-disabled.
- Traceability mapper skipped: the task's §9 Success Criteria is a checklist, not a table (`HAS_SUCCESS_CRITERIA_TABLE=false`); qa-task mapped internally.
- Cycle 1: `/qa-task code_review_blocking=true` → gate 1 FAIL 70. Route classifier: `continue` (not-a-pass-gate; route 2 below cycle floor). → 5b.
- QA Cycle 1 — changes-requested: stage-disabled.
- 5b cycle 1 `/qa-fix`: findings ingester not dispatched. The gate, QA report and bug reports were written earlier in this session and were already in context, so qa-fix's Step 1b ran inline. fix_cycle: not supplied, so derived from the gate.
- Fixes (each test red first): bug.1, an unreadable review prints `OPEN_COVERAGE=unreadable` → Review failed arm, plus a third resume row; bug.2, Stop hook `THEN_WHAT` plus a re-sweep over all tracked types (both READMEs updated); bug.3, option-shaped `--base` → attributable before any git call, `--` before the refspec. Mutation `unreadable`→`0` turned 3 tests red; restored.
- Advisory CR-3..CR-6 left in the gate's `recommendations.future`, not fixed this cycle.
- 5b cycle 1 commit `908d3713` pushed (one push). Post-fix PR state: read with `gh pr view` rather than the poller subagent: OPEN, head `908d3713`. qa-fix comments: PR posted, issue #768 `qa-fix-1` posted. Counter → 2; qa_phase → 5a.
- Cycle 2 `/qa-task code_review_blocking=true` (refute pass, whole-branch diff, 243.9 s): gate 2 CONCERNS 80, with 1 promoted medium (CR2-1, reproduced: rc 124, worktree stranded). `--base` probed with the engine (shell-argv form, 8 cases, `engages`); calibrated `present-but-inert` on `12dfb4b6`. QA mutation M2 (drop only the `case` line) was absorbed by `check-ref-format`. Comments: PR posted, issue `qa-gate-2` posted. Convergence: HIGH [1, 0], no trip. Route classifier: `continue` (not-a-pass-gate; route 2 below cycle floor). → 5b.
- QA Cycle 2 — changes-requested: stage-disabled.
- 5b cycle 2 `/qa-fix`: the findings ingester was not dispatched (gate 2 and bug.4 were already in context), so Step 1b ran inline. fix_cycle: not supplied, so derived from the gate. bug.4 fixed test-first: 4 new assertions, red on `908d3713`. Mutations (drop `set -m`, the TERM trap, or the sweep) were each covered. Advisory cycle-2 CR-2 to CR-7 deferred to `recommendations.future`.
- 5b cycle 2 commit `8b7e8d1c` pushed (one push). PR state OPEN, head `8b7e8d1c`. qa-fix comments: PR posted, issue #768 `qa-fix-2` posted. Counter → 3; qa_phase → 5a.
- Cycle 3 `/qa-task code_review_blocking=true`, scoped to the files changed since `908d3713` (15 files; SAFETY_REPROBE=false): gate 3 PASS 90 with no open entry. The reviewer took 211 s and returned 4 low findings; none was promoted (CR-2 pre-existing on develop). `--base` re-probed on the changed script: engages, 8/0. QA mutation (drop `disown`) was covered. Comments: PR posted, issue `qa-gate-3` posted. Route 1 (PASS, no open entry) → 5c. Path-1 commit `8ac7ffef` pushed; the trail assertion found the gate and report on `origin`. qa_phase → 5c.
- 5c `/review-pr --effort medium --comment --no-code`, conformance lens only (48 s): **APPROVE**, with 1 finding (PC-1, scope, low: §7 Files Summary omitted the two new scripts and the new test). Report `task.238.pr-review.1.qa-loop-acts-on-signals-it-has.md`, `reviewed_gate` gate 3. The PR summary comment was posted. Scope: 48 files; the 38 generated `references/` copies were excluded and the authored develop-bug verify-loop was kept. No OPEN_COVERAGE check (APPROVE).
- 5c carry: PC-1 classified doc-only, since the task doc is tracked and clean. §7 gained a "Files to Create" list; doc-links ok. The review report and the task doc are staged for the 6a acceptance commit, and HEAD has not moved. `ready-for-merge`: stage-disabled. Loop exits → Step 7.

### Step 7 — finalise

- `/finalise` DoD `task.238.dod.1`. CI reading 1: SUCCESS @ `8ac7ffef` over 6 checks. Four DoD agents ran in parallel: AC PARTIAL (13/14, SC-10 FAIL), security PASS on the checklist with `boundary: true` and a 4-control plan, compliance N/A, docs PASS.
- SC-10 was executed, not just read. The 11 guards no commit message records were mutation-run in a scratch worktree at `8ac7ffef`. 9 went red on revert. 2 stayed green: `qa-ci-read.test.mjs:397` (the `--vcs` check dropped still exits 2 at `git rev-parse`) and the `qa-loop-fast-gate-outcomes.test.mjs:632` `--exit abc` case (still exits 2 at the missing-log check). A test-only fix was drafted and verified but not applied.
- Step 3b.1 probe plan: 28 executed, 0 escapes, 0 refusals, 3 reproduced. The security agent graded them: `log-path-dotdot-test-at` and `-location` **medium** (`fast-gate-outcome.sh:99` refuses only a leading `/`, so a `../` path from the gate log runs the head checkout's copy at the base), `oc-coverage-quoted` **low**. Record: `task.238.dod.1.security.run.json`.
- Step 6 decision: **NOT ACCEPTED, 5 gaps**. Step 8a does not apply: two sections FAIL and two findings are medium. Gap report written to the task body; Change Log row added; gaps PR comment posted (issuecomment-6460939215). Lock held at 7 by `advance-pipeline-lock.sh --skill finalise`.
- HALT per Step 7 "If DoD Gaps Are Found". The gaps change code, so the resume should take **Re-enter QA at 5a** (`reenter-qa-after-finalise.sh`).

### Resume — QA re-entry after finalise DoD gaps — 2026-10-28

- The HALT left the lock at 7 with no halt snapshot. Snapshot written and lock removed on resume (`halt_step` 7), so the re-entry script could restore from it.
- Gaps fixed in `adff39e2`, test-first: the 2 `..` tests and 2 quoted-coverage tests were red on `3080a556` (the `..` case classed `pre-existing`, as the DoD probe did). Fix: `..`-segment guard in `fast-gate-outcome.sh`; the §5c awk accepts a quoted `category:` / `provenance:`; both usage tests assert each case's own stderr.
- Mutation proofs recorded in the `adff39e2` message: `--vcs`, `--pr`, `--exit` checks, the `..` guard, both quote allowances, each red on revert. The 9 guards `/finalise` proved at `8ac7ffef` are listed there too.
- QA re-entry after finalise DoD gaps: reenter-qa: re-entered QA at step 5 / qa_phase 5a — qa_max_cycles=5 (base 3), gate_head=8b7e8d1cb9d2779d36a00731d3f1c13eebc8135a.

### QA fix cycle 4 — bug.6 rule — 2026-10-28

- The user chose to **fail closed with a clean-ratchet allowance**. `pre-existing` needs node's results to end the log; only npm's failure report and a clean `tmp-leak` report may follow them. Rejected alternatives:
  - Fully generic fail-closed: `pre-existing` would never fire in this repository, since every red ends with `tmp-leak` lines.
  - Running the whole fast gate at the base: minutes long, and it breaks the 90 s bound.
- CR4-9 does not use `ℹ cancelled N`. Measured on node 26.8.2, a SIGTERM/SIGINT interrupt and a test timeout both print `fail 0` / `cancelled 1`. Only the `test-tmpdir` wrapper's own signal line separates them, so only that line makes a run not measured. A plain `node --test` interrupt stays attributable and spends a retry: the safe direction.

### QA cycle 5 routing — 2026-10-28

- Gate 5 FAIL, HIGH sequence `1, 0, 0, 3, 2`. Convergence check: no trip (`HIGH_{N-2}` = 0). Third strike: no (`fast-gate-outcome.sh` has HIGH in gates 4 and 5 only). Route: `continue`. Narrowing offer: not signalled (`high-findings-remain`).
- QA Cycle 5 — changes-requested: stage-disabled.
- qa-fix cycle 5 — fix_cycle: not supplied, so it is derived from the gate (5). The findings ingester was not dispatched: this session authored gate 5 and bug.10–bug.12 minutes earlier, so the findings were read inline (Step 1b). That loses ingester independence; the findings themselves are QA's, unchanged.
- bug.10 design: key on `line:column` rather than on the suite path. Node's spec summary omits the suite, while both reporters print the position. A test whose line moved reads attributable: the safe direction, at the cost of a triage on a PR that edits the failing test's file.
- bug.11 design: the TAP check starts at the final top-level plan. Node 26.8.2 prints a test's own stdout and stderr as `#` lines before it, so checking every `#` line would refuse any chatty suite. That variant was mutation-tested and turned the control red.
- Cycle 5 is the last of `qa_max_cycles` 5: after 5b commits, Loop Escalation's loop-limit trigger runs (route 2c is evaluated first; it requires HIGH 0 on the last gate, so it declines).

### QA loop re-entry — 2026-10-28

- QA loop re-entry: 2 extra cycles granted; 0 cycle(s) run outside the loop back-filled from disk. The user chose "Resume at 5a with 2 more cycles" at invocation. `grant-qa-cycles.sh` restored the lock from the halt snapshot: `QA_CYCLE=5`, `qa_max_cycles=7`, `reenter_at=5a`. Cycle 6 gates the cycle 5 fix `8345b798`.

### QA cycle 6 routing — 2026-10-28

- Traceability mapper skipped, as on cycles 1–5: §9 Success Criteria is a checklist (`HAS_SUCCESS_CRITERIA_TABLE=false`).
- Gate 6 FAIL. HIGH sequence `1, 0, 0, 3, 2, 2`. Convergence check: no trip (`HIGH_{N-1}` 2 ≥ `HIGH_{N-2}` 3 is false). Route classifier: `continue` (`not-a-pass-gate`; route 2 declined: `high-findings-remain`). Narrowing offer: not signalled (`high-findings-remain`).
- QA Cycle 6 — changes-requested: stage-disabled.
- **Third strike:** `shared/resources/fast-gate-outcome.sh` is the subject of HIGH findings in gates 4, 5 and 6 (`high_files` comm over the three gates). The struck mechanism, named from the three gates' findings, is the head-vs-base comparison of failing-test keys parsed from node's log. That covers the key (`failing_pairs` + `sort -u` + `comm`) and the deny rules around it (`trailer`, `stray_diagnostic`, the environment greps). Each cycle found another log shape the comparison misread as `pre-existing`. `/qa-fix` may not patch that mechanism again. It may delete it, replace it, or waive the finding with a documented reason. CR6-6 (prefix stripping) does not touch the struck mechanism's decision and is fixed as usual.

### QA cycle 7 routing — 2026-10-28

- Traceability mapper skipped, for the same reason as cycles 1–6.
- Gate 7 CONCERNS, 80/100, with open entries. The HIGH sequence is `1, 0, 0, 3, 2, 2, 0`. The
  Convergence check does not trip (`HIGH_N` is 0).
- Route classifier: `continue` (`not-a-pass-gate`; route 2 declined: `high-findings-remain`, since
  `HIGH_{N-1}` is 2).
- Narrowing offer: not signalled (`high-findings-remain`).
- Third strike: none. Gate 7 raised no HIGH, so the three-gate intersection is empty. bug.15 and
  bug.16 are in `develop-pipeline-step-5-6-qa-loop.md` (the §5c open-coverage awk), not in
  `fast-gate-outcome.sh`.
- QA Cycle 7 — changes-requested: stage-disabled.
- Cycle 7 is `QA_MAX_CYCLES`. After this 5b, the Loop limit trigger asks the engine for route 2c
  (gate-the-last-fix).

### QA loop re-entry (second grant) — 2026-10-28

- QA loop re-entry: 1 extra cycle granted; 0 cycle(s) run outside the loop back-filled from disk. The user chose "Resume at 5a with 1 more cycle" at invocation. `grant-qa-cycles.sh` restored the lock from the halt snapshot: `QA_CYCLE=7`, `qa_max_cycles=8`, `reenter_at=5a`. Cycle 8 gates the cycle 7 fix `d51a9dca`.

### QA cycle 8 routing — 2026-10-28

- Traceability mapper skipped, for the same reason as cycles 1–7. `SAFETY_REPROBE=false`: gate 7's security is CONCERNS/measured, with no HIGH and no FAIL. The scope is the files changed since gate 7's head (27 files).
- CR-1 kept at the reviewer's `medium`. The measured plausibility is low: 0 of 183 tracked review reports use such a value, and review-pr emits plain scalars. Severity was not lowered, for consistency with bug.16 (the same class, rated medium at gate 7), and because the check's documented guarantee is false either way. With `medium`, the gate reads CONCERNS and the loop continues.
- Gate 8 CONCERNS. The HIGH sequence is `1, 0, 0, 3, 2, 2, 0, 0`. The Convergence check does not trip (`HIGH_N` is 0). Route classifier: `continue` (`not-a-pass-gate`; route 2 declined: `product-defect-signal`).
- Third strike: none, since gates 7 and 8 raised no HIGH.
- Narrowing offer: signalled. "Narrowing residue — every MEDIUM on gates 7 and 8 names shared/resources/develop-pipeline-step-5-6-qa-loop.md (TASK-238-CR7-1, TASK-238-CR7-2, TASK-238-CR8-1); HIGH 0 on both. This is an OFFER to qa-fix Step 2.6, not a route and not an escalation."
- QA Cycle 8 — changes-requested: stage-disabled.
- Cycle 8 is `QA_MAX_CYCLES`. After this 5b, the Loop limit trigger asks the engine for route 2c.
- qa-fix cycle 8: Step 2.6 narrowing offer taken, move **consolidate** (value allow-list), `92e33b0f`. fix_cycle not supplied; derived from the gate (8).
- Loop limit (8 of 8): route 2c declined. `Loop route: continue (medium-not-falling) — MEDIUM reads 0, 2, 1 over cycles 6–8 — route 2c needs it strictly falling, or 0 on the last gate, which is the evidence that one more gate would clear.` Escalating.

### QA loop re-entry (third grant) — 2026-10-28

- QA loop re-entry: 1 extra cycle granted; 0 cycle(s) run outside the loop back-filled from disk. The user chose "Resume at 5a with 1 more cycle" at invocation. `grant-qa-cycles.sh` restored the lock from the halt snapshot: `QA_CYCLE=8`, `qa_max_cycles=9`, `reenter_at=5a`. Cycle 9 gates the cycle 8 fix `92e33b0f` (head `51dc912e`).
- The hand-run `task.238.pr-review.2` (REQUEST CHANGES, option 2 of the HALT run by the operator) was staged but uncommitted at resume. It rides the cycle 9 commit as an artifact; it is not a 5c outcome of the loop.

### QA cycle 9 routing — 2026-10-28

- Traceability mapper skipped, for the same reason as cycles 1–8. `SAFETY_REPROBE=false`: gate 8's security is CONCERNS/measured, with no HIGH and no FAIL. The scope is the files changed since gate 8's head (21 files; reviewable code is the §5c awk, its fixtures and the CHANGELOG).
- The diff reviewer wrote into the session scratchpad: it prepended `REVIEW="$1"` to QA's extracted-block script. A calibration case caught it, and every probe was re-run from a fresh extraction. Its findings are unaffected.
- CR-2 (reviewer confidence medium) entered `top_issues[]` as a QA finding (CR9-2), not by promotion. QA reproduced it independently with the probe engine, and PyYAML confirms the shape is invalid YAML. It is kept at `medium` for consistency with bug.16 and bug.17 (the same class, measured plausibility 0).
- Gate 9 CONCERNS. The HIGH sequence is `1, 0, 0, 3, 2, 2, 0, 0, 0`. The Convergence check does not trip (`HIGH_N` is 0). Route classifier: `Loop route: continue (not-a-pass-gate) — the gate reads CONCERNS — route 2b is PASS-only; a CONCERNS token is a reservation 5c must see raised, not carried (and route 2 declined: product-defect-signal).`
- Third strike: none, since gates 8 and 9 raised no HIGH.
- Narrowing offer: signalled. "Narrowing residue — every MEDIUM on gates 8 and 9 names shared/resources/develop-pipeline-step-5-6-qa-loop.md (TASK-238-CR8-1, TASK-238-CR9-1, TASK-238-CR9-2); HIGH 0 on both. This is an OFFER to qa-fix Step 2.6, not a route and not an escalation."
- QA Cycle 9 — changes-requested: stage-disabled.
- Cycle 9 is `QA_MAX_CYCLES`. After this 5b, the Loop limit trigger asks the engine for route 2c.
- qa-fix: the findings ingester was not dispatched. Gate 9's findings were already held, because
  this session wrote them, so the fix pass is not independent of the review. `pr-review-current.js`
  read `superseded`, so PR review 2 was not ingested.
- Route 2c: `Loop route: continue (medium-not-falling) — MEDIUM reads 2, 1, 2 over cycles 7–9 — route 2c needs it strictly falling, or 0 on the last gate, which is the evidence that one more gate would clear.` Escalated.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Step 7 DoD gaps (5)**, from `task.238.dod.1`:
  1. Security, medium: `shared/resources/fast-gate-outcome.sh:99` accepts a `test at ../../x.test.mjs` failing-test path, so a head-only red can be classed `pre-existing` and pushed.
  2. Security, medium: the same escape via `location: '../../…'` (`:96`).
  3. Security, low: the 5c open-coverage awk (`develop-pipeline-step-5-6-qa-loop.md:1547`) misses a quoted `category: "coverage"`.
  4. SC-10: `shared/resources/tests/qa-ci-read.test.mjs:397` usage test is unheld (it does not go red with the `--vcs` validation removed).
  5. SC-10: `evals/shared/tests/qa-loop-fast-gate-outcomes.test.mjs:632` `--exit abc` case is unheld (it does not go red with the `--exit` number check removed).
  - Escalated: pipeline HALTed at Step 7. Resume with "Re-enter QA at 5a".
  - Resolved: all 5 fixed in `adff39e2`; QA re-entered at 5a to gate the fix before `/finalise` re-runs.

### QA Loop Limit Reached — 2026-10-28

The pipeline completed 5 qa-task/qa-fix cycles without a clean PASS. The 5-cycle budget counts the
three cycles before the finalise re-entry: `qa_max_cycles` was 5, from `reenter-qa-after-finalise.sh`.

**Final gate status**: FAIL (gate 5, 50/100, head `4ef29ed1`). Cycle 5's fix (`8345b798`) has **not
been gated**.
**HIGH findings per cycle**: 1, 0, 0, 3, 2. Not a stall: the Convergence check did not trip
(`HIGH_{N-2}` = 0). The cycle 4 and cycle 5 HIGHs are new findings each time, not repeats.
**Remaining issues** (from gate 5; all three fixed in `8345b798` and Ready for QA, ungated):
- TASK-238-CR5-1 (high), `shared/resources/fast-gate-outcome.sh`: failures were keyed by leaf name,
  which spec shares across describes (bug.10).
- TASK-238-CR5-2 (high), `shared/resources/fast-gate-outcome.sh`: node's own diagnostic errors
  were never looked for (bug.11).
- TASK-238-PRB5-1 (medium), `shared/resources/fast-gate-outcome.sh`: a second node summary reset
  the trailer check (bug.12).
- Advisory, not gated: `qa-ci-read.sh` `--event push` for the GitHub base reading (CR-5 / CR-3);
  a non-node red printed *before* node's results is never examined.

**What was attempted per cycle**:
- Cycle 1: open-coverage unreadable fails closed; Stop-hook 5c re-prompt; `--base` option guard
  (bug.1-bug.3).
- Cycle 2: bounded base run with cleanup on every exit (bug.4). Gate 3 PASS; 5c APPROVE;
  `/finalise` then found 5 DoD gaps, fixed in `adff39e2`, and QA was re-entered at 5a.
- Cycle 4: per-test base comparison; fail closed on non-node output; Bitbucket same-pipeline base;
  every YAML coverage shape; option-shaped path guard (bug.5-bug.9).
- Cycle 5: position key; node diagnostic refusal; trailer kept across runs (bug.10-bug.12).
- Route 2c (gate-the-last-fix half-cycle) was evaluated and declined: `high-on-last-gate`, since
  gate 5 raised 2 HIGH.

**Likely root cause**: every HIGH since cycle 4 is in one file, `fast-gate-outcome.sh`, and in one
claim: that a head red is *pre-existing*. The classifier infers that from a free-text log. Each
safety re-probe finds another log shape the inference had not considered:
- bare names
- non-node steps
- describes that share a leaf name
- node's own diagnostics
- multiple runs

The fixes have each narrowed `pre-existing`, which is the safe direction. But the claim is a deny-list
over an open input, the shape Step 2.6 calls a narrowing residue: copying more of node's output
format is still a patch.

**Recommended next steps**:
1. Grant 1-2 more cycles to gate `8345b798`: on resume, choose "Resume at 5a with {k} more cycles".
   The fix answers every gate 5 finding, with red-before tests and 6 mutations.
2. Or change the claim's shape: `pre-existing` only when the head log is a node --test run
   **alone** (the gate is exactly `node --test …`), and attributable otherwise. That is an
   allow-list of the accepted shape, not more deny rules.
3. Or accept gate 5's residue with a waiver and take option 2 of the HALT message (5c, then
   `/finalise`). Not recommended: gate 5's HIGHs are fixed but ungated.

### QA Loop Limit Reached — 2026-10-28 (after 2 granted cycles)

The pipeline completed 7 qa-task/qa-fix cycles without a clean PASS. The owner granted 2 more
cycles at the first escalation (`qa_max_cycles` 5 → 7), and both are spent.

**Final gate status**: CONCERNS (gate 7, 80/100, head `ad6fef33`). Cycle 7's fix (`d51a9dca`) has
**not been gated**.
**HIGH findings per cycle**: 1, 0, 0, 3, 2, 2, 0. Falling: gate 7 raised no HIGH. The Convergence
check did not trip.
**MEDIUM findings per cycle**: 2, 1, 0, 2, 1, 0, 2.
**Remaining issues** (from gate 7; all three fixed in `d51a9dca` and Ready for QA, ungated):
- TASK-238-CR7-1 (medium), `shared/resources/develop-pipeline-step-5-6-qa-loop.md`: the
  open-coverage check read `provenance: pre-existing` in free text (bug.15).
- TASK-238-CR7-2 (medium), same file: two valid YAML shapes read `0` rather than `unreadable`
  (bug.16).
- TASK-238-PRB7-1 (low), `shared/resources/fast-gate-outcome.sh`: a test printing the wrapper's
  signal sentence read not-measured.
- Advisory, not gated: CR7-3 (the CI read compares per job), CR7-4 (the background log removal keys
  on any `GATE_EXIT=0` line), CR7-6 (Bitbucket pipelines beyond the newest 50).

**What was attempted per cycle**:
- Cycles 1–5: see the first escalation above.
- Cycle 6: third strike on `fast-gate-outcome.sh`. The owner chose to delete the `pre-existing`
  outcome, so a red is now not-measured or attributable. SC-2 and SC-6 were amended, and the
  structured comparison was deferred (`ad6fef33`).
- Cycle 7: gate 7 verified the deletion (bug.13 and bug.14 closed) and found two MEDIUM defects in
  the §5c open-coverage awk. Both were fixed as one consolidate move: an allow-list of line shapes,
  with any other line read as `unreadable`. PRB7-1 and CR7-5 were fixed too (`d51a9dca`).
- Route 2c (the gate-the-last-fix half-cycle) was evaluated and declined: `medium-not-falling`
  (MEDIUM reads 1, 0, 2 over cycles 5–7).

**Likely root cause**: no single blocker remains. The struck mechanism is gone, and gate 7 raised no
HIGH. The safety re-probe now finds MEDIUM defects in the hand-rolled readers this task added:
- cycle 4: the awk read of the YAML coverage block;
- cycle 7: the same awk again;
- cycle 7: the free-text wrapper sentence.

Each fix moved toward an allow-list, the direction Step 2.6 recommends. The last fix has no gate,
because the budget ran out on a fix, which is the shape route 2c exists for. Route 2c declined only
because gate 6 raised no MEDIUM (it was all HIGH), which breaks the falling sequence.

**Recommended next steps**:
1. Grant 1 more cycle to gate `d51a9dca`: on resume, choose "Resume at 5a with 1 more cycle". The
   fix answers every gate 7 entry, with 10 red-before tests and a 183-report corpus check.
2. Or accept with a waiver: take option 2 of the HALT message (5c `/review-pr`, then `/finalise`).
   This is reasonable here because gate 7 had no HIGH, but its MEDIUM fixes are ungated.
3. File CR7-3, CR7-4 and the deferred structured fast-gate comparison as a follow-up task.

### QA Loop Limit Reached — 2026-10-28 (after 3 granted cycles)

The pipeline completed 8 qa-task/qa-fix cycles without a clean PASS. The owner granted a third
cycle (`qa_max_cycles` 7 → 8), and it is spent.

**Final gate status**: CONCERNS (gate 8, 80/100, head `a2a41ca1`). Cycle 8's fix (`92e33b0f`) has
**not been gated**.
**HIGH findings per cycle**: 1, 0, 0, 3, 2, 2, 0, 0. Gates 7 and 8 raised no HIGH. The Convergence
check did not trip.
**MEDIUM findings per cycle**: 2, 1, 0, 2, 1, 0, 2, 1.
**Remaining issues** (from gate 8; fixed in `92e33b0f` and Ready for QA, ungated):
- TASK-238-CR8-1 (medium), `shared/resources/develop-pipeline-step-5-6-qa-loop.md`: the
  open-coverage check read `0` for value shapes it did not read (bug.17).
- Carried advisory, not gated: CR7-3, CR7-4 and CR7-6 (as above).

**What was attempted per cycle**:
- Cycles 1–7: see the two escalations above.
- Cycle 8: gate 8 verified cycle 7's fixes (bug.15 and bug.16 closed; PRB7-1 held). It found one
  MEDIUM in the same awk: values, not lines, were unchecked. The pipeline sent the narrowing offer
  (every MEDIUM on gates 7 and 8 names one file). qa-fix took **consolidate**: a value allow-list
  that completes the line allow-list (`92e33b0f`).
- Route 2c was evaluated and declined: `medium-not-falling` (MEDIUM reads 0, 2, 1 over cycles 6–8).

**Likely root cause**: no blocker remains, and gates 7 and 8 raised no HIGH. The last three MEDIUMs
were all in one hand-rolled reader, the §5c open-coverage awk. Each cycle found the next shape it
did not refuse:
- cycle 7: free text, then two list shapes;
- cycle 8: values.

The check now accepts only review-pr's emitted shape. That closes the class by construction, rather
than by another enumerated shape. Measured exposure is zero: none of the 183 tracked reports uses
any refused shape. Route 2c declined because gate 6 raised no MEDIUM (it was all HIGH), not because
the loop stopped improving.

**Recommended next steps**:
1. Accept with a waiver: take option 2 of the HALT message (5c `/review-pr`, then `/finalise`).
   This is reasonable here. There is no HIGH on the last two gates. The ungated fix narrows a
   reader to an allow-list, mutation-proven against all 183 reports with no change. 5c re-reads the
   head, so the fix is not shipped unread.
2. Or grant 1 more cycle to gate `92e33b0f`: choose "Resume at 5a with 1 more cycle".
3. Either way, file a follow-up task to:
   - replace the awk with a bundled script that holds the shape table and its tests (gate 8's
     `recommendations.future`);
   - cover CR7-3, CR7-4 and the deferred structured fast-gate comparison.

### QA Loop Limit Reached — 2026-10-28 (after 4 granted cycles)

The pipeline completed 9 qa-task/qa-fix cycles without a clean PASS. The owner granted a fourth
cycle (`qa_max_cycles` 8 → 9), and it is spent.

**Final gate status**: CONCERNS (gate 9, 80/100, head `51dc912e`). Cycle 9's fix (`0df2880e`) has
**not been gated**.
**HIGH findings per cycle**: 1, 0, 0, 3, 2, 2, 0, 0, 0. Gates 7, 8 and 9 raised no HIGH. The
Convergence check did not trip.
**MEDIUM findings per cycle**: 2, 1, 0, 2, 1, 0, 2, 1, 2.
**Remaining issues** (from gate 9; fixed in `0df2880e` and Ready for QA, ungated):
- TASK-238-CR9-1 (medium), `shared/resources/develop-pipeline-step-5-6-qa-loop.md`: a failed `awk`
  left `OPEN_COVERAGE` empty, which took the Otherwise exit (bug.18).
- TASK-238-CR9-2 (medium), `shared/resources/develop-pipeline-step-5-6-qa-loop.md`: a key line
  after a one-line flow entry read as that entry's key (bug.19).
- Advisory, not fixed: CR9-4 (no test runs the block under mawk or BWK awk), CR9-5, and the carried
  CR7-3 and CR7-4.
- Task-doc LOWs, outside what qa-fix may edit: the Overview's "Three fast-gate outcomes" line and
  the ticked Phase 1 checkbox. Also no `pr_number` in the frontmatter (PC-5).

**What was attempted per cycle**:
- Cycles 1–8: see the three escalations above.
- Cycle 9: gate 9 verified cycle 8's fix (bug.17 closed; all four guards mutation-proven). It found
  two MEDIUMs in the same check: one in the shell wrapper and one in the flow-entry rule. qa-fix
  took **patch** (`0df2880e`) and also fixed the low CR9-3 (a cut-short list).
- Route 2c was evaluated and declined: `medium-not-falling` (MEDIUM reads 2, 1, 2 over cycles 7–9).

**Likely root cause**: no blocker remains, and gates 7–9 raised no HIGH. Every MEDIUM on gates 7, 8
and 9 is in one hand-rolled reader, the §5c open-coverage awk. Each gate finds the next shape it
does not refuse:
- cycle 7: free text, then two list shapes;
- cycle 8: values;
- cycle 9: a failed awk, a flow entry followed by a key.

That is eight shape gaps in all. An awk reading YAML by line shape can only enumerate refusals, so
the loop will keep finding one more. Measured exposure is still zero: none of the 184 tracked
reports changes reading under any fix.

**Recommended next steps**:
1. Accept with a waiver: take option 2 of the HALT message (5c `/review-pr`, then `/finalise`).
   There is no HIGH on the last three gates. The ungated fix only adds refusals. Each is
   mutation-proven, and all 184 reports read the same. 5c re-reads the head, so the fix is not
   shipped unread.
2. File a follow-up task to replace the awk with a bundled script that uses a real YAML parser
   (gate 8 and 9 `recommendations.future`). Have it cover CR9-4, CR7-3, CR7-4 and the deferred
   structured fast-gate comparison.
3. Or grant 1 more cycle to gate `0df2880e`: choose "Resume at 5a with 1 more cycle". On this
   history, it will likely find a ninth shape.

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-10-28
**Gate Result**: FAIL (70/100)
**Issues Found**: 3 — TASK238-CR-1 open-coverage check reads an unreadable review as clean (bug.1); TASK238-CR-2 Stop hook 5c re-prompt still exits every CONCERNS (bug.2); TASK238-QA-1 `--base` reaches `git fetch` as an option (bug.3). Advisory: CR-3..CR-6. PR CI green on `12dfb4b6`.
**HIGH findings**: 1
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)
**Fixes Applied**: bug.1 open-coverage check prints `unreadable` → Review failed (plus a third resume row); bug.2 Stop hook 5c `THEN_WHAT` and both READMEs; bug.3 option-shaped `--base` → attributable, `--` before the refspec. Fast gate attempt 1 red on prettier (formatted), attempt 2 green, 6497/0.
**Commit**: `908d3713`

### QA Cycle 2 — 2026-10-28
**Gate Result**: CONCERNS (80/100)
**Issues Found**: 1 — TASK238-CR2-1: the base run in `fast-gate-outcome.sh` has no timeout, and a kill strands its worktree (bug.4, reproduced). bug.1–bug.3 verified and closed. Advisory: cycle-2 CR-2..CR-7. PR CI pending on `908d3713` (recorded, not waited on).
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)
**Fixes Applied**: bug.4: the base run is a process group under a watchdog (`FAST_GATE_BASE_TIMEOUT`, default 90 s); a timeout reads attributable; the EXIT trap kills the group and removes the worktree on TERM, INT and HUP; a SIGKILLed predecessor's worktree is swept. Fast gate attempt 1 was red on two harness guards (a wall-clock assert and a hardcoded spawn timeout in the new test), fixed with `spawnBudget`. Attempt 2 green, 6500/0.
**Commit**: `8b7e8d1c`

### QA Cycle 3 — 2026-10-28
**Gate Result**: PASS (90/100)
**Issues Found**: 0 — bug.4 verified and closed. Advisory: cycle-3 CR-1, CR-3 and CR-4 (low), and CR-2 (low, pre-existing on develop). PR CI pending on `8b7e8d1c` (recorded, not waited on).
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: APPROVE
**Loop exit**: n/a — this exit not taken
**Action**: Proceeding to 5c (PR conformance review)
**Fixes Applied**: none — gate passed
**Commit**: `8ac7ffef` (gate 3 and QA report, path 1)

### QA Cycle 4 — 2026-10-28
**Gate Result**: FAIL (20/100)
**Issues Found**: 7: bug.5 (bare-name base comparison), bug.6 (pre-existing ignores non-node red), bug.7 (Bitbucket base reading uses any pipeline), all HIGH; bug.8 (open-coverage awk shapes) and bug.9 (option-shaped test path, probe-measured), both MEDIUM; CR4-8 and CR4-9 LOW. All 5 DoD 1 gaps are verified fixed. PR CI pending on `adff39e2` (recorded, not waited on).
**HIGH findings**: 3
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 4 of 5)
**Fixes Applied**: bug.5: the fast gate compares failing tests as file + name pairs; a failing file absent at the base, or a test with no file, is attributable; the base uses the head log's reporter. bug.6: `pre-existing` needs node's results to end the log, except npm's report and a clean `tmp-leak` report. bug.7: the Bitbucket base reading uses the same pipeline (selector type + pattern). bug.8: the §5c awk reads comments, list-first keys, the flow form and any letter case, and prints `unreadable` on an entry it cannot read. bug.9: a `-`-leading path is refused. Also CR4-8 (a rerun supersedes), CR4-9 (wrapper signal line → not measured) and advisory CR-6 (a base containing `HEAD` is refused). Every new test was red on `adff39e2`; 13 mutations were each red; awk results agree across gawk ×3 and mawk. Fast gate attempt 1 green, 6519/0.
**Commit**: `4ef29ed1`

### QA Cycle 5 — 2026-10-28
**Gate Result**: FAIL (50/100)
**Issues Found**: 3: bug.10 (a leaf test name shared across describes reads pre-existing) and bug.11 (node's own diagnostic errors are never looked for), both HIGH, both reproduced by QA on node 26.8.2; bug.12 (a second node summary resets the trailer check), MEDIUM, probe-measured. bug.5 to bug.9 verified and closed. Advisory: `--event push` for the GitHub base reading (cycle 4 CR-5, again). Probes 57 executed, 0 escaped. PR CI pending on `4ef29ed1` (recorded, not waited on).
**HIGH findings**: 2
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Escalating — loop limit reached
**Fixes Applied**:
- **bug.10:** failures are keyed on file, line and column, which node prints in both reporters.
- **bug.11:** any node diagnostic other than the run summary or the coverage report is attributable. In spec every `ℹ` line is checked; in TAP, `#` lines are checked after the final plan.
- **bug.12:** the trailer check no longer resets at a later node summary.

Evidence:
- Every new test was red on `4ef29ed1`, and both should-merge controls pass on real node 26.8.2 logs.
- 6 mutations were each red.
- The awk output is identical under gawk ×3 and mawk 1.3.4.
- A TAP-subtest fixture's typed column (`3:54`) was corrected to node's `3:34`.
- Fast gate: attempt 1 was red on prettier (the new test file); attempt 2 was green, 6538 tests, 0 fail.

**Commit**: `8345b798`

### QA Cycle 6 — 2026-10-28
**Gate Result**: FAIL (60/100)
**Issues Found**: 3. Two HIGH: bug.13 (PRB6-1, tests generated at one position fold into one key under `sort -u`; probe-reproduced and reproduced on node 26.8.2) and bug.14 (CR6-1, a file load failure is compared without its cause; QA-reproduced). One LOW: CR6-6 (`$PWD` against symlink-resolved TAP paths). bug.10–bug.12 verified, mutation-proven (4/4) and closed. Advisory: CR6-2..CR6-5, CR6-7. Probes 61 executed, 1 reproduced, 0 escaped. Fast gate green (6538/0); PR CI green on `8c43db0c`.
**HIGH findings**: 2
**MEDIUM findings**: 0
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 6 of 7)
**Fixes Applied**:
- **Struck mechanism:** the `pre-existing` base comparison in `fast-gate-outcome.sh`, with HIGH findings in gates 4, 5 and 6.
- **Move: delete** (owner's choice at the third-strike question). The script now answers `green`, `not-measured` or `attributable`; `--base` is refused as an unknown argument. Both step docs, develop-bug's SKILL.md, the CHANGELOG, SC-2, SC-6 and § 8 now say "two outcomes for a red". A structured comparison is recorded as Deferred Work on the task.
- **bug.13, bug.14:** fixed by the deletion. Each keeps a regression test that read `pre-existing` under the `8c43db0c` script (checked by running that script on the same fixtures) and now reads attributable, with the base untouched.
- **CR6-6:** moot — the `$PWD` comparison it named was deleted.

Evidence:
- `qa-loop-fast-gate-outcomes.test.mjs` is rewritten (1153 → ~460 lines), 20/20.
- 3 mutations were each red: re-adding a base worktree (5 tests), printing `pre-existing` for a red (8), and ignoring the wrapper's signal report (2).
- The Step 3.5 probe for `pre-existing red`, `pre-existing on`, `GATE_OUTCOME=pre-existing`, `base worktree`, `fast-gate-outcome`, `BASE_CHECK` and `FAST_GATE_BASE_TIMEOUT` found only the edited files; `docs/` outside tasks has no hit.
- `bundle:check` 0 problems; `validate` develop-bug ✓.
- Fast gate: attempt 1 green, 6511 tests, 0 fail.

**Commit**: `ad6fef33` (with gate 6, QA report 6 and the cycle 6 probe record). PR comment issuecomment-6462521411; tracker comment `qa-fix-6` posted on #768.

### QA Cycle 7 — 2026-10-28
**Gate Result**: CONCERNS (80/100)
**Issues Found**: 3. Two MEDIUM, both in the §5c open-coverage awk and both reproduced by the probe engine: bug.15 (CR7-1, `provenance: pre-existing` matched in free text) and bug.16 (CR7-2, a bare-dash item and a next-line flow sequence read `0`). One LOW: PRB7-1 (a test printing the wrapper's signal sentence reads not-measured; bounded). bug.13 and bug.14 were verified and closed. Advisory: CR7-3 to CR7-6. Probes: 74 executed, 4 reproduced, 0 escaped. Fast gate green (6511/0). PR CI pending on `ad6fef33` (recorded, not waited on).
**HIGH findings**: 0
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Escalating — loop limit reached

**Fixes Applied**:
- bug.15 and bug.16, one change (Step 2.6, repeat subject after bug.8; move: **consolidate**). The §5c open-coverage awk now reads an allow-list of line shapes: `- key:` and `- {…}` entries at the first item's indent, keys two columns deeper, and deeper text lines that are never read for a key. Any other line reads `unreadable`. Flow entries are tokenised, so a quoted value stays text.
- PRB7-1: `fast-gate-outcome.sh` counts the wrapper's signal sentence only when no node summary line (`ℹ`/`#` tests, fail, …) follows it.
- CR7-5: develop-bug's not-measured restatement now names the wrapper's signal report.
- Deferred, advisory: CR7-3, CR7-4, CR7-6.

**Evidence**:
- 10 new tests (8 open-coverage, 2 fast-gate), each red against `ad6fef33` in a scratch worktree, which has since been removed.
- All 183 tracked PR review reports read the same `OPEN_COVERAGE` before and after. Of the 19 that read `unreadable`, all have no findings block. review-pr's documented template reads 0 under both versions.
- Probe (Step 3.5), phrase `provenance: pre-existing`: population 7. Updated: the QA loop doc. The other six state the exemption, not how it is detected, so they are unaffected. Phrase `signal report`: the three SKILL.md hits are the PreCompact pause signal, so they are unaffected. The CHANGELOG and the §0a not-measured row still read true.
- Fast gate: attempt 1 green, 6521 tests, 0 fail. `bundle:check` reports 0 problems; shellcheck and prettier are clean.

**Commit**: `d51a9dca`, pushed with gate 7, QA report 7 and the cycle 7 probe record. PR comment
issuecomment-6462812768; tracker comment `qa-fix-7` posted on #768.

### QA Cycle 8 — 2026-10-28
**Gate Result**: CONCERNS (80/100)
**Issues Found**: 1. One MEDIUM: bug.17 (CR8-1). The §5c open-coverage allow-list checks line shapes, not value shapes. A block-scalar, tagged or anchored `category: coverage`, a continued `provenance:` value and a flow value carrying ` #` each read `0`. The reviewer (CR-1) and the probe engine (5 cases) found it independently. bug.15, bug.16 and PRB7-1 were verified, and both guards were mutation-proved. Probes: 81 executed, 7 scored reproduced, 0 escaped. Two of the 7 are bug.16's cases, which now read `unreadable`, the accepted outcome. Fast gate green (6521/0). PR CI green on `a2a41ca1`.
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Escalating — loop limit reached

**Fixes Applied**:
- bug.17 (Step 2.6, pipeline narrowing offer; move: **consolidate**). The line allow-list is now
  completed with a value allow-list. Each of these reads `unreadable`:
  - a `category:` value outside review-pr's six tokens;
  - a deeper line that continues a `category:` or `provenance:` value;
  - either key given twice in one entry;
  - a ` #` inside a plain flow value.
- `CHANGELOG.md` no longer claims "every YAML spelling".
- Deliberate change: `category: coverage-gap` now reads `unreadable` (it read `0`).

**Evidence**:
- 8 new open-coverage cases, plus 1 updated. Each of the four guards was mutation-proven: removing
  it turned its case red, and restoring it brought 76/76 back.
- All 183 tracked PR review reports read the same `OPEN_COVERAGE` before and after: 125 × `0`,
  35 × `1`, 4 × `2`, 19 × `unreadable`.
- Probe cases from cycles 5, 7 and 8: none reads `0` for a coverage entry.
- Probe (Step 3.5), phrases `open-coverage`, `open coverage finding` and `every YAML spelling`:
  population 5, plus the CHANGELOG. The QA loop doc and the CHANGELOG were updated. The others
  route on the printed value and are unaffected.
- Fast gate: 6529 tests, 0 fail. `bundle:check` reports 0 problems.

**Commit**: `92e33b0f`, pushed with gate 8, QA report 8 and the cycle 8 probe record. PR comment
issuecomment-6463432344; tracker comment `qa-fix-8` posted on #768.

### QA Cycle 9 — 2026-10-28
**Gate Result**: CONCERNS (80/100)
**Issues Found**: 2. Two MEDIUMs, both in the §5c open-coverage check. bug.18 (CR9-1, reviewer CR-1, promoted): a failing `awk` prints an empty `OPEN_COVERAGE` at exit 0, which takes the Otherwise exit. bug.19 (CR9-2): a block key line after a flow entry is read as that entry's, so an invalid-YAML exemption reads `0`. QA found it with the probe engine, and the reviewer found it independently (CR-2, medium confidence). bug.17 is verified and closed; all four of its guards are mutation-proved. Probes: 20 executed, 2 reproduced (CR9-2 and the low CR9-3), 0 escaped. Fast gate green (6529/0). PR CI green on `51dc912e`.
**HIGH findings**: 0
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Escalating — loop limit reached

**Fixes Applied**:
- Step 2.6, pipeline narrowing offer; move: **patch**. The two findings are distinct holes: bug.18
  is in the shell wrapper, outside the awk, and bug.19 is a missing row in the flow-entry rule. The
  structural move (a bundled script with a real YAML parser) needs a parser dependency that
  consumers do not have, so it stays a `recommendations.future` item.
- bug.18: after the `if`/`else`, any value that is not a count, the empty one included, maps to
  `unreadable`.
- bug.19: a one-line flow entry is complete on its line. Any later line but the next entry is
  refused.
- CR9-3 (low): a findings list with no terminator after it (the closing fence or a top-level key)
  reads `unreadable`. That covers a list cut short by a column-0 `## ` line and a report cut off
  mid-block.
- CR9-4 and CR9-5 stay advisory. The task-doc LOWs (Overview line, Phase 1 checkbox) are outside
  what qa-fix may edit.

**Evidence**:
- 6 new open-coverage cases; 4 are red against `51dc912e`. Each of the three guards was
  mutation-proven: removing it turned its cases red, and restoring it brought 82/82 back.
- All 184 tracked PR review reports read the same `OPEN_COVERAGE` before and after: 125 × `0`,
  35 × `1`, 5 × `2`, 19 × `unreadable`.
- Cycle 9 probe cases: 12/12, including the two that reproduced at gate 9.
- Probe (Step 3.5), phrases `OPEN_COVERAGE`, `open-coverage` and `open coverage finding`:
  population 5, plus the CHANGELOG. The QA loop doc and the CHANGELOG were updated. The others route
  on the printed value and are unaffected.
- Fast gate: 6535 tests, 0 fail (14 skipped). `bundle:check` reports 0 problems.

**Commit**: `0df2880e`, pushed with gate 9, QA report 9, the cycle 9 probe record and PR review 2.
PR comment issuecomment-6464285328 and the #768 comment were posted.

---

## Completion

**Finished**: 2026-10-28T08:29Z (halted)
**Final Status**: Escalated — QA loop limit reached (9 of 9, after 4 granted cycles)
**Branch**: feature/task.238.qa-loop-acts-on-signals-it-has
**PR**: https://github.com/Gamaroff/agent-skills/pull/770
**QA Iterations**: 7 (FAIL 70 → CONCERNS 80 → PASS 90, 5c APPROVE; DoD gaps; re-entry → FAIL 20 → FAIL 50; +2 granted → FAIL 60 → CONCERNS 80; +1 granted → CONCERNS 80; +1 granted → CONCERNS 80); cycle 9's fix `0df2880e` ungated
**DoD Summary**: `task.238.dod.1.qa-loop-acts-on-signals-it-has.md` — ❌ GAPS IDENTIFIED (all 5 fixed in `adff39e2`)
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}

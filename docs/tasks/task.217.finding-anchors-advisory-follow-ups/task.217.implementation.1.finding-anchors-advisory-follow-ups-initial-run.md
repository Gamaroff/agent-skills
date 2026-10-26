# Implementation Report: Finding-anchors advisory follow-ups

**Task**: `task.217.finding-anchors-advisory-follow-ups.md`
**Run Number**: 1
**Started**: 2026-10-23 18:06
**Status**: In Progress

---

## Summary

Close the nine advisory items task.195's QA gates carried to future work: engine non-object refusal and `anchor_checked` stamp, `--inline` guard/selector hardening in review-pr and review-code, review-code `--staged --fix` skip and bindings, and two test-hygiene gaps.

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
| Board status        | In Progress ✅ (Priority already P2 Medium)                                 |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.217.*` exists in git                              | Branch created at `30ece59c` | —                    | 2026-10-23T18:05Z |
| 2. review-task             | ✅ Done    | `task.217.review.{N}.{name}.md` exists (or skip logged)                | READY TO IMPLEMENT 8/10; `task.217.review.1.finding-anchors-advisory-follow-ups.md`; Planned → Ready for Development | —                    | 2026-10-23T18:08Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline; 3/3 phases; `ab2c64be`, `5f15d6c9`; ci:fast 6267 pass / 0 fail | —                    | 2026-10-23T20:21Z |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | [#745](https://github.com/Gamaroff/agent-skills/pull/745); in-review comment posted to #698 | —                    | 2026-10-23T20:22Z |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.217.qa.{N}.*.md`; `task.217.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | 4 cycles; gate 4 PASS 100/100; 5c APPROVE (`task.217.pr-review.1…`) | —                    | 2026-10-24T06:11Z |
| 7. finalise                | ✅ Done    | `task.217.dod.{N}.*.md`; task `status: accepted`                       | ACCEPTED; `task.217.dod.1…`; acceptance commit `2133484e`; #698 closed | —                    | 2026-10-24T06:40Z |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | Implementation report committed and pushed | —                    | 2026-10-24T06:36Z |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-10-23

- Invoked by `/develop-next` (registry fallback, source `task-registry`, item T217) with `--defaults` and the AUTONOMOUS RUN directive.
- Phase 0 run inline (no 0a-parallel agents dispatched): the task path was given explicitly; lite-mode inputs derived from the document — risk_level absent (risk_ok true), phase_count 3 (not < 3), single_module false (engine + two skills + evals) → PIPELINE_MODE standard.
- Feature branch base: develop — source: recommended (on `develop`; `--defaults`)
- PR target branch: develop — source: recommended (`--defaults`)
- Mode: standard — source: detector
- Skips: none — source: none
- Questions asked: 0 (`pipeline-answers.js` questions[] empty; `--defaults`); no AskUserQuestion call issued.
- qa-planning gate: skipped (auto — no prompt)
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Task status at start: `planned` — Step 2 (`/review-task`) validates and promotes.
- Branch: `feature/task.217.finding-anchors-advisory-follow-ups` from `develop` @ `30ece59c`, pushed with upstream.
- Implementation report stashed before branch creation, restored after (clean pop).
- Tracker: work-started comment → posted; GitHub board: work-started → transitioned (In Progress); Priority already set (P2 Medium), not touched.

---

### Step 2 — review-task

- review-task invoked; output format auto-answered "Comprehensive report"; Step 8.5 auto-answered "Yes, apply all critical + important fixes"; Step 9 auto-answered "Yes, fixes complete".
- Review report: docs/tasks/task.217.finding-anchors-advisory-follow-ups/task.217.review.1.finding-anchors-advisory-follow-ups.md (`reviewed_blob` recorded).
- Outcome READY TO IMPLEMENT (8/10): 0 critical, 4 important (all applied), 1 optional. Planned promoted to Ready for Development by review-task.
- Pre-pass agents B/C not dispatched — performed inline (independence loss recorded in the review).
- Tracker key re-read: 698, unchanged. Review outcome comment skipped — review-task reported `posted`.

### Step 3 — develop

- Pre-develop surface map: 12 files identified in the finding-anchors engine, review-pr / review-code `--inline` and Step 5 blocks, and their tests — performed inline from the Step 2 review's reads (Explore subagent not dispatched; independence loss recorded).
- Plan file found: docs/tasks/task.217.finding-anchors-advisory-follow-ups/task.217.plan.finding-anchors-advisory-follow-ups.md — included as implementation context.
- Step 3 inline — /develop not invoked: the plan names every hunk and the surface map was already complete; the inline path wrote the one develop Change Log row.
- Fast-gate precondition: `develop.fastGateCommand` unset → `npm run ci:fast`, script defined.
- Phase 1: non-object refusal in `run()` before `checkTree` (usage, names lens + in-lens index); `anchor_checked` stamp on wrapped docs; `CLEAN` exported beside `MALFORMED`; `GIT_CEILING_DIRECTORIES` on the outside-a-work-tree call. Mutations: no refusal → 3 red; no stamp → 1 red; refusal moved after checkTree → 1 red (counting exec); no ceiling with TMPDIR in checkout → 1 red.
- Phase 2: both guards require the stamp, the count and the seven verdicts; both selectors use `capture()` in the checker's grammar; review-code's block binds PR_NUMBER/SUMMARY_FILE, makes INLINE_FILE after the guard and removes it. Mutations: each guard clause, whitespace, first-colon split (×2 skills) and each binding → red.
- Defect found by the new block-run test: an apostrophe inside `${PR_NUMBER:?…Step 1's…}` opened a quote and broke the whole block — reworded.
- Phase 3: Step 5 apply-list fenced block (`--staged` skip via `git diff --quiet`, jq read into a variable so a jq failure HALTs — a paren error was silently swallowed by the pipe until the test caught it); derived dispatcher population with comment-only control; restated-verdict test against engine exports. Mutations: no staged skip, swallowed jq failure, fake fifth dispatcher, schema drops a verdict → each red.
- Removed-literal sweep: both guard extractors re-keyed on `.anchor_checked.by`; control fixtures stamped.
- Probe re-run: docs/tasks/task.217.finding-anchors-advisory-follow-ups/task.217.dod.1.security.cases.1.json (task.195's 25 cases updated for the new message/stamp + 6 stamp cases) → verdict `engages`, 31/31 passed, 0 escaped, 0 over-blocked.
- `npm run bundle` regenerated the four `references/finding-anchors.js` copies. quick_validate: review-pr, review-code, qa-task, qa-story ✓.
- Fast gate (`npm run ci:fast`, `.agents/skills` symlink moved aside): TEST_EXIT=0, 6267 pass, 0 fail. bundle:check, check:generated, validate:all, lint:shell clean.
- Committed `ab2c64be` (fix) and `5f15d6c9` (docs), pushed.
- Development completion comment posted to github issue 698.

### Step 4 — create-pr

- Base branch pre-supplied: develop — skipping interactive prompt (Phase 0d answer).
- Tree clean at Step 4 — no auto-commit; --scope not needed.
- PR body written inline from the diff and commits (Explore summariser not dispatched; the orchestrator already held the full diff).
- PR created: https://github.com/Gamaroff/agent-skills/pull/745 (Closes #698).
- Tracker comment `in-review` → posted. GitHub board: in-review → stage-disabled (no `pipeline.in-review` moment configured).
- Lock `pr_url` set; develop-next run state `prNumber: 745`.

### Step 5 — QA loop

- QA cycle 1 (5a): traceability mapper skipped: HAS_SUCCESS_CRITERIA_TABLE=false (Success Criteria is a checklist, no table). `/qa-task` invoked with `code_review_blocking=true`.
- QA cycle 1 (5a): diff reviewer dispatched as a read-only Explore subagent (11.4 min, `duration_ms` 683741); 5 findings, all anchors `ok`. Gate CONCERNS 80/100.
- QA cycle 1: PR #745 found CONFLICTING with develop (CHANGELOG.md, PR #744's `[Unreleased]` entry) — filed as TASK-217-QA1-6 for 5b.
- QA Cycle 1 — changes-requested: stage-disabled.
- QA Cycle 1 — qa-fix: fix_cycle not supplied, derived from the gate (cycle 1). No third strike and no narrowing-residue offer applied at cycle 1. qa-fix's own Explore steps (the findings ingester and the codebase mapper) were not dispatched. The findings came from the gate and bug reports already in context, so that pass was not independent.
- QA Cycle 1 — decided: no `TARGET` validation in Step 5. The probe engine fills one slot, so a HALT on the literal placeholder would fail every Step 5 probe case. Step 2b already HALTs on a bad `TARGET`. Follow-up: give the probe engine multiple slots.
- QA Cycle 1 — merge with develop: unstaged the QA artifacts (a merge refuses a staged index), merged origin/develop as `acd48bb8`, and kept both [Unreleased] entries.
- QA Cycle 1 — fast gate attempt 1: 6266/6267. The red was doc-links: the task doc linked to the gate, QA report and bug reports, which were not yet staged. This is the stage-before-gate trap (step 0-stage), which I skipped. It was green after the commit and needed no second attempt.
- QA Cycle 1 — post-fix PR state: OPEN, MERGEABLE, head 9d888cec. Polled inline with one gh call, no poller subagent. Saved to .summaries/step-5-post-fix-tracker-1.json (gitignored).
- QA Cycle 1 — the fix comment was posted to PR #745 (issuecomment-6380119086). The qa-fix-1 tracker comment was posted to #698.
- QA cycle 2 (5a): mapper skipped, because HAS_SUCCESS_CRITERIA_TABLE=false. `/qa-task` was invoked with `code_review_blocking=true`. This was the cycle-2 refute pass over the full branch diff. The reviewer ran from 04:59:59Z to 05:04:04Z, `duration_ms` 205379. Gate CONCERNS 80. Probes: 69 executed, 0 escaped. ci:fast 6267/6281, 0 fail. BUG-1 and BUG-2 closed; BUG-3 and BUG-4 filed. PR comment issuecomment-6380209291. qa-gate-2 posted to #698.
- QA Cycle 2: the convergence check and the route classifier both apply from cycle 3+, so neither ran. Routed to 5b.
- QA Cycle 2 — changes-requested: stage-disabled.
- QA Cycle 2 — third strike: N/A (HIGH 0 on every gate).
- QA Cycle 2 — narrowing offer: "Narrowing residue — every MEDIUM on gates 1 and 2 names skills/review-code/SKILL.md (TASK-217-QA1-1, TASK-217-QA1-2, TASK-217-QA2-1, TASK-217-QA2-2); HIGH 0 on both." Passed to qa-fix Step 2.6.
- QA Cycle 2 — qa-fix: fix_cycle not supplied, derived from the gate (cycle 2). The findings ingester and the codebase mapper were not dispatched. The gate and bug reports were already in context, and the engine and block tests were read directly, so that pass was not independent.
- QA Cycle 2 — narrowing residue: chose consolidate over patch. Patching meant a third shell correction (validate TARGET, cd to the toplevel, copy JS trim() into jq), each restating a fact the checker already holds. Moving the decision into the engine removes the TARGET input, which also removes the one-slot probe conflict that cycle 1 used as its reason not to validate TARGET.
- QA Cycle 2 — QA2-3 at the `--inline` selectors: scoped the claim rather than copying JS trim() into jq. A U+FEFF-led path names no file in the diff, so GitHub's 422 degrades the finding to the summary. The comments say Bitbucket's answer is untested.
- QA Cycle 2 — not edited: task Technical Approach line 92 still says Step 5 runs `git diff --quiet`. It is the design record, outside qa-fix's authorised sections; left for /finalise.
- QA Cycle 2 — fast gate attempt 1: Prettier flagged four files (the engine and three test files); no test ran. Formatted, rebundled, and regenerated the probe cases from the reformatted copy (23/23 engages).
- QA Cycle 2 — a heredoc slip: several one-off python patches in this cycle went through quoted `python3 - <<'PY'` heredocs that carried doc text, against the standing "never put doc text in a heredoc" rule. They were the gate placeholders, the cycle-2 report rows, the QA Change Log row and the two inline-selector comments. Each applied cleanly (count-asserted, `git diff --stat` checked). Every later script went through the Write tool.
- QA Cycle 2 — post-fix: one push of `0e350ce2`. PR #745 is OPEN and MERGEABLE, with CI pending; saved to .summaries/step-5-post-fix-tracker-2.json (gitignored). The fix comment is issuecomment-6380525017, and qa-fix-2 was posted to #698.
- QA cycle 3 (5a): mapper skipped, because HAS_SUCCESS_CRITERIA_TABLE=false. `/qa-task` was invoked with `code_review_blocking=true`. The scope was the 23 files changed since gate 2's head `9d888cec`; SAFETY_REPROBE=false (clause 1 false, no HIGH, not FAIL). The reviewer ran from 05:46:09Z to 05:50:02Z (`duration_ms` 204957) and returned 3 findings, all anchors `ok`. One was promoted: CR-1, reproduced (`Cannot find module` from `skills/`). Gate CONCERNS 90/100. Mutation proofs ran in a scratch worktree, 5/5 covered. Probes: 73 executed, 0 escaped.
- QA Cycle 3 — BUG-3 and BUG-4 closed. BUG-4's Expected Behavior allows a HALT from `sub/`, and that is what now happens. The over-claim in its fix record is the new BUG-5.
- QA Cycle 3 — convergence: HIGH `[0,0,0]`, no trip. Route classifier: `continue` (not-a-pass-gate; route 2 declined: product-defect-signal). Routed to 5b.
- QA Cycle 3 — changes-requested: stage-disabled.
- QA Cycle 3 — third strike: N/A (HIGH 0 on every gate).
- QA Cycle 3 — narrowing offer: "Narrowing residue — every MEDIUM on gates 2 and 3 names skills/review-code/SKILL.md (TASK-217-QA2-1, TASK-217-QA2-2, TASK-217-QA3-1); HIGH 0 on both." Passed to qa-fix Step 2.6.
- QA Cycle 3 — qa-fix: fix_cycle not supplied, derived from the gate (cycle 3). The findings ingester and the codebase mapper were not dispatched. The one finding, the gate and bug 5 were written in this session, and the block and its test were read directly.
- QA Cycle 3 — narrowing residue: chose scope the claim over consolidate. Every block in review-code runs from the repository root by a root-relative path; resolving this one block from `git rev-parse --show-toplevel` would make it the only exception. The defect was the claim and the test that hid it, not the HALT, which already fails closed.
- QA Cycle 3 — Step 3.5 probe: phrases 'any directory' and 'cwd does not matter'. Population 1 (skills/review-code/SKILL.md, updated), plus CHANGELOG.md:34 (updated). The closed BUG-4 fix record still says its verification step 1 matches from `sub/`. It is a closed historical record, superseded by BUG-5, so it was left as written.
- QA Cycle 3 — tool slip: called `status-history.js` from qa-fix's references, where it is not bundled (MODULE_NOT_FOUND, nothing written), then used qa-task's copy.
- QA Cycle 3 — post-fix: one push of `d44191a8`. PR #745 is OPEN and MERGEABLE. The fix comment is issuecomment-6380667172, and qa-fix-3 was posted to #698.
- QA cycle 4 (5a): `/qa-task` was followed from its instructions already loaded this session, without a fresh Skill load. Scope: the 13 files changed since gate 3's head `0e350ce2`; SAFETY_REPROBE=false. Reviewer dispatched at 06:02:35Z (`duration_ms` 110695): 3 findings, all anchors `ok`, none high-confidence. CR-1 is pre-existing (`cat "$SUMMARY_FILE"` is unbound on the merge base, gate 2 CR-4). QA re-ran the three mutations (covered); probes 73 executed, 0 escaped. Gate PASS 100/100. BUG-5 closed.
- QA Cycle 4 — routed: PASS with no open entry → 5c (route 1). Path 1: committed the gate and report as `11fd2d2e` and pushed once.
- QA Cycle 4 — a shell slip: one QA-cycle-4 command carried stray lines (an empty quoted heredoc and two no-op `sed` calls on /dev/null) while I was editing a scratch script. Nothing ran and nothing was written; I redid the edit with the Edit tool. Recorded against the no-heredoc rule.
- Step 5c: `/review-pr --effort medium --comment --no-code` was run on PR #745. The work item was resolved by its branch stem, and the four bundled `references/finding-anchors.js` copies were kept in the diff because the Files Summary names them (`bundle:check` reports them fresh). The conformance lens returned PC-1 (scope, low, high confidence): the work item never describes `--fix-list` or the stamp's `tree`/`root` fields. Its anchor checked `ok` against `11fd2d2e`. **Verdict: APPROVE.** Report `task.217.pr-review.1…` posted as a PR comment (issuecomment-6380746944). PC-1 was classified doc-only and eligible, but was not fixed, because on APPROVE `CARRY_FIXED` stays empty; it is recorded for follow-up. `ready-for-merge` → `stage-disabled`.
- Step 7 (/finalise): 4 DoD agents ran in parallel. AC PASS 15/15, Compliance NOT_APPLICABLE, Docs PASS, Security PASS with `boundary: true`. The probe plan spliced the three committed case files (31 + 23 + 19): 73 executed, 0 reproduced, 0 refusals. `dod.1.security.cases.1.json` was re-serialised byte-identical (no diff). Decision ACCEPTED.
- Step 7 — CI reading 1: SUCCESS @ `11fd2d2e21ee` over 6 checks (the acceptance decision).
- Step 7 — 6a: acceptance commit `2133484e` ("docs(task.217): accept — DoD, sprint review; registry ticked; 5c review carried") carried the PR review report and the DoD probe record; pushed; 6b assertions ok.
- Step 7 — CI reading 2: SUCCESS (tree-equivalent to `11fd2d2e21ee`) @ `2133484eca7b` over 6 checks. 6d: (task 217) cited under [Unreleased].
- Step 7 — outward: canonical PR comment issuecomment-6380967540; tracker `done` comment posted on #698; #698 CLOSED; board `done` → `already`. Lock 7 → 8.
- Stale resume prompt: a "qa-fix cycle 2" resume message arrived twice after cycle 2 had finished. There was no pending wakeup or cron in the session; I did not act on it.

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-10-23
**Gate Result**: CONCERNS
**Issues Found**: 6 — QA1-1 Step 5 apply-list unguarded (medium); QA1-2 review-code --inline guard unprobeable (medium); QA1-3 range target not skipped, QA1-4 --inline exit masked, QA1-5 Step 5 case list unheld, QA1-6 CHANGELOG conflict with develop (low)
**HIGH findings**: 0
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)
**Fixes Applied**: all six. Step 5 runs the Step 4.2 stamp guard (QA1-1). The --inline block moved under its own heading, Step 4.2, and the probe gives 19/19 engages (QA1-2). A range target skips a file that differs from HEAD (QA1-3). The --inline block exits with the poster's status (QA1-4). The restated-verdict test holds the Step 5 skip list (QA1-5). origin/develop merged in acd48bb8 (QA1-6). Each fix was mutation-proven red. Fast gate: 6266/6267 before the commit; the one failure was doc-links on this cycle's still-untracked evidence, and it is green after the commit (24/24).
**Commit**: `9d888cec`

### QA Cycle 2 — 2026-10-24
**Gate Result**: CONCERNS
**Issues Found**: 4. QA2-1: Step 5 TARGET unchecked (medium). QA2-2: Step 5 fails open outside the repo root (medium). QA2-3: BOM trim mismatch with JS trim() (low). QA2-4: CHANGELOG "summary still posts" is false for /review-code (low).
**HIGH findings**: 0
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)
**Fixes Applied**: all four. Structural move: consolidate (qa-fix Step 2.6). The Step 5 apply-list decision moved out of shell into `finding-anchors.js --fix-list`. `--annotate`'s stamp now records the tree it checked and the absolute root, and `--fix-list` reads both. QA2-1: no target is bound in Step 5, so nothing can be mis-bound. QA2-2: both sides are read from the stamp's root, with no `git diff --quiet` and no cwd. QA2-3: the anchor is parsed by `anchorOf`. At the two `--inline` selectors the claim is scoped instead (a 422, so it degrades to the summary). QA2-4: the CHANGELOG and the task Risk table are scoped per skill. Seven mutations, each covered. The Step 5 probe engages 23/23, and its calibration reads present-but-inert (11/23). Fast gate: 6273/6287, 0 fail, 14 skipped (attempt 2).
**Commit**: `0e350ce2`

### QA Cycle 3 — 2026-10-24
**Gate Result**: CONCERNS
**Issues Found**: 1. QA3-1: Step 5 runs the checker by a cwd-relative path and HALTs from a subdirectory, against its "same answer from any directory" claim; the block test swaps in an absolute path (medium, fails closed).
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 3 of 5)
**Fixes Applied**: QA3-1. Structural move: scope the claim (qa-fix Step 2.6). The Step 5 prose, its block comment and the CHANGELOG now say the checker answers the same from any directory, and the block runs from the repository root, failing closed elsewhere. The block test installs the shipped checker at its bundled path and runs the block unchanged: the apply list from the root; from `sub/`, the same list from the checker and a HALT from the block. Three mutations, each covered. The Step 5 probe engages 23/23. Fast gate: 6273/6287, 0 fail, 14 skipped (first attempt).
**Commit**: `d44191a8`

### QA Cycle 4 — 2026-10-24
**Gate Result**: PASS
**Issues Found**: 0 promoted. Advisory: CR-1 (Step 4.3 `$SUMMARY_FILE` unbound, medium/medium, pre-existing), CR-2 and CR-3 (cleanups).
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: APPROVE — `task.217.pr-review.1.finding-anchors-advisory-follow-ups.md` (PC-1 scope/low, recorded, not fixed)
**Loop exit**: n/a — this exit not taken
**Action**: Proceeding to 5c (PR conformance review)
**Commit**: `11fd2d2e` (gate + report, path 1)
**Carried to 6a**: docs/tasks/task.217.finding-anchors-advisory-follow-ups/task.217.pr-review.1.finding-anchors-advisory-follow-ups.md

---

## Completion

**Finished**: 2026-10-24T06:36Z
**Final Status**: Completed
**Branch**: feature/task.217.finding-anchors-advisory-follow-ups
**PR**: [#745](https://github.com/Gamaroff/agent-skills/pull/745)
**QA Iterations**: 4
**DoD Summary**: `task.217.dod.1.finding-anchors-advisory-follow-ups.md` — ACCEPTED
**Tracker debt**: none

### Completion Summary

Implemented the nine advisory follow-ups from task.195. `finding-anchors.js` now refuses non-object findings as `usage`, stamps `anchor_checked` on `--annotate`, and answers `--fix-list`. Both `--inline` guards refuse a missing or stale stamp, the selectors share the checker's anchor grammar, and review-code `--staged --fix` skips a file whose working tree differs from the reviewed index. It took 4 QA cycles (CONCERNS 80, 80, 90, then PASS 100). The notable decision came in cycle 2: Step 5's apply list moved out of shell prose into the engine's `--fix-list`, after a fenced guard drifted from the checker twice. The 5c review APPROVEd; its PC-1 (the doc does not describe `--fix-list`) and gate 4's CR-1–CR-3 are recorded for follow-up.

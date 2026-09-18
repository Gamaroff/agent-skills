# Implementation Report: Twelve skills carry bundled copies no discovery rule reaches

**Task**: `task.122.bundle-check-unreached-copies.md`
**Run Number**: 1
**Started**: 2026-09-18 10:08 UTC
**Status**: Completed

---

## Summary

Add an `UNREACHED` class to `bundle_skill.py --check` for source-backed copies no discovery rule reaches, add a scoped discovery rule for the `.agents/skills/{a|b|c}/references/X` invocation spelling, respell `step-8-commit.md:108`, and delete the twelve dead copies.

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
| Board status        | In Progress ✅ (Todo → In Progress, board "Agent Skills"; Priority already P2 Medium) |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.122.*` exists in git                              | Existing branch reused; tip `54757b7e` (= origin/develop) | —                    |
| 2. review-task             | ✅ Done    | `task.122.review.{N}.{name}.md` exists (or skip logged)                | Skipped — already reviewed (`task.122.review.1.*.md`); review artifacts committed `1b95521f` | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 1 iteration; commit `d4bf9f03`; 15 → 12 → 0 UNREACHED; ci:fast 3448/3448 | `.summaries/step-3-surface-map.json` |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #434: https://github.com/Gamaroff/agent-skills/pull/434 | —                    |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.122.qa.{N}.*.md`; `task.122.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | 3 cycles: CONCERNS 90 → CONCERNS 90 → PASS 100; 5c APPROVE; commits `7252be6f`, `97f66ae1`, `3c276b33` | —                    |
| 7. finalise                | ✅ Done    | `task.122.dod.{N}.*.md`; task `status: accepted`                       | DoD 1 ACCEPTED; acceptance commit `be63f03556ab`; CI 1 SUCCESS @ `3c276b33fecb` (5 checks), CI 2 SUCCESS @ `be63f03556ab` (5 checks, 120s); #422 closed, board Done | —                    |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | Committed in the Step 8 `docs(task.122)` commit (hash recorded in the Decisions Log), pushed; lock removed | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-09-18

- Phase 0a run inline (no subagents dispatched): task resolved from bare id `122` → `docs/tasks/task.122.bundle-check-unreached-copies/task.122.bundle-check-unreached-copies.md`.
- Tracker: `TRACKER=github` (`JIRA_URL` unset), `TRACKER_ISSUE=422` (open).
- Status at start: `ready-for-development` — proceed normally.
- Pipeline mode inputs (derived inline from the document, per Agent-3 prompt): `risk_level=low` (risk_ok=true), `phase_count=3` (<3 false), `single_module=false` (bundle_skill.py + tests + 12 copies across 10 skills) → `PIPELINE_MODE=standard`.
- Always-load files: 3 from `skills-config.yaml` `devLoadAlwaysFiles`.
- Phase 0b: no implementation report, no lock, no PR — **not** a previous pipeline run. Branch `feature/task.122.bundle-check-unreached-copies` already exists (0 commits ahead of `develop`), created by a standalone `/review-task` run on 2026-09-18 whose outputs (task doc v1.1, plan, `task.122.review.1.*.md`) are still uncommitted in the working tree. Step 1 reuses the branch; the review artifacts are committed on it.
- Questions asked (2, matching the develop-task count table): Q1 feature branch base = `develop`; Q2 PR target = `develop`.
- Feature branch base: develop — existing branch is already on develop with no divergence
- PR target branch: develop — standard Gitflow
- qa-planning gate: skipped (auto — no prompt)

### Step 1 — create-branch — 2026-09-18

- `/create-branch` invoked; branch already existed and was checked out. Fetched origin: 0/0 ahead/behind `origin/develop`, tracking `origin/feature/task.122.bundle-check-unreached-copies` (already pushed). Reused; no stash needed (report file was left in place because no checkout occurred).
- Branch created at `54757b7e` (= develop tip).
- Lock written: `.claude/state/develop-pipeline.lock` (`current_step: 2`).
- Signal work-started: `tracker-comment.js` → `posted`; `gh-stage.js --add-to-board` → `transitioned` Todo → In Progress (verified). Priority already `P2 Medium` — default not applied.

### Step 2 — review-task — 2026-09-18

- review-task skipped — task status is `Ready for Development` and review report exists at `docs/tasks/task.122.bundle-check-unreached-copies/task.122.review.1.bundle-check-unreached-copies.md` (Reviewed 2026-09-18; 7/10 → 9/10 after fixes, READY TO IMPLEMENT).
- Skip notice posted to #422 (`tracker-comment.js --stage review` → `posted`).
- The review's uncommitted outputs (task doc v1.1, plan, review report) committed via `/commit-changes` as `1b95521f` and pushed; implementation report excluded.

### Step 3 — develop — 2026-09-18

- Fast-gate precondition: `develop.fastGateCommand` unset → fallback `npm run ci:fast`; script `ci:fast` is defined → OK.
- Pre-develop surface map: 10 entries identified in skills/create-skill/scripts, tests/, shared/resources/, and the 12 `references/` deletion targets (Explore subagent, 92s). Summary at `.summaries/step-3-surface-map.json`. Key facts: `package_skill.py` does not share the discovery regexes (walks the bundled tree; no change needed); `create-skill/SKILL.md` does not yet document `--check` classes; all 12 deletion candidates have 0 invocations outside `references/`.
- Plan file found: `docs/tasks/task.122.bundle-check-unreached-copies/task.122.plan.bundle-check-unreached-copies.md` — included as implementation context for /develop.
- Always-load files: 3 read and passed to /develop.
- Iteration 1 — `/develop` ran all three phases in one pass (task §10: ship in one PR so CI never sees the class red):
  - Phase 1: `REMEDIES['UNREACHED']` + `check_skill` loop over `reconcilable − needed`. Live tree measured **15 UNREACHED across 12 skills** — exactly the task's prediction (develop-story/-task ×1 verify-push-state.sh; 4 Jira skills yaml-subset.js; qa-story ×2, qa-task ×3; review-story ×1; create-task/-story set-github-project-priority.sh).
  - Phase 2: `INVOKE_REF_RE` + scoped branch in `discover_needed` (shared `.md`/`.sh` only; literal name or `{a|b|c}` alternation; bare `{placeholder}` falls out with no special case). Step-8 line respelled. `npm run bundle` → only the three step-8 copies changed; `git status` showed **no new references/ files** (over-match check). `--check` → **12**.
  - Phase 3: 12 `git rm` after a tree-wide grep (all remaining citations are historical task/QA records). Re-bundle → none returned. `--check` → **0 across 128 skills**. Mutation proof: restored review-story-prepass-prompts.md from HEAD → named as UNREACHED → deleted again. Consumer test: wiped `develop-task/references/`, `bundle:skill` regenerated it byte-identical (incl. verify-push-state.sh).
- **Two pre-existing discovery defects surfaced by the class, fixed in `bundle_skill.py`** (both are defects in a discovery path, not new rules): (1) `_within()` used `Path.resolve()`, which follows a symlink at `references/X` out of the tree and refused a *cited* name — SYMLINK fixtures gained a spurious UNREACHED; now a lexical `..` check (the write gate still refuses links). (2) `REFS_REF_RE` had no `/` in its capture class, so `references/sub/inner.md` — what pass 3 writes into a skill file — was never rediscovered and survived only by reconciliation; `tests/bundle-link-rewrite.test.js` went red the moment UNREACHED existed. Class widened to nested names.
- Trap hit and recorded: my first draft of the create-skill SKILL.md paragraph used `references/verify-push-state.sh` as the alternation example — `REFS_REF_RE` followed it and vendored the script into create-skill. Reworded to `references/<script>`; the paragraph now names the trap.
- Tests: `tests/bundle-check-mode.test.js` 29 → 37 (3 UNREACHED cases, 5 INVOKE_REF_RE cases on a two-skill fixture via new `addSkill` helper; reconciliation test now expects STALE + UNREACHED). Existing SYMLINK test doubles as the `_within` regression test.
- Mutation proofs (all caught, source restored from a `cp` snapshot each time): A no-UNREACHED-report → 4 tests red; B resolve()-`_within` → SYMLINK + non-regenerable + live-repo red; C rule removed → 4 INVOKE tests red; D placeholder-as-wildcard → placeholder test red; E unscoped → 3 red; F `.js` scanned → sh/js test red. `REFS_REF_RE` nested: reverting makes bundle-link-rewrite "nested shared source" red (observed before the fix).
- Fast gate `npm run ci:fast`: first run failed on prettier (test file only, 12-line log read directly); formatted; second run **3448/3448 pass**, exit 0, logs removed. `bundle:check`, `check:generated`, `validate:all` (128 passed), `generate-catalog` (no change) all green.
- Docs: create-skill SKILL.md new section; AGENTS.md one sentence; validate.yml comment (4 → 5 invisible classes); CHANGELOG Unreleased entry.
- Loop audit performed **inline** (no Explore dispatch — the three audit facts are mechanical: `status: ready-for-review`, 3/3 phase boxes ticked, new commit `d4bf9f03` on origin). Independence loss recorded. `audit.status = Ready for Review` → loop exit after 1 iteration.
- Change Log row appended via `shared/resources/change-log.js` — the `develop` skill's documented path `.agents/skills/{skill}/references/change-log.js` does not exist in `develop` (observation #125 logged).
- Committed via `/commit-changes` as `d4bf9f03` (23 files: 11 M, 12 D; report excluded) and pushed. Pre-commit hook re-ran the bundler: all in sync.
- Development completion comment posted to github issue 422.

### Step 4 — create-pr — 2026-09-18

- SCOPE_PATHS: work-item dir + 16 changed code dirs (`skills/create-skill`, `shared/resources`, `tests`, `.github/workflows`, 12 `skills/*/references`). Pre-flight guard: no out-of-scope untracked files; nothing held.
- `/create-pr --base develop --issue 422 --scope …`: `/commit-changes` in scope mode committed the implementation report only (`0932db1e`); branch pushed; PR body generated by the summariser subagent from the captured diff (70s) and edited for the two `&lt;` entity slips and to state the `_within` containment evidence in Concerns.
- PR created: https://github.com/Gamaroff/agent-skills/pull/434 (`Closes #422`). `tracker-comment.js --stage in-review` → `posted`.
- Leak check on the Step 4 commit: only the implementation report — in scope. OK.
- Post-PR state check performed inline via `gh pr view` (no poller subagent dispatched): PR #434 state = OPEN, mergeable = MERGEABLE, head `0932db1e`. errors = 0.
- GitHub board: in-review → `stage-disabled` (`pipeline.in-review` not mapped in this repo's workflow; card stays In Progress — a correct outcome per the step doc).
- Lock updated: `pr_url` set, `current_step` 5.

### Steps 5–6 — QA loop — 2026-09-18

- GitHub board: QA-start re-assert → `stage-disabled` (as at Step 4).
- `HAS_SUCCESS_CRITERIA_TABLE` derived inline (Agent 3 not dispatched): §9 Success Criteria is four checkbox lists, 0 table rows → `false`. Traceability mapper skipped: no Success Criteria table.
- QA cycle 1: `/qa-task` invoked with `code_review_blocking=true` (standard mode — parallel agents permitted per its adaptive strategy).
- Cycle 1 result: gate CONCERNS 90/100. Step 3b reviewer (219s) returned 1 bug (medium/medium) + 3 cleanups; QA hand-probed the `_within` boundary (engine declines Python; 12 shapes under `env -i`) and reproduced the symlinked-parent write-through end-to-end against both the branch and `origin/develop` → promoted to gate as TASK-122-BUG-1 (medium, high confidence). Step 4b fired on two changed prose files: `no-executable-blocks` both. QA mutation proofs 3/3 covered. Platform variance `TMPDIR=/tmp` 61/61. Working tree unchanged after QA. Task status kept `ready-for-review` (this repo's lifecycle has no `Completed`; `/finalise` sets `accepted`). PR comment posted with `qa-gate-1` lead; tracker `qa-gate-1` → `posted`.
- Routing: CONCERNS with an open entry → Convergence check (cycle 1: not applicable) → Diminishing-returns exit (cycle < 3: not applicable) → 5b `/qa-fix` (cycle 1 of 5).
- QA Cycle 1 — changes-requested: stage-disabled. Third strike: n/a (cycle 1).
- 5b: `git diff --stat HEAD` → 5 files changed (real changes); fast gate green before commit; one `fix(...)` commit `7252be6f` carrying the fix + gate 1 + QA report 1 + bug report 1; one push. Cycle counter → 2.
- QA cycle 2: `/qa-task` (refute pass; `SAFETY_REPROBE=false` — clause 1 `OK measured`, BUG-1 medium not high, gate CONCERNS not FAIL). BUG-1 verified on the committed state; depth arithmetic checked for 4 name shapes; QA mutants QA-M1/M2 covered, QA-M3 absorbed; 4b on create-skill/SKILL.md `no-executable-blocks`. Gate 2 CONCERNS 90 (maintainability) with two open LOW entries → Convergence check n/a (cycle 2), Diminishing-returns n/a (cycle < 3) → 5b (cycle 2 of 5). Third strike: no HIGH entries. changes-requested → `stage-disabled`.
- QA cycle 3 (scoped since gate 2; `SAFETY_REPROBE=false`): gate 3 PASS 100, `top_issues[]` empty → route 1 → 5c. Convergence check skipped (gate hands to 5c); HIGH sequence 0, 0, 0. Gate 3 + QA 3 + task doc committed `3c276b33` and pushed once (path 1) before `/review-pr`; trail asserted on `origin/feature/task.122.…`.
- 5c: trail asserted on origin; `/review-pr --effort medium --comment` (both lenses, medium; `references/` excluded from the diff but its 15 named paths verified via `--name-status`): conformance 0 findings, code 0 findings → **APPROVE**. Conformance lens mis-reported DoD/sprint-review as present; corrected in the report from the directory listing (both absent — expected pre-finalise). Report `task.122.pr-review.1.…md`; marker comment posted. ready-for-merge signalled. Loop exit after 3 cycles.
- Step 7 `/finalise`: four DoD agents in parallel — AC PASS (7/7; `reviewDecision` null by design, advisory 5c APPROVE is the review of record), Security PASS (boundary `_within` probed through the engine via a thin JS adapter: 11 executed, held; `encoded-traversal` reproduced = pre-existing sink mismatch, bundler never URL-decodes), Compliance N/A, Docs PASS. CI reading 1: SUCCESS @ `3c276b33fecb` over 5 checks. Decision ACCEPTED. Observation #118 → actioned. Frontmatter `accepted` / `completed_date` / `pr_number: 434`; Change Log v1.2; registry-tick `ticked` (row 164); DoD section + `task.122.dod.1.…md` + `sprint-review-summary.md` (PR review report committed alongside). 6a commit `be63f03556ab` pushed; 6b asserted on origin; 6c PR head == `be63f03556ab`; background poll → **CI reading 2: SUCCESS @ `be63f03556ab` over 5 checks after 120s**; 6d CHANGELOG cites task 122. Canonical PR comment posted; issue #422 Document link → develop, `done` comment posted, closed (CLOSED verified); board `done` → `already` (auto-moved on close).
- Engine defect found and worked around: `security-probe.mjs` invoked through the `.agents/skills` symlink silently runs nothing (main-module URL guard) — observation #126 logged; run by real path.
- Task completed.
- 5b cycle 2: `git diff --stat HEAD` → 6 files (real changes); fast gate green; one `fix(...)` commit `97f66ae1`; one push. Cycle counter → 3.
- During the fix, two adjacent facts recorded: `Path.rglob` stops following symlinked directories in Python 3.13 (host) — CI uses `python-version: '3.x'` — so the reconciliation-path fixture asserts the outcome and probes the write gate directly; and the shared-ref collector strips trailing punctuation, so `shared/resources/sub/..` collects as the directory `sub/` (now skipped on `is_file()` instead of crashing).
- Operator intervention (not a blockage): the user declined one QA probe command because its cleanup `rm` was unsafe if `mktemp` had failed (`;`-separated after an `&&` chain → `rm -f /*`) and the scratch dir sat in the parent Projects folder; re-run in the session scratchpad with guarded cleanup. Observation to log at the task boundary.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

### QA Cycle 1 — 2026-09-18
**Gate Result**: CONCERNS
**Issues Found**: 1 MEDIUM — TASK-122-BUG-1 (lexical `_within()` accepts a symlinked intermediate directory under `references/` that develop refused; write gate leaf-only; reproduced branch-vs-develop). 3 LOW advisory (CR-2 shadowed `name`, CR-3 dead set difference, CR-4 duplicate remedy spelling from pass-3 rewrite).
**HIGH findings**: 0
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)
**Fix**: `/qa-fix` — `_within` resolves the parent / judges the leaf lexically / refuses `..`+empty; `writable_copy` refuses a symlinked component (`_symlinked_component`, `_skip_reason`); `discover_needed` `is_file()` (directory citation no longer crashes); CR-2/3/4 applied. 5 fixtures (37 → 42), mutants M1–M5 covered; `ci:fast` 3453/3453; hand probe re-run: both symlink shapes refused. Bug 1 → Ready for QA. Commit `7252be6f` (fix + gate 1 + QA 1 + bug 1; report excluded), pushed once. PR comment `qa-fix-1` + issue comment `qa-fix-1` posted. changes-requested → `stage-disabled`.

### QA Cycle 2 — 2026-09-18
**Gate Result**: CONCERNS
**Issues Found**: BUG-1 verified fixed → Closed. Refute pass (whole branch, 409s): 1 low bug — TASK-122-CR2-1, `check_skill` has no symlinked-intermediate branch, so an in-tree link makes the writer skip while the check reports MISSING under the regenerate remedy (QA reproduced); 2 low doc-accuracy items promoted as TASK-122-CR2-2 (docstring claims `rglob` follows symlinked dirs — false on 3.13/CI; CHANGELOG still says "now lexical"); CR-3 advisory.
**HIGH findings**: 0
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)
**Fix**: `/qa-fix` — `check_skill` symlinked-intermediate branch (SYMLINK, component named) so check == writer; docstring/CHANGELOG/task Files Summary reworded to the shipped rule; `_within` simplified (CR-3). 1 fixture (42 → 43); mutants M6–M8 covered; `ci:fast` 3454/3454; `bundle:check` 0. Commit `97f66ae1` (fix + gate 2 + QA 2 + bug 1 closed; report excluded), pushed once. PR comment `qa-fix-2` + issue comment `qa-fix-2` posted. changes-requested → `stage-disabled`.

### QA Cycle 3 — 2026-09-18
**Gate Result**: PASS
**Issues Found**: none — CR2-1/CR2-2 verified fixed on `97f66ae1` (repro: SYMLINK ×2, no MISSING; docstring/CHANGELOG/Files Summary state the shipped rule); scoped reviewer (7 files since gate 2, 1666 lines, 183s) returned no findings; QA mutant on the new check branch red.
**HIGH findings**: 0
**PR Review**: APPROVE — `task.122.pr-review.1.bundle-check-unreached-copies.md` (conformance 0, code 0; comment posted)
**Loop exit**: n/a — this exit not taken
**Action**: Proceeding to 5c (PR conformance review)

---

## Completion Summary

Implemented task 122 in one develop iteration and three QA cycles. `bundle_skill.py --check` gained an `UNREACHED` class for the reconciliation-only population (measured 15 copies across 12 skills on the live tree, exactly as the task predicted); a scoped `INVOKE_REF_RE` discovery rule plus the `{develop-story|develop-task|develop-bug}` respell of the step-8 commit doc made the three real dependencies discoverable (15 → 12); the twelve dead copies were deleted (12 → 0) and mutation-proved by restoring one. Two pre-existing discovery defects surfaced by the class were fixed in the same commit (`_within` symlink resolution; nested `REFS_REF_RE`). QA cycle 1 then found that the first `_within` rewrite had traded a leaf-symlink false positive for a **symlinked-intermediate escape** (TASK-122-BUG-1, reproduced branch-vs-develop) — fixed by resolving the parent and judging the leaf lexically, with the write gate and later the check both refusing a symlinked component; cycle 2's refute pass caught the check/writer divergence that fix left for in-tree links and two stale descriptions of the rule; cycle 3 was clean, 5c approved, finalise accepted on a green acceptance head. Notable decisions: ship all three phases in one PR (task §10); assert behaviour by measurement (15 → 12 → 0; check → bundle → check) rather than by grepping source; treat the `..%2f` corpus case as a sink mismatch rather than a defect because the bundler never decodes. Two observations logged: #125 (the `develop` skill cites a `change-log.js` it does not bundle — the placeholder class this task documents) and #126 (`security-probe.mjs` silently runs nothing through the `.agents/skills` symlink).

## Completion

**Finished:** 2026-09-18 12:10 UTC
**Final Status:** Completed
**Branch**: feature/task.122.bundle-check-unreached-copies
**PR**: https://github.com/Gamaroff/agent-skills/pull/434
**QA Iterations**: 3 (cycle 1 CONCERNS 90 → qa-fix; cycle 2 CONCERNS 90 (refute pass) → qa-fix; cycle 3 PASS 100 → 5c APPROVE)
**DoD Summary**: docs/tasks/task.122.bundle-check-unreached-copies/task.122.dod.1.bundle-check-unreached-copies.md — ACCEPTED
**Tracker debt**: none — every tracker mutation this run performed (`in-review`, `ready-for-merge`, `changes-requested` were `stage-disabled` by this repo's workflow, which is the configured outcome; `done` → already)

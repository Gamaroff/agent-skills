# Implementation Report: Twelve skills carry bundled copies no discovery rule reaches

**Task**: `task.122.bundle-check-unreached-copies.md`
**Run Number**: 1
**Started**: 2026-09-18 10:08 UTC
**Status**: In Progress

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
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.122.qa.{N}.*.md`; `task.122.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.122.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

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
**Branch**: feature/task.122.bundle-check-unreached-copies
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}

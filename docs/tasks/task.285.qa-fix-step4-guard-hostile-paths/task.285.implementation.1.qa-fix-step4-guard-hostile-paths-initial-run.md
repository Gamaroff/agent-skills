# Implementation Report: qa-fix Step 4 guard survives hostile paths

**Task**: `task.285.qa-fix-step4-guard-hostile-paths.md`
**Run Number**: 1
**Started**: 2026-11-07 00:00
**Status**: Completed

---

## Summary

Close task 268's deferred T268-QA-10 (metacharacters in a path) and T268-QA-11 (nested-repo or symlinked path reads clean) in the qa-fix Step 4 untracked-files guard, plus two advisories.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set                                                                    |
| Pipeline mode       | standard                                                                   |
| Always-load files   | defaults (see Decisions Log)                                               |
| Board status        | pending (set at Step 1)                                                    |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.285.*` exists in git                              | Branch created at `9b727dce`; work-started signalled (comment posted, board → In Progress) | —                    | 2026-11-07T00:00Z |
| 2. review-task             | ✅ Done | `task.285.review.{N}.{name}.md` exists (or skip logged)                | review.1: 8/10, READY TO IMPLEMENT; 4 important + 2 optional applied; Planned → Ready for Development | —                    | 2026-11-07T00:00Z |
| 3. develop                 | ✅ Done | Task status == `Ready for Review`                                      | inline; 5/5 phases; `ci:fast` exit 0; tests/qa-fix-step4-guard.test.js 17 pass | —                    | 2026-11-07T00:00Z |
| 4. create-pr               | ✅ Done | PR URL; issue comment posted                                           | PR #856 | —                    | 2026-11-07T00:00Z |
| 5–6. qa-task / qa-fix loop | ✅ Done | `task.285.qa.{N}.*.md`; `task.285.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ✅ Done | `task.285.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |                 |
| 8. commit-changes          | ✅ Done | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-07

- Invoked by develop-next with `--defaults`; user named task 285 explicitly. The roadmap selector would have picked T269; the user's choice overrode it (not hand-picked by me).
- Phase 0 run inline (no Explore fan-out): resolver unnecessary (path given); lite-mode inputs read from the document — risk_level absent, 5 phases, so `standard`; PIPELINE_MODE=standard.
- Feature branch base: develop — source: recommended
- PR target branch: develop — source: recommended
- Mode: standard — source: detector
- Skips: none
- qa-planning gate: skipped (auto — no prompt)
- Wireframe: no wireloom block; 0c-wire skipped.
- Step 1: branch `feature/task.285.qa-fix-step4-guard-hostile-paths` cut from develop at `9b727dce`; implementation report stashed and restored around it; work-started comment posted and board moved to In Progress.
- Step 2: review-task invoked (status was `Planned`, no prior review report). Output: Comprehensive report (auto). Step 8.5: Yes, apply all critical + important fixes (auto). Step 9: Yes, fixes complete (auto). Review report: `task.285.review.1.qa-fix-step4-guard-hostile-paths.md`. Pre-pass Explore agents not dispatched; done inline, so independent review did not run. Review outcome comment posted to issue 855; tracker key unchanged since Step 1 (no re-fire needed).
- Step 3: Plan file found: docs/tasks/task.285.qa-fix-step4-guard-hostile-paths/task.285.plan.qa-fix-step4-guard-hostile-paths.md — included as implementation context. Pre-develop surface map: 6 files identified in qa-fix, the probe engine, the loop doc and its 3 bundled copies (mapped inline from the files already read in review; Explore subagent not dispatched, so independent mapping did not run). Step 3 inline — /develop not invoked: the plan names every hunk and both preconditions are recorded. Fast-gate precondition: `ci:fast` is defined.
- Step 3 design decisions: heredoc via `IFS= read -r -d '' … <<'DELIM' || true` rather than `$(cat <<…)` (avoids command-substitution parsing of the value; tested under bash 5.3 and zsh 5.9). The probe engine's fence: fixtures write regular files only, so symlink, real-index (tracked, deleted-tracked, intent-to-add) and absolute-path cases run through a direct runner in the test file (real `git init` in a temp dir, removed in `finally`). Dropped `[ -L "$d/.git" ]` from the plan sketch: a dangling `.git` symlink is not a repository to git, and no test could hold it.
- Phase 1 red (before the fix): `meta-substitution` and `meta-backtick` accepted with "pwned was created"; `meta-variable` expanded to the sandbox HOME; `single-quote` accepted with the wrong refusal; `nested-repo` exit 0 with empty stdout; `backslash-mutation` and `double-quote` errored (the substituted block did not parse). Log: `.claude/state/t285-red1.log`.
- Residual risk left for QA/finalise: a path containing a newline plus a line equal to the heredoc delimiter ends the heredoc early. The block cannot see it before substitution; documented in the prose as unsupported.
- Step 4: PR #856 https://github.com/Gamaroff/agent-skills/pull/856 (commit 7675fdb9). Scope: task dir, CHANGELOG.md, task 268 dir, shared/resources, three bundled references dirs, skills/qa-fix, tests. No leak. Post-PR state OPEN (checked with `gh pr view`; poller subagent not dispatched). Issue comment posted; board move `stage-disabled` (this repo's workflow file declares no in-review column).
- Always-load files: defaults (`docs/architecture/concepts/{coding-standards,tech-stack,source-tree}.md`), existence verified at Step 3.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-11-07
**Gate Result**: CONCERNS
**Issues Found**: 1 — T285-QA-1: the parent walk stops only on a string match with the repository root, so `..` and symlinked-prefix paths are refused wrongly
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)

### QA Cycle 2 — 2026-11-07
**Gate Result**: FAIL
**Issues Found**: 1 — T285-QA-2: a symlink to the repository root is still admitted by the physical-path parent walk
**HIGH findings**: 1
**MEDIUM findings**: 0
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)

### QA Cycle 3 — 2026-11-07
**Gate Result**: FAIL
**Issues Found**: 3 — T285-QA-3 (early root stop skips an earlier symlink), T285-QA-4 (trailing slash hides the final component), T285-QA-5 (missing scenarios)
**HIGH findings**: 2
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 3 of 5)

### QA Cycle 4 — 2026-11-07
**Gate Result**: FAIL
**Issues Found**: 1 — T285-QA-6: the parent walk never tests the changed path itself (third strike on `skills/qa-fix/SKILL.md`)
**HIGH findings**: 1
**MEDIUM findings**: 0
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 4 of 5) — struck mechanism replaced, not patched

### QA Cycle 5 — 2026-11-07
**Gate Result**: CONCERNS
**Issues Found**: 0 open — three advisories in `recommendations.future` (CR-1 reproduced, high severity at medium confidence, not promoted; CR-2, CR-3), cut as task 286
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: CONCERNS — PC-1 (coverage, medium): the suite-median performance criterion is not met as worded (+270% against +10%); PC-2, PC-3 low
**Loop exit**: route 3 — CONCERNS with no open entry
**Action**: Proceeding to 5c (PR conformance review)

---

## Completion

**Finished**: 2026-11-07T07:00Z
**Final Status**: Completed
**Branch**: feature/task.285.qa-fix-step4-guard-hostile-paths
**PR**: #856 https://github.com/Gamaroff/agent-skills/pull/856
**QA Iterations**: 5 gates, 4 fix passes
**DoD Summary**: `task.285.dod.1.qa-fix-step4-guard-hostile-paths.md`. CI reading 1: SUCCESS @ `03de471aff7e`. CI reading 2: SUCCESS (tree-equivalent to `03de471aff7e`) @ `1bdcec840988`.
**Tracker debt**: none. Issue #855 closed, board card already in Done, canonical PR comment posted.
**Follow-up**: task 286 (CR-1, CR-2, CR-3), committed on `develop` after the merge.

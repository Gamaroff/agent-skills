# Implementation Report: qa-fix Step 4 guard survives hostile paths

**Task**: `task.285.qa-fix-step4-guard-hostile-paths.md`
**Run Number**: 1
**Started**: 2026-11-07 00:00
**Status**: In Progress

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
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.285.qa.{N}.*.md`; `task.285.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.285.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

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
- Always-load files: defaults (`docs/architecture/concepts/{coding-standards,tech-stack,source-tree}.md`), existence verified at Step 3.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: feature/task.285.qa-fix-step4-guard-hostile-paths
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}

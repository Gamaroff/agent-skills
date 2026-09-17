# Implementation Report: Four authoring rules the corpus already obeys by accident

**Task**: `task.119.create-skill-authoring-guards.md`
**Run Number**: 1
**Started**: 2026-09-17 (see git log for exact time)
**Status**: In Progress

---

## Summary

First automated run of task.119: a guard test for positional-parameter tokens in fenced bash, a bundler warning + guard for comment-only `shared/resources/` origins, three authoring rules in `create-skill`, and a "One task or several?" step in `create-task`.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | low                                                                        |
| Pipeline mode       | standard (risk_ok=true, phase_count=4 ≥ 3, single_module=false)            |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Tracker Issue       | #419 (GitHub)                                                              |
| Board status        | In Progress ✅ (Todo → In Progress, verified; Priority already P2)         |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.119.*` exists in git                              | Branch pre-existed on develop's tip `f8c4ce5c`; pushed + tracking set this run | — |
| 2. review-task             | ✅ Done    | `task.119.review.{N}.{name}.md` exists (or skip logged)                | **Skipped** — status `Ready for Development` + `review.1` exists (fixes applied 2026-09-17) | — |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 1 iteration; 8/9 phases (close-out post-PR); ci:fast green 3409/0; bundle --check clean | — |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.119.qa.{N}.*.md`; `task.119.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.119.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-09-17

- Input `119` resolved as task id (branch `feature/task.119.*` already checked out; `docs/tasks/task.119.create-skill-authoring-guards/` exists) rather than GitHub issue #119.
- Phase 0 fan-out run inline rather than via Explore subagents (resolver not needed — path known; tracker poll = `gh issue view 419` → OPEN, board `Todo`; lite-mode inputs read from the document: `risk_level: low`, 4 phases, multi-module). Reason: Explore subagents have hung repeatedly in this repo; inline reads are deterministic.
- PIPELINE_MODE = standard — risk_ok=true, phase_count=4 (not < 3), single_module=false (create-skill, create-task, qa-task, bundler, tests).
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md (all exist).
- Prior run detected (branch + uncommitted `review.1`, no report): user chose **Resume on existing branch**.
- Q1 Feature branch base: develop — branch already sits on develop's tip (f8c4ce5c).
- Q2 PR target branch: develop — standard Gitflow.
- qa-planning gate: skipped (auto — no prompt).
- Step 1: existing branch reused (user decision); `git push -u` set tracking. Lock written (`current_step: 2`). Tracker: work-started comment posted (#419, reason `posted`); board Todo → In Progress (verified).
- Step 2: skipped per gate table (`Ready for Development` + review report present — status itself asserts a completed review). Review.1 outcome: NEEDS REVISION → all fixes applied → promoted.
- Pre-develop surface map: 12 files identified in create-skill / create-task / qa-task / bundler / tests — performed **inline** (no Explore dispatch; independent review did not run — the task's §7 Files Summary already enumerates every target, and Explore subagents have hung in this repo). Files: `tests/fenced-bash-positional-params.test.js` (new), `tests/bundle-comment-origin.test.js` (new), `tests/bundle-check-mode.test.js` (shape: JS driving Python via child_process), `skills/create-skill/SKILL.md` (§Signal Design Principle L133, §Step 5 Packaging L261), `skills/create-skill/scripts/bundle_skill.py` (`SHARED_REF_RE` L35, applied L146), `shared/resources/qa-execute-snippets.mjs` (`zshAvailable()` L1328), `skills/qa-task/SKILL.md` (Step 4b L581), `skills/create-task/SKILL.md` (§1 L161 → §1.5 L178), `docs/architecture/concepts/coding-standards.md` (§Cross-skill resources L35), `docs/tasks/task-registry.md` (notes rows 51–58, 62–64, 93–95), `CHANGELOG.md`, `package.json` (`tests/*.test.js` glob — verify, no edit).
- Plan file found: docs/tasks/task.119.create-skill-authoring-guards/task.119.plan.create-skill-authoring-guards.md — included as implementation context for /develop.
- Fast gate: `develop.fastGateCommand` unset → fallback `npm run ci:fast`; script exists (precondition passed).
- Step 3 Phase 0 (probes, Claude Code 2.1.274): only the invoked SKILL.md is rendered (Read-loaded reference verbatim); substitution zero-indexed, tokens past arg count untouched; `\$N` survives delivery but breaks on-disk awk; `${N}` / `$(N)` / `${BASH_SOURCE[0]}` untouched → guard scope `skills/*/SKILL.md`, lookbehind kept, rewrites use braced/paren forms.
- Step 3: 22 hits / 12 files / 478 blocks rewritten (equivalence verified under bash + zsh; qa-execute-snippets before/after identical — every hit block is classified mutating/placeholder and skipped by the executor, so the direct equivalence check is the evidence). Guard allowlist empty.
- Step 3: comment-origin guard scope widened from "shared/resources/*.js" to exactly what the bundler reads (shared/resources/** + skills/** minus references/); self-references excluded by rule (bundler + test) rather than allowlisted; 12 live hits resolved with zero allowlist entries; `bundle-dependency:` declaration form introduced for defer-mutation.js's two deliberate runtime dependencies.
- Step 3: create-skill rule 1 written without literal tokens (the file is rendered on invocation); the token table lives in Read-loaded `references/runnable-prose.md`.
- Step 3: loop audit performed inline (checkbox count + status + last commit) — no Explore dispatch. Status Ready for Review → loop exit. Close-out phase (observations → actioned naming PR) deferred to after Step 4 because it needs the PR number.
- Development completion comment posted to github issue 419.
- Task status at start: `ready-for-development` (review.1 recommendations applied 2026-09-17).

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- Step 3: the Skill tool did not discover the throwaway probe skills until the next Bash call ran (discovery lag); `probe-render-b` re-invoked served a cached copy, so the braced-form probe ran as `probe-render-c`. Probes deleted after use.
- Step 3: `npm run bundle` rewrote two `shared/resources/…` mentions in the new create-skill prose in place and vendored `qa-execute-snippets.mjs` + `tracker-card-summary.md` into `create-skill/references/` — the exact mechanism rule 3 describes, in `.md` where it is by design. Prose reworded to bare filenames; vendored copies removed.
- Step 3: `ci:fast` failed once on Prettier (new tests unformatted) and once on the tracked-tree link test (`references/runnable-prose.md` untracked) — formatted and staged; green on the third run.

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: feature/task.119.create-skill-authoring-guards
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}

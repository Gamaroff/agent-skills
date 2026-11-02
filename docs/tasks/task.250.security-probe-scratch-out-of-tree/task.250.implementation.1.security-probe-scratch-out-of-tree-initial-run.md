# Implementation Report: Security-probe tests write no scratch files into the repository

**Task**: `task.250.security-probe-scratch-out-of-tree.md`
**Run Number**: 1
**Started**: 2026-11-02 18:06
**Status**: In Progress

---

## Summary

Move every scratch directory `security-probe.test.mjs` creates inside the repository into a temp root passed to the engine as `repoRoot`, and add a guard that keeps in-tree writes out.

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
| Board status        | In Progress ✅ (issue #812)                                                |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.250.*` exists in git                              | Branch created at `49b0d48d`, pushed | —                    | 2026-11-02T18:05Z |
| 2. review-task             | ✅ Done    | `task.250.review.{N}.{name}.md` exists (or skip logged)                | `task.250.review.1.security-probe-scratch-out-of-tree.md` — READY TO IMPLEMENT 9/10; Planned → Ready for Development | —                    | 2026-11-02T18:07Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline (plan names every hunk); 13 in-tree sites moved to temp roots + guard; suite 276/276; `ci:fast` green | —                    | 2026-11-02T18:23Z |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.250.qa.{N}.*.md`; `task.250.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.250.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-02

- Invoked by `/develop-next` (registry fallback, source `task-registry`) with `--defaults`; autonomous run.
- Phase 0 run inline (no 0a-parallel agents dispatched): path given directly; tracker issue #812 read from frontmatter.
- Pipeline mode: standard — source: detector. Inputs: risk_level absent (ok), phase_count 5 (not < 3), single_module true.
- Feature branch base: develop — source: recommended (on `develop`).
- PR target branch: develop — source: recommended.
- Skips: none. Refused flags: none. Questions asked: 0 (`--defaults`, no conflict).
- qa-planning gate: skipped (auto — no prompt)
- Task status at start: `planned` — proceeding; Step 2 (`/review-task`) promotes it.
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Local `develop` was 1 commit ahead of `origin/develop` at start (49b0d48d, the task.250 authoring commit); it rides on the feature branch.
- Branch: `feature/task.250.security-probe-scratch-out-of-tree` ← develop. Implementation report stashed before branch creation, restored after.
- Tracker: start comment `posted` on #812; GitHub board: work-started → transitioned (In Progress). Priority default skipped: the issue already carries a Priority from `create-task`.

### Step 2 — review-task

- review-task run: status `Planned`, no prior report. Output: Comprehensive report (pipeline default). Step 8.5 auto-answered: Yes, apply all critical + important fixes. Step 9 auto-answered: Yes, fixes complete.
- Review report: `docs/tasks/task.250.security-probe-scratch-out-of-tree/task.250.review.1.security-probe-scratch-out-of-tree.md` — READY TO IMPLEMENT, 9/10, 0 critical / 2 important / 1 optional; `reviewed_blob` stamped.
- Planned promoted to Ready for Development by review-task. Fixes applied: dead `.t140-*` `.gitignore` rule added to scope; Performance criteria name the timing command and the `scripts/test-tmpdir.mjs` ratchet.
- Pre-pass agents B and C not dispatched; both passes ran inline (independence loss recorded in the review report).
- Review outcome comment skipped — review-task reported `posted` on #812. Tracker key unchanged (#812).

### Step 3 — develop

- Plan file found: `task.250.plan.security-probe-scratch-out-of-tree.md` (per-site before/after for all 12 sites).
- Pre-develop surface map: not dispatched as an Explore agent; the plan names every hunk and the review verified all 12 line numbers by command. Independence loss: the same agent mapped and implemented.
- Step 3 inline — `/develop` not invoked: the plan names every hunk; one file of code changes (`shared/resources/tests/security-probe.test.mjs`) plus `.gitignore` and `CHANGELOG.md`.
- Calibration before the change: an `inotifywait` watch of `shared/resources/tests` and `tests/fixtures` during one suite run saw 61 create events, covering every in-tree prefix **and** `shared/resources/tests/fixtures/security-probe/PWNED-self` (BUG-12's target writing beside its own fixture). The guard's first run was red on all 12 sites plus that BUG-12 cleanup and the `__pycache__` cleanup.
- **Deviation from the task's site list:** BUG-12 (`writes-home-tmp-self.sh`) is a 13th in-tree write the task did not list. Converted too (fixture copied into a `fenceRoot`, `repoRoot` = root), because success criterion 1 says no test creates anything under `REPO_ROOT`.
- Guard allowlist: one entry, `rmSync(join(REPO_ROOT, FIXTURES, "__pycache__"), …)` — it only clears a manual-run leftover before asserting the probe wrote none, and creates nothing. The allowlist fails on a stale entry.
- Guard self-match fixed: the calibration sample builds its call names at run time, so the scanner does not flag its own sample text.
- `fenceRoot()` refuses a root inside the repository (the runtime half). Proven with `TMPDIR` set inside the repo: it threw, and exposed five tests that created their `outside` temp dir **before** the root and leaked it on the throw — reordered so the root comes first.
- Premise controls: each of the three containment tests run with `REPO_ROOT` in place of its temp root → each fails. The `--fake-gh` row **passed** under the wrong root at first: `bad-fake-gh` is also the reason for a path that does not resolve. Tightened to also assert the detail `is outside`; it then fails under the wrong root.
- Mutation: one `mkdtempSync(join(REPO_ROOT, …))` re-added → guard red; reverted.
- Results: suite 276/276 (274 existing + 2 guard tests). Watched run after the change: 0 create events (61 before). Timing (suite alone, back to back): base 33.04/33.16/33.22 s, median 33.16 s (load 2.62→3.09); head 31.45/31.48/31.56 s, median 31.48 s (load 0.79→0.99). Evidence under `.claude/state/t250/`.
- Fast gate (`npm run ci:fast`): 7127 tests, 7113 pass, 0 fail, 14 skipped; `tmp-leak: ratchet ok`.
- Task status → Ready for Review; one develop Change Log row written (inline path). Development completion comment posted to github issue 812 (`posted`).

### Step 4 — create-pr

- SCOPE_PATHS: `docs/tasks/task.250.security-probe-scratch-out-of-tree`, `CHANGELOG.md`, `.gitignore`, `shared/resources/tests`. Pre-flight guard: no untracked path outside scope, nothing held. Report links: ok.

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
**Branch**: feature/task.250.security-probe-scratch-out-of-tree
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}

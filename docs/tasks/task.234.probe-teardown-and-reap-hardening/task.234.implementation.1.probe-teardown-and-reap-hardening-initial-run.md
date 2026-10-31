# Implementation Report: Probe sandbox teardown and process-group reap

**Task**: `task.234.probe-teardown-and-reap-hardening.md`
**Run Number**: 1
**Started**: 2026-10-31 12:00
**Status**: In Progress

---

## Summary

Run task.234 end to end: a sandbox teardown that survives a tree deeper than PATH_MAX, no chmod through a swapped symlink, a hardened QA2-1 test, and a process-group reap before each case's path assertions.

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
| Board status        | In Progress ✅ (gh-stage `transitioned`; Priority already P3 Low, left)    |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.234.*` exists in git                             | Branch created at `2a29f5d5`, pushed | —                    | 2026-10-31T08:49Z |
| 2. review-task             | ✅ Done    | `task.234.review.{N}.{name}.md` exists (or skip logged)               | `task.234.review.1.probe-teardown-and-reap-hardening.md` — READY TO IMPLEMENT 8/10 after fixes; Planned → Ready for Development | —                    | 2026-10-31T08:53Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline, 1 iteration; 4/4 phases; commit `3fa12b01`; `npm run ci` 6919 tests, 0 failures | —                    | 2026-10-31T09:06Z |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.234.qa.{N}.*.md`; `task.234.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.234.dod.{N}.*.md`; task `status: accepted`                      |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-10-31

- Invoked by `/develop-next` (autonomous, `--defaults`); selected T234 from the task registry (no actionable roadmap row).
- Feature branch base: develop — source: recommended (`--defaults`, on `develop`)
- PR target branch: develop — source: recommended (`--defaults`)
- Mode: standard — source: detector. Phase 0 ran inline (no Explore agents): risk_level absent (risk_ok true), phase_count 4 (not < 3), single_module true → standard.
- Questions asked: 0 (pipeline-answers.js returned `questions: []`; nothing refused).
- qa-planning gate: skipped (auto — no prompt)
- Status at start: Planned — Step 2 `/review-task` validates and promotes.
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Tracker: github, issue #750. Wireframe: none (no `ui.wireframeMap`).
- Step 1: branch `feature/task.234.probe-teardown-and-reap-hardening` from `develop` (`2a29f5d5`), pushed. Report stashed before branch creation and restored after. Lock written at step 2 with the resolved answers.
- Tracker: work-started comment `posted`; GitHub board: work-started → transitioned (In Progress).

### Step 2 — review-task

- review-task output: Comprehensive report (auto). Step 8.5 auto-answered: Yes, apply all critical + important fixes. Step 9 auto-answered: Yes, fixes complete. All three are pipeline defaults.
- Review report: `docs/tasks/task.234.probe-teardown-and-reap-hardening/task.234.review.1.probe-teardown-and-reap-hardening.md` (`reviewed_blob` stamped).
- Outcome: READY TO IMPLEMENT, 8/10 after fixes. Findings: 1 Critical, 3 Important, 2 Optional. Every critical and important finding was fixed in the review.
- Key finding: the D red test's grandchild must release the case's stdio. As drafted, `spawnSync` waits for it (measured 306 ms, marker written), so the test could never go green. The task and plan were fixed.
- Pre-pass agents B and C were not dispatched; the checks ran inline, so the review had no independent reader.
- Planned promoted to Ready for Development by review-task.
- Review outcome comment skipped: review-task reported `posted` (stage `review-task`). Tracker key unchanged (#750), so work-started was not re-fired.

### Step 3 — develop

- Plan file found: `docs/tasks/task.234.probe-teardown-and-reap-hardening/task.234.plan.probe-teardown-and-reap-hardening.md` — included as implementation context for /develop.
- Pre-develop surface map: 4 files identified in `shared/resources/` (`security-probe.mjs`, `tests/security-probe.test.mjs`, `probe-boundary-rule.md`, `qa-execute-snippets.mjs` for the walkers), plus `CHANGELOG.md`. This is the map built inline during the Step 2 review; no Explore agent was dispatched, so the map had no independent reader.
- Step 3 inline — /develop not invoked: the plan names every hunk and the surface map was already recorded; a `/develop` pass would only re-read them.
- Fast-gate precondition: `ci:fast` is defined.
- Red, before the change: A (`ENAMETOOLONG` at `lstat`), D at `watchedSpawn`, and D at the module runner. B and the hardened QA2-1 test were green on develop. B is a guard. QA2-1's sandbox was already removed on develop, so C is held by its mutation.
- Mutation proofs, each run and then restored from a snapshot:
  - `chmod -R -L` turns B red.
  - The old `open()` walk turns A red and leaves B green.
  - A no-op `removeSandbox` turns QA2-1 red.
  - Dropping both `reapGroup` calls turns both D tests red.
- Deviation: the module-runner D fixture's grandchild is `process.execPath -e …` instead of `sh -c 'sleep; touch'`. The shape is the same (`stdio: "ignore"`, `.unref()`, not detached), and a Node grandchild is portable.
- `removeSandbox` reports a failed `chmod -R` in the final `rmSync` error, not silently (plan § Phase 1). The `chmodSync` import was dropped as unused.
- Wall time (load ~1.0–1.2), the 265 pre-existing tests: develop 25.86 s and 25.90 s, branch 26.00 s and 26.03 s, so +0.14 s. The whole file grows ~1.3 s: the two 0.6 s D waits plus the A and B probe runs.
- Spawn-site search re-run: the same set review 1 traced. No other case spawn.
- Security-probe suite: 269/269. `bundle` + `bundle:check`: 0 problems. Commit `3fa12b01` (the pre-commit Prettier check caught the test file; formatted and recommitted).
- Loop audit, inline (no Explore agent, so the audit had no independent reader): 14/14 plan checkboxes, status `ready-for-review`, last commit `3fa12b01`. Loop exited after iteration 1.
- Full gate: `npm run ci` in the `~/Development/.qg-t234` worktree (outside `/tmp`; no `.agents/skills` symlink there), 6919 tests, 6905 pass, 0 fail, 14 skipped. `scripts/lint-shell.sh`: shellcheck clean.
- Development completion comment posted to github issue 750 (`posted`).

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
**Branch**: feature/task.234.probe-teardown-and-reap-hardening
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}

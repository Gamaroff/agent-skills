# Implementation Report: [Task 153] Release gate reads CI's verdict; load-sensitive tests name themselves

**Task**: `task.153.release-ci-gate-load-sensitive-tests.md`
**Run Number**: 1
**Started**: 2026-09-29 08:29
**Status**: In Progress

---

## Summary

Gate `release.sh` on CI's recorded verdict for HEAD, mark every load-sensitive assertion with one checked marker, and make CR-6 retry only its precondition miss.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set                                                                    |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/{coding-standards,tech-stack,source-tree}.md |
| Board status        | In Progress ✅ (gh-stage: transitioned; re-check `already`)                 |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.153.*` exists in git                             | Branch created at `426e6976` from `develop`; pushed with upstream | —                    |
| 2. review-task             | ✅ Done    | `task.153.review.{N}.{name}.md` exists (or skip logged)               | `task.153.review.1.release-ci-gate-load-sensitive-tests.md` — READY TO IMPLEMENT 8/10; Planned → Ready for Development | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline, 1 iteration; ci:fast 2 runs — run 1 red (1 real: test-clean-checkout drove release.sh into the new CI step), fixed; run 2 green 4469/0 | `.summaries/step-3-test-triage-1.json` |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.153.qa.{N}.*.md`; `task.153.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.153.dod.{N}.*.md`; task `status: accepted`                      |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-09-29

- Dispatched by `/develop-next` (AUTONOMOUS RUN): roadmap item T153, source `roadmap`.
- Upfront Setup — 2 questions, auto-answered (not prompted) per the develop-next directive:
  - Q1 Feature branch base: develop — recommended option (on `develop`)
  - Q2 PR target branch: develop — recommended option
- qa-planning gate: skipped (auto — no prompt)
- Phase 0 run inline (no 0a-parallel agents): path given explicitly; tracker issue #483 read from frontmatter.
- Lite-mode inputs derived inline: risk_level=absent, phase_count=5, single_module=false → PIPELINE_MODE=standard.
- Task status at start: `planned` → proceed; Step 2 validates.
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, tech-stack.md, source-tree.md (skills-config.yaml devLoadAlwaysFiles).
- Phase 0b: no prior run for task.153 (no branch, PR or report). The on-disk halt snapshot `.claude/state/develop-pipeline.last-halt.json` belongs to task.154 (PR #513, merged) — not this document; left untouched.
- Branch: `feature/task.153.release-ci-gate-load-sensitive-tests` from `develop` (`426e6976`). Report stashed before branch creation, restored after.
- Lock written at `current_step: 2`.
- Tracker comment work-started → `posted`. GitHub board: work-started → transitioned (In Progress; confirmed `already` on re-read). Priority already `P2 Medium` — not touched.

### Step 2 — review-task

- review-task invoked (no report existed; status `planned`). Output: Comprehensive report (auto). Step 8.5 auto-answered: apply all critical + important fixes. Step 9 auto-answered: Yes, fixes complete.
- Outcome: READY TO IMPLEMENT, 8/10, 0 Critical / 2 Important / 3 Optional. Planned promoted to Ready for Development.
- Important fixes applied: (1) task.154 had changed `release.sh`'s local test to `npm run test:clean-checkout` (skipped under `--dry-run`) — task + plan now wrap that command; (2) CI block guarded with `RETRY == false` (pre-flight runs for `--retry`).
- Pre-pass agents B/C not dispatched — performed inline; independence loss recorded in the review report.
- Tracker key unchanged (#483) — no re-fire needed. Comments posted: `review-task` → posted, `review` → posted.

### Step 3 — develop

- Plan file found: docs/tasks/task.153.release-ci-gate-load-sensitive-tests/task.153.plan.release-ci-gate-load-sensitive-tests.md — included as implementation context for /develop.
- Pre-develop surface map: 16 files identified in scripts/, tests/, shared/resources/{spawn-budget.mjs,tests/}, skills/session-handoff/{scripts,tests}/, docs/contributing/, .github/workflows/ — mapped **inline** during Step 2's anchor verification (release.sh pre-flight/test/retry/summary blocks, the four wall-clock assertions, CR-6/CR-7, spawn-budget exports, workflow `on:` blocks, gh-stage PATH-stub precedent, stdout-drain and spawn-timeout-literal guards). Explore not dispatched — independence loss recorded.
- Step 3 inline — /develop not invoked: the co-located plan names every hunk and the surface map was already recorded; both preconditions of §"Inline implementation instead of /develop" hold.
- Fast-gate precondition: `develop.fastGateCommand` unset → `npm run ci:fast`; script defined — pass.
- Always-load files: 3 architecture concept files (read during Step 2 pre-pass axes).
- **Mutation M10 was vacuous on the pre-existing CR-6 fixture.** Killing only the leader still passed: `slow.js`'s child handle kept it alive until the grandchild's natural end, and the verifier's runner resolves only when `slow.js` releases the pipes — so the grandchild always read as killed. Fixed in the fixture (grandchild sleeps 120 s, `c.unref()`); M10 now red with *"the grandchild outlived the timeout"*. The assertion is unchanged; the group-kill it claims is now actually held.
- Live evidence (not held by CI): `release.sh --dry-run --patch` in a fresh clone of real `main` (new scripts overlaid, assume-unchanged) printed `✓ CI green for 398107e6 — Test, ShellCheck green`, then stopped at `[Unreleased] section in CHANGELOG.md is empty` — `main`'s own CHANGELOG, expected.

#### Mutation proofs (each reverted after its red was seen; log `.claude/state/t153-mutations.log`)

| # | Mutation | Red test(s) |
|---|---|---|
| M1 | `ciVerdict` treats `failure` as not-red | release-ci-verdict: *a failure run is red* (+3 conclusion cases) |
| M2 | no runs counted as green | release-ci-verdict: *no runs for a required workflow → unverifiable*, *no runs at all*, *cancelled alone* |
| M3 | CI block moved after the local test | release-ci-gate: 6 red incl. *red CI refuses before the local test runs* (npm marker present) |
| M4 | CI block deleted | release-ci-gate: 8 red |
| M5 | `WORKFLOWS` `Test` → `Tests` | release-ci-verdict: both *parity* cases (+ reduction cases) |
| M6 | `retryUntilForked` returns the first attempt | handoff-verify: 3 *retryUntilForked* cases |
| M7 | retries a non-timeout miss | handoff-verify: *a miss that is not a timeout fails at once and is not retried* |
| M8 | marker removed from `qa-execute-snippets.test.mjs:796` | load-sensitive-marker: direction A (and B) |
| M9 | a `traps.md` list line deleted | load-sensitive-marker: direction B |
| M10 | `killGroup` kills only the leader | handoff-verify CR-6: *the grandchild outlived the timeout* — **only after the fixture fix above** |
- Fast gate run 1: 1 real failure — `tests/test-clean-checkout.test.js` drives the real `release.sh`, which now refused at step 1b (and called the real `gh`). Fixed with a green `gh` stub in that test's `bin/`. Run 2: 4470 tests, 4469 pass, 0 fail.
- Observation #214 logged (absence assertion after a wait is vacuous when the wait outlasts the target).

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- Pre-existing, not introduced: `skills/qa-task/references/tests/qa-execute-snippets.test.mjs` (the bundled copy, run from its own directory) fails *CLI: no engine copy carries a naive entrypoint guard* on `develop` too (checked with the change stashed). No test glob runs that copy; left as-is.

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: `feature/task.153.release-ci-gate-load-sensitive-tests`
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}

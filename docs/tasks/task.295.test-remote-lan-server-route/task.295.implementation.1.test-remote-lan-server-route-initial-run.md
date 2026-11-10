# Implementation Report: Run the test suite on the LAN server (test:remote)

**Task**: `task.295.test-remote-lan-server-route.md`
**Run Number**: 1
**Started**: 2026-11-10 14:12
**Status**: In Progress

---

## Summary

Add `npm run test:remote`: sync the tree to the LAN server (.249), run root scripts in a CI-parity container, exit with their status.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set                                                                    |
| Pipeline mode       | standard                                                                   |
| Always-load files   | defaults (no skills-config.yaml devLoadAlwaysFiles)                        |
| Board status        | N/A (not yet signalled)                                                    |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.295.*` exists in git                              | Branch created at `9bf53185`; tracker #871 → In Progress | —                    | 2026-11-10T14:20Z |
| 2. review-task             | ✅ Done | `task.295.review.{N}.{name}.md` exists (or skip logged)                | Review 1: 8/10 READY; rsync plan fixed; status → ready-for-development; pre-pass agents run inline (no independent review) | —                    | 2026-11-10T14:45Z |
| 3. develop                 | ✅ Done | Task status == `Ready for Review`                                      | Inline (plan + inline surface map); runner, container, guard test, docs; 6 real runs on .249; clean-clone run green (8353 tests, 0 fail) | —                    | 2026-11-10T14:56Z |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.295.qa.{N}.*.md`; `task.295.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.295.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-10

- Feature branch base: develop — owner chose the recommended option
- PR target branch: develop — owner chose the recommended option
- qa-planning gate: skipped (auto — no prompt)
- Pipeline mode: standard — risk_level absent, phase_count 6 (not < 3)
- Always-load files: defaults (`docs/architecture/concepts/*`) — resolved inline, no Agent 3 dispatched

### Step 3 — Develop (2026-11-10)

- Step 3 inline — /develop not invoked: plan file found (`task.295.plan.*.md`) and surface map recorded inline (no Explore subagent; independent mapping did not run).
- Pre-develop surface map: 9 files — `scripts/remote-test/{run,server-lib,container}.sh` + `Dockerfile`, `package.json`, `tests/test-remote-runner.test.js`, `docs/contributing/{testing-remote,README}.md`, `AGENTS.md`.
- Plan file found: `task.295.plan.test-remote-lan-server-route.md` — included as implementation context.
- **Acceptance evidence** (the QA report restates it): run 1 red (exit 1, `prettier` flagged the new test file — a real red reported as red); run 6 from a clean clone of the pushed branch green (exit 0, 8353 tests, 8350 pass, 0 fail, 7m37s). `--run 'x;y'` exit 2 before any ssh; `TEST_REMOTE_HOST=nobody@192.0.2.1` exit 1 naming `TEST_LOCAL=1`, no local run; `docker inspect` on the live container: `CpuShares=128 User=1000:1000`; 92 `PASS [zsh]` lines and no zsh/awk skip notice. `uptime` laptop before/after: load 2.94 → 1.35; .249: 4.5 at start (contended).
- Mutation proofs (each turned a named test red, then restored): remove `--run` validation → "a --run name with shell metacharacters…"; `exit "$STATUS"` replaced by `echo done; exit 0` → "the runner's exit status equals the remote run's status"; unreachable branch falls back to local npm → "an unreachable server fails loudly…". A first fallback mutation was invalid (re-exec failed on its own usage error, test stayed green) and was redone.
- Four container parity gaps found by real runs and fixed: jq 1.6 and git 2.39 (bookworm) → trixie; shellcheck missing; no UTF-8 locale; `HOME` under `/tmp`.
- `--auto` (optional) not built — decision recorded in the task Notes.
- Pipeline lesson: a background `(time npm run …); echo "exit=$?"` makes the task notification report exit 0 for a failed run. The route's own status was read from the appended `exit=` line.

### Issues raised for the owner

- **Another session is editing this checkout.** Uncommitted changes to `shared/resources/` (advance-pipeline-lock, set-qa-phase, set-waiting-on, on-precompact, on-stop and their tests, a pause-mark feature), `skills/`, `CHANGELOG.md`, `docs/reference/pipeline-artifacts.md`, deleted `evals/**/replay/.claude/state/*` files and a new fixture appeared during Step 3 (first seen 16:24 local). They are not part of task 295 and are **not committed** by this run. They made remote runs 2 to 5 fail four bundle-freshness tests (1084, 1555, 5671, 7220) until the clean-clone run.

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
**Branch**: {populated after Step 1}
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}

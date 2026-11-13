# Implementation Report: Run the test suite on the LAN server (test:remote)

**Task**: `task.295.test-remote-lan-server-route.md`
**Run Number**: 1
**Started**: 2026-11-10 14:12
**Status**: Completed

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
| 4. create-pr               | ✅ Done | PR URL; issue comment posted                                           | PR #872 https://github.com/Gamaroff/agent-skills/pull/872; issue #871 commented; PR body written inline (no Explore summariser); foreign uncommitted edits left out | —                    | 2026-11-10T15:10Z |
| 5–6. qa-task / qa-fix loop | ✅ Done (gate 5 CONCERNS 85; fix 5 done; Step 5c PR review CONCERNS, doc-only findings) | `task.295.qa.{N}.*.md`; `task.295.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ✅ Done | `task.295.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |                 |
| 8. commit-changes          | ✅ Done | All artifacts committed and pushed                                     |       | —                    |                 |

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

### QA Cycle 1

- **Gate**: CONCERNS, 80/100, head `5fd76f12`. Findings: T295-QA-1 (missing `--host`/`--timeout-min` value hangs `run.sh`), T295-QA-2 (no CHANGELOG entry citing task 295). Two LOW items went to `recommendations.future`.
- **Fix** (`7dd8e0a8`): both options refuse a missing value with exit 2. Guard test added (8/8 pass); mutation-proved: the original `run.sh` turns it red (`got null (signal SIGTERM)`). CHANGELOG `[Unreleased]` Added entry staged by hunk only; the other session's CHANGELOG edits stay unstaged. `changelog-cites.sh task.295` now reads `cites (task 295)`.
- **Gate 2** (FAIL 65, head `7dd8e0a8`, refute pass by a dispatched reviewer): T295-QA-3 (high: the timeout kills only the local ssh, the remote container survived; reproduced on .249), T295-QA-4 (branch key collisions, detached HEAD), T295-QA-5 (`--reap` reads an mtime rsync overwrites).
- **Fix 2** (`5548cf09`): scripts run under `timeout` inside a named `--init` container, with a local backstop that `docker kill`s it; the run directory carries a hash of the full branch name (commit when detached) and the container name doubles as a per-directory lock; a run touches its directory and `--reap` skips a directory with a running container; `--timeout-min` is base 10 and capped. Guard tests 8 to 13; six mutations each turned a named test red (kill on timeout, hash, detached, inner timeout, reap skip, base 10). Live proof on .249: `--timeout-min 1` exited 124 after 80 s and left 0 `agent-skills-test-*` containers. The probe container used for the reproduction was killed by hand (0 left).
- **Gate 3** (FAIL 65, head `12578cea`, scoped review): T295-QA-6 (high: the container-name lock is taken after the `rsync --delete` it should protect), T295-QA-7 (a dropped ssh leaves the container; a stale named container blocks later runs), T295-QA-8 (a failing `docker ps` makes `--reap` delete a live directory, reproduced). Four LOW items to `recommendations.future` (trap deferral, 124/137 wording, the 9999 cap, test coverage).
- **Fix 3** (`3502406d` plus a comment correction): lock check before the first rsync with a message naming `docker rm -f`; 255 kills the named container, 125 does not; `--reap` aborts when `docker ps` fails; the directory is touched right after the sync. Guard tests 13 to 17; five mutations each turned a named test red. Live proof on .249: with a container holding the run's name, `test:remote` exited 1 before any sync, and the probe container was removed (0 left).
- **Gate 4** (CONCERNS 80, head `d602cdea`, scoped review): no high, none reproduced. T295-QA-9 (medium): the container-name check covers the run, not the sync and image build before it, and the docs call it a lock. Three LOW items to `recommendations.future`.
- **Fix 4** (`510da7e9`): third gate on this mechanism (QA-4 key, QA-6 order, QA-9 window), so the claim was scoped, not patched again (Step 2.6, scope the claim): the script comment and `testing-remote.md` now call it a best-effort guard with its window; a real lock stays the task's Future Improvements item. Also touch chained as `touch && { inspect || build; }`; two tests added (filter anchored on the run name, failed lock check stops the run), both mutation-proved. The touch-chaining change is not held by a test: the stub fails the whole ssh call, so it cannot tell the two parses apart.
- **Gate 5** (CONCERNS 85, head `19108b83`, scoped review; the last gate in the 5-gate budget): no code defect. T295-QA-10 (medium, wording): the documented guard window said "a few seconds" where it is the whole sync plus a first-use build, and the `run.sh` comment cited the cross-repository lock item for a same-branch lock.
- **Fix 5**: wording only, in `run.sh`, `testing-remote.md`, the task's Future Improvements (a per-run lock item added) and one test title. Not re-gated: the budget is spent, so the Step 5c review is the gate that reads it. Two LOW items stay in `recommendations.future` (deferred SIGTERM trap, 9999-minute cap).
- **PR Review**: CONCERNS (conformance lens only; report `task.295.pr-review.1.test-remote-lan-server-route.md`). No open coverage finding. PC-1 (this table's stale row) and PC-2 (`pr_number: 872` added to the task frontmatter) fixed here; PC-3 (§ 9 checkboxes unticked) is left to `/finalise`, which verifies them.
- **Next**: Step 7 `/finalise`.

---

## Completion

**Finished**: 2026-11-10 17:12
**Final Status**: Completed
**Branch**: feature/task.295.test-remote-lan-server-route
**PR**: https://github.com/Gamaroff/agent-skills/pull/872
**QA Iterations**: 5 gates, 5 fixes (final gate CONCERNS 85/100); Step 5c PR review CONCERNS, doc-only findings fixed
**DoD Summary**: ACCEPTED, 12 of 12 criteria; `task.295.dod.1.test-remote-lan-server-route.md`. CI reading 1 SUCCESS @ `77fd0b51b78d`, CI reading 2 SUCCESS @ `377959665688` (both tree-equivalent to `13486822061f`). Deviation: a hardcoded spawn timeout in the guard test was found by the first full run on the final tree and fixed in `13486822`, verified inline.
**Tracker debt**: none. PR canonical comment posted, issue #871 commented and closed, board already Done.

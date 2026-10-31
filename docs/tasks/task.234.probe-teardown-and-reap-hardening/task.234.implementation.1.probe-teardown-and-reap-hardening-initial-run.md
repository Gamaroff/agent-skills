# Implementation Report: Probe sandbox teardown and process-group reap

**Task**: `task.234.probe-teardown-and-reap-hardening.md`
**Run Number**: 1
**Started**: 2026-10-31 12:00
**Status**: Escalated

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
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #800: https://github.com/Gamaroff/agent-skills/pull/800 | —                    | 2026-10-31T09:06Z |
| 5–6. qa-task / qa-fix loop | ⚠️ Escalated — loop limit reached (gate 5 CONCERNS, QA-10 open) | `task.234.qa.{N}.*.md`; `task.234.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
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

### Step 4 — create-pr

- PR #800: https://github.com/Gamaroff/agent-skills/pull/800 (base `develop`; head `eccc31ed`).
- The report's first commit, `eccc31ed`, was made directly. It was the only uncommitted file, so `/commit-changes` and the scope/leak machinery had nothing to stage. `doc-links` on the report: 0 relative links, ok.
- The PR body was written in-session from the diff, not by the Explore summariser.
- Tracker: in-review comment `posted` on #750. GitHub board: in-review → `stage-disabled` (this board's `tracker-workflow` fires no in-review move).
- Post-PR state check (inline `gh pr view`): PR #800 state = OPEN. errors = 0.
- Lock `pr_url` set.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

### QA Loop Limit Reached — 2026-10-31

The pipeline ran 5 qa-task gates and 4 qa-fix cycles without a clean PASS. The last gate's finding is unfixed.

**Final gate status**: CONCERNS (90/100)
**HIGH findings per cycle**: 1, 1, 0, 0, 0. HIGH reached zero at cycle 3. From then on, each gate found one or two mediums in the code added by the previous fix.
**Remaining issues** (from `task.234.gate.5.probe-teardown-and-reap-hardening.yml`):
- TASK-234-QA-10, medium, in `shared/resources/security-probe.mjs`:
  - `leashEnv()` keeps relative and empty entries of the probe's `PATH`, and the leash shell runs in the case's writable sandbox.
  - On a host whose `PATH` holds `.` or `::` and has no `sleep`/`ps` in `/usr/bin:/bin`, a case could plant `./sleep` and stall its own leash.
  - Arch and Ubuntu are unaffected, because `/usr/bin` is searched first.

**What was attempted per cycle**:
- Cycle 1: Node 22 `ENAMETOOLONG` fallback (QA-1); D-test positive controls (QA-2).
- Cycle 2: the case leash (QA-3); a root lstat before `chmod -R` (QA-4); EPERM on reap (QA-5); a B-test positive control (QA-6).
- Cycle 3: the leashed case keeps its argv0 (QA-7); the leash shell runs under a fixed environment (QA-8).
- Cycle 4: the leash `PATH` is the probe's own, after `/usr/bin:/bin` (QA-9).
- Cycle 5: gate only. QA-10 is unfixed: the budget ends on a gate.

**Likely root cause**: the leash added in cycle 2 is a new mechanism inside a security boundary. Each scoped re-review found the next property it changes for a case:
- cycle 3: argv0, then the shell's environment;
- cycle 4: the watcher's tool lookup;
- cycle 5: relative `PATH` entries.

Severity fell every cycle (high → medium ×2 → medium → medium, narrower each time). This is discovery, not a stall.

**Third-strike files**: none. Gates 3–5 carry no HIGH findings, so `high_files` prints nothing.

**Recommended next steps**:
1. Grant one more cycle and fix QA-10: keep only absolute entries of `process.env.PATH` in `leashEnv()`, with a test that `.` and an empty entry never reach the leash `PATH`. It is a one-line filter. The earlier fixes held, so the grant buys new ground.
2. Or accept CONCERNS: run Step 5c (`/review-pr --effort medium --comment --no-code`), then `/finalise`, and file QA-10 as a follow-up task.
3. Separately, decide whether the leash should resolve `sleep`, `ps` and `tr` to absolute paths once at module load. That would close QA-9 and QA-10 together, with no `PATH` lookup inside the sandbox.

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-10-31
**Gate Result**: FAIL
**Issues Found**: 2.
- TASK-234-QA-1 (high): on Node 22, the first `rmSync` of a deep sandbox throws `ENAMETOOLONG` and the fallback never runs. Reproduced on 22.23.4.
- TASK-234-QA-2 (low): the D tests lack a positive control.
**HIGH findings**: 1
**MEDIUM findings**: 0
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)

#### QA Fix Cycle 1
- Ingester ran inline, with no independent reader: the gate was written in this session, so its findings were already in context. Changes-requested: `stage-disabled`.
- **TASK-234-QA-1** (`security-probe.mjs` `removeSandbox`):
  - `ENAMETOOLONG` joins `EACCES`/`EPERM` in the fallback.
  - After `chmod -R`, the tree is removed with `rm -rf --`, which descends by relative path, instead of a second `rmSync`.
  - A root that is still present throws with both commands' status.
- **Test-helper fix:** `withFreshTmpdir` cleans up with `rm -rf` too. Its `rmSync` had leaked a deep tree on the failing Node 22 run, which I found and removed.
- **TASK-234-QA-2:** both D tests gain a started-file positive control. The grandchild writes it first and the case waits for it, for at most 2 s. The shell test also asserts each row is `rejected`.
- Node 22.23.4, 24.21.0 and 26.8.2: the task.234, QA2-1 and QA1-4 tests are 6/6 on each.
- Mutation proofs:
  - `ENAMETOOLONG` dropped → A red on Node 22 → covered.
  - `rm -rf` replaced by `rmSync` → A red on Node 22, with "still there (chmod exit 0; ENAMETOOLONG)" → covered.
  - The shell grandchild's `started` touch removed → shell D red ("never started") → covered.
  - The module grandchild's `started` write removed → module D red → covered.
- Probe: `git grep -F -i 'chmod -R u+rwx'` over SKILL.md, shared `.md` and hand-authored references.
  - `shared/resources/probe-boundary-rule.md`: updated.
  - Also checked: `CHANGELOG.md` updated; task doc § 3 Target A annotated; the plan and the review are history and were left unchanged.
  - Population: 1. Move: patch, because the one rule statement lives in one shipped file.
- Committed `3cd1bc62` (fix + gate.1 + qa.1 + task doc) and pushed. PR comment rc 0; issue #750 `qa-fix-1` comment `posted`.

### QA Cycle 2 — 2026-10-31
**Gate Result**: FAIL (70/100). This was a full-diff refute pass by an independent Explore reviewer: dispatched 09:17:48Z, `duration_ms` 132772.
**Issues Found**: 4. Both cycle-1 fixes were verified FIXED.
- TASK-234-QA-3 (high, reviewer CR-2 medium/medium, promoted on measurement): `detached: true` lets a case survive a group kill of the probe. Its timeout dies with the parent. With `detached` the marker was written; without it (base) it was not.
- TASK-234-QA-4 (medium, CR-1): `chmod -R` follows a sandbox root that is itself a symlink. Measured on GNU chmod 9.12: a 500/500 tree became 700/700.
- TASK-234-QA-5 (low, CR-3): `reapGroup` rethrows EPERM.
- TASK-234-QA-6 (low, CR-4): the B test has no positive control.
**HIGH findings**: 1
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Convergence**: HIGH in `security-probe.mjs` on gates 1 and 2. Gate 1 was about teardown depth, gate 2 about session lifetime, so the mechanisms differ. This is not yet a third strike.
**Action**: Running qa-fix (cycle 2 of 5)
- CI on `3cd1bc62`: pending at the read. Gate 2 and qa.2 were posted: PR comment rc 0; issue #750 `qa-gate-2` comment `posted`.

#### QA Fix Cycle 2

qa-fix ran inline from the skill text already loaded this session. The gate was written in-session, so the ingester had no independent reader.

**TASK-234-QA-3: a case leash.**
- Each case is exec'd under `/bin/sh` beside a watcher in its group. The watcher kills the group once the case's parent is no longer the probe; it uses `ps -o ppid=` and falls back to `kill -0`.
- The case runs through `/usr/bin/env -i` with its environment spelled out. The first draft let sh's `SHLVL` leak into the case's environment, and the CLI argv test caught it.
- An unresolvable command is spawned unleashed, so ENOENT stays as it was.
- The watcher closes fds 0–2 and the extra fds, and sleeps before its first `ps`.
- Move: replace (a new mechanism beside `detached`).

**TASK-234-QA-4.** `forceRemoveTree` (exported for its test) lstats the root. Anything but a real directory is removed as an entry and reported.

**TASK-234-QA-5.** `reapGroup` treats EPERM like ESRCH. This is not testable without a foreign process group, so it is reasoned only.

**TASK-234-QA-6.** The B (and A) case chain ends in `|| exit 9`, and B asserts each row is `rejected`.

**Mutation proofs:**

| Mutation | Result | Coverage |
| --- | --- | --- |
| Leash disabled | QA-3 red ("the case outlived the killed probe") | covered |
| lstat guard removed | QA-4 red ("Missing expected exception") | covered |
| Watcher keeps the extra fd | The whole suite hangs until `timeout 300` kills it (rc 124) | covered as a hang, not a red; no orphans were left afterwards |
| B plant broken (`nolocked/link`) | B red | covered |

**Tests:** the task.234, QA-3, QA-4, QA2-1 and QA1-4 tests passed 8/8 on Node 22.23.4 and 26.8.2.

**Wall time:** the 265 pre-existing probe tests against a `HEAD` worktree. Head 27.28/27.29/28.24/30.56 s; leash 28.99/29.80/30.10/33.80 s; load 3.3–4.4. That is +1.7 to +3.2 s, recorded against the performance criterion.

**Probe** (`git grep -F -i` over SKILL.md, shared `.md` and hand-authored references):
- "follow no symlink": 0 hits after the edit, because § 5 was reworded.
- "is spawned `detached`": `probe-boundary-rule.md` (updated, plus a new leash bullet).
- "process group": two more hits. `mutation-proving.md:524` and `session-handoff/SKILL.md:156` describe other mechanisms, so they are unaffected.
- Population: 1. CHANGELOG and task doc updated.

Committed as `7646e7be`.

### QA Cycle 3 — 2026-10-31
**Gate Result**: CONCERNS (80/100). Scoped to the files changed since gate 2; Explore reviewer, `duration_ms` 161090.
**Issues Found**: 4. QA-3 to QA-6 were verified FIXED.
- TASK-234-QA-7 (medium): the leash gives `env` the resolved path, so bash's argv0 is `/usr/bin/bash` and `isLaunchFailure` misses a fence-script open failure.
- TASK-234-QA-8 (medium): the leash shell inherits the case environment, so `SHELLOPTS=xtrace` traces it onto the case's stderr.
- Two lows (EPERM ambiguity, watcher pid reuse) were routed to `recommendations.future`.
**HIGH findings**: 0
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 3 of 5)

#### QA Fix Cycle 3

- **TASK-234-QA-7**: `leashed` now passes `env` the command name, not the resolved path, so `env` resolves it on the case's own PATH. The path lookup only decides whether to leash at all.
- **TASK-234-QA-8**: the leash shell is spawned under `LEASH_ENV` (`PATH=/usr/bin:/bin`); the case's environment travels only through `env -i`. `leashed` now returns `{command, args, env}` and both call sites use it.
- New test `leashed: the case sees its own argv0, exactly its own environment…`: `SHELLOPTS=xtrace`, a `-DASH` key and a multi-line value; asserts argv0 `bash`, the exact environment via `env -0`, and empty stderr.
- Mutation proofs: resolved path as program → red (`'/usr/bin/bash'` ≠ `'bash'`); case env given to the leash shell → red. Both restored, `cmp` clean.
- Reviewer CR-3 (EPERM ambiguity) and CR-4 (pid reuse) stay in `recommendations.future`.

Committed as `3820a0de`.

### QA Cycle 4 — 2026-10-31
**Gate Result**: CONCERNS (90/100). Scoped to the changes since gate 3; Explore reviewer, `duration_ms` 79488.
**Issues Found**: 3. QA-7 and QA-8 were verified FIXED.
- TASK-234-QA-9 (medium): the QA-8 fix left the leash shell with `PATH=/usr/bin:/bin` only, so on a host that keeps `sleep`/`ps` elsewhere the watcher spins.
- One low (the QA-8 stderr assertion only bites where `/bin/sh` is bash) was routed to `recommendations.future`; one cleanup was folded into QA-9.
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 4 of 5)

#### QA Fix Cycle 4

- **TASK-234-QA-9**: `LEASH_ENV` became `leashEnv()`, which returns `PATH=/usr/bin:/bin:<the probe's own process.env.PATH>` at call time. The case still cannot set it. The watcher's own `PATH=` prefix was removed (reviewer CR-3 cleanup).
- **New test**: "the leash shell finds tools on the host PATH". A tool that exists only in a temp directory on the probe's `PATH` stands in for NixOS's `sleep`/`ps`, and `command -v` must find it under `leash.env`.
- **Mutation proof**: with the host `PATH` dropped, the test goes red. The code was restored and `cmp` is clean.
- **Deferred**: the dash caveat on the QA-8 stderr assertion (reviewer CR-2) is routed to `recommendations.future`.

Committed as `a32dd8f0`.

### QA Cycle 5 — 2026-10-31
**Gate Result**: CONCERNS (90/100). Scoped to the changes since gate 4; Explore reviewer, `duration_ms` 34947.
**Issues Found**: 1. QA-9 was verified FIXED.
- TASK-234-QA-10 (medium): `leashEnv()` keeps relative and empty entries of the probe's `PATH`, and the leash shell's cwd is the case's writable sandbox. On a host whose `PATH` holds `.` or `::` and has no `sleep`/`ps` in `/usr/bin:/bin`, a case could plant `./sleep` and stall its own leash.
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — route classifier returned `continue (not-a-pass-gate)`: route 2b is PASS-only, and route 2 declined (`product-defect-signal`)
**Action**: Escalating — loop limit reached

Gate 5 and qa.5 were committed as `aa82accf`. A Step 5c `/review-pr` was started before the budget test was applied, and stopped before any lens was dispatched: no review report exists.

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: feature/task.234.probe-teardown-and-reap-hardening
**PR**: #800 — https://github.com/Gamaroff/agent-skills/pull/800
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}

# Implementation Report: security-probe — the cli: form honours a case's fixture.files (and env)

**Task**: `task.216.probe-engine-cli-case-fixture-files.md`
**Run Number**: 1
**Started**: 2026-10-22 04:45
**Status**: Completed

---

## Summary

Make the `cli:` probe arm write a case's `fixture.files` and merge `fixture.env` before the child starts, reusing `writeFixtureFiles`, so a CLI that reads a populated directory can have an accepted legitimate case.

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
| Board status        | In Progress ✅ (already; Priority set to P2)                                |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.216.*` exists in git                             | Branch created at `77300ab0` | —                    | 2026-10-22T04:44Z |
| 2. review-task             | ✅ Done | `task.216.review.{N}.{name}.md` exists (or skip logged)               | READY TO IMPLEMENT 8/10; draft → ready-for-development | —                    | 2026-10-22T04:48Z |
| 3. develop                 | ✅ Done | Task status == `Ready for Review`                                      | 1 iteration; ci:fast 6201/0 fail; 8 new tests, 5 mutants red | .summaries/step-3-iteration-audit-1.json | 2026-10-22T06:11Z |
| 4. create-pr               | ✅ Done | PR URL; issue comment posted                                           | PR #726: https://github.com/Gamaroff/agent-skills/pull/726 | — | 2026-10-22T06:14Z |
| 5–6. qa-task / qa-fix loop | ✅ Done | `task.216.qa.{N}.*.md`; `task.216.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | 3 cycles: gate.1 PASS (1 LOW, fixed), gate.2 CONCERNS (fixed), gate.3 PASS 95 (1 LOW carried, route 2b); 5c APPROVE | —                    | 2026-10-22T06:50Z |
| 7. finalise                | ✅ Done | `task.216.dod.{N}.*.md`; task `status: accepted`                      | ACCEPTED; dod.1; security probe 26 executed, 0 escaped; CI reading 2 SUCCESS (tree-equivalent) | —                    | 2026-10-22T06:58Z |
| 8. commit-changes          | ✅ Done | All artifacts committed and pushed                                     | Implementation report committed and pushed | —                    | 2026-10-22T06:58Z |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-10-22

- Invoked by `/develop-next` (autonomous, `--defaults`); item T216 selected from the task-registry fallback.
- Feature branch base: develop — source: recommended (`--defaults`, on `develop`)
- PR target branch: develop — source: recommended (`--defaults`)
- Mode: standard — source: detector (Phase 0 run inline, Agent 3 not dispatched: risk_level absent, phase_count 5, single_module false → standard)
- Skips: none — source: none. Questions asked: 0 (`--defaults`, no conflicts). Refused: none.
- qa-planning gate: skipped (auto — no prompt)
- Task status at start: `draft` — proceeding; Step 2 `/review-task` validates and promotes.
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Tracker: github, issue #696.
- Branch: `feature/task.216.probe-engine-cli-case-fixture-files` from `develop` @ `77300ab0`, pushed. Report stashed before branch creation, restored after.
- Work-started comment: posted. GitHub board: work-started → already (In Progress). Priority: unset → P2.

### Step 2 — review-task

- review-task invoked (status `draft`, no report). Output format auto-answered: Comprehensive report.
- Pre-pass B: aligned (axes source: architecture). Pre-pass C: not-implemented.
- Question points auto-answered with the recommended option: Q1 per-case `fixture.files` over `--fixture-setup`; Q2 refuse `PATH`/`NODE_OPTIONS` in a `cli:` case's `fixture.env` (fail closed).
- Step 8.5 auto-answered: Yes, apply all critical + important fixes (6 applied). Step 9 auto-answered: Yes, fixes complete → `ready-for-development`.
- Review report: docs/tasks/task.216.probe-engine-cli-case-fixture-files/task.216.review.1.probe-engine-cli-case-fixture-files.md (`reviewed_blob` written).
- Review outcome comment skipped — review-task reported `posted` (stage review-task). Tracker key unchanged (#696), no re-fire.

### Step 3 — develop

- Pre-develop surface map: 9 files identified in shared/resources (security-probe.mjs, security-input-corpus.mjs, probe-boundary-rule.md, finalise-dod-security-prompt.md, tests/security-probe.test.mjs + fixtures/security-probe/, CHANGELOG.md) and the bundled copies under skills/{finalise,qa-story,qa-task,review-security}/references/. `docs/reference/` lists no entry forms (no edit there).
- Plan file: none — `/develop` invoked (inline path not eligible).
- Fast gate precondition: `npm run ci:fast` resolves.
- `/develop` invoked (orchestrated). Draft/Planned gate not reached (status ready-for-development). Alignment: no implementation (greenfield in `runCliCase`).
- Implemented in `runCliCase`: `fixtureProblem`, `CLI_INTERPRETER_ENV` (PATH, NODE_OPTIONS) refusal, `expected.absent` × `fixture.files` collision, `writeFixtureFiles`, `fixtureCaseEnv`. Docs: probe-boundary-rule.md §5, finalise-dod-security-prompt.md, security-input-corpus.mjs comment, CHANGELOG. Bundled (16 copies).
- Tests: 8 new (Node + Python). Mutation proof: dropping the write, the env merge, the env refusal, the collision clause or `fixtureProblem` each turns its tests red; source restored byte-identical.
- Fast gate iter 1: `npm run ci:fast` → TEST_EXIT=0 (6201 tests, 0 fail, 14 skipped).
- Loop audit iter 1: status ready-for-review → exit loop. Development completion comment posted to github issue 696.

### Step 4 — create-pr

- SCOPE_PATHS: work-item dir, CHANGELOG.md, shared/resources, shared/resources/tests, skills/{finalise,qa-story,qa-task,review-security}/references. Pre-flight held nothing.
- Commit `0f3d2c99` (scoped); pushed. Leak check OK.
- PR created: https://github.com/Gamaroff/agent-skills/pull/726 (base develop). PR body written in-session from the diff rather than by the summariser subagent (full context already held).
- Post-PR state check: PR #726 state = OPEN, mergeable. errors = 0 (checked with `gh pr view`, not the poller subagent).
- Issue #696: in-review comment posted. GitHub board: in-review → stage-disabled (no `pipeline.in-review` moment configured).

### Step 7 — finalise — 2026-10-22

- DoD agents (4, parallel): success criteria PASS 3/3; security PASS; compliance NOT_APPLICABLE; docs PASS.
- Probe plan run by /finalise: 2 controls (cli-needs-data.mjs and .py), 42 cases each; 26 executed, 0 reproduced, 0 escaped, 0 refusals. The agent's two case lists differed only in four prose fields, so one list was used for both entries.
- DoD security evidence (`task.216.dod.1.security.*`) was committed with the acceptance commit, following the QA cycles' convention of tracking run records.
- CI reading 1: SUCCESS @ 481f08431103 (5/5 checks); CI reading 2: SUCCESS (tree-equivalent to 481f08431103) @ d8bc42ca69ca.
- Acceptance commit `d8bc42ca` (registry ticked; 5c review carried); pushed; 6b assertions OK; 6d CHANGELOG cites task 216.
- Canonical PR comment posted. Issue #696: done comment posted, closed (verified CLOSED), board `done` → transitioned. Document link already durable (no re-point needed).

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-10-22
**Gate Result**: PASS
**Issues Found**: 1 LOW — TASK-216-QA1-1: the new docs recommend input `.` for a legitimate `cli:` case without the filename-sink caveat (declined EISDIR under `--sink filename`)
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)
**Fixes Applied**: filename-sink caveat added to probe-boundary-rule.md §5 and finalise-dod-security-prompt.md Step 4 (doc probe population 2, both updated); bundled. Fast gate 6201/0 fail. changes-requested: stage-disabled. PR state after push: OPEN.
**Commit**: `458d79e3`

### QA Cycle 2 — 2026-10-22
**Gate Result**: CONCERNS
**Issues Found**: 2 — TASK-216-QA2-1 (MEDIUM): docs overclaim cli: fixture reach to "a repository"; TASK-216-QA2-2 (LOW): loader variables missing from CLI_INTERPRETER_ENV. Cycle 1's QA1-1 fixed.
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)
**Fixes Applied**: QA2-1 cli: fixture reach scoped to data directories in 6 places (doc probe: 4 stale phrases → 0 hits); QA2-2 loader variables added to CLI_INTERPRETER_ENV with an LD_PRELOAD decline test (mutation: 2 red); CR-5 comments. Fast gate 6201/0 fail. PR state after push: OPEN.
**Commit**: `596d262d`

### QA Cycle 3 — 2026-10-22
**Gate Result**: PASS
**Issues Found**: 1 — TASK-216-QA3-1 (LOW): docs say LD_*/DYLD_* are refused; the code matches four exact names (LD_AUDIT passes). Cycle 2's QA2-1 and QA2-2 fixed.
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: ✅ APPROVE — 0 conformance findings (code lens skipped, --no-code); report task.216.pr-review.1.probe-engine-cli-case-fixture-files.md; ready-for-merge: stage-disabled
**Loop exit**: Cosmetic-residue exit taken — PASS gate at cycle 3 with HIGH 0 for cycles 2 and 3; all 1 open findings are LOW and are carried to the gate's recommendations.future by id (TASK-216-QA3-1). This is a CLEAN exit, not a stall: nothing is blocked and nothing is being accepted over; a full qa-fix cycle for cosmetic findings is what this route exists to avoid.
**Action**: Proceeding to 5c (PR conformance review)

---

## Completion

**Finished**: 2026-10-22T06:58Z
**Final Status**: Completed
**Branch**: feature/task.216.probe-engine-cli-case-fixture-files
**PR**: https://github.com/Gamaroff/agent-skills/pull/726
**QA Iterations**: 3
**DoD Summary**: `task.216.dod.1.probe-engine-cli-case-fixture-files.md` — ACCEPTED
**Tracker debt**: none

### Completion Summary

Implemented `fixture.files` and `fixture.env` support on the security-probe engine's `cli:` form, reusing the `shell-argv:` helpers. A malformed fixture is declined by name before any spawn. QA took 3 cycles: cycle 1 added a filename-sink caveat; cycle 2, a full-diff refute pass, scoped out repository state and refused the loader variables; cycle 3 passed at 95 with one LOW carried to Deferred Work (TASK-216-QA3-1: the loader refusal matches exact names, not the `LD_*`/`DYLD_*` prefix). Accepted after a measured DoD probe run (26 executed, 0 escaped).

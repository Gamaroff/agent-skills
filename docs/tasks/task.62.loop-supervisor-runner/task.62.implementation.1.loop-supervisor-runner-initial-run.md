# Implementation Report: Run each loop iteration in a fresh Claude process, and classify the outcome from the filesystem

**Task**: `task.62.loop-supervisor-runner.md`
**Run Number**: 1
**Started**: 2026-08-28 13:30
**Status**: In Progress

---

## Summary

Build `skills/loop-supervisor` — a dependency-free Node CLI that spawns one `claude -p` per loop iteration with a pinned `--session-id`, probes `select-next.mjs` before spending a model invocation, and classifies each outcome purely from filesystem post-conditions. Delivers Layers 1–2 of `.agents/plans/loop-supervisor.md`.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | medium                                                                     |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | N/A (no issue linked)                                                      |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.62.*` exists in git                               | Branch created at `b84fd6a`; pushed | —                    |
| 2. review-task             | ✅ Done    | `task.62.review.1.loop-supervisor-runner.md` exists                    | 8/10 READY TO IMPLEMENT; 0 critical, 2 important | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 11 files, 101 unit tests, 4 mutants verified | —                    |
| 4. create-pr               | ✅ Done    | PR URL; issue comment skipped (no linked issue)                        | PR #276; 3 commits, 18 files | —                    |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.62.qa.{1,2}.*.md`; `task.62.gate.1.*.yml`; PR comments posted    | 2 cycles: CONCERNS (90) → PASS (96) | —                    |
| 7. finalise                | ✅ Done    | `task.62.dod.1.*.md`; task `status: accepted`                          | CI SUCCESS on head; CHANGELOG gap found + closed | —                    |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | 5 commits on the branch | —                    |

---

## Decisions Log

### Pipeline Startup — 2026-08-28

- Invoked by `/develop-next` (roadmap item **T62**, Phase 3) in AUTONOMOUS mode — Phase 0d questions auto-answered with the recommended option, per the develop-next directive.
- Feature branch base: `develop` — auto-answered (recommended; current branch is `develop`).
- PR target branch: `develop` — auto-answered (recommended).
- qa-planning gate: skipped (auto — no prompt)
- Phase 0a-parallel: resolver agent skipped (exact file path supplied and verified on disk); tracker poller skipped (no `github_issue`/`jira_key` in frontmatter — nothing to poll); lite-mode detector run inline (no lite-mode CLI exists in `references/`; `risk_level: medium` is decisive on its own).
- Pipeline mode: **standard** — computed from `risk_ok = false` (`risk_level: medium` ∉ {low, absent}); short-circuits the AND regardless of phase count / single-module.
- Tracker: `github` (JIRA_URL unset). `TRACKER_ISSUE` empty — task has no `github_issue` frontmatter, so all tracker signalling is skipped for this run.
- Task status is `draft` — proceeding per the develop-task 0c status table; Step 2 (`/review-task`) promotes it.
- Always-load files resolved: 3 files — from `skills-config.yaml` `devLoadAlwaysFiles`, all present on disk.
- Step 1: branch `feature/task.62.loop-supervisor-runner` created from `develop` at `b84fd6a`, pushed. Tracker signalling skipped — no linked issue.
- Step 2: `/review-task` run (comprehensive report, pipeline auto-answer). Report: `task.62.review.1.loop-supervisor-runner.md`. Score **8/10 — READY TO IMPLEMENT**; 0 critical, 2 important, 1 optional. Zero hallucinations — every cited path and line number verified against the tree.
- review-task Step 8.5 auto-answered: "Yes, apply all critical + important fixes" — pipeline proceeds autonomously. 1 applied, 1 deferred.
- review-task Step 9 auto-answered: "Yes, fixes complete" — task promoted `draft` → `ready-for-development`.
- Review fix applied: Success Criterion 5 (and its Testing Strategy row + Progress Tracking item 7) reworded as a **post-merge operator acceptance step**. A nested `/develop-next` cannot run inside this pipeline — the outer `/develop-next` run holds `develop-next.state.json` (its own single-flight lock) and this pipeline holds `develop-pipeline.lock`; a passing run would also merge an unrelated roadmap item as a test side effect.
- Review fix deferred: task has no `github_issue`/`jira_key` where task.58/60/61 all do. Creating one is outward-facing and uncovered by both autonomous-defaults tables; `review-task` Step 2 check 5 defines the no-answer path as flag-and-continue. Resolve later with `/sync-github-task`. All tracker moments in this run no-op cleanly on an empty `TRACKER_ISSUE`.
- review-task Step 10 (tracker comment) skipped silently — no linked issue.
- Step 3 pre-develop surface map built **inline, not via an Explore subagent** — this session runs under a standing "do not call the Agent tool unless the user requested it" directive, and the task document is already an exact file-level spec whose every citation was verified in Step 2. Recorded here so the deviation is visible rather than silent.
- Pre-develop surface map: 9 files identified across `skills/loop-supervisor/` (all new), `skills/develop-next/scripts/select-next.mjs` (probe target + direct-invocation guard at :849-860), `skills/develop-batch/scripts/schedule.mjs` (CLI house style — 638 lines, `export`ed pure functions, JSON on stdout, `isInvokedDirectly()` guard, `parseYamlSubset` import from `../references/yaml-subset.js`), `evals/develop-batch/unit/schedule.test.mjs` + `evals/develop-next/unit/select-next.test.mjs` (unit-test conventions), `shared/resources/develop-pipeline-on-{precompact,stop}.sh` (halt-file + lock semantics), `package.json` (test glob), `skills-config.yaml` + `docs/reference/configuration.md` (config block).
- Plan file: no co-located `task.62.plan.*.md`. The design of record is `.agents/plans/loop-supervisor.md` (362 lines) — read in full and used as the implementation context: per-iteration algorithm, the 6-row outcome table, stop policy, adapter shape, artifact layout, 7 gotchas, and the repo gate list.
- Environment facts re-verified at implementation time (task's own instruction): `claude` **2.1.250** at `~/.local/bin/claude` — matches the version the task's facts were measured against; `node` **v24.13.1** (≥22 ✓) at `~/.nvm/versions/node/v24.13.1/bin/node`. Gotcha 4 **reproduced**: `node --version` in a non-interactive shell prints nvm's full help text before the version, and `command -v node` returns the bare word `node` — node is a shell function here, not a binary on PATH. Absolute resolution is mandatory, not defensive.
- Step 3 develop: single loop iteration, no stall. Built `skills/loop-supervisor/` across the task's 5 phases in order — classifier first and alone, then adapters + probe, then spawn/tee/heartbeat, then loop/stop-policy/signals/PID-lock, then dry-run + docs + gates.
- Test totals: **101 new unit tests** (39 classify, 29 adapters, 33 run-loop), all passing. Repo-wide `npm test`: 1785 tests.
- **Mutation probe run before trusting any green** (task Testing Strategy makes this a precondition, not a nicety). Four mutants, each restored immediately: halt-freshness ignoring the timestamp → 6 fail; leftover lock → `error` → 2 fail; error/halt precedence removed → 5 fail; empty stdout → `stop` → 3 fail. Suite green again after every restore.
- **Live finding, now pinned as a regression test:** a real `claude -p` result envelope reported `subtype: "success"` **and** `is_error: true` in the same object (credit exhausted). A classifier trusting `subtype` alone would have reported a clean iteration all night while every child failed — the exact silent-success failure the design exists to rule out. `isChildError` already checked all three signals; the envelope is now a test.
- Second-order finding from the same run: `ANTHROPIC_API_KEY` takes precedence over a `claude.ai` login, so an unattended run can fail this way with no obvious cause. Documented in the README's Auth section.
- **Gotcha 4 reproduced, not assumed:** `node --version` in a non-interactive shell here prints nvm's entire help text before the version, and `command -v node` returns the bare word `node`. The supervisor resolves both binaries absolutely and refuses to start rather than spawn a shim.
- Repo convention correction made mid-build: `references/*.js` in this repo are **CommonJS** (imported from `.mjs` via named-export interop, as `yaml-subset.js` is). `classify.js`/`adapters.js` were first written as ESM, failed to load, and were rewritten to match. `run-loop.mjs` imports yaml-subset via `../../../shared/resources/` so `npm run bundle` rewrites it — verified: 1 bundled, 1 rewritten, dry-run still green afterwards.
- Deferred: Success Criterion 5 (one real `/develop-next` iteration) — the post-merge operator step agreed in Step 2. Tasks 63/64 features (`status`/`watch`, notify, dashboard) are out of scope by the task's own Scope section.
- Step 7 finalise: DoD **PASSED**, task `status: accepted`. Four domain checks run inline rather than via four parallel Explore subagents (same standing directive as Step 3) — recorded in the DoD summary so the deviation is visible, with every claim carrying a re-verifiable citation.
- **CI was held, not assumed.** The first rollup sample read `PENDING` (`test` was `IN_PROGRESS`); finalise waited for it to settle rather than rounding it up. Final: `CI_ROLLUP = SUCCESS`, all four checks green, on rollup head `0426f7d1` == local `HEAD` — evidence about this commit, not an ancestor.
- **This corrects QA cycle 1's SC7 concern.** Local full-suite runs failed in `shared/resources/tests/jira-interception.test.mjs`, and a clean-`develop` control run failed there too, so it was attributed to a pre-existing load-sensitive flake. CI's own `test` job is green on this head — stronger evidence than a local run competing with the concurrent background suites this session was running. SC7 assessed PASS at DoD.
- **DoD found one real gap that both QA cycles missed: `CHANGELOG.md` had no entry.** `develop`'s task checklist requires one when a task adds a feature, and this repo actively maintains a Keep-a-Changelog file. Both QA cycles were scoped to code and tests, so neither looked. Closed during finalisation with an `### Added` entry under `[Unreleased]`, and recorded in the DoD summary as *found and closed* rather than quietly repaired — the miss is the useful signal, and a DoD pass that silently fixes what it audits tells the next reader nothing.
- Tracker issue close + board move skipped — no linked issue. Sprint Review summary not generated: this repo does not keep `sprint-review-summary.md` beside its tasks, and inventing the convention here would be noise.

---

## Issues Log

- **`npm test` is not clean on this repo's `develop` either — verified, not assumed.** The full suite reported
  failures on this branch, so a control run was done on a clean `develop` worktree (`git worktree add`): it
  also fails, on `§8b move-sprint-issues.sh completes under set -euo pipefail` (30s timeout) and
  `driver claude-sdk — availability reflects SDK install + API key`. The failing set varies between runs and is
  entirely 20–30s timeouts inside `shared/resources/tests/jira-interception.test.mjs`, which passes **48/48 in
  isolation** and which this branch does not touch — they are load-sensitive shell-subprocess tests, and this
  session was running background suites concurrently. Baseline `develop`: 1684 tests / 2 fail. This branch:
  1785 tests (exactly +101, all mine) with the same file flaking. **This task's own 101 tests pass 101/101** via
  the same glob `package.json` runs. Not introduced here; not fixed here either — out of scope, and worth a
  separate bug if the flake matters.
- **Repo convention correction, caught by a failing load rather than by reading.** `classify.js` and
  `adapters.js` were first authored as ESM (`export function …`) and failed to import: `package.json` is
  `"type": "commonjs"`, and this repo's `references/*.js` are CJS consumed from `.mjs` via Node's named-export
  interop (`shared/resources/yaml-subset.js` is the pattern). Both were rewritten as CommonJS and verified to
  load through **both** paths (`require()` and `import()`) before any further work was built on them.

---

## QA Iteration History

### QA Cycle 1 — 2026-08-28

**Gate Result**: CONCERNS (90/100)
**Issues Found**: 1 medium (**LS-1** — config silently overrode an explicit CLI flag whose value equalled the built-in default; consequential because `--base` is the ref the progress oracle watches, so a wrong ref makes every healthy iteration classify `idle` and ends the loop at `--max-idle` reporting no progress), 1 low advisory (`retry-once` in a JSDoc type that `parseArgs` rejects).
**Action**: Ran qa-fix (cycle 1 of 5).

**Fix**: presence is now **tracked** in an `explicit` Set rather than inferred from a `DEFAULTS` comparison, and the merge moved into an exported `applyConfig(opts, config)`. Mechanism-level, so every config-fillable option is covered and later ones inherit the rule. 9 regression tests added; commit `55980ca`.

### QA Cycle 2 — 2026-08-28

**Gate Result**: PASS (96/100)
**Issues Found**: none. LS-1 verified fixed four ways — regression tests (110/110), mutation probe (restoring the old comparison turns exactly 3 red, green again on revert), live check against a disagreeing config, and a structural + behavioural check that the new flag→key table covers all 14 flags. Reliability NFR CONCERNS → PASS. An adversarial pass over the fix itself found nothing (the new `Set` does not leak into serialised output; no dangling binding from the refactor; `applyConfig` safe when `explicit` is absent).
**Action**: Proceeding to finalise.

**On the loop-exit rule**: the gate carries one `top_issues` entry with `status: closed`. The Step 5–6 branching rule reads "`CONCERNS`, `FAIL`, or has `top_issues` → proceed to 5b"; taken literally that would loop forever on a closed issue. The qa-task skill's own post-fix example keeps the resolved issue in `top_issues` with `status: closed`, so "has `top_issues`" means **open** ones. Loop exited on `PASS` + zero open issues.

---

## Completion

**Finished**: 2026-08-28 13:15
**Final Status**: Completed
**Branch**: `feature/task.62.loop-supervisor-runner`
**PR**: https://github.com/Gamaroff/agent-skills/pull/276
**QA Iterations**: 2 (CONCERNS 90/100 → PASS 96/100)
**DoD Summary**: `docs/tasks/task.62.loop-supervisor-runner/task.62.dod.1.loop-supervisor-runner.md`
**Tracker debt**: none deferred by access restrictions. One outstanding item by choice: the task has no linked tracker issue (`/sync-github-task` when convenient) — flagged at review, deliberately not auto-created because it is outward-facing and uncovered by the autonomous-defaults tables.

### Completion Summary

Built `skills/loop-supervisor` — a dependency-free Node CLI that runs each loop iteration in a fresh
`claude -p` process and classifies the outcome from filesystem post-conditions rather than the
assistant's prose. 11 files, **110 unit tests**, CI green.

The pipeline did its job rather than rubber-stamping:

- **Step 2 (review)** found that Success Criterion 5 specified a test the implementing pipeline
  structurally cannot run — a nested `/develop-next` collides on `develop-next.state.json` and
  `develop-pipeline.lock`, and would merge an unrelated roadmap item as a side effect of testing.
  Reworded into a post-merge operator step rather than left to be silently skipped.
- **Step 5 (QA cycle 1)** found a real medium correctness bug by diff review — config silently
  overrode an explicit CLI flag whose value equalled the default, which would have pointed the
  progress oracle at the wrong ref and made every healthy iteration read as `idle`. Fixed at the
  mechanism level (track presence, don't infer it) and mutation-proven.
- **Step 7 (DoD)** found a gap both QA cycles had missed — no `CHANGELOG.md` entry — because QA was
  scoped to code and tests while the obligation is repo-level. Closed, and recorded as found rather
  than quietly repaired.
- **CI was waited for, not assumed.** The rollup read `PENDING` on first sample; acceptance held
  until `test` completed, then went green on the exact head.

Two things are carried forward openly rather than buried: **SC5 is deferred, not met** — an operator
must run one real `/develop-next` iteration on a clean tree after merge — and the repo's pre-existing
`jira-interception` timeout flake is unrelated to this task and warrants its own bug.
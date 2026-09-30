# Implementation Report: Harden the shell-fn: sentinels and the fake-gh coverage

**Task**: `task.140.shell-fn-sentinel-hardening.md`
**Run Number**: 1
**Started**: 2026-09-30 07:43
**Status**: Completed

---

## Summary

Close the seven limits recorded on task.136 (library EXIT trap, errexit source status, needs-fake-gh on both shell forms, detector terminators + one-level source, fixture lint lanes, dead clause, symlink containment).

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
| Board status        | In Progress ✅ (gh-stage: transitioned; re-check: already)                 |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.140.*` exists in git                             | Branch created at `1dce6511`; pushed with upstream | —                    |
| 2. review-task             | ✅ Done | `task.140.review.{N}.{name}.md` exists (or skip logged)               | `task.140.review.1.shell-fn-sentinel-hardening.md` — READY TO IMPLEMENT 9/10; Planned → Ready for Development | —                    |
| 3. develop                 | ✅ Done | Task status == `Ready for Review`                                      | Inline (plan + surface map); 1 iteration; audit 17/17 `ready-for-review` | `.summaries/step-3-loop-audit-1.json` |
| 4. create-pr               | ✅ Done | PR URL; issue comment posted                                           | PR #527: https://github.com/Gamaroff/agent-skills/pull/527 | —                    |
| 5–6. qa-task / qa-fix loop | ✅ Done | `task.140.qa.{N}.*.md`; `task.140.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ✅ Done | `task.140.dod.{N}.*.md`; task `status: accepted`                      |       | —                    |
| 8. commit-changes          | ✅ Done | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-09-30

- Dispatched by `/develop-next` (autonomous run): selected T140 from the task-registry fallback (no actionable roadmap phase row).
- Upfront Setup — questions asked: 2 (Q1, Q2), both auto-answered per the develop-next AUTONOMOUS RUN directive:
  - Q1 Feature branch base: develop — auto-derived recommended (on `develop`)
  - Q2 PR target branch: develop — auto-derived recommended
- qa-planning gate: skipped (auto — no prompt)
- Phase 0 run inline (no subagents dispatched — a first-class case per step-0 §0c). Lite-mode inputs derived from the document: risk_level=medium (not in {low,absent}), phase_count=4, single_module=false → PIPELINE_MODE=standard.
- Always-load files resolved: 3 files — from skills-config.yaml `devLoadAlwaysFiles`.
- Tracker: github, issue #464. Status at start: `planned` — Step 2 (`/review-task`) validates and promotes.

---

### Step 1 — create-branch

- Branch `feature/task.140.shell-fn-sentinel-hardening` cut from `develop` at `1dce6511` and pushed. Report stashed before branch creation, restored after.
- Pipeline lock written (`current_step: 2`).
- Tracker: work-started comment `posted` on #464; board work-started → `In Progress` (transitioned).
- Priority default block not run: the issue already carries Priority High (edit-task, 2026-09-22) and the block only writes when unset.

### Step 2 — review-task

- Ran `/review-task` (status `planned`, no report existed). Output: Comprehensive report (pipeline default). Step 8.5 auto-answered "apply all critical + important"; Step 9 auto-answered "fixes complete".
- Review report: `docs/tasks/task.140.shell-fn-sentinel-hardening/task.140.review.1.shell-fn-sentinel-hardening.md` — 1 Critical (plan's `head -c 21` shebang test never matches — executed), 3 Important (source-follow base, `isWithin`, decayed counts), 3 Optional; all Critical/Important fixed in task + plan.
- Invariant executed: the plan's new `SHELL_FN_BODY` returns 97 for own-EXIT-trap and `set -e; false` libraries on bash 5.3 / bash 3.2 / zsh 5.9; clean 0 and collision 99 unchanged.
- Review Q1 (source-follow resolution base) auto-answered with the recommended option: library dir, then root.
- Pre-pass agents B/C not dispatched (inline) — independence loss recorded in the report.
- Planned promoted to Ready for Development by review-task. Tracker: `review-task` and `review` comments `posted` on #464; board Priority self-healed to P1.

### Step 3 — develop

- Fast gate: `develop.fastGateCommand` unset → `npm run ci:fast` (fallback); precondition passed (the script is defined).
- Pre-develop surface map: 8 files identified (inline — the Explore pass was not dispatched; the Step 2 review had already read every target): `shared/resources/security-probe.mjs` (SHELL_FN_BODY, GH_COMMAND_WORD, resolveEntry, needs-fake-gh gate), `shared/resources/tests/security-probe.test.mjs` (task.136 block, FN_FIXTURES/LABEL_CASES/FAKE_GH), `scripts/lint-shell.sh` + `.github/workflows/shellcheck.yml` (twin file lists), `shared/resources/probe-boundary-rule.md` §5, `CHANGELOG.md`, `tests/fixtures/fake-gh/gh`, `evals/shared/tests/lint-shell-absent-binary.test.mjs` (PATH-stubbed run of the lane).
- Plan file found: `docs/tasks/task.140.shell-fn-sentinel-hardening/task.140.plan.shell-fn-sentinel-hardening.md` — included as implementation context.
- Step 3 inline — /develop not invoked: the plan names every hunk and the review had already executed its central claim; both preconditions (plan file + surface map) are recorded above.
- Branch-point count of pre-existing rows: `grep -cE '^\s*test\(' shared/resources/tests/security-probe.test.mjs` → 100.
- **Phase 1** — 5 rows added; all 5 red against the task.136 engine for the stated reason (own-trap/errexit/shell: → `absent` not `unverifiable`; gh shapes → `no-hostile-case-was-rejected` not `needs-fake-gh`; symlink → `ok: true`).
- **Phase 2** — body (shadowed `exit`, `src=$?`), gate on `isShellForm`, `namesGh` (terminators, `GH_VARIABLE`, one-level source: library dir then root, `isWithin`), dead clause removed, `realpathSafe` on root and entry. 105/105.
- **Mutation proofs** (`cp` snapshot → mutate → run → restore; engine `cmp`-identical after; log copied to `.claude/state/t140-mutations.log`):

  | Mutant | Reverts | Red row (only) |
  | --- | --- | --- |
  | M1 | `exit` shadow + `unset -f exit` | own EXIT trap (c3-CR-1) |
  | M2 | `src=$?` → `source "$1" \|\| exit 97` | set -e top-level failure (PR-review CR-1) |
  | M3 | gate → `kind === "shell-fn"` | `shell:` names gh (c3-CR-2) |
  | M4 | terminators → `(\s\|$)` | gh shapes (c3-CR-3) — `semi.sh` |
  | M5 | drop the one-level source follow | gh shapes (c3-CR-3) — `src-rel.sh` |
  | M6 | drop `realpathSafe` on the entry | symlink refused |
  | M7 | drop `GH_VARIABLE` | gh shapes (c3-CR-3) — `var.sh` |
  | P1 | `read -r first` → `frist` in the workflow only | lane parity: identical block |
  | P2 | shebang literal changed in both lanes | lane parity: selects the fake gh |

- **Phase 3** — identical `BEGIN/END extensionless-fixtures` block in both lanes; `npm run lint:shell` → 78 source shell scripts (77 at the branch point), clean. Red-lane proof in a scratch worktree (removed): fixture + `unused_t140=1` → SC2034 **red** with the block, **green** with the branch-point script.
- **Phase 4** — rule §5 (real-path containment; sentinel paragraph; fake-gh on both forms, detector definition; residual race stated); engine header; `npm run bundle` (6 bundled copies); `bundle:check` 0; CHANGELOG `[Unreleased]` › Fixed.
- task.136 green path: `--sink filename --entry shell-fn:shared/resources/gh-labels.sh#gh_labels_filter --cases-file tests/fixtures/shell-fn/gh-labels.cases.json --fake-gh tests/fixtures/fake-gh --json` → `engages`, executed 20, shells bash+zsh, declined 0; without `--fake-gh` → `unverifiable` / `needs-fake-gh`, executed 0.
- Wall-clock: branch point 63.0 s vs branch 63.1 s for the probe test file (task's "~30 s" had decayed).
- `npm run ci:fast` → exit 0 (log removed).
- Loop audit iter 1 (Explore, 10 s): `{status: ready-for-review, completed: 17, total: 17}` → loop exit. Development-complete comment `posted` on #464.

### Step 4 — create-pr

- SCOPE_PATHS (`.claude/state/step4-scope-paths.txt`): the work-item dir, `.github/workflows`, `CHANGELOG.md`, `scripts`, `shared/resources`, `shared/resources/tests`, four `skills/*/references` dirs, and `evals/shared/tests` — the last added by hand: the new parity test sits in a directory with no tracked change, so the Pre-flight Guard held it; it was restored and its directory passed as an extra `--scope`, as the step doc directs. Nothing else held.
- `/create-pr --base develop --issue 464` → `/commit-changes` split four commits: `493110df` docs (review 1), `4f66f054` fix (engine + tests + rule + bundle), `2a8891cb` ci (lanes + parity test), `30fbfa13` docs (task, report, CHANGELOG). Pushed.
- PR created: https://github.com/Gamaroff/agent-skills/pull/527 (state OPEN). PR body written from the diff directly — the Explore PR-body summariser was not dispatched (this session had already read every hunk).
- Leak check over every branch commit: no path outside SCOPE_PATHS.
- Tracker: in-review comment `posted` on #464; board in-review → `stage-disabled` (this repo's workflow does not map the moment — correct outcome). Lock `pr_url` set.

### Steps 5–6 — QA loop

- QA_MAX_CYCLES=5 (lock has no `qa_max_cycles`). Board QA-start re-assert: `in-review` → `stage-disabled` (as at Step 4).
- Traceability mapper (Explore, 70 s) → `.summaries/qa-traceability-matrix.md`, written by the orchestrator (read-only subagent returned the content); 7 criteria, coverage full 4 / unit 2 / partial 2 / none 1.
- **Cycle 1** — `/qa-task` with `code_review_blocking=true`: gate `task.140.gate.1` CONCERNS 80/100; boundary probe of `resolveEntry` 21 executed (symlink-escape refused, reproduced at base); code review 5 bugs + 1 cleanup, 3 promoted. PR comment and `qa-gate-1` tracker comment posted. Route: open entries, cycle 1 → 5b.
- **Cycle 1, 5b** — changes-requested → `stage-disabled`. Third strike / narrowing offer: not applicable (cycle 1, `below-cycle-floor`). `/qa-fix` ran inline (Step 1b: the orchestrator wrote this gate, so the ingester would have re-read the same file — independence loss recorded). Fixes: CR-1 (shadow `trap` during the source; design executed on bash 5.3 / 3.2 / zsh 5.9 before editing), CR-2 + CR-6 (real paths at the fake-gh check and inside `namesGh`), CR-3 (quote/backslash prefix, source after `;`/`&&`/`||`/`then`/`do`), CR-5 (outside-dir assertion). 3 rows red → green; 108/108; mutants F1–F5 each red on its own row. Step 3.5 probe: population 5, only rule §5 restates the mechanisms (updated). Fast gate attempt 1 green. Commit `9023813b` (fix + gate.1 + qa.1 + security record + bug.1/.2), one push. PR comment and `qa-fix-1` tracker comment posted.
- **Cycle 2, 5a** — refute pass over the whole diff + safety re-probe (judgement on gate 1 CR-2); reviewer 209 s. Gate 2 CONCERNS 70/100: both cycle-1 mechanisms (trap shadow, static gh detector) are open-ended enumerations. Attributed to this change by judgement (identical verdict at base; recorded in bug.3/bug.4). `TMPDIR=/tmp` variance 30/30; boundary re-probe 21 executed, unchanged. PR + `qa-gate-2` comments posted. Route: cycle 2, open mediums → 5b. Narrowing-residue engine: `signal: true` (every MEDIUM on gates 1–2 names `security-probe.mjs`, HIGH 0) → offer passed to qa-fix Step 2.6.
- **Cycle 2, 5b** — Step 2.6 move: **replace** (pipeline offer + repeat subject). BUG-3: positive source-completed marker per spawn under `work/.probe-harness/` (the escape sentinel skips `work/`); cycle-1 trap shadow removed; `unset -f TRAPEXIT … || :` (zsh returns 1 for an undefined function — a library `set -e` then ended the harness, which the pre-existing task.136 errexit row caught). BUG-4: run-time trip-wire `gh` first on PATH when no `--fake-gh`; post-run decline `needs-fake-gh`; absolute-path limit stated + pinned. CR-5: ancestor realpath. Two test libraries were initially wrong (a root-relative `source` fails at run time, cwd is the fixture dir) — fixed to absolute paths. 112/112; G1–G5 each red on its own row. Probe population 8, only §5 updated. Fast gate green on attempt 1. Commit `8e739a7e`, one push; PR + `qa-fix-2` comments posted.

- **Cycle 3, 5a** — safety re-probe over the whole diff (judgement on gate 2's host-gh bypass); reviewer 258 s. `TMPDIR=/tmp` 53/53; re-probe 21 executed, unchanged; green path engages 20; `shell:qa-cycle.sh` engages 28. Gate 3 FAIL 60/100: BUG-5 (HIGH) and BUG-6 (medium), both reproduced by execution and both in cycle-2 code. PR + `qa-gate-3` comments posted.
- **Convergence check tripped** on HIGH `0, 0, 1` → *QA Loop Not Converging* escalation; 5b not run. See the escalation entry above.

### QA loop re-entry — 2026-09-30

- Resumed by `/develop-next` (run-state `dispatched: true, merged: false`). Operator chose the grant explicitly ("continue with recommended next steps"): **QA loop re-entry: 2 extra cycles granted; 0 cycle(s) run outside the loop back-filled from disk.** `grant-qa-cycles.sh` → lock restored from the halt snapshot, `QA_CYCLE=3`, `qa_max_cycles=5`.
- **Deviation from the resume contract (re-entry step 4, "re-enter at 5a as cycle `NEXT_CYCLE`").** The halt was a convergence trip at 5a, before 5b, so gate 3's queue was never handed to `/qa-fix`. Re-entering at 5a would review unchanged code, re-raise the same HIGH, and trip the check again on `0, 0, 1, 1` — spending the grant on nothing. Instead: run cycle 3's 5b against gate 3, then 5a for cycle 4. Observation logged against the contract (#228).
- **Cycle 3, 5b** — changes-requested → `stage-disabled`. Third strike: n/a (one HIGH gate). Narrowing offer: `signal: false` (`high-findings-remain`). `/qa-fix` ran inline from gate 3 (2 findings, gate already read; ingester not dispatched — independence loss recorded). Probe: population 1 (`probe-boundary-rule.md` — updated). Fast gate attempt 1 red (Prettier on the new rows), attempt 2 green (4609 pass). Commit `ab079810`, one push. PR comment + `qa-fix-3` tracker comment `posted`. PR state OPEN.
- **Cycle 4, 5a** — safety re-probe (gate 3 security FAIL), unscoped; reviewer 206 s, 4 findings. Provenance (5b) on a base worktree: PATH prepend (± `--fake-gh`) and backgrounded `gh` → `absent`, 20, planted real gh ran, identical at HEAD and base → pre-existing. Probes 69 executed (resolveEntry 21 with real symlink, green path 20, qa-cycle.sh 28). 114/114; `TMPDIR=/tmp` 55/55; validate ×4 exit 0. Gate 4 CONCERNS 80/100. PR + `qa-gate-4` comments posted. Convergence: HIGH `0,0,1,0` → no trip; route classifier `continue` (`not-a-pass-gate`) → 5b.
- **Cycle 4, 5b** — changes-requested → `stage-disabled`. Third strike: n/a. Narrowing: `signal: false` (`high-findings-remain`). Fix inline (1 medium, doc). Probe population 1 (rule §5 — updated). Fast gate attempt 1 green (4610 pass). Commit `3233686e` (fix + gate.4 + qa.4 + security record + bug.7), one push. PR + `qa-fix-4` comments posted; PR OPEN.
- **Cycle 5, 5a** — scoped review (`ab079810..HEAD`, 4 files; reviewer 127 s): 2 LOW bugs + 1 cleanup. Probes 69; 115/115; `TMPDIR=/tmp` 56/56; Step 4b `no-executable-blocks`. Gate 5 PASS 100/100. PR + `qa-gate-5` comments posted. Convergence: HIGH `0,0,1,0,0` → no trip. Route classifier: **cosmetic-residue** (route 2b) → CR-1, CR-2 carried to `future`, stamped closed; Deferred Work recorded → 5c.
- **Cycle 5, 5c** — `/review-pr --effort medium --comment`: two Explore lenses (code 126 s, conformance 77 s). **CONCERNS**: PC-2 (no `pr_number` → added `pr_number: 527`), PC-5 (QA-cycle mechanisms undocumented → deviation bullet added), PC-3/PC-4 (pre-QA counts, unticked boxes → updated), PC-1 (Completion block shows the cycle-3 halt → Step 8 rewrites it), CR-1 (low: `exit` shadow inherited by subshells) and CR-2 (cleanup) → follow-up. Report `task.140.pr-review.1.shell-fn-sentinel-hardening.md`; PR comment posted. `ready-for-merge` → `stage-disabled`. Loop exit → Step 7.

### Step 7 — finalise

- `/finalise` → 4 DoD agents in parallel: AC PARTIAL (SC5 FAIL under the citation rule, since no per-PR test asserts wall-clock), security PASS (69 probes, 1 pre-existing reproduced), compliance N/A, docs PASS.
- **SC5 decision (orchestrator):** re-measured instead of taking the implementation-time number, which predates 10 QA rows. Whole file: base 64/59 s, head 75/74 s. On the base's 100 rows the head engine takes 59/62 s against the base engine's 65/61 s (100/100 pass), so the engine is within noise and the +13 s is the 15 added rows. Accepted as PASS by measurement; recorded in the DoD.
- CI reading 1: SUCCESS @ `55f6ba69` (5 checks). CI reading 2: SUCCESS @ `3c8f9b54` (5 checks, 150 s).
- Acceptance commit `3c8f9b54` (task `status: accepted`, Change Log 1.2, DoD `task.140.dod.1`, sprint review, registry `ticked`). All three artefacts asserted on `origin`. CHANGELOG cites task 140.
- PR canonical comment posted. Tracker #464: `done` comment `posted`, issue CLOSED (verified), board `done` → `already`. Document link: no feature-branch link found (already durable).
- Task completed.

## Issues Log

- **Step 3 — a success criterion the plan could not meet.** `"$GH" api` is an uppercase variable; the planned `GH_COMMAND_WORD` matches lowercase `gh` only, so the §9 criterion was unreachable by the plan. Added `GH_VARIABLE`. The Step 2 review's check 10 (outcome reachability) should have walked that input through the regex and did not.
- **Step 5 cycle 3 — the convergence check escalated on a first-time HIGH.** Sequence `0, 0, 1` satisfies the formula literally. Not overridden (develop-next: hard HALTs stop the run). Observation logged.
- **Step 5a cycle 1 — transient `.git/index.lock`.** `qa-read-back.js` failed to stage two files on its first run (lock held by another process; the script stages with sequential `spawnSync`); clean on an immediate retry. Not a defect in the script.
- **Step 3 — the plan's red-lane proof used an info-tier finding.** SC2086 is `info`; both lanes gate at `--severity=warning`. Used SC2034. Also the plan's relative-source path was one directory short for a lib in a `mkdtemp` dir.

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-09-30
**Gate Result**: CONCERNS
**Issues Found**: 3 — CR-1 (medium; own EXIT trap + errexit scored, a 97 → 1 regression on bash 5 / zsh; TASK-140-BUG-1), CR-2 (medium; `--fake-gh` containment still lexical; TASK-140-BUG-2), CR-3 (low; quoted/backslashed gh, non-line-initial source)
**HIGH findings**: 0
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)

### QA Cycle 2 — 2026-09-30
**Gate Result**: CONCERNS
**Issues Found**: 3 — CR-1 (medium; trap shadow bypassed by lowercase `exit`, `builtin trap`, `command trap`, zsh `TRAPEXIT`; TASK-140-BUG-3), CR-2 (medium; gh spellings the static detector misses; TASK-140-BUG-4), CR-3 (medium; `source` not followed after reserved words/grouping; BUG-4). Cycle 1 findings all fixed; BUG-1, BUG-2 closed.
**HIGH findings**: 0
**MEDIUM findings**: 3
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)

### QA Cycle 3 — 2026-09-30
**Gate Result**: FAIL
**Issues Found**: 2 — CR-1 (**high**; the trip-wire's needs-fake-gh decline discards escapes/shells/cases — reproduced 0 vs 20 escapes; TASK-140-BUG-5), CR-2 (medium; trip-wire marker path lost under `env -i`; TASK-140-BUG-6). Cycle 2 findings fixed; BUG-3, BUG-4 closed. 3 advisory → future.
**HIGH findings**: 1
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 3 of 5)
**Fixes Applied**: BUG-5 — the trip-wire decline carries escapes/cases/shells/fakeGh/args; BUG-6 — marker path baked into the stub, `PROBE_GH_TRIPPED` removed. 2 rows, each red on the cycle-2 engine; rule §5 updated.
**Commit**: `ab079810`

### QA Cycle 4 — 2026-09-30
**Gate Result**: CONCERNS
**Issues Found**: 1 — CR-1 (medium; rule §5 names one trip-wire limit, three more executed; TASK-140-BUG-7). BUG-5, BUG-6 closed (each mutation-proven). Reviewer's 3 containment bypasses identical at `origin/develop` → pre-existing, `future`; 1 advisory (noexec TMPDIR).
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 4 of 5)
**Fixes Applied**: BUG-7 — rule §5 states the PATH-prepend (± `--fake-gh`) and backgrounded-call limits beside the absolute path; a pinning row; CHANGELOG + engine comments corrected.
**Commit**: `3233686e`

### QA Cycle 5 — 2026-09-30
**Gate Result**: PASS
**Issues Found**: 2 LOW — CR-1 (§5 "never runs" wording beside the new limits), CR-2 (limits apply only to spellings the text check misses); 1 cleanup (pin row). BUG-7 closed.
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: CONCERNS
**Loop exit**: Cosmetic-residue exit taken — PASS gate at cycle 5 with HIGH 0 for cycles 4 and 5; all 2 open findings are LOW and are carried to the gate's recommendations.future by id (CR-1, CR-2). This is a CLEAN exit, not a stall: nothing is blocked and nothing is being accepted over; a full qa-fix cycle for cosmetic findings is what this route exists to avoid.
**Action**: Proceeding to 5c (PR conformance review)

### QA Loop Not Converging — 2026-09-30

> **Superseded 2026-09-30 by an operator grant** of 2 cycles (`qa_max_cycles` 5). The run re-entered to run cycle 3's 5b on gate 3, then cycles 4–5. Cycle 3's `**Action**` row was rewritten from `Escalating — loop not converging` to the route it now takes. The entry below is kept as the record of the halt.

Convergence stall: The pipeline stopped after 3 qa-task/qa-fix cycles: the HIGH finding
count failed to strictly decrease across two consecutive cycles, so the
loop was no longer converging. The remaining findings are NOT accepted —
they are handed over below.

**Final gate status**: FAIL
**HIGH findings per cycle**: 0, 0, 1 — still rising
**Remaining issues** (from final gate file):
- CR-1 — high — `shared/resources/security-probe.mjs` — the run-time `needs-fake-gh` decline spreads `base`, discarding the run's escapes, shells and cases (TASK-140-BUG-5)
- CR-2 — medium — `shared/resources/security-probe.mjs` — the trip-wire stub reads its marker path from the environment, so `env -i PATH="$PATH" gh` is not recorded and the run is scored (TASK-140-BUG-6)

**What was attempted per cycle**:
- Cycle 1: shadowed `trap` during the source; real-path `--fake-gh` containment; widened the gh detector (quotes, backslash, source after separators)
- Cycle 2: replaced both mechanisms — positive source-completed marker (trap shadow removed); run-time trip-wire `gh` on PATH; ancestor realpath
- Cycle 3: review only (convergence check tripped before 5b)

**Likely root cause**: not a stall in the usual sense. Every file the fixes touched is `security-probe.mjs`, but the cycle-3 HIGH is a first-time defect in cycle 2's *new* code (the trip-wire's decline path reuses `decline()`, which carries no run evidence), not a finding the loop failed to reduce. HIGH was 0 on gates 1 and 2. The formula `HIGH_N > 0 AND HIGH_N >= HIGH_{N-1} AND HIGH_{N-1} >= HIGH_{N-2}` reads `0, 0, 1` as a stall; its worked examples do not cover that sequence. Logged as an observation against the develop-task step-5-6 rule.

**Recommended next steps**:
1. Grant 1–2 more cycles (Phase 0b "Resume at 5a with {k} more cycles"): both fixes are small — return `escapes`/`shells`/`cases`/`fakeGh` in the run-time decline with a non-vacuous row, and bake the marker path into the stub text with an `env -i` row.
2. Decide the advisory CR-4 (PATH prepend reaches a real gh past the trip-wire): state it in rule §5 as a second limit with a pinning row, or strip gh-holding directories from the child PATH.
3. Decide whether the convergence check should require `HIGH_{N-1} > 0` (a HIGH first raised this cycle has had no chance to be reduced).

---

## Completion

**Finished**: 2026-09-30 09:59
**Final Status**: Completed
**Branch**: feature/task.140.shell-fn-sentinel-hardening
**PR**: https://github.com/Gamaroff/agent-skills/pull/527
**QA Iterations**: 5 (4 fix cycles; escalated at cycle 3 as not converging, then 2 cycles granted by the operator)
**DoD Summary**: `task.140.dod.1.shell-fn-sentinel-hardening.md` — ACCEPTED
**Tracker debt**: none

### Completion Summary

Implemented the seven task.136 limits in `security-probe.mjs`, its tests, both ShellCheck lanes and rule §5. QA replaced two mechanisms instead of patching them a third time: the trap shadow became a positive source-completed marker, and the static `gh` detector became the fast path in front of a run-time trip-wire `gh`. The loop escalated at cycle 3 on a first-time HIGH (HIGH `0, 0, 1`); the convergence rule's gap is logged as obs #228. The operator granted 2 cycles. Cycle 3's fix step ran on re-entry (a recorded deviation from the resume contract), cycle 4 fixed a rule overclaim found by a provenance-checked safety re-probe, and cycle 5 exited PASS 100 by the cosmetic-residue route. The 5c PR review returned CONCERNS, and its document findings were fixed before finalise. At finalise, SC5 was re-measured rather than inherited: the engine is within noise, and the whole file's +13 s is the 15 added rows. Accepted at `3c8f9b54`, with CI green on both readings. Follow-up: close the pre-existing `gh` containment bypasses now stated in rule §5.

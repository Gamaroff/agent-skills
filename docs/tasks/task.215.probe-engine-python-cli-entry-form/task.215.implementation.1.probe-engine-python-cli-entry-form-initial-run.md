# Implementation Report: [Task 215] security-probe: run a Python CLI under the cli: entry form

**Task**: `task.215.probe-engine-python-cli-entry-form.md`
**Run Number**: 1
**Started**: 2026-10-19 12:23
**Status**: Escalated

---

## Summary

Extend the probe engine's `cli:` entry form to run a `.py` entry under `python3`, so a Python boundary reaches the DoD probe instead of failing the zero-candidates guard.

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
| Board status        | In Progress ✅ (gh-stage: Todo → In Progress, verified); Priority already P2 Medium |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.{id}.*` exists in git                             | `feature/task.215.probe-engine-python-cli-entry-form` created at `4f0e010f` from develop; pushed | —                    | 2026-10-19T10:23Z |
| 2. review-task             | ✅ Done    | `task.{id}.review.{N}.{name}.md` exists (or skip logged)               | `task.215.review.1.probe-engine-python-cli-entry-form.md` — READY TO IMPLEMENT 9/10; 0 critical, 5 important (all applied); Planned → Ready for Development | —                    | 2026-10-19T10:28Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 1 iteration; 11 tests + 9 fixtures; ci:fast green (5917 / 0 fail); 9 mutations red | `.summaries/step-3-iteration-audit.json` | 2026-10-19T10:39Z |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #692: https://github.com/Gamaroff/agent-skills/pull/692 | —                    | 2026-10-19T10:41Z |
| 5–6. qa-task / qa-fix loop | 🛑 Escalated | `task.{id}.qa.{N}.*.md`; `task.{id}.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.{id}.dod.{N}.*.md`; task `status: accepted`                      |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-10-19

- Feature branch base: develop — source: asked (Recommended; on `develop`)
- PR target branch: develop — source: asked (Recommended)
- qa-planning gate: skipped (auto — no prompt)
- Questions asked in the AskUserQuestion call: Q1 (branch base) → develop, Q2 (PR target) → develop. Count 2 matches `questions[]`.
- Phase 0 run inline (no 0a-parallel agents dispatched): the task path was known, no prior run exists (no branch, lock, snapshot or report; PR #690 is the merged task-authoring PR), tracker issue #689 read directly (open, board Todo).
- Pipeline mode: standard — source: detector (derived inline: risk_level absent → risk_ok true; phase_count 6 implementation steps → not < 3; single_module false — engine plus four bundled copies and docs). Lite requires all three.
- Always-load files resolved: 3 files — from `skills-config.yaml` `devLoadAlwaysFiles`.
- Status at start: `planned` — Step 2 (`/review-task`) validates and promotes it.
- Branch: `feature/task.215.probe-engine-python-cli-entry-form` from `develop` @ `4f0e010f`. Implementation report stashed before branch creation, restored after (clean pop).
- Tracker #689: work-started comment `posted`; GitHub board: work-started → transitioned (Todo → In Progress). Priority already set (P2 Medium) — left unchanged.

### Step 2 — review-task

- review-task invoked (status `Planned`, no review report → run). Output: Comprehensive report — required for pipeline audit trail.
- Review report: `docs/tasks/task.215.probe-engine-python-cli-entry-form/task.215.review.1.probe-engine-python-cli-entry-form.md` (`reviewed_blob` stamped).
- Pre-pass agents B and C dispatched 10:24Z, both returned in under 20 s; B `drift` (2 low), C `not-implemented`.
- No interactive question points asked (pipeline run): three open points decided on evidence and recorded in the report as D1–D3 — extend `cli:` by extension; `python3 -E -s -B` (sibling-import and `__pycache__` behaviour measured); release + consumer proof moved to Deferred Work.
- review-task Step 8.5 auto-answered: Yes, apply all critical + important fixes. Step 9 auto-answered: Yes, fixes complete → Planned promoted to Ready for Development.
- Key finding carried into Step 3: a Python crash exits 1 like a refusal; the plan now specifies a crash branch (traceback / `File "…", line N` frame → `errored`) with a plain-refusal control case.
- Tracker key re-read: unchanged (#689). Review outcome comment skipped — review-task reported `posted` (stage `review-task`).

### Step 3 — develop

- Fast gate: `develop.fastGateCommand` unset → suggested `npm run ci:fast`; precondition passed (script `ci:fast` defined).
- Pre-develop surface map: 12 files identified in shared/resources (security-probe.mjs, its tests and fixtures, three probe docs, CHANGELOG) plus qa-evidence-integrity and review-security tests. Explore dispatched 10:28Z, returned in 73 s (`duration_ms` 73171). Key facts: `toRecordEntry` (L3296) copies fields explicitly; test L2761 pins the result key set across forms; test L2483 asserts the old decline text; no existing test runs the engine as a child with a custom env.
- Plan file: none (`task.215.plan.*.md` absent) → `/develop` invoked (inline path not eligible).
- Planned/Draft gate: not reached (status Ready for Development). Alignment: greenfield — `.py` was declined before; nothing to align.
- Implemented test-first: 11 `cli entry (python)` tests went red (missing `isPythonCrash` export) before the engine change, green after.
- Decision (recorded in the task's Implementation Summary as a deviation): `isPythonCrash` accepts any (dotted) class name as the last line, not only `…Error|Exception|Interrupt|Exit`, so a custom uncaught exception is not scored as a refusal; it requires a frame plus a Traceback header or SyntaxError-family class, so refusals stay refusals.
- Mutation proof: 9 mutations, each red on its own test. One run left a `__pycache__/` beside the fixtures (the drop-`-B` mutant) that polluted later mutants; the sibling test now clears a stale one first, and the affected mutants were re-run clean.
- Fast gate: `npm run ci:fast` → TEST_EXIT=0, 5917 tests, 0 failures. Log deleted.
- Loop audit (iter 1): status `ready-for-review`, 0/0 Implementation Plan checkboxes (the plan is a numbered list; Progress Tracking 2/2) → exit loop. Dispatched 10:38Z, `duration_ms` 10174.
- Development completion comment posted to github issue 689 (`posted`).

### Step 4 — create-pr

- SCOPE_PATHS (11): the work-item dir, `CHANGELOG.md`, `shared/resources`, `shared/resources/tests`, `skills/finalise/references`, `skills/{qa-story,qa-task,review-security}` and their `references`. Pre-flight guard: every untracked path in scope, nothing held.
- Report link check: `doc-links.js`, 0 relative links, rc 0 (implementation and review reports).
- Commits: `e6135e11` feat(task.215) — engine, tests, fixtures, docs, bundled copies, CHANGELOG (28 files); `03fb5f06` docs(task.215) — task doc, review report, this report. Leak check OK on both.
- PR body written directly rather than by the diff-summariser Explore subagent: the orchestrator already held the full change, so a subagent would have re-derived it from the diff.
- PR created: https://github.com/Gamaroff/agent-skills/pull/692 (base develop, Closes #689). Issue #689 in-review comment `posted`.
- Post-PR state check (inline `gh pr view`): PR #692 state = OPEN, MERGEABLE. errors = 0.
- GitHub board: in-review → stage-disabled (no `pipeline.in-review` target on this board; correct outcome, left as is).
- Lock `pr_url` set.

### Steps 5–6 — QA loop

- QA start: GitHub board re-assert in-review → stage-disabled. The traceability mapper was skipped: Success Criteria are a numbered list, not a table (`HAS_SUCCESS_CRITERIA_TABLE=false`).
- Cycle 1: `/qa-task` with `code_review_blocking=true`. Reviewer dispatched 10:41:50Z, `duration_ms` 104250. Gate FAIL 70/100. Convergence check and route classifier not applicable at cycle 1 → 5b.
- QA Cycle 1 — changes-requested: stage-disabled (no board target; left as is).
- QA Cycle 1 — `/qa-fix` (fix_cycle: not supplied — derived from the gate). Findings ingested inline from the gate, QA report and bug report already in context (Step 1a ingester not dispatched; the orchestrator had just written all three). PR review report: none. Pre-fix Explore mapping skipped: one function and its test file, both already read this session.
- Fix plan: TASK-215-QA1-1 (patch — distinct defect, first cycle, no third strike or narrowing offer), CR-2. No ambiguity: the gate's suggested action names one approach.
- Step 3.5 adversarial pass found two further shapes and resolved both in-cycle: an "Exception ignored" traceback beside a non-1 exit (fixed — the crash branch now runs only on exit 1; new fixture and test) and `sys.tracebacklimit = 0` (undetectable from stderr — documented as a limit, not patched). An uncaught `KeyboardInterrupt` dies by SIGINT and is already `errored` via `neverRan`.
- Probe: `git grep -l -F -i '<phrase>'` over the executed-document population, phrases `final exception line`, `last non-empty line`, `exception line`, `Traceback` → `shared/resources/probe-boundary-rule.md` updated; plus `CHANGELOG.md` updated, task doc Implementation Summary marked superseded. Population 1 (plus 2 out-of-command sites): no consolidation move needed.
- Mutations: 9, each red. Fast gate: `npm run ci:fast` TEST_EXIT=0, 5918 tests, 0 failures; log deleted.
- Cycle 1 commit `e6894a47` fix(task.215) — code fix plus cycle-1 gate, QA report, bug report and security record; implementation report excluded. One push. PR comment and issue #689 `qa-fix-1` comment `posted`.
- Cycle 2: `/qa-task` with `code_review_blocking=true`; refute pass, `SAFETY_REPROBE=true` (clauses 2 and 3; clause 1 false). Reviewer dispatched 11:01:31Z, `duration_ms` 337634; mutation proofs run in a scratch worktree meanwhile. Gate FAIL 60/100: cycle-1 findings verified fixed (bug 1 closed); new HIGH TASK-215-QA2-1 (a crash outside the default excepthook) and MEDIUM TASK-215-QA2-2 (limit note). Probe: 17 executed, all as required.
- Cycle 2 route: Convergence check not applicable (cycle < 3); route classifier `continue` (not-a-pass-gate; route 2 below-cycle-floor) → 5b.
- QA Cycle 2 — changes-requested: stage-disabled. `/qa-fix` cycle 2 (fix_cycle: not supplied — derived from the gate); the skill's instructions were already loaded this session, so it was followed without a second load. Findings taken from gate 2, QA report 2 and bugs 2–3 written minutes earlier (no ingester dispatched). PR review report: none.
- Fix plan: TASK-215-QA2-1 by a change of shape (Step 2.6 trigger b, repeat subject: cycle 1 patched the same mechanism). Move: consolidate — a `runpy` bootstrap reports the exception on fd 3, and the stderr reader stays only as a second, safe-direction signal. TASK-215-QA2-2 closes with it. CR-3 left advisory.
- Step 3.5: argv mutation first survived (runpy sets `sys.argv[0]` itself) — fixture tightened to check `argv[1:3]`, then red. fd 3 made non-inheritable so a grandchild cannot hold the pipe. Probe: phrases `-E -s -B`, `isPythonCrash`, `tracebacklimit`, `excepthook`, `traceback` → `probe-boundary-rule.md` updated; `finalise-dod-security-prompt.md`, `security-review-prompt.md` unaffected (still accurate: `-E -s -B`, crash errored); `CHANGELOG.md` updated. Population 3.
- Mutations: 7, each red. Fast gate `npm run ci:fast` TEST_EXIT=0, 5920 tests, 0 failures; log deleted.
- Cycle 2 commit `39921d48` fix(task.215) — code fix plus gate 2, QA report 2, bugs 1–3 and the cycle-2 security record. One push. PR comment and issue #689 `qa-fix-2` comment `posted`.
- Cycle 3: `/qa-task` with `code_review_blocking=true`; `SAFETY_REPROBE=true` (clause 2), unscoped, re-probe directive only (not a refute cycle). Reviewer dispatched 11:20:29Z, `duration_ms` 300937; mutation proofs and the corpus run through the cli arm made meanwhile (scratch worktree for mutations). Gate FAIL 50/100: cycle-2 findings verified fixed (bugs 2–3 closed); new HIGH TASK-215-QA3-1, MEDIUM QA3-2 and QA3-3, LOW QA3-4. QA reproduced QA3-1, QA3-2 and QA3-3 in `.claude/state/qa3/` (gitignored). PR comment and issue `qa-gate-3` comment `posted`.
- Cycle 3 Convergence check: HIGH sequence 1, 1, 1 — HIGH present at all three readings and not strictly falling → **tripped**. Not running 5b; escalating (*QA Loop Not Converging*). The third-strike rule would also have applied (HIGH on `shared/resources/security-probe.mjs` in gates 1–3).

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- Implementation Plan step 6 and Success Criterion 4 (release a tag, re-vendor into omarchy-leak-radar, consumer proof) are outward-facing and outside this repository. Flagged for Step 2 review; not to be performed autonomously.

### QA Loop Not Converging — 2026-10-19

The pipeline stopped after 3 qa-task/qa-fix cycles: the HIGH finding count failed to strictly decrease across two consecutive cycles, so the loop was no longer converging. The remaining findings are NOT accepted — they are handed over below.

**Final gate status**: FAIL (50/100) — `task.215.gate.3.probe-engine-python-cli-entry-form.yml`
**HIGH findings per cycle**: 1, 1, 1 — flat from cycle 1 onward
**Remaining issues** (from final gate file):
- TASK-215-QA3-1 (high, `shared/resources/security-probe.mjs`): `PYTHON_BOOTSTRAP` formats `str(e)` before writing the marker; a raising `__str__` (or `KeyError(10**5000)`) loses it, and behind a replaced excepthook the crash is scored `rejected`.
- TASK-215-QA3-2 (medium, `shared/resources/security-probe.mjs`): fd 3 survives `fork`; a forked child that raises writes the marker and overrides the parent's answer.
- TASK-215-QA3-3 (medium, `shared/resources/security-probe.mjs`): a forked daemon holds fd 3, so every case waits for the full timeout; the bootstrap comment's "cannot hold the pipe" is false.
- TASK-215-QA3-4 (low, `shared/resources/security-probe.mjs`): `runpy.run_path` restores `__main__` after the body returns.

**What was attempted per cycle**:
- Cycle 1: `isPythonCrash` stopped reading the last stderr line (a multi-line message, an ExceptionGroup and an atexit line were refusals); exit-1 gate added; CR-2 non-vacuity floor.
- Cycle 2: change of shape — a `runpy` bootstrap catches the exception before any excepthook and names it on fd 3 (a replaced excepthook, stderr redirected or `None`, `tracebacklimit = 0` were refusals); stderr reader kept as a second signal.
- Cycle 3: QA only — the escalation fired before 5b.

**Likely root cause**: the HIGH count is flat, but it is not the same defect three times. Each cycle closed the class it was given and the next cycle found a narrower one in the new mechanism: last-line parsing → stderr as a channel → the bootstrap's own error path. All three HIGHs sit in `shared/resources/security-probe.mjs`, in Python crash detection, and SC4's "never `rejected`" is an absolute over code the script under test controls. The open HIGH is a small, well-understood fix (write the class name first, the message best-effort); QA3-2 and QA3-3 share one fix (`os.register_at_fork(after_in_child=…)` closing fd 3, or a pid check).

**Recommended next steps**:
1. Resume at 5a with 2 more cycles: fix QA3-1 (guarded formatting, marker first), QA3-2 and QA3-3 together (close fd 3 in forked children), and add fixtures for an unprintable exception and a forking script.
2. Or scope SC4: keep the bootstrap and record the residual shapes (fork, unprintable exception) as a stated limit, with `/review-pr` then `/finalise` — only if the maintainer accepts a "never" that holds for the common shapes rather than all of them.
3. Take QA3-4 (`__main__` restore) and CR-5 (stdlib shadowing) as follow-ups if not fixed in step 1.

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-10-19
**Gate Result**: FAIL (70/100)
**Issues Found**: 2. TASK-215-QA1-1 (HIGH): `isPythonCrash` reads a multi-line message, an ExceptionGroup and output after the traceback as refusals, so SC4 is unmet (measured: engine probe, 12 executed). TASK-215-CR-2 (LOW): the flags test has no non-vacuity floor.
**HIGH findings**: 1
**MEDIUM findings**: 0
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)

### QA Cycle 2 — 2026-10-19
**Gate Result**: FAIL (60/100)
**Issues Found**: 3. Cycle 1's two findings verified fixed. TASK-215-QA2-1 (HIGH): a Python crash reported outside the default excepthook (replaced `sys.excepthook`; stderr redirected or `None`) exits 1 and is scored `rejected`. TASK-215-QA2-2 (MEDIUM): the limitation note understates the class. CR-3 (LOW, advisory): `probePython` runs with the engine's env.
**HIGH findings**: 1
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)

### QA Cycle 3 — 2026-10-19
**Gate Result**: FAIL (50/100)
**Issues Found**: 5. Cycle 2's two findings verified fixed. TASK-215-QA3-1 (HIGH): an exception whose `str()` raises escapes the bootstrap before the marker is written, so behind a replaced excepthook the crash is scored `rejected` (verdict `engages`). TASK-215-QA3-2 (MEDIUM): a forked child writes the marker. TASK-215-QA3-3 (MEDIUM): a forked daemon holds fd 3 until the timeout. TASK-215-QA3-4 (LOW): `__main__` restored after the body. CR-5 (LOW, advisory): stdlib shadowing from the cwd.
**HIGH findings**: 1
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Escalating — loop not converging

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: feature/task.215.probe-engine-python-cli-entry-form
**PR**: https://github.com/Gamaroff/agent-skills/pull/692
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}

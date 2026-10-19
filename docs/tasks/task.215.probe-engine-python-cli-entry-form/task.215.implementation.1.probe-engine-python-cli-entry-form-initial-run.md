# Implementation Report: [Task 215] security-probe: run a Python CLI under the cli: entry form

**Task**: `task.215.probe-engine-python-cli-entry-form.md`
**Run Number**: 1
**Started**: 2026-10-19 12:23
**Status**: Completed

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
| 5–6. qa-task / qa-fix loop | ✅ Done | `task.{id}.qa.{N}.*.md`; `task.{id}.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | Gate 7 PASS 95 (route 2b); 5c `/review-pr` APPROVE, PC-1/PC-2 fixed | —                    | 2026-10-19T14:18Z |
| 7. finalise                | ✅ Done    | `task.{id}.dod.{N}.*.md`; task `status: accepted`                      | `task.215.dod.1.probe-engine-python-cli-entry-form.md` — ACCEPTED; acceptance commit `0455955a`; issue #689 closed | —                    | 2026-10-19T14:36Z |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | Implementation report only (acceptance artefacts committed by `/finalise` 6a) | —                    | 2026-10-19T14:36Z |

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

### Re-entry — QA loop, 2026-10-19

- QA loop re-entry: 2 extra cycles granted (user chose "Resume at 5a with 2 more cycles" in the invocation); 0 cycle(s) run outside the loop back-filled from disk (gates 1–3, 3 report entries). `grant-qa-cycles.sh`: lock restored from the halt snapshot; QA_CYCLE=3, qa_max_cycles=5, reenter_at=5b (a not-converging halt fired before 5b, so cycle 3's fix runs first).
- Phase 0a detector not dispatched: the halt snapshot, gates and report were read directly and agree (current_step 5, qa_phase 5a at halt, gates 1–3, no PR merge).
- QA Cycle 3 — changes-requested: stage-disabled.
- Third strike: `shared/resources/security-probe.mjs` (HIGH in gates 1, 2, 3). Struck mechanism passed to `/qa-fix`: Python crash detection that depends on rendering the exception as text. Narrowing offer: not signalled (high-findings-remain).
- `/qa-fix` cycle 3 (fix_cycle: not supplied — derived from the gate). Findings taken from gate 3 and bugs 4–6 read directly (ingester not dispatched; 4 findings, all in context). Pre-fix Explore mapping skipped: one function, its test file and fixtures, read directly.
- Move: **replace** — the bootstrap writes a constant token on fd 3 before touching the exception; the `Class: message` line is detail only. This differs from the escalation's recommended step 1 (a guarded-formatting patch), which the third strike forbids.
- QA3-2/QA3-3 fixed with a pid check plus `os.register_at_fork` closing fd 3 in children; QA3-4 by exec in a fresh `__main__` (also closes advisory CR-5).
- Step 3.5: the pid check alone is unobservable once fd 3 is closed in the child, so the fork fixture's child opens a file (gets fd 3) and the parent exits 7 if the marker was written into it — then the pid-check mutation went red. A script that closes fd 3 itself loses the marker and falls back to the stderr reader: documented in `probe-boundary-rule.md`, not patched. Probe: phrases `runpy`, `fd 3`, `PYTHON_BOOTSTRAP`, `excepthook`, `cannot hold the pipe`, `__main__` → `probe-boundary-rule.md` updated; `CHANGELOG.md` and the task doc updated. Population 1.
- Mutations: 6, each red. Fast gate attempt 1 red (`prettier --check` on `security-probe.mjs` only; log retained); formatted, attempt 2 `npm run ci:fast` TEST_EXIT=0, 5924 tests, 0 failures; log deleted.
- Cycle 3 commit `e94dd355` fix(task.215) — code fix, fixtures, tests, docs, bugs 4–6; gate 3, QA report 3 and bugs were already committed by the escalation commit. One push. PR comment and issue #689 `qa-fix-3` comment `posted`.
- Post-fix PR state check (inline `gh pr view`): OPEN, MERGEABLE, head `e94dd355`.
- Cycle 4: `/qa-task` with `code_review_blocking=true`; `SAFETY_REPROBE=true` (clauses 2 and 3; clause 1 false), unscoped, re-probe directive (not a refute cycle). Reviewer dispatched 12:02:02Z, `duration_ms` 323955; mutation spot checks (4, all covered) ran in a scratch worktree meanwhile. Probe: a crash-matrix CLI (QA scratch, `.claude/state/qa4/`), crash shapes placed on legitimate cases so a misread shows as overblocked — 19 cases, 8 executed, 11 crash shapes errored, 1 overblocked (closed fd 3). Gate FAIL 50/100: cycle-3 findings verified fixed (bugs 4–6 closed); new HIGH TASK-215-QA4-1 (a closed or reopened fd 3 hides the crash — reproduced by the probe and by reviewer CR-1) and MEDIUM QA4-2 (interpreter probe environment — reviewer CR-2, the cycle-2 advisory CR-3 reproduced). CR-1's anchor read `text-mismatch` (one backslash of escaping in its quoted line; line 807 is the token write) — recorded with the ⚠️ mark, not repaired. PR comment and issue `qa-gate-4` comment `posted`.
- Severity of QA4-1 kept at the reviewer's HIGH: no measured plausibility check was made to lower it, and SC4 is an absolute ("never `rejected`"). This orchestrator also wrote cycle 3's fix, so a self-assessed downgrade that would have avoided the convergence trip was not made.
- Cycle 4 Convergence check: HIGH sequence (cycles 2–4) 1, 1, 1 → **tripped**. Not running 5b; escalating (*QA Loop Not Converging*). Third strike would also apply again (HIGH on `security-probe.mjs` in gates 2–4).

### Re-entry — QA loop (second grant), 2026-10-19

- QA loop re-entry: 2 extra cycles granted (user chose "Grant 2, positive channel" at the Phase 0b prompt); 0 cycle(s) run outside the loop back-filled from disk (gates 1–4, 4 report entries). `grant-qa-cycles.sh`: lock restored from the halt snapshot; QA_CYCLE=4, qa_max_cycles=6, reenter_at=5b.
- Direction (user decision): escalation step 2 — make the crash channel positive. The bootstrap writes a token on every exit it controls, an answer included, and a missing token reads as `errored`, so every lost write fails safe. Covers QA4-1, QA4-2 and CR-3.
- PR #692 state at resume: OPEN, MERGEABLE, head `9007be07` = local HEAD. Phase 0a detector not dispatched: snapshot, gates and report read directly and agree.
- QA Cycle 4 — changes-requested: stage-disabled.
- Third strike: `shared/resources/security-probe.mjs` (HIGH in gates 2, 3, 4). Struck mechanism passed to `/qa-fix`: crash detection through a negative signal (token only on a crash; absence read as an answer). Narrowing offer: not signalled (high-findings-remain).
- `/qa-fix` cycle 4 (fix_cycle: not supplied — derived from the gate). Findings read from gate 4 and bugs 7–8 directly (2 findings + CR-3, all in context; ingester not dispatched). Pre-fix Explore mapping skipped: one function family, its test file and fixtures, read directly.
- Move: **replace** — exit record on every bootstrap-controlled exit (`answer <nonce>` / `crash <nonce>`), written only while `fstat(3)` matches the boot identity; no record → `errored`. QA4-2 covered by the same channel (a child that never starts writes nothing); `probePython` unchanged, comment states why. CR-3: record read once.
- Step 3.5: the pid check alone is no longer observable (identity check + at-fork close already stop a forked child); kept for a fork that bypasses the at-fork hooks. New stated limit, fail-safe: `os._exit` / `exec` leave no record → declined. The nonce is readable by a script that inspects `sys.orig_argv`; only a script forging its own record deliberately could use it — out of scope (the script under test is the consumer's control). Probe: phrases `marker on fd 3`, `loses the marker`, `Anything on fd 3`, `PYTHON_BOOTSTRAP`, `probePython` → `probe-boundary-rule.md` updated; `CHANGELOG.md` and the task doc updated. Population 1.
- Tests: 2 fixtures, 2 new tests (20 python tests), both red on the cycle-3 engine. Mutations: 8, each red.
- Fast gate `npm run ci:fast` attempt 1 GATE_EXIT=0, 5926 tests, 0 failures; log deleted.
- Cycle 4 commit `0aff23d7` fix(task.215) — engine, rule doc, fixtures, tests, CHANGELOG, task doc, bugs 7–8, bundled copies; gate 4 and QA report 4 already committed by the escalation commit. One push. PR comment and issue #689 `qa-fix-4` comment `posted`.
- Post-fix PR state check (inline `gh pr view`): OPEN, MERGEABLE, head `0aff23d7`.
- Cycle 5: `/qa-task` with `code_review_blocking=true`; `SAFETY_REPROBE=true` (clauses 2 and 3), unscoped, re-probe directive (not a refute cycle). Reviewer dispatched 13:17:16Z, `duration_ms` 352113; probe and mutation spot checks (4: 2 covered, 2 no-red-untested) ran meanwhile, mutations in a scratch worktree. Probe: crash-matrix CLI (`.claude/state/qa5/`), 26 cases, 7 executed and passed, 19 errored as required; no crash shape scored `rejected`. Gate CONCERNS 90/100: cycle-4 findings verified fixed (bugs 7–8 closed); new MEDIUM TASK-215-QA5-1 (reviewer CR-1, anchor `ok`) — kept at the reviewer's severity (no measured basis to lower it); bug 9 filed. PR comment and issue `qa-gate-5` comment `posted`.
- Cycle 5 route: Convergence check not tripped (HIGH_N 0; sequence 1, 1, 1, 1, 0); route classifier `continue` (not-a-pass-gate; route 2 declined: high-findings-remain) → 5b.

### Step 7 — finalise

- Task completed. DoD `task.215.dod.1.probe-engine-python-cli-entry-form.md`: ACCEPTED. AC 4/4 PASS (note: SC1's `--sink path` example has no `.py` test, but the setup is shared with the tested Node arm); Docs PASS; Security PASS; Compliance NOT_APPLICABLE. Four Explore agents ran in parallel.
- Security agent returned `boundary: true` and a 12-control plan; `/finalise` ran it (Step 3b.1): 71 executed, 0 reproduced, 0 escapes, 0 refusals. Six refusal controls and `isPythonCrash` read `engages`; the five crash controls read `unverifiable` by design (hostile cases `errored`). Record `task.215.dod.1.security.run.json`.
- CI reading 1: SUCCESS @ 918e077c9f4e; CI reading 2: SUCCESS (tree-equivalent to 918e077c9f4e) @ 0455955ac3bb (5 checks, 30s; the acceptance commit is docs-only).
- Acceptance commit `0455955a` (6a): task document, DoD, sprint review, registry tick, 5c review report and PC-2 fix (carried), probe record and cases files. Pushed; 6b assertions passed; 6d CHANGELOG cites task 215.
- Canonical PR comment: https://github.com/Gamaroff/agent-skills/pull/692#issuecomment-6269756632. DoD body posted to PR — comment URL: https://github.com/Gamaroff/agent-skills/pull/692#issuecomment-6269775955.
- GitHub Issue #689 — Document link already on `develop`; `done` comment `posted` (orchestrator re-post: `already`); close: CLOSED ✅ (verified with `gh issue view`, inline rather than the poller subagent). Board: done → already.
- Earlier, 5c: `ready-for-merge` stage → `stage-disabled`.

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

### QA Loop Not Converging — 2026-10-19 (after the 2-cycle grant)

The pipeline stopped after 4 qa-task/qa-fix cycles: the HIGH finding count failed to strictly decrease across two consecutive cycles, so the loop was no longer converging. The remaining findings are NOT accepted — they are handed over below.

**Final gate status**: FAIL (50/100) — `task.215.gate.4.probe-engine-python-cli-entry-form.yml`
**HIGH findings per cycle**: 1, 1, 1, 1 — flat from cycle 1 onward
**Remaining issues** (from final gate file):
- TASK-215-QA4-1 (high, `shared/resources/security-probe.mjs`): the crash token is written to whatever fd 3 is at crash time and only its presence is read; a script that closes fd 3 (`os.closerange`) loses it, or has it written into a file it then opened, and behind a quiet excepthook the crash scores `rejected`.
- TASK-215-QA4-2 (medium, `shared/resources/security-probe.mjs`): `probePython` checks `python3` under the engine's environment, cases run under `caseEnv`; an interpreter that needs the real `HOME` scores every case `rejected`.

**What was attempted per cycle**:
- Cycle 1: `isPythonCrash` stopped reading the last stderr line; exit-1 gate added.
- Cycle 2: change of shape — a `runpy` bootstrap names the exception on fd 3 before any excepthook.
- Cycle 3 (after the grant; third strike → replace): a constant token written before the exception is touched; pid check and `register_at_fork` for forked children; body exec'd in a fresh `__main__`.
- Cycle 4: QA only — the escalation fired before 5b.

**Likely root cause**: four cycles, four different defects, all in one place: how a Python crash is told apart from a refusal when both exit 1. Each mechanism closed the shapes it was given and the next safety re-probe found a narrower way around it: last-line parsing → stderr as a channel → formatting in the bootstrap → the fd itself. The channel is *negative* — a missing signal reads as "answered" — so every way to lose the signal is a false pass. SC4 is an absolute over code the script under test controls, including its own file descriptors.

**Recommended next steps**:
1. Scope SC4 (maintainer decision): keep the bootstrap and state the residual — a script that closes inherited descriptors in its main process, or an interpreter that cannot start under the case environment — as a documented limit. Then `/review-pr` and `/finalise`.
2. Or make the channel positive (one more change of shape, not a patch): the bootstrap writes a token on every exit it controls, an answer included, after checking fd 3 is still the engine's pipe; a missing token reads as `errored`, so every lost write fails safe. That also covers QA4-2 (a child that never started writes nothing). Run it as a fresh grant (`Resume at 5a with 2 more cycles` → re-enters at 5b) or by hand followed by `/qa-task`.
3. Take CR-3 (marker computed twice) with whichever of the above runs.

### QA Loop Limit Reached — 2026-10-19

The pipeline completed 6 qa-task/qa-fix cycles without a clean PASS.

**Final gate status**: CONCERNS (85/100) — `task.215.gate.6.probe-engine-python-cli-entry-form.yml`
**HIGH findings per cycle**: 1, 1, 1, 1, 0, 0 — HIGH cleared at cycle 5 (the positive exit record)
**Remaining issues** (from final gate file — all fixed in `505645df`, none yet gated):
- TASK-215-QA6-1 (medium, `shared/resources/security-probe.mjs`): a `.py` exit 120 (failed flush at shutdown) was scored `rejected`, a measured false pass → now `errored` (bug 10, Ready for QA).
- TASK-215-QA6-2 (low, `shared/resources/probe-boundary-rule.md`): the worker-thread sentence was inaccurate for an exit 1 → corrected.
- TASK-215-QA6-3 (low, `shared/resources/tests/security-probe.test.mjs`): the thread-crash test's gap → tightened.

**What was attempted per cycle**:
- Cycles 1–3: crash detection by stderr parsing, then a negative crash marker on fd 3 (third strike).
- Cycle 4 (second grant): replaced with a positive exit record; a missing record is `errored`.
- Cycle 5: an exception outside the main frame stated as a limit and pinned; crash-record precedence tested.
- Cycle 6: a `.py` exit 120 is `errored`; limit text corrected; thread-crash test tightened.

**Route 2c (gate-the-last-fix half-cycle)**: declined — `medium-not-falling` (MEDIUM 1, 1, 1 over cycles 4–6).

**Likely root cause**: not a stalled loop. Since the positive channel (cycle 4) every finding has been a narrower edge of one documented limit: what the exit record cannot see after the body returns. HIGH is 0 for two gates. Each cycle's safety re-read finds one more exit path (thread, atexit, then shutdown flush), and that is what keeps MEDIUM at 1. The last fix has no gate.

**Recommended next steps**:
1. Run `/qa-task` once on `505645df` (or resume with 1 more cycle). If it reads PASS or carries only LOWs, go to `/review-pr` and then `/finalise`.
2. Or accept gate 6 as is: the fix for its one MEDIUM is in, and the run goes to `/review-pr` and then `/finalise`.
3. Take the pre-existing signal-kill wording ("timeout" printed for every signal) as a follow-up task.

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
**Action**: Running qa-fix (cycle 3 of 5) — re-entered after the not-converging escalation (escalated before 5b; 2 cycles granted)
**Re-entry**: 2 cycles granted; cycle 3's fix run at 5b (third strike: replace)
**Fixes Applied**: constant crash token written first on fd 3 (QA3-1); pid check + fd 3 closed in forked children (QA3-2, QA3-3); body exec'd in a fresh `__main__` (QA3-4, CR-5)
**Commit**: `e94dd355`

### QA Cycle 4 — 2026-10-19
**Gate Result**: FAIL (50/100)
**Issues Found**: 3. Cycle 3's four findings verified fixed. TASK-215-QA4-1 (HIGH): the crash token goes to whatever fd 3 is, so a script that closes fd 3 (or reopens it as its own file) has its crash scored `rejected` (probe: overblocked; reviewer: verdict `engages`). TASK-215-QA4-2 (MEDIUM): `probePython` runs under the engine env, cases under `caseEnv`. CR-3 (LOW, cleanup): marker computed twice.
**HIGH findings**: 1
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Escalating — loop not converging
**Re-entry**: 2 cycles granted (second grant); cycle 4's fix run at 5b (third strike: replace — positive exit record)
**Fixes Applied**: exit record on every bootstrap-controlled exit, written only while fd 3 is the boot pipe; a missing record is errored (QA4-1, QA4-2); record read once (CR-3)
**Commit**: `0aff23d7`

### QA Cycle 5 — 2026-10-19
**Gate Result**: CONCERNS (90/100)
**Issues Found**: 3. Cycle 4's three findings verified fixed (bugs 7–8 closed). TASK-215-QA5-1 (MEDIUM): an exception outside the main frame (a joined worker thread, an atexit handler) exits 0 under `python3` and is scored `accepted` — the false-alarm direction, unstated as a limit (reviewer CR-1, probe-reproduced). LOW ×2 advisory: crash-record precedence untested (mutation no-red-untested); signal-kill detail prints a timeout clause.
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 5 of 6)
**Fixes Applied**: TASK-215-QA5-1 stated as a limit (probe-boundary-rule.md, bootstrap comment, CHANGELOG) and pinned by `cli-thread-crash.py`; crash-record precedence tested (`cli-forged-answer-crash.py`). 22 python tests; full suite 5928, 0 fail; 2 mutations red. Bug 9 → Ready for QA. First commit attempt refused by the Prettier pre-commit check; formatted and re-committed.
**Commit**: `cdbb8ab4`

### QA Cycle 6 — 2026-10-19
**Gate Result**: CONCERNS (85/100)
**Issues Found**: 3. Cycle 5 fix verified (bug 9 closed). TASK-215-QA6-1 (MEDIUM, bug 10): a `.py` exit 120 (failed stdout flush at shutdown) is scored `rejected` — measured false pass, verdict `engages`. QA6-2 (LOW): worker-thread sentence inaccurate for exit 1. QA6-3 (LOW): thread-crash test gap. Scope: files changed since gate 5 (SAFETY_REPROBE false). Wording commit `46f6c7b3` landed during review at the maintainer's request.
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Escalating — loop limit reached
**Fixes Applied**: QA6-1 (`.py` exit 120 → `errored`), QA6-2 (limit text), QA6-3 (test). 23 python tests; full suite 5929, 0 fail; 2 mutations red. Bug 10 → Ready for QA.
**Commit**: `505645df`

### QA Cycle 7 — 2026-10-19
**Gate Result**: PASS (95/100)
**Issues Found**: 3 LOW. Cycle 6 fixes verified (bug 10 closed); probe 8 executed, 0 reproduced. Re-entry: 1-cycle grant after the loop-limit halt (maintainer: "go ahead"). The route-2b write first ran partway — gate edited and committed in `f38aac1f` before the Deferred Work append refused on the existing H2; completed in the next commit.
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: APPROVE — `task.215.pr-review.1.probe-engine-python-cli-entry-form.md` (conformance lens only, `--no-code`; 2 LOW). PC-2 fixed (task body `**Status:**` line) and staged; PC-1 (this report's Status and loop row) fixed at the Step 7 transition.
**Carried to 6a**: task.215.pr-review.1.probe-engine-python-cli-entry-form.md task.215.probe-engine-python-cli-entry-form.md
**Loop exit**: Cosmetic-residue exit taken — PASS gate at cycle 7 with HIGH 0 for cycles 6 and 7; all 3 open findings are LOW and are carried to the gate's recommendations.future by id (TASK-215-QA7-1, TASK-215-QA7-2, TASK-215-QA7-3). This is a CLEAN exit, not a stall: nothing is blocked and nothing is being accepted over; a full qa-fix cycle for cosmetic findings is what this route exists to avoid.
**Action**: Proceeding to 5c (PR conformance review)

---

## Completion

**Finished**: 2026-10-19T14:36Z
**Final Status**: Completed
**Branch**: feature/task.215.probe-engine-python-cli-entry-form
**PR**: https://github.com/Gamaroff/agent-skills/pull/692
**QA Iterations**: 7
**DoD Summary**: `task.215.dod.1.probe-engine-python-cli-entry-form.md`
**Tracker debt**: none

**Completion Summary**: The probe engine's `cli:` form now runs a `.py` entry under `python3 -E -s -B`, records the interpreter, and scores a Python crash `errored` from a positive exit record on fd 3 (`answer`/`crash` nonce; a missing record or a `.py` exit 120 is `errored`). Seven QA cycles (three grants) found and closed bugs 1–10. Each cycle hardened the crash-versus-answer decision: the stderr heuristics were replaced by the positive record, and the residue is stated as two directional limits in `probe-boundary-rule.md`. The loop exited clean by the cosmetic-residue route at gate 7 (PASS 95, 3 LOWs carried to Deferred Work). The DoD probe held (71 executed, 0 reproduced).

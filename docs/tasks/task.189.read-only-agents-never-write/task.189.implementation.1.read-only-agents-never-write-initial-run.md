# Implementation Report: Read-only agents never write

**Task**: `task.189.read-only-agents-never-write.md`
**Run Number**: 1
**Started**: 2026-10-16 22:26
**Status**: Escalated

---

## Summary

Make every pipeline step that dispatches a read-only Explore subagent the only writer: the QA traceability mapper returns its matrix, the DoD security agent returns a probe plan that finalise runs, the DoD docs agent runs no generator, and a guard test keeps Explore prompts write-free (obs #191, #218).

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
| Board status        | In Progress ✅ (gh-stage work-started: transitioned; priority already P2 Medium) |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.189.*` exists in git                             | Branch created at `b996b1de`; pushed with upstream | —                    | 2026-10-16T20:27Z |
| 2. review-task             | ✅ Done    | `task.189.review.{N}.{name}.md` exists (or skip logged)               | `task.189.review.1.read-only-agents-never-write.md` — READY TO IMPLEMENT 9/10 after 7 Important fixes; Planned → Ready for Development | — (pre-pass B/C inline in review) | 2026-10-16T20:32Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline (plan + surface map); 1 iteration; audit ready-for-review 17/17; ci:fast 5797/0 | `.summaries/step-3-loop-audit-1.json` | 2026-10-16T21:09Z |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #683: https://github.com/Gamaroff/agent-skills/pull/683 | — | 2026-10-16T21:12Z |
| 5–6. qa-task / qa-fix loop | ⚠️ Needs Attention | `task.189.qa.{N}.*.md`; `task.189.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | 6 cycles (5 + 1 granted), HIGH 0 throughout; loop limit — half-cycle declined (medium-not-falling); escalated | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.189.dod.{N}.*.md`; task `status: accepted`                      |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-10-16

- Invoked by `/develop-next` (registry fallback, task-registry row 189) with `--defaults`; AUTONOMOUS RUN directive applied.
- Phase 0 run inline: the input was a full file path, so no resolver was needed; the lite-mode inputs were derived from the document directly (risk_level absent, 4 implementation phases, multi-module: prompts in `shared/resources/` + `skills/finalise/` + `tests/`) → `standard`.
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Feature branch base: develop — source: recommended (`--defaults`)
- PR target branch: develop — source: recommended (`--defaults`)
- Mode: standard — source: detector
- Skips: none; refused: none; AskUserQuestion not called (0 questions open)
- qa-planning gate: skipped (auto — no prompt)
- Task status at start: `planned` — Step 2 `/review-task` validates and promotes it.
- Branch: `feature/task.189.read-only-agents-never-write` from `develop` (`b996b1de`); report stashed before branch creation, restored after.
- Tracker #588: work-started comment posted; board → In Progress (transitioned).

### Step 2 — review-task — 2026-10-16

- review-task run (Planned + no report → run). Output format auto-answered: Comprehensive report — required for pipeline audit trail.
- review-task Step 8.5 auto-answered: Yes, apply all critical + important fixes — pipeline proceeds autonomously.
- review-task Step 9 auto-answered: Yes, fixes complete — pipeline proceeds autonomously. Planned promoted to Ready for Development by review-task.
- Review report: docs/tasks/task.189.read-only-agents-never-write/task.189.review.1.read-only-agents-never-write.md (reviewed_blob stamped).
- Pre-pass B: aligned (axes source: architecture). Pre-pass C: partial — finalise already has the obs #10 probe fallback the task did not know about; the task was rescoped to replace it (Step 3b.1).
- Key scope changes from review: Phase 2 replaces the obs #10 fallback; `<DOD_N>` record/cases paths kept; argv built as an array; guard population adds inline Explore dispatch bodies and `> <` redirects; `code-review-prompt.md` § Scoping gets a caller-runs marker; `finalise-dod-prompt-contract.test.mjs` obs #10 test is rewritten.
- Tracker key re-read at Step 2: unchanged (#588). Review comment posted by review-task Step 10 (`posted`), so the step-2 orchestrator comment is skipped.

### Step 3 — develop — 2026-10-16

- Pre-develop surface map: 20 files identified in shared/resources prompts + step docs, skills/finalise, evals/shared/tests, shared/resources/tests (Explore; included the security-probe.mjs record shape: one folded record per --record path, `cases[]` carries no `input`, exit 2 = stderr-only refusal).
- Plan file found: docs/tasks/task.189.read-only-agents-never-write/task.189.plan.read-only-agents-never-write.md — included as implementation context.
- Always-loaded files: the 3 devLoadAlwaysFiles (not re-read; standards already in context from CLAUDE.md).
- Step 3 inline — /develop not invoked: plan file + surface map both recorded, and the review had already read every target file; the Task Completion Checklist is satisfied below.
- Fast gate precondition: `develop.fastGateCommand` unset → `npm run ci:fast`, which resolves.
- **Decision — one run record per DoD run, not one per plan entry.** The engine's `--record` folds every control into one snapshot and keeps `totals.executed` across them; review 1's per-entry records were unnecessary. Cases stay per entry (`…security.cases.<i>.json` when several). Task doc § 3 updated with the dated decision.
- **Decision — a runner script, `shared/resources/security-probe-plan.mjs`, not a long fenced block.** Building the argument array (I4) and mapping reproduced ids back to their inputs (the engine's `cases[]` has no `input`) do not fit shell; the Step 3b.1 block calls the script. Bundled into finalise. Added to Files Summary.
- **Decision — the docs agent gets `<DIFF_FILE>`** (finalise Step 3a already writes it) instead of a `gh pr diff` call, so the catalog rule is platform-neutral.
- **Decision — Step 3b.1 re-dispatches the security agent to grade reproduced probes.** A probe built by finalise has no `severity`, so without grading every reproduced probe would halt at Step 8a and the low-severity fix-and-recheck path would never open. Grading is a read; the agent runs nothing. Pinned in the contract test.
- Guard test redirect pattern tightened during development: the first form (`>` followed by a quote or `<`, with no whitespace requirement) reported 39 false positives on placeholders such as `"<a>", "<b>"`; the shipped form requires shell redirect syntax (whitespace or an fd before `>`). `npm run bundle:check` is excluded from the generator shape (read-only).
- Contract tests updated: `finalise-dod-prompt-contract.test.mjs` (obs #10 test → "the agent plans the probe and /finalise always runs it"; "Plan the run" heading; read-only clause; "The total is"), `probes-executed-population.test.mjs` (invocation-walk floor 4 → 3).
- Development completion comment posted to github issue 588 (develop-complete).
### Step 4 — create-pr — 2026-10-16

- SCOPE_PATHS: work-item dir, CHANGELOG.md, evals/shared/tests, shared/resources, skills/{develop-story,develop-task,finalise,qa-story,qa-task,review-code,review-pr}/references, skills/finalise, tests (`tests` added by hand: the new guard test sits in a directory with no tracked change). Pre-flight guard held nothing; leak check clean.
- Pre-commit hook refused the first commit (untracked bundled `skills/finalise/references/security-probe-plan.mjs`); commits reordered so the finalise commit carries it. 4 commits: bf5dc95b, 8e951dcc, 3c2d3e24, 16f8ed4f.
- New tests re-run in a clean detached worktree (no `.agents/skills` symlink): 57/57 pass.
- PR created: https://github.com/Gamaroff/agent-skills/pull/683 (base develop, Closes #588). Issue comment `in-review`: posted. Lock pr_url set.
- Post-PR state check (direct `gh pr view`, not the Explore poller): OPEN, head 16f8ed4f.
- GitHub board: in-review → stage-disabled.

### Step 3 — notes continued

- Mutation proofs (each file backed up, mutated, test run, restored): M1 mapper prompt "Write the matrix file" restored → guard fail 2; M2 inline dispatch write restored → fail 2; M3 code-review caller-runs marker removed → fail 1; M4 docs agent told to run `npm run generate-catalog` → fail 1; M5 runner counts an exit-2 entry as a run → read-only-agent-writes fail 1; M6 runner composes the count instead of reading the record → fail 3; M7 matrix block discards a returned matrix → fail 1.

### QA Loop Re-entry — 2026-10-17

- Operator chose "Resume at 5a with 1 more cycles" (passed as the `/develop-task` argument; AskUserQuestion not called — the answer was given up front).
- QA loop re-entry: 1 extra cycles granted; 0 cycle(s) run outside the loop back-filled from disk (highest gate 5, 5 `### QA Cycle` entries). `grant-qa-cycles.sh`: lock restored from the halt snapshot; `qa_max_cycles=6`, `reenter_at=5a`.
- Traceability matrix reused from cycle 1 (`.summaries/qa-traceability-matrix.md`), as cycles 2–5 did; mapper not re-dispatched.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Step 3, fast gate iter 1 — 1 failure of 5811** (`entrypoint-guard-realpath.test.mjs`): the new `security-probe-plan.mjs` compared `process.argv[1]` with `import.meta.url` without `realpathSync`, so invoked through the `.agents/skills` symlink — exactly how finalise Step 3b.1 calls it — it would run nothing and exit 0 (obs #126). The lifted-block test bound the runner to its `shared/resources` path, so it could not see this; the repository's realpath guard did. Fixed to the `security-probe.mjs` pattern; verified by running the bundled copy through the symlink (`reason: empty-plan`). Re-ran the gate.

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-10-16
**Gate Result**: CONCERNS
**Issues Found**: 4 — CR-1 Step 8a re-runs a command the agent no longer records (medium); CR-2 runner drops engine escapes (medium); QA-1 owned-flag refusal not probeable (medium); QA-2 empty marked block leaves an empty .summaries/ (low)
**HIGH findings**: 0
**MEDIUM findings**: 3
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)

- Traceability mapper dispatched under the new contract (dogfood): returned the matrix between markers, no write attempted; the Step 5 block wrote it.
- 5b (qa-fix cycle 1): findings ingester (Explore) confirmed 3 medium + 1 low + 3 advisory; all fixed — CR-1 Step 8a.4, CR-2 escapes, QA-1 planArgvAllowed, QA-2 matrix block dir, CR-3 FORBIDS, CR-4 readRecord, CR-5 independent sum. 6 mutation proofs, each red. Fast gate 5801/0. Commit cb79ae69, pushed. changes-requested: stage-disabled. PR + tracker qa-fix-1 comments posted.

### QA Cycle 2 — 2026-10-16
**Gate Result**: CONCERNS
**Issues Found**: 1 gate (CR2-1 probe severities merged by case id, medium) + 4 advisory (CR2-2..5); cycle-1 bugs 1-3 closed
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)

- Refute pass + safety re-probe (SAFETY_REPROBE true by judgement: a gate-1 top issue was a sandbox escape). Engine probes: planArgvAllowed 18 cases engages; matrix block 8 cases engages; 26 executed, 0 reproduced.
- 5b (qa-fix cycle 2): ingester confirmed 1 gate + 4 advisory; all fixed (CR2-1 key, CR2-2 whole plan, CR2-3 null record, CR2-4 --timeout owned + bounded run, CR2-5 wording). 5 mutation proofs red. Fast gate 5804/0. Commit 815f45b8, pushed. PR + qa-fix-2 comments posted.

### QA Cycle 3 — 2026-10-16
**Gate Result**: CONCERNS
**Issues Found**: QA3-1 Step 3b.1 foreground run can outlive the tool call (medium, QA-promoted from reviewer medium/medium); CR3-2 duplicate inline case ids share a key (low); CR3-3 prompt owned-flag lists omit --emit-block (low); bug.4 closed
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 3 of 5)

- Convergence check: HIGH 0 on gates 1-3 — nothing to stall on. Diminishing-returns exit: residue is not test machinery (a step doc and the runner) — not taken.
- 5a ran from the already-loaded /qa-task instructions (not re-invoked) to save context; scoped to files since gate 2's head.
- Route classifier (qa-diminishing-returns.js classifyLoopRoute): continue (not-a-pass-gate).
- 5b (qa-fix cycle 3): fixed QA3-1 (background + atomic result), CR3-2 (duplicate ids), CR3-3 (owned flags consolidated against OWNED_FLAGS — Step 2.6 consolidate move). Contract test narrowed to `--record <path>` and sliced by heading. 4 mutation proofs red. Fast gate 5807/0. Commit 95248a84, pushed. Comments posted.

### QA Cycle 4 — 2026-10-16
**Gate Result**: CONCERNS
**Issues Found**: CR4-1 Step 3b.1 background wait has no budget (medium); advisory CR4-2 (8a.4 re-run not backgrounded), CR4-3, CR4-4, CR4-5; bug.5 reopened
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 4 of 5)

- Route classifier: continue (not-a-pass-gate). Narrowing residue offer applies (gates 3 and 4 MEDIUMs both name skills/finalise/SKILL.md at HIGH 0): passed to qa-fix as "consolidate the run rule into the block".
- 5b (qa-fix cycle 4): consolidated the run rule into the Step 3b.1 block (wait mark with plan-derived budget + clear); CR4-3/4/5 fixed. Fast gate attempt 1 red (1 of 5810: qa-loop-lock-fields-parity — a dispatch line needs a set-waiting-on marker within 12 lines; named in prose), attempt 2 5810/0. 6 mutation proofs red. Commit 74f9e5bc, pushed.

### QA Cycle 5 — 2026-10-17
**Gate Result**: CONCERNS
**Issues Found**: CR5-1 Step 3b.1 block's BUDGET abort runs before the stale result is removed (medium); advisory CR5-2..CR5-4; bug.5 reopened
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Escalating — loop limit reached

- 5b (qa-fix cycle 5): fixed CR5-1 (stale result removed first; no abort on a failed load), CR5-3, CR5-4. Fast gate 5811/0. Mutation proofs G1–G3 red. Commit 67ea055e, pushed. Comments posted.
- Gate-the-last-fix half-cycle (route 2c): declined by `classifyLoopRoute` — `medium-not-falling` ("MEDIUM reads 1, 1, 1 over cycles 3–5").

### QA Loop Limit Reached — 2026-10-17

The pipeline completed 5 qa-task/qa-fix cycles without a clean PASS.

**Final gate status**: CONCERNS (gate 5, 90/100) — its one finding (CR5-1) was fixed in cycle 5's 5b (`67ea055e`); no gate has read that fix.
**HIGH findings per cycle**: 0, 0, 0, 0, 0 — no blocker at any cycle
**MEDIUM findings per cycle**: 3, 1, 1, 1, 1 — flat at 1 from cycle 2 onward
**Remaining issues** (from final gate file):
- CR5-1 — medium — `skills/finalise/SKILL.md` — Step 3b.1's BUDGET abort ran before the stale result was removed. **Fixed in `67ea055e` (ungated).**
- Advisory, not gate entries: CR5-2 (low/low, the wait is marked by the background process, not before the yield); CR3-4 (engine scope: SIGKILL on timeout skips the sandbox cleanup).

**What was attempted per cycle**:
- Cycle 1: CR-1 Step 8a.4 re-run, CR-2 escapes, QA-1 probeable owned-flag refusal (`planArgvAllowed`), QA-2 matrix-block directory, + CR-3/4/5 advisory
- Cycle 2: CR2-1 probe keys unique per run, + CR2-2..5 (whole-plan re-run, null record, `--timeout` owned + bounded run, wording)
- Cycle 3: QA3-1 Step 3b.1 backgrounded with an atomic result, CR3-2 duplicate ids, CR3-3 owned-flag lists checked against `OWNED_FLAGS`
- Cycle 4: CR4-1 wait budget — the run rule consolidated into the block (Step 2.6), + CR4-2..5
- Cycle 5: CR5-1 stale-result ordering, + CR5-3/4

**Likely root cause**: not a failing mechanism — every cycle's MEDIUM was a different, real defect, each fixed and mutation-proven. Cycles 3–5 all circled one subject: the operational shell around Step 3b.1 (how a long backgrounded probe run is waited on, bounded and read back), and each fix to that shell exposed its next edge. The deliverable's core — the mapper returns, the agent plans, the runner executes, the guard test holds — has been stable since cycle 2, and both new boundaries engaged under the probe engine every cycle (28 executed, 0 reproduced).

**Recommended next steps**:
1. Grant one gate for cycle 5's fix: re-run `/develop-task` and choose "Resume at 5a with 1 more cycles". CR5-1's fix is mutation-proven (G1, G2), so a clean gate is likely.
2. Or accept the current state: run Step 5c (`/review-pr --effort medium --comment --no-code`), then `/finalise`.
3. Consider extracting Step 3b.1's shell (the run, the wait, the atomic result) into a tested script; the remaining edges were all in prose-embedded shell.

### QA Cycle 6 — 2026-10-17
**Gate Result**: CONCERNS
**Issues Found**: CR6-1 the CR5-1 fix's `2>/dev/null` makes the cycle-4 argv-order stderr assertion vacuous (medium, test file; bug.6); advisory CR6-2 (medium/medium) and CR6-3..CR6-5; CR5-1 fixed and mutation-proven, bug.5 closed
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Escalating — loop limit reached

- Granted cycle (re-entry, 1 of 1). Route classifier: continue (not-a-pass-gate; route 2 declined: product-defect-signal — maintainability NFR reads CONCERNS). Narrowing residue: not signalled (medium-files-differ). Third strike: n/a (no HIGH).
- QA Cycle 6 — changes-requested: stage-disabled.
- `ci:fast` during 5a: 5811 pass, 1 fail — `tests/bundle-missing-source.test.js` over its timing budget (53 s vs 20 s) while this cycle's probes and mutations ran beside it; 7/7 alone in 3 s.
- 5b (qa-fix cycle 6): CR6-1 fixed — the CR4-1 test redirects the budget import's stderr to a file and requires it empty; CR6-3, CR6-4, CR6-5 fixed; CR6-2 left advisory. Fast gate attempt 1 red (prettier on the test file), attempt 2 5811/0. Mutation proofs: import-as-CLI with a correct budget → new test red, HEAD test green; wait marked on a failed load → CR5-1 test red; budget path skipped → killed-runner test red. Ingester not dispatched — the gate was written in this session.

**Fixes Applied**: CR6-1 (bug.6), CR6-3, CR6-4, CR6-5
**Commit**: `2117b908`

- Gate-the-last-fix half-cycle (route 2c): declined by `classifyLoopRoute` — `medium-not-falling` ("MEDIUM reads 1, 1, 1 over cycles 4–6").

### QA Loop Limit Reached — 2026-10-17 (after the 1-cycle grant)

The pipeline completed 6 qa-task/qa-fix cycles (5 + 1 granted) without a clean PASS.

**Final gate status**: CONCERNS (gate 6, 90/100) — its one finding (CR6-1, test machinery) was fixed in cycle 6's 5b (`2117b908`); no gate has read that fix.
**HIGH findings per cycle**: 0, 0, 0, 0, 0, 0 — no blocker at any cycle
**MEDIUM findings per cycle**: 3, 1, 1, 1, 1, 1 — flat at 1 from cycle 2 onward
**Remaining issues** (from final gate file):
- CR6-1 — medium — `shared/resources/tests/read-only-agent-writes.test.mjs` — the argv-order stderr guard was vacuous. **Fixed in `2117b908` (ungated), mutation-proven.**
- Advisory, not gate entries: CR6-2 (medium/medium, `skills/finalise/SKILL.md` — a loaded runner without a numeric `ENGINE_TIMEOUT_MS` is reported as not loaded; unreachable with the shipped runner); CR5-2 (low/low, the wait is marked by the background process); CR3-4 (engine scope, SIGKILL skips sandbox cleanup).

**What was attempted per cycle**:
- Cycles 1–5: as in the first escalation above.
- Cycle 6 (granted): CR5-1 verified fixed (bug.5 closed). New: CR6-1, a test made vacuous by cycle 5's own fix — fixed, plus CR6-3..CR6-5. Route 2c declined (`medium-not-falling`); route 2 declined at 5a (`product-defect-signal`: maintainability NFR read CONCERNS).

**Likely root cause**: unchanged — every MEDIUM since cycle 3 sits in the operational shell around Step 3b.1 (the backgrounded run, its wait, its result) or the tests that execute it; each fix there moved the next edge into view. Cycle 6's MEDIUM was test machinery only, and the deliverable's core has been stable since cycle 2 (28 probes executed, 0 reproduced, every cycle).

**Recommended next steps**:
1. Accept the current state: run Step 5c (`/review-pr --effort medium --comment --no-code`), then `/finalise`. Cycle 6's residue is a test-only fix, mutation-proven.
2. Or grant one more gate: re-run `/develop-task` and choose "Resume at 5a with 1 more cycles".
3. Follow-up task: extract Step 3b.1's shell (run, wait, atomic result) into a tested script, and settle CR6-2 there.

---

## Completion

**Finished**: 2026-10-17 (HALT — QA loop limit, after a 1-cycle grant)
**Final Status**: Escalated
**Branch**: feature/task.189.read-only-agents-never-write
**PR**: https://github.com/Gamaroff/agent-skills/pull/683
**QA Iterations**: 6 (loop limit, 5 + 1 granted)
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}

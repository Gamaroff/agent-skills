# Implementation Report: [Task 170] QA re-entry after a finalise DoD-gaps halt fixed by a code change

**Task**: `task.170.qa-reentry-after-finalise-gaps.md`
**Run Number**: 1
**Started**: 2026-10-03 18:30
**Status**: Halted — DoD gaps

---

## Summary

Add a sanctioned, recorded 7 → 5 QA re-entry (`reenter-qa-after-finalise.sh`) for a finalise DoD-gaps halt fixed by a code change, plus the resume-contract case, step-doc lines and guards.

---

## Pipeline Configuration

| Setting             | Value                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Feature branch base | develop                                                                                                                        |
| PR target           | develop                                                                                                                        |
| qa-planning gate    | skipped (auto)                                                                                                                 |
| Task risk level     | medium                                                                                                                         |
| Pipeline mode       | standard                                                                                                                       |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | In Progress ✅                                                                                                                 |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.170.*` exists in git                              | Branch created at `c2647581` | —                    |
| 2. review-task             | ✅ Done    | `task.170.review.{N}.{name}.md` exists (or skip logged)                | READY TO IMPLEMENT 8/10; 0 critical / 4 important applied; Planned → Ready for Development | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline (iteration 1); audit 12/12, `ready-for-review` | `.summaries/step-3-loop-audit-1.json` |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #563: https://github.com/Gamaroff/agent-skills/pull/563 | —                    |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.170.qa.{N}.*.md`; `task.170.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | 7 cycles (re-entry +2 granted; QA re-entry after finalise gaps → cycle 7); gate 7 PASS 100; PR review CONCERNS — task.170.pr-review.2 | —                    |
| 7. finalise                | ⏳ Pending | `task.170.dod.{N}.*.md`; task `status: accepted`                       | DoD gaps (dod.1): security — bash 3.2 parse (low), probe zero-guard (medium); AC 14/14, docs PASS | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-10-03

- Invoked by `/develop-next` (AUTONOMOUS RUN), item T170, source `task-registry`.
- Phase 0 run inline (no Agent fan-out): the input was an exact file path, so the resolver had nothing to find; lite-mode inputs derived from the document directly, as §0c allows.
- PIPELINE_MODE = standard — risk_level `medium` (risk_ok = false), phase_count 3, single_module false (shared/resources + skills/finalise + evals).
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md (from skills-config.yaml `devLoadAlwaysFiles`).
- Tracker: github, issue #536. Task status `planned` — proceed; Step 2 `/review-task` validates and promotes.
- Phase 0d questions asked: 2 (auto-answered, develop-next AUTONOMOUS RUN directive — no prompt):
  - Q1 Feature branch base: develop — auto-derived recommended option (current branch `develop`).
  - Q2 PR target branch: develop — auto-derived recommended option.
- qa-planning gate: skipped (auto — no prompt)
- Implementation report stashed before branch creation, restored after.
- Branch: `feature/task.170.qa-reentry-after-finalise-gaps` from `develop` at `c2647581`, pushed with upstream.
- Lock written at `current_step: 2`.
- Tracker #536: work-started comment `posted`; GitHub board: work-started → In Progress (`transitioned`; re-read reports `already` In Progress). Priority-default block not run — the issue already carries a priority from `/create-task`.

### Step 2 — review-task

- review-task invoked (no report existed; status `planned`). Output: Comprehensive report — required for pipeline audit trail.
- Pre-pass B: aligned (axes from `prepass-axes.js`, source `architecture`); pre-pass C: not-implemented.
- review-task Step 8.5 auto-answered: Yes, apply all critical + important fixes — pipeline proceeds autonomously.
- review-task Step 9 auto-answered: Yes, fixes complete — Planned promoted to Ready for Development by review-task.
- Autonomous review decisions (no AskUserQuestion — develop-next run): re-entry budget `max(existing, base + 2)`; full qa-task `CODE_MOVED` measure.
- Review report: docs/tasks/task.170.qa-reentry-after-finalise-gaps/task.170.review.1.qa-reentry-after-finalise-gaps.md
- Tracker key unchanged (#536). Review outcome comments posted to github issue 536 (`review-task`, `review` stages: posted).

### Step 3 — develop

- Pre-develop surface map: 20 files identified in shared/resources (lock helpers, resume contract, step docs, Stop hook + suite), skills/develop-{task,story}, skills/finalise, evals/shared/tests, package.json, CHANGELOG.
- Plan file found: docs/tasks/task.170.qa-reentry-after-finalise-gaps/task.170.plan.qa-reentry-after-finalise-gaps.md — included as implementation context for /develop.
- Step 3 inline — /develop not invoked: the plan names every hunk and the surface map was complete; the Task Completion Checklist post-conditions were met inline (phases ticked, Implementation Summary, Change Log row, status `ready-for-review`).
- Fast gate precondition: `develop.fastGateCommand` unset → default `npm run ci:fast`, which this project defines.
- Fast gate (`npm run ci:fast`, `.agents/skills` + `.claude/skills` moved aside): EXIT 1 on one test only — `tests/test-clean-checkout.test.js` exceeded its LOAD-SENSITIVE 10000 ms budget (10500 ms); re-run alone 13/13 green. Every other suite green, incl. the new `reenter-qa-after-finalise.test.sh` 25/25.
- Mutation proof recorded in the task's Implementation Summary (12 mutations, all red).
- Decision (scope): added a Phase 0b paragraph to `skills/develop-{task,story}/SKILL.md` — the grant's Phase 0b prompt lives there, so the re-entry offer must too; the who-restores single-statement test still passes (no restatement of the restore rule).
- Decision (bundling): the contract cites the script by bare filename (AGENTS.md rule for siblings inside `shared/resources/`), so the script and `newest-numbered.sh` bundle into develop-task and develop-story only — the `shared/resources/` literal had fanned them into develop-bug, qa-story, qa-task and review-pr; those untracked copies were deleted before commit.
- Loop audit iter 1: status `ready-for-review`, 12/12, exit loop.
- Development completion comment posted to github issue 536 (`develop-complete`: posted).

### Step 4 — create-pr

- SCOPE_PATHS: work-item dir, CHANGELOG.md, package.json, shared/resources, skills/{develop-bug,develop-story,develop-task,develop,qa-story,qa-task,review-pr}/references, skills/develop-story, skills/develop-task, skills/finalise, plus evals/shared/tests (a new untracked file in a directory with no tracked change — added as an extra scope per the step doc). Pre-flight guard held 0 files. Leak check OK.
- Commit `b0e2bf10` via /commit-changes (scope mode), implementation report included. PR #563 → develop, `Closes #536`.
- Issue #536 comment `in-review`: posted. GitHub board: in-review → stage-disabled (not configured in `pipeline:`).
- Post-PR state check: PR #563 state = OPEN (read directly with `gh pr view`; poller subagent not dispatched — one field). errors = 0.

### Steps 5–6 — QA loop

- Traceability mapper dispatched (standard mode + Success Criteria table); matrix written by the orchestrator from the agent's returned content (Explore agents are read-only).
- QA Cycle 1 — qa-task invoked with `code_review_blocking=true`; gate CONCERNS 80/100. Route classifier: continue (not-a-pass-gate).
- QA Cycle 1 — changes-requested: stage-disabled.
- QA Cycle 1 — qa-fix inline findings (1b path: the findings were already in context from 5a; no ingester dispatched — independence loss accepted, the gate is the source). CR-2 (advisory) fixed too: cheap, fails toward re-review either way.
- Post-fix PR state: OPEN (gh pr view).

### Resume — QA loop re-entry — 2026-10-03

- Re-invoked by `/develop-next` (run-state `dispatched: true, merged: false`); halt snapshot `halt_reason: loop-limit`, `halt_step: 5`.
- Phase 0b resume prompt pre-answered by the operator ("use more cycles when resuming"): **Resume at 5a with 2 more cycles** (recommended k = 2) — no prompt.
- Phase 0a detector run inline (no Explore subagent): no lock, halt snapshot for this directory, PR #563 OPEN at local HEAD `d0617e34`, clean tree — no blocking issues, no stale snapshot.
- QA loop re-entry: 2 extra cycles granted; 0 cycle(s) run outside the loop back-filled from disk (5 gates, 5 `### QA Cycle` entries). `grant-qa-cycles.sh`: QA_CYCLE=5 extra_cycles_granted=2 qa_max_cycles=7; lock restored from the halt snapshot.
- QA cycle 6 (2026-10-03): gate 6 PASS 100; route classifier → cosmetic-residue exit (route 2b), CR-1 (low) carried to `recommendations.future` and Deferred Work; gate + report committed `ecb1ce80` and pushed. Traceability matrix reused from cycle 1 (no new criteria).
- Step 5c: `/review-pr --effort medium --comment` → **APPROVE** (4 low findings) — `task.170.pr-review.1.qa-reentry-after-finalise-gaps.md`; PR comment posted. `ready-for-merge`: stage-disabled.
- PC-1 fixed before Step 7 (document-only): the task's Implementation Summary now names the eight shipped refusals, the committed-history measure and the current suite counts (52 / 5), so `/finalise` reads current evidence. CR-1 (parity-test and hooks-doc population), CR-2, CR-3 left as low follow-ups.
- Operator decisions on the finalise DoD gaps (2026-10-04): gap 1 (bash 3.2 parse) fixed in `3008d0d7` — case pattern parenthesised, `/bin/bash -n` case added (suite 53/53 under bash 5 and bash-3.2-only PATH; mutation red); gap 2 (probe zero-guard) recorded by the operator as **"unverified by the engine"** (task.130 precedent), with task.181 (`shell-argv:` entry form, issue #564) filed to close the engine gap. The next `/finalise` records security as accepted with the probe unverified by the engine, citing this decision.
- Resume 2026-10-04 (develop-next, autonomous): Phase 0b — halt snapshot `halt_step` 7, newest DoD `❌ GAPS`, gap 1 fixed by code → took **"Re-enter QA at 5a"** (the halt-specific Recommended option; the develop-next directive's "Resume from last completed step" would resume at 7 over an ungated head). Branch pushed (`f0cdb253`) first; clean tree, no lock.
- QA re-entry after finalise DoD gaps: reenter-qa: re-entered QA at step 5 / qa_phase 5a — qa_max_cycles=8 (base 6), gate_head=d0617e342e1fd0b7c1df2fc6d9389623da98515f (1 commit outside the directory since the gate's head).
- QA cycle 7 (2026-10-04): gate 7 PASS 100, no open entry → 5c. Traceability matrix reused from cycle 1 (no new criteria). Scoped re-review (11 files since gate 6 head); reviewer 0 bugs, 1 advisory cleanup. The mutation proof ran while the reviewer was reading, and the reviewer saw one transient parse failure from it — recorded in qa.7's measurement note.
- Step 5c (cycle 7): `/review-pr --effort medium --comment` → **CONCERNS** (2 medium, 3 low) — `task.170.pr-review.2.qa-reentry-after-finalise-gaps.md`; marker comment updated in place. Per §5c, CONCERNS records and does not block → Step 7. CR-1/CR-2 verified by the orchestrator (fail-safe: a less specific refusal message; documentation drift) and carried to the task's Deferred Work with PC-1 fixed there (doc-only). `ready-for-merge`: stage-disabled. ci:fast at `f4f2cf85`: 5264 pass / 0 fail, prettier clean (run with the `.agents/skills` symlink in place).

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

### QA Loop Limit Reached — 2026-10-03

The pipeline completed 5 qa-task/qa-fix cycles without a clean PASS.

**Final gate status**: CONCERNS (gate 5, 90/100) — its one finding (CR-1) was fixed in cycle 5's commit `66b822cd`, which no gate has read.
**HIGH findings per cycle**: 0, 1, 0, 0, 0 — the one HIGH (cycle 2) was fixed in cycle 2; no stall.
**MEDIUM findings per cycle**: 2, 1, 1, 2, 1 — not strictly falling over cycles 3–5, so the gate-the-last-fix half-cycle was declined (`classifyLoopRoute` → `continue`, reason `medium-not-falling`: "MEDIUM reads 1, 2, 1 over cycles 3–5 — route 2c needs it strictly falling").
**Remaining issues** (from gate 5): CR-1 (medium) — `report_entries` ignored the resume's back-fill, `shared/resources/reenter-qa-after-finalise.sh` — **fixed in `66b822cd`, ungated**. Advisory, open: gate 4's CR-4 (a parent story's DoD inside a sub-story directory with no DoD of its own is read as the stem; full-name identity measured and rejected).

**What was attempted per cycle**:
- Cycle 1: CONCERNS 80 — stem-keyed DoD lookup (co-located bug DoD), 8 hostile gate-head cases, `.claude/state` exclusion, `qa_phase` writer list.
- Cycle 2: FAIL 70 — resume precedence after a re-entry (HIGH: a pause before the re-entered entry read the old APPROVE), parallel-story stem, default budget 5, Phase 0b offers the re-entry on every GAPS halt.
- Cycle 3: CONCERNS 90 — precedence re-keyed off the gate head (it cleared one step early); committed-history measure (`uncommitted-fix`); DoD stem read from the DoD files.
- Cycle 4: CONCERNS 80 — one route per refusal, stated once; untracked files named, never refused; precedence keyed on a heading count; stale CHANGELOG/suite header. Fast gate red twice on load-sensitive timing tests only → committed unpushed per the two-attempt bound.
- Cycle 5: CONCERNS 90 — heading count made the back-filled count; in-flight-gate wording.

**Likely root cause**: the deliverable's core (the script, its refusals, the suite) converged by cycle 2. Cycles 2–5 circled one subject — how a resume tells the halted run's APPROVE from the re-entered cycle's — because the resume contract's reconstruction (back-fill, gate-numbered entries, a report that can run ahead of or behind the gates) has more states than any single key anticipated; each cycle's refute found the next state. MEDIUM did not fall monotonically because each re-key exposed one more state, not because fixes regressed.

**Recommended next steps**:
1. Grant one more cycle (Phase 0b "Resume at 5a with 1 more cycle") so a gate reads `66b822cd`; if it clears, the run exits through 5c → finalise.
2. Or run `/qa-task` by hand on the branch, then resume — the gate on disk is counted.
3. Consider gate 4's CR-4 (parent-stem identity) out of scope unless a parent DoD can genuinely land in a sub-story directory.

- QA cycle 4 fast gate red twice on load-sensitive timing tests only (machine under load; another session's gate log was present in .claude/state); cycle 4 committed unpushed per the two-attempt bound.

- QA cycle 1 read-back hit a transient `.git/index.lock` (another git process); retry succeeded.
- Step 3 fast gate: `tests/test-clean-checkout.test.js` timing flake (10500 ms vs 10000 ms budget) — re-run alone green; not a defect of this change.

### Finalise DoD Gaps — 2026-10-03

`/finalise` (dod.1) did not accept: AC 14/14, Docs PASS, Compliance N/A, CI reading 1 SUCCESS @ `ecb1ce806be5`, but **Security FAIL** on two findings:

1. **Low, reproduced by execution** — `shared/resources/reenter-qa-after-finalise.sh:146` does not parse under macOS `/bin/bash` 3.2.57 (`syntax error near unexpected token ';;'` — unparenthesised case pattern inside `$(...)`); suite under `/bin/bash` 3.2: 10 passed / 42 failed. Fails closed (exit 2 before any write; collides with the usage code). Both bundled copies are identical. Fix: `("$p".*)`.
2. **Medium, zero-guard** — `probes_executed: 0`: the probe engine cannot reach a two-positional shell script (`path` / `shell-exec` → entry-not-probeable; `filename` ran 28 cases that all stopped at usage). task.130 took the same zero-guard and was accepted only on an operator decision.

Step 8a (fix-and-recheck) refused by `finalise-fix-and-recheck.mjs`: `inside-files-summary` (bundled copies), `mutation-proved`, `no-other-finding-open` (finding 2). Gap report in the task body and `task.170.dod.1.qa-reentry-after-finalise-gaps.md`; PR comment posted.

**Resume path:** fix finding 1 and commit → Phase 0b offers "Re-enter QA at 5a" (`reenter-qa-after-finalise.sh`, this task's own mechanism) → one QA cycle → 5c → `/finalise`. Finding 2 needs the operator's decision before `/finalise` can accept.

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-10-03
**Gate Result**: CONCERNS
**Issues Found**: 3 — CR-1 (medium) DoD lookup reads a co-located bug DoD; QA-1 (medium) hostile gate heads unpinned; CR-3 (low) qa_phase writers under-listed. CR-2 advisory.
**HIGH findings**: 0
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)
**Fixes Applied**: CR-1 stem-keyed DoD lookup; CR-2 `.claude/state` excluded from the movement measure; QA-1 eight hostile-head cases; CR-3 `qa_phase` writers listed. Suite 38/38; 3 mutations red (3, 1, 10 cases); fast gate green (symlinks aside).
**Commit**: `cad6845b`

### QA Cycle 2 — 2026-10-03
**Gate Result**: FAIL
**Issues Found**: 3 — CR-1 (high) resume after re-entry reads the stale APPROVE; CR-2 (medium) parallel-story stem; CR-4 (low) absent budget read as 0. Advisory CR-3, CR-5, CR-6, CR-7.
**HIGH findings**: 1
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)
**Fixes Applied**: CR-1 resume precedence (contract paragraph + both 5–6 rows + lock schema reader; parity test); CR-2 parallel-story stem; CR-4 absent budget = 5; advisory CR-3/5/6/7 fixed. Suite 40/40; mutations red. Fast gate green.
**Commit**: `4da0cee9`

### QA Cycle 3 — 2026-10-03
**Gate Result**: CONCERNS
**Issues Found**: 1 — CR-1 (medium) re-entry precedence clears before entry N+1. Advisory CR-2/3/4/5.
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 3 of 5)
**Fixes Applied**: CR-1 precedence keyed on `qa_reentry.base_cycle`, stated once and cited by the 5–6 rows (Step 2.6 move: consolidate); advisory CR-2/CR-4 committed-history measure with `uncommitted-fix`; CR-3 stem read from DoD files; CR-5 schema. Suite 47/47; one dead line removed (no-red-dead), one uncovered rule given a case. Fast gate green.
**Commit**: `eef60e45`

### QA Cycle 4 — 2026-10-03
**Gate Result**: CONCERNS
**Issues Found**: 4 — CR-1, CR-2 (medium) refusal routes disagree; CR-3 (low) base_cycle numbering; CR-5 (low) stale CHANGELOG/suite header. Advisory CR-4.
**HIGH findings**: 0
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 4 of 5)
**Fixes Applied**: CR-1/CR-2 one route per refusal in the contract list (cited by bullet + SKILL.md; uncommitted-fix never step 7; untracked named, never refused — Step 2.6 moves: scope the claim + consolidate); CR-3 precedence keyed on `report_entries` (report now required); CR-5 CHANGELOG/suite header/criteria. Suite 52/52, parity 5/5, mutations red.
**Fast gate**: red twice — attempt 1 `test-clean-checkout` LOAD-SENSITIVE (10318 ms > 10000 ms); attempt 2 the same plus `bundle-missing-source` (7/7 green alone). Load-only, unrelated to the change. Committed **without pushing** per 5b step 0a.
**Commit**: `9915dd93` (unpushed)

### QA Cycle 5 — 2026-10-03
**Gate Result**: CONCERNS
**Issues Found**: 1 — CR-1 (medium, QA-calibrated from high) report_entries ignores the resume's back-fill. Advisory CR-2.
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Escalating — loop limit reached
**Fixes Applied**: CR-1 `report_entries` = back-filled count `max(highest gate, headings)`; CR-2 precedence wording (in-flight gate back-filled, not overwritten). Suite 52/52, parity 17/17; raw-count mutation red. Fast gate green.
**Commit**: `66b822cd` (pushed with `9915dd93`)

### QA Cycle 6 — 2026-10-03
**Gate Result**: PASS
**Issues Found**: 1 — CR-1 (low, QA-calibrated from medium) the in-flight-gate sentence is false when the report runs ahead of the gates (fails safe). Advisory CR-2 (low confidence), CR-3 (cleanup).
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: APPROVE — `task.170.pr-review.1.qa-reentry-after-finalise-gaps.md` (4 low: PC-1 stale Implementation Summary; CR-1 parity-test/hook-doc population; CR-2, CR-3 cleanups)
**Loop exit**: Cosmetic-residue exit taken — PASS gate at cycle 6 with HIGH 0 for cycles 5 and 6; all 1 open findings are LOW and are carried to the gate's recommendations.future by id (CR-1). This is a CLEAN exit, not a stall: nothing is blocked and nothing is being accepted over; a full qa-fix cycle for cosmetic findings is what this route exists to avoid.
**Action**: Proceeding to 5c (PR conformance review)
**Verification**: cycle-5 fix verified — suite 52/52, parity 11/11, ci:fast 5264 pass / 0 fail (symlink aside); raw-count mutation reds "report_entries behind". Bug 5 closed.

---

### QA Cycle 7 — 2026-10-04
**Origin**: QA re-entry after the finalise DoD-gaps halt (`reenter-qa-after-finalise.sh`)
**Gate Result**: PASS
**Issues Found**: none (1 advisory cleanup — CR-1, the bash 3.x guard is parse-only)
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: CONCERNS — `task.170.pr-review.2.qa-reentry-after-finalise-gaps.md` (CR-1 medium/high: no-gate refusal drops qa-cycle.sh's stderr; CR-2 medium: qa_reentry missing from hooks doc and resume detector; CR-3, PC-1, PC-2 low)
**Loop exit**: n/a — this exit not taken
**Action**: Proceeding to 5c (PR conformance review)
**Verification**: DoD gap 1 fix (`3008d0d7`) — suite 53/53 under bash 5.3.9 and with bash 3.2.57 first on PATH; parity 5/5; shellcheck clean; bundle:check 0; validate develop-task/develop-story pass; reverting the parenthesis reds `bash 3.2 parse` (52/53).

---

## Completion

**Finished**: 2026-10-03 (halted — finalise DoD gaps, after a granted QA re-entry: 6 cycles, gate 6 PASS, PR review APPROVE)
**Final Status**: Halted — DoD gaps
**Branch**: feature/task.170.qa-reentry-after-finalise-gaps
**PR**: https://github.com/Gamaroff/agent-skills/pull/563
**QA Iterations**: 6 (5 to the loop limit; +2 granted on resume; exited at cycle 6 via route 2b → 5c APPROVE)
**DoD Summary**: `task.170.dod.1.qa-reentry-after-finalise-gaps.md` — ❌ GAPS (2)
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}

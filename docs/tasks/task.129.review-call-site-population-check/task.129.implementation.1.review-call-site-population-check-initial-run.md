# Implementation Report: [Task 129] A call-site list in a task document is the author's recall, not a measurement

**Task**: `task.129.review-call-site-population-check.md`
**Run Number**: 1
**Started**: 2026-09-29 21:00
**Status**: In Progress

---

## Summary

Lift `collectCallSites()` into a shared `call-sites.js` collector and add a call-site population check to review-task (Step 3 check 14) and review-story (Step 4 check 10).

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | low                                                                        |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Tracker Issue       | #432 (GitHub)                                                              |
| Board status        | In Progress ✅                                                              |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.129.*` exists in git                              | Branch created at `01c8701f`; pushed with upstream | —                    |
| 2. review-task             | ✅ Done | `task.129.review.{N}.{name}.md` exists (or skip logged)                | review.1 — READY TO IMPLEMENT 8/10; 0 critical, 9 important applied; Planned → Ready for Development | —                    |
| 3. develop                 | ✅ Done | Task status == `Ready for Review`                                      | Inline (plan + surface map); 2 fast-gate iterations; 7/7 phase items; ci:fast green | `.summaries/step-3-iteration-audit-1.json` |
| 4. create-pr               | ✅ Done | PR URL; issue comment posted                                           | PR #525: https://github.com/Gamaroff/agent-skills/pull/525 | —                    |
| 5–6. qa-task / qa-fix loop | ✅ Done | `task.129.qa.{N}.*.md`; `task.129.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | 4 cycles; gate 4 PASS 100; 5c CONCERNS (pr-review.1) | — |
| 7. finalise                | ❌ Failed | `task.129.dod.{N}.*.md`; task `status: accepted`                       | DoD gaps: AC2, AC4, AC5, AC7 — dod.1; HALT | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-09-29

- Dispatched by `/develop-next` (autonomous run; item T129, source `task-registry`, registry line 172).
- Upfront Setup questions asked: 2 (Q1, Q2) — both auto-answered per the develop-next AUTONOMOUS RUN directive, no prompt.
- Feature branch base: develop — auto-answer (recommended; on `develop`).
- PR target branch: develop — auto-answer (recommended).
- qa-planning gate: skipped (auto — no prompt)
- Phase 0 run inline (path supplied; no Explore agents dispatched). Resolver: the path given; tracker: GitHub, issue #432.
- Pipeline mode: standard — risk_level `low` (risk_ok true), phase_count 2 (<3 true), single_module **false** (touches review-task, review-story, create-task and shared/resources).
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Task status at start: `Planned` — proceed; Step 2 `/review-task` validates and promotes.
- Branch: `feature/task.129.review-call-site-population-check` (base develop). Implementation report stashed before branch creation, restored after.
- Pipeline-start comment on #432: posted. GitHub board: work-started → transitioned Todo → In Progress (verified).
- Priority P2 default block not run — the board item already carries the task's Medium priority from `/create-task`; non-blocking.

- Step 2: review-task invoked (no prior report; status Planned). Output format auto-answered: Comprehensive report. Step 8.5 auto-answered: apply all critical + important fixes. Step 9 auto-answered: Yes, fixes complete.
- Review report: docs/tasks/task.129.review-call-site-population-check/task.129.review.1.review-call-site-population-check.md
- Planned promoted to Ready for Development by review-task. Pre-pass B `drift` (4 low), C `not-implemented`.
- Review decisions taken autonomously (D1–D4): add the two shell roots (population unchanged, 0 tracker-comment sites there); create-task twin in 3.5 + Section 7 pointer; presence test instead of families audit; fixture at `c69f5115^` with `--root`.
- Tracker key re-read after review: 432 (unchanged). Review comments on #432: `review-task` posted, `review` posted.

### Step 3 — Develop — 2026-09-29

- Fast-gate precondition: `develop.fastGateCommand` unset → suggested `npm run ci:fast`; script exists — precondition passed.
- Pre-develop surface map: 19 files identified in shared/resources (engine + tests), skills/review-task, skills/review-story, skills/create-task, tests/ (presence-test siblings), CHANGELOG.
- Plan file found: docs/tasks/task.129.review-call-site-population-check/task.129.plan.review-call-site-population-check.md — included as implementation context for /develop.
- Step 3 inline — /develop not invoked: plan file + surface map both recorded; the plan named every change, and the review had already measured the baselines.
- Collector baseline before the lift (guard's own `collectCallSites`, throwaway copy with a `console.log`): `SITES` 24, `PR_SITES` 12. After the lift (`call-sites.js --engine …`): 24 / 12 — unchanged. Guard test 14/14 green on both sides.
- Mutation proofs: guard test red (2 fail) with the `shared/resources/*.sh` root removed; `call-sites.test.mjs` red on each of 6 mutations (each root class, banner exclusion, continuation, `--kind`); presence test red on 4 mutations (review-story verdict, review-task numbering, create-task twin, review-story Agent C schema).
- Deviation from plan: fixtures are built per run in a temp directory rather than committed under `shared/resources/tests/fixtures/call-sites/` — each assertion names its root class, and a committed fixture tree under `shared/resources/` would sit beside the roots the collector walks.
- Addition beyond plan: the general engine shape admits `tracker_call_with_retry node …` and `[ … ] && node …` prefixes (found by the surface map; `tracker-issue` 27 → 30 sites). The two lifted shapes are byte-identical to the guard's, so its population did not move.
- Integration fixture (automated half): `git archive c69f5115^ | tar -x` → `call-sites.js --engine tracker-comment --root <export>` → 26 sites; the six QA-stage sites include `develop-pipeline-step-5-6-qa-loop.md:905` (`--stage qa-fix-`) and `develop-bug-step-5-6-verify-loop.md:89` (`--stage qa-cycle-`), which task.121's document at that commit does not name — the two sites its review found.
- Integration fixture (hand run): check 14 applied to task.121's document at `c69f5115^` — the document names qa-task, qa-story, qa-fix and the orchestrator `qa-cycle-{N}` block; the collector's two unnamed sites are both in scope → 2 Important findings, matching the task.121 review.
- Iteration 1 fast gate: 1 failure — `transition-protocol-parity.test.mjs` "tracker-comment.js is bundled wherever a skill invokes it": the create-task 3.5 item named `tracker-comment.js` literally. Reworded to the collector's `--engine` names. Iteration 2: `npm run ci:fast` exit 0 (4,564 pass, 0 fail). Also green: `bundle:check`, `check:generated`, `validate:all`.
- CLI timing: `call-sites.js --engine tracker-comment` 0.17 s on the live tree.
- Development completion comment posted to github issue 432.

### Step 4 — Create PR — 2026-09-29

- SCOPE_PATHS: docs/tasks/task.129.review-call-site-population-check, CHANGELOG.md, shared/resources, shared/resources/tests, skills/create-task, skills/review-story, skills/review-story/references, skills/review-task, skills/review-task/references, plus `tests/review-call-site-population-check.test.js` added by hand (a new untracked file in a directory with no tracked change).
- Pre-flight guard: every untracked path is in scope — nothing held.
- Commits: `79b0bfa4` docs(task.129) review 1 + report; `a4132da0` feat(review) collector + checks. Leak check OK.
- PR #525: https://github.com/Gamaroff/agent-skills/pull/525 (base develop, Closes #432). `in-review` comment on #432 posted. Post-PR state: OPEN. Lock `pr_url` set.

- QA Cycle 1 — changes-requested: stage-disabled. QA-start re-assert (in-review): stage-disabled. Traceability mapper skipped — Success Criteria are checkbox lists, not a table (HAS_SUCCESS_CRITERIA_TABLE=false).
- qa-fix Change Log row deferred to loop exit (one row per fix loop, per the contract).
- Cycle 2 qa-read-back: first run halted with 1 problem whose text was not captured (only the summary line was kept); the re-run staged the document itself and passed. Recorded as an instrument gap in my run, not a pass on the first attempt.
- Narrowing residue — every MEDIUM on gates 1 and 2 names shared/resources/call-sites.js (TASK-129-CR-1, TASK-129-CR-2, TASK-129-C2-CR-1, TASK-129-C2-CR-2); HIGH 0 on both. Offer passed to qa-fix Step 2.6.
- QA Cycle 2 — changes-requested: stage-disabled.
- Cycle 3: convergence check n/a (HIGH 0,0,0 — nothing to stall). Route classifier: continue (not-a-pass-gate; route 2 declined: product-defect-signal). Narrowing offer: false (medium-files-differ — call-sites.js and its test). QA Cycle 3 — changes-requested: stage-disabled.
- Cycle 3 read-back first halted on a transient `.git/index.lock` (no lock file present when checked; staged by hand with retries, then clean). Likely the same cause as cycle 2's uncaptured read-back problem.
- Scratchpad directory expired mid-run; temp files moved to `.claude/state/`.
### Step 5c / Step 7 — 2026-09-29

- 5c PR review 1: CONCERNS (PC-1 medium/high, CR-1 medium/medium, PC-2/PC-3 low). PC-1..PC-3 corrected before finalise in `a374a5cb` (doc wording, qa.2 row, CHANGELOG, progress ticks); CR-1 left as a follow-up.
- /finalise invoked (not inlined). DoD agents: AC PARTIAL (3/7 with per-PR test evidence), Security PASS (boundary: false, candidates named), Compliance NOT_APPLICABLE, Docs PASS.
- CI reading 1: SUCCESS @ `a374a5cb5d45` over 5 checks.
- Decision: NOT ACCEPTED — 4 gaps (AC2, AC4, AC5, AC7). Fix-and-recheck (8a) not applicable: four gaps, not one low finding. Status stays ready-for-review; gaps row written; gap report added to the task body; gaps PR comment posted.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Step 7 HALT — DoD gaps (4):** AC2 the task.121 `c69f5115^` fixture has no committed test (the stated shallow-clone reason is wrong: `test.yml` uses `fetch-depth: 0`); AC4 no test asserts the CLI ≤ 2 s; AC5 no test fails if the guard restates an engine shape; AC7 observation #120 not closed naming PR #525. Estimated ≈1 hour. See `task.129.dod.1.review-call-site-population-check.md`.
- Open follow-up (not a DoD gap): PR-review CR-1 — exit 1 also occurs on MODULE_NOT_FOUND, so prose branching on exit 1 should branch on the JSON `reason`.

- Step 3 iteration 1: fast gate failed on `transition-protocol-parity.test.mjs` (a skill naming `tracker-comment.js` must bundle it). Cause: literal engine filenames in create-task 3.5. Fixed by naming engines by `--engine` value. Triage: `.summaries/step-3-test-triage-1.json`.

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-09-29
**Gate Result**: CONCERNS
**Issues Found**: 2 medium (TASK-129-CR-1 explicit --root inside a repo resolved to the repo top; TASK-129-CR-2 node "$VAR" invocations invisible), 5 advisory (CR-3..CR-7)
**HIGH findings**: 0
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)
**Fixes Applied**: CR-1 explicit --root measured as given; CR-2 `node "$VAR"` sites tracked per shell function (setup-consumer.sh:614); CR-4 no-roots exit 1 + prose at 5 sites; CR-5 .js accepted; CR-6 non-regular files skipped; CR-7 test comment. 6 tests, each mutation-proved. Doc-fix probe population 5, move: patch. Fast gate: 4,570 pass.
**Commit**: `a7f2342a`
**Post-fix PR state**: OPEN (gh pr view; poller not dispatched — one field, read directly)

### QA Cycle 2 — 2026-09-29
**Gate Result**: CONCERNS
**Issues Found**: 2 medium (TASK-129-C2-CR-1 no-roots accepts a consumer scripts/; TASK-129-C2-CR-2 exit 1 also means a crash), 4 advisory. All cycle-1 findings verified fixed.
**HIGH findings**: 0
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)
**Fixes Applied**: narrowing-residue offer taken — consolidate (REASONS table: unique non-zero exit per reason, every exit path reads it, one test drives each row; isSourceTree marker; unreadable) and scope the claim (variable rule limits stated). 5 tests, 4 mutations → red. Doc-fix probe population 5 (3 updated, 2 unaffected). Fast gate: 4,575 pass.
**Commit**: `a65b1737`
**Post-fix PR state**: OPEN

### QA Cycle 3 — 2026-09-29
**Gate Result**: CONCERNS
**Issues Found**: 2 medium (TASK-129-C3-CR-1 EPIPE exits 1 outside REASONS; TASK-129-C3-CR-2 every-row test drives 4 of 6 rows), 3 advisory. Cycle-2 findings verified fixed.
**HIGH findings**: 0
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 3 of 5)
**Fixes Applied**: C3-CR-1 installExitGuards + output-closed row (exit 5); C3-CR-2 every-row test covers all 7 REASONS rows and asserts key coverage; C3-CR-3/4/5. 4 mutations → red. Doc probe population 5, all updated, move: patch. Fast gate 4,576 pass.
**Commit**: `c32d933d`
**Post-fix PR state**: OPEN

### QA Cycle 4 — 2026-09-29
**Gate Result**: PASS
**Issues Found**: none blocking; 3 advisory (C4-CR-1 prose reason lists untested against REASONS; C4-CR-2 installExitGuards arms untested directly; C4-CR-3 output-closed driver lacks error/timeout)
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: CONCERNS — `task.129.pr-review.1.review-call-site-population-check.md` (PC-1 medium/high: §8 fixture ticked as automated but a hand run; CR-1 medium/medium: exit 1 also on MODULE_NOT_FOUND; PC-2, PC-3 low). Not blocking — ready-for-merge: stage-disabled.
**Loop exit**: n/a — this exit not taken
**Action**: Proceeding to 5c (PR conformance review)
**Gate + report commit**: `0f3a8cd6` (pushed before 5c)

---

## Completion

**Finished**: {populated at end}
**Final Status**: Escalated — HALT at Step 7 (DoD gaps)
**Branch**: feature/task.129.review-call-site-population-check
**PR**: https://github.com/Gamaroff/agent-skills/pull/525
**QA Iterations**: 4 (gate 4 PASS 100; 5c CONCERNS)
**DoD Summary**: task.129.dod.1.review-call-site-population-check.md — GAPS IDENTIFIED
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}

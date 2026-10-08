# Implementation Report: Fold the 5c review and its doc-only fixes into the acceptance commit

**Task**: `task.173.fold-5c-review-into-acceptance-commit.md`
**Run Number**: 1
**Started**: 2026-10-08 05:12
**Status**: In Progress

---

## Summary

Narrow the two index-sweeping commits (finalise 8a, PreCompact pause) to their own paths, and state the 5c APPROVE/CONCERNS carry path so the review report and doc-only fixes ride /finalise 6a's acceptance commit.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set                                                                    |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/{coding-standards,tech-stack,source-tree}.md                                |
| Board status        | In Progress ✅ (gh-stage work-started: transitioned; Priority already P2 Medium) |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.173.*` exists in git                             | Branch created at `3a62c860`; pushed with tracking | —                    |
| 2. review-task             | ✅ Done | `task.173.review.{N}.{name}.md` exists (or skip logged)               | `task.173.review.1.…md`: READY TO IMPLEMENT 8/10, 0 Critical / 4 Important (applied) / 3 Optional; Planned → Ready for Development | —                    |
| 3. develop                 | ✅ Done | Task status == `Ready for Review`                                      | Inline (plan file); 1 iteration; 4/4 phases; ci:fast + npm run ci green; 8 mutation proofs | —                    |
| 4. create-pr               | ✅ Done | PR URL; issue comment posted                                           | PR #613: https://github.com/Gamaroff/agent-skills/pull/613 | —                    |
| 5–6. qa-task / qa-fix loop | ✅ Done | `task.173.qa.{N}.*.md`; `task.173.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | 10 cycles (5 + 2 granted + 2 QA re-entry + 1 granted); gate 10 PASS 100; 5c PR review APPROVE (pr-review.2) | —                    |
| 7. finalise                | ❌ Failed | `task.173.dod.{N}.*.md`; task `status: accepted`                      | Runs 1–3 gaps resolved. Run 4 (`task.173.dod.4…`): 1 gap — AC8's enumerated fix list is stale | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-10-08

- Feature branch base: develop — AUTONOMOUS RUN (develop-next): auto-answered Q1 with the recommended option
- PR target branch: develop — AUTONOMOUS RUN (develop-next): auto-answered Q2 with the recommended option
- qa-planning gate: skipped (auto — no prompt)
- Phase 0 run inline (no 0a-parallel agents dispatched). Lite-mode inputs derived from the document: risk_level=absent, phase_count=4, single_module=false (shared/resources + skills/finalise) → PIPELINE_MODE=standard.
- Status at start: Planned — proceeding; Step 2 (/review-task) validates and promotes.
- Tracker: github, issue #540. work-started comment: posted. Board: work-started → transitioned (In Progress).
- Branch: `feature/task.173.fold-5c-review-into-acceptance-commit` from develop @ `3a62c860`. Implementation report stashed before branch creation, restored after.
- review-task output: Comprehensive report — required for pipeline audit trail (auto)
- review-task Step 8.5 auto-answered: Yes, apply all critical + important fixes; Step 9 auto-answered: Yes, fixes complete — pipeline proceeds autonomously.
- Review report: `docs/tasks/task.173.fold-5c-review-into-acceptance-commit/task.173.review.1.fold-5c-review-into-acceptance-commit.md`. Planned promoted to Ready for Development by review-task.
- review-task pre-pass agents B/C not dispatched — performed inline (independence loss recorded in the review report). One finding (glob-match.js unbundled) was withdrawn after verification.
- Review outcome comment: posted by review-task (stage review-task); Step 2 orchestrator comment skipped — one event, one writer.
- Dependency task.172 (ci.docsOnly.patterns) merged via PR #542 before this run.


### Step 3 — Develop

- Pre-develop surface map: 9 files identified in shared/resources (step-5-6 qa-loop, step-7 finalise, on-precompact.sh + test, hooks.md, pause.md, ci-tree-equivalence.js, glob-match.js) and skills/{finalise,review-pr}/SKILL.md — mapped inline (Explore not dispatched; independence loss: the map and the implementation share one reader).
- Plan file found: docs/tasks/task.173.fold-5c-review-into-acceptance-commit/task.173.plan.fold-5c-review-into-acceptance-commit.md — included as implementation context.
- Step 3 inline — /develop not invoked: the plan file named every hunk and the surface map was already in context.
- Alignment: the plan says a finding's `file:`; /review-pr's machine-readable block carries `ref: "path:line"` — the classifier derives the path from `ref` (aligned code to the real schema; the task's intent is unchanged).
- The doc-only test calls task.172's `readConfig` + `isDocsPath` (ci-tree-equivalence.js) rather than glob-match.js directly — one definition of the default patterns and path guards.
- Bundling: the carry blocks' explicit `.agents/skills/{develop-story|develop-task}/references/…` paths make the bundler copy ci-tree-equivalence.js, bb-auth.js and doc-links.js into develop-story and develop-task (closure +3 each). A `$REFS/doc-links.js` spelling was not discovered by the bundler and was replaced.
- Fast gate iter 1: first run red on prettier (new test file only); formatted; second run TEST_EXIT=0, 5,522 tests, 0 fail.
- Mutation proofs: 8 reverts, each red (details in the task's Implementation Notes).
- `npm run ci` (slow tier, incl. eval:all): exit 0.
- Loop audit performed inline (Explore not dispatched): task status Ready for Review, 4/4 phases, 0 unchecked boxes → exit loop. Independence loss recorded.
- Change Log: one develop row written by the inline path (plus the status row).
- develop-complete comment: posted.

### Step 4 — Create PR

- SCOPE_PATHS: docs/tasks/task.173…, CHANGELOG.md, shared/resources, skills/{develop-bug,develop-story,develop-task,develop,qa-story,qa-task,review-pr}/references, skills/finalise. No out-of-scope untracked files held.
- Commits: 515905ec feat(task.173) (source, tests, bundles, CHANGELOG); 8b6e0c17 docs(task.173) (task doc + this report's first commit). Leak check: OK (both commits inside scope).
- PR #613 opened against develop, Closes #540. Issue comment (in-review): posted. GitHub board: in-review → stage-disabled.
- Post-PR state check (inline gh pr view): PR #613 state = OPEN. errors = 0. Lock pr_url updated.


### Step 5–6 — QA loop

- Traceability mapper dispatched (Explore, read-only); orchestrator wrote `.summaries/qa-traceability-matrix.md` from its reply. 11 criteria: 5 full, 2 partial, 4 none.
- QA-start board re-assert: in-review → stage-disabled.
- QA Cycle 1 — changes-requested: stage-disabled. qa-fix ingester not dispatched: the orchestrator wrote gate 1 in this context (independence loss recorded). No ambiguity; no third strike; no narrowing-residue offer. Fix pushed once (`c8733a5a`); PR state OPEN.
- QA cycle 1: /qa-task (code_review_blocking=true, matrix passed). Gate 1 FAIL 70/100. Reviewer 199.6 s. CR-1 promoted (high/high); CR-2..CR-5 adopted by QA after reading. Bugs: task.173.bug.1, task.173.bug.2.
- QA loop re-entry (2026-10-08, operator choice "Resume at 5a with 2 more cycles"): 2 extra cycles granted; 0 cycle(s) run outside the loop back-filled from disk. grant-qa-cycles.sh: QA_CYCLE=5, qa_max_cycles=7; lock restored from halt snapshot.
- QA cycle 6: /qa-task (code_review_blocking=true, matrix passed). Scoped to the cycle-5 fix (8 files). Reviewer 122.9 s. Gate 6 CONCERNS 90. CR6-1 adopted by QA (medium/medium, not auto-promoted); CR6-2 advisory. ci:fast 5,549/0. Convergence: no trip. Route classifier: continue (not-a-pass-gate).
- QA Cycle 6 — changes-requested: stage-disabled. Third strike: none (no HIGH). Narrowing offer: "Narrowing residue — every MEDIUM on gates 5 and 6 names shared/resources/develop-pipeline-step-5-6-qa-loop.md (CR5-1, CR6-1); HIGH 0 on both." qa-fix ingester not dispatched: the orchestrator wrote gate 6 in this context (independence loss recorded).
- QA Cycle 6 fix: fast gate 5,549/0 (attempt 1). `ed10bc82` pushed once; PR state OPEN (inline gh pr view). qa-fix PR comment and tracker comment `qa-fix-6` posted.
- QA cycle 7: /qa-task (code_review_blocking=true, matrix passed). Scoped to `ed10bc82` (7 files). Reviewer 81.3 s. One finding, CR7-1, medium/medium and not auto-promoted. QA re-rated it LOW with a measured plausibility check: the classify block lists only `isDocsPath`, tracked and clean paths, and Step 8 deletes the list, so the worst case is a documentation commit that `/finalise` catches loudly. CR6-1 (adopted at medium) differed: its remedy could discard work. Gate 7 PASS 100, top_issues empty → route 1 → 5c. The operator may overrule the re-rating.
- 5c: /review-pr --effort medium --comment --no-code → CONCERNS (PC-1 trail medium/high, PC-2 consistency medium/medium). The lens's first PC-2 `ref` broke the template's ref grammar (prose); the lens re-emitted it as the task-document path. Classified both as doc-only; fixed bug.1 status (Closed, citing QA cycle 2) and added `pr_number: 613`; stage block carried 3 paths, HEAD unchanged. bug.2 not fixable at 5c (not in any ref). ready-for-merge: stage-disabled. PR comment posted.

### Step 7 — Finalise

- /finalise (task mode, STEM task.173, DoD file `task.173.dod.1.fold-5c-review-into-acceptance-commit.md`). Four DoD agents in parallel: AC PARTIAL (10/11; AC8 FAIL), Security FAIL (probe zero-guard), Compliance NOT_APPLICABLE, Docs PASS.
- CI reading 1: SUCCESS @ d0a95bdc8b0ff9006ab9c4bb72ceb75b52d2f4cb over 5 checks.
- Decision: GAPS (3). Fix-and-recheck (8a) not applicable: two sections FAIL. Gaps row in the task Change Log; gap report section in the task body (status unchanged, ready-for-review); gaps PR comment posted. 6a did not run, so the 5c carried set (pr-review.1, bug.1, task doc) stays staged and rides this HALT commit, per §5c's HALT exception.
- finalise's lock self-advance (`--skill finalise` → 8) not run: it means "Step 7 done", and this path HALTs at 7.
- The security agent reversed QA's `boundary: false` across all 7 cycles. That is a QA-vs-DoD disagreement worth a look: QA recorded the 5c classify block as non-boundary, while the DoD's Step 1b reads its allow-list over repository state as one.
- **Operator decision at the DoD halt (2026-10-08, "Go ahead" on the recommendation).** (1) AC8 re-scoped to what the record shows: each added behaviour and each QA fix has its guarding test mutation-proved, with the two `no-red-untested` fixes named (cycle 3's Step 8 deletion, CR4-3). (2) Security zero-guard accepted by recorded human override. Engine: unverifiable, because no entry form executes a fenced Markdown block. Evidence: the 38-case `acceptance-commit-carries-5c.test.mjs` suite, which executes the classify and stage blocks per PR. Precedent: task.133 and task.125. (3) bug.2 closed via `status-history.js`, citing QA cycle 2. All three are document-only, so per the resume contract the run resumes at Step 7 rather than re-entering QA.
- Resume: `reenter-qa-after-finalise.sh` refused (`no-code-moved`), confirming a document-only fix; lock restored at step 7 via `advance-pipeline-lock.sh --restore`; `/finalise` re-run.
- DoD run 2 (`task.173.dod.2.fold-5c-review-into-acceptance-commit.md`): AC PARTIAL, Security PASS, Compliance NOT_APPLICABLE, Docs PASS. CI reading 1: SUCCESS @ d073291c120209e2caabbe046f4e7ac3105bce92 over 5 checks (the head's own run). Security probed the classify block's `isDocsPath` predicate in both bundled copies: 66 executed, 0 reproduced (`task.173.dod.security.run.json`). The git-state arms rest on the operator's override. AC8 FAIL: the re-scope I wrote named two `no-red-untested` exceptions, but the record also holds CR2-2's HALT branch (qa.3:70), CR3-1's `absorbed` binding, and five prose-only fixes with no guarding test (CR-5, CR2-3, CR3-3, CR3-4, CR4-1). That was my error in executing the operator's re-scope. 8a did not apply (no executed defect to mutation-prove). HALT; gaps PR comment posted.
- Run-2 gap closed within the operator's re-scope decision: AC8 now lists every QA fix by its recorded outcome (covered, `no-red-untested` ×3, `absorbed` ×1, prose-only ×5). Document-only, so the run resumes at Step 7.
- DoD run 3 (`task.173.dod.3.fold-5c-review-into-acceptance-commit.md`): AC PASS 11/11, Docs PASS, Compliance NOT_APPLICABLE, Security FAIL. CI reading 1: SUCCESS @ 23dd41dfd00ab2ef99aee7924dd4c40aa236e043 over 5 checks. The security agent probed `isDocsPath` with a different cases file than run 2 (59 executed, 3 reproduced). An embedded-NUL path is accepted, and under zsh the classify block clears `src/a.js\0.md` as doc-only for a tracked code file. The orchestrator reproduced it (zsh `CLEARED`, bash `record`). It is contained by the stage block's exact-match check. Severity medium, so 8a's evaluator refuses (`severity-low`). HALT; this needs a code fix and QA re-entry at 5a.
- Operator "Go ahead" on the recommended source fix. `isDocsPath` refuses a path containing U+0000–U+001F or U+007F (`shared/resources/ci-tree-equivalence.js` plus 5 bundled copies). Tests: SEC-5 in `ci-tree-equivalence.test.mjs` (7 control-character paths false; a non-ASCII printable path still true), and a classify-block test under the consumer default patterns in `acceptance-commit-carries-5c.test.mjs`. Mutation: guard reverted, then SEC-5 red and the zsh classify case red (bash stays green because bash drops the NUL on `read`, which was the defect's own asymmetry) → covered. The first version of the classify test ran under this repo's `docs/**` override and could not reproduce the defect; that was caught by the mutation proof and fixed. Population: `configuration.md:331` (unusual-form list) updated; `finalise/SKILL.md:930` unaffected (it restates only the config file and submodule rules). CHANGELOG `[Unreleased]` › Fixed entry. The code changed, so the resume re-enters QA at 5a.
- QA re-entry after finalise DoD gaps: reenter-qa: re-entered QA at step 5 / qa_phase 5a — qa_max_cycles=9 (base 7), gate_head=ed10bc82fb48dc59d833ecc0c293c574fa74a6fe
- QA cycle 8: /qa-task (code_review_blocking=true, matrix passed). Unscoped safety re-probe by judgement: no clause fired literally, but the re-entry came from a boundary defect. Boundary: true (obs #298); engine probe on `isDocsPath`, both pattern sets, cases persisted (obs #299), 28/0, with a discrimination check. Reviewer 279.6 s. Gate 8 FAIL 70: CR8-1 HIGH promoted and reproduced by the orchestrator. Convergence: no trip (HIGH 0,0,1). Route: continue. Third strike: none. Narrowing: false (high-findings-remain).
- QA Cycle 8 — changes-requested: stage-disabled. qa-fix ingester not dispatched: the orchestrator wrote gate 8 in this context (independence loss recorded). Fast gate 5,556/0 on attempt 1. `c2d063ba` pushed once; PR OPEN; qa-fix comments posted (PR, and tracker `qa-fix-8`).
- QA cycle 9: a mandatory safety re-probe (clause 1: gate 8 security FAIL), unscoped. Reviewer 260.6 s (read-only, so verified against the real index). Engine 28/0 with persisted cases. Step 4b: 0 findings on both changed docs. Gate 9 PASS 100 with 2 open LOW (promoted low/high). Route: continue (high-findings-remain: HIGH 1 then 0). The 5b fix is cycle 9 of 9.
- QA loop re-entry (2026-10-08, operator "Go ahead" on "resume with 1 more cycle"): 1 extra cycle granted; 0 cycle(s) run outside the loop back-filled from disk. grant-qa-cycles.sh: QA_CYCLE=9, qa_max_cycles=10; lock restored from halt snapshot.
- QA cycle 10: /qa-task scoped to `96026663` (clause 1 false). Reviewer 215.8 s; engine 28/0. Gate 10 PASS 100, top_issues empty → route 1 → 5c.
- 5c: /review-pr → APPROVE (PC-1..3 LOW, scope). The marker comment was updated in place. The stage block carried the report; HEAD unchanged. ready-for-merge: stage-disabled.
- DoD run 4 (`task.173.dod.4.fold-5c-review-into-acceptance-commit.md`): AC PARTIAL (AC8), Docs PASS, Compliance NOT_APPLICABLE. Security PASS by override, with 104 probes; its cases were persisted by the orchestrator because the agent was read-only. CI reading 1: SUCCESS @ 3e439274c86487b56920fc63607109385a9823e8 over 5 checks.
  - AC8 failed again because its list predates the NUL fix and cycles 8–9. That is my lapse: the enumeration should have been extended each cycle.
  - Security reproduced a LOW: `isDocsPath` accepts a `.git` segment. It is identical on origin/develop (measured), so it is pre-existing and out of scope. It fails closed in the 5c path. → follow-up.
  - HALT; gaps PR comment posted.
- Run-4 gap closed within the operator's AC8 decision. AC8 now cites a Mutation-proof ledger in § Testing results: one row per behaviour or fix, the run-3 and cycle 8–9 fixes included, and CR8-1's three `no-red-untested` sites named. The pr-review.2 scope LOWs (PC-1..3) were also closed by adding the DoD-run-3 files to § 7. Document-only, so the run resumes at Step 7.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

### QA Loop Limit Reached — 2026-10-08

The pipeline completed 5 qa-task/qa-fix cycles without a clean PASS.

**Final gate status**: CONCERNS (gate 5, 90/100). Its one finding (CR5-1) was fixed in qa-fix cycle 5 (`6eb59e6c`). No gate has read that fix.
**HIGH findings per cycle**: 1, 0, 0, 0, 0. HIGH has been 0 since cycle 2.
**MEDIUM findings per cycle**: 1, 3, 2, 1, 1. Not strictly falling over cycles 3–5, so the gate-the-last-fix half-cycle was declined (`classifyLoopRoute` reason `medium-not-falling`).
**Remaining issues** (from the final gate file):
- CR5-1 (medium, `shared/resources/develop-pipeline-step-5-6-qa-loop.md`): the classify stale-list arm replaced the eligible list without checking its paths. **Fixed in `6eb59e6c`, ungated.**

**What was attempted per cycle**:
- Cycle 1 (FAIL 70): the carry restore wiped uncommitted work (HIGH); the classifier was silent on unparsed findings; placeholder guard; 6a path normalisation; overclaim. All fixed (`c8733a5a`).
- Cycle 2 (CONCERNS 70, refute pass): a resume after a pause between 5c and 6a HALTed on the staged set; doc-links failures took the restore branch; the 8a `--hard` hint; dedupe; re-classify; fence. All fixed (`aba301e5`).
- Cycle 3 (CONCERNS 80): stale eligible list trusted by the probe; unchecked fix left staged on a HALT; plus four LOW. Fixed; the eligible list was consolidated into one record (`967f62d3`).
- Cycle 4 (CONCERNS 90): 8a overlap recovery prose; re-classify guard ignored the header; plus two LOW. Fixed (`4cfd1d4f`), but the CR4-2 fix regressed into CR5-1.
- Cycle 5 (CONCERNS 90): CR5-1. Fixed (`6eb59e6c`).

**Likely root cause**: the loop converged on HIGH early and kept circling one mechanism, the 5c eligible-list record and its guards in `develop-pipeline-step-5-6-qa-loop.md`. Each cycle's defensive shell found the next edge case in the state it guards: resume, stale lists, error exits. The findings shrank from 5 to 1 and from HIGH to MEDIUM, but MEDIUM plateaued at 1, and the budget ended on an ungated fix.

**Recommended next steps**:
1. Re-run `/develop-task` and take Phase 0b's **"Resume at 5a with 2 more cycles"**, so a gate reads `6eb59e6c`. If it reads clean, the run exits through 5c to Step 7.
2. Or review CR5-1's fix by hand (one guard, plus its test) and run `/qa-task` once yourself; Phase 0b counts that gate from disk.
3. If the eligible-list machinery keeps generating findings, consider descoping the doc-only *fix* half (task § 11 "Partial Rollback"): keep the carry of the review report, and drop doc-only fixes at 5c.

---

### Finalise DoD Gaps — 2026-10-08

1. **AC8: mutation proofs not traceable per test.** The criterion says each new test is mutation-proved red on revert. The records are per-cycle totals, and none names its test. Close it by mapping each of the 19 tests (×bash/zsh) plus hook scenario 17 to a recorded red run (re-running where none exists), or by re-scoping AC8 to "each fix's test is mutation-proved" by recorded decision.
2. **Security zero-guard.** The 5c classify/stage blocks (`shared/resources/develop-pipeline-step-5-6-qa-loop.md:1505-1514`) are an allow-list over repository state, a boundary under Step 1b. No probe-engine form reaches a fenced Markdown block, so `probes_executed: 0`. Close it by making the entry reachable (extract to a sourceable script, or land `shell-argv:` from task.181) and probing it, or by recording a human override that cites the 38-case committed suite executing these blocks.
3. **Trail: bug.2 still `Ready for QA`.** 5c PC-1 named both bugs, but its `ref` named only bug.1, so 5c could carry only that fix (obs #297). Close bug.2, citing QA cycle 2.

Items 1 (as a re-scope) and 3 are document-only. Item 2 is code only if the entry is extracted. A code fix re-enters QA at 5a on resume; a document-only fix resumes at 7.

### QA Loop Limit Reached (re-entry) — 2026-10-08

The pipeline completed 9 qa-task/qa-fix cycles: the original 5, 2 granted on re-entry (cycles 6–7, which reached 5c and Step 7), and 2 granted by the QA re-entry after finalise DoD run 3 (cycles 8–9). No gate has read the final fix `96026663`.

**Final gate status**: PASS 100 (gate 9). Its two open LOW entries, CR9-2 and CR9-4, were fixed in `96026663`; that fix is ungated.
**HIGH findings per cycle**: 1, 0, 0, 0, 0, 0, 0, 1, 0. The HIGH at cycle 8 was CR8-1, fixed in `c2d063ba` and closed at gate 9.
**MEDIUM findings per cycle**: 1, 3, 2, 1, 1, 1, 0, 0, 0
**Remaining issues** (from gate 9):
- CR9-2 (low, `shared/resources/develop-pipeline-resume-contract.md`): the resume probe spelled a carried path differently from the eligible list. **Fixed in `96026663`, ungated.**
- CR9-4 (low, `shared/resources/develop-pipeline-step-5-6-qa-loop.md`): zsh's `echo` forged a classify line from a backslash escape in a ref. **Fixed in `96026663`, ungated.**
- Advisory, not fixed: CR9-1 (medium/medium: the classify block reads patterns from the working-tree config), CR9-3 (low/medium: the clean test ignores the index), CR8-2 (medium/low: symlink mode), CR7-1 and CR6-2.

**What was attempted per cycle** (cycles 1–5: see the earlier escalation entry):
- Cycle 6 (CONCERNS 90): fixed CR6-1, the stale-arm HALT offering `git checkout` (`ed10bc82`).
- Cycle 7 (PASS 100): 5c CONCERNS. Finalise run 1 found 3 gaps (operator-resolved); run 2 found AC8's exception list incomplete (corrected); run 3 found an embedded NUL in `isDocsPath` (`3d49e349`). The run then re-entered QA.
- Cycle 8 (FAIL 70, unscoped safety re-probe): fixed CR8-1 HIGH, a ref read as a pathspec, with literal pathspecs and an exact-one-path rule (`c2d063ba`).
- Cycle 9 (PASS 100, 2 open LOW, mandatory re-probe): fixed CR9-2 and CR9-4 (`96026663`).
- Gate-the-last-fix half-cycle (route 2c) declined: `medium-not-falling` ("MEDIUM reads 0, 0, 0 over cycles 7–9 — route 2c needs it strictly falling").

**Likely root cause**: the shape of the route-2c rule, not a failing loop. Every security re-probe of the 5c carry surface has found another way in which the classifier, git and the shell spell one string differently: NUL, pathspec magic, C-quoting, echo escapes. Each was fixed and mutation-proved. Severity is falling (HIGH → LOW), but MEDIUM is already 0, so "strictly falling" cannot hold, and the last fix stays ungated by construction. Separately, the 5c carry's input is an untrusted report string handed to three readers. Each re-probe finds a new seam, which is a sign the surface is wider than the feature needs.

**Recommended next steps**:
1. Re-run `/develop-task` and take "Resume at 5a with 1 more cycle", so a gate reads `96026663`. If it reads clean, the run leaves through 5c to Step 7. This is the cheapest path.
2. Or run `/qa-task` once by hand on `96026663`. Phase 0b counts that gate from disk.
3. If re-probes keep finding seams, narrow the surface: drop the doc-only fix half of the 5c carry (task § 11 "Partial Rollback") and keep only the review-report carry. That removes the untrusted-ref-to-git path entirely.

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-10-08
**Gate Result**: FAIL
**Issues Found**: 5 — CR-1 (HIGH: carry restore wipes uncommitted work incl. the implementation report), CR-2 (MEDIUM: classifier silent on unparsed findings), CR-3/4/5 (LOW: CARRY_FIXED placeholder guard, 6a CARRIED path normalisation, overclaim about HALT commits)
**HIGH findings**: 1
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)
**Fixes Applied**: CR-1 classify clears only tracked+clean, non-report doc paths; stage block HALTs untouched on uncleared paths (no rm fallback). CR-2 classifier HALTs on unparsed findings. CR-3 quoted placeholder guard. CR-4 6a pathspec-normalised EXPECTED. CR-5 HALT-commit carry stated. Tests 18/18; 6 mutation proofs red; fast gate 5,530/0.
**Commit**: `c8733a5a`

### QA Cycle 2 — 2026-10-08
**Gate Result**: CONCERNS
**Issues Found**: 6 — CR2-1 (MEDIUM: pause between 5c and 6a HALTs on resume at the Phase 0b probe), CR2-2 (MEDIUM: non-dead-link doc-links exit restores the file), CR2-3 (MEDIUM: 8a hint git reset --hard destroys carried set), CR2-4/5/6 (LOW)
**HIGH findings**: 0
**MEDIUM findings**: 3
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)
**Fixes Applied**: CR2-1 resume probe sets the staged 5c set aside; CR2-2 stage block HALTs untouched when doc-links cannot run; CR2-3 8a hint soft reset; CR2-4/5/6 dedupe, re-classify guard, CommonMark fence close. Tests 28/28; 6 mutation proofs red; fast gate 5,540/0. Step 2.6 (repeat subject): Move patch — distinct defects in distinct states.
**Commit**: `aba301e5`

### QA Cycle 3 — 2026-10-08
**Gate Result**: CONCERNS
**Issues Found**: 7 — CR3-1 (MEDIUM: probe trusts a stale eligible list), CR3-2 (MEDIUM: could-not-run HALT leaves fix staged), CR3-3..CR3-7 (LOW: crash-resume overclaim, 8a overlap, CRLF/4-backtick close, unquoted pipe in guard, probe coverage)
**HIGH findings**: 0
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 3 of 5)
**Fixes Applied**: CR3-1 eligible list consolidated (header, probe binding, Step 8 deleter); CR3-2 unstage before could-not-run HALT; CR3-3/4 prose; CR3-5 CRLF/long fence; CR3-6 quoted DOC_LINKS guard; CR3-7 probe coverage. Tests 36/36 + review-committed case; mutation proofs red (CR3-1 staged check, CR3-2, CR3-5, CR3-6, CR3-7); CR3-1 WI binding absorbed; Step 8 deletion no-red-untested. Step 2.6: Move consolidate. Fast gate 5,548/0.
**Commit**: `967f62d3`

### QA Cycle 4 — 2026-10-08
**Gate Result**: CONCERNS
**Issues Found**: 4 — CR4-1 (MEDIUM: 8a overlap recovery restores the rejected fix), CR4-2/3 (LOW: re-classify guard ignores header; unchecked restore), CR4-4 (LOW cleanup: review-unstaged test cannot fail)
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 4 of 5)
**Fixes Applied**: CR4-1 8a overlap recovery scoped (Step 2.6 move: scope the claim); CR4-2 stale list replaced; CR4-3 restore failure HALTs STILL STAGED; CR4-4 probe HALT shapes name the uncarried path. Tests 38/38; CR4-2 and CR4-4 mutation-proved; CR4-3 no-red-untested. Fast gate attempt 1 red: test-clean-checkout.test.js 23.9 s over its 20 s LOAD-SENSITIVE budget (load average 119; the file passed alone, 13/13, 17.2 s); attempt 2 green 5,550/0.
**Commit**: `4cfd1d4f`

### QA Cycle 5 — 2026-10-08
**Gate Result**: CONCERNS
**Issues Found**: 1 — CR5-1 (MEDIUM: cycle-4 stale-list arm replaces the eligible list without checking its paths)
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Escalating — loop limit reached
**Fixes Applied**: CR5-1 classify guard refuses a dirty listed path in both arms; stale list replaced only when clean. Tests 38/38; mutation-proved. Fast gate attempt 1 red: bundle-missing-source.test.js 27.5 s over its LOAD-SENSITIVE 20 s budget (load average 92; the file passed alone, 7/7, 6.4 s); attempt 2 green 5,550/0.
**Commit**: `6eb59e6c`

### QA Cycle 6 — 2026-10-08
**Gate Result**: CONCERNS
**Issues Found**: 2 — CR6-1 (MEDIUM: the stale-arm HALT offers `git checkout HEAD -- $q` for a dirty path the block cannot attribute to a 5c edit), CR6-2 (LOW, advisory: `git diff` failure read as dirty). CR5-1 closed and mutation-proved.
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 6 of 7)
**Fixes Applied**: CR6-1 stale-arm HALT reworded: names the path as changed since the old pass cleared it, says to inspect the diff, and no longer calls it a 5c edit or offers `git checkout`. Step 2.6 move: scope the claim (pipeline narrowing offer). Probe population 1 (`carries a 5c edit`; the same-review arm is unaffected because this pass wrote that list). Test asserts no `git checkout` and no attribution; mutation-proved (covered, bash + zsh). Tests 38/38. CR6-2 left advisory.
**Commit**: `ed10bc82`

### QA Cycle 7 — 2026-10-08
**Gate Result**: PASS
**Issues Found**: none open. CR6-1 closed and mutation-proved. CR7-1 (reviewer medium/medium; QA re-rated LOW on a measured basis, since the list holds only tracked, clean, doc-only paths): the stale-arm HALT says "commit it". Advisory, in `recommendations.future` with CR6-2.
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: CONCERNS
**Loop exit**: n/a — this exit not taken
**Action**: Proceeding to 5c (PR conformance review)
**PR Review report**: `task.173.pr-review.1.fold-5c-review-into-acceptance-commit.md` (conformance lens only, `--effort medium --no-code`): PC-1 (trail, medium/high: bug.1 and bug.2 still Ready for QA), PC-2 (consistency, medium/medium: no `pr_number`, and the body names tinker-city PR #981, which /finalise would read).
**Carried to 6a**: task.173.pr-review.1.fold-5c-review-into-acceptance-commit.md task.173.bug.1.carry-restore-wipes-uncommitted-work.md task.173.fold-5c-review-into-acceptance-commit.md
**Not fixed (recorded)**: PC-1's bug.2 half. `task.173.bug.2.classifier-silent-on-unparsed-findings.md` is named only in the finding text, not in its `ref`, so the classifier never cleared it and 5c may not edit it. bug.2 still reads Ready for QA.

### QA Cycle 8 — 2026-10-08
**Origin**: QA re-entry after finalise DoD gaps (run 3, code fix `3d49e349`)
**Gate Result**: FAIL
**Issues Found**: 1 open — CR8-1 (HIGH: the 5c classify block clears a ref that git reads as pathspec magic, `:!*.md` → every non-markdown file, under the default patterns, bash and zsh; bug task.173.bug.3). Advisory: CR8-2 (medium/low, symlink mode). The DoD run-3 NUL gap is closed; the engine probe on `isDocsPath` engages, 28 executed / 0 reproduced (cases file persisted).
**HIGH findings**: 1
**MEDIUM findings**: 0
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 8 of 9)
**Fixes Applied**: CR8-1. The 5c classify and stage blocks and the resume probe's header check are `--literal-pathspecs`, and a ref clears only when `git ls-files` names exactly that path. Step 2.6 move: consolidate (an allow-list of the accepted shape, not a new `isDocsPath` deny rule). The rule at qa-loop.md:1417 is reworded. Tests: magic, glob and directory refs recorded under the default patterns; a `*`-named file staged literally. 44/44. Mutation: clearance reverted → red; non-literal `git add` → red; both reds under bash and zsh. The literal restore, checkout and probe header are `no-red-untested`. Probe population: `tracked and clean` / `tracked, clean` → qa-loop.md only (updated); `error-unmatch` → step-4, step-7 and finalise unaffected (pipeline-computed paths). CHANGELOG Fixed entry. Bug task.173.bug.3 → Ready for QA.
**Commit**: `c2d063ba`

### QA Cycle 9 — 2026-10-08
**Gate Result**: PASS (2 open LOW)
**Issues Found**: CR8-1 closed (bug.3 closed). Promoted (bug, low/high): CR9-2 (the resume probe reads C-quoted `git status` paths, so a spaced carried path never matches; fails loud) and CR9-4 (zsh `echo` interprets backslashes in an untrusted ref and fakes a classify line; reproduced). Advisory: CR9-1 (medium/medium, working-tree config), CR9-3 (low/medium, the index is ignored).
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Escalating — loop limit reached
**Fixes Applied**: CR9-4: every line in the 5c classify and stage blocks that prints a ref or a path uses `printf '%s'`, not `echo` (23 lines). CR9-2: the resume probe matches a carried entry by asking git for each listed path's status line with the same flags as `$DIRTY`, rather than grepping a C-quoted `p` against the raw list. Tests: a backslash-escape ref prints one line; a spaced carried doc is set aside on resume. 48/48. Mutation: echo restored → zsh red (bash is green by nature, the defect's asymmetry); raw-list grep restored → bash and zsh red. Fast gate attempt 1 red: an environmental `git commit` "unable to create temporary file" inside the resume-probe fixture setup, zsh (load average ~18), before any changed code ran.
**Commit**: `96026663`

### QA Cycle 10 — 2026-10-08
**Gate Result**: PASS
**Issues Found**: none open. CR9-2 and CR9-4 closed (the new tests go red on the pre-fix docs). Advisory: CR10-1 (low/medium, a directory entry in the eligible list), CR10-2 (low/low, review-report arm quoting), CR10-3 (cleanup, CI installs no zsh, verified).
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: APPROVE
**Loop exit**: n/a — this exit not taken
**Action**: Proceeding to 5c (PR conformance review)
**PR Review report**: `task.173.pr-review.2.fold-5c-review-into-acceptance-commit.md` (conformance only): APPROVE, with 3 LOW scope findings. The Files Summary does not list `ci-tree-equivalence.js`, its SEC-5 test or `configuration.md`, all added by the DoD run-3 fix.
**Carried to 6a**: task.173.pr-review.2.fold-5c-review-into-acceptance-commit.md (APPROVE, so no doc-only fixes)

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: feature/task.173.fold-5c-review-into-acceptance-commit
**PR**: https://github.com/Gamaroff/agent-skills/pull/613
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}

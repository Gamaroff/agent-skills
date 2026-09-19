# Implementation Report: Resume trusts what it finds on disk

**Task**: `task.124.pipeline-resume-lifecycle-hygiene.md`
**Run Number**: 1
**Started**: 2026-09-19 14:44
**Status**: Escalated

---

## Summary

First pipeline run for task 124 — add the resume/halt lifecycle checks (dirty-tree probe, evidence-conditioned summary-gap rule, snapshot cleanup, `waiting_on` + `set-waiting-on.sh`, glob-safe HALT snippet, `report-lint.js` + report template, `advance-pipeline-lock.sh --restore`) across the develop pipelines.

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
| Tracker Issue       | #424 (GitHub)                                                              |
| Board status        | In Progress ✅                                                             |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.124.*` exists in git                             | Resumed — branch already existed at develop tip `7d5d4e6b`; lock written; work-started comment posted; board Todo → In Progress; Priority already P1 High | —                    |
| 2. review-task             | ✅ Done    | `task.124.review.{N}.{name}.md` exists (or skip logged)               | Skipped — already reviewed (`review.1`, NEEDS REVISION with all 9 Important recs applied; status Ready for Development) | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 1 iteration; 17/17 implementation checkboxes ticked; committed in `86ebcade` and pushed; fast gate green | `.summaries/step-3-codebase-map.json`, `.summaries/step-3-iteration-audit.json` |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #436: https://github.com/Gamaroff/agent-skills/pull/436 — implementation commit `86ebcade` + report commit `1bbb6f36`; in-review comment posted; board in-review → `stage-disabled` (not configured for this board — correct outcome, card stays In Progress) | —                    |
| 5–6. qa-task / qa-fix loop | ❌ Escalated | `task.124.qa.{N}.*.md`; `task.124.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | Loop limit reached after 5 cycles (gates FAIL, FAIL, CONCERNS, CONCERNS, CONCERNS; HIGH 1,2,0,0,0); cycle-5 fixes committed `5be57806`, ungated; route 2c declined (high-findings-seen); 5c not reached | —                    |
| 7. finalise                | ⏳ Pending | `task.124.dod.{N}.*.md`; task `status: accepted`                      |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-09-19

- Phase 0 fan-out: resolver not dispatched (file resolved from bare id `124`); tracker poll and lite-mode detection run inline via Bash rather than Explore subagents (deterministic reads, no failures). Issue #424 OPEN, labels `task`, `priority:high`, board column `Todo`.
- PIPELINE_MODE = standard — risk_ok=false (`risk_level: medium`), phase_count=4 (≥3), single_module=false (scope spans shared/resources, three orchestrator SKILL.md files, hooks, evals).
- ALWAYS_LOAD_FILES = the 3 `devLoadAlwaysFiles` entries from `skills-config.yaml`.
- Previous run detected (branch exists, no implementation report, no PR): user chose **Resume from last completed step**. Step 1 is satisfied by the existing branch `feature/task.124.pipeline-resume-lifecycle-hygiene` (0 commits ahead of develop); Step 2 skips on the existing current `task.124.review.1` report (status Ready for Development). The uncommitted review/task/plan edits from that review are committed on the branch before Step 3.
- Stale halt snapshot `.claude/state/develop-pipeline.last-halt.json` belonged to task.123 (merged as PR #435); removed rather than resumed — this is exactly the defect task 124's Phase "snapshot outlives its run" fixes.
- Feature branch base: develop — branch already exists at the develop tip (Q1 asked, answered develop)
- PR target branch: develop — standard Gitflow (Q2 asked, answered develop)
- qa-planning gate: skipped (auto — no prompt)
- GitHub board: work-started → transitioned (Todo → In Progress, verified). Pipeline-start comment: posted.
- review-task skipped — task status is `Ready for Development` and review report exists at `docs/tasks/task.124.pipeline-resume-lifecycle-hygiene/task.124.review.1.pipeline-resume-lifecycle-hygiene.md`. Skip notice posted to #424.
- Pre-develop surface map: 19 anchors confirmed across shared/resources (lock helper, grant, set-qa-phase, on-stop, on-precompact, change-log.js, step-0 §0e, detector prompt, resume contract, step-8), 3 orchestrator SKILL.md HALT sites, dispatch sites in step-3/step-5-6/review-pr/finalise, eval replay fixtures, tests layout, bundler discovery rule. Persisted to `.summaries/step-3-codebase-map.json`.
- Plan file found: `docs/tasks/task.124.pipeline-resume-lifecycle-hygiene/task.124.plan.pipeline-resume-lifecycle-hygiene.md` — included as implementation context for /develop.
- Always-load files: 3 read and passed to /develop.

### Step 3 — develop — 2026-09-19

- Status gate: task was `Ready for Development` → set `In Progress`; alignment: greenfield (review pre-pass C confirmed none of `report-lint.js`, `waiting_on`, `--restore`, the dirty-tree probe or the snapshot deletion existed).
- Implemented in the order 4 → 2 → 3 → 1 (scripts before prose): Phase 4 `advance-pipeline-lock.sh --restore <doc-dir>` (+ per-mode no-lock split; `grant-qa-cycles.sh` delegates; snapshot consumed); Phase 2 `set-waiting-on.sh` + Stop-hook budget check + HALT `rm` two-command form + `waiting_on` in the parity test + every dispatch site marked; Phase 3 `implementation-report-template.md` (story/task/**bug** variants) + `report-lint.js` + four call sites; Phase 1 resume-contract probe, detector summary-gap rule + stale-snapshot deletion, Step 8 same-document snapshot deletion, four replay fixtures (13–16).
- **Bug variant added to the template** (task named story + task only): the PreCompact hook is shared with `develop-bug` and lints whatever report the lock names, so a report with no variant would have failed `variant-undetected` on every develop-bug pause. Its section list is the four develop-bug's own §0e writes; `QA Iteration History` is deliberately not in it (bug reports place it on either side of Issues Log).
- **The linter found three historical corruptions** it was not written for: task.9 (Issues Log before QA Iteration History, duplicated), task.75 (`## QA Iteration History` repeated after Completion) and task.2 (`### QA Cycle 1` twice). Left as history — adoption is going-forward — and noted here as evidence the codes bite on real reports, not only the fixture.
- Green fixture task.105 swapped for task.118: task.105 carries relative links to sibling artifacts, and `bundled-links.test.js` scans `shared/resources/**` including fixtures.
- `subagents|wallClockMinutes` added to `read-config.sh`'s `_CONFIG_GUARDED_KEYS` — `tracker-access.test.sh` §44 pins the list against every reader call site, and `set-waiting-on.sh` is a new one.
- Mutation proofs recorded: `--restore` numeric-coercion / snapshot-consumption / no-lock-exit-1 (3 mutants, each red); Stop hook budget check (stale wait → red); `report-lint.js` fence-blind / optional-ignored / order-check-removed (3 mutants, each red); parity test dispatch-site coverage (unmarked dispatch → red); `halt-snippet-glob-safe.test.mjs` carries the pre-fix one-argv form as a permanent in-suite red under zsh.
- Fast gate: `npm run ci:fast` green (3511 pass, 1 skip); `npm run eval:develop-task` 16/16 fixtures green; shellcheck clean over every tracked shell source; `bundle:check` 0 problems (one pre-existing `<name>` warning from observation-log-contract.md, not this task's).
- Dispatch sites enumerated by grep and recorded in the task doc §6 Phase 2.
- Step 3 iteration 1 audit: 17/17 ticks, status `ready-for-review`, commit `86ebcade` — performed inline (grep + git rev-parse) rather than by an Explore subagent; recorded as the inline fallback, independence loss noted. Loop exits after iteration 1.
- Development completion comment posted to github issue 424.

### Step 4 — create-pr — 2026-09-19

- SCOPE_PATHS: `docs/tasks/task.124.pipeline-resume-lifecycle-hygiene` (work-item dir) + changed top-level dirs since develop: `docs`, `evals`, `shared`, `skills`, `tests`, `CHANGELOG.md`, `package.json`. Only untracked file: this report (in scope — committed here per the step-4 rule). Pre-flight guard: nothing held.
- /create-pr: base develop pre-supplied; report committed in `1bbb6f36` (Step 4 is where its first commit belongs); pushed with tracking; PR body from the Explore summariser (wait marked/cleared via `set-waiting-on.sh`); PR #436 created; `in-review` comment posted to #424 (`posted`); leak check: every committed path in scope.
- Post-PR state check: PR #436 state = OPEN (inline `gh pr view`). errors = 0.
- GitHub board: in-review → stage-disabled (tracker-workflow.yaml does not map the moment; exit 0).

### Step 5–6 — QA loop — 2026-09-19

- QA_MAX_CYCLES = 5 (lock carries no qa_max_cycles). qa_phase → 5a.
- GitHub board: QA-start re-assert → stage-disabled.
- Traceability mapper skipped: HAS_SUCCESS_CRITERIA_TABLE = false — §9 Success Criteria is a checkbox list under four sub-headings, not a table (the mapper's own precondition).
- /qa-task cycle 1 invoked with `code_review_blocking=true` (standard mode). Gate 1: FAIL 70/100 — top_issues CR-1 (high) + CR-2..CR-4 (medium); PR comment posted (qa-gate-1 lead); tracker comment `posted`.
- Convergence check: not applicable (cycle 1). Route classifier: `continue` (cycle 1; no exit eligible). → 5b, cycle 1 of 5. qa_phase → 5b.
- QA Cycle 1 — changes-requested: stage-disabled. Invoking /qa-fix on gate 1.
- /qa-fix cycle 1: CR-1..CR-4 fixed (+ CR-6/8/9/10 taken, CR-5/7 deferred); findings taken from the gate in context rather than a findings-ingester dispatch (no ambiguity, four specific suggested actions); CR-1 proved under real GNU coreutils in a container (43/43) and by a GNU-shaped stat shim scenario; the derived dispatch population found a fourth unmarked site (develop-bug step-3 triage). Fast gate 3511/0; eval:develop-task 16/16. Fix summary posted to PR (qa-fix-1 lead) and #424 (`posted`). Committed `467b2307` (gate 1 + QA report + bugs + fixes; report excluded) and pushed once. Cycle 1 of 5 complete → 5a.
- /qa-task cycle 2 (full-diff refute pass; SAFETY_REPROBE=false — security axis OK reasoned): gate 2 FAIL 70/100 — CR-1/CR-2 high, CR-3/CR-4 medium; cycle-1 findings verified fixed by reproduction (GNU container 43/43, staged-overlay repro). Convergence check: not applicable (cycle 2; HIGH sequence [1, 1]). Route classifier: continue. PR comment (qa-gate-2 lead) + tracker comment `posted`. → 5b, cycle 2 of 5. changes-requested: stage-disabled.
- /qa-fix cycle 2: CR-1..CR-4 fixed (+ CR-5..CR-8 taken); the CR-2 fix is the one this pipeline itself will rely on at its next resume. Fast gate 3511/0; eval 16/16; bundle 0 problems (grant's sibling now in all eight copies). Fix summary posted to PR (qa-fix-2) and #424 (`posted`). Committed `0cea64a6` and pushed once. Cycle 2 of 5 complete → 5a (cycle 3, narrowed to files changed since gate 2).
- /qa-task cycle 3 (narrowed, 16 files): gate 3 CONCERNS 80/100 — 0 HIGH, CR-1/CR-2 medium (in top_issues by QA judgement; both verified), CR-3..CR-5 low. Convergence check (cycle 3): HIGH sequence [1, 2, 0] — falling to 0, no trip. Route classifier: continue (not a PASS gate; diminishing-returns declined — HIGH not 0 for two consecutive gates). PR comment (qa-gate-3) + tracker `posted`. → 5b, cycle 3 of 5. changes-requested: stage-disabled.
- /qa-fix cycle 3: CR-1..CR-6 fixed (grant-first ordering; cat-file precondition reproduced; prose; gh-only note). Fast gate 3511/0; eval 16/16. Fix summary posted (qa-fix-3) to PR and #424 (`posted`). Committed `51cb227d` and pushed once. Cycle 3 of 5 complete → 5a (cycle 4, narrowed).
- /qa-task cycle 4 (narrowed, 7 files): gate 4 CONCERNS 85/100 — 0 HIGH; CR-1 (medium/high, promoted) + CR-2 (medium, QA judgement); CR-3/CR-4 low. Convergence check: HIGH sequence [1, 2, 0, 0] — at 0, no trip. Route classifier: continue (CONCERNS token; diminishing-returns declined — residue is prose, not test machinery per qa.testArtifactGlobs). PR comment (qa-gate-4) + tracker `posted`. → 5b, cycle 4 of 5 (one budgeted cycle remains). changes-requested: stage-disabled.
- PreCompact pause at 14:54:55Z, mid-qa-fix cycle 4 (report committed `bbc091e4` by the hook; lock consumed into the halt snapshot). Continued **in-session** after compaction: the four fixes were applied and committed before the missing lock was noticed (`--skill commit-changes` exit 0 with no lock, by design; `set-qa-phase.sh` refused). `advance-pipeline-lock.sh --restore <doc-dir>` rebuilt the lock from the snapshot at step 5 and consumed it — this task's Phase 4, exercised live on its own pipeline (pause_reason `precompact`, no loop-escalation reason → `--restore` directly, per the branch fixed in this cycle).
- /qa-fix cycle 4: CR-1..CR-4 fixed (one restore statement — Phase 0b defers to Phase 0a; develop-bug drops the grant exception; skip label per cause; probe Cost sentence). Fast gate 3512/0; eval 16/16; bundle 0 problems. Fix summary posted (qa-fix-4) to PR and #424 (`posted`). Committed `e14f1b2c` and pushed once. Cycle 4 of 5 complete → 5a (cycle 5, narrowed — the last budgeted cycle).
- /qa-task cycle 5 (narrowed, 3 canonical sources + 18 bundle copies + 7 artifacts since gate 4; Step 4b 5/5 blocks green with a seeded tree): gate 5 CONCERNS 85/100 — 0 HIGH; CR-1 (medium/high) + CR-2 (medium; reviewer medium, raised to high on verification — no `BASE_BRANCH=` anywhere, lock has no base field). Convergence check: HIGH sequence [1, 2, 0, 0, 0] — gone, no trip. Route classifier: continue (not-a-pass-gate; route 2 declined: product-defect-signal — the residue is shared/resources prose, not test machinery). PR comment (qa-gate-5) + tracker `posted`. → 5b, cycle 5 of 5 — the budget is spent after this fix: Loop Escalation (loop-limit trigger) follows 5b unless route 2c fires, and it cannot (HIGH was not 0 throughout). changes-requested: stage-disabled.
- /qa-fix cycle 5: CR-1..CR-2 fixed (exception scoped in both shared sources; probe base bound from recorded state and executed bash+zsh × 3 branches). Fast gate 3512/0; eval 16/16. Fix summary posted (qa-fix-5) to PR and #424 (`posted`). Committed `5be57806` and pushed once.
- Budget spent (cycle 5 = QA_MAX_CYCLES). Route 2c asked with `budgetSpent: true` → `continue` (`high-findings-seen`). Loop Escalation — loop limit: Action row overwritten, escalation entry written to the Issues Log, report status Escalated, board `blocked` signalled, lock snapshotted with `halt_reason: loop-limit` at step 5 and removed. HALT.
- Reviewer wait marked/cleared via set-waiting-on.sh; CR-3 is the finding that the QA skills themselves do not mark it.
- Step 1 (resume): review/task/plan edits from the pre-run `/review-task` committed on the branch and pushed before Step 3.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

### QA Loop Limit Reached — 2026-09-19

The pipeline completed 5 qa-task/qa-fix cycles without a clean PASS.

**Final gate status**: CONCERNS (gate 5, 85/100)
**HIGH findings per cycle**: 1, 2, 0, 0, 0 — 0 from cycle 3 onward
**MEDIUM findings per cycle**: 3, 2, 2, 2, 2 — flat from cycle 2 onward (every cycle's mediums were the previous cycle's prose fix's own residue, a different pair each time)
**Remaining issues** (from final gate file, both fixed in 5b of cycle 5 and committed `5be57806`, **ungated**):
- CR-1 (medium) `shared/resources/develop-pipeline-resume-contract.md` — the loop-limit exception was stated for all three pipelines in the shared sources develop-bug bundles while develop-bug's Step 0-lock said the opposite → scoped to develop-task/develop-story, develop-bug carve-out named (bug 13, Ready for QA)
- CR-2 (medium) `shared/resources/develop-pipeline-resume-contract.md` — the probe's base was `${BASE_BRANCH:-develop}` and nothing bound it → bound from `gh pr view baseRefName` / report row / develop-with-warning; executed bash+zsh on all three branches (bug 14, Ready for QA)

**What was attempted per cycle**:
- Cycle 1: FAIL 70 — GNU-stat mtime in `--restore` (reproduced in an alpine container), CI-poll budget, hand-listed dispatch population (4 unmarked sites found), staged overlay → fixed `467b2307`
- Cycle 2: FAIL 70 (full-diff refute) — stale-snapshot rule on `accepted`, re-invocation never restored, `waiting_on` carried through restore, porcelain renames/quoted paths → fixed `0cea64a6`
- Cycle 3: CONCERNS 80 — restore-before-grant ordering (bug 9), deleted branch-added file (bug 10, reproduced), stale sentences, gh-only note → fixed `51cb227d`
- Cycle 4: CONCERNS 85 — two restore statements (bug 11), develop-bug exception without a grant (bug 12), two labels → fixed `e14f1b2c`
- Cycle 5: CONCERNS 85 — the cycle-4 fix moved the contradiction into the shared sources (bug 13); probe base never bound (bug 14) → fixed `5be57806`; budget spent. Route 2c (gate-the-last-fix) considered and declined: `high-findings-seen` — HIGH was not 0 throughout (1, 2, 0, 0, 0).

**Likely root cause**: not a mechanism that would not converge — every mechanism finding (cycles 1–3) was fixed once and stayed fixed, and no HIGH has been raised since cycle 2. The residue is the enumeration class in an *executed* document: the same rule (who restores, and when) is stated in five places across two shared sources and three orchestrators, and each cycle's one-site prose fix left a neighbouring statement false — bug 9 → 11 → 12 → 13 is one contradiction walking across four files. Cycle 5's fix states the rule with its pipeline qualifier at every site, which is the first edit that touched all of them at once. CR-2 is unrelated: a `${VAR:-default}` that hid an unbound variable on every feature-off-develop run.

**Recommended next steps**:
1. Grant one more cycle (`Resume at 5a with 1 more cycle` on re-invocation) — the cycle-5 fixes are on the head ungated, both are one-paragraph/one-line, and a narrowed gate 6 is expected clean → 5c → finalise.
2. If gate 6 finds a sixth restatement of the who-restores rule, replace the enumeration rather than patch it: one sentence in the resume contract and a `bundle-dependency`-style test that every orchestrator's Step 0-lock cites it instead of restating it.
3. Carried non-blocking: cycle-1 CR-5 (grant's never-lower guard reads the snapshot, not the candidate `--restore` chooses) and CR-7 (inline lint call sites collapse exit 1/2/127) — file as a follow-up task.

---

## QA Iteration History

### QA Cycle 1 — 2026-09-19
**Gate Result**: FAIL
**Issues Found**: 1 HIGH (CR-1 GNU `stat -f` in `--restore`), 3 MEDIUM (CR-2 CI-poll budget, CR-3 dispatch population, CR-4 staged overlay), 3 LOW; 4 bug reports
**HIGH findings**: 1
**MEDIUM findings**: 3
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)

### QA Cycle 2 — 2026-09-19
**Gate Result**: FAIL
**Issues Found**: cycle-1 CR-1..CR-4 verified FIXED; new: 2 HIGH (CR-1 stale-snapshot rule fires on `status: accepted`; CR-2 re-invocation resume never restores the lock), 2 MEDIUM (CR-3 stale waiting_on through --restore; CR-4 porcelain renames/quoted paths), 2 LOW; bugs 5–8
**HIGH findings**: 2
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)

### QA Cycle 3 — 2026-09-19
**Gate Result**: CONCERNS
**Issues Found**: cycle-2 CR-1..CR-4 verified FIXED; new: 0 HIGH, 2 MEDIUM (CR-1 restore before the grant's refusal; CR-2 deleted branch-added file re-created), 3 LOW, 1 cleanup; bugs 9–10
**HIGH findings**: 0
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 3 of 5)

### QA Cycle 4 — 2026-09-19
**Gate Result**: CONCERNS
**Issues Found**: cycle-3 CR-1..CR-6 verified FIXED; new: 0 HIGH, 2 MEDIUM (CR-1 duplicate unconditional restore statement in the resume contract; CR-2 grant exception copied into develop-bug, which has no grant), 2 LOW; bugs 11–12
**HIGH findings**: 0
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 4 of 5)

### QA Cycle 5 — 2026-09-19
**Gate Result**: CONCERNS
**Issues Found**: cycle-4 CR-1..CR-4 verified FIXED; new: 0 HIGH, 2 MEDIUM (CR-1 the two shared sources develop-bug bundles still state the loop-limit exception for all three pipelines — the cycle-4 fix moved the contradiction; CR-2 the probe's `${BASE_BRANCH:-develop}` is never bound, so hotfix/epic-integration branches probe against develop and the (a) outcome discards), 0 LOW; bugs 13–14
**HIGH findings**: 0
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Escalating — loop limit reached

---

## Completion

**Finished**: 2026-09-19 (escalated at Step 5–6)
**Final Status**: Escalated
**Branch**: feature/task.124.pipeline-resume-lifecycle-hygiene
**PR**: https://github.com/Gamaroff/agent-skills/pull/436
**QA Iterations**: 5 (budget spent; cycle-5 fix ungated)
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}

---

## Pipeline Paused — 2026-09-19T14:54:55Z

⏸️ **Context compaction imminent.** The `/develop-task` orchestrator was halted by the PreCompact hook before Claude's context could be summarised.

**State at pause**:

- Skill: `/develop-task`
- Branch: `feature/task.124.pipeline-resume-lifecycle-hygiene`
- Last step boundary: Step 5
- PR: https://github.com/Gamaroff/agent-skills/pull/436
- Tracker: github #424

**Resume**: re-invoke `/develop-task <path>` (same path) and choose **Resume from last completed step** when prompted. Phase 0b will read this report, verify completed-step artifacts, and re-run Step 5.

**Pipeline Progress** for this step is now `⏸️ Paused` — equivalent to `⏳ Pending` for resume purposes (the step will re-run from the start).


# Implementation Report: Resume residue from task.124 — bug-variant base, dispatch population, self-reported delete, who-restores enumeration

**Task**: `task.130.resume-residue-bug-variant-base-and-who-restores.md`
**Run Number**: 1
**Started**: 2026-09-20 07:30
**Status**: In Progress

---

## Summary

Close PR #436's three medium Step 5c findings and the four gate-6 futures, and collapse the who-restores enumeration into one stated rule with citations and a test — first pipeline run for task.130.

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
| Board status        | In Progress ✅ (`already` — card was moved before the CLI ran; priority P1 High left as-is) |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.130.*` exists in git                              | Existing branch reused (at `d2395807`, one commit ahead of `origin/develop` = 62945d68); pushed with tracking; lock written; work-started comment posted; board In Progress | —                    |
| 2. review-task             | ✅ Done    | `task.130.review.{N}.{name}.md` exists (or skip logged)                | Skipped — `Ready for Development` + `task.130.review.1` present (presence rule). Review artefacts committed `8b6e11f6`, pushed | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 1 iteration; 22/22 phases; fast gate green (3542 node + shell suites); eval:develop-task 17/17; all 5 phases mutation-proven | `.summaries/step-3-surface-map.json`, `.summaries/step-3-loop-audit-1.json` |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #441: https://github.com/Gamaroff/agent-skills/pull/441 (OPEN, MERGEABLE); in-review comment `posted`; board `stage-disabled` | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.130.qa.{N}.*.md`; `task.130.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.130.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-09-20

- Phase 0a: task resolved inline from `task.130` → `docs/tasks/task.130.resume-residue-bug-variant-base-and-who-restores/task.130.resume-residue-bug-variant-base-and-who-restores.md` (no Explore subagents dispatched; resolver, tracker poll and lite-mode inputs derived inline).
- Tracker: `TRACKER=github`, `TRACKER_ISSUE=437` (issue OPEN, board status Todo at start).
- Lite-mode inputs (derived from the document, not by impression): `risk_level=medium` (risk_ok=false), `phase_count=5`, `single_module=false` → `PIPELINE_MODE=standard`.
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md (from skills-config.yaml `devLoadAlwaysFiles`; all present on disk).
- Phase 0b: previous-run artefacts detected — local branch `feature/task.130.resume-residue-bug-variant-base-and-who-restores` at develop tip (no upstream, no PR), uncommitted `task.130.review.1` report, task at `Ready for Development`; no implementation report, no lock, no halt snapshot. User chose **Resume — reuse branch & review**: Step 1 reuses the branch and commits the review artefacts; Step 2 skips on `Ready for Development` + report present.
- Upfront questions asked (3): prior-state handling = Resume; Q1 feature branch base = develop; Q2 PR target = develop.
- Feature branch base: develop — the branch already sits at develop's tip (d2395807)
- PR target branch: develop — standard Gitflow for task PRs
- qa-planning gate: skipped (auto — no prompt)
- Task status at start: `Ready for Development` — proceed normally.

### Step 1 — create-branch — 2026-09-20

- `/create-branch` invoked; target branch already existed locally (user's Phase 0b answer = reuse). Verified it contains `origin/develop` (62945d68) and is one commit ahead (`d2395807`, the task.130–132 docs commit). Pushed with `-u` to `origin`.
- Implementation report stashed before `/create-branch`, restored after.
- Lock written at `current_step: 2`.
- GitHub board: work-started → `already` (In Progress). Priority already `P1 High` — P2 default not applied.
- Pipeline-start comment on #437: `posted`.
- Uncommitted task doc/plan/review.1 changes (from the hand-run `/review-task`) are still in the working tree; they will be committed at the Step 2 skip via `/commit-changes`.

### Step 2 — review-task — 2026-09-20

- Gate check: status `Ready for Development`, review report `task.130.review.1.resume-residue-bug-variant-base-and-who-restores.md` present → **Skip** per the develop-task decision table (presence rule; freshness applies only to the `Planned` row).
- The hand-run review's uncommitted artefacts (task doc, plan, review.1) committed via `/commit-changes` as `8b6e11f6` and pushed; implementation report excluded from that commit.

### Step 3 — develop — 2026-09-20

- Fast-gate precondition: `develop.fastGateCommand` unset → default `npm run ci:fast`; script `ci:fast` is defined → OK.
- Pre-develop surface map: 16 files identified across `shared/resources/` (resume contract, detector prompt, step-0/step-8 docs, `advance-pipeline-lock.sh`, `grant-qa-cycles.sh`), the three `develop-*` SKILL.md, `develop-bug-step-3-investigate-fix.md`, three test suites and fixtures 13/16 — Explore subagent, 102 s, summary at `.summaries/step-3-surface-map.json`. Bundled-copy map recorded there (edit sources, `npm run bundle`).
- Plan file found: `task.130.plan.resume-residue-bug-variant-base-and-who-restores.md` — included as implementation context for /develop.
- Always-load files (3) read and passed to /develop.
- Develop loop: MAX_ITER=5, ITER=1.
- Iteration 1 outcome: `/develop` completed all five phases. Loop audit (Explore, 18 s, `.summaries/step-3-loop-audit-1.json`): status `ready-for-review`, 22/22 checkboxes, last commit `8b6e11f6` → EXIT loop.
- Fast gate iteration 1: first run failed on Prettier formatting only (6 new/edited test files) → `prettier --write` → second run exit 0: 3542/3542 node tests, every shell suite green; log removed on success.
- Also run: `npm run eval:develop-task` (17/17 fixtures incl. new 17 and re-recorded 16), `npm run bundle` + `bundle:check` (0 problems, 56 bundled copies refreshed), `check:generated`, `lint:shell` (clean), Step 4b classifier over the four edited docs (one pre-existing finding, detector prompt :69, identical on develop — out of scope).
- **Mutation proofs (all cp-snapshot/restore, baseline green between):**
  - Phase 1 `probe-base-binding.test.mjs`: delete the `**Branch model:**` sed arm → B red (bash+zsh); restore the `develop` default → C, D, F red. ✔
  - Phase 2 `qa-loop-lock-fields-parity.test.mjs`: remove the mark → "develop-bug-step-3 … dispatches without marking the wait"; narrow the regex → "root-cause dispatch line does not match DISPATCH". ✔ (first non-vacuity draft was itself vacuous — the file's triage dispatch already matched — so the check is anchored to the root-cause line.)
  - Phase 3 `stale-snapshot-delete.test.mjs`: drop `rm -f` → A red; widen the select → B red; drop the re-read → C red. ✔ (first extractor keyed on the mutated tokens and went red for the wrong reason — re-keyed on the block's comment line.)
  - Phase 4 `who-restores-single-statement.test.mjs`: remove marker → (i); paste old Phase 0b sentence → (ii) contract; paste develop-bug's token-free sentence → (ii) develop-bug; marker at a second site → (i). ✔
  - Phase 5: grant guard reverted to `$SNAPSHOT` → "guard reads --which candidate" red; step-8 glob loop back → F1 zsh red; sole-candidate guard dropped → F2 red; lint site (1) reverted to `|| {` → A red; `exit` added to site (2) → B red. ✔
- **Plan snippets found wrong by execution and corrected** (recorded in the task's Notes): Phase 3's piped `while` swallowed the HALT's `exit 1` under bash (subshell) → process substitution; Phase 5's "nullglob-guarded" `for f in <path> <glob>` aborts under zsh `nomatch` → `find` count; Phase 1's exit-status-only stderr split would have labelled every PR-less branch a gh failure → reads gh's stderr text.
- Breaking Change 2 required updating three legacy-shaped fixtures in `grant-qa-cycles.test.sh` (they now carry `task_or_story_directory`); the "pre-task.123 accepted" scenarios in both shell suites became refusal scenarios.
- Change Log row appended via `change-log.js` (from `shared/resources/` — the `develop` skill does not bundle it; recurrence appended to observation #125). Task status `ready-for-review`.
- Development completion comment posted to github issue 437 (`posted`).

### Step 4 — create-pr — 2026-09-20

- SCOPE_PATHS: `docs/tasks/task.130.resume-residue-bug-variant-base-and-who-restores/`, `shared/resources/`, `skills/`, `evals/develop-task/step-isolation/`, `evals/shared/tests/`, `CHANGELOG.md`. Pre-flight guard: every untracked path in scope — nothing held.
- `/create-pr --base develop --issue 437 --scope …` → `/commit-changes` (scope mode, 92 files) → `5b71d9cd` `feat(task.130): …`; the implementation report's first commit is here by design. Pushed. Leak check: OK.
- PR body generated by the Explore summariser (88 s) from a diff with bundled copies excluded; unescaped and lightly corrected (the summariser flagged `develop-bug-step-3-investigate-fix.md` as "not in the diff" because the filter hid it — it is in the commit; the body now lists it explicitly).
- PR created: **#441** https://github.com/Gamaroff/agent-skills/pull/441 (base `develop`, `Closes #437`). Post-PR state check (inline `gh pr view`, no subagent): state = OPEN, MERGEABLE. errors = 0.
- in-review comment on #437: `posted`. GitHub board: in-review → `stage-disabled` (no `pipeline.in-review` target in this repo's workflow record — correct outcome; card stays In Progress).
- Lock `pr_url` written.

### Step 5–6 — QA loop — 2026-09-20

- Loop setup: `QA_MAX_CYCLES=5` (no `qa_max_cycles` on the lock). GitHub board QA-start re-assert → `stage-disabled`. Traceability mapper skipped: Success Criteria are checkbox lists (no table).
- Cycle 1 / 5a: `/qa-task code_review_blocking=true` (standard mode). Step 3b reviewer (Explore, 301 s) returned 7 findings; QA reproduced CR-1 and CR-2 by execution and promoted both (CR-2's confidence raised to high by the reproduction). Step 3c QA spot checks one per phase — all `covered`, tree restored. Step 4: `ci:fast` 3542/3542 + shell suites, `eval:develop-task` 17/17, `bundle:check` 0, shellcheck clean. Step 4b: 10 prose files under bash+zsh, 0 findings attributable (unchanged `cat` blocks + step-0's out-of-scope zero-blocks). Gate 1 CONCERNS 85/100; QA report, bugs 1–2, task QA section + Change Log row written; PR comment (with lead) and #437 comment (`qa-gate-1`, `posted`).
- Convergence check: cycle 1 — not evaluated (needs three readings). Route classifier: `continue` (`not-a-pass-gate`). → 5b.
- Cycle 1 / 5b: GitHub board changes-requested → `stage-disabled`. Third-strike: n/a. `/qa-fix gate=…gate.1…`: bugs 1–2 fixed (trailing-flag positional check; fail-closed delete loop — the first draft's `:?` message carried an apostrophe bash parses even inside double quotes, and `jq -e` exits 4 on the ordinary empty result: both found by the tests before commit) plus CR-3..CR-7 one-liners; +9 tests, every fix mutation-proven on its predicted case; adversarial pass corrected the CHANGELOG/task-notes "process substitution" sentence the fix made false. Commit `3479b14a` (report excluded), pushed. ci:fast 3551/3551, eval 17/17, bundle:check 0, shellcheck clean. PR comment (`qa-fix-1`, with lead) and #437 comment `posted`. Bugs 1–2 → Ready for QA.
- Cycle 2 / 5a: `/qa-task` re-review, REFUTE pass (whole branch diff; SAFETY_REPROBE=false — gate 1 security `OK reasoned`). Bugs 1–2 FIXED, re-verified under bash+zsh, 4 QA mutation checks `covered`. Reviewer (Explore, 299 s) returned 8 findings; QA reproduced CR-1 (HIGH — skip-note concern deletes a live snapshot), CR-2 (`rm -f null`, `rm -f unrelated.txt`) and confirmed CR-3/CR-4 by reading. Gate 2 FAIL 70/100; bugs 3–5 filed, bugs 1–2 closed; QA section/Bug Reports/Change Log row; PR + #437 comments `posted` (`qa-gate-2`, blocking_count 1). Lesson recorded: the cycle-1 test B draft contained the skip-note case and was removed as "muddled" — it encoded the HIGH.
- Convergence check: cycle 2 — not evaluated (needs three readings; HIGH sequence so far [0, 1]). Route classifier: `continue`. → 5b.
- Cycle 2 / 5b: changes-requested → `stage-disabled`; third-strike n/a (2 gates). `/qa-fix gate=…gate.2…`: bug 3 exact-label selector + detector prompt names the label; bug 4 string-path check + canonical-path containment; bug 5 schema block binds `DETECTOR_JSON`, owns the array check, delete gated on validation; CR-5..CR-8 applied. stale-snapshot-delete +H/I/J/K (23/23); mutations H/I/J/K each red on its own case. Adversarial pass: task Notes annotate the Phase 3 checklist's original `startswith` wording; test header reworded. Commit `fdba78d9` (report excluded), pushed; ci:fast 3561/3561, eval 17/17, bundle 0, shellcheck clean. PR + #437 comments `posted` (`qa-fix-2`). Bugs 3–5 → Ready for QA. Ingester/pre-fix-mapping dispatches skipped (findings and block authored this session).
- Cycle 3 / 5a: `/qa-task` re-review; SAFETY_REPROBE=true (clause 2: gate-2 HIGH on the selector — a boundary; clause 3: FAIL + "refused" in Success Criteria) → unscoped diff with the re-probe directive (Explore, 507 s, executed the block against 20 inputs). QA: 12-input boundary re-probe, three mutation checks covered, ci:fast 3561, eval 17/17. Gate 3 CONCERNS 80/100; bugs 6–8 filed, 3–5 closed; PR + #437 `posted` (`qa-gate-3`).
- Convergence check: cycle 3, HIGH sequence [0, 1, 0] → HIGH_N=0, precondition unmet → no escalation. Route classifier: `continue`. Third-strike: gate 2's sole HIGH file (`develop-pipeline-resume-contract.md`) appears in one gate only → n/a. → 5b.
- Cycle 3 / 5b: changes-requested → `stage-disabled`; no third strike. `/qa-fix gate=…gate.3…`: bug 6 object-shaped notes + `all(type=="object")` + `select(type=="object")`; bug 7 persist the returned JSON to `.summaries/step-0a-resume-detector.json` and bind from it; bug 8 pass-2 re-reads directory match (HALT) and MERGED state via gh (keep on failed/OPEN); CR-4 pointer, CR-5 validate-all-then-delete, CR-6 provenance-first ranking, CR-7 named kept case. `stale-snapshot-delete.test.mjs` rewritten (31/31, stub gh); advance-pipeline-lock 83/83; glob-safe F2. Seven mutations each red on their own case. Commit `fa3e3fdc` (report excluded), pushed; ci:fast 3569/3569, eval 17/17, bundle 0, shellcheck clean. PR + #437 `posted` (`qa-fix-3`). Bugs 6–8 → Ready for QA.
- Cycle 4 / 5a: `/qa-task` scoped re-review (SAFETY_REPROBE=false on all three clauses). Scope note: `git log --since=<gate 3 updated>` matched nothing (hand-written gate timestamp later than the fix commit's author time) and the empty pathspec widened `git diff` to the whole branch — the non-vacuity guard caught it; scope rebuilt from `git diff --name-only fdba78d9..HEAD` (7 source/test files). Bugs 6–8 FIXED under bash and `zsh -f` (an ad-hoc `zsh -c` check first mis-read the MERGED case: `.zshenv` re-prepended PATH ahead of the stub gh — harness, not code). Reviewer (Explore, 252 s) returned 5; QA reproduced CR-1 (fresh-shell HALT) and CR-3 (`gh pr view ""` → #441). Gate 4 FAIL 70/100; bugs 9–11 filed, 6–8 closed; PR + #437 `posted` (`qa-gate-4`, blocking_count 1).
- Convergence check: HIGH [0, 1, 0, 1] → not tripped (HIGH_3 ≥ HIGH_2 false). Route classifier: `continue`. Third-strike: `develop-pipeline-resume-contract.md` carries the HIGH in gates 2 and 4 but not 3 → not consecutive, no strike; the pre-strike shape (two HIGHs in one pipeline-authored block) is named to qa-fix. → 5b. **Cycle 5 is the last budgeted cycle.**
- qa-fix ingester dispatch skipped: the findings summary was already in context (this orchestrator authored gate 1 the same turn) — independence not at stake for an ingestion step; recorded per §Subagents.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-09-20
**Gate Result**: CONCERNS
**Issues Found**: 2 medium (TASK-130-QA-1 trailing `--which` performs a consuming restore — bug 1; TASK-130-QA-2 stale-snapshot delete loop exits 0 on unset/malformed `DETECTOR_JSON` — bug 2), 3 low advisory (CR-3 step-8 legacy arm on failed jq read; CR-4 `--which` prose on stdout with lock present; CR-5 site (3) not named exempt), 2 cleanups (CR-6 env-seeded `ACCEPT_LEGACY`; CR-7 duplicate usage lines)
**HIGH findings**: 0
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken (`continue`, reason `not-a-pass-gate`; route 2 declined: below-cycle-floor)
**Action**: Running qa-fix (cycle 1 of 5)

### QA Cycle 2 — 2026-09-20
**Gate Result**: FAIL
**Issues Found**: cycle-1 bugs 1–2 verified FIXED (covered). Refute pass: 1 high (TASK-130-QA-3 delete selector `startswith("stale-snapshot")` matches the detector's skip notes → live snapshot deleted on the failure path — bug 3), 2 medium (TASK-130-QA-4 no path containment / `rm -f null` — bug 4; TASK-130-QA-5 `DETECTOR_JSON` never bound in a fence + fallback sentence contradicts the fail-closed block — bug 5), 2 low advisory (CR-5 Step 8 legacy delete vs `--accept-legacy`; CR-6 second exit-1 cause unnamed), 2 cleanups (CR-7 grant header; CR-8 echo `$DIRTY` before HALT)
**HIGH findings**: 1
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken (`continue`)
**Action**: Running qa-fix (cycle 2 of 5)

### QA Cycle 3 — 2026-09-20
**Gate Result**: CONCERNS
**Issues Found**: bugs 3–5 verified FIXED (covered). Safety re-probe (clauses 2+3): 3 medium (TASK-130-QA-6 bare-string note HALTs a healthy resume — bug 6; QA-7 `<detector-output-file>` has no writer — bug 7; QA-8 delete trusts the label without on-disk re-read — bug 8), 3 low (CR-4 stale second schema-check copy in the detector prompt; CR-5 "nothing deleted" untrue with two deltas; CR-6 legacy outranks a matched claim under --accept-legacy), 1 cleanup (CR-7 kept-legacy case silent)
**HIGH findings**: 0
**MEDIUM findings**: 3
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken (`continue`)
**Action**: Running qa-fix (cycle 3 of 5)

### QA Cycle 4 — 2026-09-20
**Gate Result**: FAIL
**Issues Found**: bugs 6–8 verified FIXED (covered). Scoped review: 1 high (TASK-130-QA-9 delete block reads `$DETECTOR_JSON` from the previous fence — fresh shell HALTs — bug 9), 2 medium (QA-10 four bare-string note sites remain in the detector prompt — bug 10; QA-11 empty `pr_url` → `gh pr view ""` reads the current branch — bug 11), 2 cleanups (CR-4 provenance scenario comment/assert; CR-5 field-table mtime fields)
**HIGH findings**: 1
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken (`continue`)
**Action**: Running qa-fix (cycle 4 of 5)

---

## Completion

**Finished**: {populated at end}
**Final Status**: {populated at end}
**Branch**: feature/task.130.resume-residue-bug-variant-base-and-who-restores
**PR**: https://github.com/Gamaroff/agent-skills/pull/441
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}

---

## Pipeline Paused — 2026-09-20T11:04:53Z

⏸️ **Context compaction imminent.** The `/develop-task` orchestrator was halted by the PreCompact hook before Claude's context could be summarised.

**State at pause**:

- Skill: `/develop-task`
- Branch: `feature/task.130.resume-residue-bug-variant-base-and-who-restores`
- Last step boundary: Step 5
- PR: https://github.com/Gamaroff/agent-skills/pull/441
- Tracker: github #437

**Resume**: re-invoke `/develop-task <path>` (same path) and choose **Resume from last completed step** when prompted. Phase 0b will read this report, verify completed-step artifacts, and re-run Step 5.

**Pipeline Progress** for this step is now `⏸️ Paused` — equivalent to `⏳ Pending` for resume purposes (the step will re-run from the start).


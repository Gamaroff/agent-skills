# Implementation Report: Resume residue from task.124 — bug-variant base, dispatch population, self-reported delete, who-restores enumeration

**Task**: `task.130.resume-residue-bug-variant-base-and-who-restores.md`
**Run Number**: 1
**Started**: 2026-09-20 07:30
**Status**: Complete

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
| 5–6. qa-task / qa-fix loop | ✅ Complete (7 cycles: gates 85/70/80/70/85/90/92; loop limit at 5, 2 granted; 5c APPROVE on re-check) | `task.130.qa.{N}.*.md`; `task.130.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ✅ Complete | `task.130.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |
| 8. commit-changes          | ✅ Complete | All artifacts committed and pushed                                     |       | —                    |

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
- Cycle 4 / 5b: changes-requested → `stage-disabled`; no third strike. `/qa-fix gate=…gate.4…`: bug 9 the delete block binds `DETECTOR_FILE` and re-reads the persisted JSON (HALT only on an absent file — rule 6); bug 11 empty `pr_url` → KEPT before any `gh` call; bug 10 + CR-5 the note-object shape stated once in the prompt's field table, four sites + the mtime line rewritten as objects; CR-4 provenance scenario comment corrected and the consume asserted. `stale-snapshot-delete.test.mjs` now carries the JSON by file only (36/36; E absent-file, P two-process, N2 no-pr_url, Q prompt enumeration). Mutations: re-bind → variable guard 32 red incl. E/P; empty-pr_url guard dropped N2 red ×2; bare string restored at :108/:112/:113/:167 → Q red each — Q's first draft (±1-line window) stayed green at :112 because :113 vouched for it, replaced with same-line-object-or-continuation before commit. Commit `b07373df` (report excluded), pushed; ci:fast 3574/3574, eval:develop-task 13/13 (13 is the count on the committed tree too — earlier "17" was the fixture count), bundle 0, shellcheck clean. PR + #437 `posted` (`qa-fix-4`; re-run `already`). Bugs 9–11 → Ready for QA.
- Context compaction fired during 5b: the PreCompact hook wrote `last-halt.json` (`pause_reason: precompact`, `qa_phase: 5b`) and removed the lock; restored with `advance-pipeline-lock.sh --restore <dir>` (snapshot consumed), then `set-qa-phase.sh 5a`.
- Cycle 5 / 5a: `/qa-task` — SAFETY_REPROBE=true by clause 3 (gate 4 FAIL + "refused" in § 9 Success Criteria; clause 1 `CONCERNS reasoned` OK; clause 2 no boundary HIGH) → unscoped re-probe with the directive (Explore, 702 s, executed the three blocks against 27 inputs). QA: bugs 9–11 re-verified from two processes under both shells; 15-input boundary re-probe; four mutations re-run; Step 4b 0 attributable (detector :80 zsh nomatch is pre-existing — follow-up); ci:fast 3574, eval 13/13. Gate 5 CONCERNS 85/100; bug 12 filed (CR-1 confirmed by grep at all three sites), bugs 9–11 closed; CR-4 refuted by execution; CR-3 left advisory (prompt-reading finding, no executed reproduction). PR + #437 `posted` (`qa-gate-5`).
- Convergence check: cycle 5, HIGH sequence [0, 1, 0, 1, 0] → HIGH_N=0, precondition unmet → no escalation. Route classifier: `continue` (`not-a-pass-gate`; route 2 declined `high-findings-remain`). Third-strike: no HIGH in gate 5 → n/a. → 5b (cycle 5 of 5 — the last budgeted cycle; after 5b the budget rule decides).
- Cycle 5 / 5b: `/qa-fix gate=…gate.5…`: bug 12 — exact label at the three orchestrator citations; test D reads the citation content (prefix restored → D red; description dropped → D red). Commit `a9bccb13` (report excluded), pushed; ci:fast 3574, eval 13/13, bundle 0, shellcheck clean. PR + #437 `posted` (`qa-fix-5`). Bug 12 → Ready for QA.
- Loop Escalation (loop limit): route 2c asked with `budgetSpent: true` → `continue` (`high-findings-seen`). Escalation entry written; report committed `b40f44d4`; lock snapshotted (`halt_reason: loop-limit`, step 5) and removed; `blocked` stage skipped (`TRACKER=github`). HALT surfaced with the four options.
- Re-entry after a QA loop escalation (operator, same session): "Resume at 5a with 2 more cycles" → `grant-qa-cycles.sh <dir> 2 <report>`: base reconstructed as max(5 gates on disk, 5 entries) = 5; `extra_cycles_granted: 2`, `qa_max_cycles: 7`, `qa_phase: 5a`; lock restored from the halt snapshot (consumed). Cycle 6 is 5a over `a9bccb13`.
- Cycle 6 / 5a: `/qa-task` scoped re-review (SAFETY_REPROBE=false on all three clauses; scope from `b07373df..HEAD`: 4 files, 72 lines; Explore, 120 s). QA: bug 12 re-verified (0 prefix hits; D red under prefix-restored, wrong-exact-label and "carries the prefix" mutations); Step 4b n/a (no runnable prose in the diff). Gate 6 CONCERNS 90/100, `top_issues: []`; bug 12 closed; PR + #437 `posted` (`qa-gate-6`). Arm: CONCERNS with no open entry → §5c route 3 → commit gate/QA artefacts (path 1), `set-qa-phase.sh 5c`, `/review-pr`.
- Step 5c: `/review-pr 441 --effort medium --comment` — two lenses (code 291 s; conformance 165 s) over the whole-branch diff with bundled references excluded except the authored develop-bug step-3 file (named in the PR body and Files Summary). CI 5/5 SUCCESS on `bd3fac0b`. Verdict CONCERNS: PC-2 confirmed by `git show 3479b14a` (six Change Log rows lost at `fdba78d9`) and restored in place; PC-3 confirmed (`d2395807` is on this branch only) and accepted; CR-1 confirmed at `advance-pipeline-lock.sh:251` (rebuild never stamps the directory). Summary comment posted (marker `<!-- agent-skills-pr-review -->`). Contract says CONCERNS → Step 7; the operator was asked and chose to spend the remaining granted cycle on CR-1.
- Cycle 7 / 5b: `qa_phase 5b`; bug 13 filed from CR-1; fix — the rebuild jq fills `.task_or_story_directory` from `<doc-dir>` when absent (never overwrites); +3 scenarios per shell (stamped; a snapshot of the rebuilt lock restores again WITHOUT the flag; a matched candidate keeps its own); mutation: stamp removed → 4 red; 91/91; hooks row updated. Commit `8b4c0e60` (report excluded), pushed; ci:fast 3574, eval 13/13, bundle 0, shellcheck clean. PR + #437 `posted` (`qa-fix-7`). Bug 13 → Ready for QA. → 5a (cycle 7 = last budgeted; the fix has a gate this time).
- Cycle 7 / 5a: `/qa-task` scoped re-review (SAFETY_REPROBE=false; scope `bd3fac0b..HEAD`: 3 files, 71 lines; Explore 222 s). QA: bug 13 re-verified end to end under both shells (stamped lock; flag-less second restore; other document refused, kept; jq fill on null/""/false); CR-1 vacuity confirmed by mutation (unconditional overwrite → 91/91 green). Gate 7 PASS 92/100 with one open LOW. Route classifier: `cosmetic-residue` (PASS; HIGH 0 for gates 6, 7; lowIds [TASK-130-QA-14]) → QA-14 stamped closed / carried to `recommendations.future`; Deferred Work recorded on the task; no 5b; bug 13 closed; PR + #437 `posted` (`qa-gate-7`). → commit gate/QA artefacts (path 1), `qa_phase 5c`, `/review-pr` re-check.
- Step 5c re-check: conformance lens re-run over the moved trail (261 s); the 71-line code delta since the first pass was gate 7's own scoped lens, so no third read. Four LOWs → APPROVE by the table. PC-2 verified (`8b4c0e60` authored 13:12Z, gate 7 stamped 12:58Z — the cycle-4 `--since` class) → corrected to 13:20Z; PC-3 → CR-2/CR-3 added to Deferred Work; PC-4 → CHANGELOG clause; PC-1 → Completion at Step 7. Report § Re-check appended; PR comment updated in place (marker found, PATCH). `advance-pipeline-lock.sh 7` → Step 7 `/finalise`.
- Step 7 `/finalise` (lite): four parallel DoD agents (AC 151 s, security 84 s, compliance 26 s, docs 70 s). AC 11/11 (AC11 closed by writing the task.124 closure list into § Completion); docs PASS; compliance N/A; security checks PASS but probe mode `unverifiable` — both boundaries are shell, `security-probe.mjs` imports only ES modules, `totals.executed: 0` (`.claude/state/task.130.dod.1.security.run.json`). Decision matrix reads that axis FAIL; the operator was asked and accepted on the recorded executed evidence (74 QA inputs, gates 3/5/7), recorded as unverified-by-engine everywhere it is cited. `CI reading 1: SUCCESS @ d4d29bb4c9b1 over 5 checks; CI reading 2: SUCCESS @ 66b9487d0d93 over 5 checks after 120s`. Acceptance commit `66b9487d` (doc `accepted` 1.2, dod.1, sprint review, registry `ticked`), pushed; tracked-and-pushed assertions held; PR head == acceptance head. Side-effects after the boundary: canonical PR comment posted (marker); #437 document link → `develop` (`performed`); `done` comment `posted`; close `performed`, state CLOSED verified; board `done` → `already`. 6d CHANGELOG cites task 130. Registry tick `ticked`.
- Step 8 `/commit-changes --complete`: the implementation report is the only uncommitted artefact (the acceptance artefacts rode in `66b9487d`); `docs(task.130): implementation report — pipeline complete`, pushed; lock removed by the terminal cooperation call; `.summaries/` and transient state left gitignored. Residue this leaves unverified by a second CI reading: this docs-only commit — `develop-next` re-verifies the final head before merge.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

### QA Loop Limit Reached — 2026-09-20

The pipeline completed 5 qa-task/qa-fix cycles without a clean PASS.

**Final gate status**: CONCERNS (85/100) — gate 5, read against `b07373df`; cycle 5's fix `a9bccb13` is on the head and **no gate has read it**.
**HIGH findings per cycle**: 0, 1, 0, 1, 0 — alternating, never flat; 0 on the final gate. MEDIUM: 2, 2, 3, 2, 1 — falling over the last three gates.
**Remaining issues** (from final gate file):
- TASK-130-QA-12 — medium — `skills/develop-task/SKILL.md` (and develop-story, develop-bug): the three Step 0a citations described the delete label as a prefix while the selector is exact equality. **Fixed in cycle 5's 5b (`a9bccb13`, bug 12 Ready for QA, mutation-proven both ways) — awaiting a gate.**
- Advisory, not gating (gate 5 `code_review.advisory`): CR-2 conditional main clause at the four `--restore` citation sites; CR-3 the detector prompt's Step 1 candidate selection is a second derivation of `choose_candidate()` (silent on a legacy candidate; mtime-only ranking); CR-5 silent skip of an unrecognised `stale-snapshot`-prefixed label; CR-6 the lint rc=2 arm names the call site for three distinct causes at four sites; CR-7 `{doc-directory}` unquoted at four substitution sites; detector prompt `:80` `ls … .pausing.*` never runs under zsh `nomatch` (pre-existing on develop). CR-4 was refuted by execution.

**What was attempted per cycle**:
- Cycle 1 (gate CONCERNS 85 → `3479b14a`): bug 1 trailing `--which` is a usage error, not a consuming restore; bug 2 the delete loop fails closed (materialised list, jq exit read, here-string loop).
- Cycle 2 (gate FAIL 70, refute pass → `fdba78d9`): bug 3 exact-label selector (the prefix matched the skip notes); bug 4 path containment; bug 5 one `DETECTOR_JSON` binding gated on validation.
- Cycle 3 (gate CONCERNS 80, safety re-probe → `fa3e3fdc`): bug 6 object-shaped notes + `all(type=="object")`; bug 7 persist the returned detector JSON to `.summaries/step-0a-resume-detector.json`; bug 8 on-disk re-read of directory match and MERGED before `rm`; CR-4..CR-7.
- Cycle 4 (gate FAIL 70, scoped → `b07373df`): bug 9 the delete block re-binds from the persisted file (every orchestrator Bash call is a fresh shell); bug 10 the note-object shape stated once, four prompt sites rewritten; bug 11 empty `pr_url` kept before any `gh` call; CR-4/CR-5. A context compaction fired mid-5b; the lock was restored from the precompact snapshot.
- Cycle 5 (gate CONCERNS 85, safety re-probe → `a9bccb13`): bug 12 exact label at the three orchestrator citations; test D reads the citation's content. Gate-the-last-fix half-cycle (route 2c) **declined — `high-findings-seen`**: HIGH was not 0 throughout (0, 1, 0, 1, 0), so the loop escalates with its evidence rather than being granted a half-cycle.

**Likely root cause**: not an architectural mismatch — every cycle's HIGH was a defect found *by executing* prose that had only been read (a subshell swallowing `exit`, a prefix matching a skip note, a variable that does not survive a fence boundary), each fixed in one cycle and none recurring. The loop alternated 0/1 because each fix cycle changed a boundary whose new inputs the next unscoped re-probe then enumerated; the last two findings (bugs 11, 12) are of steadily smaller consequence (a keep-not-delete on an edge input; a description wider than the selector). The run ended on a fix, which is the shape the route-2c half-cycle exists for, but the HIGH history disqualifies it by rule.

**Recommended next steps**:
1. Re-run `/develop-task task.130` and accept **"Resume at 5a with 1 more cycle"** — one gate over `a9bccb13` (a one-finding, mutation-proven fix) is what remains between this run and 5c; the grant re-enters through `grant-qa-cycles.sh`, which restores the lock from the halt snapshot.
2. If the grant is declined: verify bug 12 by hand (`grep -rn -F 'starts \`stale-snapshot\`' skills/develop-*/SKILL.md` → 0; test D green), then `/qa-task` standalone → `/review-pr` → `/finalise`.
3. File the advisories (CR-2, CR-3, CR-5, CR-6, CR-7, detector `:80` zsh glob) as a follow-up task rather than a sixth cycle — none gates, and two are enumeration gaps worth their own test.

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
**Action**: qa-fix complete (cycle 4 of 5) — `b07373df`; bugs 9–11 Ready for QA → cycle 5 (last budgeted cycle)

---

### QA Cycle 5 — 2026-09-20
**Gate Result**: CONCERNS
**Issues Found**: bugs 9–11 verified FIXED (covered; two-process re-verification under both shells). Safety re-probe (clause 3): 0 high, 1 medium (TASK-130-QA-12 the three orchestrator citations describe the delete label as a prefix while the selector is exact equality — bug 12), 6 advisory (CR-2, CR-3 medium-confidence judgement items; CR-4 refuted by execution; CR-5..CR-7 cleanups)
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken (`continue`)
**Action**: Escalating — loop limit reached

---

### QA Cycle 6 — 2026-09-20
**Gate Result**: CONCERNS (no open entry)
**Issues Found**: bug 12 verified FIXED (covered — D red under three QA mutations). Scoped review of `a9bccb13` (4 files, 72 lines): 0 high, 0 medium, 1 cleanup (CR-1 test D negative regex — advisory). Gate-5 advisories carried on the maintainability axis for a follow-up task. Granted cycle (extra_cycles_granted 2, qa_max_cycles 7).
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: CONCERNS — `task.130.pr-review.1.…md` (PC-2 six Change Log rows dropped → restored; PC-3 task.131/132 docs from d2395807 → accepted; PC-1 low; CR-1 `--accept-legacy` restore never stamped the directory → bug 13; CR-2/CR-3 cleanups)
**Loop exit**: n/a — this exit not taken (§5c route 3 reached 5c; verdict CONCERNS; operator elected to spend the last granted cycle on CR-1 rather than proceed)
**Action**: Running qa-fix (cycle 7 of 7)

---

### QA Cycle 7 — 2026-09-20
**Gate Result**: PASS
**Issues Found**: bug 13 verified FIXED (covered — end to end under both shells; stamp mutation → 4 red). Scoped review of `8b4c0e60` (3 files, 71 lines): 0 high, 0 medium, 1 low (TASK-130-QA-14 the new no-overwrite scenario is vacuous — QA mutation-confirmed), 1 cleanup (CR-2 header contract mirrors). Granted cycle 2 of 2 (budget 7).
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: APPROVE — re-check after cycle 7 (`task.130.pr-review.1.…md` § Re-check): four LOW conformance items (PC-1 closure list → finalise; PC-2 gate-7 timestamp corrected; PC-3 CR-2/CR-3 added to Deferred Work; PC-4 CHANGELOG stamp clause added); CI 5/5 on `0eccf859`
**Loop exit**: Cosmetic-residue exit taken — PASS gate at cycle 7 with HIGH 0 for cycles 6 and 7; all 1 open findings are LOW and are carried to the gate's recommendations.future by id (TASK-130-QA-14). This is a CLEAN exit, not a stall: nothing is blocked and nothing is being accepted over; a full qa-fix cycle for cosmetic findings is what this route exists to avoid.
**Action**: Proceeding to 5c (PR conformance review)

---

## Completion

**Finished**: 2026-09-20 (acceptance commit `66b9487d`)
**Final Status**: ✅ Accepted — task `status: accepted` v1.2; #437 closed; PR #441 ready to merge
**Branch**: feature/task.130.resume-residue-bug-variant-base-and-who-restores
**PR**: https://github.com/Gamaroff/agent-skills/pull/441
**QA Iterations**: 7 (gates 85 · 70 · 80 · 70 · 85 · 90 · 92; loop limit at 5, two granted; 13 bugs closed; 5c CONCERNS → APPROVE)
**DoD Summary**: `task.130.dod.1.resume-residue-bug-variant-base-and-who-restores.md` — ACCEPTED; security probe unverified-by-engine (shell boundary), accepted by the operator on QA-executed evidence
**Tracker debt**: none — every stage call resolved (`stage-disabled` throughout the loop by board design; `done` → `already`); no deferred mutations

### Closure of the task.124 residue (5c PC-1)

| Origin | Finding | Closed by |
| --- | --- | --- |
| task.124.pr-review.1 CR-1 | probe base fallback greps a `\| Feature branch base \|` row the bug-variant report never carries | Phase 1 — contract Phase 1 block gains the `**Branch model:**` sed arm and HALTs on neither (`5b71d9cd`); `probe-base-binding.test.mjs`, eval fixture 17 |
| task.124.pr-review.1 CR-2 | develop-bug Step 3 root-cause Explore dispatch outside the `waiting_on` population | Phase 2 — dispatch marked in `develop-bug-step-3-investigate-fix.md`; `qa-loop-lock-fields-parity` DISPATCH regex widened, floor 17 (`5b71d9cd`) |
| task.124.pr-review.1 CR-3 | detector self-reports an `rm -f` it may not perform | Phase 3 — detector read-only; the delete is the orchestrator's, stated once in contract § Consume Output, verified on disk (`5b71d9cd` → hardened through QA cycles 1–5: `3479b14a`, `fdba78d9`, `fa3e3fdc`, `b07373df`, `a9bccb13`) |
| task.124.pr-review.1 CR-4 | grant's never-lower guard reads `$SNAPSHOT`, not the candidate `--restore` will pick | Phase 5 — `advance-pipeline-lock.sh --restore --which`; `grant-qa-cycles.sh` guard reads the named candidate (`5b71d9cd`; cycle 1 `3479b14a` trailing `--which` usage error) |
| task.124.pr-review.1 CR-5 | Step 8 keeps a directory-less snapshot that `--restore` would accept | Phase 5 — legacy snapshot refused without `--accept-legacy`; Step 8 deletes a sole legacy snapshot counted with `find` (`5b71d9cd`; 5c CR-1 stamp `8b4c0e60`) |
| task.124 gate-6 future 1 | probe fallback stderr line says "no PR" when `gh` may have failed | Phase 5 — the split reads gh's stderr for `no pull requests found` (`5b71d9cd`) |
| task.124 gate-6 future 2 | five who-restores statements | Phase 4 — one marked statement in the contract, citations elsewhere, `who-restores-single-statement.test.mjs` (`5b71d9cd`) |
| task.124 gate-6 future 3 | step-0 Step 4b reports zero executed blocks (template-slot blocks) | Out of scope — unchanged, pre-existing on develop (task doc § Notes) |
| task.124 gate-6 future 4 | carried cycle-1 CR-5 (guard vs chosen candidate) and CR-7 (inline lint exit-code split) | Phase 5 — CR-5 as CR-4 above; the lint rc split at the four call sites, `report-lint-call-sites.test.mjs` (`5b71d9cd`) |

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


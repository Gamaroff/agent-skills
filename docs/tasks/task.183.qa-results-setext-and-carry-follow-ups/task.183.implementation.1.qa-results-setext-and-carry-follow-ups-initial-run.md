# Implementation Report: [Task 183] qa-results setext and carry follow-ups

**Task**: `task.183.qa-results-setext-and-carry-follow-ups.md`
**Run Number**: 1
**Started**: 2026-10-05 11:10
**Status**: Escalated

---

## Summary

Close task.171's five Deferred Work items in `shared/resources/qa-results.js` (CR5-1 setext deletion first, then CR-7, 5c CR-1, 5c CR-2, CR2-4) and make the corpus write survey cheaper with a load-qualified timing bound.

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
| Board status        | work-started → transitioned ✅ (issue #569)                                 |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.183.*` exists in git                              | Branch created at `64b879c0` | —                    |
| 2. review-task             | ✅ Done    | `task.183.review.{N}.{name}.md` exists (or skip logged)                | review.1 — READY TO IMPLEMENT 9/10; Planned → Ready for Development | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline (plan + surface map); 1 iteration; loop audit ready-for-review 16/16 | `.summaries/step-3-test-triage-1.json` |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #571: https://github.com/Gamaroff/agent-skills/pull/571 | —                    |
| 5–6. qa-task / qa-fix loop | ⚠️ Needs Attention | `task.183.qa.{N}.*.md`; `task.183.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | Escalated at cycle 3, re-entered (+2), escalated again at cycle 4 — HIGH 1, 1, 2, 2; see Issues Log | `.summaries/step-5-fast-gate-triage-1.json` |
| 7. finalise                | ⏳ Pending | `task.183.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-10-05

- Dispatched by `/develop-next` (registry fallback — task-registry, T183). AUTONOMOUS RUN directive in force.
- Phase 0 run inline (path supplied directly; no Explore fan-out). Lite-mode inputs derived from the document: risk_level absent, phase_count 5, single_module true → PIPELINE_MODE = standard (phase_count ≥ 3).
- Always-load files resolved: 3 files — from `skills-config.yaml` `devLoadAlwaysFiles`.
- Status `planned` → proceed; Step 2 `/review-task` validates and promotes.
- Upfront Setup (2 questions, auto-answered per develop-next directive): Q1 feature branch base = `develop` (Recommended, on `develop`); Q2 PR target = `develop` (Recommended).
- qa-planning gate: skipped (auto — no prompt)
- Tracker: GitHub, issue #569.
- Branch: `feature/task.183.qa-results-setext-and-carry-follow-ups` from `develop` @ `64b879c0`, pushed with tracking. Report stashed before branch creation, restored after.
- Pipeline-start comment: `posted`. GitHub board: work-started → transitioned. Priority P2 default not applied (task carries `priority: High`; the block only fills an unset field).

### Step 2 — review-task

- review-task ran (status Planned, no prior report). Output: Comprehensive report (pipeline default). Branch setup auto-skipped (already on `feature/task.183.*`).
- Pre-pass: B `aligned` (axes from `prepass-axes.js`, source `architecture`); C `not-implemented`. Both Explore agents returned in ~25 s.
- Question points: none asked (autonomous run); both Important fixes taken in the task's own stated direction (toward refusal).
- Step 8.5 auto-answered: Yes, apply all critical + important fixes. Applied: I1 (HTML-comment context bounded to a closing `-->`), I2 (Phase 3 header exclusion), O1 (CR5-1 figure). Step 9 auto-answered: Yes, fixes complete → Ready for Development.
- Review report: `task.183.review.1.qa-results-setext-and-carry-follow-ups.md`. Tracker: review-task comment `posted`; pipeline review comment `posted`. Board Priority self-healed to P1. TRACKER_ISSUE unchanged (569) — no re-fire needed.

### Step 3 — develop

- Pre-develop surface map: 18 files identified in shared/resources (qa-results.js, change-log.js), shared/resources/tests, tests/ (corpus, step12 wiring, deferred-work placement, create-bug-report heading), skills/qa-task + skills/qa-story (bundled copies, Step 12 writers), CHANGELOG.md, task.171. New tests go after block Q (ends :1086).
- Plan file found: docs/tasks/task.183.qa-results-setext-and-carry-follow-ups/task.183.plan.qa-results-setext-and-carry-follow-ups.md — included as implementation context for /develop
- Fast-gate precondition: `develop.fastGateCommand` unset → suggested `npm run ci:fast`, which this project defines. Resolves.
- Always-load files read: coding-standards.md, tech-stack.md, source-tree.md.
- Step 3 inline — /develop not invoked: plan names every hunk (five clause-level edits plus tests) and the surface map is recorded; /develop would only re-read it.
- Phases 1–4 in `shared/resources/qa-results.js`: `notParagraph()` replaces `RE_NOT_PARAGRAPH` (CR5-1); `blockContinuations()` exempts a list continuation line and a comment-closing line, bounded per review I1 (CR-7); `hasDateColumn()` makes any table with a `Date` column a log table under `underLog`, header excluded by the same test (5c CR-1, review I2/O2); bold-label blocks stop at `#{1,3}` and at `QA_LABELS` (5c CR-2, CR2-4). Phase 5: corpus write-survey pre-filter.
- Corpus write survey after Phases 1–4 (before tests were added): 0 false refusals / 0 deletions / 0 non-idempotent — the existing survey test passed unchanged (101/101 across engine, corpus, wiring, placement, create-bug-report heading suites).
- Tests R1–R4 added after block Q in `shared/resources/tests/qa-results.test.mjs` (85/85 pass).
- Mutation proofs (snapshot `cp`, one-line split/join edit asserting count 1 and a changed file, full engine suite, restore verified with `cmp`): M1 `notParagraph` → old exemption: R1 (+R2) red — HELD · M2 drop the block exemption: R2 red — HELD · M2b comment exempts every line while open: R2 red — HELD · M2c any ordered item opens a continuation: R2 red — HELD · M3 `Date` first cell only: R3 red — HELD · M3b header excluded by `RE_LOG_HEADER`: O1 + R3 red — HELD · M3c blind `slice(1, -1)`: R3 red — HELD · M4 bold block stops at any heading: R4 red — HELD · M4b no `QA_LABELS` stop: R4 red — HELD. 9/9 held.
- Timing (`/usr/bin/time -p node --test shared/resources/tests/qa-results.test.mjs tests/qa-results-corpus.test.js tests/qa-results-step12-wiring.test.js`, 16 cores): with the pre-filter 1.95 s, 2.01 s, 2.10 s at `uptime` load averages 6.71/50.45/43.51 → 6.89/49.76/43.30; without the pre-filter (stashed) 2.70 s at 6.89/49.76/43.30. The 2 s bound is **not met** under this load (one of three runs under it); re-measure at finalise and record the load beside it.
- task.171 `## Deferred Work`: all five items marked ✅ resolved with a link to task.183 (5c CR-1 notes the operator-decided Date-column rule); one Change Log row added. CHANGELOG `[Unreleased]` › Fixed entry `(task 183)`. `npm run bundle` → qa-task and qa-story copies regenerated; `bundle:check` 129 skills, 0 problems; `validate` qa-task ✓ qa-story ✓.
- Fast gate iteration 1: failed on `prettier --check` (qa-results.js, qa-results.test.mjs) → formatted with prettier, rebundled, re-run.
- Fast gate re-run: 5301/5304 pass. 2 failures triaged `flaky` (Explore, `.summaries/step-3-test-triage-1.json`): `tests/bundle-missing-source.test.js` and `tests/test-clean-checkout.test.js` per-file 10 s budgets (16.2 s, 31.4 s), both self-labelled LOAD-SENSITIVE; every subtest in them passes; neither file is touched by this branch. Re-run alone at load average 244: still over budget (36.4 s, 15.5 s) — the machine, not the change. Accepted for Step 3; the merge gate (`npm run ci`) re-runs them.
- Loop audit iter 1: `ready-for-review`, 16/16, HEAD `64b879c0` (nothing committed yet — Step 4 commits). Change Log row written by the inline path (one row).
- Development completion comment posted to github issue 569.

### Step 4 — create-pr

- SCOPE_PATHS: work-item dir, CHANGELOG.md, task.171 dir, shared/resources, shared/resources/tests, skills/qa-story/references, skills/qa-task/references, tests. No out-of-scope untracked files to hold.
- Commits (via /commit-changes, scoped): `1b8a5b35` fix(qa-results) — engine, tests, bundled copies, corpus pre-filter, CHANGELOG, task.171; `41070fcb` docs(task.183) — review 1, task status, implementation report. Pre-commit bundle: all skills in sync.
- PR created: https://github.com/Gamaroff/agent-skills/pull/571 (base `develop`, `Closes #569`). PR body written by the orchestrator from this report rather than the diff-summariser subagent — the report already holds the measured facts the body cites.
- Leak check: none. Issue #569 in-review comment `posted`. GitHub board: in-review → stage-disabled. Post-PR state: OPEN (checked with `gh pr view` directly, not the poller subagent).
- Lock `pr_url` set. A first post-PR command was refused by a Claude Code safety check (a `bash -c` script containing `rm`); nothing ran; re-issued without the wrapper and without the `rm` (its target, `step4-hold-dir.txt`, never existed).

### Re-entry after escalation — 2026-10-05

- Operator ("go ahead") approved the escalation's recommended option 1 and "Resume at 5a with 2 more cycles".
- Fix applied outside the loop as the operator's change, commit `59cd6d95`: comment-closer exemption dropped from `blockContinuations` (CR3-1 class); marker-less `underTablelessLog` back to the Date-first table test (CR3-2); `logAbove` keeps any Date column (inside a marker block `underLog` is always set, so it can only refuse; Date-first there reopened cycle-1 CR-1). Tests R2/R3 extended; 17/17 mutation proofs held; qa-results suites 105/105; fast gate 5301/5304 (the two LOAD-SENSITIVE budgets only, load 4). task.183 § 1, § 3, § 5, Phase 2 and § 9 amended to the CR-7 list shape only, with a Change Log row; plan, CHANGELOG, task.171 note updated.
- QA loop re-entry: 2 extra cycles granted; 0 cycle(s) run outside the loop back-filled from disk. `grant-qa-cycles.sh`: lock restored from the halt snapshot, QA_CYCLE=3, `qa_max_cycles=5`, `qa_phase: 5a`.
- Resume detector subagent not dispatched: the halt, its snapshot and every artifact were written in this same session, and `grant-qa-cycles.sh` reconstructs the cycle count from the gates on disk.

### QA Cycle 4 — 2026-10-05
**Gate Result**: FAIL
**Issues Found**: 3 gating — CR4-1 (HIGH, a list context opened inside an HTML block deletes a setext section), CR4-2 (HIGH, a tab after the list marker deletes a setext section), CR4-3 (MEDIUM, `QA_LABELS` drops a bug list grouped under `**Critical Issues**`); CR4-4, CR4-5 → future. Cycle 3's CR3-1 and CR3-2 FIXED by the operator's escalation fix.
**HIGH findings**: 2
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Escalating — loop not converging

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

### QA Loop Not Converging — 2026-10-05 (second escalation)

The pipeline stopped after 4 qa-task cycles (3 qa-fix rounds, one of them the operator's): the HIGH
finding count failed to strictly decrease across two consecutive cycles, so the loop was no longer
converging. The remaining findings are NOT accepted — they are handed over below.

**Final gate status**: FAIL (gate 4, 50/100, head `59cd6d95`)
**HIGH findings per cycle**: 1, 1, 2, 2 — flat from cycle 3 onward
**Remaining issues** (from final gate file):
- CR4-1 — HIGH — `shared/resources/qa-results.js` — a list context opens on an item line inside an HTML block that also closes it (`<!--` / `- note -->`, `<pre>` / `- x </pre>`), so the next indented paragraph line is exempted and the setext section under it deleted. `origin/develop` refuses.
- CR4-2 — HIGH — `shared/resources/qa-results.js` — a tab after the list marker counts as one column; `-<TAB># Heading` / `  Real Section` / `---` deletes a section `origin/develop` refuses.
- CR4-3 — MEDIUM — `shared/resources/qa-results.js` — `QA_LABELS` ends a bold carried block at `**Critical Issues**` / `**Issues Found**` even over a list, so a grouped bug list loses its links.
- Carried to `recommendations.future`: CR4-4 (stale QA `####` carried, duplicate only), CR4-5 (doc wording), CR2-3 (pre-existing inner-colon carried label).

**What was attempted per cycle**:
- Cycle 1 (gate 1, HIGH 1): thematic-break reset, split log-header reach, inner-colon QA label. `dd91fe76`.
- Cycle 2 (gate 2, HIGH 1): fence reset + `-->`-alone closer; one `lastTableStart` predicate + `dateFirstAt` cut + header-only rule. `8df4559d`.
- Cycle 3 (gate 3, HIGH 2): first escalation. Operator fix `59cd6d95`: comment-closer exemption removed; marker-less table-above back to Date-first. 2 cycles granted.
- Cycle 4 (gate 4, HIGH 2): no fix — the convergence check tripped before 5b.

**Likely root cause**: the same one as the first escalation, now shown for the list path too. `blockContinuations` infers CommonMark block structure line by line with no parser, and every exemption it grants is a route to the unsafe outcome: the list context has now been beaten four times (a thematic break, a fence, an HTML block, a tab). The comment exemption went the same way and was removed. The rest of the change is holding: the `notParagraph` refusal (CR5-1), the Date-column log rules (5c CR-1, CR3-2 closed) and the bold-label `####` groups (5c CR-2). The one bold-label regression, CR4-3, comes from two `QA_LABELS` names that no QA render emits. The tracked corpus is unaffected: the cycle-4 reviewer's differential run over about 1M generated documents found these shapes only, and no tracked document changes output.

**Recommended next steps**:
1. **Remove `blockContinuations` entirely.** The setext check becomes `origin/develop`'s check with the narrower `notParagraph` exemption (CR5-1 stays closed). The CR-7 list shape goes back to a safe false refusal, so CR-7 moves to a follow-up task that needs a real CommonMark parser.
2. **Drop `Critical Issues` and `Issues Found` from `QA_LABELS`**, keeping `Recommendations`, `Key Findings` and `Next Steps`, and add the grouped bug list to R4. This closes CR4-3.
3. Amend task.183 § 1, § 3, § 9 Functional 2 and the CHANGELOG to "CR-7 deferred", then resume with the 1 remaining granted cycle (cycle 5) — or grant 1 more.

### QA Loop Not Converging — 2026-10-05

The pipeline stopped after 3 qa-task/qa-fix cycles: the HIGH finding count failed to strictly
decrease across two consecutive cycles, so the loop was no longer converging. The remaining
findings are NOT accepted — they are handed over below.

**Final gate status**: FAIL (gate 3, 60/100, head `8df4559d`)
**HIGH findings per cycle**: 1, 1, 2 — flat from cycle 1, rising at cycle 3
**Remaining issues** (from final gate file):
- CR3-1 — HIGH — `shared/resources/qa-results.js` — `blockContinuations` looks for `-->` only after the `<!--` opener, so `<!-->` / `<!--->` leave the comment context open, and an opener indented under a list item opens it although the item ends before a column-0 `-->`; a later lone `-->` is exempted and the setext section under it deleted. `origin/develop` refuses all three.
- CR3-2 — HIGH — `shared/resources/qa-results.js` — `underTablelessLog` now asks `lastTableStart` (any Date column), so a marker-less Change Log with `| Reviewer | Date |` above the section reads as having its table, `underLog` is false, and the replace deletes the log row below. `origin/develop` relocated and kept it.
- Carried to `recommendations.future`: CR2-3 (pre-existing inner-colon carried label), CR2-4 (advisory QA `####` carry).

**What was attempted per cycle**:
- Cycle 1 (gate 1, HIGH 1): CR-3 thematic break read as a list item → `RE_BREAK` reset; CR-1 two log-header definitions → split reach (existence any Date column, cut Date-first); CR-4 inner-colon QA label. Commit `dd91fe76`.
- Cycle 2 (gate 2, HIGH 1): CR2-1 fenced `<!--` kept the comment context → fence reset + `-->`-alone closer (move: scope the claim); CR2-2 Version-first log cut at a quoted table / header-only log stripped → one `lastTableStart` predicate + `dateFirstAt` cut + header-only rule (move: consolidate). Commit `8df4559d`.
- Cycle 3 (gate 3, HIGH 2): no fix — the convergence check tripped before 5b.

**Likely root cause**: every HIGH has landed in two mechanisms in `shared/resources/qa-results.js` that this task added to *exempt* lines from the setext refusal or to *widen* what counts as a log: the CR-7 context inference (`blockContinuations`) and the Date-column reach (`hasDateColumn` / `lastTableStart`). Each fix narrowed or consolidated one and exposed another route, because both infer CommonMark block structure line by line without a parser — the approach task.171 QA cycles 2–4 abandoned for fences. The tracked corpus is unaffected (the cycle-3 reviewer compared old and new engines across all 168 tracked QA documents: no output changed); every finding is a constructed shape, but each one deletes content `origin/develop` protected.

**Recommended next steps**:
1. **Drop the comment-closer exemption** and keep only the list-continuation rule (with the break and fence resets). The CR-7 comment shape goes back to a safe false refusal, and the whole CR3-1 class goes with it. Amend task.183 § 9 Functional 2 to name the list shape only.
2. **Return the table-above questions (`underTablelessLog`, `logAbove`) to the Date-first predicate.** Keep `hasDateColumn` only in the dated-row guard and the header-only rule in `removesStructure`. That closes CR3-2 and keeps the CR2-2 shapes refused; verify with R3 plus a CR3-2 regression case.
3. Then re-run `/develop-task` and choose "Resume at 5a with 2 more cycles". If both exemptions are judged not worth their risk, revert Phases 2–3 to task.171's behaviour and move CR-7 and 5c CR-1 to a follow-up task instead.

- **Step 3 — machine load.** Load average 50–244 during the run (16 cores; no single process accounts for it). Two LOAD-SENSITIVE per-file budgets fail in untouched files; the task's own 2 s timing criterion measured 1.95–2.10 s at load ~7/50. Both need re-measuring on a quieter machine — finalise must record the load beside its figure.

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-10-05
**Gate Result**: FAIL
**Issues Found**: 3 — CR-3 (HIGH, a thematic break read as a list item deletes a setext section), CR-1 (MEDIUM, `lastTableStart` keeps the Date-first log header), CR-4 (LOW, inner-colon QA label); CR-2 advisory → recommendations.future
**HIGH findings**: 1
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)

#### qa-fix cycle 1 — 2026-10-05
- QA Cycle 1 — changes-requested: stage-disabled.
- Findings ingester not dispatched: the findings were written by this run's own QA cycle 1 and were already in context (Step 1b inline path; no independence lost that the gate had).
- CR-3 (HIGH) fixed: `blockContinuations` resets on `RE_BREAK` before the item test. CR-1 (MEDIUM) fixed by splitting reach: log *existence* uses `hasDateColumn` (default of `lastTableStart`), the *cut* keeps Date-first `RE_LOG_HEADER`. A one-definition variant was tried first: it relocated the R3 shape (rows kept) instead of refusing it, broke the task's criterion wording, and widened the cut to quoted `| Cycle | Date |` tables — rejected. CR-4 (LOW) fixed: `QA_LABELS` accepts an inner colon. CR-2 advisory, unchanged.
- Tests: R2 +2, R3 +1 shape, R4 +inner colon. Mutation proofs 13/13 held (M5 break, M6 existence, M6b cut, M7 inner colon added).
- Fast gate attempt 1: 5293/5304 at load average ~300 (16 cores) — 10 flaky (8 step-8-completion-checklist spawn timeouts of 126–365 s, 2 LOAD-SENSITIVE budgets); triage `.summaries/step-5-fast-gate-triage-1.json`. Attempt 2: 5301/5304, only the 2 LOAD-SENSITIVE budgets. Re-run alone at load 14: still over budget (14.9 s, 24.9 s); `bundle-missing-source` fails identically on an `origin/develop` worktree (20.4 s). Judged environmental and pre-existing → committed and pushed as green-equivalent rather than as a "fast gate red, not pushed" commit, because no failing file touches this branch.
- Commit `dd91fe76` (fix + gate.1 + qa.1 + task status), pushed once.

### QA Cycle 2 — 2026-10-05
**Gate Result**: FAIL
**Issues Found**: 2 gating — CR2-1 (HIGH, a `<!--` inside a fence keeps the comment context open and a later `-->` line is exempted, deleting a setext section), CR2-2 (MEDIUM, Version-first log still cut at a quoted table / header-only log loses its header); CR2-3 pre-existing and CR2-4 advisory → recommendations.future. Cycle 1: CR-3 and CR-4 FIXED, CR-1 PARTIAL.
**HIGH findings**: 1
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)

#### qa-fix cycle 2 — 2026-10-05
- QA Cycle 2 — changes-requested: stage-disabled. Inline findings path again (gate 2 written by this run).
- Step 2.6 (repeat subject — both findings on code cycle 1 edited): CR2-1 → **scope the claim** (only a `-->`-alone line closes a comment block; a fence line drops both contexts). CR2-2 → **consolidate** (one `lastTableStart` predicate; the cut asks `dateFirstAt` of the same table; header-only Date-column log under a log is structural, mid-span and at EOF).
- Tests: R2 +3 refusal shapes, R3 +4. Mutation proofs 17/17 held; first run had M8 (fence reset) and M11b (EOF header-only) surviving — each read as an untested branch, not dead code: M8 needed a fenced `<!--` then a bare `-->` line, M11b a log at EOF with no trailing newline (reproduced as a header deletion under the mutant). Both shapes added; both held. Stale mutants M2b/M6 refreshed to the new code.
- Fast gate: 5301/5304 at load 18→11 — only the two LOAD-SENSITIVE budgets already shown to fail identically on `origin/develop`. Committed `8df4559d` (fix + gate.2 + qa.2 + task status), pushed once.

### QA Cycle 3 — 2026-10-05
**Gate Result**: FAIL
**Issues Found**: 2 — CR3-1 (HIGH, `<!-->` / `<!--->` one-line openers and an item-indented opener leave the comment context open; a lone `-->` is then exempted and a setext section deleted), CR3-2 (HIGH, the consolidated `lastTableStart` makes a marker-less log holding `| Reviewer | Date |` look as if it has its table, so the replace deletes its log row). Cycle 2 fixes hold for their named shapes.
**HIGH findings**: 2
**MEDIUM findings**: 0
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Escalating — loop not converging

---

## Completion

**Finished**: 2026-10-05 (halted — escalation)
**Final Status**: Escalated
**Branch**: `feature/task.183.qa-results-setext-and-carry-follow-ups`
**PR**: https://github.com/Gamaroff/agent-skills/pull/571
**QA Iterations**: 4 (gates 1–4 FAIL; 2 fix cycles + 1 operator fix)
**DoD Summary**: not reached
**Tracker debt**: none

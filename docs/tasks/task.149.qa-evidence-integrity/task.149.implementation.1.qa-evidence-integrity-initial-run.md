# Implementation Report: [Task 149] QA evidence integrity: qa-task/qa-story claims that no check reads back

**Task**: `task.149.qa-evidence-integrity.md`
**Run Number**: 1
**Started**: 2026-09-26 04:10
**Status**: Halted — finalise DoD gaps (documentation)

---

## Summary

Give each of four unread QA claims (obs #143, #156, #163, #164) a check that executes: `--copy-as` seeding, an export-and-probe decline, standards-named validation commands, and a post-edit link/`updated:` read-back.

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
| Board status        | In Progress ✅ (already; Priority P2 Medium already set)                   |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.149.*` exists in git                              | Branch created at `982cf071` | —                    |
| 2. review-task             | ✅ Done    | `task.149.review.{N}.{name}.md` exists (or skip logged)                | 9/10 READY TO IMPLEMENT; Planned → Ready for Development; 2 Important + 2 Optional fixes applied | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline (plan + surface map); 1 iteration; audit ready-for-review 20/20 | .summaries/step-3-iteration-audit.json |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #493: https://github.com/Gamaroff/agent-skills/pull/493 | —                    |
| 5–6. qa-task / qa-fix loop | ✅ Done | `task.149.qa.{N}.*.md`; `task.149.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | 8 cycles (5 + 3 granted); gate 8 PASS 100; PR review CONCERNS (pr-review.1) | —                    |
| 7. finalise                | ❌ Failed | `task.149.dod.{N}.*.md`; task `status: accepted`                       | DoD gaps: 3 low documentation items (PC-3, PC-4, PC-6); dod.1 written; fix-and-recheck refused | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-09-26

- Invoked by `/develop-next` (roadmap item T149, source `roadmap`) under the AUTONOMOUS RUN directive.
- Feature branch base: develop — auto-answered (Q1, recommended; session on `develop`)
- PR target branch: develop — auto-answered (Q2, recommended)
- Questions asked: 2 (Q1, Q2) — both auto-answered per the develop-next directive; no AskUserQuestion issued.
- qa-planning gate: skipped (auto — no prompt)
- Phase 0 run inline (path given; no resolver needed). Lite-mode inputs derived from the document: risk_level absent, phase_count 5, single_module false → PIPELINE_MODE = standard.
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Task status at start: `planned` — Step 2 `/review-task` validates and promotes.
- Tracker: github, issue #479.
- Branch: `feature/task.149.qa-evidence-integrity` from develop @ `982cf071`, pushed with upstream.
- Tracker work-started comment: posted. GitHub board: work-started → already (In Progress).

### Step 2 — review-task

- review-task invoked (status `planned`, no report); output: Comprehensive report (auto). Step 0a auto-skipped (on `feature/task.149.*`).
- Pre-pass B (architecture): aligned — 1 low (engine tests live in `shared/resources/tests/`, existing convention). Pre-pass C (codebase): not-implemented. Both dispatched in parallel, returned in <20s.
- Question points resolved autonomously (no AskUserQuestion): keep as one task (Open Question 3); apply factual corrections.
- Step 8.5 auto-answered: Yes, apply all critical + important fixes. Step 9 auto-answered: Yes, fixes complete → Planned promoted to Ready for Development by review-task.
- Review report: docs/tasks/task.149.qa-evidence-integrity/task.149.review.1.qa-evidence-integrity.md
- Tracker key unchanged (#479 at Step 1) — no work-started re-fire. review-task and Step 2 outcome comments posted.

### Step 3 — develop

- Pre-develop surface map: 20 files identified in shared/resources (4 engines + tests), skills/qa-task, skills/qa-story, skills/create-task, tests/ — Explore dispatched 04:14 → returned 04:16.
- Plan file found: docs/tasks/task.149.qa-evidence-integrity/task.149.plan.qa-evidence-integrity.md — included as implementation context.
- Always-load files resolved and read: 3 (coding-standards, tech-stack, source-tree).
- Fast gate precondition: `develop.fastGateCommand` unset → `npm run ci:fast`; script resolves.
- Step 3 inline — /develop not invoked: plan file names every hunk and the surface map was recorded; /develop would only re-read the plan (§ Inline implementation).
- Deviations from the plan, each deliberate:
  - `--copy-as` DEST `.` is allowed (resolves to the working dir itself, as the plan's `target !== tmp` check intends); empty / absolute / escaping DEST is refused.
  - The population test's section reader was **moved**, not copied: `sectionOf`/`fenceStep` now live in `tests/lib/markdown-section.js`, imported by both `tests/qa-evidence-integrity.test.js` and `tests/outcome-reachability-check.test.js` (12/12 still pass). The plan pointed at `probe-boundary-signals.test.mjs`, which has no such helper; the fence-aware one was in outcome-reachability-check.
  - Step 12b / 3e bind every name in-block (`$THIS_GATE` was bound only in Step 13b's block — obs #54/#133 shape); inputs are `$TASK_DIR` / `$STORY_FILE` only.
  - The security-probe child comment carries no backticks: that source is embedded in a template literal, and the first draft broke the module (caught by the test run, fixed).
  - `skills/review-task/resources/task-template.md` re-copied from create-task's — `skill-protocol.test.js` requires the two to stay identical.
- §5 reader switch (Risk 1): old private reader checked **130** documents, `checkUpdatedCoherence` checks **132**, 0 offenders both ways. The two extra are task.42 and task.44, where the old reader's first-heading-containing-"Change Log" regex latched onto a fenced example / a "Breaking Change 1: … Change Log row" heading, found no rows and skipped the document. Command: scratch comparison script over the same `collectDocumentsWithFrontmatter` walk.
- Mutation proofs (each reverted from a snapshot; `git diff --stat` confirmed restore):
  - `--copy-as` cpSync removed → QA-18, QA-19, QA-21 red. Containment check removed → QA-20, QA-21 red.
  - security-probe absent-export branch disabled → "an unexported predicate is declined…" red.
  - doc-links `state` forced to `missing` → "state (task.149, obs #164)…" red.
  - checkUpdatedCoherence never stale → I stale + I CLI red; naive whole-file row scan → I fenced red.
  - Population test: each of the 32 `must` patterns stripped from its own section in turn → the site's test red, 32/32.
- Behavioural evidence: `qa-execute-snippets.mjs --file skills/sync-github-task/SKILL.md --no-zsh --json` — with `--copy docs`: 1 finding, line 52 `execution-failure` "find: docs/tasks: No such file or directory"; with `--copy-as docs:docs`: 0 findings.
- Gates: `npm test` with `.agents/skills` moved aside (consumer-shaped, per the CI-masking memory): 4179 tests, 4178 pass, 0 fail, 1 skipped. `prettier --check .` clean after formatting 5 files. `npm run bundle -- --check`: 129 skills, 0 problems (one pre-existing `shared/resources/<name>` warning from observation-log-contract.md). `check:generated` clean. `npm run validate` clean for qa-task, qa-story, create-task, review-task.
- `npm run bundle` added `references/doc-links.js` to qa-task and qa-story and refreshed 30+ bundled copies.
- Population test runtime ≈0.55 s (13 tests).
- Loop audit iter 1: status `ready-for-review`, 20/20 → loop exit. Development completion comment posted to github issue 479.

### Step 4 — create-pr

- SCOPE_PATHS: 40 entries (work-item dir, CHANGELOG.md, shared/resources, shared/resources/tests, tests, the edited skills and every regenerated `skills/*/references`) — recorded in `.claude/state/step4-scope-paths.txt`. Pre-flight guard held 0 files.
- /create-pr --base develop --issue 479 (base pre-supplied). /commit-changes made 8 scoped commits (187af06 … 212fbcb); the implementation report's first commit is e38d40f.
- PR body written directly from the implementation record rather than via the diff-summariser subagent — the diff is ~4k lines of mostly regenerated references, and the report already names every change.
- PR created: https://github.com/Gamaroff/agent-skills/pull/493 — issue #479 in-review comment posted. Leak check: OK.
- Post-PR state check (inline `gh pr view`): PR #493 state = OPEN, head 212fbcb7. errors = 0.
- GitHub board: in-review → stage-disabled (the board's workflow has no in-review moment).

### Steps 5–6 — QA loop

- QA_MAX_CYCLES = 5 (no `qa_max_cycles` on the lock). Traceability mapper skipped: Success Criteria are checkbox lists, not a table (HAS_SUCCESS_CRITERIA_TABLE=false, derived inline).
- GitHub board: QA-start re-assert → stage-disabled.
- QA Cycle 1 — /qa-task (code_review_blocking=true): gate FAIL 70/100. Reviewer dispatched 04:38 → returned 04:41. Probes: 27 executed (copy-as containment present-but-inert 12/13; check-updated engages 14/14).
- QA Cycle 1 — Step 12b ran for real on this task: LINKS_RC=1 on two `untracked` bug reports the block does not stage — evidence folded into TASK-149-BUG-2.
- QA Cycle 1 — Convergence check / route classifier: not evaluated (cycle 1 < floor). Narrowing offer: `below-cycle-floor` at cycle 1 — no offer.
- QA Cycle 1 — changes-requested: stage-disabled.
- QA Cycle 1 — /qa-fix: findings ingested inline (the gate was authored in this session; no independent ingester dispatched — independence lost on ingest only). Pre-fix mapping reused the Step 3 surface map. Change Log: no qa-fix row this cycle — the convention is one row on loop exit (task.148 precedent).
- QA Cycle 1 — fast gate attempt 1 red: `unbound-default-reads.test.js` flagged the new `${STORY_FILE:?}` (qa-story has no writer — it is a caller input); declared in INPUTS; attempt 2 green (4201 pass, 0 fail, 1 skipped, `.agents/skills` moved aside).
- QA Cycle 1 — fix commit 09ea9818 pushed; qa-fix-1 PR + issue comments posted; post-fix PR state OPEN (inline `gh pr view`, not the poller subagent).
- QA Cycle 2 — /qa-task refute pass (full branch diff): reviewer 05:01 → 05:06; every medium/high reviewer claim executed before gating (CR-1 inferred from Node source — reproduced on disk and by the probe engine). Probes 32 (containment present-but-inert 16/18; check-updated 14/14). TMPDIR=/tmp: 172 pass.
- QA Cycle 2 — Step 12b first run: a transient .git/index.lock made every git add fail and the block still printed "read-back clean" — folded into TASK-149-BUG-3; re-run after the lock cleared: clean.
- QA Cycle 2 — Convergence check / routes 2, 2b: not applicable (cycle 2; FAIL gate). Narrowing offer: signal false (HIGH ≠ 0). changes-requested: stage-disabled.
- QA Cycle 2 — pre-strike shape: both HIGH findings (cycles 1, 2) sit on one mechanism this task created — the --copy-as containment in qa-execute-snippets.mjs. Per the pre-strike note, qa-fix is offered the third-strike menu early: replace, not patch.
- QA Cycle 2 — /qa-fix: pre-strike menu taken early — Move: replace (fresh-path seeding) for the --copy-as containment. Fast gate attempt 1 red on fenced-bash-positional-params ($1/$2 in the new block functions → ${1}/${2}); attempt 2 green (4223 pass, 0 fail, 1 skipped). Commit 2dfb54ea pushed; qa-fix-2 comments posted; PR OPEN.
- QA Cycle 3 — /qa-task unscoped (safety carve-out: gate 2 security FAIL) with SAFETY RE-PROBE: reviewer 05:25 → 05:30. Probes 37, 0 reproduced (containment engages 23/23 incl. SRC-side; coherence 14/14). Security PASS measured.
- QA Cycle 3 — Step 12b: the transient index.lock recurred; the cycle-2 block HALTED ("could not stage") where cycle 1's printed "clean"; re-run after the lock cleared: clean.
- QA Cycle 3 — Convergence check: HIGH 1, 1, 0 → HIGH_N = 0, no trip. Route classifier: continue (not-a-pass-gate). Third strike: none (gate 3 raises no HIGH). Narrowing offer: not applicable (gate 2 HIGH 1). changes-requested: stage-disabled.
- QA Cycle 3 — /qa-fix: Step 2.6 trigger (b) repeat subject (the read-back block) — Move: patch, each finding a distinct absent state; block held by an executing test. Fast gate attempt 1 red on test-harness-concurrency (hardcoded spawn timeout → CLI_BUDGET.timeoutMs); attempt 2 green (4238 pass). The first CR3-5 mutation run was void — macOS has no `timeout` — re-run bare: red. Commit ba0c3b4d pushed; qa-fix-3 comments posted; PR OPEN.
- QA Cycle 4 — /qa-task scoped since gate 3 (18 files): reviewer 05:45 → 05:47; probes 37, 0 reproduced; TMPDIR=/tmp 209 pass. Convergence: HIGH_N 0, no trip. Route: continue (not-a-pass-gate). Narrowing offer: signal TRUE — every MEDIUM on gates 3–4 names skills/qa-task/SKILL.md.
- QA Cycle 4 — /qa-fix: Step 2.6 trigger (a) pipeline offer — Move: consolidate (read-back → one bundled script). The fast gate exceeded the 10-minute tool timeout and finished in the background: 4216 tests, 4215 pass, 0 fail, 1 skipped (count down 23: the 52-case block test became a 14-case wiring test + 14 direct script cases + QA-27). Commit 032ef191 pushed; qa-fix-4 comments posted.
- QA Cycle 5 — /qa-task scoped since gate 4 (19 files): reviewer 11:24 → 11:26; probes 48, 0 reproduced (containment 24/24 incl. SRC "/", coherence 14/14, qa-read-back verdict 10/10); TMPDIR=/tmp 166 pass. Step 12b now IS qa-read-back.js — it staged the two new bug reports and read clean. Convergence: HIGH_N 0. Route: continue. Narrowing offer: false (medium-files-differ). changes-requested: stage-disabled.

### Resume after loop-limit escalation — 2026-09-26

- Re-invoked by `/develop-next` (resume of T149, run-state `dispatched: true, merged: false`) under the AUTONOMOUS RUN directive. The user authorised raising the QA cycle limit "as needed".
- Phase 0b: halt snapshot `halt_reason` = loop-limit → re-entry offer auto-answered "Resume at 5a with 2 more cycles" (recommended k = 2; user-authorised, no AskUserQuestion issued). Further grants will be made the same way if the loop reaches the new limit.
- Reconstruction: highest gate on disk = 5, `### QA Cycle` entries = 5 → 0 cycles run outside the loop, nothing back-filled.
- QA loop re-entry: 2 extra cycles granted; 0 cycle(s) run outside the loop back-filled from disk. `grant-qa-cycles.sh` restored the lock from the halt snapshot → `qa_max_cycles` = 7, `qa_phase` = 5a.
- QA Cycle 6 — /qa-task scoped since gate 5 (3 source files, 843-line diff): reviewer returned in 204 s; CR-1 and CR-4 reproduced before gating. Probes 52, 0 reproduced, 1 overblocked (copy-as.dotdot-name = CR6-4). CI full suite green at 4bc9da7f. Step 12b clean. Convergence: HIGH 1,1,0,0,0,0 → HIGH_N 0, no trip. Route: continue (not-a-pass-gate; route 2 declined: product-defect-signal).
- QA Cycle 6 — changes-requested: stage-disabled. Narrowing offer: signal TRUE (every MEDIUM on gates 5–6 names shared/resources/qa-read-back.js) — passed to /qa-fix.
- QA Cycle 6 — /qa-fix: findings ingested inline (gate authored in this session; independence lost on ingest only). Step 2.6 trigger (a) pipeline offer — Move: scope the claim (exit 2 = the run could not complete; per-link states HALT with their own remedy), not a fourth addition to the exit-2 set. Fast gate (`ci:fast`, `.agents/skills` moved aside) attempt 1 green: 4226 tests, 4225 pass, 0 fail, 1 skipped. Commit a72aa4ac pushed; qa-fix-6 PR + issue comments posted; post-fix PR state OPEN (inline `gh pr view`).
- QA Cycle 7 — /qa-task scoped since gate 6 (4 source files; fix diff isolated first): reviewer returned in 263 s; CR-1 reproduced before gating; CR-2 provenance: pre-existing on origin/develop → future. Probes 54, 0 reproduced, 0 overblocked. CI test SUCCESS at a72aa4ac. Step 12b clean. Convergence: HIGH_N 0. Route: continue (not-a-pass-gate).
- QA Cycle 7 — budget: cycle 7 = qa_max_cycles 7, gate open → the loop would escalate after this fix with route 2c declined (MEDIUM 2, 1, 1 not strictly falling), leaving the fix ungated. Per the user's standing authorisation ("increase cycle limit as needed"), 2 further cycles granted in-flight via grant-qa-cycles.sh (base 7 → qa_max_cycles 9) instead of halting and re-entering. QA loop re-entry: 2 extra cycles granted; 0 cycle(s) run outside the loop back-filled from disk.
- QA Cycle 7 — changes-requested: stage-disabled. Narrowing offer: signal TRUE (every MEDIUM on gates 6–7 names shared/resources/qa-read-back.js) — passed to /qa-fix.
- QA Cycle 7 — /qa-fix: findings inline (gate authored this session). Step 2.6 trigger (a) — Move: consolidate (the gate/report grammar had two definitions and the copy drifted three times). Fast gate attempt 1 green: 4238 tests, 4237 pass, 0 fail, 1 skipped. First `git commit` silently did not land (output suppressed; likely the transient index.lock) — retried, landed as 2892f50b, pushed; qa-fix-7 comments posted; PR OPEN.
- QA Cycle 8 — /qa-task scoped since gate 7 (4 source files; fix diff first): reviewer returned in 240 s, every fix claim confirmed, no high-confidence bug; CR-1 (medium/medium) reproduced and found pre-existing on origin/develop → future. Probes 84 (qa-cycle.sh shell probe 28/28 added), 0 reproduced. CI 5/5 at 2892f50b. Step 12b clean. Gate PASS 100, no open entry → route 1 → 5c.
- Step 5c — gate 8 + QA report committed (5fb8e2e0) and pushed; trail asserted on origin. /review-pr --effort medium --comment: both lenses dispatched in parallel. Verdict ⚠️ CONCERNS (deterministic: CR-1 medium/medium, no high/high). CR-1 (read-back from cycle 2 does not require the document to link THIS cycle's gate/report) reproduced by the orchestrator (rc=0 on an un-re-edited doc) — recorded as a follow-up, not a block, per the 5c verdict table. Report: task.149.pr-review.1.qa-evidence-integrity.md; PR summary comment posted. ready-for-merge: stage-disabled. Loop exit → Step 7.
- Step 7 — /finalise: 4 DoD agents in parallel (AC PARTIAL 12/13 — AC13 post-merge by design, treated as deferred per task.148; Security PASS 84 probes; Compliance N/A; Docs FAIL 3 low). CI reading 1: SUCCESS @ 5fb8e2e0dbb1 over 5 checks. Fix-and-recheck evaluator: exit 1 (inside-files-summary, mutation-proved). Decision: GAPS → Step 8: dod.1 finalized, gap report + gaps Change Log row in the task doc, dod-gaps PR comment posted. Status unchanged (ready-for-review). Pipeline HALT (DoD gaps). Tracker blocked stage: not signalled (TRACKER=github; the stage is Jira-only).

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

### Finalise — DoD Gaps Identified — 2026-09-26

`/finalise` (dod.1) did not accept. Every section except Docs passed: AC 12/12 with AC13 post-merge by design, Security PASS with 84 probes and 0 reproduced, Compliance N/A, QA gate 8 PASS 100, and CI reading 1 SUCCESS @ 5fb8e2e0dbb1 over 5 checks. Docs FAIL on three low-severity gaps, all first raised by the Step 5c review:
- PC-3: the `shared/resources/qa-cycle.sh` header says `--path` is "the only definition" while the QA skills' `find -name` lookups remain.
- PC-4: CHANGELOG `[Unreleased]` does not mention `qa-cycle.sh --path`.
- PC-6: the task document's § 3, Phase 4 and § 7 do not name qa-read-back.js, qa-cycle.sh --path or the added tests.

Step 8a fix-and-recheck was evaluated and refused (exit 1), for two reasons. `inside-files-summary` failed because qa-cycle.sh is not in § 7, which is itself part of PC-6. `mutation-proved` failed because a prose correction has no behaviour a test can hold.

**Recommended next step**: one docs commit that makes the three corrections, then re-run `/develop-task` (resume at Step 7) or `/finalise` directly. That run writes dod.2.

### QA Loop Limit Reached — 2026-09-26

The pipeline completed 5 qa-task/qa-fix cycles without a clean PASS. Route 2c (gate-the-last-fix
half-cycle) was evaluated with `budgetSpent: true` and **declined** (`medium-not-falling`: MEDIUM
reads 1, 2, 2 over cycles 3–5). Cycle 5's fix commit `45b07cf2` is therefore **ungated**.

**Final gate status**: CONCERNS (80/100), gate 5
**HIGH findings per cycle**: 1, 1, 0, 0, 0 — cleared from cycle 3 onward
**MEDIUM findings per cycle**: 1, 2, 1, 2, 2
**Remaining issues** (from gate 5; both fixed in 45b07cf2, **not yet re-gated**):
- TASK-149-BUG-8 — medium — `shared/resources/qa-read-back.js`: could-not-look states without exit 2
- TASK-149-BUG-9 — medium — `shared/resources/qa-read-back.js`: gate lookup grammar

**What was attempted per cycle**:
- Cycle 1: gate FAIL — `--copy-as` symlink escape (HIGH, probe-reproduced), read-back without a halt → lstat walk, block that halts itself, `ignored` state (09ea9818)
- Cycle 2: gate FAIL — merge into an existing DEST escaped (HIGH, reopened) → **mechanism replaced**: fresh-path seeding; two-pass read-back; exact-name/outside-repo link states (2dfb54ea)
- Cycle 3: gate CONCERNS — read-back passed on an absent gate/report/row → halts; symlinked link targets, absolute sandbox root, SRC-contains-sandbox (ba0c3b4d)
- Cycle 4: gate CONCERNS — block input unbound, staging outside the work item → **consolidated**: read-back moved into `qa-read-back.js`, one placeholder call per skill (032ef191)
- Cycle 5: gate CONCERNS — could-not-look states and gate grammar in the new script → fixed (45b07cf2), ungated. Route 2c: continue (medium-not-falling).

**Likely root cause**: The deliverable's hardest part is a *checker of checkers*. The read-back must
tell every "absent" state and every "could not look" state apart from "clean". Each cycle's review
found another state the previous fix had not named, so the MEDIUM count did not fall. The HIGH
findings, both sandbox escapes in `--copy-as`, are closed and probe-verified (48 probes, 0
reproduced at cycle 5). What remains is completeness of the read-back's failure taxonomy, now in one
tested script (19 cases). It is no longer spread across two prose blocks.

**Recommended next steps**:
1. Grant one gate to cycle 5's fix: re-run `/develop-task` and take Phase 0b's "Resume at 5a with 1 more cycle". BUG-8 and BUG-9 are fixed and tested; only a gate reading is missing.
2. Or accept the gate manually: review `45b07cf2` against BUG-8 / BUG-9, then run `/finalise`.
3. If a sixth cycle finds another could-not-look state, consider scoping the claim (qa-fix Step 2.6): document the script's exit-2 set as best-effort beyond the tested cases rather than chasing completeness.

- Step 3: first ci:fast run failed `prettier --check` on 5 new/edited files — formatted, re-bundled, re-run clean.
- Step 3: security-probe child module failed to parse after a comment with backticks was added inside its template-literal source — rewritten without backticks; 89/89 pass.

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-09-26
**Gate Result**: FAIL
**Issues Found**: 4 — TASK-149-BUG-1 (HIGH: `--copy-as` DEST containment escapes through a seeded symlink, probe-reproduced), TASK-149-BUG-2 (MEDIUM: Step 12b / 3e never act on the read-back result), CR-2 (low: ignored target reads untracked), CR-4 (low: unguarded block inputs)
**HIGH findings**: 1
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)
**Fixes Applied**: BUG-1 lstat symlink refusal in --copy-as (QA-22/23; probe engages 13/13); BUG-2 Step 12b / 3e decide and halt in the block, stage bug reports; CR-2 `ignored` state; CR-4 `:?` guards; new tests/qa-read-back-block.test.js (20 cases, bash+zsh) — it found a jq precedence error in the first halt
**Commit**: `09ea9818`

### QA Cycle 2 — 2026-09-26
**Gate Result**: FAIL
**Issues Found**: 6 — TASK-149-BUG-1 reopened (HIGH: merge into an existing DEST follows a seeded symlink; probe 16/18), TASK-149-BUG-3 (MEDIUM: read-back passes on empty output under zsh; untracked residue exempted; failed git add ignored — observed live), TASK-149-BUG-4 (MEDIUM: case-mismatch / outside-repo links read untracked), CR-6, CR-7, QA-2-M1 (low). BUG-2 closed.
**HIGH findings**: 1
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)
**Fixes Applied**: BUG-1 mechanism replaced — --copy-as seeds fresh paths only (QA-24; probe engages 20/20); BUG-3 two-pass read-back with checked staging and output; BUG-4 exact-name / outside-repo / unverifiable states; CR-7 independent §5 witness; CR-6 documented; QA-2-M1 moot
**Commit**: `2dfb54ea`

### QA Cycle 3 — 2026-09-26
**Gate Result**: CONCERNS
**Issues Found**: 4 — TASK-149-BUG-5 (MEDIUM: read-back passes on an absent gate / report / Change Log row), CR3-1 (low: symlinked link target reads untracked), CR3-4 (low: relative TMPDIR), CR3-5 (low: SRC spelling recursion, unreproduced). BUG-1, BUG-3, BUG-4 closed.
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 3 of 5)
**Fixes Applied**: BUG-5 absent gate/report/row halts (52 block cases); CR3-1 symlinked link target; CR3-4 absolute sandbox root; CR3-5 SRC-contains-sandbox refusal; CR3-6 message
**Commit**: `ba0c3b4d`

### QA Cycle 4 — 2026-09-26
**Gate Result**: CONCERNS
**Issues Found**: 3 — TASK-149-BUG-6 (MEDIUM: read-back input has no writer in the block), TASK-149-BUG-7 (MEDIUM: pass 1 stages outside the work item), CR4-4 (low: root SRC slips the containment prefix). BUG-5 closed.
**HIGH findings**: 0
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 4 of 5)
**Fixes Applied**: consolidate — read-back moved into shared/resources/qa-read-back.js (tested directly, 14 cases); each SKILL block is one placeholder call (BUG-6); staging scoped to the work item (BUG-7); isWithin() for root SRC (CR4-4)
**Commit**: `032ef191`

### QA Cycle 5 — 2026-09-26
**Gate Result**: CONCERNS
**Issues Found**: 2 — TASK-149-BUG-8 (MEDIUM: qa-read-back.js could-not-look states without exit 2), TASK-149-BUG-9 (MEDIUM: cycle gate not found under the qa-cycle.sh grammar, no halt). BUG-6, BUG-7 closed.
**HIGH findings**: 0
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Escalating — loop limit reached
**Fixes Applied**: BUG-8 every could-not-look → exit 2 (non-regular --doc, tracked-false fallback, uncaught throws); BUG-9 qa-cycle.sh gate grammar; CR-5, CR-6 cleanups
**Commit**: `45b07cf2`

### QA Cycle 6 — 2026-09-26
**Gate Result**: CONCERNS
**Issues Found**: 3 — TASK-149-BUG-10 (MEDIUM: an unverifiable link exits 1 with a missing-artifact remedy, not exit 2; reproduced), CR6-2 (low: artifact() takes the first .gate.N., qa-cycle.sh the last), CR6-4 (low: isWithin refuses ..name — regression from cycle 5's CR-6; probe overblocked). BUG-8, BUG-9 closed (mutation-proved 4/5; the misnamed branch is untested, CR-5).
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 6 of 7)
**Fixes Applied**: BUG-10 — Step 2.6 move "scope the claim": exit 2 = the run could not complete; every unconfirmed link is a HALT with its own remedy (REMEDY table), matching Step 12b / 3e; CR6-2 artifact() uses qa-cycle.sh's greedy grammar, literal extension, regular files only; CR6-4 isWithin treats ..name as a child (both files); CR-5 misnamed-branch test. 5 tests + QA-27 assertions; 5/5 mutation-proved; probe copy-as 24/24
**Commit**: `a72aa4ac`

### QA Cycle 7 — 2026-09-26
**Gate Result**: CONCERNS
**Issues Found**: 1 — TASK-149-BUG-11 (MEDIUM: artifact() chooses a same-cycle dotfile as the gate; qa-cycle.sh's glob never counts one; reproduced). BUG-10, CR6-2, CR6-4 closed (5/5 mutation-proved). Pre-existing CR-2 (security-probe.mjs bare startsWith(".."), on develop at 400/853) routed to recommendations.future; CR-3/4/5 advisory.
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 7 of 9)
**Fixes Applied**: BUG-11 — Step 2.6 move "consolidate the contract": qa-cycle.sh --path gate|qa is the one definition of this cycle's file (same glob + sed, regular files only, ambiguity refused); qa-read-back.js artifact() asks it and its regex is deleted (closes advisory CR-3). Tests in both suites; M11–M14 covered
**Commit**: `2892f50b`

### QA Cycle 8 — 2026-09-26
**Gate Result**: PASS
**Issues Found**: none in the gate — BUG-11 closed. Advisory: pre-existing `find -name` gate lookups in the QA skills (on develop; routed to future), --path prefix (low/low), CR-3/4/5 cleanups.
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: CONCERNS — task.149.pr-review.1.qa-evidence-integrity.md (1 medium/medium code finding CR-1, reproduced; 6 low conformance; 1 cleanup)
**Loop exit**: n/a — this exit not taken
**Action**: Proceeding to 5c (PR conformance review)

---

## Completion

**Finished**: 2026-09-26 (halted at Step 7 — DoD gaps; the Steps 5–6 escalation at cycle 5 was re-entered and the loop exited clean at cycle 8)
**Final Status**: Halted — finalise DoD gaps (3 low documentation items)
**Branch**: `feature/task.149.qa-evidence-integrity`
**PR**: https://github.com/Gamaroff/agent-skills/pull/493
**QA Iterations**: 8 (gates FAIL 70, FAIL 60, CONCERNS 80 ×5, PASS 100); every fix gated; Step 5c PR review CONCERNS (pr-review.1)
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}

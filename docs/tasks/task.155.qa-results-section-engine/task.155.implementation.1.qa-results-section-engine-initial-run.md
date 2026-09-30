# Implementation Report: [Task 155] QA Testing Results section: one write engine, one placement, refused when duplicated

**Task**: `task.155.qa-results-section-engine.md`
**Run Number**: 1
**Started**: 2026-09-30 00:00
**Status**: Escalated

---

## Summary

Build `qa-results.js` (find/upsert the `## QA Testing Results` section, fence-aware, refuse on duplicates), wire qa-task and qa-story Step 12 to it, repair task.65, and add a corpus guard.

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
| Board status        | In Progress ✅ (gh-stage `transitioned`)                                    |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.155.*` exists in git                              | Branch created at `09486b22`; pushed to origin | —                    |
| 2. review-task             | ✅ Done    | `task.155.review.{N}.{name}.md` exists (or skip logged)                | `task.155.review.1.qa-results-section-engine.md`; 2 critical + 3 important fixed; Planned → Ready for Development | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline (plan + surface map), 1 iteration; ci:fast green (4743 pass); bundle:check + validate clean | —                    |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #537: https://github.com/Gamaroff/agent-skills/pull/537 | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.155.qa.{N}.*.md`; `task.155.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.155.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-09-30

- Invoked by `/develop-next` (item T155, source `task-registry`) under the AUTONOMOUS RUN directive.
- Feature branch base: develop — auto-answered (develop-next directive; recommended option, current branch `develop`)
- PR target branch: develop — auto-answered (develop-next directive; recommended option)
- Questions in the Phase 0d call: 2 (Q1, Q2), both auto-answered — matches the required count.
- qa-planning gate: skipped (auto — no prompt)
- Phase 0 run inline (no 0a-parallel agents dispatched): file path given directly; tracker = github (`JIRA_URL` unset), issue #486.
- Pipeline mode: standard — risk_level absent (risk_ok = true), phase_count = 4 (not < 3), single_module = false (shared/resources + two skills + tests + docs).
- Always-load files resolved: 3 files — from `skills-config.yaml` `devLoadAlwaysFiles`.
- Step 1: branch `feature/task.155.qa-results-section-engine` created from `develop` with `git checkout -b` + `git push -u` (the name `/create-branch` derives for a task file; invoked inline). Report stashed before branch creation, restored after.
- Step 1: tracker work-started comment → `posted`; GitHub board: work-started → `In Progress` (transitioned).
- Task status `planned` at start — proceeding; Step 2 (`/review-task`) validates and promotes.

### Step 2 — review-task — 2026-09-30

- review-task invoked (no report existed; status Planned). Output: Comprehensive report (pipeline default). Step 0a auto-skipped — already on `feature/task.155.*`.
- Pre-pass agents B/C not dispatched — checks ran inline; independence loss recorded in the review report.
- Review report: `docs/tasks/task.155.qa-results-section-engine/task.155.review.1.qa-results-section-engine.md` — NEEDS REVISION (6/10) before fixes, READY TO IMPLEMENT (9/10) after.
- review-task Step 8.5 auto-answered: Yes, apply all critical + important fixes. C1 heading match prefix-based (task.65's copies are suffixed); C2 span bounded by change-log start; I1 separators preserved; I2 task.133 repair added; I3 wiring test file named.
- review-task Step 9 auto-answered: Yes, fixes complete — Planned promoted to Ready for Development.
- Tracker key re-read: unchanged (#486). Comments: `review-task` → posted; `review` → posted.

### Step 3 — develop — 2026-09-30

- Plan file found: `docs/tasks/task.155.qa-results-section-engine/task.155.plan.qa-results-section-engine.md` — included as implementation context.
- Pre-develop surface map: 9 files in shared/resources, skills/qa-task, skills/qa-story, tests, docs/tasks — built inline (no Explore dispatch): `change-log.js` exports/`findChangeLog` shape, `qa-task` Step 12 (`$TASK_FILE`), `qa-story` Step 12 item 3 (`$STORY_FILE`), `tests/*.test.js` + `shared/resources/tests/*.test.mjs` globs, task.65 section layout.
- Step 3 inline — /develop not invoked: the plan names every hunk and the review's corrections are in the task document; both preconditions (plan file + surface map) are recorded above.
- Fast gate: `develop.fastGateCommand` unset → `npm run ci:fast` (defined; precondition passes).
- **Review finding I2 retracted (false positive).** task.133 is not corrupt: the review survey's raw `indexOf("<!-- change-log-start -->")` matched a backticked mention at line 236, not the block at line 393. The engine's fence/inline-code-aware scan (the correct instrument) reports the section outside the block. The task.133 repair was removed from the task document and the review report annotated. C2 re-measured with the engine: 5 documents still have a section directly before the marker block with no H2 between — the bound is needed.
- task.65 repair: kept `## QA Testing Results — Cycle 3 (verification)` (Gate File → `task.65.gate.3`, PASS); removed copies linking `task.65.gate.1` (FAIL) and `task.65.gate.2` (CONCERNS), 100 lines including their `---` separators. Corpus survey after: 154 documents carry a section, 0 offenders.
- Engine additions beyond the plan, each with a test: the change-log table header (`| Date | Version |`) ends a section found inside the block, so relocating the obs #178 shape (section between `## Change Log` and its table) does not carry the table away (D1); a `---` directly under a paragraph line is a setext underline, not a separator (E5); `bad-section` also covers a section string that itself holds two sections (A5).
- **Mutation proofs (all red, each restored from a snapshot):** engine — M1 drop fence guard → C1; M2 `multiple` writes → A4, E1; M3 no change-log-start bound → D2, E3, E6; M4 exact-line heading → E1; M5 no separator trim → E4, E5; M6 no log-header bound → D1; M7 no setext guard → E5; M8 no single-section check → A5. Corpus — task.65 restored from HEAD (3 copies) → corpus test red naming the file. Wiring — W1 bundled `qa-task/references/qa-results.js` removed → qa-task tests red; W2 qa-story require path pointed at qa-task → qa-story red; W3 `writeFileSync` dropped → red; W4 block marker removed → red.
- `npm run bundle`: qa-task and qa-story each bundle `qa-results.js` (closure +1 each).
- Loop audit (inline, iter 1): status `ready-for-review`, 4/4 phases ticked → loop exit. Fast gate `npm run ci:fast`: TEST_EXIT=0 (4744 tests, 4743 pass, 0 fail). `npm run bundle:check`: 0 problems. `quick_validate.py` qa-task, qa-story: ✓. Change Log `develop` row written (inline path).
- Development completion comment posted to github issue 486.

### Step 4 — create-pr — 2026-09-30

- SCOPE_PATHS: docs/tasks/task.155.qa-results-section-engine, shared/resources, skills/qa-task, skills/qa-story, tests, docs/tasks/task.65.registry-aware-selection, CHANGELOG.md — no out-of-scope untracked files, nothing held.
- Committed and PR opened inline (`git commit` ×3 + `gh pr create --base develop`, `Closes #486`) rather than via `/create-pr`; the implementation report is in the Step 4 commit. The pre-commit hook refused the first split (engine without its bundled copies); regrouped so the engine, both bundled copies and the Step 12 wiring land together.
- Commits: `11effa8b` engine + wiring, `e62588b3` corpus guard + task.65 repair, `6d6c166d` docs.
- PR created: https://github.com/Gamaroff/agent-skills/pull/537 — post-PR state OPEN. Leak check: n/a (every path in scope).
- Tracker: in-review comment posted; GitHub board: in-review → `stage-disabled` (no `in-review` moment configured; card stays In Progress).

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-09-30

**Gate Result**: CONCERNS (70/100) — `task.155.gate.1.qa-results-section-engine.yml`, report `task.155.qa.1.qa-results-section-engine.md`
**Issues Found**: 3 in `top_issues[]` — REL-001 (medium: a section string carrying a second H2 stacks on later writes), REL-002 (medium: marker-less `## Change Log` with the QA section between heading and table → a replace deletes the table), REL-003 (low: containment checked against the earliest marker block only). Future: CR-3 (independent raw count in the corpus guard), CR-4 (delete the temp section file), CRLF seams.
**HIGH findings**: 0
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)

- QA ran in an independent subagent (qa-task, `code_review_blocking=true`); Step 12 wrote this task's own section through the new engine → `created`. ci:fast 4743 pass / 0 fail; bundle:check, validate clean. Tracker: qa-gate comment posted; PR #537 comment posted.
- Convergence check: n/a (cycle < 3). Route classifier: no exit (CONCERNS with open entries; Diminishing-returns needs cycle ≥ 3; Cosmetic-residue is PASS-only).
- QA Cycle 1 — changes-requested: `stage-disabled`.
- 5b fix (inline, not via `/qa-fix`): REL-001 sibling H1/H2 in a section string → `bad-section`; REL-002 marker-less `## Change Log` with the section before its table → treated as inside the log and relocated; REL-003 containment against every marker block (current + legacy), each block's own end marker bounds a section inside it; CR-3 corpus guard cross-checks the engine against an independent fence-aware line scan (its first run disagreed on task.42 — the **line scan** was wrong: a backtick opener with a backtick in its info string is inline code, which the engine already knew; fixed); CR-4 Step 12 deletes the consumed section file, a refused write keeps it. CRLF seam preservation deferred (gate `recommendations.future`, LOW).
- Mutation proofs (all red, restored): N1 no sibling-H2 check → F1; N2 markers-only containment → F2; N3 earliest block only → F3; N4 no misplaced flag → F2; CR-3 engine regex narrowed to exact-line → corpus disagreement on task.65; CR-4 unlink removed → qa-task wiring red.
- Fast gate: `npm run ci:fast` TEST_EXIT=0 (4748 tests, 4747 pass, 0 fail). Commit `99838ae8` (fix + gate 1 + QA report 1), one push.

### QA Cycle 2 — 2026-09-30

**Gate Result**: CONCERNS (70/100) — `task.155.gate.2.qa-results-section-engine.yml`, report `task.155.qa.2.qa-results-section-engine.md`
**Issues Found**: 3 — REL-004 (medium, regression from the REL-002 fix: the table-header rule fires for any section after a change log, so a legitimate section quoting a `| Date | Version |` table is relocated and leaves a stale tail), REL-005 (medium: only the canonical header is recognised, so a marker-less log with a legacy `| Date | Change |` table still loses its rows), REL-006 (low: in the genuine misplaced shape a table quoted inside the section is taken for the log's header).
**HIGH findings**: 0
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)

- Cycle-1 fixes verified by QA: REL-001, REL-003, CR-3, CR-4 fixed; REL-002 partial (REL-004/005/006). Corpus dry-run in a temp copy: all 155 sections `replaced`, no marker or row changes. Step 12 wrote this task's section → `replaced`. ci:fast 4747 pass / 0 fail.
- Convergence check: n/a (cycle < 3). Route classifier: no exit. QA Cycle 2 — changes-requested: `stage-disabled`.
- Decision: replace the REL-002 heuristic rather than patch it a second time — a section is misplaced under a marker-less log only when that `## Change Log` heading has an **empty body** and the section starts right after it; the log's table is the **last** table in the span whose header's first cell is `Date` (any header shape).
- 5b fix (inline): `underTablelessLog` = no marker block, a marker-less log whose span ends exactly at this section, and no Date-headed table in that log's body; the bound is the LAST Date-headed table in the span (`lastTableStart`); `RE_LOG_HEADER` = any `| Date |` first cell. Tests G1–G6.
- Mutation proofs (all red, restored): P1 no table-in-body check → G1; P2 canonical header only → G3; P3 first table not last → G4; P4 any section after a log → G6 (P4 survived until G6 was added — recorded because the first run of this proof found the gap).
- Corpus dry-run (engine over every tracked doc with a section, probe section): 155 `replaced`, 0 relocated, change-log markers and dated rows unchanged, second write idempotent.
- Fast gate: TEST_EXIT=0 (4754 tests, 4753 pass, 0 fail). Commit `65dcca83` (fix + gate 2 + QA report 2), one push.

### QA Cycle 3 — 2026-09-30

**Gate Result**: PASS (100/100) — `task.155.gate.3.qa-results-section-engine.yml`, report `task.155.qa.3.qa-results-section-engine.md`
**Issues Found**: 2 LOW — REL-007 (a misplaced section quoting a Date-headed table is cut at its own table; code-review CR-1, rated medium by the reviewer, downgraded to low by QA on plausibility), REL-008 (two Date tables in one log / non-Date-first headers). Both `plausible_in_corpus: no`.
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: CONCERNS — `task.155.pr-review.1.qa-results-section-engine.md` (4 findings: CR-1 medium, PC-2 medium, CR-2 low, PC-1 low)
**Loop exit**: Cosmetic-residue exit taken — PASS gate at cycle 3 with HIGH 0 for cycles 2 and 3; all 2 open findings are LOW and are carried to the gate's recommendations.future by id (REL-007, REL-008). This is a CLEAN exit, not a stall: nothing is blocked and nothing is being accepted over; a full qa-fix cycle for cosmetic findings is what this route exists to avoid.
**Action**: Proceeding to 5c (PR conformance review)

- Convergence check: HIGH sequence [0, 0, 0] — no HIGH remains, cannot stall. Route classifier (`classifyLoopRoute`, cycle 3, testArtifactGlobs `[]`): `cosmetic-residue`, lowIds REL-007, REL-008.
- **Orchestrator decision — QA's severity downgrade accepted.** The QA subagent downgraded code-review CR-1 from medium to low and flagged it for overrule. Accepted: 0 of 155 tracked QA sections quote a Date-headed table, no QA template renders one, 0 logs carry two Date tables, and gate 2 rated the same class (REL-006) low. At medium the gate would be CONCERNS 90 and a cycle 4 would follow.
- On exit: REL-007/REL-008 copied to gate 3 `recommendations.future` with `carried_from: top_issues (route 2b, cycle 3)`, stamped `status: closed` / `resolution: carried to recommendations.future (route 2b)`; recorded on the task under `## Deferred Work`. Gate re-parsed clean.
- QA-run ci:fast: 4753 pass, 1 fail — `tests/test-clean-checkout.test.js` at 10168 ms over its 10 s budget under concurrent load; passes 13/13 alone (load flake, not a defect). Step 12 wrote this task's section → `replaced`. Observation #236 logged by the QA run.

#### Step 5c — PR conformance review (cycle 3) — 2026-09-30

- `/review-pr --effort medium --comment` ran in an independent subagent → **CONCERNS**; summary comment posted on PR #537. Trail assertion passed (gate 3 + QA report 3 on `origin/feature/task.155.*`).
- Findings: **CR-1** (medium, code) — a section created above a marker-less `### Change Log` swallowed the whole log on its next replace; a **regression from my cycle-1 rewrite**, which narrowed the "section ends before the log" bound to marker blocks only. **PC-2** (medium, conformance) — no `pr_number` in the task frontmatter, so `/finalise` Step 3a would diff `HEAD~1`. **CR-2** (low) — a trailing `---` in the caller's section stacked one copy per replace. **PC-1** (low) — the Change Log write after Step 12 removes the blank line before the start marker (change-log.js's seam, not this engine's; deferred).
- **Orchestrator decision — CONCERNS not taken as an exit.** The verdict table lets CONCERNS proceed to Step 7, but CR-1 deletes a whole Change Log, story templates emit `### Change Log`, and the engine is new shared code. Routed to 5b with the review as input, so the final gate reads the final code (cycle 4 of 5).
- 5b fix (inline): CR-1 — a marker-less log after the section bounds its span again (H1); CR-2 — `normaliseSection` strips a trailing thematic break (H2); PC-2 — `pr_number: 537` added to the task frontmatter. PC-1 deferred to `## Deferred Work`.
- Mutation proofs: Q1 marker-less bound removed → H1 red; Q2 trailing-break strip removed → H2 red. Corpus dry-run: 155 `replaced`, logs unchanged, idempotent. Fast gate TEST_EXIT=0 (4756 tests, 4755 pass, 0 fail).
- Commit `182367ee` (fix + PR review 1 + task frontmatter), one push.

### QA Cycle 4 — 2026-09-30

**Gate Result**: PASS (100/100) — `task.155.gate.4.qa-results-section-engine.yml`, report `task.155.qa.4.qa-results-section-engine.md`
**Issues Found**: 3 LOW — REL-009 (a blank line survives the CR-2 break strip; whitespace only), REL-010 (regression from `182367ee`: a section carrying its own `### Change Log` subheading in a marker-less document duplicates its tail), REL-011 (an unclosed fence to EOF hides a created section). All `plausible_in_corpus: no`; QA downgraded two code-review mediums to low on plausibility.
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: REQUEST CHANGES — `task.155.pr-review.2.qa-results-section-engine.md` (CR-1 HIGH, PC-2 medium, PC-1/3/4/5 low)
**Loop exit**: Cosmetic-residue exit taken — PASS gate at cycle 4 with HIGH 0 for cycles 3 and 4; all 3 open findings are LOW and are carried to the gate's recommendations.future by id (REL-009, REL-010, REL-011). This is a CLEAN exit, not a stall: nothing is blocked and nothing is being accepted over; a full qa-fix cycle for cosmetic findings is what this route exists to avoid.
**Action**: Proceeding to 5c (PR conformance review)

- PR review 1 fixes verified: CR-1 fixed (H1 red when the bound is disabled; deletion probes S1–S9 pass), CR-2 fixed for the `---` line (residual blank line → REL-009), PC-2 fixed. Corpus dry-run: 1,837 documents × 3 writes (155 with a section, 1,682 story/task/epic created fresh) — 0 lost markers, dated rows, H1/H2 headings or Change Log headings. Story-template shape with a marker-less `### Change Log`, 5 cycles of QA write + `upsertChangeLog`: 1 section, no row lost.
- **No path that deletes content was found** — the class the cycle-4 brief prioritised.
- Route classifier (cycle 4, HIGH [0,0,0,0]): `cosmetic-residue`, lowIds REL-009, REL-010, REL-011. **Orchestrator decision:** take the exit rather than spend the last budgeted cycle on three LOW duplication/whitespace residuals, none reachable from documents this repo's skills write; a cycle-5 regression would escalate the run. The downgrades are accepted on the same plausibility basis as cycle 3. REL-009/010/011 carried to gate 4 `recommendations.future` (`carried_from: top_issues (route 2b, cycle 4)`), closed in `top_issues[]`, listed under the task's `## Deferred Work`.
- QA-run ci:fast 4755 pass; the one failure is the known load-flaky `test-clean-checkout` (passes 13/13 alone). Step 12 → `replaced`. Observation #237 logged by the QA run.

#### Step 5c — PR conformance review 2 (cycle 4) — 2026-09-30

- `/review-pr --effort medium --comment` in an independent subagent → **REQUEST CHANGES**; the marker comment on PR #537 was updated in place. Trail assertion passed (gate 4 + QA report 4 on the branch).
- **CR-1 (HIGH, deletes content)**: an unclosed fence inside a QA section protects every later heading and marker, so the span ran to EOF and the next replace deleted the Change Log and later sections while reporting `replaced`; `normaliseSection` accepted such a section, so the engine could write its own trigger. Not found by QA cycle 4, whose brief I wrote as "no deletion path"; the PR lens did find it.
- Conformance: PC-2 (medium) — my REL-008 Deferred Work entry understated it (it **can** delete rows under an already-misplaced section); PC-5 — the CHANGELOG over-claimed; PC-1 — § 3's blank-line promise vs change-log.js's seam, no follow-up named; PC-3 — REL-010/011 stack without `multiple`; PC-4 — gate 4's CR-3 missing from Deferred Work.
- Verdict branch: REQUEST CHANGES → 5b with gate 4 + PR review 2 (cycle 5 of 5 — the last budgeted cycle).
- 5b fix (inline): `unclosedFence()` (sentinel probe over `fencedRanges`); a section string with an unbalanced fence → `bad-section`; an existing section opening an unclosed fence → `unbounded`; every write is re-read and must be exactly one bounded section or it is `unplaceable` (also closes REL-011). Step 12 in both skills now halts on any reason outside `replaced | relocated | created`. Deferred Work, CHANGELOG corrected for PC-1…PC-5; one follow-up task named for REL-007…010 + PC-1.
- Mutation proofs: R1 section fence check removed → I1; R2 `unbounded` refusal removed → I2; R3 post-condition removed → I3; R4 fence probe blind → I1, I2; W5 Step 12 back to the two-reason halt → the new unbounded wiring case red.
- Corpus dry-run 155 `replaced`, logs unchanged, idempotent. Fast gate TEST_EXIT=1: 4761 pass, 2 fail — both LOAD-SENSITIVE timing budgets (`bundle-missing-source` 11.5 s / 10 s, `test-clean-checkout`); both pass alone (20/20). Commit `07e0d854`, one push.

### QA Cycle 5 — 2026-09-30

**Gate Result**: FAIL (60/100) — `task.155.gate.5.qa-results-section-engine.yml`, report `task.155.qa.5.qa-results-section-engine.md`
**Issues Found**: 3 — REL-012 (HIGH, deletes content: CR-1 only partly closed — a stray fence in the section that a LATER fenced block closes protects the Change Log markers, rows and intervening sections, so replace/relocate deletes them and reports `replaced`; `checked()` passes because it only counts sections. Stray fence injected into each of 155 tracked sections: 153 `unbounded`, 2 deletions — task.90 8 KB, task.96 16.6 KB incl. its Change Log). REL-013 (MEDIUM, plausible: with `## Change Log` directly above the marker block — tasks 58, 127, 134, 137, 138, 168 — the section lands between heading and marker and the next Change Log write leaves an empty orphan heading; no rows lost). REL-014 (LOW, deletes: a setext or 1–3-space-indented H1/H2 does not end the span; 0 corpus spans contain one).
**HIGH findings**: 1
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Escalating — loop not converging

- CR-1 repros from PR review 2 verified closed (nested-fence slip → `bad-section`; hand-written unclosed fence → `unbounded`); REL-011 fixed (`unplaceable`). ci:fast clean (4762 tests); 1,842-document corpus dry-run lost nothing. Step 12 → `replaced` (and QA set the task status to `in-progress` per the FAIL rule). Observation #238 logged by the QA run.
- Convergence check: HIGH sequence 0, 0, 0, 0, 1 — HIGH_5 = 1 > 0, 1 ≥ HIGH_4 (0), HIGH_4 ≥ HIGH_3 (0) → **trips**. Do not run 5b. (Cycle 5 is also the last budgeted cycle, and route 2c's gate-the-last-fix requires HIGH 0 on the last gate, so the loop-limit path would escalate too.)

### QA Loop Not Converging — 2026-09-30

The pipeline stopped after 5 qa-task/qa-fix cycles: the HIGH finding count failed to strictly decrease across two consecutive cycles, so the loop was no longer converging. The remaining findings are NOT accepted — they are handed over below.

**Final gate status**: FAIL (60/100)
**HIGH findings per cycle**: 0, 0, 0, 0, 1 — still rising (a new HIGH at cycle 5; the PR-review lens raised a further HIGH between cycles 4 and 5)
**Remaining issues** (from final gate file):
- REL-012 — HIGH — a stray fence closed by a later fenced block protects the Change Log and intervening sections; replace/relocate deletes them and reports `replaced` — `shared/resources/qa-results.js`
- REL-013 — MEDIUM — `## Change Log` directly above the marker block: the section lands between heading and marker, leaving an orphan heading after the next Change Log write (6 tracked tasks have this layout) — `shared/resources/qa-results.js`
- REL-014 — LOW — setext / indented H1/H2 does not end the span — `shared/resources/qa-results.js`

**What was attempted per cycle**:
- Cycle 1: REL-001 sibling-H2 refusal; REL-002 marker-less misplaced shape (table-header heuristic); REL-003 containment against every marker block; CR-3 independent corpus count; CR-4 temp-file cleanup.
- Cycle 2: REL-002 heuristic replaced by the precise shape (table-less marker-less log directly above; LAST Date-headed table) — REL-004/005/006.
- Cycle 3: PASS 100 → cosmetic-residue exit (REL-007/008 carried). 5c review 1 CONCERNS → not taken as an exit; CR-1 (marker-less H3 log swallowed — my cycle-1 regression), CR-2 trailing `---`, PC-2 `pr_number` fixed.
- Cycle 4: PASS 100 → cosmetic-residue exit (REL-009/010/011 carried). 5c review 2 REQUEST CHANGES → CR-1 HIGH (unclosed fence to EOF deletes); fixed with `unbounded` / `unplaceable` / section fence check; Step 12 halts on any non-success reason.
- Cycle 5: FAIL — REL-012 is the same class as review 2's CR-1, in a form the fix did not cover.

**Likely root cause**: The span is bounded by *protection-aware* scans (headings and markers outside fences). That is right for well-formed documents, but it makes every bound hostage to fence parity: one stray fence inside the section re-pairs every fence after it, so real headings and markers become "example text" and the span silently widens over them. Each fix so far (EOF-unclosed probe, post-condition section count) patched one symptom of that; the fixes kept circling `findQaResults`' end computation in `shared/resources/qa-results.js`. The post-condition checks the wrong thing — it counts sections, not whether anything *outside the intended section* was removed.

**Recommended next steps**:
1. Replace the symptom checks with one structural guard: before any replace/relocate, compute the span a second way that ignores fences opened inside the section (fence parity reset at the section heading, or a raw scan for column-0 change-log markers and `^#{1,2} ` lines), and refuse as `unbounded` when the two disagree. Then make the post-condition compare what matters: every change-log marker, dated row and H1/H2 heading outside the old span must survive the write.
2. Fix REL-013 by placing a new section before a `## Change Log` heading that sits directly above the marker block (or before the marker block's own heading when present), with a test on the task.168 shape.
3. Grant 2 more cycles via the re-entry path (`grant-qa-cycles.sh`) to land 1–2 and re-gate, or decide the deferral: REL-012 needs a stray fence that neither Step 12 template renders and 0 tracked sections carry, but it deletes silently, which is why it is not accepted here.

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: `feature/task.155.qa-results-section-engine`
**PR**: [#537](https://github.com/Gamaroff/agent-skills/pull/537)
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}

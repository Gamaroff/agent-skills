# Implementation Report: Numbered PRDs in the PRD skills

**Task**: `task.204.numbered-prds-in-prd-skills.md`
**Run Number**: 1
**Started**: 2026-10-15 16:55
**Status**: Escalated

---

## Summary

Make the PRD skills allocate, write and check a registry-backed PRD number, and make review-prd raise Critical findings for numbering defects (autonomous run via /develop-next, roadmap item T204).

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
| Board status        | In Progress ✅ (gh-stage `transitioned`; Priority already P2 Medium)        |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.204.*` exists in git                             | Branch created at `8074dad0`; pushed | —                    | 2026-10-15T14:53Z |
| 2. review-task             | ✅ Done    | `task.204.review.{N}.{name}.md` exists (or skip logged)               | READY TO IMPLEMENT 8/10; 1 Critical + 7 Important fixed in the task doc; Planned → Ready for Development | —                    | 2026-10-15T14:58Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline, 1 iteration; 27/27 phases; ci:fast green (5692/0) | docs/tasks/task.204.numbered-prds-in-prd-skills/.summaries/step-3-loop-audit-1.json | 2026-10-15T15:19Z |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #675: https://github.com/Gamaroff/agent-skills/pull/675 | —                    | 2026-10-15T15:24Z |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.204.qa.{N}.*.md`; `task.204.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | 8 cycles (5 + 2 + 1 granted); escalated at the loop limit; accepted by the maintainer via Step 5c — PR review 1 CONCERNS | —                    | 2026-10-15T21:10Z |
| 7. finalise                | ❌ Failed  | `task.204.dod.{N}.*.md`; task `status: accepted`                      | DoD 1: GAPS — CI red (stdout-drain guard on migration-guard.mjs), CHANGELOG + 2 reference docs, CQ4 mutation map | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-10-15

- Invoked by `/develop-next` (roadmap item T204) with `--defaults`; AUTONOMOUS RUN directive in force.
- Phase 0 run inline (no subagents): input was a direct file path, so no resolver; tracker poller not dispatched (Step 1's `gh-stage.js` reads the board itself); lite-mode inputs derived from the document by hand.
- Lite-mode inputs: risk_level=absent (risk_ok=true), phase_count=5 (Phases 0–4, ≥3), single_module=false (seven+ skills) → PIPELINE_MODE=standard.
- Feature branch base: develop — source: recommended (`--defaults`, on `develop`)
- PR target branch: develop — source: recommended (`--defaults`)
- Mode: standard — source: detector
- Skips: none — source: none
- Questions asked: 0 (`pipeline-answers.js` returned `questions: []`; `--defaults`, no conflicts)
- qa-planning gate: skipped (auto — no prompt)
- Task status at start: `planned` — proceed; Step 2 `/review-task` validates and promotes.
- Branch: `feature/task.204.numbered-prds-in-prd-skills` from `develop` @ 8074dad0, pushed with upstream. Report stashed/restored around branch creation.
- Tracker #647: work-started comment `posted`; GitHub board: work-started → transitioned (In Progress).
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md

### Step 2 — review-task — 2026-10-15

- review-task invoked (no review report existed; status `planned` → run). Output format auto-answered: Comprehensive report.
- Pre-pass B (architecture): aligned, 10 axes, 3 low findings; Pre-pass C (codebase): not-implemented; Phase 0 gate (task.202/203 accepted) passes.
- Review report: docs/tasks/task.204.numbered-prds-in-prd-skills/task.204.review.1.numbered-prds-in-prd-skills.md — READY TO IMPLEMENT, 8/10.
- Critical C1 (falsified): `doc-id next prd` returns `registry-missing` on an empty tree and no CLI writes a registry row — task now writes the row via `appendPrdRow` (no engine change), bootstraps only when no numbered PRD exists.
- Step 8.5 auto-answered: Yes, apply all critical + important fixes (11 fixes applied, 0 skipped). Step 9 auto-answered: Yes, fixes complete → Planned promoted to Ready for Development. reviewed_blob stamped. Plan file annotated with the three superseded details.
- Review outcome comment skipped — review-task reported `posted` (one event, one writer). Tracker key unchanged (#647).

### Step 3 — develop — 2026-10-15

- Pre-develop surface map: 20 files identified in create-prd, review-prd, shard-prd, new-product-prd, prd-template, brownfield-prd-template, 8 reader-site skills, tests/epic-numbering-retirement.test.js, doc-id.js/migrate-doc-numbering.mjs (Explore subagent). Patterns: create-epic allocation block `:103-145` (marker first line, `DOC_ID=.agents/skills/<skill>/references/doc-id.js`), check block `:419-425`; block tests in `tests/epic-numbering-retirement.test.js` (`blockBy(skill, marker)` via `qa-execute-snippets.mjs` `extractBlocks`).
- Plan file found: docs/tasks/task.204.numbered-prds-in-prd-skills/task.204.plan.numbered-prds-in-prd-skills.md — included as implementation context for /develop (annotated at review with three superseded details; the task document wins).
- Fast gate precondition: `develop.fastGateCommand` unset → default `npm run ci:fast`; script defined.
- Step 3 inline — /develop not invoked: plan file + surface map both recorded; the plan names every hunk.
- Deviation (naming): the task's "Step 1c" for allocation collides with create-prd's existing brownfield `1c. Check for document-existing-project Output`; the allocation step is `Step 1.5: Allocate the PRD Number (both modes)`. Same content, same position (after Step 1, before Step 2).
- Implemented: create-prd Step 1.5 (allocate / keep blocks), Register-a-new-PRD block (appendPrdRow), Step 3.5 blocking check; review-prd resolve / numbering-check / migration plan + apply / report-number blocks; templates, new-product-prd, shard-prd (in-place, legacy refusal); 9 reader sites; retirement-guard ALLOW entries dropped; `prd-skill-numbering.test.mjs` (16 tests).
- Decision: review-prd's report number is computed through `doc-id.js` parse, not `newest-numbered.sh` — bundling that script pulled resolve-platform.sh's 48-file closure into review-prd via its header comment.
- Decision (scope, minimal): `shared/resources/migrate-doc-numbering.mjs` `TEST_FILE_EXCEPTIONS` literal re-spelled as path segments. As a `shared/resources/…` literal it was a bundling instruction that vendored a test file and its closure (+45 files) into review-prd, the first skill to bundle the script. Value unchanged; migrate tests green.
- Fast gate iter 1: 1 failure — `tests/unbound-default-reads.test.js` (six new block inputs undeclared). Fixed by declaring them in INPUTS (task.205 precedent). Iter 2: ci:fast TEST_EXIT=0, 5692 pass / 0 fail, run with `.agents/skills` moved aside.
- Mutation proofs (each restored after): drop Step 3.5 HALT → row 4 red; bootstrap unconditionally → row 1b red; drop unnumbered continuation HALT → row 9 red; prefix match on number → row 7 red; old glob without artifact/dir filter → row 7 red; drop PRD-dir prefix filter → row 5 red; count+1 for report N → row 7 red (after the series was given a gap — it survived the first fixture).
- Loop audit run inline (deterministic checkbox count + `git log`), not via an Explore subagent: status ready-for-review, 27/27.
- Development completion comment posted to github issue 647.

### Step 5–6 — QA loop — 2026-10-15

- QA cycle 1 (5a): qa-task, code_review_blocking=true; traceability mapper skipped (Success Criteria are a checkbox list, not a table). Diff reviewer (Explore, 142 s): 4 findings, 2 high-confidence promoted (CR-1, CR-2). Probe engine `fence:` form on the allocation slug guard: 11 executed, engages. `eval:all` exit 0, `bundle:check` clean. Gate 1 CONCERNS 60/100.
- QA Cycle 1 — changes-requested: stage-disabled.
- QA cycle 1 (5b): qa-fix — see QA Iteration History.
- QA cycle 2 (5a): refute pass over the whole branch at 703dd536 (Explore, 165 s): 7 bugs + 1 cleanup, 4 promoted (CR-1, CR-2, CR-3, CR-5; all reproduced). Probe re-run 11/engages. Gate 2 CONCERNS 60/100. qa-task steps run by the orchestrator from the already-loaded skill text this cycle, not a fresh `/qa-task` invocation.
- QA Cycle 2 — changes-requested: stage-disabled. Narrowing residue: not signalled (medium-files-differ).
- QA cycle 3 (5a): SAFETY_REPROBE=true by judgement (gate 2 security CONCERNS on a path escape; clause 1 false) → unscoped re-probe (Explore, 123 s): 5 bugs, 1 promoted (CR-1, reproduced). Probe: new domain control (13 cases) + slug control (11), 24 executed, both engage. Gate 3 CONCERNS 90/100.
- QA Cycle 3 — changes-requested: stage-disabled.
- QA cycle 4 (5a): scoped to the 3 files changed since gate 3 (SAFETY_REPROBE false: gate 3 security PASS). Explore reviewer 75 s: 2 bugs + 1 cleanup, 1 promoted (CR-1, reproduced). Probe 24/engages. Gate 4 CONCERNS 90/100. Route: continue (not-a-pass-gate).
- QA Cycle 4 — changes-requested: not signalled (stage-disabled, unchanged).
- QA cycle 5 (5a): SAFETY_REPROBE=true by judgement (gate 4 security CONCERNS on containment) → unscoped re-probe, 115 s: 4 findings, 3 promoted (all reproduced; two re-rated high → medium with the measurement recorded in the gate). Gate 5 CONCERNS 70/100. Route: continue. Budget: cycle 5 of 5.
- QA loop re-entry: 2 extra cycles granted (user approved "Resume at 5a with 2 more cycles"); 0 cycle(s) run outside the loop back-filled from disk. `grant-qa-cycles.sh`: lock restored from the halt snapshot, QA_CYCLE=5, qa_max_cycles=7, reenter_at=5a.
- QA cycle 6 (5a): fresh `/qa-task` invocation; SAFETY_REPROBE=true by judgement (gate 5 security CONCERNS on containment) → unscoped re-probe (Explore, 265 s): 2 bugs, 1 promoted (CR-1, reproduced). Probe 24/engages. ci:fast 5712/0 (symlink parked). Gate 6 CONCERNS 90/100. Route: continue (not-a-pass-gate). PR comment posted; issue comment `posted`.
- QA Cycle 6 — changes-requested: stage-disabled.
- QA cycle 6 (5b): qa-fix — see QA Iteration History; fix commit 84b065af; PR comment posted, issue comment `posted`.
- QA cycle 7 (5a): qa-task steps run by the orchestrator from the skill text loaded for cycle 6. SAFETY_REPROBE=true by judgement → unscoped re-probe (Explore, 238 s): 3 bugs, 2 promoted (CR-1 HIGH reproduced by QA, provenance: engine identical on develop, call path new here → in scope; CR-2). Probe 24/engages. Gate 7 FAIL 70/100; task status → in-progress. Convergence: HIGH 0,0,0,0,0,0,1 — no trip (first-time HIGH). Route: continue. PR comment posted; issue comment `posted`. Note: the CR-1 engine fix was started in the working tree before gate 7 was written; gate 7's head is 84b065af, the commit the reviewer read.
- QA loop re-entry: 1 extra cycle granted (user approved "Resume at 5a with 1 more cycle"); 0 cycle(s) run outside the loop back-filled from disk. `grant-qa-cycles.sh`: lock restored, QA_CYCLE=7, qa_max_cycles=8, reenter_at=5a.
- Acceptance after escalation (2026-10-15): the maintainer chose option 2 of the escalation — accept the current gate via Step 5c, then `/finalise` — over another grant. Basis: gate 8 raised no HIGH; its five mediums are fixed (CR-1, CR-3) or guarded by `review-prd/scripts/migration-guard.mjs` (CR-2, CR-4, CR-5) in `63c1e06b`, verified by the gate-8 test row (40/40, 8 mutations each red) and `ci:fast` 5716/0, but read by no gate. Step 5c `/review-pr --effort medium --comment --no-code` returned CONCERNS (task.204.pr-review.1.numbered-prds-in-prd-skills.md, 0 high, 3 medium, 2 low); PR comment posted. PC-1, PC-2, PC-5 fixed in the task document; PC-3 is this entry; PC-4: the engine follow-up is task.211 (GitHub #676), written in a develop worktree (`.worktrees/task.211`) and not yet committed, so it does not ride into PR #675.
- QA cycle 8 (5b): user chose scope (fix blocks, guard engine) and CR-4 direction (migration asks for a domain); fix 63c1e06b; changes-requested stage-disabled; PR comment posted, issue comment `posted`.
- QA cycle 8 (5a): SAFETY_REPROBE=true by judgement; unscoped re-probe directed to exercise the migration path end to end (Explore, 340 s): 6 bugs, 5 promoted (all reproduced; CR-2 and CR-5 verified by QA on this branch and develop's engine — engine defects, in scope as this task wires the path). Probe 24/engages. Gate 8 CONCERNS 50/100. Route: continue. PR comment posted; issue comment `posted`.

### Step 4 — create-pr — 2026-10-15

- SCOPE_PATHS: docs/tasks/task.204.numbered-prds-in-prd-skills, shared/resources, 15 skill dirs, tests, evals/shared/tests (the last added explicitly: the new test file sits in a directory with no tracked change). Pre-flight guard: nothing out of scope to hold.
- Commits: f1c061a4 fix(migrate-doc-numbering), 76513756 feat(create-prd), 1e5f30b6 feat(review-prd), 28aea8c9 refactor(prd-skills), 5f1ad2e0 test(prd-skills), 18e1d685 docs(task.204). Leak check: every file inside SCOPE_PATHS.
- PR created: https://github.com/Gamaroff/agent-skills/pull/675 (base develop, Closes #647). Issue comment `posted`. GitHub board: in-review → stage-disabled. Post-PR state: OPEN (checked inline with `gh pr view`).

---

## Issues Log

_Problems encountered and how they were resolved or escalated._
- Session crash mid-5b (2026-10-15 ~17:50): the fast gate had moved the gitignored `.agents/skills` symlink into the session scratch dir, which did not survive; the symlink was missing on resume. Restored with `ln -s ../skills .agents/skills`; the gate was re-run (green) with the symlink parked under `.claude/state/` instead, so a crash cannot lose it.

- Step 4 commit series rebuilt once before push: the repo's pre-commit hook refuses a commit while any generated `references/` copy is untracked, so the first two scoped commits failed and their staged files rode into the third. Reset (unpushed) and re-committed in order with `BUNDLE_PRECOMMIT_WARN=1` on the intermediate commits only; the copies land in the commits that reach them.


### QA Loop Limit Reached — 2026-10-15

The pipeline completed 5 qa-task/qa-fix cycles without a clean PASS.

**Final gate status**: CONCERNS (70/100), gate 5 — its three findings are fixed in `88f8ba81`, which no gate has read
**HIGH findings per cycle**: 0, 0, 0, 0, 0 — no blocker at any cycle (gate 5 re-rated two reviewer-high findings to medium on a measured plausibility check)
**MEDIUM findings per cycle**: 4, 4, 1, 1, 3
**Remaining issues** (from gate 5, all fixed in `88f8ba81`, ungated):
- CR-1 medium — the registry write followed a symlink — `skills/create-prd/SKILL.md`
- CR-2 medium — review-prd compared paths as text — `skills/review-prd/SKILL.md`
- CR-3 medium — the keep outside-root refusal pointed at an impossible remedy — `skills/create-prd/SKILL.md`

**What was attempted per cycle**:
- Cycle 1: review-prd directory input and monolith findings; +5 test rows; all rows mutation-proven (`703dd536`)
- Cycle 2: numbering scope consolidated into one ownership rule; full-stem input; DOMAIN guard (`eb14a639`)
- Cycle 3: checker failures are not clean results; keep-path layout; realpath at allocate/register (`96604439`)
- Cycle 4: realpath at keep; post-check-failed arm (`5ad0b163`)
- Cycle 5: containment at every block that reads or writes a PRD path; shard-prd guarded (`88f8ba81`)
- Gate-the-last-fix half-cycle (route 2c) considered and declined: `medium-not-falling` — MEDIUM reads 1, 1, 3 over cycles 3–5.

**Likely root cause**: one rule — "a PRD path stays inside `${PRD_ROOT}`" — is enforced separately in every fenced block that touches a path, because blocks cannot share code. Gates 2–5 each found one more site (DOMAIN, symlinked domain at allocate/register, at keep, then the registry write and review-prd). Cycle 5 closed every site the re-probe enumerated, but the defect class is the duplication itself: the durable fix is one layout-and-containment predicate in `doc-id.js` that every block calls — an engine change outside this task's stated scope.

**Recommended next steps**:
1. Grant 2 more cycles (`/develop-task` → "Resume at 5a with 2 more cycles"): cycle 6 gates `88f8ba81`, the fix no gate has read; all three gate-5 findings are already fixed there.
2. Open a follow-up task: one PRD-path containment predicate in `doc-id.js` (`isPrdDocumentPath(root, file)` returning a reason), called by every create-prd / review-prd / shard-prd block — recorded in gates 4 and 5.
3. Also outstanding as recorded follow-ups: recovery for a PRD written without its registry row (gate-2 CR-4).

### QA Loop Limit Reached — 2026-10-15 (after re-entry)

The pipeline completed 7 qa-task/qa-fix cycles (5 + 2 granted on re-entry) without a clean PASS.

**Final gate status**: FAIL (70/100), gate 7 — its findings are fixed in `e8d205a3`, which no gate has read
**HIGH findings per cycle**: 0, 0, 0, 0, 0, 0, 1 — the first HIGH appeared at cycle 7, outside the containment class
**MEDIUM findings per cycle**: 4, 4, 1, 1, 3, 1, 1
**Remaining issues** (from gate 7, all fixed in `e8d205a3`, ungated):
- CR-1 high — migrating a root-level docs/prd.md rewrote the bare word `prd` across the PRD tree, `type: prd` in other PRDs included, and reported ok — `shared/resources/migrate-doc-numbering.mjs` (defect present in develop's task-203 engine; this branch adds the review-prd call path)
- CR-2 medium — shard-prd checked the file's realpath, not the directory md-tree writes into — `skills/shard-prd/SKILL.md`
- CR-3 medium, advisory — review-prd's realpath stop ran after the text-outside early exit — `skills/review-prd/SKILL.md`

**What was attempted per cycle** (cycles 1–5: see the entry above):
- Cycle 6: gate 6 CONCERNS 90 (1 medium); review-prd stops on a PRD resolving outside the root; report-number block contained; shard-prd outside-root message (`84b065af`)
- Cycle 7: gate 7 FAIL 70 (1 high, 1 medium); migration token pass skips undotted stems; shard directory contained; review-prd realpath stop before the text-outside exit (`e8d205a3`)
- Gate-the-last-fix half-cycle (route 2c) considered and declined: `high-on-last-gate` — HIGH is 1 on cycle 7's gate.

**Likely root cause**: two separate things. (1) The containment rule is still restated per fenced block — cycles 6 and 7 each found one more site (review-prd report directory, shard-prd target directory, legacy PRD above the root); the durable fix is still one predicate in `doc-id.js`. (2) Cycle 7's HIGH is not that class: the safety re-probe exercised the migration path end to end for the first time and found a corruption bug in the task-203 engine that this task newly exposes. It is fixed and regression-tested, but no gate has read the fix.

**Recommended next steps**:
1. Grant 1–2 more cycles (`/develop-task` → "Resume at 5a with {k} more cycles"): cycle 8 gates `e8d205a3`, where all gate-7 findings are fixed.
2. Or accept after a manual check of `e8d205a3`: run Step 5c (`/review-pr --effort medium --comment --no-code`), then `/finalise`.
3. Follow-up tasks either way: the shared containment predicate in `doc-id.js`; recovery for a PRD written without its registry row (gate-2 CR-4).

### QA Loop Limit Reached — 2026-10-15 (after second re-entry)

The pipeline completed 8 qa-task/qa-fix cycles (5 + 2 + 1 granted) without a clean PASS.

**Final gate status**: CONCERNS (50/100), gate 8 — its findings are fixed or guarded in `63c1e06b`, which no gate has read
**HIGH findings per cycle**: 0, 0, 0, 0, 0, 0, 1, 0
**MEDIUM findings per cycle**: 4, 4, 1, 1, 3, 1, 1, 5
**Remaining issues** (from gate 8; all addressed in `63c1e06b`, ungated):
- CR-1 medium — apply failure hid findings and undo — `skills/review-prd/SKILL.md` (fixed)
- CR-2 medium — frontmatter-less legacy PRD can never migrate — `shared/resources/migrate-doc-numbering.mjs` (guarded in review-prd; engine fix → follow-up)
- CR-3 medium — one --name only — `skills/review-prd/SKILL.md` (fixed)
- CR-4 medium — migrated root placement refused by create-prd — `skills/create-prd/SKILL.md` (guarded as no-domain; follow-up: the migration asks for a domain)
- CR-5 medium — outside links to a moved monolith go dead — `shared/resources/migrate-doc-numbering.mjs` (guarded as outside-links; engine fix → follow-up)

**What was attempted per cycle** (cycles 1–7: see the entries above):
- Cycle 8: gate 8 CONCERNS 50 (5 medium) — the re-probe exercised the migration path end to end for the first time. Maintainer chose the scope (fix review-prd's blocks; guard the engine's unsafe shapes; engine fixes to a follow-up) and the CR-4 direction (migration asks for a domain). New skill-local migration guard; several --name pairs; undo shown (`63c1e06b`).
- Gate-the-last-fix half-cycle (route 2c) considered and declined: `medium-not-falling` — MEDIUM reads 1, 1, 5 over cycles 6–8.

**Likely root cause**: the review surface kept growing, not the defect rate in the original change. Cycles 1–6 circled one containment rule duplicated per block; cycles 7–8 reached the task-203 migration engine through the path this task wires into review-prd, and found engine defects develop already carries. Each unscoped safety re-probe enumerates a larger surface than the last.

**Recommended next steps**:
1. Accept after a conformance review: run Step 5c (`/review-pr --effort medium --comment --no-code`) over `63c1e06b`, then `/finalise`. The engine defects are guarded, not live, on this branch.
2. Open the follow-up task the maintainer chose: fix the migration engine (frontmatter creation, outside-link prefilter, domain prompt for a domain-less PRD), then lift the matching guard refusals.
3. Separate follow-up: the shared PRD-path containment predicate in `doc-id.js` (gates 4–8), and recovery for a PRD written without its registry row (gate-2 CR-4).

### Finalise DoD Gaps — 2026-10-15

`/finalise` (DoD 1, `task.204.dod.1.numbered-prds-in-prd-skills.md`) returned GAPS. Security PASS (probe run by /finalise: 24 executed, 0 reproduced); compliance not applicable.

- **CI red (code):** `skills/review-prd/scripts/migration-guard.mjs:25` exits straight after `console.log`; `shared/resources/tests/stdout-drain-on-exit.test.mjs` ("no NEW file adopts exit-after-write") fails. CI `test` failed on `63c1e06b`, `687560bb`, `a61f3e28`. Cycle 8's local "ci:fast 5716/0" was run while the new file was still untracked, and the guard reads tracked files only — the local green did not cover it.
- **CHANGELOG.md:** no task 204 entry under `[Unreleased]`.
- **Reference docs:** `docs/concepts/quickstart-story.md:72-75, 83, 149` and `docs/reference/configuration.md:20` show the old unnumbered PRD paths.
- **CQ4:** "every assertion mutation-proven" has per-cycle counts, not a member-by-member map of the 40 rows.

The CI fix is a code change, so it re-enters QA at 5a before /finalise re-runs (`reenter-qa-after-finalise.sh`).

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-10-15
**Gate Result**: CONCERNS (60/100)
**Issues Found**: 4 medium — CR-1 directory input does not resolve; CR-2 a root-level docs/prd.md absorbs other PRDs' findings; QA-1 no test for the migration-blocker / monolith paths; QA-2 7 of 16 rows mutation-proven
**HIGH findings**: 0
**MEDIUM findings**: 4
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)
**Fixes Applied**: CR-1 directory input resolves to `{dir}/{dir}.md`; CR-2 a PRD outside `${PRD_ROOT}` reports only its own finding; CR-3 (advisory) resolver failure exits 2 with its own message; CR-4 (advisory) register block reads P from PRD_FILE's name. Test rows +5 (21 total), every row mutation-proven (16 new mutations, each red as predicted). Step 3.5 probe: "No PRD found matching" → review-prd/SKILL.md only (updated); "INPUTS: P, DOMAIN" → 0 (removed text). Gate 1 findings ingested inline (this run wrote the gate; ingester subagent not dispatched — independence loss recorded). Observation #54 logged (Step 4b does not syntax-check refused blocks — three blocks broke on an apostrophe this session).
**Commit**: `703dd536` (pushed; PR #675 OPEN after push — checked inline with `gh pr view`)

### QA Cycle 2 — 2026-10-15
**Gate Result**: CONCERNS (60/100)
**Issues Found**: gate 1's four fixed and verified; 4 new medium — CR-1 a PRD file that does not own its directory absorbs others' findings; CR-2 the PRD file itself is never checked; CR-3 full-stem input does not resolve; CR-5 DOMAIN unvalidated (path escapes ${PRD_ROOT})
**HIGH findings**: 0
**MEDIUM findings**: 4
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)
**Fixes Applied**: CR-1/CR-2 — numbering scope consolidated into one ownership rule (Step 2.6 repeat-subject trigger: gate-2 CR-1 re-hit gate-1 CR-2's filter; move: consolidate — the file's own `doc-id check` findings always, plus its directory's corpus findings only when it owns that directory); CR-3 full-stem input; CR-5 DOMAIN validated by the doc-id slug rule (`bad-domain`); advisory CR-6 duplicate-id from either side, CR-7 duplicate-row advice names the move, CR-8 register block takes folder/href from PRD_FILE and refuses an off-layout file; CR-4 (abandoned-create recovery) deferred to gate recommendations. Test rows +8 (29 total); 11 mutations, each red as predicted after two rows were added for the two that first survived (own check dropped; layout unchecked). Probe phrases "registry moved since Step 1.5", "bad-domain", "does not own its directory" → one file each, updated. Narrowing offer: not signalled (medium-files-differ).
**Commit**: `eb14a639` (pushed; PR #675 OPEN)

### QA Cycle 3 — 2026-10-15
**Gate Result**: CONCERNS (90/100)
**Issues Found**: gate 2's four fixed and verified; 1 new medium — CR-1 a crashed numbering checker reports no findings and exits 0; 4 advisory (CR-2 keep-block layout, CR-3 migration plan errors, CR-4 unreadable FOUND_PRD, CR-5 symlinked domain)
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 3 of 5)
**Fixes Applied**: CR-1 numbering verdict is exit code + parsed reason together (a crash → "could not run", exit 1); advisory CR-2 keep block applies the register layout rule (off-layout refused), CR-3 migration plan refuses a usage/crash answer, CR-4 unreadable FOUND_PRD reported as such, CR-5 realpath check on an existing domain directory (allocate) and on the file (register). Gate-2 CR-4 (abandoned-create recovery) still deferred. Test rows +4 (33); 6 mutations, each red as predicted. Probe: each changed message in one file (updated); "resolves outside" also matches develop-next/references/roadmap-selection.md — unrelated subject, unaffected. Route classifier at cycle 3: continue (not-a-pass-gate; route 2 declined: product-defect-signal; qa.testArtifactGlobs not configured).
**Commit**: `96604439` (pushed; PR #675 OPEN)

### QA Cycle 4 — 2026-10-15
**Gate Result**: CONCERNS (90/100)
**Issues Found**: gate 3's finding + 4 advisories fixed and verified; 1 new medium — CR-1 the keep block lacks the realpath containment cycle 3 gave allocate and register (enumeration miss); 2 advisory (CR-2 post-check-failed, CR-3 predicate in three blocks)
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 4 of 5)
**Fixes Applied**: CR-1 keep block gets the realpath containment (the symlink row now runs allocate, register and keep — one row holds the population of three blocks; move: patch + population row, because the reviewer's consolidation, a shared predicate in doc-id.js, is an engine change this task leaves to task.202's owner — recorded in gate 4's future recommendations); advisory CR-2 `post-check-failed` has its own arm (nothing to apply, findings printed). Test rows +1 (34) and the symlink row extended; 2 mutations, each red as predicted.
**Commit**: `5ad0b163` (pushed; PR #675 OPEN)

### QA Cycle 5 — 2026-10-15
**Gate Result**: CONCERNS (70/100)
**Issues Found**: gate 4's finding fixed and verified; 3 new medium — CR-1 the registry write follows a symlink; CR-2 review-prd's numbering check compares paths as text; CR-3 the keep outside-root refusal points at an impossible remedy (CR-1, CR-2 re-rated high → medium: `find docs/prd -type l` → 0, no PRD-skill writer creates a symlink); 1 advisory (CR-4 shard-prd block unguarded)
**HIGH findings**: 0
**MEDIUM findings**: 3
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Escalating — loop limit reached
**Fixes Applied**: Step 2.6 repeat subject (gates 2–5 each found one more site of one containment rule); move: consolidate within this task's scope — the rule now holds at every block that reads or writes a PRD path (registry write refuses a symlink; review-prd numbering checks realpath; keep has its own outside-root message; shard-prd block guarded: bound, numbered, own directory, realpath inside the root, doc-id.js now bundled), and one population row holds register, numbering and keep together. The single shared predicate in doc-id.js stays a recorded follow-up (engine change). Test rows +2 (36); 5 mutations, each red as predicted.
**Commit**: `88f8ba81` (pushed; PR #675 OPEN) — no gate has read this fix

### QA Cycle 6 — 2026-10-15
**Gate Result**: CONCERNS (90/100)
**Issues Found**: gate 5's three findings fixed and verified; 1 new medium — CR-1 review-prd reports a PRD resolving outside the root but does not stop, and the report-number block has no containment; 1 low advisory (CR-2 shard-prd shared refusal message)
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 6 of 7)
**Fixes Applied**: Findings taken inline from gate 6 (two findings, already in context from 5a; ingester not dispatched — recorded as a deviation). CR-1: review-prd's numbering block exits 3 `outside-root` on a PRD that resolves outside the root and its case arm stops the review with the replace-the-link remedy; the next-report-number block resolves PRD_ROOT and refuses a report directory whose realpath leaves the PRD root (or the working tree, for a legacy PRD above the root). Advisory CR-2: shard-prd's outside-root refusal has its own message, and its prose names the refusal. Step 2.6 repeat subject (containment rule, sixth site): move — patch; the consolidating move (one predicate in doc-id.js) stays the recorded follow-up, an engine change outside this task. Probe: `through a symlink` / `resolves outside` / `next review report number` over executed docs — review-prd, shard-prd updated; create-prd unaffected (its own arms already distinct); probe-boundary-rule.md, qa-runnable-prose-detection.md, develop-next roadmap-selection.md unaffected (other subjects). Population 7. Test rows +1 (37) and the gate-5 and shard rows extended; 4 mutations (numbering does not stop; report-number containment off; legacy base forced to root; shard outside arm off), each red as predicted. ci:fast 5713/0 (symlink parked), bundle:check clean, validate rc 0.
**Commit**: `84b065af` (pushed; PR #675 OPEN)

### QA Cycle 7 — 2026-10-15
**Gate Result**: FAIL (70/100)
**Issues Found**: gate 6's finding fixed and verified; 1 HIGH — CR-1 migrating a root-level docs/prd.md rewrites the bare word `prd` across the PRD tree, `type: prd` in other PRDs included, and reports ok (reproduced by QA; same in develop's engine, call path added by this branch); 1 medium — CR-2 shard-prd checks the file's realpath, not the target directory; 1 advisory medium (CR-3)
**HIGH findings**: 1
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Escalating — loop limit reached
**Fixes Applied**: Run from the qa-fix skill text loaded for cycle 6 (findings inline from gate 7). CR-1: the migration engine's token pass keeps undotted stems (`prd`, `index`) and their basenames out — their paths still move through the literal pass (shared/resources/migrate-doc-numbering.mjs + bundled review-prd copy); regression row migrates docs/prd.md beside a numbered PRD and asserts that PRD's bytes unchanged. CR-2: shard-prd checks the realpath of the directory md-tree writes into as well as the file. Advisory CR-3: review-prd's realpath stop now runs before the text-outside early exit, against the working tree for a legacy PRD above the root. Step 2.6: CR-2/CR-3 repeat subject (containment) — move: patch, consolidation stays the doc-id.js follow-up; CR-1 is a new subject. Probe: `token pass` / `whole old stems` / `old stem` over executed docs — population 0 (the token pass is stated only in the engine's own comment, updated). Test rows +2 (39); 5 mutations, each red (M2 basename filter red only after the fixture gained a bare `prd.md` mention — recorded). ci:fast 5715/0 (symlink parked), engine suite 44/44, bundle:check clean, validate rc 0.
**Commit**: `e8d205a3` (pushed; PR #675 OPEN)

### QA Cycle 8 — 2026-10-15
**Gate Result**: CONCERNS (50/100)
**Issues Found**: gate 7's findings fixed and verified; 5 new medium on the migration path review-prd offers — CR-1 apply failure hides findings and revert; CR-2 frontmatter-less legacy PRD can never migrate (engine, on develop too); CR-3 one --name only; CR-4 create-prd refuses the migrated root placement; CR-5 outside links to a moved monolith go dead (engine, on develop too); 1 advisory low (CR-6 PRD root outside the working tree)
**HIGH findings**: 0
**MEDIUM findings**: 5
**PR Review**: CONCERNS (task.204.pr-review.1, run after escalation on the maintainer's accept decision)
**Loop exit**: n/a — this exit not taken
**Action**: Escalating — loop limit reached
**Fixes Applied**: Scope decided by the user (qa-fix Step 2a, two options offered): "fix blocks, guard engine"; CR-4 layout: "migration asks for a domain" (follow-up). CR-1: the apply block prints the engine's findings and its revert command on a non-zero exit. CR-3: MIG_NAME takes one `<path>=<slug>` per line, each its own --name, in plan and apply; the unplaced-prd instruction says so. CR-2/CR-4/CR-5: new skill-local `skills/review-prd/scripts/migration-guard.mjs` (one definition, called by both blocks) reads the plan and refuses `no-frontmatter` (no closed block), `no-domain` (a PRD that would land directly under the root) and `outside-links` (a source outside the root named by files outside it); the apply block re-plans and runs the guard before moving anything. Engine fixes for CR-2, CR-5 and the domain prompt for CR-4 go to a follow-up task. Probe: `MIG_NAME` / `unplaced-prd` / `revert command` — population 1 (review-prd SKILL.md, updated); task doc Step 2 line is the historical plan, unaffected. Test rows +1 (40); 8 mutations, each red in the gate-8 row (one row holds all eight assertions — recorded). ci:fast 5716/0 (symlink parked), bundle:check clean, validate and quick_validate pass.
**Commit**: `63c1e06b` (pushed; PR #675 OPEN) — no gate has read this fix

---

## Completion

**Finished**: {populated at end}
**Final Status**: Escalated — QA loop limit reached (8 cycles after two grants; gate 8 CONCERNS 50/100, its findings fixed or guarded in `63c1e06b` and ungated)
**Branch**: feature/task.204.numbered-prds-in-prd-skills
**PR**: https://github.com/Gamaroff/agent-skills/pull/675
**QA Iterations**: 8 (loop limit after two re-entries)
**DoD Summary**: task.204.dod.1.numbered-prds-in-prd-skills.md — GAPS
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}

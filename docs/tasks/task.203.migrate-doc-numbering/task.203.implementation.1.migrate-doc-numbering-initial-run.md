# Implementation Report: Migrate documents to hierarchical numbering

**Task**: `task.203.migrate-doc-numbering.md`
**Run Number**: 1
**Started**: 2026-10-15 07:12
**Status**: In Progress

---

## Summary

Ship `migrate-doc-numbering.mjs` (dry-run by default, `--apply`, `--check`) and run it on this repository's onboarding PRD, retiring the global epic registry — first autonomous run via `/develop-next` (roadmap row T203).

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | high                                                                       |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | In Progress ✅ (gh-stage work-started: transitioned; Priority already P2 Medium) |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.203.*` exists in git                             | `feature/task.203.migrate-doc-numbering` created at `e917d9da` | —                    | 2026-10-15T07:14Z |
| 2. review-task             | ✅ Done | `task.203.review.{N}.{name}.md` exists (or skip logged)               | `task.203.review.1.migrate-doc-numbering.md` — READY TO IMPLEMENT 8/10 after fixes (1 Critical, 6 Important fixed); Planned → Ready for Development | — (pre-pass B/C inline in report) | 2026-10-15T07:20Z |
| 3. develop                 | ✅ Done | Task status == `Ready for Review`                                      | Inline (plan + surface map); 1 iteration; loop audit ready-for-review 22/22 at `aa427c4e`; ci:fast + eval:all green | — | 2026-10-15T07:46Z |
| 4. create-pr               | ✅ Done | PR URL; issue comment posted                                           | PR #671: https://github.com/Gamaroff/agent-skills/pull/671 | — | 2026-10-15T07:47Z |
| 5–6. qa-task / qa-fix loop | ✅ Done | `task.203.qa.{N}.*.md`; `task.203.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | 3 cycles; gate 3 CONCERNS 90 (empty queue); 5c `task.203.pr-review.1` APPROVE | — | 2026-10-15T08:43Z |
| 7. finalise                | ❌ Gaps | `task.203.dod.{N}.*.md`; task `status: accepted`                      | `task.203.dod.1.migrate-doc-numbering.md`: NOT ACCEPTED, 2 gaps (CI `link-check` red; no CHANGELOG entry). HALT | — |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-10-15

- Invoked by `/develop-next` (roadmap item T203, source `roadmap`) with `--defaults` — autonomous run; no prompts.
- Feature branch base: develop — source: recommended (`--defaults`; on `develop`, task Q1 Recommended)
- PR target branch: develop — source: recommended (`--defaults`; task Q2 Recommended)
- Speed mode: standard — source: detector; skips: none; refused: none; questions asked: 0 (`pipeline-answers.js resolve`)
- qa-planning gate: skipped (auto — no prompt)
- Phase 0 run inline (0a-parallel agents not dispatched — path given exactly). Lite-mode inputs derived from the document: `risk_level: high` (not in {low, absent}), phase_count 5 (Phases 0–4), single_module false (shared/resources engine + docs/prd corpus + examples + tests) → PIPELINE_MODE = standard.
- Tracker: GitHub (no `JIRA_URL`); TRACKER_ISSUE = #646.
- Status at start: `planned` → Step 2 `/review-task` validates and promotes autonomously.
- Branch: `feature/task.203.migrate-doc-numbering` from `develop` at `e917d9da`, pushed with tracking. Implementation report stashed before branch creation, restored after.
- Tracker: work-started comment → posted; GitHub board: work-started → transitioned (In Progress).
- Step 2: review-task ran (status `planned`, no prior report). Auto-answers: output Comprehensive report; Step 8.5 apply all critical + important fixes; Step 9 Yes, fixes complete. Review report: `docs/tasks/task.203.migrate-doc-numbering/task.203.review.1.migrate-doc-numbering.md`. Pre-pass B dispatched 07:14Z → returned in 27 s (`duration_ms` 26653); pre-pass C dispatched 07:14Z → returned in 22 s (`duration_ms` 21512).
- Planned promoted to Ready for Development by review-task. Key scope additions from review: `validate` added to the shared artifact vocabulary (C1), PRD-registry bootstrap + `registry-missing` blocker (I1), literal-pass exclusions (I2), three stale standards corrected (I3).
- Review outcome comment skipped at the pipeline level — review-task reported `posted` (stage `review-task`). Tracker key unchanged (#646).
- Pre-develop surface map: 20 files identified in shared/resources (doc-id.js, doc-links.js, generate-prd-epic-index.mjs, finalise-fix-and-recheck.mjs, tracker-comment.js, change-log.js) and shared/resources/tests; Explore dispatched 07:21Z → returned in 81 s (`duration_ms` 80748). Key facts: reuse `extractRelativeLinks` from doc-links.js; realpath entrypoint guard (finalise-fix-and-recheck.mjs:403-416); `process.exitCode`, never `process.exit()`; prettier covers `.mjs` but not `.md`.
- Plan file found: docs/tasks/task.203.migrate-doc-numbering/task.203.plan.migrate-doc-numbering.md — included as implementation context for /develop
- Step 3 inline — /develop not invoked: plan file + surface map both recorded, and the review had already re-derived every hunk the plan names.
- high-risk gate: auto-skipped qa-planning
- Fast gate: `develop.fastGateCommand` unset → falls back to `npm run ci:fast`, which this project defines (precondition passed).
- Design decisions inside the engine (all within the reviewed task's rules):
  - A name preceded by `/` is a path, not a name. The tree mentions example copies that share a basename (`examples/prd-example/prd.onboarding.md`), so the stem/basename pass skips slash-path occurrences and the literal pass maps whole repo-relative paths.
  - Link targets are replaced only in link-target position, so a label that repeats its target (`[`path`](path)` in CHANGELOG) keeps its history text.
  - `dirty-path` ignores untracked files: they are the ones the task says move by plain rename.
  - Nothing left to move with a dirty corpus answers `post-check-failed`, never `already` (a crashed apply cannot read as done).
  - Two pass-through blocker codes beyond the task's eight: `registry-invalid` (from doc-id `next`) and `bad-slug` (a legacy slug no hierarchical name can carry). Both stop rather than guess.
- Phase 4 commits: `7caa5641` (vocabulary + appendPrdRow), `61baa8dc` (engine + tests), `87c74702` (the migration, one commit, with the three standards sentences), `aa427c4e` (task doc → Ready for Review).
- Loop audit iter 1: dispatched 07:45Z → returned in 11 s (`duration_ms` 11278): status `ready-for-review`, 22/22, `aa427c4e`. Loop exited.
- Development completion comment posted to github issue 646 (`posted`).
- Step 4: scope = `docs/tasks/task.203.migrate-doc-numbering` (all code already committed in Step 3); 0 held files; leak check OK. Report committed (`docs(task.203): implementation report — through Step 3`). PR #671 created against `develop` with `Closes #646`. The PR body was written in the main context, not by the summariser subagent: every change was already in context. Issue comment `in-review` → posted. GitHub board: in-review → stage-disabled. Post-PR state checked inline (`gh pr view`): OPEN, 0 errors. Lock `pr_url` set; develop-next run state `prNumber: 671`.
- Step 5 setup: traceability mapper skipped (Success Criteria are checkbox lists, not a table; `HAS_SUCCESS_CRITERIA_TABLE=false`). GitHub board QA-start re-assert → stage-disabled.
- QA cycle 1 (5a): code reviewer dispatched 07:48Z → returned in 161 s (`duration_ms` 160742); 7 findings, all anchors `ok`. Gate 1 FAIL 50/100 (CR-1 HIGH; CR-2, CR-3, QA-1 MEDIUM). QA re-ran 9 mutation proofs (9/9 covered). The boundary was recorded `true` with `probes_executed: 0` (QA-1). PR comment and tracker `qa-gate-1` posted.
- QA cycle 1 (5b): changes-requested → stage-disabled. Findings ingester not dispatched — the gate was authored in this context, so ingest ran inline; independence lost. Fixes: CR-1, CR-2, CR-3, QA-1, plus advisory CR-4 and CR-6. The new tests surfaced two further defects, both fixed in the same cycle: the out-of-tree prefilter skipped the monolith's frontmatter edit, and the revert left a run-created registry behind. 38/38 tests; 7/7 fix mutations red. `checkPrdRoot` probed: `engages`, 11 executed. Doc probe for the old revert text: the only restatement was the task's own Rollback Plan, now updated. qa-fix PR comment and tracker `qa-fix-1` posted.
- QA cycle 2 (5a): refute + safety re-probe reviewer dispatched 08:06Z, returned in 230 s (`duration_ms` 229672); 7 findings, all anchors `ok`. Probe recorded (`task.203.qa.2.security.run.json`): `engages`, 11 executed. Gate 2 FAIL 60/100. QA re-ran 7 fix mutations, 7/7 covered.
- QA cycle 2 (5b): changes-requested → stage-disabled. Ingest inline (gate authored in this context; independence lost). Step 2.6 fired (a repeat subject: CR-1 hit the revert hint cycle 1 created); move: **consolidate** — `touchRecord()` is now the one record the dirty check, apply and revert read. Fixed CR-1, CR-2 (new `id-collision` blocker) and CR-3, plus advisory CR-4 to CR-7. 44/44 tests; 11/11 fix mutations red; probe still `engages`. Docs probe updated 3 restatements (task blocker table and § 10 Rollback, plan blockers table, engine header). qa-fix PR comment and tracker `qa-fix-2` posted.
- QA cycle 3 (5a): scoped reviewer (files changed since gate 2's head) dispatched 08:21Z, returned in 149 s (`duration_ms` 149282); 4 findings, none high-confidence, all anchors `ok`. Probe recorded (`task.203.qa.3.security.run.json`): `engages`, 11. QA re-ran 10 mutations, 10/10 covered. Gate 3 CONCERNS 90 with an empty queue → route 3 → 5c. While writing QA report 3, I first typed the gate head from memory, and the hash was wrong after its first 8 characters. It was caught and replaced with `git rev-parse HEAD`.
- Step 7 (finalise):
  - **DoD agents:** 4 dispatched at 08:30Z. AC PARTIAL (18/18 criteria; CHANGELOG missing), security (see below), compliance N/A, docs FAIL (CHANGELOG).
  - **Security probe:** the read-only security agent could not run it, so `/finalise` ran it: `engages`, 11 executed, 0 reproduced (`task.203.dod.1.security.run.json`). Security PASS.
  - **CI reading 1:** FAILURE @ `70ff65cf82008a38653e9be62cdd6ab89198293b`, over 5 checks. `link-check` FAILURE; `test`, `validate`, `shellcheck` and the branch policy SUCCESS.
  - **Step 8a:** not applicable. Two sections fail, and the red link-check files are neither the work item's own document nor co-located artifacts.
  - **Result:** Step 8. Gap report in the task doc, gaps Change Log row, PR gaps comment.
- - Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Step 3 — git rename detection on tiny fixtures.** The temp-repo integration test first saw 3 of 9 moves as delete + add. The moves were real `git mv`s, but git pairs a rename by content similarity, and a three-line fixture with one changed line falls under 50%. Fixed by padding the fixtures to realistic length. On the real tree all 146 moves record as `R`.
- **Step 3 — label rewritten with its target.** The first apply rewrote CHANGELOG's link label `` [`docs/prd/onboarding/prd.onboarding.md`] `` along with the target, because the label repeated it. History text must stay. Fixed (`replaceTargets` only replaces in link-target position), with a test, and mutation-proven.
- **Step 7 — finalise: DoD gaps, HALT.** `task.203.dod.1.migrate-doc-numbering.md` records NOT ACCEPTED with 2 gaps:
  1. **CI `link-check` red on `70ff65cf`.** It found 10 dead relative links in 4 migrated files (`story.1.1.1.plan…`, `story.1.1.2.plan…`, `story.1.2.1.sprint-review-summary.md`, `story.1.4.4.plan…`). Every one was already dead at its old path on `develop` (merge base `e917d9da`, checked link by link). The job reads only changed files, and the renames made these 4 files "changed". The engine keeps dead links byte-identical by design (AC15). So the red was not caused by the migration's link handling. But it blocks acceptance, and no QA cycle read CI, because CI is gated only at `/finalise`. The CI run had been red since the migration commit.
  2. **No `(task 203)` entry** under `CHANGELOG.md` `[Unreleased]`.
  - Both fixes are documentation-only, so a resume goes straight back to Step 7, with no QA re-entry.
  - Gap 1 needs a human decision: repair the 10 pre-existing dead links, or waive the red check.
- **Step 3 — one mutation stayed green at first.** Removing dead-link protection did not turn the dead-link test red: its dead link named nothing a pass could rewrite. Added a dead link that names a moving path; the mutation now goes red.

---

## Migration Mapping (Phase 4)

Run on `feature/task.203.migrate-doc-numbering` after `61baa8dc`. `…/` = `docs/prd/onboarding/`.

| Measure | Value | Command |
|---|---|---|
| Dry run | `dry-run`: 1 PRD, 4 epics, 17 stories, 146 files, 0 blockers, writes nothing (`git status --porcelain` 0 before and after) | `command node shared/resources/migrate-doc-numbering.mjs --json` |
| Dry-run wall clock | 2.248 s real, at load average 9.25 / 5.35 / 6.35 | `uptime; time command node shared/resources/migrate-doc-numbering.mjs --json` |
| Links (repo-wide) | 695 live, 39 dead, 112 re-pointed, 0 would heal | same payload, `.links` |
| Apply | `ok`: moved 146, wrote 158, corpus `ok` (22 documents, 0 findings) | `… --apply --json` |
| Second apply | `already`, corpus `ok`, no change | `… --apply --json` |
| git status | 146 `R`, 12 `M`, 1 `A` (`docs/prd/prd-registry.md`) | `git status --short` |
| Fast gate | `ci:fast` green: 5637 tests, 0 fail (`.agents/skills` moved aside) | `npm run ci:fast` |
| Slow tier | `eval:all` exit 0 (`.agents/skills` moved aside) | `npm run eval:all` |
| Bundle | 129 skills, 0 problems | `npm run bundle:check` |

| Kind | Old | New | Id |
|---|---|---|---|
| prd | `…/prd.onboarding.md` | `…/prd.1.onboarding/prd.1.onboarding.md` | prd.onboarding → 1 |
| epic | `…/epics/epic.1.quickstart-and-decision-tree-entry-point` | `…/prd.1.onboarding/epics/epic.1.1.quickstart-and-decision-tree-entry-point` | 1 → 1.1 |
| epic | `…/epics/epic.2.worked-prd-epic-story-examples` | `…/prd.1.onboarding/epics/epic.1.2.worked-prd-epic-story-examples` | 2 → 1.2 |
| epic | `…/epics/epic.3.runbook-tutorial-wrappers` | `…/prd.1.onboarding/epics/epic.1.3.runbook-tutorial-wrappers` | 3 → 1.3 |
| epic | `…/epics/epic.4.first-week-guided-learning-path` | `…/prd.1.onboarding/epics/epic.1.4.first-week-guided-learning-path` | 4 → 1.4 |
| story | `…/epics/epic.1.quickstart-and-decision-tree-entry-point/stories/story.1.1.first-task-in-10-minutes` | `…/prd.1.onboarding/epics/epic.1.1.quickstart-and-decision-tree-entry-point/stories/story.1.1.1.first-task-in-10-minutes` | story.1.1 → story.1.1.1 |
| story | `…/epics/epic.1.quickstart-and-decision-tree-entry-point/stories/story.1.2.first-story-in-60-minutes` | `…/prd.1.onboarding/epics/epic.1.1.quickstart-and-decision-tree-entry-point/stories/story.1.1.2.first-story-in-60-minutes` | story.1.2 → story.1.1.2 |
| story | `…/epics/epic.1.quickstart-and-decision-tree-entry-point/stories/story.1.3.decision-tree-which-path` | `…/prd.1.onboarding/epics/epic.1.1.quickstart-and-decision-tree-entry-point/stories/story.1.1.3.decision-tree-which-path` | story.1.3 → story.1.1.3 |
| story | `…/epics/epic.1.quickstart-and-decision-tree-entry-point/stories/story.1.4.rewrite-getting-started-terminus` | `…/prd.1.onboarding/epics/epic.1.1.quickstart-and-decision-tree-entry-point/stories/story.1.1.4.rewrite-getting-started-terminus` | story.1.4 → story.1.1.4 |
| story | `…/epics/epic.1.quickstart-and-decision-tree-entry-point/stories/story.1.5.readme-start-here-callout` | `…/prd.1.onboarding/epics/epic.1.1.quickstart-and-decision-tree-entry-point/stories/story.1.1.5.readme-start-here-callout` | story.1.5 → story.1.1.5 |
| story | `…/epics/epic.2.worked-prd-epic-story-examples/stories/story.2.1.capture-prd-as-worked-example` | `…/prd.1.onboarding/epics/epic.1.2.worked-prd-epic-story-examples/stories/story.1.2.1.capture-prd-as-worked-example` | story.2.1 → story.1.2.1 |
| story | `…/epics/epic.2.worked-prd-epic-story-examples/stories/story.2.2.capture-epics-as-worked-examples` | `…/prd.1.onboarding/epics/epic.1.2.worked-prd-epic-story-examples/stories/story.1.2.2.capture-epics-as-worked-examples` | story.2.2 → story.1.2.2 |
| story | `…/epics/epic.2.worked-prd-epic-story-examples/stories/story.2.3.capture-story-messy-path` | `…/prd.1.onboarding/epics/epic.1.2.worked-prd-epic-story-examples/stories/story.1.2.3.capture-story-messy-path` | story.2.3 → story.1.2.3 |
| story | `…/epics/epic.2.worked-prd-epic-story-examples/stories/story.2.4.update-examples-readme` | `…/prd.1.onboarding/epics/epic.1.2.worked-prd-epic-story-examples/stories/story.1.2.4.update-examples-readme` | story.2.4 → story.1.2.4 |
| story | `…/epics/epic.3.runbook-tutorial-wrappers/stories/story.3.1.before-you-start-anchor-runbooks` | `…/prd.1.onboarding/epics/epic.1.3.runbook-tutorial-wrappers/stories/story.1.3.1.before-you-start-anchor-runbooks` | story.3.1 → story.1.3.1 |
| story | `…/epics/epic.3.runbook-tutorial-wrappers/stories/story.3.2.satellite-runbook-callouts` | `…/prd.1.onboarding/epics/epic.1.3.runbook-tutorial-wrappers/stories/story.1.3.2.satellite-runbook-callouts` | story.3.2 → story.1.3.2 |
| story | `…/epics/epic.3.runbook-tutorial-wrappers/stories/story.3.3.common-first-time-errors` | `…/prd.1.onboarding/epics/epic.1.3.runbook-tutorial-wrappers/stories/story.1.3.3.common-first-time-errors` | story.3.3 → story.1.3.3 |
| story | `…/epics/epic.4.first-week-guided-learning-path/stories/story.4.1.day-1-tasks` | `…/prd.1.onboarding/epics/epic.1.4.first-week-guided-learning-path/stories/story.1.4.1.day-1-tasks` | story.4.1 → story.1.4.1 |
| story | `…/epics/epic.4.first-week-guided-learning-path/stories/story.4.2.day-2-stories` | `…/prd.1.onboarding/epics/epic.1.4.first-week-guided-learning-path/stories/story.1.4.2.day-2-stories` | story.4.2 → story.1.4.2 |
| story | `…/epics/epic.4.first-week-guided-learning-path/stories/story.4.3.day-3-messy-path` | `…/prd.1.onboarding/epics/epic.1.4.first-week-guided-learning-path/stories/story.1.4.3.day-3-messy-path` | story.4.3 → story.1.4.3 |
| story | `…/epics/epic.4.first-week-guided-learning-path/stories/story.4.4.day-4-parallel` | `…/prd.1.onboarding/epics/epic.1.4.first-week-guided-learning-path/stories/story.1.4.4.day-4-parallel` | story.4.4 → story.1.4.4 |
| story | `…/epics/epic.4.first-week-guided-learning-path/stories/story.4.5.first-week-index` | `…/prd.1.onboarding/epics/epic.1.4.first-week-guided-learning-path/stories/story.1.4.5.first-week-index` | story.4.5 → story.1.4.5 |

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-10-15
**Gate Result**: FAIL
**Issues Found**: 4 — CR-1 named L3 monolith never moved (HIGH); CR-2 revert hint does not revert; CR-3 appendPrdRow throws only on --apply; QA-1 boundary unprobed, empty --root accepted (all MEDIUM). Advisory: CR-4, CR-5, CR-6, CR-7.
**HIGH findings**: 1
**MEDIUM findings**: 3
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)

### QA Cycle 2 — 2026-10-15
**Gate Result**: FAIL
**Issues Found**: 3 — CR-1 revert hint restores the whole root and can erase uncommitted work (HIGH; bug 2 reopened); CR-2 story-number collision passes the dry run (bug 5); CR-3 apply() unwrapped (bug 6). Advisory: CR-4 to CR-7. Bugs 1, 3 and 4 verified and closed.
**HIGH findings**: 1
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)

### QA Cycle 3 — 2026-10-15
**Gate Result**: CONCERNS
**Issues Found**: none open. Advisory: CR-1 (an untracked moved-and-rewritten file is not flagged in the revert), CR-2 (a partial-failure revert leaves new directories unnamed), plus cleanups CR-3 and CR-4. Bugs 2, 5 and 6 verified and closed; all six bugs are now closed.
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: ✅ APPROVE — `task.203.pr-review.1.migrate-doc-numbering.md` (conformance lens only, `--no-code`; dispatched 08:27Z, returned in 49 s). PC-1 (low/medium, coverage): the 146-file timing on record predated the QA-cycle engine changes. Settled by the head-engine re-measurement below; no document edit needed.
**Loop exit**: 5c APPROVE → Step 7
**Action**: Proceeding to 5c (PR conformance review)
**Carried to 6a**: docs/tasks/task.203.migrate-doc-numbering/task.203.pr-review.1.migrate-doc-numbering.md
**Head-engine timing (success criterion, 146 files)**: engine at `954bd33b` run against a worktree at merge base `e917d9da` (before the migration):

```
 10:28:32 up 1 day,  3:56,  1 user,  load average: 0.87, 1.65, 3.72
real	0m0.501s
user	0m0.538s
sys	0m0.067s
reason: dry-run, counts: {prds:1, epics:4, stories:17, files:146}, mapping 22, edits 156, blockers 0
```

---

## Completion

**Finished**: {populated at end}
**Final Status**: Halted at Step 7 — finalise DoD gaps (2), awaiting a decision on the pre-existing dead links
**Branch**: feature/task.203.migrate-doc-numbering
**PR**: https://github.com/Gamaroff/agent-skills/pull/671
**QA Iterations**: 3
**DoD Summary**: `task.203.dod.1.migrate-doc-numbering.md` (gaps)
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}

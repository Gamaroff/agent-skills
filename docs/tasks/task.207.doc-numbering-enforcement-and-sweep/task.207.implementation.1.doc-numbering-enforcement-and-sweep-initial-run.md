# Implementation Report: Doc numbering enforcement and sweep

**Task**: `task.207.doc-numbering-enforcement-and-sweep.md`
**Run Number**: 1
**Started**: 2026-10-16 16:40
**Status**: Escalated

---

## Summary

Add the corpus and chokepoint CI guards for hierarchical doc numbering and sweep every prose restatement of the old flat patterns (run 1, dispatched by `/develop-next` for roadmap row T207).

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
| Board status        | work-started → transitioned ✅ (#650)                                      |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.207.*` exists in git                             | Branch created at `fc69695a`; pushed with upstream | —                    | 2026-10-16T16:39Z |
| 2. review-task             | ✅ Done | `task.207.review.{N}.{name}.md` exists (or skip logged)               | review.1: READY TO IMPLEMENT 8/10 (1C/7I/3O, all C+I applied); Planned → Ready for Development | —                    | 2026-10-16T16:44Z |
| 3. develop                 | ✅ Done | Task status == `Ready for Review`                                      | inline (plan + measured surface map); loop audit iter 1: ready-for-review 23/23 @ `a6479024`; `npm run ci` exit 0 (2nd run — 1st failed on 9 tests pinning old literals, fixed) | —                    | 2026-10-16T17:05Z |
| 4. create-pr               | ✅ Done | PR URL; issue comment posted                                           | PR #682: https://github.com/Gamaroff/agent-skills/pull/682 | —                    | 2026-10-16T17:06Z |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.207.qa.{N}.*.md`; `task.207.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.207.dod.{N}.*.md`; task `status: accepted`                      |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-10-16

- Dispatched by `/develop-next` (roadmap row T207, source: roadmap) with `--defaults` — autonomous run.
- Feature branch base: develop — source: recommended (`--defaults`; on `develop`, Phase 0d Recommended)
- PR target branch: develop — source: recommended (`--defaults`)
- Mode: standard — source: detector. Phase 0 run inline (no 0a-parallel agents dispatched — the path was given, so no resolver was needed); lite-mode inputs derived from the document: risk_level=absent, phase_count=5 (Phases 0–4), single_module=false (tests/, evals/, shared/resources/, skills/*, docs/) → standard.
- Skips: none. Refused: none. Questions asked: 0 (`--defaults`, `questions[]` empty — matches the required count).
- qa-planning gate: skipped (auto — no prompt)
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md (skills-config.yaml `devLoadAlwaysFiles`)
- Status `Planned` noted — Step 2 `/review-task` validates and promotes.
- Dependency gate pre-checked: task.204, task.205, task.206 all `status: accepted`; `doc-id.js` exports `checkCorpus`, `check`, `parse`.
- Tracker: github, issue #650.
- Branch: `feature/task.207.doc-numbering-enforcement-and-sweep` from `develop` @ `fc69695a`; report stashed before branch creation and restored after.
- Tracker: work-started comment → posted; GitHub board: work-started → transitioned. Priority-default block not run (issue created by `/create-task`, which sets Priority).

---

### Step 2 — review-task — 2026-10-16

- review-task Step 0 output: Comprehensive report — required for pipeline audit trail (auto).
- review-task Step 0a: auto-skipped — already on `feature/task.207.*`.
- Pre-pass: Agent B `aligned` (source `architecture`, 7 axes); Agent C `not-implemented`.
- Clarifying questions resolved with the recommended option (no human present): review-epic `awk` defect in scope (moved, not allowlisted); corpus floor on `documents`, no engine change.
- review-task Step 8.5 auto-answered: Yes, apply all critical + important fixes — pipeline proceeds autonomously. 8 fixes applied, 0 skipped.
- review-task Step 9 auto-answered: Yes, fixes complete — Planned promoted to Ready for Development by review-task.
- Review report: `docs/tasks/task.207.doc-numbering-enforcement-and-sweep/task.207.review.1.doc-numbering-enforcement-and-sweep.md` (`reviewed_blob` written).
- Tracker key re-read: unchanged (#650). Review outcome comment skipped at the orchestrator — review-task reported `posted` (stage `review-task`).
- Proceeding despite optional review suggestions: O1 allowlist `select-next.mjs:343`, O2 route `generate-prd-epic-index.test.mjs:58` through `doc-id`, O3 refresh `coding-standards.md` § Registries.

---

### Step 3 — develop — 2026-10-16

- Pre-develop surface map: inline fallback (no Explore dispatched) — the Step 2 review had already measured every site with recorded commands: 2 new test files (`evals/shared/tests/doc-numbering-corpus.test.mjs`, `tests/doc-id-chokepoint.test.js`), 4 code sites (`sync-jira-story.js`, `generate-prd-epic-index.test.mjs`, `select-next.mjs`, `backfill-story-issues.sh`), 1 executable-Markdown site (`review-pipeline-step-0a-branch-setup.md` review-epic), ~60 prose files (§7 population + literal ids + registry prose). Independence loss recorded: the map is the reviewer's own.
- Plan file found: `docs/tasks/task.207.doc-numbering-enforcement-and-sweep/task.207.plan.doc-numbering-enforcement-and-sweep.md` — included as implementation context (corrected in Step 2).
- Step 3 inline — /develop not invoked: the plan names every hunk and the surface map was measured in Step 2; `/develop`'s Task Completion Checklist satisfied inline, one Change Log row written.
- Fast gate precondition: `develop.fastGateCommand` unset → suggested `npm run ci:fast`; script `ci:fast` resolves.
- Decision: the chokepoint allowlist excuses per **shape**, not per file — a whole-file entry would have hidden `sync-jira-story.js:198/:807` behind its title-regex entry.
- Decision: the shell subject widened to an assigned `*EPIC*=`/`*STORY*=`/`*PRD*=` name after mutation M3 (`EPIC_NUM=$(echo "$(basename …)" | awk -F.)`) slipped past §1; the widening then found `.agents/scripts/backfill-story-issues.sh`, which task.206 had deferred here — fixed onto `doc-id.js`.
- Decision: `create-parallel-stories`' `{epic}.1-{n}` scheme deferred (Deferred Work in the task) — a numbering redesign of that skill, rejected by `doc-id.js`, not a prose rewrite.
- Decision: `shared/resources/security-input-corpus.md` left as written — test input parsed by `security-input-corpus.mjs`.
- Correction to the Step 2 mechanical sweep: five standards "Interim" notes described the legacy shape in new-scheme placeholders; replaced with "Adopted (tasks 202–207)" notes.
- Mutation proofs: 6, each red then restored (listed in the task's Implementation Summary).
- Full `npm run ci` (`.agents/skills` moved aside): run 1 exit 1 — 9 tests pinned removed literals (`optional-file-lookups` rows, `next-numbered` finalise STEM, `review-bug` mode regex); updated; run 2 exit 0 across every stage.
- Commits: `afb8bd21` test (guards + parser moves), `b8aac435` docs (sweep), `e1e5d65b` chore (bundle), `a6479024` docs (task, plan, review).
- Loop audit iter 1: status `ready-for-review`, 23/23 — loop exits.
- Development completion comment posted to github issue 650.

---

### Step 4 — create-pr — 2026-10-16

- Staging scope: 97 paths derived; only the work-item dir held uncommitted changes (the report), so `/create-pr` ran with `--scope docs/tasks/task.207.doc-numbering-enforcement-and-sweep` alone. Pre-flight guard: nothing out of scope untracked — nothing held.
- Report links checked after staging: 0 relative links.
- Report first commit `9b36097f`; branch pushed.
- PR body written from the task's own record rather than the diff summariser (a 244-file diff, ~60% generated bundle output) — the summariser was not dispatched.
- PR created: https://github.com/Gamaroff/agent-skills/pull/682 (base `develop`, `Closes #650`). Post-PR state: OPEN, head `9b36097f` (checked with `gh pr view`, no poller subagent).
- Tracker: in-review comment → posted; GitHub board: in-review → stage-disabled.
- Lock `pr_url` written; develop-next run state `prNumber: 682`.

---

### Steps 5–6 — QA cycle 1 — 2026-10-16

- QA-start board re-assert: in-review → stage-disabled. Traceability mapper skipped — the task's Success Criteria are checkbox lists, not a table (HAS_SUCCESS_CRITERIA_TABLE=false, derived inline).
- 5a `/qa-task` (`code_review_blocking=true`): gate.1 CONCERNS 60/100 — 4 MEDIUM (BUG-1..4), 3 LOW. Reviewer (Explore) dispatched 17:07:07Z, `duration_ms` 273649. Diff reviewed excludes generated `skills/*/references/**`. Two medium-confidence findings (CR-3, CR-4) promoted after QA verified them. Probe: `relatedDocInfo`, run record `totals.executed` 26, 4 hostile accepted (inherited from `doc-id.parse`, LOW, routed to future). Step 4b: 7 execution failures, all the harness temp copy lacking `.agents/skills`, identical on base.
- QA Cycle 1 — changes-requested: stage-disabled.
- 5b `/qa-fix` inline — findings ingester not dispatched: the gate was written in this session and its findings were in hand (independence loss recorded). Fixes: BUG-1 (0a.3 re-derives; §4 per-block), BUG-2 (comment order), BUG-3 (glob + 15-file residue sweep + new §5 prose guard), BUG-4 (title shape + backfill via `stripIdPrefix`), CR-5, CR-6. Mutation proofs: 4, all covered (one void `sed` attempt redone with an asserted edit).
- Fast gate cycle 1: attempt 1 exit 1 (`develop-bug.test.js` pinned `story.{epic}.{story}.bug.{n}`), updated; attempt 2 exit 0.
- Commit `c5432aa8` (fix + gate.1 + qa.1 + bug.1–4 + probe record), one push. PR and tracker qa-fix-1 comments posted.

---

### Steps 5–6 — QA cycle 2 — 2026-10-16

- 5a refute pass (whole diff, reviewer dispatched 17:25:12Z, `duration_ms` 137936): gate.2 FAIL 60. BUG-1, BUG-4 closed via `status-history.js`; BUG-2, BUG-3 reopened; BUG-5 new. CR-4/CR-5 (cross-block reads in review-pipeline-step-0a) identical on `origin/develop` → pre-existing, routed to `recommendations.future`. Security `reasoned` (no boundary changed).
- QA Cycle 2 — changes-requested: stage-disabled (signalled after 5b, not before it — order slip, no board effect).
- 5b `/qa-fix` inline (findings in hand). Step 2.6 trigger (b), repeat subject on BUG-2 and BUG-3 → **consolidate** both: shared JS tokenizer lifted into `tests/lib/strip-js-comments.js`; §5 rewritten as an allow-list (first placeholder must name the PRD). The allow-list surfaced 30 lines in 15 files, rewritten; `create-parallel-stories` exempt by name. BUG-5/CR2-6 fixed (dev-only evidence: one-off script with no harness). Mutation proofs: 4, all covered.
- Fast gate cycle 2: exit 0. Commit `26e783e4`, one push. PR and tracker qa-fix-2 comments posted.

---

### Steps 5–6 — QA cycle 3 — 2026-10-16

- 5a scoped re-review (17 files since gate 2's head; reviewer dispatched 17:36:19Z, `duration_ms` 185015): gate.3 FAIL 60. Convergence check: HIGH `0, 1, 1` — not tripped (`HIGH_{N-2} = 0`). Third strike: none.
- QA Cycle 3 — changes-requested: stage-disabled (signalled before 5b).
- 5b inline: BUG-6 fixed + new contract test `tests/ingester-prompt-placeholders.test.js`; BUG-3 title-form extension (32 lines, 16 files); CR3-5; CR-7/CR-8 cleanups; CR3-4 deferred with reason. Mutation proofs: 2, covered.
- Fast gate cycle 3: exit 0. Commit `763f1d8c`, one push. qa-fix-3 comments posted.

---

### Steps 5–6 — QA cycle 4 — 2026-10-16

- 5a scoped (19 files since gate 3's head; reviewer 17:46:29Z, `duration_ms` 156229): gate.4 CONCERNS 80. Convergence: HIGH `1, 1, 0` — no trip. Route classifier: Diminishing-returns needs two HIGH-0 gates (one); Cosmetic-residue is PASS-only → 5b.
- QA Cycle 4 — changes-requested: stage-disabled.
- 5b inline: BUG-3 consolidate (population → `*.md`, `*.yaml`, `*.yml`); **self-correction** — cycle 3's rewrite of PRD-internal headings contradicted the documented relative numbering inside a PRD; reverted, and `RELATIVE_TITLES` exempts those files' title check by name, with a stale-entry test that fired on its first run. BUG-6 wording; contract test hardened (CR-6). CR-7 (backfill epic-meta) and CR-2 (pre-existing milestone override) stay future items.
- Fast gate cycle 4: exit 0. Commit `563b4c0b`, one push. qa-fix-4 comments posted.

---

### Steps 5–6 — QA cycle 5 — 2026-10-16

- 5a scoped (12 files since gate 4's head; reviewer 17:56:19Z, `duration_ms` 115491): gate.5 CONCERNS 70. Convergence: HIGH `1, 0, 0` — no trip.
- 5b inline: BUG-3 (13 files to `{domain}/prd.{P}.{feature}/epics/`; §5 `FLAT_LAYOUT`, bracket/angle `BARE_TWO_LEVEL`), CR5-2, CR5-3 (anchored exemptions), CR5-5. A bulk rewrite touched the dated `.agents/plans/doc-drift-audit-2026-10-07.md`; restored unedited before commit. Four mutations each red. Fast gate exit 0. Commit `1f8de5cd`, one push; qa-fix-5 comments posted.
- Loop-limit route (`classifyLoopRoute`, `budgetSpent: true`): `continue`, reason `medium-not-falling` — MEDIUM 1, 2, 3 over cycles 3–5.

---

## Issues Log

### QA Loop Limit Reached — 2026-10-16

The pipeline completed 5 qa-task/qa-fix cycles without a clean PASS, plus the gate-the-last-fix half-cycle (cycle 6), granted by the user, whose gate has open entries.

**Final gate status**: CONCERNS (70) — gate.6 judged `1f8de5cd`; PR checks green on `aac45de6`.
**HIGH findings per cycle**: 0, 1, 1, 0, 0, 0 — zero on the last three gates
**Remaining issues** (from gate.6):
- TASK-207-BUG-3 — medium — `skills/documentation-standards-validator/references/prd-structure-guide.md` — tree diagrams root `epics/` under a flat `[feature]/`
- TASK-207-CR6-4 — medium — `skills/develop/SKILL.md` — ~23 example paths in 14 files with no `prd.*` parent above `/epics/epic.`
- TASK-207-CR6-3 — medium — `prd-structure-guide.md` — numbering bullets in the old meanings
- TASK-207-CR6-5 — medium — `skills/develop/SKILL.md` — `epic.178.<name>` holds `story.1.178.8`
- TASK-207-CR6-6 — low — `skills/develop/SKILL.md` — examples disagree with their own ids

**What was attempted per cycle**:
- Cycle 1: review-epic 0a blocks, chokepoint blind spots, placeholder residues (BUG-1..4)
- Cycle 2: shared JS comment tokenizer; §5 rewritten as an allow-list; sub-story backfill titles
- Cycle 3: ingester placeholder contract (BUG-6) with its own test; title-form placeholders
- Cycle 4: §5 extended to YAML; reverted cycle 3's wrong rewrite of PRD-internal relative titles; `<S>` = `.story` + `.sub`
- Cycle 5: `prd.{P}.` layout paths, bracket two-level ids, anchored exemptions, head-only binding names
- Route 2c considered and declined: `medium-not-falling` (MEDIUM 1, 2, 3 over cycles 3–5).
- Cycle 6 (half-cycle, user-granted): gate only, no fix — the gate found the layout residue in trees and concrete examples.

**Likely root cause**: The prose sweep's population was never enumerated up front: each gate found the next spelling of the retired scheme (angle placeholders, title forms, YAML, then the directory layout), and each fix widened §5 by one more shape. MEDIUM rose because every cycle's widening exposed a further residue, not because fixes regressed (apart from cycle 3's PRD-title rewrite, reverted in cycle 4). No HIGH remains, and the guard now checks ids, titles, two-level forms and the layout directory.

**Recommended next steps**:
1. One enumerated sweep as its own commit: list every `/epics/epic.` path and tree diagram first (`git grep -nE '/epics/epic\.'` minus `prd\.[^/]*/epics/epic\.`), rewrite them, then widen `FLAT_LAYOUT` to the parent-directory rule (with CR6-8's hyphen and digit P forms).
2. Then one `/qa-task`; on a clean gate, 5c `/review-pr --effort medium --comment --no-code` and `/finalise`.
3. Carry gate 6's `recommendations.future` into follow-up tasks.

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-10-16
**Gate Result**: CONCERNS
**Issues Found**: 4 MEDIUM — TASK-207-BUG-1 (review-epic 0a.3 reads variables bound in another block), BUG-2 (chokepoint phantom block comment), BUG-3 (review-epic numbering glob still flat), BUG-4 (title shape misses literal-space parsers); 3 LOW (CR-5, CR-6, QA-1)
**HIGH findings**: 0
**MEDIUM findings**: 4
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)

### QA Cycle 2 — 2026-10-16
**Gate Result**: FAIL
**Issues Found**: 1 HIGH — BUG-3 reopened (§5 placeholder guard missed angle-bracket and `{N}.{M}` spellings in 9 files); 2 MEDIUM — BUG-2 reopened (`/*` in a regex literal), BUG-5 (backfill title drops the sub-story letter); 1 LOW (CR2-6). BUG-1, BUG-4 closed. 2 pre-existing findings routed to future.
**HIGH findings**: 1
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)

### QA Cycle 3 — 2026-10-16
**Gate Result**: FAIL
**Issues Found**: 1 HIGH — BUG-6 (ingester globs renamed without their binding lists); 1 MEDIUM — BUG-3 reopened (title-form spellings); 2 LOW (CR3-4 deferred, CR3-5). BUG-2, BUG-5 closed.
**HIGH findings**: 1
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 3 of 5)

### QA Cycle 4 — 2026-10-16
**Gate Result**: CONCERNS
**Issues Found**: 2 MEDIUM — BUG-3 reopened (YAML templates/config outside §5), BUG-6 reopened (sub-story `<S>` source); 2 LOW (CR4-4, CR4-5). 1 pre-existing finding (create-epic milestone override) to future.
**HIGH findings**: 0
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 4 of 5)

### QA Cycle 5 — 2026-10-16
**Gate Result**: CONCERNS
**Issues Found**: 3 MEDIUM — BUG-3 reopened (layout paths drop `prd.{P}.`), CR5-2 (bracket two-level id), CR5-3 (file-wide title exemption); 1 LOW (CR5-5). BUG-6 closed.
**HIGH findings**: 0
**MEDIUM findings**: 3
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: Loop route: continue (medium-not-falling) — gate-the-last-fix half-cycle declined
**Action**: Escalating — loop limit reached

### QA Cycle 6 — 2026-10-16
**Half-cycle**: gate-the-last-fix — granted by the user after the engine declined it (`medium-not-falling`)
**Gate Result**: CONCERNS
**Issues Found**: 4 MEDIUM — BUG-3 reopened (tree diagrams), CR6-4 (~23 example paths with no `prd.*` parent), CR6-3, CR6-5; 1 LOW (CR6-6)
**HIGH findings**: 0
**MEDIUM findings**: 4
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Escalating — loop limit reached

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: `feature/task.207.doc-numbering-enforcement-and-sweep`
**PR**: https://github.com/Gamaroff/agent-skills/pull/682
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}

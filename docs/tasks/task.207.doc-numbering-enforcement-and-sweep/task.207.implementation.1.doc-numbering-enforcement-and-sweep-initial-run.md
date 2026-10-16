# Implementation Report: Doc numbering enforcement and sweep

**Task**: `task.207.doc-numbering-enforcement-and-sweep.md`
**Run Number**: 1
**Started**: 2026-10-16 16:40
**Status**: In Progress

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
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
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

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: `feature/task.207.doc-numbering-enforcement-and-sweep`
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}

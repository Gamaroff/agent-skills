# Implementation Report: No consumer names in shipped skills

**Task**: `task.220.no-consumer-names-in-shipped-skills.md`
**Run Number**: 1
**Started**: 2026-10-20 19:02
**Status**: In Progress

---

## Summary

Remove one consumer's names from everything shipped under `skills/` and `shared/`, delete the wireframe skill's consumer format profile, and add `tests/no-consumer-names.test.js` so the names cannot return.

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
| Tracker Issue       | #709 (GitHub)                                                              |
| Board status        | In Progress ✅                                                             |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.220.*` exists in git                             | Branch created at `e3bdfbea`; pushed with upstream | —                    | 2026-10-20T17:03Z |
| 2. review-task             | ✅ Done    | `task.220.review.{N}.{name}.md` exists (or skip logged)               | `task.220.review.1.*` — 8/10 READY TO IMPLEMENT; Planned → Ready for Development | —                    | 2026-10-20T17:08Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline, 1 iteration; guard red→green; ci:fast 5993/0 | —                    | 2026-10-20T17:19Z |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.220.qa.{N}.*.md`; `task.220.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.220.dod.{N}.*.md`; task `status: accepted`                      |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-10-20

- Feature branch base: develop — source: flag (`--base develop`, from the user's run instructions)
- PR target branch: develop — source: flag (`--target develop`, from the user's run instructions)
- Mode: standard — source: detector (risk_level absent, 4 phases, not single-module)
- Skips: none; refused: none
- qa-planning gate: skipped (auto — no prompt)
- Phase 0 ran inline (no 0a-parallel Explore agents): the task path was given exactly, and Explore subagents have hung in this repository before. Lite-mode inputs derived from the document directly.
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Task status at start: Planned — Step 2 `/review-task` validates and promotes it.
- Branch: `feature/task.220.no-consumer-names-in-shipped-skills` from `develop` at `e3bdfbea`. Report stashed before branch creation, restored after.
- Tracker: work-started comment `posted` on #709; GitHub board: work-started → transitioned (In Progress). Priority already P2 (set at issue creation), so the P2 default block was a no-op.
- Before the run: rebased the filing commit onto origin/develop (task.219 had merged), resolving one registry conflict; created GitHub issue #709 and linked it (`e3bdfbea`).

### Step 2 — review-task

- review-task output: Comprehensive report — required for pipeline audit trail. Step 8.5 auto-answered "apply all critical + important fixes"; Step 9 auto-answered "Yes, fixes complete".
- Review report: `docs/tasks/task.220.no-consumer-names-in-shipped-skills/task.220.review.1.no-consumer-names-in-shipped-skills.md` — 8/10, READY TO IMPLEMENT; 1 Critical, 2 Important, 2 Optional, all applied. `reviewed_blob` stamped.
- C1 (critical): the planned guard key pattern was case-sensitive and `\b`-bounded, and scanned contents only — it missed the lower-case key (10 fixture file names, ~35 references, one host) and two `<KEY>_` identifiers. Patterns are now letter-bounded and case-insensitive, a path scan is added, and the fixtures are renamed in Phase 2.
- Planned promoted to Ready for Development by review-task.
- Pre-pass Explore agents not dispatched (Explore subagents have hung here before); both passes ran inline — the review is not independent of the orchestrator.
- Review outcome comment skipped by the orchestrator — review-task reported `posted` (stage `review-task`).

### Step 3 — develop

- Plan file found: `docs/tasks/task.220.no-consumer-names-in-shipped-skills/task.220.plan.no-consumer-names-in-shipped-skills.md` — included as implementation context for /develop.
- Pre-develop surface map: 20 source files + 10 fixture files + 3 wireframe files, measured in Step 2 with `git ls-files skills shared | xargs grep -IoniE …` and confirmed by the guard's own red list below. Explore not dispatched (inline fallback; independence loss recorded).
- Step 3 inline — /develop not invoked: the plan names every hunk and the review measured the population, so `/develop` would only re-read both.
- Planned/Draft gate not reached (inline). Always-load files read as context.
- Edits were scripted from files in the session scratchpad and run with `python3 -I`, never a heredoc. Each exact edit asserted a match count of exactly 1 before anything was written, and a dry run preceded the write.

**Phase 1 — guard red (before any source edit).** `command node --test tests/no-consumer-names.test.js`: 4 tests, 2 pass (1 calibration, 2 non-vacuity), 2 fail. Masked population (`path: count`; `<key>`, `<brand>` stand for the names):

```
content hits: 346 lines in 146 files (135 in 20 source files, 211 in 126 bundled references/ copies)
  shared/resources/develop-pipeline-step-0-resolve-and-prepare.md: 1
  shared/resources/develop-pipeline-step-2-review.md: 1
  shared/resources/jira-stage.js: 1
  shared/resources/jira-sync.js: 4
  shared/resources/platform-detection.md: 1
  shared/resources/resolve-platform.sh: 1
  shared/resources/tests/generate-prd-epic-index.test.mjs: 1
  shared/resources/tests/jira-stage-fixtures.test.mjs: 37
  shared/resources/tests/jira-stage.test.mjs: 1
  shared/resources/tests/jira-sync-no-transition.test.mjs: 1
  shared/resources/tests/jira-sync-publishing-fidelity.test.mjs: 1
  skills/finalise/SKILL.md: 2
  skills/review-pr/SKILL.md: 3
  skills/review-pr/scripts/parse-target.sh: 1
  skills/review-pr/tests/review-pr.test.js: 45
  skills/scaffold-tracker-workflow/tests/scaffold-tracker-workflow.test.js: 27
  skills/sync-jira-bug/tests/end-to-end.test.js: 2
  skills/sync-jira-bug/tests/relative-doc-links.test.js: 2
  skills/sync-jira-task/tests/sync-jira-task.test.js: 2
  skills/wireframe/SKILL.md: 1
path hits: 11
  shared/resources/tests/fixtures/<key>-*.json (10 files)
  skills/wireframe/references/html-formats/<brand>-hifi.md
```

**Calibration (mutation-proved).** Two mutants of the guard, each changing only the key pattern, run against test 1: the plan's original case-sensitive `\b` pattern → ✖ (fails on the `<KEY>_RECORD` sample); an unbounded case-insensitive pattern → ✖ (flags the look-alike `rapport`). The real letter-bounded pattern → ✔. So test 1 catches a scanner that misses a shape and one that over-matches.

**Phase 2.** `git mv` of the 10 fixtures (count asserted). Edit script: 17 exact edits (each matched once); regex pass — `<KEY>_(COLUMNS|TYPES|RECORD)` 30, `\b<KEY>\b` 85, host 3, lower-case `<key>-` prefix 33, `boards/407` 1 replacement; 20 files changed — the same 20 the guard listed. A collision check found no file where an existing `PROJ` key and the renamed key are compared as distinct. Prose diff read for awkward results; none. `EXEMPT` emptied in `pipeline-answers-generic.test.mjs` (4/4 pass), header comment updated.

**Phase 3.** Profile `git rm`'d (the directory is gone); `SKILL.md` step 2 rewritten without the table (row removed by its link, so the script never spells the name), the "copy into `references/html-formats/`" sentence replaced, step 3's "The profile names …" made conditional; the test file's profile section (`FORMATS_DIR`, `profiles()`, 2 tests) removed, with the script asserting exactly 2 tests went.

**Phase 4.** `npm run bundle` rc 0; `npm run bundle:check` — 128 skills, 0 problems; `npm run validate -- skills/wireframe` ✓; guard 4/4 green; `npm run format:check` clean after `prettier --write` on the new guard and `sync-jira-task.test.js` (a shorter host now fits one line); CHANGELOG `[Unreleased]`: an Added entry and a `### Removed` BREAKING entry with the migration step.

**Per-file test counts (before Phase 2 → after Phase 4):**

| Test file | Before | After |
| --- | --- | --- |
| `shared/resources/tests/generate-prd-epic-index.test.mjs` | 18/18 | 18/18 |
| `shared/resources/tests/jira-stage.test.mjs` | 72/72 | 72/72 |
| `shared/resources/tests/jira-stage-fixtures.test.mjs` | 12/12 | 12/12 |
| `shared/resources/tests/jira-sync-no-transition.test.mjs` | 23/23 | 23/23 |
| `shared/resources/tests/jira-sync-publishing-fidelity.test.mjs` | 15/15 | 15/15 |
| `shared/resources/tests/pipeline-answers-generic.test.mjs` | 4/4 | 4/4 |
| `skills/review-pr/tests/review-pr.test.js` | 163/163 | 163/163 |
| `skills/scaffold-tracker-workflow/tests/scaffold-tracker-workflow.test.js` | 32/32 | 32/32 |
| `skills/sync-jira-bug/tests/end-to-end.test.js` | 5/5 | 5/5 |
| `skills/sync-jira-bug/tests/relative-doc-links.test.js` | 11/11 | 11/11 |
| `skills/sync-jira-task/tests/sync-jira-task.test.js` | 124/124 | 124/124 |
| `skills/wireframe/tests/wireframe.test.js` | 44/44 | **42/42** (the two profile tests, as planned) |

**Fast gate.** `npm run ci:fast` (`develop.fastGateCommand` unset → suggested value; precondition resolved `ci:fast`), run in the background with `.agents/skills` moved aside (CI has no `.agents/`) and restored by a trap: `TEST_EXIT=0` — node suites 6007 tests, 5993 pass, 0 fail, 14 skipped; format check clean.

- Loop audit inline (no Explore): status `Ready for Review`, 4/4 phases, loop exited after iteration 1. Task checkboxes ticked except the performance bound, which is measured on the PR's head commit at Step 4.
- Change Log row written by the orchestrator (inline path): "Implemented — 34 files … + 126 regenerated copies".
- Development completion comment posted to github issue 709 (`posted`).

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
**Branch**: feature/task.220.no-consumer-names-in-shipped-skills
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}

# Implementation Report: No consumer names in shipped skills

**Task**: `task.220.no-consumer-names-in-shipped-skills.md`
**Run Number**: 1
**Started**: 2026-10-20 19:02
**Status**: Completed

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
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #710: https://github.com/Gamaroff/agent-skills/pull/710 | —                    | 2026-10-20T17:22Z |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.220.qa.{N}.*.md`; `task.220.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | 1 cycle; gate 1 PASS (100); 5c review-pr APPROVE (pr-review.1) | —                    | 2026-10-20T17:33Z |
| 7. finalise                | ✅ Done    | `task.220.dod.{N}.*.md`; task `status: accepted`                      | DoD accepted (dod.1); CI 1 + 2 SUCCESS; #709 closed | —                    | 2026-10-20T17:41Z |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | implementation report committed and pushed | —                    | 2026-10-20T17:43Z |

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

### Step 4 — create-pr

- SCOPE_PATHS: 58 entries — `docs/tasks/task.220.no-consumer-names-in-shipped-skills`, `CHANGELOG.md`, `shared/resources`, `shared/resources/tests`, `shared/resources/tests/fixtures`, the changed `skills/*` dirs (each skill's `references/` among them) and `tests/no-consumer-names.test.js` (a new file in a directory with no tracked change, added by hand per the step doc). Pre-flight: 0 files held. Report links: doc-links ok.
- Base pre-supplied to /create-pr: develop. Committed in four scoped commits, each a green state (refactor → wireframe → guard → docs): `72f1444d`, `ca2b329c`, `22561e53`, `56b6f2c7`. Leak check: no committed path outside SCOPE_PATHS.
- PR body written in-session from the diff and this report, not by the Explore summariser: the run already held every figure the body cites. Body passed `github-body-text.js`.
- PR created: https://github.com/Gamaroff/agent-skills/pull/710
- PR-opened comment on github issue 709: `posted`. GitHub board: in-review → `stage-disabled` (no `in-review` column on this board's workflow).
- Post-PR state check (inline `gh pr view`, no poller subagent): PR #710 state = OPEN, MERGEABLE, head `56b6f2c7`. errors = 0.
- Performance bound measured on the PR head: `uptime; time command node --test tests/no-consumer-names.test.js` → load average 7.32, real 0.868 s (bound 2 s).

### Steps 5–6 — QA loop

- GitHub board: QA-start re-assert → `stage-disabled`. Traceability mapper skipped: Success Criteria is a checkbox list, not a table (`HAS_SUCCESS_CRITERIA_TABLE=false`).
- Cycle 1 (5a): `/qa-task code_review_blocking=true`. Code reviewer (Explore) dispatched 17:23:30Z, returned in 161.9 s (`duration_ms`): 0 bugs, 1 cleanup (anchor `ok`). Gate 1 PASS 100/100, head `56b6f2c7`; five mutation proofs covered; QA PR comment and `qa-gate-1` tracker comment `posted`. Committed `e2c4063c` behind a clean read-back and pushed.
- 5c: trail asserted on `origin/feature/task.220.…` (gate 1, QA 1). `/review-pr --effort medium --comment --no-code`: conformance lens (Explore) returned in 66.5 s with 0 findings → APPROVE; anchors checked against `e2c4063c` via `head-branch`; summary comment posted to PR #710. `ready-for-merge` → `stage-disabled`. Review report staged for the 6a acceptance commit; nothing committed between the verdict and `/finalise`.
- Rule slip disclosed to the user: one harness patch in the QA mutation run was written through a quoted heredoc (scratch script only).

### Step 7 — finalise

- Four DoD agents (Explore) in one dispatch at 17:33:13Z: compliance 18.1 s (NOT_APPLICABLE), docs 68.3 s (PASS), security 91.3 s (PASS, `boundary: false`, empty probe plan, so Step 3b.1 skipped), AC 111.0 s (PARTIAL).
- AC5 PARTIAL: the committed 0.868 s timing was taken on `56b6f2c7`, not the PR head `e2c4063c`. `56b6f2c7..e2c4063c` changes nothing under `tests/`, `skills/` or `shared/`. Re-measured on the head: 1.014 s, 1.804 s and 1.783 s at load average 11.03–11.12 (bound 2 s), recorded in `task.220.dod.1`. That made AC 9/9 PASS without a code change, so Step 8a did not apply.
- `reviewDecision: null` (no reviews required). The PR-review column is covered by `task.220.pr-review.1` (APPROVE).
- CI reading 1: SUCCESS @ `e2c4063c4ed1` over 5 checks (the `test` lane was still running at the first sample; one background re-sample waited 30 s). CI reading 2: SUCCESS @ `aceb78ee516b` over 5 checks after 270 s.
- Acceptance commit `aceb78ee` (`docs(task.220): accept — DoD, sprint review; registry ticked; 5c review carried`), pushed; 6b tracked-and-pushed assertions ok; registry tick `ticked`; CHANGELOG cites task 220.
- Canonical PR comment posted (issuecomment-6297280557). Tracker `done` comment `posted`; issue #709 closed (state CLOSED); Document link already on `develop`; board `done` → `already`.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-10-20
**Gate Result**: PASS
**Issues Found**: none blocking; 2 advisory (CR-1 cleanup: one shared name list for both guards; two out-of-scope files outside the shipped tree), both in `recommendations.future`
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: APPROVE — `task.220.pr-review.1.no-consumer-names-in-shipped-skills.md` (conformance lens, 0 findings)
**Carried to 6a**: docs/tasks/task.220.no-consumer-names-in-shipped-skills/task.220.pr-review.1.no-consumer-names-in-shipped-skills.md
**Loop exit**: n/a — this exit not taken
**Action**: Proceeding to 5c (PR conformance review)

---

## Completion

**Finished**: 2026-10-20 19:43
**Final Status**: Completed
**Branch**: feature/task.220.no-consumer-names-in-shipped-skills
**PR**: [#710](https://github.com/Gamaroff/agent-skills/pull/710)
**QA Iterations**: 1 (gate 1 PASS 100/100; 5c review-pr APPROVE)
**DoD Summary**: `task.220.dod.1.no-consumer-names-in-shipped-skills.md` — ACCEPTED
**Tracker debt**: none

**Completion Summary**: Implemented the removal of one consumer's names from every shipped skill and shared resource: comments, prose, examples and fixture values; ten fixtures renamed; the wireframe skill's consumer format profile deleted. Added `tests/no-consumer-names.test.js`, which scans paths and contents over the whole shipped tree. It took one QA cycle (PASS 100/100) and a clean 5c conformance review. Notable decisions: the edits were made at the `shared/resources/` source and re-bundled; the profile removal is shipped as BREAKING with a migration note; a project-extension mechanism for format profiles was declined; AC5 was re-measured on the PR head at finalise rather than inherited from an earlier commit.

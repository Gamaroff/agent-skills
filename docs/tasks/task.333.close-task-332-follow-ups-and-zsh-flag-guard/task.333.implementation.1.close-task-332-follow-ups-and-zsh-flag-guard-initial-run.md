# Implementation Report: Close task 332's follow-ups and guard the zsh flag trap

**Task**: `task.333.close-task-332-follow-ups-and-zsh-flag-guard.md`
**Run Number**: 1
**Started**: 2026-11-28 06:39
**Status**: In Progress
**Report format**: 2

---

## Summary

Run T333 through the full pipeline: the zsh `${X:+--flag}` guard and review-story fix, plus task 332's five gate 3 finalise advisories.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | low                                                                        |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Tracker Issue       | #965 (GitHub)                                                              |
| Board status        | In Progress ✅                                                             |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.333.*` exists in git                             | Branch created at `73a985278`; pushed | —                    | 2026-11-28T06:41Z |
| 2. review-task             | ✅ Done | `task.333.review.{N}.{name}.md` exists (or skip logged)               | `task.333.review.1.…md`; READY 9/10; Planned → Ready for Development | —                    | 2026-11-28T06:45Z |
| 3. develop                 | ✅ Done | Task status == `Ready for Review`                                      | Inline; 4/4 phases; M1–M6 red; ci:fast on .249 green (8985 pass, 0 fail); commits `2487608b4`, `0e473be3b` | —                    | 2026-11-28T07:23Z |
| 4. create-pr               | ✅ Done | PR URL; issue comment posted                                           | PR #966 → develop; issue #965 `in-review` comment `posted` | —                    | 2026-11-28T07:24Z |
| 5–6. qa-task / qa-fix loop | ✅ Done | `task.333.qa.{N}.*.md`; `task.333.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted | 2 QA cycles, 1 fix cycle; gate 2 PASS 100; 5c CONCERNS, 0 open coverage (`task.333.pr-review.1.…md`) | —                    | 2026-11-28T08:37Z |
| 7. finalise                | ✅ Done | `task.333.dod.{N}.*.md`; task `status: accepted`                      | DoD 1 ACCEPTED 11/11; acceptance commit `202068e27` | —                    | 2026-11-28T08:52Z |
| 8. commit-changes          | ✅ Done | All artifacts committed and pushed                                     | implementation report final commit | —                    | 2026-11-28T08:53Z |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-28

- Invoked by `/develop-next` (roadmap item T333) with `--defaults`; zero upfront questions asked.
- Feature branch base: develop — source: recommended
- PR target branch: develop — source: recommended
- Mode: standard — source: detector (risk_level low, phase_count 4, single_module false → standard). Phase 0 run inline (no subagents dispatched); the three inputs were read from the document directly.
- Skips: none; refused flags: none.
- qa-planning gate: skipped (auto — no prompt)
- Task status at start: Planned — Step 2 (`/review-task`) validates and promotes.
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Branch: `feature/task.333.close-task-332-follow-ups-and-zsh-flag-guard` (from develop `73a985278`). Implementation report stashed before branch creation, restored after.
- Tracker: work-started comment `posted`; GitHub board: work-started → transitioned (In Progress). Priority already P2 Medium.

### Step 2 — review-task

- review-task invoked (status Planned, no review report). Output: Comprehensive report — required for pipeline audit trail. Step 8.5 auto-answered "Yes, apply all critical + important fixes"; Step 9 auto-answered "Yes, fixes complete" — pipeline proceeds autonomously.
- Review report: `docs/tasks/task.333.close-task-332-follow-ups-and-zsh-flag-guard/task.333.review.1.close-task-332-follow-ups-and-zsh-flag-guard.md` — READY TO IMPLEMENT, 9/10, 0 critical / 2 important / 2 optional. `reviewed_blob` stamped.
- Pre-pass Agents B and C not dispatched; both passes done inline (independence loss recorded in the review report).
- Planned promoted to Ready for Development by review-task.
- Fixes applied: two success criteria now name their evidence (stem-key test + M5; CI plus `test:remote` in the QA report); M4 names `finalise-rerun-scope.js:1300`.
- Tracker key unchanged at Step 2 (#965) — no work-started re-fire.
- Review outcome comment skipped — review-task reported `posted` (stage `review-task-1`, report 1).

### Step 3 — develop

- Step 3 inline — /develop not invoked: plan names every hunk.
- Plan file found: `task.333.plan.close-task-332-follow-ups-and-zsh-flag-guard.md` — included.
- Pre-develop surface map: inline (no Explore subagent). Surfaces: `skills/review-story/SKILL.md` (two Jira sync blocks), `skills/finalise/SKILL.md` Steps 3a and 3c, `shared/resources/finalise-rerun-scope.js` (`merge` and its CLI), `shared/resources/finalise-dod-ac-prompt.md`, the two finalise test files, a new guard test, `docs/contributing/traps.md`, `CHANGELOG.md`.
- Guard calibrated red before the fix: pass 4 / fail 1, hits exactly `skills/review-story/SKILL.md:2398` and `:2483` (log kept at `.claude/state/t333-guard-red.log` for the QA report). Green after the fix (5/5).
- Step 3c's echo is an `if`, not the plan's `[ … ] && echo`: on `result-unparseable` the test is false and a trailing `&&` leaves the block's exit status at 1.
- The Step 3a HALT message now names STEM (`DOC_PATH, STEM and DOD_N must be substituted`); one blocks-test pin on the old message was updated.
- Mutations (each reverted after its red run):
  - M1 guard: review-story site reverted to `${PIN_BRANCH:+--doc-branch …}` → guard A red, names `skills/review-story/SKILL.md:2488`.
  - M2 guard: scan reads no blocks → guard B (floor) red.
  - M3 Step 3c: `AC_YAML_VERIFIED` echo removed → blocks test 4 fail.
  - M4 engine `verified: true` with no `--sha256`: red only once applied to the **bundled** copy the block runs (`skills/finalise/references/finalise-rerun-scope.js`) → 2 fail ("a hand copy is recorded verified: false"). Against the unbundled source it stayed green, because the block calls the bundle.
  - M5 Step 3a path: JSON record reverted to `${DOD_N}` → 16 fail. The out-dir reverted alone stayed **green** at first: no case wrote an out-dir (it exists only when a listed command runs). Added the out-dir assertion to the T319-CR-5 case, which runs `sh check.sh`; re-mutated → 2 fail ("the re-run-at-head out-dir is stem-keyed").
  - M6 engine: `merge` re-parses, ignoring `opts.answer` → parse-count test red, `PARSE_COUNT=2`.
- `npm run bundle` then `bundle:check`: 129 skills, 0 problems.
- `npm run test:remote` (ci:fast on .249), second run: rc 0 — 8988 tests, 8985 pass, 0 fail, 3 skipped; tmp-leak ratchet ok. The guard's A, C (zsh premise, not skipped) and D cases ran in it.
- CHANGELOG placement check (base develop): 987 bullets below the first release heading, same as the merge base — ok.
- Loop audit: inline (no Explore subagent) — 4/4 phases ticked, 1 develop iteration.
- Task status → Ready for Review.
- Development completion comment posted to github issue 965 (`posted`).

### Step 4 — create-pr

- Base branch pre-supplied: develop — skipping interactive prompt.
- Implementation report first committed here (`docs(task.333): implementation report — Steps 1-3`); branch pushed.
- PR body written by the orchestrator from the Step 3 record, not by the Explore summariser (the diff was already fully in context).
- PR #966: https://github.com/Gamaroff/agent-skills/pull/966. Issue #965 `in-review` comment `posted`. develop-next state `prNumber: 966`.

### Step 7 finalise — 2026-11-28

- DoD checks: 4 Explore agents, each told to read its prompt file verbatim (with substitutions), not retyped. AC YAML extracted from the transcript (`verified: true`).
- CI reading 1: SUCCESS @ 4ecd2dab92b8 (6 checks); CI reading 2: SUCCESS (tree-equivalent to b30e42f940fd) @ 202068e27f80.
- 6d: changelog cites (task 333). PR canonical comment posted. Issue #965: `done` comment `posted`, closed (state CLOSED). Board `done`: `already`. Document link: already durable or absent.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- M5's out-dir half was unheld by the planned assertion (no-command case writes no out-dir). Fixed in-step by asserting it in the case that runs a command; mutation-proven.
- First `test:remote` run failed `format:check` (Prettier, three new/edited test files). The background task reported exit 0 because the command ended in a trailing `echo`. Read from the log, formatted with Prettier, re-run with the real exit status propagated.

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1

- **Gate**: CONCERNS 90/100 — `task.333.gate.1.…yml` (head `bc7b6013867d`), report `task.333.qa.1.…md`; committed `bb4b10d97`.
- **Reviewer**: one Explore subagent, code route, whole branch diff; dispatched 07:25Z, `duration_ms` 126525; anchors checked (3/3 `ok`).
- **Findings**: T333-QA-1 (medium; guard drops 81 hand-authored `references/*.md`, reproduced by QA), T333-QA-2 (low; key misses whitespace after `:+`, reproduced under zsh). CR-2 pre-existing → `recommendations.future`.
- **Mutations**: QA re-ran M1–M6 (M5 in two halves), all `covered`; tree restored, 108/108 green after.
- **Security**: `boundary: internal` (task 331/332 precedent; `fence:` form fills one slot).
- **Comments**: PR comment posted; issue #965 `qa-gate-1` `posted`.
**Traceability**: skipped (no pre-built matrix passed; success criteria traced in the QA report's SC table)

- **Action**: Running qa-fix
- **PR Review**: not reached
- **Next**: `/qa-fix` cycle 1.

### Fix Cycle 1 (qa-fix)

- fix_cycle: not supplied — derived from the gate (1). Ingester not dispatched: two findings, gate already in context (inline, independence loss noted). Step 2.6: cycle 1, no previous gate — trigger (b) n/a.
- T333-QA-1: `population()` now takes `skills/*/references/*.md` too, minus files carrying the `AUTO-GENERATED — DO NOT EDIT` marker (76 hand-authored refs now scanned; 0 new hits). New test E: a hand-authored file is in, a generated copy is out, no fixture under `shared/resources/tests/`.
- T333-QA-2: `FLAG_KEY` takes `\s*` after `:+`; test D gains two spaced shapes; new C case shows the spaced form is 1 arg under zsh and 2 under bash. Legal one-word forms still pass.
- Mutations: M7 (spaced bad form in `develop-bug-step-5-6-verify-loop.md`) → A red at `:86`; M8 (key without `\s*`) → D red; M9 (path filter back) → E red ("hand-authored … must be scanned"); M10 (marker filter dropped) → E red ("generated copy must not be scanned"). All restored; 7/7 green.
- First `test:remote` of the cycle: 1 fail — `bundle-comment-origin.test.js` §2 flagged a `shared/resources/tests/` literal in the new population comment (a comment-only bundling reference). Reworded to "the test fixtures beside this file"; both suites green locally (13/13); re-run on .249.
- Second `test:remote`: rc 0 — 8990 tests, 8987 pass, 0 fail, 3 skipped; tmp-leak ratchet ok.
- Fix commit `b30e42f94`, pushed. PR comment posted; issue #965 `qa-fix-1` `posted`.
- See QA Cycle 2 below.
- Probe: `zsh-flag-expansion-guard` → 0 in the executed-doc population (the guard is cited only from docs/ and CHANGELOG); `does not word-split` → 3 (`develop-pipeline-step-8-commit.md`, `develop-next/SKILL.md`, `qa-fix/SKILL.md`), all unaffected (they describe other expansions, not the guard's scope). Wider: `docs/contributing/traps.md` and `CHANGELOG.md` restate the scope — both updated.

### QA Cycle 2

- **Gate**: PASS 100/100 — `task.333.gate.2.…yml` (head `b30e42f94`), report `task.333.qa.2.…md`; committed `4ecd2dab9`, pushed.
- **Reviewer**: one Explore subagent, refute pass over the whole branch diff (13 files, 712 patch lines); dispatched 08:28Z, `duration_ms` 128377; anchors 4/4 `ok`.
- **Findings**: CR-1/CR-2 (review-story unbound `PIN_BRANCH`/`STORY_FILE_PATH`) identical on `origin/develop` → pre-existing, `recommendations.future`. CR-3 (key calibration: flags `--flag=$X`, misses colon-less and positional) reproduced, no live site → advisory/future. CR-4 cleanup → future.
- **Mutations (QA)**: M8 key → D red; M9 `||`→`&&` → E red; M10 path half `true` → E red; all `covered`. One void mutation (`x && false || y`) discarded and replaced. Tree restored, 7/7.
- **Comments**: PR comment posted; issue #965 `qa-gate-2` `posted`.
**Traceability**: skipped (no pre-built matrix passed; criteria carried from QA report 1, drift clean)

- **Action**: Proceeding to 5c (PR conformance review)
- **PR Review**: CONCERNS — `task.333.pr-review.1.close-task-332-follow-ups-and-zsh-flag-guard.md`; 0 open coverage findings (PC-1 trail, medium/medium: these Action / PR Review rows were missing — fixed in this entry)
- **Next**: Step 7 `/finalise`.

---

## Completion

**Finished**: 2026-11-28T08:53Z
**Final Status**: Completed
**Branch**: feature/task.333.close-task-332-follow-ups-and-zsh-flag-guard
**PR**: #966 — https://github.com/Gamaroff/agent-skills/pull/966
**QA Iterations**: 2 (1 fix cycle)
**DoD Summary**: `task.333.dod.1.close-task-332-follow-ups-and-zsh-flag-guard.md` — ACCEPTED
**Tracker debt**: none

### Completion Summary

Task 333 implemented the zsh flag-expansion guard (`zsh-flag-expansion-guard.test.mjs`) and fixed both review-story `${X:+--flag "$X"}` sites with a `PIN_ARGS` array. It also hardened `/finalise` with the `AC_YAML_VERIFIED` disclosure, stem-keyed re-run-at-head files, exact `merge` refusal wording and a single AC parse. QA cycle 1 was CONCERNS 90: the guard dropped every `references/` path, and it missed the spaced key. One qa-fix cycle scoped the population by the generated-file marker and widened the key. Cycle 2 was PASS 100. Step 5c review-pr was CONCERNS, with one trail finding (missing Action and PR Review rows), fixed in this report. `/finalise` accepted with 11 of 11 criteria met.

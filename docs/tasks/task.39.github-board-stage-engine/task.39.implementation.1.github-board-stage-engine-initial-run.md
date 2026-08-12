# Implementation Report: `gh-stage.js` — a GitHub Projects board engine driven by the workflow ladder

**Task**: `task.39.github-board-stage-engine.md`
**Run Number**: 1
**Started**: 2026-08-12 00:00
**Status**: Completed — task accepted

---

## Summary

Add a deterministic `gh-stage.js` CLI that sets a GitHub Projects v2 Status field from the tracker-workflow ladder, with a mandatory backward-move guard and a read-only board probe. Nothing is wired to it in this task — T40 does the wiring.

---

## Pipeline Configuration

| Setting             | Value                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Feature branch base | `develop`                                                                                                                          |
| PR target           | `develop`                                                                                                                          |
| qa-planning gate    | skipped (auto)                                                                                                                     |
| Task risk level     | not set (frontmatter `risk_level:` absent)                                                                                         |
| Pipeline mode       | standard                                                                                                                           |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | In Progress ✅ (verified)                                                                                                          |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.39.*` exists in git                               | `feature/task.39.github-board-stage-engine` created from `develop` at `060f77a`, pushed and tracking `origin`. Issue #187 commented + board → In Progress (post-condition verified). | —                    |
| 2. review-task             | ✅ Done    | `task.39.review.{N}.{name}.md` exists (or skip logged)                 | `task.39.review.1.github-board-stage-engine.md` — 9/10, READY TO IMPLEMENT. 0 Critical / 4 Important / 3 Optional. All 4 Important + 2 of 3 Optional fixes applied. Status promoted `planned` → `ready-for-development`. | 2 pre-pass Explore agents (B: `drift`, C: `not-started`) |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | All 4 phases complete. `gh-stage.js` (1,044 lines) + 51 tests + 8 fixtures; 3 docs updated. `npm test` 1051/1051. One real bug found and fixed (stale parse cache in `--write-ladder`). | Pre-develop surface map (Explore); test-failure triage (Explore) |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR [#206](https://github.com/Gamaroff/agent-skills/pull/206) → `develop`, state OPEN. Commit `eba12bc`, 16 files, +3006/−94. Issue #187 commented. Board move to In Review skipped — the board has no such option. | PR-body summariser (Explore) |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.39.qa.{N}.*.md`; `task.39.gate.{N}.*.yml`; PR comment posted     | **5 cycles**: FAIL 60 → CONCERNS 80 → FAIL 55 → CONCERNS 90 → **PASS 100**. 20 findings, all fixed and independently verified. | 5 code-review Explore agents (one per cycle) |
| 7. finalise                | ✅ Done    | `task.39.dod.{N}.*.md`; task `status: accepted`                        | DoD PASSED. CI read PENDING first — acceptance **withheld** until it resolved SUCCESS. Found and fixed a stale §7 Files Summary + CHANGELOG figures. Issue #187 closed; board → Done. | 4 parallel DoD Explore agents (AC, security, compliance, docs) |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | Terminal report commit. | — |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-08-12

- **Invocation**: dispatched by `/develop-next` (roadmap item **T39**, PHASE 1 — tracker workflow). Autonomous run directive in force: Phase 0d questions auto-answered with the recommended option; Phase 0b resume prompt would auto-select "Resume from last completed step". All HALT conditions remain HALTs.
- **Q1 — Feature branch base**: `develop` — auto-answered (recommended option, current branch is `develop`). Not prompted, per autonomous run directive.
- **Q2 — PR target branch**: `develop` — auto-answered (recommended option). Not prompted, per autonomous run directive.
- **qa-planning gate**: skipped (auto — no prompt).
- **Phase 0a-parallel agents dispatched**: tracker-state poller (✅ returned), lite-mode + always-load detector (✅ returned). Resolver agent skipped — the input was an exact file path already verified to exist on disk.
- **Pipeline mode = `standard`**, computed from the detector's booleans: `risk_ok = true` (`risk_level: absent` ∈ {low, absent}), `phase_count = 4` (**not** < 3 → fails the lite gate), `single_module = true`. The phase count is what forces `standard`.
- **Tracker**: GitHub (no `JIRA_URL` in env), issue **#187**, currently `OPEN`, board column `Todo`, labels `task` / `priority:high`.
- **Always-load files resolved**: 3 files — `docs/architecture/concepts/coding-standards.md`, `docs/architecture/concepts/tech-stack.md`, `docs/architecture/concepts/source-tree.md` (from `skills-config.yaml` → `devLoadAlwaysFiles`; all three verified present on disk).
- **Task status on entry**: `planned` — proceeding per the develop-task status table; Step 2 (`/review-task`) validates and updates the status autonomously.

### Step 2 — review-task — 2026-08-12

- **review-task output format**: auto-answered "Comprehensive report" — required for the pipeline audit trail.
- **review-task Step 8.5 (apply fixes)**: auto-answered "Yes, apply all critical + important fixes" — pipeline proceeds autonomously and needs the task corrected before `/develop` runs.
- **review-task Step 9 (update status)**: auto-answered "Yes, fixes complete" — outcome was READY TO IMPLEMENT (9/10), so the task was promoted `planned` → `ready-for-development` (frontmatter kebab-case + body Title Case, same edit).
- **No user questions asked** — autonomous run. The three would-be clarifying questions were resolved against the codebase and recorded in the review report's "User Decisions & Clarifications" table.
- **Task review passed.** 0 Critical, 4 Important, 3 Optional. All four Important findings were *citation drift* — real code, wrong line numbers — not design defects. Zero hallucinations detected.
- **Fixes applied to the task doc**: Motivation #2 (`finalise` SKILL.md `:1061` → `:1152`), Motivation #5 (rewritten to name `DEFAULT_LADDER` in `tracker-workflow.js:82-84` instead of the unreachable `DEFAULT_STATUS_RANK` in `jira-sync.js`; `"Todo"` fix explicitly scoped out), References (exit codes `:19-27` → `:21-27`; `describeAlternatives` `:87-110` → `:127`; `finalise` block `:1023-1093` → `:1114-1195`), Known Issues (new entry recording the deferred `"Todo"` ladder gap with its blast radius).
- **Fixes applied to the plan doc**: `describeAlternatives` ref, `finalise` fixture-table ref, Jira guard `:2241` → `:2933-2957`, `buildWorkflowRecord` `:2731` → `:3744`, exit-code ref, plus a new Phase 1 paragraph documenting that `candidates` = `resolveMoment(...).targets` (plural), that `resolveMoment` returns `null` for a disabled moment, and that `isLastRung` must come off that result because `ladderFor`/`rankIn` are not exported.
- **Deliberately not applied**: `shared/resources/tests/` is undocumented in `source-tree.md` (de-facto convention, out of scope for this task).
- **Review outcome comment posted** to GitHub issue #187.

### Step 3 — develop — 2026-08-12

- **Pre-develop surface map**: Explore subagent returned a structural map of `jira-stage.js` (region-by-region line ranges), the exact `tracker-workflow.js` export signatures and `resolveMoment` return shape, `makeOutput`/`loadDotEnv` source to reimplement locally, the test-file conventions, and the proven GraphQL read/mutation shapes. Presented to `/develop` as caller-supplied context, so it ran no independent discovery.
- **Plan file found**: `task.39.plan.github-board-stage-engine.md` — included as implementation context.
- **Always-load files**: 3 files summarised into the invocation context. The load-bearing one was the CommonJS/ESM split — `package.json` is `"type": "commonjs"`, so the CLI is CommonJS and only the test file is `.mjs` ESM.
- **Internal gates**: no `risk_level: high` gate fired (field absent). Status gate not reached — the task was already `Ready for Development` from Step 2. Alignment analysis: greenfield, no existing implementation (pre-pass C had confirmed `not-started`), so no alignment prompt was possible.
- **Implemented all 4 phases in one iteration.** `shared/resources/gh-stage.js` (1,044 lines), `tests/gh-stage.test.mjs` (51 tests), 8 fixtures under `tests/fixtures/gh-*.json`.
- **One real bug found and fixed during development.** `--write-ladder` wrote a correct file that then read back as the built-in default ladder. Root cause was not the writer: `run()` calls `tw.loadWorkflow()` before the file exists, memoising the default under that absolute path in `tracker-workflow.js`'s parse cache, and `writeLadder` created the file without invalidating it — the cache's own documented failure mode (`tracker-workflow.js:392-393`). Fixed with `tw.clearWorkflowCache()` on the write's success branch. **Fixing it in the test instead was the tempting shortcut and would have left the bug live for every real caller** — a process that probes, writes and then reads would see the pre-write ladder forever.
- **Test-failure triage** was dispatched once (Explore subagent) on the single failing test; it correctly identified the cache as the cause and flagged the test-side fix as the lower-confidence alternative.
- **Consumer tests run read-only against this repo's live board 1** ("Agent Skills"): `--probe-board` returned `Todo → In Progress → Done` with `work-started → "In Progress"`, `done → "Done"`, six moments `disabled`; `--dry-run` run for all eight moments against issue #187, and the board still read `In Progress` afterwards. The write-free contract was therefore verified against a real board, not only a stub.
- **Measured, not assumed**: 3 `gh api` calls per move (2 reads + 1 mutation), 0 `item-add` without `--add-to-board` — the Performance success criteria.
- **`npm run bundle` run** (required after `shared/resources/` edits) — reported no drift, correctly: no skill references `gh-stage.js` yet.
- **One success criterion met with a stated deviation**: "Depends on `tracker-workflow.js` only" — the module also requires `./yaml-subset.js`, a 140-line dependency-free YAML reader already pulled in transitively by `tracker-workflow.js`. Zero bundle cost, and the criterion's actual purpose (no Jira code) is met exactly. Recorded in the task doc rather than glossed.
- **One Testing Strategy item deliberately not performed**: the scratch Projects v2 board with bespoke column names. It requires creating a real board on the account — an outward-facing change outside this task's mandate — and the `gh-bespoke-columns.json` fixture pins the same shape. Annotated in the task doc as the pre-adoption ritual rather than ticked or deleted.
- **Tests**: `gh-stage.test.mjs` 51/51; full suite `npm test` **1051/1051, 0 failures**, no regressions.
- **Development completion comment posted** to GitHub issue #187.

### Step 4 — create-pr — 2026-08-12

- **Staging scope** (`SCOPE_PATHS`): `docs/tasks/task.39.github-board-stage-engine`, `docs/reference`, `shared/resources`, `CHANGELOG.md`. Pre-flight guard found **no** out-of-scope untracked files, so nothing was held aside.
- **`--exclude`**: the implementation report was deliberately excluded from this commit — it keeps changing through Steps 5–8 and its final state belongs to the Step 8 commit.
- **Commit `eba12bc`** — 16 files, +3006/−94. A pre-commit hook ran `npm run bundle`; every skill reported in sync, no drift.
- **Leak check**: no out-of-scope path reached the commit. Post-commit working tree held only the excluded report.
- **PR [#206](https://github.com/Gamaroff/agent-skills/pull/206)** → `develop`, state verified **OPEN**. Body generated by an Explore subagent from the captured diff (patch file removed afterwards); it independently surfaced three real Concerns, including the `Todo`-unranked gap this task documented and deferred.
- **Issue #187 commented** with the PR link.
- **Lock updated** with `pr_url` so a PreCompact pause can post to the PR.

#### ⚠️ Board move to "In Review" skipped — and it is the task's own thesis

The Step 4 board block looks for a Status option whose name lowercases to `in review`. This repo's
board offers only **Todo, In Progress, Done**, so the lookup returned empty and the block logged a skip
and continued (non-blocking, exactly as designed).

Worth recording rather than glossing: **this is the precise failure mode task.39 exists to remove.** The
inline block hardcodes the option name, so a board that spells its columns differently — or, as here,
does not have that column at all — silently gets no board movement. `gh-stage.js` resolves the target
from the consumer's own ladder instead, and reports `no-option` naming what the board *did* offer.
Once task.40 wires the step files to it, this skip becomes a legible diagnosis rather than a silent
no-op. The card remains at `In Progress`, which is accurate — the work is in review, but this board has
no column that says so.

---

## Issues Log

| # | Step | Issue | Resolution |
|---|------|-------|------------|
| 1 | 3 | `--write-ladder` wrote a correct `tracker-workflow.yaml` that then read back as the **built-in default** ladder. | Real implementation bug, not a bad test. `run()` calls `tw.loadWorkflow()` before the file exists, memoising the default under that absolute path in `tracker-workflow.js`'s parse cache; `writeLadder` created the file without invalidating it — the cache's own documented failure mode (`tracker-workflow.js:392-393`). **Fixed** with `tw.clearWorkflowCache()` on the write's success branch. Fixing the test instead would have left the bug live for every probe-then-write-then-read caller. |
| 2 | 4 | Board move to "In Review" **skipped** — this repo's board offers only Todo / In Progress / Done. | Non-blocking by design; the block logged the skip and continued. Not a defect in this run — it is the exact hardcoded-option-name failure task.39 removes, and it becomes a legible `no-option` diagnosis once task.40 wires the step files to `gh-stage.js`. Card correctly remains at `In Progress`. |

---

## QA Iteration History

### QA Cycle 1 — 2026-08-12

**Gate Result**: FAIL (60/100)
**Issues Found**: 1 HIGH, 5 MEDIUM, 4 LOW (advisory). Step 3b code review returned 10 bugs + 2 cleanups; the 6 that were `bug` + `confidence: high` were promoted to `top_issues` per `code_review_blocking=true`.

- **CR-1 (HIGH)** — `selectBoard` chains precedence tiers with `||`, and `tryHint` cannot distinguish "hint absent" from "hint present but unmatched", so a mistyped `--board` falls through and writes the status to a board the operator never named. **Reproduced directly** before admitting it to the gate: `selectBoard(twoBoards, {board:"999", projectYml:{boardNumber:"12"}})` → `Org Portfolio`.
- **CR-2** — a title-valued `--board` sends `item-add` to a different board than the status write.
- **CR-3** — a mutation error envelope is never retried; **measured 1 attempt, not 3**, contradicting §8's own Integration Test criterion.
- **CR-4/5/6** — four tests pass vacuously: the verify re-read is unasserted, `guard: refuses a lower-ranked target` asserts the *allow* path, and `guard: unranked either side` short-circuits at `already` before reaching the guard.

**Note on method**: every high-confidence subagent finding was independently re-verified by executing the code path before being allowed to gate the build. That mattered — the findings were real, but taking them on trust would have been the wrong discipline either way.

**Action**: Running qa-fix (cycle 1 of 5).

**Fixes Applied**: All 12 findings (6 gating + 6 advisory). `selectBoard` now fails closed on a hint that is set but unmatched — only *unset* tiers fall through, and the regression test populates every lower tier so any fall-through fails it. `boardHintNumber` resolves a title against the boards actually read, or to nothing, never to a different board. The mutation error-envelope check moved *inside* the retried closure (a GraphQL error envelope is a *successful* process exit, which is why `withRetry` never saw it). Four vacuous tests replaced with real ones, backed by two new fixtures (`gh-status-verify`, `gh-card-done`). The verify re-read became confirmation rather than truth, carrying a `verified` flag. `run()` gained an injectable `sleepImpl` so retry paths are tested for behaviour, not wall-clock.

**Each original reproduction re-run after the fix**: CR-1 → `ambiguous-board` (was `Org Portfolio`); CR-2 → `""` (was project.yml's number); CR-3 → 3 attempts (was 1).

**Commit**: `71eaab9` · **Tests**: 58/58 in-suite (was 51), 1058/1058 full (was 1051) · Live board re-verified read-only, unchanged.

**Post-fix PR state**: #206 OPEN — QA loop continues.

---

## Completion

**Finished**: 2026-08-12
**Final Status**: Completed — task `accepted`
**Branch**: `feature/task.39.github-board-stage-engine` (from `develop` @ `060f77a`)
**PR**: [#206](https://github.com/Gamaroff/agent-skills/pull/206) — `feature/task.39.github-board-stage-engine` → `develop`
**QA Iterations**: 5 (final gate PASS 100/100)
**DoD Summary**: [`task.39.dod.1.github-board-stage-engine.md`](./task.39.dod.1.github-board-stage-engine.md)


---

## Completion Summary

`shared/resources/gh-stage.js` (1,299 lines) — a deterministic CLI setting a GitHub Projects v2 Status
field from the `tracker-workflow.yaml` ladder, isomorphic to `jira-stage.js`. 65 tests, 10 captured
fixtures. Nothing is wired to it; task.40 does that, deliberately.

**Pipeline:** 8 steps, no HALTs. **QA:** 5 cycles, 20 findings, all fixed and verified.
**Tests:** 1050 → 1065 full-suite, green throughout. **CI:** SUCCESS. **Task:** `accepted`.

### What the loop actually caught

The same defect — **writing a status to a board the operator did not name** — was found twice, through
two different doors. Cycle 1: an `||` chain that could not distinguish "hint absent" from "hint wrong",
so a mistyped `--board` fell through and wrote elsewhere. Cycle 3: the fix was right, but cycle 2's
partial-read tolerance let a one-board short-circuit run *before* the hint check, so a read that failed
for the named board wrote to whichever board survived — silently under `--json`, the mode the pipelines
use.

**Five vacuous tests** across the loop, including *both* guard tests and the verify-re-read test — each
passing without exercising its own name. From cycle 4 the review verified every new test fails when its
fix is reverted; cycle 5 did so for the last one.

### Three things worth carrying forward

1. **A loosened guard deserves the scrutiny of a new feature.** Of cycle 2's four changes, the only one
   that *widened* what the code accepts is the only one that regressed — and it arrived labelled
   low-confidence advisory, so it was fixed in the same pass as the blockers without its own thought.

2. **Verify findings by execution, not by reading.** Every high-confidence finding was re-run against
   the real module before being allowed to gate. That cut both ways: the findings were real, and one
   *claimed fix* (the title-hint add) turned out not to work when traced — it resolved a title against
   boards the issue was already on, so it could only ever perform a redundant no-op.

3. **A green suite is not evidence until you check it fails when reverted.** The suite reported 51/51
   at the end of Step 3 while four of its tests exercised nothing.

### Deferred, with reasons

- `DEFAULT_LADDER` rung 0 lacks `"Todo"` — changes a default Jira consumers also read.
- Nothing calls `gh-stage.js` yet — task.40. That ordering is what made it safe to get the multi-board
  and option-id questions wrong twice without a card ever moving.
- The scratch Projects v2 board ritual — needs a real board on the account.

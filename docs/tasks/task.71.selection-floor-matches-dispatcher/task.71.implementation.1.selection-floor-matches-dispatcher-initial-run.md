# Implementation Report: Make the selection floor equal what the dispatching pipeline accepts

**Task**: `task.71.selection-floor-matches-dispatcher.md`
**Run Number**: 1
**Started**: 2026-08-31 20:15
**Status**: Completed

---

## Summary

Widen `TASK_ELIGIBLE_STATUSES` in `select-next.mjs` to `{draft, planned, ready-for-development, in-progress}` so the selector's eligibility floor equals what `develop-task` accepts, enforce the equality with a two-way test, record the bug-axis divergence without acting on it, and rewrite the six prose sites that state the old rule.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | medium                                                                     |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | In Progress ✅ (Todo → In Progress, verified)                               |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.71.*` exists in git                               | Branch pre-existed at `1fa9c7c`, identical to `origin/develop` (0/0) — reused, not recreated | —                    |
| 2. review-task             | ✅ Done    | `task.71.review.{N}.{name}.md` exists (or skip logged)                 | Skipped — status `ready-for-development` + review.1 report present | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 4/4 phases; 1999 tests pass, 0 fail; 3 mutations proved | —                    |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #286: https://github.com/Gamaroff/agent-skills/pull/286 | —                    |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.71.qa.{N}.*.md`; `task.71.gate.{N}.*.yml`; PR comment posted     | 2 cycles, 1 fix cycle; gate PASS 98/100; 1 bug closed | `.summaries/step-5-traceability-mapper.json` |
| 7. finalise                | ✅ Done    | `task.71.dod.{N}.*.md`; task `status: accepted`                        | DoD PASS; issue #285 closed; board already Done | —                    |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | Final report commit + push | —                    |

---

## Decisions Log

### Pipeline Startup — 2026-08-31

- Phase 0 agents: dispatched inline (resolver unnecessary — path supplied; tracker + lite-mode read directly from disk/config, no subagent spend for three cheap reads)
- Pipeline mode: **standard** — `risk_ok = false` (`risk_level: medium` ∉ {low, absent}); `phase_count = 4` (≥ 3); `single_module = true`. The boolean AND is false on two of three inputs.
- Always-load files resolved: 3 files — `docs/architecture/concepts/{coding-standards,tech-stack,source-tree}.md` (from `skills-config.yaml` `devLoadAlwaysFiles`); all three verified present
- Tracker: `github` (no `JIRA_URL`), `TRACKER_ISSUE=285`
- Task status at entry: `ready-for-development` → proceed normally
- Prior artifact present: `task.71.review.1.selection-floor-matches-dispatcher.md` (review already run, all recommendations applied per task Change Log v1.2) — Step 2 gate check will consider this
- Q1 Feature branch base: **develop** — branch already exists and is byte-identical to `develop` (0 ahead / 0 behind)
- Q2 PR target branch: **develop** — standard Gitflow for a task
- qa-planning gate: skipped (auto — no prompt)
- Step 1: branch `feature/task.71.selection-floor-matches-dispatcher` already existed and sat exactly on `origin/develop` (`1fa9c7c`, 0 ahead / 0 behind). Reused rather than recreated — the "Branch Already Exists" path resolved to *switch to existing*, and its base is the Q1 answer already.
- **Step 7 — finalise: ACCEPTED.** DoD summary: `task.71.dod.1.selection-floor-matches-dispatcher.md`. Task `status: accepted`, `completed_date` and `pr_number: 286` written in the same edit as the Change Log acceptance row (v1.3).
- **Step 7 — CI gate checked, not assumed**: `CI_ROLLUP = SUCCESS` on head `885de04`, which **equals local HEAD** — verified per-check `head_sha` so the green is about the commit being accepted rather than an ancestor. Checks: `test`, `validate`, `link-check`, branch policy. `link-check` matters specifically here, since this task added several relative links between the task, bug, QA and gate files.
- **Step 7 — one residual recorded rather than rounded up**: the PR has **no human review** (`reviews: 0`, `reviewDecision` empty). The repo requires none — `mergeStateStatus: CLEAN` — so acceptance is defensible, but "no review required" and "approved" are different claims and only the first is true. Written into the DoD file and both PR comments rather than reported as APPROVED.
- **Step 7 — Security and Compliance are N/A by inspection, not by category**: the diff adds no credential, input, network, dependency or authorisation surface; no personal-data, payment, accessibility or licensing surface. Reasoned per-check in the DoD file.
- **Step 7 tracker**: Document link already pointed at `develop` (no re-point needed). `tracker-comment.js --stage done` → `posted`. Issue #285 closed, verified `CLOSED`. `gh-stage.js --stage done` → `already` (the close had moved the board) — a correct outcome, not a warning.
- **Step 7 accept gap**: `.claude/state/tracker-actions.jsonl` empty → no deferred mutations, no handover artifacts, `Tracker debt: none`. The `## Tracker Actions Required` section is deliberately omitted rather than left empty.
- **Step 4 — PR created**: [#286](https://github.com/Gamaroff/agent-skills/pull/286), `develop` ← `feature/task.71.selection-floor-matches-dispatcher`, state `OPEN`, `mergeable: MERGEABLE`. Two commits, split behaviour / paper trail: `43fc033` (feat) and `26fd888` (docs). Leak check clean — every committed path is inside `SCOPE_PATHS`.
- **Step 4 tracker**: `tracker-comment.js --stage in-review` → `posted`. `gh-stage.js --stage in-review` → **`stage-disabled`** — the `in-review` moment is not configured in this project's `tracker-workflow.yaml`, so the board stays where `work-started` put it. Correct outcome per the contract (CLI exits 0); recorded rather than retried.
- **Step 4 SCOPE_PATHS** (5): `docs/tasks/task.71.selection-floor-matches-dispatcher`, `docs/tasks/task-registry.md`, `skills/develop-next`, `evals/develop-next/unit`, `CHANGELOG.md`. `git diff develop...HEAD` was empty (nothing committed on the branch yet), so scope was derived from the working tree instead. Pre-flight guard: **0 out-of-scope untracked files** — both untracked paths are inside the work-item dir — so no hold dir was needed.
- **Pre-develop surface map: 7 files** (read directly, not via Explore — the task's §7 Files Summary already names every file with line anchors, so a rediscovery agent would only re-derive what the document states):
  1. `skills/develop-next/scripts/select-next.mjs` — `TASK_ELIGIBLE_STATUSES` :84-88; subset-rationale block :59-71; "floor IS the opt-out" block :73-79; `ELIGIBLE_FOR` :1014; `--lint` exclusion message :1093
  2. `evals/develop-next/unit/select-next.test.mjs` — `proceedStatuses()` :1786 (guards `sawRow` :1804 + anchor); test `16/H1` task :1808; test `16/H1` bug :1834; test `15/SC5` floor sweep :1475; `STEP0_TASK` const :1759
  3. `skills/develop-next/references/roadmap-selection.md` — heading :73; Kind/Lifecycle/Eligible table :77-79; subset + by-construction paragraphs :81,83; test index :153
  4. `CHANGELOG.md` — `[Unreleased]` has `### Added` (:7) and `### Fixed` (:186) but **no `### Changed`**; the reversed decision text sits at :73-76
  5. `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` — **read-only**, the source the equality test parses (§0c develop-task table; `Draft` and `Planned` rows already say "Proceed")
  6. `docs/tasks/task-registry.md` — status cell for T71
  7. `package.json` :24 — confirmed `evals/develop-next/unit/*.test.mjs` is already in the `npm test` glob, so the changed tests actually run
- **Verified `skills/develop-next/references/roadmap-selection.md` is NOT a bundled copy** — no `shared/resources/roadmap-selection.md` exists and the file carries no `AUTO-GENERATED` banner. Editing it directly is correct; `npm run bundle` will not revert it.
- **Two Phase-1/Phase-4 items are already satisfied by construction**: the `--lint` exclusion message interpolates `[...ELIGIBLE_FOR[row.kind]]`, so it renames itself when the constant widens — no separate edit, but the widened text must be asserted rather than assumed.
- Plan file: none (`task.71.plan.*.md` absent) — proceeding on the task's own Implementation Plan
- Always-load files read and passed to `/develop`: 3/3
- **Step 2 — review-task skipped**: task status is `ready-for-development` and a review report exists at `docs/tasks/task.71.selection-floor-matches-dispatcher/task.71.review.1.selection-floor-matches-dispatcher.md`. That review returned 6/10 NEEDS REVISION with 3 critical + 6 important findings, all of which were applied before this run (task Change Log v1.2), which is what moved the status. Skip notice posted to issue #285 (`reason: posted`).
- Step 1 tracker: `tracker-comment.js --stage work-started` → `posted`; `gh-stage.js --stage work-started --add-to-board` → `transitioned` Todo → In Progress, `verified: true`. Board Priority already `P1 High` — the P2 default correctly did not overwrite it.

---

## Step 3 — Development Record

### What changed

| File | Change |
|---|---|
| `skills/develop-next/scripts/select-next.mjs` | `TASK_ELIGIBLE_STATUSES` += `draft`, `planned`. Both rationale blocks rewritten: the `⊆` block became an equality block scoped to the task axis; the "floor IS the opt-out" block was **rewritten to state the reversal and answer the argument it overturns**, not deleted. Added an explicit note that the bug axis keeps `⊆` and why. |
| `evals/develop-next/unit/select-next.test.mjs` | `16/H1` task test converted `⊆` → two-way equality; `15/SC5` floor sweep inverted; `15/SC6` exemplar moved off `draft`; bug-axis divergence recorded above the bug assertion; **2 new tests** (synthetic draft+planned registry, roadmap-precedence guard). H1 section header rewritten. |
| `skills/develop-next/references/roadmap-selection.md` | 4 sites: heading, eligibility table (+ a new **Relation to dispatcher** column), both rule paragraphs, test-index entry. |
| `CHANGELOG.md` | New `[Unreleased] → Changed` section; **plus** the `[Unreleased] → Added` bullet at `:73-78` that asserted the now-reversed rule. |

### The `--lint` message needed no edit — and that was verified, not assumed

Phase 1 listed "update the `--lint` exclusion message" as a separate change. It is not one: the message
interpolates `[...ELIGIBLE_FOR[row.kind]]` at `select-next.mjs:1125`, and `ELIGIBLE_FOR.task` *is*
`TASK_ELIGIBLE_STATUSES`, so it renamed itself to `(draft, planned, ready-for-development, in-progress)`
the moment the constant widened. Rather than record that as a no-op, the new synthetic-registry test
asserts a passed-over `draft` row's reason `doesNotMatch(/eligibility floor/)` — turning "it derives
itself" from a claim into a checked one.

### Bug-axis divergence — measured, recorded, deliberately not closed (Phase 3)

|  | Set |
|---|---|
| `develop-bug` proceeds on | `new`, `reopened`, `in-progress`, `ready-for-qa` |
| `BUG_ELIGIBLE_STATUSES` | `new`, `reopened` |
| **Gap** | `in-progress`, `ready-for-qa` |

Confirmed by running the test's own `proceedStatuses()` over
`skills/develop-bug/references/develop-bug-step-0-resolve-bug.md` — the bug half of `16/H1` passes as a
`⊆` assertion and would fail as `===`. **Decision: leave it open.** Closing it would put a `ready-for-qa`
bug — fix already written, awaiting verification — into an unattended loop's frontier, and an
`in-progress` bug someone may be actively holding. That is a separate change needing its own Breaking
Changes and Risk sections. The gap is now written down in three places (`select-next.mjs`,
`roadmap-selection.md`, the test) so the next reader starts from a fact rather than an open question.

### Mutation proving — all three run against the real suite, each reverted

| Mutation | Expected | Actual |
|---|---|---|
| Remove `draft` from the floor | equality + eligibility tests red | **3 red** — `16/H1`, `15/SC5` sweep, and the new synthetic-registry test. One more than predicted; the integration fixture is load-bearing |
| Add `accepted` to the floor | equality test red | **red**, reporting `only in floor: accepted` / `only in dispatcher: (none)` — the capability `⊆` never had |
| Make `develop-task`'s own table HALT on `Draft` | equality test red | **red**, divergence on the floor side — proves the test re-reads the real dispatcher, and reads the git-tracked `shared/resources/` source rather than the gitignored `.agents/skills/` symlink |

`shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` was restored after mutation 3;
absence from `git status` confirms it.

### Two things found that the plan did not anticipate

1. **`15/SC6` broke as a direct consequence of the widening.** Its fixture led with a `draft` row as the
   exemplar of "a row outside the floor that must still be *listed with a reason*". That row became
   selectable, so the test failed with `T1 !== T3`. The fix preserves the test's intent by moving the
   exemplar to `ready-for-review`; rows 1/2/4 now spell out exactly the three statuses the floor still
   excludes, which is a slightly better fixture than before.
2. **A seventh prose site.** Phase 4 enumerated six. A repo-wide sweep found the reversed decision also
   stated as fact in the `[Unreleased] → Added` bullet at `CHANGELOG.md:73-78` — the task references
   those lines but scoped the edit to adding a `Changed` entry. Since task.65's entry is still
   *unreleased*, leaving it would have shipped one release block asserting both "the floor **is** the
   opt-out" and "there is no opt-out". Rewritten in place, with a pointer forward to the `Changed` entry
   so the reversal stays legible rather than looking like the decision was never made.

Historical `docs/tasks/task.65.*` documents were deliberately **not** rewritten — they are the record of
the decision being reversed, and editing them would erase the thing §2 argues against.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **`15/SC6` failed after Phase 1** (`T1 !== T3`) — not a defect, the intended behaviour change reaching a
  fixture that encoded the old rule. Resolved by moving the fixture's exemplar off `draft`; intent
  preserved. See Development Record above.
- **`npm test` exceeds a 2-minute foreground timeout** — re-run in background rather than narrowing the
  scope of the verification.

---

## QA Iteration History

### QA Cycle 1 — 2026-08-31
**Gate Result**: CONCERNS (90/100)
**Issues Found**: 1 MEDIUM, 1 LOW
- **TASK-71-QA1-01 (MEDIUM)** — twelve `//` comment lines in `select-next.test.mjs` carry literal `\u2286` / `\u2014` escape sequences instead of the characters they denote, including the H1 section header. An authoring artefact: `\u` escapes written in a non-raw Python heredoc during Step 3. No runtime impact — the three occurrences inside a template literal *are* valid JS escapes and render correctly (confirmed by the mutation-2 output printing a real `→`). Bug report: `task.71.bug.1.literal-unicode-escapes-in-comments.md`
- **LOW** — `assert.deepEqual` → `assert.deepStrictEqual` at `:1923`. Identical behaviour today; advisory only.
**NFR**: Security PASS, Performance PASS, Reliability PASS, Maintainability **CONCERNS** (the garbled comments are the sole cause)
**Code review** (`code_review_blocking=true`): 0 `category: bug` findings, so nothing was promoted to `top_issues`. The gate reached CONCERNS through the QA severity rules instead.
**Independent verification**: QA re-parsed the dispatcher's status table with its own implementation rather than trusting the test's — `sawRow = true`, PROCEED = `{draft, planned, ready-for-development, in-progress}`, equal to the constant. Blast radius checked: the constant has exactly two readers, so `--batch` and all other consumers are untouched.
**Action**: Ran qa-fix (cycle 1 of 5)
**Fixes Applied**: TASK-71-QA1-01 — replaced the literal escape sequences with the characters they denote. **18 occurrences, not the 12 the gate estimated**: the gate counted affected *lines* and several carried two. Counted before editing and reported the discrepancy rather than silently fixing more than the gate asked for. Also applied the gate's LOW `future` recommendation (`assert.deepEqual` → `assert.deepStrictEqual`) in the same pass.
**Adversarial check on the fix itself**: the `deepStrictEqual` swap changes the assertion guarding this task's central invariant, so a green suite was not accepted as sufficient — mutation 2 was re-applied and the guard still failed correctly with the arrow rendering. One check proving two things: the stricter assertion still fires, and the character replacement did not damage the failure message (the only place these characters have observable behaviour). The four transition probes (bulk teardown / in-flight / error path / reconnect) were considered and found not applicable — a text substitution has no lifecycle.
**Commit**: `885de04`

### QA Cycle 2 — 2026-08-31 (re-review)
**Gate Result**: **PASS (98/100)** — gate 1 updated in place rather than a gate 2 issued, per the "trivial fix / assertion update → quick verification" path
**Issues Found**: none. TASK-71-BUG-1 verified fixed and **Closed**
**Verification**: 0 literal escapes remain; H1 header renders; 1999 tests pass; prettier clean
**NFR**: Maintainability CONCERNS → **PASS** (sole cause fixed). All four NFRs PASS
**Action**: Exiting QA loop after 2 cycles / 1 fix cycle — proceeding to Step 7 (finalise)

---

## Completion Summary

The selection floor now equals what `develop-task` accepts. The change itself is one `Set` literal;
the work was in the argument around it and in making the guard able to catch what it previously
could not.

**Three things this run is worth remembering for:**

1. **The gap was the default path, not an edge case.** `/create-task` emits `planned`, and `planned`
   sat outside the floor — so every task ever filed was invisible to `/develop-next` until someone
   promoted it by hand. The repo's registry showed zero `planned` rows not because the gap was
   harmless but because the toil was always paid.
2. **`⊆` was structurally blind to the failure that mattered.** It could only catch a floor status
   the dispatcher refuses. The equality catches the other direction — a status the dispatcher accepts
   that the floor withholds — which is exactly where `planned` sat, and it catches over-widening too.
   Both directions were mutation-proved.
3. **The plan's six prose sites were seven.** A repo-wide sweep found the reversed decision also
   asserted as fact in CHANGELOG's `[Unreleased] → Added` bullet. Since task.65's entry is still
   unreleased, leaving it would have shipped one release block asserting both "the floor **is** the
   opt-out" and "there is no opt-out".

**What QA caught that development did not:** twelve comment lines (eighteen occurrences) rendering
literal `\u2286` escape sequences — an authoring artefact of a non-raw Python heredoc, landing on the
H1 section header a future author reads first. Fixed in one cycle; the accompanying
`deepEqual → deepStrictEqual` change was re-mutation-proved rather than accepted on a green suite.

**Deliberately left open:** the bug axis diverges from `develop-bug` by `in-progress` and
`ready-for-qa`. Measured, recorded in three places, and out of scope by §4 — closing it would hand an
unattended loop a bug whose fix is already written and only awaiting verification.

---

**Finished**: 2026-08-31 19:50
**Final Status**: Completed
**Branch**: feature/task.71.selection-floor-matches-dispatcher
**PR**: https://github.com/Gamaroff/agent-skills/pull/286
**QA Iterations**: 2 (1 fix cycle)
**DoD Summary**: docs/tasks/task.71.selection-floor-matches-dispatcher/task.71.dod.1.selection-floor-matches-dispatcher.md
**Tracker debt**: none

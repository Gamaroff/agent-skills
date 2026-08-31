# Implementation Report: Make the selection floor equal what the dispatching pipeline accepts

**Task**: `task.71.selection-floor-matches-dispatcher.md`
**Run Number**: 1
**Started**: 2026-08-31 20:15
**Status**: In Progress

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
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.71.qa.{N}.*.md`; `task.71.gate.{N}.*.yml`; PR comment posted     |       | —                    |
| 7. finalise                | ⏳ Pending | `task.71.dod.{N}.*.md`; task `status: accepted`                        |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

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

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {populated at end}
**Branch**: feature/task.71.selection-floor-matches-dispatcher
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}

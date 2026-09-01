# Implementation Report: Make the pipeline quality gate run what CI runs

**Task**: `task.75.quality-gate-matches-ci.md`
**Run Number**: 1
**Started**: 2026-09-01
**Status**: In Progress

---

## Summary

Give CI and the pipeline quality gate a single source: `npm run ci` (full) and `npm run ci:fast` (formatting + tests), tiered across the pipeline moments, held by a workflow↔composite parity test.

---

## Pipeline Configuration

| Setting             | Value                                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Feature branch base | develop                                                                                                                      |
| PR target           | develop                                                                                                                      |
| qa-planning gate    | skipped (auto)                                                                                                               |
| Task risk level     | low                                                                                                                          |
| Pipeline mode       | standard                                                                                                                     |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | N/A (no issue linked)                                                                                                        |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.75.*` exists in git                               | `feature/task.75.quality-gate-matches-ci` created from `develop` at `33f3baa`, pushed with tracking | —                    |
| 2. review-task             | ✅ Done    | `task.75.review.{N}.{name}.md` exists (or skip logged)                 | READY TO IMPLEMENT, 8/10 — 0 critical, 5 important; 7 fixes applied to the task doc, 1 skipped | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 4/4 phases; Phase 3 needed no edit. Full `npm run ci` gate green: **2092 pass / 0 fail**, 0 `not ok`, exit 0 | —                    |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #291: https://github.com/Gamaroff/agent-skills/pull/291 — commit `7bd7157`, 19 files. No issue linked, so no comment posted | —                    |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.75.qa.{N}.*.md`; `task.75.gate.{N}.*.yml`; PR comment posted     | 3 cycles: CONCERNS 90 → CONCERNS 80 → **PASS 100**. 5 findings raised, 5 closed. 10 mutation proofs | —                    |
| 7. finalise                | ✅ Done    | `task.75.dod.{N}.*.md`; task `status: accepted`                        | DoD 10/10, CI SUCCESS 4/4, `status: accepted`; sprint-review summary + canonical PR comment | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

---

## Decisions Log

### Pipeline Startup — 2026-09-01

- Invoked by `/develop-next` in **autonomous mode** — all Phase 0d questions auto-answered with the recommended option, per the develop-next AUTONOMOUS RUN directive.
- Feature branch base: `develop` — auto-answered (recommended default); task is a standard technical task, not a hotfix.
- PR target branch: `develop` — auto-answered (recommended default); standard Gitflow, task is standalone with no epic integration branch.
- qa-planning gate: skipped (auto — no prompt)
- Pipeline mode: **standard** — `risk_level: low` is satisfied, but the task defines 4 implementation phases (≥3), so the lite-mode conjunction fails.
- review-task output format auto-answered: **Comprehensive report** — required for the pipeline audit trail.
- review-task Step 0a branch setup auto-skipped — already on `feature/task.75.*`.
- review-task Step 8.5 auto-answered: **Yes, apply all critical + important fixes** — pipeline proceeds autonomously.
- review-task Step 9: no-op — task was already `Ready for Development`, no promotion needed.
- review-task tracker-sync gate auto-answered: **Skip — leave unlinked** — an unattended run must not create a remote issue unprompted.
- Review report: `docs/tasks/task.75.quality-gate-matches-ci/task.75.review.1.quality-gate-matches-ci.md` — READY TO IMPLEMENT (8/10), 0 critical / 5 important / 3 optional.
- PR created: https://github.com/Gamaroff/agent-skills/pull/291 (base `develop`, commit `7bd7157`).
- Staging scope: 12 `--scope` paths; leak check clean, pre-flight guard held 0 files (all untracked files in scope).
- GitHub board / issue comment: skipped — `TRACKER_ISSUE` empty.
- Task review passed. Proceeding despite 1 skipped fix (tracker linkage — needs user input).
- Tracker: `TRACKER=github`, no `github_issue` in frontmatter → `TRACKER_ISSUE` empty; tracker signals (Step 1 "Signal Work Started", board moves) skipped this run.
- Implementation report stashed before branch creation, restored after — clean pop, no manual recovery needed.

---

## Development Record — Step 3

**Implementation approach.** Four phases, in dependency order.

- **Phase 1 — one definition of green.** `package.json` gains `ci` (`npm run ci:fast && npm run eval:all`)
  and `ci:fast` (`npm run format:check && npm test`). The three existing scripts stay — they are the
  tiers, and CI names them individually.
- **Phase 2 — tier the gates.** The fast gate is a **config key, not a literal**: the two shared step
  docs ship verbatim into consumer repos that have no `ci:fast` script, so hardcoding it would instruct
  every downstream project to run a command that does not exist. Added `develop.fastGateCommand`
  (default `npm run ci:fast`), referenced as `<fastGateCommand>` to match the existing
  `<qualityGateCommand>` idiom. In step-3 this **resolved the existing `<test-command>` placeholder**; in
  step-5-6 it is a **new step 0a**, gating the qa-fix commit — placed before the commit because a qa-fix
  cycle pushes, so a red commit is a red PR the reviewer sees. `developNext.qualityGateCommand`'s default
  moved `npm test` → `npm run ci`.
- **Phase 3 — workflow calls the tiers.** **No edit required**, exactly as the review predicted: the
  workflow already ran `npm run format:check`, `npm test` and `npm run eval:all` as three separately
  named steps. Verified rather than changed; Phase 4 is what now holds it.
- **Phase 4 — the parity test.** `evals/shared/tests/ci-gate-parity.test.mjs`, 8 tests. Compares the
  workflow's npm-script set against the `ci` composite **transitively expanded through composites only**
  (a composite is a script whose body is nothing but `&&`-joined terms naming other scripts; anything
  else is a leaf). `deepEqual` on sorted sets, so it fails in **both** directions.

**One trap worth naming.** The workflow runs `npm ci` — npm's *installer*. Read naively as the `ci`
*script*, the parity check would compare the composite against itself and pass however far the two had
drifted. `scriptInvokedBy()` resolves `npm run X` and `npm test` only, and has its own test pinning
`scriptInvokedBy("npm ci") === null`.

**The gate caught its own defect on first run.** `npm run ci` went red on `prettier --check` against the
new test file — the exact task-67 failure (a new file, correct logic, unformatted), reproduced live by
the tier that now runs before push rather than in CI afterwards. That is the behaviour verification the
task asked for, unplanned.

**Full gate: green.** `npm run ci` (format:check + npm test + eval:all) — exit 0, **2092 pass / 0 fail**.
A first run failed on `access-config-parity` alongside 6 `spawnSync … ETIMEDOUT` warnings; it passed in
isolation with zero timeouts, and the clean re-run on an idle machine is green. Resource contention from
concurrent runs, not a regression — nothing here touches access-config resolution.

**Mutation proofs — 7, all red.** A passing test is not evidence until the behaviour it claims to hold
is reverted and it goes red.

| # | Mutation | Result |
| - | -------- | ------ |
| M1 | Remove `format:check` from the composite | 🔴 5 tests |
| M2 | Replace `npm test` in the composite | 🔴 3 tests |
| M3 | Remove `eval:all` from the composite | 🔴 7 tests |
| M4 | Add a CI step the composite does not call | 🔴 |
| M5 | Collapse CI into one opaque step | 🔴 |
| M6 | Leave `develop-batch`'s table at `npm test` | 🔴 |
| M7 | Hardcode the literal in the qa-loop doc | 🔴 |

Baseline green before and after.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **`develop-bug`'s fix cycles do not run the fast gate — deliberate, and worth a decision.** The bug
  pipeline shares `develop-pipeline-step-3-develop-loop.md`, so its **develop loop does** get
  `<fastGateCommand>`. But its per-cycle fix loop lives in its own
  `shared/resources/develop-bug-step-5-6-verify-loop.md`, which is a **different document** from the
  qa-loop this task names, with its own cycle structure. Task 75 §7 does not list it. Left untouched
  rather than silently widening scope — but the asymmetry is real: a bug fix cycle can still commit an
  unformatted tree where a task fix cycle now cannot. Recommend a follow-up task; flagged to QA rather
  than decided here.
- **M6/M7 restore overshot.** `git checkout <file>` was used to undo those two mutations, which reverted
  the task's own edits to the same files alongside the mutation — caught immediately by a red re-baseline,
  and both edits were re-applied. The proofs themselves are unaffected (each mutation went red before the
  restore). Noted because `git checkout` is the wrong undo for a mutation applied on top of uncommitted
  work; `cp` to a backup, as M1–M3 used, is the right one.
- **Task has no linked tracker issue** (`github_issue`/`jira_key` absent). Flagged Important by
  `/review-task` check 5. Deliberately **not** auto-created: the skill forbids creating a remote issue
  unprompted and this is an unattended run. Repo convention is mixed, so this is not a deviation.
  Resolve with `/sync-github-task` if a card is wanted. Non-blocking — all tracker signals are skipped
  this run.

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: 2026-09-01
**Final Status**: Completed
**Branch**: `feature/task.75.quality-gate-matches-ci`
**PR**: [#291](https://github.com/Gamaroff/agent-skills/pull/291)
**QA Iterations**: 3 (2 qa-fix cycles)
**DoD Summary**: `task.75.dod.1.quality-gate-matches-ci.md` — 10/10 PASS
**Tracker debt**: none — no tracker issue linked, so no tracker mutation was attempted or deferred

---

## QA Iteration History

### QA Cycle 1 — gate CONCERNS (90/100)
- **TASK-75-001** (medium): fast-gate block numbered `0a.` but placed before step `0.` — ordering and label both wrong.
- LOW: `workflowScripts()` dropped unknown workflow scripts instead of flagging them.
- Fixed in `ee204be`. Mutation proof M8 added.

### QA Cycle 2 — gate CONCERNS (80/100), mandated refute pass
Run as a full refute pass over the whole branch diff rather than a narrowed re-read — which is what found both defects, each correct today and wrong on a transition:
- **TASK-75-002** (medium): parity test documented as reading the `test` job, actually scanned the whole workflow file. Correct only while `test.yml` holds one job.
- **TASK-75-003** (low): step 0a claimed `MAX_ITER` bounded its inner retry; `MAX_ITER` counts cycles and never governed it.
- Fixed in `ccc62d9`. Mutation proofs M9, M10, and M9-pre (which proves the scoping fix removes a real false failure).

**The fast gate went red on this cycle** (`access-config-parity`, `spawnSync ETIMEDOUT`) and **no commit was made on it** — the 2-attempt budget added in this very cycle governed the retry. Attempt 2 green: 2094 pass / 0 fail.

### QA Cycle 3 — gate PASS (100/100)
All five findings verified closed; TASK-75-001 confirmed not regressed by cycle 2's edits to the same file. Verified in context that the one remaining occurrence of the old `MAX_ITER` phrasing is the deliberate negated mention, not a leftover claim — a naive grep would have read it as an incomplete fix.

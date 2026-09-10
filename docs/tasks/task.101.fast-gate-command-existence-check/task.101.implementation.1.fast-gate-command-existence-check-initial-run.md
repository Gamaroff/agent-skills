# Implementation Report: fail fast on a missing `fastGateCommand`

**Task**: `task.101.fast-gate-command-existence-check.md`
**Run Number**: 1
**Started**: 2026-09-10 06:20
**Status**: In Progress

---

## Summary

Add a startup precondition to the develop loop's fast gate so a consumer whose `develop.fastGateCommand` names an undefined npm script HALTs before the first iteration instead of dying mid-loop, and reword the documentation so `npm run ci:fast` reads as a suggested value for required configuration rather than a universal default.

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
| Board status        | Issue #370 created in Step 2, added to board 1, Priority P2 ✅              |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.101.*` exists in git                              | Branch created at `5291ea84`, pushed with tracking | —                    |
| 2. review-task             | ✅ Done    | `task.101.review.1.fast-gate-command-existence-check.md`                | READY TO IMPLEMENT, 8/10; 0 critical / 3 important (all applied) / 1 optional. Status Draft → Ready for Development | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 3 phases, 5/5 success criteria. 14 files touched, 11 tests added. Fast gate green (3033 pass / 0 fail) after 2 red cycles, both this run's own work | —                    |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.101.qa.{N}.*.md`; `task.101.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.101.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

---

## Decisions Log

### Pipeline Startup — 2026-09-10

- Invoked by `/develop-next` (item T101, source `task-registry` — no roadmap phase held an actionable row).
- **AUTONOMOUS RUN (develop-next)**: Phase 0d questions auto-answered with the recommended option, no prompt.
  - Q1 Feature branch base: `develop` — auto-derived recommended option (current branch is `develop`).
  - Q2 PR target branch: `develop` — auto-derived recommended option.
- qa-planning gate: skipped (auto — no prompt).
- Phase 0a-parallel agents: **not dispatched.** The session's operating instructions forbid the Agent tool unless the user requested it, and all three agents' outputs (path resolution, tracker key, lite-mode inputs, always-load list) are direct file reads. Gathered inline instead; recorded here because the substitution is a deviation from the documented dispatch.
- Pipeline mode: **standard**. Computed from `risk_ok = (risk_level "low" ∈ {low, absent}) = true`, `phase_count = 3` → `3 < 3` is **false**, `single_module = true`. The phase-count boolean fails, so the AND is false.
- Always-load files resolved: 3 files from `skills-config.yaml` `devLoadAlwaysFiles`; all three verified present on disk.
- Tracker: `TRACKER=github`, `TRACKER_ISSUE` empty — the task file carries no `github_issue:`. Tracker signalling skipped at Phase 0; Step 2 `/review-task` owns issue creation.
- Task status at entry: `draft` → proceed per the develop-task status table (Step 2 promotes it).
- review-task output: Comprehensive report — required for pipeline audit trail (auto-answered).
- review-task Step 8.5 auto-answered: Yes, apply all critical + important fixes — pipeline proceeds autonomously.
- review-task Step 9 auto-answered: Yes, fixes complete — status promoted `draft → ready-for-development`.
- Tracker sync auto-answered: Sync to GitHub — recommended option; repo convention (every recent task carries `github_issue`).
- Phase 1.5 pre-pass Explore subagents: **not dispatched** (same Agent-tool constraint as Phase 0a). Both axes covered inline: architecture alignment by reading the three always-load concept docs and the step-3 loop document; already-implemented scan by `grep -rn "GATE_SCRIPT|Missing script"` over `shared/`, `docs/`, `skills/` — zero hits outside the task document itself.
- Review report: `docs/tasks/task.101.fast-gate-command-existence-check/task.101.review.1.fast-gate-command-existence-check.md`
- Review outcome comment posted to GitHub issue #370 (`reason: posted`).

### Step 3 — Develop — 2026-09-10

- Alignment: **no existing implementation** (greenfield for the check). `grep -rn "GATE_SCRIPT|Missing script"` over `shared/`, `docs/`, `skills/` matched only the task document itself. The two documentation targets exist and were reworded rather than created.
- Pre-develop surface map reused from Step 2's verification rather than re-derived; no Explore subagent dispatched (session Agent-tool constraint, as at Phase 0a).
- **Doc sweep widened beyond the task's Files Summary.** `git ls-files | grep -v '^skills/[^/]*/references/' | xargs grep -ln 'ci:fast'` found four further live authoring sites restating the default (`shared/resources/develop-pipeline-step-5-6-qa-loop.md`, `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`, `skills/develop/SKILL.md`, `skills/develop-next/SKILL.md`). Rewording only the step-3 document would have left four documents still calling it a default. The **check** itself stayed where §4 scoped it — the develop loop only.
- `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md` is **skill-native** (no `shared/resources/` counterpart), so it was edited in place and survives `npm run bundle`. Confirmed after bundling.
- Test added at `evals/shared/tests/fast-gate-precondition.test.mjs` — already covered by the existing `evals/shared/tests/*.test.mjs` glob in `npm test`, so no `package.json` edit was required.
- The test **extracts and executes** the fenced block from the loop document against fixture projects in `bash` and `zsh` rather than grepping the document, per this repo's "assert behaviour, not source text" rule. 10/10 passing.
- **Mutation-proved, four mutations**, each applied to the document, run, and reverted: no-HALT (6 red), dead `sed` pattern (5 red), guard removed (2 red — the skip cases only, isolating the fail-safe inversion), and `$fastGateCommand` restored (5 red — proving the review's binding fix is load-bearing).
- CHANGELOG.md updated: the change is behavioural for consumers (startup HALT replaces a mid-loop death).

#### Fast-gate cycle 1 — RED (formatting), cycle 2 — RED (two repo guards), cycle 3 — see below

The fast gate did its job twice, both times on this run's own work:

1. **`prettier --check`** flagged the new test file. This is exactly the task-67 failure mode the
   fast tier exists to catch before CI, and it was caught in seconds. Fixed with `prettier --write`.
2. **Two repo guards**, 3030/3033 passing:
   - `tests/test-harness-concurrency.test.js` — the new test hardcoded `timeout: 60_000`. The repo
     forbids a spawn-timeout literal in a test file (bug.2: a literal chosen against an idle machine
     sits ~1.2x above the loaded worst case). Fixed by importing `spawnBudget("FAST_GATE_PRECONDITION")`
     from `shared/resources/spawn-budget.mjs`, matching the sibling eval test's pattern.
   - `tests/executable-instructions.test.js` — two hits, with **different causes and different fixes**:
     - `npm run lint`, from the new fastGateCommand table's compound-command example. Genuinely a
       consumer-provided script, so it was **classified** in `CONSUMER_PROVIDED_NPM_SCRIPTS` with a
       comment recording that intent — which is what that allowlist is for.
     - `npm run 2`, from the check's own `npm run 2>/dev/null`. This is a **false positive in the
       guard**: that idiom is a bare `npm run` with stderr discarded and invokes no script, so there
       is nothing to ship and nothing to classify. Both workarounds were worse than fixing the
       instrument — allowlisting `2` would assert consumers provide a script called `2`, and
       rewording the prose would remove the very idiom this task's check depends on. The scanner now
       skips an **all-digit token immediately followed by `>`** and nothing else, with a new
       `isFdRedirect` unit test asserting both directions so the narrowing cannot widen unnoticed.
       Mutation-proved: forcing `isFdRedirect` to `return false` reddens 2 of 4 tests in that file.
- Step 1: branch `feature/task.101.fast-gate-command-existence-check` cut from `develop` at `5291ea84` and pushed. Implementation report stashed before branch creation, restored after. Tracker signal skipped — no `github_issue:` on the task.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Step 2 — task carried no `github_issue`.** `review-task` check 5 flagged it Important. Dedup search returned zero matches; issue #370 created, board-added, Priority P2, frontmatter + body link written. Not blocking.

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: `feature/task.101.fast-gate-command-existence-check`
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}

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
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #371 (4 commits, scoped staging, zero leaks). Issue #370 commented (`posted`). Board `in-review`: `stage-disabled` | —                    |
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

### Step 4 — Create PR — 2026-09-10

- SCOPE_PATHS: the task dir plus `shared/resources`, `docs/reference`, `evals/shared/tests`, `tests`, `skills/develop`, `skills/develop-next`, and the three `skills/*/references` dirs, plus `CHANGELOG.md`. Pre-flight guard held **nothing** — all three untracked files were already in scope. Post-commit leak check: clean.
- Four logical commits rather than one: the behaviour change + doc sweep, the test, the guard fix, and the task documents. The guard fix is deliberately its own commit — it changes a test the rest of the repo depends on, and burying it in a feature commit would hide that.
- The implementation report was committed **here**, not withheld to Step 8, per the step-4 rule: a report linked from a tracked document but itself untracked is a dangling link that passes locally and reddens CI.
- PR #371 → `develop`. Issue #370 commented (`reason: posted`).
- Board `in-review`: `reason: stage-disabled` — correct outcome, the moment is not mapped on this board.
- Head-SHA parity confirmed: PR head `cc031708056a` == local HEAD.

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

### QA Cycle 1 — 2026-09-10
**Gate Result**: CONCERNS
**Issues Found**: 1 MEDIUM — §8 Testing Strategy asserts `qa-task` Step 4b will execute the snippet in both shells; executed, Step 4b classifies the block `mutating` (`unrecognised-command: npm`, fail-closed) and skips it. The coverage is real and stronger than the claim (the dedicated eval test), so the defect is the recorded reason-to-believe, not a gap.
**HIGH findings**: 0
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)

### QA Cycle 2 — 2026-09-10 (refute pass)
**Gate Result**: CONCERNS
**Issues Found**: 1 MEDIUM (new) — the precondition is filed under `## Test Failure Triage`, which a reader executing the loop reaches only *after* a failure; nothing at the loop's entry (L88/L92) points to it. Cycle 1's finding verified FIXED, and both of its replacement claims were refuted against the engine and survived.
**HIGH findings**: 0
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)

Notes:
- **The refute pass paid for itself.** The finding is in the *original* change, at a location cycle 1's fix never touched — exactly what the cycle-2 no-narrowing rule exists to surface.
- **Cycle 1's placement check was vacuous in the precise sense.** It asserted the precondition precedes the Output Capture Pattern. True — and satisfiable without the property it was meant to establish, because the Output Capture Pattern was the wrong reference point. The right one is the loop's control flow.
- One root cause, not two findings: the qa-fix and develop-bug verify-cycle documents now assert the loop has already validated the key, a claim conditional on the same placement.
- Fix: forward pointer at the top of `## Develop Loop — Run Until Complete (Bounded)`, plus a **section-scoped** regression assertion. Mutation-proved twice — removing the pointer reddens it, and *relocating* the pointer elsewhere in the same file also reddens it, so a naive whole-file mention cannot satisfy it.

Notes:
- All five success criteria verified **by execution**, not by reading.
- 5/5 mutations proven, including one that re-introduces the pre-implementation defect and confirms the drafted snippet would have passed vacuously.
- `zero-blocks-executed` on the changed prose files is **pre-existing**: baseline on `develop` is `blocks=5 {0/2/3}` with the identical finding; current is `blocks=6 {0/2/4}`. Not raised against this task.
- Step 3b diff code review performed inline rather than via an Explore subagent (session Agent-tool constraint); the lens was applied, only the dispatch differs. Two candidate bugs probed and cleared.

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: `feature/task.101.fast-gate-command-existence-check`
**PR**: [#371](https://github.com/Gamaroff/agent-skills/pull/371)
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}

# Implementation Report: [Task 146] qa-fix: a fix to an identity rule must prove both directions — should-merge and should-not-merge

**Task**: `task.146.identity-rule-fix-probe.md`
**Run Number**: 1
**Started**: 2026-09-25 08:36
**Status**: In Progress

---

## Summary

Add an identity-rule probe to qa-fix Step 3.5 and an Identity rules bullet to the qa-task / qa-story cycle-2 refute directive, plus a test that holds both and the two directives' byte-parity — autonomous run dispatched by /develop-next (roadmap item T146).

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
| Board status        | In Progress ✅ (`gh-stage.js` work-started: transitioned; re-probe `already`); Priority P2 Medium already set |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.146.*` exists in git                             | Branch `feature/task.146.identity-rule-fix-probe` created at `7aa72e5e` from `develop`, pushed with upstream | —                    |
| 2. review-task             | ✅ Done    | `task.146.review.{N}.{name}.md` exists (or skip logged)               | `task.146.review.1.identity-rule-fix-probe.md` — READY TO IMPLEMENT 9/10; 0 Critical, 1 Important (fixed), 1 Optional; Planned → Ready for Development | — |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 1 iteration; loop audit ready-for-review 11/11; ci:fast 4010/0; 6 new tests mutation-proved; worked application vs task.144 historical keys recorded | — |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.146.qa.{N}.*.md`; `task.146.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.146.dod.{N}.*.md`; task `status: accepted`                      |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-09-25

- Dispatched by `/develop-next` (roadmap item T146, source: roadmap) with the AUTONOMOUS RUN directive.
- Feature branch base: develop — auto-answered (recommended option; on `develop`), per develop-next directive
- PR target branch: develop — auto-answered (recommended option), per develop-next directive
- qa-planning gate: skipped (auto — no prompt)
- Phase 0 run inline: input was an exact file path, so no resolver was needed; the lite-mode inputs were derived from the document directly (0c: "Agent 3 not dispatched" is first-class). Tracker poller not dispatched — board state is set by Step 1's work-started signal.
- PIPELINE_MODE = standard — risk_level absent (risk_ok = true), phase_count = 4 (not < 3), single_module = false (qa-fix, qa-task, qa-story).
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Task status at start: Planned — Step 2 (/review-task) validates and promotes.
- Tracker: github, issue #474.
- Step 1: branch `feature/task.146.identity-rule-fix-probe` cut from `develop` @ `7aa72e5e` and pushed. Implementation report stashed before branch creation and restored after (clean `git stash pop`).
- Step 1: pipeline-start comment on #474 — `tracker-comment.js` reason `posted`. GitHub board: work-started → transitioned (In Progress).
- review-task invoked (status Planned, no review report). review-task output: Comprehensive report — required for pipeline audit trail.
- review-task pre-pass: Agents B + C dispatched 08:37 in parallel, both returned within ~1 min (B `alignment: aligned`; C `implementation_status: not-implemented`).
- review-task question points resolved autonomously (no operator in a develop-next run): Q1 refute-entry placement → its own paragraph after the four-transition list (recommended option), because a fifth bullet falsifies "probe these four transitions" and gates the probe on a lifecycle trigger.
- review-task Step 8.5 auto-answered: Yes, apply all critical + important fixes — pipeline proceeds autonomously. 1 Important fix applied to task + plan; Change Log 1.1 row written.
- review-task Step 9 auto-answered: Yes, fixes complete — Planned promoted to Ready for Development by review-task.
- Review report: docs/tasks/task.146.identity-rule-fix-probe/task.146.review.1.identity-rule-fix-probe.md
- Tracker key re-read after review: 474 (unchanged from Step 1) — no work-started re-fire.
- Review outcome comment posted to github issue 474 (`--stage review`: posted); review-task Step 10 comment (`--stage review-task`: posted).

### Step 3 — Develop — 2026-09-25

- Pre-develop surface map: 8 files identified in qa-fix, qa-task, qa-story, tests/ and CHANGELOG (Explore dispatched 08:43, returned 08:45). No shared/resources or bundled copy of Step 3.5 or the REFUTE PASS block.
- Plan file found: docs/tasks/task.146.identity-rule-fix-probe/task.146.plan.identity-rule-fix-probe.md — included as implementation context for /develop.
- Fast gate precondition: `develop.fastGateCommand` is unset, so the suggested `npm run ci:fast` applies. The script resolves.
- Planned/Draft gate auto-answered: Yes — review-task validation in Step 2 is sufficient. Alignment: greenfield (pre-pass C `not-implemented`).
- Phase 1: qa-fix Step 3.5 gains *For a fix to an identity rule, probe both directions* and a three-row table, placed between the documentation table and *Review the combination*. The plan text said the key was patched "for four QA cycles". The record says "Four of five cycles circled one mechanism" (task.144 implementation report L145), and the fifth instance came from the 5c /review-pr (L237). The prose therefore says four of five QA cycles, plus the PR review.
- Phase 2: one split/join script inserted the Identity rules paragraph into both REFUTE PASS blocks, with the anchor count asserted as 1 per file. The extracted blocks are `cmp` identical afterwards, and the four-transition list is unchanged.
- Phase 3: `tests/identity-rule-probe.test.js`, 6 tests. Each mutation ran from a `cp` snapshot and was restored afterwards:
  - M1, edit the qa-task block only: parity red.
  - M2, delete the paragraph from both: presence and placement red.
  - M3, make it a fifth bullet in both: red.
  - M3b, add a fifth non-identity bullet with the paragraph intact: **count assertion alone** red. M3 had gone red through the presence regex first, so the count assertion was still unproven; M3b isolates it.
  - M3c, move the paragraph before the list: placement red.
  - M4, delete the Should-not-merge row: qa-fix red.
  - M5, rename the REFUTE fence in both: floor red, not an equal-empty pass.
  - M6, drop the obs #169 citation: qa-fix red.

  Restored tree: 6/6 green.
- Phase 4: CHANGELOG `[Unreleased]` › Changed entry citing (task 146). docs/reference/commands.md and activation-phrases.md were grepped for qa-fix, refute and Step 3.5 descriptions (create-skill rule, obs #159). Neither restates the changed behaviour.
- Fast gate iter 1: `npm run ci:fast` exited 0, with 4010 tests and 0 failures (format:check included). `quick_validate` passed for qa-fix, qa-task and qa-story. `bundle --check` reported 0 problems. `check:generated` was clean.
- **Worked application (task §8 behavioural evidence).** The probe's pairs were run against task.144's real historical key functions, from a `git archive` of `shared/resources` at each fix commit rather than a model of them. The flag-before-`{input}` key is commit `5f553950` ("qa-fix cycle 2"), which QA cycle 3 reported as defective. The argv skeleton is commit `ef1ed9d6` ("qa-fix cycle 3"), which QA cycle 4 reported:

  | Pair (uat-status.mjs argv)                                                               | 5f553950 flag key | ef1ed9d6 skeleton key |
  | ---------------------------------------------------------------------------------------- | ----------------- | --------------------- |
  | should-merge: same control, different `--root` per run                                   | one key ✓         | one key ✓             |
  | should-not-merge: `--set D.1 blocked --note {input}` / `--accept D.1 --note {input}`     | **one key ✗**     | two keys ✓            |
  | should-not-merge: `--mode strict --note {input}` / `--mode lax --note {input}`           | **one key ✗**     | **one key ✗**         |

  Each fix passed the direction its finding named and failed a should-not-merge pair drawn from a real call site. Those failures are the cycle-3 CR-1 and cycle-4 CR-1 defects. Had the probe existed, each would have shown up in the previous cycle's own qa-fix Step 3.5 pass, one cycle early, as the task claims.
- Loop audit iter 1 (Explore, dispatched → returned in ~30s): `{status: ready-for-review, completed: 11, total: 11}` → EXIT loop.
- Development completion comment posted to github issue 474 (`--stage develop-complete`).

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {populated at end}
**Branch**: `feature/task.146.identity-rule-fix-probe`
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}

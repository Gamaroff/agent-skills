# Implementation Report: Probe expected.absent takes bare names; the rule doc says paths

**Task**: `task.232.probe-expected-path-assertions.md`
**Run Number**: 1
**Started**: 2026-10-25 00:00
**Status**: In Progress

---

## Summary

Let probe `expected.absent` name nested paths, add `expected.removed`, move the four collision checks into one helper, and document both fields.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | feature/task.232.probe-expected-path-assertions                            |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set                                                                    |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Tracker Issue       | #747 (GitHub)                                                              |
| Board status        | In Progress ✅ (already — gh-stage `already`)                              |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.{id}.*` exists in git                             | Existing branch reused at `0b714103` (cut from develop by review-task Step 0a; tracks origin, in sync). Lock written; issue #747 work-started comment posted; board already In Progress; Priority already P2 | —                    | 2026-10-25T18:23Z |
| 2. review-task             | ✅ Done    | `task.{id}.review.{N}.{name}.md` exists (or skip logged)               | Skipped — already reviewed: status Ready for Development, `task.232.review.1.probe-expected-path-assertions.md` exists (all 8 recommendations applied). Skip notice posted to #747 | —                    | 2026-10-25T18:24Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline (plan + surface map). 1 iteration; 18/18 phases; 44 new tests; 11 mutations red; `npm run ci` green with `.agents/skills` moved aside (6335 tests, 0 fail). Develop-complete comment posted to #747 | `.summaries/step-3-iteration-audit-1.json` | 2026-10-25T19:07Z |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.{id}.qa.{N}.*.md`; `task.{id}.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.{id}.dod.{N}.*.md`; task `status: accepted`                      |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-10-25

- Feature branch base: feature/task.232.probe-expected-path-assertions — source: asked (Recommended). The branch was cut from `develop` by `/review-task` Step 0a and already carries review 1 (`0b714103`).
- PR target branch: develop — source: asked (Recommended).
- Mode: standard — source: detector. Lite inputs: risk_level absent (ok), phase_count 3 (not < 3), single_module true → standard.
- Skips: none. Refused flags: none.
- qa-planning gate: skipped (auto — no prompt).
- Phase 0 ran inline (no 0a-parallel agents): the path was given, so no resolver was needed; the lite-mode inputs were read from the document directly; tracker issue #747 read from frontmatter.
- Phase 0b: branch exists but no PR and no implementation report — the branch is review-task's, not a pipeline run's. Treated as a fresh start.
- Questions asked: Q1 (branch base), Q2 (PR target) — 2, matching the required count.
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md.

### Step 2 — 2026-10-25

- review-task skipped — task status is `Ready for Development` and review report exists at `task.232.review.1.probe-expected-path-assertions.md`.

### Step 3 — 2026-10-25

- Fast gate precondition: `develop.fastGateCommand` unset → suggested `npm run ci:fast`; script defined.
- Pre-develop surface map: 20 files identified in shared/resources (security-probe.mjs, its test suite and fixtures, four `expected` docs, task.227 records). Summary: `.summaries/step-3-codebase-map.json`. One fact the plan did not state: task.227's run record has `shells: ["bash"]` only, so the regression test runs under every `probeShells()` shell as the plan says, which is wider than the DoD run.
- Plan file found: `task.232.plan.probe-expected-path-assertions.md` — included as implementation context for /develop.
- Step 3 inline — /develop not invoked: the plan names every hunk (helper code, runner table, mutation list), and the surface map confirmed every anchor.
- **Base grammar measured before the change** (develop `0b714103`, `expectedProblem({exit:0, absent:[v]})`): refuses `""`, `.`, `..`, NUL, `a/b`, `.claude/state/x`, `./a`, `../a`, `/abs`, `a/../../b`, `a/..`, `a//b`, `a/`, non-arrays and `[5]`; accepts `pwned`, `PWNED2`, `.hidden`. Base ignores `removed` entirely (`removed: ["../a"]` accepted). This is the `base` column of the differential test.
- **Red first.** The new and changed tests ran against the unchanged engine, with a stub `pathAssertionProblem() { return null; }` appended so the module loads. 37 of 45 failed. The 8 that passed are expected: "a removed path the run deletes passes" ×5 (base ignores `removed`), shell:/shell-fn: "absent path the fixture creates is declined" ×2 (base already had the exact rule there), and the task.227 regression (rewritten with `removed`, which base ignores). The task.227 cases' own red is the original record: both declined under `absent`.
- **Design choices beyond the plan.**
  - `casePathState` resolves the **parent** with `realpathSafe` and joins the leaf, rather than `realpathSafe(target)`. That way a symlink at the leaf is lstat'd and never followed, as § 3 says. A leaf link to outside reads as `present` ("was created"), not as "outside". A link above the leaf reads as "outside".
  - `scoreFenceRun` step 1 had a second `absent` read, `existsSync(join(caseDir, p))`, which followed links. The task's file list missed it. It now goes through `casePathState` too, and a new test pins it: a dangling symlink planted before the shell stops is a reproduction.
  - The decline message keeps "other than . and .." because the BUG-13 test pins it: "must be an array of relative paths inside the case directory, other than . and .. — no ".." segment, not absolute, no NUL".
  - Fixtures: 4 plan-named shell scripts (nested-write, remover, non-remover, symlink-out), shared by `shell:` and `shell-argv:`. `path-actions-lib.sh` serves `shell-fn:`, `cli-path-actions.mjs` serves `cli:`, and `rm-tree.sh` is the obs #176 control. `fence:` builds its doc inline with `fenceRoot`. The containment case plants `out -> /` and asserts `out/tmp`: the host's `/tmp` exists, so an existence check that followed the link would say "was created".
- **Mutation proofs** (`t232-mutate.mjs` in the session scratchpad; split/join, one occurrence each; the engine was restored and `cmp`-verified after every mutation and once at the end). Every mutation turned at least one test red:

  | Mutation | Red tests |
  | --- | --- |
  | M1 drop the absent created/ancestor rule | 9 — the "absent path the fixture creates is declined" test on **all five forms**, plus BUG-13, TASK-180-004 and two unit tests (review 1, I3: every runner routes through the helper) |
  | M1a fold the `removed` comparison | 6 — the C1 unit test and "removed path the fixture does not create is declined" on all five forms (the upper-cased row) |
  | M2 drop the removed-not-created rule | 7 — the unit tests and the per-form "does not create" tests |
  | M2b drop the absent-beneath-a-file rule | 6 — the unit test and the per-form "beneath a file" tests |
  | M3 (no both-lists rule exists) | pinned by the unit test "a path in both lists is declined by the other two rules" |
  | M4 drop the ancestor realpath check | 5 — the containment test on all five forms |
  | M4b `lstatSync` → `statSync` (follow the leaf) | 1 — the fence dangling-symlink test |
  | M4c fence step 1 back to `existsSync` | 1 — the fence dangling-symlink test |
  | M5 `cli:` / `shell-argv:` / `fence:` passes first segments | 4 / 5 / 4 — that form's nested side effect, created-path, removed-pass and removed-mismatch tests (shell-argv also its obs #176 control). `shell:` never used first segments |
  | M6 grammar drops the `..` segment check | 4 — BUG-11, BUG-13 and both grammar tests |
- Fast gate (`npm run ci:fast`, with `.agents/skills` moved aside by the scratchpad `quality-gate.sh`, restored by trap): GATE_EXIT=0, 6335 tests, 0 failures.
- Loop audit iteration 1: status `ready-for-review`, 18/18 plan checkboxes, head `0b714103` → loop exit. Summary: `.summaries/step-3-iteration-audit-1.json`.

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
**Branch**: feature/task.232.probe-expected-path-assertions
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}

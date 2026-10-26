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
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #748: https://github.com/Gamaroff/agent-skills/pull/748 — commits `aecd54d7` (feat) + `8ac12588` (docs); leak check OK; 0 held; in-review comment posted to #747 | —                    | 2026-10-25T19:14Z |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.{id}.qa.{N}.*.md`; `task.{id}.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | 3 cycles: FAIL (30) → CONCERNS (80) → PASS (100). Fixes `07227d87`, `dda2cbd2`; gate 3 + report `b0e8864a`. 7 bugs filed and closed. `isCasePath` probed: 11 executed, 0 escaped. 5c `/review-pr` APPROVE (0 findings), posted to #748 | `.summaries/step-5-post-fix-tracker-2.json` | 2026-10-25T20:20Z |
| 7. finalise                | ✅ Done    | `task.{id}.dod.{N}.*.md`; task `status: accepted`                      | Inline (repo `skills/finalise/SKILL.md`). DoD ACCEPTED: 4 agents PASS/N-A; `isCasePath` probed 31/0 reproduced; CI 1 SUCCESS @ `b0e8864a`, CI 2 SUCCESS (tree-equivalent) @ `317f1393`. Acceptance commit `317f1393`; registry ticked; DoD + canonical comments on #748; #747 closed; board already Done | — | 2026-10-25T20:30Z |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | Implementation report committed and pushed (scope: task directory) | —                    | 2026-10-25T20:32Z |

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
- Full gate (`npm run ci`, `.agents/skills` moved aside): GATE_EXIT=0, 6335 tests, 0 failures, 128 skills validated.

### Step 4 — 2026-10-25

- SCOPE_PATHS: `docs/tasks/task.232.probe-expected-path-assertions`, `CHANGELOG.md`, `shared/resources`, `shared/resources/tests`, `skills/finalise/references`, `skills/qa-story/references`, `skills/qa-task/references`, `skills/review-security/references`.
- Pre-flight guard: 0 out-of-scope untracked files held. Report links: 0 relative links, ok.
- The Skill tool resolved `create-pr` to a user-level copy that has no `--scope` flag; the repository's `skills/create-pr/SKILL.md` was followed instead (scope staging, summariser body, `github-body-text.js`, `tracker-comment.js`).
- Two commits: `aecd54d7` feat(security-probe) (engine, tests, fixtures, docs, bundled copies, CHANGELOG) and `8ac12588` docs(task.232) (task document, this report). Leak check: OK.
- PR created: https://github.com/Gamaroff/agent-skills/pull/748 (base develop, `Closes #747`).
- Post-PR state check: PR #748 state = OPEN (MERGEABLE). errors = 0.
- GitHub board: in-review → stage-disabled (the workflow file declares no `in-review` moment).

### Steps 5–6 — 2026-10-25

- The Skill tool no longer resolves project skills: `/qa-task` returned "Unknown skill", probably after the gate moved `.agents/skills` aside. The repository's `skills/qa-task/SKILL.md`, `skills/qa-fix/SKILL.md` and the loop doc are followed inline.
- QA Cycle 1 — changes-requested: stage-disabled.
- QA Cycle 1 — the post-fix PR state poll ran inline (`gh pr view`, no subagent): OPEN, MERGEABLE, head `07227d87`. Summary: `.summaries/step-5-post-fix-tracker-1.json`.
- QA Cycle 1 — the fix summary was posted to PR #748 and to issue #747 (`qa-fix-1`, posted).
- QA Cycle 2 — the refute reviewer (Explore) returned 4 findings, all anchors ok. QA reproduced CR-1 and CR-2 on head and base (both pre-existing), and entered CR-1 as QA2-1 because cycle 1 had documented the opposite. The QA mutation Q5 survivor became QA2-2. CR-2 (a detached grandchild), CR-3 and CR-4 are advisory follow-ups.
- QA Cycle 2 — `isCasePath` was probed with `--sink path`: 11 executed, 0 escaped. `encoded-traversal` and `symlink-escape` are accepted at the lexical layer and contained downstream, verified through `compareExpected`.
- QA Cycle 2 — changes-requested: stage-disabled. Post-fix PR state: OPEN, head `dda2cbd2` (inline `gh pr view`). The fix summary was posted to PR #748 and issue #747 (`qa-fix-2`, posted).
- QA Cycle 3 — the scoped reviewer (files since gate 2) returned 4 low findings, all advisory. Gate 3 PASS (100). Bugs 6 and 7 are closed. The gate and report were committed and pushed in `b0e8864a` (path 1).
- 5c — `/review-pr` does not resolve through the Skill tool, so `skills/review-pr/SKILL.md` was followed inline. Only the conformance lens ran (`--no-code`): 0 findings, verdict APPROVE. The report `task.232.pr-review.1.probe-expected-path-assertions.md` was posted to PR #748 (marker comment) and is staged for the acceptance commit; the carry-eligible list is empty. ready-for-merge: stage-disabled.

### Step 7 — 2026-10-25

- `/finalise` resolved, through the Skill tool, to the user-level synced copy, not this repo's. `skills/finalise/SKILL.md` was followed inline instead.
- DoD summary: `docs/tasks/task.232.probe-expected-path-assertions/task.232.dod.1.probe-expected-path-assertions.md`. All four agents PASS (compliance NOT_APPLICABLE). The `isCasePath` boundary was probed by `/finalise`: 31 executed, 0 reproduced, 0 escapes (`task.232.dod.1.security.run.json`). `reviewDecision` is null (no reviews required), so the 5c APPROVE satisfies the column (obs #253).
- CI reading 1: SUCCESS @ `b0e8864a59fb` (6 checks); CI reading 2: SUCCESS (tree-equivalent to `b0e8864a59fb`) @ `317f1393169c` over 6 checks after 30s. The acceptance commit is docs-only.
- Acceptance commit `317f1393` (`docs(task.232): accept — DoD, sprint review; registry ticked; 5c review carried`), pushed. It carries the PR review report and the probe record. Registry row 232 ticked `planned` → `accepted`. 6d: the CHANGELOG cites task 232.
- DoD body posted to PR — comment URL: https://github.com/Gamaroff/agent-skills/pull/748#issuecomment-6402826448. Canonical summary: https://github.com/Gamaroff/agent-skills/pull/748#issuecomment-6402815754.
- GitHub Issue #747 — Document link already on `develop`; `done` comment posted; close: CLOSED ✅ (state re-read).
- GitHub Issue #747 — board: done → already.
- Tracker-actions journal empty (`access.tracker: full`): no tracker debt.
- Task completed.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Step 7 — wrong timestamp in the DoD summary.** `task.232.dod.1.probe-expected-path-assertions.md` (committed in `317f1393`) gives `**Completion Time:** 2026-10-25T20:36Z` and `~14 minutes`. That time was written before the clock was read. The verdict was reached at about 20:28Z (verification started 20:22Z), which makes the duration about 6 minutes. The acceptance artefact was left as committed; this entry is the correction.
- **Skill resolution.** The Skill tool resolved neither `qa-task` nor `review-pr` ("Unknown skill"), and it resolved `finalise` to a user-level synced copy, not this repo's. Each was followed inline from `skills/<name>/SKILL.md`.

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-10-25
**Gate Result**: FAIL
**Issues Found**: 5 — QA1-1 the PR shellcheck check is red (`path-actions-lib.sh` has no shell directive); QA1-2 the grammar accepts `./` and `a/../`; QA1-3 a trailing slash skips the collision decline; QA1-4 lstat ELOOP/EACCES crash the probe; QA1-5 `isCasePath` is unprobeable (probes_executed 0)
**HIGH findings**: 2
**MEDIUM findings**: 3
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)
**Fixes Applied**: QA1-1 `# shellcheck shell=bash` on the fixture. QA1-2/QA1-3 have one cause: `normalize` keeps a trailing separator and `resolve` does not. A new exported `caseKey` (normalize, trailing separators dropped) is now the one key for `isCasePath` and `pathAssertionProblem`. QA1-4 `casePathState` returns `{ state }`, and any other lstat failure is an `unreadable` mismatch, `<path> could not be read (<code>)`. QA1-5 `isCasePath` is exported. The tests cover the refused spellings, a strict-inside check on the base-differential flips, trailing-slash collision rows on all five forms, and ELOOP/EACCES. Red-first: 10 tests fail on the pre-fix engine. Full `npm run ci` with the symlink aside: 6337 tests, 0 failed. lint-shell ran with the files staged.
**Commit**: `07227d87`

### QA Cycle 2 — 2026-10-25
**Gate Result**: CONCERNS (80/100)
**Issues Found**: 2. QA2-1: a run that leaves a mode-000 directory crashes the sandbox teardown, contradicting cycle 1's "never a probe crash" (pre-existing crash, new claim). QA2-2: the fence scorer's unreadable-is-a-side-effect rule has no test (mutation Q5 survives). Cycle 1's QA1-1..5 are verified fixed and bugs 1–5 closed. `isCasePath` was probed: 11 executed, 0 escaped. Advisory: CR-2, a detached grandchild writing after the check (pre-existing), plus CR-3 and CR-4 (low).
**HIGH findings**: 0
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)
**Fixes Applied**: QA2-1: `removeSandbox` replaces the plain `rmSync` in `runProbeSpec`'s `finally`. On EACCES/EPERM it gives every directory owner rwx (an lstat walk) and retries. QA2-2: test only, a fence case plants `loop -> loop` and stops. Mutation-proved: restoring `rmSync` reds the runner test (F1), and Q5 reds the fence test (F2). Full `npm run ci` with the symlink aside: 6339 tests, 0 failed. CR-2, CR-3 and CR-4 were left advisory per gate 2.
**Commit**: `dda2cbd2`

### QA Cycle 3 — 2026-10-25
**Gate Result**: PASS (100/100)
**Issues Found**: 0 in `top_issues`. QA2-1 and QA2-2 are verified fixed, and bugs 6 and 7 are closed. The scoped review (files since gate 2, head `07227d87`) found 4 low, advisory findings: permission-walk depth, a chmod-through-swap race, and two test hardenings. `isCasePath` was re-probed: 11 executed, 0 escaped.
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: APPROVE — `task.232.pr-review.1.probe-expected-path-assertions.md` (conformance lens, `--effort medium --no-code`; 0 findings)
**Loop exit**: n/a — this exit not taken
**Action**: Proceeding to 5c (PR conformance review)

---

## Completion

**Finished**: 2026-10-25T20:32Z
**Final Status**: Completed
**Branch**: feature/task.232.probe-expected-path-assertions
**PR**: https://github.com/Gamaroff/agent-skills/pull/748
**QA Iterations**: 3 (FAIL 30 → CONCERNS 80 → PASS 100)
**DoD Summary**: docs/tasks/task.232.probe-expected-path-assertions/task.232.dod.1.probe-expected-path-assertions.md
**Tracker debt**: none

**Completion Summary**: Implemented nested-path `expected.absent` and a new `expected.removed` in the security-probe engine. One helper, `pathAssertionProblem`, serves all five runner forms, and the exported `isCasePath`/`caseKey` grammar is the one key every comparison uses. Reads are contained by realpath and `lstat`, an unreadable path is a mismatch, and the sandbox teardown survives a mode-000 directory. QA took 3 cycles (FAIL 30 → CONCERNS 80 → PASS 100) and filed 7 bugs, all closed. Notable decisions: `removed` is matched exactly, not case-folded. The four low cycle-3 findings and gate 2's pre-existing process-group reap were left as advisory follow-ups. The 5c review APPROVEd, and `/finalise` probed the boundary (31 executed, 0 reproduced) and accepted on CI SUCCESS.

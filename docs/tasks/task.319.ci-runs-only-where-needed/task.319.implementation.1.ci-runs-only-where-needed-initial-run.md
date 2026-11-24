# Implementation Report: Pipelines spend a CI run only where a run can answer something

**Task**: `task.319.ci-runs-only-where-needed.md`
**Run Number**: 1
**Started**: 2026-11-24 09:43
**Status**: Escalated
**Report format**: 2

---

## Summary

Push record-only commits with the next push that needs CI, add an opt-in skip marker, stop two finalise halts that are not defects, and close two Bitbucket gaps.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | docs/task-319-ci-runs-only-where-needed                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | medium                                                                     |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | N/A (not yet signalled)                                                    |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.319.*` exists in git                              | Branch created at `cc8b7afca` | —                    | 2026-11-24T09:44Z |
| 2. review-task             | ⏭️ Skipped | `task.319.review.{N}.{name}.md` exists (or skip logged)                | Ready for Development + `review.2` exists | —                    | 2026-11-24T09:44Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 7 of 7 phases; `ci:fast` and `eval:all` green on `f87488f55` | —                    | 2026-11-24T10:51Z |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #937: https://github.com/Gamaroff/agent-skills/pull/937 | —                    | 2026-11-24T10:52Z |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.319.qa.{N}.*.md`; `task.319.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | `.summaries/step-5-post-fix-tracker-4.json` |                 |
| 7. finalise                | ⏳ Pending | `task.319.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-24

- Feature branch base: docs/task-319-ci-runs-only-where-needed — source: asked (the task document exists only there; develop + 3 docs commits)
- PR target branch: develop — source: asked
- Mode: standard — source: detector (risk medium, 7 phases, several modules: lite not eligible). Detector inputs read in-line by the orchestrator (Agent 3 not dispatched).
- qa-planning gate: skipped (auto — no prompt)
- Upfront questions asked: 2 (Q1, Q2)
- Input `319` resolved as task.319 (a bare number is a task id first).
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Reviews 1 and 2 committed on the docs branch (`cc8b7afca`) before the feature branch was cut.
- Branch `feature/task.319.ci-runs-only-where-needed` cut in-line at `cc8b7afca` (no push: Step 4 pushes it).
- Tracker: pipeline-start comment on #936 `posted`; board work-started: Todo → In Progress (verified).
- Step 2 skipped: status `Ready for Development` and review report 2 exists (gate table row 3, develop-task).
- Plan file found: docs/tasks/task.319.ci-runs-only-where-needed/task.319.plan.ci-runs-only-where-needed.md — included as implementation context for /develop.
- Pre-develop surface map: 14 files identified in shared/resources (ci-tree-equivalence.js, develop-pipeline-on-precompact.sh, develop-pipeline-{pause,hooks,step-5-6-qa-loop,step-7-finalise,step-8-commit}.md, finalise-ci-poll.sh, security-probe.mjs, probe-boundary-rule.md, finalise-dod-ac-prompt.md), skills/{develop-task,develop-story,develop-bug,develop-next,develop-batch,finalise}, package.json, docs/reference/configuration.md. Done in-line by the orchestrator (no Explore subagent): independent review did not run.
- Fast gate precondition: `develop.fastGateCommand` = `npm run ci:fast`, defined.
- Step 3 inline — /develop not invoked: the plan names every part and the surface map is recorded.
- Simulated-run definition (criterion 2): cycles 1–2 are code fixes (`qa-cycle`, push), cycles 3–4 are record-only fixes (`qa-cycle`, defer), cycle 5 is the record-only gate that reaches 5c (`qa-pre-5c`, a remote reader, push). Three pushes: two code, one at the loop's end. 5c reads the remote, so the loop's end push is the pre-5c push; the acceptance and Step 8 pushes follow it and are counted separately.

### Step 3: develop — decisions

- Phase 0's reader table is the plan's appendix; `push-policy.sh` carries the same rows as its input.
- Push counts (`command node --test shared/resources/tests/push-policy.test.mjs`): `pushes before (eager): 9; after (batched): 6` for the modelled sequence (develop, two code cycles, three pauses, pre-5c, accept, step 8). The three removed pushes are the three pauses. The motivation's nine record-only pushes do not all go: each remaining one has a remote reader or ends the run.
- Deviation from the plan, `eslint:` entry: the plan wrote each fixture to a temporary file in the repository. The entry instead names an existing file (`eslint:<path>#<rule-id>`) and ESLint's `lintText` lints the input AS that file. Same configuration, type-aware rules keep their project, nothing is written to the repository. Also run by hand against real ESLint 9.39.1 (flat) and 8.57.1 (flat and eslintrc): `no-eval` reported, a disable directive accepted, an `off` rule `absent`, an unnamed rule declined.
- `finalise.rerunAtHead` matches a whole code span equal to a list entry, and reads the list and the code at `HEAD`; a criterion's text is never run. The DoD run number names its out directory (`.claude/state/finalise-rerun-at-head-<N>/`), not the DoD's folder: raw output is not a committed artefact, its block in the DoD is.
- `test-runner-reach`: no `package.json` edit is needed; every new test matches `shared/resources/tests/*.test.mjs`.
- Residual: under `batched` a held pause commit makes `qa-ci-read.sh` answer `HEAD_MISMATCH` at 5a (advisory), and `CI_HEAD_1` in `/finalise` Step 6 can be ahead of the sampled PR head by record-only commits. Both documented in the configuration reference or the table.
- `tick-pr.sh`: a PR with no checks merges on the quality gate alone, after the full wait.
- Mutations, each red as required: push-policy (always push: 3 red; batched pause pushes; unreadable pause pushes; step8 not an end: 3; pre-5c weakened: 3; mark without tree-equivalence; mark over a code head; mark over unpushed code; mark of a pushed head; compare with the configured upstream: 7; the scan with the step8 guard removed); hook ignoring the policy (batched step 2 and 5 red); poll (old poll 5/5 red; destination filter dropped 2 red); tick-pr (gate, CI and head checks dropped, each red); rerun (substring, prefix, dirty check off, working-tree configuration, stale record kept, unbounded command, cached output); eslint (any rule counts, always rejected, rule presence, ignored, parse error, package above root, child cwd, rule id), and the re-judge reason.
- Remote run 1 (on `fe2a844e2`): red with four failures, all from this branch and fixed: two defaults tests that did not expect `skipMarker`, a wait-marking parity test on develop-next's new block, and a source scan that reads `@{upstream}` in a comment.
- Remote run 2 (on `0d5b5f71a`): one failure, from this branch and fixed: `review-task` check 4 did not name the new re-run criterion kind.
- Remote run 3 (on `f87488f55`, `CI=true`): `npm run ci:fast` green, 8806 passed, 0 failed, 3 skipped. `validate:all`, `check:generated`, `lint:shell`, `lint:secrets` and `bundle:check` green locally.
- `rerunAtHead` dirty check: `.claude/state/` is left out, because a consumer need not ignore it. The first version of that test was green without the fix and its commit message said otherwise; the test was corrected, proven red with the filter removed, and the commit amended before any push.
- Remote `eval:all` (on `f87488f55` plus this report's edits): green.
- Development completion comment `posted` to GitHub issue #936.
- Step 4: everything but this report was committed before the step, so its commit carries the report alone and the scope is the work-item directory. The PR body was written in-line from the CHANGELOG entries (summariser not dispatched).
- PR created: https://github.com/Gamaroff/agent-skills/pull/937 (base `develop`). Scope: the work-item directory. Post-PR state (read in-line): OPEN, MERGEABLE, head `a8528bbe9`. `in-review` comment `posted`; GitHub board: `stage-disabled` (no column for the moment).
- GitHub board: QA-start re-assert → stage-disabled. Traceability mapper skipped: no Success Criteria table.
- QA Cycle 1: two reviewers over the diff halves plus a boundary probe; gate 1 posted to PR #937 and issue #936.
- QA Cycle 2: gate 2 CONCERNS (80), full-diff refute pass; qa-fix was followed in-line from the loaded copy, and the findings ingester was not dispatched. Behaviour decided here: an unknown key inside `finalise`, a `finalize` block that carries the list and a top-level `rerunAtHead` are usage errors; `pr-read.sh` got the same 30-second limit as the poll, which reads through it.
- QA Cycle 2: the first green gate ran before the time-limit tests were written. The commit had claimed every fix had a red test, which was false for CR-311; the tests were added, the claim corrected in the message and the Change Log, the unpushed commit amended twice, and the gate run again on the final commit. A second run in between was stopped because it covered a tree still holding the false row.
- Loop audit (inline, not dispatched): 16 of 16 checkboxes in § 6, status `Ready for Review`.
- QA Cycle 3: gate 3 FAIL (70) over the files changed since gate 2; gate posted to PR #937 and issue #936. Convergence check: HIGH 2, 0, 3, not tripped. Route: `continue (not-a-pass-gate)`. Narrowing residue: not signalled (high-findings-remain). Third-strike files: none (gate 2 has no HIGH).
- QA Cycle 3, struck mechanism named early: the re-run engine asked git's index and status whether the working tree is the head (CR-2, CR-204, then CR-401 to CR-403). Move: replace. The tree is read from the head and the working tree is hashed against it.
- QA Cycle 3, qa-fix decisions: a sparse checkout that leaves code out is refused; a descendant outside the command's process group is a stated limit; the five held-commit pushes became `push-held.sh`, and the entry block's `resume` arm was deleted because a resume runs `/finalise` whole. At a HALT the push is bounded at 60 s, so a slower pre-push hook leaves the commits local and the HALT says so.
- QA Cycle 4: Loop route: continue (not-a-pass-gate), route 2 declined: high-findings-remain (HIGH 2, 0, 3, 0). Narrowing residue: not signalled (high-findings-remain). CI on ff8e2ab33c60: green (6 checks).
- QA Cycle 4, qa-fix decisions: the six HALT pushes were deleted and the terminal HALT block's `push-held.sh` is the one push of a HALT, so a HALT's head is no longer marked with `ci.skipMarker`; a command's output goes to an unnamed file again (a pipe loses what a program leaves in it), a random mark at its start detects a command that writes over it, and a process that outlives the command keeps disk space until it ends, a stated limit; CRLF is handled in the shared criteria reader, since the engine alone would leave the next step halting; the records that wait for the acceptance commit are let through by name; a listed command on an unindented criterion line is refused.
- QA Cycle 5: gate 5 CONCERNS (80) over the files changed since gate 4; gate posted to PR #937 and issue #936 (`posted`). Two read-only reviewers (329 s and 529 s); every gate finding reproduced with a control. Convergence check: HIGH 2, 0, 3, 0, 0, not tripped. Loop route: continue (not-a-pass-gate) — the gate reads CONCERNS — route 2b is PASS-only; a CONCERNS token is a reservation 5c must see raised, not carried (and route 2 declined: product-defect-signal). Narrowing residue: not signalled (medium-files-differ). CI on 8bf94fef4c35: green. Budget test: N = 5 = limit, so Loop Escalation, loop limit.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- The pipeline's Stop and PreCompact hooks are not registered in `.claude/settings.json` in this checkout; step transitions rely on the orchestrator.

### QA Loop Limit Reached — 2026-11-24

The pipeline ran 5 qa-task gates and 4 qa-fix cycles without a clean PASS; the last gate's findings are unfixed.

**Final gate status**: CONCERNS (80/100)
**HIGH findings per cycle**: 2, 0, 3, 0, 0
**Remaining issues** (from final gate file):
- CR-801 (medium, `shared/resources/finalise-rerun-at-head.js`): an untracked file that differs only by case is not seen under `core.ignorecase`
- CR-802 (medium, `shared/resources/finalise-rerun-at-head.js`): output that is whole can be recorded as overwritten, and then cannot pass a criterion
- CR-901 (medium, `shared/resources/push-held.sh`): the time limit kills `git push` and not its hook, which can run twice
- CR-902 (medium, `shared/resources/tick-pr.sh`): a squashed tick reads as not landed when an adjacent row changed since
- CR-803, CR-804, CR-805 (low, `shared/resources/finalise-rerun-at-head.js`): block starts too wide; the list read through replacement refs; a section with no readable criterion halts
- CR-904, CR-905, CR-906 (low, `shared/resources/push-held.sh`): no scratch file reads as a deleted branch; a remote ahead gets two answers; a timed-out push is stated as not pushed

**What was attempted per cycle**:
- Cycle 1: all 17 gate findings and 11 advisory ones
- Cycle 2: all 19 gate findings and 3 advisory ones
- Cycle 3: all 19 gate findings, 2 advisory ones and 3 cleanups; the clean-tree check was replaced, and the held-commit pushes became one script
- Cycle 4: all 12 gate findings; the six HALT pushes were deleted
- Cycle 5: gate only; the budget of fixes was spent

**Likely root cause**: every fix held at its next gate, but the re-run engine and the two push scripts are new in this task and each was rewritten in a fix cycle, so each gate read new code. The findings are now edge cases of those three files.

**Third-strike files**: none (no file is HIGH in gates 3, 4 and 5)

**Recommended next steps**:
1. Resume with one or two more cycles and fix the four medium findings; each has a small stated fix
2. Or accept the residual and card the ten findings as a follow-up task
3. CR-902 and CR-901 matter only with `tickVia: pr` and with a slow pre-push hook

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-11-24
**Gate Result**: FAIL
**Issues Found**: 17 — 2 high (rerunAtHead list dropped, skip marker on the base branch), 11 medium, 4 low
**HIGH findings**: 2
**MEDIUM findings**: 11
**Traceability**: skipped (no Success Criteria table)
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)

#### qa-fix (5b)

**Fast gate**: attempt 1 red (one failure, this branch: the relationship-assertion lint on a new test); attempt 2 green, 8835 tests, 0 failed, 3 skipped
**Evals**: `eval:all` green on `f54e31cb4` (LAN server)
**Fixes Applied**: all 17 gate findings and the 11 advisory ones; each new test red with its fix removed
**Commit**: `f54e31cb4`, pushed (`qa-cycle`: push, code among the unpushed commits)
**Comments**: fix summary on PR #937; tracker comment `qa-fix-1` posted on #936
**Post-fix PR state**: OPEN, MERGEABLE (read in-line, poller not dispatched)

### QA Cycle 2 — 2026-11-24
**Gate Result**: CONCERNS
**Issues Found**: 19 — 12 medium, 7 low (full-diff refute pass); cycle 1's two high findings closed
**HIGH findings**: 0
**MEDIUM findings**: 12
**Traceability**: skipped (no Success Criteria table)
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)

#### qa-fix (5b)

**Fast gate**: green on `1d6aa8ef2`, 8855 tests, 0 failed, 3 skipped. An earlier run was green too, before the time-limit tests existed; one run between was stopped, not red
**Evals**: `eval:all` green on the LAN server, before the last edits (two test files, the commit message, one Change Log row); not run again
**Fixes Applied**: all 19 gate findings and the 3 advisory ones. Each code and command-block fix has a test that is red without it; three agent-instruction rules (CR-202, CR-209's grading, CR-310) are held by assertions on their wording
**Commit**: `1d6aa8ef2`, pushed (`qa-cycle`: push, code among the unpushed commits)
**Comments**: fix summary on PR #937; tracker comment `qa-fix-2` posted on #936
**Post-fix PR state**: OPEN, MERGEABLE; CI 5 checks passed, 1 in progress at 13:41Z (read in-line, poller not dispatched)

### QA Cycle 3 — 2026-11-24
**Gate Result**: FAIL
**Issues Found**: 19 — 3 high (the re-run engine answers over a tree that is not the head, bug 3), 9 medium, 7 low
**HIGH findings**: 3
**MEDIUM findings**: 9
**Traceability**: skipped (no Success Criteria table)
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 3 of 5)

#### qa-fix (5b)

**Fast gate**: green on the tree committed as `ff8e2ab33`, 8869 tests, 0 failed, 3 skipped. The first attempt was red on one lint: two wall-clock assertions in new tests, replaced
**Evals**: `eval:all` green on the LAN server on the same tree
**Fixes Applied**: all 19 gate findings, the 2 advisory ones and the 3 cleanups. Each has a test that is red without it; three are held by reading source (the `--mark` sites, the Bitbucket requests, one sentence of develop-next), and removing the stream teardown hangs its test instead of failing an assertion
**Commit**: `ff8e2ab33`, pushed (`qa-cycle`: push, code among the unpushed commits)
**Comments**: fix summary on PR #937; tracker comment `qa-fix-3` on #936
**Post-fix PR state**: OPEN, MERGEABLE; CI 1 check passed, 5 in progress at 15:31Z (read in-line, poller not dispatched)

### QA Cycle 4 — 2026-11-24
**Gate Result**: CONCERNS
**Issues Found**: 12 — 7 medium, 5 low; bug 3 closed
**HIGH findings**: 0
**MEDIUM findings**: 7
**Traceability**: skipped (no Success Criteria table)
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 4 of 5)

#### qa-fix (5b)

**Fast gate**: green on the tree committed as `8bf94fef4` less one Change Log row, 8879 tests, 8876 passed, 0 failed, 3 skipped. The first attempt was red on one test that pins a sentence of the AC prompt this cycle rewords; the test follows it
**Evals**: `eval:all` green on the LAN server on the same tree
**Pre-gate review**: one read-only reviewer over this cycle's diff; 8 points, 5 fixed (its one high: a file capture can be truncated by the command, now detected), 3 low or partial remainders left as stated limits
**Fixes Applied**: all 12 gate findings. Every code fix was reverted and turned a test red; the step-document wording (703, 704) and one line of develop-next (701) are held by reading source
**Commit**: `8bf94fef4`, pushed (`qa-cycle`: push, code among the unpushed commits)
**Comments**: fix summary on PR #937; tracker comment `qa-fix-4` on #936
**Post-fix PR state**: OPEN, MERGEABLE; CI 5 checks passed, 1 in progress at 17:07Z (read in-line, poller not dispatched)

### QA Cycle 5 — 2026-11-24
**Gate Result**: CONCERNS
**Issues Found**: 10 — 4 medium, 6 low; all 12 of cycle 4 fixed; CR-903 advisory
**HIGH findings**: 0
**MEDIUM findings**: 4
**Traceability**: skipped (no Success Criteria table)
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Escalating — loop limit reached

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: feature/task.319.ci-runs-only-where-needed
**PR**: https://github.com/Gamaroff/agent-skills/pull/937
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}

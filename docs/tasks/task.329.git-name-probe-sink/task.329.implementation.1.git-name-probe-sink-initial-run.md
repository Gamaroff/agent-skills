# Implementation Report: A git-name sink for classifiers of repository names

**Task**: `task.329.git-name-probe-sink.md`
**Run Number**: 1
**Started**: 2026-11-26 13:36
**Status**: In Progress
**Report format**: 2

---

## Summary

Add a `git-name` corpus sink and route name classifiers (`isDocsPath`) to it, so task 325's finalise probe tests what the function promises.

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
| Board status        | In Progress ✅ (gh-stage: transitioned)                                     |
| Tracker Issue       | #955 (GitHub)                                                              |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.329.*` exists in git                              | Branch created at `ad2b2fde1`; pushed | —                    | 2026-11-26T13:38Z |
| 2. review-task             | ✅ Done    | `task.329.review.{N}.{name}.md` exists (or skip logged)                | review.1: READY TO IMPLEMENT 8/10; 2 Important fixed; Planned → Ready for Development | —                    | 2026-11-26T13:40Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline, 1 iteration; 3 phases; 4 tests; gate 8898/1 (load flake, passes alone) | —                    | 2026-11-26T14:20Z |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.329.qa.{N}.*.md`; `task.329.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.329.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-26

- Feature branch base: develop — source: flag
- PR target branch: develop — source: flag
- Mode: standard — source: flag (detector also standard: 3 phases)
- Skips: none
- qa-planning gate: skipped (auto — no prompt)
- Questions asked: 0 (`--defaults`, all answered by flags)
- Phase 0 ran inline (no Explore fan-out); lite-mode inputs derived from the document: risk_level low, 3 phases, single module → standard
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Task status Planned — Step 2 review promotes it
- Context: cut in this session from task 325's DoD run 1 gaps; task 325's lock is parked at `.claude/state/parked-task.325/` while this run holds the lock. User approved auto-merge on green for this task.
- Branch: feature/task.329.git-name-probe-sink (from local develop at `ad2b2fde1`, which carries the unpushed task-filing commit; it rides this PR)
- Tracker comment work-started: posted. GitHub board: work-started → transitioned.

### Step 2 — review-task

- review-task output: Comprehensive report (pipeline default). Step 8.5 auto-answered: apply all critical + important fixes. Step 9 auto-answered: fixes complete.
- Review report: docs/tasks/task.329.git-name-probe-sink/task.329.review.1.git-name-probe-sink.md (reviewed_blob stamped)
- Planned promoted to Ready for Development by review-task
- Review outcome comment: review-task reported `posted` (stage review-task-1), so Step 2's own comment was skipped (one event, one writer)

### Step 3 — develop

- Plan file found: docs/tasks/task.329.git-name-probe-sink/task.329.plan.git-name-probe-sink.md — included as implementation context for /develop
- Pre-develop surface map: inline. `isDocsPath` (ci-tree-equivalence.js:167), corpus module and peer, three routing docs, two test files, all read during task authoring and review this session
- Step 3 inline — /develop not invoked: the plan names every hunk and the files were already mapped
- TDD: `FLOORS["git-name"]` and the `path`-pin test went in first. Two tests went red (no floor for a known sink; `corpusFor` throws), then green once the sink was added
- Deviation from plan: the `trailing-slash` input is `docs/guides/`, not `docs/`. `docs/` is already in `finalise-dod-security-prompt.md`, and `finalise-dod-prompt-contract.test.mjs` refuses a prompt that restates a whole corpus input. The new input still reproduces under the segment mutation
- Added a `␁` glyph for U+0001 to `renderInput`'s `CONTROL` map, so the generated table carries no raw control byte (the review's optional finding). The legend line in the `.md` names it
- Cross-branch check: task 325's branch moves the control, segment and normalise refusals into a `hasPathFormDefect` helper. The anchors now accept both spellings, and exactly one must occur exactly once. All three task.329 tests pass against 325's `ci-tree-equivalence.js`, swapped in and then restored (`git diff --quiet` afterwards). Calibration: a reworded control line turns the mutation test red, naming the anchor
- Fast gate run 1: red on `prettier --check` (2 files). Fixed with `prettier --write`
- Fast gate run 2: 8898 pass, 1 fail. The failure is `push-policy.test.mjs:1498` ("push-held says what is the remote's…"), which took 139 s under the full suite. Re-run alone, it passes in 26 s. The diff does not touch push-policy, so this is recorded as a load flake, and CI decides
- Status: Ready for Development → Ready for Review
- Mutation proof (in the test itself): at HEAD 22/22 cases hold. With each refusal line removed, exactly the listed hostile cases reproduce and nothing legitimate is refused. Every hostile id is reached by some mutation

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- Step 2: review pre-pass agents B and C did not run. The review was done inline, so there was no independent read of the document.
- Step 3: the cross-branch calibration edited the swapped-in `ci-tree-equivalence.js` with `node -e`, not the file-edit tool. The file was restored at once and verified with `git diff --quiet`.
- Step 3: one load-sensitive failure in fast gate run 2 (push-policy push-held, 139 s). It passed alone; see Decisions Log.

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: feature/task.329.git-name-probe-sink
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}

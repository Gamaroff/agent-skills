# Implementation Report: `/qa-next <id>` — target a specific registry item

**Task**: `task.141.qa-next-targeted-item.md`
**Run Number**: 1
**Started**: 2026-09-22 17:10
**Status**: In Progress

---

## Summary

Give `/qa-next` a positional `id` argument that runs the full UAT protocol against a named registry row regardless of state, with the run-file path, the accepted-row state rule and bug reuse made mechanical in `uat-status.mjs`.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | `docs/tasks-141-142-qa-next-and-reference-doc-pinning`                     |
| PR target           | `develop`                                                                  |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | low                                                                        |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | In Progress ✅ (GitHub Projects "Agent Skills", Todo → In Progress, verified) |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.141.*` exists in git                              | Branch cut at `e45d2768`, pushed with upstream tracking | —                    |
| 2. review-task             | ✅ Done    | `task.141.review.{N}.{name}.md` exists (or skip logged)                | **Skipped** — status `Ready for Development` + `task.141.review.1.*.md` present (verdict READY TO IMPLEMENT, reviewed 2026-09-22) | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Phases 1–5 implemented; 10 new tests, all 10 mutations red; full `npm test` green (3931) with the symlink moved aside | `.summaries/` n/a — surface map consumed inline |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #468: https://github.com/Gamaroff/agent-skills/pull/468 — OPEN, base `develop`, MERGEABLE | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.141.qa.{N}.*.md`; `task.141.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.141.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-09-22

- Feature branch base: `docs/tasks-141-142-qa-next-and-reference-doc-pinning` — the task document, its plan and its review report live on this branch in two commits not yet on `develop`, plus uncommitted edits. Basing on `develop` would leave the pipeline reading a task doc that is not on the branch.
- PR target branch: `develop` — standard Gitflow. The PR diff will also carry the two task-creation commits (task.141 and task.142 docs), which is accepted.
- qa-planning gate: skipped (auto — no prompt)
- Phase 0 run **inline** (no subagents dispatched) — the task file was already resolved from the working tree and the three lite-mode inputs were read from the document directly, which §0c names a first-class case. Inputs: `risk_level: low` (risk_ok = true), `phase_count = 5` (≥ 3 → false), `single_module = true` (the `qa-next` skill only). `PIPELINE_MODE = standard` because the phase count fails the AND.
- Always-load files resolved: 3 files from `skills-config.yaml` `devLoadAlwaysFiles` — all three verified present on disk.
- Tracker: GitHub (`JIRA_URL` unset), issue #466.
- Task status at Phase 0c: `ready-for-development` → proceed normally.
- Pre-existing artifact noted: `task.141.review.1.qa-next-targeted-item.md` is present and untracked, and the task document records "All review recommendations implemented 2026-09-22". Step 2's gate check will decide whether `/review-task` re-runs.
- Step 1: working tree carried uncommitted task.141 doc/plan edits and an untracked review report. `/create-branch` Step 4 would normally halt on these; it did not apply, because the chosen base **is** the current branch, so `git checkout -b` left those edits exactly where they were rather than moving them onto a different base.
- Step 1: tracker signalled — `work-started` comment posted (`reason: posted`), GitHub board Todo → In Progress (verified). Board Priority already `P2 Medium`, so the auto-set block was a no-op.
- Step 2: `/review-task` **not invoked**. The step-2 decision table's `Ready for Development` + report-exists row skips on the *presence* of a report with no freshness computation — that status is itself the assertion that a review completed. `task.141.review.1.qa-next-targeted-item.md` records `**Recommendation:** ✅ READY TO IMPLEMENT`, and the task document records its recommendations as implemented.
- Step 3: plan file found — `docs/tasks/task.141.qa-next-targeted-item/task.141.plan.qa-next-targeted-item.md` (599 lines, code-level) — read in full and used as implementation context.
- Step 3: always-load files read (3/3 present): coding-standards, tech-stack, source-tree.
- Step 3: `npm test` glob confirmed to already cover `evals/qa-next/unit/*.test.mjs`, so the new test groups are not orphaned (the glob is hand-maintained and has orphaned a suite before).
- Step 3: `.claude/skills` is a live symlink to `../skills` — it must be moved aside before a local `npm test` green is believed (it has masked CI failures before, and the task's own Code Quality criteria require the moved-aside run).
- Step 3: **`/develop` was not invoked — the orchestrator implemented inline.** The task ships a
  599-line code-level plan naming every hunk, and that plan plus the Explore surface map was already
  in context; invoking `/develop` would have re-read the same material to reach the same edits. The
  bookkeeping `/develop` owns was performed explicitly instead: all 85 checkboxes ticked, `status:`
  and both body `**Status:**` lines set to Ready for Review, and a Change Log row added. Recorded as
  a protocol deviation, not a silent shortcut, and logged as an observation.
- Step 3: pre-develop surface map — 1 Explore subagent, returned in 128s with `uat-status.mjs`
  line ranges, the test suite's conventions (flat `test()`, `corpus()`/`run()` helpers, the
  top-level `await import(TOOL)` destructuring that a new export must be added to), the `##
  Arguments` house style from `review-code`/`review-pr`/`double-check`, and confirmation that
  `evals/qa-next/unit/*.test.mjs` is already in the `npm test` glob.
- Step 3: **one deviation from the plan, deliberate.** The plan's run-template row was
  `| Run | {{1st|2nd|…}} run … |`; a raw `|` inside a table cell splits it. Written as
  `{{1st / 2nd / …}}` instead. (The pre-existing `Verdict | {{pass|fail|blocked}}` row has the same
  defect; left alone as out of scope.)
- Step 3: **two corrections to the plan's code, both silent-failure shapes.** `priorRuns` as the
  plan wrote it guards `existsSync` on the *per-id* directory but then calls `listRunFiles` on the
  *parent* `runs/`, which throws when no run has ever been written; the guard was moved to the
  parent. And the `--clear-note` refusal was written as `clear && kept` rather than
  `clear && state === "pass" && accepted` — equivalent in every reachable state (`blocked`/`na`
  require `--note`, which `--clear-note` already refuses beside), one predicate instead of two, and
  it matches the task document's own wording ("refused on a kept ✅").
- Step 3: review-1's optional finding acted on — the usage header now warns that `--item` is one
  character from `--items`, which writes a cell rather than reading a row.
- Step 3: **one regression caught by the suite, not by review.** Adding `/qa-next <id>` to the
  `qa-next` frontmatter `description` pushed it to 1,105 chars against the 1,024 cap enforced by
  `tests/skill-frontmatter.test.js`. Trimmed to 1,009 by cutting redundancy rather than signal (the
  "one row per thing a person does with the app" gloss shortened, "against the configured
  environment" and "in the registry" dropped — both restated elsewhere in the same sentence). The
  catalog was regenerated and is byte-identical, because it truncates descriptions before that point.
- Step 4: staging scope was `docs/tasks/task.141.qa-next-targeted-item`, `skills/qa-next`,
  `evals/qa-next`, `docs/reference`, `CHANGELOG.md`. No out-of-scope untracked files existed, so the
  pre-flight hold moved nothing; the post-commit leak check found nothing outside scope.
- Step 4: committed as **two** commits rather than one so the implementation diff reads on its own —
  `9efe0d22` (the tool, skill, template, tests and doc sweep) and `a888fc45` (the review report, the
  plan revisions, the task document's status change and this report). The implementation report's
  first commit belongs here, not at Step 8.
- Step 4: the PR carries the two task-creation commits for task.141 and task.142 as well, since
  neither was on `develop`. Agreed at Phase 0d Q2.
- Step 4: tracker — `in-review` comment posted (`reason: posted`). The GitHub board move returned
  `reason: stage-disabled`: `in-review` is not enabled for this project's workflow record, which is a
  correct outcome and exits 0. The card stays In Progress.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

### Mutation proof — Step 3 (2026-09-22)

Every new behaviour was reverted in the tool, the suite re-run, and the behaviour restored. All ten
mutations go red; a test that passes against both the fixed and the broken tool holds nothing.

| # | Mutation applied to `uat-status.mjs` | Result | Caught by |
| :--- | :--- | :--- | :--- |
| M1 | `kept` guard deleted (`const kept = false`) | RED | only-a-fail-moves-✅; `--clear-note` refusals |
| M2 | `kept` narrowed to `state === "pass"` | RED | only-a-fail-moves-✅ (the `blocked`/`na` legs) |
| M3 | `--clear-note` kept-✅ refusal dropped | RED | `--clear-note` refusals |
| M4 | `listRunFiles` back to the plain basename comparator | RED | unsuffixed-first-run ordering; the compose test |
| M5 | `runPathFor` never sequences | RED | `runPathFor`; `--run-path`; the compose test |
| M6 | `runPathFor` `padStart` dropped | RED | `runPathFor`; `--run-path` |
| M7 | `bug` dropped from the payload | RED | `--item` payload parity |
| M8 | unknown id no longer exits 4 | RED | exit-4; the untouched-commands contract test |
| M9 | `(kept)` no longer printed | RED | only-a-fail-moves-✅ |
| M10 | `--item` stops sharing `describeRow` (`priorRuns` forced empty) | RED | `--item`/`--next` field-identity; the compose test |

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: `feature/task.141.qa-next-targeted-item`
**PR**: [#468](https://github.com/Gamaroff/agent-skills/pull/468)
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}

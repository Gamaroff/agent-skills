# Implementation Report: Gating-rule restatements carry the reproduced-bug exception

**Task**: `task.288.gating-rule-restatements-carry-the-reproduced-bug-exception.md`
**Run Number**: 1
**Started**: 2026-11-23 15:12
**Status**: Completed
**Report format**: 2

---

## Summary

Reword T273-CR-5 and T273-CR-6, fix the other gating-rule restatements that omit the reproduced-bug (5d) exception, and add a guard test so a restatement cannot drop it again.

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
| Board status        | N/A (not yet signalled)                                                    |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.288.*` exists in git                              | Branch created at `ed74c9934` | —                    | 2026-11-23T15:13Z |
| 2. review-task             | ✅ Done    | `task.288.review.{N}.{name}.md` exists (or skip logged)                | READY TO IMPLEMENT 8/10; Planned promoted to Ready for Development | —                    | 2026-11-23T15:16Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline; commits `2ac507532`, `e97e58db8`; remote ci:fast 8744 pass / 0 fail | —                    | 2026-11-23T15:47Z |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #934 → develop; issue #862 commented | —                    | 2026-11-23T15:48Z |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.288.qa.{N}.*.md`; `task.288.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted | 3 QA cycles: FAIL 80, CONCERNS 90, PASS 95; 5c CONCERNS, no coverage finding | —                    | 2026-11-23T18:45Z |
| 7. finalise                | ✅ Done    | `task.288.dod.{N}.*.md`; task `status: accepted`                       | DoD 1 ACCEPTED, 8 of 8; acceptance commit `951dcce2d`; CI reading 1 SUCCESS @ `184e239f4`, reading 2 SUCCESS (tree-equivalent to `085c54e6a`) @ `951dcce2d`; issue #862 closed, board Done | —                    | 2026-11-23T18:48Z |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | Report committed last | —                    | 2026-11-23T18:50Z |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-23

- Feature branch base: develop — source: recommended (develop-next `--defaults`)
- PR target branch: develop — source: recommended (develop-next `--defaults`)
- Mode: standard — source: detector (task has 3 phases, so lite is not eligible)
- qa-planning gate: skipped (auto — no prompt)
- Upfront questions asked: 0 (resolver `questions[]` empty)
- Task status `planned`: proceeding; Step 2 (`/review-task`) validates and promotes.
- Implementation report stashed before branch creation, restored after.
- review-task output: Comprehensive report — required for pipeline audit trail. Step 8.5 auto-answered: Yes, apply all critical + important fixes. Step 9 auto-answered: Yes, fixes complete.
- Review report: `docs/tasks/task.288.gating-rule-restatements-carry-the-reproduced-bug-exception/task.288.review.1.gating-rule-restatements.md` (0 critical, 3 important, 3 optional; 3 important fixed in the document).
- Pre-pass Agents B and C not dispatched; both passes done in-line by the reviewer (independent review did not run).
- Planned promoted to Ready for Development by review-task.
- Pre-develop surface map: 9 files identified in skills/qa-task, skills/qa-story, skills/review-code, shared/resources (code-review-prompt.md, qa-runnable-prose-detection.md, pr-conformance-prompt.md, qa-docs-only-review-prompt.md), evals/shared/tests (shape: qa-loop-ends-on-a-gate.test.mjs, finding-anchors-callers.test.mjs), CHANGELOG.md; bundled copies under skills/*/references/ via `npm run bundle`. Done inline by the orchestrator (no Explore subagent): independent review did not run.
- Plan file found: docs/tasks/task.288.gating-rule-restatements-carry-the-reproduced-bug-exception/task.288.plan.gating-rule-restatements-carry-the-reproduced-bug-exception.md — included as implementation context for /develop.
- Step 3 inline — /develop not invoked: the plan names every hunk and the surface map is recorded.
- Phase 1: CR-5 reworded at `code-review-prompt.md:96`; CR-6 reworded at the four report-template lines (`qa-task:1633`, `:1953`; `qa-story:1867`, `:2495`).
- Phase 2 decisions (reword unless stated): `review-code/SKILL.md:319` reworded; `qa-runnable-prose-detection.md:683`, `qa-task/SKILL.md:1050-1051`, `pr-conformance-prompt.md:193` reworded with a pointer; `qa-task:51`, `qa-story:90` and `develop-pipeline-step-5-6-qa-loop.md` (2 sentences) reworded after the test found them (the task had not listed them); `qa-runnable-prose-detection.md:619` reworded (found by the test). Exempt in the test, each with a reason: the opening sentence and the `CR_BLOCKING=true` bullet of the "Opt-in to blocking" section; the docs-only lens (`qa-docs-only-review-prompt.md:59`, writes no gate); the two Gate-mapping sentences (the closing sentence of the step states the exception); the two report-summary count lines. 7 exemptions.
- **Design deviation from the task text:** the task said to scan prose outside fenced blocks. CR-5 and the four CR-6 lines are all inside fences (prompt and report templates), so a test that skipped every fence could not go red on mutations (a) and (b). The test reads prose and template fences (info string `markdown`, `md`, `text` or none) and skips code fences and tables. Also added: a keyed sentence may carry the exception in the sentence straight after it (`One exception covers this whole note: ...`), and `claim alone` is a carry marker for the qualified "will not gate on the reviewer claim alone". Measured: 29 keyed sentences; floor 24.
- Mutation proofs (each edited in place and edited back, none left): (a) CR-5 reverted to `(it will not gate)` → "every restatement ... carries the exception" red; (b) `qa-task:1633` reverted to "advisory unless the doc opted in via `code_review_blocking: true`" → "'advisory unless' names how blocking is resolved" red; (c) exception removed from `review-code/SKILL.md:319` → "every restatement ..." red. Green again after each revert (6 of 6).
- GitHub tracker: pipeline-start comment posted on #862; board work-started → Todo → In Progress (verified).

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- Step 2 review (review-task) misstated two sites (`qa-task:1050` has the phrase, wrapped over two lines; `pr-conformance-prompt.md:113` is not a "will not gate" site) and passed a test design that skips fences, which cannot see the lines it holds. All three found at develop and corrected in the task, plan and review report (Erratum section). Candidate observation: review-task should check that a proposed test's unit of scan reaches the lines its success criteria name.
- Second remote `ci:fast` run: 1 failure, `finding-anchors-callers` ("qa-runnable-prose-detection.md: a consumer of code-review findings reads anchor_check"). My added pointer named `code-review-prompt.md`, which put that shared file into the consumer population. Reworded the two pointers to "the code-review prompt" (no filename); third run green: 8744 pass, 0 fail, 3 skipped. Run on the LAN server via `npm run test:remote`, three times; logs `.claude/state/t288-remote*.log`.
- Step 3 loop audit done inline (no Explore subagent): every Implementation Plan checkbox ticked, status set to `ready-for-review`; independent review did not run.
- Performance (SC): new test median 0.40 s wall over five runs (0.386–0.459 s) at load average 4.1–6.1 (laptop; `uptime` taken before each run).
- First remote `ci:fast` run flagged `prettier --check` on the new test file; formatted with the project's prettier and re-run.

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1

**Gate**: FAIL (80/100) — `task.288.gate.1.gating-rule-restatements.yml`
**Findings**: T288-CR-1 (high, reproduced by QA): the four report-template lines were not keyed by the guard test.
**Traceability**: skipped (task QA; success criteria checked directly in the QA report)
**Action**: Running qa-fix
**Fix**: key D (`advisory unless`) added to the guard test, with a floor test; mutation-proved red. Commit `1d86a09c2`. Full gate: 8745 pass, 0 fail.

### QA Cycle 2

**Gate**: CONCERNS (90/100) — `task.288.gate.2.gating-rule-restatements.yml`
**Findings**: T288-C2-1 (medium): the docs-only prompt exemption reason was contradicted by that file. T288-C2-2 (medium, reproduced): the T273-CR-6 assertion checked zero sentences.
**Traceability**: skipped (task QA; success criteria checked directly in the QA report)
**Action**: Running qa-fix
**Fix**: prompt reworded and the false exemption deleted; T273-CR-6 now checks every `advisory unless` sentence with a floor of four; both mutation-proved red. Commit `144f2a1dd`. Full gate: 8745 pass, 0 fail.

### QA Cycle 3

**Gate**: PASS (95/100) — `task.288.gate.3.gating-rule-restatements.yml`
**Findings**: none open; two advisory cleanups (C3-1, C3-2) carried to `recommendations.future`.
**Traceability**: skipped (task QA; success criteria checked directly in the QA report)
**Action**: Proceeding to 5c
**PR Review**: CONCERNS — PC-1 (medium, `pr_number` absent) and PC-2 (low, Scope line understated the footprint); neither is a coverage finding, both documentation-only and fixed in the work item. Report: `task.288.pr-review.1.gating-rule-restatements.md`.

---

## Completion

**Finished**: 2026-11-23 18:50
**Final Status**: Completed
**Branch**: feature/task.288.gating-rule-restatements-carry-the-reproduced-bug-exception
**PR**: https://github.com/Gamaroff/agent-skills/pull/934
**QA Iterations**: 3 (FAIL 80, CONCERNS 90, PASS 95)
**DoD Summary**: `task.288.dod.1.gating-rule-restatements-carry-the-reproduced-bug-exception.md` — ACCEPTED, 8 of 8 criteria. The first AC pass failed #3, #4 and #8 for want of a committed record; the records were produced (two mutations re-run and red, five-run timing at load 0.98, carried 273 entries tabled) and committed in `184e239f4` before the second pass.
**CI readings**: reading 1 SUCCESS @ `184e239f490b` over 6 checks; reading 2 SUCCESS (tree-equivalent to `085c54e6ac2d`) @ `951dcce2d136` over 6 checks.
**Tracker debt**: none (comment posted, issue #862 closed, board already at Done)

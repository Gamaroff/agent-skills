# Implementation Report: The QA loop's guards read only the HIGH count and the lock cannot go backwards

**Task**: `task.123.qa-loop-exits-and-re-entry.md`
**Run Number**: 1
**Started**: 2026-09-18 23:36
**Status**: In Progress

---

## Summary

Add routes 2b (cosmetic residue) and 2c (gate the last fix) to the step-5-6 QA loop, extend `qa-diminishing-returns.js` into a route classifier, give the pipeline lock a `qa_phase` field (option B) read by the Stop hook, and write the re-entry rule for a pipeline re-invoked after its budget is spent.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | medium                                                                     |
| Pipeline mode       | standard (risk_level=medium → risk_ok=false; phase_count=3; single_module=false) |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Tracker Issue       | #423 (GitHub)                                                              |
| Board status        | In Progress ✅ (was Todo; work-started comment posted)                    |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.123.*` exists in git                             | Pre-existing branch `feature/task.123.qa-loop-exits-and-re-entry` at `08c60f98` (develop tip); adopted on resume | — |
| 2. review-task             | ✅ Done    | `task.123.review.{N}.{name}.md` exists (or skip logged)               | Pre-existing `task.123.review.1.qa-loop-exits-and-re-entry.md` (2026-09-18, 11/11 recommendations implemented); task status `ready-for-development`; adopted on resume | — |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 1 iteration; 18/18 phases; `ci:fast` 3488 pass / 0 fail + bash suites; `eval:all` 34 green; bundle:check / check:generated / validate:all / lint:shell exit 0; 8 mutants caught; status `ready-for-review`; 65 files in working tree (uncommitted — Step 4 commits) | `.summaries/step-3-iteration-audit-1.json` |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.123.qa.{N}.*.md`; `task.123.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.123.dod.{N}.*.md`; task `status: accepted`                      |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-09-18

- Phase 0 run inline (no subagents dispatched): resolver, tracker poll (`gh issue view 423` → OPEN, board Todo) and lite-mode inputs derived directly from the document. risk_level=medium (not in {low, absent}), phase_count=3, single_module=false → PIPELINE_MODE=standard.
- Prior run detected (branch + review report, no implementation report/lock/PR). User chose: **Resume from Step 3** — Steps 1–2 adopted from the pre-existing artifacts; review artifacts committed before Step 3.
- Questions asked (2 pipeline + 1 resume): Q1 feature branch base = develop (branch already cut from develop); Q2 PR target = develop (standard Gitflow).
- qa-planning gate: skipped (auto — no prompt)
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md (from skills-config.yaml devLoadAlwaysFiles)
- GitHub board: work-started → transitioned (Todo → In Progress, verified). Pipeline-start comment on #423: posted.

---

### Step 3 — Develop

- Pre-develop surface map: 25 files identified in shared/resources (step-5-6 doc, qa-diminishing-returns.js + tests/fixtures, on-stop.sh + test, advance-pipeline-lock.test.sh, resume-contract, detector prompt, hooks doc, lock-cooperation), skills/develop-{task,story}/SKILL.md, evals/shared/tests/pr-review-loop-parity.test.mjs, evals/develop-{task,story}/step-isolation, docs/runbooks/qa-flow.md. Summary: `.summaries/step-3-surface-map.json`. Four plan-vs-tree discrepancies noted: engine test lives under `shared/resources/tests/`; no story-side route fixture exists; no cross-file field-name contract test exists (create); the step-5-6 doc carries no `advance-pipeline-lock 6` / hand `jq` — the lock advance to 6 is the SKILL.md Step Transition Protocol, so Phase 1 must change the transition protocol, not the step doc.
- Plan file found: `task.123.plan.qa-loop-exits-and-re-entry.md` — included as implementation context for /develop.
- Initial loop audit (inline, deterministic checkbox count): 0/18 phases complete, HEAD `ccac5bef`. MAX_ITER=5.
- Fast gate precondition: `develop.fastGateCommand` unset → falls back to `npm run ci:fast`, which package.json defines. OK.
- Iteration 1 audit (inline count): 18/18 Implementation Plan phases ticked, status `ready-for-review`, HEAD unchanged (`ccac5bef` — /develop leaves the commit to Step 4). Progress: 0 → 18 ticks. Loop exits.
- Lock option B implemented as decided (review 1 Q2): `qa_phase` on the lock, hook `case 5)` reads it, advance `5 → 7`; helper untouched. Plan discrepancy handled: no step doc carried a hand `jq` — the rule is stated and pinned by `qa-loop-lock-fields-parity.test.mjs` instead.
- Engine property 2 kept: `countRaised` counts MEDIUM/LOW only; the engine suite's source check for HIGH-counting still passes. `readTopIssues` gained `id` for route 2b's carry-by-id.
- Route 2c's negative (last cycle reached 5c → no half-cycle) implemented as the plan decided; rationale recorded in the doc.
- Bundler vendored `shared/resources/tests/qa-loop-route.test.mjs` into two skills because the step doc cited it by full path; re-cited by bare filename (AGENTS.md sibling rule) and re-bundled. Observation #125 bumped (develop's `change-log.js` one-liner path is not bundled — fell back to `shared/resources/change-log.js`).
- Test log removed after a green gate (`TEST_EXIT=0`).
- Deferred to after Step 4: close observations #72, #77, #95, #100, #112 naming the PR (Migration success criterion).

### Step 4 — Create PR

- SCOPE_PATHS: `docs/tasks/task.123.qa-loop-exits-and-re-entry`, `CHANGELOG.md`, `docs/runbooks`, `evals/develop-story`, `evals/develop-task`, `evals/shared`, `shared/resources`, `skills/{commit-changes,create-branch,create-pr,develop,develop-bug,develop-story,develop-task,finalise,qa-fix,qa-story,qa-task,review-pr,review-story,review-task}` (bundled references). Pre-flight guard: 0 out-of-scope untracked files — nothing held.
- Invocation: `/create-pr --base develop --issue 423 --scope …` (GitHub tracker → `--issue` passed).

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
**Branch**: `feature/task.123.qa-loop-exits-and-re-entry`
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}

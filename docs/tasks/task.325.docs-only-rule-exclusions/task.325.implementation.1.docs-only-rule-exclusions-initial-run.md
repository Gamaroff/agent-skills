# Implementation Report: The docs-only CI rule can exclude a path

**Task**: `task.325.docs-only-rule-exclusions.md`
**Run Number**: 1
**Started**: 2026-11-26 10:23
**Status**: In Progress
**Report format**: 2

---

## Summary

Read a `ci.docsOnly.patterns` entry starting with `!` as an exclusion in `isDocsPath`, refuse a list with no inclusion, and document it.

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
| Tracker Issue       | #947 (GitHub)                                                              |
| Board status        | In Progress ✅ (gh-stage `transitioned`; Priority already P2 Medium)        |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.325.*` exists in git                             | Branch `feature/task.325.docs-only-rule-exclusions` created at `684b2db38`, pushed | —                    | 2026-11-26T10:24Z |
| 2. review-task             | ✅ Done | `task.325.review.{N}.{name}.md` exists (or skip logged)               | `task.325.review.1.docs-only-rule-exclusions.md` — READY TO IMPLEMENT 8/10; Planned → Ready for Development | —                    | 2026-11-26T10:41Z |
| 3. develop                 | ✅ Done | Task status == `Ready for Review`                                      | Inline; 1 iteration; `ci:fast` 8904/0 fail; commits `3cf1d0ca4`, `c0fa90645` | —                    | 2026-11-26T11:01Z |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.325.qa.{N}.*.md`; `task.325.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.325.dod.{N}.*.md`; task `status: accepted`                      |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-26

- Invoked by `/develop-next` (roadmap item T325) with `--defaults`; autonomous run.
- Feature branch base: develop — source: recommended (`--defaults`, on `develop`)
- PR target branch: develop — source: recommended (`--defaults`)
- Mode: standard — source: detector (computed inline, Agent 3 not dispatched: risk_level=low → risk_ok=true; phase_count=3 → not < 3; single_module=true → standard)
- Skips: none — source: none. Refused: none. Errors: none.
- AskUserQuestion: 0 questions (resolver answered all; `--defaults`, no conflict).
- qa-planning gate: skipped (auto — no prompt)
- Phase 0 run inline: no fan-out subagents dispatched; file path given directly; tracker issue #947 from frontmatter.
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Status `Planned` at Phase 0c — proceeding; Step 2 (`/review-task`) validates.
- Branch: `feature/task.325.docs-only-rule-exclusions` from `develop`. Report stashed before branch creation, restored after.
- Tracker comment work-started: `posted`. GitHub board: work-started → transitioned (In Progress).

### Step 2 — review-task

- review-task invoked (no current report; status Planned). Output: Comprehensive report (auto). Step 8.5 auto-answered: apply all critical + important fixes. Step 9 auto-answered: Yes, fixes complete.
- Review report: `docs/tasks/task.325.docs-only-rule-exclusions/task.325.review.1.docs-only-rule-exclusions.md` — READY TO IMPLEMENT, 8/10; 1 Critical + 1 Important fixed, 3 Optional applied.
- Pre-pass B and C dispatched as Explore subagents; both returned (B `drift`, 3 low; C `not-implemented`).
- Planned promoted to Ready for Development by review-task. `reviewed_blob` stamped (`written`).
- Tracker key unchanged (#947 at Step 1) — no re-fire needed.
- Review outcome comment skipped by orchestrator — review-task reported `posted` (stage `review-task-1`, matches report 1).

### Step 3 — develop

- Pre-develop surface map: 9 files identified in shared/resources (engine, glob-match, 4 suites, reenter test) + 3 docs — performed inline, not by an Explore subagent: the Step 2 review had already mapped every `isDocsPath` caller with `git grep`. Independence loss: none material (mapping, not review).
- Plan file found: docs/tasks/task.325.docs-only-rule-exclusions/task.325.plan.docs-only-rule-exclusions.md — included as implementation context for /develop
- Step 3 inline — /develop not invoked: the plan gives the predicate's exact lines and the surface map was already recorded.
- Fast-gate precondition: `npm run ci:fast` defined — ok.
- Tests first: 6 new cases; 4 red before the change (the 2 green are the "unchanged" controls), all green after. Four engine suites 235/235; `reenter-qa-after-finalise.test.sh` 85/85.
- Mutations (each alone, restored with the Edit tool): (1) exclusion removed → 4 ci-tree-eq + 1 push-policy + 1 reenter case red; (2) last-match-wins order → "in any list order" red; (3) both usage errors removed → readConfig case red; (3a) bare-`!` refusal alone removed → readConfig case red; (4) negation moved into `glob-match.js` → "glob-match itself has no negation" red.
- The `p.length > 0` guard is not reachable from YAML: an empty `patterns:` is already refused by the block-list check (`readConfig` probe). Kept as the review asked; no test can hold it through `readConfig`.
- Bundle → 6 generated copies; `bundle:check` 0 problems; `lint:shell` clean. `git grep matchesAnyGlob -- shared/resources` shows no new caller.
- Fast gate: `npm run test:remote` (`ci:fast`, LAN server) — 8904 tests, 8901 pass, 0 fail, 3 skipped. TEST_EXIT=0.
- Loop audit (Explore): status `Ready for Review`, 6/6 plan checkboxes, head `c0fa90645` — exit condition met after iteration 1.
- Commits: `3cf1d0ca4` feat(ci) (engine, tests, docs, bundled copies); `c0fa90645` docs(task.325). Report left for Step 4.
- Tracker comment develop-complete: `posted`.

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
**Branch**: feature/task.325.docs-only-rule-exclusions
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}

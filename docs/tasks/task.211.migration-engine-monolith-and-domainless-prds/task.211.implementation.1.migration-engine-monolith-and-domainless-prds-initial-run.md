# Implementation Report: Migration engine: monolith and domain-less PRDs

**Task**: `task.211.migration-engine-monolith-and-domainless-prds.md`
**Run Number**: 1
**Started**: 2026-10-21 00:25
**Status**: In Progress

---

## Summary

Fix the three migrate-doc-numbering.mjs engine defects found in task.204 gate 8 (frontmatter-less PRD, outside links to a moved monolith, domain-less PRD placement) and lift the matching refusals from review-prd's migration guard.

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
| Tracker Issue       | #676 (GitHub)                                                              |
| Board status        | In Progress ✅                                                              |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.211.*` exists in git                              | Branch created at `27725e92` | —                    | 2026-10-21T00:21Z |
| 2. review-task             | ✅ Done    | `task.211.review.{N}.{name}.md` exists (or skip logged)                | `task.211.review.1.…` — READY TO IMPLEMENT 8/10; Planned → Ready for Development | —                    | 2026-10-21T00:24Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline; 12/12 phases; ci:fast 6075 pass / 0 fail; 10 mutations red | `.summaries/step-3-iteration-audit.json` | 2026-10-21T00:40Z |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.211.qa.{N}.*.md`; `task.211.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.211.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-10-21

- Invoked by `/develop-next` (registry fallback — task-registry, T211) with `--defaults`; autonomous run.
- Phase 0 run inline (no 0a-parallel agents dispatched): the task path came resolved from the selector; lite-mode inputs derived from the document — risk_level absent (risk_ok true), phase_count 3 (not < 3), single_module false (engine in shared/resources + review-prd skill + evals) → PIPELINE_MODE standard.
- Feature branch base: develop — source: recommended (`--defaults`, pipeline-answers.js; 0 questions asked)
- PR target branch: develop — source: recommended (`--defaults`)
- Mode: standard — source: detector; skips: none; refused: none
- qa-planning gate: skipped (auto — no prompt)
- Task status at start: `Planned` — proceed; Step 2 (`/review-task`) validates and promotes.
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Tracker: github, issue #676.
- Branch: `feature/task.211.migration-engine-monolith-and-domainless-prds` from `develop` @ `27725e92`, pushed with tracking. Implementation report stashed before branch creation, restored after.
- Tracker work-started: comment `posted`; GitHub board: work-started → In Progress (transitioned). Priority P2 default block not run — the issue already carries a priority from create-task.
- review-task invoked (status Planned, no review report → run). Output: Comprehensive report (pipeline default). Step 8.5 auto-answered: Yes, apply all critical + important fixes. Step 9 auto-answered: Yes, fixes complete — pipeline proceeds autonomously.
- Review report: docs/tasks/task.211.migration-engine-monolith-and-domainless-prds/task.211.review.1.migration-engine-monolith-and-domainless-prds.md — READY TO IMPLEMENT 8/10; 0 Critical, 3 Important (Performance criterion untested; monolith `<domain>/<slug>` placement unstated; gate-9/10 test row unnamed), 3 Optional (drifted anchors, slug validation via docId.format, BLOCKER_CODES). All applied to the task document.
- Planned promoted to Ready for Development by review-task. Tracker key unchanged (#676) — no work-started re-fire.
- Review outcome comment skipped — review-task reported `posted` (stage review-task).

### Step 3 — Develop — 2026-10-21

- Pre-develop surface map: 6 files identified in shared/resources (migrate-doc-numbering.mjs + its test), skills/review-prd (SKILL.md, scripts/migration-guard.mjs, bundled engine copy), evals/shared/tests (prd-skill-numbering.test.mjs). Mapped inline from the review's verified anchors rather than by an Explore subagent — the independent second look was not taken.
- Plan file found: docs/tasks/task.211.migration-engine-monolith-and-domainless-prds/task.211.plan.migration-engine-monolith-and-domainless-prds.md — included as implementation context for /develop.
- Step 3 inline — /develop not invoked: the plan and review named every hunk (three engine sites, two eval rows, one SKILL.md block pair).
- Fast gate: `npm run ci:fast` (no `develop.fastGateCommand` configured). Run with `.agents/skills` moved aside: 6089 tests, 6075 pass, 0 fail. `npm run eval:all` 0; `npm run bundle:check` 0 problems; `npm run validate -- skills/review-prd/` ok.
- Phase 1: `frontmatterState()` exported; `editFrontmatter` writes a new block (all edits in order, plus `type: prd` as a `createOnly` edit) when line 0 is no fence; an unclosed fence is the `unclosed-frontmatter` plan blocker.
- Phase 2: move sources outside the root join the prefilter (by repo-relative path or the path relative to the reading file's directory, never a bare name) and the literal-pass gate; move sources also join the live set, so a link to an untracked monolith is re-pointed, not counted dead. Each outside candidate is still read exactly once.
- Phase 3: `--name <path>=<domain>/<slug>` (parseArgs refuses more than one `/` or an empty part, as usage); a named domain is validated with `docId.format` (bad → `bad-slug`) and wins placement, the monolith included; a legacy PRD landing at domain `.` is `needs-domain`. review-prd plan/apply blocks lose the guard; plan prose documents `needs-domain` and `unclosed-frontmatter`. `skills/review-prd/scripts/migration-guard.mjs` deleted (no code left in it).
- Breaking: task.203's L3 row now expects `needs-domain` for a bare `index.md=core`; CHANGELOG `### Changed` entry marked BREAKING.
- Mutation proof: 10 engine mutations (block creation, unclosed blocker, prefilter widening, literal gate, needs-domain, named domain, live set, prefilter disabled, createOnly, domain validation) each turn ≥1 row red. Two (live set, createOnly) were unheld on the first pass; a row was added for each.
- Implementation decision: `type: prd` is written only into a block the engine creates, never over an existing `type:`.
- Loop audit (iter 1): ready-for-review, 12/12 — loop exited.
- Development completion comment posted to github issue 676 (`posted`).

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
**Branch**: feature/task.211.migration-engine-monolith-and-domainless-prds
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}

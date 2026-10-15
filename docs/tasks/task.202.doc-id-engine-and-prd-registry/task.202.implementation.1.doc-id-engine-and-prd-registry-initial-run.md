# Implementation Report: Doc-id engine and PRD registry

**Task**: `task.202.doc-id-engine-and-prd-registry.md`
**Run Number**: 1
**Started**: 2026-10-15 05:34
**Status**: In Progress

---

## Summary

First pipeline run for task 202: ship `shared/resources/doc-id.js` (hierarchical doc-id engine + CLI), a `prd` kind in `parseRegistry`, and the PRD registry standard plus updated naming standards. Dispatched autonomously by `/develop-next` (roadmap item T202).

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | medium                                                                     |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | In Progress ✅ (work-started: transitioned; comment posted on #645)        |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.202.*` exists in git                             | Branch created at `3b8d4026` | —                    | 2026-10-15T03:34Z |
| 2. review-task             | ✅ Done | `task.202.review.{N}.{name}.md` exists (or skip logged)               | READY TO IMPLEMENT 8/10; 3 Important fixed; Planned → Ready for Development | —                    | 2026-10-15T03:38Z |
| 3. develop                 | ⏳ Pending | Task status == `Ready for Review`                                      |       | —                    |                 |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.202.qa.{N}.*.md`; `task.202.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.202.dod.{N}.*.md`; task `status: accepted`                      |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-10-15

- Feature branch base: develop — source: recommended (`--defaults`, develop-next autonomous run)
- PR target branch: develop — source: recommended (`--defaults`)
- Mode: standard — source: detector (Phase 0 run inline: risk_level=medium → risk_ok=false; 3 phases; single_module=false)
- Skips: none — refused: none
- Upfront questions asked: 0 (`--defaults`, no conflicts)
- qa-planning gate: skipped (auto — no prompt)
- Task status at start: Planned — Step 2 `/review-task` will validate and promote
- Always-load files resolved: 3 files — from skills-config.yaml `devLoadAlwaysFiles`
- Branch: `feature/task.202.doc-id-engine-and-prd-registry` from `develop` @ 3b8d4026, pushed. Implementation report stashed before branch creation, restored after
- GitHub board: work-started → transitioned (In Progress). Tracker comment: posted. Priority default block not run (task frontmatter already carries Priority: Medium)
- review-task invoked (status Planned, no prior report). Auto-answers: output = Comprehensive report; Step 8.5 = Yes, apply all critical + important fixes; Step 9 = Yes, fixes complete
- Review report: docs/tasks/task.202.doc-id-engine-and-prd-registry/task.202.review.1.doc-id-engine-and-prd-registry.md (reviewed_blob stamped)
- Pre-pass: Agent B drift (prepass-axes source: architecture), Agent C not-implemented
- Planned promoted to Ready for Development by review-task. Fixes: coding-standards.md § Registries in scope; non-canonical artifact classification + agreement test; timing criterion records uptime + head commit
- Tracker key re-read after review: 645 (unchanged)
- Review outcome comment skipped — review-task reported posted
- Pre-develop surface map: 20 files identified in shared/resources (engine, tests, fixtures), skills/develop-next (select-next.mjs + unit suite), docs/standards, docs/architecture/concepts — key guards: stdout-drain-on-exit (use process.exitCode), prettier, work-item-artifact-naming (task rows untouched); parseRegistry checks hrefs in two places (title link + resolveDocCell)
- Plan file found: docs/tasks/task.202.doc-id-engine-and-prd-registry/task.202.plan.doc-id-engine-and-prd-registry.md — included as implementation context for /develop
- Step 3 inline — /develop not invoked: the co-located plan names every hunk (grammar as code, check-reason table, CLI contract, select-next edits) and the surface map was in hand
- Fast gate precondition: develop.fastGateCommand unset → suggested `npm run ci:fast`, which this project defines
- parseRegistry: `isPrdHref` added beside `isWorkItemHref` (not a widening); `resolveDocCell` takes the row predicate as an optional third argument so the document-column path is scoped to the kind too
- Non-canonical artifacts (dated, slug-before-keyword, seq-less) parse as artifacts with `seq: null, canonical: false`; agreement with WORK_ITEM_ARTIFACT_RE / isWorkItemDocument verified over every tracked task/bug filename
- `next()` returns `{ok, reason, next}`; `nextNumber()` returns the number and throws an Error carrying `.reason` (the success criterion `nextNumber("story", …) === 4` needs a bare number)
- `checkCorpus` adds `root-missing` (exit 1) beside `empty` (exit 0): a missing root is a claim about the instrument, not an empty tree
- PRD registry rows are read in doc-id.js by a minimal number-column reader, not parseRegistry: doc-id.js is CommonJS and the selector is ESM
- Mutation proof (each `check` branch removed in turn, `node --test shared/resources/tests/doc-id.test.mjs`): bad-shape → 3 red; dir-stem-mismatch → 2; frontmatter-mismatch → 3; parent-missing → 3; parent-number-mismatch → first mutation survived (it removed only the P half by operator precedence — `false && a || b`), which exposed that the P half had no test; test added, full-branch mutation → 3 red; unregistered → 2; registry-missing → 2; duplicate-id → 2
- Timing (pre-commit, base 3b8d4026): `time node shared/resources/doc-id.js check --corpus --json` over docs/prd → real 0.031s, `uptime` load average 1.25, 1.24, 1.08; 29 documents, 29 `bad-shape` (the unmigrated legacy tree — expected until task 203). Re-measure on the PR head before finalise

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
**Branch**: feature/task.202.doc-id-engine-and-prd-registry
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}

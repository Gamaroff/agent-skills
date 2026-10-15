# Implementation Report: PRD-scoped epic numbering

**Task**: `task.205.prd-scoped-epic-numbering.md`
**Run Number**: 1
**Started**: 2026-10-15 12:01
**Status**: In Progress

---

## Summary

Move every epic skill to PRD-scoped `epic.{P}.{E}` numbering, make a parent PRD mandatory, and retire the global epic registry and `epic-registry-manager` (roadmap T205, dispatched by develop-next).

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
| Board status        | In Progress ✅ (gh-stage work-started: transitioned; Priority already P2) |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.205.*` exists in git                             | Branch `feature/task.205.prd-scoped-epic-numbering` created at `6872072a`, pushed | —                    | 2026-10-15T10:02Z |
| 2. review-task             | ✅ Done    | `task.205.review.{N}.{name}.md` exists (or skip logged)               | `task.205.review.1.prd-scoped-epic-numbering.md` — READY TO IMPLEMENT 8/10; 7 Important + 1 Optional fixes applied; Planned → Ready for Development | —                    | 2026-10-15T10:05Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline (plan + surface map); 30/30 phases; ci:fast 5663/0; 10 mutation proofs; develop-complete comment posted | —                    | 2026-10-15T10:27Z |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.205.qa.{N}.*.md`; `task.205.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.205.dod.{N}.*.md`; task `status: accepted`                      |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-10-15

- Invoked by develop-next (roadmap T205) with `--defaults`; autonomous run.
- Feature branch base: develop — source: recommended (`--defaults`, no question asked)
- PR target branch: develop — source: recommended (`--defaults`, no question asked)
- Mode: standard — source: detector; skips: none; refused: none
- qa-planning gate: skipped (auto — no prompt)
- Questions asked: 0 (resolver returned `questions: []`)
- Phase 0 run inline (no 0a-parallel agents dispatched): lite-mode inputs derived from the document — risk_level absent (ok), phase_count 7 (≥3), single_module false (shared/resources + ~15 skills) → PIPELINE_MODE=standard
- Tracker: github, issue #648
- Step 1: branch `feature/task.205.prd-scoped-epic-numbering` from develop @ `6872072a`; lock written with answers; tracker-comment work-started: posted; GitHub board: work-started → transitioned (In Progress).
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Status at start: Planned — proceed; Step 2 /review-task validates and promotes
- Precondition check (task Phase 0): task.202 accepted, task.203 accepted, `shared/resources/doc-id.js` present. Note: the engine's allocator is `next epic --prd-dir <dir>`, not `--prd P` as the task text says — implementation follows the engine.

### Step 2 — review-task — 2026-10-15

- review-task invoked (status Planned, no prior report). Output format auto-answered: Comprehensive report.
- Pre-pass: B `drift` (axes source `architecture`; ShellCheck missing, interim notices stale), C `not-implemented`.
- Step 8.5 auto-answered: apply all critical + important fixes (7 Important + 1 Optional applied). Step 9 auto-answered: Yes, fixes complete → Ready for Development.
- Key fix: the allocator is `doc-id.js next epic --prd-dir <dir>` (task said `--prd P`). Consumer vendoring of doc-id becomes `scripts/doc-id.cjs`.
- Review report: docs/tasks/task.205.prd-scoped-epic-numbering/task.205.review.1.prd-scoped-epic-numbering.md; reviewed_blob recorded.
- Review outcome comment: review-task posted its own (`posted`) — pipeline Step 2 comment skipped (one event, one writer).
- Tracker key unchanged (#648 at Step 1) — no work-started re-fire.

### Step 3 — develop — 2026-10-15

- Plan file found: docs/tasks/task.205.prd-scoped-epic-numbering/task.205.plan.prd-scoped-epic-numbering.md — included as implementation context for /develop
- Pre-develop surface map: 25 files identified in shared/resources (doc-id, generator, tracker-issue), 14 skills, scripts/setup-consumer.sh, tests/ (Explore subagent)
- Step 3 inline — /develop not invoked: the plan names every hunk and the surface map was recorded; the inline path owes /develop's Task Completion Checklist (phases ticked, status Ready for Review, one Change Log row)
- Fast gate precondition: `develop.fastGateCommand` unset → `npm run ci:fast`, defined. Run with the gitignored `.agents/skills` symlink moved aside (all three runs).
- Fast gate iter 1: prettier failed on 7 new/edited files (tests never ran) → formatted. Iter 1b: 5662 pass / 1 fail — `tests/unbound-default-reads.test.js` (obs #133) flagged three new `${NAME:?}` guards → declared as block INPUTS with reasons. Iter 1c: **5663 pass, 0 fail**.
- Also clean: `npm run bundle:check`, `npm run lint:shell` (ShellCheck), `quick_validate.py` on 14 changed skills.
- Performance criterion measured (working tree, re-measure on the PR head at finalise): `uptime` load 2.67; `time command node shared/resources/generate-prd-epic-index.mjs --check` → real 0.039 s (bound < 1 s).
- Mutation proofs (each reverted once, seen red, restored): generator one-level discovery (3 fail), generator `doc-id.js`-only load in an ESM consumer (1 fail), generator number-disagreement skip (2 fail); jira-create-epic local `[Epic N]` regex copy (2 fail); sync-jira-epic `(P,E)` child filter (1 fail); tracker-issue rename branch (1 fail); create-epic sentinel re-added (guard 1 fail); sync-github-epic `--rename-from` dropped (1 fail); review-epic bare-number refusal reverted to a glob (1 fail); ensure-task milestone title wrong (1 fail).
- Decisions: `doc-id` vendored to consumers as `scripts/doc-id.cjs` (ESM-safe), generator loads `./doc-id.cjs` then `./doc-id.js`; `--rename-from` success reports `reason: performed` plus `renamedFrom` (the engine's existing vocabulary, not the plan's `ok`); `idLabel` omits a sub-story letter, `findChildStories` appends it; the generator found this repository's domain-level PRD for the first time and wrote its epics index.
- Found and fixed in-session: `"${DOMAIN:?… epic's …}"` — an apostrophe inside a double-quoted `:?` word broke the block's bash parse (observation #47).
- Out of scope, left for their owners: `create-prd`/`review-prd` registry lines (task.204, allowlisted in the guard); story-side milestone key and story `epic:` frontmatter examples (task.206); repo-wide prose (task.207).

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- Step 3: first fast gate failed on formatting (7 files) and second on the obs #133 unbound-read guard (3 new `:?` inputs). Both fixed; third run green.

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: feature/task.205.prd-scoped-epic-numbering
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}

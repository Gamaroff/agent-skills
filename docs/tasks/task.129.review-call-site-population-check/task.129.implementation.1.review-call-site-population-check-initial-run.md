# Implementation Report: [Task 129] A call-site list in a task document is the author's recall, not a measurement

**Task**: `task.129.review-call-site-population-check.md`
**Run Number**: 1
**Started**: 2026-09-29 21:00
**Status**: In Progress

---

## Summary

Lift `collectCallSites()` into a shared `call-sites.js` collector and add a call-site population check to review-task (Step 3 check 14) and review-story (Step 4 check 10).

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
| Tracker Issue       | #432 (GitHub)                                                              |
| Board status        | In Progress ✅                                                              |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.129.*` exists in git                              | Branch created at `01c8701f`; pushed with upstream | —                    |
| 2. review-task             | ✅ Done | `task.129.review.{N}.{name}.md` exists (or skip logged)                | review.1 — READY TO IMPLEMENT 8/10; 0 critical, 9 important applied; Planned → Ready for Development | —                    |
| 3. develop                 | ✅ Done | Task status == `Ready for Review`                                      | Inline (plan + surface map); 2 fast-gate iterations; 7/7 phase items; ci:fast green | `.summaries/step-3-iteration-audit-1.json` |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.129.qa.{N}.*.md`; `task.129.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.129.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-09-29

- Dispatched by `/develop-next` (autonomous run; item T129, source `task-registry`, registry line 172).
- Upfront Setup questions asked: 2 (Q1, Q2) — both auto-answered per the develop-next AUTONOMOUS RUN directive, no prompt.
- Feature branch base: develop — auto-answer (recommended; on `develop`).
- PR target branch: develop — auto-answer (recommended).
- qa-planning gate: skipped (auto — no prompt)
- Phase 0 run inline (path supplied; no Explore agents dispatched). Resolver: the path given; tracker: GitHub, issue #432.
- Pipeline mode: standard — risk_level `low` (risk_ok true), phase_count 2 (<3 true), single_module **false** (touches review-task, review-story, create-task and shared/resources).
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Task status at start: `Planned` — proceed; Step 2 `/review-task` validates and promotes.
- Branch: `feature/task.129.review-call-site-population-check` (base develop). Implementation report stashed before branch creation, restored after.
- Pipeline-start comment on #432: posted. GitHub board: work-started → transitioned Todo → In Progress (verified).
- Priority P2 default block not run — the board item already carries the task's Medium priority from `/create-task`; non-blocking.

- Step 2: review-task invoked (no prior report; status Planned). Output format auto-answered: Comprehensive report. Step 8.5 auto-answered: apply all critical + important fixes. Step 9 auto-answered: Yes, fixes complete.
- Review report: docs/tasks/task.129.review-call-site-population-check/task.129.review.1.review-call-site-population-check.md
- Planned promoted to Ready for Development by review-task. Pre-pass B `drift` (4 low), C `not-implemented`.
- Review decisions taken autonomously (D1–D4): add the two shell roots (population unchanged, 0 tracker-comment sites there); create-task twin in 3.5 + Section 7 pointer; presence test instead of families audit; fixture at `c69f5115^` with `--root`.
- Tracker key re-read after review: 432 (unchanged). Review comments on #432: `review-task` posted, `review` posted.

### Step 3 — Develop — 2026-09-29

- Fast-gate precondition: `develop.fastGateCommand` unset → suggested `npm run ci:fast`; script exists — precondition passed.
- Pre-develop surface map: 19 files identified in shared/resources (engine + tests), skills/review-task, skills/review-story, skills/create-task, tests/ (presence-test siblings), CHANGELOG.
- Plan file found: docs/tasks/task.129.review-call-site-population-check/task.129.plan.review-call-site-population-check.md — included as implementation context for /develop.
- Step 3 inline — /develop not invoked: plan file + surface map both recorded; the plan named every change, and the review had already measured the baselines.
- Collector baseline before the lift (guard's own `collectCallSites`, throwaway copy with a `console.log`): `SITES` 24, `PR_SITES` 12. After the lift (`call-sites.js --engine …`): 24 / 12 — unchanged. Guard test 14/14 green on both sides.
- Mutation proofs: guard test red (2 fail) with the `shared/resources/*.sh` root removed; `call-sites.test.mjs` red on each of 6 mutations (each root class, banner exclusion, continuation, `--kind`); presence test red on 4 mutations (review-story verdict, review-task numbering, create-task twin, review-story Agent C schema).
- Deviation from plan: fixtures are built per run in a temp directory rather than committed under `shared/resources/tests/fixtures/call-sites/` — each assertion names its root class, and a committed fixture tree under `shared/resources/` would sit beside the roots the collector walks.
- Addition beyond plan: the general engine shape admits `tracker_call_with_retry node …` and `[ … ] && node …` prefixes (found by the surface map; `tracker-issue` 27 → 30 sites). The two lifted shapes are byte-identical to the guard's, so its population did not move.
- Integration fixture (automated half): `git archive c69f5115^ | tar -x` → `call-sites.js --engine tracker-comment --root <export>` → 26 sites; the six QA-stage sites include `develop-pipeline-step-5-6-qa-loop.md:905` (`--stage qa-fix-`) and `develop-bug-step-5-6-verify-loop.md:89` (`--stage qa-cycle-`), which task.121's document at that commit does not name — the two sites its review found.
- Integration fixture (hand run): check 14 applied to task.121's document at `c69f5115^` — the document names qa-task, qa-story, qa-fix and the orchestrator `qa-cycle-{N}` block; the collector's two unnamed sites are both in scope → 2 Important findings, matching the task.121 review.
- Iteration 1 fast gate: 1 failure — `transition-protocol-parity.test.mjs` "tracker-comment.js is bundled wherever a skill invokes it": the create-task 3.5 item named `tracker-comment.js` literally. Reworded to the collector's `--engine` names. Iteration 2: `npm run ci:fast` exit 0 (4,564 pass, 0 fail). Also green: `bundle:check`, `check:generated`, `validate:all`.
- CLI timing: `call-sites.js --engine tracker-comment` 0.17 s on the live tree.
- Development completion comment posted to github issue 432.

### Step 4 — Create PR — 2026-09-29

- SCOPE_PATHS: docs/tasks/task.129.review-call-site-population-check, CHANGELOG.md, shared/resources, shared/resources/tests, skills/create-task, skills/review-story, skills/review-story/references, skills/review-task, skills/review-task/references, plus `tests/review-call-site-population-check.test.js` added by hand (a new untracked file in a directory with no tracked change).
- Pre-flight guard: every untracked path is in scope — nothing held.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- Step 3 iteration 1: fast gate failed on `transition-protocol-parity.test.mjs` (a skill naming `tracker-comment.js` must bundle it). Cause: literal engine filenames in create-task 3.5. Fixed by naming engines by `--engine` value. Triage: `.summaries/step-3-test-triage-1.json`.

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: feature/task.129.review-call-site-population-check
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}

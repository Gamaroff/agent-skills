# Implementation Report: Derive the selection frontier from the registries

**Task**: `task.65.registry-aware-selection.md`
**Run Number**: 1
**Started**: 2026-08-29
**Status**: In Progress

---

## Summary

Add a registry-backed fallback frontier to `select-next.mjs` so an outstanding bug or task filed in
`docs/bugs/bug-registry.md` / `docs/tasks/task-registry.md` cannot be invisible to `/develop-next`.

---

## Pipeline Configuration

| Setting             | Value                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Feature branch base | develop                                                                                                                               |
| PR target           | develop                                                                                                                               |
| qa-planning gate    | skipped (auto)                                                                                                                        |
| Task risk level     | medium                                                                                                                                |
| Pipeline mode       | standard                                                                                                                              |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Tracker Issue       | #280 (GitHub)                                                                                                                         |
| Board status        | In Progress ✅ (Todo → In Progress, verified)                                                                                          |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.65.*` exists in git                               | `feature/task.65.registry-aware-selection` off `develop` | — |
| 2. review-task             | ✅ Done    | `task.65.review.{N}.{name}.md` exists (or skip logged)                 | READY TO IMPLEMENT (9/10); 9/9 recommendations applied; status → `ready-for-development` | — |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 7/7 phases; 8 files; 72 → 99 unit tests; 10 mutations each reddening the tests that name them; suite 1923 pass / 0 fail | — |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.65.qa.{N}.*.md`; `task.65.gate.{N}.*.yml`; PR comment posted     |       | —                    |
| 7. finalise                | ⏳ Pending | `task.65.dod.{N}.*.md`; task `status: accepted`                        |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

---

## Decisions Log

### Pipeline Startup — 2026-08-29

- Invoked by `/develop-next` in **autonomous mode** — all Phase 0d questions auto-answered with the
  recommended option, no prompts issued.
- Feature branch base: **develop** — auto-answer (Q1 recommended; current branch is `develop`).
- PR target branch: **develop** — auto-answer (Q2 recommended; standard Gitflow for a standalone task).
- qa-planning gate: skipped (auto — no prompt).
- Phase 0 fan-out: run inline rather than via subagents (session policy restricts Agent dispatch);
  resolver was unnecessary (path supplied by the selector), tracker poller unnecessary (no linked
  issue), lite-mode inputs read directly from the task document.
- Pipeline mode: **standard** — `risk_level: medium` (risk_ok=false) and phase_count=5 (≥3), so two of
  the three lite conditions fail.
- Always-load files resolved: 3 files from `skills-config.yaml` `devLoadAlwaysFiles`, all present on disk.
- Tracker: GitHub, but the task document carries no `github_issue:` — all tracker operations skipped.
- Task status is `draft` — per Phase 0c this proceeds; Step 2 (`/review-task`) promotes it.

---

### Pipeline Resume — 2026-08-29

- Run 1 stopped between Step 2 and Step 3 without updating the Pipeline Progress table and without
  writing a lock file (no commits, no PR on the branch).
- Re-invoked as `/develop-task 65`. Phase 0b resume detected; user chose **Resume from Step 3**.
- Artifact verification: branch `feature/task.65.registry-aware-selection` exists ✅;
  `task.65.review.1.registry-aware-selection.md` exists with outcome READY TO IMPLEMENT ✅;
  task status `ready-for-development` ✅. Steps 1–2 marked ✅ Done.
- Lock file written at `current_step: 3`.
- **Tracker signal fired late**: run 1 recorded "no issue linked", but `/review-task` linked
  `github_issue: 280` afterwards. The deferred 0c-reg signal was executed on resume —
  `work-started` comment posted (`reason: posted`), board moved Todo → In Progress (verified).

### Step 3 — Develop (pre-flight) — 2026-08-29

- Pre-develop surface map (inline, not via Agent — session policy restricts Agent dispatch):
  **10 files** across `skills/develop-next/` and `evals/develop-next/`.
  - `skills/develop-next/scripts/select-next.mjs` (885 L) — `parseRoadmap` · `selectNext` (its terminal
    `roadmap-complete` return is the single insertion point) · `lintModel` · `pickItem` · `selectBatch`
    · `parseArgs`/`main`.
  - `skills/develop-next/references/roadmap-selection.md` (92 L) — the spec that must not drift.
  - `skills/develop-next/SKILL.md` — Step 1 note.
  - `.agents/skills/develop-next/scripts/select-next.mjs` — bundled copy, regenerated by `npm run bundle`.
  - `evals/develop-next/unit/select-next.test.mjs` + `unit/fixtures/01..11-*.md` — existing unit suite.
  - `evals/develop-next/protocol/skill-shape.test.mjs` — asserts the closed stop-reason set; must stay
    green unchanged (task adds no stop reason).
  - `docs/bugs/bug-registry.md` (37 L), `docs/tasks/task-registry.md` (121 L) — the two registries.
  - `docs/development/project-completion-roadmap.md`, `docs/development/roadmap-history.md` — Phase 6.
- `package.json` already globs `evals/develop-next/unit/*.test.mjs`, so new tests in that dir run under
  `npm test` without a glob edit.
- Plan file discovery: **no** `task.65.plan.*.md` — proceeding without one (optional).
- Always-load files read and passed to `/develop`: 3 architecture concept docs.

### Step 3 — Develop (complete) — 2026-08-29

- All 7 Implementation Plan phases complete. `selectNext(model, opts)` gained one optional **lazy**
  `loadRegistries` loader, invoked at exactly one line — the terminal `roadmap-complete` return.
  Injection rather than an inline filesystem read is what lets the SC9 guard assert the strong form:
  *the loader was never called*, not merely *no registry item was selected*.
- New exports: `parseRegistry`, `parseFrontmatterStatus`, `registryFrontier`,
  `BUG_ELIGIBLE_STATUSES`, `TASK_ELIGIBLE_STATUSES`. `item.source` on every selection.
- Tests 72 → 99 in `evals/develop-next/unit/select-next.test.mjs`. The SC9 stop-precedence tests were
  written **before** the fallback code, per review-task's ordering.
- **10 mutations, each reddening exactly the tests that name it** — recorded in the task document's
  Implementation Record. Notably M1b (fallback consulted before the phase loop) reddened all four SC9
  tests plus SC1, which is the guard against the fallback becoming a way to scan past a human gate.
- `evals/develop-next/protocol/skill-shape.test.mjs` stayed green **unchanged** at 19 passing — no
  stop reason was added, as the task required.
- Full suite: **1924 tests, 1923 pass, 1 skipped (pre-existing), 0 fail**, 41.7 s.
  `npm run format:check` clean; `npm run bundle` idempotent (no drift).
- SC11 verified live: with roadmap `PHASE 4` archived, `select-next.mjs` returns
  `status: selected, source: "task-registry", id: "T65"` where it previously returned
  `roadmap-complete`.

**Three deviations from the plan, all recorded in the task document:**

1. **No registry fixture file.** The drift guard reads the *document*, so a registry fixture would be
   only half a fixture — it would need a parallel tree of documents to supply the frontmatter the
   check consults. Inline builders keep a row and its document status beside the assertion about them.
2. **Phase 6 corrected six registry rows, not three.** The plan named 62–64; the same check found 56,
   57 (`planned`) and 58 (`ready-for-review`) equally stale against `accepted` documents. Safety is
   unaffected either way — all six were already excluded by the document check rather than by the row
   being right, which is itself the point of SC5.
3. **`PHASE 4` archived with `T65` unticked.** The plan said "once T65 is ticked", but T65 is this
   task and is in flight; ticking its own row would attest to a merge that has not happened. Archived
   unticked with the reason recorded in `roadmap-history.md`.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Run 1 stalled silently between Steps 2 and 3.** No lock file existed, so neither the PreCompact nor
  the Stop hook could fire. Resolved on resume by reconstructing state from on-disk artifacts and
  writing the lock. No work lost — the review report and task-document edits were intact but uncommitted.

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: {populated after Step 1}
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}

# Implementation Report: The AC merge closes task 331's follow-ups

**Task**: `task.332.ac-merge-closes-task-331-follow-ups.md`
**Run Number**: 1
**Started**: 2026-11-27 19:36
**Status**: In Progress
**Report format**: 2

---

## Summary

First run: make `finalise-rerun-scope.js merge` require `--doc` and a named `story_file`, key the scope and extract state files by work item, and split task 331's refusals by cause.

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
| Tracker Issue       | #963 (GitHub) — created by review-task at Step 2                           |
| Board status        | work-started → transitioned ✅                                              |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.332.*` exists in git                             | Branch created at `12baef381`; pushed with upstream | —                    | 2026-11-27T19:37Z |
| 2. review-task             | ✅ Done | `task.332.review.{N}.{name}.md` exists (or skip logged)               | `task.332.review.1.ac-merge-closes-task-331-follow-ups.md` — READY TO IMPLEMENT 9/10; Planned → Ready for Development | —                    | 2026-11-27T19:46Z |
| 3. develop                 | ✅ Done | Task status == `Ready for Review`                                      | Inline, 1 iteration; 12/12 phases; 7 mutations proved; test:remote 8,972/8,976 (1 load-only timing failure, green alone) | `.summaries/step-3-iteration-audit-1.json` | 2026-11-27T22:04Z |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.332.qa.{N}.*.md`; `task.332.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.332.dod.{N}.*.md`; task `status: accepted`                      |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-27

- Feature branch base: develop — source: asked (Q1, Recommended taken)
- PR target branch: develop — source: asked (Q2, Recommended taken)
- Mode: standard — source: detector
- Skips: none
- qa-planning gate: skipped (auto — no prompt)
- Phase 0 run inline (no 0a-parallel fan-out): the document path was given directly; lite-mode inputs derived from the document — risk_level low, phase_count 4, single_module false (engine, SKILL.md, eval test, CHANGELOG) → standard.
- Task status `planned` at start — Step 2 (`/review-task`) validates and promotes it.
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Tracker: GitHub, no `github_issue` in frontmatter — tracker steps skipped.
- AskUserQuestion asked 2 questions (Q1, Q2), matching `questions[]`.
- Branch: `feature/task.332.ac-merge-closes-task-331-follow-ups` from `develop` (`12baef381`). Implementation report stashed before branch creation, restored after.
- Work-started signal skipped at Step 1: no tracker issue linked.

### Step 2 — review-task

- review-task invoked: output Comprehensive report (pipeline default); Step 8.5 auto-answered "Yes, apply all critical + important fixes"; Step 9 auto-answered "Yes, fixes complete".
- Pre-pass B: aligned (axes: What this repo produces, Cross-skill resources, File naming, Status lifecycle, Validation before commit, Do not), 1 low finding. Pre-pass C: not-implemented.
- Tracker sync: the user chose "Sync to GitHub" → issue #963 created by ensure-task-github-issue, on the board (P2, 8h).
- Review report: `docs/tasks/task.332.ac-merge-closes-task-331-follow-ups/task.332.review.1.ac-merge-closes-task-331-follow-ups.md` — READY TO IMPLEMENT, 9/10, 0 critical / 2 important (both fixed) / 2 optional.
- Fix applied: the new document checks run only on a result with an `acs` list, because `parseYamlSubset` returns `{}` (no throw) for the existing `result-unparseable` fixture at `finalise-rerun-scope.test.mjs:1885`.
- Planned promoted to Ready for Development by review-task.
- work-started re-fired at Step 2 — issue 963 created by the review; lock updated. Comment: posted; board: transitioned.
- Review outcome comment skipped — review-task reported posted (stage `review-task-1`, matching report 1).

### Step 3 — develop

- Pre-develop surface map: inline (no Explore fan-out). The review had already verified every anchor, and the plan names the 6 files (engine, unit test, SKILL.md, eval test, AC prompt, CHANGELOG).
- Plan file found: `task.332.plan.ac-merge-closes-task-331-follow-ups.md`, followed phase by phase.
- Step 3 inline — /develop not invoked: the session already held the review's anchor map, and a fresh /develop load would re-derive it. Independence lost: no separate develop-skill pass over the plan. QA (Step 5) and review-pr (5c) are the independent reads.
- Engine: one `readAnswer` predicate shared by `merge()` and the CLI's document checks, so `result-document-unnamed` fires only on a result with an `acs` list and `result-unparseable` stays reachable (the review's fix).
- Test order deviation: the engine change came before the new tests. The 8 existing tests it reversed went red first (66 pass / 8 fail). Each new test's red was then shown by its mutation, not by test-first.
- Mutation proofs (each reverted, and the suite then green again):

  | # | Mutation | Red test |
  | - | -------- | -------- |
  | 1 | `--doc` optional | merge with no --doc is a usage error |
  | 2 | `result-document-unnamed` removed | a result with no story_file is refused as result-document-unnamed |
  | 3 | root `story_file` fallback removed | a root story_file beside an ac_traceability block that lacks one is checked |
  | 4 | `scope-document-missing` → `-mismatch` | a scope with no document is scope-document-missing |
  | 5 | realpath branch removed | story_file naming the document through a symlink merges |
  | 6 | Step 3a scope path reverted | 10 eval cases (bash + zsh), incl. the stem-keyed scope test |
  | 7 | unnamed check on every parsed result | unparseable output writes no record |

- Eval fixtures: `AGENT_NAMED` (names this document) replaces the unnamed answer in the two merge-success cases; the "another document's result" case now creates `task.8.other` so it tests a real other document, not the new does-not-exist message.
- Local: 96/96 across the two task files; `bundle:check` 0 problems; `quick_validate` finalise ✓; prettier clean.
- CHANGELOG placement: `[Unreleased]` → `### Changed`, above task 331's entry. Step 3d checked first: it reads only Step 3c's outputs, so it needs no resume step.
- `test:remote` on .249 (`CI=true`), with the server loaded by a game: run 1 hit the 30-min limit at 8,135 ok / 0 not ok. Run 3 (90-min limit) finished 8,972 pass / 1 fail / 8,976 in 1,806 s. The failure was `call-sites.test.mjs:771` AC4 (2,876 ms vs a 2,000 ms bound), which flags itself LOAD-SENSITIVE. Re-run alone on the idle server with the runner's docker flags, 3 times: 32/32 each. Treated as load, not a defect.
- Loop audit (Explore, iteration 1): `ready-for-review`, 12/12, exit loop. Artifact `.summaries/step-3-iteration-audit-1.json`.
- Development completion comment posted to GitHub issue 963 (stage `develop-complete`, `count=12`).
- Run 2 was stopped by hand. Its lock (owner this laptop, pid 921814, dead, no container) was removed by hand, because `--unlock` would not clear it for about 60 min.

### Step 4 — create-pr

- SCOPE_PATHS: `docs/tasks/task.332.ac-merge-closes-task-331-follow-ups`, `CHANGELOG.md`, `evals/shared/tests`, `shared/resources`, `shared/resources/tests`, `skills/finalise/references`, `skills/finalise`, `skills/review-story/references`, `skills/review-task/references`.
- Pre-flight guard: 0 files held. Report links: 0 relative links, ok.

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
**Branch**: feature/task.332.ac-merge-closes-task-331-follow-ups
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}

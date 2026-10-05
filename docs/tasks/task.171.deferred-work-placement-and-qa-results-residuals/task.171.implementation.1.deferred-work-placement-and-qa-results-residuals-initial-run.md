# Implementation Report: [Task 171] Deferred Work placement and qa-results engine residuals

**Task**: `task.171.deferred-work-placement-and-qa-results-residuals.md`
**Run Number**: 1
**Started**: 2026-10-05 08:36
**Status**: In Progress

---

## Summary

Give the loop-exit Deferred Work record one home outside `## QA Testing Results`, close the `qa-results.js` residuals task.155 recorded, and make create-bug-report's task-mode check match the heading it writes.

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
| Board status        | work-started → transitioned ✅ (issue #538)                                 |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.{id}.*` exists in git                             | Branch created at `40c699bb` | —                    |
| 2. review-task             | ✅ Done    | `task.{id}.review.{N}.{name}.md` exists (or skip logged)               | READY TO IMPLEMENT 8/10; 6 Important fixed; Planned → Ready for Development | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline, 1 iteration; 4/4 phases; ci:fast 5287 pass / 0 fail | —                    |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.{id}.qa.{N}.*.md`; `task.{id}.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.{id}.dod.{N}.*.md`; task `status: accepted`                      |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-10-05

- Invoked by `/develop-next` (autonomous run; item T171, source `task-registry`).
- Phase 0 run inline (no 0a-parallel agents dispatched): input was a file path; tracker read from frontmatter (`github_issue: 538`, `TRACKER=github`).
- Pipeline mode: standard — computed from risk_level `absent` (risk_ok = true), phase_count 4 (not < 3), single_module false (touches shared/resources, qa-task, qa-story, create-bug-report, develop-* step docs).
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Task status at start: `Planned` — noted; Step 2 `/review-task` validates and promotes.
- Upfront questions (2, auto-answered per the develop-next AUTONOMOUS RUN directive, no prompt):
  - Q1 Feature branch base: develop — auto-derived recommended option (on `develop`).
  - Q2 PR target branch: develop — auto-derived recommended option.
- qa-planning gate: skipped (auto — no prompt)
- Step 1: branch `feature/task.171.deferred-work-placement-and-qa-results-residuals` created directly with `git checkout -b` from `develop` and pushed — the name is deterministic from the task filename, so `/create-branch` was not invoked; the report was written after the branch existed, so no stash/restore was needed.
- Tracker: `tracker-comment.js --stage work-started` → posted; `gh-stage.js --stage work-started --add-to-board` → transitioned. Priority-default block not run (issue created by `/create-task`, which sets priority).
- Step 2: `/review-task` run (status `Planned`, no review report). Auto-answers: output = Comprehensive report; Step 8.5 = apply all critical + important fixes; Step 9 = Yes, fixes complete. Pre-pass agents B/C not dispatched — both passes done inline (independence loss recorded in the review report).
- Review report: docs/tasks/task.171.deferred-work-placement-and-qa-results-residuals/task.171.review.1.deferred-work-placement-and-qa-results-residuals.md
- Planned promoted to Ready for Development by review-task. Tracker key unchanged at Step 2 (538). Review comments posted (`review-task`, `review` stages).

### Step 3 — Develop (2026-10-05)

- Pre-develop surface map: 14 files identified in shared/resources (qa-results.js, its tests, step-5-6 doc), skills/qa-task, skills/qa-story, skills/create-bug-report, tests/, docs/tasks (task.118, task.155) — mapped inline from the task's § 3 anchors (each verified at Step 2), no Explore subagent dispatched.
- Plan file found: docs/tasks/task.171.deferred-work-placement-and-qa-results-residuals/task.171.plan.deferred-work-placement-and-qa-results-residuals.md — included as implementation context for /develop.
- Step 3 inline — /develop not invoked: the plan names every hunk and the surface map was already recorded.
- Fast gate precondition: `develop.fastGateCommand` unset → `npm run ci:fast`, defined. Passed.
- Baseline corpus measurement (plan script, before any engine change): 164 sections, all `replaced`, 0 lost, 0 non-idempotent.
- Setext rule, first measurement: 1 refusal — task.118 (`structural-line:No critical issues identified. … / ---`), the predicted accidental heading. task.118 repaired (blank line before `---`); re-measured 164 / 0 / 0 / 0.
- Decision: the dated-row guard (`isEntryRow`) is scoped to sections inside or directly under a change log (`underLog`), not every removal — a correctly placed section may quote dated rows and replace them (G1, G2, G6, O4). Applying it everywhere would have refused those.
- Decision: REL-007 marker-block variant closed by not cutting at a Date table that lies after the block's own log table (`logAbove`); the quoted rows then fall in the span and are refused. G4 (a misplaced section quoting a dated table) now refuses instead of relocating — the stated direction.
- Decision: REL-024 also needed a render-side rule — a section at the canonical position sits before the change-log block, where a trailing comment is still peeled as lead-in; a render ending in an HTML comment is refused (`trailing-comment`). One detail value beyond the five the task listed; `read-back:<n>` was added for `unplaceable` likewise.
- Decision: `multiple` keeps `count` and adds `detail: multiple:<n>`; both Step 12 halts print `detail` in place of the old `(<n> sections)` suffix and gained a `bad-section` repair hint (task.155 REL-019).
- Performance bound: `time command node --test shared/resources/tests/qa-results.test.mjs tests/qa-results-corpus.test.js tests/qa-results-step12-wiring.test.js` → real 1.78s (< 2s). Corpus file alone 1.77s.
- `npm run ci:fast`: 5288 tests, 5287 pass, 0 fail, 1 skipped. `bundle:check` 0 problems; `quick_validate` ✓ for qa-task, qa-story, create-bug-report, develop-task, develop-story; prettier clean.

#### Mutation proofs (each reverted from a snapshot, restored, `cmp`-verified)

| # | Mutation | Red tests |
|---|---|---|
| M1 | dated-row guard off | G4, O1, O2, O3 |
| M2 | setext check off | O5 |
| M3 | nesting dedupe off (REL-028) | O10 |
| M4 | level bound back to `#{1,3}` (REL-025) | O7 |
| M5 | bold-label start off (REL-027/030) | O8, O9, placement test 3 |
| M6 | fold label dropped (CR-4) | O11 |
| M7 | comment always peeled (REL-024) | O6 |
| M8 | EOL forced to LF (CRLF) | O12 |
| M9 | CR-5 detection off | O13 |
| M10 | `bad-section` detail dropped (CR-1) | O5, O6, O14 |
| M11 | REL-007 `logAbove` off | O3 |
| M12 | `trailing-comment` refusal off | O6 |
| M13 | carried order reversed (CR-3) | N2 |
| M14 | `underLog` default true | O4 (after adding its render assertion — the first run survived) |
| M14b | `underLog` forced at replace | G1, G2, G6, O4 |
| M15 | create-bug-report check reverted to H2 | heading test 1 |
| M16 | route 2b restates instead of pointing | placement test 4 |
| M17 | worked example as `###` | placement tests 1, 2 |
| S1 | engine refuses every replace | corpus survey (false refusals) |
| S2 | replace drops the lines after the section | corpus survey (deletions) |
| S3 | replace appends a byte | corpus survey (non-idempotent) |

The first survey mutation (counting structure over the whole text) stayed green: it altered the instrument, not the engine, so it proved nothing; S1–S3 replace it.

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
**Branch**: feature/task.171.deferred-work-placement-and-qa-results-residuals
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}

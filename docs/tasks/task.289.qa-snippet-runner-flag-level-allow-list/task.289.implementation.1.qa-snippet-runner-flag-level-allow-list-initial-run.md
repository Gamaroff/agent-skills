# Implementation Report: QA snippet runner allows flags, not just commands

**Task**: `task.289.qa-snippet-runner-flag-level-allow-list.md`
**Run Number**: 1
**Started**: 2026-11-09 13:27
**Status**: In Progress

---

## Summary

Replace the snippet runner's flag-level deny-list with a per-command flag and operand allow-list, closing the seven known write gaps and deciding the 17 refused doc blocks.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | feature/task.289.qa-snippet-runner-flag-level-allow-list (already checked out) |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set                                                                    |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, tech-stack.md, source-tree.md |
| Board status        | N/A (no issue linked)                                                      |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.{id}.*` exists in git                             | already checked out | —                    | 2026-11-09T13:59Z |
| 2. review-task             | ✅ Done | `task.{id}.review.{N}.{name}.md` exists (or skip logged)               | skipped: review 1 current | —                    | 2026-11-09T13:59Z |
| 3. develop                 | ✅ Done | Task status == `Ready for Review`                                      | inline; fast gate green | —                    | 2026-11-09T13:59Z |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.{id}.qa.{N}.*.md`; `task.{id}.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.{id}.dod.{N}.*.md`; task `status: accepted`                      |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-09

- Feature branch base: feature/task.289.qa-snippet-runner-flag-level-allow-list — asked; already checked out, one docs commit ahead of develop
- PR target branch: develop — asked; recommended
- qa-planning gate: skipped (auto — no prompt)
- Observe-work session start: workspace healthy, 86 entries scanned, last review 2026-11-06, no review offered
- Lite-mode inputs (Agent 3 not dispatched; derived inline): risk_level absent, phase_count 5, single_module true → standard (phase_count ≥ 3)
- Tracker: no `github_issue` / `jira_key` in frontmatter → tracker signals skipped

### Step 2 and Step 3 decisions — 2026-11-09

- **Step 2 skipped**: review 1 is current and its blob matched the task document.
- **Step 3 ran inline** (plan file found; surface map done inline without an Explore subagent, so independence was lost). An advisor review stood in for it; no Explore loop audit ran.
- **Owner decision**: accept the refusal of the 17 blocks, no value tracking (asked via AskUserQuestion). Recorded in the task Change Log.
- **Baseline**: 18 blocks change from non-mutating to mutating between the pre-task-274 engine and develop (klass-change definition, `compare.mjs`). Newly refused by this task against develop: 1 block (`tail -f`, `skills/loop-supervisor/README.md:271`); none newly runnable. The two `diff "$OBS_STAGING_DIR/…"` blocks were first refused, then restored by giving `diff` `expansionOk` (no `diff` flag writes a file or runs a chosen program).
- **"A named test per member"**: read as: members with `ANY_FLAG(why)` carry an audit note, checked by the table audit test (31 members, orphan check); the eight explicit entries each have a refusal test.
- **Deviation from Phase 3 "remove entries"**: `DENY_PATTERNS` and the variable-argument rule stay beside the table. They are the only check on `git`, `gh`, `rm`, `curl`, `tee`, and four tests pin their `deny-list:` reasons (`git grep -n 'deny-list:' -- '*.test.*'`).
- **`no-table-entry` literal**: `flag-not-allowed: <cmd> no-table-entry (fail-closed)`, tested by temporarily adding `zzaudit` to `SAFE_COMMANDS`.
- **Mutation proofs**: 15 checks (`<>`, function shadowing, generic loop, find, sed branch, sed verdict, brace, IFS, word-splitting, collapsed `hidden`, forwarded sed rule, `maxOperands`, `date` operand, sed-script variable, sed separator) each turned a named test red, then were restored.
- **Timing**: docs scan was +22% on first measure; after computing `stripNonCode` once and making the variable maps lazy, six alternating pairs at load ~1.5 gave new 460–487 ms vs develop 472–499 ms. `CI=true npm test` wall time vs develop not measured yet.
- **Not done**: Phase 5 (`ctx-wrap-` leak, optional); full `CI=true npm run ci` (only `ci:fast`, exit 0).

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
**Branch**: {populated after Step 1}
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}

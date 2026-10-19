# Implementation Report: Snippet engine runs pipeline blocks

**Task**: `task.191.snippet-engine-runs-pipeline-blocks.md`
**Run Number**: 1
**Started**: 2026-10-19 06:45
**Status**: In Progress

---

## Summary

Give `qa-execute-snippets.mjs` `--slot`, helper-call recognition and `--diff-base` changed-block reporting, and wire qa-task Step 4b / qa-story Phase 1.7 to them (obs #186, #219, #278).

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
| Board status        | In Progress ✅ (gh-stage `transitioned`; Priority already P2 Medium)       |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.191.*` exists in git                              | Branch created at `faefb677` | —                    | 2026-10-19T04:41Z |
| 2. review-task             | ✅ Done    | `task.191.review.{N}.{name}.md` exists (or skip logged)                | review.1 — READY 8/10; Planned → Ready for Development | —                    | 2026-10-19T04:45Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 1 iteration inline; 4 phases; ci:fast 5846/0; develop-complete posted | —                    | 2026-10-19T04:58Z |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.191.qa.{N}.*.md`; `task.191.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.191.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-10-19

- Invoked by `/develop-next` (registry fallback, task-registry line 235) with `--defaults` — AUTONOMOUS RUN directive.
- Phase 0 run inline (no Explore subagents); lite-mode inputs derived by hand: risk_level absent, phase_count 4, single_module false → PIPELINE_MODE=standard.
- Feature branch base: develop — source: recommended (`--defaults`, no conflict)
- PR target branch: develop — source: recommended (`--defaults`, no conflict)
- Mode: standard — source: detector. Skips: none. Refused: none.
- Questions asked: 0 (`pipeline-answers.js` returned `questions: []`).
- qa-planning gate: skipped (auto — no prompt)
- Task status at start: Planned — Step 2 (`/review-task`) validates and promotes.
- Always-load files resolved: 3 files — coding-standards.md, tech-stack.md, source-tree.md
- Branch: `feature/task.191.snippet-engine-runs-pipeline-blocks` from develop at `faefb677`, pushed with upstream. Report stashed before branch creation, restored after.
- Tracker: work-started comment `posted`; GitHub board: work-started → transitioned (In Progress). Priority unchanged (already P2 Medium).

### Step 2 — review-task

- Status Planned + no review report → ran `/review-task` (output: Comprehensive report — required for pipeline audit trail).
- review-task Step 8.5 auto-answered: Yes, apply all critical + important fixes. Step 9 auto-answered: Yes, fixes complete.
- Review report: docs/tasks/task.191.snippet-engine-runs-pipeline-blocks/task.191.review.1.snippet-engine-runs-pipeline-blocks.md (READY TO IMPLEMENT, 8/10, 0 critical / 3 important / 6 optional).
- Fixes applied to the task: I1 helper calls refused after `cd`/`pushd`/`popd` (fail-open the plan left open); I2 dogfood seeding `--copy-as skills:.agents/skills` for a symlinked `.agents/skills`; I3 parity test path; anchors re-measured at `faefb677`.
- Planned promoted to Ready for Development by review-task. `reviewed_blob` stamped (written).
- Review outcome comment skipped — review-task reported `posted` (stage review-task). Tracker key unchanged (590).
- Pre-pass Agents B/C not dispatched — review passes ran inline; independence lost.

### Step 3 — develop (iteration 1, inline)

- Implemented inline (no subagent): all four phases in one iteration.
- Engine: `applySlots` + `--slot` (filled BEFORE classification); helper mode + `resolveHelperCall` (literal slash path, realpath inside the copy, regular `.sh`, own text runnable to depth 2, no `cd`/`pushd`/`popd`); `commandInvocations` records `cd` as a marked keyword entry so `commandWords` output is unchanged; `--diff-base` via `changedLineRanges`/`parseDiffRanges`, `changed` summary, `changed-blocks-not-executed` (medium).
- Helper population re-measured: 3 of 32 `shared/resources/*.sh` runnable in helper mode (`bitbucket-auth.sh`, `newest-numbered.sh`, `qa-cycle.sh`); the test pins that set.
- Mutation proofs (each reverted, `cmp`-verified restore): (1) drop the "helper text classifies runnable" refusal → `T191 helpers: every control stays refused` red; (2) classify `block.code` instead of the slot-filled code → 4 T191 tests red incl. the `; rm -rf x` case; (3) disable the directory-change refusal → `T191 helpers: a block that changes directory…` red; (4) drop `--diff-base` from qa-story's call → parity test red.
- Docs: rule doc §2aa (helper rule), §2c (`--slot`), §4a (change set); qa-task Step 4b and qa-story Phase 1.7 carry the same engine call (`--diff-base "$BASE" --copy-as .agents:.agents`) — the parity test asserts they match modulo skill name.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Step 3 — review miss (check 15).** The review said no test pins the `--bind` detail; `bug.7: a placeholder present keeps it a finding, with the --bind remedy` asserted `/--bind/` on an `echo {id}` slot block. Updated to `--slot` (the correct remedy for a slot), and a new test holds the `--bind` arm for unbound variables.
- **Step 3 — `<id>` mid-line is a write redirection.** `echo <id> more` classifies `write-redirection` before the slot check (pre-existing, correct for `cat <a> b`). Not changed; the test places the angle slot last.

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: feature/task.191.snippet-engine-runs-pipeline-blocks
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}

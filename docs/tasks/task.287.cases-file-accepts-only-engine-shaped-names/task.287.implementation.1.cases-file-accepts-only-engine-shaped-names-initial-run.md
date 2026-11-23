# Implementation Report: cases_file accepts only engine-shaped names

**Task**: `task.287.cases-file-accepts-only-engine-shaped-names.md`
**Run Number**: 1
**Started**: 2026-11-23 12:44
**Status**: In Progress
**Report format**: 2

---

## Summary

Add a basename-shape check to `resolveCasesFile` so the security probe plan's `cases_file` route refuses any file name the engine does not itself write (develop-next run for T287).

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set                                                                    |
| Pipeline mode       | standard                                                                   |
| Always-load files   | defaults (resolved in Step 3)                                              |
| Board status        | N/A (no issue linked)                                                      |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.287.*` exists in git                              | Branch created at `6c867b9a6` | —                    | 2026-11-23T12:45Z |
| 2. review-task             | ✅ Done    | `task.287.review.{N}.{name}.md` exists (or skip logged)                | READY TO IMPLEMENT, 8/10; 0 critical, 4 important, 2 optional, all applied | —                    | 2026-11-23T12:58Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 1 iteration, inline; fast gate green (8741 tests, 0 fail) | —                    | 2026-11-23T13:03Z |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.287.qa.{N}.*.md`; `task.287.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.287.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-23

- Feature branch base: develop — source: recommended (`--defaults`)
- PR target branch: develop — source: recommended (`--defaults`)
- Mode: standard — source: detector (3 phases, so not lite; risk_level absent; single module)
- qa-planning gate: skipped (auto — no prompt)
- Tracker: none — the task carries no `github_issue:` or `jira_key:`; tracker signals are skipped.
- Always-load files: resolved with the defaults; no `skills-config.yaml` override read.
- Phase 0 ran inline, with no Explore subagents (0a-parallel Agents 1–3 not dispatched): the task path was given, there is no tracker issue to poll, and the lite-mode inputs were read straight from the document.

- Implementation report stashed before branch creation, restored after.
- Lock written at `current_step: 2` with the resolved answers persisted.

### Step 2 — Review

- review-task invoked inline. Output: Comprehensive report — required for pipeline audit trail. Report: `task.287.review.1.cases-file-accepts-only-engine-shaped-names.md`.
- review-task Step 8.5 auto-answered: Yes, apply all critical + important fixes — pipeline proceeds autonomously.
- review-task Step 9 auto-answered: Yes, fixes complete — status `planned` → `ready-for-development`.
- Review pre-pass Agents B and C were not dispatched (inline review); independent architecture and already-implemented scans did not run.
- Finding worth carrying forward: the task's measured population was stale (31 committed plans, not 2; `task.304.dod.1.security.plan.json` names a non-engine file that is not tracked). Fixed in the task document.
- Tracker comment skipped: no linked issue.

### Step 3 — Develop

- Plan file found: `task.287.plan.cases-file-accepts-only-engine-shaped-names.md` — included as implementation context.
- Pre-develop surface map: 6 files identified, in `shared/resources` (engine, prompt, tests) and `skills/finalise` (SKILL.md and three generated copies). Built inline with no Explore subagent, from the review's own measurements; independent mapping did not run.
- Step 3 inline — /develop not invoked: a 47-line plan names every hunk and the surface was already measured in Step 2.
- Planned/Draft gate: n/a (status was `ready-for-development`). Fast-gate precondition: `npm run ci:fast` is defined.
- Loop audit run inline (no subagent): all 3 phases ticked, 1 iteration, no stall.
- Found beyond the plan: a second pre-existing test, `resolveCasesFile: a directory, an absolute name and a NUL are refused`, called `resolveCasesFile` directly with `d` and `in.json`, so a search for `cases_file` missed it. It went red on the first run and was re-pointed. The review's literal sweep should search the function's name as well as the argument key.
- Added: 5 tests (accepted shapes, refused shapes, order before `lstat` and after confinement, the two refusal reasons, a corpus control over the 31 committed plans). Mutation proof: with the check disabled, 4 of the 5 go red and the accepted-shape test stays green; 16 of 16 pass restored.
- Fast gate: `npm run test:remote` on the LAN server — `TEST_EXIT=0`, 8741 tests, 8738 pass, 0 fail.
- `npm run bundle` then `npm run bundle -- --check`: 129 skills, 0 problems. CHANGELOG placement: bullets below the first release heading 974 at merge base and 974 now.
- Change Log row written once (inline path).
- Tracker comment skipped: no linked issue.

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
**Branch**: feature/task.287.cases-file-accepts-only-engine-shaped-names
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}

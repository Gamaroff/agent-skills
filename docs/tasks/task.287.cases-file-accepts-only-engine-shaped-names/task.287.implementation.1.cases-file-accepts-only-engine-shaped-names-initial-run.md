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
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #933 | —                    | 2026-11-23T13:12Z |
| 5–6. qa-task / qa-fix loop | ✅ Done | `task.287.qa.{N}.*.md`; `task.287.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted | 1 cycle, gate PASS 95; 5c APPROVE | —                    | 2026-11-23T13:11Z |
| 7. finalise                | ✅ Done    | `task.287.dod.{N}.*.md`; task `status: accepted`                       | ACCEPTED, 13/13 AC; CI reading 1 SUCCESS @ `4b72c73bd35f`, reading 2 SUCCESS @ `475d85055` (tree-equivalent to `62d5eb096d6d`); canonical PR comment posted | —                    | 2026-11-23T14:44Z |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | Final report committed with this row | —                    | 2026-11-23T14:44Z |

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

### Step 4 — Create PR

- SCOPE_PATHS: the task dir, `CHANGELOG.md`, `shared/resources`, `shared/resources/tests`, `skills/finalise`, `skills/finalise/references`, `skills/qa-story/references`, `skills/qa-task/references`.
- Pre-flight guard: no out-of-scope untracked files; nothing held. Leak check: none.
- Report links checked before the push: `doc-links.js` exit 0.
- Two commits on the branch: `51679a8da` (code) and `62d5eb096` (task documents). PR body written to a file with the file tool; no `--issue` (no linked issue); the in-review tracker comment was skipped for the same reason.
- PR created: https://github.com/Gamaroff/agent-skills/pull/933 (base `develop`). Post-PR state: OPEN. Explore state-poller subagent not dispatched; state read with `gh pr view`.

### Steps 5–6 — QA loop

- Cycle 1: `/qa-task` gate PASS (95/100), 0 open entries, so the route went straight to 5c; no `/qa-fix` ran. Code review by one Explore subagent (1 low advisory finding, CR-1); mutation proof 4 of 5 red; security probe engaged, 8 executed, 0 reproduced; read-back clean.
- Gate and QA report committed and pushed once (`4b72c73bd`) before 5c; trail asserted on the branch.
- 5c: `/review-pr --effort medium --comment --no-code` (conformance lens only, one Explore subagent): APPROVE, 2 low consistency findings (no `pr_number` in frontmatter; Success Criteria boxes unticked). `OPEN_COVERAGE=0`. Not fixed in 5c: `/finalise` records the PR number and ticks the criteria itself. Review comment posted to PR #933.
- The traceability mapper and `record_criteria` token were not passed (see the Issues Log).

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **QA cycle 1 was dispatched without the pipeline's args.** `/qa-task` ran with the bare task path, so `code_review_blocking=true` and `record_criteria` were not passed. Effect measured afterwards: the only code-review finding (CR-1) is low severity and medium confidence, so a blocking resolution would not have changed the gate; and the two criteria that name the QA report as their record (the slowest-test timing and the mutation proof) were written there anyway, and `finalise-record-preflight.js check` lists exactly those two. Cycle 2 and later runs pass the tokens.
- **The stock `path` probe corpus now reads `unverifiable`** (`rejects-every-input`) against `casesFileAccepted`, because its legitimate names are not engine-shaped. That is the intended effect of this task. QA probed with a cases file instead (8 executed, 0 reproduced); a DoD probe of the same entry will need one too.

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-11-23
**Gate Result**: PASS
**Issues Found**: none blocking; 1 advisory (CR-1, the pattern also accepts the bare name `.security.cases.json` and zero-padded indices) carried to `recommendations.future`
**HIGH findings**: 0
**MEDIUM findings**: 0
**Traceability**: skipped (no Success Criteria table)
**PR Review**: APPROVE
**Loop exit**: n/a — this exit not taken
**Action**: Proceeding to 5c (PR conformance review)

---

## Completion

**Finished**: 2026-11-23T14:44Z
**Final Status**: Completed
**Branch**: feature/task.287.cases-file-accepts-only-engine-shaped-names
**PR**: #933 — https://github.com/Gamaroff/agent-skills/pull/933
**QA Iterations**: 1
**DoD Summary**: `task.287.dod.1.cases-file-accepts-only-engine-shaped-names.md` — ACCEPTED
**Tracker debt**: none (the task has no tracker issue)

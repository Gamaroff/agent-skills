# Implementation Report: Authoring and fix steps state the rules they keep missing

**Task**: `task.283.authoring-and-fix-steps-state-the-rules-they-keep-missing.md`
**Run Number**: 1
**Started**: 2026-11-19 20:45
**Status**: In Progress
**Report format**: 2

---

## Summary

Add four missing rules (CHANGELOG placement check, create-task multi-task path with issue-body renderer, parser-widening importer audit, `command node` wrapper trap) as four independent phases plus bundle and sweep.

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
| Board status        | N/A (no issue linked)                                                      |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.283.*` exists in git                              | Branch created at `96a59c58c` |  —                    | 2026-11-19T20:46Z |
| 2. review-task             | ✅ Done | `task.283.review.{N}.{name}.md` exists (or skip logged)                | Review 1: 8/10, READY TO IMPLEMENT; 9 Important fixed in task and plan; status promoted | —                    | 2026-11-19T20:49Z |
| 3. develop                 | ✅ Done | Task status == `Ready for Review`                                      | Inline; 4 rules + renderer; CI gate 8629 tests, 0 fail on LAN server (3rd run; run 2 caught 2 real defects, fixed) | —                    | 2026-11-19T22:35Z |
| 4. create-pr               | ✅ Done | PR URL; issue comment posted                                           | PR #922 (https://github.com/Gamaroff/agent-skills/pull/922), base develop; no linked issue, so no comment | —                    | 2026-11-19T22:36Z |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.283.qa.{N}.*.md`; `task.283.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.283.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-19

- Feature branch base: develop — source: recommended (`--defaults` from /develop-next)
- PR target branch: develop — source: recommended (`--defaults` from /develop-next)
- qa-planning gate: skipped (auto — no prompt)
- Mode: standard — source: detector (risk_level absent, 5 phases, so not lite)
- Questions asked: 0 (`--defaults` with nothing in conflict)
- Always-load files resolved: 3 files — from skills-config.yaml devLoadAlwaysFiles
- Phase 0a-parallel run inline (no subagents); lite-mode inputs read from the document: risk_level absent, phase_count 5, success-criteria section present
- Tracker: GitHub, no `github_issue` on the task, so tracker signals are skipped
- review-task output: Comprehensive report — required for pipeline audit trail
- review-task Step 8.5 auto-answered: Yes, apply all critical + important fixes — pipeline proceeds autonomously
- review-task Step 9 auto-answered: Yes, fixes complete — status promoted Planned → Ready for Development
- review-task pre-pass Explore agents not dispatched (run inline); independent review did not run for the pre-pass
- Review report: docs/tasks/task.283.authoring-and-fix-steps-state-the-rules-they-keep-missing/task.283.review.1.authoring-and-fix-steps-state-the-rules-they-keep-missing.md

### Step 3 — develop — 2026-11-19

- Plan file found: docs/tasks/task.283.authoring-and-fix-steps-state-the-rules-they-keep-missing/task.283.plan.authoring-and-fix-steps-state-the-rules-they-keep-missing.md
- Pre-develop surface map: 14 files, written from the plan's phase hunks (Phase 1: develop-loop doc, review-task, new test; Phase 2: create-task, ensure-task-github-issue, sync-github-task, renderer, new test, ratchet; Phase 3: develop-bug reference and SKILL.md, qa-fix; Phase 4: traps.md)
- Step 3 inline — /develop not invoked: plan names every hunk; `/develop` would only have re-read it
- sync-github-task: carried, not out of scope — it also hand-built the body, so it now calls the same renderer (create→update stays diff-stable)
- Renderer strips a section's closing `---` before summarising: left in, the shared summariser counted it as an omitted block and printed a spurious "+1 more"
- Bundling the renderer pulls `jira-sync.js`, `change-log.js` and `tracker-workflow.js` into both GitHub task skills' `references/`: the price of reusing the one card definition instead of copying it
- Payload-heredoc ratchet: removed the `ensure-task-github-issue` ISSUE entry; floor 32 → 31
- Mutation proofs: CHANGELOG block (position test removed → control fails; insertion-only test removed → edit case fails); renderer (links, effort key, item cap each → red). All restored
- Not verified: the create-task multi-task path states a procedure and no test holds it

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-11-19
**Gate Result**: CONCERNS
**Issues Found**: 5 medium (no CHANGELOG entry; sync-github-task calls the renderer against the Migration criterion; wall time unmeasured; render block leaves inputs unbound; CHANGELOG block fails open on an unfetched base), 1 low (vacuous control test)
**HIGH findings**: 0
**MEDIUM findings**: 5
**Traceability**: skipped (no Acceptance Criteria section)
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)

#### qa-fix (5b)

| Finding | Fix | Held by |
| ------- | --- | ------- |
| T283-QA-1 | `[Unreleased]` entry citing task 283 added | `changelog-cites.sh task.283` → `cites`; Step 3 block run on the real tree → exit 0 |
| T283-QA-2 | `sync-github-task/SKILL.md` restored to `origin/develop` plus one scoping sentence; four unreached bundled copies `git rm`'d | `git diff origin/develop --stat` is one line; `bundle --check` 0 problems |
| T283-QA-4 | `:` guards on `TASK_RELATIVE_PATH` and `DOC_URL` in the render block | not executed by a test (prose guard) |
| T283-QA-5 | `rev-parse --verify` then HALT; exit above 1 from `git diff` HALTs | two new tests ×2 shells; both mutations red, restored |
| T283-QA-6 | vacuous control replaced by a renderer call on the empty-key shape | renderer test file, 6 pass |
| T283-QA-3 | **Not fixed.** The 10%-wall-time bound is unmeasured; a criterion edit needs a named approver | left `open` |

Probe: git grep for the CHANGELOG-block phrase over SKILL.md, shared resources, hand-authored references: the one source and its three generated copies, all regenerated by `npm run bundle`.
Population: 1 source (3 generated copies)
Move: patch: the findings are distinct defects in the deliverable itself.
Importer audit: no shared parser widened; skipped.

### QA Cycle 2 — 2026-11-20
**Gate Result**: CONCERNS (80/100)
**Issues Found**: 3 new medium (CHANGELOG block passes a mixed hunk; passes a non-`v` heading style and a `*` bullet; renderer prints the priority un-normalised), 1 medium carried (wall time unmeasured), 3 low advisory
**HIGH findings**: 0
**MEDIUM findings**: 4
**Traceability**: skipped (no Acceptance Criteria section)
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)

#### qa-fix (5b)

| Finding | Fix | Held by |
| ------- | --- | ------- |
| T283-QA-7 | per-hunk rule: a hunk adding more bullets than it removes holds new entries | mixed-hunk test ×2 shells; mutation (old `old == 0` rule) red |
| T283-QA-8 | heading `## [v` or `## [<digit>`; bullet `-` or `*`; explicit note when no release heading | three tests ×2 shells; three mutations red |
| T283-QA-9 | `priorityCell`: lowercase, default `medium` | renderer tests; mutation (raw cell) red |
| T283-QA-3 | **Not fixed.** Unmeasured; a criterion edit needs a named approver | left `open` |

Probe: `git grep -F -i -e 'first release heading' -e '## [v'` over SKILL.md, shared resources and hand-authored references
  shared/resources/develop-pipeline-step-3-develop-loop.md — updated
  skills/review-task/SKILL.md — updated (restated the heading rule)
Population: 2 (first phrase `pure insertion` returned 0 after the edit removed it, so the probe was re-run on the observable that changed)
Move: patch: three distinct defects in the deliverable itself; the rule is stated once in the shared source.
Importer audit: no shared parser widened; skipped.

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: feature/task.283.authoring-and-fix-steps-state-the-rules-they-keep-missing
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}

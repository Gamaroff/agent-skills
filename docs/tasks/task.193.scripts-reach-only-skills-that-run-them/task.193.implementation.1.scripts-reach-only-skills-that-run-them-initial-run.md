# Implementation Report: Scripts reach only the skills that run them

**Task**: `task.193.scripts-reach-only-skills-that-run-them.md`
**Run Number**: 1
**Started**: 2026-10-19 10:20
**Status**: In Progress

---

## Summary

Classify the prose `shared/resources/<script>` literals in `shared/resources/*.md`, switch the unneeded ones to bare filenames and remove their unreached copies, and add a guard + create-skill pin (develop-next autonomous run).

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
| Board status        | In Progress ✅ (work-started: transitioned; Priority already P2 Medium)    |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.193.*` exists in git                             | Branch created at `eb44b9c3`; pushed | —                    | 2026-10-19T08:17Z |
| 2. review-task             | ✅ Done    | `task.193.review.{N}.{name}.md` exists (or skip logged)               | review.1 — READY TO IMPLEMENT 8/10; 1C/2I/2O fixed; Planned → Ready for Development | —                    | 2026-10-19T08:21Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline (iter 1); 11 literals switched, 17 copies removed, guard test (6) added; `ci:fast` 5903/0 fail | —                    | 2026-10-19T08:29Z |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.193.qa.{N}.*.md`; `task.193.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.193.dod.{N}.*.md`; task `status: accepted`                      |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-10-19

- Invoked by `/develop-next` (registry fallback, task-registry line 237) with `--defaults`; Phase 0 run inline (no Explore subagents dispatched).
- Feature branch base: develop — source: recommended (`--defaults`; on `develop`)
- PR target branch: develop — source: recommended (`--defaults`)
- Mode: standard — source: detector (inline derivation: risk_level absent → risk_ok true; phase_count 4 ≥ 3 → not lite; single_module false — touches shared/resources, skills/*/references, tests, CHANGELOG)
- Skips: none. Refused flags: none. Questions asked: 0 (`questions[]` empty).
- qa-planning gate: skipped (auto — no prompt)
- Status at start: `planned` — proceed; Step 2 `/review-task` validates.
- Branch: `feature/task.193.scripts-reach-only-skills-that-run-them` from `develop` @ `eb44b9c3`; report stashed before branching and restored.
- Tracker: work-started comment posted on #592; GitHub board: work-started → transitioned (In Progress).
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md


### Step 2 — review-task

- review-task invoked (status `Planned`, no prior report). Output: Comprehensive report (pipeline default). Step 8.5 auto-answered: apply all critical + important fixes. Step 9 auto-answered: Yes, fixes complete.
- Review report: `docs/tasks/task.193.scripts-reach-only-skills-that-run-them/task.193.review.1.scripts-reach-only-skills-that-run-them.md` — READY TO IMPLEMENT, 8/10; `reviewed_blob` stamped.
- Fixes: C1 pin re-specified (old form: it failed on today's text — measured); I1 running-line rule = command token immediately before the path (+ `Engine source:` / prose-`from` control fixtures); I2 removed-literal test search added to plan; O1/O2 anchors + population (37 on `eb44b9c3`).
- Pre-pass Agents B/C not dispatched — review run inline; independence loss recorded in the report.
- Planned promoted to Ready for Development by review-task. Tracker key unchanged (#592) — no work-started re-fire.
- Review outcome comment skipped — review-task reported `posted` (stage review-task).

### Step 3 — develop

- Pre-develop surface map: measured inline during Step 2 (no Explore dispatch — independence loss recorded): `shared/resources/*.md` (59 docs, 37 prose script literals), `skills/*/references/` copies, `skills/develop-bug/SKILL.md`, `tests/lib/markdown-section.js`, `tests/bundle-comment-origin.test.js` (style), `CHANGELOG.md`.
- Plan file found: `task.193.plan.scripts-reach-only-skills-that-run-them.md` — included as implementation context.
- Step 3 inline — /develop not invoked: plan names every hunk and the surface map was measured in Step 2; the Task Completion Checklist items (checkboxes, status, one Change Log row, tests) are satisfied below.
- Fast-gate precondition: `develop.fastGateCommand` unset → `npm run ci:fast`, which `npm run` lists. Gate run with `.agents/skills` moved aside (memory: the gitignored symlink masks CI failures): **TEST_EXIT=0, 5903 tests, 0 fail**.
- Loop audit run inline (no Explore dispatch): all 4 phases `[x]`, status `ready-for-review` → exit loop after iteration 1.

#### Phase 1 classification (`eb44b9c3`)

Population: `shared/resources/*.md`, outside fences, `shared/resources/<name>.(sh|js|mjs)` not preceded immediately by a command token and not in a cite wrapper — the rule `tests/shared-script-literals.test.js` now holds. Witness = a line in the bundling skill that runs **its own** copy (`.agents/skills/<s or {…s…}>/references/X` or bare `references/X` after a command token; or, inside a bundled script, `require('./X')` / `path.join(HERE, "X")`). Command: the scanner in the scratchpad (`classify.mjs`), re-checked by hand for every not-needed row and for every `UNREACHED` copy `bundle:check` then printed.

| Literal | Script | Verdict | Bundlers with a witness / without |
| --- | --- | --- | --- |
| `develop-pipeline-autonomous-defaults.md:40` | `resolve-platform.sh` | needed | develop-bug, develop-story, develop-task, qa-fix, qa-story, qa-task, review-pr, review-story, review-task |
| `develop-pipeline-lite-mode.md:35` | `tracker-comment.js` | **switched** | no witness: review-pr|
| `develop-pipeline-resume-contract.md:614` | `grant-qa-cycles.sh` | **switched** | no witness: develop-bug, qa-story, qa-task, review-pr|
| `develop-pipeline-step-0-resolve-and-prepare.md:420` | `tracker-comment.js` | **switched** | no witness: review-pr|
| `develop-pipeline-step-0-resolve-and-prepare.md:512` | `gh-stage.js` | **switched** | no witness: review-pr, review-story, review-task (review-story/review-task cite step-0 — no fan-out)|
| `develop-pipeline-step-0-resolve-and-prepare.md:729` | `pipeline-answers.js` | **switched** | no witness: review-pr, review-story, review-task (review-story/review-task cite step-0 — no fan-out)|
| `develop-pipeline-step-0-resolve-and-prepare.md:821` | `report-lint.js` | **switched** | no witness: review-pr, review-story, review-task (review-story/review-task cite step-0 — no fan-out)|
| `develop-pipeline-step-2-review.md:78` | `review-report-freshness.js` | needed | develop-story, develop-task |
| `develop-pipeline-step-2-review.md:201` | `tracker-comment.js` | needed | develop-story, develop-task |
| `develop-pipeline-step-3-develop-loop.md:327` | `tracker-comment.js` | needed | develop-bug, develop-story, develop-task |
| `develop-pipeline-step-4-create-pr.md:293` | `gh-stage.js` | needed | develop-bug, develop-story, develop-task |
| `develop-pipeline-step-4-create-pr.md:331` | `tracker-comment.js` | needed | develop-bug, develop-story, develop-task |
| `develop-pipeline-step-5-6-qa-loop.md:16` | `grant-qa-cycles.sh` | needed | develop-story, develop-task |
| `develop-pipeline-step-5-6-qa-loop.md:79` | `set-qa-phase.sh` | needed | develop-story, develop-task |
| `develop-pipeline-step-5-6-qa-loop.md:125` | `gh-stage.js` | needed | develop-story, develop-task |
| `develop-pipeline-step-5-6-qa-loop.md:713` | `qa-diminishing-returns.js` | needed | develop-story, develop-task |
| `develop-pipeline-step-7-finalise.md:220` | `stakeholder-summary-cli.js` | needed | develop-bug, develop-story, develop-task, qa-story, qa-task, review-pr |
| `develop-pipeline-step-7-finalise.md:222` | `tracker-comment.js` | **switched** | no witness: review-pr|
| `develop-pipeline-step-7-finalise.md:318` | `tracker-comment.js` | **switched** | no witness: review-pr|
| `develop-pipeline-step-7-finalise.md:318` | `tracker-issue.js` | needed | develop-bug, develop-story, develop-task, qa-story, qa-task, review-pr |
| `develop-pipeline-step-7-finalise.md:342` | `gh-stage.js` | **switched** | no witness: qa-story, qa-task, review-pr|
| `develop-pipeline-step-7-finalise.md:437` | `handover-render.js` | **switched** | no witness: qa-story, qa-task, review-pr|
| `develop-pipeline-step-7-finalise.md:438` | `handover-verify.js` | **switched** (cascade) | its only witness in qa-story, qa-task, review-pr was their `handover-render.js` copy, removed by the row-437 switch |
| `develop-pipeline-step-8-commit.md:50` | `report-lint.js` | needed | develop-bug, develop-story, develop-task |
| `finalise-dod-security-prompt.md:151` | `security-input-corpus.mjs` | needed | finalise, qa-story, qa-task |
| `finalise-dod-security-prompt.md:179` | `security-probe.mjs` | needed (hand witness) | finalise: `references/security-probe-plan.mjs:82` loads `path.join(HERE, "security-probe.mjs")`; qa-story `SKILL.md:1159`, qa-task `SKILL.md:669` |
| `jira-transition-protocol.md:9` | `jira-stage.js` | needed | develop-bug, develop-story, develop-task, finalise, qa-story, qa-task, review-pr |
| `platform-detection.md:9` | `resolve-platform.sh` | needed | create-epic, create-issue, create-pr, create-story, create-task, develop-batch, develop-bug, develop-next, develop-story, develop-task, ensure-bug-github-issue, ensure-bug-jira-issue, ensure-epic-github-issue, ensure-epic-jira-issue, ensure-story-github-issue, ensure-story-jira-issue, ensure-task-github-issue, ensure-task-jira-issue, finalise, jira-epic-creator, jira-sprint-manager, jira-sprint-retrospective, jira-sprint-review-prep, qa-fix, qa-story, qa-task, review-bug, review-code, review-epic, review-pr, review-story, review-task, scaffold-tracker-workflow, sync-github-bug, sync-github-epic, sync-github-story, sync-github-task, sync-jira-bug, sync-jira-epic, sync-jira-story, sync-jira-task, tracker-reconcile |
| `platform-detection.md:387` | `bitbucket-auth.sh` | needed | create-epic, create-issue, create-pr, create-story, create-task, develop-batch, develop-bug, develop-next, develop-story, develop-task, ensure-bug-github-issue, ensure-bug-jira-issue, ensure-epic-github-issue, ensure-epic-jira-issue, ensure-story-github-issue, ensure-story-jira-issue, ensure-task-github-issue, ensure-task-jira-issue, finalise, jira-epic-creator, jira-sprint-manager, jira-sprint-retrospective, jira-sprint-review-prep, qa-fix, qa-story, qa-task, review-bug, review-code, review-epic, review-pr, review-story, review-task, scaffold-tracker-workflow, sync-github-bug, sync-github-epic, sync-github-story, sync-github-task, sync-jira-bug, sync-jira-epic, sync-jira-story, sync-jira-task, tracker-reconcile |
| `platform-detection.md:489` | `bitbucket-auth.sh` | needed | create-epic, create-issue, create-pr, create-story, create-task, develop-batch, develop-bug, develop-next, develop-story, develop-task, ensure-bug-github-issue, ensure-bug-jira-issue, ensure-epic-github-issue, ensure-epic-jira-issue, ensure-story-github-issue, ensure-story-jira-issue, ensure-task-github-issue, ensure-task-jira-issue, finalise, jira-epic-creator, jira-sprint-manager, jira-sprint-retrospective, jira-sprint-review-prep, qa-fix, qa-story, qa-task, review-bug, review-code, review-epic, review-pr, review-story, review-task, scaffold-tracker-workflow, sync-github-bug, sync-github-epic, sync-github-story, sync-github-task, sync-jira-bug, sync-jira-epic, sync-jira-story, sync-jira-task, tracker-reconcile |
| `qa-runnable-prose-detection.md:468` | `qa-execute-snippets.mjs` | needed | develop-story, develop-task, double-check, qa-story, qa-task |
| `security-input-corpus.md:3` | `security-input-corpus.mjs` | needed | finalise, qa-story, qa-task, review-security |
| `security-input-corpus.md:13` | `security-input-corpus.mjs` | needed | finalise, qa-story, qa-task, review-security |
| `security-review-prompt.md:17` | `security-probe.mjs` | needed | review-security |
| `security-review-prompt.md:45` | `security-probe.mjs` | needed | review-security |
| `security-review-prompt.md:78` | `security-input-corpus.mjs` | needed | review-security |
| `tracker-state-poller-subagent.md:78` | `resolve-platform.sh` | needed | develop-bug, develop-story, develop-task, qa-story, qa-task, review-pr |

- **Phase 2 result.** `npm run bundle` then `bundle:check` printed 15 `UNREACHED` (14 removed, 1 kept); after the handover-render removal, 3 more (`handover-verify.js` in qa-story, qa-task, review-pr) once row 438 was switched. Each was checked against its skill: only develop-bug's `pipeline-answers.js` had a witness (`develop-bug-step-0-resolve-bug.md:99`, a skill-local doc the bundler does not scan) → `skills/develop-bug/SKILL.md` now names `references/pipeline-answers.js`, and the copy stayed. The other 17 were `git rm`'d. `review-pr/references/qa-cycle.sh` went with `grant-qa-cycles.sh` (its only reach was that script's `bundle-dependency:` line; review-pr's bundled docs run the develop-* copies). Final `bundle:check`: 128 skills, 0 problems.
- Edited lines also reworded "(bundled into each skill as …)" → "(bundled into each skill that runs it as …)", which is now what is true.
- **Mutation proofs** (each restored after): M1 drop an `ALLOWED` entry → §2 unlisted red; M2 loosen the running-line rule to "token anywhere before" → §1 control red (and §2 stale red); M3 remove an allowed literal from its doc → §2 stale red; M4 restore the old create-skill rule form → §3 red; M5 drop the rule sentence → §3 red; M6 disable the fence branch → §1 and §2 red. The incident-line mutation runs on every push as its own test (§2 mutation).
- Change Log row written once (develop).

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
**Branch**: `feature/task.193.scripts-reach-only-skills-that-run-them`
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}

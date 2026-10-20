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
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #691: https://github.com/Gamaroff/agent-skills/pull/691 | —                    | 2026-10-19T08:31Z |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.193.qa.{N}.*.md`; `task.193.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | 4 cycles (CONCERNS→CONCERNS→FAIL→PASS 92); PR review 1 APPROVE | — | 2026-10-19T09:11Z |
| 7. finalise                | ✅ Done    | `task.193.dod.{N}.*.md`; task `status: accepted`                      | DoD 1 ACCEPTED; 8a security fix `097cfe8f`; CI 1 SUCCESS @ 097cfe8f, CI 2 SUCCESS (tree-eq) @ ee6ee8f6 | —                    | 2026-10-19T09:44Z |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | Implementation report committed and pushed | —                    | 2026-10-19T09:44Z |

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

### Step 4 — create-pr

- SCOPE_PATHS: the work-item dir, `CHANGELOG.md`, `shared/resources`, `skills/develop-bug`, `skills/develop-bug/references`, `skills/{develop-story,develop-task,qa-story,qa-task,review-pr,review-story,review-task}/references`, plus `tests/shared-script-literals.test.js` (untracked, in a dir with no tracked change — added by hand per the step doc). Pre-flight held nothing. Leak check: 0.
- `/create-pr` resolved to a generic user-level copy without `--scope`; the scoped staging and the two commits (`fix(task.193)…`, `docs(task.193)…`) were made by hand within SCOPE_PATHS, then `gh pr create --base develop`. Commits rebuilt once before the push to correct "18 copies" → 17 (develop-bug kept `pipeline-answers.js`).
- PR created: https://github.com/Gamaroff/agent-skills/pull/691 (base `develop`, `Closes #592`). Post-PR state: OPEN (checked inline, no poller dispatch).
- Tracker: in-review comment posted on #592; GitHub board: in-review → stage-disabled (not mapped in `tracker-workflow.yaml`).

### Step 7 — finalise

- DoD file `task.193.dod.1.scripts-reach-only-skills-that-run-them.md`. Four DoD agents: AC PASS (7/7), docs PASS, compliance NOT_APPLICABLE, security PASS on the checklist with `boundary: true`.
- Security probe plan (Step 3b.1): 39 candidates against `isRun` and `isRunInFence`. 6 reproduced on `584edced`, all graded low by the security agent: an escaped backtick and a closed double-tick span read as span openers, a double-tick command span read as closed, and `time`/`do`/`then` matched as shell keywords outside command position (the gate 4 follow-up).
- **Fix-and-recheck (Step 8a), `097cfe8f`**: code spans now match by backtick run length (CommonMark), an escaped backtick opens nothing, and a fenced shell keyword counts only at the line start or after shell punctuation. The guard's stale §1 header was corrected in the same edit. One new control test pins all six. Mutation proof: red on reverting the run-length matcher, and red on reverting the keyword anchor. Fast gate 5906/0. Evaluator exit 0 three times (the first halted on `mutation-proved` only). The probe re-run reproduced 0 of 39.
- CI reading 1: SUCCESS @ `584edced` (decision); retaken on the fix head: SUCCESS @ `097cfe8f` (5 checks). CI reading 2: SUCCESS (tree-equivalent to `097cfe8fc71c`) @ `ee6ee8f6` (5 checks).
- Acceptance commit `ee6ee8f6` carried the 5c PR review report and the probe records. Registry row 237 ticked (`planned` → `accepted`). 6d: task 193 is cited in CHANGELOG.
- Canonical PR comment posted. Issue #592: the Document link was already on `develop`; done comment posted; closed (verified CLOSED); board `done` → `already`.
- Deviation: the 8a fix was verified inline, not by a further QA cycle or an independent reviewer (DoD § Deviations).

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-10-19

**Gate Result**: CONCERNS
**Issues Found**: 1 open — CR-1 (medium): the guard exempts a cite-wrapped script literal that the bundler still copies (`ref_kind` cites only `.md`). Advisory: CR-2 (`RUN_PREFIX` reads English "source …"), CR-3 (`.sh` comment literals unscanned).
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)

- `/qa-task` resolved to no registered skill in this session (Skill tool: "Unknown skill"); its `SKILL.md` was read from `.claude/skills/qa-task/` and followed directly.
- Step 3b reviewer: one Explore subagent, 198,784 ms, 3 findings, all anchors `ok`. Traceability mapper skipped: Success Criteria is a checklist, not a table.

**Fixes Applied**: CR-1 — the guard no longer exempts a cite-wrapped script literal (the bundler cites only `.md`); CR-2 — a literal is run only when the command opens a code span, paren or line. Task § 8 control spec and plan corrected. CR-3 left advisory (scope stated in the test header). Fast gate 5903/0 fail; both fixes mutation-proven (§1 red). `/qa-fix` was not a registered skill this session; its `SKILL.md` was followed directly. Changes-requested stage: stage-disabled. Post-fix PR state: OPEN (checked inline).
**Commit**: `beb68968`

### QA Cycle 2 — 2026-10-19

**Gate Result**: CONCERNS
**Issues Found**: 2 open — CR-1 (medium): nested `shared/resources/…/x.mjs` literals invisible to the guard; CR-2 (medium): `(source …)`, a line-initial `source` and a closing backtick still read as commands. Advisory: CR-4 (ALLOWED bundler sets unchecked), CR-5 (no extension end boundary). Pre-existing, routed to future: CR-3 (fenced quote at `probe-boundary-rule.md:66` copies a test file; identical on `origin/develop`).
**HIGH findings**: 0
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)

- Cycle 2 refute pass (whole branch diff), one Explore reviewer, 175,030 ms. Gate 1 CR-1 verified fixed in a scratch worktree, and its premise confirmed by `npm run bundle:skill skills/qa-task`, which copies a cite-wrapped script. Convergence check: HIGH sequence `[0, 0]`, precondition `HIGH_N > 0` unmet → no trip.

**Fixes Applied**: CR-1 — the guard matches with the bundler's `SHARED_REF_RE` (nested paths), trimmed as `split_fragment` does, script extensions only (also CR-5). CR-2 — a command must open the code span or a `$(`. CR-4 — `ALLOWED` entries carry bundler sets, checked against the tree. CR-3 left as pre-existing follow-up. Fast gate 5904/0 fail; five mutations each red (one survived first — no fixture had a closing backtick right before a command word — and a fixture was added). Changes-requested: stage-disabled. PR state: OPEN.
**Commit**: `53f72587`

### QA Cycle 3 — 2026-10-19

**Gate Result**: FAIL
**Issues Found**: 1 open — CR-1 (high): the guard exempts every fenced literal, but the bundler copies from fences; live at `probe-boundary-rule.md:66` (copies a test file into qa-story, qa-task) and `develop-pipeline-step-0-resolve-and-prepare.md:251`. Advisory: CR-2 (cite-only holder would be a false failure; no live case), CR-3 (per-line backtick parity), CR-4 (CHANGELOG overstates).
**HIGH findings**: 1
**MEDIUM findings**: 0
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 3 of 5)

- Scoped re-review (files changed since gate 2's head `beb68968`), one Explore reviewer, 129,334 ms. Gate 2's CR-1, CR-2, CR-4 and CR-5 were verified fixed against real documents in a scratch worktree.
- Cycle 2 routed this finding to follow-up as outside the task's population. That was a misjudgement: it is the task's own defect class, and the bundler reads fences. Task status → `in-progress`.
- Convergence check: HIGH `[0, 0, 1]`; `HIGH_{N-2} > 0` is unmet, so no trip. Route classifier: `continue (not-a-pass-gate)`. Third-strike: no file has 3 consecutive HIGH gates.

**Fixes Applied**: CR-1 — fenced literals classified (shell-position run rule); `probe-boundary-rule.md:66` and step-0:251 now use the bare filename; 4 more copies removed (21 total); develop-task and develop-story `SKILL.md` name `references/resolve-paths.sh`. CR-2 — a bundler must also hold the script. CR-4 — CHANGELOG reworded. CR-3 not changed (advisory). Fast gate 5905/0 fail; five mutations each red (the cite-only one is a probe, not a held test). PR state: OPEN.
**Commit**: `e82c3425`

### QA Cycle 4 — 2026-10-19

**Gate Result**: PASS
**Issues Found**: 0 open. Follow-ups (not promoted): CR-1 low/medium — fenced shell rule reads `time. `, `do. `, `(source ` as commands, no live case; CR-2 cleanup — stale §1 header.
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: APPROVE — `task.193.pr-review.1.scripts-reach-only-skills-that-run-them.md` (conformance only, `--no-code`; 1 low finding PC-1, recorded not fixed — APPROVE carries no 5c fixes)
**Carried to 6a**: docs/tasks/task.193.scripts-reach-only-skills-that-run-them/task.193.pr-review.1.scripts-reach-only-skills-that-run-them.md
**Loop exit**: n/a — PASS with empty `top_issues` hands to 5c (classifier: continue (high-findings-remain), not consulted on this arm)
**Action**: Proceeding to 5c (PR conformance review) → APPROVE; exit loop to Step 7

- Process note: the PC-1 doc fix was first applied before the classify block ran. It was reverted to `HEAD` and recorded instead, per the APPROVE arm.
- Scoped re-review (files changed since gate 3's head `53f72587`), one Explore reviewer, 174,363 ms. It found no remaining runner of the four removed copies.

---

## Completion

**Finished**: 2026-10-19T09:44Z
**Final Status**: Completed
**Branch**: `feature/task.193.scripts-reach-only-skills-that-run-them`
**PR**: https://github.com/Gamaroff/agent-skills/pull/691
**QA Iterations**: 4
**DoD Summary**: `task.193.dod.1.scripts-reach-only-skills-that-run-them.md` — ACCEPTED
**Tracker debt**: none

**Completion Summary**: Implemented a guard (`tests/shared-script-literals.test.js`) that fails on a `shared/resources/` script literal named in prose. Prose literals were switched to bare filenames, 21 bundled copies that no skill runs were removed, and develop-bug, develop-story and develop-task `SKILL.md` now name the scripts they run. It took four QA cycles. Cycle 3's FAIL caught fenced literals being exempt, and closing that removed four more copies. `/finalise` fixed six low-severity misreads, found by the security probe, through one bounded fix-and-recheck (`097cfe8f`). One low PR-review note (task § 8 Pin wording, PC-1) is recorded as a follow-up.

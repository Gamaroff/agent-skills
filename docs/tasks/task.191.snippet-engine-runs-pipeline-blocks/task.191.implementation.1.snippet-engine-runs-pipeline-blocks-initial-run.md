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
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #687: https://github.com/Gamaroff/agent-skills/pull/687 | —                    | 2026-10-19T04:59Z |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.191.qa.{N}.*.md`; `task.191.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | 4 cycles; gate.4 CONCERNS 90; 5c APPROVE (pr-review.1) | —                    | 2026-10-19T06:40Z |
| 7. finalise                | ✅ Done    | `task.191.dod.{N}.*.md`; task `status: accepted`                       | dod.1 ACCEPTED; acceptance `a2dc7744`; CI reading 2 SUCCESS; #590 closed | —                    | 2026-10-19T06:53Z |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | Implementation report only (acceptance artefacts committed at /finalise 6a) | —                    | 2026-10-19T06:53Z |

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

### Step 4 — create-pr

- Base pre-supplied (develop). Three scoped commits (review, feat, report) via /commit-changes; pushed.
- PR body written inline from the implementation record — the Explore summariser was not dispatched (Explore subagents have hung in this repo); no diff-to-prose independence.
- PR #687 opened, state OPEN. Issue #590 in-review comment: posted. GitHub board: in-review → stage-disabled. Lock pr_url set.

### Step 5 — QA cycle 1 fix (qa-fix)

- QA Cycle 1 — changes-requested: stage-disabled.
- fix_cycle: not supplied — derived from the gate (cycle 1).
- Findings ingester not dispatched: this session wrote gate 1 and reproduced every finding, so the summary was already in context; no independent re-read of the artifacts. No PR review report exists (`pr-review-current.js` not needed before 5c).
- Fixed QA-1, CR-1, CR-2, CR-3, CR-4, QA-2 and the advisories CR-5 (`{changed-file}`), CR-6 (deletion gap), CR-7 (rule doc), CR-8 (`untracked-file` note). CR-3 move: instead of tracking definition position and branch, a defined name that shadows a builtin or PATH command is never trusted. That is simpler, and it is correct in both of the finding's directions.
- Step 3.5 found three gaps in the first fixes: a backslash-continued call, a call through a second helper's function, and a mode-only change wrongly erroring. All three are fixed and mutation-proven. A CR-6 test was vacuous at first (its fixture had no line after the fence) and was rewritten until its mutation went red.
- Residual, pre-existing on develop and not fixed: the deny-list misses a quoted option (`find docs "-delete"` is runnable). The CR-1 check is as strong as the deny-list on that command and no stronger. Recorded for QA as a follow-up.
- Probe: `isRunnableBlock` engages on the shell-exec corpus (31/31) and on a 12-case helper file (12/12, 0 reproduced, 0 over-blocked); cases at the scratchpad `probe191/cases-helper.json`.
- Tests: engine 173 (165 pass, 8 zsh skips); `npm test` 5871/0; bundle:check 0 problems.

### Step 5 — QA cycle 2 fix (qa-fix)

- Third-strike check: only two gates exist, so it does not apply yet. Took the gate's structural move anyway: an allow-list over assigned names (CR2-3) and the scan's own invocation stream for forwarding (CR2-1), instead of adding spellings.
- Forwarded arguments are bounded by parity: they are judged as the same arguments written to the command directly, plus an unquoted reading. A variable's value is not followed (`X=-delete; f $X`). That is the base scan's limit, the same for a block written directly, and is documented in §2aa.
- Probing found three more base-scan shapes that were already `runnable` on develop: a command after a heredoc, `"$(…)"`, and quoted deny words. Logged as observation #67, not fixed here: each fix changes what real blocks classify as, which is outside this task.
- The real skill docs (qa-task, qa-story, finalise, review-epic, develop-task) classify the same before and after.
- changes-requested stage: `stage-disabled` (cycles 1 and 2).
- Observations written: #67, #68.

### Step 5c — review-pr (QA cycle 4)

- `/review-pr --effort medium --comment --no-code`: verdict APPROVE, 0 findings. Report `task.191.pr-review.1.snippet-engine-runs-pipeline-blocks.md` was staged and carried into the 6a acceptance commit; comment posted.
- The caller checked as well: the Change Log append-only check against the merge base reads `ok`, and all four gate heads are ancestors of HEAD with `updated:` not earlier than their head's author time.
- ready-for-merge stage: `stage-disabled`.

### Step 7 — finalise

- DoD summary: docs/tasks/task.191.snippet-engine-runs-pipeline-blocks/task.191.dod.1.snippet-engine-runs-pipeline-blocks.md — ACCEPTED. AC 11/11 PASS, Docs PASS, Compliance N/A, Security PASS (boundary: true; /finalise ran the agent's 2-control probe plan: 102 executed, 0 reproduced, 0 escapes, 0 refusals; record `task.191.dod.1.security.run.json`).
- CI reading 1: SUCCESS @ 97f29ef28864 (5 checks); CI reading 2: SUCCESS @ a2dc77445f5e (5 checks, after 60s).
- DoD body posted to PR — comment URL: https://github.com/Gamaroff/agent-skills/pull/687#issuecomment-6261486876 (canonical summary: #issuecomment-6261477964).
- GitHub Issue #590 — close: CLOSED ✅ (`done` comment `posted`; Document link already on `develop`).
- Board transition: `gh-stage --stage done` → `already`.
- Registry: `registry-tick` → `ticked` (planned → accepted).
- The probe plan's inline cases were built from the QA cycle-4 case files (`scratchpad/probe191/cases-qa4.json`, `cases-diffbase.json`), which the agent said it had copied verbatim, rather than retyped from its YAML.
- Task completed.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Step 3 — review miss (check 15).** The review said no test pins the `--bind` detail; `bug.7: a placeholder present keeps it a finding, with the --bind remedy` asserted `/--bind/` on an `echo {id}` slot block. Updated to `--slot` (the correct remedy for a slot), and a new test holds the `--bind` arm for unbound variables.
- **Step 3 — `<id>` mid-line is a write redirection.** `echo <id> more` classifies `write-redirection` before the slot check (pre-existing, correct for `cat <a> b`). Not changed; the test places the angle slot last.

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-10-19
**Gate Result**: FAIL
**Issues Found**: 6 — QA-1 BASH_ENV start-up file runs unclassified; CR-1 sourced-function arguments unscanned; CR-2 two-dot --diff-base in callers; CR-3 conditional helper names trusted; CR-4 coloured git diff reads empty; QA-2 classifier not probeable
**HIGH findings**: 3
**MEDIUM findings**: 3
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)
**Fixes Applied**: QA-1 start-up-variable refusal; CR-1 forwarded-argument check (transitive, continuation lines); CR-2 merge-base in both callers; CR-3 shadowing names never trusted; CR-4 diff config off + zero-hunk refusal; QA-2 isRunnableBlock; advisories CR-5/6/7/8. 10 control tests, all mutation-proven.
**Commit**: `88194488`
**Post-fix PR state**: OPEN (polled inline with `gh pr view`, not the Explore poller — Explore subagents have hung in this repo)

### QA Cycle 2 — 2026-10-19
**Gate Result**: FAIL
**Issues Found**: 5 — CR2-1 respelled function name bypasses reach(); CR2-2 helper-script arguments unscanned; CR2-3 respelled BASH_ENV bypasses the start-up refusal; CR2-4 case-arm rewrite hides a continued command; CR2-5 helpers classified without earlier-sourced functions. Bugs 3-6 closed, 1-2 reopened, 7-9 new
**HIGH findings**: 5
**MEDIUM findings**: 0
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)
**Fixes Applied**: CR2-1 forwarding check reads unquoted invocations + raw quoted arguments, judged as written and unquoted; CR2-2 helper-script arguments and `set --` parameters checked; CR2-3 allow-list over assigned names (plain identifiers only; `-n`, `export -f`, `printf -v`, non-plain `--bind` keys refused); CR2-4 case-arm rewrite only at an arm position; CR2-5 sourced helpers inherit earlier functions; advisory CR2-6 PATH change refused. 6 control tests, 11 mutations, all red.
**Commit**: `665ae9c7`
**Post-fix PR state**: OPEN, MERGEABLE (polled inline with `gh pr view`)

### QA Cycle 3 — 2026-10-19
**Gate Result**: FAIL
**Issues Found**: 1 — CR3-1 a function redefined by a later sourced helper keeps the earlier helper's forwarding reach (bug 10). Bugs 1, 2, 7, 8, 9 closed
**HIGH findings**: 1
**MEDIUM findings**: 0
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 3 of 5). Convergence check: 2, 5, 1, falling, not tripped. Route classifier: continue (not-a-pass-gate). Third strike on shared/resources/qa-execute-snippets.mjs (gates 1-3). Struck mechanism: the propagation of sourced-helper function definitions across a block (defines/forwardsTo)
**Fixes Applied**: CR3-1. Third strike, move: replace. One reach per function name (last write decides) became a list of every body the block may see (`addBody`); a call reaches the union. Test `T191 CR3-1`, mutation-proven. Real skill docs classify unchanged. ci:fast 5878/0
**Commit**: `3644878b`
**Post-fix PR state**: OPEN, MERGEABLE

### QA Cycle 4 — 2026-10-19
**Gate Result**: CONCERNS
**Issues Found**: 0 blocking. Bug 10 (CR3-1) closed. 2 low cleanups (CR4-1 orphaned JSDoc, CR4-2 recomputed helper path) and the carried reliability advisories CR2-7/CR2-8, all advisory
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: APPROVE — task.191.pr-review.1.snippet-engine-runs-pipeline-blocks.md (conformance lens only, `--no-code`; 0 findings; comment posted)
**Loop exit**: n/a — this exit not taken
**Action**: Proceeded to 5c (PR conformance review) — APPROVE; loop exited, Step 7

---

## Completion

**Finished**: 2026-10-19T06:53Z
**Final Status**: Completed
**Branch**: feature/task.191.snippet-engine-runs-pipeline-blocks
**PR**: https://github.com/Gamaroff/agent-skills/pull/687
**QA Iterations**: 4
**DoD Summary**: docs/tasks/task.191.snippet-engine-runs-pipeline-blocks/task.191.dod.1.snippet-engine-runs-pipeline-blocks.md
**Tracker debt**: none

**Completion Summary**: `qa-execute-snippets.mjs` gained `--slot` (fills `{template}` slots before classification), the helper rule (a `bash`/`sh`/`source`/`.` call to a helper in the copy runs only when the helper's own text is runnable; forwarded arguments are judged as if written to the reached command; a function's reach is every definition of its name), and `--diff-base` (changed blocks counted apart, with `changed-blocks-not-executed` when none ran). qa-task Step 4b and qa-story Phase 1.7 now pass `--diff-base` and `--slot`. The work took 4 QA cycles and closed 10 bugs. On the third strike against function propagation, the mechanism was replaced rather than patched. The DoD probe re-run held: 102 executed, 0 reproduced. The advisory follow-ups CR2-7, CR2-8, CR4-1, CR4-2 and observations #67 and #68 are carried in gate.4 `recommendations.future`.

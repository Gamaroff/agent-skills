# Implementation Report: loop-supervisor: an engine registry (claude, agy) and a --model flag

**Task**: `task.213.loop-supervisor-engine-registry-and-model-flag.md`
**Run Number**: 1
**Started**: 2026-10-21 08:40
**Status**: In Progress

---

## Summary

Move loop-supervisor's claude-specific argv, result envelope and transcript path into an engine registry, register `agy`, and add `--engine`, `--model` and `--effort` — first run, dispatched unattended by `/develop-next`.

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
| Board status        | #715 — work-started: transitioned (issue created at Step 2)                |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.213.*` exists in git                              | Branch created at `a721d28d` | —                    | 2026-10-21T06:37Z |
| 2. review-task             | ✅ Done    | `task.213.review.{N}.{name}.md` exists (or skip logged)                | `task.213.review.1.*.md` — READY TO IMPLEMENT 8/10; Planned → Ready for Development | —                    | 2026-10-21T06:44Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline (plan names every hunk); 13 files, 31 tests; ci:fast green; 10/10 mutations killed | —                    | 2026-10-21T07:03Z |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #716: https://github.com/Gamaroff/agent-skills/pull/716 | —                    | 2026-10-21T07:05Z |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.213.qa.{N}.*.md`; `task.213.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | 2 cycles: gate 1 CONCERNS 90 → qa-fix `f982c944` → gate 2 PASS 100 (route 2b); PR review APPROVE (`pr-review.1`) | `.summaries/step-5-post-fix-tracker-1.json` | 2026-10-21T07:27Z |
| 7. finalise                | ✅ Done    | `task.213.dod.{N}.*.md`; task `status: accepted`                       | `task.213.dod.1.*.md` GAPS (AC8, CHANGELOG), fixed doc-only; `task.213.dod.2.*.md` ACCEPTED; acceptance `772cd233` | —                    | 2026-10-21T07:39Z |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | Implementation report committed and pushed | —                    | 2026-10-21T07:46Z |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-10-21

- Dispatched by `/develop-next` (autonomous run, `--defaults`); selection source `task-registry` (T213, registry line 257).
- Feature branch base: develop — source: recommended (`--defaults`, on `develop`)
- PR target branch: develop — source: recommended (`--defaults`)
- Mode: standard — source: detector. Phase 0 ran inline (no 0a-parallel agents dispatched); inputs derived from the document: `risk_level` absent (risk_ok true), phase_count 5 (≥ 3), single_module true → standard.
- Skips: none. Refused flags: none. Questions asked: 0 (`--defaults`, nothing in conflict).
- qa-planning gate: skipped (auto — no prompt)
- Status at start: `planned` — proceeding; Step 2 (`/review-task`) validates and promotes.
- Tracker: GitHub (no `JIRA_URL`); no `github_issue` linked — tracker signals skipped. Tracker poller not dispatched (no issue key).
- Always-load files resolved: 3 files — from `skills-config.yaml` `devLoadAlwaysFiles`.
- Branch: `feature/task.213.loop-supervisor-engine-registry-and-model-flag` from `develop` at `a721d28d`, pushed with tracking. Report stashed before branch creation and restored after.
- Pre-check: `agy` 1.4.2 is installed at `~/.local/bin/agy` and `agy models` answers (13 ids), so Phase 0's live capture is runnable.

### Step 2 — review-task

- review-task output: Comprehensive report — required for pipeline audit trail. Review report: `task.213.review.1.loop-supervisor-engine-registry-and-model-flag.md` (READY TO IMPLEMENT, 8/10, 0 critical / 8 important / 3 optional).
- Pre-pass agents B and C not dispatched; both axes checked inline (independence loss recorded in the review report).
- Auto-answers (autonomous run, each the recommended option): tracker sync → "Sync to GitHub" (issue #715 created, board Priority P2); Risk 1 → the task's recommended default (operator-only `--dangerously-skip-permissions`, refused on `claude`, never a config key); Medium Risk 1 → the document's own Phase 0 mitigation.
- review-task Step 8.5 auto-answered: Yes, apply all critical + important fixes — pipeline proceeds autonomously. Step 9 auto-answered: Yes, fixes complete.
- Planned promoted to Ready for Development by review-task. `reviewed_blob` stamped (`written`).
- work-started re-fired at Step 2 — issue 715 created by the review; lock updated. Comment: posted; board (`gh-stage.js`): transitioned.
- Review outcome comment skipped — review-task reported `posted`.

### Step 3 — develop

- Pre-develop surface map: `run-loop.mjs` (DEFAULTS, parseArgs/KEY_OF, applyConfig, buildClaudeArgs, renderStreamLine, main dry-run, iteration spawn/parse/ledger, transcriptPathFor), `classify.js` (`isChildError`), `render.js` (`money()` tolerates null), `adapters.js` (CommonJS style for `engines.js`) — inline, Explore not dispatched (independence loss).
- Plan file found: `task.213.plan.loop-supervisor-engine-registry-and-model-flag.md` — included as implementation context.
- Step 3 inline — `/develop` not invoked: plan names every hunk; surface map from the review.
- Phase 0 facts (agy 1.4.2, model `gemini-3.8-flash-low`), recorded in the plan's "Verified facts": SUCCESS exits 0; a bad `--model` gives `status: "ERROR"`, exit 1, empty `conversation_id`; `--conversation <fresh-uuid>` resumes only (warns "not found", runs under a new id), so it is never sent and the ledger id comes from the stream; `--mode accept-edits` ran a shell command unprompted in print mode; `--sandbox` did not hold (the agent re-ran outside it), so it is not emitted. Fixtures: `agy-result.ndjson` (real capture, cwd sanitised) and `agy-result-error.ndjson`.
- Characterisation first: three `t213:` tests pinned the claude dry-run argv (normalised session id and settings path) and passed on unchanged code before `engines.js` existed.
- `engines.js`: CommonJS, one row per engine, `{name, binary, supports, buildArgs, parseResult, renderLine, transcriptPath}`; `resolveEngine` (own-property lookup — `toString` is not an engine) and `assertSupported` (one `GATED_FLAGS` table). `run-loop.mjs` has no engine-name branch; `buildClaudeArgs`/`renderStreamLine`/`transcriptPathFor` kept as exported delegates.
- Decision: totals `costUsd` starts `null` (not `0`) for an engine without `supports.cost`, so the summary reads unknown rather than `$0.0000`. The run summary gained `engine`.
- Decision: a non-pinned engine gets `sessionId = null` before spawn; the ledger row takes `sessionId ?? env.sessionId ?? null`, and `transcriptPath` is computed only from a non-null id.
- Mutation proof (`scratchpad/t213-mutate.py`, sources sha1-verified restored): 10 of 10 killed — agy fail-closed `isError`, refusals removed, claude `--model` position, dry-run executes the engine, skip-permissions read from config, agy ledger gets a supervisor uuid, claude argv drift, agy `--conversation`, flag loses to config, agy cost reads as `$0`.
- Doc sweep: loop-supervisor `README.md` (options rows, new "Engines and models" section, resume note), `SKILL.md` (description, table, spawn step, resume), `docs/reference/configuration.md` (3 keys + example), `docs/reference/commands.md`, `docs/runbooks/unattended-overnight-runs.md`, develop-next `SKILL.md` + `README.md`. `generate-catalog` run; `validate` ✓.
- Performance criterion — the five pre-existing files, 5 runs each, bash `time` (`/usr/bin/time` absent): **base** `a721d28d`, load 2.33 → 0.292 / 0.305 / 0.298 / 0.287 / 0.280 s, median **0.292 s**, 185 pass; **head**, load 5.45, `--test-skip-pattern='^t213:'` so only pre-existing tests run → 0.285 / 0.275 / 0.280 / 0.293 / 0.282 s, median **0.282 s**, 185 pass. Within 10% (−3%), at roughly twice the load.
- Development completion comment posted to github issue 715 (`tracker-comment.js` reason `posted`, count=5).
- Gates: `npm run ci:fast` rc 0 — 6,136 tests, 6,122 pass, 0 fail, 14 skipped. Loop-supervisor unit suite 217 tests, 216 pass, 1 skipped (live-network case).

### Step 4 — create-pr

- Staging scope (`.claude/state/step4-scope-paths.txt`): the work-item dir, `docs/reference`, `docs/runbooks`, `evals/loop-supervisor/unit`, `evals/loop-supervisor/unit/fixtures`, `skills/develop-next`, `skills/loop-supervisor`, `skills/loop-supervisor/references`, `skills/loop-supervisor/scripts`.
- Pre-flight held one out-of-scope untracked path, `tests/fixtures/shell-fn/.t140-gh-more-*/` (a test leftover), and restored it after the PR.
- Report links checked (`doc-links.js`, 0 relative links, rc 0) for the implementation and review reports.
- Commits `cb1db96` (feat), `fafa90b` (docs sweep), `a31d73c` (task docs). Leak check over `develop...HEAD`: none.
- PR body written inline from the diff and implementation report; the Explore summariser was not dispatched (Explore subagents hung in earlier sessions).
- PR #716: https://github.com/Gamaroff/agent-skills/pull/716 (base `develop`, `Closes #715`). Issue comment `in-review`: posted. Lock `pr_url` set.
- GitHub board: in-review → stage-disabled (no `pipeline.in-review` target on this board).
- Post-PR state check (inline `gh pr view`, poller not dispatched): PR #716 state = OPEN, head `a31d73ce`. errors = 0.

### Steps 5–6 — QA loop

- GitHub board: QA-start re-assert → stage-disabled.
- Traceability mapper dispatched (Explore, 61 s): 14 success criteria mapped — 7 full, 1 unit, 1 partial (SC13: three `claude -p` lines carry the engine qualifier only in the next sentence), 5 held by a measurement or command. Matrix written to `.summaries/qa-traceability-matrix.md`.
- QA cycle 1 (5a): gate CONCERNS 90/100. HIGH 0, MEDIUM 1 (TASK-213-BUG-1). The code reviewer (Explore, 86 s) returned 2 advisory bugs (CR-1 medium/medium, CR-2 low/medium) and none was promoted. Mutation spot-check: 10/10 killed. `resolveEngine` probe: 12 executed, 0 escaped, verdict `engages`. Step 4b: 0 executable blocks. PR comment and `qa-gate-1` tracker comment posted.
- QA cycle 1 route: the classifier returned `continue` (`not-a-pass-gate`; route 2 is below the cycle floor), so the cycle went to 5b. `changes-requested` stage → stage-disabled.
- qa-fix cycle 1: findings ingested inline (Step 1b), not by the ingester subagent. This session wrote the gate and bug report minutes earlier, so the summary was already in context, and an ingester would only re-read one MEDIUM entry. Recorded as a deviation from Step 1a.
- qa-fix cycle 1 fixes: TASK-213-BUG-1 (`by default` on the three lines); CR-2 (`dryRun` spawn bounded by `spawnBudget("LOOP_SUPERVISOR_DRY_RUN")`); stale comment at `run-loop.mjs:1093`. CR-1 (agy `init` conversation-id fallback) is deferred as a follow-up because it changes behaviour and would need its own fixture and test.
- qa-fix cycle 1 calibration: the criterion search, filtered to lines carrying neither `by default` nor `agy`, gives 3 at `a31d73ce` and 0 after the fix.
- qa-fix cycle 1 doc probe: `claude -p` over the executed-document population gives 4 files. develop-next and loop-supervisor `SKILL.md` were updated. review-pr `SKILL.md:375` is unaffected: it names `claude -p` as a non-interactive host, not the loop engine. session-handoff `SKILL.md:145` is unaffected: it is a historical example of a test spawning it. Move: patch, because the restatements are separate prose sites with one adjective each, not a contract.
- QA cycle 2 (5a): refute pass over the full diff (2,809 lines; Explore, 149 s). Five findings; CR-4 and CR-5 (low/high) promoted, the rest advisory. Probe re-run (`qa.2.security.run.json`): 12 executed, 0 escaped, verdict `engages`. Step 4b: 0 changed blocks. Bug.1 closed. Gate PASS 100/100. PR comment and `qa-gate-2` tracker comment posted.
- QA cycle 2 route: the classifier returned `cosmetic-residue` (route 2b). CR-4 and CR-5 were moved to gate 2 `recommendations.future` with `carried_from`, their `top_issues` entries stamped closed, and a `## Deferred Work` H2 added to the task. 5b skipped; proceeding to 5c.
- Observed: the `qa-gate-2` stakeholder lead for PASS says "The checks found no problems" while the gate carried two open LOW entries. The lead reads only the verdict, not the open queue.
- Step 5c: `/review-pr --effort medium --comment --no-code` ran with the conformance lens only (Explore, 46 s). It returned one finding, PC-1 (coverage, low/medium): no render test passes a null `costUsd` or `transcriptPath`. The orchestrator confirmed it; the only `costUsd: null` in `evals/loop-supervisor/` is in `engines.test.mjs`. Verdict APPROVE. Anchors checked (1, `no-line`). The report is `task.213.pr-review.1.*.md`, staged and carried to 6a. A PR comment was posted. `ready-for-merge` returned `stage-disabled`. PC-1 is not fixed: it is a test addition, not doc-only, and it joins CR-4 and CR-5 as follow-up work.
- Step 7 (`/finalise`, DoD 1). The 4 DoD agents ran in parallel. AC: PARTIAL (13/14; AC8). Security: PASS; the probe plan was run by /finalise on `resolveEngine` (12 executed, 0 reproduced, 0 escaped; `task.213.dod.1.security.run.json`). Compliance: NOT_APPLICABLE. Docs: FAIL (CHANGELOG). CI reading 1: SUCCESS @ `4f301bf3` over 5 checks. Decision: GAPS. Fix-and-recheck evaluator exit 1 (`inside-files-summary`, `mutation-proved`). Task status unchanged (ready-for-review). Gaps Change Log row and gap section written. PR gaps comment posted (its lead says "4 of them": the `dod-gaps` count also counts the Next Steps checkboxes, so it double-counts the 2 gaps). The lock was left at step 7 and `advance-pipeline-lock.sh --skill finalise` was not run: it maps finalise → 8 unconditionally, which on a gaps halt would point a resume past Step 7.
- DoD 1 gap fixes (documentation-only, so the resume is at Step 7 and QA is not re-entered):
  - **AC8 re-measured on the PR head.** The five pre-existing files were run 5 times each, base and head interleaved so both see the same load. Wall clock was taken around the whole `command node --test …` call, so the figures include node start-up and are not comparable with the earlier per-run figures. Base `a721d28d` (a detached worktree) gave 1.460 / 1.496 / 1.662 / 1.415 / 1.645 s, median **1.496 s**. Head `570c3f6a` (`--test-skip-pattern=^t213:`) gave 1.588 / 1.382 / 1.520 / 1.534 / 1.537 s, median **1.534 s**: **+2.5%**, within 10%. Load was 8.27–8.41 (1-min) during the runs, and every run passed 185 tests. `570c3f6a` has the same `evals/` and `skills/` tree as PR head `4f301bf3` (`git diff --stat` empty), so this measures the code under review.
  - **CHANGELOG.** Added a `(task 213)` entry under `[Unreleased]` → Added.
- Step 7 (`/finalise`, DoD 2): the commits since DoD 1 changed only documentation (`CHANGELOG.md` `5742a9ac` and this task directory), so the four agents and the probe were not re-dispatched. Security, compliance and AC1–7/9–14 were carried forward from DoD 1, AC8 and the CHANGELOG were re-verified directly, and the deviation is recorded in `dod.2`. CI reading 1: SUCCESS @ `5742a9ac` over 5 checks. Decision ACCEPTED. Status → accepted, Change Log 1.2, registry ticked (`planned` → `accepted`), sprint review written. Acceptance commit `772cd233`, pushed and asserted on origin. 6d: `(task 213)` is cited. CI reading 1: SUCCESS @ `5742a9ac`; CI reading 2: SUCCESS @ `772cd233` over 5 checks after 270s. Canonical PR comment issuecomment-6310819702. Issue #715: Document link re-pointed to `develop`, `done` comment posted, closed (state CLOSED confirmed). Board `done`: `already`.
- qa-fix cycle 1 CR-2 is not mutation-proven: it bounds a hang, and no committed test can turn red on the bound's absence without staging a hang.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Step 3 — `ci:fast` 1,576 failures from `/tmp` inode exhaustion (resolved).** `df -i /tmp` read 100% (1,048,575/1,048,576); 53,655 of 58,396 top-level entries carried a temp-dir prefix this repo's tests create. Removed only stale (> 60 min), my-owned entries matching those prefixes (≥ 5 chars; sockets and `claude-*` excluded) → 13% used. T213's own `runOnce`/`dryRun` helpers leaked too and now `rmSync` their root. Observation #83 logged for the repo-wide leak.
- **Step 3 — first `ci:fast` reported exit 0 from the background task while the gate failed** (the trailing `echo` owned the exit code). The log's own `rc=1` line was read; re-runs propagate the real code.
- **Step 3 — Prettier failed on the two test files**; fixed with `prettier --write`.
- **Step 3 — `ci:fast` run 2: 2 failures, both T213's.** `test-harness-concurrency` refused the literal `timeout: 30000` in `engines.test.mjs` → now `spawnBudget("LOOP_SUPERVISOR_ENGINES")`. `bundled-links` refused the README link to the then-untracked `references/engines.js` → new files marked intent-to-add (`git add -N`). Both guards re-run green on their own.
- **Step 7 — `/finalise` DoD gaps (HALT).** (1) AC8: the perf figure (−3%) was taken before `f982c944` changed `evals/loop-supervisor/unit/run-loop.test.mjs`, one of the five measured files, and it names no head SHA. Re-measure on base and on head. (2) Docs: `CHANGELOG.md` `[Unreleased]` has no `(task 213)` entry. Both fixes are documentation-only, so the resume is at Step 7. Step 8a fix-and-recheck was refused: two sections fall short, and `inside-files-summary` failed for `CHANGELOG.md`.

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-10-21
**Gate Result**: CONCERNS
**Issues Found**: 1 — TASK-213-BUG-1 (MEDIUM): three `claude -p` lines lack the default-engine qualifier on the matched line. Advisory: CR-1, CR-2, stale comment at run-loop.mjs:1093.
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)
**Fixes Applied**: TASK-213-BUG-1 (`by default` on the three `claude -p` lines); CR-2 dryRun spawn timeout; stale run-loop.mjs:1093 comment. CR-1 deferred.
**Commit**: `f982c944`

### QA Cycle 2 — 2026-10-21
**Gate Result**: PASS
**Issues Found**: 2 LOW, both promoted from the refute pass as high-confidence (CR-4: the skill description's pinned-session claim covers agy; CR-5: the develop-next `claude --resume` sentence covers agy rows). Advisory: CR-1 (config model/effort reach a different engine), CR-2 (agy init-line session id), CR-3 (agy slash-command handling). TASK-213-BUG-1 verified fixed and closed.
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: APPROVE — `task.213.pr-review.1.loop-supervisor-engine-registry-and-model-flag.md` (conformance lens only; 1 LOW: PC-1, no render test for a null cost or transcript)
**Carried to 6a**: docs/tasks/task.213.loop-supervisor-engine-registry-and-model-flag/task.213.pr-review.1.loop-supervisor-engine-registry-and-model-flag.md
**Loop exit**: Cosmetic-residue exit taken — PASS gate at cycle 2 with HIGH 0 for cycles 1 and 2; all 2 open findings are LOW and are carried to the gate's recommendations.future by id (TASK-213-QA2-CR4, TASK-213-QA2-CR5). This is a CLEAN exit, not a stall: nothing is blocked and nothing is being accepted over; a full qa-fix cycle for cosmetic findings is what this route exists to avoid.
**Action**: Proceeding to 5c (PR conformance review)

---

## Completion

**Finished**: 2026-10-21
**Final Status**: Completed
**Branch**: `feature/task.213.loop-supervisor-engine-registry-and-model-flag`
**PR**: [#716](https://github.com/Gamaroff/agent-skills/pull/716)
**QA Iterations**: 2
**DoD Summary**: `task.213.dod.2.loop-supervisor-engine-registry-and-model-flag.md` (ACCEPTED; `dod.1` recorded the 2 gaps)
**Tracker debt**: none

# Implementation Report: Eval harness hardening and task.185 leftovers

**Task**: `task.186.eval-harness-hardening-and-leftovers.md`
**Run Number**: 1
**Started**: 2026-10-06 04:46
**Status**: Completed

---

## Summary

First autonomous run (develop-next T186) of the four task.185 follow-up phases: runner verdicts, fake gh residue, inline-comment GET, and one shared next-number rule.

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
| Board status        | In Progress ✅ (gh-stage: transitioned; read-back `already` from In Progress) |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.186.*` exists in git                             | Branch created at `709e91ab`; pushed with upstream | —                    |
| 2. review-task             | ✅ Done    | `task.186.review.{N}.{name}.md` exists (or skip logged)               | READY TO IMPLEMENT 8/10; 0 Critical, 4 Important (applied), 2 Optional; Planned → Ready for Development | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline, 1 iteration; 4/4 phases; 5 commits e1c0aca..1848e8c; npm run ci exit 0; live 4/4 | —                    |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #576: https://github.com/Gamaroff/agent-skills/pull/576 | —                    |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.186.qa.{N}.*.md`; `task.186.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | 3 cycles: gate 1 CONCERNS → fix 3c7b6b8; gate 2 CONCERNS → fix 583983f; gate 3 CONCERNS, Diminishing-returns exit (route 2); 5c PR review CONCERNS | —                    |
| 7. finalise                | ✅ Done    | `task.186.dod.{N}.*.md`; task `status: accepted`                      | Run 1 GAPS (AC6 zsh lane); operator annotation `eb4c884`; run 2 ACCEPTED — `task.186.dod.2…`, acceptance commit `966a977` | —                    |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     |       | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-10-06

- Feature branch base: develop — auto-answered (AUTONOMOUS RUN, develop-next T186; recommended option, on `develop`)
- PR target branch: develop — auto-answered (AUTONOMOUS RUN, develop-next T186; recommended option)
- Phase 0d questions issued: 0 (both auto-answered per the develop-next directive; required count 2 — Q1 base, Q2 PR target)
- qa-planning gate: skipped (auto — no prompt)
- Phase 0 run inline (no 0a-parallel agents dispatched): file path known from the selector; inputs derived from the document — risk_level absent, phase_count 4, single_module false (evals + shared/resources + 5 skills) → PIPELINE_MODE=standard
- Always-load files resolved: 3 files — from skills-config.yaml `devLoadAlwaysFiles`, all present on disk
- Status at start: `Planned` — proceed; Step 2 `/review-task` validates and promotes
- Tracker: GitHub, issue #575
- Branch: `feature/task.186.eval-harness-hardening-and-leftovers` from `develop` @ `709e91ab` (create-branch; base pre-answered)
- Implementation report stashed before branch creation, restored after (clean pop)
- Tracker comment work-started: posted. GitHub board: work-started → In Progress (transitioned)
- Priority default block not run: issue was created by /create-task with a priority set; the block only fills an unset field

### Step 2 — review-task

- review-task ran (status `Planned`, no prior review report). Output: Comprehensive report — required for pipeline audit trail (auto)
- Review report: `docs/tasks/task.186.eval-harness-hardening-and-leftovers/task.186.review.1.eval-harness-hardening-and-leftovers.md`
- review-task Step 8.5 auto-answered: Yes, apply all critical + important fixes — pipeline proceeds autonomously
- review-task Step 9 auto-answered: Yes, fixes complete — Planned promoted to Ready for Development
- Review questions auto-answered with the recommended option: unknown assertion fn → `repeat.mjs` exit 2 (usage); `finalise/SKILL.md:162` in scope as a sixth numbering site
- Pre-pass agents B and C not dispatched — review done inline, no independent second reader
- Tracker key re-read at Step 2: unchanged (#575). Comments posted: `review-task` (posted), `review` (posted)

### Step 3 — develop

- Plan file found: `docs/tasks/task.186.eval-harness-hardening-and-leftovers/task.186.plan.eval-harness-hardening-and-leftovers.md` — included as implementation context
- Pre-develop surface map: 14 files identified in evals/shared (runner, repeat, claude-cli driver, fake-gh, assertions, 3 test files, README), shared/resources (pr-inline-comment.js + test, newest-numbered.sh), skills/review-pr (Step 7, next-report-number.sh, review-pr.test.js) and the 5 numbering SKILL.md sites — mapped inline during the Step 2 review (no Explore subagent: same files the review had just read)
- Step 3 inline — /develop not invoked: the plan file names every hunk and the review had already read every target file; /develop would only re-read them
- Fast gate: `develop.fastGateCommand` unset → `npm run ci:fast` (defined; precondition passed)
- Phase 4 decision: **Option 1** — `next_numbered` added to `shared/resources/newest-numbered.sh` beside `newest_numbered`; `skills/review-pr/scripts/next-report-number.sh` removed. Reason: one file defines "a numbered series" (which files, which number); Option 2 would have kept a second extraction rule in a second file. `newest_numbered` is left byte-identical: it returns a dated (non-numbered) member when no numbered one exists, and its callers rely on that, so the header states the one difference instead of merging the two passes
- A2 design: the known-name set lives in `evals/shared/lib/assertion-dispatch.mjs` as the dispatch table itself (`ASSERTION_FNS = Object.keys(DISPATCH)`), so the check cannot drift from the dispatcher; a test holds it equal to every assertion `assertions.mjs` exports
- A1 code: `process.exitCode = 1`, not `optInExit("EVAL_DRIVER_ERROR_EXIT")` — review O1: a hung setup reads as "not judged" under repeat, not "driver error"
- A5: `installFakeGh` throws `{ evalSkip: true }` when `jq` is absent; the runner's setup catch turns it into a skip, so every `installFakeGh` caller gets it with no change of its own. The skip line names `jq` (review O2)
- Every fix started from a red test and was mutation-proven: Phase 1 9/9 killed, Phase 2 6/6, Phase 3 red-before/green-after, Phase 4 8/8 (scripts in `.claude/state/t186-mut*.sh`)
- Commits (one per phase, then docs): e1c0aca, a44ee01, d165c00, 50cec1b, 1848e8c — pushed. d165c00 used `BUNDLE_PRECOMMIT_WARN=1`: the hook flagged Phase 4's bundle copies, which were committed in the next commit
- Gates: `npm run ci` exit 0 (5395 pass, 0 fail; eval:all 43 scenarios; bundle:check, validate:all, lint:shell clean); live `EVAL_RUNS=1 env -u ANTHROPIC_API_KEY npm run eval:review-pr:cli` 4/4 scenarios
- Tracker comment develop-complete: posted
- Population probes: `EVAL_*_EXIT` has no caller outside `evals/shared` (exit-code risk closed); `gh api` with `-f` and no method exists only in `pr-inline-comment.js` (the rest are GraphQL or explicit POST); the review-pr live fixtures carry every `--json` field the skill requests, so `pick()` failing closed changes no live scenario

### Step 4 — create-pr

- `/create-pr --base develop --issue 575 --scope docs/tasks/task.186.eval-harness-hardening-and-leftovers`; base pre-supplied (no prompt)
- SCOPE_PATHS: the work-item dir plus every directory the branch changed (26 entries, in `.claude/state/step4-scope-paths.txt`); no out-of-scope untracked file to hold
- Implementation report first committed here (`f3c54e7`); leak check: OK (the commit holds the report only)
- PR body written from the five commits rather than by the summariser subagent: every hunk was authored in this run
- PR created: https://github.com/Gamaroff/agent-skills/pull/576 — post-PR state OPEN at head `f3c54e79` (read directly with `gh pr view`, not via the poller subagent)
- Tracker comment in-review: posted. GitHub board: in-review → stage-disabled

### Step 7 — finalise

- `/finalise` ran in task mode; DoD file `task.186.dod.1.eval-harness-hardening-and-leftovers.md` (numbered with `next_numbered`)
- Four DoD agents in parallel: AC ⚠️ PARTIAL 9/10 (AC6 FAIL, execution rule); Security ✅ PASS (boundary true, 30 probes executed, 0 reproduced); Compliance ⚠️ NOT_APPLICABLE; Docs ✅ PASS
- CI reading 1: SUCCESS @ 07da88ccb6ad (over 5 checks) — not the blocker
- Decision: GAPS. AC6 needs an operator scope decision (task.185 dod.3 / task.176 precedent: annotate "zsh verified locally"), or zsh installed in `test.yml`. Fix-and-recheck (8a) not taken: the CI edit is outside the Files Summary, and an annotation is not a fix this run can make
- Gaps Change Log row, gap report section in the task body, gaps PR comment posted; status left at ready-for-review

### Resume — 2026-10-06

- Operator decision on AC6 (option 1): criterion annotated "zsh arm verified locally" (`eb4c884`), the task.185/176 precedent
- `reenter-qa-after-finalise.sh` refused `no-code-moved` (document-only fix) → resume at Step 7
- Lock restored from halt_snapshot via `--restore` at step 7

### Step 7 — finalise (run 2)

- DoD file `task.186.dod.2.eval-harness-hardening-and-leftovers.md` (`next_numbered` → 2); four agents re-run from scratch: AC ✅ PASS 10/10 (AC6 under the annotation); Security ✅ PASS (30 probes, 0 reproduced; fake gh 33/33); Compliance ⚠️ NOT_APPLICABLE; Docs ✅ PASS
- CI reading 1: SUCCESS @ 6723c207fd55 (over 5 checks); CI reading 2: SUCCESS (tree-equivalent to 4ee8a80c9ef3) @ 966a977c6ecb (over 5 checks, 30s)
- Accepted: `status: accepted`, `completed_date`, `pr_number: 576`, Change Log 1.2; run-1 gap section retitled historical/superseded; registry row ticked (`planned` → `accepted`); sprint review summary; acceptance commit `966a977` pushed; 6b assertions passed; 6d CHANGELOG cites task.186
- The PreCompact pause had removed the lock; restored via `--restore` before the finalise lock advance (step 7 → 8)
- The run-1 CI poll script in `.claude/state` was a simplified copy with no check-count floor; replaced with the canonical poll before reading 2
- PR canonical summary comment posted (https://github.com/Gamaroff/agent-skills/pull/576#issuecomment-6011319158); DoD body posted to PR (https://github.com/Gamaroff/agent-skills/pull/576#issuecomment-6011333682)
- Tracker: done comment `posted` (orchestrator re-post `already`); issue #575 closed, state read back `CLOSED`; board `done` → `already`; Document link already durable
- Task completed

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Step 7 HALT — DoD gaps (1), resolved by the operator annotation (`eb4c884`) and accepted in DoD run 2:** AC6 — the six call-site tests run under bash per PR, but the zsh arm of `shared/resources/tests/next-numbered.test.mjs` has no CI lane (`ubuntu-latest` has no zsh). Verified locally under zsh. Resolution is an operator decision: annotate the criterion (document-only → resume at 7) or install zsh in `.github/workflows/test.yml` (code → resume re-enters QA at 5a)

- Step 3: `npm run ci:fast` first run red on prettier (8 files) and on a bundle `MISSING` caused by a test comment naming a `shared/resources/` path (a bundling instruction). Both fixed; `test-clean-checkout.test.js` failed once on its own 10 s load budget and passed alone (it labels itself LOAD-SENSITIVE)
- Note, not fixed (out of scope): the fake `gh` refuses `api -X GET -f …` by design (README: "`-X GET` with a field flag" is refused), so the corrected inline-comment listing is still not servable by the fake. No eval drives `--inline` through it today

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-10-06
**Gate Result**: CONCERNS
**Issues Found**: 2 — CR-1 (medium): repeat.mjs counts liveAssertions under replay, live-only scenario passes 0/0; CR-3 (low): jq probe errors fake-gh unit tests without jq. Advisory: CR-2, CR-4–CR-7
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)
**Fix (5b)**: commit `3c7b6b8`, pushed. CR-1: `assertionsFor` / `driverNameFrom` in assertion-dispatch.mjs, used by runner and repeat (reads env.json). CR-3: jq-gated fake-gh tests + a no-jq meta-test. Fast gate `npm run ci:fast` exit 0 (5396 pass). Mutations: CR-1 3/3 killed, CR-3 1/1 killed (+1 `absorbed`: a redundant assertion). changes-requested: stage-disabled. Findings ingested inline (gate written this run), not by the ingester subagent

### QA Cycle 2 — 2026-10-06
**Gate Result**: CONCERNS
**Issues Found**: 1 — C2-CR-1 (medium, promoted after reproduction): the jq refusal fires under replay, so review-pr replay scenarios skip (exit 0) on a jq-less host. Advisory: C2-CR-2..7. Cycle 1 CR-1 and CR-3 FIXED
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)
**Fix (5b)**: commit `583983f`, pushed. C2-CR-1: jq refusal scoped to live drivers (`driverNameFrom` in new import-free `driver-name.mjs`); advisory C2-CR-2/3/5/6/7 fixed alongside. Narrowing residue (repeat subject: the jq probe) → move: scope the claim. Probe population 0 (rule lives only in evals README/CHANGELOG, both updated). Fast gate: first run red on the load-sensitive clean-checkout budget (10035 ms; passed alone), re-run exit 0 (5397 pass). Mutations 3/3 killed

### QA Cycle 3 — 2026-10-06
**Gate Result**: CONCERNS
**Issues Found**: 1 — C3-CR-1 (medium, test machinery): the no-jq meta-test self-satisfies its skipped check and has no pass floor; carried to recommendations.future. Advisory C3-CR-2/3. Gate 2 C2-CR-1 FIXED
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: CONCERNS — `task.186.pr-review.1.eval-harness-hardening-and-leftovers.md`: PC-1 (trail, medium/medium: Deferred Work under-recorded — fixed in the work item), PC-2 (scope, low: driver-name.mjs missing from Files Summary — fixed), CR-1 (bug, medium/medium: next_numbered reads a failed find as an empty series — deferred), CR-2 (cleanup: README runner-exit sentence — deferred). No high/high finding; does not block. ready-for-merge: stage-disabled
**Loop exit**: Diminishing-returns exit taken — HIGH is 0 for cycles 2 and 3, and all 1 remaining findings are in test machinery — the loop has finished working rather than stopped working. This is a CLEAN exit, not a stall: nothing was blocked and nothing is being accepted over. The residue is recorded in the gate's `recommendations.future`.
**Action**: Proceeding to 5c (PR conformance review)

---

## Completion

**Finished**: 2026-10-06 07:15 UTC
**Final Status**: Completed
**Branch**: feature/task.186.eval-harness-hardening-and-leftovers
**PR**: https://github.com/Gamaroff/agent-skills/pull/576
**QA Iterations**: 3
**DoD Summary**: `task.186.dod.2.eval-harness-hardening-and-leftovers.md` (run 1: `task.186.dod.1…`, GAPS)
**Tracker debt**: none

**Completion Summary**: Implemented the four task.185 follow-up phases. (1) The runner and `repeat.mjs` never score a non-verdict as a verdict, sharing one assertion table, with the opt-in exit codes moved to 73/74/75. (2) The fake `gh` labels every refusal and fails closed on version argv, `-R` and missing `pick()` fields. (3) `pr-inline-comment.js` lists comments with `-X GET`. (4) Six skills number reports highest + 1 through `next_numbered`. Three QA cycles fixed CR-1, CR-3 and the C2-CR-1 regression (the jq refusal under replay), then exited by the Diminishing-returns route. DoD run 1 stopped on AC6's zsh lane; it was accepted in run 2 after the operator scope annotation. Follow-ups are in the task's Deferred Work.

---

## Pipeline Paused — 2026-10-06T07:01:20Z

⏸️ **Context compaction imminent.** The `/develop-task` orchestrator was halted by the PreCompact hook before Claude's context could be summarised.

**State at pause**:

- Skill: `/develop-task`
- Branch: `feature/task.186.eval-harness-hardening-and-leftovers`
- Last step boundary: Step 7
- PR: https://github.com/Gamaroff/agent-skills/pull/576
- Tracker: github #575

**Resume**: re-invoke `/develop-task <path>` (same path) and choose **Resume from last completed step** when prompted. Phase 0b will read this report, verify completed-step artifacts, and re-run Step 7.

**Pipeline Progress** for this step is now `⏸️ Paused` — equivalent to `⏳ Pending` for resume purposes (the step will re-run from the start).


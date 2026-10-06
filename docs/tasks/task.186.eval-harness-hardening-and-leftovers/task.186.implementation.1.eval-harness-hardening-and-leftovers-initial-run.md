# Implementation Report: Eval harness hardening and task.185 leftovers

**Task**: `task.186.eval-harness-hardening-and-leftovers.md`
**Run Number**: 1
**Started**: 2026-10-06 04:46
**Status**: In Progress

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
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.186.qa.{N}.*.md`; `task.186.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.186.dod.{N}.*.md`; task `status: accepted`                      |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

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

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- Step 3: `npm run ci:fast` first run red on prettier (8 files) and on a bundle `MISSING` caused by a test comment naming a `shared/resources/` path (a bundling instruction). Both fixed; `test-clean-checkout.test.js` failed once on its own 10 s load budget and passed alone (it labels itself LOAD-SENSITIVE)
- Note, not fixed (out of scope): the fake `gh` refuses `api -X GET -f …` by design (README: "`-X GET` with a field flag" is refused), so the corrected inline-comment listing is still not servable by the fake. No eval drives `--inline` through it today

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: feature/task.186.eval-harness-hardening-and-leftovers
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}

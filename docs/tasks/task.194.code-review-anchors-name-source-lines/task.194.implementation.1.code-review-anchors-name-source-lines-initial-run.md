# Implementation Report: Code-review findings anchor to source lines

**Task**: `task.194.code-review-anchors-name-source-lines.md`
**Run Number**: 1
**Started**: 2026-10-07 00:00
**Status**: Completed

---

## Summary

Run task.194 end to end: name `file_line` as the PR-head source line, add `line_text`, ship a shared `finding-anchors.js` checker, and wire it into the four code-review dispatchers.

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
| Board status        | In Progress ✅ (Todo → In Progress, verified)                               |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.194.*` exists in git                             | Branch created at `2c8382c1`; pushed | —                    |
| 2. review-task             | ✅ Done | `task.194.review.{N}.{name}.md` exists (or skip logged)               | `task.194.review.1.code-review-anchors-name-source-lines.md`; Planned → Ready for Development; 6/10 → 9/10 | —                    |
| 3. develop                 | ✅ Done | Task status == `Ready for Review`                                      | Inline from plan; 4/4 phases; fast gate 5474/5477 (2 LOAD-SENSITIVE, green alone); 4 mutation proofs | —                    |
| 4. create-pr               | ✅ Done | PR URL; issue comment posted                                           | PR #596: https://github.com/Gamaroff/agent-skills/pull/596 | —                    |
| 5–6. qa-task / qa-fix loop | ✅ Done | `task.194.qa.{N}.*.md`; `task.194.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | 3 cycles; gates CONCERNS 80 → 70 → 90; 5c review-pr CONCERNS (task.194.pr-review.1); fixes e9b8535f, a73d84e0 | —                    |
| 7. finalise                | ✅ Done | `task.194.dod.{N}.*.md`; task `status: accepted`                      | `task.194.dod.1…`; accepted; CI 2 SUCCESS @ c6647ab5; #595 closed | —                    |
| 8. commit-changes          | ✅ Done | All artifacts committed and pushed                                     | Implementation report committed and pushed; lock completed | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.

---

## Decisions Log

### Pipeline Startup — 2026-10-07

- Feature branch base: develop — user chose the recommended option (on `develop` at start).
- PR target branch: develop — user chose the recommended option.
- qa-planning gate: skipped (auto — no prompt)
- Questions asked (count 2, matches table): Q1 branch base → develop; Q2 PR target → develop.
- Phase 0 run inline (no 0a-parallel agents dispatched — Explore subagents have hung in this repo before). Lite-mode inputs derived from the document: risk_level=absent (risk_ok), phase_count=4, single_module=false → PIPELINE_MODE=standard.
- Task status at start: `Planned` — proceeding; Step 2 (`/review-task`) validates and promotes.
- Tracker: github, issue #595.
- Branch: `feature/task.194.code-review-anchors-name-source-lines` (from develop @ `2c8382c1`). Implementation report stashed before branch creation, restored after.
- Tracker: work-started comment posted on #595 (`posted`); board work-started → transitioned Todo → In Progress (verified). Priority already P2 Medium — unchanged.
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md (from skills-config.yaml devLoadAlwaysFiles).


### Step 2 — review-task

- review-task output: Comprehensive report — required for pipeline audit trail.
- Review report: docs/tasks/task.194.code-review-anchors-name-source-lines/task.194.review.1.code-review-anchors-name-source-lines.md
- Pre-pass B/C run inline (no Explore subagents); independence loss recorded in the review report.
- 1 Critical (falsified invariant: plan regex `^(.+?):` parses the compound ref as a path), 6 Important, 2 Optional. Autonomous decisions D1–D4 recorded in the review report; no user questions needed.
- review-task Step 8.5 auto-answered: Yes, apply all critical + important fixes — pipeline proceeds autonomously. 7 fixes applied, 0 skipped.
- review-task Step 9 auto-answered: Yes, fixes complete — Planned promoted to Ready for Development by review-task.
- Review outcome comment posted to github issue 595 (`review-task` and `review` stages, both `posted`).

### Step 3 — develop

- Pre-develop surface map: 13 files identified in shared/resources (2 prompts, new engine + test), 4 dispatcher SKILL.md files, 2 skill test files, evals/shared/tests, CHANGELOG. Mapped inline during Step 2 (no Explore subagent — independence loss recorded).
- Plan file found: docs/tasks/task.194.code-review-anchors-name-source-lines/task.194.plan.code-review-anchors-name-source-lines.md — included as implementation context for /develop
- Step 3 inline — /develop not invoked: the plan names every hunk, and both preconditions (plan file, surface map) are recorded above.
- Fast gate precondition: develop.fastGateCommand unset → `npm run ci:fast`, which this project defines.
- `.agents/skills` symlink moved aside for the fast gate so a local green matches CI (trap in project memory), restored by an EXIT trap.
- QA-skill findings JSON written through a quoted heredoc, not `printf '…'`: a `line_text` quoting `'use strict';` would have broken the single-quoted literal.
- Loop audit run inline: 0 unticked boxes, status Ready for Review → loop exit after iteration 1.
- Development completion comment posted to github issue 595 (`posted`).
- Mutation proofs: 4 (population call removed in a copy; `line_text` comparison → `true`; `--inline` select removed; anchor regex reverted to `^(.+?):`). Each went red; each original restored and checked with `cmp`.


### Step 4 — create-pr

- SCOPE_PATHS: work-item dir, CHANGELOG.md, shared/resources, skills/{develop-story,develop-task}/references, skills/{qa-story,qa-task,review-code,review-pr} (+ their references/tests), and evals/shared/tests/finding-anchors-callers.test.mjs (a new untracked file in a directory with no tracked change, added by hand per the step doc).
- Pre-flight guard: 0 files held (every untracked file was in scope). Leak check: OK.
- Commits: 895ed311 feat(review) …; fa1b9676 docs(task.194) …. Pushed.
- PR body written directly from the change set (no summariser subagent).
- PR created: https://github.com/Gamaroff/agent-skills/pull/596 (state OPEN).
- Issue #595 in-review comment: `posted`. GitHub board: in-review → stage-disabled.

### Step 7 — finalise

- `/finalise` invoked (not inlined). DoD summary: `task.194.dod.1.code-review-anchors-name-source-lines.md` — Final Status ✅ ACCEPTED.
- CI reading 1: SUCCESS @ d0eef60ca9e7 (5 checks); CI reading 2: SUCCESS @ c6647ab51eb2 (5 checks, 150 s poll, backgrounded).
- Pre-finalise: the Step 5c PR review report was committed on its own (`d0eef60c`) so reading 1 was taken on a head carrying the full trail.
- Security DoD agent returned FAIL on the zero-guard (it could not create the probe wrapper); the caller ran the engine as the agent's own remedy named — 11 executed, 0 reproduced, `task.194.dod.1.security.run.json` — and the DoD records the override as a deviation.
- Acceptance commit `c6647ab5` (document, DoD, sprint review, registry, DoD security record); 6b assertions passed on origin; 6d CHANGELOG cites task.194.
- DoD body posted to PR: https://github.com/Gamaroff/agent-skills/pull/596#issuecomment-6036480390; canonical summary: #issuecomment-6036453380.
- Issue close: GitHub #595 CLOSED (confirmed); Document link already on develop; tracker `done` comment `posted`.
- Board transition: done → `already`.
- Registry: `ticked` (line 238). Tracker debt: none (journal absent).
- Task completed.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Step 3 — scripted edit spliced the task document (resolved).** A `String.replace` with a replacement string containing `$` + backtick and `$` + quote duplicated the document into itself (1410 lines, 3 H1s). Rebuilt from the prefix, the intended section and the true suffix; every line removed vs HEAD checked to be an intended edit. Logged as observation #292.
- **Step 3 — machine load.** Load average 65–80 during the run; `review-pr.test.js` took 600 s (248/248 pass), the slowest cases being pre-existing Step 0b shell tests.

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-10-07
**Gate Result**: CONCERNS
**Issues Found**: 2 — CR-1 (unresolvable `--rev` reads as `no-such-file`, exit 1), SEC-1 (working-tree reader follows a symlink out of `--root`, measured 11 probes); advisory CR-2, CR-3
**HIGH findings**: 0
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)
**Fix**: `e9b8535f` — CR-1 (`resolveRev()`, exit 2 `bad-rev`) and SEC-1 (real-path containment); both mutation-proven; probe now `engages`. CR-2/CR-3 advisory, deferred. Pushed once. Findings ingested inline (this session wrote the gate). changes-requested → stage-disabled.

### QA Cycle 2 — 2026-10-07
**Gate Result**: CONCERNS
**Issues Found**: 4 — CR2-1 (`--rev` route ignores `--root`), CR2-2 (unresolvable `--root` reads as reviewer-wrong), CR2-3 (stale bad-rev prose in review-pr Step 6), CR2-4 low (directory anchor on `--rev`); cycle 1 CR-1/SEC-1 verified fixed (bugs 1, 2 closed)
**HIGH findings**: 0
**MEDIUM findings**: 3
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)
**Fix**: `a73d84e0` — consolidate move: `checkTree()` preflight (bad-root, bad-rev) and root-relative `cat-file blob` reads on both routes (CR2-1, CR2-2, CR2-4); review-pr Step 6 prose (CR2-3). Three engine mutations each caught. Documentation probe run on behaviour phrases (obs #293 logged for cycle 1's phrase choice). Pushed once.

### QA Cycle 3 — 2026-10-07
**Gate Result**: CONCERNS
**Issues Found**: none gated; 2 advisory (confidence medium, reproduced) — exit 1 conflates malformed anchors with an unloadable script at the dispatcher blocks; a `--root` absent from the `--rev` tree passes the preflight. Cycle 2 fixes verified; bugs 1–5 closed
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: CONCERNS
**Loop exit**: n/a — this exit not taken
**Action**: Proceeding to 5c (PR conformance review)
**5c**: `/review-pr --effort medium --comment` → ⚠️ CONCERNS — conformance lens 0 findings; code lens 4 (3 medium, 1 low, all confidence medium; anchors all verified). Report: `task.194.pr-review.1.code-review-anchors-name-source-lines.md`. ready-for-merge → stage-disabled. Loop exits to Step 7.

---

## Completion

**Completion Summary**: Implemented task.194 end to end. The shared code-review prompt now defines `file_line` as the PR-head source line and adds `line_text`; a new engine, `shared/resources/finding-anchors.js`, classifies every reviewer anchor (six verdicts, `checkTree()` preflight for `bad-root` / `bad-rev`, root-relative reads on both routes, real-path containment) and `/review-pr`, `/review-code`, `/qa-task` and `/qa-story` run it before rendering, posting or gating. Three QA cycles found and closed five defects (bugs 1–5), each fix mutation-proven; the PR #594 replay shows all six patch-line anchors flagged `out-of-range`. Accepted with CI green on both readings. Notable decisions: verdict key `anchor_check` (not `anchor`), the consolidate move in cycle 2, and the DoD security override recorded as a deviation. Advisory follow-ups are listed in gate 3 and `task.194.pr-review.1`.

**Finished**: 2026-10-07 11:00 UTC
**Final Status**: Completed
**Branch**: feature/task.194.code-review-anchors-name-source-lines
**PR**: https://github.com/Gamaroff/agent-skills/pull/596
**QA Iterations**: 3 (gates CONCERNS 80 → 70 → 90; 5c review-pr CONCERNS)
**DoD Summary**: docs/tasks/task.194.code-review-anchors-name-source-lines/task.194.dod.1.code-review-anchors-name-source-lines.md
**Tracker debt**: none

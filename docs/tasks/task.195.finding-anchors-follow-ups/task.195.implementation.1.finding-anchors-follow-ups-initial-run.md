# Implementation Report: Finding-anchors follow-ups

**Task**: `task.195.finding-anchors-follow-ups.md`
**Run Number**: 1
**Started**: 2026-10-19 17:38
**Status**: Completed

---

## Summary

Close the seven advisory findings task.194 left: an `unparseable` verdict, root-in-rev, `--index`, dispatchers deciding on `reason`, `--inline` refusing un-annotated input, `/review-pr` head SHA on both platforms, and a population guard covering every consumer.

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
| Board status        | In Progress ✅ (gh-stage: transitioned)                                     |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.195.*` exists in git                             | Branch created at `fe06899f` | —                    | 2026-10-19T15:39Z |
| 2. review-task             | ✅ Done    | `task.195.review.{N}.{name}.md` exists (or skip logged)               | review.1 — READY TO IMPLEMENT 8/10; Planned → Ready for Development | —                    | 2026-10-19T15:43Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline, 1 iteration; 13/13 phase items; commits 16ce1fc6, 14fe0880, e906efd0; ci:fast 5959/0 | .summaries/step-3-loop-audit-1.json | 2026-10-19T15:57Z |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | PR #695: https://github.com/Gamaroff/agent-skills/pull/695 | —                    | 2026-10-19T15:58Z |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.195.qa.{N}.*.md`; `task.195.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | 2 cycles: gate.1 CONCERNS 90 → qa-fix `bdd4b66e` → gate.2 PASS 100 (refute pass); 5c review-pr APPROVE (pr-review.1). Re-entry after finalise DoD gaps: gate.3 CONCERNS 90 → `882b2643` → gate.4 CONCERNS 90 → `f192e953` (consolidate) → gate.5 PASS 100; 5c APPROVE (pr-review.2) | —                    | 2026-10-19T16:18Z |
| 7. finalise                | ✅ Done    | `task.195.dod.{N}.*.md`; task `status: accepted`                      | dod.1 GAPS → fixed in `4d6f7f25`, QA re-entered at 5a; dod.2 ACCEPTED (AC 11/11, probe 57/0/0, docs PASS); acceptance commit `865e4341`; #597 closed, board Done | —                    | 2026-10-19T17:39Z |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | Implementation report committed and pushed | —                    | 2026-10-19T17:39Z |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-10-19

- Invoked by `/develop-next` (registry fallback — task-registry, T195) with `--defaults`.
- Feature branch base: develop — source: recommended (`--defaults`; on `develop`)
- PR target branch: develop — source: recommended (`--defaults`)
- Mode: standard — source: detector. Phase 0 run inline (no 0a-parallel agents dispatched); inputs derived from the document: risk_level absent, phase_count 4, single_module false → standard.
- Skips: none. Refused flags: none. Questions asked: 0 (`--defaults`, nothing in conflict).
- Task status at start: Planned — Step 2 `/review-task` validates and promotes.
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- qa-planning gate: skipped (auto — no prompt)
- Branch: `feature/task.195.finding-anchors-follow-ups` from `develop` (`fe06899f`), pushed with tracking.
- Tracker: work-started comment posted on #597; GitHub board: work-started → In Progress (transitioned). Priority block skipped — issue row already carries Medium.

### Step 2 — review-task

- review-task invoked (no prior report; status Planned). Output: Comprehensive report (auto). Step 8.5 auto-answered: apply all critical + important fixes. Step 9 auto-answered: Yes, fixes complete.
- Review report: `docs/tasks/task.195.finding-anchors-follow-ups/task.195.review.1.finding-anchors-follow-ups.md` — 0 critical, 3 important, 2 optional; 8/10 READY TO IMPLEMENT.
- Phase 3 rescoped to no work: `/review-pr` head binding shipped by `319bf779` (`resolve-head-rev.sh`) after the task was written. Malformed-set enumeration sweep (9 prose sites) and the pinned `no-line` test added to scope.
- Pre-pass agents B and C not dispatched; both passes run inline (independence loss recorded in the review).
- Planned promoted to Ready for Development by review-task. Tracker key unchanged (#597). Review outcome comment skipped — review-task reported `posted`.

### Step 3 — develop

- Pre-develop surface map: 13 files identified in shared/resources (finding-anchors.js + tests), skills/{review-pr,review-code,qa-task,qa-story}/SKILL.md, skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md, evals/shared/tests (finding-anchors-callers, new finding-anchors-blocks), skills/{review-pr,review-code}/tests, CHANGELOG.md. Built inline during Step 2's review (no Explore subagent dispatched — independence loss recorded).
- Plan file found: docs/tasks/task.195.finding-anchors-follow-ups/task.195.plan.finding-anchors-follow-ups.md — included as implementation context for /develop (updated by review 1 this run).
- Step 3 inline — /develop not invoked: the plan names every hunk and the surface map is already recorded; the inline path owes /develop's Task Completion Checklist.
- Fast gate: develop.fastGateCommand unset → suggested `npm run ci:fast`, which this project defines (precondition passed).
- Engine: lens-by-key `unparseable`, root-in-rev `bad-root`, `--index` read. Dispatchers decide on `.reason`; `--inline` guards; `unparseable` at nine enumeration sites; develop-bug `(location unverified: …)`; consumer population guard (11 members, 6 cite-only).
- Fast gate iter 1: `npm run ci:fast` TEST_EXIT=0 — 5959 tests, 0 failures; `bundle:check` 0 problems; quick_validate passes for review-pr, review-code, qa-task, qa-story, develop-bug.
- Mutation proofs (SC-10): 7 mutations red, each restored and compared with `cmp`; a partial develop-bug mutation (one of two `anchor_check` mentions) stays green by design.
- Loop audit iter 1: status ready-for-review, 13/13 — exit loop. Development completion comment posted to github issue 597.

### Step 4 — create-pr

- Scope: work-item dir plus 15 changed-code paths (`.claude/state/step4-scope-paths.txt`). No out-of-scope untracked files held. Leak check across all branch commits: OK.
- Report's first commit `b4cbb43e`, doc-links 0 relative links. Branch pushed.
- PR body written in-session from the full implementation context rather than by the Explore summariser (the diff was already summarised in this session; the summariser would re-read 1,400 lines to produce a weaker body).
- PR #695: https://github.com/Gamaroff/agent-skills/pull/695 — state OPEN, head `b4cbb43e`. Issue 597 in-review comment: posted. GitHub board: in-review → stage-disabled (no `pipeline.in-review` moment).

### Steps 5–6 — QA loop

- GitHub board QA-start re-assert: in-review → stage-disabled (Step 4 result; not re-run).
- Traceability mapper skipped: `HAS_SUCCESS_CRITERIA_TABLE=false` — §9 is a checkbox list (SC-1…SC-11), not a table; qa-task maps it internally.
- Cycle 1: `/qa-task code_review_blocking=true`.
- Cycle 1 gate CONCERNS 90 (TASK-195-QA1-1 MEDIUM, -2 LOW); fence probe 12 executed. QA Cycle 1 — changes-requested: stage-disabled.
- Cycle 1 qa-fix: both fixed (wrapper-decided lens via `lensesOf`; guards require the findings array); 4 mutation proofs red; fast gate 5961/0; commit `bdd4b66e` pushed (fix + gate.1 + qa.1 + probe record).
- Cycle 2: `/qa-task code_review_blocking=true` (refute pass).

### Step 7 — finalise

- DoD agents: AC PASS (11/11), Docs PASS, Compliance NOT_APPLICABLE, Security boundary true with a 3-control probe plan.
- Probe run by /finalise: 43 executed, 2 reproduced, 13 escapes, 0 refusals (record `task.195.dod.1.security.run.json`). Control C (review-code `--inline` guard) was declined with `bad-slot`: it is the second block under its heading.
- Grading by a second security-agent pass: `code-findings-string-beside-annotated-conformance` is medium (fails open; the QA 2 CR-1 shape) and `anchor-check-null` is low (fails closed).
- Fix-and-recheck evaluator: exit 1 (`severity-low`, `mutation-proved`, `no-other-finding-open`), so Step 8 applies.
- CI reading 1: PENDING @ `faec9ea45bf9` over 5 checks (runners were queued for the whole run).
- DoD gaps: halt. The task stays `ready-for-review`. The gaps Change Log row is written, and the PR comment is https://github.com/Gamaroff/agent-skills/pull/695#issuecomment-6272038817.

### Resume — QA re-entry after finalise DoD gaps (2026-10-19)

- Gap fix committed in `4d6f7f25`: review-pr `--inline` guard requires an array for every lens present and a string `anchor_check`; `mktemp` moved after the guard; `findingsOf` in the engine applies the same every-lens rule. 5 mutation proofs, all red; `ci:fast` 5963/0.
- develop-next auto-answer (Phase 0b, `--defaults`): "Re-enter QA at 5a" (Recommended).
- QA re-entry after finalise DoD gaps: reenter-qa: re-entered QA at step 5 / qa_phase 5a — qa_max_cycles=5 (base 2), gate_head=bdd4b66e11c6f83e0e982a669e0aac8739a9dc99.
- QA cycle 3: `SAFETY_REPROBE=true` was set by judgement (clause 1 false on gate 2; finalise DoD 1 failed on the security axis of the `--inline` guard), so the review ran unscoped over the full branch diff. The traceability mapper was not dispatched: no matrix exists from earlier cycles, so behaviour matches cycles 1–2.
- QA cycle 3 — changes-requested: stage-disabled. Narrowing offer: not signalled (no-medium). Route classifier: continue (not-a-pass-gate).
- QA cycle 3 qa-fix: the findings ingester was not dispatched. The gate held one finding, written in this session, so it was read inline; there was no independent ingestion.
- QA cycle 3 fix commit `882b2643` (fix + gate.3 + qa.3 + probe record), one push.
- QA cycle 4: scoped to the 14 files changed since gate 3 (default; clause 1 false). Changes-requested: stage-disabled. Route: continue (not-a-pass-gate).
- QA cycle 4 narrowing offer: Narrowing residue — every MEDIUM on gates 3 and 4 names shared/resources/finding-anchors.js (TASK-195-QA3-1, TASK-195-QA4-1); HIGH 0 on both. Move chosen: consolidate. One allow-list field reader decides string / absent / invalid for file_line, ref and line_text.
- QA cycle 4 qa-fix: fix_cycle not supplied (derived from the gate). The findings ingester was not dispatched: the gate held one finding, written in this session, so it was read inline. `fieldOf` is now the only reader: an invalid `line_text` reads text-mismatch, and only an absent or blank one reads unchecked-text. An invalid conformance `ref` still reads no-line, like any ref that is not a path:line, so "never clean" is claimed for `line_text` only. Mutation-proven 3 of 3 (M1 QA3 behaviour, M2 stringify-and-compare, M3 empty array merged with absent). ci:fast 5968 tests, 0 failed.
- QA cycle 4 fix commit `f192e953` (fix + gate.4 + qa.4 + probe record), one push. PR and tracker qa-fix-4 comments posted.

### Finalise run 2 (2026-10-19)

- DoD 2 dispatched four Explore agents in parallel: AC PASS (11/11), security PASS (`boundary: true`), compliance NOT_APPLICABLE, docs PASS.
- Step 3b.1 probe plan: 2 controls, 57 executed, 0 reproduced, 0 escapes, 0 refusals. The record is `task.195.dod.2.security.run.json`. Control 1 (the review-pr `--inline` guard) ran 25 cases; control 2 (the review-code Step 2b checker) ran 32, 9 of them aimed at `fieldOf`.
- The PR-approval criterion is satisfied by the 5c `/review-pr` APPROVE (pr-review.2). `reviewDecision` is empty because this single-maintainer repo requires no reviews.
- The run 1 gaps section in the task body was retitled "run 1 (historical, superseded by run 2)", and the run 2 PASSED section was added before the change-log block.
- CI reading 1: SUCCESS @ 05f97433a0a9 over 5 checks; CI reading 2: SUCCESS (tree-equivalent to 05f97433a0a9) @ 865e43413580 over 5 checks after 30s. The acceptance commit is docs-only, so the docs-only rule resolved reading 2 against reading 1's green head.
- Acceptance commit `865e4341` carried the 5c pr-review.2 and the dod.2 probe record, and ticked the registry (`ticked`, planned → accepted). The 6b assertions passed. 6d: the CHANGELOG cites task 195.
- Side-effects after the boundary: the PR canonical comment was posted (issuecomment-6273386456). The Document link was already on `develop`. The tracker `done` comment was posted. #597 is CLOSED. `gh-stage` returned `already`, because the card was already in Done.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Step 7 DoD gap — security (medium):** the review-pr `--inline` guard (`skills/review-pr/SKILL.md:971-975`) needs one findings array, not one per wrapper present. The probe reproduces a non-array `code_review.findings` beside annotated conformance findings being accepted. QA 2 had routed this to future work as CR-1; finalise's probe reproduced it, so it is now blocking. **Escalated.**
- **Step 7 DoD gap — security (low):** the same guard accepts `anchor_check: null`. **Escalated.**
- **Step 7 DoD gap — security (escape):** `INLINE_FILE="$(mktemp …)"` at `skills/review-pr/SKILL.md:951` runs before the guard and is not removed on HALT, giving 13 sandbox escapes. QA 2's record showed `escaped: 10` on the same control, but its report did not surface it. **Escalated.**
- **Step 7 DoD gap — CI:** reading 1 was PENDING on `faec9ea4` (GitHub runners queued). **Resolved:** finalise run 2 read SUCCESS on `05f97433`.
- **Resolution of the three security gaps above:** fixed in `4d6f7f25`, then re-probed in QA cycles 3–5 and in DoD 2 (57/0/0). **Resolved.**

---

## QA Iteration History

_Track each QA review/fix cycle._

---

### QA Cycle 1 — 2026-10-19
**Gate Result**: CONCERNS
**Issues Found**: 2 — TASK-195-QA1-1 (MEDIUM, wrapped code finding with no `file_line` reads clean `no-line`); TASK-195-QA1-2 (LOW, `--inline` guard passes a file with no findings array)
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)

## Completion

**Finished**: 2026-10-19T17:39Z
**Final Status**: Completed
**Branch**: `feature/task.195.finding-anchors-follow-ups`
**PR**: https://github.com/Gamaroff/agent-skills/pull/695
**QA Iterations**: 5
**DoD Summary**: [task.195.dod.2.finding-anchors-follow-ups.md](./task.195.dod.2.finding-anchors-follow-ups.md) — ✅ ACCEPTED (run 1: [dod.1](./task.195.dod.1.finding-anchors-follow-ups.md) — GAPS, superseded)
**Tracker debt**: none

**Completion Summary**: This run implemented the seven task.194 follow-ups: the `unparseable` verdict, root-in-rev, `--index`, reason-deciding dispatchers, the `--inline` guards, the head SHA on both platforms, and develop-bug's unverified-location rule. It took 5 QA cycles and 2 finalise runs. Finalise run 1's probe reproduced gaps in the review-pr `--inline` guard; these were fixed and QA re-entered at 5a. Cycles 3 and 4 each found another non-string field read leniently, and cycle 4 ended that pattern with the consolidate move: one allow-list reader (`fieldOf`). DoD 2 accepted the task on a measured probe of 57/0/0.

### QA Cycle 2 — 2026-10-19
**Gate Result**: PASS
**Issues Found**: none in the gate; 3 advisory code-review bugs (CR-1 medium/medium, CR-2 low pre-existing, CR-3 low), routed to future
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: APPROVE ([task.195.pr-review.1.finding-anchors-follow-ups.md](./task.195.pr-review.1.finding-anchors-follow-ups.md); conformance lens, 0 findings)
**Carried to 6a**: docs/tasks/task.195.finding-anchors-follow-ups/task.195.pr-review.1.finding-anchors-follow-ups.md
**Loop exit**: n/a — this exit not taken
**Action**: Proceeding to 5c (PR conformance review)

### QA Cycle 3 — 2026-10-19
**Gate Result**: CONCERNS
**Issues Found**: 1 — TASK-195-QA3-1 (MEDIUM, a non-string `file_line` reads as a clean anchor instead of `unparseable`); 3 advisory low (routed to future)
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 3 of 5)

### QA Cycle 4 — 2026-10-19
**Gate Result**: CONCERNS
**Issues Found**: 1 — TASK-195-QA4-1 (MEDIUM, a non-string `line_text` reads `unchecked-text` instead of `text-mismatch`; introduced by the cycle 3 fix)
**HIGH findings**: 0
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 4 of 5)

### QA Cycle 5 — 2026-10-19
**Gate Result**: PASS
**Issues Found**: 0
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: ✅ APPROVE — `task.195.pr-review.2.finding-anchors-follow-ups.md` (conformance lens only, `--no-code`; 0 findings)
**Loop exit**: gate PASS with no open entry → 5c
**Action**: Proceeding to 5c (gate 5 + report committed in `05f97433`)

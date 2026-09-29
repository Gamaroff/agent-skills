# PR Review Report: PR #506 — fix(task.163): step-8 Stop reason names develop-bug's checklist and every step ahead

**Reviewed:** 2026-09-28
**PR:** [#506](https://github.com/Gamaroff/agent-skills/pull/506) — `feature/task.163.stop-hook-step-8-follow-ups` → `develop` (OPEN)
**Work item:** [`task.163.stop-hook-step-8-follow-ups.md`](./task.163.stop-hook-step-8-follow-ups.md) — resolved via `branch stem`
**Tracker:** [#504](https://github.com/Gamaroff/agent-skills/issues/504) — OPEN
**Verdict:** ⚠️ CONCERNS

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.163.implementation.1.stop-hook-step-8-follow-ups-initial-run.md`. Committed at Step 4; later updates are deferred to Step 8 by design |
| Review report | ✅ | `task.163.review.1.stop-hook-step-8-follow-ups.md` (READY TO IMPLEMENT, 9/10) |
| QA reports | 3 | `task.163.qa.1…`, `task.163.qa.2…`, `task.163.qa.3…` |
| Gate | PASS | `task.163.gate.3.stop-hook-step-8-follow-ups.yml` (100). Cosmetic-residue exit carried 2 LOW findings to `recommendations.future` |
| DoD | ❌ | Not yet written. The pipeline is at Step 5c, and `/finalise` (Step 7) writes it |
| Sprint review | ❌ | Not yet written (Step 7) |
| Open bugs | 0 | — |
| Handover | ❌ | None. No tracker action was deferred |

Scope note: the diff excludes the 15 generated `*/references/*` bundle copies. The Files Summary names them only generically (item 7), so none is a deliberate authored change.

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| At lock 8 with `skill: develop-bug`, the reason names the Step 7 Completion Checklist | `shared/resources/develop-pipeline-on-stop.sh` `STEP7_TAIL`; `develop-pipeline-on-stop.test.sh` 5b | ✅ met. The shipped wording is refined from the spec's; see PC-1 |
| Contract names the same checklist; parity test red if either copy drops it | `develop-pipeline-resume-contract.md` Phase 0b; `step-8-completion-checklist.test.mjs` parity test | ✅ met |
| Lock 8 has no generic steps-ahead clause; lock 3 keeps it | `STEPS_AHEAD`; 5c, 5d | ✅ met. The shipped lock-8 wording is refined from the spec's; see PC-1 |
| `--complete` population test fails when the hook contributes nothing | `step-8-completion-checklist.test.mjs` hook floor | ⚠️ partial. The floor counts comment lines (CR-1) |
| 4b fails at setup naming a missing command; builtin skipped | `advance-pipeline-lock.test.sh` 4b | ✅ met (dev-only coverage of the empty arm, recorded in the gate) |
| No measurable performance change | text and tests only | ✅ met |
| Gates pass | `ci:fast`, `lint:shell`, `bundle:check` recorded per cycle | ✅ met |
| Mutations behave as stated | M1–M14 in the implementation report and QA reports | ✅ met |
| CHANGELOG cites (task 163) | `CHANGELOG.md` `[Unreleased]` › Fixed | ✅ met |

## Conformance Findings

```
[PC-1] consistency · medium · confidence: high — task doc §1 deliverable 1, §3 Target Architecture, §6 Phase 1, §9 SC-1; plan lines 25, 34, 42, 47
  The task doc and plan still describe the develop-bug tail as ending with "Part B's Step 7 Completion Checklist", and the lock-8 clause as "Step 7's tail first if its row is unfinished, then Step 8". QA cycles 1–2 replaced both, and the shipped hook, contract and tests now require the opposite (the checklist outside Part B's list; "the first unfinished row at or below Step 7, if any, then Step 8").
  → Before /finalise traces the success criteria, align deliverable 1, Target Architecture, the Phase 1 checkbox and SC-1 with the shipped wording. Add a superseded note to the plan.
```

## Code Review Findings

```
[CR-1] cleanup · low · confidence: medium — shared/resources/tests/step-8-completion-checklist.test.mjs:627
  The new hook floor (perSkill[STOP_HOOK] || 0) >= 1 passes on comment lines alone. Three of the hook's five --complete lines are # comments. Its message says it pins "the step-8 COMPLETION_LINE", but it would still pass if COMPLETION_LINE and ALREADY_DONE both stopped mentioning --complete.
  → Count only non-comment hook lines and require at least 2, or reword the message to what it checks.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: consistency
    severity: medium
    confidence: high
    ref: "task.163.stop-hook-step-8-follow-ups.md §1 deliverable 1, §3 Target Architecture, §6 Phase 1, §9 SC-1; task.163.plan lines 25, 34, 42, 47"
    finding: "The task doc and plan still carry the pre-QA wording for the develop-bug tail and the lock-8 steps-ahead clause, which QA cycles 1–2 replaced."
    suggested_action: "Align deliverable 1, Target Architecture, Phase 1 and SC-1 with the shipped wording, and mark the plan's snippets as superseded."
  - id: CR-1
    category: cleanup
    severity: low
    confidence: medium
    ref: "shared/resources/tests/step-8-completion-checklist.test.mjs:627"
    finding: "The hook floor passes on comment lines alone, so it does not pin COMPLETION_LINE as its message claims."
    suggested_action: "Count non-comment hook lines (at least 2), or reword the message to match what the test checks."
truncated_count: 0
```

## Recommended Actions

1. PC-1: align the task doc and plan wording with what shipped before `/finalise` traces the success criteria.
2. CR-1 (follow-up): tighten the hook floor to non-comment lines, or narrow its message.

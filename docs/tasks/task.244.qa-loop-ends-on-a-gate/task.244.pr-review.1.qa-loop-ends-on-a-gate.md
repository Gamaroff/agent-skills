# PR Review Report: PR #797 — feat(task.244): the QA loop always ends on a gate

**Reviewed:** 2026-10-31
**PR:** [#797](https://github.com/Gamaroff/agent-skills/pull/797) — `feature/task.244.qa-loop-ends-on-a-gate` → `develop` (OPEN)
**Work item:** [`task.244.qa-loop-ends-on-a-gate.md`](./task.244.qa-loop-ends-on-a-gate.md) — resolved via `branch stem`
**Tracker:** GitHub issue #782 — open (closes with this PR)
**Verdict:** ✅ APPROVE

Conformance lens only (`--no-code`; the code lens runs inside `/qa-task` every cycle). The lens was performed inline by the review fork, not by an independent Explore subagent, so there is no second reader on this report. Scope: `origin/develop...HEAD` (`b3f14c41`) minus the bundled `*/references/*` copies, except `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`, which is hand-authored and named in the task's Files Summary (item 6).

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.244.implementation.1.qa-loop-ends-on-a-gate-initial-run.md` (rows 5–8 pending, as expected before Step 7) |
| Review report | ✅ | `task.244.review.1.qa-loop-ends-on-a-gate.md` (READY TO IMPLEMENT 9/10) |
| QA reports | 2 | `task.244.qa.1…md`, `task.244.qa.2…md` |
| Gate | PASS | `task.244.gate.2.qa-loop-ends-on-a-gate.yml` (100); gate 1 was FAIL 70, fixed in `2e2780c4` |
| DoD | ❌ | not yet written — `/finalise` (Step 7) owns it |
| Sprint review | ❌ | not yet written — `/finalise` owns it |
| Open bugs | 0 | none filed |
| Handover | ❌ | none; not required |

CI on the PR head was still pending when this review ran (all six checks undecided); `/finalise` gates it once.

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| SC-1: 5b only when `N < QA_MAX_CYCLES`, both places | `shared/resources/develop-pipeline-step-5-6-qa-loop.md:440` (outcome branching), `:1532` (5c REQUEST CHANGES arm); `evals/shared/tests/qa-loop-ends-on-a-gate.test.mjs` pins both | ✅ met |
| SC-2: §5b step 7 always increments, no budget test | step doc §5b step 7 (budget test removed); the new test asserts it | ✅ met |
| SC-3: route 2c gone, `classifyLoopRoute()` budget-blind | `shared/resources/qa-diminishing-returns.js` (`ROUTES.GATE_THE_LAST_FIX`, `budgetSpent` removed; legacy token kept in `describeLoopRoute`); `tests/qa-loop-route.test.mjs:365-408` | ✅ met |
| SC-4: grant re-enters from `code-moved-since-gate.sh` | `shared/resources/grant-qa-cycles.sh:73,109-111,256-262`; `grant-qa-cycles.test.sh` cases (a)–(f) | ✅ met |
| SC-5: develop-bug escalates at `N == MAX_ITER`, no fifth fix | `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md` (FAIL arm, Loop Limit Escalation) | ✅ met |
| SC-6: escalation commit carries gate N and QA report N | step doc `:2036-2043` (develop-story and develop-task escalation commits) | ✅ met |
| SC-7: default budget → 5 gates, at most 4 fixes | step-isolation scenarios `11-qa-budget-spent-ends-on-a-gate` (both pipelines) and the new test | ✅ met |
| SC-8: `ci:fast`, `bundle:check`, `validate` green; test mutation-proven | gate 2 / QA report 2 record `npm test`, `eval:all`, `bundle:check`, `lint:shell`, `validate` green and the mutation proof | ✅ met (per gate; CI pending) |
| SC-9: code-movement count exists once | one `git rev-list --count` in `shared/resources/code-moved-since-gate.sh:81`; qa-task Phase 0 and the grant both call it | ✅ met |
| SC-10: `**Half-cycle**` reports and report-lint fixtures stay green | `report-lint/green/` fixtures untouched; CHANGELOG states the gate count and `qa_max_cycles: 6` | ✅ met |

Scope check: every changed path is in the task's In Scope list, its Files Summary, or the stated doc sweep. Additions beyond the Files Summary are the second eval scenario `12-qa-budget-spent-review-request-changes` (covers SC-1's 5c arm), `docs/runbooks/story-development.md` and `task-development.md` (sweep sites), `qa-findings-ingester-prompt.md` and `develop-pipeline-pause.md` (sweep sites), and the QA gate 2 security-probe run record. The `qa-scope-from-head.test.mjs` edits are Files Summary item 10 and the helper extraction is item 1. No drift found.

## Conformance Findings

**[PC-1] consistency · low · confidence: medium** — `skills/develop-bug/SKILL.md:335`
Files Summary items 19, 20 and 21 are ticked as modified, but `skills/develop-bug/SKILL.md`, `shared/resources/code-review-prompt.md` and `docs/operations/workflows.md` are not in the diff. The develop-bug MAX_ITER row still reads "qa-fix reopens the bug ≥5 times", which does not say the loop now runs at most 4 fixes. The "up to 5 cycles" wording at the other two sites is still true, since five gates still run.
→ Either reword the MAX_ITER row to "the 5th verify fails (4 fixes)" and tick the items, or amend items 19–21 to record that the existing wording was checked and left unchanged.

## Code Review Findings

Skipped (`--no-code`). The code lens ran inside `/qa-task` on both cycles (gates 1 and 2).

**Anchors:** 1 checked against `b3f14c41e00eb0eb142df82bc14ad057cffbcf22` (via `HEAD`) — all verified

## Machine-Readable Findings

```yaml
reviewed_gate: task.244.gate.2.qa-loop-ends-on-a-gate.yml
findings:
  - id: PC-1
    category: consistency
    severity: low
    confidence: medium
    ref: "skills/develop-bug/SKILL.md:335"
    anchor_check: unchecked-text
    finding: "Files Summary items 19, 20 and 21 are ticked as modified but are not in the diff, and the develop-bug MAX_ITER row still reads 'qa-fix reopens the bug >=5 times' without saying the loop now runs at most 4 fixes."
    suggested_action: "Reword the MAX_ITER row to name the 5th failed verify and 4 fixes and tick the items, or amend items 19-21 to say the wording was checked and left unchanged."
truncated_count: 0
```

## Recommended Actions

1. Optional, before `/finalise`: settle PC-1 (reword one table row, or amend Files Summary items 19–21). It does not block acceptance.

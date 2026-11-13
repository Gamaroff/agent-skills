# PR Review Report: PR #897 — feat(task.298): review-task runs a plan's own command once; create-task asks for a CI-parity line

**Reviewed:** 2026-11-13
**PR:** [#897](https://github.com/Gamaroff/agent-skills/pull/897) — `feature/task.298.review-task-runs-plan-command-and-ci-parity` → `develop` (OPEN)
**Work item:** [`task.298.review-task-runs-plan-command-and-ci-parity.md`](./task.298.review-task-runs-plan-command-and-ci-parity.md) — resolved via `branch stem`
**Tracker:** none linked
**Verdict:** ✅ APPROVE

Conformance lens only (`--no-code`): the code lens ran in QA cycles 1 and 2. The lens ran inline, with no dispatched subagent, so this review is not independent of the session that wrote the work.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.298.implementation.1.review-task-runs-plan-command-and-ci-parity-initial-run.md (Steps 5 to 8 still pending, as expected before finalise) |
| Review report | ✅ | task.298.review.1.review-task-runs-plan-command-and-ci-parity.md |
| QA reports | 2 | task.298.qa.1…md, task.298.qa.2…md |
| Gate | PASS | task.298.gate.2.review-task-runs-plan-command-and-ci-parity.yml (100) |
| DoD | ❌ | not written yet: Step 7 (`/finalise`) writes it |
| Sprint review | ❌ | not written yet: Step 7 writes it |
| Open bugs | 0 | none |
| Handover | ❌ | none needed |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| review-task states the new check with trigger, safe form, fallback and severity | `skills/review-task/SKILL.md` check 31; held by `tests/review-run-and-parity-checks.test.js` | ✅ met |
| create-task § 3.5 carries the parity item | `skills/create-task/SKILL.md` "CI scripts run in a new environment" bullet; held by the same test | ✅ met |
| The check adds no network call or write to a real target | check 31 text: dry-run or scratch only, never the real target, never improvise a flag | ✅ met |
| `bundle:check`, `format:check` and `ci:fast` pass | `bundle:check` 0 problems; Prettier clean; `ci:fast` exit 0 on the fix commit; PR CI green | ✅ met |
| CHANGELOG entry | `CHANGELOG.md` `[Unreleased]` → Added, cites (task 298) | ✅ met |

## Conformance Findings

[PC-1] consistency · low · confidence: high — tests/review-run-and-parity-checks.test.js:78
  The task's Phase 3 says the check number is derived from the list and not typed in, but the cycle 1 fix types 31 as a floor in an assertion.
  → Derive the floor, for example from the check before it in the list, or accept the constant and say so in the task's Phase 3 text.

Scope: all 12 changed paths are the task's own (two skills, one test, CHANGELOG, the task directory). No path outside the task's Files Summary. No generated `references/` copy changed.

## Code Review Findings

Skipped (`--no-code`).

**Anchors:** 1 checked against `e0566460ae123723f19a610a4823588210ecce3b` (via `head-branch`) — all verified

## Machine-Readable Findings

```yaml
reviewed_gate: task.298.gate.2.review-task-runs-plan-command-and-ci-parity.yml
findings:
  - id: PC-1
    category: consistency
    severity: low
    confidence: high
    ref: "tests/review-run-and-parity-checks.test.js:78"
    anchor_check: ok
    finding: "The task's Phase 3 says the check number is derived from the list and not typed in, but the cycle 1 fix types 31 as a floor in an assertion."
    suggested_action: "Derive the floor, for example from the check before it in the list, or accept the constant and say so in the task's Phase 3 text."
truncated_count: 0
```

## Recommended Actions

1. None blocking. Optionally settle PC-1 when the test is next touched.

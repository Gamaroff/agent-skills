# PR Review Report: PR #851 — feat(task.266): create-task asks the questions its checks miss

**Reviewed:** 2026-11-06
**PR:** [#851](https://github.com/Gamaroff/agent-skills/pull/851) — `feature/task.266.create-task-asks-the-questions-its-checks-miss` → `develop` (OPEN)
**Work item:** `task.266.create-task-asks-the-questions-its-checks-miss.md` — resolved via `pr_number`/branch stem (develop-task pipeline Step 5c)
**Tracker:** none linked
**Verdict:** ⚠️ CONCERNS

Review method: conformance lens only (`--no-code`), performed inline by the pipeline agent, not by an independent subagent. Independent review did not run.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.266.implementation.1 (first commit in this PR) |
| Review report | ✅ | task.266.review.1 (8/10) |
| QA reports | 2 | qa.1, qa.2 |
| Gate | PASS | gate.2 (95) |
| DoD | ❌ | not yet written; `/finalise` runs after this step |
| Sprint review | ❌ | not yet written; `/finalise` |
| Open bugs | 0 | none |
| Handover | ❌ | none expected |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| Five items present and fire on their motivating shape | `skills/create-task/SKILL.md` § 3.5 (four Critical, one Should Add); eleven-draft table in QA report 1 | ✅ met |
| Each item leaves its control draft unflagged | QA report 1 evidence table (D2, D4, D7, D9, D11) | ✅ met |
| `finalise-dod-ac-prompt.md` names run count and statistic | `shared/resources/finalise-dod-ac-prompt.md:72` | ✅ met |
| `npm test` wall time within 10% of `develop`, median of five alternating runs with `uptime` beside each | none; QA gate 2 records it as not taken on a loaded host | ❌ unmet |
| Contract tests pass | 50/50, QA reports 1 and 2 | ✅ met |
| `bundle --check` reports 0 problems | 0 problems, QA reports 1 and 2 | ✅ met |
| `quick_validate.py skills/create-task` passes | passes, QA report 1 | ✅ met |
| No item restates a section list | diff touches no `CARD_SECTIONS_BY_KIND` | ✅ met |

## Conformance Findings

[PC-1] coverage · medium · confidence: high — task.266.create-task-asks-the-questions-its-checks-miss.md
  The Performance criterion asks for the median of five alternating `npm test` runs within 10% of `develop`, with `uptime` beside each. No such measurement is committed: QA report 1 holds one run at load ~12 (491 s) and calls the criterion unverified, and gate 2 passes with a future action. The criterion is unmet as written; it is neither measured nor amended with an approver.
  → Take the measurement (five alternating runs per arm, `uptime` beside each, recorded in a QA report), or have the owner amend the criterion with `approved by <name>`.

## Code Review Findings

Skipped (`--no-code`).

**Anchors:** no code findings; the one conformance finding names a document, not a line (`no-line`).

## Machine-Readable Findings

```yaml
reviewed_gate: task.266.gate.2.create-task-asks-the-questions-its-checks-miss.yml
findings:
  - id: PC-1
    category: coverage
    severity: medium
    confidence: high
    ref: "task.266.create-task-asks-the-questions-its-checks-miss.md"
    anchor_check: no-line
    finding: "The Performance criterion (median of five alternating npm test runs within 10% of develop) has no committed measurement; QA records it as not taken."
    suggested_action: "Take the five-run alternating measurement with uptime beside each and record it in a QA report, or amend the criterion with an approver."
truncated_count: 0
```

## Recommended Actions

1. Take the wall-time measurement the Performance criterion names, or have the owner amend the criterion.

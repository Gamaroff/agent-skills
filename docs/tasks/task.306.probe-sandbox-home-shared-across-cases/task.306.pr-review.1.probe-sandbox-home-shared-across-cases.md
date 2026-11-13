# PR Review Report: PR #900 — fix(task.306): give each probe run its own HOME and TMPDIR

**Reviewed:** 2026-11-13
**PR:** #900 — `feature/task.306.probe-sandbox-home-shared-across-cases` → `develop` (OPEN)
**Work item:** `task.306.probe-sandbox-home-shared-across-cases.md` — resolved via `branch stem`
**Tracker:** none linked
**Verdict:** ⚠️ CONCERNS

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.306.implementation.1.probe-sandbox-home-shared-across-cases-initial-run.md |
| Review report | ✅ | task.306.review.1.probe-sandbox-home-shared-across-cases.md |
| QA reports | 1 | task.306.qa.1.probe-sandbox-home-shared-across-cases.md |
| Gate | PASS | task.306.gate.1.probe-sandbox-home-shared-across-cases.yml (95) |
| DoD | ❌ | not expected before /finalise |
| Sprint review | ❌ | not expected before /finalise |
| Open bugs | 0 | none |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

Taken from the QA report's Success Criteria table; the lens found one criterion met by substitution (PC-1) and none unmet. The live re-run of task.296's plan is deferred to the DoD probe run, as the QA report states.

## Conformance Findings

[PC-2] consistency · medium · confidence: high — pr_number
  The work item frontmatter has no pr_number field although PR 900 is open for this task.
  → Add pr_number: 900 to the task frontmatter.

[PC-1] coverage · low · confidence: medium — docs/tasks/task.306.probe-sandbox-home-shared-across-cases/task.306.qa.1.probe-sandbox-home-shared-across-cases.md
  The performance criterion asks for five wall-time runs with uptime beside each; the QA report gives a 3-run CPU-time median (ratio 1.016) and says wall time was too noisy, so the criterion is met by substitution.
  → Record the substitution as an explicit deviation in the implementation report's Decisions Log.

[PC-3] trail · low · confidence: medium — docs/tasks/task.306.probe-sandbox-home-shared-across-cases/task.306.implementation.1.probe-sandbox-home-shared-across-cases-initial-run.md
  The Completion block still holds the placeholders for Branch and PR although the branch and PR 900 exist.
  → Populate the Branch and PR fields in the implementation report.

## Code Review Findings

Skipped (`--no-code`): the QA cycle's diff review ran the code lens.

## Machine-Readable Findings

```yaml
reviewed_gate: task.306.gate.1.probe-sandbox-home-shared-across-cases.yml
findings:
  - id: PC-2
    category: consistency
    severity: medium
    confidence: high
    ref: "pr_number"
    anchor_check: no-line
    finding: "The work item frontmatter has no pr_number field although PR 900 is open for this task."
    suggested_action: "Add pr_number: 900 to the task frontmatter."
  - id: PC-1
    category: coverage
    severity: low
    confidence: medium
    ref: "docs/tasks/task.306.probe-sandbox-home-shared-across-cases/task.306.qa.1.probe-sandbox-home-shared-across-cases.md"
    anchor_check: no-line
    finding: "The performance criterion asks for five wall-time runs with uptime beside each; the QA report gives a 3-run CPU-time median (ratio 1.016) and says wall time was too noisy, so the criterion is met by substitution."
    suggested_action: "Record the substitution as an explicit deviation in the implementation report's Decisions Log."
  - id: PC-3
    category: trail
    severity: low
    confidence: medium
    ref: "docs/tasks/task.306.probe-sandbox-home-shared-across-cases/task.306.implementation.1.probe-sandbox-home-shared-across-cases-initial-run.md"
    anchor_check: no-line
    finding: "The Completion block still holds the placeholders for Branch and PR although the branch and PR 900 exist."
    suggested_action: "Populate the Branch and PR fields in the implementation report."
truncated_count: 0
```

## Recommended Actions

1. Add `pr_number: 900` to the task frontmatter.
2. Record the CPU-time substitution in the implementation report's Decisions Log.
3. Populate Branch and PR in the implementation report's Completion block.

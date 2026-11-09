# PR Review Report: PR #863 — feat(task.274): QA engines stop passing what they cannot see

**Reviewed:** 2026-11-09
**PR:** [#863](https://github.com/Gamaroff/agent-skills/pull/863) — `feature/task.274.qa-engines-stop-passing-what-they-cannot-see` → `develop` (OPEN)
**Work item:** [`task.274.qa-engines-stop-passing-what-they-cannot-see.md`](./task.274.qa-engines-stop-passing-what-they-cannot-see.md) — resolved via `branch-stem`
**Tracker:** none — no linked issue
**Verdict:** ✅ APPROVE

Scope: conformance lens only (`--no-code`), as the pipeline's Step 5c runs it; the code reviewer ran every QA cycle. Generated `*/references/*` copies (24 files) were excluded from the diff, none of them named in the work item as authored.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.274.implementation.1…initial-run.md |
| Review report | ✅ | task.274.review.1.qa-engines-initial-review.md |
| QA reports | 3 | qa.1, qa.2, qa.3 |
| Gate | CONCERNS | task.274.gate.3…yml (90) |
| DoD | ❌ | not yet written — correct before `/finalise` |
| Sprint review | ❌ | not yet written — correct before `/finalise` |
| Open bugs | 0 | bugs 1–4 closed |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

Every criterion has a named test or a QA measurement; the lens found none unmet. The task document's criteria checkboxes are still unticked, which `/finalise` ticks against evidence (PC-1).

## Conformance Findings

[PC-1] coverage · low · confidence: medium — docs/tasks/task.274.qa-engines-stop-passing-what-they-cannot-see/task.274.qa-engines-stop-passing-what-they-cannot-see.md
  The final plan phase's bundle/prose-sweep item and the Section 8 and 9 criteria are still unticked, though the diff holds the bundled copies and QA report 3 records `bundle --check: 0 problems`.
  → Tick the evidenced items before finalise.

[PC-2] consistency · low · confidence: low — pr_number
  Frontmatter has no `pr_number` although PR #863 is open.
  → Confirm finalise writes `pr_number: 863`.

## Code Review Findings

Skipped (`--no-code`).

## Machine-Readable Findings

```yaml
reviewed_gate: task.274.gate.3.qa-engines-stop-passing-what-they-cannot-see.yml
findings:
  - id: PC-1
    category: coverage
    severity: low
    confidence: medium
    ref: "docs/tasks/task.274.qa-engines-stop-passing-what-they-cannot-see/task.274.qa-engines-stop-passing-what-they-cannot-see.md"
    anchor_check: unchecked-text
    finding: "The final plan phase's bundle/prose-sweep item and the Section 8 and 9 criteria are still unticked although the evidence exists."
    suggested_action: "Tick the evidenced items before finalise."
  - id: PC-2
    category: consistency
    severity: low
    confidence: low
    ref: "pr_number"
    anchor_check: unchecked-text
    finding: "Frontmatter has no pr_number although PR 863 is open."
    suggested_action: "Confirm finalise writes pr_number 863."
truncated_count: 0
```

## Recommended Actions

1. Run `/finalise`: it ticks the evidenced criteria and records `pr_number`.

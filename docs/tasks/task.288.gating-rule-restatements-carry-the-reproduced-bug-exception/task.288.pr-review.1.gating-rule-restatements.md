# PR Review Report: PR #934 — Gating-rule restatements carry the reproduced-bug exception

**Reviewed:** 2026-11-23
**PR:** [#934](https://github.com/Gamaroff/agent-skills/pull/934) — `feature/task.288.gating-rule-restatements-carry-the-reproduced-bug-exception` → `develop` (open)
**Work item:** [`task.288.gating-rule-restatements-carry-the-reproduced-bug-exception.md`](./task.288.gating-rule-restatements-carry-the-reproduced-bug-exception.md) — resolved via `branch stem`
**Tracker:** [#862](https://github.com/Gamaroff/agent-skills/issues/862) — open
**Verdict:** ⚠️ CONCERNS

Scope: conformance lens only (`--no-code`; the QA loop ran the code lens every cycle). Excluded from the diff: generated `skills/*/references/` copies (bundle check: 129 skills, 0 problems). No excluded path is named by the work item as a deliberate change.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.288.implementation.1.gating-rule-restatements-initial-run.md |
| Review report | ✅ | task.288.review.1.gating-rule-restatements.md |
| QA reports | 3 | qa.1, qa.2, qa.3 |
| Gate | PASS | task.288.gate.3.gating-rule-restatements.yml (95) |
| DoD | ❌ | not yet written; correct before `/finalise` |
| Sprint review | ❌ | not yet written; correct before `/finalise` |
| Open bugs | 0 | none |
| Handover | ❌ | none |

## Conformance Findings

[PC-1] consistency · medium · confidence: high — pr_number
  The work item frontmatter had `github_issue: 862` and no `pr_number`, although PR #934 is open.
  → Add `pr_number: 934`. **Fixed in this cycle.**

[PC-2] consistency · low · confidence: medium — docs/tasks/task.288.gating-rule-restatements-carry-the-reproduced-bug-exception/task.288.gating-rule-restatements-carry-the-reproduced-bug-exception.md:29
  The Scope line said five lines in four files; the delivered change reworded nine more restatement sentences across seven files plus the docs-only prompt.
  → Record the widening. **Fixed in this cycle** (Scope line now states the delivered footprint).

## Code Review Findings

Skipped (`--no-code`): the QA loop's code lens ran in cycles 1 to 3.

## Machine-Readable Findings

```yaml
reviewed_gate: task.288.gate.3.gating-rule-restatements.yml
findings:
  - id: PC-1
    category: consistency
    severity: medium
    confidence: high
    ref: "pr_number"
    fix_path: "docs/tasks/task.288.gating-rule-restatements-carry-the-reproduced-bug-exception/task.288.gating-rule-restatements-carry-the-reproduced-bug-exception.md"
    anchor_check: no-such-file
    finding: "The work item frontmatter has github_issue 862 but no pr_number, although PR 934 is open."
    suggested_action: "Add pr_number 934 to the work item frontmatter."
  - id: PC-2
    category: consistency
    severity: low
    confidence: medium
    ref: "docs/tasks/task.288.gating-rule-restatements-carry-the-reproduced-bug-exception/task.288.gating-rule-restatements-carry-the-reproduced-bug-exception.md:29"
    anchor_check: unchecked-text
    finding: "The Scope line understates the delivered footprint."
    suggested_action: "Record the widening in the Scope line."
truncated_count: 0
```

## Recommended Actions

1. Both findings were documentation-only and are fixed in the work item; they ride the acceptance commit.
2. Run `/finalise`.

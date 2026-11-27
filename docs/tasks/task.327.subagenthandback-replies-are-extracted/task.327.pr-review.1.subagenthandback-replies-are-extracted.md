# PR Review Report: PR #959 — feat(finalise): extract SubagentHandback replies, clear --out first (task.327)

**Reviewed:** 2026-11-26
**PR:** [#959](https://github.com/Gamaroff/agent-skills/pull/959) — `feature/task.327.subagenthandback-replies-are-extracted` → `develop` (OPEN)
**Work item:** [`task.327.subagenthandback-replies-are-extracted.md`](./task.327.subagenthandback-replies-are-extracted.md) — resolved via `branch-stem`
**Tracker:** [#952](https://github.com/Gamaroff/agent-skills/issues/952) — OPEN
**Verdict:** ✅ APPROVE

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.327.implementation.1.subagenthandback-replies-are-extracted-initial-run.md |
| Review report | ✅ | task.327.review.1.subagenthandback-replies-are-extracted.md |
| QA reports | 3 | task.327.qa.1 / qa.2 / qa.3 |
| Gate | PASS | task.327.gate.3.subagenthandback-replies-are-extracted.yml (92) |
| DoD | — | not yet (Step 7 writes it) |
| Sprint review | — | not yet (Step 7 writes it) |
| Open bugs | 0 | none |
| Handover | — | none |

## Acceptance Criteria Traceability

Every criterion has a hunk in the diff and a named test; the conformance lens found no coverage gap. The QA reports map each criterion to its evidence (qa.1 mutation table a–f; qa.2 and qa.3 re-review tables).

## Conformance Findings

```
[PC-1] consistency · low · confidence: high — pr_number
  The work item frontmatter has no pr_number field, but the implementation report records PR #959.
  → Add `pr_number: 959` to the work item frontmatter.
```

## Code Review Findings

Skipped (`--no-code`): Step 5c inside the develop pipeline. The QA loop ran the code reviewer every cycle with `code_review_blocking=true`.

**Anchors:** 1 checked against `fdcf01da16724a11529fe90781620c368020eda1` (via `head-branch`). All verified (1 `no-line`).

Scope: generated `*/references/*` copies excluded from the diff. No excluded path is named as a deliberate change.

## Machine-Readable Findings

```yaml
reviewed_gate: task.327.gate.3.subagenthandback-replies-are-extracted.yml
findings:
  - id: PC-1
    category: consistency
    severity: low
    confidence: high
    ref: "pr_number"
    fix_path: "docs/tasks/task.327.subagenthandback-replies-are-extracted/task.327.subagenthandback-replies-are-extracted.md"
    anchor_check: no-line
    finding: "The work item frontmatter has no pr_number field, but the implementation report records PR #959."
    suggested_action: "Add `pr_number: 959` to the work item frontmatter."
truncated_count: 0
```

## Recommended Actions

1. Add `pr_number: 959` to the task frontmatter (doc-only; rides the acceptance commit).

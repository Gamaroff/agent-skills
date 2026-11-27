# PR Review Report: PR #959 — feat(finalise): extract SubagentHandback replies, clear --out first (task.327)

**Reviewed:** 2026-11-27
**PR:** [#959](https://github.com/Gamaroff/agent-skills/pull/959) — `feature/task.327.subagenthandback-replies-are-extracted` → `develop` (OPEN)
**Work item:** [`task.327.subagenthandback-replies-are-extracted.md`](./task.327.subagenthandback-replies-are-extracted.md) — resolved via `branch-stem`
**Tracker:** [#952](https://github.com/Gamaroff/agent-skills/issues/952) — OPEN
**Verdict:** ⚠️ CONCERNS

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.327.implementation.1.subagenthandback-replies-are-extracted-initial-run.md |
| Review report | ✅ | task.327.review.1.subagenthandback-replies-are-extracted.md |
| QA reports | 4 | task.327.qa.1 – qa.4 |
| Gate | PASS | task.327.gate.4.subagenthandback-replies-are-extracted.yml (100) |
| DoD | ✅ | task.327.dod.1 (GAPS: #6, #10; closed by QA cycle 4) |
| Sprint review | — | not yet (Step 7 writes it) |
| Open bugs | 0 | none |
| Handover | — | none |

## Acceptance Criteria Traceability

No coverage finding. #6 is held by the stale `--out` test, which now covers all six reasons. Amended #10 is held by mutations (b), (c) and (c2), re-run in qa.4. The other criteria are unchanged since pr-review.1.

## Conformance Findings

```
[PC-1] trail · medium · confidence: high — docs/tasks/task.327.subagenthandback-replies-are-extracted/task.327.implementation.1.subagenthandback-replies-are-extracted-initial-run.md:149
  The implementation report's QA Iteration History ends at QA Cycle 3; gate 4 (PASS 100) has no QA Cycle 4 entry, and the stage row still says 3 gates.
  → Add the QA Cycle 4 entry and update the stage row.

[PC-2] consistency · low · confidence: low — docs/tasks/task.327.subagenthandback-replies-are-extracted/task.327.subagenthandback-replies-are-extracted.md
  The DoD gaps section still lists #6 and #10 as open, while QA Testing Results says both are closed.
  → /finalise supersedes the section at acceptance.
```

## Code Review Findings

Skipped (`--no-code`): Step 5c inside the develop pipeline. The QA loop ran the code reviewer every cycle with `code_review_blocking=true`.

**Anchors:** 2 checked against `24ce5725c001b7b438d52a3aa87b2715aa1aaccf` (via `head-branch`) — all verified (1 `no-line`).

Scope: generated `*/references/*` copies excluded from the diff. No excluded path is named as a deliberate change.

## Machine-Readable Findings

```yaml
reviewed_gate: task.327.gate.4.subagenthandback-replies-are-extracted.yml
findings:
  - id: PC-1
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.327.subagenthandback-replies-are-extracted/task.327.implementation.1.subagenthandback-replies-are-extracted-initial-run.md:149"
    anchor_check: ok
    finding: "The implementation report's QA Iteration History ends at QA Cycle 3, and gate 4 has no QA Cycle 4 entry."
    suggested_action: "Add the QA Cycle 4 entry and update the stage row to 4 gates."
  - id: PC-2
    category: consistency
    severity: low
    confidence: low
    ref: "docs/tasks/task.327.subagenthandback-replies-are-extracted/task.327.subagenthandback-replies-are-extracted.md"
    anchor_check: no-line
    finding: "The DoD gaps section still lists #6 and #10 as open, while QA Testing Results says both are closed."
    suggested_action: "Let /finalise supersede the gaps section at acceptance."
truncated_count: 0
```

## Recommended Actions

1. Write the QA Cycle 4 entry in the implementation report (doc-only; the orchestrator writes it after 5c).
2. At acceptance, mark the DoD 1 gaps section as superseded.

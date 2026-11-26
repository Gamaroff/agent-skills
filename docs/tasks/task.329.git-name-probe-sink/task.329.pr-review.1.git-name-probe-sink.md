# PR Review Report: PR #956 — feat(task.329): git-name probe sink for classifiers of repository names

**Reviewed:** 2026-11-26
**PR:** [#956](https://github.com/Gamaroff/agent-skills/pull/956) — `feature/task.329.git-name-probe-sink` → `develop` (OPEN)
**Work item:** [`task.329.git-name-probe-sink.md`](./task.329.git-name-probe-sink.md) — resolved via `branch stem`
**Tracker:** [#955](https://github.com/Gamaroff/agent-skills/issues/955) — OPEN
**Verdict:** ⚠️ CONCERNS

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.329.implementation.1.git-name-probe-sink-initial-run.md |
| Review report | ✅ | task.329.review.1.git-name-probe-sink.md |
| QA reports | 3 | task.329.qa.1, .qa.2, .qa.3 |
| Gate | PASS | task.329.gate.3.git-name-probe-sink.yml (96) |
| DoD | ❌ | not yet written (Step 5c runs before /finalise) |
| Sprint review | ❌ | not yet written (Step 7) |
| Open bugs | 0 | — |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

All seven § 9 criteria are verified in [task.329.qa.1.git-name-probe-sink.md](./task.329.qa.1.git-name-probe-sink.md)
(the mutation records M1–M7) and re-confirmed in qa.2 and qa.3. Their checkboxes stay unticked until
`/finalise` checks them (PC-2).

## Conformance Findings

```
[PC-1] consistency · medium · confidence: high — docs/tasks/task.329.git-name-probe-sink/task.329.git-name-probe-sink.md:14
  The task frontmatter has no pr_number field, though PR #956 is open for this branch.
  → Add `pr_number: 956` to the frontmatter. (Applied in this step.)

[PC-2] consistency · low · confidence: medium — docs/tasks/task.329.git-name-probe-sink/task.329.git-name-probe-sink.md:324
  The seven § 9 Success Criteria checkboxes are unticked while the QA reports say they hold.
  → /finalise ticks each criterion as it verifies it (Step 7).
```

## Code Review Findings

Skipped (`--no-code`). The develop pipeline's QA step ran the code reviewer on every cycle (gates 1–3).

**Anchors:** 2 checked by hand against the reviewed tree (the gate-3 commit), not by `finding-anchors.js`. Both matched their `line_text`. Adding `pr_number:` afterwards shifts PC-2's line by one

## Machine-Readable Findings

```yaml
reviewed_gate: task.329.gate.3.git-name-probe-sink.yml
findings:
  - id: PC-1
    category: consistency
    severity: medium
    confidence: high
    ref: "docs/tasks/task.329.git-name-probe-sink/task.329.git-name-probe-sink.md:14"
    anchor_check: ok
    finding: "The task frontmatter has no pr_number field, though PR #956 is open for this branch."
    suggested_action: "Add pr_number 956 to the task frontmatter next to github_issue."
  - id: PC-2
    category: consistency
    severity: low
    confidence: medium
    ref: "docs/tasks/task.329.git-name-probe-sink/task.329.git-name-probe-sink.md:324"
    anchor_check: ok
    finding: "The seven Success Criteria checkboxes are unticked although the QA reports say they hold."
    suggested_action: "Tick each criterion with its evidence when finalise verifies it."
truncated_count: 0
```

## Recommended Actions

1. PC-1: add `pr_number: 956` (done in Step 5c, rides the acceptance commit).
2. PC-2: let `/finalise` tick the criteria.

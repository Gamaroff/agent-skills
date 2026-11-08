# PR Review Report: PR #859 — finalise accepts what the record already shows

**Reviewed:** 2026-11-08
**PR:** [#859](https://github.com/Gamaroff/agent-skills/pull/859) — `feature/task.271.finalise-accepts-what-the-record-already-shows` → `develop` (OPEN)
**Work item:** [`task.271.finalise-accepts-what-the-record-already-shows.md`](./task.271.finalise-accepts-what-the-record-already-shows.md) — resolved via `branch stem`
**Verdict:** ⚠️ CONCERNS

Scope: conformance lens only (`--no-code`; the QA loop ran the code lens every cycle). Generated `references/` copies and QA/gate files excluded.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.271.implementation.1 (Cycle 17 entry added after this review) |
| Review report | ✅ | task.271.review.1 |
| QA reports | 17 | qa.1 to qa.17 |
| Gate | PASS | gate.17 (90) |
| DoD | not yet | `/finalise` has not run |
| Open bugs | 0 | |

## Conformance Findings

[PC-1] trail · medium · confidence: medium: the implementation report ended at QA Cycle 16, so it did not show the loop reaching its exit gate. **Fixed in this pass:** a Cycle 17 entry (PASS 90, three open LOWs, `Proceeding to 5c`) was added.

[PC-2] consistency · medium · confidence: medium: the task frontmatter has no `github_issue` or `pr_number`. `pr_number: 859` is written in this pass. The missing `github_issue` is left: creating a remote issue is outward-facing and was skipped on purpose (recorded in the implementation report).

## Code Review Findings

Skipped (`--no-code`).

## Machine-Readable Findings

```yaml
reviewed_gate: task.271.gate.17.finalise-accepts-what-the-record-already-shows.yml
findings:
  - id: PC-1
    category: trail
    severity: medium
    confidence: medium
    ref: "docs/tasks/task.271.finalise-accepts-what-the-record-already-shows/task.271.implementation.1.finalise-accepts-what-the-record-already-shows-initial-run.md"
    anchor_check: unchecked-text
    finding: "The implementation report ended at QA Cycle 16 and did not record gate 17 reaching 5c."
    suggested_action: "Add a QA Cycle 17 entry (done in this pass)."
  - id: PC-2
    category: consistency
    severity: medium
    confidence: medium
    ref: "github_issue"
    anchor_check: unchecked-text
    finding: "The task frontmatter has no github_issue or pr_number although PR 859 is open."
    suggested_action: "Write pr_number (done); sync the tracker issue only with the owner's say-so."
truncated_count: 0
```

## Recommended Actions

1. Carry the three LOW gate entries (T271-QA-39, -40, -41) into the acceptance commit.
2. Run `/finalise`.

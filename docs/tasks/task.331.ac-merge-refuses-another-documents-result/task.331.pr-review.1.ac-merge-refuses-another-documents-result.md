# PR Review Report: PR #962 — feat(task.331): AC merge refuses another document's result; AC state paths carry the stem

**Reviewed:** 2026-11-27
**PR:** [#962](https://github.com/Gamaroff/agent-skills/pull/962) — `feature/task.331.ac-merge-refuses-another-documents-result` → `develop` (OPEN)
**Work item:** [`task.331.ac-merge-refuses-another-documents-result.md`](./task.331.ac-merge-refuses-another-documents-result.md) — resolved via `branch stem` (pipeline Step 5c)
**Tracker:** [#958](https://github.com/Gamaroff/agent-skills/issues/958) — OPEN
**Verdict:** ⚠️ CONCERNS

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.331.implementation.1.ac-merge-refuses-another-documents-result-initial-run.md |
| Review report | ✅ | task.331.review.1.ac-merge-refuses-another-documents-result.md |
| QA reports | 3 | task.331.qa.1 / .qa.2 / .qa.3 |
| Gate | PASS | task.331.gate.3.ac-merge-refuses-another-documents-result.yml (95) |
| DoD | ❌ | not yet: Step 5c runs before /finalise |
| Sprint review | ❌ | not yet: Step 5c runs before /finalise |
| Open bugs | 0 | — |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

Judged by the conformance lens against § 9. Every criterion is met by the diff and its tests (see gate 3 and QA report 3). The one gap is that the document no longer describes everything that shipped (PC-1).

## Conformance Findings

```
[PC-1] scope · medium · confidence: high — docs/tasks/task.331.ac-merge-refuses-another-documents-result/task.331.ac-merge-refuses-another-documents-result.md:148
  The PR ships behaviour the work item does not describe. The cycle-2 fix for T331-CR-1 added
  merge --doc and the scope-document-mismatch refusal, with its own Step 3c HALT arm. That fix
  shows the § 4 Out-of-Scope claim at :148 is false, yet § 3, § 5 and § 9 still describe only
  result-document-mismatch.
  → Before /finalise, change § 4 so it no longer says the DOD_N-keyed scope file cannot reach a
    merge, and add the --doc / scope-document-mismatch refusal to § 3, § 5 and § 9.
```

## Code Review Findings

Skipped (`--no-code`): the pipeline's QA step ran the code reviewer in every cycle (gates 1–3).

**Anchors:** 1 checked against `63a3d161e` (via `origin/feature/task.331.ac-merge-refuses-another-documents-result`) — all verified

## Machine-Readable Findings

```yaml
reviewed_gate: task.331.gate.3.ac-merge-refuses-another-documents-result.yml
findings:
  - id: PC-1
    category: scope
    severity: medium
    confidence: high
    ref: "docs/tasks/task.331.ac-merge-refuses-another-documents-result/task.331.ac-merge-refuses-another-documents-result.md:148"
    anchor_check: ok
    finding: "The PR ships the merge --doc / scope-document-mismatch refusal, which the work item does not describe, and its § 4 Out-of-Scope claim at :148 is false"
    suggested_action: "Correct § 4 and describe the refusal in § 3 and § 5 before /finalise; § 9's criteria are not reworded at 5c"
truncated_count: 0
```

## Recommended Actions

1. Correct § 4's claim about the DOD_N-keyed scope file, and describe `merge --doc` / `scope-document-mismatch` in § 3 and § 5 (doc-only, carried into the acceptance commit).
2. § 9 is not reworded at 5c: a criterion edit there reads as an unapproved amendment.

# PR Review Report: PR #962 — feat(task.331): AC merge refuses another document's result; AC state paths carry the stem

**Reviewed:** 2026-11-27
**PR:** [#962](https://github.com/Gamaroff/agent-skills/pull/962) — `feature/task.331.ac-merge-refuses-another-documents-result` → `develop` (OPEN)
**Work item:** [`task.331.ac-merge-refuses-another-documents-result.md`](./task.331.ac-merge-refuses-another-documents-result.md) — resolved via `branch stem`
**Tracker:** [#958](https://github.com/Gamaroff/agent-skills/issues/958) — OPEN
**Verdict:** ✅ APPROVE

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.331.implementation.1.ac-merge-refuses-another-documents-result-initial-run.md |
| Review report | ✅ | task.331.review.1.ac-merge-refuses-another-documents-result.md |
| QA reports | 4 | task.331.qa.1 to qa.4 |
| Gate | PASS | task.331.gate.4.ac-merge-refuses-another-documents-result.yml (95) |
| DoD | ✅ | task.331.dod.1.ac-merge-refuses-another-documents-result.md (run 1, gaps; run 2 not yet run, as expected at this step) |
| Sprint review | ❌ | not yet written: /finalise writes it on acceptance |
| Open bugs | 0 | none |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| #7: Step 3c `result-document-mismatch` arm HALTs and names the remedy (DoD run 1 gap) | `evals/shared/tests/finalise-rerun-scope-blocks.test.mjs` (the per-shell test, task 331) | ✅ met |
| #1 to #6, #8 | graded PASS in DoD run 1; unchanged since | ✅ met |

## Conformance Findings

None.

## Code Review Findings

Skipped (`--no-code`). QA cycle 4 ran the code reviewer over this cycle's diff.

**Anchors:** 0 checked against `7af1c0a2705e` (via `head-branch`), so there was nothing to verify.

Scope note: the diff excludes `*/references/*`. The one excluded path is `skills/finalise/references/finalise-rerun-scope.js`, the bundled copy of `shared/resources/finalise-rerun-scope.js`, and that source is in the diff.

## Machine-Readable Findings

```yaml
reviewed_gate: task.331.gate.4.ac-merge-refuses-another-documents-result.yml
findings: []
truncated_count: 0
```

## Recommended Actions

1. Proceed to `/finalise` DoD run 2, scoped to AC #7.

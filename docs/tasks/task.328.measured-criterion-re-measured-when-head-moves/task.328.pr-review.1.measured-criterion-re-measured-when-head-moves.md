# PR Review Report: PR #960 — fix(task.328): a measured criterion is re-measured when the head moves

**Reviewed:** 2026-11-27
**PR:** [#960](https://github.com/Gamaroff/agent-skills/pull/960) — `feature/task.328.measured-criterion-re-measured-when-head-moves` → `develop` (OPEN)
**Work item:** [`task.328.measured-criterion-re-measured-when-head-moves.md`](./task.328.measured-criterion-re-measured-when-head-moves.md) — resolved via `branch stem`
**Tracker:** [#953](https://github.com/Gamaroff/agent-skills/issues/953) — OPEN
**Verdict:** ⚠️ CONCERNS

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.328.implementation.1.measured-criterion-re-measured-when-head-moves-initial-run.md |
| Review report | ✅ | task.328.review.1.measured-criterion-re-measured-when-head-moves.md |
| QA reports | 7 | task.328.qa.1 … qa.7 |
| Gate | PASS | task.328.gate.7.measured-criterion-re-measured-when-head-moves.yml (100) |
| DoD | ❌ | not yet: `/finalise` runs at Step 7 |
| Sprint review | ❌ | not yet: `/finalise` runs at Step 7 |
| Open bugs | 0 | — |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| 1 Task 320 #10 listed, `measured: true` | `shared/resources/tests/finalise-record-preflight.test.mjs` | ✅ met |
| 2 Comparatives with and without "no" | comparative loop in the same test | ✅ met |
| 3 No-number comparison not listed; plain record `measured: false` | controls test | ✅ met |
| 4 QA skills cite Step 3, "unverified with re-measure"; test fails on lost citation or restated reasons | `evals/shared/tests/qa-measured-figure-parity.test.mjs` | ✅ met |
| 5 Corpus count and examples (amended, owner-approved) | qa.1 | ✅ met |
| 6–7 Red-first runs and mutation tables | qa.1 – qa.7 | ✅ met |
| 8 `npm test` under CI, bundle clean | gate.7 evidence | ✅ met |
| 9 CHANGELOG cites task 328 | `CHANGELOG.md` | ✅ met |

## Conformance Findings

```
[PC-1] trail · medium · confidence: high — docs/tasks/task.328.measured-criterion-re-measured-when-head-moves/task.328.implementation.1.measured-criterion-re-measured-when-head-moves-initial-run.md
  The report had no QA Cycle 7 entry and no "Proceeding to 5c" row, so gate.7 PASS was not shown reaching 5c. Cycles 3–6 were folded into one prose section.
  → Add per-cycle entries 3–7, with cycle 7 recording gate.7 PASS and "Proceeding to 5c". (Fixed in this run.)

[PC-2] trail · low · confidence: medium — docs/tasks/task.328.measured-criterion-re-measured-when-head-moves/task.328.implementation.1.measured-criterion-re-measured-when-head-moves-initial-run.md:106
  The Issues Log still asked for an owner decision on criterion 5 that had already been made.
  → Mark it resolved and cite the approval. (Fixed in this run.)
```

## Code Review Findings

Skipped (`--no-code`): the QA step ran the code reviewer every cycle with `code_review_blocking=true`.

**Anchors:** 2 checked against `aee5f9efd` (via `head-branch`). All verified: PC-1 `no-line`, PC-2 `ok`.

## Machine-Readable Findings

```yaml
reviewed_gate: task.328.gate.7.measured-criterion-re-measured-when-head-moves.yml
findings:
  - id: PC-1
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.328.measured-criterion-re-measured-when-head-moves/task.328.implementation.1.measured-criterion-re-measured-when-head-moves-initial-run.md"
    anchor_check: no-line
    finding: "The implementation report had no QA Cycle 7 entry and no Proceeding to 5c row for gate.7 PASS"
    suggested_action: "Add per-cycle entries 3 to 7, with cycle 7 recording gate.7 PASS and Proceeding to 5c"
  - id: PC-2
    category: trail
    severity: low
    confidence: medium
    ref: "docs/tasks/task.328.measured-criterion-re-measured-when-head-moves/task.328.implementation.1.measured-criterion-re-measured-when-head-moves-initial-run.md:106"
    anchor_check: ok
    finding: "The Issues Log still asked for an owner decision on criterion 5 that had been made"
    suggested_action: "Mark the entry resolved and cite the owner approval"
truncated_count: 0
```

## Recommended Actions

1. Both findings are doc-only, fixed in the implementation report, and ride the acceptance commit. Proceed to Step 7 (`/finalise`).

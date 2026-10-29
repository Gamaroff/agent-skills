# PR Review Report: PR #781 — feat(task.242): scope finalise re-runs

**Reviewed:** 2026-10-29
**PR:** [#781](https://github.com/Gamaroff/agent-skills/pull/781) — `feature/task.242.scope-finalise-re-runs` → `develop` (OPEN)
**Work item:** [`task.242.scope-finalise-re-runs.md`](./task.242.scope-finalise-re-runs.md) — resolved via `branch stem`
**Tracker:** [#780](https://github.com/Gamaroff/agent-skills/issues/780) — OPEN
**Verdict:** ✅ APPROVE

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.242.implementation.1.scope-finalise-re-runs-initial-run.md |
| Review report | ✅ | task.242.review.1.scope-finalise-re-runs.md |
| QA reports | 10 | task.242.qa.1 … task.242.qa.10.scope-finalise-re-runs.md |
| Gate | CONCERNS | task.242.gate.10.scope-finalise-re-runs.yml (90). One medium, TASK-242-QA10-1, accepted by the operator on 2026-10-29 as a known limit (§ 3 *Citation paths*) |
| DoD | ❌ | not yet — the pipeline is at Step 5c, before `/finalise` |
| Sprint review | ❌ | not yet — written by `/finalise` |
| Open bugs | 0 | — |
| Handover | ❌ | none (not required) |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| SC-1: `full` for four reasons | `shared/resources/tests/finalise-rerun-scope.test.mjs` (four `full` tests, plus `no-criteria`) | ✅ met (PC-1: the document names four reasons, the engine ships five) |
| SC-2: per-criterion reasons and `#N` ids | `shared/resources/tests/finalise-rerun-scope.test.mjs` | ✅ met |
| SC-3: task.239 replay | `shared/resources/tests/finalise-rerun-scope.test.mjs` replay and controls | ✅ met |
| SC-4: carried verdict kept, differing verdict to advisories | `shared/resources/tests/finalise-rerun-scope.test.mjs` | ✅ met |
| SC-5: `overall` recomputed | `shared/resources/tests/finalise-rerun-scope.test.mjs` | ✅ met |
| SC-6: Step 3a `scope`, Step 3c `merge` | `evals/shared/tests/finalise-dod-prompt-contract.test.mjs`, `evals/shared/tests/finalise-rerun-scope-blocks.test.mjs` | ✅ met |
| SC-7: AC prompt Step 0; Step 3 heading byte-identical | `evals/shared/tests/finalise-dod-prompt-contract.test.mjs` | ✅ met |
| SC-8: DoD block scope line and advisory list | `evals/shared/tests/finalise-dod-prompt-contract.test.mjs` | ✅ met |
| SC-9: bug-mode skip marker | `evals/shared/tests/finalise-bug-mode.test.mjs` | ✅ met (PC-2: § 7 says the file needs no edit; it was edited) |
| SC-10: not applicable | — | ✅ met (N/A) |
| SC-11: guards mutation-proved | implementation report, M1–M28 plus per-cycle proofs | ✅ met |
| SC-12: `ci:fast`, `bundle:check` | gate 10: `ci:fast` 6802 tests, 0 real failures; `bundle:check` clean | ✅ met |
| SC-13: CHANGELOG entry | `CHANGELOG.md` [Unreleased] | ✅ met |

## Conformance Findings

```
[PC-1] scope · low · confidence: high — docs/tasks/task.242.scope-finalise-re-runs/task.242.scope-finalise-re-runs.md:106
  The engine adds a fifth full reason, no-criteria, but § 3 and SC-1 still list exactly four,
  so the task document does not describe behaviour the PR ships.
  → Add no-criteria to § 3 and SC-1 before /finalise judges SC-1 against the document.

[PC-2] scope · low · confidence: high — docs/tasks/task.242.scope-finalise-re-runs/task.242.scope-finalise-re-runs.md:229
  § 7 file 8 says finalise-bug-mode.test.mjs needs no edit, but the diff adds 61 lines to it
  (an EXPECTED_VERBS entry and two 7.6a/7.6b AC-record tests).
  → Restate § 7 file 8 to say what the PR changes.
```

## Code Review Findings

Skipped (`--no-code`). The QA step ran the code reviewer on every cycle with `code_review_blocking=true`.

**Anchors:** 2 checked against `815336988e03b323995134af8d52c4ccb49d6a2e` (via `head-branch`) — all verified

Scope note: `*/references/*` excluded from the diff (13 bundled copies of `shared/resources/` sources that are themselves in the diff). None is named by the work item as a deliberate change apart from its source.

## Machine-Readable Findings

```yaml
reviewed_gate: task.242.gate.10.scope-finalise-re-runs.yml
findings:
  - id: PC-1
    category: scope
    severity: low
    confidence: high
    ref: "docs/tasks/task.242.scope-finalise-re-runs/task.242.scope-finalise-re-runs.md:106"
    anchor_check: ok
    finding: "The engine adds a fifth full reason, no-criteria, but § 3 and SC-1 still list exactly four, so the task document does not describe behaviour the PR ships."
    suggested_action: "Add no-criteria to § 3 and SC-1 before /finalise judges SC-1 against the document."
  - id: PC-2
    category: scope
    severity: low
    confidence: high
    ref: "docs/tasks/task.242.scope-finalise-re-runs/task.242.scope-finalise-re-runs.md:229"
    anchor_check: ok
    finding: "§ 7 file 8 says finalise-bug-mode.test.mjs needs no edit, but the diff adds 61 lines to it (an EXPECTED_VERBS entry and two 7.6a/7.6b AC-record tests)."
    suggested_action: "Restate § 7 file 8 to say what the PR changes."
truncated_count: 0
```

## Recommended Actions

1. Fix PC-1 and PC-2 in the task document before `/finalise` (doc-only; they ride the acceptance commit).

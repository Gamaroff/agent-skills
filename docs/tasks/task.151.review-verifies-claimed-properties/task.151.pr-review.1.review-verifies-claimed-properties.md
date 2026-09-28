# PR Review Report: PR #511 — feat(task.151): review verifies claimed properties — stack-neutral pre-pass, invariants, released shape

**Reviewed:** 2026-09-28
**PR:** [#511](https://github.com/Gamaroff/agent-skills/pull/511) — `feature/task.151.review-verifies-claimed-properties` → `develop` (OPEN)
**Work item:** [`task.151.review-verifies-claimed-properties.md`](./task.151.review-verifies-claimed-properties.md) — resolved via `branch-stem`
**Tracker:** [#481](https://github.com/Gamaroff/agent-skills/issues/481) — OPEN
**Verdict:** ✅ APPROVE

Scope: `origin/develop...origin/feature/task.151.review-verifies-claimed-properties`, 2,912 lines,
excluding `*/references/*` (byte-identical bundle copies; `bundle:check` reports them in sync). Effort:
medium. Run at develop-task Step 5c, before `/finalise`.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.151.implementation.1.review-verifies-claimed-properties-initial-run.md |
| Review report | ✅ | task.151.review.1.review-verifies-claimed-properties.md |
| QA reports | 3 | task.151.qa.{1,2,3}.review-verifies-claimed-properties.md |
| Gate | PASS | task.151.gate.3.review-verifies-claimed-properties.yml (95) |
| DoD | ❌ (expected) | written by Step 7 |
| Sprint review | ❌ (expected) | written by Step 7 |
| Open bugs | 0 | task.151.bug.1 and bug.2 closed |
| Handover | — | none (full tracker access) |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| SC1–SC5 (helper, prompt slots, dispatch sites) | `shared/resources/tests/prepass-axes.test.mjs` | ✅ met |
| SC6–SC7 (obs #161, #170 at 8 sites) | `tests/review-property-checks.test.js` | ✅ met |
| SC8–SC9 (timing, ≤ 2 reads) | ~0.67 s / ~0.13 s; `read.length` asserted | ✅ met |
| SC10 (mutation proofs) | implementation report (15 + 4 + 3) | ✅ met |
| SC11 (test, format, bundle:check, validate) | `ci:fast` 4363/0; bundle:check 0; validate ✓ | ✅ met |
| SC12 (engine conventions) | `prepass-axes.js` | ✅ met |
| SC13–SC15 (CHANGELOG, hand runs, bundle) | CHANGELOG, implementation report | ✅ met |

## Conformance Findings

```
[PC-1] consistency · low · confidence: high — task.151 § Change Log (last two rows)
  The cycle-2 CONCERNS row sits after the cycle-3 PASS row.
  → Reorder the rows chronologically.

[PC-2] consistency · low · confidence: high — task.151 § 3 Target Architecture, § 8 Fallback
  The document describes the fallback as four axes; FALLBACK_AXES is the three-item former axis-2 list.
  → Reword both sections to the former axis-2 list.

[PC-3] scope · low · confidence: medium — tests/lib/markdown-section.js, tests/outcome-reachability-check.test.js
  The shared item-reader move is not in § 7 Files Summary or § 4 In Scope.
  → Add both files to § 7 with a one-line note.
```

## Code Review Findings

```
[CR-1] cleanup · low · confidence: high — shared/resources/prepass-axes.js:137
  deriveAxes returns reason equal to source.
  → Drop it, or give it a distinct meaning.
```

Note on CR-1: the `reason` field is the engine convention (`--json` with a `reason`) that SC12
requires; it is kept deliberately.

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: consistency
    severity: low
    confidence: high
    ref: "task.151 § Change Log (last two rows)"
    finding: "The cycle-2 CONCERNS row sits after the cycle-3 PASS row."
    suggested_action: "Reorder the rows chronologically."
  - id: PC-2
    category: consistency
    severity: low
    confidence: high
    ref: "task.151 § 3 Target Architecture, § 8 Fallback"
    finding: "The document describes the fallback as four axes; FALLBACK_AXES has three."
    suggested_action: "Reword both sections to the former axis-2 list."
  - id: PC-3
    category: scope
    severity: low
    confidence: medium
    ref: "tests/lib/markdown-section.js"
    finding: "The shared item-reader move is not in the Files Summary or In Scope."
    suggested_action: "Add both files to § 7 with a one-line note."
  - id: CR-1
    category: cleanup
    severity: low
    confidence: high
    ref: "shared/resources/prepass-axes.js:137"
    finding: "deriveAxes returns reason equal to source."
    suggested_action: "Drop it or give it a distinct meaning."
truncated_count: 0
```

## Recommended Actions

1. Apply PC-1, PC-2 and PC-3 to the task document before `/finalise` (documentation only).
2. Keep CR-1 as is (SC12 engine convention).

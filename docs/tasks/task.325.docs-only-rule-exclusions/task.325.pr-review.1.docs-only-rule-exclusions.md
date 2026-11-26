# PR Review Report: PR #954 — feat(ci): ci.docsOnly.patterns can exclude a path (task 325)

**Reviewed:** 2026-11-26
**PR:** [#954](https://github.com/Gamaroff/agent-skills/pull/954) — `feature/task.325.docs-only-rule-exclusions` → `develop` (OPEN)
**Work item:** [`task.325.docs-only-rule-exclusions.md`](./task.325.docs-only-rule-exclusions.md), resolved via `branch stem`
**Tracker:** [#947](https://github.com/Gamaroff/agent-skills/issues/947), OPEN
**Verdict:** ✅ APPROVE

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.325.implementation.1.docs-only-rule-exclusions-initial-run.md |
| Review report | ✅ | task.325.review.1.docs-only-rule-exclusions.md |
| QA reports | 5 | task.325.qa.1 – qa.5 |
| Gate | PASS | task.325.gate.5.docs-only-rule-exclusions.yml (96) |
| DoD | ❌ | not yet: Step 7 has not run, and the task is not accepted |
| Sprint review | ❌ | not yet, for the same reason |
| Open bugs | 0 | — |
| Handover | ❌ | none; none is expected |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| § 8 table rows each hold in a test | `shared/resources/tests/ci-tree-equivalence.test.mjs` task.325 tests; push-policy and reenter cases | ✅ met |
| `qa.testArtifactGlobs` keeps its meaning | "glob-match itself has no negation" | ✅ met |
| Every § 8 mutation recorded with the test it turned red | qa.1 § Code Review, mutation lines | ✅ met (box unticked, PC-1) |
| Reference states syntax, any order, usage errors | `docs/reference/configuration.md` patterns row | ✅ met |
| CHANGELOG names the § 5 changes | `CHANGELOG.md` [Unreleased] | ✅ met |

## Conformance Findings

```
[PC-1] consistency · low · confidence: high — docs/tasks/task.325.docs-only-rule-exclusions/task.325.docs-only-rule-exclusions.md:285
  The § 9 Code Quality criterion is still unticked. qa.1 records it as PASS and lists all five § 8 mutations.
  → Tick the criterion and cite the qa.1 mutation lines.

[PC-2] scope · low · confidence: medium — docs/tasks/task.325.docs-only-rule-exclusions/task.325.docs-only-rule-exclusions.md:137
  The diff refuses two more kinds of exclusion that § 5 and the Implementation Summary do not describe:
  a path that is not in git's form, and brace, class, extglob or `|` syntax.
  → Add a Breaking Change 3 to § 5, and name the refusals in the Implementation Summary.
```

## Code Review Findings

Skipped (`--no-code`). The QA loop ran the code reviewer in all 5 cycles with `code_review_blocking=true`.

**Anchors:** 2 checked against `e950beb7f0435580aeb7c9a386b0e3f0c2702441` (via `head-branch`). All verified.

**Scope:** the review excluded the generated `*/references/*` copies: six `ci-tree-equivalence.js` and two `qa-docs-only-review-prompt.md`. The Files Summary names them only as generated, and `bundle:check` holds them byte-identical to their sources.

## Machine-Readable Findings

```yaml
reviewed_gate: task.325.gate.5.docs-only-rule-exclusions.yml
findings:
  - id: PC-1
    category: consistency
    severity: low
    confidence: high
    ref: "docs/tasks/task.325.docs-only-rule-exclusions/task.325.docs-only-rule-exclusions.md:285"
    anchor_check: ok
    finding: "The § 9 Code Quality criterion is still unticked, but qa.1 records it as PASS and lists all five § 8 mutations with the test each turned red."
    suggested_action: "Tick the criterion and cite the qa.1 mutation lines."
  - id: PC-2
    category: scope
    severity: low
    confidence: medium
    ref: "docs/tasks/task.325.docs-only-rule-exclusions/task.325.docs-only-rule-exclusions.md:137"
    anchor_check: ok
    finding: "The diff refuses two more kinds of exclusion that § 5 and the Implementation Summary do not describe: a path not in git's form and brace, class, extglob or | syntax."
    suggested_action: "Add a Breaking Change 3 to § 5 and mention the refusals in the Implementation Summary."
truncated_count: 0
```

## Recommended Actions

1. Tick the § 9 mutation criterion (PC-1).
2. Add Breaking Change 3 and an Implementation Summary line for the added refusals (PC-2).

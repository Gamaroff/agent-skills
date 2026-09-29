# PR Review Report: PR #515 — feat(task.153): release gate reads CI's verdict; load-sensitive tests name themselves

**Reviewed:** 2026-09-29
**PR:** [#515](https://github.com/Gamaroff/agent-skills/pull/515) — `feature/task.153.release-ci-gate-load-sensitive-tests` → `develop` (OPEN)
**Work item:** [`task.153.release-ci-gate-load-sensitive-tests.md`](./task.153.release-ci-gate-load-sensitive-tests.md) — resolved via `branch-stem`
**Tracker:** [#483](https://github.com/Gamaroff/agent-skills/issues/483) — OPEN
**Verdict:** ✅ APPROVE

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.153.implementation.1.release-ci-gate-load-sensitive-tests-initial-run.md |
| Review report | ✅ | task.153.review.1.release-ci-gate-load-sensitive-tests.md |
| QA reports | 3 | task.153.qa.{1,2,3}.release-ci-gate-load-sensitive-tests.md |
| Gate | PASS | task.153.gate.3.release-ci-gate-load-sensitive-tests.yml (95) — reached 5c by the diminishing-returns exit |
| DoD | ❌ (expected) | not yet — this review runs at Step 5c, before /finalise |
| Sprint review | ❌ (expected) | not yet — written by /finalise |
| Open bugs | 0 | — |
| Handover | ❌ | none (access.tracker full; nothing deferred) |

Scope: `origin/develop...origin/feature/task.153…`, excluding `*/references/*` (bundled copies of
`spawn-budget.mjs` and `qa-execute-snippets.test.mjs`, byte-identical to their sources and held by
`bundle:check`). 33 files, 3475 lines.

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| Refuses before the local test on red/pending/unverifiable | `tests/release-ci-gate.test.js` (npm marker absent) | ✅ met |
| `--skip-ci-check` proceeds, warns unverified | `tests/release-ci-gate.test.js` skip cases | ✅ met |
| `--dry-run` prints verdict + *Would have REFUSED* | `tests/release-ci-gate.test.js` | ✅ met |
| `ciVerdict` every row; gh failure → unverifiable | `tests/release-ci-verdict.test.js` | ✅ met |
| Local-test red prints the LOAD-SENSITIVE rule | `tests/release-ci-gate.test.js` | ✅ met |
| CR-6 retries only a precondition miss; exhausted → marker | `handoff-verify.test.js` retryUntilForked cases | ⚠️ partial — QA3-1 (retries ≥ 3) |
| Marker on every timing assertion; traps.md list equal | `tests/load-sensitive-marker.test.js` A/B/C | ✅ met |
| `npm run ci` green | pipeline run, exit 0 | ✅ met |
| Docs + CHANGELOG | `docs/contributing/{releases,traps}.md`, `CHANGELOG.md` | ✅ met |

## Conformance Findings

```
[PC-1] consistency · low · confidence: low — task frontmatter pr_number
  The task frontmatter does not yet carry pr_number: 515; /finalise normally writes it.
  → Make sure /finalise writes pr_number: 515.

[PC-2] scope · low · confidence: medium — §1 Scope / §7 Files Summary
  Three test files marked in QA cycle 2 (consumer-root, bundle-missing-source, test-clean-checkout) are not named in the task's Scope or Files Summary.
  → Add them to §7 and update §1's "four wall-clock assertions".
```

## Code Review Findings

```
[CR-1] bug · low · confidence: low — scripts/release-ci-verdict.mjs:167
  gh run list is capped at 50 with no truncation check; >50 runs on one SHA could hide a red run.
  → Treat a result of exactly the limit as unverifiable, or page.

[CR-2] cleanup · low · confidence: high — scripts/release-ci-verdict.mjs:58
  CAUSES repeats the red/pending predicates workflowVerdict hard-codes.
  → Derive workflowVerdict from CAUSES.

[CR-3] cleanup · low · confidence: high — scripts/release-ci-verdict.mjs:144
  fetchRuns has two stacked JSDoc blocks.
  → Merge them.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: consistency
    severity: low
    confidence: low
    ref: "task.153.release-ci-gate-load-sensitive-tests.md frontmatter pr_number"
    finding: "The task frontmatter does not yet carry pr_number 515."
    suggested_action: "Have /finalise write pr_number: 515."
  - id: PC-2
    category: scope
    severity: low
    confidence: medium
    ref: "task.153.release-ci-gate-load-sensitive-tests.md §1 Scope, §7 Files Summary"
    finding: "Three test files marked in QA cycle 2 are not named in the task's Scope or Files Summary."
    suggested_action: "Add them to §7 and update §1."
  - id: CR-1
    category: bug
    severity: low
    confidence: low
    ref: "scripts/release-ci-verdict.mjs:167"
    finding: "gh run list is capped at 50 with no truncation check."
    suggested_action: "Treat a result of exactly the limit as unverifiable, or page."
  - id: CR-2
    category: cleanup
    severity: low
    confidence: high
    ref: "scripts/release-ci-verdict.mjs:58"
    finding: "CAUSES repeats the red/pending predicates workflowVerdict hard-codes."
    suggested_action: "Derive workflowVerdict from CAUSES."
  - id: CR-3
    category: cleanup
    severity: low
    confidence: high
    ref: "scripts/release-ci-verdict.mjs:144"
    finding: "fetchRuns has two stacked JSDoc blocks."
    suggested_action: "Merge them."
truncated_count: 0
```

## Recommended Actions

1. At /finalise: write `pr_number: 515` and bring §1/§7 up to the seven marked files (PC-1, PC-2).
2. Follow-up: QA3-1 (CR-6 schedule vs fixture lifetime at retries ≥ 3) and CR-1 (run-list truncation) — both LOW, both fail-closed or non-default.

# PR Review Report: PR #937 — feat(task.319): pipelines spend a CI run only where a run can answer something (#936)

**Reviewed:** 2026-11-25
**PR:** [#937](https://github.com/Gamaroff/agent-skills/pull/937) — `feature/task.319.ci-runs-only-where-needed` → `develop` (OPEN)
**Work item:** [`task.319.ci-runs-only-where-needed.md`](./task.319.ci-runs-only-where-needed.md) — resolved via `branch-stem`
**Tracker:** [#936](https://github.com/Gamaroff/agent-skills/issues/936) — OPEN
**Verdict:** ✅ APPROVE

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.319.implementation.1.ci-runs-only-where-needed-initial-run.md |
| Review report | ✅ | task.319.review.1 and task.319.review.2 |
| QA reports | 9 | task.319.qa.1 to task.319.qa.9 |
| Gate | PASS | task.319.gate.9.ci-runs-only-where-needed.yml (100) |
| DoD | GAPS | task.319.dod.1.ci-runs-only-where-needed.md; the run re-entered QA after it |
| Sprint review | — | not expected before acceptance |
| Open bugs | 0 | bugs 1, 2 and 3 are closed |
| Handover | — | none |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| 1 Every push site calls the helper, with a scan test | `shared/resources/push-policy.sh`, `push-policy.test.mjs` | ✅ met |
| 2 Simulated five-cycle run | `push-policy.test.mjs` | ✅ met |
| 3 The pause hook leaves the remote unmoved and says so | `develop-pipeline-on-precompact.sh` and its test | ✅ met |
| 4 `skipMarker` never on a commit with code | `push-policy.test.mjs` | ✅ met |
| 5 A named command is graded on a run at the head | `finalise-rerun-at-head.js` and its test | ✅ met |
| 6 The probe scores an `eslint:` entry | `security-probe-eslint.test.mjs` | ✅ met |
| 7 Bitbucket poll writes the same line | `finalise-ci-poll.test.mjs` | ✅ met |
| 8 `tickVia: pr` ticks through a merged PR | `tick-pr.sh`, `tick-pr.test.mjs` | ✅ met |
| 9 Push count, before and after | QA report 9 | ✅ met |
| 10 Suite under `CI=true`; every new test red before its change | QA report 9; every added test has a row (PC-1 is about three changed ones) | ✅ met |
| 11 Bundle leaves no diff | QA report 9 | ✅ met |
| 12 Four keys in the reference | `docs/reference/configuration.md` | ✅ met |
| 13 CHANGELOG | `CHANGELOG.md` `[Unreleased]` | ✅ met |

The criteria column is from the QA report's own table and the reviewer's reading of the diff.

## Conformance Findings

```
[PC-1] trail · low · confidence: high — docs/tasks/task.319.ci-runs-only-where-needed/task.319.qa.9.ci-runs-only-where-needed.md:109
  The report says every added or changed test has a row; three changed ones have none
  → Add the rows, with a mutation run for the two that no run shows red
[PC-2] consistency · low · confidence: medium — docs/reference/configuration.md:481
  The HALT sentence omits that no push is made before a PR is open; the CHANGELOG states it
  → Say "a terminal HALT once a PR is open"
```

Checked by the orchestrator against the files at the head.

## Code Review Findings

Skipped (`--no-code`).

**Anchors:** 2 checked against `109a5f998d2385f8f0b84b488a18a718973728a3` (via `head-branch`) — verified

**Scope of the diff:** generated `skills/*/references/` copies were left out.

## Machine-Readable Findings

```yaml
reviewed_gate: task.319.gate.9.ci-runs-only-where-needed.yml
findings:
  - id: PC-1
    category: trail
    severity: low
    confidence: high
    ref: "docs/tasks/task.319.ci-runs-only-where-needed/task.319.qa.9.ci-runs-only-where-needed.md:109"
    anchor_check: ok
    finding: "The report says each test the task adds or changes is below, and every newly added test has a row, but three changed ones have none: the two-shell test 'Steps 3a and 3c run as delivered', the two-shell test 'Steps 3a + 3c as substituted' (red in part B of the lines file, but with no table row), and the control scenario 17g of develop-pipeline-on-precompact.test.sh."
    suggested_action: "Add the three rows, with a mutation run for the placeholder check of the re-run block and for 17g."
  - id: PC-2
    category: consistency
    severity: low
    confidence: medium
    ref: "docs/reference/configuration.md:481"
    anchor_check: ok
    finding: "The HALT sentence lists the cases in which a terminal HALT does not push, but omits push-held.sh's answers for a run with no PR recorded and for no lock, while the CHANGELOG states the limit as 'any terminal HALT once a PR is open'."
    suggested_action: "Say 'a terminal HALT once a PR is open', as the CHANGELOG does."
truncated_count: 0
```

## Recommended Actions

1. PC-1: three rows in QA report 9
2. PC-2: one sentence in the configuration reference

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
| QA reports | 8 | task.319.qa.1 to task.319.qa.8 |
| Gate | PASS | task.319.gate.8.ci-runs-only-where-needed.yml (100) |
| DoD | — | not expected before `/finalise` |
| Sprint review | — | not expected before `/finalise` |
| Open bugs | 0 | bugs 1, 2 and 3 are closed |
| Handover | — | none |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| 1 Every push site calls the helper, with a scan test | `shared/resources/push-policy.sh`, `push-policy.test.mjs` | ✅ met |
| 2 Simulated five-cycle run | `push-policy.test.mjs` | ✅ met |
| 3 The pause hook leaves the remote unmoved and says so | `develop-pipeline-on-precompact.sh`, its test; the documents of PR review 1 corrected | ✅ met |
| 4 `skipMarker` never on a commit with code | `push-policy.test.mjs` | ✅ met |
| 5 A named command is graded on a run at the head | `finalise-rerun-at-head.js` and its test | ✅ met |
| 6 The probe scores an `eslint:` entry | `security-probe-eslint.test.mjs` | ✅ met |
| 7 Bitbucket poll writes the same line | `finalise-ci-poll.test.mjs` | ✅ met |
| 8 `tickVia: pr` ticks through a merged PR | `tick-pr.sh`, `tick-pr.test.mjs` | ✅ met |
| 9 Push count, before and after | QA report 8 | ✅ met |
| 10 Suite under `CI=true`; tests red before their change | QA reports 7 and 8 | ✅ met |
| 11 Bundle leaves no diff | QA report 8 | ✅ met |
| 12 Four keys in the reference | `docs/reference/configuration.md` | ✅ met |
| 13 CHANGELOG | `CHANGELOG.md` `[Unreleased]` | ✅ met |

The criteria column is from the QA report's own table and the reviewer's reading of the diff.

## Conformance Findings

```
[PC-1] consistency · low · confidence: high — CHANGELOG.md:22
  The skipMarker entry says the marker cannot reach the base branch's head; the configuration reference says a person who merges with another button, or with a message that lists the commits, carries it there all the same
  → Limit the sentence to a merge made with the stated strategy, as the configuration reference does
```

Checked by the orchestrator against both files at the head.

## Code Review Findings

Skipped (`--no-code`).

**Anchors:** 1 checked against `4005bbc730becf23fcdeeb2e4ab69c0dc0244139` (via `head-branch`) — verified

**Scope of the diff:** generated `skills/*/references/` copies were left out; the two hand-authored documents there (`develop-bug-step-5-6-verify-loop.md`, `develop-bug-step-7-close-bug.md`) were reviewed.

## Machine-Readable Findings

```yaml
reviewed_gate: task.319.gate.8.ci-runs-only-where-needed.yml
findings:
  - id: PC-1
    category: consistency
    severity: low
    confidence: high
    ref: "CHANGELOG.md:22"
    anchor_check: ok
    finding: "The ci.skipMarker entry states that mergeStrategy: merge and no checkCommand mean the marker cannot reach the base branch's head, but docs/reference/configuration.md says a person who merges with another button, or with a merge message that lists the commits (Bitbucket's default text), carries the marker to the base all the same."
    suggested_action: "Limit the CHANGELOG sentence to a merge made with the stated strategy, and tell the reader to leave the key empty where a person can merge another way or with a message that lists the commits, as the configuration reference does."
truncated_count: 0
```

## Recommended Actions

1. PC-1: one CHANGELOG sentence

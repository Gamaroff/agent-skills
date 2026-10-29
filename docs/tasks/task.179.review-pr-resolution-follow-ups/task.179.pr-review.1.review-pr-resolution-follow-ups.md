# PR Review Report: PR #764 — fix(task.179): review-pr reads a target's host once, for both parser arms

**Reviewed:** 2026-10-27
**PR:** [#764](https://github.com/Gamaroff/agent-skills/pull/764) — `feature/task.179.review-pr-resolution-follow-ups` → `develop` (OPEN)
**Work item:** [`task.179.review-pr-resolution-follow-ups.md`](./task.179.review-pr-resolution-follow-ups.md) — resolved via `branch stem`
**Tracker:** [#558](https://github.com/Gamaroff/agent-skills/issues/558) — OPEN
**Verdict:** ✅ APPROVE

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.179.implementation.1.review-pr-resolution-follow-ups-initial-run.md |
| Review report | ✅ | task.179.review.1.review-pr-resolution-follow-ups.md |
| QA reports | 1 | task.179.qa.1.review-pr-resolution-follow-ups.md |
| Gate | PASS | task.179.gate.1.review-pr-resolution-follow-ups.yml (100) |
| DoD | ❌ | not yet: Step 7 writes it (status `ready-for-review`) |
| Sprint review | ❌ | not yet: Step 7 writes it |
| Open bugs | 0 | — |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| CR-1 bypass shapes parse as branch | `skills/review-pr/tests/review-pr.test.js` parser cases `ghe.corp#…`, `ghe.corp?…` | ✅ met |
| Both arms read the host through `host_of` | `skills/review-pr/scripts/parse-target.sh:195`, `:208` | ✅ met |
| `x@github.com/…` → PR 1; `github.com:1@evil.com/…` → branch | parser cases | ✅ met |
| `JIRA_URL= # prod` → "not set" | Step 0b test "a comment-only .env JIRA_URL reads as unset" | ✅ met |
| SKILL.md states the known-host rule | `skills/review-pr/SKILL.md` target row, KIND `branch` row | ✅ met |
| No extra network call | test "no target makes a network or git call" | ✅ met |
| Suite, shellcheck, validate, bundle:check, lint:secrets green | QA cycle 1 report; CI checks | ✅ met |

## Conformance Findings

```
[PC-1] consistency · low · confidence: medium — CHANGELOG.md:17
  The CHANGELOG entry says two stale test comments were corrected, but the work item, its
  Implementation Summary and the test diff all show three.
  → Change "two stale test comments" to "three stale test comments" in the task 179 CHANGELOG entry.
```

## Code Review Findings

Skipped (`--no-code`). The QA cycle 1 code review covered this diff in 5a.

**Anchors:** 1 checked against `d1a38744` (via `head-branch`), all verified.

Scope: the 6 generated `skills/*/references/develop-pipeline-step-0-resolve-and-prepare.md` copies were excluded from the diff. Their source, `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`, was reviewed, and `npm run bundle:check` holds the copies equal to it.

## Machine-Readable Findings

```yaml
reviewed_gate: task.179.gate.1.review-pr-resolution-follow-ups.yml
findings:
  - id: PC-1
    category: consistency
    severity: low
    confidence: medium
    ref: "CHANGELOG.md:17"
    anchor_check: ok
    finding: "The CHANGELOG entry says two stale test comments were corrected, but the work item, its Implementation Summary and the test diff all show three."
    suggested_action: "Change \"two stale test comments\" to \"three stale test comments\" in the task 179 CHANGELOG entry."
truncated_count: 0
```

## Recommended Actions

1. Correct the CHANGELOG count (doc-only; it can ride the acceptance commit).

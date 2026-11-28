# PR Review Report: PR #964 — feat(task.332): AC merge requires --doc and a named story_file; stem-keyed scope/extract files

**Reviewed:** 2026-11-28
**PR:** [#964](https://github.com/Gamaroff/agent-skills/pull/964) — `feature/task.332.ac-merge-closes-task-331-follow-ups` → `develop` (OPEN)
**Work item:** [`task.332.ac-merge-closes-task-331-follow-ups.md`](./task.332.ac-merge-closes-task-331-follow-ups.md) — resolved via `branch stem`
**Tracker:** [#963](https://github.com/Gamaroff/agent-skills/issues/963) — OPEN
**Verdict:** ✅ APPROVE

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.332.implementation.1.ac-merge-closes-task-331-follow-ups-initial-run.md |
| Review report | ✅ | task.332.review.1.ac-merge-closes-task-331-follow-ups.md |
| QA reports | 3 | task.332.qa.1/2/3.ac-merge-closes-task-331-follow-ups.md |
| Gate | PASS | task.332.gate.3.ac-merge-closes-task-331-follow-ups.yml (100) |
| DoD | ❌ | not yet — `/finalise` has not run (document is ready-for-review) |
| Sprint review | ❌ | not yet — written by `/finalise` |
| Open bugs | 0 | — |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

The conformance lens mapped every success criterion to the diff and raised no coverage, scope, trail
or consistency finding. Per-criterion evidence is recorded in the QA reports and is graded by
`/finalise`'s AC agent.

## Conformance Findings

None.

## Code Review Findings

Skipped (`--no-code`) — the QA loop ran the code reviewer on every cycle with `code_review_blocking=true`.

**Anchors:** 0 checked against `4b87a42c120d54a51af1553ad462d23c64f66e83` (via `head-branch`) — all verified

Scope: the diff excludes the auto-generated `*/references/*` bundled copies
(`skills/finalise/references/finalise-dod-ac-prompt.md`, `skills/finalise/references/finalise-rerun-scope.js`,
`skills/review-story/references/finalise-dod-ac-prompt.md`, `skills/review-task/references/finalise-dod-ac-prompt.md`),
byte copies of their `shared/resources/` sources, which are reviewed.

## Machine-Readable Findings

```yaml
reviewed_gate: task.332.gate.3.ac-merge-closes-task-331-follow-ups.yml
findings: []
truncated_count: 0
```

## Recommended Actions

1. Proceed to `/finalise`.

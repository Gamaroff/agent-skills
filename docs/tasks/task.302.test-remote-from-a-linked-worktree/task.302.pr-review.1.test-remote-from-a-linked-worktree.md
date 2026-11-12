# PR Review Report: PR #890 — fix(task.302): test:remote works from a linked worktree

**Reviewed:** 2026-11-12
**PR:** [#890](https://github.com/Gamaroff/agent-skills/pull/890) — `feature/task.302.test-remote-from-a-linked-worktree` → `develop` (OPEN)
**Work item:** `task.302.test-remote-from-a-linked-worktree.md` — resolved via branch stem
**Tracker:** none linked
**Verdict:** ✅ APPROVE

Review ran inline by the pipeline agent (no dispatched conformance subagent), conformance lens only (`--no-code`). Independent review did not run.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.302.implementation.1…initial-run.md |
| Review report | ✅ | task.302.review.1 (8/10) |
| QA reports | 1 | task.302.qa.1 |
| Gate | PASS | task.302.gate.1 (95) |
| DoD | ❌ | not yet written; Step 7 writes it |
| Sprint review | ❌ | not yet written; Step 7 writes it |
| Open bugs | 0 | none |
| Handover | ❌ | none needed |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| Linked worktree runs `ci:fast` to the same result as the main checkout | Live run exit 0, 8407 tests, 0 failed (implementation report, QA report); no side-by-side run | ⚠️ partial |
| Offline test fails when the old path is restored | `tests/test-remote-runner.test.js` linked-worktree test; QA re-proved it red on the old `run.sh` | ✅ met |
| Normal checkout unchanged | 21 tests before, 23 after, all pass; normal-checkout test added | ✅ met |
| Load on both hosts recorded before and after | Implementation report and QA report | ✅ met |
| `lint:shell`, `format:check`, `ci:fast` pass | lint:shell clean; prettier clean; ci:fast green in the live run | ✅ met |
| Doc and CHANGELOG say what changed | `docs/contributing/testing-remote.md` step 3; CHANGELOG entry | ✅ met |

## Conformance Findings

[PC-1] trail · low · confidence: high — task.302.test-remote-from-a-linked-worktree.md
  The Success Criteria and Progress Tracking checkboxes are still unticked and one Phase 3 box (live run) is open, while the QA gate reads PASS.
  → `/finalise` ticks them with the DoD; no change needed before then.

[PC-2] coverage · low · confidence: medium — task.302.test-remote-from-a-linked-worktree.md
  The first criterion asks for the same result as the main checkout. The evidence is a clean live run, not a comparison; the PR CI `test` job is the counterpart and was pending.
  → Confirm the CI `test` job is green before merge (the develop-next merge gate does).

## Code Review Findings

Skipped (`--no-code`). The QA cycle's own diff review covered the code.

**Anchors:** 0 checked (no code findings).

## Machine-Readable Findings

```yaml
reviewed_gate: task.302.gate.1.test-remote-from-a-linked-worktree.yml
findings:
  - id: PC-1
    category: trail
    severity: low
    confidence: high
    ref: "task.302.test-remote-from-a-linked-worktree.md"
    anchor_check: no-line
    finding: "Success Criteria and Progress Tracking checkboxes are unticked and one Phase 3 box is open while the gate reads PASS."
    suggested_action: "Finalise ticks them with the DoD."
  - id: PC-2
    category: coverage
    severity: low
    confidence: medium
    ref: "task.302.test-remote-from-a-linked-worktree.md"
    anchor_check: no-line
    finding: "Same result as the main checkout is shown by a clean live run, not a side-by-side comparison."
    suggested_action: "Confirm the PR CI test job is green before merge."
truncated_count: 0
```

## Recommended Actions

1. Let `/finalise` tick the criteria and write the DoD; confirm the CI `test` job before merge.

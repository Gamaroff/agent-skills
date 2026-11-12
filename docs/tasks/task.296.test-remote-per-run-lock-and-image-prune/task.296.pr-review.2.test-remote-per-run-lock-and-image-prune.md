# PR Review Report: PR #891 — test:remote per-run lock and image-tag prune

**Reviewed:** 2026-11-12
**PR:** [#891](https://github.com/Gamaroff/agent-skills/pull/891) — `feature/task.296.test-remote-per-run-lock-and-image-prune` → `develop` (open)
**Work item:** [`task.296.test-remote-per-run-lock-and-image-prune.md`](./task.296.test-remote-per-run-lock-and-image-prune.md) — resolved via `branch stem`
**Tracker:** none — no tracker issue is linked
**Verdict:** ✅ APPROVE

---

## Review scope

Conformance lens only (the pipeline passes `--no-code`; QA ran the code reviewer every cycle). Diff excluded the QA reports, run records and bundled `references/` copies, 2225 lines. The lens ran 18 seconds with four tool calls, so independent review was shallow; I checked its one open question inline. Reviewed gate: gate 5 (PASS 96), whose head `891786345c16` is an ancestor of the PR head `9d49c58e`.

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.296.implementation.1…initial-run.md` |
| Review report | ✅ | `task.296.review.1…md` |
| QA reports | 5 | `task.296.qa.1` to `qa.5` |
| Gate | PASS | `task.296.gate.5…yml` (96) |
| DoD | ❌ | not expected: status is `ready-for-review`, `/finalise` has not run |
| Sprint review | ❌ | not expected, same reason |
| Open bugs | 0 | none filed |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

Judged from the diff and the QA evidence; the checkboxes are ticked by `/finalise`.

| Criterion | Evidence | Status |
|---|---|---|
| Per-run lock, refusal of an overlapping run | `scripts/remote-test/lockctl.sh`, `scripts/remote-test/run.sh`; 48 offline tests | ✅ met |
| Live two-run overlap recorded in the QA report | QA report 5, "Live Two-Run Overlap on the Server" | ✅ met |
| Live prune recorded in the QA report | QA report 1, the `--prune-images` row (five tags listed, current kept, four removed, exit 0) | ✅ met |
| Docs and CHANGELOG | `docs/contributing/testing-remote.md`, `CHANGELOG.md` cites task 296 | ✅ met |

## Conformance Findings

[PC-1] consistency · low · confidence: low — `pr_number`
  The task frontmatter has no `pr_number:` field. `/finalise` writes it and has not run.
  → Have `/finalise` write `pr_number: 891`.

[PC-2] trail · low · confidence: low — `docs/tasks/task.296.test-remote-per-run-lock-and-image-prune/task.296.test-remote-per-run-lock-and-image-prune.md`
  The Phase 3 box for the live overlap and the live prune is still unticked. Both are now recorded in QA reports (overlap in report 5, prune in report 1), so this is the `/finalise` tick, not a gap.
  → Have `/finalise` tick the box.

## Code Review Findings

Skipped (`--no-code`).

## Machine-Readable Findings

```yaml
reviewed_gate: task.296.gate.5.test-remote-per-run-lock-and-image-prune.yml
findings:
  - id: PC-1
    category: consistency
    severity: low
    confidence: low
    ref: "pr_number"
    anchor_check: no-line
    finding: "The task frontmatter has no pr_number field, although the work is now PR 891; finalise writes it."
    suggested_action: "Have finalise write pr_number 891 into the task frontmatter."
  - id: PC-2
    category: trail
    severity: low
    confidence: low
    ref: "docs/tasks/task.296.test-remote-per-run-lock-and-image-prune/task.296.test-remote-per-run-lock-and-image-prune.md"
    anchor_check: no-line
    finding: "The Phase 3 box for the live overlap and live prune is unticked although QA reports 1 and 5 record both."
    suggested_action: "Have finalise tick the box."
truncated_count: 0
```

## Recommended Actions

1. Proceed to `/finalise`: it writes `pr_number: 891` and ticks the success criteria.

# PR Review Report: PR #891 — feat(task.296): test:remote per-run lock, --unlock and --prune-images

**Reviewed:** 2026-11-12
**PR:** [#891](https://github.com/Gamaroff/agent-skills/pull/891) — `feature/task.296.test-remote-per-run-lock-and-image-prune` → `develop` (OPEN)
**Work item:** [`task.296.test-remote-per-run-lock-and-image-prune.md`](./task.296.test-remote-per-run-lock-and-image-prune.md) — resolved via `branch stem`
**Tracker:** none — no tracker linkage
**Verdict:** ⚠️ CONCERNS

Scope: conformance lens only (`--no-code`; the code lens ran in every QA cycle). Excluded from the diff: the bundled `references/` copies and the QA reports and gates, which were read from disk. The head checked against is `358082d3` (via `head-branch`).

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.296.implementation.1.test-remote-per-run-lock-and-image-prune-initial-run.md |
| Review report | ✅ | task.296.review.1.test-remote-per-run-lock-and-image-prune.md |
| QA reports | 4 | qa.1 to qa.4 |
| Gate | PASS | task.296.gate.4.test-remote-per-run-lock-and-image-prune.yml (95) |
| DoD | ❌ | not expected: the task has not reached `/finalise` |
| Sprint review | ❌ | not expected: same reason |
| Open bugs | 0 | none |
| Handover | ❌ | none |

All four gates name a head that is an ancestor of the PR head, and each gate's `updated:` is later than the author time of the commit it names. The task's Change Log lost no rows against the base.

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| Atomic per-run lock, owner file, staleness rule, `--unlock` | `scripts/remote-test/lockctl.sh`, `scripts/remote-test/run.sh`, 48 tests in `tests/test-remote-runner.test.js` | ✅ met |
| `--prune-images`, bounded and fail-closed | `lockctl.sh` prune branch, prune tests | ✅ met |
| Docs and CHANGELOG | `docs/contributing/testing-remote.md`, `CHANGELOG.md` | ✅ met |
| Live two-run overlap recorded in the QA report | the live run reached the container-name layer first; the lock layer was proved by holding the lock directly | ⚠️ partial (PC-3) |

## Conformance Findings

[PC-3] coverage · low · confidence: medium — `docs/tasks/task.296.test-remote-per-run-lock-and-image-prune/task.296.test-remote-per-run-lock-and-image-prune.md:112`
  The Phase 3 criterion asks for a live two-run overlap on the server recorded in the QA report, and it is still unticked: QA report 1 says a real overlap during the sync window was not reproduced and the lock layer was proved by holding the lock directly.
  → Record the substitution as an accepted deviation in the task document, naming where the live evidence is recorded, or add a live overlap run to the QA record.

[PC-1] trail · medium · confidence: high — `docs/tasks/task.296.test-remote-per-run-lock-and-image-prune/task.296.implementation.1.test-remote-per-run-lock-and-image-prune-initial-run.md:38`
  The Pipeline Progress row for steps 5-6 still reads that cycle 1 is fixing with an empty Completed cell, although four gates exist and the last reads PASS 95.
  → Update the row to name the current cycle and gate.

[PC-2] trail · low · confidence: high — `docs/tasks/task.296.test-remote-per-run-lock-and-image-prune/task.296.implementation.1.test-remote-per-run-lock-and-image-prune-initial-run.md:115`
  The QA Cycle 4 entry reads Action "Running /review-pr" and PR Review "pending — Step 5c next", neither of which is in the spec's value set, so a reader asking whether gate 4 reached 5c does not get the recorded answer. (Verified: this was the orchestrator's own wording, not the reviewer's misreading.)
  → Write the spec's wording: Action "Proceeding to 5c (PR conformance review)" and PR Review "pending — 5c not yet run", then the verdict once 5c is decided.

[PC-4] consistency · low · confidence: medium — `docs/tasks/task.296.test-remote-per-run-lock-and-image-prune/task.296.test-remote-per-run-lock-and-image-prune.md:164`
  Every Success Criteria checkbox in section 9 is still unticked while the status is ready-for-review and gate 4 reports PASS 95 with 4/4 phases.
  → Tick the criteria the evidence verifies and leave the live overlap open with the deviation noted.

[PC-5] consistency · low · confidence: medium — `docs/tasks/task.296.test-remote-per-run-lock-and-image-prune/task.296.test-remote-per-run-lock-and-image-prune.md:11`
  The task frontmatter has no pr_number although PR #891 is open and the implementation report names it; sibling accepted tasks carry one.
  → Add `pr_number: 891` to the task frontmatter.

## Code Review Findings

Skipped (`--no-code`). The code lens ran in each of the four QA cycles.

**Anchors:** 5 checked against `358082d368c1bf28b27f652cefaec7d6b98983e3` (via `head-branch`) — all verified (each `unchecked-text`, in range).

## Machine-Readable Findings

```yaml
reviewed_gate: task.296.gate.4.test-remote-per-run-lock-and-image-prune.yml
findings:
  - id: PC-3
    category: coverage
    severity: low
    confidence: medium
    ref: "docs/tasks/task.296.test-remote-per-run-lock-and-image-prune/task.296.test-remote-per-run-lock-and-image-prune.md:112"
    anchor_check: unchecked-text
    finding: "The Phase 3 criterion asks for a live two-run overlap on the server recorded in the QA report, and it is still unticked: QA report 1 says a real overlap during the sync window was not reproduced and the lock layer was proved by holding the lock directly."
    suggested_action: "Record the substitution as an accepted deviation in the task document, naming where the live evidence is recorded, or add a live overlap run to the QA record."
  - id: PC-1
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.296.test-remote-per-run-lock-and-image-prune/task.296.implementation.1.test-remote-per-run-lock-and-image-prune-initial-run.md:38"
    anchor_check: unchecked-text
    finding: "The Pipeline Progress row for steps 5-6 still reads that cycle 1 is fixing with an empty Completed cell, although four gates exist and the last reads PASS 95."
    suggested_action: "Update the row to name the current cycle and gate."
  - id: PC-2
    category: trail
    severity: low
    confidence: high
    ref: "docs/tasks/task.296.test-remote-per-run-lock-and-image-prune/task.296.implementation.1.test-remote-per-run-lock-and-image-prune-initial-run.md:115"
    anchor_check: unchecked-text
    finding: "The QA Cycle 4 entry reads Action Running /review-pr and PR Review pending, neither of which is in the spec's value set, so a reader asking whether gate 4 reached 5c does not get the recorded answer."
    suggested_action: "Write the spec's wording for Action and PR Review, then the verdict once 5c is decided."
  - id: PC-4
    category: consistency
    severity: low
    confidence: medium
    ref: "docs/tasks/task.296.test-remote-per-run-lock-and-image-prune/task.296.test-remote-per-run-lock-and-image-prune.md:164"
    anchor_check: unchecked-text
    finding: "Every Success Criteria checkbox in section 9 is still unticked while the status is ready-for-review and gate 4 reports PASS 95 with 4/4 phases."
    suggested_action: "Tick the criteria the evidence verifies and leave the live overlap open with the deviation noted."
  - id: PC-5
    category: consistency
    severity: low
    confidence: medium
    ref: "docs/tasks/task.296.test-remote-per-run-lock-and-image-prune/task.296.test-remote-per-run-lock-and-image-prune.md:11"
    anchor_check: unchecked-text
    finding: "The task frontmatter has no pr_number although PR #891 is open and the implementation report names it; sibling accepted tasks carry one."
    suggested_action: "Add pr_number: 891 to the task frontmatter."
truncated_count: 0
```

## Recommended Actions

1. Record the live-overlap deviation in the task document (PC-3). It is the one `coverage` finding, so on a CONCERNS verdict it sends the run back to `/qa-fix`.
2. Bring the Pipeline Progress row and the QA Cycle 4 entry to the spec's wording (PC-1, PC-2).
3. Tick the verified success criteria and add `pr_number: 891` (PC-4, PC-5).

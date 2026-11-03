# PR Review Report: PR #813 — fix(tests): security-probe tests write no scratch files into the repository (task.250)

**Reviewed:** 2026-11-03
**PR:** [#813](https://github.com/Gamaroff/agent-skills/pull/813) — `feature/task.250.security-probe-scratch-out-of-tree` → `develop` (OPEN)
**Work item:** [`task.250.security-probe-scratch-out-of-tree.md`](./task.250.security-probe-scratch-out-of-tree.md) — resolved via `branch-stem`
**Tracker:** [#812](https://github.com/Gamaroff/agent-skills/issues/812) — OPEN
**Verdict:** ✅ APPROVE

Step 5c, conformance lens only (`--no-code`, `--effort medium`): the QA loop ran the code reviewer on every cycle. Scope: the full PR diff, `origin/develop...origin/feature/task.250.security-probe-scratch-out-of-tree` at `9408726d`, 18 files. The `*/references/*` exclusion removed nothing, because the PR has no bundled copies.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.250.implementation.1.security-probe-scratch-out-of-tree-initial-run.md` |
| Review report | ✅ | `task.250.review.1.security-probe-scratch-out-of-tree.md` |
| QA reports | 5 | `task.250.qa.{1..5}.security-probe-scratch-out-of-tree.md` |
| Gate | CONCERNS | `task.250.gate.5.security-probe-scratch-out-of-tree.yml` (90). Loop-limit escalation; the user accepted the residual (CR5-1, CR5-2) on 2026-11-03, and QA Cycle 5 now reads `Proceeding to 5c` |
| DoD | ❌ | not expected yet: status `ready-for-review`, `/finalise` has not run |
| Sprint review | ❌ | not expected yet (as above) |
| Open bugs | 0 | — |
| Handover | ❌ | none; none expected |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| No test creates anything under `REPO_ROOT` | `shared/resources/tests/security-probe.test.mjs`: `fenceRoot` temp roots and the in-tree write guard. Watched run in QA report 1. The before/after untracked-file check (2026-11-03) is in the implementation report | ⚠️ partial. The runtime half is met. The static guard has two accepted known limits (CR5-1, CR5-2), neither present in the file |
| Every pre-existing test kept, same assertions | 277 tests; before → after listing in QA report 1 | ✅ met |
| Containment tests still fail on a wrong root | premise control in QA report 1 | ✅ met |
| Runtime within +10% | timing in QA report 1 | ✅ met |
| No temp roots left behind | roots removed in `finally`; temp-dir ratchet | ✅ met |
| One root builder (`fenceRoot`) | `security-probe.test.mjs` | ✅ met |
| format, test (and lint:shell) pass | hosted CI green on earlier heads; locally, 1 environmental failure (`ci-tool-skips`, zsh missing) | ✅ met (CI on the head commit is checked at `/finalise`) |
| Guard red pre-change and on a one-site mutation | mutation proofs in QA reports 1–5 | ✅ met |
| CHANGELOG cites task 250 | `CHANGELOG.md` `[Unreleased]` | ✅ met |

## Conformance Findings

```
[PC-1] trail · low · confidence: medium — docs/tasks/task.250.security-probe-scratch-out-of-tree/task.250.security-probe-scratch-out-of-tree.md:196
  Progress Tracking marks Phase 5 complete, but its checkbox for the before/after untracked-file check is still unticked, and no QA report records the porcelain snapshots.
  → Record the before/after output and tick the box.

[PC-2] consistency · low · confidence: medium — docs/tasks/task.250.security-probe-scratch-out-of-tree/task.250.security-probe-scratch-out-of-tree.md:11
  The work item's `updated: 2026-11-02` is older than the implementation report beside it, edited on 2026-11-03 to record the user's acceptance of the residual.
  → Set `updated:` to 2026-11-03 and add a Change Log row for the acceptance and the resume at 5c.
```

Both are carried in this step (doc-only):

- **PC-1:** the check was calibrated first. A planted `tests/fixtures/shell-fn/.t250-calib/x` showed up as a one-line diff.
  - It then ran: `git status --porcelain --untracked-files=all --ignored` before and after the suite alone (277/277) was identical (6,156 lines).
  - The result is recorded in the implementation report, and the box is ticked.
- **PC-2:** `updated:` bumped, and a Change Log row added.

## Code Review Findings

Skipped (`--no-code`).

**Anchors:** 2 checked against `9408726db2e18f408b840a45a7b5a9df9e819a0d` (via `head-branch`). All verified.

## Machine-Readable Findings

```yaml
reviewed_gate: task.250.gate.5.security-probe-scratch-out-of-tree.yml
findings:
  - id: PC-1
    category: trail
    severity: low
    confidence: medium
    ref: "docs/tasks/task.250.security-probe-scratch-out-of-tree/task.250.security-probe-scratch-out-of-tree.md:196"
    anchor_check: ok
    finding: "Progress Tracking marks Phase 5 complete, but its checkbox for the before/after untracked-file check is still unticked, and no QA report records the porcelain snapshots."
    suggested_action: "Record the before/after output and tick the box."
  - id: PC-2
    category: consistency
    severity: low
    confidence: medium
    ref: "docs/tasks/task.250.security-probe-scratch-out-of-tree/task.250.security-probe-scratch-out-of-tree.md:11"
    anchor_check: ok
    finding: "The work item's updated field (2026-11-02) is older than the implementation report beside it, edited on 2026-11-03."
    suggested_action: "Set updated to 2026-11-03 and add a Change Log row for the acceptance and the resume at 5c."
truncated_count: 0
```

## Recommended Actions

1. Proceed to Step 7 `/finalise`. It confirms CI on the final head.
2. Follow-ups, outside this PR:
   - Replace the guard's hand tokenizer with a parser-backed scan (`acorn`), which closes CR5-1 and CR5-2.
   - Fix the 5 pre-existing create-before-`try` sites.

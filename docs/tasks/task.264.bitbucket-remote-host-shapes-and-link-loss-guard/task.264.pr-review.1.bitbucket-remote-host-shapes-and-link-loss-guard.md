# PR Review Report: PR #847 — feat(task.264): derive the Bitbucket base from every remote shape; stop updates that cannot

**Reviewed:** 2026-11-05
**PR:** [#847](https://github.com/Gamaroff/agent-skills/pull/847) — `feature/task.264.bitbucket-remote-host-shapes-and-link-loss-guard` → `develop` (OPEN)
**Work item:** [`task.264.bitbucket-remote-host-shapes-and-link-loss-guard.md`](./task.264.bitbucket-remote-host-shapes-and-link-loss-guard.md) — resolved via `branch stem`
**Tracker:** none linked
**Verdict:** ✅ APPROVE

Scope note: conformance lens only (`--no-code`), as the pipeline's Step 5c does; the QA cycle already ran the code review. The lens was applied inline by the pipeline agent, not by a dispatched subagent, so there was no independent reviewer. Bundled `references/` copies were excluded from the read; none is named in the work item's Files Summary as authored.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.264.implementation.1.…-initial-run.md |
| Review report | ✅ | task.264.review.1.…md |
| QA reports | 1 | task.264.qa.1.…md |
| Gate | PASS | task.264.gate.1.…yml (95) |
| DoD | ❌ | not yet written; expected, finalise runs after this step |
| Sprint review | ❌ | not yet written; expected |
| Open bugs | 0 | none |
| Handover | ❌ | none outstanding |

CI on the PR head was still running when read; nothing in this verdict depends on it.

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| Seven shapes derive the base; unknown and look-alike hosts return null | `shared/resources/tests/jira-sync-bitbucket-remote.test.mjs` (10 accepted, 9 refused) | ✅ met |
| Update with a null base exits non-zero and writes nothing, all four scripts | guard after `isUpdate` in each `sync-jira-*` script; 3 end-to-end tests each | ✅ met |
| Create with a null base still warns and exits 0 | third end-to-end test per script | ✅ met |
| No added subprocess or network call per run | parser is pure; message helper reads the remote on the error path only | ✅ met |
| Added suite time under 2 s | 0.193 s recorded in QA report 1 | ✅ met |
| `CI=true npm test`, `npm run validate` pass | `ci:fast` exit 0; `quick_validate.py` over the four skills | ✅ met |
| Mutation proof recorded | QA report 1, Code Review section | ✅ met |
| CHANGELOG cites task 264; bundle and generated checks clean; four SKILL.md updated | in the diff; `bundle:check` clean | ✅ met |

## Conformance Findings

[PC-1] consistency · low · confidence: high — docs/tasks/task.264.bitbucket-remote-host-shapes-and-link-loss-guard/task.264.bitbucket-remote-host-shapes-and-link-loss-guard.md:191
  The task's Success Criteria checkboxes are all still unticked although QA verified each one.
  → Let finalise tick them from the evidence, or tick them in the acceptance commit.

[PC-2] consistency · low · confidence: high — docs/tasks/task.264.bitbucket-remote-host-shapes-and-link-loss-guard/task.264.bitbucket-remote-host-shapes-and-link-loss-guard.md:162
  The Files Summary does not name the `missingBitbucketBaseMessage` helper that the guard calls; the deviation from the plan (one shared message instead of four copies) is recorded only in the implementation report.
  → Add the helper to the `jira-sync.js` row in the acceptance commit.

## Code Review Findings

Skipped (`--no-code`). The QA cycle's code review found no correctness bug.

**Anchors:** 2 checked by hand against the working tree at the PR head; both resolve to the headings named above (all verified).

## Machine-Readable Findings

```yaml
reviewed_gate: task.264.gate.1.bitbucket-remote-host-shapes-and-link-loss-guard.yml
findings:
  - id: PC-1
    category: consistency
    severity: low
    confidence: high
    ref: "docs/tasks/task.264.bitbucket-remote-host-shapes-and-link-loss-guard/task.264.bitbucket-remote-host-shapes-and-link-loss-guard.md:191"
    anchor_check: ok
    finding: "The Success Criteria checkboxes are all unticked although QA verified each one."
    suggested_action: "Tick them at finalise or in the acceptance commit."
  - id: PC-2
    category: consistency
    severity: low
    confidence: high
    ref: "docs/tasks/task.264.bitbucket-remote-host-shapes-and-link-loss-guard/task.264.bitbucket-remote-host-shapes-and-link-loss-guard.md:162"
    anchor_check: ok
    finding: "The Files Summary omits the shared missingBitbucketBaseMessage helper added to jira-sync.js."
    suggested_action: "Add it to the jira-sync.js row at acceptance."
truncated_count: 0
```

## Recommended Actions

1. Finalise: tick the Success Criteria and name the message helper in the Files Summary.

# PR Review Report: PR #919 — feat(task.280): skill and test tooling see what ships

**Reviewed:** 2026-11-18
**PR:** [#919](https://github.com/Gamaroff/agent-skills/pull/919) — `feature/task.280.skill-and-test-tooling-see-what-ships` → `develop` (OPEN)
**Work item:** [`task.280.skill-and-test-tooling-see-what-ships.md`](./task.280.skill-and-test-tooling-see-what-ships.md) — resolved via `branch stem`
**Tracker:** none linked (no `github_issue`)
**Verdict:** ✅ APPROVE

Scope: conformance lens only (`--no-code`). The diff excluded the seven bundled `references/qa-execute-snippets.mjs` copies, byte-identical regenerations of `shared/resources/qa-execute-snippets.mjs`. This is the second review of this PR: the first ([report 1](./task.280.pr-review.1.skill-and-test-tooling-see-what-ships.md)) returned CONCERNS with an open coverage finding, which the last qa-fix cycle closed (PC-1 to PC-3 of report 1 are resolved in the files as they stand).

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.280.implementation.1.skill-and-test-tooling-see-what-ships-initial-run.md |
| Review report | ✅ | task.280.review.1.skill-and-test-tooling-see-what-ships.md |
| QA reports | 4 | task.280.qa.1 to qa.4 |
| Gate | PASS | task.280.gate.4.skill-and-test-tooling-see-what-ships.yml (95) |
| DoD | ❌ | not yet written: `/finalise` (Step 7) runs after this review |
| Sprint review | ❌ | not yet written: `/finalise` (Step 7) runs after this review |
| Open bugs | 0 | none |
| Handover | ❌ | none expected |

## Acceptance Criteria Traceability

Covered by the four QA reports and gate 4: every Success Criterion is evidenced, the wall-time criterion on a stated bound. No criterion is unmet.

## Conformance Findings

[PC-1] consistency · low · confidence: medium — `docs/tasks/task.280.skill-and-test-tooling-see-what-ships/task.280.skill-and-test-tooling-see-what-ships.md`
  The Notes Implementation Summary is stale: it still says the wall-time criterion and migration table are "Deferred to QA" and cites "Server gate: 8587 tests", but QA report 1 delivered both (wall time by bound) and gate 4 records 8591 tests.
  → Update the Implementation Summary to say QA delivered the wall-time bound and the migration table, and cite 8591 tests.

[PC-2] scope · low · confidence: low — `skills/create-skill/scripts/bundle_skill.py`
  The new `skill_owned_invocations` scans skill-owned `references/**/*.sh` as well as `.md` (`doc.suffix not in ('.md', '.sh')`, line 614), but Phase 3 and the Target Architecture name only `references/*.md`.
  → State the `.sh` scan in the task's Phase 3 and Target Architecture. The CHANGELOG entry already mentions it.

## Code Review Findings

Skipped (`--no-code`).

**Anchors:** 2 checked against `50b002fa1dfc66ba0ff1e7562eadce4cc09d5e8d` (via `head-branch`) — all verified (`no-line`: neither names a line).

## Machine-Readable Findings

```yaml
reviewed_gate: task.280.gate.4.skill-and-test-tooling-see-what-ships.yml
findings:
  - id: PC-1
    category: consistency
    severity: low
    confidence: medium
    ref: "docs/tasks/task.280.skill-and-test-tooling-see-what-ships/task.280.skill-and-test-tooling-see-what-ships.md"
    anchor_check: no-line
    finding: "The Notes Implementation Summary is stale: it still says the wall-time criterion and migration table are Deferred to QA and cites Server gate 8587 tests, but QA report 1 delivered both and gate 4 records 8591 tests."
    suggested_action: "Update the Implementation Summary to say QA delivered the wall-time bound and the migration table, and cite 8591 tests."
  - id: PC-2
    category: scope
    severity: low
    confidence: low
    ref: "skills/create-skill/scripts/bundle_skill.py"
    fix_path: "docs/tasks/task.280.skill-and-test-tooling-see-what-ships/task.280.skill-and-test-tooling-see-what-ships.md"
    anchor_check: no-line
    finding: "The new skill_owned_invocations scans skill-owned references .sh files as well as .md, but Phase 3 and the Target Architecture name only references .md."
    suggested_action: "State the .sh scan in the task's Phase 3 and Target Architecture."
truncated_count: 0
```

## Recommended Actions

1. Refresh the task's Implementation Summary (QA delivered the wall-time bound and migration table; 8591 tests).
2. Say in Phase 3 and the Target Architecture that the scan covers `references/**/*.md` and `references/**/*.sh`.
